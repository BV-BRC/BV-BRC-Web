// wrapped by build app
define("d3/src/core/class", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
function d3_class(ctor, properties) {
  for (var key in properties) {
    Object.defineProperty(ctor.prototype, key, {
      value: properties[key],
      enumerable: false
    });
  }
}

});
