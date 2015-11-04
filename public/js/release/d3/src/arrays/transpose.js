// wrapped by build app
define("d3/src/arrays/transpose", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "zip";

d3.transpose = function(matrix) {
  return d3.zip.apply(d3, matrix);
};

});
