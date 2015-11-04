// wrapped by build app
define("d3/src/arrays/ascending", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.ascending = d3_ascending;

function d3_ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

});
