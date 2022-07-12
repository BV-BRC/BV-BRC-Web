define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/aspect', 'dojo/request', 'dojo/topic',
  './PageGrid', './formatter', '../store/IDMappingMemoryStore', './GridSelector'
], function (
  declare, lang, Deferred,
  on, domClass, domConstruct, aspect, request, Topic,
  Grid, formatter, Store, selector
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: null,
    dataModel: 'genome_feature',
    primaryKey: 'idx',
    selectionModel: 'extended',
    deselectOnRefresh: true,
    // allowSelectAll: false,
    columns: {
      'Selection Checkboxes': selector({}),
      genome_name: { label: 'Genome Name', field: 'genome_name' },
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
      accession: { label: 'Accession', field: 'accession', hidden: true },
      patric_id: { label: 'BRC ID', field: 'patric_id' },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag' },
      alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
      target: { label: 'Target', field: 'target' },

      feature_id: { label: 'Feature ID', field: 'feature_id', hidden: true },
      annotation: { label: 'Annotation', field: 'annotation', hidden: true },
      feature_type: { label: 'Feature Type', field: 'feature_type', hidden: true },
      start: { label: 'Start', field: 'start', hidden: true },
      end: { label: 'End', field: 'end', hidden: true },
      na_length: { label: 'Length(NT)', field: 'na_length', hidden: true },
      strand: { label: 'Strand', field: 'strand', hidden: true },
      protein_id: { label: 'Protein ID', field: 'protein_id', hidden: true },
      figfam_id: { label: 'FIGfam ID', field: 'figfam_id', hidden: true },
      plfam: { label: 'PATRIC Local family', field: 'plfam_id' },
      pgfam: { label: 'PATRIC Global family', field: 'pgfam_id' },
      aa_length: { label: 'Length(AA)', field: 'aa_length', hidden: true },
      gene: { label: 'Gene', field: 'gene' },
      product: { label: 'Product', field: 'product' }
    },
    constructor: function (options) {
      // console.log("PathwaySummaryGrid Ctor: ", options);
      if (options && options.apiServer) {
        this.apiServer = options.apiServer;
      }
      this.queryOptions = {
        sort: [{ attribute: 'genome_name' }, { attribute: 'accession' }, { attribute: 'start' }]
      };
    },


    _selectAll: function () {

      this._unloadedData = {};

      return Deferred.when(this.store.data.map(function (d) {
        this._unloadedData[d[this.primaryKey]] = d;
        return d[this.primaryKey];
      }, this));
    },

    startup: function () {
      var _self = this;

      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);
        // console.log("dblclick row:", row);
        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
        // console.log('after emit');
      });

      this.on('dgrid-select', function (evt) {
        // console.log('dgrid-select: ', evt);
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });

      this.on('dgrid-deselect', function (evt) {
        // console.log("dgrid-deselect");
        var newEvt = {
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

      if (!this.store && this.dataModel) {
        this.store = this.createStore(this.dataModel);
      }

      this.inherited(arguments);
      this._started = true;
    },

    state: null,
    postCreate: function () {
      this.inherited(arguments);
    },
    _setApiServer: function (server) {
      this.apiServer = server;
    },
    _setState: function (state) {
      if (!this.store) {
        this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
      } else {
        this.store.set('state', state);

        this.refresh();
      }
    },
    createStore: function (server, token, state) {

      var store = new Store({
        token: token,
        apiServer: this.apiServer || window.App.dataServiceURL,
        state: state || this.state
      });
      store.watch('refresh', lang.hitch(this, 'refresh'));

      return store;
    }
  });
});
