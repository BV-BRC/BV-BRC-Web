define([
  'dojo/_base/declare', './GridContainer',
  './TranscriptomicsComparisonGrid'
], function (
  declare, GridContainer,
  Grid
) {

  return declare([GridContainer], {
    gridCtor: Grid,
    containerType: 'bioset_data',
    facetFields: [],
    maxGenomeCount: 5000,
    dataModel: 'bioset',
    getFilterPanel: function (opts) {
    },
    query: '&keyword(*)',
    containerActions: GridContainer.prototype.containerActions.concat([
    ])
  });
});
