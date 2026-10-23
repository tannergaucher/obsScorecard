'use strict';

//  G4ScoreBoard addon for OBS version 1.6.0 Copyright 2022-2023 Norman Gholson IV
//  https://g4billiards.com http://www.g4creations.com
//  this is a purely javascript/html/css driven scoreboard system for OBS Studio
//  free to use and modify and use as long as this copyright statment remains intact.


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////            
//						functions
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////            

function clearWinBlink() {
	document.getElementById("player1Score").classList.remove("winBlink");
	document.getElementById("player2Score").classList.remove("winBlink");
}

function sleep(milliseconds) {
	var start = new Date().getTime();
	for (var i = 0; i < 1e7; i++) {
		if ((new Date().getTime() - start) > milliseconds) {
			break;
		}
	}
}

function renderScoreCard() {
	const container = document.getElementById("scoreCardFull");
	const oldCells = Array.from(container.querySelectorAll("td"), (td) => td.textContent);

	if (staticScoreCard.style == "vertical") {
		document.getElementById("scoreCardFull").innerHTML = formatScoreCardVertical();
	} else if (staticScoreCard.style == "mcgolf") {
		document.getElementById("scoreCardFull").innerHTML = formatScoreCardMcGolf();
	} else {
		document.getElementById("scoreCardFull").innerHTML = formatScoreCard();
	}

	/* Mark changed cells so only they animate.  Skip the first render and
	 * layout changes (style/player switches) where cells don't line up. */
	const newCells = container.querySelectorAll("td");
	if (hasRendered && newCells.length == oldCells.length) {
		newCells.forEach((td, i) => {
			if (td.textContent != oldCells[i]) {
				td.classList.add("changed");
			}
		});
	}
	hasRendered = true;
	setOpacity(staticScoreCard.opacity);
}

function setStaticScoreCard(scoreCardHoles, scoreCardPar, playStyle) {
    staticScoreCard.holes = scoreCardHoles;
    staticScoreCard.par = scoreCardPar;
    staticScoreCard.playStyle = playStyle;
    renderScoreCard();
}

function setScores(scores) {
    scoreCard.players = scores;

    renderScoreCard();
}

function setPlayerName(idx, playerName, playerColor, playerEnabled) {
    if (playerEnabled) {
	staticScoreCard.players[idx] = { name: playerName, color: playerColor };
    } else {
	staticScoreCard.players.splice(idx, 1);
    }
}

function styleChange(n) {
	console.log("Setting style to: " + n);
	staticScoreCard.style = n;
	renderScoreCard();
}

function formatMatchScore(matchScore) {
	if (matchScore == 0) {
		return "<td class=\"blank\">&nbsp;</td>";
	} else if (matchScore == 45) {
		return "<td><span class=\"mark\">AS</span></td>";
	} else {
		return "<td><span class=\"mark\">" + matchScore + "&uarr;</span></td>";
	}
}

function formatScore(playerScore, par, showPar) {
	if (!playerScore || playerScore <= 0) {
		if (showPar) {
			return "<td class=\"unplayed\">" + par + "</td>";
		} else {
			return "<td class=\"blank\">&nbsp;</td>";
		}
	}
	const mark = "<span class=\"mark\">" + playerScore + "</span></td>";
	if (playerScore - par >= 2) {
		return "<td class=\"bogey double\">" + mark;
	} else if (playerScore > par) {
		return "<td class=\"bogey\">" + mark;
	} else if ((par - playerScore) == 1) {
		return "<td class=\"birdie\">" + mark;
	} else if (playerScore < par) {
		return "<td class=\"eagle\">" + mark;
	} else {
		return "<td class=\"par\">" + mark;
	}
}


function formatScoreAtIndex(playerScores, i, par, showPar) {
	if (staticScoreCard.playStyle == "match") {
		return formatMatchScore(playerScores.matchScore[i]);
	} else {
		return formatScore(playerScores.scores[i], par, showPar);
	}
}

function playerStyle(color) {
	return color ? " style=\"--player: " + color + "\"" : "";
}

function formatOverUnder(overUnder) {
	return overUnder == 0 ? 'E' :
		overUnder > 0 ? '+' + overUnder :
		overUnder;
}


