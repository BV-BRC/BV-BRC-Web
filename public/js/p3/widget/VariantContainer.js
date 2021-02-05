define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/request', 'dojo/when', 'dojo/_base/Deferred',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select',
  './VariantGridContainer', './VariantChartContainer'
], function (
  declare, lang, on, Topic, domConstruct, xhr, when, Deferred,
  BorderContainer, StackContainer, TabController, ContentPane,
  TextBox, Button, Select,
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
      this._buildPanels(state);

      if (this.VariantGridContainer) {
        this.VariantGridContainer.set('state', state);
      }
      // if (this.VariantChartContainer) {
      //   this.VariantChartContainer.set('state', state);
      // }
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

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.inherited(arguments);
      this._firstView = true;
    },
    _buildPanels: function (state) {
      var self = this;
      self.tabContainer = new StackContainer({ region: 'center', id: self.id + '_TabContainer' });
      var tabController = new TabController({
        containerId: self.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      var chartContainer1 = new VariantChartContainer({
        region: 'leading',
        style: 'height: 500px; width: 500px;',
        doLayout: false,
        id: self.id + '_chartContainer1',
        title: 'By Country Chart',
        content: 'Variant Chart',
        state: self.state,
        tgtate: self.tgState,
        apiServer: self.apiServer
      });

      // var chartContainer2 = new VariantChartContainer({
      //   region: 'leading',
      //   style: 'height: 500px; width: 500px;',
      //   doLayout: false,
      //   id: self.id + '_chartContainer2',
      //   title: 'By Lineage Chart',
      //   content: 'Variant Chart',
      //   state: self.state,
      //   tgtate: self.tgState,
      //   apiServer: self.apiServer
      // });

      // for data grid
      self.VariantGridContainer = new VariantGridContainer({
        title: 'Table',
        content: 'Variant Lineage Table',
        visible: true,
        state: self.state,
        tgtate: self.tgState
      });

      self.addChild(tabController);
      self.tabContainer.addChild(self.VariantGridContainer);
      self.tabContainer.addChild(chartContainer1);
      // self.tabContainer.addChild(chartContainer2);
      self.addChild(self.tabContainer);

      Topic.subscribe(self.id + '_TabContainer-selectChild', lang.hitch(self, function (page) {
        page.set('state', self.state);
        page.set('visible', true);
      }));
    }
  });
});
