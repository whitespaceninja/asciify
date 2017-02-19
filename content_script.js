"use strict";

// Listen for messages
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    // If the received message has the expected format...
    if (msg.text === 'render') {
	var renderer = new AsciiConsoleRenderer();
	renderer.addCharacterList(msg.charData);
	renderer.render();
    }
});


/**
 * AsciiConsoleRenderer is a class built for rendering maps of ascii characters.
 * Usage:
 *     Instantiate a new object, then add ascii characters using either 
 *     addCharacter() or addCharacterList(). Then call render(). Calling
 *     render() will print out the characters contained in the internal
 *     map to the console.
 */
class AsciiConsoleRenderer {
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
		
		// Put it all in one string for quick render.
		output = output + this.getOutputLine(charactersInRow);
	    }

	    // finally, draw this line.
	    console.log(output);
	}
    }

    /**
     * Adds a character object to our internal map. 
     * character: a Character object. Must have the following members:
     *      symbol (char)
     *      x (int)
     *      y (int)
     */
    addCharacter(character) {
	this.characters.push(character);
	this.maxX = Math.max(this.maxX, character.x);
	this.maxY = Math.max(this.maxY, character.y);
    }

    /**
     * Adds a list of character objects to our internal map. 
     * characterList: a list of Character objects. Each object must have the following members:
     *      symbol (char)
     *      x (int)
     *      y (int)
     */
    addCharacterList(characterList) {
	var that = this;
	characterList.map(function(c) { that.addCharacter(c); });
    }

    /**
     * Clears out the internal character map in this renderer
     */
    removeAllCharacters(character) {
	this.characters = [];
    }

    /**
     * Internal helper method for comparing character positions
     */
    compareX(a,b) {
	if (a.x < b.x)
	    return -1;
	if (a.x > b.x)
	    return 1;
	return 0;
    }

    /**
     * Searches the given list of characters for one that has the given 'x' value
     * returns null if none is found.
     */
    findCharacterAtX(characterList, x) {
	var index = characterList.map(function(c) { return c.x; }).indexOf(x);
	if (index < 0) {
	    return null;
	}

	return characterList[index];
    }

    /**
     * Gets all characters in the specified y position (given as 'row')
     */
    getCharactersInRow(row) {
	return this.characters.filter(function(c) { return c.y == row; });
    }

    /**
     * Given a list of characters, formats and returns a single string that
     * can be printed to the console as one line.
     */
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

