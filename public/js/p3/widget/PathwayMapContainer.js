define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dijit/layout/StackContainer',
  'dijit/layout/TabController', './PathwayMapKeggContainer',
  './PathwayMapHeatmapContainer', './PathwayMapHeatmapContainerNew'
], function (
  declare, BorderContainer, TabContainer,
  StackController, MainMapContainer,
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

      this.mainMapContainer = new MainMapContainer({
        title: 'KEGG Map',
        content: 'KEGG Map',
        state: this.state,
        apiServer: this.apiServer
      });


      this.heatmapContainerNew = new HeatmapContainerNew({
        title: 'Heatmap (new)',
        type: 'webGLHeatmap',
        topicId: this.topicId,
        content: 'Heatmap (new)'
      });

      this.heatmapContainer = new HeatmapContainer({
        title: 'Heatmap',
        content: 'Heatmap'
      });

      // this.watch("state", lang.hitch(this, "onSetState"));

      this.tabContainer.addChild(this.mainMapContainer);
      this.tabContainer.addChild(this.heatmapContainerNew);
      this.tabContainer.addChild(this.heatmapContainer);

      var self = this;
      this.tabContainer.watch('selectedChildWidget', function (name, oldTab, newTab) {
        console.log('called update');
        if (newTab.type === 'webGLHeatmap') {
          console.log('calling heatmap update');
          self.heatmapContainerNew.update();
        }
      });

      this.addChild(tabController);
      this.addChild(this.tabContainer);

      this.inherited(arguments);
      this._firstView = true;
    }
  });
});
