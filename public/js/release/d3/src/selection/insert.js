// wrapped by build app
define("d3/src/selection/insert", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
import "selection";

d3_selectionPrototype.insert = function(name, before) {
  name = d3_selection_creator(name);
  before = d3_selection_selector(before);
  return this.select(function() {
    return this.insertBefore(name.apply(this, arguments), before.apply(this, arguments) || null);
  });
};

});
