// wrapped by build app
define("d3/src/compat/date", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
if (!Date.now) Date.now = function() {
  return +new Date;
};

});
