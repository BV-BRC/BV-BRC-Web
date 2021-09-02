define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './TabViewerBase', '../../util/QueryToEnglish', '../../DataAPI',
  '../GenomeListOverview', '../GenomeGridContainer'
], function (
  declare, lang,
  TabViewerBase, QueryToEnglish, DataAPI,
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
    onSetState: function (attr, oldVal, state) {
      this.inherited(arguments);
      this.set('query', state.search);

      // update genome count on header
      DataAPI.query('genome', state.search, { select: ['genome_id'], limit: 1 })
        .then(lang.hitch(this, (res) => {
          this._set('total_genomes', res.total_items);
        }))

      this.setActivePanelState();
    },
    onSetQuery: function (attr, oldVal, newVal) {
      const content = QueryToEnglish(newVal);
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
