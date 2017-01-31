'use strict';

// Enable actions client library debugging
process.env.DEBUG = 'actions-on-google:*';

let fs = require('fs');
let xml2js = require('xml2js');
let ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
let express = require('express');
let bodyParser = require('body-parser');

let app = express();
app.set('port', (process.env.PORT || 8080));
app.use(bodyParser.json({ type: 'application/json' }));

// Load the game itself
let parser = new xml2js.Parser();
let gameMap = new Map();
let rooms = [];

// Holds all objects
let objectMap = new Map();

// What the assistant will say
let speech = "";
// Whether this action closes the game
let gameOver = false;

let player = {};

// We can't push notifications to the player, so any "SetTimeout" functions need to be removed
// The problem is these are followed by a code block, which could have nested brackets
// This will find those brackets and remove that block
function stripSetTimeout(block, startIndex) {
		//console.log("Searching "+block +", starting at " + startIndex);
    var currPos = startIndex,
	    openBrackets = 0,
	    stillSearching = true,
	    waitForChar = false;

	while (stillSearching && currPos <= block.length) {
	  var currChar = block.charAt(currPos);

	  if (!waitForChar) {
	    switch (currChar) {
	      case '{':
	        openBrackets++;
	        break;
	      case '}':
	        openBrackets--;
	        break;
	      case '"':
	      case "'":
	        waitForChar = currChar;
	        break;
	      case '/':
	        var nextChar = block.charAt(currPos + 1);
	        if (nextChar === '/') {
	          waitForChar = '\n';
	        } else if (nextChar === '*') {
	          waitForChar = '*/';
	        }
	    }
	  } else {
	    if (currChar === waitForChar) {
	      if (waitForChar === '"' || waitForChar === "'") {
	        block.charAt(currPos - 1) !== '\\' && (waitForChar = false);
	      } else {
	        waitForChar = false;
	      }
	    } else if (currChar === '*') {
	      block.charAt(currPos + 1) === '/' && (waitForChar = false);
	    }
	  }

	  currPos++
	  if (openBrackets === 0) { stillSearching = false; }
	}

	//console.log("Substring: " +block.substring(startIndex , currPos)); // contents of the outermost brackets incl. everything inside
	return currPos;
}
	// This function takes an input script and turns it into a Javascript function
function convertScriptToJS(script) {
	if(script === undefined) {
		return Function("");
	}

	// First, add semicolons to the end of each argument
	script = script.replace(/\)\s/mg, ");");
	// Fix if statements getting semicolons
	script = script.replace(/\);{/mg, ") {");
	// Remove "play sound" and "stop sound" functions
	script = script.replace(/play sound \(.+\);/mg, "");
	script = script.replace(/stop sound/mg, "");
	// Add the "finish" function
	script = script.replace(/finish\s/mg, "finish();");
	// Fix newlines
	script = script.replace(/\n\s+/mg, "\n");
	script = script.replace(/\n+/mg, "\n");
	// Add quotes to parameters
	// GetBoolean function
	var booleanQuoteRegex = /GetBoolean\(([^"].+[^"]),/mg;
	script = script.replace(booleanQuoteRegex, "GetBoolean(\"$1\",");
	// MoveObject function
	var moveObjectRegex = /MoveObject \(([^"].+[^"]), ([^"].+[^"])\)/mg;
	script = script.replace(moveObjectRegex, "MoveObject (\"$1\", \"$2\")");
	// SetObjectFlagOn function
	var setObjectFlagOnRegex = /SetObjectFlagOn \(([^"].+[^"]),/mg;
	script = script.replace(setObjectFlagOnRegex, "SetObjectFlagOn(\"$1\",");
	// SetObjectFlagOff function
	var setObjectFlagOffRegex = /SetObjectFlagOff \(([^"].+[^"]),/mg;
	script = script.replace(setObjectFlagOffRegex, "SetObjectFlagOff(\"$1\",");
	// Got function
	var gotRegex = /Got\(([^"].+[^")])\)/mg;
	script = script.replace(gotRegex, "Got(\"$1\")");
	// HelperOpenObject function
	var helperOpenObjectRegex = /HelperOpenObject \(([^"].+[^")])\)/mg;
	script = script.replace(helperOpenObjectRegex, "HelperOpenObject(\"$1\")");
	// HelperCloseObject function
	var helperCloseObjectRegex = /HelperCloseObject \(([^"].+[^")])\)/mg;
	script = script.replace(helperCloseObjectRegex, "HelperCloseObject(\"$1\")");
	// MakeObjectVisible function
	var makeObjectVisibleRegex = /MakeObjectVisible \(([^"].+[^")])\)/mg;
	script = script.replace(makeObjectVisibleRegex, "MakeObjectVisible(\"$1\")");
	// RemoveObject function
	var removeObjectRegex = /RemoveObject \(([^"].+[^")])\)/mg;
	script = script.replace(removeObjectRegex, "RemoveObject(\"$1\")");
	// AddToInventory function
	var addToInventoryRegex = /AddToInventory \(([^"].+[^")])\)/mg;
	script = script.replace(addToInventoryRegex, "AddToInventory(\"$1\")");

	// Turn wait into pause
	var waitRegex = /wait {/mg;
	script = script.replace(waitRegex, "msg('<break time=\"1\">'); {");

	// SetTimeout, which isn't supported until Google allows push notifications
	var setTimeoutRegex = /SetTimeout \(\d+\) /mg;
	var result = setTimeoutRegex.exec(script);
	while(result != null) {
		//console.log(script);
		script = script.replace(script.substring(result.index, stripSetTimeout(script, setTimeoutRegex.lastIndex)), "");
		result = setTimeoutRegex.exec(script);
	}

	//console.log(script);

	//script = "msg (\"Hello, world!\");";
	//var func = new Function(script);
	//console.log(script);
	//eval(script);
	return script;
	//func();
	//return func;
}