function calculateMatch(playerScores) {
	playerScores[0].matchScore = [];
	playerScores[1].matchScore = [];
	playerScores[0].matchResult = 0;
	playerScores[1].matchResult = 0;

	// positive p2 is up, negative p1 is up, 0 is AS
	let match = 0;
	let holesRemaining = staticScoreCard.holes;
	for (let i = 0; i < staticScoreCard.holes; i++) {
		const p1Score = playerScores[0].scores[i];
		const p2Score = playerScores[1].scores[i];
		if (p1Score > 0 && p2Score > 0 && holesRemaining > 0) {
			holesRemaining--;
			if (p1Score > p2Score) {
				match++;
			} else if (p2Score > p1Score) {
				match--;
			}
			if (match > 0) {
				playerScores[0].matchScore[i] = 0;
				playerScores[1].matchScore[i] = match;
			} else if (match < 0) {
				playerScores[0].matchScore[i] = Math.abs(match);
				playerScores[1].matchScore[i] = 0;
			} else {
				// All Square
				playerScores[0].matchScore[i] = 45;
				playerScores[1].matchScore[i] = 45;
			}

			/* Check if match is finished */
			if (holesRemaining == 0) {
				if (match > 0) {
					playerScores[0].matchResult = 0;
					playerScores[1].matchResult = String(match) + "&uarr;";
				} else if (match < 0) {
					playerScores[0].matchResult = String(Math.abs(match)) + "&uarr;";
					playerScores[1].matchResult = 0;
				} else {
					// All Square
					playerScores[0].matchResult = "AS";
					playerScores[1].matchResult = "AS";
				}
			} else if (Math.abs(match) > holesRemaining) {
				/* Match is completed before all holes played */
				if (match > 0) {
					playerScores[0].matchResult = 0;
					playerScores[1].matchResult = String(match) + '&' + String(holesRemaining);
					holesRemaining = 0;
				} else {
					playerScores[0].matchResult = String(Math.abs(match)) + '&' + String(holesRemaining);
					playerScores[1].matchResult = 0;
					holesRemaining = 0;
				}
			}
		} else {
			playerScores[0].matchScore[i] = 0;
			playerScores[1].matchScore[i] = 0;
		}
	}
}

function calculateScoreCard() {
	let frontPar = 0;
	let backPar = 0;
	const playerCount = staticScoreCard.players.length;
	const playerScores = [];

	for (let i = 0; i < playerCount; i++) {
		playerScores[i] = {};
		playerScores[i].front = 0;
		playerScores[i].frontComplete = 0;
		playerScores[i].back = 0;
		playerScores[i].backComplete = 0;
		playerScores[i].overUnder = 0;
		playerScores[i].scores = [];
	}

	for (let i = 0; i < staticScoreCard.holes; i++) {
		let par = Number(staticScoreCard.par[i]);

		if (i < 9) {
			frontPar += par;
		} else {
			backPar += par;
		}

		/* Calculate player scores */
		for (let k = 0; k < playerCount; k++) {
			let scoreCardPlayer = scoreCard.players[k];
			let playerScore = Number(scoreCardPlayer.scores[i]);
			if (playerScore > 0) {
				if (i < 9) {
					playerScores[k].frontComplete++;
					playerScores[k].front += playerScore;
				} else {
					playerScores[k].backComplete++;
					playerScores[k].back += playerScore;
				}
				playerScores[k].overUnder += (playerScore - par);
				playerScores[k].scores[i] = playerScore;
			}
		}
	}
	if (staticScoreCard.playStyle == "match") {
		calculateMatch(playerScores);
	}
	return {
		frontPar: frontPar,
		backPar: backPar,
		playerScores: playerScores
	};
}

function formatScoreCardVertical() {

	const scoreCard = calculateScoreCard();
	const playerScore = scoreCard.playerScores[0];

	let html = "<table>"
		+ "<tr class=\"vscHeader\"><td>front 9</td><td>back 9</td></tr>\n";

	for (let i = 0; i < 9; i++) {
		let frontScore = playerScore.scores[i];
		let backScore = playerScore.scores[i+9];
		html += "<tr class=\"vscData\">";
		html += formatScore(frontScore, Number(staticScoreCard.par[i]), true);
		html += formatScore(backScore, Number(staticScoreCard.par[i+9]), true);
		html += "</tr>\n";
	}

	html += "<tr class=\"vscTotal\">";
	if (playerScore.frontComplete >= 9) {
		html += "<td class=\"done\">" + playerScore.front + "</td>";
	} else {
		html += "<td>" + scoreCard.frontPar + "</td>";
	}
	if (playerScore.backComplete >= 9) {
		html += "<td class=\"done\">" + playerScore.back + "</td>";
	} else {
		html += "<td>" + scoreCard.backPar + "</td>";
	}
	html += "</tr>";

	return html + "</table>";
}

