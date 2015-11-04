// wrapped by build app
define("d3/src/arrays/keys", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.keys = function(map) {
  var keys = [];
  for (var key in map) keys.push(key);
  return keys;
};

});
