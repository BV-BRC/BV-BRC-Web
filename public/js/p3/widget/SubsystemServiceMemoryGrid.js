define([
  'dojo/_base/declare', 'dojo/_base/Deferred', '../store/SubsystemServiceMemoryStore', './SubSystemsMemoryGrid',
  'dojo/when', 'dojo/aspect', 'dojo/on', 'dojo/_base/lang', 'dojo/topic', './GridSelector'
], function (
  declare, Deferred, Store, oldSubsystemsGrid, when, aspect, on, lang, Topic, selector
) {
  return declare([oldSubsystemsGrid], {

    idProperty: 'id',
    primaryKey: 'id',

    startup: function () {
      const _self = this;

      this.on('dgrid-select', function (evt) {
        const newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });

      this.on('dgrid-deselect', function (evt) {
        const newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);
      });

      aspect.before(_self, 'renderArray', function (results) {
        Deferred.when(results.total, function (x) {
          _self.set('totalRows', x);
        });
      });
      this._started = true;
    },

    _selectAll: function () {
      var _self = this;
      var def = new Deferred();
      // debugger;
      when(this.store.query({}, { 'selectAll': true }), function (results) {
        _self._unloadedData = {};
        def.resolve(results.map(function (obj) {
          _self._unloadedData[obj.id] = obj;
          return obj.id;
        }));
      });
      return def.promise;
    },

    setTopicId: function (topicId) {
      this.topicId = topicId;
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0], value = arguments[1];
        switch (key) {
          case 'refreshGrid':
            this.refresh();
            break;
          default:
            break;
        }
      }));
    }
  });
});
