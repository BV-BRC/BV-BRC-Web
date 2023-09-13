define([
  'dojo/_base/declare', './TabViewerBase', 'dojo/on', 'dojo/topic',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', '../../util/QueryToEnglish',
  '../PageGrid', '../formatter', '../SubsystemGridContainer', '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang'
], function (
  declare, TabViewerBase, on, Topic,
  domClass, ContentPane, domConstruct, QueryToEnglish,
  Grid, formatter, SubsystemGridContainer,
  PathJoin, xhr, lang
) {
  return declare([TabViewerBase], {
    baseClass: 'SubsystemList',
    disabled: false,
    containerType: 'subsystem_data',
    query: null,
    defaultTab: 'subsystem',
    perspectiveLabel: 'Subsystem List View',
    perspectiveIconClass: 'icon-selection-Sequence',
    totalFeatures: 0,
    warningContent: 'Your query returned too many results for detailed analysis.',
    _setQueryAttr: function (query) {
      // console.log(this.id, " _setQueryAttr: ", query, this);
      // if (!query) { console.log("GENOME LIST SKIP EMPTY QUERY: ");  return; }
      // console.log("GenomeList SetQuery: ", query, this);

      this._set('query', query);
      if (!this._started) {
        return;
      }

      var _self = this;
      // console.log('spGeneList setQuery - this.query: ', this.query);
      // var url = PathJoin(this.apiServiceUrl, 'subsystem', '?' + (this.query) + '&limit(10000)'); // &facet((field,genome_id),(limit,35000))");
      var url = PathJoin('https://bv-brc.org/api/', 'subsystem', '?' + (this.query) + '&limit(10000)'); // &facet((field,genome_id),(limit,35000))");

      // console.log("url: ", url);
      xhr.get(url, {
        headers: {
          accept: 'application/solr+json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(function (res) {
        if (res && res.response && res.response.docs) {
          var features = res.response.docs;
          if (features) {
            _self._set('totalFeatures', res.response.numFound);
          }
        } else {
          console.warn('Invalid Response for: ', url);
        }
      }, function (err) {
        console.error('Error Retreiving Subsystems: ', err);
      });

    },

    onSetState: function (attr, oldVal, state) {
      // console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);

      this.inherited(arguments);
      this.set('query', state.search);
      this.setActivePanelState();
    },

    onSetQuery: function (attr, oldVal, newVal) {
      var content = QueryToEnglish(newVal);
      this.queryNode.innerHTML = '<span class="queryModel">Subsystems: </span>  ' + content;
    },

    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'subsystem';
      console.log('Active: ', active, 'state: ', this.state);

      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active);
        return;
      }

      switch (active) {
        case 'subsystem':
          activeTab.set('state', this.state);
          break;
      }
      // console.log("Set Active State COMPLETE");
    },

    // onSetSpecialtyGeneIds: function (attr, oldVal, genome_ids) {
    // console.log("onSetGenomeIds: ", genome_ids, this.feature_ids, this.state.feature_ids);
    // this.state.feature_ids = feature_ids;
    // this.setActivePanelState();
    // },

    postCreate: function () {
      this.inherited(arguments);

      this.watch('query', lang.hitch(this, 'onSetQuery'));
      this.watch('totalFeatures', lang.hitch(this, 'onSetTotalSubsystems'));


      this.subsystem = new SubsystemGridContainer({
        title: 'Subsystems',
        id: this.viewer.id + '_subsystem',
        state: this.state,
        disable: false
      });
      this.viewer.addChild(this.subsystem);

    },
    onSetTotalSubsystems: function (attr, oldVal, newVal) {
      // console.log("ON SET TOTAL GENOMES: ", newVal);
      this.totalCountNode.innerHTML = ' ( ' + newVal + '  Subsystems) ';
    },
    hideWarning: function () {
      if (this.warningPanel) {
        this.removeChild(this.warningPanel);
      }
    },

    showWarning: function (msg) {
      if (!this.warningPanel) {
        this.warningPanel = new ContentPane({
          style: 'margin:0px; padding: 0px;margin-top: -10px;',
          content: '<div class="WarningBanner">' + this.warningContent + '</div>',
          region: 'top',
          layoutPriority: 3
        });
      }
      this.addChild(this.warningPanel);
    }
  });
});
