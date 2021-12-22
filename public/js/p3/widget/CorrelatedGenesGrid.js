define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/aspect', 'dojo/dom-construct', 'dojo/dom-class',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane',
  './PageGrid', './formatter', '../store/CorrelatedGenesMemoryStore', './GridSelector'
], function (
  declare, lang, Deferred,
  on, request, aspect, domConstruct, domClass,
  BorderContainer, ContentPane,
  Grid, formatter, Store, selector
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: null,
    dataModel: 'transcriptomics_gene',
    primaryKey: 'feature_id',
    selectionModel: 'extended',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      genome_name: { label: 'Genome Name', field: 'genome_name', hidden: true },
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
      accession: { label: 'Accession', field: 'accession', hidden: true },
      patric_id: { label: 'BRC ID', field: 'patric_id', hidden: false },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: false },
      alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
      feature_id: { label: 'Feature ID', field: 'feature_id', hidden: true },
      annotation: { label: 'Annotation', field: 'annotation', hidden: true },
      feature_type: { label: 'Feature Type', field: 'feature_type', hidden: true },
      start: { label: 'Start', field: 'start', hidden: true },
      end: { label: 'End', field: 'end', hidden: true },
      na_length: { label: 'Length (NT)', field: 'na_length', hidden: true },
      strand: { label: 'Strand', field: 'strand', hidden: true },
      protein_id: { label: 'Protein ID', field: 'protein_id', hidden: true },
      figfam: { label: 'FIGfam ID', field: 'figfam_id', hidden: true },
      plfam: { label: 'PATRIC Local family', field: 'plfam_id' },
      pgfam: { label: 'PATRIC Global family', field: 'pgfam_id' },
      aa_length: { label: 'Length (AA)', field: 'aa_length', hidden: true },
      gene: { label: 'Gene Symbol', field: 'gene', hidden: false },
      product: { label: 'Product', field: 'product', hidden: false },

      correlation: { label: 'Correlation', field: 'correlation', formatter: formatter.twoDecimalNumeric },
      comparisons: { label: 'Comparisons', field: 'conditions', hidden: false }
    },
    constructor: function (options) {
      // console.log("CorrelatedGenes Ctor: ", options.state.feature);
      if (options && options.apiServer) {
        this.apiServer = options.apiServer;
      }
      this.queryOptions = {
        sort: [{ attribute: 'correlation', descending: true }]
      };
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
        console.log('after emit');
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

    _selectAll: function () {

      this._unloadedData = {};

      return Deferred.when(this.store.data.map(function (d) {
        this._unloadedData[d[this.primaryKey]] = d;
        return d[this.primaryKey];
      }, this));
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