function getObjectFromXML(gameObject) {
	let object = {};
	// Fetch the object's name
	object.name = gameObject['$'].name;

	// Fetch basic object properties
	// Whether this object is visible
	if(gameObject.visible != undefined) {
		object.visible = gameObject.visible[0]['_'];
	}
	// Whether this object can be dropped
	if(gameObject.drop != undefined) {
		object.drop = gameObject.drop[0]['_'];
	}
	if(gameObject.take != undefined) {
		object.take = convertScriptToJS(gameObject.take[0]['_']);
	}
	if(gameObject.look != undefined) {
		if(gameObject.look[0] != undefined && gameObject.look[0]['_']) {
			object.look = convertScriptToJS(gameObject.look[0]['_']);
		}
		else {
			object.look = convertScriptToJS("msg(\""+gameObject.look+"\");");
		}
	}
	else if(gameObject.attr != undefined) {
		object.look = convertScriptToJS(gameObject.attr[0]['_']);
	}

	if(gameObject.breathe != undefined) {
		object.breathe = gameObject.breathe[0];
	}
	if(gameObject.breathe != undefined) {
		object.smell = gameObject.smell[0];
	}
	if(gameObject.scenery != undefined && gameObject.scenery[0]['_'] != undefined) {
		object.scenery = gameObject.scenery[0]['_'];
	}
	if(gameObject.takeMsg != undefined) {
		object.takeMsg = gameObject.takemsg[0];
	}
	if(gameObject.takeMsg != undefined) {
		object.dropMsg = gameObject.dropmsg[0];
	}
	if(gameObject.openmsg != undefined) {
		object.openMsg = gameObject.openmsg[0];
	}
	if(gameObject.isopen != undefined) {
		object.isopen = gameObject.isopen[0]['_'];
	}
	if(gameObject.closemsg != undefined) {
		object.closeMsg = gameObject.closemsg[0];
	}
	if(gameObject.feature_container != undefined) {
		object.feature_container = gameObject.feature_container[0];
	}
	if(gameObject.kick != undefined) {
		object.kick = gameObject.kick[0];
	}
	if(gameObject.hit != undefined) {
		object.hit = gameObject.hit[0];
	}
	if(gameObject.hurt != undefined) {
		object.hurt = gameObject.hurt[0];
	}
	if(gameObject.break != undefined) {
		object.break = gameObject.break[0];
	}
	if(gameObject.stroke != undefined) {
		object.stroke = gameObject.stroke[0];
	}
	if(gameObject.pet != undefined) {
		object.pet = gameObject.pet[0];
	}
	if(gameObject.feed != undefined) {
		object.feed = gameObject.feed[0];
	}
	if(gameObject.pull != undefined) {
		object.pull = gameObject.pull[0];
	}
	if(gameObject.push != undefined) {
		object.push = gameObject.push[0];
	}
	if(gameObject.knockon != undefined) {
		object.knockon = gameObject.knockon[0];
	}
	if(gameObject.nokeymessage != undefined) {
		object.nokeymessage = gameObject.nokeymessage[0];
	}
	if(gameObject.sit != undefined) {
		object.sit = gameObject.sit[0];
	}

	if(gameObject.climb != undefined) {
		if(gameObject.climb[0]['_'] != undefined) {
			object.climb = convertScriptToJS(gameObject.climb[0]['_']);
		}
		else {
			object.climb = convertScriptToJS("msg(\""+gameObject.climb[0]+"\");");
		}
	}

	if(gameObject.onclose != undefined) {
		object.onClose = convertScriptToJS(gameObject.onclose[0]['_']);
	}
	if(gameObject.onopen != undefined) {
		object.onOpen = convertScriptToJS(gameObject.onopen[0]['_']);
	}

	if(gameObject.displayverbs != undefined) {
		object.displayVerbs = gameObject.displayverbs[0].value;
	}
	// Get inherited object properties
	if(gameObject.inherit != undefined) {
		object.inherit = [];
		for(var inheritedObj in gameObject.inherit) {
			object.inherit[inheritedObj] = gameObject.inherit[inheritedObj]['$'].name;
		}
	}

	// Get the description, if it exists
	if(gameObject.description != undefined) {
		// We need to set the room description to be a string first
		object.description = "";
		object.description += gameObject.description;
		// Replace HTML tags with Javascript-friendly ones
		object.description = object.description.replace(/<br\/>/mg,"\n");
		object.description = object.description.replace(/\\"/mg, "\"");
	}

	for(var beforefirstenter in gameObject.beforefirstenter) {
		var beforeFirstEntranceText = gameObject.beforefirstenter[beforefirstenter]['_'];
		if(beforeFirstEntranceText === undefined) {
			continue;
		}
		object.beforeFirstEnter = convertScriptToJS(beforeFirstEntranceText);
	}

	for(var firstEnter in gameObject.firstenter) {
		var firstEntranceText = gameObject.firstenter[firstEnter]['_'];
		if(firstEntranceText === undefined) {
			continue;
		}
		object.firstEnter = convertScriptToJS(firstEntranceText);
	}

	// Get script which plays when the player enters the object
	for(var entrance in gameObject.enter) {
		var entranceText = gameObject.enter[entrance]['_'];
		if(entranceText === undefined) {
			continue;
		}
		object.enter = convertScriptToJS(entranceText);
	}

	// Iterate over all options the player can take
	for(var option in gameObject.options) {
		object.options = [];
		for(var item in gameObject.options[option].item) {
			object.options[item] = {};
			// Assign the name of the room connected with this object to the key
			for(var kvp in gameObject.options[option].item[item]) {
				object.options[item][kvp] = gameObject.options[option].item[item][kvp][0];
			}
		}
	}

	// Find exits
	if(gameObject.exit != undefined) {
		object.exits = {};
		object.firstTime = true;
		for(var rawExit in gameObject.exit) {
			var exits = gameObject.exit[rawExit]['$'];
			if(exits != undefined) {
				var exit = {};
				exit.to = exits['to'];
				exit.firstTime = true;

				//console.dir(gameObject.exit[rawExit]);
				var rawScript = gameObject.exit[rawExit].script;
				if(rawScript != undefined) {
					var script = convertScriptToJS(rawScript[0]['_']);
					exit.script = script;
					//console.log(exits['alias'] +": "+script);
				}
				object.exits[exits['alias']] = exit;
				//console.dir(room);
			}
		}
	}

	// Find items contained inside this object
	object.items = [];
	var roomItems = gameObject.object;
	for(var itemIndex in roomItems) {
		object.items[itemIndex] = getObjectFromXML(roomItems[itemIndex]);
		object.items[itemIndex].context = object;
		object.items[itemIndex].itemIndex = itemIndex;

		/*if(globals.has(item.name)) {
			console.log("Duplicate item! "+item.name);
		}
		else {
			globals.set(item.name, item);
		}*/
		//console.dir(item);
	}
	objectMap.set(object.name, object);
	return object;
}


