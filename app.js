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
	'Hello, and welcome to Dungeon Adventure! I\'ll be your Game Master tonight! Are you ready for adventure?',
	'Welcome to Dungeon Adventure! I\'ll be your Game Master, and I hope you\'re ready to go on an adventure, because I sure am!',
	'It\'s good to see you! I\'m your Game Master, and we\'re about to go on a Dungeon Adventure!',
	'Hey there! Welcome to Dungeon Adventure! I\'m your Game Master, and I can\'t wait to find out what adventure we\'re going to have!'
];

/// Actions
// This action is sent when the player first opens the game
const WELCOME_ACTION = 'input.welcome'
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

	function greet(assistant)
	{
		assistant.tell(getRandomPrompt(GREETING_PROMPTS));
		generateAnswer(assistant);
	}

	function generateAnswer(assistant)
	{
		console.log('generateAnswer');
		var answer = getRandomNumber(0, 100);
		assistant.data.answer = answer;
		assistant.ask('I\'m thinking of a number from 0 and 100. What\'s your first guess?');
	}

	function checkGuess(assistant)
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
	}

	let actionMap = new Map();
	actionMap.set(WELCOME_ACTION, greet);
	actionMap.set(GENERATE_ANSWER_ACTION, generateAnswer);
	actionMap.set(CHECK_GUESS_ACTION, checkGuess);

	assistant.handleRequest(actionMap);
});

// Start the server
var server = app.listen(app.get('port'), function () {
	console.log('App listening on port %s', server.address().port);
	console.log('Press Ctrl+C to quit.');
});