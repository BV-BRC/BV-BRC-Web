define("p3/widget/viewer/_GenomeList", [
  'dojo/_base/declare', './TabViewerBase', 'dojo/on', 'dojo/_base/lang', 'dojo/request',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/topic',
  '../GenomeOverview',
  '../FeatureGridContainer', '../SpecialtyGeneGridContainer',
  '../ActionBar', '../ContainerActionBar', '../PathwaysContainer', '../ProteinFamiliesContainer',
  '../DiseaseContainer', '../PublicationGridContainer', '../CircularViewerContainer',
  '../TranscriptomicsContainer', '../InteractionContainer', '../GenomeGridContainer',
  '../AMRPanelGridContainer', '../SubSystemsContainer',
  '../SequenceGridContainer', '../../util/PathJoin', '../../util/QueryToEnglish', 'dijit/Dialog'
], function (
  declare, TabViewerBase, on, lang, xhr,
  domClass, ContentPane, domConstruct, Topic,
  GenomeOverview,
  FeatureGridContainer, SpecialtyGeneGridContainer,
  ActionBar, ContainerActionBar, PathwaysContainer, ProteinFamiliesContainer,
  DiseaseContainer, PublicationGridContainer, CircularViewerContainer,
  TranscriptomicsContainer, InteractionsContainer, GenomeGridContainer,
  AMRPanelGridContainer, SubSystemsContainer,
  SequenceGridContainer, PathJoin, QueryToEnglish, Dialog
) {
  return declare([TabViewerBase], {
    maxGenomesPerList: 10000,
    maxReferenceGenomes: 500,
    totalGenomes: 0,
    // defaultTab: "overview",
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
      // console.log("GenomeList SetQuery: ", query, this);

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
        // console.log(" URL: ", url);
        // console.log("Get GenomeList Res: ", res);
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
      // console.log("GET REFERENCE AND REPRESENTATIVE GENOMES")
      var query = this.get('query');

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
        // console.log(" URL: ", url);
        // console.log("Get GenomeList Res: ", res);
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
      // console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);
      this.inherited(arguments);
      if (!state.genome_ids) {
        // console.log("NO Genome_IDS: old: ", oldVal.search, " new: ", state.search);
        if (state.search == oldVal.search) {
          // console.log("Same Search")
          // console.log("OLD Genome_IDS: ", oldVal.genome_ids);
          // console.log("INTERNAL STATE UPDATE")
          this.set('state', lang.mixin({}, state, {
            genome_ids: oldVal.genome_ids,
            referenceGenomes: oldVal.referenceGenomes || []
          }));
          return;
        }
        this.set('query', state.search);

      } else if (state.search != oldVal.search) {
        // console.log("SET QUERY: ", state.search);
        this.set('query', state.search);
      }

      this.setActivePanelState();
    },

    onSetQuery: function (attr, oldVal, newVal) {

      var content = QueryToEnglish(newVal);
      // console.log("QueryToEnglish Content: ", content, newVal);
      this.overview.set('content', '<div style="margin:4px;"><span class="queryModel">Genomes: </span> ' + content + '</div>');
      this.queryNode.innerHTML = '<span class="queryModel">Genomes: </span>  ' + content;
    },

    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : this.defaultTab;
      // console.log("Active: ", active, "state: ", JSON.stringify(this.state));

      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active);
        return;
      }
      switch (active) {
        case 'genomes':
          activeTab.set('state', lang.mixin({}, this.state, { hashParams: lang.mixin({}, this.state.hashParams) }));
          break;
        default:
          var activeQueryState;
          var prop = 'genome_id';
          if (active == 'transcriptomics') {
            prop = 'genome_ids';
          }
          var activeMax = activeTab.maxGenomeCount || this.maxGenomesPerList;

          // console.log("ActiveTab.maxGenomeCount: ", activeTab.maxGenomeCount);
          // console.log("ACTIVE MAX: ", activeMax);
          var autoFilterMessage;
          if (this.state && this.state.genome_ids) {
            // console.log("Found Genome_IDS in state object. count: ", this.state.genome_ids.length);
            if (this.state.genome_ids.length <= activeMax) {
              // console.log("USING ALL GENOME_IDS. count: ", this.state.genome_ids.length);
              activeQueryState = lang.mixin({}, this.state, {
                search: 'in(' + prop + ',(' + this.state.genome_ids.join(',') + '))',
                hashParams: lang.mixin({}, this.state.hashParams)
              });
            } else if (this.state.referenceGenomes && this.state.referenceGenomes.length <= activeMax) {
              var ids = this.state.referenceGenomes.map(function (x) {
                return x.genome_id;
              });
              // console.log("USING ALL REFERENCE AND REP GENOMES. Count: ", ids.length);
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
              // console.log("USING ONLY REFERENCE GENOMES. Count: " + referenceOnly.length);
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
            // console.log("gidQueryState: ", gidQueryState);
            // console.log("Active Query State: ", activeQueryState);
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
            // console.log("q = ", q, "this.apiServiceUrl=", this.apiServiceUrl, "PathJoin", PathJoin(this.apiServiceUrl, "genome", q));
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
            // console.log("Active Query State: ", activeQueryState);

            activeTab.set('state', activeQueryState);
          } else {
            console.warn('MISSING activeQueryState for PANEL: ' + active);
          }
          break;
      }

      if (activeTab) {
        var pageTitle = 'Genome List ' + activeTab.title;
        // console.log("Genome List setActivePanelState: ", pageTitle);
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },

    onSetGenomeIds: function (attr, oldVal, genome_ids) {
      // console.log("onSetGenomeIds: ", genome_ids, this.genome_ids, this.state.genome_ids);
      // this.set("state", lang.mixin({},this.state, {genome_ids: genome_ids}));
      this.state.genome_ids = genome_ids;
      this.setActivePanelState();
    },

    onSetReferenceGenomes: function (attr, oldVal, referenceGenomes) {
      // console.log("onSetReferenceGenomes: ", referenceGenomes);
      // this.set("state", lang.mixin({},this.state, {genome_ids: genome_ids}));

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
        id: this.viewer.id + '_' + 'genomes',
        state: this.state,
        disable: false
      });
      this.sequences = new SequenceGridContainer({
        title: 'Sequences',
        id: this.viewer.id + '_' + 'sequences',
        state: this.state,
        disable: false
      });

      this.amr = new AMRPanelGridContainer({
        title: 'AMR Phenotypes',
        id: this.viewer.id + '_' + 'amr'
      });

      this.features = new FeatureGridContainer({
        title: 'Features',
        id: this.viewer.id + '_' + 'features',
        disabled: false
      });
      this.specialtyGenes = new SpecialtyGeneGridContainer({
        title: 'Specialty Genes',
        id: this.viewer.id + '_' + 'specialtyGenes',
        disabled: false,
        state: this.state
      });
      this.pathways = new PathwaysContainer({
        title: 'Pathways',
        id: this.viewer.id + '_' + 'pathways',
        disabled: false
      });

      this.subsystems = new SubSystemsContainer({
        title: 'Subsystems',
        id: this.viewer.id + '_' + 'subsystems',
        disabled: false
      });

      this.proteinFamilies = new ProteinFamiliesContainer({
        title: 'Protein Families',
        id: this.viewer.id + '_' + 'proteinFamilies',
        disabled: false
      });
      this.transcriptomics = new TranscriptomicsContainer({
        title: 'Transcriptomics',
        id: this.viewer.id + '_' + 'transcriptomics',
        disabled: false,
        state: this.state
      });

      this.interactions = new InteractionsContainer({
        title: 'Interactions',
        id: this.viewer.id + '_' + 'interactions',
        state: this.state
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.genomes);
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.sequences);
      this.viewer.addChild(this.features);
      this.viewer.addChild(this.specialtyGenes);
      this.viewer.addChild(this.proteinFamilies);
      this.viewer.addChild(this.pathways);
      this.viewer.addChild(this.subsystems);
      this.viewer.addChild(this.transcriptomics);
      this.viewer.addChild(this.interactions);

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
      // console.log("ON SET TOTAL GENOMES: ", newVal);
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
      // console.log("onSetAnchor: ", evt, evt.filter);
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

      // console.log("parts: ", parts);

      if (parts.length > 1) {
        q = '?and(' + parts.join(',') + ')';
      } else if (parts.length == 1) {
        q = '?' + parts[0];
      } else {
        q = '';
      }

      // console.log("SetAnchor to: ", q, "Current View: ", this.state.hashParams);
      var hp;

      if (this.state.hashParams && this.state.hashParams.view_tab) {
        hp = { view_tab: this.state.hashParams.view_tab };
      } else {
        hp = {};
      }

      hp.filter = 'false';

      // console.log("HP: ", JSON.stringify(hp));
      l = window.location.pathname + q + '#' + Object.keys(hp).map(function (key) {
        return key + '=' + hp[key];
      }, this).join('&');
      // console.log("NavigateTo: ", l);
      Topic.publish('/navigate', { href: l });
    }
  });
});
