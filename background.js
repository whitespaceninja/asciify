"use strict";

// Add 'Asciify' to the right-click menu for images
chrome.contextMenus.create({
    title: "Asciify",
    contexts:["image"],  // ContextType
    onclick: (function(image) {
	/*var nodesArray = [].slice.call(document.getElementsByTagName('img'));
	var inputs = nodesArray.filter(function(e) {
	    e.src == image.srcUrl;
	});

	if (inputs.length > 0) {
	    inputs[0].src = 'http://blogs-images.forbes.com/kristintablang/files/2016/02/UberPuppyBowl-1200x675.jpg';
	}*/

	var renderer = new Renderer();
	renderImage(image, renderer);
    })
});

// if someone creates an id with this I want to meet them
var UNIQUE_CANVAS_ID = 'OhOhHereSheComeWwatchOutBoyShellChewYouUp';

var createCanvas = function() {
    // create a canvas that we can continually draw to
    var canv = document.createElement('canvas');
    canv.id = UNIQUE_CANVAS_ID;
    document.body.appendChild(canv);    
};

var getCanvas = function() {
    return document.getElementById(UNIQUE_CANVAS_ID);
};

var drawImageToCanvas = function(jsImage, canvas) {
    // resize our canvas accordingly
    canvas.width = jsImage.width;
    canvas.height = jsImage.height;

    var context = canvas.getContext('2d');

    try {
	// wipe it to a blank canvas
	context.clearRect(0, 0, canvas.width, canvas.height);

	// Put some happy little trees, or whatever you want in there. Remember,
	// it's all up to you. Beauty is everywhere.
	context.drawImage(jsImage, 0, 0);
    } catch (err) {
	console.log("failed to draw image");
	return false;
    }
    
    return true;
}

var renderImage = function(imageInput, renderer) {
    createCanvas();
    var inverse = false;
    var imgAsciified = new ImageAsciified(inverse);
    imgAsciified.onload = function(characters) {
	renderer.addCharacterList(characters);
	renderer.render();
    };
    imgAsciified.load(imageInput.srcUrl);
};

class Renderer {
    constructor() {
	// list of all characters to draw in no particular order.
	// It is possible to have more than one character at the
	// same location. It will draw the first one in the list.
    	this.characters = [];

	// the maximum X location of any character in our list
	this.maxX = 0;
	// same with Y location
	this.maxY = 0;
    }

    clearScreen() {
	// escape sequence required to clear the screen and set cursor at 0,0
	console.log("\u001b[2J\u001b[0;0H");
    }

    render() {
	for (var row = 0; row < this.maxY; row++) {
	    var output = '';

	    // find all characters that need to be drawn in this row
	    var charactersInRow = this.getCharactersInRow(row);
	    
	    // if there aren't any, draw a blank line
	    if (charactersInRow.length <= 0) {
	   	for (var col = 0; col < this.maxX; col++) {
		    output = output + ' ';
		}
	    } else {
		// else there must be characters here, sort them first...
		charactersInRow.sort(this.compareX);
		
		// ...then draw them all. Put it all in one string for quick render.
		output = output + this.getOutputLine(charactersInRow);
	    }

	    console.log(output);
	}
    }

    addCharacter(character) {
	this.characters.push(character);
	this.maxX = Math.max(this.maxX, character.x);
	this.maxY = Math.max(this.maxY, character.y);
    }

    addCharacterList(characterList) {
	var that = this;
	characterList.map(function(c) { that.addCharacter(c); });
    }

    removeAllCharacters(character) {
	this.characters = [];
    }

    compareX(a,b) {
	if (a.x < b.x)
	    return -1;
	if (a.x > b.x)
	    return 1;
	return 0;
    }

    findCharacterAtX(characterList, x) {
	var index = characterList.map(function(c) { return c.x; }).indexOf(x);
	if (index < 0) {
	    return null;
	}

	return characterList[index];
    }

    getCharactersInRow(row) {
	return this.characters.filter(function(c) { return c.y == row; });
    }

    getOutputLine(charactersInRow) {
	// ...then draw them all. Put it all in one string for quick render.
	var output = '';        
	for (var x = 0; x < this.maxX; x++) {
	    var charAtX = this.findCharacterAtX(charactersInRow, x);

	    if (charAtX != null) {
		output = output + charAtX.symbol;
	    } else {
		output = output + ' ';
	    }
	}

	return output;
    }
}

/**
* Model for an ascii character
*/
class Character {
    constructor(initialX, initialY, symbol) {
	// where on the map are we drawing it
	this.x = initialX;
	this.y = initialY;
	// ascii character
	this.symbol = symbol;
    }
}


class ImageAsciified {
    constructor(inverse) {
	this.inverse = inverse;
	this.sourceWidth = 0;
	this.sourceHeight = 0;
	this.CHARACTER_RATIO = 3;
	this.pixels_per_character_wide = 4;
	this.onload = null;
    }