function readXMLFile() {
	// Populate the game from an XML file
	fs.readFile('game.aslx', function(err, data) {
			parser.parseString(data, function (err, result) {
					console.log("Read from file!");
					player.objectName = result.asl.game[0].pov[0]['_'];

					var gameObjects = result.asl.object;
					// Iterate over all objects in the game
					for(var object in gameObjects) {
						let room = getObjectFromXML(gameObjects[object]);
						gameMap.set(room.name, room);
						rooms[object] = room;
					}

					//for(var room in rooms) {
						/*console.log(rooms[room].name + ' connects to:');
						for(var option in rooms[room].exits) {
							console.log(rooms[room].exits[option].to);
							//console.log(option +': '+gameMap.get(key));
						}
						console.log(rooms[room].name + ' has objects:');
						for(var object in rooms[room].items) {
							console.log(rooms[room].items[object].name);
						}*/
						//console.log(rooms[room].name + ": "+rooms[room].beforeFirstEnter);
						//console.dir(rooms[room]);
						//console.log(rooms[room].items);
					//}

					//console.dir(rooms[2].items[9]);
			});
	});
}

// A Quest function. Moves the object to the given room.
function MoveObject(objectName, roomName) {

	var room = gameMap.get(roomName);
	var object = objectMap.get(objectName);

	/*if(object.context.name === room.name) {
		// Already in the room
		return;
	}*/

	console.log("Moving "+object.name+" from "+object.context.name +" to "+room.name);

	if(object.context != undefined) {
		// Remove from the old context
		object.context.items.splice(object.itemIndex, 1);
		// Update other indicies
		for(var otherIndex in object.context.items) {
			object.context.items[otherIndex].itemIndex = otherIndex;
			objectMap.set(object.context.items[otherIndex].name, object.context.items[otherIndex]);
		}
		// Update old maps
		objectMap.set(object.context.name, object.context);
		if(gameMap.has(object.context.name)) {
			gameMap.set(object.context.name, object.context);
		}
	}

	// If the player is moving, update POV stuff
	if(objectName === player.objectName) {
		// Trigger before first enter
		if(room.firstTime) {
			eval(room.beforeFirstEnter);
		}
		// Reset the first time bool on the previous room
		if(player.currentRoom != undefined) {
			player.currentRoom.firstTime = false;
		}
		// Move the player's room
		player.currentRoom = room;
		if(room.firstTime) {
			eval(room.firstEnter);
		}
		msg(room.description);
	}

	object.context = room;
	object.itemIndex = room.items.push(object) - 1;

	gameMap.set(roomName, room);
	objectMap.set(roomName, room);
	objectMap.set(object.name, object);
}

