define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  './WizardStepBase',
  'dojo/text!./templates/FASTAConfiguratorStep.html',
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
   * FASTAConfiguratorStep - Step 3 configurator for FASTA formats
   *
   * Allows users to:
   * - Select the field to use as sequence ID (default: BV-BRC ID)
   * - Select fields to include in the sequence description
   */

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'options',
    stepTitle: 'Options',
    stepDescription: 'Configure FASTA sequence metadata',

    // State
    sequenceIdField: null,  // Field to use as sequence ID
    descriptionFields: null, // Array of fields for description
    availableFields: null,   // All available fields from query descriptor

    // Event handlers
    _handlers: null,

    postCreate: function () {
      this.inherited(arguments);
      this._handlers = [];
      this.descriptionFields = [];
      this.availableFields = [];
    },

    /**
     * Called when context is set
     */
    onContextSet: function (context) {
      this._initializeFields();
    },

    /**
     * Called when step becomes visible
     */
    onShow: function () {
      this.inherited(arguments);
      this._initializeFields();
      this._updatePreview();
    },

    /**
     * Initialize available fields from context
     */
    _initializeFields: function () {
      var self = this;

      // Use fields appropriate for the target collection, not the source grid's columns
      this.availableFields = this._getDefaultFieldsForDataType();

      // Set default sequence ID field
      if (!this.sequenceIdField) {
        var dataType = this.context ? this.context.dataType : 'genome_feature';
        this.sequenceIdField = DownloadFormats.getDefaultIdField(dataType);
      }

      // Populate the sequence ID dropdown
      this._populateIdFieldDropdown();

      // Populate the available fields lists
      this._populateFieldLists();
    },

    /**
     * Get default fields for a data type
     */
    _getDefaultFieldsForDataType: function () {
      var dataType = this.context ? this.context.dataType : 'genome_feature';

      if (dataType === 'genome' || dataType === 'genome_sequence') {
        return [
          { field: 'genome_id', label: 'Genome ID' },
          { field: 'genome_name', label: 'Genome Name' },
          { field: 'accession', label: 'Accession' },
          { field: 'species', label: 'Species' },
          { field: 'strain', label: 'Strain' },
          { field: 'host_name', label: 'Host' },
          { field: 'isolation_country', label: 'Country' },
          { field: 'collection_date', label: 'Collection Date' }
        ];
      } else {
        // genome_feature — includes genome_metadata.* fields for join enrichment
        return [
          { field: 'patric_id', label: 'BV-BRC ID' },
          { field: 'feature_id', label: 'Feature ID' },
          { field: 'refseq_locus_tag', label: 'RefSeq Locus Tag' },
          { field: 'alt_locus_tag', label: 'Alt Locus Tag' },
          { field: 'gene', label: 'Gene Symbol' },
          { field: 'product', label: 'Product' },
          { field: 'feature_type', label: 'Feature Type' },
          { field: 'annotation', label: 'Annotation' },
          { field: 'accession', label: 'Accession' },
          { field: 'start', label: 'Start' },
          { field: 'end', label: 'End' },
          { field: 'strand', label: 'Strand' },
          { field: 'na_length', label: 'NA Length' },
          { field: 'aa_length', label: 'AA Length' },
          { field: 'genome_id', label: 'Genome ID' },
          { field: 'genome_name', label: 'Genome Name' },
          { field: 'taxon_id', label: 'Taxon ID' },
          { field: 'genome_metadata.strain', label: 'Genome Strain' },
          { field: 'genome_metadata.genome_status', label: 'Genome Status' },
          { field: 'genome_metadata.assembly_accession', label: 'Assembly Accession' },
          { field: 'genome_metadata.bioproject_accession', label: 'BioProject Accession' },
          { field: 'genome_metadata.biosample_accession', label: 'BioSample Accession' }
        ];
      }
    },

    /**
     * Populate the sequence ID field dropdown
     */
    _populateIdFieldDropdown: function () {
      var self = this;

      if (!this.idFieldSelect) return;

      // Clear existing options
      domConstruct.empty(this.idFieldSelect);

      // Add options
      this.availableFields.forEach(function (f) {
        var option = domConstruct.create('option', {
          value: f.field,
          innerHTML: f.label
        }, self.idFieldSelect);

        if (f.field === self.sequenceIdField) {
          option.selected = true;
        }
      });

      // Setup change handler if not already done
      if (!this._idFieldHandler) {
        this._idFieldHandler = on(this.idFieldSelect, 'change', function () {
          self.sequenceIdField = this.value;
          self._updatePreview();
          self.notifyDataChanged();
        });
        this._handlers.push(this._idFieldHandler);
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

      // Get fields that are already selected
      var selectedFieldNames = this.descriptionFields.map(function (f) {
        return f.field;
      });

      // Populate available fields (excluding those already selected)
      this.availableFields.forEach(function (f) {
        if (selectedFieldNames.indexOf(f.field) === -1) {
          self._createFieldItem(f, self.availableFieldsList, 'available');
        }
      });

      // Populate selected fields
      this.descriptionFields.forEach(function (f) {
        self._createFieldItem(f, self.selectedFieldsList, 'selected');
      });

      this._updateButtonStates();
    },

    /**
     * Create a field list item
     */
    _createFieldItem: function (field, container, type) {
      var self = this;

      var item = domConstruct.create('div', {
        'class': 'fieldItem',
        'data-field': field.field,
        innerHTML: '<span class="fieldLabel">' + field.label + '</span>'
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

      this._handlers.push(handler);
      return item;
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
     * Add selected field to description
     */
    _onAddField: function () {
      var self = this;
      var selectedNode = query('.fieldItem.selected', this.availableFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var field = this.availableFields.find(function (f) {
        return f.field === fieldName;
      });

      if (field) {
        this.descriptionFields.push(field);
        this._populateFieldLists();
        this._updatePreview();
        this.notifyDataChanged();
      }
    },

    /**
     * Remove selected field from description
     */
    _onRemoveField: function () {
      var self = this;
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      this.descriptionFields = this.descriptionFields.filter(function (f) {
        return f.field !== fieldName;
      });

      this._populateFieldLists();
      this._updatePreview();
      this.notifyDataChanged();
    },

    /**
     * Move selected field up
     */
    _onMoveUp: function () {
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var idx = this.descriptionFields.findIndex(function (f) {
        return f.field === fieldName;
      });

      if (idx > 0) {
        var temp = this.descriptionFields[idx - 1];
        this.descriptionFields[idx - 1] = this.descriptionFields[idx];
        this.descriptionFields[idx] = temp;
        this._populateFieldLists();
        // Reselect the moved item
        var newNode = query('.fieldItem[data-field="' + fieldName + '"]', this.selectedFieldsList)[0];
        if (newNode) domClass.add(newNode, 'selected');
        this._updatePreview();
        this.notifyDataChanged();
      }
    },

    /**
     * Move selected field down
     */
    _onMoveDown: function () {
      var selectedNode = query('.fieldItem.selected', this.selectedFieldsList)[0];
      if (!selectedNode) return;

      var fieldName = selectedNode.getAttribute('data-field');
      var idx = this.descriptionFields.findIndex(function (f) {
        return f.field === fieldName;
      });

      if (idx < this.descriptionFields.length - 1) {
        var temp = this.descriptionFields[idx + 1];
        this.descriptionFields[idx + 1] = this.descriptionFields[idx];
        this.descriptionFields[idx] = temp;
        this._populateFieldLists();
        // Reselect the moved item
        var newNode = query('.fieldItem[data-field="' + fieldName + '"]', this.selectedFieldsList)[0];
        if (newNode) domClass.add(newNode, 'selected');
        this._updatePreview();
        this.notifyDataChanged();
      }
    },

    /**
     * Update the preview
     */
    _updatePreview: function () {
      if (!this.previewNode) return;

      var idField = this.sequenceIdField || 'id';
      var descFields = this.descriptionFields.map(function (f) {
        return f.field;
      });

      var previewParts = ['>' + idField];
      if (descFields.length > 0) {
        previewParts.push(descFields.join(' | '));
      }

      this.previewNode.innerHTML = '<code>' + previewParts.join(' ') + '</code>';
    },

    /**
     * Validate
     */
    validate: function () {
      if (!this.sequenceIdField) {
        return {
          valid: false,
          message: 'Please select a field for the sequence ID.'
        };
      }
      return true;
    },

    /**
     * Get step data
     */
    getData: function () {
      return {
        sequenceIdField: this.sequenceIdField,
        descriptionFields: this.descriptionFields.map(function (f) {
          return f.field;
        })
      };
    },

    /**
     * Reset
     */
    reset: function () {
      this.inherited(arguments);
      this.sequenceIdField = null;
      this.descriptionFields = [];
      this._initializeFields();
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
