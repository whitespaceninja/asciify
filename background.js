/*********************************************
* Set up the context menu
*********************************************/

// Add 'Asciify' to the right-click menu for images
chrome.contextMenus.create({
    title: "Asciify",
    contexts:["image"],  // ContextType
    onclick: (function(imageInput) {	
	createCanvas();
	var inverse = false;
	var imgAsciified = new ImageAsciified(inverse);
	imgAsciified.onload = function(characters) {
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
