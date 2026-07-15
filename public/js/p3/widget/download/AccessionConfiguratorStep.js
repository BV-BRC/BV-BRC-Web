define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './WizardStepBase',
  'dojo/text!./templates/AccessionConfiguratorStep.html',
  '../../util/DownloadFormats'
], function (
  declare,
  lang,
  WizardStepBase,
  template,
  DownloadFormats
) {
  /**
   * AccessionConfiguratorStep - Step 3 configurator for accession list formats
   *
   * This is a simple confirmation step for accession list downloads.
   * Accession lists don't require any configuration - they just output
   * a list of IDs.
   *
   * This step CAN be skipped to go directly to download.
   */

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'options',
    stepTitle: 'Options',
    stepDescription: 'Accession list options',

    // This step can be skipped for accession downloads
    isSkippable: true,

    /**
     * Called when previous step data is set
     */
    onPreviousStepDataSet: function (data) {
      this._updateSummary(data);
    },

    /**
     * Called when step becomes visible
     */
    onShow: function () {
      this.inherited(arguments);
      this._updateSummary(this.previousStepData);
    },

    /**
     * Update the summary display
     */
    _updateSummary: function (data) {
      if (!data) return;

      // Format
      if (this.formatValueNode && data.format) {
        var formatInfo = DownloadFormats.getFormat(data.format);
        this.formatValueNode.textContent = formatInfo ? formatInfo.label : data.format;
      }

      // Records
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

    /**
     * Validate - accession config is always valid
     */
    validate: function () {
      return true;
    },

    /**
     * Get step data
     */
    getData: function () {
      return {
        // No additional configuration for accession list downloads
      };
    },

    /**
     * Check if this step can be skipped
     */
    canSkip: function () {
      // Accession list downloads don't require configuration
      return true;
    },

    /**
     * Reset
     */
    reset: function () {
      this.inherited(arguments);
    }
  });
});