// A Quest function. Makes the game say whatever is in the text.
function msg (text) {
		text = text.replace(/<br\/>/mg,"\n");
		text = text.replace(/\\"/mg, "\"");
		speech += text;
		console.log(text);
}

// A Quest function. Ends the game.
function finish() {
		gameOver = true;
}

// A Quest function. Returns whether the object has the given flag set.
function GetBoolean(objectName, flag) {
	if(globals.has(objectName)) {
		var object = globals.get(objectName);
		if(object[flag] === undefined) {
			return false;
		}
		else {
			return object[flag];
		}
	}
	else {
		return false;
	}
}

// A Quest function. Checks to see if the player has the object in their inventory.
function Got(object) {
	var playerObject = objectMap.get(player.objectName);
	return gotObject(playerObject, object);
}

function gotObject(parentObject, objectName) {
	for(var object in parentObject.objects) {
		if(parentObject[object].name === objectName) {
			return true;
		}
		// Go recursive
		if(gotObject(parentObject[object], objectName)) {
			return true;
		}
	}
	return false;
}

// Removes the object from the player's inventory
function RemoveObject(objectName) {

}

// Sets the flag on the given object to the given state.
function SetObjectFlagOff(objectName, objectState) {
	var object = {};
	if(globals.has(objectName)) {
		object = objectMap.get(objectName);
	}
	object[objectState] = false;
	objectMap.set(objectName, object);
}

// Sets the flag on the given object to "true".
function SetObjectFlagOn(objectName, objectState) {
	var object = {};
	if(globals.has(objectName)) {
		object = objectMap.get(objectName);
	}
	object[objectState] = true;
	objectMap.set(objectName, object);
}

function HelperOpenObject(objectName) {

}

function HelperCloseObject(objectName) {

}

