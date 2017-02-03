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
  }
};

NamedComponent = function NamedComponent(name) {
  this.entityName = name;
  return this;
};
NamedComponent.prototype.name = 'NamedComponent';

VisibleComponent = function VisibleComponent(shouldBeVisible) {
  this.isVisible = shouldBeVisible;
  return this;
}
VisibleComponent.prototype.name = 'VisibleComponent';

TransparentComponent = function TransparentComponent(shouldBeTransparent) {
  this.isTransparent = shouldBeTransparent;
  return this;
}
TransparentComponent.prototype.name = 'TransparentComponent';

SceneryComponent = function SceneryComponent(shouldBeScenery) {
  this.isScenery = shouldBeScenery;
  return this;
}
SceneryComponent.prototype.name = 'SceneryComponent';

DescriptionComponent = function DescriptionComponent(longDescriptionScript) {
  this.descriptionScript = longDescriptionScript;
  return this;
}
DescriptionComponent.prototype.name = 'DescriptionComponent';

PrefixComponent = function PrefixComponent(prefixString) {
  this.prefix = prefixString;
  return this;
}
PrefixComponent.prototype.name = 'PrefixComponent';

PluralComponent = function PluralComponent(howMany) {
  this.count = howMany;
  return this;
}
PluralComponent.prototype.name = 'PluralComponent';

GenderComponent = function GenderComponent(genderPronoun, genderArticle) {
  this.pronoun = genderPronoun;
  this.article = genderArticle;
  return this;
}
GenderComponent.prototype.name = 'GenderComponent';

ContainerComponent = function ContainerComponent(containedItems, maxNumObjects, maxObjVolume) {
  this.items = containedItems;
  this.maxObjects = maxNumObjects;
  this.maxVolume = maxObjVolume;
  return this;
}
ContainerComponent.prototype.name = 'ContainerComponent';

OpenableComponent = function OpenableComponent(isCurrentlyOpen, onOpenScript, onCloseScript, openMsg, closeMsg, knockOnMsg, locked, noKeyMsg, lockMsg, unlockMsg) {
  this.isOpen = isCurrentlyOpen;
  this.onOpen = onOpenScript;
  this.openMessage = openMsg;
  this.onClose = onCloseScript;
  this.closeMessage = closeMsg;
  this.knockOnMessage = knockOnMsg;
  this.isLocked = locked;
  this.noKeyMessage = noKeyMsg;
  this.lockMessage = lockMsg;
  this.unlockMessage = unlockMsg;
  return this;
}
OpenableComponent.prototype.name = 'OpenableComponent';

SwitchableComponent = function SwitchableComponent(startsOn, onMsg, offMsg) {
  this.isOn = startsOn;
  this.onMessage = onMsg;
  this.offMessage = offMsg;
  return this;
}
SwitchableComponent.prototype.name = 'SwitchableComponent';

DroppableComponent = function DroppableComponent(shouldBeDroppable, dropMsg) {
  this.isDroppable = shouldBeDroppable;
  this.dropMessage = dropMsg;
  return this;
}
DroppableComponent.prototype.name = 'DroppableComponent';

TakeableComponent = function TakeableComponent(onTakeScript, takeMsg) {
  this.takeScript = onTakeScript;
  this.takeMessage = takeMsg;
  return this;
}
TakeableComponent.prototype.name = 'TakeableComponent';

BreatheableComponent = function BreatheableComponent(breatheMsg) {
  this.breatheMessage = breatheMsg;
  return this;
}
BreatheableComponent.prototype.name = 'BreatheableComponent';

SmellableComponent = function SmellableComponent(smellMsg) {
  this.smellMessage = smellMsg;
  return this;
}
SmellableComponent.prototype.name = 'SmellableComponent';
