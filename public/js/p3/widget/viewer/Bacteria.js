define([
  'dojo/_base/declare',
  './Taxonomy', '../BacteriaOverview'
], function (
  declare,
  Taxonomy, BacteriaOverview
) {
  return declare([Taxonomy], {
    perspectiveLabel: 'Bacteria View',
    createOverviewPanel: function () {
      return new BacteriaOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });
    },
  });
});
