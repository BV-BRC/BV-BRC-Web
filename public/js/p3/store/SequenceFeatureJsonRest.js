define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    autoFacet: false,
    idProperty: 'id',
    facetFields: ['sf_name', 'sf_id'],
    dataModel: 'sequence_feature'
  });
});

