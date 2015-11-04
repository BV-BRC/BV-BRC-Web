// wrapped by build app
define("d3/src/xhr/text", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "xhr";

d3.text = d3_xhrType(function(request) {
  return request.responseText;
});

});
