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

    calledConfirmationPopup: false,
    /*
    setCurrentData: function (data) {
      this.currentData = data;
    },

    constructor: function (options) {
      this.dialog = new Dialog({});
      console.log('heatmap options',options);
      this.topicId = options.topicId;
      // subscribe
      Topic.subscribe(this.topicId, lang.hitch(this, function () {
        var key = arguments[0],
          value = arguments[1];
        console.log('key, ', key, ': value, ', value);

        switch (key) {
          case 'updatePfState':
            this.pfState = value;
            this.hmapUpdate();
            break;
          case 'refreshHeatmap':
            this.hmapUpdate();
            console.log('heatmap Refresh pfState: ', this.pfState);
            Topic.publish(this.topicId, 'requestHeatmapData', this.pfState);
            break;
          case 'updateHeatmapData':
            this.currentData = value;
            this.hmapUpdate();
            Topic.publish(this.topicId, 'hideLoadingMask');
            break;
          default:
            break;
        }
      }));
    },

    update: function () {
      console.log('pfstate = ', this.pfstate);
      Topic.publish(this.topicId, 'refreshHeatmap');
    }
    */

    createConfirmationPopup: function (label) {
      if (!this.calledConfirmationPopup) {
        this.calledConfirmationPopup = true;
        var _self = this;
        new Confirmation({
          title: 'No results',
          content: '<div>No ' + label + ' found.</div><br>',
          cancelLabel: null,
          onCancel: function () { _self.calledConfirmationPopup = false; this.hideAndDestroy(); },
          onConfirm: function () { _self.calledConfirmationPopup = false; this.hideAndDestroy(); }
        }).show();
      }
      return null;
    },

    formatData: function (data) {
      if (!data) return;

      if (data.columns.length == 0)  {
        return this.createConfirmationPopup(data.colLabel);
      }

      if (data.rows.length == 0) {
        return this.createConfirmationPopup(data.rowLabel);
      }

      var rows = data.rows.map(function (r) {
        return {
          name: r.meta.useGroupName ? r.meta.groupLabel : r.meta.nameLabel,
          id: r.rowID,
          meta: r.meta
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
      for (var i = 0; i < vals[0].length; i++) {
        var row = [];
        for (var j = 0; j < vals.length; j++) {
          row.push(vals[j][i]);
        }
        matrix.push(row);
      }
      return { cols: cols, rows: rows, matrix: matrix };
    }

  });
});
