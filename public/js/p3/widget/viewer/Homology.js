define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dijit/layout/StackContainer', 'dijit/layout/TabController',
  'dijit/layout/ContentPane', 'dojox/widget/Standby',
  './Base', '../HomologyResultGridContainer', '../../store/HomologyResultMemoryStore',
  '../GridSelector', 'dojo/aspect', 'dojo/store/Memory'
], function (
  declare, lang, Topic,
  TabContainer, StackController,
  ContentPane, Standby,
  ViewerBase, GridContainer, HomologyResultMemoryStore,
  selector, aspect, MemoryStore
) {

  return declare([ViewerBase], {
    disabled: false,
    query: null,
    visible: true,
    data: null,

    _setStateAttr: function (state) {
      var parts = state.pathname.split('/')
      state.path = '/' + parts.slice(2).join('/')
      this._set('state', state);
    },

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      this.grid.set('state', state);
    },

    postCreate: function () {
      this.grid = new GridContainer({ region: 'center' });
      this.addChild(this.grid);
      this.inherited(arguments);
    }
  });
});
