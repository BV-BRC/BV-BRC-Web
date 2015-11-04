// wrapped by build app
define("d3/src/arrays/values", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.values = function(map) {
  var values = [];
  for (var key in map) values.push(map[key]);
  return values;
};

});
