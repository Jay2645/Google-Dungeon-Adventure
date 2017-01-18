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

/// Actions
// This action is sent when the player first opens the game
const WELCOME_ACTION = 'input.welcome';
const GET_NAME_ACTION = 'get_player_name';
const GENERATE_ANSWER_ACTION = 'generate_answer';
const CHECK_GUESS_ACTION = 'check_guess';

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

		assistant.data.lastAction = GET_NAME_ACTION;
		assistant.ask(verification);
	}
	actionMap.set(GET_NAME_ACTION, getPlayerName);

	// If the player says their name is correct, move on to next stage of character creation
	// Generate each stat and tell the player what the stats are
	// Then ask if they are ready to go
	function generatePlayerStats(assistant)
	{

	}

	/*function checkGuess(assistant)
	{
		console.log('checkGuess');
		let answer = assistant.data.answer;
		let guess = parseInt(assistant.getArgument('guess'));
		if (answer > guess) {
			assistant.ask('It\'s higher than ' + guess + '. What\'s your next guess?');
		} else if (answer < guess) {
			assistant.ask('It\'s lower than ' + guess + '. Next guess?');
		} else {
			assistant.tell('Congratulations! You guessed ' + guess +', and I was thinking of ' + answer + '!');
		}
	}*/
	//actionMap.set(GENERATE_ANSWER_ACTION, generateAnswer);
	//actionMap.set(CHECK_GUESS_ACTION, checkGuess);

	assistant.handleRequest(actionMap);
});

// Start the server
var server = app.listen(app.get('port'), function () {
	console.log('App listening on port %s', server.address().port);
	console.log('Press Ctrl+C to quit.');
});