define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/aspect', 'dojo/request', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane',
  './Grid', './formatter', '../store/PathwayMapMemoryStore'
], function (
  declare, lang, Deferred,
  on, domClass, domConstruct, aspect, request, Topic,
  BorderContainer, ContentPane,
  Grid, formatter, Store
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: null,
    dataModel: 'genome_feature',
    primaryKey: 'ec_number',
    selectionModel: 'extended',
    deselectOnRefresh: true,
    columns: {
      // "Selection Checkboxes": selector({}),
      ec_number: { label: 'EC Number', field: 'ec_number' },
      genome_count: { label: 'Genome Count', field: 'genome_count' },
      feature_count: { label: 'Feature Count', field: 'feature_count' },
      genome_missing: { label: 'Genome Count Not Present', field: 'genome_missing' },
      occurrence: { label: 'Occurrence', field: 'occurrence' },
      description: { label: 'Description', field: 'description', hidden: true }
    },
    constructor: function (options) {
      // console.log("PathwayMapGrid Ctor: ", options);
      if (options && options.apiServer) {
        this.apiServer = options.apiServer;
      }

      Topic.subscribe('PathwayMap', lang.hitch(this, function () {
        // console.log("ProteinFamiliesGrid:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateMainGridOrder':
            this.store.arrange(value);
            this.refresh();
            break;
          default:
            break;
        }
      }));
    },
    startup: function () {
      var _self = this;
      this.on('dgrid-sort', function (evt) {
        _self.store.query('', { sort: evt.sort });
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
        Topic.publish('PathwayMap', 'highlightEC', Object.keys(evt.grid.selection));
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
        // console.log("ProteinFamiliesGrid _setState()");
        this.store.set('state', state);

        // console.log("ProteinFamiliesGrid Call Grid Refresh()");
        this.refresh();
      }
    },
    _setSort: function (sort) {
      this.inherited(arguments);
      this.store.sort = sort;
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
