// wrapped by build app
define("cytoscape-cose-bilkent/src/Layout/RandomSeed", ["dojo","dijit","dojox"], function(dojo,dijit,dojox){
function RandomSeed() {
}
RandomSeed.seed = 1;
RandomSeed.x = 0;

RandomSeed.nextDouble = function () {
  RandomSeed.x = Math.sin(RandomSeed.seed++) * 10000;
  return RandomSeed.x - Math.floor(RandomSeed.x);
};

module.exports = RandomSeed;

});
