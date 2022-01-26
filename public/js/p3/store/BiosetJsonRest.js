define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'bioset',
    idProperty: 'bioset_id',
    facetFields: []
  });
});

