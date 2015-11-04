// wrapped by build app
define("d3/src/arrays/median", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "../math/number";
import "ascending";
import "quantile";

d3.median = function(array, f) {
  var numbers = [],
      n = array.length,
      a,
      i = -1;
  if (arguments.length === 1) {
    while (++i < n) if (d3_numeric(a = d3_number(array[i]))) numbers.push(a);
  } else {
    while (++i < n) if (d3_numeric(a = d3_number(f.call(array, array[i], i)))) numbers.push(a);
  }
  if (numbers.length) return d3.quantile(numbers.sort(d3_ascending), .5);
};

});
