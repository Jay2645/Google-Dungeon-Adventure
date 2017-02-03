module.exports = {
  getNamedComponent: function(name) {
    return new NamedComponent(name);
  },
  getVisibleComponent: function(shouldBeVisible) {
    return new VisibleComponent(shouldBeVisible);
  },
  getTransparentComponent: function(shouldBeTransparent) {
    return new TransparentComponent(shouldBeTransparent);
  },
  getSceneryComponent: function(shouldBeScenery) {
    return new SceneryComponent(shouldBeScenery);
  },
  getDescriptionComponent: function(longDescriptionScript) {
    return new DescriptionComponent(longDescriptionScript);
  },
  getPrefixComponent: function(prefixString) {
    return new PrefixComponent(prefixString);
  },
  getPluralComponent: function(howMany) {
    return new PluralComponent(howMany);
  },
  getGenderComponent: function(genderPronoun, genderArticle) {
    return new GenderComponent(genderPronoun, genderArticle);
  },
  getContainerComponent: function(containedItems, maxObjects = -1, maxVolume = -1) {
    return new ContainerComponent(containedItems, maxObjects, maxVolume);
  },
  getOpenableComponent: function( isCurrentlyOpen = false, onOpenScript = "", onCloseScript = "",
                                  openMsg = "", closeMsg = "", knockOnMsg = "",
                                  locked = false, noKeyMsg = "", lockMsg = "", unlockMsg = "") {
    return new OpenableComponent(isCurrentlyOpen, onOpenScript, onCloseScript, openMsg, closeMsg, knockOnMsg, locked, noKeyMsg, lockMsg, unlockMsg);
  },
  getSwitchableComponent: function (startsOn = false, onMsg = "", offMsg = "") {
    return new SwitchableComponent(startsOn, onMsg, offMsg);
  },
  getDroppableComponent: function(shouldBeDroppable, dropMsg) {
    return new DroppableComponent(shouldBeDroppable, dropMsg);
  },
  getTakeableComponent: function(onTakeScript, takeMsg) {
    return new TakeableComponent(onTakeScript, takeMsg);
  },
  getBreatheableComponent: function(breatheMsg) {
    return new BreatheableComponent(breatheMsg);
  },
  getSmellableComponent: function(smellMsg) {
    return new SmellableComponent(smellMsg);
  },
  getExitComponent: function(destinationName) {
    return new ExitComponent(destinationName);
  }
};

// Gives the Entity a "friendly" name to identify it by
NamedComponent = function NamedComponent(name) {
  this.entityName = name;
  return this;
};
NamedComponent.prototype.name = 'NamedComponent';

// Whether the Entity is visible to the player
// Visible Entities are included in room descriptions and "what is in this object" queries
VisibleComponent = function VisibleComponent(shouldBeVisible) {
  this.isVisible = shouldBeVisible;
  return this;
}
VisibleComponent.prototype.name = 'VisibleComponent';

// Whether the Entity is transparent
// If set to true, all contained Entities visible when the container is closed
TransparentComponent = function TransparentComponent(shouldBeTransparent) {
  this.isTransparent = shouldBeTransparent;
  return this;
}
TransparentComponent.prototype.name = 'TransparentComponent';

// Whether the Entity is considered scenery
// If set to true, the object is not automatically listed in room descriptions or in the “Places and Objects” list.
// The player can still look at and interact with the Entity, however.
SceneryComponent = function SceneryComponent(shouldBeScenery) {
  this.isScenery = shouldBeScenery;
  return this;
}
SceneryComponent.prototype.name = 'SceneryComponent';

// Gives a description of the Entity
// Valid commands: Look 
DescriptionComponent = function DescriptionComponent(longDescriptionScript) {
  this.descriptionScript = longDescriptionScript;
  return this;
}
DescriptionComponent.prototype.name = 'DescriptionComponent';

// Gives the Entity a prefix, which is listed before the object name
PrefixComponent = function PrefixComponent(prefixString) {
  this.prefix = prefixString;
  return this;
}
PrefixComponent.prototype.name = 'PrefixComponent';

// Specifies that a Entity is plural
// You can also specify how many of the component to include
PluralComponent = function PluralComponent(howMany) {
  this.count = howMany;
  return this;
}
PluralComponent.prototype.name = 'PluralComponent';

