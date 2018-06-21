define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct', 'dojo/topic',
  'dijit/layout/ContentPane',
  './Base', '../IDMappingGridContainer'
], function (
  declare, lang, domConstruct, Topic,
  ContentPane,
  ViewerBase, GridContainer
) {
  return declare([ViewerBase], {
    disabled: false,
    query: null,
    apiServiceUrl: window.App.dataAPI,

    onSetState: function (attr, oldVal, state) {
      // console.log("IDMapping onSetState", state);

      if (!state) {
        return;
      }

      var parts = state.pathname.split('/');
      var params = parts[parts.length - 1];

      params.split('&').forEach(function (p) {
        var kv = p.split('=');
        if (kv[1]) {
          state[kv[0]] = kv[1];
        }
      });
      // console.log("onSetState: ", this.state);
      if (!state.fromIdValue) return;

      this.viewer.set('visible', true);
      this.viewer.set('state', state);
    },

    constructor: function () {
      Topic.subscribe('IDMapping', lang.hitch(this, function () {
        var key = arguments[0];
        var summary = { total: 0, found: 0, mapped: 0 };
        if (arguments.length > 1) {
          summary = arguments[1];
        }
        switch (key) {
          case 'updateHeader':
            // this.totalCountNode.innerHTML = lang.replace('Out of {summary.total} features selected, {summary.found} found in {summary.type}', {summary: value});
            this.totalCountNode.innerHTML =
            'Of the ' + summary.total +
            ' source IDs, ' + summary.mapped + ' mapped to ' +
            summary.found + ' target IDs';
            break;
          default:
            break;
        }
      }));
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.viewer = new GridContainer({
        region: 'center',
        state: this.state
      });

      this.viewerHeader = new ContentPane({
        content: '', // [placeholder for IDMapping summary: xxx feature found etc]",
        'class': 'breadcrumb',
        region: 'top'
      });

      var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader' });
      domConstruct.place(headerContent, this.viewerHeader.containerNode, 'last');
      domConstruct.create('i', { 'class': 'fa PerspectiveIcon icon-selection-FeatureList' }, headerContent);
      domConstruct.create('div', {
        'class': 'PerspectiveType',
        innerHTML: 'ID MAPPING'
      }, headerContent);

      this.queryNode = domConstruct.create('span', { 'class': 'PerspectiveQuery' }, headerContent);
      this.totalCountNode = domConstruct.create('span', {
        'class': 'PerspectiveTotalCount',
        innerHTML: '( loading... )'
      }, headerContent);

      this.addChild(this.viewerHeader);
      this.addChild(this.viewer);
    }
  });
});
