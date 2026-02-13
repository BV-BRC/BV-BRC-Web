define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/on',
  'dojo/topic',
  'dojo/dom-class',
  'dojo/dom-construct',
  'dojo/query',
  'dojo/when',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/SavedSearchBrowser.html',
  '../../util/SavedSearchManager',
  '../../util/QueryToEnglish',
  './UnifiedDownloadWizard'
], function (
  declare,
  lang,
  on,
  topic,
  domClass,
  domConstruct,
  query,
  when,
  _WidgetBase,
  _TemplatedMixin,
  _WidgetsInTemplateMixin,
  template,
  SavedSearchManager,
  QueryToEnglish,
  UnifiedDownloadWizard
) {
  /**
   * SavedSearchBrowser - Widget for browsing and managing saved searches
   *
   * Features:
   * - List all saved searches with filtering
   * - Search by name or data type
   * - Sort by name, date, or data type
   * - Actions: Run, Download, Edit, Delete
   * - Import from workspace
   * - Batch operations
   */

  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
    templateString: template,

    // State
    searches: null,
    filteredSearches: null,
    selectedIds: null,
    sortField: 'updatedAt',
    sortDirection: 'desc',
    filterText: '',
    filterDataType: '',

    // Event handlers
    _handlers: null,
    _subscriptions: null,

    // Callbacks
    onSearchRun: null,
    onSearchDownload: null,

    constructor: function () {
      this.searches = [];
      this.filteredSearches = [];
      this.selectedIds = [];
      this._handlers = [];
      this._subscriptions = [];
    },

    postCreate: function () {
      this.inherited(arguments);
      this._setupEventHandlers();
      this._setupSubscriptions();
      this.refresh();
    },

    /**
     * Setup event handlers
     */
    _setupEventHandlers: function () {
      var self = this;

      // Search input
      if (this.searchInput) {
        var searchHandler = on(this.searchInput, 'input', function () {
          self.filterText = this.value;
          self._applyFilters();
        });
        this._handlers.push(searchHandler);
      }

      // Data type filter
      if (this.dataTypeFilter) {
        var typeHandler = on(this.dataTypeFilter, 'change', function () {
          self.filterDataType = this.value;
          self._applyFilters();
        });
        this._handlers.push(typeHandler);
      }

      // Sort select
      if (this.sortSelect) {
        var sortHandler = on(this.sortSelect, 'change', function () {
          var parts = this.value.split(':');
          self.sortField = parts[0];
          self.sortDirection = parts[1] || 'asc';
          self._applyFilters();
        });
        this._handlers.push(sortHandler);
      }

      // Select all checkbox
      if (this.selectAllCheckbox) {
        var selectAllHandler = on(this.selectAllCheckbox, 'change', function () {
          self._toggleSelectAll(this.checked);
        });
        this._handlers.push(selectAllHandler);
      }
    },

    /**
     * Setup topic subscriptions
     */
    _setupSubscriptions: function () {
      var self = this;

      this._subscriptions.push(
        topic.subscribe('/SavedSearch/changed', function (event) {
          self.refresh();
        })
      );
    },

    /**
     * Refresh the list from storage
     */
    refresh: function () {
      this.searches = SavedSearchManager.list() || [];
      this._updateDataTypeFilter();
      this._applyFilters();
    },

    /**
     * Update data type filter options
     */
    _updateDataTypeFilter: function () {
      if (!this.dataTypeFilter) return;

      // Collect unique data types
      var dataTypes = {};
      this.searches.forEach(function (search) {
        if (search.dataType) {
          dataTypes[search.dataType] = true;
        }
      });

      // Clear existing options (except "All")
      while (this.dataTypeFilter.options.length > 1) {
        this.dataTypeFilter.remove(1);
      }

      // Add data type options
      Object.keys(dataTypes).sort().forEach(function (dataType) {
        var option = document.createElement('option');
        option.value = dataType;
        option.textContent = this._formatDataType(dataType);
        this.dataTypeFilter.appendChild(option);
      }, this);
    },

    /**
     * Apply filters and sorting
     */
    _applyFilters: function () {
      var self = this;
      var filterLower = this.filterText.toLowerCase();

      // Filter
      this.filteredSearches = this.searches.filter(function (search) {
        // Text filter
        if (filterLower) {
          var matchesName = search.name && search.name.toLowerCase().indexOf(filterLower) !== -1;
          var matchesQuery = search.rqlQuery && search.rqlQuery.toLowerCase().indexOf(filterLower) !== -1;
          if (!matchesName && !matchesQuery) {
            return false;
          }
        }

        // Data type filter
        if (self.filterDataType && search.dataType !== self.filterDataType) {
          return false;
        }

        return true;
      });

      // Sort
      this.filteredSearches.sort(function (a, b) {
        var aVal = a[self.sortField] || '';
        var bVal = b[self.sortField] || '';

        if (self.sortField === 'updatedAt' || self.sortField === 'createdAt') {
          aVal = new Date(aVal).getTime() || 0;
          bVal = new Date(bVal).getTime() || 0;
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        var result = aVal < bVal ? -1 : (aVal > bVal ? 1 : 0);
        return self.sortDirection === 'desc' ? -result : result;
      });

      this._renderSearchList();
    },

    /**
     * Render the search list
     */
    _renderSearchList: function () {
      var self = this;
      domConstruct.empty(this.searchListNode);

      if (this.filteredSearches.length === 0) {
        domConstruct.create('div', {
          'class': 'emptyMessage',
          innerHTML: this.searches.length === 0
            ? '<i class="fa fa-info-circle"></i> No saved searches yet. Save a search from any data view.'
            : '<i class="fa fa-search"></i> No searches match your filter.'
        }, this.searchListNode);
        return;
      }

      this.filteredSearches.forEach(function (search) {
        var isSelected = self.selectedIds.indexOf(search.id) !== -1;
        var searchNode = self._createSearchNode(search, isSelected);
        domConstruct.place(searchNode, self.searchListNode);
      });

      // Update count
      if (this.countNode) {
        this.countNode.textContent = this.filteredSearches.length + ' of ' + this.searches.length + ' searches';
      }
    },

    /**
     * Create a search list item node
     * @param {Object} search - Search descriptor
     * @param {boolean} isSelected - Whether selected
     * @returns {HTMLElement} List item node
     */
    _createSearchNode: function (search, isSelected) {
      var self = this;

      var container = domConstruct.create('div', {
        'class': 'searchItem' + (isSelected ? ' selected' : ''),
        'data-search-id': search.id
      });

      // Checkbox
      var checkbox = domConstruct.create('input', {
        type: 'checkbox',
        'class': 'searchCheckbox',
        checked: isSelected
      }, container);

      var checkHandler = on(checkbox, 'change', function () {
        self._toggleSelection(search.id, this.checked);
      });
      this._handlers.push(checkHandler);

      // Info section
      var infoSection = domConstruct.create('div', {
        'class': 'searchInfo'
      }, container);

      // Name
      domConstruct.create('div', {
        'class': 'searchName',
        textContent: search.name || 'Unnamed Search'
      }, infoSection);

      // Details row
      var detailsRow = domConstruct.create('div', {
        'class': 'searchDetails'
      }, infoSection);

      domConstruct.create('span', {
        'class': 'searchDataType',
        innerHTML: '<i class="fa fa-database"></i> ' + this._formatDataType(search.dataType)
      }, detailsRow);

      if (search.updatedAt) {
        domConstruct.create('span', {
          'class': 'searchDate',
          innerHTML: '<i class="fa fa-clock-o"></i> ' + this._formatDate(search.updatedAt)
        }, detailsRow);
      }

      // Query preview
      var queryPreview = QueryToEnglish.toPlainText(search.rqlQuery);
      if (queryPreview && queryPreview.length > 80) {
        queryPreview = queryPreview.substring(0, 80) + '...';
      }
      domConstruct.create('div', {
        'class': 'searchQuery',
        textContent: queryPreview || '(all records)'
      }, infoSection);

      // Actions
      var actionsSection = domConstruct.create('div', {
        'class': 'searchActions'
      }, container);

      // Run button
      var runButton = domConstruct.create('button', {
        'class': 'actionButton runButton',
        title: 'Run this search',
        innerHTML: '<i class="fa fa-play"></i>'
      }, actionsSection);
      var runHandler = on(runButton, 'click', function (e) {
        e.stopPropagation();
        self._runSearch(search);
      });
      this._handlers.push(runHandler);

      // Download button
      var downloadButton = domConstruct.create('button', {
        'class': 'actionButton downloadButton',
        title: 'Download results',
        innerHTML: '<i class="fa fa-download"></i>'
      }, actionsSection);
      var downloadHandler = on(downloadButton, 'click', function (e) {
        e.stopPropagation();
        self._downloadSearch(search);
      });
      this._handlers.push(downloadHandler);

      // Delete button
      var deleteButton = domConstruct.create('button', {
        'class': 'actionButton deleteButton',
        title: 'Delete this search',
        innerHTML: '<i class="fa fa-trash"></i>'
      }, actionsSection);
      var deleteHandler = on(deleteButton, 'click', function (e) {
        e.stopPropagation();
        self._deleteSearch(search);
      });
      this._handlers.push(deleteHandler);

      return container;
    },

    /**
     * Format data type for display
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
     * Format date for display
     */
    _formatDate: function (dateStr) {
      var date = new Date(dateStr);
      var now = new Date();
      var diffMs = now - date;
      var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return diffDays + ' days ago';
      } else {
        return date.toLocaleDateString();
      }
    },

    /**
     * Toggle selection for a search
     */
    _toggleSelection: function (searchId, selected) {
      var index = this.selectedIds.indexOf(searchId);

      if (selected && index === -1) {
        this.selectedIds.push(searchId);
      } else if (!selected && index !== -1) {
        this.selectedIds.splice(index, 1);
      }

      this._updateBatchActions();
    },

    /**
     * Toggle select all
     */
    _toggleSelectAll: function (selected) {
      var self = this;

      if (selected) {
        this.selectedIds = this.filteredSearches.map(function (s) { return s.id; });
      } else {
        this.selectedIds = [];
      }

      // Update checkboxes
      query('.searchCheckbox', this.searchListNode).forEach(function (cb) {
        cb.checked = selected;
      });

      query('.searchItem', this.searchListNode).forEach(function (node) {
        if (selected) {
          domClass.add(node, 'selected');
        } else {
          domClass.remove(node, 'selected');
        }
      });

      this._updateBatchActions();
    },

    /**
     * Update batch action buttons visibility
     */
    _updateBatchActions: function () {
      var hasSelection = this.selectedIds.length > 0;

      if (this.batchActionsNode) {
        if (hasSelection) {
          domClass.remove(this.batchActionsNode, 'dijitHidden');
        } else {
          domClass.add(this.batchActionsNode, 'dijitHidden');
        }
      }

      if (this.selectionCountNode) {
        this.selectionCountNode.textContent = this.selectedIds.length + ' selected';
      }
    },

    /**
     * Run a search - navigate to the search results
     */
    _runSearch: function (search) {
      // Build URL based on data type
      var url = '/view/DataType/' + search.dataType;

      if (search.rqlQuery) {
        url += '?' + search.rqlQuery;
      }

      // Navigate
      if (window.App && window.App.navigate) {
        window.App.navigate(url);
      } else {
        window.location.href = url;
      }

      // Callback
      if (this.onSearchRun) {
        this.onSearchRun(search);
      }
    },

    /**
     * Download search results
     */
    _downloadSearch: function (search) {
      // Open download wizard with this search's context
      UnifiedDownloadWizard.show({
        dataType: search.dataType,
        rqlQuery: search.rqlQuery,
        downloadConfig: search.downloadConfig
      });

      // Callback
      if (this.onSearchDownload) {
        this.onSearchDownload(search);
      }
    },

    /**
     * Delete a search
     */
    _deleteSearch: function (search) {
      var confirmed = confirm('Delete saved search "' + search.name + '"?');
      if (!confirmed) return;

      SavedSearchManager.delete(search.id);

      topic.publish('/SavedSearch/changed', {
        action: 'delete',
        searchId: search.id
      });

      this.refresh();
    },

    /**
     * Handle batch delete
     */
    _onBatchDelete: function () {
      if (this.selectedIds.length === 0) return;

      var confirmed = confirm('Delete ' + this.selectedIds.length + ' saved searches?');
      if (!confirmed) return;

      var self = this;
      this.selectedIds.forEach(function (id) {
        SavedSearchManager.delete(id);
      });

      this.selectedIds = [];

      topic.publish('/SavedSearch/changed', {
        action: 'batchDelete'
      });

      this.refresh();
    },

    /**
     * Handle import from workspace
     */
    _onImport: function () {
      // This would open a workspace browser dialog
      // For now, prompt for path
      var path = prompt('Enter workspace path to import from:');
      if (!path) return;

      var self = this;
      when(
        SavedSearchManager.importFromWorkspace(path),
        function (result) {
          if (result) {
            topic.publish('/SavedSearch/changed', {
              action: 'import',
              search: result
            });
            self.refresh();
          }
        },
        function (err) {
          console.error('Import failed:', err);
          alert('Failed to import saved search: ' + err.message);
        }
      );
    },

    /**
     * Destroy
     */
    destroy: function () {
      this._handlers.forEach(function (h) {
        h.remove();
      });
      this._handlers = [];

      this._subscriptions.forEach(function (sub) {
        sub.remove();
      });
      this._subscriptions = [];

      this.inherited(arguments);
    }
  });
});
