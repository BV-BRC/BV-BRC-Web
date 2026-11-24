define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/topic',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  'dojo/when',
  'dijit/Dialog',
  '../../util/SavedSearchManager',
  '../../util/QueryDescriptor',
  '../../util/QueryToEnglish'
], function (
  declare,
  lang,
  on,
  topic,
  domClass,
  domConstruct,
  query,
  when,
  Dialog,
  SavedSearchManager,
  QueryDescriptor,
  QueryToEnglish
) {
  /**
   * SaveSearchDialog - Dialog for saving searches
   *
   * Features:
   * - Custom name input with auto-generated default
   * - Query preview (human-readable)
   * - Optional workspace export
   * - Duplicate name warning
   * - Tags/category support
   */

  var SaveDialog = declare([Dialog], {
    title: 'Save Search',
    'class': 'saveSearchDialogContainer',

    // Input data
    queryDescriptor: null,

    // DOM references
    nameInput: null,
    dataTypeNode: null,
    queryPreviewNode: null,
    recordCountSection: null,
    recordCountNode: null,
    tagsInput: null,
    duplicateWarning: null,
    saveButton: null,
    cancelButton: null,

    // Event handlers
    _handlers: null,

    // Callbacks (use different names to avoid conflict with Dialog's onCancel)
    onSaveCallback: null,
    onCancelCallback: null,

    postCreate: function () {
      this.inherited(arguments);
      this._handlers = [];
      this._buildContent();
      this._setupEventHandlers();
    },

    /**
     * Build dialog content programmatically
     */
    _buildContent: function () {
      var content = domConstruct.create('div', {
        'class': 'saveSearchDialog',
        style: 'width: 100%; box-sizing: border-box;'
      });

      // Form sections
      var formContent = domConstruct.create('div', {
        'class': 'dialogContent',
        style: 'width: 100%; box-sizing: border-box;'
      }, content);

      // Name input section
      var nameSection = domConstruct.create('div', {
        'class': 'formSection',
        style: 'width: 100%; box-sizing: border-box;'
      }, formContent);
      domConstruct.create('label', { innerHTML: 'Search Name:', 'for': 'searchName' }, nameSection);
      this.nameInput = domConstruct.create('input', {
        type: 'text',
        id: 'searchName',
        'class': 'searchNameInput',
        placeholder: 'Enter a name for this search',
        style: 'width: 100%; box-sizing: border-box;'
      }, nameSection);
      this.duplicateWarning = domConstruct.create('div', {
        'class': 'duplicateWarning dijitHidden',
        innerHTML: '<i class="icon-exclamation-triangle"></i> A search with this name already exists. Saving will overwrite it.'
      }, nameSection);

      // Data type section
      var dataTypeSection = domConstruct.create('div', { 'class': 'formSection' }, formContent);
      domConstruct.create('label', { innerHTML: 'Data Type:' }, dataTypeSection);
      this.dataTypeNode = domConstruct.create('span', { 'class': 'dataTypeValue', innerHTML: '-' }, dataTypeSection);

      // Query preview section
      var querySection = domConstruct.create('div', { 'class': 'formSection' }, formContent);
      domConstruct.create('label', { innerHTML: 'Query:' }, querySection);
      this.queryPreviewNode = domConstruct.create('div', {
        'class': 'queryPreview',
        innerHTML: '(no query)'
      }, querySection);

      // Record count section (hidden by default)
      this.recordCountSection = domConstruct.create('div', { 'class': 'formSection dijitHidden' }, formContent);
      domConstruct.create('label', { innerHTML: 'Records:' }, this.recordCountSection);
      this.recordCountNode = domConstruct.create('span', { 'class': 'recordCountValue', innerHTML: '0' }, this.recordCountSection);

      // Tags section
      var tagsSection = domConstruct.create('div', { 'class': 'formSection' }, formContent);
      domConstruct.create('label', { innerHTML: 'Tags (optional):', 'for': 'searchTags' }, tagsSection);
      this.tagsInput = domConstruct.create('input', {
        type: 'text',
        id: 'searchTags',
        'class': 'tagsInput',
        placeholder: 'Enter tags separated by commas'
      }, tagsSection);

      // No "also save to workspace" checkbox: saving always persists to
      // the workspace, via SavedSearchManager's
      // .preferences/saved-searches.json. The checkbox controlled a
      // *second*, optional copy -- a standalone .search file in a folder
      // of the user's choosing -- which made "save to workspace" look
      // optional when it never was.

      // Action buttons
      var actions = domConstruct.create('div', { 'class': 'dialogActions' }, content);
      this.cancelButton = domConstruct.create('button', {
        type: 'button',
        'class': 'cancelButton',
        innerHTML: 'Cancel'
      }, actions);
      this.saveButton = domConstruct.create('button', {
        type: 'button',
        'class': 'saveButton',
        innerHTML: '<i class="icon-save"></i> Save Search'
      }, actions);

      this.set('content', content);
    },

    /**
     * Setup event handlers
     */
    _setupEventHandlers: function () {
      var self = this;

      // Name input validation
      if (this.nameInput) {
        var nameHandler = on(this.nameInput, 'input', function () {
          self._validateName();
        });
        this._handlers.push(nameHandler);
      }

      // Save button
      if (this.saveButton) {
        var saveHandler = on(this.saveButton, 'click', lang.hitch(this, function () {
          this._onSave();
        }));
        this._handlers.push(saveHandler);
      }

      // Cancel button
      if (this.cancelButton) {
        var cancelHandler = on(this.cancelButton, 'click', lang.hitch(this, function () {
          this._onCancel();
        }));
        this._handlers.push(cancelHandler);
      }
    },

    /**
     * Set the query descriptor to save
     * @param {Object} descriptor - QueryDescriptor object
     */
    setQueryDescriptor: function (descriptor) {
      this.queryDescriptor = descriptor;
      this._updateDisplay();

      // Warm the manager's cache so the duplicate-name check has
      // something to compare against. That check runs on every keystroke
      // and so has to stay synchronous; re-validate once the load lands,
      // in case the user typed a clashing name before it arrived.
      var self = this;
      when(SavedSearchManager.load(), function () {
        if (!self._destroyed) {
          self._validateName();
        }
      });
    },

    /**
     * Create descriptor from current context
     * @param {Object} context - Context with dataType, rqlQuery, grid, etc.
     */
    setContext: function (context) {
      var descriptor;

      if (context.grid) {
        descriptor = QueryDescriptor.createFromGrid(context.grid);
      } else {
        descriptor = QueryDescriptor.create({
          dataType: context.dataType,
          rqlQuery: context.rqlQuery,
          name: context.name
        });
      }

      this.setQueryDescriptor(descriptor);
    },

    /**
     * Update display based on descriptor
     */
    _updateDisplay: function () {
      if (!this.queryDescriptor) return;

      // Set default name
      if (this.nameInput) {
        this.nameInput.value = this.queryDescriptor.name || '';
      }

      // Show data type
      if (this.dataTypeNode) {
        this.dataTypeNode.textContent = this._formatDataType(this.queryDescriptor.dataType);
      }

      // Show query preview
      if (this.queryPreviewNode) {
        var preview = QueryToEnglish.toPlainText(this.queryDescriptor.rqlQuery);
        this.queryPreviewNode.textContent = preview || '(all records)';
      }

      // Show record count if available
      if (this.recordCountNode) {
        if (this.queryDescriptor.metadata && this.queryDescriptor.metadata.recordCount) {
          this.recordCountNode.textContent = this._formatNumber(this.queryDescriptor.metadata.recordCount) + ' records';
          domClass.remove(this.recordCountSection, 'dijitHidden');
        } else {
          domClass.add(this.recordCountSection, 'dijitHidden');
        }
      }

      this._validateName();
    },

    /**
     * Format data type for display
     * @param {string} dataType - Data type key
     * @returns {string} Formatted label
     */
    _formatDataType: function (dataType) {
      var labels = {
        'genome': 'Genomes',
        'genome_feature': 'Features',
        'genome_sequence': 'Sequences',
        'sp_gene': 'Specialty Genes',
        'pathway': 'Pathways',
        'subsystem': 'Subsystems',
        'experiment': 'Experiments',
        'bioset': 'Biosets',
        'surveillance': 'Surveillance',
        'serology': 'Serology',
        'epitope': 'Epitopes',
        'protein_structure': 'Protein Structures'
      };
      return labels[dataType] || dataType;
    },

    /**
     * Format number with commas
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    _formatNumber: function (num) {
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * Validate name input
     */
    _validateName: function () {
      var name = this.nameInput ? this.nameInput.value.trim() : '';
      var isValid = name.length > 0;
      var isDuplicate = false;

      // Check for duplicate names
      if (isValid) {
        var existing = SavedSearchManager.list();
        isDuplicate = existing.some(function (search) {
          return search.name === name && search.id !== (this.queryDescriptor && this.queryDescriptor.id);
        }, this);
      }

      // Update UI
      if (this.duplicateWarning) {
        if (isDuplicate) {
          domClass.remove(this.duplicateWarning, 'dijitHidden');
        } else {
          domClass.add(this.duplicateWarning, 'dijitHidden');
        }
      }

      if (this.saveButton) {
        this.saveButton.disabled = !isValid;
      }

      return isValid;
    },

    /**
     * Handle save button click
     */
    _onSave: function () {
      if (!this._validateName()) return;

      var name = this.nameInput.value.trim();

      // Update descriptor with name
      this.queryDescriptor.name = name;
      this.queryDescriptor.updatedAt = new Date().toISOString();

      // Get tags if present
      if (this.tagsInput) {
        var tagsText = this.tagsInput.value.trim();
        if (tagsText) {
          this.queryDescriptor.tags = tagsText.split(',').map(function (t) {
            return t.trim();
          }).filter(function (t) {
            return t.length > 0;
          });
        }
      }

      // save() updates the cache synchronously and writes
      // .preferences/saved-searches.json in the background, so the
      // search is always in the workspace -- there is nothing optional
      // left to branch on here.
      var savedDescriptor = SavedSearchManager.save(this.queryDescriptor);

      this._onSaveComplete(savedDescriptor);
    },

    /**
     * Handle save completion
     * @param {Object} descriptor - Saved descriptor
     */
    _onSaveComplete: function (descriptor) {
      // Publish event
      topic.publish('/SavedSearch/changed', {
        action: 'save',
        search: descriptor
      });

      // Callback
      if (this.onSaveCallback) {
        this.onSaveCallback(descriptor);
      }

      this.hide();
    },

    /**
     * Handle cancel button click
     */
    _onCancel: function () {
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
      this.hide();
    },

    /**
     * Show the dialog
     */
    show: function () {
      this._updateDisplay();
      this.inherited(arguments);

      // Focus name input
      if (this.nameInput) {
        setTimeout(lang.hitch(this, function () {
          this.nameInput.focus();
          this.nameInput.select();
        }), 100);
      }
    },

    /**
     * Reset the dialog
     */
    reset: function () {
      this.queryDescriptor = null;

      if (this.nameInput) this.nameInput.value = '';
      if (this.tagsInput) this.tagsInput.value = '';

      domClass.add(this.duplicateWarning, 'dijitHidden');
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

  /**
   * Static method to show save dialog
   * @param {Object} options - Dialog options
   *   - queryDescriptor: QueryDescriptor to save
   *   - context: Context to create descriptor from
   *   - onSave: Callback on save
   *   - onCancel: Callback on cancel
   * @returns {SaveDialog} Dialog instance
   */
  SaveDialog.show = function (options) {
    options = options || {};

    var dialogOptions = {};

    // Only set callbacks if they are provided and are functions
    if (typeof options.onSave === 'function') {
      dialogOptions.onSaveCallback = options.onSave;
    }
    if (typeof options.onCancel === 'function') {
      dialogOptions.onCancelCallback = options.onCancel;
    }

    var dialog = new SaveDialog(dialogOptions);

    if (options.queryDescriptor) {
      dialog.setQueryDescriptor(options.queryDescriptor);
    } else if (options.context) {
      dialog.setContext(options.context);
    }

    dialog.show();
    return dialog;
  };

  return SaveDialog;
});
