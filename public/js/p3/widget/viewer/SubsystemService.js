define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dijit/layout/ContentPane', 'dojox/widget/Standby',
  './Base', '../SubsystemServiceContainer',
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
      var parts = state.pathname.split('/');
      state.path = '/' + parts.slice(2).reverse().slice(1).reverse().join('/');
      state.file = parts.reverse()[0];
      state.data = {};
      if (!this.loaded) {
        WorkspaceManager.getObject(state.path + '/' + state.file, false).then(lang.hitch(this, function (response) {
          var resData = JSON.parse(response.data);
          var genome_ids = resData['genome_ids'];
          var overview_data = resData['overview'];
          // TODO: load data
          this.state.genome_ids = genome_ids.map(String); // Used in action bar functions (TODO: check)
          this.state.data['genome_ids'] = genome_ids.map(String);
          this.state.data['overview'] = overview_data;
          this.loaded = true;
          // this.state = state;
          this.serviceContainer.setLoaded();
          console.log('calling set state in serviceContainer');
          debugger;
          this.serviceContainer.set('state', state);
          // this.setContainerState(this.state);
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

    postCreate: function ()  {
      this.serviceContainer = new ServiceContainer({ id: this.id + '_serviceContainer', region: 'center', state: this.state, loaded: false });
      this.addChild(this.serviceContainer);
      this.inherited(arguments);
    },

    /*
    setContainerState: function (state) {
      if (this.serviceContainer) {
        this.serviceContainer.onSetState(null, null, state);
      }
    }
    */
  });
});
