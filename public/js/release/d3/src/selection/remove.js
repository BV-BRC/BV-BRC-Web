// wrapped by build app
define("d3/src/selection/remove", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "selection";

// TODO remove(selector)?
// TODO remove(node)?
// TODO remove(function)?
d3_selectionPrototype.remove = function() {
  return this.each(d3_selectionRemove);
};

function d3_selectionRemove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}

});
