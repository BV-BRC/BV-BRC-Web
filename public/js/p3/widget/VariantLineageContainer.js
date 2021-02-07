define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/request', 'dojo/when', 'dojo/_base/Deferred',
  'dijit/layout/BorderContainer', 'dijit/layout/StackContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select',
  './VariantLineageGridContainer', './VariantLineageChartContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup'
], function (
  declare, lang, on, Topic, domConstruct, xhr, when, Deferred,
  BorderContainer, StackContainer, TabController, ContentPane,
  TextBox, Button, Select,
  VariantLineageGridContainer, VariantLineageChartContainer, TooltipDialog, Dialog, popup
) {

  return declare([BorderContainer], {
    id: 'VariantLineageContainer',
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

      if (this.VariantLineageGridContainer) {
        this.VariantLineageGridContainer.set('state', state);
      }
      // if (this.VariantLineageChartContainer) {
      //   this.VariantLineageChartContainer.set('state', state);
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
      // sub tabs
      this._buildPanels();

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.inherited(arguments);
      this._firstView = true;
    },
    _buildPanels: function () {
      var self = this;
      this.tabContainer = new StackContainer({ region: 'center', id: this.id + '_TabContainer' });
      var tabController = new TabController({
        containerId: this.id + '_TabContainer',
        region: 'top',
        'class': 'TextTabButtons'
      });

      // for charts
      var chartContainer1 = new VariantLineageChartContainer({
        region: 'leading',
        style: 'height: 500px; width: 500px;',
        doLayout: false,
        id: this.id + '_chartContainer1',
        title: 'By Country Chart',
        content: 'LoC By Country Chart',
        state: this.state,
        tgtate: this.tgState,
        apiServer: this.apiServer
      });

      var chartContainer2 = new VariantLineageChartContainer({
        region: 'leading',
        style: 'height: 500px; width: 500px;',
        doLayout: false,
        id: self.id + '_chartContainer2',
        title: 'By Lineage Chart',
        content: 'LoC By Country Chart',
        state: self.state,
        tgtate: self.tgState,
        apiServer: self.apiServer
      });

      // for data grid
      self.VariantLineageGridContainer = new VariantLineageGridContainer({
        title: 'Table',
        content: 'Variant Lineage Table',
        visible: true,
        state: this.state,
        tgtate: this.tgState
      });

      self.addChild(tabController);
      self.tabContainer.addChild(self.VariantLineageGridContainer);
      self.tabContainer.addChild(chartContainer1);
      self.tabContainer.addChild(chartContainer2);
      self.addChild(self.tabContainer);

      Topic.subscribe(self.id + '_TabContainer-selectChild', lang.hitch(self, function (page) {
        page.set('state', self.state);
        page.set('visible', true);
      }));
    }
  });
});
