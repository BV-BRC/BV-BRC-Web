define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController',
  './VariantGridContainer', './VariantByCountryChartContainer', './VariantByLineageChartContainer'
], function (
  declare, lang, on, Topic,
  BorderContainer, StackContainer, TabController,
  VariantGridContainer, VariantByCountryChartContainer, VariantByLineageChartContainer
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

      var chartContainer1 = new VariantByCountryChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_chartContainer1',
        title: 'Chart By Country',
        apiServer: this.apiServer
      });

      var chartContainer2 = new VariantByLineageChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_chartContainer2',
        title: 'Chart By Variant',
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
