// wrapped by build app
define("d3/src/dsv/csv", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "dsv";

d3.csv = d3.dsv(",", "text/csv");

});
