define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'protein_feature',
    idProperty: 'id',
    facetFields: [],
    defaultFieldList: ['id', 'genome_id', 'genome_name', 'taxon_id', 'feature_id', 'patric_id', 'refseq_locus_tag', 'aa_sequence_md5', 'gene', 'product', 'interpro_id', 'interpro_description', 'feature_type', 'source', 'source_id', 'description', 'classification', 'score', 'e_value', 'evidence', 'publication', 'start', 'end', 'segments', 'length', 'sequence', 'comments', 'text', '_version_', 'date_inserted', 'date_modified'],

    query: function (query, opts) {
      // we have to make the default query exclude the actual sequences themselves or it is way too slow
      var sel = '&select(' + this.defaultFieldList.join(',') + ')';
      query += sel;
      // console.log("Query: ", query);
      return Store.prototype.query.apply(this, [query, opts]);
    }
  });
});
