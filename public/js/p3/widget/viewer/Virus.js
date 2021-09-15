define([
  'dojo/_base/declare',
  './Taxonomy', '../VirusOverview'
], function (
  declare,
  Taxonomy, VirusOverview
) {
  return declare([Taxonomy], {
    perspectiveLabel: 'Virus View',
    createOverviewPanel: function () {
      return new VirusOverview({
        title: 'Overview',
        id: this.viewer.id + '_overview'
      });
    },
  });
});
