define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', 'dojo/_base/lang',
  './ActionBar', './ContainerActionBar', 'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './CorrelatedGenesGridContainer', 'dijit/layout/ContentPane', './GridContainer', 'dijit/TooltipDialog'
], function (
  declare, BorderContainer, on, lang,
  ActionBar, ContainerActionBar, TabContainer, StackController,
  CorrelatedGenesGridContainer, ContentPane, GridContainer, TooltipDialog
) {

  return declare([BorderContainer], {
    tooltip: 'The "Correlated Genes" tab shows list of genes from the same genome with correlated expression profiles',
    gutters: false,
    state: null,
    apiServer: window.App.dataServiceURL,

    onSetState: function (attr, oldVal, state) {
      // console.log("CorrelatedGenesContainer set STATE.  feature_id: ", state.feature_id, " state: ", state);

      if (!state) {
        return;
      }

      if (this.correlatedGenesGrid) {
        this.correlatedGenesGrid.set('state', state);
      }

      // console.log("call _set(state) ", state);

      // this._set("state", state);
    },

    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
      // if(this.correlatedGenesGrid){
      //   this.correlatedGenesGrid.set("visible", true)
      // }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.correlatedGenesGrid = new CorrelatedGenesGridContainer({
        region: 'center',
        title: 'Correlated Genes',
        content: 'Correlated Genes Grid',
        visible: true,
        apiServer: this.apiServer
      });

      this.watch('state', lang.hitch(this, 'onSetState'));

      this.addChild(this.correlatedGenesGrid);

      this.inherited(arguments);
      this._firstView = true;
    }
  });
});