function AddToInventory(objectName) {

}

let helpActions = new Map();

////////////////////////////// UTILITY FUNCTIONS
// Utility function to pick prompts
function getRandomPrompt(array) {
	return array[Math.floor(Math.random() * (array.length))];
}

function getRandomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const HELP_ACTION = 'help_action';
function getHelp(lastContext, player) {
	const GIVE_HELP_LINES = [
		'Here\'s some help for you:',
		'I can give you some help:',
		'Hopefully, you can find this information helpful:'
	];
	if(helpActions.has(lastContext)) {
		let helpAction = helpActions.get(lastContext);
		return getRandomPrompt(GIVE_HELP_LINES) + '\n' + helpAction(player);
	}
	else {
		return 'I can\'t offer any help here. You\'re on your own.';
	}
}

// Utility function to ask the player to repeat what they said
const MAX_MISHEARD_TRIES = 3;
function getMisheardDialog(numberOfAttempts)
{
	const MISHEARD_DIALOG_FIRST = [
		'I\'m sorry, but I didn\'t catch that. Can you say it again?'
	];
	const MISHEARD_DIALOG_SECOND = [
		'Sorry, I still didn\'t understand. How about trying one more time?'
	];
	const MISHEARD_DIALOG_LAST = [
		'Looks like I\'m having some trouble understanding you. How about we try again later?'
	];

	// Sanity checking for number of attempts
	if(numberOfAttempts == undefined || numberOfAttempts < 0) {
		numberOfAttempts = 0;
	}

	if(numberOfAttempts == 0) {
		// First try
		return getRandomPrompt(MISHEARD_DIALOG_FIRST);
	}
	else if(numberOfAttempts == 1) {
		// Second try
		return getRandomPrompt(MISHEARD_DIALOG_SECOND);
	}
	else {
		// Last try; if adding any more be sure to update MAX_MISHEARD_TRIES
		return getRandomPrompt(MISHEARD_DIALOG_LAST);
	}
}

////////////////////////////// GREETINGS
// This greets the player
const WELCOME_ACTION = 'input.welcome';
function getGreeting() {
	// These prompts are used to greet the player when they start the game
	const GREETING_PROMPTS = [
		'Hello, and welcome to Dungeon Adventure! I\'ll be your Game Master tonight! Hopefully you\'re ready for some adventure!',
		'Welcome to Dungeon Adventure! I\'ll be your Game Master, and I hope you\'re ready to go on an adventure, because I sure am!',
		'It\'s good to see you! I\'m your Game Master, and we\'re about to go on a Dungeon Adventure!',
		'Hey there! Welcome to Dungeon Adventure! I\'m your Game Master, and I can\'t wait to find out what adventure we\'re going to have!'
	];
	// Greet the player
	return getRandomPrompt(GREETING_PROMPTS);
}
// No help for greeting

////////////////////////////// CHARACTER NAMES
// This asks the player to create a character
const GET_NAME_ACTION = 'get_player_name';
const GET_WEIRD_NAME_ACTION = 'get_weird_player_name';
const NAME_CONTEXT = 'character_name';
function getCharacterName() {
	// Ask them to make a character
	// These prompts are used when starting character creation
	const CHARACTER_PROMPTS = [
		'Let\'s get started by creating a character. What do you want to be called?'
	];

	return getRandomPrompt(CHARACTER_PROMPTS);
}
function helpCharacterName(player) {
	return 'You\'re naming your character. It can be anything you want! Just tell me whatever name you want to be called.';
}
helpActions.set(NAME_CONTEXT, helpCharacterName);

// This is used to verify the Game Master heard the player's name correctly
const VERIFY_NAME_NO_ACTION = 'verify_character_name_no';
const VERIFY_NAME_YES_ACTION = 'verify_character_name_yes';
const VERIFY_NAME_CONTEXT = 'verify_character_name';
function getVerifyPlayerName(player, isWeirdName) {
	const VERIFY_PLAYER_NAME = 'Okay, so you want me to call you ';
	// This is used when the Game Master didn't recognize a player name
	const VERIFY_WEIRD_PLAYER_NAME = 'That\'s a strange name. So you wanted me to call you ';

	if(isWeirdName) {
		return VERIFY_WEIRD_PLAYER_NAME + player.name + "?";
	}
	else {
		return VERIFY_PLAYER_NAME + player.name + "?";
	}
}
function helpVerifyPlayerName(player) {
	return 'You\'re confirming that you want to be called ' + player.name+ '. Just say "yes" or "no".';
}
helpActions.set(VERIFY_NAME_CONTEXT, helpVerifyPlayerName);


