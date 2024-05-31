define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/request/xhr', 'dojox/xml/DomParser', 'dojo/dom-construct',
  '../../viewer/TabViewerBase', '../OutbreaksOverview', '../OutbreaksTab',
  'dojo/text!./OverviewDetails.html', 'dojo/text!./Resources.html', 'dojo/text!./News.html', 'dojo/text!./Contents.html',
  'dojo/text!./Data.html', 'dojo/text!./CommandLineTool.html', '../OutbreaksTabContainer', './genomes/GenomesGridContainer',
  '../OutbreaksPhylogenyTreeViewer'
], function (
  declare, lang, xhr, domParser, domConstruct,
  TabViewerBase, OutbreaksOverview, OutbreaksTab,
  OverviewDetailsTemplate, ResourcesTemplate, NewsTemplate, ContentsTemplate,
  DataTemplate, CommandLineToolTemplate, OutbreaksTabContainer, GenomesGridContainer,
  OutbreaksPhylogenyTreeViewer
) {
  return declare([TabViewerBase], {
    perspectiveLabel: '',
    perspectiveIconClass: '',
    title: 'H5N1 2024 Outbreak',
    segments: {1: 'PB2', 2: 'PB1', 3: 'PA', 4: 'HA', 5: 'NP', 6: 'NA', 7: 'M1, M2', 8: 'NS1, NEP'},
    googleNewsCount: 100,
    googleNewsRSS: 'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US%3Aen&oc=11&q=%22h5n1%22%20AND%20(site:https://www.cidrap.umn.edu/avian-influenza-bird-flu%20OR%20site%3Afda.gov%20OR%20site%3Awww.who.in%20OR%20site%3Anews.un.org%20OR%20site%3Acdc.gov%20OR%20site%3Aceirr-network.org%20OR%20site%3Awww.nature.com%2Farticles%2F)%20AND%20when%3A1y&hl=en-US&gl=US&ceid=US%3Aen',

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

      this.clt = new OutbreaksTab({
        title: 'Command Line Tool',
        id: this.viewer.id + '_clt',
        templateString: CommandLineToolTemplate
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

      nodeVisualizations['Host_Group'] = {
        label: 'Host Group',
        description: 'the host group of the virus',
        field: null,
        cladeRef: decorator + 'Host_Group',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        sizes: null
      };

      nodeVisualizations['Host_Group_Domestic_vs_Wild'] = {
        label: 'Host Group (Domestic vs Wild)',
        description: 'the host range of the virus',
        field: null,
        cladeRef: decorator + 'Host_Group_Domestic_vs_Wild',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20',
        sizes: null
      };

      nodeVisualizations['Region'] = {
        label: 'Region',
        description: 'the geographic region of the virus',
        field: null,
        cladeRef: decorator + 'Region',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category20c',
        sizes: null
      };

      nodeVisualizations['Country'] = {
        label: 'Country',
        description: 'the country of the virus',
        field: null,
        cladeRef: decorator + 'Country',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['State'] = {
        label: 'State',
        description: 'the state',
        field: null,
        cladeRef: decorator + 'State',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        sizes: null
      };

      nodeVisualizations['Year'] = {
        label: 'Year',
        description: 'the year of the virus',
        field: null,
        cladeRef: decorator + 'Year',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50c',
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
        colors: 'category50',
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

      nodeLabels['Host_Group'] = {
        label: 'Host Group',
        description: 'to use the host range as part of node names',
        propertyRef: 'vipr:Host_Group',
        selected: false,
        showButton: true
      };

      nodeLabels['Host_Group_Domestic_vs_Wild'] = {
        label: 'Host Group (Dom vs Wild)',
        description: 'to use the host group (domestic vs wild) as part of node names',
        propertyRef: 'vipr:Host_Group_Domestic_vs_Wild',
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
        description: 'to use the country as part of node names',
        propertyRef: 'vipr:Country',
        selected: false,
        showButton: true
      };

      nodeLabels['State'] = {
        label: 'State',
        description: 'to use the state as part of node names',
        propertyRef: 'vipr:State',
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

      // Add special node for Segment 4
      const nodeVisualizationsSegment4 = {...nodeVisualizations};
      nodeVisualizationsSegment4['H5_clade'] = {
        label: 'H5 Clade',
        description: 'the H5 clade',
        field: null,
        cladeRef: decorator + 'H5_clade',
        regex: false,
        shapes: ['square', 'diamond', 'triangle-up', 'triangle-down', 'cross', 'circle'],
        colors: 'category50',
        colorsAlt: ['#FF0000', '#000000', '#00FF00'],
        sizes: [20, 60]
      };

      const nodeLabelsSegment4 = {...nodeLabels};
      nodeLabelsSegment4['H5_clade'] = {
        label: 'H5 clade',
        description: 'to use the H5 clade as part of node names',
        propertyRef: 'vipr:H5_clade',
        selected: true,
        showButton: true
      };

      let options = {};
      options.minBranchLengthValueToShow = 0.001;
      options.initialNodeFillColorVisualization = 'Host Group (Domestic vs Wild)';
      options.phylogram = true;
      options.showConfidenceValues = false;
      options.showExternalLabels = true;
      options.showNodeName = true;
      options.showNodeVisualizations = true;
      options.showVisualizationsLegend = true;
      options.visualizationsLegendOrientation = 'vertical';
      options.visualizationsLegendXpos = 160;
      options.visualizationsLegendYpos = 30;

      let settings = {};
      settings.border = '1px solid #909090';
      settings.showSequenceButton = false;
      settings.controls0Top = 10;
      settings.controls1Top = 10;
      settings.enableDownloads = true;
      settings.enableDynamicSizing = true;
      settings.enableMsaResidueVisualizations = false;
      settings.enableCollapseByFeature = true;
      settings.enableNodeVisualizations = true;
      settings.enableBranchVisualizations = false;
      settings.nhExportWriteConfidences = true;
      settings.enableSubtreeDeletion = false;
      settings.showShortenNodeNamesButton = false;

      let phylogeneticsTabContainer = [];
      for (const [id, segment] of Object.entries(this.segments)) {
        const phylogenySegmentId = 'phylogeny' + id;
        this[phylogenySegmentId] = new OutbreaksPhylogenyTreeViewer({
          title: `Segment ${id} (${segment})`,
          id: this.viewer.id + '_' + phylogenySegmentId,
          phyloxmlTreeURL: 'https://www.bv-brc.org/api/content/phyloxml_trees/H5N1/h5n1_segment_' + id + '.xml',
          updateState: true,
          settings: settings,
          options: options,
          nodeVisualizations: id === '4' ? nodeVisualizationsSegment4 : nodeVisualizations,
          specialVisualizations: id === '4' ? nodeLabelsSegment4 : nodeLabels
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
      this.viewer.addChild(this.phylogenetics);
      this.viewer.addChild(this.data);
      this.viewer.addChild(this.resources);
      this.viewer.addChild(this.clt);

      xhr.get('/google/news/?url=' + encodeURIComponent(this.googleNewsRSS) + '&count=' + this.googleNewsCount,
        {handleAs: 'xml'})
        .then(lang.hitch(this, function (data) {
          // TODO: move parsing to server side
          const doc = domParser.parse(data);
          const items = Array.from(doc.getElementsByTagName('item'));

          // Filter out before 2023 and sort items by pubDate
          const filteredItems = items
            .reduce((acc, item) => {
              const pubDateText = this.getNode(item, 'pubDate');
              const pubDate = new Date(pubDateText);

              // Only include items with pubDate in 2023 or later
              if (pubDate.getFullYear() >= 2023) {
                const link = this.getNode(item, 'link');
                const title = this.getNode(item, 'title');

                acc.push({link, title, pubDate});
              }
              return acc;
            }, [])
            .sort((a, b) => b.pubDate - a.pubDate);

          // Determine the number of items to process
          const numItems = Math.min(this.googleNewsCount, filteredItems.length);
          const newsList = domConstruct.create('ul');
          const options = {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'};
          for (let i = 0; i < numItems; ++i) {
            const li = domConstruct.create('li', {}, newsList);
            const pubDate = filteredItems[i].pubDate.toLocaleDateString('en-US', options);
            domConstruct.create('div', {
              innerHTML: pubDate
            }, li);
            domConstruct.create('a', {
              href: filteredItems[i].link,
              target: '_blank',
              innerHTML: filteredItems[i].title
            }, li);
          }
          domConstruct.place(newsList, 'newsList');
        })).catch(error => {
        console.log(error);
      });
    },

    getNode: function (node, tag) {
      return node.getElementsByTagName(tag)[0].childNodes[0].nodeValue;
    }
  });
});
