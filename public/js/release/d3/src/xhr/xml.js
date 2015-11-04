// wrapped by build app
define("d3/src/xhr/xml", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "xhr";

d3.xml = d3_xhrType(function(request) {
  return request.responseXML;
});

});
