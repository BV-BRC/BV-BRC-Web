define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/request', 'dojo/when',
  'dijit/layout/ContentPane',
  './Base', '../../util/PathJoin', '../TranscriptomicsGeneContainer'
], function (
  declare, lang,
  domConstruct, request, when,
  ContentPane,
  ViewerBase, PathJoin, TranscriptomicsGeneContainer
) {
  return declare([ViewerBase], {
    disabled: false,
    query: null,
    containerType: 'transcriptomics_experiment',
    perspectiveLabel: 'Transcriptomics Genes',
    perspectiveIconClass: 'icon-selection-Experiment',
    apiServiceUrl: window.App.dataAPI,

    onSetState: function (attr, oldVal, state) {
      // console.warn("TE onSetState", state);

      if (!state) {
        return;
      }

      this.viewer.set('visible', true);

      this.buildHeaderContent(state);
      window.document.title = 'Transcriptomics Genes';
    },

    buildHeaderContent: function (state) {

      // be strict to single public experiment to display further header info.
      var check = state.search.match(/^eq\(eid,\((.*)\)\)/);
      if (check && !isNaN(check[1])) {
        var eid = check[1];
        var self = this;
        // console.log("found eid", eid);
        return when(request.get(PathJoin(this.apiServiceUrl, 'transcriptomics_experiment', eid), {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
          },
          handleAs: 'json'
        }), function (exp) {

          self.queryNode.innerHTML = '<b>' + exp.title + '</b>';
          self.totalCountNode.innerHTML = ' ( ' + exp.samples + ' Comparisons )';
        });
      }
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.viewer = new TranscriptomicsGeneContainer({
        region: 'center',
        id: this.id + '_TranscriptomicsGene',
        state: this.state
      });

      this.viewerHeader = new ContentPane({
        content: '',
        region: 'top'
      });

      var headerContent = domConstruct.create('div', { 'class': 'PerspectiveHeader' });
      domConstruct.place(headerContent, this.viewerHeader.containerNode, 'last');
      domConstruct.create('i', { 'class': 'fa PerspectiveIcon ' + this.perspectiveIconClass }, headerContent);
      domConstruct.create('div', {
        'class': 'PerspectiveType',
        innerHTML: this.perspectiveLabel
      }, headerContent);
      this.queryNode = domConstruct.create('span', { 'class': 'PerspectiveQuery' }, headerContent);

      this.totalCountNode = domConstruct.create('span', {
        'class': 'PerspectiveTotalCount'
      }, headerContent);

      this.addChild(this.viewerHeader);
      this.addChild(this.viewer);
    }
  });
});
