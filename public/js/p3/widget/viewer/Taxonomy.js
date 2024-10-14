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
    context: 'bacteria',
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

    changeToBacteriaContext: function () {
      this.overview.set('context', 'bacteria');

      this.viewer.addChild(this.phylogeny, 1);
      this.viewer.addChild(this.amr, 4);
      this.viewer.addChild(this.sequences, 5)
      this.viewer.addChild(this.specialtyGenes, 8);
      // this.viewer.addChild(this.proteinFamilies, 10);
      this.viewer.addChild(this.pathways, 11);
      this.viewer.addChild(this.subsystems, 12);
      // this.viewer.addChild(this.transcriptomics, 13);
      this.viewer.addChild(this.interactions, 14);
    },

    changeToVirusContext: function () {
      this.viewer.removeChild(this.phylogeny);
      this.viewer.removeChild(this.amr);
      this.viewer.removeChild(this.sequences);
      this.viewer.removeChild(this.specialtyGenes);
      // this.viewer.removeChild(this.proteinFamilies);
      this.viewer.removeChild(this.pathways);
      this.viewer.removeChild(this.subsystems);
      // this.viewer.removeChild(this.transcriptomics);
      this.viewer.removeChild(this.interactions);
    },

    onSetTaxonomy: function (attr, oldVal, taxonomy) {
      this.queryNode.innerHTML = this.buildHeaderContent(taxonomy);

      // customization for viruses only when the context is changed
      if (this.context === 'bacteria') {
        if (this.taxonomy.lineage_names.includes('Influenza A virus') || this.taxonomy.lineage_names.includes('Rhinovirus A')) {
          if (!this.surveillance) {
            this.viewer.addChild(this.surveillance);
          }
          if (!this.serology) {
            this.viewer.addChild(this.serology);
          }
        } else {
          this.viewer.removeChild(this.surveillance);
          this.viewer.removeChild(this.serology);
        }

        // SFVT
        if (this.taxonomy.lineage_names.includes('Influenza A virus') ||
          this.taxonomy.lineage_names.includes('Monkeypox virus')) {
          if (!this.sfvt) {
            this.viewer.addChild(this.sfvt);
          }
        } else {
          this.viewer.removeChild(this.sfvt);
        }

        // strains
        // if (this.taxonomy.lineage_names.includes('Orthomyxoviridae') || this.taxonomy.lineage_names.includes('Bunyavirales')) {
        //   this.viewer.addChild(this.strains, 3);
        // } else {
        //   this.viewer.removeChild(this.strains);
        // }

        if (this.taxonomy.lineage_names.includes('Orthomyxoviridae')) {
          this.viewer.addChild(this.strains_orthomyxoviridae, 3);
        } else if (this.taxonomy.lineage_names.includes('Bunyavirales')) {
          this.viewer.addChild(this.strains_bunyavirales, 3);
        } else {
          this.viewer.removeChild(this.strains || this.strains_orthomyxoviridae || this.strains_bunyavirales);
        }
      }

      // switch tab configuration & view context
      if (this.taxonomy.lineage_names.includes('Bacteria') && this.context === 'virus') {
        this.set('context', 'bacteria')
        this.changeToBacteriaContext();
      } else if (this.taxonomy.lineage_names.includes('Viruses') && this.context === 'bacteria') {
        this.set('context', 'virus');
        this.changeToVirusContext();
      }

      this.taxonomy = this.state.taxonomy = taxonomy;
      this.setActivePanelState();
    },
    onSetQuery: function (attr, oldVal, newVal) {
      // prevent default action
    },
    onSetReferenceGenomes: function () {
      // prevent default action
    },
    buildTaxonIdByState: function (state) {
      var def = new Deferred();
      var parts = state.pathname.split('/');

      var taxon_id_or_name = parts[parts.length - 1];
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
      oldState = oldState || {};
      if (!state) {
        throw Error('No State Set');
      }

      this.buildTaxonIdByState(state).then( lang.hitch(this, function (taxon_id) {
        state.taxon_id = taxon_id;
        this.set('taxon_id', state.taxon_id);

        var s = 'eq(taxon_lineage_ids,' + state.taxon_id + ')';
        state.search = state.search.replace(s, '');
        if (state.search) {
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
          state.search = s;
          this.filteredTaxon = false;
          if (this.taxonomy) {
            this.queryNode.innerHTML = this.buildHeaderContent(this.taxonomy);
          }
        }

        if (!state.taxonomy && state.taxon_id) {
          if (oldState && oldState.taxon_id) {
            if ((state.taxon_id == oldState.taxon_id)) {
              if (oldState.taxonomy || this.taxonomy) {
                state.taxonomy = oldState.taxonomy || this.taxonomy;
              } else {
                console.log('oldState missing Taxonomy');
              }
            }
          }
        }

        this.set('query', state.search);

        if (!state.hashParams) {
          if (oldState.hashParams && oldState.hashParams.view_tab) {
            state.hashParams = { view_tab: oldState.hashParams.view_tab };
          } else {
            state.hashParams = { view_tab: this.defaultTab };
          }
        }
        if (state.hashParams) {
          if (!state.hashParams.view_tab) {
            state.hashParams.view_tab = this.defaultTab;
          }

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
    onSetGenomeIds: function (attr, oldVal, genome_ids) {
      // stop
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
        case 'taxontree':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'eq(taxon_id,' + encodeURIComponent(this.state.taxon_id) + ')',
            hashParams: lang.mixin({}, this.state.hashParams)
          }));
          break;
        case 'phylogeny':
          activeTab.set('state', lang.mixin({}, this.state));
          break;
        case 'sfvt':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'eq(taxon_id,' + this.state.taxon_id + ')'
          }));
          break;
        case 'structures':
        case 'surveillance':
        case 'serology':
        case 'strains':
        case 'strains_orthomyxoviridae':
        case 'strains_bunyavirales':
        case 'epitope':
        case 'experiments':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'eq(taxon_lineage_ids,' + this.state.taxon_id + ')'
          }));
          break;

        default:
          var activeQueryState;
          var prop = 'genome_id';
          if (active === 'interactions') {
            prop = 'genome_id_a';
          }
          var context = [`eq(taxon_lineage_ids,${this.state.taxon_id})`]
          if (this.state.search) {
            context = this.state.search.split('&')
          }
          activeQueryState = lang.mixin({}, this.state, {
            search: `eq(${prop},*)&genome(${(prop !== 'genome_id') ? `to(${prop}),` : ''}${(context.length > 1 ? `and(${context.join(',')})` : context[0])})`,
            hashParams: lang.mixin({}, this.state.hashParams)
          });

          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          } else {
            console.warn('MISSING activeQueryState for PANEL: ' + active);
          }
          console.log('Active Query' + activeQueryState);
          break;
      }

      if (this.taxonomy) {
        var pageTitle = this.taxonomy.taxon_name + '::Taxonomy ' + activeTab.title;
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
