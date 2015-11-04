// wrapped by build app
define("d3/src/color/color", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.color = d3_color;

function d3_color() {}

d3_color.prototype.toString = function() {
  return this.rgb() + "";
};

});
