define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './TabViewerBase',
  '../VariantLineageOverview', '../VariantLineageDetail', '../VariantLineageContainer', '../VariantResources',
  '../../util/QueryToEnglish'
], function (
  declare, lang,
  TabViewerBase,
  VariantLineageOverview, VariantLineageDetailView, VariantLineageContainer, VariantResources,
  QueryToEnglish
) {

  return declare([TabViewerBase], {

    perspectiveLabel: 'Variant Lineage of Concern',
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
          console.log("No view-tab supplied in State Object");
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
        case 'prevalence':
          if (!this.state.search && this.state.hashParams.filter) {
            this.state.search = this.state.hashParams.filter;
          } else {
            this.state.search = 'ne(country,All)'
          }
          activeTab.set('state', lang.mixin({}, this.state));
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
      this.queryNode.innerHTML = '<span class="searchField">SARS-CoV-2</span>'; // QueryToEnglish(search);
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
        title: 'Variant of Concern',
        id: this.viewer.id + '_lineage'
      })

      this.prevalence = new VariantLineageContainer({
        title: 'Prevalence',
        id: this.viewer.id + '_prevalence'
      });

      this.resources = new VariantResources({
        title: 'Resources',
        id: this.viewer.id + '_resources'
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.lineage);
      this.viewer.addChild(this.prevalence);
      this.viewer.addChild(this.resources);
    }
  });
});
