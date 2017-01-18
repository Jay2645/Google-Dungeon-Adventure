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
// These prompts are used to greet the player when they start the game
const GREETING_PROMPTS = [
	'Hello, and welcome to Dungeon Adventure! I\'ll be your Game Master tonight! Hopefully you\'re ready for some adventure!',
	'Welcome to Dungeon Adventure! I\'ll be your Game Master, and I hope you\'re ready to go on an adventure, because I sure am!',
	'It\'s good to see you! I\'m your Game Master, and we\'re about to go on a Dungeon Adventure!',
	'Hey there! Welcome to Dungeon Adventure! I\'m your Game Master, and I can\'t wait to find out what adventure we\'re going to have!'
];
// These prompts are used when starting character creation
const CHARACTER_PROMPTS = [
	'Let\'s get started by creating a character. What do you want to be called?'
];
// This is used to verify the Game Master heard the player's name correctly
const VERIFY_PLAYER_NAME = 'Okay, so you want me to call you ';
// This is used when the Game Master didn't recognize a player name
const VERIFY_WEIRD_PLAYER_NAME = 'That\'s a strange name. So you wanted me to call you ';
// Used when a player says the Game Master misheard their name
const PLAYER_NAME_NOT_RIGHT = [
	'I\'m sorry, let\'s try that again. What did you want me to call you?',
	'Okay, let\'s try one more time. What do you want your character to be called?'
];
// Used during stat generation
const START_GENERATE_STATS = 'It\'s now time to generate your stats.';
// Used during stat generation or stat lookup
const STRENGTH_STAT = 'Your strength stat is ';
// Used during stat generation or stat lookup
const DEXTERITY_STAT = 'Your dexterity stat is ';
// Used during stat generation or stat lookup
const INTELLIGENCE_STAT = 'Your intelligence stat is ';
// Used to confirm the player is ready to start their game
const READY_FOR_ADVENTURE = 'Are you ready to begin your adventure?';

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

app.post('/', function (request, response) {
	console.log('headers: ' + JSON.stringify(request.headers));
	console.log('body: ' + JSON.stringify(request.body));

	const assistant = new ApiAiAssistant({ request: request, response: response });
	let actionMap = new Map();

	// Greet the player
	// After greeting them, ask them to create a character
	function greet(assistant)
	{
		// Greet the player
		let greeting = getRandomPrompt(GREETING_PROMPTS);
		// Ask them to make a character
		greeting += '\n' + getRandomPrompt(CHARACTER_PROMPTS);

		setContext(assistant, NAME_CONTEXT, 5);

		assistant.data.lastAction = WELCOME_ACTION;
		assistant.ask(greeting);
	}
	actionMap.set(WELCOME_ACTION, greet);

	// Get the player's name and store it
	// Then, ask them if the name is correct
	function getPlayerName(assistant)
	{
		let playerName = assistant.getArgument('given-name');
		assistant.data.playerName = playerName;
		let verification = VERIFY_PLAYER_NAME + playerName + "?";

		setContext(assistant, VERIFY_NAME_CONTEXT, 2);
		assistant.data.lastAction = GET_NAME_ACTION;
		assistant.ask(verification);
	}
	actionMap.set(GET_NAME_ACTION, getPlayerName);

	// This is used as a fallback if we don't recognize a player's name
	function getWeirdPlayerName(assistant) {
		let playerName = assistant.getRawInput();
		assistant.data.playerName = playerName;

		let verification = VERIFY_WEIRD_PLAYER_NAME + playerName + "?";

		setContext(assistant, VERIFY_NAME_CONTEXT, 2);
		assistant.data.lastAction = GET_NAME_ACTION;
		assistant.ask(verification);
	}
	actionMap.set(GET_WEIRD_NAME_ACTION, getWeirdPlayerName);

	// Player said we didn't get their name right
	// Try it one more time
	function retryCharacterName(assistant)
	{
		let retryName = getRandomPrompt(PLAYER_NAME_NOT_RIGHT);
		assistant.data.playerName = undefined;

		setContext(assistant, NAME_CONTEXT, 5);

		assistant.data.lastAction = VERIFY_NAME_NO_ACTION;
		assistant.ask(retryName);
	}
	actionMap.set(VERIFY_NAME_NO_ACTION, retryCharacterName);

	// If the player says their name is correct, move on to next stage of character creation
	// Generate each stat and tell the player what the stats are
	// Then ask if they are ready to go
	function generatePlayerStats(assistant)
	{
		let statString = 'Alright, ' + assistant.data.playerName + '!\n';

		assistant.data.strengthStat = getRandomNumber(0, 20);
		assistant.data.dexterityStat = getRandomNumber(0, 20);
		assistant.data.intelligenceStat = getRandomNumber(0, 20);

		statString += STRENGTH_STAT + assistant.data.strengthStat + '. \n';
		statString += DEXTERITY_STAT + assistant.data.dexterityStat + '. \n';
		statString += INTELLIGENCE_STAT + assistant.data.intelligenceStat + '. \n';
		
		statString += READY_FOR_ADVENTURE;

		setContext(assistant, READY_FOR_ADVENTURE_CONTEXT, 5);

		assistant.data.lastAction = VERIFY_NAME_YES_ACTION;
		assistant.ask(statString);
	}
	actionMap.set(VERIFY_NAME_YES_ACTION, generatePlayerStats);



	// This is used when the Game Master has absolutely no idea what the player just said
	function unknownPlayerInput(assistant)
	{
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
	function setContext(assistant, context, length)
	{
		assistant.setContext(context, length);
		assistant.data.lastContext = context;
	}
});

// Start the server
var server = app.listen(app.get('port'), function () {
	console.log('App listening on port %s', server.address().port);
	console.log('Press Ctrl+C to quit.');
});