define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './TabViewerBase',
  '../VariantLineageOverview', '../VariantLineageDetail', '../VariantLineageContainer',
  '../VariantDetail', '../VariantContainer',
  '../GenomeBrowser', '../VariantStructureContainer', '../VariantResources',
  '../../util/QueryToEnglish'
], function (
  declare, lang,
  TabViewerBase,
  VariantLineageOverview, VariantLineageDetailView, VariantLineageContainer,
  VariantDetailView, VariantContainer,
  VariantJBContainer, VariantStructure, VariantResources,
  QueryToEnglish
) {

  return declare([TabViewerBase], {

    perspectiveLabel: '',
    perspectiveIconClass: '',

    onSetState: function (attr, oldVal, state) {

      if (!state) {
        return;
      }

      if (!state.search) {
        this.queryNode.innerHTML = 'Error';
        this.totalCountNode.innerHTML = '';
      }

      // bypass setting attribute and invoke tabs with state
      this.buildHeaderContent(state.search);

      if (state.hashParams && state.hashParams.view_tab) {
        if (this[state.hashParams.view_tab]) {
          var vt = this[state.hashParams.view_tab];

          vt.set('visible', true);
          this.viewer.selectChild(vt);
        } else {
          console.log('No view-tab supplied in State Object');
        }
      }

      this.setActivePanelState();
    },

    setActivePanelState: function () {
      var activeQueryState;

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      var activeTab = this[active];

      activeQueryState = lang.mixin({}, this.state);

      switch (active) {
        case 'lineage_prevalence':
          if (!this.state.search && this.state.hashParams.filter) {
            this.state.search = this.state.hashParams.filter;
          } else {
            this.state.search = 'keyword(*)'
          }
          activeTab.set('state', lang.mixin({}, this.state));
          break;

        case 'variant_prevalence':
          this.state.search = 'keyword(*)'
          activeTab.set('state', lang.mixin({}, this.state));
          break;

        case 'jbrowse':
          activeQueryState = lang.mixin(this.state, {
            genome_id: '2697049.107626',
            hashParams: {
              view_tab: 'jbrowse',
              loc: 'NC_045512%3A1..29903',
              tracks: 'RefSeqGFF%2CActivesite%2CRegionofinterest%2CDomains%2CMutagenesisSite%2CVOCMarkers%2CHumanBCellEpitopes'
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

    buildHeaderContent: function (search) {
      this.queryNode.innerHTML = '<span class="searchField" style="font-size:large">SARS-CoV-2 Variants and Lineages of Concern </span>'; // QueryToEnglish(search);
      this.totalCountNode.innerHTML = '';
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments); // creates this.viewer

      this.overview = new VariantLineageOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });

      this.lineage = new VariantLineageDetailView({
        title: 'Lineages of Concern',
        id: this.viewer.id + '_lineage'
      })

      this.lineage_prevalence = new VariantLineageContainer({
        title: 'Covariants',
        id: this.viewer.id + '_lineage_prevalence'
      });

      // this.variant = new VariantDetailView({
      //   title: 'Variants of Concern',
      //   id: this.viewer.id + '_variant'
      // })

      this.variant_prevalence = new VariantContainer({
        title: 'Variants',
        id: this.viewer.id + '_variant_prevalence'
      })

      this.jbrowse  = new VariantJBContainer({
        title: 'Genome Browser',
        id: this.viewer.id + '_jbrowse'
      })
      this.structure = new VariantStructure({
        title: 'Protein Structure',
        id: this.viewer.id + '_structure'
      })

      /*
      this.structure = new VariantStructure({
        title: 'Protein Structure',
        id: this.viewer.id + '_structure'
      })

      this.phlyogeny = new VariantStructure({
        title: 'Phlyogeny',
        id: this.viewer.id + '_phlyogeny'
      })
*/
      this.resources = new VariantResources({
        title: 'Resources',
        id: this.viewer.id + '_resources'
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.lineage);
      this.viewer.addChild(this.lineage_prevalence);
      // this.viewer.addChild(this.variant);
      this.viewer.addChild(this.variant_prevalence);
      this.viewer.addChild(this.jbrowse);
      this.viewer.addChild(this.structure);
      // this.viewer.addChild(this.phlyogeny);
      this.viewer.addChild(this.resources);
    }
  });
});
