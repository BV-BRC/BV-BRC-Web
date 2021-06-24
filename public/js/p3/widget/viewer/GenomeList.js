define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/request',
  './TabViewerBase', '../../util/QueryToEnglish', '../../util/PathJoin',
  '../GenomeListOverview', '../GenomeGridContainer'
], function (
  declare, lang, xhr,
  TabViewerBase, QueryToEnglish, PathJoin,
  GenomeListOverview, GenomeGridContainer
) {

  return declare([TabViewerBase], {
    perspectiveLabel: 'Genome List View',
    perspectiveIconClass: 'icon-selection-GenomeList',
    defaultTab: 'genomes',
    createOverviewPanel: function () {
      return new GenomeListOverview({
        content: 'Genome List Overview',
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });
    },
    _setQueryAttr: function (query, force) {
      if (!query) {
        console.log('GENOME LIST SKIP EMPTY QUERY: ');
        return;
      }
      if (query && !force && (query == this.query) ) {
        return;
      }

      this._set('query', query);
      var _self = this;

      var url = PathJoin(this.apiServiceUrl, 'genome', '?' + (this.query) + '&select(genome_id)&limit(' + this.maxGenomesPerList + 1 + ')');

      xhr.post(PathJoin(this.apiServiceUrl, 'genome'), {
        headers: {
          accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
        data: (this.query) + '&select(genome_id)&limit(1)'

      }).then(function (res) {
        if (res && res.response && res.response.docs) {
          var genomes = res.response.docs;
          if (genomes) {
            _self._set('total_genomes', res.response.numFound);
          }
        } else {
          console.warn('Invalid Response for: ', url);
        }
      }, function (err) {
        console.error('Error Retreiving Genomes: ', err);
      });
    },
    onSetState: function (attr, oldVal, state) {
      this.inherited(arguments);
      // console.log(state.search)
      this.set('query', state.search);

      this.setActivePanelState();
    },
    onSetQuery: function (attr, oldVal, newVal) {
      const content = QueryToEnglish(newVal);
      // this.overview.set('content', '<div style="margin:4px;"><span class="queryModel">Genomes: </span> ' + content + '</div>');
      this.queryNode.innerHTML = '<span class="queryModel">Genomes: </span>  ' + content;
    },
    onSetTotalGenomes: function (attr, oldVal, newVal) {
      this.totalCountNode.innerHTML = ' ( ' + newVal + ' Genomes ) ';
    },
    setActivePanelState: function () {
      var active = (this.state && this.state.hashParams && this.state.hashParams.view_tab) ? this.state.hashParams.view_tab : this.defaultTab;
      var activeTab = this[active];

      if (!activeTab) {
        console.log('ACTIVE TAB NOT FOUND: ', active)
        return;
      }
      const activeQueryState = lang.mixin({}, this.state, { hashParams: lang.mixin({}, this.state.hashParams) })
      // console.log(activeTab, activeQueryState)

      // switch (active) {
      //   default:
      //     activeTab.set('state', activeQueryState);
      //     break;
      // }
      activeTab.set('state', activeQueryState)

      if (activeTab) {
        var pageTitle = 'Genome List ' + activeTab.title;
        if (window.document.title !== pageTitle) {
          window.document.title = pageTitle;
        }
      }
    },
    postCreate: function () {
      this.inherited(arguments)

      this.watch('query', lang.hitch(this, 'onSetQuery'))
      this.watch('total_genomes', lang.hitch(this, 'onSetTotalGenomes'))

      // this.overview = this.createOverviewPanel()
      this.genomes = new GenomeGridContainer({
        title: 'Genomes',
        id: this.viewer.id + '_genomes',
        state: this.state,
        disable: false
      })

      // this.viewer.addChild(this.overview)
      this.viewer.addChild(this.genomes)
    }
  });
});
