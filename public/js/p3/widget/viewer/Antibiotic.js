define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './TabViewerBase',
  '../AntibioticOverview', '../AMRPanelGridContainer', '../FeatureGridContainer', '../SpecialtyGeneGridContainer',
  '../../util/QueryToEnglish'
], function (
  declare, lang,
  TabViewerBase,
  AntibioticOverview, AMRPanelGridContainer, FeatureGridContainer, SpecialtyGeneGridContainer,
  QueryToEnglish
) {

  return declare([TabViewerBase], {

    perspectiveLabel: 'Antibiotic View',
    perspectiveIconClass: 'icon-selection-Antibiotic',

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
          // console.log("No view-tab supplied in State Object");
        }
      }

      this.setActivePanelState();
    },

    setActivePanelState: function () {
      var activeQueryState;

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';
      var activeTab = this[active];
      var antibioticName = this.state.search.split(',')[1].split(')')[0];

      switch (active) {
        case 'overview':
          activeTab.set('state', lang.mixin({}, this.state));
          break;
        case 'amr':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'eq(antibiotic,' + antibioticName + ')'
          }));
          break;
        case 'amrGenes':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'keyword(' + antibioticName + ')&eq(property,%22Antibiotic%20Resistance%22)'
          }));
          break;
        case 'amrRegions':
          activeTab.set('state', lang.mixin({}, this.state, {
            search: 'keyword(' + antibioticName + ')&eq(feature_type,classifier_predicted_region)'
          }));
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

      this.queryNode.innerHTML = QueryToEnglish(search);
      this.totalCountNode.innerHTML = '';
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments); // creates this.viewer

      this.overview = new AntibioticOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });

      this.amr = new AMRPanelGridContainer({
        title: 'AMR Phenotypes',
        id: this.viewer.id + '_amr'
      });

      this.amrGenes = new SpecialtyGeneGridContainer({
        title: 'AMR Genes',
        facetFields: ['source', 'evidence', 'classification', 'antibiotics_class', 'antibiotics'],
        id: this.viewer.id + '_amrGenes'
      });

      this.amrRegions = new FeatureGridContainer({
        title: 'AMR Regions',
        id: this.viewer.id + '_amrRegions',
        defaultFilter: ''
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.amr);
      this.viewer.addChild(this.amrGenes);
      this.viewer.addChild(this.amrRegions);
    }
  });
});
