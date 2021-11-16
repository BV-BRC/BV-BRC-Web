define([
  'dojo/_base/declare', './GridContainer',
  './EpitopeAssayGrid'
], function (
  declare, GridContainer,
  Grid
) {

  return declare([GridContainer], {
    gridCtor: Grid,
    containerType: 'epitope_assay_data',
    facetFields: [],
    maxGenomeCount: 5000,
    dataModel: 'epitope_assay',
    getFilterPanel: function (opts) {
    },
    query: '&keyword(*)',
    containerActions: GridContainer.prototype.containerActions.concat([
    ])
  });
});
