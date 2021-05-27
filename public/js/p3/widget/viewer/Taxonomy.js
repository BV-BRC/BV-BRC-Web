define([
  'dojo/_base/declare', 'dojo/_base/Deferred', 'dojo/request', 'dojo/_base/lang', 'dojo/topic',
  './_GenomeList', '../Phylogeny', '../../util/PathJoin',
  '../TaxonomyTreeGridContainer', '../TaxonomyOverview', '../../util/QueryToEnglish'
], function (
  declare, Deferred, xhr, lang, Topic,
  GenomeList, Phylogeny, PathJoin,
  TaxonomyTreeGrid, TaxonomyOverview, QueryToEnglish
) {
  return declare([GenomeList], {
    params: null,
    taxon_id: '',
    apiServiceUrl: window.App.dataAPI,
    taxonomy: null,
    perspectiveLabel: 'Taxon View',
    perspectiveIconClass: 'icon-selection-Taxonomy',
    postCreate: function () {
      this.inherited(arguments);

      this.phylogeny = new Phylogeny({
        title: 'Phylogeny',
        id: this.viewer.id + '_phylogeny',
        state: this.state
      });

      this.taxontree = new TaxonomyTreeGrid({
        title: 'Taxonomy',
        id: this.viewer.id + '_taxontree',
        state: this.state
      });
      this.viewer.addChild(this.phylogeny, 1);
      this.viewer.addChild(this.taxontree, 2);

      this.watch('taxonomy', lang.hitch(this, 'onSetTaxonomy'));
    },

    _setTaxon_idAttr: function (id) {
      if (id && this.taxon_id == id) {
        return;
      }
      this.taxon_id = id;

      xhr.get(PathJoin(this.apiServiceUrl, 'taxonomy', id), {
        headers: {
          accept: 'application/json'
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (taxonomy) {
        this.set('taxonomy', taxonomy);
      }));

    },

    addBacteriaTabs: function () {
      this.viewer.addChild(this.phylogeny, 1);
      this.viewer.addChild(this.amr, 4);
      this.viewer.addChild(this.specialtyGenes, 8);
      this.viewer.addChild(this.proteinFamilies, 10);
      this.viewer.addChild(this.pathways, 11);
      this.viewer.addChild(this.subsystems, 12);
      this.viewer.addChild(this.transcriptomics, 13);
      this.viewer.addChild(this.interactions, 14);
    },

    removeBacteriaTabs: function () {
      this.viewer.removeChild(this.phylogeny);
      this.viewer.removeChild(this.amr);
      this.viewer.removeChild(this.specialtyGenes);
      this.viewer.removeChild(this.proteinFamilies);
      this.viewer.removeChild(this.pathways);
      this.viewer.removeChild(this.subsystems);
      this.viewer.removeChild(this.transcriptomics);
      this.viewer.removeChild(this.interactions);
    },

    onSetTaxonomy: function (attr, oldVal, taxonomy) {
      // console.log("onSetTaxonomy: ", taxonomy);
      this.queryNode.innerHTML = this.buildHeaderContent(taxonomy);

      if (this.taxonomy.lineage_names.includes('Bacteria')) {
        this.addBacteriaTabs();
      } else if (this.taxonomy.lineage_names.includes('Viruses')) {
        this.removeBacteriaTabs();
      }
      console.log(this.taxonomy.lineage_names);
      if (this.taxonomy.lineage_names.includes('Influenza A virus')) {
        this.viewer.addChild(this.surveillance);
      }

      this.taxonomy = this.state.taxonomy = taxonomy;
      // this.set('state', lang.mixin({},this.state,{taxonomy:taxonomy}));
      this.setActivePanelState();
      // this.overview.set('taxonomy', taxonomy);
    },
    onSetQuery: function (attr, oldVal, newVal) {
      // prevent default action
    },
    buildTaxonIdByState: function (state) {
      var def = new Deferred();
      var parts = state.pathname.split('/');

      var taxon_id_or_name = parts[parts.length - 1];
      // console.log('taxon_id_or_name', typeof taxon_id_or_name, parseInt(taxon_id_or_name), taxon_id_or_name == parseInt(taxon_id_or_name));
      if (taxon_id_or_name == parseInt(taxon_id_or_name)) {
        def.resolve(parseInt(taxon_id_or_name));
      }
      else {
        xhr.post(PathJoin(this.apiServiceUrl, 'taxonomy'), {
          headers: {
            accept: 'application/json',
            'content-type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          data: 'eq(taxon_name,' + taxon_id_or_name + ')&in(taxon_rank,(genus,species))&select(taxon_id,taxon_name,taxon_rank)&limit(1)',
          handleAs: 'json'
        }).then(function (data) {
          if (data.length == 0) {
            def.reject('Failed to load corresponding taxonomy: ' + taxon_id_or_name);
          } else {
            def.resolve(data[0].taxon_id);
          }
        });
      }
      return def;
    },
    onSetState: function (attr, oldState, state) {
      // console.log("Taxonomy onSetState", JSON.stringify(state, null, 4));
      oldState = oldState || {};
      if (!state) {
        throw Error('No State Set');
        // return;
      }

      this.buildTaxonIdByState(state).then( lang.hitch(this, function (taxon_id) {
        state.taxon_id = taxon_id;
        this.set('taxon_id', state.taxon_id);

        // this.set("taxon_id", parts[parts.length - 1]);
        var s = 'eq(taxon_lineage_ids,' + state.taxon_id + ')';
        state.search = state.search.replace(s, '');
        if (state.search) {
          // console.log("GENERATE ENGLISH QUERY for ", state.search, s);
          this.filteredTaxon = QueryToEnglish(state.search.replace(s, ''));
          var sx = [s];
          if (state.search && state.search != s) {
            sx.push(state.search);
          }
          state.search = sx.join('&').replace('&&', '&');
          if (this.taxonomy) {
            this.queryNode.innerHTML = this.buildHeaderContent(this.taxonomy);
          }

        } else {
          // console.log("USE state.search: ", s);
          state.search = s;
          this.filteredTaxon = false;
          if (this.taxonomy) {
            this.queryNode.innerHTML = this.buildHeaderContent(this.taxonomy);
          }
        }

        if (!state.taxonomy && state.taxon_id) {
          // console.log("No state.taxonomy.  state.taxon_id: ", state.taxon_id);
          if (oldState && oldState.taxon_id) {
            // console.log("oldState.taxon_id: ", oldState.taxon_id)

            if ((state.taxon_id == oldState.taxon_id)) {
              if (oldState.taxonomy || this.taxonomy) {
                // console.log("oldState Taxonomy: ", oldState.taxonomy||this.taxonomy);
                state.taxonomy = oldState.taxonomy || this.taxonomy;
              } else {
                console.log('oldState missing Taxonomy');
              }
            }
          }
        }

        if (!state.genome_ids) {
          // console.log("NO Genome_IDS: old: ", oldState.search, " new: ", state.search);
          if (state.search == oldState.search) {
            // console.log("Same Search")
            // console.log("OLD Genome_IDS: ", oldState.genome_ids);
            this.set('state', lang.mixin({}, state, {
              genome_ids: oldState.genome_ids,
              referenceGenomes: oldState.referenceGenomes || []
            }));
            return;
          }
          this.set('query', state.search);

        } else if (state.search != oldState.search) {
          this.set('query', state.search);
        }

        if (!state.hashParams) {
          if (oldState.hashParams && oldState.hashParams.view_tab) {
            state.hashParams = { view_tab: oldState.hashParams.view_tab };
          } else {
            state.hashParams = { view_tab: this.defaultTab };
          }
        }
        // console.log("    Check for Hash Params: ", state.hashParams);
        if (state.hashParams) {
          if (!state.hashParams.view_tab) {
            state.hashParams.view_tab = this.defaultTab;
          }

          // console.log("Looking for Active Tab: ", state.hashParams.view_tab);

          if (this[state.hashParams.view_tab]) {
            var vt = this[state.hashParams.view_tab];
            vt.set('visible', true);
            this.viewer.selectChild(vt);
          }
        }

        this.setActivePanelState();
      }), lang.hitch(this, function (msg) {
        this.queryNode.innerHTML = '<b>' + msg + '</b>';
        this.totalCountNode.innerHTML = '';
      }));
    },

    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      var activeTab = this[active];

      // only trigger active tab auto filter message once
      if (activeTab.state && activeTab.state.autoFilterMessage) {
        delete this.state.autoFilterMessage;
      }

      if (!activeTab) {
        console.warn('ACTIVE TAB NOT FOUND: ', active);
        return;
      }
      switch (active) {
        // case 'overview':
        //   if (this.state && this.state.genome_ids) {
        //     activeTab.set('state', lang.mixin({}, this.state, {
        //       search: 'in(genome_id,(' + this.state.genome_ids.join(',') + '))',
        //       hashParams: lang.mixin({}, this.state.hashParams)
        //     }));
        //   }
        //   break;
        case 'taxontree':
          // activeTab.set('query',"eq(taxon_id," + this.state.taxon_id + ")")
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'eq(taxon_id,' + encodeURIComponent(this.state.taxon_id) + ')',
            hashParams: lang.mixin({}, this.state.hashParams)
          }));
          break;
        case 'phylogeny':
        // case 'genomes':
          activeTab.set('state', lang.mixin({}, this.state));
          break;
        // case 'amr':
        //   // need to show all (prevent referenceGenomes)
        //   if (this.state.genome_ids) {
        //     activeTab.set('state', lang.mixin({}, this.state, {
        //       search: 'in(genome_id,(' + this.state.genome_ids.join(',') + '))'
        //     }));
        //   }
        //   break;
        // case 'interactions':
        //   // console.log("interactions tab", this.setActivePanelState.caller, this.state);
        //   if (this.state.genome_ids) {
        //     var genome_ids;
        //     if (this.state.referenceGenomes) {
        //       genome_ids = this.state.referenceGenomes.map(function (g) {
        //         return g.genome_id;
        //       });
        //     } else {
        //       if (this.state.genome_ids.length > 1000) {
        //         return;
        //       }
        //       genome_ids = this.state.genome_ids;
        //     }
        //     var searchStr = (genome_ids.length > 0) ? 'or(in(genome_id_a,(' + genome_ids.join(',') + ')),in(genome_id_b,(' + genome_ids.join(',') + ')))' : 'eq(genome_id_a,NONE)';
        //     activeTab.set('state', lang.mixin({}, this.state, {
        //       search: searchStr
        //     }));
        //   }
        //   break;

        case 'structures':
        case 'surveillance':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'eq(taxon_lineage_ids,' + this.state.taxon_id + ')'
          }));
          break;

        default:
          var activeQueryState;
          var prop = 'genome_id';
          if (active == 'transcriptomics') {
            prop = 'genome_ids';
          }
          activeQueryState = lang.mixin({}, this.state, {
            search: `eq(${prop},*)&genome((taxon_lineage_ids,${this.state.taxon_id}))`,
            hashParams: lang.mixin({}, this.state.hashParams)
          });

          /*
          var activeMax = activeTab.maxGenomeCount || this.maxGenomesPerList;
          // console.log("ACTIVE MAX: ", activeMax);
          var autoFilterMessage;
          if (this.state && this.state.genome_ids) {
            // console.log("Found Genome_IDS in state object");
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
              console.log('USING ONLY REFERENCE GENOMES. Count: ' + referenceOnly.length);
              if (referenceOnly.length <= activeMax) {
                autoFilterMessage = 'This tab has been filtered to view data limited to Reference Genomes in your view.';
                activeQueryState = lang.mixin({}, this.state, {
                  genome_ids: referenceOnly,
                  autoFilterMessage: autoFilterMessage,
                  search: 'in(' + prop + ',(' + referenceOnly.join(',') + '))',
                  hashParams: lang.mixin({}, this.state.hashParams)
                });
              } else if (!referenceOnly || referenceOnly.length < 1) {
                autoFilterMessage = 'There are too many genomes in your view.  This tab will not show any data';
                activeQueryState = lang.mixin({}, this.state, {
                  genome_ids: [],
                  referenceGenomsautoFilterMessage: autoFilterMessage,
                  search: '',
                  hashParams: lang.mixin({}, this.state.hashParams)
                });
              }
            }
          }

          if (activeQueryState && active == 'proteinFamilies') {
            activeQueryState.search = '';
            // console.log(this.setActivePanelState.caller, this.setActivePanelState.caller === this.onSetGenomeIds, this.setActivePanelState.caller === this.onSetState);
            if (this.setActivePanelState.caller === this.onSetGenomeIds || this.setActivePanelState.caller === this.onSetState) {
              if (activeTab._firstView) {
                Topic.publish(activeTab.topicId, 'showMainGrid');
              }
            } else {
              activeQueryState = null;
            }
          }

          // special case for host genomes
          if (active == 'features' && this.state && this.state.genome_ids && !this.state.hashParams.filter) {
            var q = 'in(genome_id,(' + this.state.genome_ids.join(',') + '))&select(taxon_lineage_ids)&limit(1)';
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
          */

          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          } else {
            console.warn('MISSING activeQueryState for PANEL: ' + active);
          }
          break;
      }

      if (this.taxonomy) {
        var pageTitle = this.taxonomy.taxon_name + '::Taxonomy ' + activeTab.title;
        // console.log("Taxonomy setActivePanelState: ", pageTitle);
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },

    buildHeaderContent: function (taxon) {
      var taxon_lineage_names = taxon.lineage_names;
      var taxon_lineage_ids = taxon.lineage_ids;
      var taxon_lineage_ranks = taxon.lineage_ranks;

      var visibleRanks = ['superkingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];
      var visibleIndexes = taxon_lineage_ranks.filter(function (rank) {
        return visibleRanks.indexOf(rank) > -1;
      }).map(function (rank) {
        return taxon_lineage_ranks.indexOf(rank);
      });

      var lastVisibleIndex = visibleIndexes[visibleIndexes.length - 1];
      var lastIndex = taxon_lineage_ranks.length - 1;

      if (lastVisibleIndex < lastIndex) {
        visibleIndexes.push(taxon_lineage_ranks.length - 1);
        lastVisibleIndex = visibleIndexes[visibleIndexes.length - 1];
      }

      var out = visibleIndexes.map(function (idx) {
        return '<a class="navigationLink' + ((idx === lastVisibleIndex) ? ' current' : '') + '" href="/view/Taxonomy/' + taxon_lineage_ids[idx] + '">' + taxon_lineage_names[idx] + '</a>';
      });

      if (this.filteredTaxon) {
        out.push(this.filteredTaxon);
      }

      return out.join(' &raquo; ');
    },

    createOverviewPanel: function () {
      return new TaxonomyOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });
    },

    onSetAnchor: function (evt) {
      evt.stopPropagation();
      evt.preventDefault();
      var parts = [];

      if (evt.filter && evt.filter != 'false') {
        parts.push(evt.filter);
      }

      var q;
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
