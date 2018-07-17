define([
  'dojo/_base/declare', './TabViewerBase', 'dojo/topic',
  'dijit/layout/ContentPane',
  '../TaxonGridContainer', '../../util/QueryToEnglish',
  '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang'
], function (
  declare, TabViewerBase, Topic,
  ContentPane,
  TaxonGridContainer, QueryToEnglish,
  PathJoin, xhr, lang
) {
  return declare([TabViewerBase], {
    baseClass: 'TaxonList',
    disabled: false,
    containerType: 'taxonomy_data',
    query: null,
    defaultTab: 'taxons',
    total_taxons: null,
    perspectiveLabel: 'Taxon List View',
    perspectiveIconClass: 'icon-selection-Taxonomy',
    warningContent: 'Your query returned too many results for detailed analysis.',
    _setQueryAttr: function (query) {
      this._set('query', query);
      if (!this._started) {
        return;
      }

      var _self = this;

      var url = PathJoin(this.apiServiceUrl, 'taxonomy', '?' + (this.query) + '&gt(genomes,1)&limit(1)'); // &facet((field,genome_id),(limit,35000))");

      xhr.get(url, {
        headers: {
          accept: 'application/solr+json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(function (res) {

        if (res && res.response && res.response.docs && (res.response.docs.length > 0)) {
          var features = res.response.docs;
          _self.set('total_taxons', features ? res.response.numFound : 0);

        } else {
          _self.set('total_taxons', 0);
        }
      }, function (err) {
        console.error('Error Retreiving Genomes: ', err);
      });

    },

    onSetState: function (attr, oldVal, state) {
      this.set('query', state.search);
      this.setActivePanelState();

      this.inherited(arguments);
    },

    onSetQuery: function (attr, oldVal, newVal) {
      if (this.overview) {
        this.overview.set('content', '<div style="margin:4px;">Feature List Query: ' + decodeURIComponent(newVal) + '</div>');
      }
      var content = QueryToEnglish(newVal);
      this.queryNode.innerHTML = '<span class="queryModel">Taxa: </span>  ' + content;
    },

    setActivePanelState: function () {

      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : 'taxons';
      // console.log("Active: ", active, "state: ", this.state);

      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active);
        return;
      }

      switch (active) {
        default:
          activeTab.set('state', lang.mixin({}, this.state, { search: this.state.search + '&gt(genomes,1)' }));
          break;
      }
    },

    postCreate: function () {
      this.inherited(arguments);
      this.watch('total_taxons', lang.hitch(this, 'onSetTotalTaxons'));
      this.watch('query', lang.hitch(this, 'onSetQuery'));
      this.taxons = new TaxonGridContainer({
        title: 'Taxa',
        id: this.viewer.id + '_taxons',
        disabled: false
      });

      this.viewer.addChild(this.taxons);
    },
    onSetTotalTaxons: function (attr, oldVal, newVal) {
      this.totalCountNode.innerHTML = ' ( ' + newVal + ' Taxa ) ';
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
    },
    onSetAnchor: function (evt) {
      // console.log("onSetAnchor: ", evt, evt.filter);
      evt.stopPropagation();
      evt.preventDefault();
      // var f = evt.filter;
      var parts = [];
      var q;
      if (this.query) {
        q = (this.query.charAt(0) == '?') ? this.query.substr(1) : this.query;
        if (q != 'keyword(*)') {
          parts.push(q);
        }
      }
      if (evt.filter && evt.filter != 'false') {
        parts.push(evt.filter);
      }

      // console.log("parts: ", parts);

      if (parts.length > 1) {
        q = '?and(' + parts.join(',') + ')';
      } else if (parts.length == 1) {
        q = '?' + parts[0];
      } else {
        q = '';
      }

      // console.log("SetAnchor to: ", q);
      var hp;
      if (this.hashParams && this.hashParams.view_tab) {
        hp = { view_tab: this.hashParams.view_tab };
      } else {
        hp = {};
      }
      var l = window.location.pathname + q + '#' + Object.keys(hp).map(function (key) {
        return key + '=' + hp[key];
      }, this).join('&');
      // console.log("NavigateTo: ", l);
      Topic.publish('/navigate', { href: l });
    }
  });
});
