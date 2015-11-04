// wrapped by build app
define("d3/src/core/array", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
var d3_arraySlice = [].slice,
    d3_array = function(list) { return d3_arraySlice.call(list); }; // conversion for NodeLists

});
