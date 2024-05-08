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

      let phylogeneticsTabContainer = [];
      for (const [id, segment] of Object.entries(this.segments)) {
        const phylogenySegmentId = 'phylogeny' + id;
        this[phylogenySegmentId] = new OutbreaksPhylogenyTreeViewer({
          title: `Segment ${id} (${segment})`,
          id: this.viewer.id + '_' + phylogenySegmentId,
          phyloxmlTreeURL: '/public/js/p3/resources/images/outbreaks/h5n1/h5n1_segment_' + id + '.xml',
          updateState: true
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
