define("d3/test/index-test", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
var vows = require("vows"),
    assert = require("./assert");

var suite = vows.describe("d3");

require("../");

suite.addBatch({
  "d3": {
    "is not a global when require’d": function() {
      assert.equal("d3" in global, false);
    }
  }
});

suite.export(module);
});
