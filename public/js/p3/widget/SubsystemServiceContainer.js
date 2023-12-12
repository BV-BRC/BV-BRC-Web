define([
  'dojo/_base/declare', 'dojo/_base/Deferred', 'dijit/layout/BorderContainer', 'dojo/_base/lang',
  'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  './SubsystemServiceMemoryGridContainer',
  '../store/SubsystemServiceMemoryStore', '../store/SubsystemServiceOverviewMemoryStore', 'dojo/topic',
  './GridSelector', './SubsystemServiceOverview', 'dojox/widget/Standby', 'dojo/dom-construct', './SubSystemsContainer',
  '../DataAPI', './formatter'
], function (
  declare, Deferred, BorderContainer, lang,
  TabContainer, StackController, ContentPane,
  SubSystemsGridContainer,
  SubSystemMemoryStore, SubsystemsOverviewMemoryStore, Topic,
  selector, SubSystemsOverview, Standby, domConstruct, oldSubsystemsContainer, DataAPI, formatter
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

      // Setup breadcrumb

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });

      var breadCrumbContainer = new ContentPane({ 'content': this.generatePathLinks(this.state.path), 'region': 'top' });

      // setup tab controller
      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        class: 'TextTabButtons'
      });

      this.addChild(breadCrumbContainer);
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
            gene_conservation: { label: 'Gene Conservation', field: 'gene_conservation', formatter: formatter.twoDecimalNumeric },
            role_conservation: { label: 'Role Conservation(%)', field: 'role_conservation', formatter: formatter.twoDecimalNumeric },
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
      /*
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
      */

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

    // Not used
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
    },

    generatePathLinks: function (path) {
      // strip out /public/ of parts array
      var parts = path.replace(/\/+/g, '/').split('/');
      if (parts[1] == 'public') {
        parts.splice(1, 1);
      }

      if (parts[0] == '') {
        parts.shift();
      }

      var out = ["<span class='wsBreadCrumb'>"];
      var bp = ['workspace'];
      var isPublic = path.replace(/\/+/g, '/').split('/')[1] == 'public';

      // if viewing all public workspaces, just create header
      if (path == '/public/') {
        out.push('<i class="icon-globe"></i> <b class="perspective">Public Workspaces</b>');

        // if viewing a specific public workspace, create bread crumbs with additional url params
      } else if (isPublic) {
        out.push('<i class="icon-globe"></i> ' +
          '<a class="navigationLink perspective" href="/' + bp.join('/') + '/public">Public Workspaces</a>' +
          ' <i class="icon-caret-right"></i> ');
        bp.push('public', parts[0]);
      }
      parts.push(''); // job result folder wont link without an added element
      parts.forEach(function (part, idx) {
        // part is already encoded
        if (idx == (parts.length - 1)) {
          out.push('<b class="perspective">' + part.replace('@' + localStorage.getItem('realm'), '') + '</b>');
          return;
        }

        // don't create links for top level path of public path
        if (isPublic && idx == 0) {
          out.push('<b class="perspective">' + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : part) + '</b> / ');
          return;
        }

        out.push("<a class='navigationLink' href='");
        bp.push(part);
        out.push('/' + bp.join('/'));
        out.push("'>" + ((idx == 0) ? part.replace('@' + localStorage.getItem('realm'), '') : decodeURIComponent(part)) + '</a> / ');
      });
      return out.join('');
    }
  });
});
