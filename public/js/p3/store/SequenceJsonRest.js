define([
  'dojo/_base/declare',
  './P3JsonRest'
], function (
  declare,
  Store
) {
  return declare([Store], {
    dataModel: 'genome_sequence',
    idProperty: 'sequence_id',
    facetFields: ['chromosome', 'plasmid', 'segment'],
    defaultFieldList: ['genome_id', 'genome_name', 'taxon_id', 'sequence_id', 'accession', 'gi', 'sequence_type', 'sequence_status', 'mol_type', 'topology', 'description', 'chromosome', 'plasmid', 'segment', 'gc_content', 'length', 'sequence_md5', 'release_date', 'version', 'date_inserted', 'date_modified', 'public', 'owner'],

    query: function (query, opts) {
      // we have to make the default query exclude the actual sequences themselves or it is way too slow
      var sel = '&select(' + this.defaultFieldList.join(',') + ')';
      query += sel;
      // console.log("Query: ", query);
      return Store.prototype.query.apply(this, [query, opts]);
    }
  });
});

