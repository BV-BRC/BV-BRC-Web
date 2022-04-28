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

  });
});