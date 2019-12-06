define([
  'dojo/_base/declare', './JobResult'
], function (declare, JobResult) {
  return declare([JobResult], {
    containerType: 'ComprehensiveGenomeAnalysis',
    getGenomeId: function () {
      var id;
      this._resultObjects.some(function (o) {
        if (o.type == 'genome') {
          id = o.autoMeta.genome_id;
          return true;
        }
        return false;
      });
      if (id) {
        return id;
      }
      throw Error('Missing ID');
    },
    getReportPath: function () {
      var path;
      this._resultObjects.some(function (o) {
        if (o.type == 'html') {
          path = o.path;
          return true;
        }
        return false;
      });
      if (path) {
        return path;
      }
      throw Error('Missing Report Path');
    }
  });
});
