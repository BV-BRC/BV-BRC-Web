define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  './WizardStepBase',
  'dojo/text!./templates/DataTypeSelectorStep.html',
  '../../util/DownloadFormats'
], function (
  declare,
  lang,
  on,
  domClass,
  domConstruct,
  query,
  WizardStepBase,
  template,
  DownloadFormats
) {
  /**
   * DataTypeSelectorStep - Step 1: Select the download format
   *
   * Displays available formats grouped by category (Sequence data, Accession list, Results table)
   * based on the data type being downloaded. Only one format can be selected across all categories.
   */

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'dataType',
    stepTitle: 'Data Type',
    stepDescription: 'Choose the type of data you want to download',

    // Selected format
    selectedFormat: null,
    selectedCategory: null,

    // Event handlers
    _formatHandlers: null,

    postCreate: function () {
      this.inherited(arguments);
      this._formatHandlers = [];
    },

    /**
     * Called when context is set
     */
    onContextSet: function (context) {
      this._renderCategories();

      // Pre-select format if specified, otherwise use default
      if (context && context.preselectedFormat) {
        this._selectFormat(context.preselectedFormat);
      } else if (context && context.dataType) {
        var defaultFormat = DownloadFormats.getDefaultFormat(context.dataType);
        if (defaultFormat) {
          this._selectFormat(defaultFormat);
        }
      }
    },

    /**
     * Called when step becomes visible
     */
    onShow: function () {
      this.inherited(arguments);
      if (!this.selectedFormat) {
        this._renderCategories();
        // Select default format
        if (this.context && this.context.dataType) {
          var defaultFormat = DownloadFormats.getDefaultFormat(this.context.dataType);
          if (defaultFormat) {
            this._selectFormat(defaultFormat);
          }
        }
      }
    },

    /**
     * Render format categories
     */
    _renderCategories: function () {
      var self = this;

      // Clear existing
      domConstruct.empty(this.categoriesNode);
      this._cleanupHandlers();

      // Get data type
      var dataType = this.context ? this.context.dataType : null;
      if (!dataType) {
        domConstruct.create('div', {
          'class': 'noFormats',
          innerHTML: 'No data type specified'
        }, this.categoriesNode);
        return;
      }

      // Get formats grouped by category
      var groupedFormats = DownloadFormats.getFormatsGroupedByCategory(dataType);

      if (!groupedFormats || groupedFormats.length === 0) {
        domConstruct.create('div', {
          'class': 'noFormats',
          innerHTML: 'No download formats available for this data type'
        }, this.categoriesNode);
        return;
      }

      // Render each category
      groupedFormats.forEach(function (category) {
        self._renderCategory(category);
      });
    },

    /**
     * Render a single category with its formats
     */
    _renderCategory: function (category) {
      var self = this;

      var categoryNode = domConstruct.create('div', {
        'class': 'formatCategory',
        'data-category': category.id
      }, this.categoriesNode);

      // Category header (simplified - just the label)
      domConstruct.create('div', {
        'class': 'categoryHeader',
        innerHTML: '<span class="categoryLabel">' + category.label + '</span>'
      }, categoryNode);

      // Format options
      var formatsNode = domConstruct.create('div', {
        'class': 'categoryFormats'
      }, categoryNode);

      category.formats.forEach(function (format) {
        // Build label with optional limit warning
        var labelHtml = '<span class="formatName">' + format.label + '</span>';
        if (format.limit) {
          labelHtml += '<span class="formatLimit">(limited to ' + format.limit.toLocaleString() + ' results)</span>';
        }

        var formatNode = domConstruct.create('div', {
          'class': 'formatOption',
          'data-format': format.id,
          'data-category': category.id
        }, formatsNode);

        // Radio button
        var radioDiv = domConstruct.create('div', {
          'class': 'formatRadio'
        }, formatNode);

        var radioInput = domConstruct.create('input', {
          type: 'radio',
          name: 'downloadFormat',
          value: format.id,
          id: 'format_' + format.id
        }, radioDiv);

        // Label (no 'for' attribute — the formatNode click handler manages selection)
        var labelNode = domConstruct.create('span', {
          'class': 'formatLabel',
          innerHTML: labelHtml
        }, formatNode);

        // Click handler for the whole format option
        var handler = on(formatNode, 'click', function (evt) {
          self._selectFormat(format.id, category.id);
        });
        self._formatHandlers.push(handler);
      });
    },

    /**
     * Select a format
     */
    _selectFormat: function (formatId, categoryId) {
      var self = this;

      // Update selection state
      this.selectedFormat = formatId;
      this.selectedCategory = categoryId || this._getCategoryForFormat(formatId);

      // Update UI - deselect all first
      query('.formatOption', this.categoriesNode).forEach(function (node) {
        domClass.remove(node, 'selected');
        var radio = node.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
      });

      // Select the chosen format
      var selectedNode = query('.formatOption[data-format="' + formatId + '"]', this.categoriesNode)[0];
      if (selectedNode) {
        domClass.add(selectedNode, 'selected');
        var radio = selectedNode.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      }

      // Clear any error
      this.clearError();

      // Notify wizard
      this.notifyDataChanged();
    },

    /**
     * Get category for a format
     */
    _getCategoryForFormat: function (formatId) {
      var dataType = this.context ? this.context.dataType : null;
      if (!dataType) return null;

      var grouped = DownloadFormats.getFormatsGroupedByCategory(dataType);
      for (var i = 0; i < grouped.length; i++) {
        for (var j = 0; j < grouped[i].formats.length; j++) {
          if (grouped[i].formats[j].id === formatId) {
            return grouped[i].id;
          }
        }
      }
      return null;
    },

    /**
     * Validate the step
     */
    validate: function () {
      if (!this.selectedFormat) {
        return {
          valid: false,
          message: 'Please select a data type to download'
        };
      }
      return true;
    },

    /**
     * Get step data
     */
    getData: function () {
      var formatInfo = DownloadFormats.getFormat(this.selectedFormat);
      return {
        format: this.selectedFormat,
        category: this.selectedCategory,
        formatInfo: formatInfo,
        isFasta: DownloadFormats.isFastaFormat(this.selectedFormat),
        isAccession: DownloadFormats.isAccessionFormat(this.selectedFormat),
        isTable: DownloadFormats.isTableFormat(this.selectedFormat),
        isConfigurable: formatInfo && formatInfo.configurable
      };
    },

    /**
     * Reset the step
     */
    reset: function () {
      this.inherited(arguments);
      this.selectedFormat = null;
      this.selectedCategory = null;

      // Clear selection UI
      query('.formatOption', this.categoriesNode).forEach(function (node) {
        domClass.remove(node, 'selected');
        var radio = node.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
      });
    },

    /**
     * Cleanup event handlers
     */
    _cleanupHandlers: function () {
      this._formatHandlers.forEach(function (h) {
        h.remove();
      });
      this._formatHandlers = [];
    },

    /**
     * Destroy
     */
    destroy: function () {
      this._cleanupHandlers();
      this.inherited(arguments);
    }
  });
});
