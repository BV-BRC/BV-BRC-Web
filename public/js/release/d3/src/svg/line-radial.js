// wrapped by build app
define("d3/src/svg/line-radial", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "../math/trigonometry";
import "arc";
import "line";
import "svg";

d3.svg.line.radial = function() {
  var line = d3_svg_line(d3_svg_lineRadial);
  line.radius = line.x, delete line.x;
  line.angle = line.y, delete line.y;
  return line;
};

function d3_svg_lineRadial(points) {
  var point,
      i = -1,
      n = points.length,
      r,
      a;
  while (++i < n) {
    point = points[i];
    r = point[0];
    a = point[1] - halfπ;
    point[0] = r * Math.cos(a);
    point[1] = r * Math.sin(a);
  }
  return points;
}

});
