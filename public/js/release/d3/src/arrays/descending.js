// wrapped by build app
define("d3/src/arrays/descending", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.descending = function(a, b) {
  return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
};

});
