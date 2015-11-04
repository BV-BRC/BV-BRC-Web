// wrapped by build app
define("d3/src/transition/text", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "transition";
import "tween";

d3_transitionPrototype.text = function(value) {
  return d3_transition_tween(this, "text", value, d3_transition_text);
};

function d3_transition_text(b) {
  if (b == null) b = "";
  return function() { this.textContent = b; };
}

});
