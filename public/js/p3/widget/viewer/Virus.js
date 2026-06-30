define([
  'dojo/_base/declare',
  './Taxonomy', '../VirusOverview', '../PriorityPathogen'
], function (
  declare,
  Taxonomy, VirusOverview, PriorityPathogen
) {
  return declare([Taxonomy], {
    perspectiveLabel: 'Virus View',
    postCreate: function () {
      this.inherited(arguments);

      this.priorityPathogen = new PriorityPathogen({
        title: 'Priority Pathogens',
        id: this.viewer.id + '_priorityPathogen',
        state: this.state
      });
    },

    onSetTaxonomy: function (attr, oldVal, taxonomy) {
      this.inherited(arguments);
      const onVirusPage = this.state && this.state.pathname && /^\/Virus\//.test(this.state.pathname);
      this._toggleTab(this.priorityPathogen, onVirusPage, 1);

      const requestedTab = this.state && this.state.hashParams && this.state.hashParams.view_tab;
      if (onVirusPage && requestedTab === 'priorityPathogen') {
        this.viewer.selectChild(this.priorityPathogen);
      }
    },
    createOverviewPanel: function () {
      return new VirusOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });
    },
  });
});
