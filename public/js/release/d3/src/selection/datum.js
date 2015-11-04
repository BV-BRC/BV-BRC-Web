// wrapped by build app
define("d3/src/selection/datum", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "selection";

d3_selectionPrototype.datum = function(value) {
  return arguments.length
      ? this.property("__data__", value)
      : this.property("__data__");
};

});
