// wrapped by build app
define("d3/src/xhr/json", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "xhr";

d3.json = function(url, callback) {
  return d3_xhr(url, "application/json", d3_json, callback);
};

function d3_json(request) {
  return JSON.parse(request.responseText);
}

});
