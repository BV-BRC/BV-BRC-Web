// wrapped by build app
define("d3/src/arrays/permute", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.permute = function(array, indexes) {
  var i = indexes.length, permutes = new Array(i);
  while (i--) permutes[i] = array[indexes[i]];
  return permutes;
};

});
