define([
  'dojo/_base/declare', './TabViewerBase', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../PageGrid', '../formatter', '../SpecialtyGeneGridContainer',
  '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang', '../DataItemFormatter', 'dgrid/Grid', 'dgrid/extensions/ColumnResizer'
], function (
  declare, TabViewerBase, on,
  domClass, ContentPane, domConstruct,
  PageGrid, formatter, SpecialtyGeneGridContainer,
  PathJoin, xhr, lang, DataItemFormatter, Grid, ColumnResizer
) {
  return declare([TabViewerBase], {
    baseClass: 'SpecialtyGeneEvidence',
    disabled: false,
    containerType: 'sp_gene_evidence',
    query: null,
    evidence: null,
    reference: null,
    source_id: null,
    apiServiceUrl: window.App.dataAPI,
    perspectiveLabel: 'Specialty Gene Evidence View',
    perspectiveIconClass: 'icon-selection-VirulenceFactor',
    // defaultTab: "Overview",

    _setStateAttr: function (state) {
      this.state = this.state || {};
      var parts = state.pathname.split('/');
      this.set('source_id', parts[parts.length - 1]);
      state.source_id = parts[parts.length - 1];
      this.source_id = state.source_id;
      if (state.evidence) {
        this.set('evidence', state.evidence);
      }
      this._set('state', state);
    },

    _setEvidenceAttr: function (id) {
      // console.log('id: ', id);
      // if (!id) {
      //   return;
      // }

      // if (this.source_id == id) {

      // }
    },

    onSetState: function (attr, oldVal, state) {
      // console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);

      var parts = state.pathname.split('/');
      this.set('source_id', parts[parts.length - 1]);
      state.source_id = parts[parts.length - 1];
      if (!state) {
        return;
      }

      if (state && state.source_id && !state.evidence) {
        state.evidence = this.evidence;
      }

      if (state.hashParams && state.hashParams.view_tab) {
        // console.log("state.hashParams.view_tab=", state.hashParams.view_tab);

        if (this[state.hashParams.view_tab]) {
          var vt = this[state.hashParams.view_tab];
          vt.set('visible', true);
          this.viewer.selectChild(vt);
        } else {
          console.log('No view-tab supplied in State Object');
        }
      }
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      var feature_query = '?and(eq(source_id,' + this.source_id + '),eq(source,PATRIC_VF))&limit(1)';
      xhr.get(PathJoin(this.apiServiceUrl, 'sp_gene', feature_query), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (feature) {
        // console.log("feature result ", feature);
        if (feature && feature.length == 0) {
          this.totalCountNode.innerHTML = 'Specialty Genes > ' + this.source_id + '</a>';
          var messagePane = new ContentPane({
            title: 'Result',
            region: 'top',
            content: '<p>No PATRIC curation data found</p>'
          });
          this.viewer.addChild(messagePane);
          return;
        }
        var feature_id = feature[0].feature_id;
        var spgenelink = '<a href="/view/SpecialtyGeneList/?keyword(*)#view_tab=specialtyGenes&filter=false">Specialty Genes</a>';
        var vflink = '<a href="/view/SpecialtyGeneList/?keyword(*)#view_tab=specialtyGenes&filter=eq(property,%22Virulence%20Factor%22)">Virulence Factors</a>';
        // var patricVFlink = '<a href="/view/SpecialtyGeneList/?keyword(*)#view_tab=specialtyGenes&filter=and(eq(property,%22Virulence%20Factor%22),eq(source,%22PATRIC_VF%22),eq(evidence,%22Literature%22))">PATRIC_VF</a>';
        var patricVFlink = '<a href="/view/SpecialtyVFGeneList/?keyword(*)&eq(source,%22PATRIC_VF%22)#view_tab=specialtyVFGenes&filter=false">PATRIC_VF</a>';
        var genelink = '<a title="View feature page" href="/view/Feature/' + feature_id + '" >' + this.source_id + '</a>';

        // this.totalCountNode.innerHTML = spgenelink + " > " + vflink + " > " + patricVFlink + " > " + genelink;
        var q = '?and(eq(source_id,' + this.source_id + '),eq(source,PATRIC_VF))&limit(25000)';
        // var q = "?and(eq(source_id,"+"Rv3375"+ "),eq(source,PATRIC_VF))";

        // console.log("query evidence, q=", q);
        xhr.get(PathJoin(this.apiServiceUrl, 'sp_gene_ref', q), {
          headers: {
            accept: 'application/json',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          handleAs: 'json'
        }).then(lang.hitch(this, function (reference) {
          // console.log("reference result ", reference);
          this.set('reference', reference);
          this.state.reference = reference;
          if (reference && reference.length == 0) {
            var messagePane = new ContentPane({
              title: 'Result',
              region: 'top',
              content: '<p>No PATRIC curation data found</p>'
            });
            this.viewer.addChild(messagePane);
            this.totalCountNode.innerHTML = 'Specialty Genes > <a title="View feature page" href="/view/Feature/' + feature_id + '" >' + this.source_id + '</a>';
            return;
          }
          var node = domConstruct.create('div', { style: 'width: 50%' }, this.viewer.containerNode);
          domConstruct.place(DataItemFormatter(reference[0], 'spgene_ref_data', { mini: true }), node, 'first');

          // retrieve homologs
          xhr.get(PathJoin(this.apiServiceUrl, 'sp_gene', q), {
            headers: {
              accept: 'application/json',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          }).then(lang.hitch(this, function (homolog) {
            // console.log("homolog result ", homolog);

            domConstruct.create('hr', { style: 'width: 100%' }, this.viewer.containerNode);
            var featureOverview = '<a href="/view/Feature/' + feature_id + '#view_tab=overview">Feature_Overview</a>';
            var featureBrowser = '<a href="/view/Feature/' + feature_id + '#view_tab=genomeBrowser">Genome_Browser</a>';
            var featureTranscriptomics = '<a href="/view/Feature/' + feature_id + '#view_tab=transcriptomics">Transcriptomics</a>';
            var featureCogene = '<a href="/view/Feature/' + feature_id + '#view_tab=correlatedGenes">Correlated_Genes</a>';
            var featurelinks = featureOverview + '&nbsp;&nbsp;' + featureBrowser + '&nbsp;&nbsp;' + featureTranscriptomics + '&nbsp;&nbsp;' + featureCogene;
            domConstruct.create('div', {
              style: 'margin-left: 10px',
              innerHTML: '<p><b>View this feature in: </b>&nbsp;&nbsp;' + featurelinks + '</p>'
            }, this.viewer.containerNode);

            var count = homolog.length;
            domConstruct.create('hr', { style: 'width: 100%' }, this.viewer.containerNode);
            var link = '<a title="View homologs" href="/view/SpecialtyGeneList/?keyword(*)#view_tab=specialtyGenes&filter=and(eq(source,PATRIC_VF),eq(source_id,' + this.source_id + '))" >' + count + '</a>';
            domConstruct.create('div', {
              style: 'margin-left: 10px',
              innerHTML: '<p><b>Homologs: </b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + link + '</p>'
            }, this.viewer.containerNode);

            // console.log("query evidence, q=", q);
            xhr.get(PathJoin(this.apiServiceUrl, 'sp_gene_evidence', q), {
              headers: {
                accept: 'application/json',
                'X-Requested-With': null,
                Authorization: (window.App.authorizationToken || '')
              },
              handleAs: 'json'
            }).then(lang.hitch(this, function (evidence) {
              // console.log("evidence result ", evidence);
              this.totalCountNode.innerHTML = spgenelink + ' > ' + vflink + ' > ' + patricVFlink + ' > ' + genelink;
              domConstruct.create('hr', { style: 'width: 100%' }, this.viewer.containerNode);
              domConstruct.create('div', {
                style: 'margin-left: 10px',
                innerHTML: '<p><b>Evidence:</b></p></br>'
              }, this.viewer.containerNode);
              domConstruct.create('div', {
                id: 'evid',
                style: 'margin-left: 10px; margin-right: 10px;'
              }, this.viewer.containerNode);
              var grid = new Grid({
                columns: {
                  specific_organism: 'Organism',
                  specific_host: 'Host',
                  classification: 'Classification',
                  pmid: 'PubMed',
                  assertion: 'Assertion'
                }
              }, 'evid');
              grid.renderArray(evidence);
              grid.resize();

              this.set('evidence', evidence);
              // console.log('Experiment : ', experiment);
              this.state.evidence = evidence;
              this.setActivePanelState();
            }));
          }));

        }));
      }));

    }
  });
});
