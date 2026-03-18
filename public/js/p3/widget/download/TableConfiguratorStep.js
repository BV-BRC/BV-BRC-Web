define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  './WizardStepBase',
  'dojo/text!./templates/TableConfiguratorStep.html',
  '../../util/DownloadFormats'
], function (
  declare,
  lang,
  WizardStepBase,
  template,
  DownloadFormats
) {
  /**
   * TableConfiguratorStep - Step 3 configurator for tabular formats (TSV, CSV, Excel)
   *
   * For now, this is a simple confirmation step. Future enhancements:
   * - Column selection
   * - Sort order configuration
   * - Filter options
   */

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'options',
    stepTitle: 'Options',
    stepDescription: 'Configure table download options',

    // This step can be skipped for simple table downloads
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
        this.formatValueNode.textContent = formatInfo ? formatInfo.label : data.format.toUpperCase();
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
     * Validate - table config is always valid
     */
    validate: function () {
      return true;
    },

    /**
     * Get step data
     */
    getData: function () {
      return {
        // No additional configuration for basic table download
        // Future: column selection, sort order, etc.
      };
    },

    /**
     * Check if this step can be skipped
     */
    canSkip: function () {
      // Table downloads don't require configuration
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
