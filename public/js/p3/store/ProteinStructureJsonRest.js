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
    defaultFieldList: ['pdb_id', 'title', 'organism_name', 'taxon_id', 'taxon_lineage_ids', 'taxon_lineage_names', 'genome_id', 'feature_id', 'patric_id', 'uniprotkb_accession', 'gene', 'product', 'alignments', 'method', 'resolution', 'pmid', 'institution', 'authors', 'release_date', 'text', '_version_', 'date_inserted', 'date_modified', 'file_path'],

    query: function (query, opts) {
      // we have to make the default query exclude the actual sequences themselves or it is way too slow
      var sel = '&select(' + this.defaultFieldList.join(',') + ')';
      query += sel;
      // console.log("Query: ", query);
      return Store.prototype.query.apply(this, [query, opts]);
    }
  });
});

