// wrapped by build app
define("d3/src/format/round", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.round = function(x, n) {
  return n
      ? Math.round(x * (n = Math.pow(10, n))) / n
      : Math.round(x);
};

});
