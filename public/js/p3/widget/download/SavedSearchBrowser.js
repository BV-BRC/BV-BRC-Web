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
        // Show empty message
        if (this.emptyMessageNode) {
          domClass.remove(this.emptyMessageNode, 'dijitHidden');
          domConstruct.empty(this.emptyMessageNode);
          domConstruct.create('div', {
            'class': 'emptyMessage',
            innerHTML: this.searches.length === 0
              ? '<i class="fa fa-info-circle"></i> No saved searches yet. Save a search from any data view.'
              : '<i class="fa fa-search"></i> No searches match your filter.'
          }, this.emptyMessageNode);
        }
        return;
      }

      // Hide empty message
      if (this.emptyMessageNode) {
        domClass.add(this.emptyMessageNode, 'dijitHidden');
      }

      this.filteredSearches.forEach(function (search) {
        var isSelected = self.selectedIds.indexOf(search.id) !== -1;
        var searchRow = self._createSearchRow(search, isSelected);
        domConstruct.place(searchRow, self.searchListNode);
      });

      // Update count
      if (this.countNode) {
        this.countNode.textContent = this.filteredSearches.length + ' of ' + this.searches.length + ' searches';
      }
    },

    /**
     * Create a search table row
     * @param {Object} search - Search descriptor
     * @param {boolean} isSelected - Whether selected
     * @returns {HTMLElement} Table row element
     */
    _createSearchRow: function (search, isSelected) {
      var self = this;

      var row = domConstruct.create('tr', {
        'class': 'searchRow' + (isSelected ? ' selected' : ''),
        'data-search-id': search.id
      });

      // Checkbox cell
      var checkboxCell = domConstruct.create('td', {
        'class': 'colCheckbox'
      }, row);
      var checkbox = domConstruct.create('input', {
        type: 'checkbox',
        'class': 'searchCheckbox',
        checked: isSelected
      }, checkboxCell);
      var checkHandler = on(checkbox, 'change', function () {
        self._toggleSelection(search.id, this.checked);
      });
      this._handlers.push(checkHandler);

      // Data type cell
      domConstruct.create('td', {
        'class': 'colDataType',
        innerHTML: '<i class="fa fa-database"></i> ' + this._formatDataType(search.dataType)
      }, row);

      // Name cell
      domConstruct.create('td', {
        'class': 'colName',
        textContent: search.name || 'Unnamed Search'
      }, row);

      // Query cell
      var queryPreview = QueryToEnglish.toPlainText(search.rqlQuery);
      if (queryPreview && queryPreview.length > 100) {
        queryPreview = queryPreview.substring(0, 100) + '...';
      }
      domConstruct.create('td', {
        'class': 'colQuery',
        textContent: queryPreview || '(all records)',
        title: search.rqlQuery // Show full query on hover
      }, row);

      // Actions cell
      var actionsCell = domConstruct.create('td', {
        'class': 'colActions'
      }, row);

      // Run button
      var runButton = domConstruct.create('button', {
        'class': 'actionButton runButton',
        title: 'Run this search',
        type: 'button'
      }, actionsCell);
      domConstruct.create('span', { 'class': 'fa icon-play' }, runButton);
      domConstruct.create('span', { 'class': 'btnText', textContent: ' Run' }, runButton);
      var runHandler = on(runButton, 'click', function (e) {
        e.stopPropagation();
        self._runSearch(search);
      });
      this._handlers.push(runHandler);

      // Download button
      var downloadButton = domConstruct.create('button', {
        'class': 'actionButton downloadButton',
        title: 'Download results',
        type: 'button'
      }, actionsCell);
      domConstruct.create('span', { 'class': 'fa icon-download' }, downloadButton);
      domConstruct.create('span', { 'class': 'btnText', textContent: ' Download' }, downloadButton);
      var downloadHandler = on(downloadButton, 'click', function (e) {
        e.stopPropagation();
        self._downloadSearch(search);
      });
      this._handlers.push(downloadHandler);

      // Delete button
      var deleteButton = domConstruct.create('button', {
        'class': 'actionButton deleteButton',
        title: 'Delete this search',
        type: 'button'
      }, actionsCell);
      domConstruct.create('span', { 'class': 'fa icon-trash' }, deleteButton);
      domConstruct.create('span', { 'class': 'btnText', textContent: ' Delete' }, deleteButton);
      var deleteHandler = on(deleteButton, 'click', function (e) {
        e.stopPropagation();
        self._deleteSearch(search);
      });
      this._handlers.push(deleteHandler);

      return row;
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

      // Update checkboxes in table rows
      query('.searchCheckbox', this.searchListNode).forEach(function (cb) {
        cb.checked = selected;
      });

      query('.searchRow', this.searchListNode).forEach(function (row) {
        if (selected) {
          domClass.add(row, 'selected');
        } else {
          domClass.remove(row, 'selected');
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
      // Map data types to their view URLs
      var dataTypeToView = {
        'genome': 'GenomeList',
        'genome_feature': 'FeatureList',
        'genome_sequence': 'SequenceList',
        'sp_gene': 'SpecialtyGeneList',
        'sp_gene_ref': 'SpecialtyGeneList',
        'pathway': 'PathwayList',
        'subsystem': 'SubsystemList',
        'protein_structure': 'ProteinStructureList',
        'epitope': 'EpitopeList',
        'surveillance': 'SurveillanceList',
        'serology': 'SerologyList',
        'transcriptomics_experiment': 'ExperimentList',
        'transcriptomics_sample': 'TranscriptomicsSampleList',
        'transcriptomics_gene': 'TranscriptomicsGeneList',
        'experiment': 'ExperimentList',
        'bioset': 'BiosetList',
        'ppi': 'InteractionList',
        'genome_amr': 'AMRPanelList',
        'protein_feature': 'ProteinFeatureList',
        'sequence_feature': 'SequenceFeatureList'
      };

      // Build URL based on data type
      var viewName = dataTypeToView[search.dataType] || 'GenomeList';
      var url = '/view/' + viewName + '/';

      // Clean up the RQL query:
      // 1. Remove wildcard conditions like eq(genome_id,*)
      // 2. Extract inner query from data type wrappers like genome(...)
      var rqlQuery = search.rqlQuery || '';

      // Remove wildcard patterns
      rqlQuery = rqlQuery
        .replace(/eq\([a-z_]+_id,\*\)&?/gi, '')
        .replace(/^&+|&+$/g, '')
        .replace(/&&+/g, '&');

      // Extract inner query from data type wrappers (e.g., genome(and(...)))
      var wrapperMatch = rqlQuery.match(/^(genome|genome_feature|genome_sequence|sp_gene|pathway|subsystem)\((.+)\)$/i);
      if (wrapperMatch) {
        rqlQuery = wrapperMatch[2];
      }

      if (rqlQuery) {
        url += '?' + rqlQuery;
      }

      // Navigate using direct location change
      window.location.href = url;

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
