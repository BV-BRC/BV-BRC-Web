define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'sp_gene_ref',
    idProperty: 'id',
    facetFields: []
  });
});

