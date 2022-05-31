define([
  'dojo/_base/declare', 'dojo/store/util/QueryResults', './SubSystemMemoryStore'
], function (
  declare, QueryResults, oldSubsystemMemoryStore
) {
  return declare([oldSubsystemMemoryStore], {

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
      console.log('memory store query');
      return QueryResults(this.data);
    },

    loadData: function () {
      console.log('memory store load data')
    }
  });
});
