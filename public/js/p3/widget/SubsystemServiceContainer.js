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
      this.loadGenesTable();

      // Topic ids
      var subsystemsTopicId = 'subsystems topicId';
      var genesTopicId = 'genes topicId';

      // load data into memory stores
      this.subsystemsOverviewStore = new SubsystemsOverviewMemoryStore({
        type: 'subsystems_overview',
        state: this.state
      });
      this.subsystemsStore = new SubSystemMemoryStore({
        type: 'subsystems',
        state: this.state,
        facetFields: ['superclass', 'class', 'subclass', 'active', 'subsystem_name']
      });
      this.subsystemsStore.setTopicId(subsystemsTopicId);
      this.geneSubsystemsStore = new SubSystemMemoryStore({
        type: 'genes',
        state: this.state
      });
      this.geneSubsystemsStore.setTopicId(genesTopicId);

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
        state: this.state,
        getFilterPanel: function (opts) {

        },
        // facetFields: ['superclass', 'class', 'subclass', 'active', 'subsystem_name'],
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
        enableFilterPanel: true,
        // visible: true
      });
      this.subsystemsGrid.setTopicId(subsystemsTopicId);
      this.subsystemsGrid.setFilterUpdateTrigger();

      this.genesGrid = new SubSystemsGridContainer({
        title: 'Genes',
        type: 'genes',
        store: this.geneSubsystemsStore,
        state: this.state,
        getFilterPanel: function (opts) {

        },
        facetFields: ['superclass', 'class', 'subclass', 'active', 'subsystem_name'],
        columns: {
          'Selection Checkboxes': selector({ unhidable: true }),
          superclass: { label: 'Superclass', field: 'superclass' },
          'class': { label: 'Class', field: 'class' },
          subclass: { label: 'Subclass', field: 'subclass' },
          subsystem_name: { label: 'Subsystem Name', field: 'subsystem_name' },
          role_id: { label: 'Role ID', field: 'role_id', hidden: true },
          role_name: { label: 'Role Name', field: 'role_name' },
          active: { label: 'Variant', field: 'active', hidden: true },
          patric_id: { label: 'BRC ID', field: 'patric_id' },
          gene: { label: 'Gene', field: 'gene' },
          refseq_locus_tag: { label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: true },
          alt_locus_tag: { label: 'Alt Locus Tag', field: 'alt_locus_tag', hidden: true },
          product: { label: 'Product', field: 'product' },
          genome_id: { label: 'Genome ID', field: 'genome_id', hidden: true },
          genome_name: { label: 'Genome Name', field: 'genome_name', hidden: true },
          taxon_id: { label: 'Taxon ID', field: 'taxon_id', hidden: true },
          subsystem_id: { label: 'Subsystem ID', field: 'subsystem_id', hidden: true }
        },
        enableFilterPanel: true,
        // visible: true
      });
      this.genesGrid.setTopicId(genesTopicId);
      this.genesGrid.setFilterUpdateTrigger();

      this.addChild(tabController);
      this.addChild(this.tabContainer);

      this.tabContainer.addChild(this.subsystemsOverviewGrid);
      this.tabContainer.addChild(this.subsystemsGrid);
      this.tabContainer.addChild(this.genesGrid);

      this.resize(); // this fixes a bug where relayout is not triggered properly

      this._firstView = true;
    },

    // TODO: move to a service worker
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
            if (key === 'subsystem_name') {
              new_data['id'] = l[index];
            }
            new_data[key] = l[index];
          }));
          new_data['document_type'] = 'subsystems_subsystem'; // used in ItemDetailPanel
          subsystem_data.push(new_data);
        }
      });
      // TODO: the last entry is undefined, not sure why it's being added: for now just remove
      subsystem_data.pop();
      // debugger;
      this.state.data['subsystem_table'] = subsystem_data;
    },

    // TODO: move to a service worker
    loadGenesTable: function () {
      var genes_data = [];
      var header = true;
      var genes_keys = null;
      this.state.data['genes'].split('\n').forEach(function (line) {
        if (header) {
          genes_keys = line.split('\t');
          header = false;
          console.log(genes_keys);
        }
        else {
          var new_data = {};
          var l = line.split('\t');
          genes_keys.forEach(lang.hitch(this, function (key, index) {
            new_data[key] = l[index];
            new_data['document_type'] = 'subsystems_gene'; // used in ItemDetailPanel
          }));
          genes_data.push(new_data);
        }
      });
      // TODO: the last entry is undefined, not sure why it's being added: for now just remove
      genes_data.pop();
      this.state.data['genes_table'] = genes_data;
    }
  });
});