function formatScoreCard() {

	const scoreCard = calculateScoreCard();

	let headerRow = "<tr class=\"scHeader\"><td>&nbsp;</td>";
	let parRow = "<tr class=\"scSubHeader\"><td>&nbsp;</td>";
	const playerCount = staticScoreCard.players.length;
	const playerScores = [];

	for (let i = 0; i < playerCount; i++) {
		playerScores[i] = {};
		playerScores[i].row =
			"<tr class=\"scData\"><td class=\"scName\"" + playerStyle(staticScoreCard.players[i].color) + ">"
			+ staticScoreCard.players[i].name
			+ "</td>";
	}

	for (let i = 0; i < staticScoreCard.holes; i++) {
		let par = Number(staticScoreCard.par[i]);
		headerRow += "<td>" + (i+1) + "</td>";
		parRow += "<td>" + par + "</td>";

		for (let k = 0; k < playerCount; k++) {
			playerScores[k].row += formatScoreAtIndex(scoreCard.playerScores[k], i, par, false);
		}
	}

	let html = "<table>";
	if (staticScoreCard.playStyle == "match") {
		html += headerRow + "<td class=\"scTotal\">RESULT</td></tr>";
	} else {
		html += headerRow + "<td class=\"scTotal\">TOTAL</td></tr>";
	}
	html += parRow + "<td class=\"scTotal\">PAR " + (scoreCard.frontPar + scoreCard.backPar) + "</td></tr>";

	for (let i = 0; i < playerCount; i++) {
		let totalTd = "";
		if (staticScoreCard.playStyle == "match") {
			let matchResult = scoreCard.playerScores[i].matchResult;
			if (matchResult == 0) {
				totalTd +="<td class=\"scTotal blank\">&nbsp;</td>";
			} else {
				totalTd +="<td class=\"scTotal\">" + matchResult + "</td>";
			}
		} else {
			let overUnder = scoreCard.playerScores[i].overUnder;
			totalTd +="<td class=\"scTotal\">" + formatOverUnder(overUnder) + "</td>";
		}
		html += playerScores[i].row + totalTd + "</tr>";
	}
	return html + "</table>";
}

function formatScoreCardMcGolf() {

	const scoreCard = calculateScoreCard();

	let headerRow = "<tr class=\"mcScHeader\"><td>HOLE</td>";
	let parRow = "<tr class=\"mcScSubHeader\"><td>PAR</td>";
	const playerCount = staticScoreCard.players.length;
	const playerScores = [];

	for (let i = 0; i < playerCount; i++) {
		playerScores[i] = {};
		playerScores[i].row =
			"<tr class=\"mcScData\"><td class=\"mcScName\"" + playerStyle(staticScoreCard.players[i].color) + ">"
			+ staticScoreCard.players[i].name
			+ "</td>";
	}

	function scoreFmt(score, classes) {
		let fmt = "<td class=\"";
		fmt += classes;
		if (score == 0) {
			fmt += " blank";
		}
		fmt += "\">" + (score == 0 ?  "&nbsp;" : String(score)) + "</td>";
		return fmt;
	}

	/* Iterate and add Hole, Par and Player columns */
	for (let i = 0; i < staticScoreCard.holes; i++) {
		let par = Number(staticScoreCard.par[i]);
		headerRow += "<td>" + (i+1) + "</td>";
		parRow += "<td>" + par + "</td>";

		if (staticScoreCard.playStyle != "match") {
			if (i == 8) {
				headerRow += "<td class=\"band\">OUT</td>";
				parRow += "<td class=\"band\">" + scoreCard.frontPar + "</td>";
			} else if (i == 17) {
				headerRow += "<td class=\"band\">IN</td>";
				parRow += "<td class=\"band\">" + scoreCard.backPar + "</td>";
			}
		}

		for (let k = 0; k < playerCount; k++) {
			playerScores[k].row += formatScoreAtIndex(scoreCard.playerScores[k], i, par, false);
			if (staticScoreCard.playStyle != "match") {
				if (i == 8) {
					playerScores[k].row += scoreFmt(scoreCard.playerScores[k].front, "band");
				} else if (i == 17) {
					playerScores[k].row += scoreFmt(scoreCard.playerScores[k].back, "band");
				}
			}
		}
	}

	let html = "<table class=\"mcGolf\">";
	html += headerRow + (staticScoreCard.playStyle == "match" ? scoreFmt("RESULT", "mcScTotal") : scoreFmt("TOTAL", "mcScTotal"))  + "</tr>";
	html += parRow + "<td class=\"mcScTotal\">" + (scoreCard.frontPar + scoreCard.backPar) + "</td></tr>";

	for (let i = 0; i < playerCount; i++) {
		let totalTd = "";
		if (staticScoreCard.playStyle == "match") {
			totalTd += scoreFmt(scoreCard.playerScores[i].matchResult, "mcScTotal");
		} else {
			totalTd += scoreFmt(scoreCard.playerScores[i].front + scoreCard.playerScores[i].back, "mcScTotal");
		}
		html += playerScores[i].row + totalTd + "</tr>";
	}
	return html + "</table>";
}

