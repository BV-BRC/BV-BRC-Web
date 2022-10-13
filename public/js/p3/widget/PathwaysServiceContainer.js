define([
  'dojo/_base/declare', 'dojo/on', 'dojo/_base/lang', 'dijit/layout/BorderContainer',
  './ActionBar', './ContainerActionBar', 'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dojox/widget/Standby', './PathwayServiceGridContainer', 'dijit/layout/ContentPane', './GridContainer', 'dijit/TooltipDialog',
  '../store/PathwayServiceMemoryStore', 'dojo/dom-construct', 'dojo/topic', './GridSelector', '../WorkspaceManager', 'dojo/_base/Deferred'
], function (
  declare, on, lang, BorderContainer,
  ActionBar, ContainerActionBar, TabContainer, StackController,
  Standby, PathwaysGridContainer, ContentPane, GridContainer, TooltipDialog,
  PathwayMemoryStore, domConstruct, topic, selector, WorkspaceManager, Deferred
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
      // console.log("PathwaysServiceContainer set STATE.  state: ", state, " First View: ", this._firstView);
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

      // make breadcrumb
      var breadCrumbContainer = new ContentPane({ 'content': this.generatePathLinks(this.state.path), 'region': 'top' });

      this.tabContainer = new TabContainer({ region: 'center', id: 'tab_container' });

      var tabController = new StackController({
        containerId: 'tab_container',
        region: 'top',
        'class': 'TextTabButtonsViewer',

      });
      this.tabController = tabController;

      this.addChild(breadCrumbContainer);
      this.addChild(this.tabContainer);
      this.addChild(this.tabController);

      topic.subscribe('tab_container-selectChild', lang.hitch(this, function (page) {
        page.set('state', this.state);
      }));

      // Load data
      this.loadWorkspaceData();

      this._firstView = true;
    },

    loadWorkspaceData: function () {
      // load pathway data in background
      this.loadData(this.state.data['pathway']).then(lang.hitch(this, function (pathway_data) {
        // TODO: the last entry is undefined, not sure why it's being added: for now just remove
        // pathway_data.pop();
        this.state.data['pathway'] = pathway_data;
        var pathway_store = new PathwayMemoryStore({
          data: pathway_data,
          state: this.state,
          storeType: 'pathway',
          primaryKey: 'pathway_id'
        });
        this.pathwaysGrid = new PathwaysGridContainer({ title: 'Pathways', store: pathway_store, type: 'pathway' });
        this.pathwaysGrid.setFilterUpdateTrigger();
        this.pathwaysGrid.store.setContainer(this.pathwaysGrid);
        // Hide loading mask
        this.loadingMask.hide();
        this.tabContainer.addChild(this.pathwaysGrid);
      }));

      // load ec data in background
      this.loadData(this.state.data['ecnumber']).then(lang.hitch(this, function (ec_data) {
        // TODO: the last entry is undefined, not sure why it's being added: for now just remove
        // ec_data.pop();
        this.state.data['ecnumber'] = ec_data;
        var ec_store = new PathwayMemoryStore({ data: ec_data, state: this.state, storeType: 'ecNum', primaryKey: 'ec_index' });
        this.ecGrid = new PathwaysGridContainer({ title: 'EC Number', store: ec_store, type: 'ec_number' });
        this.ecGrid.setFilterUpdateTrigger();
        this.tabContainer.addChild(this.ecGrid);
      }));

      /*
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
      // TODO: the last entry is undefined, not sure why it's being added: for now just remove
      genes_data.pop();
      this.state.data['gene'] = genes_data;
      var gene_store = new PathwayMemoryStore({
        data: genes_data,
        state: this.state,
        storeType: 'genes',
        primaryKey: 'gene'
      });
      this.genesGrid = new PathwaysGridContainer({ title: 'Genes', store: gene_store, type: 'gene' });
      this.genesGrid.setFilterUpdateTrigger();
      this.tabContainer.addChild(this.genesGrid);
      */
    },

    loadData: function (data) {
      var def = new Deferred();
      var worker = new window.Worker('/public/worker/PathwayServiceWorker.js', { type: 'module' });
      worker.onerror = (err) => console.log(err);
      worker.onmessage = lang.hitch(this, function (e) {
        var result_data = e.data.data;
        def.resolve(result_data);
        worker.terminate();
      });
      var payload = { text_data: data };
      worker.postMessage(JSON.stringify({ type: 'load_data', payload: payload }));
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
