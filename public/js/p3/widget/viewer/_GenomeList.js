define([
  'dojo/_base/declare', './TabViewerBase', 'dojo/on', 'dojo/_base/lang', 'dojo/request',
  'dijit/layout/ContentPane', 'dojo/topic',
  '../FeatureGridContainer', '../ProteinGridContainer', '../ProteinStructureGridContainer', '../SpecialtyGeneGridContainer', '../ProteinFeaturesGridContainer',
  '../PathwayGridContainer',
  '../ExperimentsContainer', '../InteractionContainer', '../GenomeGridContainer',
  '../AMRPanelGridContainer', '../SubsystemGridContainer', '../SurveillanceGridContainer', '../SerologyGridContainer', '../SFVTGridContainer',
  '../SequenceGridContainer', '../StrainGridContainer', '../StrainGridContainer_Orthomyxoviridae', '../StrainGridContainer_Bunyavirales', '../EpitopeGridContainer', '../../util/PathJoin', '../../util/QueryToEnglish', 'dijit/Dialog'
], function (
  declare, TabViewerBase, on, lang, xhr,
  ContentPane, Topic,
  FeatureGridContainer, ProteinGridContainer, ProteinStructureGridContainer, SpecialtyGeneGridContainer, ProteinFeaturesGridContainer,
  PathwayGridContainer,
  ExperimentsContainer, InteractionsContainer, GenomeGridContainer,
  AMRPanelGridContainer, SubsystemGridContainer, SurveillanceGridContainer, SerologyGridContainer, SFVTGridContainer,
  SequenceGridContainer, StrainGridContainer, StrainGridContainer_Orthomyxoviridae, StrainGridContainer_Bunyavirales, EpitopeGridContainer, PathJoin, QueryToEnglish, Dialog
) {
  return declare([TabViewerBase], {
    totalGenomes: 0,
    perspectiveLabel: 'Genome List View',
    perspectiveIconClass: 'icon-selection-GenomeList',

    warningContent: 'Some tabs below have been disabled due to the number of genomes in your current view.  To enable them, on the "Genomes" Tab below, use the SHOW FILTERS button ( <i class="fa icon-filter fa-1x" style="color:#333"></i> ) or the keywords input box to filter Genomes. When you are satisfied, click APPLY ( <i class="fa icon-apply-perspective-filter fa-1x" style="color:#333"></i> ) to restablish the page context.',
    _setQueryAttr: function (query, force) {
      if (!query) {
        console.log('GENOME LIST SKIP EMPTY QUERY: ');
        return;
      }
      if (query && !force && (query == this.query) ) {
        return;
      }

      this._set('query', query);

      var _self = this;

      xhr.post(PathJoin(this.apiServiceUrl, 'genome'), {
        headers: {
          accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
        data: `${this.query}&select(genome_id)&limit(1)`
      }).then(function (res) {
        if (res && res.response && res.response.docs) {
          var genomes = res.response.docs;
          if (genomes) {
            _self._set('total_genomes', res.response.numFound);
          }
        } else {
          console.warn('Invalid Response for: ', _self.query);
        }
      }, function (err) {
        console.error('Error Retreiving Genomes: ', err);
      });

    },

    getReferenceAndRepresentativeGenomes: function (genomeCount) {
      var _self = this;

      xhr.post(PathJoin(this.apiServiceUrl, 'genome'), {
        headers: {
          accept: 'application/solr+json',
          'X-Requested-With': null,
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        data: `${this.query}&or(eq(reference_genome,Representative),eq(reference_genome,Reference))&select(genome_id,reference_genome)&limit(${genomeCount})`
      }).then(function (res) {
        if (res && res.response && res.response.docs) {
          var genomes = res.response.docs;
          _self._set('referenceGenomes', genomes);
        } else {
          console.warn(`Invalid Response for: ${_self.query}`);
        }
      }, function (err) {
        console.error('Error Retreiving Reference/Representative Genomes: ', err);
      });

    },

    onSetState: function (attr, oldVal, state) {
      this.inherited(arguments);
      if (!state.genome_ids) {
        if (state.search == oldVal.search) {
          this.set('state', lang.mixin({}, state, {
            genome_ids: oldVal.genome_ids,
            referenceGenomes: oldVal.referenceGenomes || []
          }));
          return;
        }
        this.set('query', state.search);

      } else if (state.search != oldVal.search) {
        this.set('query', state.search);
      }

      this.setActivePanelState();
    },

    onSetQuery: function (attr, oldVal, newVal) {

      var content = QueryToEnglish(newVal);
      this.overview.set('content', '<div style="margin:4px;"><span class="queryModel">Genomes: </span> ' + content + '</div>');
      this.queryNode.innerHTML = '<span class="queryModel">Genomes: </span>  ' + content;
    },

    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : this.defaultTab;

      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active);
        return;
      }
      switch (active) {
        case 'genomes':
          activeTab.set('state', lang.mixin({}, this.state, { hashParams: lang.mixin({}, this.state.hashParams) }));
          break;
        case 'interactions':
          if (this.state.genome_ids) {
            var genome_ids = this.state.genome_ids;
            var searchStr = (genome_ids.length > 0) ? 'or(in(genome_id_a,(' + genome_ids.join(',') + ')),in(genome_id_b,(' + genome_ids.join(',') + ')))' : 'eq(genome_id_a,NONE)';
            activeTab.set('state', lang.mixin({}, this.state, {
              search: searchStr
            }));
          }
          break;
        default:
          var activeQueryState;

          // special case for host genomes
          if ((active == 'features' || active == 'proteins') && this.state && this.state.genome_ids && !this.state.hashParams.filter) {
            var q = 'in(genome_id,(' + this.state.genome_ids.join(',') + '))&select(taxon_lineage_ids)&limit(' + this.state.genome_ids.length + ')';
            xhr.post(PathJoin(this.apiServiceUrl, 'genome'), {
              headers: {
                accept: 'application/json',
                'X-Requested-With': null,
                Authorization: (window.App.authorizationToken || '')
              },
              data: q,
              handleAs: 'json'
            }).then(lang.hitch(this, function (genome_data) {

              if (genome_data.some(function (el, idx, arr) {
                return el.taxon_lineage_ids.indexOf('2759') > -1;
              })) {

                activeQueryState = lang.mixin({}, this.state, {
                  search: 'in(genome_id,(' + this.state.genome_ids.join(',') + '))',
                  hashParams: lang.mixin({}, this.state.hashParams, {
                    filter: 'eq(feature_type,%22CDS%22)'
                  })
                });
              }

              activeTab.set('state', activeQueryState);
            }));
          }


          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          } else {
            console.warn('MISSING activeQueryState for PANEL: ' + active);
          }
          break;
      }

      if (activeTab) {
        var pageTitle = 'Genome List ' + activeTab.title;
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },

    onSetGenomeIds: function (attr, oldVal, genome_ids) {
      this.state.genome_ids = genome_ids;
      this.setActivePanelState();
    },

    onSetReferenceGenomes: function (attr, oldVal, referenceGenomes) {
      this.state.referenceGenomes = referenceGenomes;
      this.setActivePanelState();
    },

    createOverviewPanel: function () {
      // implement this
    },

    postCreate: function () {
      this.inherited(arguments);

      this.watch('query', lang.hitch(this, 'onSetQuery'));
      this.watch('genome_ids', lang.hitch(this, 'onSetGenomeIds'));
      this.watch('referenceGenomes', lang.hitch(this, 'onSetReferenceGenomes'));
      this.watch('total_genomes', lang.hitch(this, 'onSetTotalGenomes'));

      this.overview = this.createOverviewPanel();

      this.genomes = new GenomeGridContainer({
        title: 'Genomes',
        id: this.viewer.id + '_genomes',
        state: this.state,
        disable: false
      });
      this.strains = new StrainGridContainer({
        title: 'Strains',
        id: this.viewer.id + '_strains',
        state: this.state
      });
      this.strains_orthomyxoviridae = new StrainGridContainer_Orthomyxoviridae({
        title: 'Strains',
        id: this.viewer.id + '_strains_orthomyxoviridae',
        state: this.state
      });
      this.strains_bunyavirales = new StrainGridContainer_Bunyavirales({
        title: 'Strains',
        id: this.viewer.id + '_strains_bunyavirales',
        state: this.state
      });
      this.sequences = new SequenceGridContainer({
        title: 'Sequences',
        id: this.viewer.id + '_sequences',
        state: this.state,
        disable: false
      });
      this.amr = new AMRPanelGridContainer({
        title: 'AMR Phenotypes',
        id: this.viewer.id + '_amr'
      });
      this.features = new FeatureGridContainer({
        title: 'Features',
        id: this.viewer.id + '_features',
        disabled: false
      });
      this.proteins = new ProteinGridContainer({
        title: 'Proteins',
        id: this.viewer.id + '_proteins',
        disabled: false
      });
      this.structures = new ProteinStructureGridContainer({
        title: 'Protein Structures',
        id: this.viewer.id + '_structures',
        disabled: false
      });
      this.specialtyGenes = new SpecialtyGeneGridContainer({
        title: 'Specialty Genes',
        id: this.viewer.id + '_specialtyGenes',
        disabled: false,
        state: this.state
      });
      this.proteinFeatures = new ProteinFeaturesGridContainer({
        title: 'Domains and Motifs',
        id: this.viewer.id + '_proteinFeatures',
        disabled: false
      });
      this.pathways = new PathwayGridContainer({
        title: 'Pathways',
        id: this.viewer.id + '_pathways',
        disabled: false
      });
      this.subsystems = new SubsystemGridContainer({
        title: 'Subsystems',
        id: this.viewer.id + '_subsystems',
        disabled: false
      });
      this.experiments = new ExperimentsContainer({
        title: 'Experiments',
        id: this.viewer.id + '_experiments'
      });

      this.interactions = new InteractionsContainer({
        title: 'Interactions',
        id: this.viewer.id + '_interactions',
        state: this.state
      });

      this.surveillance = new SurveillanceGridContainer({
        title: 'Surveillance',
        id: this.viewer.id + '_surveillance',
        state: this.state
      });
      this.serology = new SerologyGridContainer({
        title: 'Serology',
        id: this.viewer.id + '_serology',
        state: this.state
      });
      this.epitope = new EpitopeGridContainer({
        title: 'Epitopes',
        id: this.viewer.id + '_epitope',
        state: this.state
      });

      this.sfvt = new SFVTGridContainer({
        title: 'Sequence Feature Variant Types',
        id: this.viewer.id + '_sfvt',
        state: this.state
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.genomes);
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.sequences);
      this.viewer.addChild(this.features);
      this.viewer.addChild(this.proteins);
      this.viewer.addChild(this.structures);
      this.viewer.addChild(this.specialtyGenes);
      this.viewer.addChild(this.proteinFeatures);
      this.viewer.addChild(this.epitope);
      this.viewer.addChild(this.pathways);
      this.viewer.addChild(this.subsystems);
      this.viewer.addChild(this.experiments);
      this.viewer.addChild(this.interactions);
      this.viewer.addChild(this.sfvt);
    },
    onSetTotalGenomes: function (attr, oldVal, newVal) {
      const genomeCount = newVal
      this.totalCountNode.innerHTML = ` ( ${genomeCount} Genomes ) `;

      if (genomeCount > 500) {
        // this.getReferenceAndRepresentativeGenomes(genomeCount);
      }
    },
    hideWarning: function () {
      if (this.warningPanel) {
        this.removeChild(this.warningPanel);
      }
    },

    showWarning: function (msg) {
      if (!this.warningPanel) {
        var c = this.warningContent;
        this.warningPanel = new ContentPane({
          style: 'margin:0px; padding: 0px;margin-top: -10px;margin:4px;margin-bottom: 0px;background: #f9ff85;margin-top: 0px;padding:4px;border:0px solid #aaa;border-radius:4px;font-weight:200;',
          content: '<table><tr style="background: #f9ff85;"><td><div class="WarningBanner">' + c + "</div></td><td style='width:30px;'><i style='font-weight:400;color:#333;cursor:pointer;' class='fa-2x icon-cancel-circle close' style='color:#333;font-weight:200;'></td></tr></table>",
          region: 'top',
          layoutPriority: 3
        });

        var _self = this;
        on(this.warningPanel, '.close:click', function () {
          _self.removeChild(_self.warningPanel);
        });

      }
      this.addChild(this.warningPanel);
    },
    onSetAnchor: function (evt) {
      evt.stopPropagation();
      evt.preventDefault();

      var parts = [];
      var q;
      if (this.query) {
        q = (this.query.charAt(0) == '?') ? this.query.substr(1) : this.query;
        if (q != 'keyword(*)') {
          parts.push(q);
        }
      }
      if (evt.filter && evt.filter != 'false') {
        parts.push(evt.filter);
      }

      if (parts.length > 1) {
        q = '?and(' + parts.join(',') + ')';
      } else if (parts.length == 1) {
        q = '?' + parts[0];
      } else {
        q = '';
      }

      var hp;
      if (this.state.hashParams && this.state.hashParams.view_tab) {
        hp = { view_tab: this.state.hashParams.view_tab };
      } else {
        hp = {};
      }

      hp.filter = 'false';

      var l = window.location.pathname + q + '#' + Object.keys(hp).map(function (key) {
        return key + '=' + hp[key];
      }, this).join('&');
      Topic.publish('/navigate', { href: l });
    }
  });
});
