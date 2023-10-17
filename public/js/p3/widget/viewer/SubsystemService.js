define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dijit/layout/ContentPane', 'dojox/widget/Standby',
  './Base', '../SubsystemServiceContainer',
  '../GridSelector', 'dojo/aspect', 'dojo/store/Memory', '../../WorkspaceManager',
  '../../DataAPI'
], function (
  declare, lang, Topic,
  TabContainer, StackController,
  ContentPane, Standby,
  ViewerBase, ServiceContainer,
  selector, aspect, MemoryStore, WorkspaceManager, DataAPI
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
        console.log(state.path + '/' + state.file);
        WorkspaceManager.getObject(state.path + '/' + state.file, false).then(lang.hitch(this, function (response) {
          var resData = JSON.parse(response.data);
          var genome_ids = resData['genome_ids'];
          var genome_names = resData.hasOwnProperty('genome_names') ? resData['genome_names'] : null;
          var overview_data = resData['overview'];
          var subsystem_table = resData['subsystems'];
          var genes_table = resData['genes'];
          var job_name = resData['job_name'];
          if (genome_ids.length == 1 && genome_names) {
            this.state.genome = {
              genome_id: genome_ids[0],
              genome_name: genome_names[0]
            };
          }
          this.state.genome_ids = genome_ids.map(String); // Used in action bar functions (TODO: check)
          this.state.data['genome_ids'] = genome_ids.map(String);
          this.state.data['overview'] = overview_data;
          this.state.data['subsystems'] = subsystem_table;
          this.state.data['genes'] = genes_table;
          this.state['job_name'] = job_name; // setting title in SubSystemsOverviewMemoryGrid.js
          this.loaded = true;
          // this.state = state;
          this.serviceContainer.setLoaded();
          console.log('calling set state in serviceContainer');
          this.serviceContainer.set('state', state);
          // this.setContainerState(this.state);
        }));
      }
    },

    onSetState: function (attr, oldVal, state) {
      console.log('on set state = ', state);
      if (this.loaded) {
        if (!state) {
          console.log('no state');
        } else {
          console.log('state');
        }
      }
    },

    postCreate: function ()  {
      this.serviceContainer = new ServiceContainer({ id: this.id + '_serviceContainer', region: 'center', loaded: false });
      this.addChild(this.serviceContainer);
      this.inherited(arguments);
    }
  });
});
