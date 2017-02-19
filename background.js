/*********************************************
 * Set up the context menu
 *********************************************/

// Add 'Asciify' to the right-click menu for images
chrome.contextMenus.create({
    title: "Asciify",
    contexts:["image"],  // ContextType
    onclick: (function(imageInput) {
	createCanvas();

	// TODO: eventually make this an option on the plugin
	var inverse = false;
	var imgAsciified = new ImageAsciified(inverse);
	
	imgAsciified.onload = function(characters) {
	    // after the characters are parsed, send them over to the current window
	    // for displaying to the user
	    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {text: 'render', charData: characters}, null);
	    });
	};
	imgAsciified.load(imageInput.srcUrl);
    })
});


/*********************************************
* Helper methods for canvas manipulation
*********************************************/

// if someone creates an id with this I want to meet them
var UNIQUE_CANVAS_ID = 'OhOhHereSheComeWwatchOutBoyShellChewYouUp';

/**
 * Finds or creates a canvas element within the current document body.
 */
var createCanvas = function() {
    var canvas = document.getElementById(UNIQUE_CANVAS_ID)
    if (canvas !== null) {
	// already exists, move along
	return;
    }
    
    // create a canvas that we can continually draw to
    canvas = document.createElement('canvas');
    canvas.id = UNIQUE_CANVAS_ID;
    document.body.appendChild(canvas);    
};

/**
 * Gets our internal canvas object. Assumes it was already created.
 */
var getCanvas = function() {
    return document.getElementById(UNIQUE_CANVAS_ID);
};


/**
 * Draws a javascript Image object to the javascript Canvas object.
 * Returns whether it was successful or not.
 */
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


/*********************************************
 * Wrapper around an ascii character
 *********************************************/

class Character {
    constructor(initialX, initialY, symbol) {
	// where on the map are we drawing it
	this.x = initialX;
	this.y = initialY;
	// ascii character
	this.symbol = symbol;
    }
}


/*********************************************
 * Ascii-based manipulations to translate
 * images to a list of Character objects
 *********************************************/

class ImageAsciified {
    constructor(inverse) {
	this.inverse = inverse;
	this.onload = null;

	// MAGIC NUMBERS:
	
	// I measured this value on my laptop for how many characters fit
	// into a full screen console window shrunk to its minimum. Probably
	// nto valid for a ton of other computer screen sizes. TODO: make dynamic
	this.MAX_WIDTH = 239;

	// characters are about this much taller in ratio than they are wide
	this.CHARACTER_RATIO = 3;

	// How many pixels wide we want to shrink into a single ascii character
	this.pixels_per_character_wide = 4;
    }

    processImageAsBinaryString(binaryString) {
	var jsImage = new Image();
	jsImage.src = binaryString; 
	var imageWidth = jsImage.width;
	var imageHeight = jsImage.height;


	// Scale the width and height based on the source image dimensions
	var charsWide = imageWidth / this.pixels_per_character_wide;
	var charsHigh = charsWide / this.CHARACTER_RATIO;

	// validation
	charsWide = Math.min(MAX_WIDTH, Math.min(imageWidth, charsWide));
	charsHigh = Math.min(imageHeight, charsHigh);

	var canvas = getCanvas();
	var success  = drawImageToCanvas(jsImage, canvas);
	if (!success) {
	    return;
	}

	var context = canvas.getContext('2d');
	var pixelData = context.getImageData(0, 0, imageWidth, imageHeight).data;
	var characters = this.getCharacters(pixelData, imageWidth, imageHeight, charsWide, charsHigh);
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

    getCharacters(pixels, imageWidth, imageHeight, charsWide, charsHigh) {
	var characters = [];
	var pixelsPerCharacterW = Math.round(imageWidth / charsWide, 0);
	var pixelsPerCharacterH = Math.round(imageHeight / charsHigh, 0);
	
	for(var i = 0; i < charsHigh; ++i) {
	    for(var j = 0; j < charsWide; ++j) {

		var pixelSum = 0;
		var numPixels = 0;
		
		for(var k = 0; k < pixelsPerCharacterW; k++) {
		    for (var z = 0; z < pixelsPerCharacterH; z++) {
			var x = (j * pixelsPerCharacterW) + k;
			var y = (i * pixelsPerCharacterH) + z;

			if (x >= pixelWidth || y >= pixelHeight)
			    break;

			var index = ((y * imageWidth) + x) * 4;
			
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
	// darkest pixels get the lightest ascii character
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

	// darkest pixels get the darkest ascii character
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
