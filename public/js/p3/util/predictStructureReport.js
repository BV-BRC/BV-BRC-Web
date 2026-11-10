/**
 * predictStructureReport: pure helpers for the Jobs page REPORT action on a
 * completed PredictStructure job. Kept free of Dojo so they can be unit tested.
 *
 * A job's results live in the hidden folder <output_path>/.<output_file>, and the
 * service writes report.html at the top of it.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function () { return factory(); });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PredictStructureReport = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  function shouldShow(selection) {
    return !!selection && selection.length === 1 &&
      selection[0].app === 'PredictStructure' && selection[0].status === 'completed';
  }

  // Unencoded workspace path of the report, or null if the job lacks output params.
  function reportPath(job) {
    var params = job && job.parameters;
    if (!params || !params.output_path || !params.output_file) {
      return null;
    }
    return params.output_path.replace(/\/+$/, '') + '/.' + params.output_file + '/report.html';
  }

  return {
    shouldShow: shouldShow,
    reportPath: reportPath
  };
}));
