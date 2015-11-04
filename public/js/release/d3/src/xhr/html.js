// wrapped by build app
define("d3/src/xhr/html", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "../core/document";
import "xhr";

d3.html = function(url, callback) {
  return d3_xhr(url, "text/html", d3_html, callback);
};

function d3_html(request) {
  var range = d3_document.createRange();
  range.selectNode(d3_document.body);
  return range.createContextualFragment(request.responseText);
}

});
