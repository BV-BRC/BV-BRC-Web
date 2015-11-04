// wrapped by build app
define("d3/src/arrays/entries", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.entries = function(map) {
  var entries = [];
  for (var key in map) entries.push({key: key, value: map[key]});
  return entries;
};

});
