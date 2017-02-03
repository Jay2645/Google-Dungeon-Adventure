let ecs = require('./ecs');
let ecsComponents = require('./ecsComponents');

module.exports = {
  playerObjectName: "",
  player: {},
  rooms: [],
  gameMap: new Map(),
  objectMap: new Map(),
  // Whether this action closes the game
  gameOver: false,
  log: "",

  inheritObject: function(derivedObject, objectName) {
    return Inherit(derivedObject, objectName);
  },

  createBasicObjects: function() {
    CreateBasicObjects();
  },

  // A Quest function. Moves the object to the given room.
  moveObject: function (object, room) {
    var objectName = object.id;
    var roomName = room.id;

    if(objectName === undefined || roomName === undefined) {
      console.log("Did not pass an entity to moveObject!");
      return;
    }

    if(object.components.NamedComponent != undefined) {
      objectName = object.components.NamedComponent.entityName;
    }
    if(room.components.NamedComponent != undefined) {
      roomName = room.components.NamedComponent.entityName;
    }
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

function CreateBasicObjects() {
  var plural = ecs.getNewEntity();
  plural.addComponent(ecsComponents.getNamedComponent("plural"));
  plural.addComponent(ecsComponents.getPluralComponent(2));
  plural.addComponent(ecsComponents.getGenderComponent("they", "them"));
  module.exports.objectMap.set(plural.components.NamedComponent.entityName, plural);

  var containerBase = ecs.getNewEntity();
  containerBase.addComponent(ecsComponents.getNamedComponent("container_base"));
  containerBase.addComponent(ecsComponents.getContainerComponent([]));
  module.exports.objectMap.set(containerBase.components.NamedComponent.entityName, containerBase);

  var closedContainer = ecs.getNewEntity();
  closedContainer.addComponent(ecsComponents.getNamedComponent("container_closed"));
  closedContainer = Inherit(closedContainer, "container_base");
  closedContainer.addComponent(ecsComponents.getOpenableComponent(false));
  module.exports.objectMap.set(closedContainer.components.NamedComponent.entityName, closedContainer);

  var openContainer = ecs.getNewEntity();
  openContainer.addComponent(ecsComponents.getNamedComponent("container_closed"));
  openContainer = Inherit(openContainer, "container_open");
  openContainer.addComponent(ecsComponents.getOpenableComponent(true));
  module.exports.objectMap.set(openContainer.components.NamedComponent.entityName, openContainer);

  var surface = ecs.getNewEntity();
  surface.addComponent(ecsComponents.getNamedComponent("surface"));
  surface = Inherit(surface, "container_base");
  surface.addComponent(ecsComponents.getTransparentComponent(true));
  surface.addComponent(ecsComponents.getPrefixComponent("on which there is"));
  module.exports.objectMap.set(surface.components.NamedComponent.entityName, surface);

  var container = ecs.getNewEntity();
  container.addComponent(ecsComponents.getNamedComponent("container"));
  container = Inherit(container, "container_open");
  module.exports.objectMap.set(container.components.NamedComponent.entityName, container);

  var containerLimited = ecs.getNewEntity();
  containerLimited.addComponent(ecsComponents.getNamedComponent("container_limited"));
  containerLimited = Inherit(containerLimited, "container");
  containerLimited.addComponent(ecsComponents.getContainerComponent([], 1, 100));
  module.exports.objectMap.set(containerLimited.components.NamedComponent.entityName, containerLimited);

  var containerLockable = ecs.getNewEntity();
  containerLockable.addComponent(ecsComponents.getNamedComponent("container_lockable"));
  containerLockable = Inherit(containerLockable, "container_closed");
  containerLockable.addComponent(ecsComponents.getOpenableComponent(false, "", "", "", "", "", true, "You do not have the key.", "Locked.", "Unlocked."));
  module.exports.objectMap.set(containerLockable.components.NamedComponent.entityName, containerLockable);

  var switchable = ecs.getNewEntity();
  switchable.addComponent(ecsComponents.getNamedComponent("switchable"));
  switchable.addComponent(ecsComponents.getSwitchableComponent(false));
  module.exports.objectMap.set(switchable.components.NamedComponent.entityName, switchable);
}

function Inherit(derivedObject, parentName) {
  var inheritedGameObj = module.exports.objectMap.get(parentName);
  //console.log(derivedObject + " is inheriting "+parentName + inheritedGameObj);
  if(inheritedGameObj != undefined) {
    // Copy all components from parent object
    for(var component in inheritedGameObj.components) {
      if(component == 'NamedComponent') {
        continue;
      }
      derivedObject.addComponent(inheritedGameObj.components[component]);
    }
  }
  return derivedObject;
}

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
    object.context.components.ContainerComponent.items.splice(object.itemIndex, 1);
    // Update other indicies
    for(var otherIndex in object.context.components.ContainerComponent.items) {
      var otherObject = object.context.components.ContainerComponent.items[otherIndex];
      otherObject.itemIndex = otherIndex;
      module.exports.objectMap.set(otherObject.components.NamedComponent.entityName, otherObject);
    }
    // Update old maps
    module.exports.objectMap.set(object.context.components.NamedComponent.entityName, object.context);
    if(module.exports.gameMap.has(object.context.components.NamedComponent.entityName)) {
      module.exports.gameMap.set(object.context.components.NamedComponent.entityName, object.context);
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
  object.itemIndex = room.components.ContainerComponent.items.push(object) - 1;

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
