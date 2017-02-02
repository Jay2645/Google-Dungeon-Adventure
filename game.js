let xml2js = require('xml2js');
let fs = require('fs');

// Load the game itself
let parser = new xml2js.Parser();


module.exports = {
  player: {},
  rooms: [],
  gameMap: new Map(),
  objectMap: new Map(),
  xmlCallback: function () {},
  readXMLFile: function () {
  	// Populate the game from an XML file
  	fs.readFile('game.aslx', function(err, data) {
  			parser.parseString(data, function (err, result) {
  					console.log("Read from file!");
  					module.exports.player.objectName = result.asl.game[0].pov[0]['_'];

  					var gameObjects = result.asl.object;
  					// Iterate over all objects in the game
  					for(var object in gameObjects) {
  						let room = getObjectFromXML(gameObjects[object]);
  						module.exports.gameMap.set(room.name, room);
  						module.exports.rooms[object] = room;
  					}

  					//for(var room in module.exports.rooms) {
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
  						//console.dir(module.exports.rooms[room]);
  						//console.log(rooms[room].items);
  					//}
  					//console.dir(rooms[2].items[9]);
            module.exports.xmlCallback();
  			});
  	});
  }
}

// We can't push notifications to the player, so any "SetTimeout" functions need to be removed
// The problem is these are followed by a code block, which could have nested brackets
// This will find those brackets and remove that block
var stripSetTimeout = function (block, startIndex) {
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
var convertScriptToJS = function (script) {
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
	script = script.replace(waitRegex, "msg('<break time=\"1s\"/>'); {");

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

var getObjectFromXML = function (gameObject) {
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
    if(gameObject.description[0]['_'] === undefined) {
		    object.description = convertScriptToJS("msg(\""+gameObject.description[0]+"\");");
    }
    else {
      object.description = convertScriptToJS(gameObject.description[0]['_']);
    }

		console.dir(gameObject.description[0]);
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
				exit.look = 'You are looking ' + exits['alias'] + '.';
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
	module.exports.objectMap.set(object.name, object);
	return object;
}
