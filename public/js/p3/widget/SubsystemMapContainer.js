define([
  'dojo/_base/declare',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './SubsystemMapHeatmapContainer'
], function (
  declare, BorderContainer, TabContainer, StackController,
  HeatmapContainer
) {

  return declare([BorderContainer], {
    gutters: false,
    state: null,
    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
      if (this.mainMapContainer) {
        this.mainMapContainer.set('visible', true);
      }
      if (this.heatmapContainer) {
        this.heatmapContainer.set('visible', true);
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.tabContainer = new TabContainer({ region: 'center', id: this.id + '_TabContainer' });

      var tabController = new StackController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      this.heatmapContainer = new HeatmapContainer({
        title: '<span class="light">Subsystem Heatmap</span>',
        content: 'Subsystem Heatmap',
        state: this.state,
        apiServer: this.apiServer
      });

      this.tabContainer.addChild(this.heatmapContainer);
      this.addChild(tabController);
      this.addChild(this.tabContainer);

      this.inherited(arguments);
      this._firstView = true;
    }
  });
});
