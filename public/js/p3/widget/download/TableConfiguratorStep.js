define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  './WizardStepBase',
  'dojo/text!./templates/TableConfiguratorStep.html',
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
   * TableConfiguratorStep - Step 3 configurator for tabular formats (TSV, CSV, Excel)
   *
   * Allows users to:
   * - Select which columns to include in the download
   * - Reorder columns
   * - Search available columns
   */

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'options',
    stepTitle: 'Options',
    stepDescription: 'Configure table download options',

    // State
    availableColumns: null,   // All available columns
    selectedColumns: null,    // Columns selected for download
    defaultColumns: null,     // Default columns (from visibleColumns)
    searchFilter: '',         // Current search filter

    // Event handlers
    _handlers: null,

    postCreate: function () {
      this.inherited(arguments);
      this._handlers = [];
      this.availableColumns = [];
      this.selectedColumns = [];
      this.defaultColumns = [];
    },

    /**
     * Called when previous step data is set
     */
    onPreviousStepDataSet: function (data) {
      this._updateSummary(data);
    },

    /**
     * Called when context is set
     */
    onContextSet: function (context) {
      this._initializeColumns();
    },

    /**
     * Called when step becomes visible
     */
    onShow: function () {
      this.inherited(arguments);
      this._initializeColumns();
      this._updateSummary(this.previousStepData);
    },

    /**
     * Initialize columns from query descriptor
     */
    _initializeColumns: function () {
      var self = this;

      // Get columns from query descriptor
      if (this.context && this.context.queryDescriptor) {
        var qd = this.context.queryDescriptor;

        // Get all available columns
        if (qd.availableColumns && qd.availableColumns.length > 0) {
          this.availableColumns = qd.availableColumns.map(function (col) {
            return {
              field: col.field,
              label: col.label || col.field,
              group: col.group || 'General'
            };
          });
        } else {
          // Use default columns for this data type
          this.availableColumns = this._getDefaultColumnsForDataType();
        }

        // Get default selected columns (from visibleColumns)
        if (qd.visibleColumns && qd.visibleColumns.length > 0) {
          this.defaultColumns = qd.visibleColumns.map(function (col) {
            return {
              field: col.field,
              label: col.label || col.field
            };
          });
        } else {
          // Default to first 10 columns
          this.defaultColumns = this.availableColumns.slice(0, 10);
        }

        // Initialize selected columns if empty
        if (this.selectedColumns.length === 0) {
          this.selectedColumns = this.defaultColumns.slice(); // Copy
        }
      } else {
        // No context - use defaults
        this.availableColumns = this._getDefaultColumnsForDataType();
        this.defaultColumns = this.availableColumns.slice(0, 10);
        if (this.selectedColumns.length === 0) {
          this.selectedColumns = this.defaultColumns.slice();
        }
      }

      // Populate the lists
      this._populateFieldLists();
    },

    /**
     * Get default columns based on data type
     */
    _getDefaultColumnsForDataType: function () {
      var dataType = this.context ? this.context.dataType : 'genome_feature';

      if (dataType === 'genome') {
        return [
          { field: 'genome_id', label: 'Genome ID', group: 'General' },
          { field: 'genome_name', label: 'Genome Name', group: 'General' },
          { field: 'taxon_id', label: 'Taxon ID', group: 'Taxonomy' },
          { field: 'genome_status', label: 'Genome Status', group: 'General' },
          { field: 'species', label: 'Species', group: 'Taxonomy' },
          { field: 'strain', label: 'Strain', group: 'General' },
          { field: 'host_name', label: 'Host', group: 'Isolation' },
          { field: 'isolation_country', label: 'Country', group: 'Isolation' },
          { field: 'collection_date', label: 'Collection Date', group: 'Isolation' },
          { field: 'contigs', label: 'Contigs', group: 'Assembly' },
          { field: 'genome_length', label: 'Genome Length', group: 'Assembly' },
          { field: 'gc_content', label: 'GC Content', group: 'Assembly' }
        ];
      } else {
        // genome_feature and others
        return [
          { field: 'patric_id', label: 'BV-BRC ID', group: 'General' },
          { field: 'feature_id', label: 'Feature ID', group: 'General' },
          { field: 'genome_id', label: 'Genome ID', group: 'Genome' },
          { field: 'genome_name', label: 'Genome Name', group: 'Genome' },
          { field: 'accession', label: 'Accession', group: 'General' },
          { field: 'locus_tag', label: 'Locus Tag', group: 'General' },
          { field: 'gene', label: 'Gene', group: 'Annotation' },
          { field: 'product', label: 'Product', group: 'Annotation' },
          { field: 'feature_type', label: 'Feature Type', group: 'General' },
          { field: 'start', label: 'Start', group: 'Location' },
          { field: 'end', label: 'End', group: 'Location' },
          { field: 'strand', label: 'Strand', group: 'Location' }
        ];
      }
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
     * Populate the field selection lists
     */
    _populateFieldLists: function () {
      var self = this;

      if (!this.availableFieldsList || !this.selectedFieldsList) return;

      // Clear existing
      domConstruct.empty(this.availableFieldsList);
      domConstruct.empty(this.selectedFieldsList);

      // Get field names that are already selected
      var selectedFieldNames = this.selectedColumns.map(function (f) {
        return f.field;
      });

      // Filter by search term
      var filterLower = (this.searchFilter || '').toLowerCase();

      // Populate available columns (excluding those already selected)
      this.availableColumns.forEach(function (col) {
        // Skip if already selected
        if (selectedFieldNames.indexOf(col.field) !== -1) return;

        // Skip if doesn't match search
        if (filterLower) {
          var matchesLabel = col.label.toLowerCase().indexOf(filterLower) !== -1;
          var matchesField = col.field.toLowerCase().indexOf(filterLower) !== -1;
          if (!matchesLabel && !matchesField) return;
        }

        self._createFieldItem(col, self.availableFieldsList, 'available');
      });

      // Populate selected columns
      this.selectedColumns.forEach(function (col) {
        self._createFieldItem(col, self.selectedFieldsList, 'selected');
      });

      // Update count
      this._updateColumnCount();
      this._updateButtonStates();
    },

    /**
     * Create a field list item
     */
    _createFieldItem: function (column, container, type) {
      var self = this;

      var item = domConstruct.create('div', {
        'class': 'fieldItem',
        'data-field': column.field,
        innerHTML: '<span class="fieldLabel">' + column.label + '</span>'
      }, container);

      // Click to select
      var handler = on(item, 'click', function () {
        // Toggle selection
        if (domClass.contains(this, 'selected')) {
          domClass.remove(this, 'selected');
        } else {
          // Deselect others in the same list
          query('.fieldItem.selected', container).forEach(function (node) {
            domClass.remove(node, 'selected');
          });
          domClass.add(this, 'selected');
        }
        self._updateButtonStates();
      });

      // Double-click to add/remove
      var dblHandler = on(item, 'dblclick', function () {
        if (type === 'available') {
          self._addColumn(column);
        } else {
          self._removeColumn(column);
        }
      });

      this._handlers.push(handler);
      this._handlers.push(dblHandler);
      return item;
    },

    /**
     * Update column count display
     */
    _updateColumnCount: function () {
      if (this.columnCountNode) {
        this.columnCountNode.textContent = '(' + this.selectedColumns.length + ')';
      }
    },

    /**
     * Update button states based on selection
     */
    _updateButtonStates: function () {
      var availableSelected = query('.fieldItem.selected', this.availableFieldsList).length > 0;
      var selectedSelected = query('.fieldItem.selected', this.selectedFieldsList).length > 0;
      var selectedItems = query('.fieldItem', this.selectedFieldsList);

      if (this.addFieldBtn) {
        this.addFieldBtn.disabled = !availableSelected;
      }
      if (this.removeFieldBtn) {
        this.removeFieldBtn.disabled = !selectedSelected;
      }
      if (this.moveUpBtn) {
        var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
        this.moveUpBtn.disabled = !selectedSelected || (selectedNode === selectedItems[0]);
      }
      if (this.moveDownBtn) {
        var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
        this.moveDownBtn.disabled = !selectedSelected || (selectedNode === selectedItems[selectedItems.length - 1]);
      }
    },

    /**
     * Handle search input
     */
    _onSearchInput: function (evt) {
      this.searchFilter = evt.target.value;
      this._populateFieldLists();
    },

    /**
     * Add a column to selected
     */
    _addColumn: function (column) {
      // Check if not already selected
      var exists = this.selectedColumns.some(function (c) {
        return c.field === column.field;
      });

      if (!exists) {
        this.selectedColumns.push(column);
        this._populateFieldLists();
        this.notifyDataChanged();
      }
    },

    /**
     * Remove a column from selected
     */
    _removeColumn: function (column) {
      this.selectedColumns = this.selectedColumns.filter(function (c) {
        return c.field !== column.field;
      });
      this._populateFieldLists();
      this.notifyDataChanged();
    },

    /**
     * Add selected field button click
     */
    _onAddField: function () {
      var self = this;
      var selectedNode = query('.fieldItem.selected', this.availableFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var column = this.availableColumns.find(function (c) {
        return c.field === fieldName;
      });

      if (column) {
        this._addColumn(column);
      }
    },

    /**
     * Remove selected field button click
     */
    _onRemoveField: function () {
      var self = this;
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var column = this.selectedColumns.find(function (c) {
        return c.field === fieldName;
      });

      if (column) {
        this._removeColumn(column);
      }
    },

    /**
     * Move selected column up
     */
    _onMoveUp: function () {
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var idx = this.selectedColumns.findIndex(function (c) {
        return c.field === fieldName;
      });

      if (idx > 0) {
        var temp = this.selectedColumns[idx - 1];
        this.selectedColumns[idx - 1] = this.selectedColumns[idx];
        this.selectedColumns[idx] = temp;
        this._populateFieldLists();
        // Reselect the moved item
        var newNode = query('.fieldItem[data-field="' + fieldName + '"]', this.selectedFieldsList)[0];
        if (newNode) domClass.add(newNode, 'selected');
        this._updateButtonStates();
        this.notifyDataChanged();
      }
    },

    /**
     * Move selected column down
     */
    _onMoveDown: function () {
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var idx = this.selectedColumns.findIndex(function (c) {
        return c.field === fieldName;
      });

      if (idx < this.selectedColumns.length - 1) {
        var temp = this.selectedColumns[idx + 1];
        this.selectedColumns[idx + 1] = this.selectedColumns[idx];
        this.selectedColumns[idx] = temp;
        this._populateFieldLists();
        // Reselect the moved item
        var newNode = query('.fieldItem[data-field="' + fieldName + '"]', this.selectedFieldsList)[0];
        if (newNode) domClass.add(newNode, 'selected');
        this._updateButtonStates();
        this.notifyDataChanged();
      }
    },

    /**
     * Add all available columns
     */
    _onSelectAll: function () {
      var self = this;
      var selectedFieldNames = this.selectedColumns.map(function (c) {
        return c.field;
      });

      this.availableColumns.forEach(function (col) {
        if (selectedFieldNames.indexOf(col.field) === -1) {
          self.selectedColumns.push(col);
        }
      });

      this._populateFieldLists();
      this.notifyDataChanged();
    },

    /**
     * Remove all selected columns
     */
    _onClearAll: function () {
      this.selectedColumns = [];
      this._populateFieldLists();
      this.notifyDataChanged();
    },

    /**
     * Reset to default columns
     */
    _onResetDefaults: function () {
      this.selectedColumns = this.defaultColumns.slice(); // Copy
      this._populateFieldLists();
      this.notifyDataChanged();
    },

    /**
     * Validate - must have at least one column selected
     */
    validate: function () {
      if (this.selectedColumns.length === 0) {
        return {
          valid: false,
          message: 'Please select at least one column to download.'
        };
      }
      return true;
    },

    /**
     * Get step data
     */
    getData: function () {
      return {
        columns: this.selectedColumns.map(function (c) {
          return c.field;
        }),
        columnLabels: this.selectedColumns.map(function (c) {
          return { field: c.field, label: c.label };
        })
      };
    },

    /**
     * Check if this step can be skipped
     */
    canSkip: function () {
      // Table downloads now require column selection
      return false;
    },

    /**
     * Reset
     */
    reset: function () {
      this.inherited(arguments);
      this.selectedColumns = [];
      this.searchFilter = '';
      if (this.searchInput) {
        this.searchInput.value = '';
      }
      this._initializeColumns();
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
