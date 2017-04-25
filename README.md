# asciify

Google chrome extension that adds an 'Asciify' selection for your right click image context menu. Clicking Asciify will print out an ascii version of that image to the console. 

## Code Structure

[background.js](https://github.com/whitespaceninja/asciify/blob/master/background.js) handles:
- setting up the right-click context menu
- downloading the image
- translating the image pixels into ascii characters
- sending a message to the content_script to render the ascii

[content_script.js](https://github.com/whitespaceninja/asciify/blob/master/content_script.js) handles:
- receiving a string of ascii characters
- rendering to the console

## Future enhancements

- Replace the image within the browser
- Replace ALL images within the browser
- Turn actual reality into ascii
