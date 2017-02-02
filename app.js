'use strict';

// Enable actions client library debugging
process.env.DEBUG = 'actions-on-google:*';

let ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
let express = require('express');
let bodyParser = require('body-parser');

let app = express();
app.set('port', (process.env.PORT || 8080));
app.use(bodyParser.json({ type: 'application/json' }));

let xmlImport = require('./xmlImport');
let game = require('./game');

// What the assistant will say
let speech = "";

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

function getExits() {
	const EXIT_LOCATIONS = ['Exits are to the ',
		'There are exits to the ',
		'You can exit to the ',
		'You are able to move to the '
	];
	const NO_EXIT = 'You cannot see an exit!';

	// Find exits
	var exits = [];
	if(player.currentRoom === undefined || player.currentRoom.exits === undefined) {
		return NO_EXIT;
	}
	for(var exit in player.currentRoom.exits) {
		exits.push(exit);
	}
	if(exits.length === 0) {
		return NO_EXIT;
	}

	// Print exits
	var exitString = getRandomPrompt(EXIT_LOCATIONS);
	for(var i = 0; i < exits.length; i++) {
		exitString += exits[i];
		if(i + 1 === exits.length) {
			exitString += '.';
		}
		else {
			if(exits.length > 2) {
				exitString += ', ';
			}
			if(i + 2 === exits.length) {
				exitString += 'and ';
			}
		}
	}
	return exitString;
}

const LOOK_DIRECTION_ACTION = 'look_direction_action';
function getLookDirection(direction) {
	const CANT_SEE = 'You can\'t see much to the ';
	if(player.currentRoom === undefined || player.currentRoom.exits === undefined || player.currentRoom.exits[direction] === undefined) {
		return CANT_SEE + direction + '.';
	}
	return player.currentRoom.exits[direction].look;
}

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
		game.clearLog();
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

				game.player = {};
				game.player.name = "";
				game.player.objectName = "player";
				game.player.inventory = {};

				// Also, import XML data
				xmlImport.readXMLFile();
			break;
			case GET_NAME_ACTION:
				// Get the player's name and store it
				// Then, ask them if the name is correct
				var playerName = assistant.getArgument('given-name');
				game.player.name = playerName;

				// Verify the name is correct
				speech = getVerifyPlayerName(game.player, false);

				action = GET_NAME_ACTION;
				context = VERIFY_NAME_CONTEXT;
				timeout = 2;
			break;
			case GET_WEIRD_NAME_ACTION:
				// Used when we don't recognize a player's name

				// Make the player
				var playerName = assistant.getRawInput();
				game.player.name = playerName;

				// Verify that the name is correct
				speech = getVerifyPlayerName(game.player, true);

				action = GET_NAME_ACTION;
				context = VERIFY_NAME_CONTEXT;
				timeout = 2;
			break;
			case VERIFY_NAME_NO_ACTION:
				// Player said we didn't get their name right
				// Try it one more time

				// Reset the player name
				game.player.name = "";

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
				game.player.strengthStat = getRandomNumber(0, 20);
				game.player.dexterityStat = getRandomNumber(0, 20);
				game.player.intelligenceStat = getRandomNumber(0, 20);

				// Tell the player about the stats
				speech = getGenerateStatsBegin(game.player);
				speech += '\n';

				// Print the value for each stat
				speech += getStrengthStat(game.player);
				speech += '\n';
				speech += getDexterityStat(game.player);
				speech += '\n';
				speech += getIntelligenceStat(game.player);
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
				game.moveObject(game.player.objectName, game.rooms[0].name);

				speech = game.log;

				action = READY_TO_PLAY_YES_ACTION;
				context = GAME_CONTEXT;
			break;
			case LOOK_DIRECTION_ACTION:
				speech = getLookDirection();

			break;
			case HELP_ACTION:
				// Player has asked for help
				speech = getHelp(assistant.data.lastContext, game.player);

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
								speech += getHelp(assistant.data.lastContext, player);
							}

							// Manually ask the player to repeat to avoid resetting misheardReplyCount
							assistant.data.speech = speech;
							assistant.ask(speech);
							return;
					}
				}
			break;
		}

		updatePlayer(assistant, game.player);
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
		//assistant.data.player = player;
	}
});

function xmlDone() {
  console.log("XML callback!");
  game.moveObject(game.player.objectName, game.rooms[0].name);
}

// Start the server
var server = app.listen(app.get('port'), function () {
	console.log('App listening on port %s', server.address().port);
	console.log('Press Ctrl+C to quit.');
  //xmlImport.xmlCallback = xmlDone;
	//xmlImport.readXMLFile();
});
