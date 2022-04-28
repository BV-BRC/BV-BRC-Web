define([
  'dojo/_base/declare', 'dojo/on', 'dojo/_base/lang', 'dijit/layout/BorderContainer',
  './ActionBar', './ContainerActionBar', 'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dojox/widget/Standby', './PathwayServiceGridContainer', 'dijit/layout/ContentPane', './GridContainer', 'dijit/TooltipDialog',
  '../store/PathwayServiceMemoryStore', 'dojo/dom-construct', 'dojo/topic', './GridSelector', '../WorkspaceManager'
], function (
  declare, on, lang, BorderContainer,
  ActionBar, ContainerActionBar, TabContainer, StackController,
  Standby, PathwaysGridContainer, ContentPane, GridContainer, TooltipDialog,
  PathwayMemoryStore, domConstruct, topic, selector, WorkspaceManager
) {

  return declare([BorderContainer], { // TODO import: reference ProteinFamiliesContainer
    'class': 'GridContainer pathway_view',
    tooltip: 'Pathways',
    gutters: false,
    state: null,
    store: null,
    containerType: '',
    visible: true,
    loaded: false,

    constructor: function (options) {
      console.log('ServiceContainerconstructor');
    },

    postCreate: function () {
      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      // this.loadingMask.startup();
      this.loadingMask.show(); // THIS ONE WORKS

    },

    onSetState: function (attr, oldVal, state) {
      console.log("PathwaysServiceContainer set STATE.  state: ", state, " First View: ", this._firstView);
      console.log('loaded = ', this.loaded);
      if (!this.loaded) {
        // wait for directory contents to load
        return;
      }
      if (state) {
        this.state = state;
        this.onFirstView();
      }
      // TODO: breadcrumb??
    },

    selectChild: function (child) {
      topic.publish('tab_container-selectChild', child);
    },

    setLoaded: function () {
      this.loaded = true;
    },

    onFirstView: function () {
      console.log('onFirstView');
      if (this._firstView) {
        return;
      }

      this.tabContainer = new TabContainer({ region: 'center', id: 'tab_container' });

      var tabController = new StackController({
        containerId: 'tab_container',
        region: 'top',
        'class': 'TextTabButtonsViewer',

      });
      this.tabController = tabController;

      this.addChild(this.tabController);
      this.addChild(this.tabContainer);

      topic.subscribe('tab_container-selectChild', lang.hitch(this, function (page) {
        page.set('state', this.state);
      }));

      // Load data
      this.loadWorkspaceData();

      this._firstView = true;
    },

    loadWorkspaceData: function () {
      var pathway_data = [];
      var header = true;
      var pathway_keys = null;
      this.state.data['pathway'].split('\n').forEach(function (line) {
        if (header) {
          pathway_keys = line.split('\t');
          header = false;
        }
        else {
          var new_data = {};
          var l = line.split('\t');
          pathway_keys.forEach(lang.hitch(this, function (key, index) {
            new_data[key] = l[index];
          }));
          pathway_data.push(new_data);
        }
      });
      this.state.data['pathway'] = pathway_data;
      var pathway_store = new PathwayMemoryStore({ data: pathway_data, state: this.state, storeType: 'pathway', primaryKey: 'pathway_id' });
      this.pathwaysGrid = new PathwaysGridContainer({ title: 'Pathways', store: pathway_store, type: 'pathway', });
      this.pathwaysGrid.setFilterUpdateTrigger();
      this.pathwaysGrid.store.setContainer(this.pathwaysGrid);
      // Hide loading mask
      this.loadingMask.hide();
      this.tabContainer.addChild(this.pathwaysGrid);

      var ec_data = [];
      var header = true;
      var ec_keys = null;
      this.state.data['ecnumber'].split('\n').forEach(function (line) {
        if (header) {
          ec_keys = line.split('\t');
          header = false;
        }
        else {
          var new_data = {};
          var l = line.split('\t');
          ec_keys.forEach(lang.hitch(this, function (key, index) {
            new_data[key] = l[index];
          }));
          ec_data.push(new_data);
        }
      });
      this.state.data['ecnumber'] = ec_data;
      var ec_store = new PathwayMemoryStore({ data: ec_data, state: this.state, storeType: 'ecNum', primaryKey: 'ec_number' });
      this.ecGrid = new PathwaysGridContainer({ title: 'EC Number', store: ec_store, type: 'ec_number' });
      this.ecGrid.setFilterUpdateTrigger();
      this.tabContainer.addChild(this.ecGrid);

      var genes_data = [];
      var header = true;
      var gene_keys = null;
      this.state.data['gene'].split('\n').forEach(function (line) {
        if (header) {
          gene_keys = line.split('\t');
          header = false;
        }
        else {
          var new_data = {};
          var l = line.split('\t');
          gene_keys.forEach(lang.hitch(this, function (key, index) {
            new_data[key] = l[index];
          }));
          genes_data.push(new_data);
        }
      });
      this.state.data['gene'] = genes_data;
      var gene_store = new PathwayMemoryStore({ data: genes_data, state: this.state, storeType: 'genes', primaryKey: 'gene' });
      this.genesGrid = new PathwaysGridContainer({ title: 'Genes', store: gene_store, type: 'gene' });
      this.genesGrid.setFilterUpdateTrigger();
      this.tabContainer.addChild(this.genesGrid);
    }
  });
});
  