// What gender this Entity is
// This can modify the pronoun (he, she, it, they) as well as the article (him, her, them)
GenderComponent = function GenderComponent(genderPronoun, genderArticle) {
  this.pronoun = genderPronoun;
  this.article = genderArticle;
  return this;
}
GenderComponent.prototype.name = 'GenderComponent';

// This specifies that this Entity can contain other Entities
// You can specify which Entities are contained within by default
// You can also specify the max number of objects and the max volume that the objects take up
// A '-1' for either maxNumObjects or maxObjVolume will allow the container to have an infinite amount of items
ContainerComponent = function ContainerComponent(containedItems, maxNumObjects, maxObjVolume) {
  this.items = containedItems;
  this.maxObjects = maxNumObjects;
  this.maxVolume = maxObjVolume;
  return this;
}
ContainerComponent.prototype.name = 'ContainerComponent';

// This specifies the Entity can be opened or closed.
// This also assumes that the Entity can be knocked on and locked.
// You can specify a script to run when the Entity is opened/closed as well as a message to say when the Entity is opened or closed.
// You can also specify if the Entity is locked, a message to say when there is no key for the Entity,
// and a message to say when the player locks or unlocks the Entity.
// Valid commands: Open, Close, Lock, Unlock, Knock
OpenableComponent = function OpenableComponent(isCurrentlyOpen, onOpenScript, onCloseScript, openMsg, closeMsg, knockOnMsg, locked, noKeyMsg, lockMsg, unlockMsg) {
  this.Open = {};
  this.Open.isOpen = isCurrentlyOpen;
  this.Open.onOpen = onOpenScript;
  this.Open.openMessage = openMsg;

  this.Close = {};
  this.Close.onClose = onCloseScript;
  this.Close.closeMessage = closeMsg;
  this.Close.knockOnMessage = knockOnMsg;

  this.Lock = {};
  this.Lock.isLocked = locked;
  this.Lock.noKeyMessage = noKeyMsg;
  this.Lock.lockMessage = lockMsg;
  this.Lock.unlockMessage = unlockMsg;
  return this;
}
OpenableComponent.prototype.name = 'OpenableComponent';

// This specifies that the Entity can be switched on or off.
// The user can also specify a message to say when the Entity gets turned on or off.
// Valid commands: SwitchOn, SwitchOff, TurnOn, TurnOff
SwitchableComponent = function SwitchableComponent(startsOn, onMsg, offMsg) {
  this.isOn = startsOn;
  this.onMessage = onMsg;
  this.offMessage = offMsg;
  return this;
}
SwitchableComponent.prototype.name = 'SwitchableComponent';

// This specifies that the Entity can be dropped.
// The user can also specify a message to say when the user drops the Entity.
// Valid commands: Drop
DroppableComponent = function DroppableComponent(shouldBeDroppable, dropMsg) {
  this.isDroppable = shouldBeDroppable;
  this.dropMessage = dropMsg;
  return this;
}
DroppableComponent.prototype.name = 'DroppableComponent';

// This specifies that the Entity can be taken.
// The user can also specify a message to say when the user picks up the Entity.
// Valid commands: Take
TakeableComponent = function TakeableComponent(onTakeScript, takeMsg) {
  this.takeScript = onTakeScript;
  this.takeMessage = takeMsg;
  return this;
}
TakeableComponent.prototype.name = 'TakeableComponent';

// This specifies a message to say when the user breathes in the entity.
// Valid commands: Breathe
BreatheableComponent = function BreatheableComponent(breatheMsg) {
  this.breatheMessage = breatheMsg;
  return this;
}
BreatheableComponent.prototype.name = 'BreatheableComponent';

// This specifies a message to say when the user smells the entity.
// Valid commands: Smell
SmellableComponent = function SmellableComponent(smellMsg) {
  this.smellMessage = smellMsg;
  return this;
}
SmellableComponent.prototype.name = 'SmellableComponent';

// This specifies that this Entity serves as an exit to another Entity.
// This respects other components -- i.e., if this is an OpenableComponent and it is locked,
// the player can't go through this exit.
// Valid commands: Go, Move
ExitComponent = function ExitComponent(destinationName) {
  this.destination = destinationName;
  return this;
}
ExitComponent.prototype.name = 'ExitComponent';