    processImageAsBinaryString(binaryString) {
	var jsImage = new Image();
	jsImage.src = binaryString; 
	this.sourceWidth = jsImage.width;
	this.sourceHeight = jsImage.height;

	// magic number I measured on my laptop for how many characters fit
	// into a full screen console window shrunk to its minimum
	var MAX_WIDTH = 239;

	// Scale the width and height based on the source image dimensions
	this.desiredWidth = this.sourceWidth / this.pixels_per_character_wide;
	this.desiredHeight = this.desiredWidth / this.CHARACTER_RATIO;

	// validation
	this.desiredWidth = Math.min(MAX_WIDTH, Math.min(this.sourceWidth, this.desiredWidth));
	this.desiredHeight = Math.min(this.sourceHeight, this.desiredHeight);

	var canvas = getCanvas();
	var success  = drawImageToCanvas(jsImage, canvas);
	if (!success) {
	    return;
	}

	var context = canvas.getContext('2d');
	var pixelData = context.getImageData(0, 0, this.sourceWidth, this.sourceHeight).data;
	var characters = this.getCharacters(pixelData);
	this.onload(characters);
    }

    load(srcUrl) {
	if (srcUrl.startsWith('data:')) {
	    // For some reason we got straight up data from the 'src' tag.
	    // Process it directly
	    this.processImageAsBinaryString(srcUrl);
	    return;
	}
	
	this.downloadImageAndProcess(srcUrl);
    }

    downloadImageAndProcess(srcUrl) {
	// hold on to this for callback function
	var that = this;
	
	// Send off the request to download the source data. I've had
	// better luck with arrayBuffer than a blob so far, but I think
	// there's probably no reason we couldn't do a blob too
	var x = new XMLHttpRequest();
	x.responseType = 'arraybuffer';
	x.open('get', srcUrl);

	x.onload = function() {
	    var arrayBuffer = x.response;
	    var byteArray = new Uint8Array(arrayBuffer);
	    var binaryString = '';
	    for (var i = 0; i < byteArray.byteLength; i++) {
		//extracting the bytes
		binaryString += String.fromCharCode( byteArray [ i ] ); 
	    }

	    //creating base64 string and url
	    var base64 = window.btoa( binaryString ); 
	    var imgData = "data:image/png;base64," + base64; 

	    that.processImageAsBinaryString(imgData);
	};
	x.send();
    }

    getCharacters(pixels) {
	var characters = [];
	var pixelWidth = this.sourceWidth;
	var pixelHeight = this.sourceHeight;
	var pixelsPerCharacterW = Math.round(pixelWidth / this.desiredWidth, 0);
	var pixelsPerCharacterH = Math.round(pixelHeight / this.desiredHeight, 0);
	
	for(var i = 0; i < this.desiredHeight; ++i) {
	    for(var j = 0; j < this.desiredWidth; ++j) {

		var pixelSum = 0;
		var numPixels = 0;
		
		for(var k = 0; k < pixelsPerCharacterW; k++) {
		    for (var z = 0; z < pixelsPerCharacterH; z++) {
			var x = (j * pixelsPerCharacterW) + k;
			var y = (i * pixelsPerCharacterH) + z;

			if (x >= pixelWidth || y >= pixelHeight)
			    break;

			var index = ((y * this.sourceWidth) + x) * 4;
			
			var R = pixels[index + 0];
			var G = pixels[index + 1];
			var B = pixels[index + 2];
			var A = pixels[index + 3];
			
			pixelSum += R + G + B;
			numPixels++;
		    }
		}

		var asciiChar = this.getAsciiCharFromPixelWeight(pixelSum / numPixels, this.inverse);
		characters.push(new Character(j, i, asciiChar));
	    }
	}
	return characters;
    }

    getAsciiCharFromPixelWeight(weight, inverse) {
	var mappings = this.getAsciiMapping(inverse);
	var thisChar = mappings[mappings.length - 1][1]; //default to brightest
	for (var i = 0; i < mappings.length; i++) {
	    if (weight < mappings[i][0]) {
		thisChar = mappings[i][1];
		break;
	    }
	}

	return thisChar;
    }

    getAsciiMapping(inverse) {
	if (this.inverse) {
	    return [
		[40,  ' '],
		[80,  '`'],
		[120, '.'],
		[160, '"'],
		[200, ':'],
		[240, ';'],
		[280, '+'],
		[320, '/'],
		[360, 'r'],
		[400, 'c'],
		[440, 'v'],
		[480, 'x'],
		[520, 'Y'],
		[630, 'X'],
		[680, '&'],
		[720, '#'],
		[760, '@']
	    ];
	}
	
	return [
	    [40,  '@'],
	    [80,  '#'],
	    [120, '&'],
	    [160, '8'],
	    [200, '0'],
	    [240, 'X'],
	    [280, 'Y'],
	    [320, 'x'],
	    [360, 'v'],
	    [400, 'c'],
	    [440, 'r'],
	    [480, '/'],
	    [520, '+'],
	    [560, ';'],
	    [600, ':'],
	    [640, '"'],
	    [680, '.'],
	    [720, '`'],
	    [760, ' ']
	];
    }
}
