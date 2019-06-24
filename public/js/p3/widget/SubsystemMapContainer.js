define([
  'dojo/_base/declare',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  './SubsystemMapHeatmapContainer',   './SubsystemMapHeatmapContainerNew'
], function (
  declare, BorderContainer, TabContainer, StackController, ContentPane,
  HeatmapContainer, HeatmapContainerNew
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
      if (this.heatmapContainerNew) {
        this.heatmapContainerNew.set('visible', true);
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

      /*
      this.heatmapContainerNew = new HeatmapContainerNew({
        title: 'Subsystem Heatmap (new)',
        type: 'webGLHeatmap',
        topicId: this.topicId,
        content: 'Heatmap (new)'
      });
      */

      this.heatmapContainer = new HeatmapContainer({
        title: '<span class="light">Subsystem Heatmap</span>',
        content: 'Subsystem Heatmap',
        state: this.state,
        apiServer: this.apiServer
      });

      this.tabContainer.addChild(this.heatmapContainer);
      // this.tabContainer.addChild(this.heatmapContainerNew);
      this.addChild(tabController);
      this.addChild(this.tabContainer);

      var self = this;
      this.tabContainer.watch('selectedChildWidget', function (name, oldTab, newTab) {
        if (newTab.type === 'webGLHeatmap') {
          self.heatmapContainerNew.update();
        }
      });

      // todo(nc): remove.  currently need delay for genome filter to be set
      setTimeout(function () {
        self.heatmapContainerNew.update();
      }, 1000);

      this.inherited(arguments);
      this._firstView = true;
    }
  });
});
