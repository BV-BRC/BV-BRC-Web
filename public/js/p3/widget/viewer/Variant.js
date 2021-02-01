define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './TabViewerBase',
  '../VariantContainer',
  '../../util/QueryToEnglish'
], function (
  declare, lang,
  TabViewerBase,
  VariantContainer,
  QueryToEnglish
) {

  return declare([TabViewerBase], {

    perspectiveLabel: 'Variant',
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
        case 'overview':
          this.state.search = 'keyword(*)'
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

      this.overview = new VariantContainer({
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });

      this.viewer.addChild(this.overview);
    }
  });
});
