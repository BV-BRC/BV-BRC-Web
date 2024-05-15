define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/aspect', 'dojo/request', 'dojo/topic',
  '../../../PageGrid', '../../../formatter', '../store/VariantMemoryStore', '../../../GridSelector'
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
    state: null,
    dataModel: 'variant_data',
    primaryKey: 'id',
    selectionModel: 'extended',
    deselectOnRefresh: true,
    columns: {
      // "Selection Checkboxes": selector({}),
      'Selection Checkboxes': selector({ unhidable: true }),
      pid: { label: 'id', field: 'id', hidden: true },
      aa_variant: { label: 'Variant', field: 'aa_variant' },
      sequence_features: { label: 'Sequence Features', field: 'sequence_features' },
      country: { label: 'Country', field: 'country', hidden: false },
      region: { label: 'Region', field: 'region', hidden: false },
      month: { label: 'Month', field: 'month' },
      total_isolates: { label: 'Total Sequences', field: 'total_isolates' },
      lineage_count: { label: 'Variant Sequences', field: 'lineage_count' },
      prevalence: { label: 'Frequency', field: 'prevalence' },
      growth_rate: { label: 'Growth Rate', field: 'growth_rate' },
      date_modified: { label: 'Date Modified', field: 'date_modified', formatter: formatter.dateOnly }
    },
    constructor: function (options) {
      if (options && options.apiServer) {
        this.apiServer = options.apiServer;
      }

      Topic.subscribe('Variant', lang.hitch(this, function () {
        console.log('VariantGrid: arguments=', arguments);
        var key = arguments[0],
          value = arguments[1];

        console.log('VariantGrid: key, value=', key, ',', value);

        switch (key) {
          case 'updateTgState':
            console.log('VariantGrid constructor case updateTgState: this.store: ', this.store);
            this.store.tgState = value;
            this.store.reload(value);
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
        this._unloadedData[d.pid] = d;
        return d.pid;
      }, this));
    },
    startup: function () {
      var _self = this;

      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);
        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
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
    postCreate: function () {
      this.inherited(arguments);
    },
    createStore: function (server, token, state) {
      var store = new Store({
        token: token,
        apiServer: this.apiServer || window.App.dataServiceURL,
        state: this.state || state
      });
      store.watch('refresh', lang.hitch(this, 'refresh'));

      return store;
    }
  });
});
