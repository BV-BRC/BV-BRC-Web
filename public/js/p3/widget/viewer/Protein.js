define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/request',
  './TabViewerBase',
  '../FeatureOverview', '../GenomeBrowser', '../CompareRegionContainer',
  '../GeneExpressionContainer', '../CorrelatedGenesContainer', '../InteractionContainer', '../ProteinStructureGridContainer', '../ProteinFeaturesGridContainer',
  '../../util/PathJoin'

], function (
  declare, lang,
  xhr,
  TabViewerBase,
  FeatureOverview, GenomeBrowser, CompareRegionContainer,
  GeneExpressionContainer, CorrelatedGenesContainer, InteractionContainer, ProteinStructureGridContainer, ProteinFeaturesGridContainer,
  PathJoin
) {

  return declare([TabViewerBase], {
    baseClass: 'FeatureGroup',
    disabled: false,
    containerType: 'feature_group',
    feature_id: '',
    context: 'bacteria',
    perspectiveLabel: 'Feature View',
    perspectiveIconClass: 'icon-selection-Feature',

    _setFeature_idAttr: function (id) {

      if (!id) {
        return;
      }

      if (this.feature_id == id) {
        return;
      }

      this.state = this.state || {};
      this.feature_id = id;
      this.state.feature_id = id;

      if (id.match(/^fig/)) {
        id = id.replace(/\|/g, '%7C');
        // console.log("fig id = ", id);
        id = '?eq(patric_id,' + id + ')&limit(1)';
      }

      // console.log("Get Feature: ", id);
      xhr.get(PathJoin(this.apiServiceUrl, 'genome_feature', id), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (feature) {
        if (feature instanceof Array) {
          // this.set("feature", feature[0])
          this.redirectToPATRICFeature(feature[0]);
        } else {
          // this.set("feature", feature)
          this.redirectToPATRICFeature(feature);
        }
      }));
    },

    setActivePanelState: function () {
      var activeQueryState;
      if (!this._started) {
        console.log('Feature Viewer not started');
        return;
      }

      if (this.state.feature_id) {
        activeQueryState = lang.mixin({}, this.state, { search: 'eq(feature_id,' + this.state.feature_id + ')' });
      }
      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      var activeTab = this[active];

      switch (active) {
        case 'overview':
        case 'correlatedGenes':
          if (this.state && this.state.feature) {
            activeTab.set('state', lang.mixin({}, this.state));
          }
          break;
        case 'interactions':
          if (this.state && this.state.feature) {
            activeTab.set('state', lang.mixin({}, this.state, {
              search: 'secondDegreeInteraction(' + this.state.feature.feature_id + ')'
            }));
          }
          break;
        default:
          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          }
          break;
      }

      if (this.feature) {
        var label = (this.feature.patric_id) ? this.feature.patric_id : (this.feature.refseq_locus_tag) ? this.feature.refseq_locus_tag : (this.feature.protein_id) ? this.feature.protein_id : this.feature.feature_id;
        var pageTitle = label + '::Feature ' + activeTab.title;
        // console.log("Feature setActivePanelState: ", pageTitle);
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },

    onSetState: function (attr, oldState, state) {
      var parts = this.state.pathname.split('/');
      this.set('feature_id', parts[parts.length - 1]);
      state.feature_id = parts[parts.length - 1];

      if (state && state.feature_id && !state.feature) {
        if (oldState && oldState.feature_id) {
          if ((state.feature_id == oldState.feature_id)) {
            if (oldState.feature || this.feature) {
              this.state.feature = state.feature = oldState.feature || this.feature;
            } else {
              console.log('oldState missing Featture');
            }
          }
        }
      }

      this.setActivePanelState();
      if (state.hashParams && state.hashParams.view_tab) {

        if (this[state.hashParams.view_tab]) {
          var vt = this[state.hashParams.view_tab];
          vt.set('visible', true);
          this.viewer.selectChild(vt);
        } else {
          console.log('No view-tab supplied in State Object');
        }
      }

      this.setActivePanelState();
    },

    buildHeaderContent: function (feature) {

      xhr.get(PathJoin(this.apiServiceUrl, 'taxonomy', feature.taxon_id), {
        headers: {
          accept: 'application/json'
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (taxon) {
        var taxon_lineage_names = taxon.lineage_names;
        var taxon_lineage_ids = taxon.lineage_ids;
        var taxon_lineage_ranks = taxon.lineage_ranks;

        var visibleRanks = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
        var visibleIndexes = taxon_lineage_ranks.filter(function (rank) {
          return visibleRanks.indexOf(rank) > -1;
        }).map(function (rank) {
          return taxon_lineage_ranks.indexOf(rank);
        });

        var out = visibleIndexes.map(function (idx) {
          return '<a class="navigationLink" href="/view/Taxonomy/' + taxon_lineage_ids[idx] + '">' + taxon_lineage_names[idx] + '</a>';
        });
        this.queryNode.innerHTML = out.join(' &raquo; ') + ' &raquo; ' + lang.replace('<a href="/view/Genome/{feature.genome_id}">{feature.genome_name}</a>', { feature: feature });

/*
        if (taxon_lineage_names.includes('Viruses') && this.context === 'bacteria') {
          this.set('context', 'virus')
          this.changeToVirusContext();
        }
	*/
      }));

      var content = [];
      if (Object.prototype.hasOwnProperty.call(feature, 'patric_id')) {
        content.push(feature.patric_id);
      }
      if (Object.prototype.hasOwnProperty.call(feature, 'refseq_locus_tag')) {
        content.push(feature.refseq_locus_tag);
      }
      if (Object.prototype.hasOwnProperty.call(feature, 'gene')) {
        content.push(feature.gene);
      }
      if (Object.prototype.hasOwnProperty.call(feature, 'product')) {
        content.push(feature.product);
      }

      this.totalCountNode.innerHTML = '<br/>' + content.map(function (d) {
        return '<span><b>' + d + '</b></span>';
      }).join(' <span class="pipe">|</span> ');
    },

    redirectToPATRICFeature: function (feature) {

      if (feature.annotation === 'PATRIC') {
        this.set('feature', feature);
      } else {
        if (Object.prototype.hasOwnProperty.call(feature, 'sequence_id')
            && Object.prototype.hasOwnProperty.call(feature, 'end')
            && Object.prototype.hasOwnProperty.call(feature, 'strand')) {
          xhr.get(PathJoin(this.apiServiceUrl, '/genome_feature/?and(eq(annotation,PATRIC),eq(sequence_id,' + feature.sequence_id + '),eq(end,' + feature.end + '),eq(strand,' + encodeURIComponent('"' + feature.strand + '"') + '))'), {
            headers: {
              accept: 'application/json',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          }).then(lang.hitch(this, function (features) {
            if (features.length === 0) {
              // no PATRIC feature found
              this.set('feature', feature);
            } else {
              this.set('feature', features[0]);
            }
          }));
        } else {
          this.set('feature', feature);
        }
      }
    },

    changeToVirusContext: function () {
      this.viewer.removeChild(this.compareRegionViewer);
      this.viewer.removeChild(this.transcriptomics);
      this.viewer.removeChild(this.interactions);
    },

    _setFeatureAttr: function (feature) {

      this.feature = this.state.feature = feature;

      this.buildHeaderContent(feature);

      this.setActivePanelState();
      this.resize();
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.overview = new FeatureOverview({
        content: 'Overview',
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });

      this.genomeBrowser = new GenomeBrowser({
        title: 'Genome Browser',
        id: this.viewer.id + '_genomeBrowser',
        content: 'Genome Browser',
        tooltip: 'The "Browser" tab shows genome sequence and genomic features using linear genome browser',
        state: lang.mixin({}, this.state)
      });

      this.compareRegionViewer = new CompareRegionContainer({
        title: 'Compare Region Viewer',
        style: 'overflow-y:auto',
        id: this.viewer.id + '_compareRegionViewer'
      });

      // TODO: implement pathways tab

      this.transcriptomics = new GeneExpressionContainer({
        title: 'Transcriptomics',
        id: this.viewer.id + '_transcriptomics'
      });

      // this.correlatedGenes = new CorrelatedGenesContainer({
      //   title: 'Correlated Genes',
      //   id: this.viewer.id + '_correlatedGenes'
      // });

      this.interactions = new InteractionContainer({
        title: 'Interactions',
        id: this.viewer.id + '_interactions'
      });

      this.structures = new ProteinStructureGridContainer({
        title: 'Protein Structures',
        id: this.viewer.id + '_structures'
      });

      this.proteinFeatures = new ProteinFeaturesGridContainer({
        title: 'Domain and Motifs',
        id: this.viewer.id + '_proteinFeatures'
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.genomeBrowser);
      this.viewer.addChild(this.compareRegionViewer);
      this.viewer.addChild(this.transcriptomics);
      // this.viewer.addChild(this.correlatedGenes);
      this.viewer.addChild(this.interactions);
      this.viewer.addChild(this.proteinFeatures)
      this.viewer.addChild(this.structures);
    }
  });
});
