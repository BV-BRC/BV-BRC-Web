define("p3/widget/PublicationGridContainer", [
  'dojo/_base/declare', './GridContainer',
  './PublicationGrid'
], function (
  declare, GridContainer,
  PublicationGrid
) {
  return declare([GridContainer], {
    gridCtor: PublicationGrid
  });
});
