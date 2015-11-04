// wrapped by build app
define("d3/src/transition/remove", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "transition";

d3_transitionPrototype.remove = function() {
  var ns = this.namespace;
  return this.each("end.transition", function() {
    var p;
    if (this[ns].count < 2 && (p = this.parentNode)) p.removeChild(this);
  });
};

});
