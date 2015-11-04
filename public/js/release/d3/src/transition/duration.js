// wrapped by build app
define("d3/src/transition/duration", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "../selection/each";
import "transition";

d3_transitionPrototype.duration = function(value) {
  var id = this.id, ns = this.namespace;
  if (arguments.length < 1) return this.node()[ns][id].duration;
  return d3_selection_each(this, typeof value === "function"
      ? function(node, i, j) { node[ns][id].duration = Math.max(1, value.call(node, node.__data__, i, j)); }
      : (value = Math.max(1, value), function(node) { node[ns][id].duration = value; }));
};

});
