define([
  'dojo/_base/declare', 'dojo/_base/Deferred', 'dijit/layout/BorderContainer', 'dojo/_base/lang',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './SubsystemServiceMemoryGridContainer',
  '../store/SubsystemServiceMemoryStore', '../store/SubsystemServiceOverviewMemoryStore', 'dojo/topic',
  './GridSelector', './SubsystemServiceOverview', 'dojox/widget/Standby', 'dojo/dom-construct', './SubSystemsContainer',
  '../DataAPI'
], function (
  declare, Deferred, BorderContainer, lang,
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

      // setup tab controller
      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        class: 'TextTabButtons'
      });

      this.addChild(tabController);
      this.addChild(this.tabContainer);

      // load data into memory stores
      // - Oview takes no time so data loading will not be put in service worker
      this.subsystemsOverviewStore = new SubsystemsOverviewMemoryStore({
        type: 'subsystems_overview',
        state: this.state
      });
      this.loadSubsystemsData().then(lang.hitch(this, function (res) {
        this.subsystemsStore = new SubSystemMemoryStore({
          type: 'subsystems',
          state: this.state,
          facetFields: ['superclass', 'class', 'subclass', 'active', 'subsystem_name']
        });
        var subsystemsTopicId = 'subsystems topicId';
        this.subsystemsStore.setTopicId(subsystemsTopicId);

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

        this.tabContainer.addChild(this.subsystemsGrid);
      }));
      this.loadGenesData().then(lang.hitch(this, function (res) {
        var genesTopicId = 'genes topicId';

        this.geneSubsystemsStore = new SubSystemMemoryStore({
          type: 'genes',
          state: this.state,
          facetFields: ['superclass', 'class', 'subclass', 'active', 'subsystem_name']
        });
        this.geneSubsystemsStore.setTopicId(genesTopicId);

        this.genesGrid = new SubSystemsGridContainer({
          title: 'Genes',
          type: 'genes',
          store: this.geneSubsystemsStore,
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

        this.tabContainer.addChild(this.genesGrid);
      }));

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

      this.tabContainer.addChild(this.subsystemsOverviewGrid);

      this.resize(); // this fixes a bug where relayout is not triggered properly

      this._firstView = true;
    },

    loadSubsystemsData: function () {
      var def = new Deferred();
      var worker = new window.Worker('/public/worker/SubsystemServiceWorker.js', { type: 'module' });
      worker.onerror = (err) => console.log(err);
      worker.onmessage = lang.hitch(this, function (e) {
        if (e.data.type === 'loaded_subsystem_data') {
          this.state.data['subsystem_table'] = e.data['loaded_data'];
        }
        def.resolve(true);
        worker.terminate();
      });
      var payload = { data: this.state.data['subsystems'] };
      worker.postMessage(JSON.stringify({ type: 'load_subsystems', payload: payload }));
      return def;
    },

    loadGenesData: function () {
      var def = new Deferred();
      var worker = new window.Worker('/public/worker/SubsystemServiceWorker.js', { type: 'module' });
      worker.onerror = (err) => console.log(err);
      worker.onmessage = lang.hitch(this, function (e) {
        if (e.data.type === 'loaded_genes_data') {
          this.state.data['genes_table'] = e.data['loaded_data'];
        }
        def.resolve(true);
        worker.terminate();
      });
      var payload = { data: this.state.data['genes'] };
      worker.postMessage(JSON.stringify({ type: 'load_genes', payload: payload }));
      return def;
    }
  });
});
