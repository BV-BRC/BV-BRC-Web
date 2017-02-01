define("cytoscape-cose-bilkent/src/Layout/CoSEGraphManager", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
var LGraphManager = require('./LGraphManager');

function CoSEGraphManager(layout) {
  LGraphManager.call(this, layout);
}

CoSEGraphManager.prototype = Object.create(LGraphManager.prototype);
for (var prop in LGraphManager) {
  CoSEGraphManager[prop] = LGraphManager[prop];
}

module.exports = CoSEGraphManager;
});
