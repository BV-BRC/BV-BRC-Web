define([
  'dojo/_base/declare', './GridContainer',
  './BiosetGrid'
], function (
  declare, GridContainer,
  Grid
) {

  return declare([GridContainer], {
    gridCtor: Grid,
    containerType: 'bioset_data',
    facetFields: [],
    dataModel: 'bioset',
    getFilterPanel: function (opts) {
    },
    query: '&keyword(*)',
    containerActions: GridContainer.prototype.containerActions.concat([
    ])
  });
});
