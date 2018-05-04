define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dojo/dom-geometry', 'dojo/dom-style',
  'dojo/dom-class', 'dijit/_Templated', 'dojo/text!./templates/SummaryWidget.html',
  'dojo/request', 'dojo/_base/lang', 'dojox/charting/Chart2D', 'dojox/charting/themes/WatersEdge', 'dojox/charting/action2d/MoveSlice',
  'dojox/charting/action2d/Tooltip', 'dojo/dom-construct', '../util/PathJoin', 'dgrid/Grid',
  'dgrid/extensions/CompoundColumns'

], function (
  declare, WidgetBase, on, domGeometry, domStyle,
  domClass, Templated, Template,
  xhr, lang, Chart2D, Theme, MoveSlice,
  ChartTooltip, domConstruct, PathJoin, Grid, CompoundColumns
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'SummaryWidget',
    templateString: Template,
    dataModel: '',
    query: '',
    baseQuery: '',
    data: null,
    view: 'chart',
    apiServiceUrl: window.App.dataAPI,
    loading: false,
    gridOptions: {
      style: 'border: 0px;'
    },
    showChart: function () {
      this.set('view', 'chart');
      // console.log(this);
      if (this['class'] === 'pfSummaryWidget') {
        document.getElementsByClassName('proteinFeature')[0].style.display = 'block';
      }
      if (this['class'] === 'spgSummaryWidget') {
        document.getElementsByClassName('specialty')[0].style.display = 'block';
      }

    },
    showTable: function () {
      this.set('view', 'table');
      if (this['class'] === 'pfSummaryWidget') {
        document.getElementsByClassName('proteinFeature')[0].style.display = 'none';
      }
      if (this['class'] === 'spgSummaryWidget') {
        document.getElementsByClassName('specialty')[0].style.display = 'none';
      }
    },
    onSetView: function (attr, oldVal, view) {
      // console.log("onSetView ", view);
      if (oldVal) {
        domClass.remove(this.domNode, oldVal + 'View');
      }
      domClass.add(this.domNode, view + 'View');
      this['render_' + this.view]();
    },

    headers: {
      accept: 'application/solr+json',
      'content-type': 'application/rqlquery+x-www-form-urlencoded',
      'X-Requested-With': null,
      Authorization: (window.App.authorizationToken || '')
    },

    onSetQuery: function (attr, oldVal, query) {
      // console.log("SummaryWidget Query: ", this.query + this.baseQuery);
      return xhr.post(PathJoin(this.apiServiceUrl, this.dataModel) + '/', {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + this.baseQuery
      }).then(lang.hitch(this, 'processData'));
    },

    onSetData: function (attr, oldVal, data) {
      // hide loading
      if (data.length === 0) {
        this.loadingNode.innerHTML = 'No record found';
        return;
      }
      domClass.add(this.loadingNode, 'hidden');


      this['render_' + this.view]();
    },

    processData: function (data) {
      this.set('data', data);
    },

    render_chart: function () {
    },

    render_table: function () {
      if (!this.grid) {
        var opts = this.gridOptions || {};
        opts.columns = this.columns;
        var CompoundColumnGrid = declare([Grid, CompoundColumns]);
        this.grid = new CompoundColumnGrid(opts, this.tableNode);
        this.grid.startup();
      }
    },

    postCreate: function () {
      this.inherited(arguments);
      domClass.add(this.domNode, this.view + 'View');

      this.watch('view', lang.hitch(this, 'onSetView'));
      this.watch('query', lang.hitch(this, 'onSetQuery'));
      this.watch('data', lang.hitch(this, 'onSetData'));

      if (this.query && this.dataModel) {
        this.onSetQuery('query', this.query, this.query);
      }
    },

    resize: function (changeSize, resultSize) {
      var node = this.domNode;

      // set margin box size, unless it wasn't specified, in which case use current size
      if (changeSize) {

        domGeometry.setMarginBox(node, changeSize);
      }

      // If either height or width wasn't specified by the user, then query node for it.
      // But note that setting the margin box and then immediately querying dimensions may return
      // inaccurate results, so try not to depend on it.

      var mb = resultSize || {};
      lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
      if (!('h' in mb) || !('w' in mb)) {
        mb = lang.mixin(domGeometry.getMarginBox(node), mb);    // just use domGeometry.marginBox() to fill in missing values
      }

      // Compute and save the size of my border box and content box
      // (w/out calling domGeometry.getContentBox() since that may fail if size was recently set)
      var cs = domStyle.getComputedStyle(node);
      var me = domGeometry.getMarginExtents(node, cs);
      var be = domGeometry.getBorderExtents(node, cs);
      var bb = (this._borderBox = {
        w: mb.w - (me.w + be.w),
        h: mb.h - (me.h + be.h)
      });
      var pe = domGeometry.getPadExtents(node, cs);
      this._contentBox = {
        l: domStyle.toPixelValue(node, cs.paddingLeft),
        t: domStyle.toPixelValue(node, cs.paddingTop),
        w: bb.w - pe.w,
        h: bb.h - pe.h
      };

      var actionBarMB = domGeometry.getMarginBox(this.actionButtonsNode);

      domGeometry.setMarginBox(this.chartNode, { h: this._contentBox.h - actionBarMB.h });
      domGeometry.setMarginBox(this.tableNode, { h: this._contentBox.h - actionBarMB.h });
      // this._browser.resize();
    }
  });
});
