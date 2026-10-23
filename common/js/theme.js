'use strict';

//  Golf ScoreBoard addon for OBS
//  this is a purely javascript/html/css driven scoreboard system for OBS Studio
//  free to use and modify and use as long as this copyright statment remains intact.

// Custom scorecard colors picked in the control panel.  Each picked color
// overrides the CSS variables main.css reads, derives darker shades for the
// secondary rows, and picks a readable text color to sit on top of it.
// Colors that weren't picked keep the board style's own palette.

const themeVars = [
	"--ink", "--ink-deep", "--slate-row", "--on-board",
	"--royal", "--royal-deep", "--slate-head", "--slate-sub",
	"--on-header", "--on-header-muted",
	"--gold", "--total-bg", "--on-accent",
	"--red", "--on-birdie", "--band-text",
];

// Defaults from main.css, needed to check contrast of partial themes
const defaultInkDeep = [9, 14, 62];
const defaultGold = "#ffc72c";

function hexToRgb(hex) {
	const n = parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// "r g b" triplet, optionally darkened, for use as rgb(var(--x) / alpha)
function rgbTriplet(rgb, scale = 1) {
	return rgb.map((c) => Math.round(c * scale)).join(" ");
}

function luminance(rgb) {
	const [r, g, b] = rgb.map((c) => {
		c /= 255;
		return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

// White or dark text, whichever contrasts more with the background
function isLight(rgb) {
	return luminance(rgb) > 0.18;
}

function textOn(rgb) {
	return isLight(rgb) ? "#0b1030" : "#ffffff";
}

function applyTheme(theme) {
	const root = document.documentElement.style;
	themeVars.forEach((v) => root.removeProperty(v));

	if (theme.board) {
		const rgb = hexToRgb(theme.board);
		root.setProperty("--ink", rgbTriplet(rgb));
		root.setProperty("--slate-row", rgbTriplet(rgb));
		root.setProperty("--ink-deep", rgbTriplet(rgb, 0.6));
		root.setProperty("--on-board", textOn(rgb));
	}
	if (theme.header) {
		const rgb = hexToRgb(theme.header);
		root.setProperty("--royal", rgbTriplet(rgb));
		root.setProperty("--slate-head", rgbTriplet(rgb));
		root.setProperty("--royal-deep", rgbTriplet(rgb, 0.7));
		root.setProperty("--slate-sub", rgbTriplet(rgb, 0.7));
		root.setProperty("--on-header", textOn(rgb));
		root.setProperty("--on-header-muted",
			isLight(rgb) ? "rgb(11 16 48 / 0.7)" : "rgb(255 255 255 / 0.7)");
	}
	if (theme.accent) {
		root.setProperty("--gold", theme.accent);
		root.setProperty("--total-bg", theme.accent);
		root.setProperty("--on-accent", textOn(hexToRgb(theme.accent)));
	}
	if (theme.birdie) {
		root.setProperty("--red", theme.birdie);
		root.setProperty("--on-birdie", textOn(hexToRgb(theme.birdie)));
	}

	// OUT/IN columns show accent-colored numbers on a darkened board; fall
	// back to plain text if the picked colors make that hard to read.
	const band = theme.board
		? hexToRgb(theme.board).map((c) => Math.round(c * 0.6))
		: defaultInkDeep;
	if (contrast(hexToRgb(theme.accent || defaultGold), band) < 3) {
		root.setProperty("--band-text", textOn(band));
	}
}

function loadTheme() {
	try {
		return JSON.parse(localStorage.getItem("theme")) || {};
	} catch (e) {
		return {};
	}
}

applyTheme(loadTheme());
