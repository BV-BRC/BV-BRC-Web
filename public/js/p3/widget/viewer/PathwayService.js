define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dijit/layout/ContentPane', 'dojox/widget/Standby',
  './Base', '../PathwaysServiceContainer',
  '../GridSelector', 'dojo/aspect', 'dojo/store/Memory', '../../WorkspaceManager'
], function (
  declare, lang, Topic,
  TabContainer, StackController,
  ContentPane, Standby,
  ViewerBase, ServiceContainer,
  selector, aspect, MemoryStore, WorkspaceManager
) {

  return declare([ViewerBase], {
    disabled: false,
    query: null,
    visible: true,

    // Called first
    _setStateAttr: function (state) {
      console.log('setStatAttr');
      console.log('state = ', state);
      // add all files to state
      // TODO: get an xhr failure when passing in folder
      var parts = state.pathname.split('/');
      state.path = '/' + parts.slice(2).reverse().slice(1).reverse().join('/'); // remove filename from path
      state.file = parts.reverse()[0];
      state.data = {};
      if (!this.loaded) {
        // TODO: change parsing once the input is finalized
        WorkspaceManager.getObject(state.path + '/' + state.file, false).then(lang.hitch(this, function (response) {
          var resData = JSON.parse(response.data);
          var pathway_data = resData['pathway'];
          var ec_data = resData['ecnumber'];
          var gene_data = resData['genes'];
          var genome_ids = resData['genome_ids'];
          this.state.data = {};
          this.state.data['pathway'] = pathway_data;
          this.state.data['ecnumber'] = ec_data;
          this.state.data['gene'] = gene_data;
          this.state.data['genome_ids'] = genome_ids;
          this.state.genome_ids = genome_ids; // used in some green-bar buttons
          this.loaded = true;
          this.serviceContainer.setLoaded();
          this.setContainerState(this.state);
        }));
      }
    },

    // Called third
    onSetState: function (attr, oldVal, state) {
      if (this.loaded) {
        if (!state) {
          console.log('no state');
        } else {
          console.log('state');
        }
      }
    },

    // called second: create ServiceContainerGrid
    postCreate: function () {
      console.log('postCreate');
      this.serviceContainer = new ServiceContainer({ region: 'center', state: null, loaded: false });
      this.addChild(this.serviceContainer);
      this.inherited(arguments);
    },

    setContainerState: function (state) {
      if (this.serviceContainer) {
        // this.serviceContainer.set('state', state); // TODO ask Dustin why set.('state', state) doesn't call onSetState
        this.serviceContainer.onSetState(null, null, state);
      }
    }
  });
});
