define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/aspect', 'dojo/request', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', './GridSelector',
  './PageGrid', './formatter', '../store/ProteinFamiliesMemoryStore'
], function (
  declare, lang, Deferred,
  on, domClass, domConstruct, aspect, request, Topic,
  BorderContainer, ContentPane, selector,
  Grid, formatter, Store
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: null,
    pfState: null,
    dataModel: 'genome_feature',
    primaryKey: 'feature_id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      family_id: { label: 'ID', field: 'family_id' },
      feature_count: { label: 'Proteins', field: 'feature_count' },
      genome_count: { label: 'Genomes', field: 'genome_count' },
      description: { label: 'Description', field: 'description' },
      aa_length_min: { label: 'Min AA Length', field: 'aa_length_min' },
      aa_length_max: { label: 'Max AA Length', field: 'aa_length_max' },
      aa_length_avg: { label: 'Mean', field: 'aa_length_mean', formatter: formatter.toInteger },
      aa_length_std: { label: 'Std Dev', field: 'aa_length_std', formatter: formatter.toInteger }
    },
    constructor: function (options, parent) {
      // console.log("ProteinFamiliesGrid Ctor: ", options, parent);
      if (options && options.apiServer) {
        this.apiServer = options.apiServer;
      }

      this.topicId = parent.topicId;
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        // console.log("ProteinFamiliesGrid:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updatePfState':
            this.pfState = value;
            break;
          case 'updateMainGridOrder':
            this.updateSortArrow([]);
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
      });

      this.on('dgrid-deselect', function (evt) {
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
        // console.log("_setState", state);
        // var store = ProteinFamiliesMemoryStore.getInstance();
        // store.init({
        //  token: window.App.authorizationToken,
        //  apiServer: this.apiServer || window.App.dataServiceURL,
        //  state: state
        // });
        // store.watch('refresh', lang.hitch(this, "refresh"));
        // // this.store = store;
        // console.log(store);
        // this.set('store', store);
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

      if (sort.length > 0) {
        this.pfState.columnSort = sort;
        this.pfState.clusterColumnOrder = [];

        Topic.publish(this.topicId, 'updatePfState', this.pfState);
        Topic.publish(this.topicId, 'requestHeatmapData', this.pfState);
      }
    },
    _selectAll: function () {

      this._unloadedData = {};

      return Deferred.when(this.store.data.map(function (d) {
        this._unloadedData[d.family_id] = d;
        return d.family_id;
      }, this));
    },
    createStore: function (server, token, state) {

      var store = new Store({
        token: window.App.authorizationToken,
        apiServer: this.apiServer || window.App.dataServiceURL,
        topicId: this.topicId,
        state: state || this.state
      });
      store.watch('refresh', lang.hitch(this, 'refresh'));

      return store;
      // return null; // block store creation in PageGrid.startup()
    }
  });
});
