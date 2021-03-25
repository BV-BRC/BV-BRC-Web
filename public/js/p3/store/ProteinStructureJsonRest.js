define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'protein_structure',
    idProperty: 'pdb_id',
    facetFields: [],
    defaultFieldList: ['pdb_id', 'title', 'organism_name', 'uniprotkb_accession', 'gene', 'product', 'method', 'resolution', 'release_date'],

    query: function (query, opts) {
      // we have to make the default query exclude the actual sequences themselves or it is way too slow
      var sel = '&select(' + this.defaultFieldList.join(',') + ')';
      query += sel;
      // console.log("Query: ", query);
      return Store.prototype.query.apply(this, [query, opts]);
    }
  });
});

