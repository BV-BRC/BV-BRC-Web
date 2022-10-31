define([
  'dojo/_base/declare', 'dojo/_base/Deferred', '../store/SubsystemServiceMemoryStore', './SubSystemsMemoryGrid',
  'dojo/when', 'dojo/aspect', 'dojo/on', 'dojo/_base/lang', 'dojo/topic', './GridSelector'
], function (
  declare, Deferred, Store, oldSubsystemsGrid, when, aspect, on, lang, Topic, selector
) {
  return declare([oldSubsystemsGrid], {

    idProperty: 'id',
    primaryKey: 'id',
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      superclass: { label: 'Superclass', field: 'superclass' },
      'class': { label: 'Class', field: 'class' },
      subclass: { label: 'Subclass', field: 'subclass' },
      subsystem_name: { label: 'Subsystem Name', field: 'subsystem_name' },
      role_id: { label: 'Role ID', field: 'role_id', hidden: true },
      role_name: { label: 'Role Name', field: 'role_name' },
      genome_count: { label: 'Genome Count', field: 'genome_count' },
      gene_count: { label: 'Gene Count', field: 'gene_count' },
      role_count: { label: 'Role Count', field: 'role_count' },
      active: { label: 'Active', field: 'active'},
      patric_id: { label: 'BRC ID', field: 'patric_id' },
      gene: { label: 'Gene', field: 'gene' },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: true },
      alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
      product: { label: 'Product', field: 'product' },
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
      genome_name: { label: 'Genome Name', field: 'genome_name', hidden: true },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
      subsystem_id: { label: 'Subsystem ID', field: 'subsystem_id', hidden: true }

    },

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
