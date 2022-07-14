define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/dom', 'dojo/query', 'dojo/when', 'dojo/request',
  'dijit/layout/ContentPane', 'dijit/layout/BorderContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup',
  'dijit/TitlePane', 'dijit/registry', 'dijit/form/Form', 'dijit/form/RadioButton', 'dijit/form/Select', 'dijit/form/Button',
  './ContainerActionBar', './SelectionToGroup', '../util/PathJoin', 'FileSaver',
  './HeatmapContainerNew', 'heatmap/dist/hotmap', 'dojo/dom-class', './Confirmation', './ProteinFamiliesHeatmapContainerNew'

], function (
  declare, lang,
  on, Topic, domConstruct, dom, Query, when, request,
  ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
  TitlePane, registry, Form, RadioButton, Select, Button,
  ContainerActionBar, SelectionToGroup, PathJoin, saveAs,
  HeatmapContainerOld, Hotmap, domClass, Confirmation, HeatmapContainerNew
) {

  return declare([HeatmapContainerNew], {

    /*
    cluster: function (param) {
      var p = param || { g: 2, e: 2, m: 'a' };

      var isTransposed = this.pfState.heatmapAxis === 'Transposed';
      var data = this.exportCurrentData(isTransposed);

      console.log('clustering data set size: ', data.length);
      if (data.length > 1500000) {
        new Dialog({
          title: 'Notice',
          content: 'The data set is too large to cluster. Please use filter panel to reduce the size',
          style: 'width: 300px'
        }).show();
        return;
      }

      Topic.publish(this.topicId, 'showLoadingMask');

      return when(window.App.api.data('cluster', [data, p]), lang.hitch(this, function (res) {
        // DO NOT TRANSPOSE. clustering process is based on the corrected axises
        this.pfState.clusterRowOrder = res.rows;
        this.pfState.clusterColumnOrder = res.columns;

        Topic.publish(this.topicId, 'updatePfState', this.pfState);
        Topic.publish(this.topicId, 'updateFilterGridOrder', res.rows);
        Topic.publish(this.topicId, 'updateMainGridOrder', res.columns);

        // re-draw heatmap
        Topic.publish(this.topicId, 'refreshHeatmap');
        debugger;
      }), function (err) {

        Topic.publish(this.topicId, 'hideLoadingMask');

        new Dialog({
          title: err.status || 'Error',
          content: err.text || err
        }).show();
      });
    },

    formatData: function (data) {
      if (!data) return;

      if (data.columns.length == 0)  {
        debugger;
        new Confirmation({
          title: 'No results',
          content: '<div>No ' + data.colLabel + ' found.</div><br>',
          cancelLabel: null,
          onCancel: function () { this.hideAndDestroy(); },
          onConfirm: function () { this.hideAndDestroy(); }
        }).show();
        return null;
      }

      if (data.rows.length == 0) {
        new Confirmation({
          title: 'No results',
          content: '<div>No ' + data.rowLabel + ' found.</div><br>',
          cancelLabel: null,
          onCancel: function () { this.hideAndDestroy(); },
          onConfirm: function () { this.hideAndDestroy(); }
        }).show();
        return null;
      }

      var rows = data.rows.map(function (r) {
        return {
          name: r.rowLabel,
          id: r.rowID
        };
      });
      var cols = data.columns.map(function (c) {
        return {
          name: c.colLabel,
          id: c.colID,
          distribution: c.distribution,
          meta: {
            id: c.colID
          }
        };
      });

      // get lists of vals for each column
      var vals = cols.map(function (c) {
        var hexStrs = c.distribution.match(/.{2}/g), // convert hex string to vals
          vals = hexStrs.map(function (hex) { return  parseInt(hex, 16); });

        delete c.distribution; // we no longer need the distribution
        return vals;
      });

      // make pass of all column val data (i times, where i = number of rows)
      var matrix = [];
      vals = vals.filter(x => { return x !== null });
      for (var i = 0; i < vals[0].length; i++) {
        var row = [];
        for (var j = 0; j < vals.length; j++) {
          if (!vals[j]) {
            debugger;
          }
          row.push(vals[j][i]);
        }
        matrix.push(row);
      }

      return { cols: cols, rows: rows, matrix: matrix };
    }
    */

  });
});
