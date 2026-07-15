define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/text!./templates/DefinitionLineBuilder.html',
  '../../util/FASTADefLineFields'
], function (
  declare,
  lang,
  on,
  domClass,
  domConstruct,
  query,
  _WidgetBase,
  _TemplatedMixin,
  template,
  FASTADefLineFields
) {
  /**
   * DefinitionLineBuilder - Widget for building custom FASTA definition lines
   *
   * Features:
   * - Two-panel field selection (available -> selected)
   * - Drag-and-drop or button-based field ordering
   * - Live preview of resulting definition line
   * - Delimiter selection
   */

  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: template,

    // Configuration
    dataType: 'genome_feature',

    // State
    availableFields: null,
    selectedFields: null,
    delimiter: '|',

    // Callback
    onChange: null,

    // Event handlers
    _handlers: null,

    constructor: function (options) {
      this.availableFields = [];
      this.selectedFields = [];
      this._handlers = [];
    },

    postCreate: function () {
      this.inherited(arguments);
      this._loadFields();
      this._setupEventHandlers();
    },

    /**
     * Load available fields for the data type
     */
    _loadFields: function () {
      this.availableFields = FASTADefLineFields.getFields(this.dataType);
      this._renderAvailableFields();
      this._updatePreview();
    },

    /**
     * Setup event handlers
     */
    _setupEventHandlers: function () {
      var self = this;

      // Search input
      if (this.searchInput) {
        var searchHandler = on(this.searchInput, 'input', function () {
          self._filterAvailableFields(this.value);
        });
        this._handlers.push(searchHandler);
      }

      // Delimiter select
      if (this.delimiterSelect) {
        var delimiterHandler = on(this.delimiterSelect, 'change', function () {
          self._onDelimiterChange();
        });
        this._handlers.push(delimiterHandler);
      }
    },

    /**
     * Render available fields list
     */
    _renderAvailableFields: function (filter) {
      var self = this;
      domConstruct.empty(this.availableFieldsNode);

      var filterLower = (filter || '').toLowerCase();

      this.availableFields.forEach(function (field) {
        // Check if already selected
        var isSelected = self.selectedFields.some(function (f) {
          return f.id === field.id;
        });
        if (isSelected) return;

        // Check filter
        if (filterLower &&
            field.label.toLowerCase().indexOf(filterLower) === -1 &&
            field.id.toLowerCase().indexOf(filterLower) === -1) {
          return;
        }

        var fieldNode = domConstruct.create('div', {
          'class': 'fieldItem',
          'data-field-id': field.id,
          innerHTML: '<span class="fieldLabel">' + field.label + '</span>' +
                     '<span class="fieldExample">' + (field.example || '') + '</span>'
        }, self.availableFieldsNode);

        // Click to select
        var clickHandler = on(fieldNode, 'click', function () {
          self._toggleFieldSelection(this, 'available');
        });
        self._handlers.push(clickHandler);

        // Double-click to add
        var dblClickHandler = on(fieldNode, 'dblclick', function () {
          var fieldId = this.getAttribute('data-field-id');
          self._addField(fieldId);
        });
        self._handlers.push(dblClickHandler);
      });
    },

    /**
     * Render selected fields list
     */
    _renderSelectedFields: function () {
      var self = this;
      domConstruct.empty(this.selectedFieldsNode);

      this.selectedFields.forEach(function (field, index) {
        var fieldNode = domConstruct.create('div', {
          'class': 'fieldItem',
          'data-field-id': field.id,
          'data-index': index,
          innerHTML: '<span class="fieldIndex">' + (index + 1) + '.</span>' +
                     '<span class="fieldLabel">' + field.label + '</span>'
        }, self.selectedFieldsNode);

        // Click to select
        var clickHandler = on(fieldNode, 'click', function () {
          self._toggleFieldSelection(this, 'selected');
        });
        self._handlers.push(clickHandler);

        // Double-click to remove
        var dblClickHandler = on(fieldNode, 'dblclick', function () {
          var fieldId = this.getAttribute('data-field-id');
          self._removeField(fieldId);
        });
        self._handlers.push(dblClickHandler);
      });

      // Update count
      if (this.fieldCountNode) {
        this.fieldCountNode.textContent = this.selectedFields.length + ' field' +
          (this.selectedFields.length !== 1 ? 's' : '');
      }
    },

    /**
     * Toggle field selection state
     */
    _toggleFieldSelection: function (node, listType) {
      // Deselect others in the same list
      var listNode = listType === 'available' ? this.availableFieldsNode : this.selectedFieldsNode;
      query('.fieldItem.selected', listNode).forEach(function (n) {
        domClass.remove(n, 'selected');
      });

      // Toggle this one
      domClass.toggle(node, 'selected');
    },

    /**
     * Filter available fields by search term
     */
    _filterAvailableFields: function (filter) {
      this._renderAvailableFields(filter);
    },

    /**
     * Add field to selected list
     */
    _addField: function (fieldId) {
      var field = this.availableFields.find(function (f) {
        return f.id === fieldId;
      });

      if (field && !this.selectedFields.some(function (f) { return f.id === fieldId; })) {
        this.selectedFields.push(field);
        this._renderAvailableFields(this.searchInput ? this.searchInput.value : '');
        this._renderSelectedFields();
        this._updatePreview();
        this._notifyChange();
      }
    },

    /**
     * Remove field from selected list
     */
    _removeField: function (fieldId) {
      this.selectedFields = this.selectedFields.filter(function (f) {
        return f.id !== fieldId;
      });
      this._renderAvailableFields(this.searchInput ? this.searchInput.value : '');
      this._renderSelectedFields();
      this._updatePreview();
      this._notifyChange();
    },

    /**
     * Handle add button click
     */
    _onAddSelected: function () {
      var selected = query('.fieldItem.selected', this.availableFieldsNode);
      var self = this;
      selected.forEach(function (node) {
        var fieldId = node.getAttribute('data-field-id');
        self._addField(fieldId);
      });
    },

    /**
     * Handle remove button click
     */
    _onRemoveSelected: function () {
      var selected = query('.fieldItem.selected', this.selectedFieldsNode);
      var self = this;
      selected.forEach(function (node) {
        var fieldId = node.getAttribute('data-field-id');
        self._removeField(fieldId);
      });
    },

    /**
     * Handle move up button click
     */
    _onMoveUp: function () {
      var selected = query('.fieldItem.selected', this.selectedFieldsNode)[0];
      if (!selected) return;

      var index = parseInt(selected.getAttribute('data-index'), 10);
      if (index > 0) {
        var temp = this.selectedFields[index];
        this.selectedFields[index] = this.selectedFields[index - 1];
        this.selectedFields[index - 1] = temp;
        this._renderSelectedFields();
        this._updatePreview();
        this._notifyChange();

        // Re-select the moved item
        var newSelected = query('.fieldItem[data-index="' + (index - 1) + '"]', this.selectedFieldsNode)[0];
        if (newSelected) domClass.add(newSelected, 'selected');
      }
    },

    /**
     * Handle move down button click
     */
    _onMoveDown: function () {
      var selected = query('.fieldItem.selected', this.selectedFieldsNode)[0];
      if (!selected) return;

      var index = parseInt(selected.getAttribute('data-index'), 10);
      if (index < this.selectedFields.length - 1) {
        var temp = this.selectedFields[index];
        this.selectedFields[index] = this.selectedFields[index + 1];
        this.selectedFields[index + 1] = temp;
        this._renderSelectedFields();
        this._updatePreview();
        this._notifyChange();

        // Re-select the moved item
        var newSelected = query('.fieldItem[data-index="' + (index + 1) + '"]', this.selectedFieldsNode)[0];
        if (newSelected) domClass.add(newSelected, 'selected');
      }
    },

    /**
     * Handle delimiter change
     */
    _onDelimiterChange: function () {
      this.delimiter = this.delimiterSelect.value;
      if (this.delimiter === '\\t') {
        this.delimiter = '\t';
      }
      this._updatePreview();
      this._notifyChange();
    },

    /**
     * Update preview display
     */
    _updatePreview: function () {
      if (!this.previewNode) return;

      var fieldIds = this.selectedFields.map(function (f) { return f.id; });
      var preview = FASTADefLineFields.formatPreview(this.dataType, fieldIds, this.delimiter);

      // Escape HTML and display delimiter nicely
      var displayDelim = this.delimiter;
      if (this.delimiter === '\t') displayDelim = '<tab>';
      if (this.delimiter === ' ') displayDelim = '<space>';

      this.previewNode.innerHTML = '<code>' + preview.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>';
    },

    /**
     * Notify parent of changes
     */
    _notifyChange: function () {
      if (this.onChange) {
        var fieldIds = this.selectedFields.map(function (f) { return f.id; });
        this.onChange(fieldIds, this.delimiter);
      }
    },

    /**
     * Get current selected field IDs
     */
    getSelectedFields: function () {
      return this.selectedFields.map(function (f) { return f.id; });
    },

    /**
     * Get current delimiter
     */
    getDelimiter: function () {
      return this.delimiter;
    },

    /**
     * Set selected fields programmatically
     */
    setSelectedFields: function (fieldIds) {
      var self = this;
      this.selectedFields = [];

      fieldIds.forEach(function (fieldId) {
        var field = self.availableFields.find(function (f) {
          return f.id === fieldId;
        });
        if (field) {
          self.selectedFields.push(field);
        }
      });

      this._renderAvailableFields();
      this._renderSelectedFields();
      this._updatePreview();
    },

    /**
     * Set delimiter programmatically
     */
    setDelimiter: function (delimiter) {
      this.delimiter = delimiter;
      if (this.delimiterSelect) {
        var displayValue = delimiter === '\t' ? '\\t' : delimiter;
        this.delimiterSelect.value = displayValue;
      }
      this._updatePreview();
    },

    /**
     * Reset to empty state
     */
    reset: function () {
      this.selectedFields = [];
      this.delimiter = '|';
      if (this.delimiterSelect) {
        this.delimiterSelect.value = '|';
      }
      if (this.searchInput) {
        this.searchInput.value = '';
      }
      this._renderAvailableFields();
      this._renderSelectedFields();
      this._updatePreview();
    },

    /**
     * Update data type and reload fields
     */
    setDataType: function (dataType) {
      this.dataType = dataType;
      this.selectedFields = [];
      this._loadFields();
    },

    /**
     * Destroy
     */
    destroy: function () {
      this._handlers.forEach(function (h) {
        h.remove();
      });
      this._handlers = [];
      this.inherited(arguments);
    }
  });
});
