define([
  'dojo/_base/declare', './JobResult'
], function (declare, JobResult) {
  return declare([JobResult], {
    containerType: 'DifferentialExpression',
    getExperimentId: function () {
      return this.data.path + this.data.name;
    },
    getExperimentName: function () {
      return this.data.name;
    },
    setupResultType: function () {
      // console.log("[DifferentialExpression] setupResultType()");
      this._resultMetaTypes = { experiment: { label: 'Experiment' } };
      this._appLabel = 'Differential Expression';
      this._autoLabels = {};
    }
  });
});
