// wrapped by build app
define("d3/src/core/functor", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
function d3_functor(v) {
  return typeof v === "function" ? v : function() { return v; };
}

d3.functor = d3_functor;

});
