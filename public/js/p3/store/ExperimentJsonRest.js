define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'experiment',
    idProperty: 'exp_id',
    facetFields: []
  });
});

