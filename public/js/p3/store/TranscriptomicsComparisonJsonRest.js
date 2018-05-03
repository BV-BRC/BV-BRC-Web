define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'transcriptomics_sample',
    idProperty: 'pid',
    facetFields: []
  });
});

