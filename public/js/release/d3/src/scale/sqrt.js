// wrapped by build app
define("d3/src/scale/sqrt", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "pow";
import "scale";

d3.scale.sqrt = function() {
  return d3.scale.pow().exponent(.5);
};

});
