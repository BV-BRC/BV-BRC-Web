define([
  'dojo/_base/declare', 'dojo/_base/Deferred',
  './P3JsonRest', 'dojo/when', 'dojo/store/util/QueryResults'
], function (
  declare, defer,
  Store, when, QueryResults
) {
  return declare([Store], {
    dataModel: 'taxonomy',
    idProperty: 'taxon_id',
    facetFields: [],
    mayHaveChildren: function (parent) {
      return true;
      // return (parent.taxon_rank != "no rank");// && (parent.taxon_rank != "species")
    },
    getChildren: function (parentItem, opts) {
      if (!parentItem.genomes || parentItem.genomes < 1) {
        return false;
      }
      var query = 'and(gt(genomes,1),eq(parent_id,' + parentItem.taxon_id + '))';
      var def = new defer();
      def.total = new defer();

      var q = this.query(query, opts);

      when(q.total, function (total) {
        def.total.resolve(total);
        when(q, function (res) {
          def.resolve(res);
        }, function (err) {
          def.reject(err);
        });
      });

      return QueryResults(def);
    }
  });
});

