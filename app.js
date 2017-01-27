'use strict';

// Enable actions client library debugging
process.env.DEBUG = 'actions-on-google:*';

let ApiAiAssistant = require('actions-on-google').ApiAiAssistant;
let express = require('express');
let bodyParser = require('body-parser');

let app = express();
app.set('port', (process.env.PORT || 8080));
app.use(bodyParser.json({ type: 'application/json' }));

/// Prompts
const CONFUSED = [
	'I\'m sorry, but I didn\'t catch that. Can you say it again?'
];

/// Actions
// This action is sent when the player first opens the game
const WELCOME_ACTION = 'input.welcome';
const GET_NAME_ACTION = 'get_player_name';
const GET_WEIRD_NAME_ACTION = 'get_weird_player_name';
const GENERATE_ANSWER_ACTION = 'generate_answer';
const CHECK_GUESS_ACTION = 'check_guess';
const VERIFY_NAME_NO_ACTION = 'verify_character_name_no';
const VERIFY_NAME_YES_ACTION = 'verify_character_name_yes';

const CONFUSED_ACTION = 'input.unknown';

/// Contexts
// This context is used when a user is picking a name
const NAME_CONTEXT = 'character_name';
const VERIFY_NAME_CONTEXT = 'verify_character_name';
const READY_FOR_ADVENTURE_CONTEXT = 'ready_for_adventure';

// Utility function to pick prompts
function getRandomPrompt(array) {
	return array[Math.floor(Math.random() * (array.length))];
}

function getRandomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

////////////////////////////// GREETINGS
// This greets the player
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

////////////////////////////// CHARACTER NAMES
// This asks the player to create a character
function getCreateCharacter() {
	// Ask them to make a character
	// These prompts are used when starting character creation
	const CHARACTER_PROMPTS = [
		'Let\'s get started by creating a character. What do you want to be called?'
	];

	return getRandomPrompt(CHARACTER_PROMPTS);
}

// This is used to verify the Game Master heard the player's name correctly
function getVerifyPlayerName(player, isWeirdName) {
	const VERIFY_PLAYER_NAME = 'Okay, so you want me to call you ';
	// This is used when the Game Master didn't recognize a player name
	const VERIFY_WEIRD_PLAYER_NAME = 'That\'s a strange name. So you wanted me to call you ';

	if(isWeirdName) {
		return VERIFY_WEIRD_PLAYER_NAME + player.name;
	}
	else {
		return VERIFY_PLAYER_NAME + player.name;
	}
}

function getRetryPlayerName() {
	// Used when a player says the Game Master misheard their name
	const PLAYER_NAME_NOT_RIGHT = [
		'I\'m sorry, let\'s try that again. What did you want me to call you?',
		'Okay, let\'s try one more time. What do you want your character to be called?'
	];

	return getRandomPrompt(PLAYER_NAME_NOT_RIGHT);
}

////////////////////////////// CHARACTER STATS
function getGenerateStatsBegin(player) {
	// Used during stat generation
	const START_GENERATE_STATS = 'It\'s now time to generate your stats. These stats range from 0 to 20.';

	return 'Alright, ' + player.name + '! ' + START_GENERATE_STATS;
}

function getStrengthStat(player) {
	// Used during stat generation or stat lookup
	const STRENGTH_STAT = 'Your strength stat is ';

	return STRENGTH_STAT + player.strengthStat;
}

function getDexterityStat(player) {
	// Used during stat generation or stat lookup
	const DEXTERITY_STAT = 'Your dexterity stat is ';

	return DEXTERITY_STAT + player.dexterityStat;
}

function getIntelligenceStat(player) {
	// Used during stat generation or stat lookup
	const INTELLIGENCE_STAT = 'Your intelligence stat is ';

	return INTELLIGENCE_STAT + player.intelligenceStat;
}

////////////////////////////// BEGIN NEW Game
function getBeginNewGame() {
	// Used to confirm the player is ready to start their game
	const READY_FOR_ADVENTURE = 'Are you ready to begin your adventure?';

	return READY_FOR_ADVENTURE;
}

