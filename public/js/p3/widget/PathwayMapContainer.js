define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dijit/layout/StackContainer',
  'dijit/layout/TabController', './PathwayMapKeggContainer',
  './PathwayMapHeatmapContainerNew'
], function (
  declare, BorderContainer, TabContainer,
  StackController, MainMapContainer,
  HeatmapContainerNew
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

      this.mainMapContainer = new MainMapContainer({
        title: 'KEGG Map',
        content: 'KEGG Map',
        state: this.state,
        apiServer: this.apiServer
      });

      this.heatmapContainerNew = new HeatmapContainerNew({
        title: 'Heatmap',
        type: 'webGLHeatmap',
        topicId: this.topicId,
        state: this.state,
        content: 'Heatmap'
      });

      this.tabContainer.addChild(this.mainMapContainer);
      this.tabContainer.addChild(this.heatmapContainerNew);
      this.addChild(tabController);
      this.addChild(this.tabContainer);

      var self = this;
      this.tabContainer.watch('selectedChildWidget', function (name, oldTab, newTab) {
        if (newTab.type === 'webGLHeatmap') {
          self.heatmapContainerNew.update();
        }
      });

      this.inherited(arguments);
      this._firstView = true;
    }
  });
});
