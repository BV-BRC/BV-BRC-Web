define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic', 'dojo/dom-construct', 'dojo/request',
  './TabViewerBase', '../../util/QueryToEnglish', '../../DataAPI', '../../util/PathJoin', '../../util/dateRangeWithinQuery',
  '../GenomeListOverview', '../GenomeGridContainer',
  '../AMRPanelGridContainer', '../SequenceGridContainer',
  '../FeatureGridContainer', '../ProteinGridContainer', '../SpecialtyGeneGridContainer', '../ProteinFamiliesContainer',
  '../PathwayGridContainer', '../ExperimentsContainer',  '../SubsystemGridContainer',
  '../StrainGridContainer', '../ProteinStructureGridContainer', '../ProteinFeaturesGridContainer',
  '../InteractionsContainer', '../EpitopeGridContainer', '../SurveillanceGridContainer', '../SerologyGridContainer',
  '../../util/genomeKingdom', '../../util/genomeContextQuery'
], function (
  declare, lang, Topic, domConstruct, xhr,
  TabViewerBase, QueryToEnglish, DataAPI, PathJoin, dateRangeWithinQuery,
  GenomeListOverview, GenomeGridContainer,
  AMRPanelGridContainer, SequenceGridContainer,
  FeatureGridContainer, ProteinGridContainer, SpecialtyGeneGridContainer, ProteinFamiliesContainer,
  PathwaysContainer, ExperimentsContainer, SubSystemsContainer,
  StrainGridContainer, ProteinStructureGridContainer, ProteinFeaturesGridContainer,
  InteractionsContainer, EpitopeGridContainer, SurveillanceGridContainer, SerologyGridContainer,
  genomeKingdom, genomeContextQuery
) {

  return declare([TabViewerBase], {
    perspectiveLabel: 'Genome List View',
    perspectiveIconClass: 'icon-selection-GenomeList',
    defaultTab: 'genomes',
    dataAPI: window.App.dataAPI,
    authToken: window.App.authorizationToken,
    createOverviewPanel: function () {
      return new GenomeListOverview({
        content: 'Genome List Overview',
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });
    },
    onSetState: function (attr, oldVal, state) {
      this.inherited(arguments);
      if (!this.query) {
        this.set('query', state.search);
      } else {
        if (this.query !== state.search && state.search !== '') {
          this.set('query', state.search);
        }
      }
      if (this.state.search === '' && this.query !== '') {
        this.state.search = this.query
      }

      // update genome count on header
      DataAPI.query('genome', state.search, { select: ['genome_id'], limit: 1 })
        .then(lang.hitch(this, (res) => {
          this._set('total_genomes', res.total_items);
        }))

      // Check if genome list contains bacteria, viruses, or both.
      const dataAPI = this.dataAPI;
      const authToken = this.authToken;
      const query = dateRangeWithinQuery(this.state.search);
      var _self = this;

      // forToken: authToken is a prototype property captured at module-declare time
      // (see `authToken:` above), so it is whatever the ambient token was when this
      // module first loaded. Passed through rather than substituting the ambient one.
      genomeKingdom.detect({ apiServer: dataAPI, query: query, authToken: authToken })
        .then(function (r) {
          if (r.kingdom === 'Bacteria') {
            _self.changeToBacteria();
          } else if (r.kingdom === 'Viruses') {
            _self.changeToViruses();
          }
        });

      this.setActivePanelState();
    },
    onSetQuery: function (attr, oldVal, newVal) {
      const q = newVal.split('&').filter(op => op.includes('genome(')).map(op => {
        const part = op.replace('genome(', '')
        return part.substring(0, part.length - 1)
      }).join('')

      const content = QueryToEnglish(q);
      // Safely render HTML from QueryToEnglish using DOM construction
      domConstruct.empty(this.queryNode);
      domConstruct.create('span', {
        'class': 'queryModel',
        innerHTML: 'Genomes: '
      }, this.queryNode);
      domConstruct.create('span', {
        innerHTML: '  ' + content
      }, this.queryNode);
    },
    onSetTotalGenomes: function (attr, oldVal, newVal) {
      this.totalCountNode.textContent = ' ( ' + newVal + ' Genomes ) ';
    },
    setActivePanelState: function () {
      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : this.defaultTab;
      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active)
        return;
      }
      const activeQueryState = lang.mixin({}, this.state, { hashParams: lang.mixin({}, this.state.hashParams) })

      // state.search is written against the `genome` collection and is
      // shared verbatim by every tab, so a genome-only field in it is a
      // 400 on each sibling -- `undefined field segment` on Features,
      // `undefined field collection_year` on Sequences. Re-target it for
      // the tab's own collection. Taxonomy.js has always done this; this
      // view did not, so any search richer than a taxon id broke the
      // non-genome tabs. genomeContextQuery only adds the join when the
      // collection really lacks a field, which keeps queries it can answer
      // itself (notably `eq(public,false)`, 726k genomes) off a join the
      // server would refuse as too broad.
      const dataType = activeTab.dataModel;
      if (dataType && activeQueryState.search) {
        const retargeted = genomeContextQuery(activeQueryState.search, dataType);
        activeQueryState.search = retargeted.query;
        if (retargeted.dropped.length) {
          // Say so: a filter that silently vanishes reads as wrong data.
          //
          // Report field NAMES, not the clauses. The banner is rendered
          // through innerHTML (GridContainer.onSetState) and this query
          // comes from the URL, so echoing it back is reflected XSS --
          // and raw RQL is not something to show a user anyway. Field
          // names come from genomeContextQuery's own regex and so can
          // only ever be [A-Za-z0-9_].
          var droppedFields = [];
          retargeted.dropped.forEach(function (clause) {
            genomeContextQuery.fieldsIn(clause).forEach(function (f) {
              var label = f.replace(/_/g, ' ');
              if (droppedFields.indexOf(label) === -1) { droppedFields.push(label); }
            });
          });
          if (droppedFields.length) {
            activeQueryState.autoFilterMessage = retargeted.unfiltered
              // Nothing survived, so the grid is showing a deliberate
              // zero rather than the whole collection. Say that, instead
              // of implying a partially-filtered result.
              ? (activeTab.title + ' cannot be filtered by '
                 + droppedFields.join(', ') + ', so this search cannot be '
                 + 'applied here. Showing no results rather than every record.')
              : (activeTab.title + ' cannot be filtered by '
                 + droppedFields.join(', ') + ', so those criteria are not '
                 + 'applied here.');
          }
        }
      }

      activeTab.set('state', activeQueryState)

      if (activeTab) {
        var pageTitle = 'Genome List ' + activeTab.title + ' | BV-BRC';
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },
    onSetAnchor: function (evt) {
      console.log('genome list onSetAnchor: ', evt)
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
      if (this.state.hashParams && this.state.hashParams.influenzaSearch) {
        hp.influenzaSearch = this.state.hashParams.influenzaSearch;
      }

      var l = window.location.pathname + q + '#' + Object.keys(hp).map(function (key) {
        return key + '=' + hp[key];
      }, this).join('&');
      console.log(`navigate to ${l}`)
      Topic.publish('/navigate', { href: l });
    },
    postCreate: function () {
      this.inherited(arguments)

      this.watch('query', lang.hitch(this, 'onSetQuery'))
      this.watch('total_genomes', lang.hitch(this, 'onSetTotalGenomes'))

      this.overview = this.createOverviewPanel()

      this.strains = new StrainGridContainer({
        title: 'Strains',
        id: this.viewer.id + '_strains',
        disabled: false,
        state: this.state
      })

      this.genomes = new GenomeGridContainer({
        title: 'Genomes',
        id: this.viewer.id + '_genomes',
        state: this.state,
        disable: false
      })

      this.sequences = new SequenceGridContainer({
        title: 'Sequences',
        id: this.viewer.id + '_sequences',
        state: this.state,
        disable: false
      });

      this.amr = new AMRPanelGridContainer({
        title: 'AMR Phenotypes',
        id: this.viewer.id + '_amr',
        disabled: false,
        state: this.state
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

      this.proteinStructures = new ProteinStructureGridContainer({
        title: 'Protein Structures',
        id: this.viewer.id + '_proteinStructures',
        disabled: false,
        state: this.state
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
        disabled: false,
        state: this.state
      });

      this.pathways = new PathwaysContainer({
        title: 'Pathways',
        id: this.viewer.id + '_pathways',
        disabled: false
      });

      this.subsystems = new SubSystemsContainer({
        title: 'Subsystems',
        id: this.viewer.id + '_subsystems',
        disabled: false
      });

      // this.proteinFamilies = new ProteinFamiliesContainer({
      //   title: 'Protein Families',
      //   id: this.viewer.id + '_proteinFamilies',
      //   disabled: false
      // });

      this.experiments = new ExperimentsContainer({
        title: 'Experiments',
        id: this.viewer.id + '_experiments',
        disabled: false,
        state: this.state
      })

      this.interactions = new InteractionsContainer({
        title: 'Interactions',
        id: this.viewer.id + '_interactions',
        state: this.state
      });

      this.epitope = new EpitopeGridContainer({
        title: 'Epitopes',
        id: this.viewer.id + '_epitope',
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

      this.viewer.addChild(this.overview)
      this.viewer.addChild(this.strains);
      this.viewer.addChild(this.genomes)
      this.viewer.addChild(this.sequences);
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.features);
      this.viewer.addChild(this.proteins);
      this.viewer.addChild(this.proteinStructures);
      this.viewer.addChild(this.specialtyGenes);
      this.viewer.addChild(this.proteinFeatures);
      // this.viewer.addChild(this.proteinFamilies);
      this.viewer.addChild(this.pathways);
      this.viewer.addChild(this.subsystems);
      this.viewer.addChild(this.experiments);
      this.viewer.addChild(this.interactions);
      this.viewer.addChild(this.epitope);
      this.viewer.addChild(this.surveillance);
      this.viewer.addChild(this.serology);
    },

    changeToBacteria: function () {
      this.viewer.removeChild(this.strains);
      this.viewer.removeChild(this.surveillance);
      this.viewer.removeChild(this.serology);
    },

    changeToViruses: function () {
      this.viewer.removeChild(this.amr)
      this.viewer.removeChild(this.specialtyGenes);
      // this.viewer.removeChild(this.proteinFamilies);
      this.viewer.removeChild(this.pathways);
      this.viewer.removeChild(this.subsystems);
      this.viewer.removeChild(this.experiments);
      this.viewer.removeChild(this.interactions);
    }
  });
});
