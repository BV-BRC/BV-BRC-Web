define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    autoFacet: false,
    idProperty: 'epitope_id',
    facetFields: [],
    dataModel: 'epitope_assay'
  });
});

