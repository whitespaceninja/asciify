"use strict";

// Listen for messages
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    // If the received message has the expected format...
    if (msg.text === 'render') {
	var renderer = new Renderer();
	renderer.addCharacterList(msg.charData);
	renderer.render();
    }
});


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

