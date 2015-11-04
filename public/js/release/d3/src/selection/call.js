// wrapped by build app
define("d3/src/selection/call", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "../core/array";
import "selection";

d3_selectionPrototype.call = function(callback) {
  var args = d3_array(arguments);
  callback.apply(args[0] = this, args);
  return this;
};

});
