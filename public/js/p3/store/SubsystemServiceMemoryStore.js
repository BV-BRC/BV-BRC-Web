define([
  'dojo/_base/declare', 'dojo/store/util/QueryResults', './SubSystemMemoryStore'
], function (
  declare, QueryResults, oldSubsystemMemoryStore
) {
  return declare([oldSubsystemMemoryStore], {

    idProperty: 'id',
    primaryKey: 'id',

    // TODO: selecting rows has problems

    onSetState: function (attr, oldVal, state) {
      console.log('memory store set state');
      if (this.type === 'subsystems') {
        this.setData(this.state.data['subsystem_table']);
      } else if (this.type === 'genes') {
        console.log('load genes table');
      } else {
        console.log('invalid subsystems memory store');
      }
    },

    query: function (query, opts) {
      console.log('query = ', query);
      console.log('opts = ', opts);
      // TODO: insert condition filter
      var total_length = this.data.length;
      var data = this.state.data['subsystem_table'];
      if (opts && opts.sort) {
        var sort_field = opts.sort[0].attribute;
        if (opts.sort[0].descending) {
          data = data.sort((a, b) => (a[sort_field] < b[sort_field]) ? 1 : -1);
        } else {
          data = data.sort((a, b) => (a[sort_field] > b[sort_field]) ? 1 : -1);
        }
      }
      var start = 0;
      var count = 200;
      if (opts && opts.start) {
        start = opts.start;
      }
      if (opts && opts.count) {
        count = opts.count;
      }
      var query_data = null;
      if (opts && opts.selectAll) {
        query_data = this.state.data['subsystem_table'];
      }
      else {
        query_data = data.slice(start, start + count);
      }
      query_data = QueryResults(query_data);
      query_data.total = total_length; // sets table total
      return query_data;
    },

    loadData: function () {
      console.log('memory store load data')
    }
  });
});
