// wrapped by build app
define("d3/src/format/requote", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
d3.requote = function(s) {
  return s.replace(d3_requote_re, "\\$&");
};

var d3_requote_re = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;

});
