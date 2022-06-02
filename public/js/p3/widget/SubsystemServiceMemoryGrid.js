define([
  'dojo/_base/declare', 'dojo/_base/Deferred', '../store/SubsystemServiceMemoryStore', './SubSystemsMemoryGrid',
  'dojo/when'
], function (
  declare, Deferred, Store, oldSubsystemsGrid, when
) {
  return declare([oldSubsystemsGrid], {

    idProperty: 'id',
    primaryKey: 'id',

    _selectAll: function () {
      var _self = this;
      var def = new Deferred();
      when(this.store.query({}, { 'selectAll': true }), function (results) {
        _self._unloadedData = {};
        def.resolve(results.map(function (obj) {
          _self._unloadedData[obj.id] = obj;
          return obj.id;
        }));
      });
      return def.promise;
    }
  });
});
