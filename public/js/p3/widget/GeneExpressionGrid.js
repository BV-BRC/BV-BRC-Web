define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/aspect', 'dojo/request', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane',
  './PageGrid', './formatter', '../store/GeneExpressionMemoryStore', './GridSelector'
], function (
  declare, lang, Deferred,
  on, domClass, domConstruct, aspect, request, Topic,
  BorderContainer, ContentPane,
  Grid, formatter, Store, selector
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: null,
    state: null,
    dataModel: 'gene_expression_data',
    primaryKey: 'id',
    selectionModel: 'extended',
    deselectOnRefresh: true,
    columns: {
      // "Selection Checkboxes": selector({}),
      'Selection Checkboxes': selector({ unhidable: true }),
      pid: { label: 'pid', field: 'pid', hidden: true },
      feature_id: { label: 'Feature ID', field: 'feature_id', hidden: true },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: true },
      expname: { label: 'Title', field: 'expname' },
      pmid: { label: 'PubMed', field: 'pmid' },
      accession: { label: 'Accession', field: 'accession' },
      strain: { label: 'Strain', field: 'strain' },
      mutant: { label: 'Gene Modification', field: 'mutant' },
      condition: { label: 'Experimental Condition', field: 'condition' },
      timepoint: { label: 'Time Point', field: 'timepoint' },
      avg_intensity: { label: 'Avg Intensity', field: 'avg_intensity' },
      log_ratio: { label: 'Log Ratio', field: 'log_ratio' },
      z_score: { label: 'Z-score', field: 'z_score' }
    },
    constructor: function (options) {
      console.log('GeneExpressionGrid constructor Ctor: ', options);
      console.log('GeneExpressionGrid constructor this.store: ', this.store);
      console.log('GeneExpressionGrid constructor case updateTgState: this.tgState: ', this.tgState);
      if (options && options.apiServer) {
        this.apiServer = options.apiServer;
      }

      Topic.subscribe('GeneExpression', lang.hitch(this, function () {
        console.log('GeneExpressionGrid: arguments=', arguments);
        var key = arguments[0],
          value = arguments[1];

        console.log('GeneExpressionGrid: key, value=', key, ',', value);

        switch (key) {
          case 'updateTgState':
            console.log('GeneExpressionGrid constructor case updateTgState: this.store: ', this.store);
            // this.store.arrange(value);
            this.store.tgState = value;
            this.store.reload(value);
            // this.refresh();
            break;
          default:
            break;
        }
      }));
    },
    _setApiServer: function (server) {
      this.apiServer = server;
    },
    _setState: function (state) {
      // console.log("!!!!!!In GeneExpressionGrid _setState: state=", state);
      // console.log("_setState: store=", this.store);
      if (!this.store) {
        this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
      } else {
        this.store.set('state', state);

        this.refresh();
      }
      // console.log("GeneExpressionGrid _setState: store=", this.store);
    },
    _selectAll: function () {

      this._unloadedData = {};

      return Deferred.when(this.store.data.map(function (d) {
        // console.log("In _selectAll, d=", d);
        this._unloadedData[d.pid] = d;
        return d.pid;
      }, this));
    },
    startup: function () {
      var _self = this;

      // console.log("GeneExpressionGrid startup(): this=", this);
      // console.log("GeneExpressionGrid startup(): this.store=", this.store);

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
        // console.log("GeneExpressionGrid aspect.before: results=", results);
        Deferred.when(results.total, function (x) {
          _self.set('totalRows', x);
        });
      });
      this.inherited(arguments);
      this._started = true;
    },
    postCreate: function () {
      this.inherited(arguments);
      // console.log("GeneExpressionGrid postCreate: arguments=", arguments);
    },
    createStore: function (server, token, state) {
      // console.log("Create Store: state=", this.state);
      var store = new Store({
        token: token,
        apiServer: this.apiServer || window.App.dataServiceURL,
        state: this.state || state
      });
      store.watch('refresh', lang.hitch(this, 'refresh'));

      console.log('Create Store: store=', store);

      return store;
    }
  });
});