function getRetryPlayerName() {
	// Used when a player says the Game Master misheard their name
	const PLAYER_NAME_NOT_RIGHT = [
		'I\'m sorry, let\'s try that again. What did you want me to call you?',
		'Okay, let\'s try one more time. What do you want your character to be called?'
	];

	return getRandomPrompt(PLAYER_NAME_NOT_RIGHT);
}
// Help falls back to helpCharacterName

////////////////////////////// CHARACTER STATS
function getGenerateStatsBegin(player) {
	// Used during stat generation
	const START_GENERATE_STATS = 'It\'s now time to generate your stats. These stats range from 0 to 20.';

	return 'Alright, ' + player.name + '! ' + START_GENERATE_STATS;
}
// No help

function getStrengthStat(player) {
	// Used during stat generation or stat lookup
	const STRENGTH_STAT = 'Your strength stat is ';

	return STRENGTH_STAT + player.strengthStat + '.';
}

function getDexterityStat(player) {
	// Used during stat generation or stat lookup
	const DEXTERITY_STAT = 'Your dexterity stat is ';

	return DEXTERITY_STAT + player.dexterityStat + '.';
}

function getIntelligenceStat(player) {
	// Used during stat generation or stat lookup
	const INTELLIGENCE_STAT = 'Your intelligence stat is ';

	return INTELLIGENCE_STAT + player.intelligenceStat + '.';
}

////////////////////////////// BEGIN NEW GAME
const READY_FOR_ADVENTURE_CONTEXT = 'ready_for_adventure';
function getBeginNewGame() {
	// Used to confirm the player is ready to start their game
	const READY_FOR_ADVENTURE = 'Are you ready to begin your adventure?';

	return READY_FOR_ADVENTURE;
}
function helpReadyForAdventure(player) {
	let readyForAdventureHelp = 'You\'re confirming that you\'re ready to adventure with ' + player.name;
	readyForAdventureHelp += ', with a strength stat of ' + player.strengthStat;
	readyForAdventureHelp += ', a dexterity stat of ' +  player.dexterityStat;
	readyForAdventureHelp += ', and an intelligence stat of ' + player.intelligenceStat + '.';
	readyForAdventureHelp += ' If this sounds good to you, say "yes." Otherwise, say "no."';
	return readyForAdventureHelp;
}
helpActions.set(READY_FOR_ADVENTURE_CONTEXT, helpReadyForAdventure);

const GAME_CONTEXT = 'playing_game';
const READY_TO_PLAY_YES_ACTION = 'verify_ready_to_play_yes';

