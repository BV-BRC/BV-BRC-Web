define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './_FeatureList', './TabViewerBase',
  '../FeatureListOverview', '../GroupFeatureGridContainer',
  '../CompareRegionContainer'
], function (
  declare, lang,
  FeatureList, TabViewerBase,
  Overview, GroupFeatureGridContainer,
  CompareRegionContainer
) {

  return declare([FeatureList], {
    defaultTab: 'overview',
    groupPath: null,
    perspectiveLabel: 'Feature Group View',
    perspectiveIconClass: 'icon-selection-FeatureList',
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

      var parts = '/' + state.pathname.split('/').slice(2).map(decodeURIComponent).join('/');

      this.set('groupPath', parts);

      state.search = 'in(feature_id,FeatureGroup(' + encodeURIComponent(parts) + '))';
      state.ws_path = parts;
      // console.log("state.search: ", state.search);
      this.inherited(arguments);

      this.setActivePanelState();
    },

    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'overview';

      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active);
        return;
      }
      switch (active) {
        case 'features':
          var activeQueryState;
          activeQueryState = lang.mixin({}, this.state, {
            search: this.state.search,
            hashParams: lang.mixin({}, this.state.hashParams, {
              filter: 'false'
            })
          });
          activeTab.set('state', activeQueryState);
          break;
        default:
          var activeQueryState;
          // if(this.state && this.state.feature_ids){
          if (this.state) {
            activeQueryState = this.state;
          }

          if (activeQueryState) {
            activeTab.set('state', activeQueryState);
          } else {
            console.warn('MISSING activeQueryState for PANEL: ' + active);
          }
          break;
      }

      if (activeTab) {
        var pageTitle = 'Feature Group ' + activeTab.title;
        // console.log("Feature Group: ", pageTitle);
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },

    buildHeaderContent: function () {
      return (this.groupPath).split('Feature Groups/')[1];
    },

    postCreate: function () {
      TabViewerBase.prototype.postCreate.call(this, arguments);
      this.watch('query', lang.hitch(this, 'onSetQuery'));
      this.watch('totalFeatures', lang.hitch(this, 'onSetTotalFeatures'));

      this.overview = new Overview({
        content: 'Feature Group Overview',
        title: 'Overview',
        isFeatureGroup: true,
        id: this.viewer.id + '_overview'
      });

      this.features = new GroupFeatureGridContainer({
        title: 'Features',
        id: this.viewer.id + '_features',
        tooltip: 'Features tab contains a list of all features (e.g., CDS, rRNA, tRNA, etc.) associated with a given Phylum, Class, Order, Family, Genus, Species or Genome.',
        disabled: false,
        onRefresh: lang.hitch(this, function () {
          // console.log("Refreshed Feature Grid....")
          this.set('query', this.state.search, true);
        })
      });

      this.compareRegionViewer = new CompareRegionContainer({
        title: 'Compare Region Viewer',
        style: 'overflow-y:auto',
        id: this.viewer.id + '_compareRegionViewer'
      });

      this.viewer.addChild(this.overview);
      this.viewer.addChild(this.features);
      this.viewer.addChild(this.compareRegionViewer);
    }
  });
});
