// wrapped by build app
define("d3/src/selection/empty", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "selection";

d3_selectionPrototype.empty = function() {
  return !this.node();
};

});
