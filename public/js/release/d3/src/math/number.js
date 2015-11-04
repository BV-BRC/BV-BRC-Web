// wrapped by build app
define("d3/src/math/number", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
function d3_number(x) {
  return x === null ? NaN : +x;
}

function d3_numeric(x) {
  return !isNaN(x);
}

});
