define([
  'dojo/_base/declare', './TabViewerBase', 'dojo/on', 'dojo/topic',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', '../../util/QueryToEnglish',
  '../PageGrid', '../formatter', '../SequenceGridContainer', '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang'
], function (
  declare, TabViewerBase, on, Topic,
  domClass, ContentPane, domConstruct, QueryToEnglish,
  Grid, formatter, SequenceGridContainer,
  PathJoin, xhr, lang
) {
  return declare([TabViewerBase], {
    baseClass: 'SequenceList',
    disabled: false,
    containerType: 'sequence_data',
    query: null,
    defaultTab: 'sequences',
    perspectiveLabel: 'Sequence List View',
    perspectiveIconClass: 'icon-selection-SequenceList',
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

      var url = PathJoin(this.apiServiceUrl, 'genome_sequence', '?' + (this.query) + '&limit(1)'); // &facet((field,genome_id),(limit,35000))");

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
        console.error('Error Retreiving Genomic Sequences: ', err);
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
      this.queryNode.innerHTML = '<span class="queryModel">Genomic Sequences: </span>  ' + content;
    },

    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'sequences';
      console.log('Active: ', active, 'state: ', this.state);

      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active);
        return;
      }

      switch (active) {
        case 'sequences':
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
      this.watch('totalFeatures', lang.hitch(this, 'onSetTotalSequences'));


      this.sequences = new SequenceGridContainer({
        title: 'Sequences',
        id: this.viewer.id + '_sequences',
        state: this.state,
        disable: false
      });
      this.viewer.addChild(this.sequences);

    },
    onSetTotalSequences: function (attr, oldVal, newVal) {
      // console.log("ON SET TOTAL GENOMES: ", newVal);
      this.totalCountNode.innerHTML = ' ( ' + newVal + '  Sequences ) ';
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
