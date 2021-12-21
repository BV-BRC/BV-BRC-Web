define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/aspect', 'dojo/topic',
  './GridSelector', './PageGrid', '../store/BiosetResultMemoryStore'
], function (
  declare, lang, Deferred,
  on, aspect, Topic,
  selector, Grid, Store
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: null,
    tgState: null,
    dataModel: 'bioset_result',
    primaryKey: 'entity_id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      entity_id: { label: 'ID', field: 'entity_id' },
      brc_id: { label: 'BRC ID', field: 'patric_id', hidden: true },
      locus_tag: { label: 'Locus Tag', field: 'locus_tag' },
      gene_id: { label: 'Gene ID', field: 'gene_id', hidden: true },
      protein_id: { label: 'Protein ID', field: 'protein_id', hidden: true },
      gene: { label: 'Gene', field: 'gene', hidden: true },
      product: { label: 'Product', field: 'product', hidden: true },
      name: { label: 'Name', field: 'entity_name' },
      samples: { label: 'Samples', field: 'sample_size' },
      up_reg: { label: 'Up', field: 'up' },
      down_reg: { label: 'Down', field: 'down' }
    },
    constructor: function (options, parent) {
      if (options && options.apiServer) {
        this.apiServer = options.apiServer;
      }

      this.topicId = parent.topicId;

      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            this.tgState = value;
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
      } else {
        this.store.set('state', state);

        this.refresh();
      }
    },
    _setSort: function (sort) {
      this.inherited(arguments);
      this.store.sort = sort;

      if (sort.length > 0) {
        this.tgState.columnSort = sort;
        this.tgState.clusterColumnOrder = [];

        Topic.publish(this.topicId, 'updateTgState', this.tgState);
        Topic.publish(this.topicId, 'requestHeatmapData', this.tgState);
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
        token: window.App.authorizationToken,
        apiServer: this.apiServer || window.App.dataServiceURL,
        topicId: this.topicId,
        state: state || this.state
      });
      store.watch('refresh', lang.hitch(this, 'refresh'));

      return store;
    }
  });
});
