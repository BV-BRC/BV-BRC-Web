define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dijit/layout/ContentPane',
  './Base', '../TabContainer'
], function (
  declare,
  domConstruct,
  ContentPane,
  ViewerBase, TabContainer
) {
  return declare([ViewerBase], {
    query: null,
    defaultTab: 'overview',
    perspectiveLabel: 'BasePerspective Perspective',
    perspectiveIconClass: 'icon-info',
    onSetState: function (attr, oldState, state) {
      if (!state) {
        return;
      }

      if (!state.hashParams) {
        if (oldState.hashParams && oldState.hashParams.view_tab) {
          state.hashParams = { view_tab: oldState.hashParams.view_tab };
        } else {
          state.hashParams = { view_tab: this.defaultTab };
        }
      }
      // console.log("    Check for Hash Params: ", state.hashParams);
      if (state.hashParams) {
        if (!state.hashParams.view_tab) {
          state.hashParams.view_tab = this.defaultTab;
        }

        // console.log("Looking for Active Tab: ", state.hashParams.view_tab);

        if (this[state.hashParams.view_tab]) {
          var vt = this[state.hashParams.view_tab];
          // console.log("Found View Tab")
          vt.set('visible', true);
          // console.log("Select View Tab")
          this.viewer.selectChild(vt);
        } else {
          console.log('No view-tab supplied in State Object');
        }
      }
    },

    setActivePanelState: function () {
    },

    postCreate: function () {
      this.inherited(arguments);
      this.viewHeader = new ContentPane({
        content: '',
        'class': 'breadcrumb',
        region: 'top'
      });

      var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader' });
      domConstruct.place(headerContent, this.viewHeader.containerNode, 'last');

      domConstruct.create('i', { 'class': 'fa PerspectiveIcon ' + this.perspectiveIconClass }, headerContent);

      domConstruct.create('div', {
        'class': 'PerspectiveType',
        innerHTML: this.perspectiveLabel
      }, headerContent);

      this.queryNode = domConstruct.create('span', { 'class': 'PerspectiveQuery' }, headerContent);

      this.totalCountNode = domConstruct.create('span', {
        'class': 'PerspectiveTotalCount',
        innerHTML: '( loading... )'
      }, headerContent);

      this.viewer = new TabContainer({
        region: 'center'
      });

      this.addChild(this.viewHeader);
      this.addChild(this.viewer);

    }
  });
});
