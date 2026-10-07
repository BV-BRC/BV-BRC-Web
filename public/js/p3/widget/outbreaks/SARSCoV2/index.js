define([
  'dojo/_base/declare', 'dojo/_base/lang', '../../viewer/TabViewerBase', '../../GenomeBrowser',
  '../OutbreaksOverview', '../OutbreaksPhylogenyTreeViewer', '../OutbreaksTabContainer', '../OutbreaksTab',
  './LineagesOfConcern', './variants/VariantByCountryChartContainer', './variants/VariantByLineageChartContainer',
  './variants/VariantGridContainer', './covariants/VariantLineageByCountryChartContainer',
  './covariants/VariantLineageByLineageChartContainer', './covariants/VariantLineageGridContainer',
  'dojo/text!./OverviewDetails.html', 'dojo/text!./Resources.html', 'dojo/text!./HelpDocuments.html',
  'dojo/text!./ProteinStructure.html'
], function (
  declare, lang, TabViewerBase, GenomeBrowser,
  OutbreaksOverview, OutbreaksPhylogenyTreeViewer, OutbreaksTabContainer, OutbreaksTab,
  LineagesOfConcern, VariantByCountryChartContainer, VariantByLineageChartContainer,
  VariantGridContainer, VariantLineageByCountryChartContainer,
  VariantLineageByLineageChartContainer, VariantLineageGridContainer,
  OverviewDetailsTemplate, ResourcesTemplate, HelpDocumentsTemplate,
  ProteinStructureTemplate
) {
  return declare([TabViewerBase], {
    perspectiveLabel: '',
    perspectiveIconClass: '',
    title: '<h1 class="appHeader" style="color: #2a6d9e; margin-top: 10px; font-weight: bold;">SARS-CoV-2 Variants and Lineages of Concern</h1>',

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      this.buildHeaderContent();

      if (state.hashParams && state.hashParams.view_tab) {
        if (this[state.hashParams.view_tab]) {
          let vt = this[state.hashParams.view_tab];

          vt.set('visible', true);
          this.viewer.selectChild(vt);
        } else {
          console.log('No view-tab supplied in State Object');
        }
      }

      this.setActivePanelState();
    },

    setActivePanelState: function () {
      let activeQueryState;

      const active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      let activeTab = this[active];

      activeQueryState = lang.mixin({}, this.state);

      switch (active) {
        case 'lineage_prevalence':
          if (!this.state.search && this.state.hashParams.filter) {
            this.state.search = this.state.hashParams.filter;
          } else {
            this.state.search = 'keyword(*)';
          }
          this.variantLineageGridContainer.set('state', lang.mixin({}, this.state));
          break;

        case 'variant_prevalence':
          this.state.search = 'keyword(*)';
          this.variantGridContainer.set('state', lang.mixin({}, this.state));
          break;

        case 'jbrowse':
          activeQueryState = lang.mixin(this.state, {
            genome_id: '2697049.107626',
            hashParams: {
              view_tab: 'jbrowse',
              loc: 'NC_045512%3A1..29903',
              tracks: 'RefSeqGFF%2CActivesite%2CRegionofinterest%2CDomains%2CMutagenesisSite%2CVOCMarkers%2CHumanBCellEpitopes%2CClasses1to4AbEscape'
            }
          });
          activeTab.set('state', activeQueryState);
          break;

        default:
          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          } else {
            console.error('Missing Active Query State for: ', active);
          }
          break;
      }
    },

    buildHeaderContent: function () {
      this.queryNode.innerHTML = '<span class="searchField" style="font-size:large">' + this.title + '</span>';
      this.totalCountNode.innerHTML = '';
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments); // creates this.viewer

      this.overview = new OutbreaksOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview',
        detailsHTML: OverviewDetailsTemplate,
        rightPanelContent: [HelpDocumentsTemplate],
        pubmedTerm: 'sars cov2 variants',
        acknowledgements: 'We gratefully acknowledge the authors, originating and submitting laboratories that have ' +
          'shared their SARS-CoV-2 genomic data via <a href="https://www.ncbi.nlm.nih.gov/sars-cov-2/" target=_blank>' +
          'GenBank and SRA</a> and <a href="https://www.cogconsortium.uk/" target=_blank>COG-UK</a>, which is used to ' +
          'build this system.'
      });

      this.lineage = new LineagesOfConcern({
        title: 'Lineages of Concern/Interest',
        id: this.viewer.id + '_lineage'
      });

      // Initialize covariants tab
      let variantLineageByCountryChartContainer = new VariantLineageByCountryChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_chartContainer1',
        title: 'Chart By Country',
        apiServer: this.apiServer
      });

      let variantLineageByLineageChartContainer = new VariantLineageByLineageChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_chartContainer2',
        title: 'Chart By Covariant',
        apiServer: this.apiServer
      });

      this.variantLineageGridContainer = new VariantLineageGridContainer({
        title: 'Table',
        content: 'Variant Lineage Table',
        visible: true
      });

      this.lineage_prevalence = new OutbreaksTabContainer({
        title: 'Covariants',
        id: this.viewer.id + '_lineage_prevalence',
        tabContainers: [this.variantLineageGridContainer, variantLineageByCountryChartContainer, variantLineageByLineageChartContainer]
      });

      // Initialize variants tabs
      let variantByCountryChartContainer = new VariantByCountryChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_variantByCountryChartContainer',
        title: 'Chart By Country',
        visible: false,
        apiServer: this.apiServer
      });

      let variantByLineageChartContainer = new VariantByLineageChartContainer({
        region: 'leading',
        doLayout: false,
        id: this.id + '_variantByLineageChartContainer',
        title: 'Chart By Variant',
        visible: false,
        apiServer: this.apiServer
      });

      this.variantGridContainer = new VariantGridContainer({
        title: 'Table',
        content: 'Variant Lineage Table',
        visible: true,
      });

      this.variant_prevalence = new OutbreaksTabContainer({
        title: 'Variants',
        id: this.viewer.id + '_variant_prevalence',
        tabContainers: [this.variantGridContainer, variantByCountryChartContainer, variantByLineageChartContainer]
      });

      this.jbrowse = new GenomeBrowser({
        title: 'Genome Browser',
        id: this.viewer.id + '_jbrowse'
      });

      this.structure = new OutbreaksTab({
        title: 'Protein Structure',
        id: this.viewer.id + '_structure',
        templateString: ProteinStructureTemplate
      });

      // Initialize Phylogenetic Tree Viewer
      this.phylogeny = new OutbreaksPhylogenyTreeViewer({
        title: 'Phylogenetic Tree',
        id: this.viewer.id + '_phylogeny',
        phyloxmlTreeURL: 'https://www.bv-brc.org/api/content/phyloxml_trees/SARSCoV2/sarscov2.xml'
      });

      this.clusteredPhylogeny = new OutbreaksPhylogenyTreeViewer({
        title: 'Clustered Phylogenetic Tree',
        id: this.viewer.id + '_clusteredPhylogeny',
        phyloxmlTreeURL: 'https://www.bv-brc.org/api/content/phyloxml_trees/SARSCoV2/sarscov2_clustered.xml'
      });

      this.resources = new OutbreaksTab({
        title: 'Resources',
        id: this.viewer.id + '_resources',
        templateString: ResourcesTemplate
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.lineage);
      this.viewer.addChild(this.lineage_prevalence);
      this.viewer.addChild(this.variant_prevalence);
      this.viewer.addChild(this.jbrowse);
      this.viewer.addChild(this.structure);
      this.viewer.addChild(this.phylogeny);
      this.viewer.addChild(this.clusteredPhylogeny);
      this.viewer.addChild(this.resources);
    }
  });
});
