// wrapped by build app
define("d3/src/dsv/tsv", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "dsv";

d3.tsv = d3.dsv("\t", "text/tab-separated-values");

});
