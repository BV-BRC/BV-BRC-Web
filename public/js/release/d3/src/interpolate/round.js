// wrapped by build app
define("d3/src/interpolate/round", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.interpolateRound = d3_interpolateRound;

function d3_interpolateRound(a, b) {
  b -= a;
  return function(t) { return Math.round(a + b * t); };
}

});
