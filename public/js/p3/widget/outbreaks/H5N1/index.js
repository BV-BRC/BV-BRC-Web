define([
  'dojo/_base/declare', 'dojo/_base/lang', '../../viewer/TabViewerBase', '../OutbreaksOverview', '../OutbreaksTab',
  'dojo/text!./OverviewDetails.html', 'dojo/text!./Resources.html', 'dojo/text!./News.html', 'dojo/text!./Contents.html',
  'dojo/text!./Data.html', '../OutbreaksTabContainer', './genomes/GenomesGridContainer', '../OutbreaksPhylogenyTreeViewer'
], function (
  declare, lang, TabViewerBase, OutbreaksOverview, OutbreaksTab,
  OverviewDetailsTemplate, ResourcesTemplate, NewsTemplate, ContentsTemplate,
  DataTemplate, OutbreaksTabContainer, GenomesGridContainer, OutbreaksPhylogenyTreeViewer
) {
  return declare([TabViewerBase], {
    perspectiveLabel: '',
    perspectiveIconClass: '',
    title: 'H5N1 2024 Outbreak',
    segments: {1: 'PB2', 2: 'PB1', 3: 'PA', 4: 'HA', 5: 'NP', 6: 'NA', 7: 'M1, M2', 8: 'NS1, NEP'},

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
        case 'genomes':
          this.state.search = 'keyword(*)';
          this.genomesGridContainer.set('state', lang.mixin({}, this.state));
          break;

        case 'phylogenetics':
          this.phylogeny1.set('state', lang.mixin({}, this.state));
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
        rightPanelContent: [NewsTemplate],
        leftPanelContent: [ContentsTemplate],
        pubmedTerm: 'h5n1'
      });

      /*this.genomesGridContainer = new GenomesGridContainer({
        title: 'Table',
        content: 'Genomes Table',
        visible: true
      });*/

      this.data = new OutbreaksTab({
        title: 'Data',
        id: this.viewer.id + '_data',
        templateString: DataTemplate
      });

      // Initialize Phylogenetic Tree Viewer
      const decorator = 'vipr:';
      const nodeVisualizations = {};

      nodeVisualizations['Host'] = {
        label: 'Host',
        description: 'the host of the virus',
        field: null,
        cladeRef: decorator + 'Host',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['Host Range'] = {
        label: 'Host_Range',
        description: 'the host range of the virus',
        field: null,
        cladeRef: decorator + 'Host_Range',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        sizes: null
      };

      nodeVisualizations['Region'] = {
        label: 'Region',
        description: 'the region of the virus',
        field: null,
        cladeRef: decorator + 'Region',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20c',
        sizes: null
      };

      nodeVisualizations['Country'] = {
        label: 'Country/State',
        description: 'the country of the virus',
        field: null,
        cladeRef: decorator + 'Country',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20c',
        sizes: null
      };

      nodeVisualizations['Year'] = {
        label: 'Year',
        description: 'the year of the virus',
        field: null,
        cladeRef: decorator + 'Year',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        colorsAlt: ['#FF0000', '#000000', '#00FF00'],
        sizes: [20, 60]
      };

      nodeVisualizations['Subtype'] = {
        label: 'Subtype',
        description: 'the sub type of the virus',
        field: null,
        cladeRef: decorator + 'Subtype',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        colorsAlt: ['#FF0000', '#000000', '#00FF00'],
        sizes: [20, 60]
      };

      const nodeLabels = {};

      nodeLabels['Host'] = {
        label: 'Host',
        description: 'to use the host as part of node names',
        propertyRef: 'vipr:Host',
        selected: false,
        showButton: true
      };

      nodeLabels['Host_Range'] = {
        label: 'Host Range',
        description: 'to use the host range as part of node names',
        propertyRef: 'vipr:Host_Range',
        selected: false,
        showButton: true
      };

      nodeLabels['Region'] = {
        label: 'Region',
        description: 'to use the region as part of node names',
        propertyRef: 'vipr:Region',
        selected: false,
        showButton: true
      };

      nodeLabels['Country'] = {
        label: 'Country',
        description: 'to use the country/state as part of node names',
        propertyRef: 'vipr:Country',
        selected: false,
        showButton: true
      };

      nodeLabels['Year'] = {
        label: 'Year',
        description: 'to use the year as part of node names',
        propertyRef: 'vipr:Year',
        selected: false,
        showButton: true
      };

      nodeLabels['Subtype'] = {
        label: 'Subtype',
        description: 'to use the subtype as part of node names',
        propertyRef: 'vipr:Subtype',
        selected: false,
        showButton: true
      };

      let options = {};
      options.minBranchLengthValueToShow = 0.001;
      options.initialNodeFillColorVisualization = 'Host_Range';
      options.phylogram = true;
      options.showConfidenceValues = false;
      options.showExternalLabels = true;
      options.showNodeName = true;
      options.showNodeVisualizations = true;
      options.showSequence = false;
      options.showSequenceAccession = true;
      options.showVisualizationsLegend = true;
      options.visualizationsLegendOrientation = 'vertical';
      options.visualizationsLegendXpos = 160;
      options.visualizationsLegendYpos = 30;
      options.initialCollapseDepth = 4;
      options.initialCollapseFeature = 'ird:Region';

      let settings = {};
      settings.border = '1px solid #909090';
      settings.showSequenceButton = false;
      settings.controls0Top = 10;
      settings.controls1Top = 10;
      settings.enableDownloads = true;
      settings.enableDynamicSizing = true;
      settings.enableMsaResidueVisualizations = true;
      settings.enableCollapseByFeature = true;
      settings.enableNodeVisualizations = true;
      settings.enableBranchVisualizations = true;
      settings.nhExportWriteConfidences = true;
      settings.readSimpleCharacteristics = true; // To be deprecated

      let phylogeneticsTabContainer = [];
      for (const [id, segment] of Object.entries(this.segments)) {
        const phylogenySegmentId = 'phylogeny' + id;
        this[phylogenySegmentId] = new OutbreaksPhylogenyTreeViewer({
          title: `Segment ${id} (${segment})`,
          id: this.viewer.id + '_' + phylogenySegmentId,
          phyloxmlTreeURL: '/public/js/p3/resources/images/outbreaks/h5n1/h5n1_segment_' + id + '.xml',
          updateState: true,
          settings: settings,
          options: options,
          nodeVisualizations: nodeVisualizations,
          specialVisualizations: nodeLabels
        });

        phylogeneticsTabContainer.push(this[phylogenySegmentId]);
      }

      this.phylogenetics = new OutbreaksTabContainer({
        title: 'Phylogenetics',
        id: this.viewer.id + '_phylogenetics',
        tabContainers: phylogeneticsTabContainer
      });

      this.resources = new OutbreaksTab({
        title: 'Resources',
        id: this.viewer.id + '_resources',
        templateString: ResourcesTemplate
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.data);
      this.viewer.addChild(this.phylogenetics);
      this.viewer.addChild(this.resources);
    }
  });
});