function setOpacity(n) {
	console.log("Opacity set to: " + n);
	document.documentElement.style.setProperty("--sc-alpha", Number(n));
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//										variable declarations
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			

const bc = new BroadcastChannel('sc-main');

var staticScoreCard = {
   players: [
     { name: "Player 1", color: "" }
   ],
   holes: 18,
   par: [],
   playStyle: "none", // match, stroke
   opacity: 0.99,
   style: "horizontal"
};

var scoreCard = {
   players: [
     { scores: [] },
     { scores: [] }
   ],
};

var hasRendered = false;


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//										broadcast channel events
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////			

bc.onmessage = (event) => {

	if (event.data.opacity != null) {
		console.log("event.data(opacity): " + event.data.opacity);
		staticScoreCard.opacity = event.data.opacity;
		setOpacity(staticScoreCard.opacity);
	}

	if (event.data.players != null) {
		event.data.players.forEach((player, i) => {
			console.log("player: " + (i+1) + " name: " + player.name);
			if (!player.name == "") {
				setPlayerName(i, player.name, player.color, player.enabled);
			} else {
				setPlayerName(i, "Player " + (i+1), player.color, player.enabled);
			}
		});
		setStaticScoreCard(event.data.scoreCardHoles,
			event.data.scoreCardPar,
			event.data.playStyle
			);
	}

	if (event.data.scores != null) {
		setScores(event.data.scores);
	}

	if (event.data.theme != null) {
		applyTheme(event.data.theme);
	}

	if (event.data.style != null) {
		console.log("event.data.style: " + event.data.style);
		styleChange(event.data.style);
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//							autostart stuff
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

(() => {
	/* Load Satic Score Card Data */
	const playStyle = localStorage.getItem("p2Style");
	if (playStyle != null) {
		staticScoreCard.playStyle = playStyle;
	}
	if (localStorage.getItem("p1NameCtrlPanel") != null) {
		staticScoreCard.players[0].name = localStorage.getItem("p1NameCtrlPanel");
		staticScoreCard.players[0].color = localStorage.getItem("p1colorSet");
	}
	if (localStorage.getItem("p2NameCtrlPanel") != null && staticScoreCard.playStyle != "none") {
		staticScoreCard.players[1] = {};
		staticScoreCard.players[1].name = localStorage.getItem("p2NameCtrlPanel");
		staticScoreCard.players[1].color = localStorage.getItem("p2colorSet");
	}
	const storedScoreCardPar = localStorage.getItem("scoreCardPar");
	if (storedScoreCardPar != null) {
		staticScoreCard.par = storedScoreCardPar.split(",");
	}
	/* Load scores */
	const p1ScoreCard = localStorage.getItem("p1ScoreCard");
	if (p1ScoreCard != null) {
		scoreCard.players[0].scores = p1ScoreCard.split(",");
	}
	const p2ScoreCard = localStorage.getItem("p2ScoreCard");
	if (p2ScoreCard != null) {
		scoreCard.players[1].scores = p2ScoreCard.split(",");
	}

	/* Load Style Data */
	const bsStyle = localStorage.getItem("b_style");
	if (localStorage.getItem("b_style") !== null) {
		staticScoreCard.style = bsStyle;
	}
	if (localStorage.getItem("opacity") > 0) {
		staticScoreCard.opacity = localStorage.getItem("opacity") / 100;
	}
	renderScoreCard();
})();
