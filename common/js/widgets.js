'use strict';

//  Golf ScoreBoard addon for OBS version 1.6.0
//  this is a purely javascript/html/css driven scoreboard system for OBS Studio
//  free to use and modify and use as long as this copyright statment remains intact.

// This is the code for managing the 3-putt updates from the control panel
// and rendering them to the HTML DOM.

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////            
//						functions
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////            

function getStoredValue(item, defaultValue) {
	if (localStorage.getItem(item) != null) {
		return localStorage.getItem(item);
	} else {
		return defaultValue;
	}
}

function styleChange(oldStyle, newStyle) {
	console.log("Setting style to: " + newStyle);

	if (oldStyle !== null) {
		document.querySelectorAll(".scHeader, .scData").forEach((el) => {
			el.classList.remove(oldStyle);
		});
	}
	document.querySelectorAll(".scHeader, .scData").forEach((el) => {
		el.classList.add(newStyle);
	});
}

function setOpacity(n) {
	// Panels read this; the Black/White widget styles have no panel to fade
	document.documentElement.style.setProperty("--sc-alpha", Number(n));
}

// Set a counter's value, replaying its pop animation only when it changes
function setCounter(el, value) {
	if (el.textContent == String(value)) {
		return;
	}
	el.textContent = value;
	if (hasRendered) {
		el.classList.remove("changed");
		void el.offsetWidth; // restart the animation
		el.classList.add("changed");
	}
}

function registerBroadCastHandler(f) {
	bcHandlers.push(f);
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//										variable declarations
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			

const bc = new BroadcastChannel('sc-main');
const bcHandlers = [];
var hasRendered = false;

var opacity = 0.99;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//										broadcast channel events
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			

bc.onmessage = (event) => {

	if (event.data.opacity != null) {
		console.log("event.data(opacity): " + event.data.opacity);
		opacity = event.data.opacity;
		setOpacity(opacity);
	}

	if (event.data.theme != null) {
		applyTheme(event.data.theme);
	}

	if (event.data.widgetStyle != null) {
		styleChange(event.data.oldWidgetStyle, event.data.widgetStyle);
		setOpacity(opacity);
	}

	bcHandlers.forEach((h) => {
		h(event);
	});

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//							autostart stuff
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(() => {
	styleChange(null, getStoredValue("widgetStyle", "normal"));

	if (localStorage.getItem("opacity") > 0) {
		opacity = localStorage.getItem("opacity") / 100;
		setOpacity(opacity);
	}
})();

