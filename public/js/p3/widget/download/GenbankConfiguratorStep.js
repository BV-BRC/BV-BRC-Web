define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './WizardStepBase',
  'dojo/text!./templates/GenbankConfiguratorStep.html',
  '../../util/DownloadFormats'
], function (
  declare,
  lang,
  WizardStepBase,
  template,
  DownloadFormats
) {
  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'options',
    stepTitle: 'Options',
    stepDescription: 'Configure GenBank download options',

    // State
    merged: false,

    onPreviousStepDataSet: function (data) {
      this._updateSummary(data);
    },

    onShow: function () {
      this.inherited(arguments);
      this._updateSummary(this.previousStepData);
    },

    _updateSummary: function (data) {
      if (!data) return;

      if (this.formatValueNode && data.format) {
        var formatInfo = DownloadFormats.getFormat(data.format);
        this.formatValueNode.textContent = formatInfo ? formatInfo.label : data.format;
      }

      if (this.recordsValueNode) {
        var recordsText = 'All records';
        if (data.scope === 'selected') {
          recordsText = this.formatNumber(data.selectionCount) + ' selected records';
        } else if (data.scope === 'random') {
          recordsText = 'Random ' + this.formatNumber(data.randomLimit) + ' records';
        } else if (data.totalCount) {
          recordsText = this.formatNumber(data.totalCount) + ' records';
        }
        this.recordsValueNode.textContent = recordsText;
      }
    },

    _onModeChange: function () {
      this.merged = this.mergedRadio.checked;
      this.notifyDataChanged();
    },

    validate: function () {
      return true;
    },

    getData: function () {
      return {
        genbankMerged: this.merged
      };
    },

    canSkip: function () {
      return false;
    },

    reset: function () {
      this.inherited(arguments);
      this.merged = false;
      if (this.multiRecordRadio) {
        this.multiRecordRadio.checked = true;
      }
    }
  });
});
