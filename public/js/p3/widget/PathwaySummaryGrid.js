define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/aspect', 'dojo/request', 'dojo/topic',
  './PageGrid', './formatter', './GridSelector', '../store/PathwaySummaryMemoryStore'
], function (
  declare, lang, Deferred,
  on, domClass, domConstruct, aspect, request, Topic,
  Grid, formatter, selector, Store
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: null,
    dataModel: 'pathway_summary',
    primaryKey: 'pathway_id',
    selectionModel: 'extended',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      pathway_summary_name: { label: 'Pathway Name', field: 'pathway_name' },
      genes_selected: { label: '# of Genes Selected', field: 'genes_selected' },
      genes_annotated: { label: '# of Genes Annotated', field: 'genes_annotated' },
      coverage: { label: '% Coverage', field: 'coverage' }
    },
    constructor: function (options) {
      // console.log("PathwaySummaryGrid Ctor: ", options);
      if (options && options.apiServer) {
        this.apiServer = options.apiServer;
      }
      this.queryOptions = {
        sort: [{ attribute: 'coverage', descending: true }]
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
        this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, lang.mixin({}, state)));
      } else {
        this.store.set('state', state);
      }
      this.refresh();
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
