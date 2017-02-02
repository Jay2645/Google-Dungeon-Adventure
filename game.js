
module.exports = {
  player: {},
  rooms: [],
  gameMap: new Map(),
  objectMap: new Map(),

  // A Quest function. Moves the object to the given room.
  MoveObject: function (objectName, roomName) {

  	var room = game.gameMap.get(roomName);
  	var object = game.objectMap.get(objectName);

  	/*if(object.context.name === room.name) {
  		// Already in the room
  		return;
  	}*/

  	//console.log("Moving "+object.name+" from "+object.context.name +" to "+room.name);

  	if(object.context != undefined) {
  		// Remove from the old context
  		object.context.items.splice(object.itemIndex, 1);
  		// Update other indicies
  		for(var otherIndex in object.context.items) {
  			object.context.items[otherIndex].itemIndex = otherIndex;
  			game.objectMap.set(object.context.items[otherIndex].name, object.context.items[otherIndex]);
  		}
  		// Update old maps
  		game.objectMap.set(object.context.name, object.context);
  		if(game.gameMap.has(object.context.name)) {
  			game.gameMap.set(object.context.name, object.context);
  		}
  	}

  	// If the player is moving, update POV stuff
  	if(objectName === game.player.objectName) {
  		// Trigger before first enter
  		if(room.firstTime) {
  			eval(room.beforeFirstEnter);
  		}
  		// Reset the first time bool on the previous room
  		if(game.player.currentRoom != undefined) {
  			game.player.currentRoom.firstTime = false;
  		}
  		// Move the player's room
  		game.player.currentRoom = room;
  		if(room.firstTime) {
  			eval(room.firstEnter);
  		}
  		eval(room.description);
  	}

  	object.context = room;
  	object.itemIndex = room.items.push(object) - 1;

  	game.gameMap.set(roomName, room);
  	game.objectMap.set(roomName, room);
  	game.objectMap.set(object.name, object);
  },

  // A Quest function. Makes the game say whatever is in the text.
  msg: function (text) {
  		text = text.replace(/<br\/>/mg,"\n");
  		text = text.replace(/\\"/mg, "\"");
  		speech += text;
  		//console.log(text);
  },

  // A Quest function. Ends the game.
  finish: function () {
  		gameOver = true;
  },

  // A Quest function. Returns whether the object has the given flag set.
  GetBoolean: function (objectName, flag) {
  	if(game.objectMap.has(objectName)) {
  		var object = game.objectMap.get(objectName);
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
  },

  // A Quest function. Checks to see if the player has the object in their inventory.
  Got: function (object) {
  	var playerObject = objectMap.get(player.objectName);
  	return gotObject(playerObject, object);
  },

  // Removes the object from the player's inventory
  RemoveObject: function (objectName) {

  },

  // Sets the flag on the given object to the given state.
  SetObjectFlagOff: function (objectName, objectState) {
  	var object = {};
  	if(globals.has(objectName)) {
  		object = objectMap.get(objectName);
  	}
  	object[objectState] = false;
  	objectMap.set(objectName, object);
  },

  // Sets the flag on the given object to "true".
  SetObjectFlagOn: function (objectName, objectState) {
  	var object = {};
  	if(globals.has(objectName)) {
  		object = objectMap.get(objectName);
  	}
  	object[objectState] = true;
  	objectMap.set(objectName, object);
  },

  HelperOpenObject: function (objectName) {

  },

  HelperCloseObject: function (objectName) {

  },

  AddToInventory: function (objectName) {

  }
};

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
