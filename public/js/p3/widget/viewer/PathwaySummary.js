define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/dom-construct', 'dojo/topic',
  'dijit/layout/ContentPane', 'dojox/widget/Standby',
  './Base', '../PathwaySummaryGridContainer'
], function (
  declare, lang, domConstruct, Topic,
  ContentPane, Standby,
  ViewerBase, GridContainer
) {
  return declare([ViewerBase], {
    disabled: false,
    query: null,
    apiServiceUrl: window.App.dataAPI,
    loadingMask: null,

    onSetState: function (attr, oldVal, state) {
      // console.log("PathwaySummary onSetState", state);

      if (!state) {
        return;
      }

      var params = {};
      var qparts = state.search.split('&');
      qparts.forEach(function (qp) {
        var parts = qp.split('=');
        params[parts[0]] = parts[1].split(',');
      });

      state.feature_ids = params.features;

      this.viewer.set('visible', true);
      this.viewer.set('state', lang.mixin({}, state));

      // update page title
      window.document.title = 'Pathway Summary';
    },

    constructor: function () {

      Topic.subscribe('PathwaySummary', lang.hitch(this, function () {
        // console.log("PathwaySummary:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateHeader':
            this.totalCountNode.innerHTML = lang.replace('Out of {summary.total} genes selected, {summary.found} genes found in {summary.pathways} pathways', { summary: value });
            break;
          case 'timeOut':
            this.totalCountNode.innerHTML = lang.replace('The query took too long or could not be loaded.');
            break;
          case 'showLoadingMask':
            this.loadingMask.show();
            break;
          case 'hideLoadingMask':
            this.loadingMask.hide();
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

      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      this.loadingMask.startup();

      this.inherited(arguments);

      this.viewer = new GridContainer({
        region: 'center',
        state: this.state
      });

      this.viewerHeader = new ContentPane({
        content: '',
        'class': 'breadcrumb',
        region: 'top'
      });
      var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader' });
      domConstruct.place(headerContent, this.viewerHeader.containerNode, 'last');
      domConstruct.create('i', { 'class': 'fa PerspectiveIcon icon-git-pull-request' }, headerContent);
      domConstruct.create('div', {
        'class': 'PerspectiveType',
        innerHTML: 'Pathway Summary'
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
