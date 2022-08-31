define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/aspect', 'dojo/request', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', './GridSelector',
  './PageGrid', './formatter', '../store/ProteinFamiliesServiceMemoryStore', 'dojo/when'
], function (
  declare, lang, Deferred,
  on, domClass, domConstruct, aspect, request, Topic,
  BorderContainer, ContentPane, selector,
  Grid, formatter, Store, when
) {

  return declare([Grid], {
    region: 'center',
    // query
    data: null,
    primaryKey: 'family_id',
    store: null,
    pfState: null,
    state: null,
    storeType: '',
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
    loadingMessage: 'Loading ProteinFamilies data...',

    constructor: function (options, parent) {
      console.log('grid constructor');
      this.topicId = parent.topicId;
      this.onSetState(parent.state);

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
          case 'setFamilyType':
            console.log('refresh');
            this.refresh();
            break;
          case 'applyConditionFilterRefresh':
            this.refresh();
            break;
          default:
            break;
        }
      }));
    },

    startup: function () {
      console.log('startup');

      var _self = this;

      this.on('dgrid-sort', function (evt) {
        _self.store.query('', { sort: evt.sort });
        _self.pfState.sort = evt.sort;
        Topic.publish(_self.topicId, 'updatePfState', _self.pfState);
      });

      this.on('dgrid-select', function (evt) {
        console.log('evt = ', evt);
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
        console.log('results = ', results);
        Deferred.when(results.total, function (x) {
          _self.set('totalRows', x);
        });
      });

      // this.inherited(arguments);
      this._started = true;
      Topic.publish(this.topicId, 'showLoadingMask');
      _self.store.loadGenomeDataBackground().then(lang.hitch(this, function (res) {
        this.set('columns', this.columns);
        Topic.publish(this.topicId, 'hideLoadingMask');
      }));
    },

    onSetState: function (state) {
      if (!state) {
        return;
      }
      this.state = state;
      if (!this.store) {
        this.createStore();
      } else {
        // console.log('set data');
        // this.store.set('data', state);
      }
      // this.refresh();
    },

    postCreate: function () {
      this.inherited(arguments);
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
      var _self = this;
      var def = new Deferred();
      when(this.store.query({}, { 'selectAll': true }), function (results) {
        _self._unloadedData = {};
        def.resolve(results.map(function (obj) {
          _self._unloadedData[obj.family_id] = obj;
          return obj.family_id;
        }));
      });
      return def.promise;
    },
    createStore: function () {
      console.log('create Store');
      console.log('state = ', this.state);
      this.store = new Store({ state: this.state, topicId: this.topicId });
      // TODO: watch refresh???
    },

    renderRow: function (obj) {
      console.log('render');
      var div = domConstruct.create('div', { className: 'collapsed' });
      div.appendChild(Grid.prototype.renderRow.apply(this, arguments));
      return div;
    },

    postCreate: function () {
      this.inherited(arguments);
    },


  });
});
