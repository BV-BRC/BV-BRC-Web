// wrapped by build app
define("d3/src/selection/text", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "selection";

d3_selectionPrototype.text = function(value) {
  return arguments.length
      ? this.each(typeof value === "function"
      ? function() { var v = value.apply(this, arguments); this.textContent = v == null ? "" : v; } : value == null
      ? function() { this.textContent = ""; }
      : function() { this.textContent = value; })
      : this.node().textContent;
};

});
