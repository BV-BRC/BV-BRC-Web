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
    facetFields: [],
    dataModel: 'surveillance'
  });
});

