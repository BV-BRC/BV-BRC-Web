define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/aspect', 'dojo/on', 'dojo/dom-class', 'dojo/dom-construct',
  './PageGrid', './ColumnsGenome', './GridSelector'
], function (
  declare, lang, Deferred,
  aspect, on, domClass, domConstruct,
  Grid, ColumnsGenome, selector
) {

  return declare([Grid], {
    region: 'center',
    query: '',
    primaryKey: 'genome_id',
    store: null,
    columns: lang.mixin({
      'Selection Checkboxes': selector({ label: '', unhidable: true })
    }, ColumnsGenome, {
      // overwrite existing columns
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true, group: 'General Info' },
      patric_cds: { label: 'PATRIC CDS', field: 'patric_cds', hidden: true, group: 'Annotation Statistics' },
      // add extra columns
      genome_status: { 
        label: 'Genome Status',
        field: 'genome_status',
        hidden: false,
        group: 'Status',
        sortable: true
      },
      genome_quality: {
        label: 'Genome Quality',
        field: 'genome_quality',
        hidden: false,
        group: 'Genome Quality'
      },
      distance: { label: 'Distance', field: 'distance', sortable: false, group: 'Similarity Info' },
      pvalue: { label: 'P value', field: 'pvalue', sortable: false, group: 'Similarity Info' },
      counts: { label: 'K-mer Counts', field: 'counts', sortable: false, group: 'Similarity Info' }
    }),

    constructor: function (options, parent) {
      // this.primaryKey = parent.primaryKey;
    },

    _setState: function (state) {
      if (!state) {
        return;
      }

      if (!this.store) {
        this.set('store', this.createStore());
      } else {
        this.store.set('state', state);
      }
      this.refresh();
    },

    createStore: function () {
      if (this.store) {
        console.log('returning existing store');
        this.store.watch('refresh', 'refresh');
        return this.store;
      }
    },

    startup: function () {
      var self = this;

      this.on('dgrid-select', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: self,
          bubbles: true,
          cancelable: true
        };
        on.emit(self.domNode, 'select', newEvt);
      });

      this.on('dgrid-deselect', function (evt) {
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: self,
          bubbles: true,
          cancelable: true
        };
        on.emit(self.domNode, 'deselect', newEvt);
      });

      aspect.before(this, 'refresh', function () {
        this.clearSelection();
      }, this);
      this.inherited(arguments);
    },

    _selectAll: function () {

      this._unloadedData = {};
      return Deferred.when(this.store.data.map(function (obj) {
        this._unloadedData[obj[this.primaryKey]] = obj;
        return obj[this.primaryKey];
      }, this));
    },

    formatEvalue: function (evalue) {
      if (evalue.toString().includes('e')) {
        var val = evalue.toString().split('e');
        return parseInt(val[0]) + 'e' + val[1];
      } else if (evalue !== 0) {
        return evalue.toFixed(4);
      }
      return evalue;

    }
  });
});
