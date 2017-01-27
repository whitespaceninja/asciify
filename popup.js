// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

function renderStatus(statusText) {
    document.getElementById('status').textContent = statusText;
}


asciify = function(image){
    var config = { imageData: image.srcUrl }
    chrome.tabs.executeScript(tabId, {
	code: 'var config = ' + JSON.stringify(config)
    }, function() {
	chrome.tabs.executeScript(tabId,{file: "content_script.js"})
    });
};

chrome.contextMenus.create({
    title: "Asciify",
    contexts:["image"],  // ContextType
    onclick: asciify // A callback function
});
