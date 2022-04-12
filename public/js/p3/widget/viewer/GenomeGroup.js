define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './TabViewerBase', './_GenomeList', '../AMRPanelGridContainer',
  '../GenomeListOverview', '../GroupGenomeGridContainer', '../SequenceGridContainer',
  '../FeatureGridContainer', '../SpecialtyGeneGridContainer',
  '../PathwayGridContainer', '../SubsystemGridContainer'

], function (
  declare, lang,
  TabViewerBase, GenomeList, AMRPanelGridContainer,
  Overview, GroupGenomeGridContainer, SequenceGridContainer,
  FeatureGridContainer, SpecialtyGeneGridContainer,
  PathwaysContainer, SubSystemsContainer
) {

  return declare([GenomeList], {
    groupPath: null,
    perspectiveLabel: 'Genome Group View',
    perspectiveIconClass: 'icon-selection-GenomeList',
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
      this.setActivePanelState()
    },

    setActivePanelState: function () {

      const active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      const activeTab = this[active];

      if (!activeTab) {
        return;
      }
      switch (active) {
        case 'transcriptomics':
          activeTab.set('state', lang.mixin({}, this.state, { search: `in(genome_ids,GenomeGroup(${encodeURIComponent('/' + this.groupPath)}))` }));
          break;

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
        const pageTitle = 'Genome Group ' + activeTab.title;
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },

    postCreate: function () {
      TabViewerBase.prototype.postCreate.call(this, arguments);

      this.watch('total_genomes', lang.hitch(this, 'onSetTotalGenomes'));

      this.overview = this.createOverviewPanel();

      this.genomes = new GroupGenomeGridContainer({
        title: 'Genomes',
        id: this.viewer.id + '_genomes',
        state: this.state,
        disable: false,
        onRefresh: lang.hitch(this, function () {
          this.set('query', this.state.search, true);
        })
      });

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
        title: 'Proteins',
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

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.genomes);
      this.viewer.addChild(this.sequences);
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.features);
      this.viewer.addChild(this.specialtyGenes);
      this.viewer.addChild(this.pathways);
      this.viewer.addChild(this.subsystems);
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
