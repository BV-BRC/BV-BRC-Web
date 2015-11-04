// wrapped by build app
define("d3/src/arrays/deviation", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "variance";

d3.deviation = function() {
  var v = d3.variance.apply(this, arguments);
  return v ? Math.sqrt(v) : v;
};

});
