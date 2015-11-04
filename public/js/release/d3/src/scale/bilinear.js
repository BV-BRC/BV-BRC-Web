// wrapped by build app
define("d3/src/scale/bilinear", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
function d3_scale_bilinear(domain, range, uninterpolate, interpolate) {
  var u = uninterpolate(domain[0], domain[1]),
      i = interpolate(range[0], range[1]);
  return function(x) {
    return i(u(x));
  };
}

});
