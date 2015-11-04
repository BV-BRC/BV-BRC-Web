// wrapped by build app
define("d3/src/format/precision", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
function d3_format_precision(x, p) {
  return p - (x ? Math.ceil(Math.log(x) / Math.LN10) : 1);
}

});
