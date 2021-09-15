define([
  'dojo/_base/declare', './TabViewerBase', 'dojo/on', 'dojo/_base/lang', 'dojo/request',
  'dijit/layout/ContentPane', 'dojo/topic',
  '../FeatureGridContainer', '../ProteinStructureGridContainer', '../SpecialtyGeneGridContainer', '../ProteinFeaturesGridContainer',
  '../PathwayGridContainer', '../ProteinFamiliesContainer',
  '../TranscriptomicsContainer', '../InteractionContainer', '../GenomeGridContainer',
  '../AMRPanelGridContainer', '../SubsystemGridContainer', '../SurveillanceGridContainer', '../SerologyGridContainer',
  '../SequenceGridContainer', '../StrainGridContainer', '../../util/PathJoin', '../../util/QueryToEnglish', 'dijit/Dialog'
], function (
  declare, TabViewerBase, on, lang, xhr,
  ContentPane, Topic,
  FeatureGridContainer, ProteinStructureGridContainer, SpecialtyGeneGridContainer, ProteinFeaturesGridContainer,
  PathwayGridContainer, ProteinFamiliesContainer,
  TranscriptomicsContainer, InteractionsContainer, GenomeGridContainer,
  AMRPanelGridContainer, SubsystemGridContainer, SurveillanceGridContainer, SerologyGridContainer,
  SequenceGridContainer, StrainGridContainer, PathJoin, QueryToEnglish, Dialog
) {
  return declare([TabViewerBase], {
    maxGenomesPerList: 10000,
    maxReferenceGenomes: 500,
    totalGenomes: 0,
    perspectiveLabel: 'Genome List View',
    perspectiveIconClass: 'icon-selection-GenomeList',

    showQuickstartKey: 'hideQuickstart',

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

      var url = PathJoin(this.apiServiceUrl, 'genome', '?' + (this.query) + '&select(genome_id)&limit(' + this.maxGenomesPerList + 1 + ')');

      xhr.post(PathJoin(this.apiServiceUrl, 'genome'), {
        headers: {
          accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
        data: (this.query) + '&select(genome_id)&limit(' + this.maxGenomesPerList + 1 + ')'

      }).then(function (res) {
        if (res && res.response && res.response.docs) {
          var genomes = res.response.docs;
          if (genomes) {
            _self._set('total_genomes', res.response.numFound);
            var genome_ids = genomes.map(function (o) {
              return o.genome_id;
            });
            _self._set('genome_ids', genome_ids);
          }
        } else {
          console.warn('Invalid Response for: ', url);
        }
      }, function (err) {
        console.error('Error Retreiving Genomes: ', err);
      });

    },

    getReferenceAndRepresentativeGenomes: function () {
      var _self = this;

      xhr.post(PathJoin(this.apiServiceUrl, 'genome'), {
        headers: {
          accept: 'application/solr+json',
          'X-Requested-With': null,
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        data: (this.query) + '&or(eq(reference_genome,Representative),eq(reference_genome,Reference))&select(genome_id,reference_genome)&limit(' + this.maxGenomesPerList + ')'
      }).then(function (res) {
        if (res && res.response && res.response.docs) {
          var genomes = res.response.docs;
          _self._set('referenceGenomes', genomes);
        } else {
          console.warn('Invalid Response for: ');
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
          var prop = 'genome_id';
          if (active == 'transcriptomics') {
            prop = 'genome_ids';
          }
          var activeMax = activeTab.maxGenomeCount || this.maxGenomesPerList;

          var autoFilterMessage;
          if (this.state && this.state.genome_ids) {
            if (this.state.genome_ids.length <= activeMax) {
              activeQueryState = lang.mixin({}, this.state, {
                search: 'in(' + prop + ',(' + this.state.genome_ids.join(',') + '))',
                hashParams: lang.mixin({}, this.state.hashParams)
              });
            } else if (this.state.referenceGenomes && this.state.referenceGenomes.length <= activeMax) {
              var ids = this.state.referenceGenomes.map(function (x) {
                return x.genome_id;
              });
              autoFilterMessage = 'This tab has been filtered to view data limited to Reference and Representative Genomes in your view.';
              activeQueryState = lang.mixin({}, this.state, {
                genome_ids: ids,
                autoFilterMessage: autoFilterMessage,
                search: 'in(' + prop + ',(' + ids.join(',') + '))',
                hashParams: lang.mixin({}, this.state.hashParams)
              });
            } else if (this.state.referenceGenomes) {
              var referenceOnly = this.state.referenceGenomes.filter(function (x) {
                return x.reference_genome == 'Reference';
              }).map(function (x) {
                return x.genome_id;
              });
              if (!referenceOnly || referenceOnly.length < 1 || referenceOnly.length > activeMax) {
                autoFilterMessage = 'There are too many genomes in your view.  This tab will not show any data';
                activeQueryState = lang.mixin({}, this.state, {
                  genome_ids: [],
                  autoFilterMessage: autoFilterMessage,
                  search: '',
                  hashParams: lang.mixin({}, this.state.hashParams)
                });
              } else if (referenceOnly.length <= activeMax) {
                autoFilterMessage = 'This tab has been filtered to view data limited to Reference Genomes in your view.';
                activeQueryState = lang.mixin({}, this.state, {
                  genome_ids: referenceOnly,
                  autoFilterMessage: autoFilterMessage,
                  search: 'in(' + prop + ',(' + referenceOnly.join(',') + '))',
                  hashParams: lang.mixin({}, this.state.hashParams)
                });
              }
            }
          }

          if (activeQueryState && active == 'proteinFamilies') {
            activeQueryState.search = '';
            if (activeTab._firstView) {
              Topic.publish(activeTab.topicId, 'showMainGrid');
            }
          }

          // special case for host genomes
          if (active == 'features' && this.state && this.state.genome_ids && !this.state.hashParams.filter) {
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

      this.strains = new StrainGridContainer({
        title: 'Strains',
        id: this.viewer.id + '_strains',
        state: this.state
      });
      this.genomes = new GenomeGridContainer({
        title: 'Genomes',
        id: this.viewer.id + '_genomes',
        state: this.state,
        disable: false
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
        title: 'Protein Features',
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
      this.proteinFamilies = new ProteinFamiliesContainer({
        title: 'Protein Families',
        id: this.viewer.id + '_proteinFamilies',
        disabled: false
      });
      // this.transcriptomics = new TranscriptomicsContainer({
      //   title: 'Transcriptomics',
      //   id: this.viewer.id + '_transcriptomics'
      // });
      // this.interactions = new InteractionsContainer({
      //   title: 'Interactions',
      //   id: this.viewer.id + '_interactions',
      //   state: this.state
      // });
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

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.strains);
      this.viewer.addChild(this.genomes);
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.sequences);
      this.viewer.addChild(this.features);
      this.viewer.addChild(this.structures);
      this.viewer.addChild(this.specialtyGenes);
      this.viewer.addChild(this.proteinFeatures);
      this.viewer.addChild(this.proteinFamilies);
      this.viewer.addChild(this.pathways);
      this.viewer.addChild(this.subsystems);
      // this.viewer.addChild(this.transcriptomics);
      // this.viewer.addChild(this.interactions);

      if (localStorage) {
        var gs = localStorage.getItem(this.showQuickstartKey);
        if (gs) {
          gs = JSON.parse(gs);
        }
        if (!gs) {

          var dlg = new Dialog({
            title: 'PATRIC Quickstart',
            content: '<iframe width="945" height="480" src="https://www.youtube.com/embed/K3eL4i9vQBo" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>'
          });
          dlg.show();
          localStorage.setItem(this.showQuickstartKey, true);
        }

      }
    },
    onSetTotalGenomes: function (attr, oldVal, newVal) {
      this.totalCountNode.innerHTML = ' ( ' + newVal + ' Genomes ) ';

      if (newVal > 500) {
        this.getReferenceAndRepresentativeGenomes();
      }
    },
    hideWarning: function () {
      if (this.warningPanel) {
        this.removeChild(this.warningPanel);
      }
    },

    showWarning: function (msg) {
      if (!this.warningPanel) {
        var c = this.warningContent.replace('{{maxGenomesPerList}}', this.maxGenomesPerList);
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
