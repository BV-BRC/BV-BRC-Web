define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './TabViewerBase', '../../util/QueryToEnglish', '../../DataAPI',
  '../GenomeListOverview', '../GenomeGridContainer',
  '../AMRPanelGridContainer', '../SequenceGridContainer',
  '../FeatureGridContainer', '../SpecialtyGeneGridContainer', '../ProteinFamiliesContainer',
  '../PathwayGridContainer', '../TranscriptomicsContainer',  '../SubsystemGridContainer'
], function (
  declare, lang,
  TabViewerBase, QueryToEnglish, DataAPI,
  GenomeListOverview, GenomeGridContainer,
  AMRPanelGridContainer, SequenceGridContainer,
  FeatureGridContainer, SpecialtyGeneGridContainer, ProteinFamiliesContainer,
  PathwaysContainer, TranscriptomicsContainer, SubSystemsContainer
) {

  return declare([TabViewerBase], {
    perspectiveLabel: 'Genome List View',
    perspectiveIconClass: 'icon-selection-GenomeList',
    defaultTab: 'genomes',
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

      this.setActivePanelState();
    },
    onSetQuery: function (attr, oldVal, newVal) {
      const q = newVal.split('&').filter(op => op.includes('genome(')).map(op => {
        const part = op.replace('genome(', '')
        return part.substring(0, part.length - 1)
      }).join('')

      const content = QueryToEnglish(q);
      this.queryNode.innerHTML = '<span class="queryModel">Genomes: </span>  ' + content;
    },
    onSetTotalGenomes: function (attr, oldVal, newVal) {
      this.totalCountNode.innerHTML = ' ( ' + newVal + ' Genomes ) ';
    },
    setActivePanelState: function () {
      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : this.defaultTab;
      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active)
        return;
      }
      const activeQueryState = lang.mixin({}, this.state, { hashParams: lang.mixin({}, this.state.hashParams) })

      activeTab.set('state', activeQueryState)

      if (activeTab) {
        var pageTitle = 'Genome List ' + activeTab.title;
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },
    postCreate: function () {
      this.inherited(arguments)

      this.watch('query', lang.hitch(this, 'onSetQuery'))
      this.watch('total_genomes', lang.hitch(this, 'onSetTotalGenomes'))

      this.overview = this.createOverviewPanel()
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
      this.specialtyGenes = new SpecialtyGeneGridContainer({
        title: 'Specialty Genes',
        id: this.viewer.id + '_specialtyGenes',
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
      // this.transcriptomics = new TranscriptomicsContainer({
      //   title: 'Transcriptomics',
      //   id: this.viewer.id + '_transcriptomics',
      //   disabled: false,
      //   state: this.state
      // })

      this.viewer.addChild(this.overview)
      this.viewer.addChild(this.genomes)
      this.viewer.addChild(this.sequences);
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.features);
      this.viewer.addChild(this.specialtyGenes);
      // this.viewer.addChild(this.proteinFamilies);
      this.viewer.addChild(this.pathways);
      this.viewer.addChild(this.subsystems);
      // this.viewer.addChild(this.transcriptomics);
    }
  });
});
