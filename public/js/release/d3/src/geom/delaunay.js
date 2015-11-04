// wrapped by build app
define("d3/src/geom/delaunay", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "geom";

// @deprecated; use d3.geom.voronoi triangles instead.
d3.geom.delaunay = function(vertices) {
  return d3.geom.voronoi().triangles(vertices);
};

});
