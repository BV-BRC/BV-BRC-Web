define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic', 'dojo/dom-construct', 'dojo/dom', 'dojo/query', 'dojo/when', 'dojo/request',
  'dijit/layout/ContentPane', 'dijit/layout/BorderContainer', 'dijit/TooltipDialog', 'dijit/Dialog', 'dijit/popup',
  'dijit/TitlePane', 'dijit/form/Select', 'dijit/form/Button',
  './ContainerActionBar', '../util/PathJoin', './PathwayMapGrid', './PathwayMapKegg'
], function (
  declare, lang,
  on, Topic, domConstruct, dom, Query, when, request,
  ContentPane, BorderContainer, TooltipDialog, Dialog, popup,
  TitlePane, Select, Button,
  ContainerActionBar, PathJoin, EcGrid, PathwayMapKeggContainer
) {
  return declare([BorderContainer], {
    gutters: false,
    visible: false,
    state: null,
    _setVisibleAttr: function (visible) {
      this.visible = visible;

      if (this.visible && !this._firstView) {
        this.onFirstView();
      }

      if (this.ecTable) {
        this.ecTable.set('visible', true);
      }
      if (this.mapContainer) {
        this.mapContainer.set('visible', true);
      }
    },
    onFirstView: function () {
      if (this._firstView) {
        return;
      }

      this.ecTableContainer = new ContentPane({
        region: 'left',
        content: '',
        style: 'width: 380px'
      });
      this.ecTable = new EcGrid({
        state: this.state
      });
      this.ecTableContainer.addChild(this.ecTable);

      this.mapContainer = new PathwayMapKeggContainer({
        state: this.state,
        apiServer: this.apiServer
      });

      this.addChild(this.ecTableContainer);
      this.addChild(this.mapContainer);

      this.inherited(arguments);
      this._firstView = true;
    }
  });
});
