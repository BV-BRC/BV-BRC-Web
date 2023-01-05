define([
  'dojo/_base/declare', 'dojo/_base/lang', '../../util/PathJoin', 'dojo/request',
  './TabViewerBase', './_GenomeList', '../AMRPanelGridContainer',
  '../GenomeListOverview', '../StrainGridContainer', '../GroupGenomeGridContainer', '../AMRPanelGridContainer', '../SequenceGridContainer',
  '../FeatureGridContainer', '../ProteinGridContainer', '../ProteinStructureGridContainer', '../SpecialtyGeneGridContainer', '../ProteinFeaturesGridContainer',
  '../ProteinFamiliesContainer', '../PathwayGridContainer', '../SubsystemGridContainer', '../ExperimentsContainer', '../InteractionsContainer',
  '../EpitopeGridContainer', '../SurveillanceGridContainer', '../SerologyGridContainer',

], function (
  declare, lang, PathJoin, xhr,
  TabViewerBase, GenomeList, AMRPanelGridContainer,
  Overview, StrainGridContainer, GroupGenomeGridContainer, AMRPanelGridContainer, SequenceGridContainer,
  FeatureGridContainer, ProteinGridContainer, ProteinStructureGridContainer, SpecialtyGeneGridContainer, ProteinFeaturesGridContainer,
  ProteinFamiliesContainer, PathwayGridContainer, SubsystemGridContainer, ExperimentsContainer, InteractionsContainer,
  EpitopeGridContainer, SurveillanceGridContainer, SerologyGridContainer
) {

  return declare([GenomeList], {
    groupPath: null,
    perspectiveLabel: 'Genome Group View',
    perspectiveIconClass: 'icon-selection-GenomeList',
    dataAPI: window.App.dataAPI,
    authToken: window.App.authorizationToken,

    onSetQuery: function (attr, oldVal, newVal) {
      // prevent default action
    },

    _setGroupPathAttr: function (GroupPath) {
      this._set('groupPath', GroupPath);
      this.queryNode.innerHTML = this.buildHeaderContent();
    },

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        throw Error('No State Set');
      }

      if (oldVal.search !== state.search) {
        const path = '/' + state.pathname.split('/').slice(2).map(decodeURIComponent).join('/');
        this.set('groupPath', path);

        state.search = `in(genome_id,GenomeGroup(${encodeURIComponent(path)}))`
        state.ws_path = path;
        this.inherited(arguments);
      }

      // Check if genome group contains bacteria, viruses, or both.
      const dataAPI = this.dataAPI;
      const authToken = this.authToken;
      const query = this.state.search;
      var _self = this;

      xhr.get(PathJoin(dataAPI, 'data/taxon_category/', `?${query}`), {
        headers: {
          Authorization: authToken,
          Accept: 'application/solr+json',
        },
        handleAs: 'json',
      }).then(function (data) {
        if (data.superkingdom[0] === 'Bacteria' && data.superkingdom.length === 1) {
          _self.changeToBacteria();
        } else if (data.superkingdom[0] === 'Viruses' && data.superkingdom.length === 1) {
          _self.changeToViruses();
        }
      });
      this.setActivePanelState()
    },

    setActivePanelState: function () {
      const active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      const activeTab = this[active];

      if (!activeTab) {
        return;
      }
      switch (active) {
        case 'strains':
        case 'transcriptomics':
          activeTab.set('state', lang.mixin({}, this.state, { search: `in(genome_ids,GenomeGroup(${encodeURIComponent('/' + this.groupPath)}))` }));
          break;

        // case 'strains':
        //   activeTab.set('state', lang.mixin({}, this.state, {
        //     search: 'eq(genome_ids,' + this.state.taxon_id + ')'
        //   }));
        //   break;

        // eslint-disable-next-line no-case-declarations
        default:
          const activeQueryState = lang.mixin({}, this.state)

          if (activeQueryState) {
            activeTab.set('state', activeQueryState)
          } else {
            console.warn(`MISSING activeQueryState for PANEL: ${active}`)
          }
          break;
      }

      if (activeTab) {
        const pageTitle = 'Genome Group ' + activeTab.title + ' | BV-BRC';
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },

    postCreate: function () {
      TabViewerBase.prototype.postCreate.call(this, arguments);

      this.watch('total_genomes', lang.hitch(this, 'onSetTotalGenomes'));

      this.overview = this.createOverviewPanel();

      this.strains = new StrainGridContainer({
        title: 'Strains',
        id: this.viewer.id + '_strains',
        disabled: false,
        state: this.state
      })
      this.genomes = new GroupGenomeGridContainer({
        title: 'Genomes',
        id: this.viewer.id + '_genomes',
        state: this.state,
        disable: false,
        onRefresh: lang.hitch(this, function () {
          this.set('query', this.state.search, true);
        })
      });
      this.amr = new AMRPanelGridContainer({
        title: 'AMR Phenotypes',
        id: this.viewer.id + '_amr',
        disabled: false,
        state: this.state
      });
      this.sequences = new SequenceGridContainer({
        title: 'Sequences',
        id: this.viewer.id + '_sequences',
        disabled: false,
        state: this.state
      });
      this.features = new FeatureGridContainer({
        title: 'Features',
        id: this.viewer.id + '_features',
        disabled: false,
        state: this.state
      });
      this.proteins = new ProteinGridContainer({
        title: 'Proteins',
        id: this.viewer.id + '_proteins',
        disabled: false,
        state: this.state
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
      // this.proteinFamilies = new ProteinFamiliesContainer({
      //   title: 'Protein Families',
      //   id: this.viewer.id + '_proteinFamilies',
      //   state: this.state
      // });
      this.pathways = new PathwayGridContainer({
        title: 'Pathways',
        id: this.viewer.id + '_pathways',
        state: this.state
      });
      this.subsystems = new SubsystemGridContainer({
        title: 'Subsystems',
        id: this.viewer.id + '_subsystems',
        state: this.state
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

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.strains);
      this.viewer.addChild(this.genomes);
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.sequences);
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
      this.viewer.removeChild(this.sequences)
      this.viewer.removeChild(this.specialtyGenes);
      this.viewer.removeChild(this.proteinFamilies);
      this.viewer.removeChild(this.pathways);
      this.viewer.removeChild(this.subsystems);
      this.viewer.removeChild(this.experiments);
      this.viewer.removeChild(this.interactions);
    },

    buildHeaderContent: function () {
      return this.groupPath.split('/').pop();
    },

    createOverviewPanel: function () {
      return new Overview({
        content: 'Genome Group Overview',
        title: 'Overview',
        isGenomeGroup: true,
        id: this.viewer.id + '_overview'
      });
    }
  });
});