// Switch between various things for the assistant to say
app.post('/', function (request, response) {
	//console.log('headers: ' + JSON.stringify(request.headers));
	//console.log('body: ' + JSON.stringify(request.body));

	const assistant = new ApiAiAssistant({ request: request, response: response });

	function handleRequest(assistant) {
			// Current action
			let action = assistant.getIntent();
			determineAction(assistant, action);
	}
	assistant.handleRequest(handleRequest);

	function determineAction(assistant, action) {
		// The context for this action
		let context = "";
		// The timeout for the context
		let timeout = 5;
		speech = "";

		gameOver = false;

		switch(action) {
			case WELCOME_ACTION:
				// The welcome action, called when the player first starts the game
				// After greeting them, ask them to create a character
				speech = getGreeting();
				speech += '\n';
				speech += getCharacterName();

				action = WELCOME_ACTION;
				context = NAME_CONTEXT;

				player = {};
				player.name = "";
				player.objectName = "player";
				player.inventory = {};

				// Also, import XML data
				readXMLFile();
			break;
			case GET_NAME_ACTION:
				// Get the player's name and store it
				// Then, ask them if the name is correct
				var playerName = assistant.getArgument('given-name');
				player.name = playerName;

				// Verify the name is correct
				speech = getVerifyPlayerName(player, false);

				action = GET_NAME_ACTION;
				context = VERIFY_NAME_CONTEXT;
				timeout = 2;
			break;
			case GET_WEIRD_NAME_ACTION:
				// Used when we don't recognize a player's name

				// Make the player
				var playerName = assistant.getRawInput();
				player.name = playerName;

				// Verify that the name is correct
				speech = getVerifyPlayerName(player, true);

				action = GET_NAME_ACTION;
				context = VERIFY_NAME_CONTEXT;
				timeout = 2;
			break;
			case VERIFY_NAME_NO_ACTION:
				// Player said we didn't get their name right
				// Try it one more time

				// Reset the player name
				player.name = "";

				// Ask the player to retry their name again
				speech = getRetryPlayerName();

				action = VERIFY_NAME_NO_ACTION;
				context = NAME_CONTEXT;
			break;
			case VERIFY_NAME_YES_ACTION:
				// The player has confirmed their name is correct
				// Now we can move on to character creation
				// Generate each stat and tell the player what the stats are
				// Then ask if they are ready to go

				// Generate player stats
				player.strengthStat = getRandomNumber(0, 20);
				player.dexterityStat = getRandomNumber(0, 20);
				player.intelligenceStat = getRandomNumber(0, 20);

				// Tell the player about the stats
				speech = getGenerateStatsBegin(player);
				speech += '\n';

				// Print the value for each stat
				speech += getStrengthStat(player);
				speech += '\n';
				speech += getDexterityStat(player);
				speech += '\n';
				speech += getIntelligenceStat(player);
				speech += '\n';

				// Ask the player if they want to start a game
				speech += getBeginNewGame();

				action = VERIFY_NAME_YES_ACTION;
				context = READY_FOR_ADVENTURE_CONTEXT;
			break;
			case READY_TO_PLAY_YES_ACTION:
				// This starts the gameplay loop
				// MoveObject moves the player into the first room
				// This will trigger all "first time" actions and add it to the speech variable
				MoveObject(player.objectName, rooms[0].name);

				action = READY_TO_PLAY_YES_ACTION;
				context = GAME_CONTEXT;
			break;
			case HELP_ACTION:
				// Player has asked for help
				speech = getHelp(assistant.data.lastContext, assistant.data.player);

				// Preserve the last action and context; reset context timeout
				action = assistant.data.currentAction;
				context = assistant.data.lastContext;
			break;
			default:
				// The Game Master has absolutely no idea what the player just said
				console.log("Unknown player input!");
				// If we were talking about names last, that might be a name
				if (assistant.data.lastContext == NAME_CONTEXT) {
					determineAction(assistant, GET_WEIRD_NAME_ACTION);
				}
				else {
					// No idea
					// Get the dialog line telling the player we don't know what they said
					speech = getMisheardDialog(assistant.data.misheardReplyCount);

					assistant.data.misheardReplyCount++;
					// Exceeded try count; tell them we give up
					if(assistant.data.misheardReplyCount >= MAX_MISHEARD_TRIES) {
							// Can't understand the player, close the conversation
							assistant.tell(speech);
							return;
					}
					else {
							console.log("Unable to resolve player input: " + assistant.getRawInput());
							// Ask the player to repeat
							// If on the try before the last try, offer some help
							if(assistant.data.misheardReplyCount == MAX_MISHEARD_TRIES - 1) {
								console.log("Seeking help for player.");
								speech += '\n';
								speech += getHelp(assistant.data.lastContext, assistant.data.player);
							}

							// Manually ask the player to repeat to avoid resetting misheardReplyCount
							assistant.data.speech = speech;
							assistant.ask(speech);
							return;
					}
				}
			break;
		}

		updatePlayer(assistant, player);
		assistant.data.speech = speech;

		if(gameOver) {
			// Game is over; close the conversation
			assistant.tell(speech);
		}
		else {
			// Ask the player what to do next
			say(assistant, action, context, timeout);
		}
	}

	// Helpers
	function say(assistant, action, context, length) {
		assistant.data.misheardReplyCount = 0;
		assistant.data.currentAction = action;

		assistant.setContext(context, length);
		assistant.data.lastContext = context;

		let speech = assistant.data.speech;
		assistant.ask(speech);
	}

	function updatePlayer(assistant, player) {
		assistant.data.player = player;
	}
});

// Start the server
var server = app.listen(app.get('port'), function () {
	console.log('App listening on port %s', server.address().port);
	console.log('Press Ctrl+C to quit.');
	//readXMLFile();
	//MoveObject(player.objectName, rooms[0].name);
});
