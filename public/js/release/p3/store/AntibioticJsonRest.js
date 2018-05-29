define("p3/store/AntibioticJsonRest", [
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'antibiotics',
    idProperty: 'pubchem_cid',
    facetFields: []
  });
});

