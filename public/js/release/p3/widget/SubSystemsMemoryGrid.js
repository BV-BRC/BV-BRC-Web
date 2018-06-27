define("p3/widget/SubSystemsMemoryGrid", [
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', 'dojo/_base/Deferred',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  'dojo/_base/xhr', 'dojo/_base/lang', './PageGrid', './formatter', '../store/SubSystemMemoryStore', 'dojo/request',
  'dojo/aspect', './GridSelector', 'dojo/when'
], function (
  declare, BorderContainer, on, Deferred,
  domClass, ContentPane, domConstruct,
  xhr, lang, Grid, formatter, Store, request,
  aspect, selector, when
) {
  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataServiceURL,
    store: null,
    dataModel: 'subsystem',
    primaryKey: 'id',
    selectionModel: 'extended',
    loadingMessage: 'Loading subsystems.  This may take several minutes...',
    deselectOnRefresh: true,
    fullSelectAll: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),
      superclass: { label: 'Superclass', field: 'superclass' },
      'class': { label: 'Class', field: 'class' },
      subclass: { label: 'Subclass', field: 'subclass' },
      subsystem_name: { label: 'Subsystem Name', field: 'subsystem_name' },
      role_id: { label: 'Role ID', field: 'role_id', hidden: true },
      role_name: { label: 'Role Name', field: 'role_name' },
      genome_count: { label: 'Genome Count', field: 'genome_count' },
      gene_count: { label: 'Gene Count', field: 'gene_count' },
      role_count: { label: 'Role Count', field: 'role_count' },
      active: { label: 'Active', field: 'active', hidden: true },
      patric_id: { label: 'PATRIC ID', field: 'patric_id' },
      gene: { label: 'Gene', field: 'gene' },
      refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: true },
      alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
      product: { label: 'Product', field: 'product' },
      genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
      genome_name: { label: 'Genome Name', field: 'genome_name', hidden: true },
      taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
      subsystem_id: { label: 'Subsystem ID', field: 'subsystem_id', hidden: true }

    },
    updateColumnHiddenState: function () {
      var _self = this;
      var multipleGenomes;
      if (Object.prototype.hasOwnProperty.call(this.state, 'taxon_id') || ( Object.prototype.hasOwnProperty.call(this.state, 'genome_ids') && this.state.genome_ids.length > 1) ) {
        multipleGenomes = true;
      } else {
        multipleGenomes = false;
      }
      if (multipleGenomes) {

        if (Object.prototype.hasOwnProperty.call(_self.columns, 'active')) {
          _self.toggleColumnHiddenState('active', true);
        }
        if (Object.prototype.hasOwnProperty.call(_self.columns, 'refseq_locus_tag')) {
          _self.toggleColumnHiddenState('refseq_locus_tag', false);
        }
        if (Object.prototype.hasOwnProperty.call(_self.columns, 'genome_id')) {
          _self.toggleColumnHiddenState('genome_id', false);
        }
        if (Object.prototype.hasOwnProperty.call(_self.columns, 'genome_name')) {
          _self.toggleColumnHiddenState('genome_name', false);
        }
      } else {

        if (Object.prototype.hasOwnProperty.call(_self.columns, 'active')) {
          _self.toggleColumnHiddenState('active', false);
        }
        if (Object.prototype.hasOwnProperty.call(_self.columns, 'refseq_locus_tag')) {
          _self.toggleColumnHiddenState('refseq_locus_tag', true);
        }
        if (Object.prototype.hasOwnProperty.call(_self.columns, 'genome_id')) {
          _self.toggleColumnHiddenState('genome_id', true);
        }
        if (Object.prototype.hasOwnProperty.call(_self.columns, 'genome_name')) {
          _self.toggleColumnHiddenState('genome_name', true);
        }
      }
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
      this._started = true;
    },
    state: null,

    _setApiServer: function (server) {
      this.apiServer = server;
    },

    _setState: function (state) {

      var oldState = this.get('state');

      var ov,
        nv;
      if (oldState) {
        ov = oldState.search;
        if (oldState.hashParams.filter) {
          ov += oldState.hashParams.filter;
        }
      }

      if (state) {
        nv = state.search;
        if (state.hashParams.filter) {
          nv += state.hashParams.filter;
        }
      }

      this.state = state;

      if (ov != nv) {
        if (!this.store) {
          this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state));
        } else {
          this.store.set('state', lang.mixin({}, state));
        }

        this.refresh();
      } else {
        this.refresh();
      }

      this.updateColumnHiddenState();
    },

    refresh: function () {
      this.inherited(arguments);
    },

    createStore: function (server, token, state) {
      if (this.store) {
        return this.store;
      }

      return new Store({
        token: token,
        apiServer: this.apiServer || window.App.dataServiceURL,
        state: state || this.state
      });
    },
    _selectAll: function () {
      var _self = this;
      var def = new Deferred();
      when(this.store.query({}, this.queryOptions), function (results) {
        _self._unloadedData = {};

        def.resolve(results.map(function (obj) {
          _self._unloadedData[obj[_self.primaryKey]] = obj;
          return obj[_self.primaryKey];
        }));
      });
      return def.promise;
    }
  });
});
