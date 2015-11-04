// wrapped by build app
define("d3/src/arrays/pairs", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.pairs = function(array) {
  var i = 0, n = array.length - 1, p0, p1 = array[0], pairs = new Array(n < 0 ? 0 : n);
  while (i < n) pairs[i] = [p0 = p1, p1 = array[++i]];
  return pairs;
};

});
