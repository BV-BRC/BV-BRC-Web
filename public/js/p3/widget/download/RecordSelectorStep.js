define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  'dojo/when',
  './WizardStepBase',
  'dojo/text!./templates/RecordSelectorStep.html',
  '../../util/DownloadFormats'
], function (
  declare,
  lang,
  on,
  domClass,
  domConstruct,
  query,
  when,
  WizardStepBase,
  template,
  DownloadFormats
) {
  /**
   * RecordSelectorStep - Step 2: Select which records to download
   *
   * Options:
   * - Selected records (from grid selection)
   * - All records (matching current query)
   * - Random subset (with configurable limit)
   */

  return declare([WizardStepBase], {
    templateString: template,
    stepId: 'records',
    stepTitle: 'Records',
    stepDescription: 'Choose which records to include',

    // State
    selectedScope: 'all',
    selectionCount: 0,
    totalCount: null,
    randomLimit: 2000,

    // Event handlers
    _handlers: null,

    postCreate: function () {
      this.inherited(arguments);
      this._handlers = [];
      this._setupEventHandlers();
    },

    /**
     * Setup event handlers
     */
    _setupEventHandlers: function () {
      var self = this;

      // Option click handlers
      ['selectedOption', 'allOption', 'randomOption'].forEach(function (optionName) {
        if (self[optionName]) {
          var handler = on(self[optionName], 'click', function (evt) {
            var scope = this.getAttribute('data-scope');
            self._selectScope(scope);
          });
          self._handlers.push(handler);
        }
      });

      // Random limit input handler
      if (this.randomLimitInput) {
        var handler = on(this.randomLimitInput, 'change', function () {
          self.randomLimit = parseInt(this.value, 10) || 2000;
          self.notifyDataChanged();
        });
        this._handlers.push(handler);

        // Prevent click from bubbling to parent
        var clickHandler = on(this.randomLimitInput, 'click', function (evt) {
          evt.stopPropagation();
        });
        this._handlers.push(clickHandler);
      }
    },

    /**
     * Called when context is set
     */
    onContextSet: function (context) {
      this._updateCounts();
    },

    /**
     * Called when step becomes visible
     */
    onShow: function () {
      this.inherited(arguments);
      this._updateCounts();
      this._updateUI();
    },

    /**
     * Update record counts
     */
    _updateCounts: function () {
      var self = this;

      // Selection count
      this.selectionCount = (this.context && this.context.selection)
        ? this.context.selection.length
        : 0;

      // Update selected count display
      if (this.selectedCountNode) {
        var countSpan = this.selectedCountNode.querySelector('.countValue');
        if (countSpan) {
          countSpan.textContent = this.formatNumber(this.selectionCount);
        }
      }

      // Disable selected option if no selection
      if (this.selectionCount === 0) {
        domClass.add(this.selectedOption, 'disabled');
        if (this.selectedRadio) this.selectedRadio.disabled = true;
        if (this.selectedScope === 'selected') {
          this._selectScope('all');
        }
      } else {
        domClass.remove(this.selectedOption, 'disabled');
        if (this.selectedRadio) this.selectedRadio.disabled = false;
      }

      // Fetch total count (async)
      this._fetchTotalCount();
    },

    /**
     * Fetch total record count from server
     */
    _fetchTotalCount: function () {
      var self = this;

      if (!this.context || !this.context.queryDescriptor) {
        return;
      }

      // Show loading
      if (this.allCountNode) {
        var countSpan = this.allCountNode.querySelector('.countValue');
        if (countSpan) {
          countSpan.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
        }
      }

      // Get data type config
      var dataType = this.context.dataType;
      var config = DownloadFormats.getDataTypeConfig(dataType);

      // Build count query
      var baseUrl = window.App.dataServiceURL || '';
      if (baseUrl.charAt(baseUrl.length - 1) !== '/') {
        baseUrl += '/';
      }

      var query = this.context.queryDescriptor.rqlQuery || '';
      var countUrl = baseUrl + dataType + '/?select(id)&limit(1)&' + query;

      // Use xhr to get count from Content-Range header
      require(['dojo/request/xhr'], function (xhr) {
        xhr(countUrl, {
          handleAs: 'json',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            'Authorization': window.App.authorizationToken ? window.App.authorizationToken : ''
          }
        }).then(
          function (data, ioArgs) {
            // Try to get total from response metadata
            // The Content-Range header contains: items 0-0/total
            self.totalCount = data && data.length >= 0 ? '~' : null;

            // For now, show that we have results
            if (self.allCountNode) {
              var countSpan = self.allCountNode.querySelector('.countValue');
              if (countSpan) {
                countSpan.textContent = self.totalCount !== null
                  ? self.formatNumber(self.totalCount)
                  : 'All matching';
              }
            }
          },
          function (err) {
            console.warn('Failed to fetch record count:', err);
            if (self.allCountNode) {
              var countSpan = self.allCountNode.querySelector('.countValue');
              if (countSpan) {
                countSpan.textContent = 'All matching';
              }
            }
          }
        );
      });
    },

    /**
     * Select a scope option
     */
    _selectScope: function (scope) {
      // Don't allow selecting disabled options
      if (scope === 'selected' && this.selectionCount === 0) {
        return;
      }

      this.selectedScope = scope;

      // Update radio buttons
      if (this.selectedRadio) this.selectedRadio.checked = (scope === 'selected');
      if (this.allRadio) this.allRadio.checked = (scope === 'all');
      if (this.randomRadio) this.randomRadio.checked = (scope === 'random');

      // Update visual selection
      query('.recordOption', this.optionsNode).forEach(function (node) {
        domClass.remove(node, 'selected');
      });

      var selectedNode = query('.recordOption[data-scope="' + scope + '"]', this.optionsNode)[0];
      if (selectedNode) {
        domClass.add(selectedNode, 'selected');
      }

      // Clear error
      this.clearError();

      // Notify wizard
      this.notifyDataChanged();
    },

    /**
     * Update UI state
     */
    _updateUI: function () {
      // Ensure correct option is visually selected
      query('.recordOption', this.optionsNode).forEach(function (node) {
        domClass.remove(node, 'selected');
      });

      var selectedNode = query('.recordOption[data-scope="' + this.selectedScope + '"]', this.optionsNode)[0];
      if (selectedNode) {
        domClass.add(selectedNode, 'selected');
      }
    },

    /**
     * Validate the step
     */
    validate: function () {
      if (this.selectedScope === 'selected' && this.selectionCount === 0) {
        return {
          valid: false,
          message: 'No records are selected. Please select records or choose a different option.'
        };
      }

      if (this.selectedScope === 'random') {
        var limit = parseInt(this.randomLimitInput.value, 10);
        if (isNaN(limit) || limit < 1) {
          return {
            valid: false,
            message: 'Please enter a valid number for the random subset limit.'
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
        scope: this.selectedScope,
        selectionCount: this.selectionCount,
        totalCount: this.totalCount,
        randomLimit: this.selectedScope === 'random'
          ? parseInt(this.randomLimitInput.value, 10) || 2000
          : null
      };
    },

    /**
     * Reset the step
     */
    reset: function () {
      this.inherited(arguments);
      this.selectedScope = 'all';
      this._selectScope('all');
      if (this.randomLimitInput) {
        this.randomLimitInput.value = '2000';
      }
    },

    /**
     * Check if step can be skipped (single record scenarios)
     */
    canSkip: function () {
      // Skip if there's only one record
      return this.selectionCount === 1 && this.totalCount === 1;
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
