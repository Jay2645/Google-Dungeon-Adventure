module.exports = {
  player: {},
  rooms: [],
  gameMap: new Map(),
  objectMap: new Map(),
  // Whether this action closes the game
  gameOver: false,
  log: "",

  // A Quest function. Moves the object to the given room.
  moveObject: function (objectName, roomName) {
    MoveObject(objectName, roomName);
  },

  // A Quest function. Makes the game say whatever is in the text.
  sayMsg: function (text) {
  		msg(text);
  },

  // A Quest function. Ends the game.
  gameOver: function () {
  		finish();
  },

  // A Quest function. Returns whether the object has the given flag set.
  getBoolean: function (objectName, flag) {
  	return GetBoolean(objectName, flag);
  },

  // A Quest function. Checks to see if the player has the object in their inventory.
  got: function (object) {
    return Got(object);
  },

  // Removes the object from the player's inventory
  removeObject: function (objectName) {
    RemoveObject(objectName);
  },

  // Sets the flag on the given object to the given state.
  setObjectFlagOff: function (objectName, objectState) {
  	SetObjectFlagOff(objectName, objectState);
  },

  // Sets the flag on the given object to "true".
  setObjectFlagOn: function (objectName, objectState) {
  	SetObjectFlagOn(objectName, objectState);
  },

  helperOpenObject: function (objectName) {
    HelperOpenObject(objectName);
  },

  helperCloseObject: function (objectName) {
    HelperCloseObject(objectName);
  },

  addToInventory: function (objectName) {
    AddToInventory(objectName);
  },

  clearLog: function() {
    module.exports.log = "";
  }
};

// A Quest function. Moves the object to the given room.
function MoveObject(objectName, roomName) {

  var room = module.exports.gameMap.get(roomName);
  var object = module.exports.objectMap.get(objectName);

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
      module.exports.objectMap.set(object.context.items[otherIndex].name, object.context.items[otherIndex]);
    }
    // Update old maps
    module.exports.objectMap.set(object.context.name, object.context);
    if(module.exports.gameMap.has(object.context.name)) {
      module.exports.gameMap.set(object.context.name, object.context);
    }
  }

  // If the player is moving, update POV stuff
  if(objectName === module.exports.player.objectName) {
    // Trigger before first enter
    if(room.firstTime) {
      eval(room.beforeFirstEnter);
    }
    // Reset the first time bool on the previous room
    if(module.exports.player.currentRoom != undefined) {
      module.exports.player.currentRoom.firstTime = false;
    }
    // Move the player's room
    module.exports.player.currentRoom = room;
    if(room.firstTime) {
      eval(room.firstEnter);
    }
    eval(room.description);
  }

  object.context = room;
  object.itemIndex = room.items.push(object) - 1;

  module.exports.gameMap.set(roomName, room);
  module.exports.objectMap.set(roomName, room);
  module.exports.objectMap.set(object.name, object);
}

// A Quest function. Makes the game say whatever is in the text.
function msg(text) {
    text = text.replace(/<br\/>/mg,"\n");
    text = text.replace(/\\"/mg, "\"");

    module.exports.log += text;
}

// A Quest function. Ends the game.
function finish() {
    module.exports.gameOver = true;
}

// A Quest function. Returns whether the object has the given flag set.
function GetBoolean(objectName, flag) {
  if(module.exports.objectMap.has(objectName)) {
    var object = module.exports.objectMap.get(objectName);
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
