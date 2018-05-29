define("p3/store/GenomeJsonRest", [
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    autoFacet: false,
    idProperty: 'genome_id',
    facetFields: ['feature_type', 'annotation'],
    dataModel: 'genome'
  });
});

