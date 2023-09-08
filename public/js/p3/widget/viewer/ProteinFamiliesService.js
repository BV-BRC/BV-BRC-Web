define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dijit/layout/ContentPane', 'dojox/widget/Standby',
  './Base', '../ProteinFamiliesServiceContainer',
  '../GridSelector', 'dojo/aspect', 'dojo/store/Memory', '../../WorkspaceManager'
], function (
  declare, lang, Topic,
  TabContainer, StackController,
  ContentPane, Standby,
  ViewerBase, ServiceContainer,
  selector, aspect, MemoryStore, WorkspaceManager
) {
  return declare([ViewerBase], {
    diabled: false,
    query: null,
    loaded: false,

    _setStateAttr: function (state) {
      console.log('state = ', state);
      var parts = state.pathname.split('/');
      state.path = '/' + parts.slice(2).reverse().slice(1).reverse().join('/');
      state.file = parts.reverse()[0];
      state.data = {};
      if (!this.loaded) {
        WorkspaceManager.getObject(state.path + '/' + state.file, false).then(lang.hitch(this, function (response) {
          var resData = JSON.parse(response.data);
          var plfam_data = resData['plfam'];
          var pgfam_data = resData['pgfam'];
          // TODO: figfam data
          var genome_ids = resData['genome_ids'];
          this.state.data = {};
          this.state.data['plfam'] = plfam_data;
          this.state.data['pgfam'] = pgfam_data;
          this.state.data['genome_ids'] = genome_ids.map(String);
          this.state.genome_ids = genome_ids.map(String); // Used in action bar functions
          this.state.data['genome_names'] = resData['genome_names'];
          this.state.genome_names = resData['genome_names'];
          this.state.data['pgfam_genomes'] = resData['pgfam_genomes'];
          this.state.data['plfam_genomes'] = resData['plfam_genomes'];
          if (resData.genome_groups) {
            this.state.genome_group_dict = Object.fromEntries(this.state.genome_ids.map((key, index) => [key, resData.genome_groups[index]]));
          }
          this.loaded = true;
          this.state = state;
          this.serviceContainer.setLoaded();
          this.setContainerState(this.state);
        }));
      }
    },

    onSetState: function (attr, oldVal, state) {
      if (this.loaded) {
        if (!state) {
          console.log('no state');
        } else {
          console.log('state');
        }
      }
    },

    postCreate: function () {
      console.log('prot fams postcreate');
      this.serviceContainer = new ServiceContainer({ region: 'center', state: this.state, loaded: false });
      this.addChild(this.serviceContainer);
      this.inherited(arguments);
    },

    setContainerState: function (state) {
      if (this.serviceContainer) {
        this.serviceContainer.onSetState(null, null, state);
      }
    }
  });
});
