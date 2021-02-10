define("p3/widget/VariantContainer", [
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './VariantGridContainer', './VariantChartContainer'
], function (
  declare, lang, on, Topic,
  BorderContainer, StackContainer, TabController,
  VariantGridContainer, VariantChartContainer
) {

  return declare([BorderContainer], {
    id: 'VariantContainer',
    gutters: false,
    state: null,
    tgState: null,
    tooltip: '',
    apiServer: window.App.dataServiceURL,
    constructor: function () {
    },
    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }
      if (state && !state.search) {
        return;
      }

      if (this.VariantGridContainer) {
        this.VariantGridContainer.set('state', state);
      }
      this._set('state', state);
    },

    visible: false,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }
    },

    onFirstView: function () {
      if (this._firstView) {
        return;
      }
      this._buildPanels();

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.inherited(arguments);
      this._firstView = true;
    },
    _buildPanels: function () {
      this.tabContainer = new StackContainer({ region: 'center', id: this.id + '_TabContainer' });
      var tabController = new TabController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      var chartContainer1 = new VariantChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_chartContainer1',
        title: 'By Country Chart',
        state: lang.mixin({}, {
          groupBy: 'country'
        }),
        apiServer: this.apiServer
      });

      var chartContainer2 = new VariantChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_chartContainer2',
        title: 'By Lineage Chart',
        state: lang.mixin({}, {
          groupBy: 'lineage'
        }),
        apiServer: this.apiServer
      });

      // for data grid
      this.VariantGridContainer = new VariantGridContainer({
        title: 'Table',
        content: 'Variant Lineage Table',
        visible: true,
        state: this.state,
        tgtate: this.tgState
      });

      this.addChild(tabController);
      this.tabContainer.addChild(this.VariantGridContainer);
      this.tabContainer.addChild(chartContainer1);
      this.tabContainer.addChild(chartContainer2);
      this.addChild(this.tabContainer);

      Topic.subscribe(this.id + '_TabContainer-selectChild', lang.hitch(this, function (page) {
        if (page.title == 'Table') {
          page.set('state', this.state);
        }
        page.set('visible', true);
      }));
    }
  });
});