// Switch between various things for the assistant to say
app.post('/', function (request, response) {
	console.log('headers: ' + JSON.stringify(request.headers));
	console.log('body: ' + JSON.stringify(request.body));

	const assistant = new ApiAiAssistant({ request: request, response: response });
	let actionMap = new Map();

	// Greet the player
	// After greeting them, ask them to create a character
	function greet(assistant)
	{
		assistant.data.speech = getGreeting();
		assistant.data.speech += '\n';
		assistant.data.speech += getCreateCharacter();

		say(assistant, WELCOME_ACTION, NAME_CONTEXT, 5);
	}
	actionMap.set(WELCOME_ACTION, greet);

	// Get the player's name and store it
	// Then, ask them if the name is correct
	function getPlayerName(assistant)
	{
		// Make the player
		let playerName = assistant.getArgument('given-name');
		let player = {};
		player.name = playerName;
		updatePlayer(assistant, player);

		// Verify the name is correct
		assistant.data.speech = getVerifyPlayerName(player, false);
		say(assistant, GET_NAME_ACTION, VERIFY_NAME_CONTEXT, 2);
	}
	actionMap.set(GET_NAME_ACTION, getPlayerName);

	// This is used as a fallback if we don't recognize a player's name
	function getWeirdPlayerName(assistant) {
		// Make the player
		let playerName = assistant.getRawInput();
		let player = {};
		player.name = playerName;
		updatePlayer(assistant, player);

		// Verify that the name is correct
		assistant.data.speech = getVerifyPlayerName(player, true);
		say(assistant, GET_NAME_ACTION, VERIFY_NAME_CONTEXT, 2);
	}
	actionMap.set(GET_WEIRD_NAME_ACTION, getWeirdPlayerName);

	// Player said we didn't get their name right
	// Try it one more time
	function retryCharacterName(assistant) {
		// Reset the player
		updatePlayer(assistant, undefined);

		// Ask the player to retry their name again
		assistant.data.speech = getRetryPlayerName();
		say(assistant, VERIFY_NAME_NO_ACTION, NAME_CONTEXT, 5);
	}
	actionMap.set(VERIFY_NAME_NO_ACTION, retryCharacterName);

	// If the player says their name is correct, move on to next stage of character creation
	// Generate each stat and tell the player what the stats are
	// Then ask if they are ready to go
	function generatePlayerStats(assistant) {
		// Generate player stats
		assistant.data.player.strengthStat = getRandomNumber(0, 20);
		assistant.data.player.dexterityStat = getRandomNumber(0, 20);
		assistant.data.player.intelligenceStat = getRandomNumber(0, 20);

		// Tell the player about the stats
		assistant.data.speech = getGenerateStatsBegin(assistant.data.player);
		assistant.data.speech += '\n';

		// Print the value for each stat
		assistant.data.speech += getStrengthStat();
		assistant.data.speech += '\n';
		assistant.data.speech += getDexterityStat();
		assistant.data.speech += '\n';
		assistant.data.speech += getIntelligenceStat();
		assistant.data.speech += '\n';

		// Ask the player if they want to start a game
		assistant.data.speech += getBeginNewGame();

		say(assistant, VERIFY_NAME_YES_ACTION, READY_FOR_ADVENTURE_CONTEXT, 5);
	}
	actionMap.set(VERIFY_NAME_YES_ACTION, generatePlayerStats);



	// This is used when the Game Master has absolutely no idea what the player just said
	function unknownPlayerInput(assistant) {
		// If we were talking about names last, that might be a name
		if (assistant.data.lastContext == NAME_CONTEXT)
		{
			getWeirdPlayerName(assistant);
		}
		else
		{
			// No idea
			assistant.tell(getRandomPrompt(CONFUSED));
		}
	}
	actionMap.set(CONFUSED_ACTION, unknownPlayerInput);

	assistant.handleRequest(actionMap);


	// Helpers
	function say(assistant, action, context, length) {
		assistant.data.lastAction = action;

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
});
