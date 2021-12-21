define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/request', 'dojo/when',
  'dijit/layout/ContentPane',
  './Base', '../../util/PathJoin', '../BiosetResultContainer'
], function (
  declare, lang,
  domConstruct, request, when,
  ContentPane,
  ViewerBase, PathJoin, BiosetResultContainer
) {
  return declare([ViewerBase], {
    disabled: false,
    query: null,
    containerType: '',
    perspectiveLabel: 'Bioset Result',
    perspectiveIconClass: 'icon-selection-Experiment',
    apiServiceUrl: window.App.dataAPI,

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      this.viewer.set('visible', true);

      this.buildHeaderContent(state);
      window.document.title = 'Bioset Results';
    },

    buildHeaderContent: function (state) {

      // be strict to single public experiment to display further header info.
      var check = state.search.match(/^eq\(exp_id,\((.*)\)\)/);
      if (check && !isNaN(check[1])) {
        var eid = check[1];
        var self = this;
        when(request.get(PathJoin(this.apiServiceUrl, 'experiment', eid), {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded'
          },
          handleAs: 'json'
        }), function (exp) {

          self.queryNode.innerHTML = '<b>' + exp.exp_title + '</b>';
          self.totalCountNode.innerHTML = ' ( ' + exp.biosets + ' Biosets )';
        });
      }
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.viewer = new BiosetResultContainer({
        region: 'center',
        id: this.id + '_BiosetResult',
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
