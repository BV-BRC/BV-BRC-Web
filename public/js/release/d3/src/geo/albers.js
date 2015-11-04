// wrapped by build app
define("d3/src/geo/albers", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "conic-equal-area";
import "geo";

// ESRI:102003
d3.geo.albers = function() {
  return d3.geo.conicEqualArea()
      .rotate([96, 0])
      .center([-.6, 38.7])
      .parallels([29.5, 45.5])
      .scale(1070);
};

});
