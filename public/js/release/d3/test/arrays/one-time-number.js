// wrapped by build app
define("d3/test/arrays/one-time-number", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
module.exports = OneTimeNumber;

function OneTimeNumber(value) {
  this.value = value;
}

OneTimeNumber.prototype.valueOf = function() {
  var v = this.value;
  this.value = NaN;
  return v;
};

});
