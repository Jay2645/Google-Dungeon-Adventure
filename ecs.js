let ecsEntity = require('./ecsEntity');
let ecsComponents = require('./ecsComponents');

let entities = {};

module.exports = {
  getNewEntity: function() {
    var entity = ecsEntity.getEntity();
    entities[entity.id] = entity;
    return entity;
  },
  getEntityByID: function(entityID) {
    return entities[entityID];
  }
};
