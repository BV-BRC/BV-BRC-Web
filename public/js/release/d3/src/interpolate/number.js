// wrapped by build app
define("d3/src/interpolate/number", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.interpolateNumber = d3_interpolateNumber;

function d3_interpolateNumber(a, b) {
  a = +a, b = +b;
  return function(t) { return a * (1 - t) + b * t; };
}

});
