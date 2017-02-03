let xml2js = require('xml2js');
let fs = require('fs');

// Load the game itself
let parser = new xml2js.Parser();
let game = require('./game');
let ecsComponents = require('./ecsComponents');
let ecs = require('./ecs');

module.exports = {
  xmlCallback: function () {},
  readXMLFile: function () {
  	// Populate the game from an XML file
  	fs.readFile('game.aslx', function(err, data) {
  			parser.parseString(data, function (err, result) {
  					console.log("Read from file!");
  					game.playerObjectName = result.asl.game[0].pov[0]['_'];
            game.createBasicObjects();

  					var gameObjects = result.asl.object;
  					// Iterate over all objects in the game
  					for(var object in gameObjects) {
  						let room = getObjectFromXML(gameObjects[object]);
  						game.gameMap.set(room.components.NamedComponent.entityName, room);
  						game.rooms[object] = room;
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
var convertScriptToJS = function (xmlScript) {
	if(xmlScript === undefined) {
		return "";
	}

  var script = "";
	if(xmlScript['_'] != undefined) {
		script = xmlScript['_'];
	}
	else {
		script = "msg(\""+xmlScript+"\");";
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
	let object = ecs.getNewEntity();

	// Fetch the object's name
  object.addComponent(ecsComponents.getNamedComponent(gameObject['$'].name));
  // If this is the player, update the player
  if(object.components.NamedComponent.entityName === game.playerObjectName) {
    game.player = object;
  }
	//object.name = gameObject['$'].name;

  // Get inherited object properties
  if(gameObject.inherit != undefined) {
    for(var inheritedObj in gameObject.inherit) {
      object = game.inheritObject(object, gameObject.inherit[inheritedObj]['$'].name);
    }
  }

	// Fetch basic object properties
	// Whether this object is visible
	if(gameObject.visible != undefined) {
		var visible = gameObject.visible[0]['_'];
    if(visible) {
        object.addComponent(ecsComponents.getVisibleComponent(true));
    }
	}
  else {
    object.addComponent(ecsComponents.getVisibleComponent(true));
  }

	if(gameObject.scenery != undefined && gameObject.scenery[0]['_'] != undefined) {
		var scenery = gameObject.scenery[0]['_'];
    if(scenery) {
      object.addComponent(ecsComponents.getSceneryComponent(true));
    }
	}

  // Get the description, if it exists
  if(gameObject.description != undefined) {
      object.addComponent(ecsComponents.getDescriptionComponent(convertScriptToJS(gameObject.description[0])));
  }
  else if(gameObject.look != undefined) {
    object.addComponent(ecsComponents.getDescriptionComponent(convertScriptToJS(gameObject.look[0])));
  }
  else if(gameObject.attr != undefined) {
    object.addComponent(ecsComponents.getDescriptionComponent(convertScriptToJS(gameObject.attr[0])));
  }

  var dropMsg = "";
  if(gameObject.dropMsg != undefined) {
    dropMsg = gameObject.dropmsg[0];
  }
	// Whether this object can be dropped
	if(gameObject.drop != undefined) {
    // If we have drop defined as true or false:
		var drop = gameObject.drop[0]['_'];
    if(drop) {
      object.addComponent(ecsComponents.getDroppableComponent(true, convertScriptToJS(dropMsg)));
    }
    else if(dropMsg != "") {
      // We can't drop the item, but we have a drop message telling us why
      object.addComponent(ecsComponents.getDroppableComponent(false, convertScriptToJS(dropMsg)));
    }
	}
  else if(gameObject.take != undefined) {
    object.addComponent(ecsComponents.getDroppableComponent(true, convertScriptToJS(dropMsg)));
  }
  else if(dropMsg != "") {
    // It is undefined whether we can drop the object,
    // but we can't take it and we have a drop message explaining why we can't drop it
    object.addComponent(ecsComponents.getDroppableComponent(false, convertScriptToJS(dropMsg)));
  }

  var takeMsg = "";
  if(gameObject.takeMsg != undefined) {
    takeMsg = gameObject.takemsg[0];
  }
	if(gameObject.take != undefined) {
		var take = convertScriptToJS(gameObject.take[0]);
    object.addComponent(ecsComponents.getTakeableComponent(take, convertScriptToJS(takeMsg)));
	}
  else if(takeMsg != "") {
    object.addComponent(ecsComponents.getTakeableComponent("", convertScriptToJS(takeMsg)));
  }

  //console.log(object);

	if(gameObject.breathe != undefined) {
		object.addComponent(ecsComponents.getBreatheableComponent(convertScriptToJS(gameObject.breathe[0])));
	}
	if(gameObject.smell != undefined) {
	   object.addComponent(ecsComponents.getSmellableComponent(convertScriptToJS(gameObject.smell[0])));
	}

  var openMsg = "";
	if(gameObject.openmsg != undefined) {
		openMsg = convertScriptToJS(gameObject.openmsg[0]);
	}
  var isOpen = false;
	if(gameObject.isopen != undefined) {
		isOpen = gameObject.isopen[0]['_'];
	}
  var closeMsg = "";
	if(gameObject.closemsg != undefined) {
		closeMsg = convertScriptToJS(gameObject.closemsg[0]);
	}
  var onClose = "";
  if(gameObject.onclose != undefined) {
    onClose = convertScriptToJS(gameObject.onclose[0]);
  }
  var onOpen = "";
  if(gameObject.onopen != undefined) {
    onOpen = convertScriptToJS(gameObject.onopen[0]);
  }
  var locked = false;
	if(gameObject.locked != undefined) {
		locked = gameObject.locked[0]['_'];
	}
  var noKeyMsg = "";
	if(gameObject.nokeymessage != undefined) {
		noKeyMsg = convertScriptToJS(gameObject.nokeymessage[0]);
	}
  if(noKeyMsg != "" && !locked) {
    locked = true;
  }
  var unlockMsg = "";
	if(gameObject.unlockmessage != undefined) {
		unlockMsg = convertScriptToJS(gameObject.unlockmessage[0]);
	}
  var lockMsg = "";
	if(gameObject.lockmessage != undefined) {
		lockMsg = convertScriptToJS(gameObject.lockmessage[0]);
	}
  var knockOnMsg = "";
  if(gameObject.knockon != undefined) {
    knockOnMsg = convertScriptToJS(gameObject.knockon[0]);
  }
  if(isOpen || openMsg != "" || onOpen != "" || closeMsg != "" || onClose != "" || knockOnMsg != "" || locked || noKeyMsg != "" || unlockMsg != "" || lockMsg != "") {
    object.addComponent(ecsComponents.getOpenableComponent(isOpen, onOpen, onClose, openMsg, closeMsg, knockOnMsg, locked, noKeyMsg, lockMsg, unlockMsg));
  }


	if(gameObject.kick != undefined) {
		object.kick = convertScriptToJS(gameObject.kick[0]);
	}
	if(gameObject.hit != undefined) {
		object.hit = convertScriptToJS(gameObject.hit[0]);
	}
	if(gameObject.hurt != undefined) {
		object.hurt = convertScriptToJS(gameObject.hurt[0]);
	}
	if(gameObject.break != undefined) {
		object.break = convertScriptToJS(gameObject.break[0]);
	}
	if(gameObject.stroke != undefined) {
		object.stroke = convertScriptToJS(gameObject.stroke[0]);
	}
	if(gameObject.pet != undefined) {
		object.pet = convertScriptToJS(gameObject.pet[0]);
	}
	if(gameObject.feed != undefined) {
		object.feed = convertScriptToJS(gameObject.feed[0]);
	}
	if(gameObject.pull != undefined) {
		object.pull = convertScriptToJS(gameObject.pull[0]);
	}
	if(gameObject.push != undefined) {
		object.push = convertScriptToJS(gameObject.push[0]);
	}
	if(gameObject.knockon != undefined) {
		object.knockon = convertScriptToJS(gameObject.knockon[0]);
	}
	if(gameObject.sit != undefined) {
		object.sit = convertScriptToJS(gameObject.sit[0]);
	}

	if(gameObject.climb != undefined) {
		object.climb = convertScriptToJS(gameObject.climb[0]);
	}

	if(gameObject.displayverbs != undefined) {
		object.displayVerbs = gameObject.displayverbs[0].value;
	}

	for(var beforefirstenter in gameObject.beforefirstenter) {
		var beforeFirstEntranceText = gameObject.beforefirstenter[beforefirstenter];
		if(beforeFirstEntranceText === undefined) {
			continue;
		}
		object.beforeFirstEnter = convertScriptToJS(beforeFirstEntranceText);
	}

	for(var firstEnter in gameObject.firstenter) {
		var firstEntranceText = gameObject.firstenter[firstEnter];
		if(firstEntranceText === undefined) {
			continue;
		}
		object.firstEnter = convertScriptToJS(firstEntranceText);
	}

	// Get script which plays when the player enters the object
	for(var entrance in gameObject.enter) {
		var entranceText = gameObject.enter[entrance];
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
					var script = convertScriptToJS(rawScript[0]);
					exit.script = script;
					//console.log(exits['alias'] +": "+script);
				}
				object.exits[exits['alias']] = exit;
				//console.dir(room);
			}
		}
	}

  // Find items contained inside this object
	var items = [];
	var roomItems = gameObject.object;
	for(var itemIndex in roomItems) {
		items[itemIndex] = getObjectFromXML(roomItems[itemIndex]);
		items[itemIndex].context = object;
		items[itemIndex].itemIndex = itemIndex;
	}

  if(items.length > 0) {
    if(object.components.ContainerComponent != undefined) {
      object.components.ContainerComponent.items = items;
    }
    else {
      object.addComponent(ecsComponents.getContainerComponent(items));
    }
  }
  console.log(object);

  game.objectMap.set(object.components.NamedComponent.entityName, object);
	return object;
}
