define([
  'dojo/_base/declare', './TabViewerBase',
  'dijit/layout/ContentPane',
  '../CorrelatedGenesContainer'
], function (
  declare, TabViewerBase,
  ContentPane,
  CorrelatedGenesContainer
) {
  return declare([TabViewerBase], {
    baseClass: 'FeatureGroup',
    disabled: false,
    query: null,
    containerType: 'spgene_data',
    patric_id: '',
    apiServiceUrl: window.App.dataAPI,

    _setFeature_idAttr: function (id) {

      if (!id) {
        return;
      }
      this.state = this.state || {};
      this.patric_id = id;
      this.state.patric_id = id;
    },

    onSetState: function (attr, oldVal, state) {
      // var parts = this.state.pathname.split("/");
      // this.set("feature_id", parts[parts.length - 1]);

      if (!state) {
        return;
      }

      if (state.hashParams && state.hashParams.view_tab) {

        if (this[state.hashParams.view_tab]) {
          var vt = this[state.hashParams.view_tab];
          vt.set('visible', true);
          this.viewer.selectChild(vt);
        } else {
          // console.log("No view-tab supplied in State Object");
        }
      }
    },

    buildHeaderContent: function (feature) {
      // TODO: implement
    },

    _setFeatureAttr: function (feature) {
      var state = this.state || {};

      state.feature = feature;

      // this.viewHeader.set("content", this.buildHeaderContent(feature));

      var active = (state && state.hashParams && state.hashParams.view_tab) ? state.hashParams.view_tab : 'overview';
      var activeTab = this[active];

      switch (active) {
        case 'overview':
        case 'correlatedGenes':
          activeTab.set('state', state);
          break;
        default:
          break;
      }

      this._set('feature', feature);

      this.resize();
    },

    createOverviewPanel: function () {
      return new ContentPane({
        content: 'Overview',
        title: 'Overview',
        id: this.viewer.id + '_overview',
        state: this.state
      });
    },
    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.overview = this.createOverviewPanel();
      this.genomeBrowser = new ContentPane({
        title: 'Genome Browser',
        id: this.viewer.id + '_genomeBrowser',
        content: 'Genome Browser'
      });

      this.transcriptomics = new ContentPane({
        title: 'Transcriptomics',
        id: this.viewer.id + '_transcriptomics',
        content: 'Transcriptomics'
      });
      this.correlatedGenes = new CorrelatedGenesContainer({
        title: 'Correlated Genes',
        id: this.viewer.id + '_correlatedGenes',
        content: 'Correlated Genes'
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.genomeBrowser);
      this.viewer.addChild(this.transcriptomics);
      this.viewer.addChild(this.correlatedGenes);
    }
  });
});
