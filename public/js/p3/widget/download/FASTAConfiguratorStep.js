define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/query',
  './WizardStepBase',
  'dojo/text!./templates/FASTAConfiguratorStep.html',
  '../../util/DownloadFormats'
], function (
  declare,
  lang,
  on,
  domClass,
  query,
  WizardStepBase,
  template,
  DownloadFormats
) {
  /**
   * FASTAConfiguratorStep - Step 3 configurator for FASTA formats
   *
   * Allows users to:
   * - Use default definition line format
   * - Build custom definition lines with field selection
   */

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'options',
    stepTitle: 'Options',
    stepDescription: 'Configure FASTA download options',

    // State
    defLineFormat: 'default',
    customFields: null,
    delimiter: '|',

    // Event handlers
    _handlers: null,

    // DefinitionLineBuilder widget (lazy loaded)
    _defLineBuilder: null,

    postCreate: function () {
      this.inherited(arguments);
      this._handlers = [];
      this.customFields = [];
      this._setupEventHandlers();
    },

    /**
     * Setup event handlers
     */
    _setupEventHandlers: function () {
      var self = this;

      // Default option click
      if (this.defaultDefLineOption) {
        var h1 = on(this.defaultDefLineOption, 'click', function () {
          self._selectDefLineFormat('default');
        });
        this._handlers.push(h1);
      }

      // Custom option click
      if (this.customDefLineOption) {
        var h2 = on(this.customDefLineOption, 'click', function () {
          self._selectDefLineFormat('custom');
        });
        this._handlers.push(h2);
      }
    },

    /**
     * Called when previous step data is set
     */
    onPreviousStepDataSet: function (data) {
      this._updateSummary(data);
      this._updateDefaultPreview();
    },

    /**
     * Called when step becomes visible
     */
    onShow: function () {
      this.inherited(arguments);
      this._updateSummary(this.previousStepData);
      this._updateDefaultPreview();
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
     * Update the default preview based on data type
     */
    _updateDefaultPreview: function () {
      if (!this.defaultPreviewNode) return;

      var dataType = this.context ? this.context.dataType : 'genome_feature';
      var preview = '';

      if (dataType === 'genome' || dataType === 'genome_sequence') {
        preview = '>accession|genome_name [organism]';
      } else {
        // genome_feature
        preview = '>feature_id|locus_tag product [organism]';
      }

      this.defaultPreviewNode.innerHTML = '<code>' + preview + '</code>';
    },

    /**
     * Select definition line format
     */
    _selectDefLineFormat: function (format) {
      var self = this;
      this.defLineFormat = format;

      // Update radio buttons
      if (this.defaultDefLineRadio) this.defaultDefLineRadio.checked = (format === 'default');
      if (this.customDefLineRadio) this.customDefLineRadio.checked = (format === 'custom');

      // Update visual selection
      query('.defLineOption', this.domNode).forEach(function (node) {
        domClass.remove(node, 'selected');
      });

      var selectedNode = query('.defLineOption[data-option="' + format + '"]', this.domNode)[0];
      if (selectedNode) {
        domClass.add(selectedNode, 'selected');
      }

      // Show/hide custom builder
      if (format === 'custom') {
        domClass.remove(this.customBuilderNode, 'dijitHidden');
        this._loadDefinitionLineBuilder();
      } else {
        domClass.add(this.customBuilderNode, 'dijitHidden');
      }

      this.notifyDataChanged();
    },

    /**
     * Lazy load the DefinitionLineBuilder widget
     */
    _loadDefinitionLineBuilder: function () {
      var self = this;

      if (this._defLineBuilder) return;

      require(['./DefinitionLineBuilder'], function (DefinitionLineBuilder) {
        self._defLineBuilder = new DefinitionLineBuilder({
          dataType: self.context ? self.context.dataType : 'genome_feature',
          onChange: function (fields, delimiter) {
            self.customFields = fields;
            self.delimiter = delimiter;
            self.notifyDataChanged();
          }
        });
        self._defLineBuilder.placeAt(self.customBuilderNode);
        self._defLineBuilder.startup();
      });
    },

    /**
     * Validate
     */
    validate: function () {
      if (this.defLineFormat === 'custom') {
        if (!this.customFields || this.customFields.length === 0) {
          return {
            valid: false,
            message: 'Please select at least one field for the custom definition line.'
          };
        }
      }
      return true;
    },

    /**
     * Get step data
     */
    getData: function () {
      return {
        defLineFormat: this.defLineFormat,
        defLineFields: this.defLineFormat === 'custom' ? this.customFields : null,
        delimiter: this.defLineFormat === 'custom' ? this.delimiter : '|'
      };
    },

    /**
     * Reset
     */
    reset: function () {
      this.inherited(arguments);
      this.defLineFormat = 'default';
      this.customFields = [];
      this._selectDefLineFormat('default');

      if (this._defLineBuilder) {
        this._defLineBuilder.reset();
      }
    },

    /**
     * Destroy
     */
    destroy: function () {
      this._handlers.forEach(function (h) {
        h.remove();
      });
      this._handlers = [];

      if (this._defLineBuilder) {
        this._defLineBuilder.destroy();
        this._defLineBuilder = null;
      }

      this.inherited(arguments);
    }
  });
});
