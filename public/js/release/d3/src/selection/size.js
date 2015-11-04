// wrapped by build app
define("d3/src/selection/size", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "each";

d3_selectionPrototype.size = function() {
  var n = 0;
  d3_selection_each(this, function() { ++n; });
  return n;
};

});
