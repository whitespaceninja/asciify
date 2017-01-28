"use strict";

var createCanvas = function() {
    // create a canvas that we can continually draw to
    var canv = document.createElement('canvas');
    canv.id = 'canvas';
    document.body.appendChild(canv);    
};

var run = function(imagePath) {
    createCanvas();

    var renderer = new Renderer();
    renderer.removeAllCharacters();

    var path = imagePath;
    var inverse = false;
    var imgAsciified = new ImageAsciified(path);
    imgAsciified.inverse = inverse;
    imgAsciified.onload = function(characters) {
	renderer.addCharacterList(characters);
	renderer.render();
    };
    imgAsciified.load();
};

class Renderer {
    constructor() {
    	this.characters = [];
	this.maxX = 0;
	this.maxY = 0;
    }

    clearScreen() {
	// escape sequence required to clear the screen and set cursor at 0,0
	console.log("\u001b[2J\u001b[0;0H");
    }

    render() {
	console.log("render: " + this.characters.length);
	for (var row = 0; row < this.maxY; row++) {
	    var output = '';

	    // find all characters that need to be drawn in this row
	    var charactersInRow = this.getCharactersInRow(row);;
	    
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
	for (var i = 0; i < characterList.length; i++) {
	    this.addCharacter(characterList[i]);
	}
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
	// returns the first character it finds at the specified x position
	for (var i = 0; i < characterList.length; i++) {
	    if (characterList[i].x == x) {
		return characterList[i];
	    }
	}

	return null;
    }

    getCharactersInRow(row) {
	var charactersInRow = [];
	for (var i = 0; i < this.characters.length; i++) {
	    if (this.characters[i].y == row) {
		charactersInRow.push(this.characters[i]);
	    }
	}

	return charactersInRow;
    }

    getOutputLine(charactersInRow) {
	// ...then draw them all. Put it all in one string for quick render.
	var output = '';        
	for (var col = 0; col < this.maxX; col++) {
	    var characterInPosition = this.findCharacterAtX(charactersInRow, col);

	    if (characterInPosition != null) {
		output = output + characterInPosition.symbol;
	    } else {
		output = output + ' ';
	    }
	}

	return output;
    }
}

class Character {
    constructor(initialX, initialY, symbol) {
	this.x = initialX;
	this.y = initialY;
	this.symbol = symbol;
    }
}


class ImageAsciified {
    constructor(path) {
	this.path = path;
	this.pixels = null;
	this.inverse = false;
	this.sourceWidth = 0;
	this.sourceHeight = 0;
	this.CHARACTER_RATIO = 3;
	this.pixels_per_character_wide = 4;
	this.onload = null;
    }

    validate() {
	if (this.sourceWidth < this.desiredWidth) {
	    this.desiredWidth = this.sourceWidth;
	}

	if (this.sourceHeight < this.desiredHeight) {
	    this.desiredHeight = this.sourceHeight;
	}
    }

    drawImage(canvas, jsImage) {
	if (canvas.width != jsImage.width) {
	    canvas.width = jsImage.width;
	}

	if (canvas.height != jsImage.height) {
	    canvas.height = jsImage.height;
	}

	var context = canvas.getContext('2d');

	try {
	    // wipe it to a blank canvas
	    context.clearRect(0, 0, canvas.width, canvas.height);

	    // Put some happy little trees, or whatever you want in there. Remember,
	    // it's all up to you. Beauty is everywhere.
	    context.drawImage(jsImage, 0, 0);
	} catch (err) {
	    console.log("failed to draw image" + this.path);
	    return false;
	}
	
	return true;
    }

    processImageAsBinaryString(imgAsciified, binaryString) {
	var myImg = new Image();
	myImg.src = binaryString; 
	imgAsciified.sourceWidth = myImg.width;
	imgAsciified.sourceHeight = myImg.height;

	var MAX_WIDTH = 239;

	// Scale the width and height based on the source image dimensions
	imgAsciified.desiredWidth = imgAsciified.sourceWidth / imgAsciified.pixels_per_character_wide;
	if (imgAsciified.desiredWidth > MAX_WIDTH) {
	    imgAsciified.desiredWidth = MAX_WIDTH;
	}
	imgAsciified.desiredHeight = imgAsciified.desiredWidth / imgAsciified.CHARACTER_RATIO;
	imgAsciified.validate();

	var canvas = document.getElementById('canvas');
	var success  = imgAsciified.drawImage(canvas, myImg);
	if (!success) {
	    return;
	}

	var context = canvas.getContext('2d');
	var data = context.getImageData(0, 0, imgAsciified.sourceWidth, imgAsciified.sourceHeight).data;
	imgAsciified.pixels = data;
	imgAsciified.onload(imgAsciified.getCharacters());
    }

    load() {
	if (this.path.srcUrl.startsWith('data:')) {
	    // For some reason we got straight up data from the 'src' tag.
	    // Process it directly
	    this.processImageAsBinaryString(this, this.path.srcUrl);
	    return;
	}
	
	this.downloadImageAndProcess();
    }

    downloadImageAndProcess() {
	// hold on to this for callback function
	var that = this;
	
	// Send off the request to download the source data
	var x = new XMLHttpRequest();
	x.responseType = 'arraybuffer';
	x.open('get', this.path.srcUrl);

	x.onload = function() {
	    var arrayBuffer = x.response;
	    var binaryString = '';
	    var byteArray = new Uint8Array(arrayBuffer);
	    for (var i = 0; i < byteArray.byteLength; i++) {
		binaryString += String.fromCharCode( byteArray [ i ] ); //extracting the bytes
	    }

	    var base64 = window.btoa( binaryString ); //creating base64 string
	    var imgData = "data:image/png;base64," + base64; //creating a base64 uri

	    that.processImageAsBinaryString(that, imgData);
	};
	x.send();
    }

    getCharacters() {
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
			
			var R = this.pixels[index + 0];
			var G = this.pixels[index + 1];
			var B = this.pixels[index + 2];
			var A = this.pixels[index + 3];
			
			pixelSum += R + G + B;
			numPixels++;
		    }
		}

		var thisChar = this.getAsciiCharFromPixelWeight(pixelSum / numPixels, this.inverse);
		characters.push(new Character(j, i, thisChar));
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

chrome.contextMenus.create({
    title: "Asciify",
    contexts:["image"],  // ContextType
    onclick: (function(image) {
	run(image);
    })
});


