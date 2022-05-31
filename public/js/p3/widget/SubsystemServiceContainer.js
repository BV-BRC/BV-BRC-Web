define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/_base/lang',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './SubsystemServiceMemoryGridContainer',
  '../store/SubsystemServiceMemoryStore', '../store/SubsystemServiceOverviewMemoryStore', 'dojo/topic',
  './GridSelector', './SubsystemServiceOverview', 'dojox/widget/Standby', 'dojo/dom-construct', './SubSystemsContainer',
  '../DataAPI'
], function (
  declare, BorderContainer, lang,
  TabContainer, StackController,
  SubSystemsGridContainer,
  SubSystemMemoryStore, SubsystemsOverviewMemoryStore, Topic,
  selector, SubSystemsOverview, Standby, domConstruct, oldSubsystemsContainer, DataAPI
) {
  return declare([oldSubsystemsContainer], {
    gutters: false,
    state: null,
    tooltip: 'TODO tooltip for subsystems container',

    setLoaded: function () {
      this.loaded = true;
    },

    onSetState: function (attr, oldVal, state) {
      console.log('container onSetState');
      if (!state) {
        return;
      }
      if (!this._firstView) {
        this.onFirstView();
      }
      if (this.tabContainer && this.tabContainer.selectedChildWidget && this._firstView && this.tabContainer.selectedChildWidget.state != state) {
        this.tabContainer.selectedChildWidget.set('state', state);
      }
      if (this.mainGridContainer) {
        this.mainGridContainer.set('state', state);
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });

      // TODO: query genome data, then do the rest
      // - DataAPI.getGenome()
      // - How should this be handled for multiple genomes
      // this.state.genome = {
      //   genome_name: 'testing'
      // };

      // load data tables
      this.loadSubsystemsTable();

      // load data into memory stores
      this.subsystemsOverviewStore = new SubsystemsOverviewMemoryStore({
        type: 'subsystems_overview',
        state: this.state
      });
      this.subsystemsStore = new SubSystemMemoryStore({
        type: 'subsystems',
        state: this.state
      });
      // TODO: gene memory store

      // setup tab controller
      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        class: 'TextTabButtons'
      });

      // load subystemsOverviewGrid, pass in memory store
      this.subsystemsOverviewGrid = new SubSystemsOverview({
        title: 'Subsystems Overview',
        type: 'subsystems_overview',
        store: this.subsystemsOverviewStore,
        facetFields: ['class'],
        queryOptions: {
          sort: [{ attribute: 'subsystem_name' }]
        },
        enableFilterPanel: true,
        visible: true
      });
      this.subsystemsGrid = new SubSystemsGridContainer({
        title: 'Subsystems',
        type: 'subsystems',
        store: this.subsystemsStore,
        getFilterPanel: function (opts) {

        },
        columns: {
          'Selection Checkboxes': selector({ unhidable: true }),
          superclass: { label: 'Superclass', field: 'superclass' },
          'class': { label: 'Class', field: 'class' },
          subclass: { label: 'Subclass', field: 'subclass' },
          subsystem_name: { label: 'Subsystem Name', field: 'subsystem_name' },
          gene_count: { label: 'Gene Count', field: 'gene_count' },
          role_count: { label: 'Role Count', field: 'role_count' },
          active: { label: 'Variant', field: 'active', hidden: true },
          subsystem_id: { label: 'Subsystem ID', field: 'subsystem_id', hidden: true }
        },
      });

      this.addChild(tabController);
      this.addChild(this.tabContainer);

      this.tabContainer.addChild(this.subsystemsOverviewGrid);
      this.tabContainer.addChild(this.subsystemsGrid);

      this.resize(); // this fixes a bug where relayout is not triggered properly

      this._firstView = true;
    },

    loadSubsystemsTable: function () {
      var subsystem_data = [];
      var header = true;
      var subsystem_keys = null;
      this.state.data['subsystems'].split('\n').forEach(function (line) {
        if (header) {
          subsystem_keys = line.split('\t');
          header = false;
          console.log(subsystem_keys);
        }
        else {
          var new_data = {};
          var l = line.split('\t');
          subsystem_keys.forEach(lang.hitch(this, function (key, index) {
            if (key === 'subsystem_id') {
              new_data['id'] = l[index];
            }
            new_data[key] = l[index];
          }));
          subsystem_data.push(new_data);
        }
      });
      this.state.data['subsystem_table'] = subsystem_data;
    }
  });
});
