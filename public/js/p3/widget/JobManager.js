define([
  'dojo/_base/declare', 'dojo/on', 'dojo/_base/lang', 'dojo/query',
  'dojo/dom-class', 'dojo/dom-attr', 'dojo/dom-construct', './JobsGrid', './JobContainerActionBar',
  'dojo/_base/Deferred', '../JobManager', './Confirmation', './RerunUtility',
  'dojo/topic', 'dijit/layout/BorderContainer', './ActionBar', './ItemDetailPanel', '../util/encodePath',
  './copilot/ChatSessionContainerSidePanel', './copilot/CopilotApi', './copilot/ChatSessionOptionsBarSidePanel',
  'dijit/Dialog', 'dijit/layout/ContentPane', 'dojo/hash', 'dojo/io-query'
], function (
  declare, on, lang, query,
  domClass, domAttr, domConstr, JobsGrid, JobContainerActionBar,
  Deferred, JobManager, Confirmation, rerunUtility,
  Topic, BorderContainer, ActionBar, ItemDetailPanel, encodePath,
  ChatSessionContainerSidePanel, CopilotAPI, ChatSessionOptionsBar,
  Dialog, ContentPane, hash, ioQuery
) {
  return declare([BorderContainer], {
    disabled: false,
    path: '/',
    serviceFilter: null,

    // Parse URL hash parameters into filter state
    _parseHashParams: function () {
      var hashValue = hash();
      if (!hashValue) {
        return {};
      }
      return ioQuery.queryToObject(hashValue);
    },

    // Update URL hash with current filter state
    _updateHash: function (filters) {
      var params = {};
      if (filters.status) {
        // Convert RegExp back to string for URL
        if (filters.status instanceof RegExp) {
          if (filters.status.test('queued')) {
            params.status = 'queued';
          } else if (filters.status.test('failed')) {
            params.status = 'failed';
          } else if (filters.status.test('in-progress')) {
            params.status = 'in-progress';
          } else if (filters.status.test('completed')) {
            params.status = 'completed';
          }
        } else {
          params.status = filters.status;
        }
      }
      if (filters.app && filters.app !== 'all') {
        params.app = filters.app;
      }
      if (filters.keyword) {
        params.keyword = filters.keyword;
      }
      if (filters.selectedJob) {
        params.selected = filters.selectedJob;
      }
      if (filters.page && filters.page > 1) {
        params.page = filters.page;
      }
      if (filters.sort) {
        params.sort = filters.sort;
      }
      if (filters.sortDesc !== undefined) {
        params.desc = filters.sortDesc ? '1' : '0';
      }
      if (filters.includeArchived) {
        params.archived = '1';
      }

      var hashString = ioQuery.objectToQuery(params);
      hash(hashString, true); // true = replace current history entry
    },

    // Restore filter state from URL hash parameters
    // If skipGridQuery is true, don't call grid.set('query') - used during startup
    // when the grid hasn't loaded yet
    _restoreStateFromUrl: function (skipGridQuery) {
      var params = this._parseHashParams();
      if (!params || Object.keys(params).length === 0) {
        return;
      }

      var filters = {};

      // Restore status filter
      if (params.status) {
        filters.status = params.status;
        // Convert string to RegExp as needed
        if (params.status === 'queued') {
          filters.status = new RegExp('queued|init|pending');
        } else if (params.status === 'failed') {
          filters.status = new RegExp('failed|deleted');
        }
      }

      // Restore app filter
      if (params.app) {
        filters.app = params.app;
      }

      // Restore archive filter
      if (params.archived === '1') {
        filters.includeArchived = true;
      }

      // Store filters in serviceFilter so grid uses them on first load
      if (Object.keys(filters).length > 0) {
        this.serviceFilter = filters;
        // Only set grid query if not during startup (skipGridQuery is false/undefined)
        if (!skipGridQuery && this.grid) {
          this.grid.set('query', filters);
        }
      }

      // Restore UI state in containerActionBar
      if (this.containerActionBar) {
        // Restore status button active state
        if (params.status && this.containerActionBar.statusBtns) {
          var statusBtns = this.containerActionBar.statusBtns;
          var allBtn = query('.JobFilter', statusBtns)[0];
          var buttons = query('.JobFilter', statusBtns);

          // Map status to button index (0=all, 1=queued, 2=running, 3=completed, 4=failed)
          var statusToIndex = {
            'queued': 1,
            'in-progress': 2,
            'completed': 3,
            'failed': 4
          };

          var btnIndex = statusToIndex[params.status];
          if (btnIndex !== undefined && buttons[btnIndex]) {
            // Remove active from all, add to selected
            buttons.forEach(function (btn) {
              domClass.remove(btn, 'active');
            });
            domClass.add(buttons[btnIndex], 'active');
            // Show the "All statuses" button
            if (allBtn) {
              allBtn.style.display = 'inline';
            }
          }
        }

        // Restore app filter in selector
        if (params.app && this.containerActionBar._selector) {
          this.containerActionBar.filters.app = params.app;
          this.containerActionBar._selector.set('value', params.app, false);
        }

        // Restore status in containerActionBar filters
        if (params.status) {
          this.containerActionBar.filters.status = params.status;
        }

        // Restore archive checkbox state
        if (params.archived === '1' && this.containerActionBar._archiveCheckbox) {
          this.containerActionBar._archiveCheckbox.checked = true;
          this.containerActionBar.filters.includeArchived = true;
        }
      }

      // Restore keyword/search filter
      if (params.keyword) {
        // Use 'search' key for server-side filtering via SimpleTaskFilter
        filters.search = params.keyword;
        filters.keyword = params.keyword; // Keep for URL persistence
        // Store in serviceFilter - grid will use it on first load
        this.serviceFilter = filters;
      }

      // Restore sort order
      // When skipGridQuery is true, we don't set sort on the grid directly
      // because that triggers a refresh. Instead, we store it in serviceFilter
      // and the grid's queryOptions, and it will be applied on the next query.
      if (params.sort) {
        var descending = params.desc === '1';
        // Store sort in serviceFilter for URL persistence
        if (!this.serviceFilter) {
          this.serviceFilter = {};
        }
        this.serviceFilter.sort = params.sort;
        this.serviceFilter.sortDesc = descending;

        // Only set sort on grid directly if we're not skipping the query
        // Otherwise, setting sort triggers a refresh which causes race conditions
        if (!skipGridQuery && this.grid) {
          this.grid.set('sort', [{ attribute: params.sort, descending: descending }]);
        } else if (this.grid) {
          // Set the grid's sort property directly without triggering a refresh
          // This ensures the column header shows the correct sort indicator
          this.grid.sort = [{ attribute: params.sort, descending: descending }];
          if (this.grid.queryOptions) {
            this.grid.queryOptions.sort = [{ attribute: params.sort, descending: descending }];
          }
        }
      }

      // Store page and selection for restoration after grid renders
      this._pendingPage = params.page ? parseInt(params.page, 10) : null;
      this._pendingSelection = params.selected || null;
    },

    // Restore page and selection after grid has rendered
    _restorePageAndSelection: function () {
      var _self = this;

      // Go to the saved page first
      if (this._pendingPage && this._pendingPage > 1 && this.grid && this.grid.gotoPage) {
        var targetPage = this._pendingPage;
        this._pendingPage = null; // Clear immediately to prevent loop
        this.grid.gotoPage(targetPage).then(function () {
          // After page is loaded, restore selection
          _self._restoreSelection();
        });
      } else {
        this._pendingPage = null; // Clear even if no page to restore
        // No page to restore, just restore selection
        this._restoreSelection();
      }
    },

    // Restore selection after grid data is loaded
    _restoreSelection: function () {
      if (!this._pendingSelection || !this.grid) {
        return;
      }

      var _self = this;
      var jobId = this._pendingSelection;

      // Try to find and select the row
      // The grid uses job ID as the row identifier
      try {
        var row = this.grid.row(jobId);
        if (row && row.element) {
          this.grid.select(row);
          // Scroll the row into view
          row.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (e) {
        console.warn('Could not restore selection for job:', jobId, e);
      }

      // Clear pending selection
      this._pendingSelection = null;
    },

    listJobs: function () {
      var _self = this;
      return Deferred.when(JobManager.getJobs(), function (res) {
        return res;
      }, function (err) {
        console.log('Error Getting Jobs:', err);
        _self.showError(err);
      });
    },
    postCreate: function () {
      this.inherited(arguments);
      domClass.add(this.domNode, 'JobManager');
    },

    showError: function (err) {
      domConstr.create('div', {
        style: {
          position: 'relative',
          zIndex: 999,
          padding: '10px',
          margin: 'auto',
          marginTop: '300px',
          width: '30%',
          border: '2px solid #aaa',
          borderRadius: '4px',
          textAlign: 'center',
          color: 'red',
          fontSize: '1.2em'
        },
        innerHTML: err
      }, this.domNode);

    },

    render: function (items) {
      items.sort(function (a, b) {
        return (Date.parse(a.submit_time) < Date.parse(b.submit_time)) ? 1 : -1;
      });

      this.grid.refresh();
      this.grid.renderArray(items);
    },

    selectionActions: [
      [
        'ToggleItemDetail',
        'fa icon-chevron-circle-right fa-2x', {
          label: 'HIDE',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Toggle Selection Detail'
        },
        function (selection) {
          var children = this.getChildren();
          if (children.some(function (child) {
            return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
          }, this)) {
            this.removeChild(this.itemDetailPanel);
          }
          else {
            this.addChild(this.itemDetailPanel);
          }
        },
        true
      ], [
        'ViewFeatureItem',
        'MultiButton fa icon-eye fa-2x',
        {
          label: 'VIEW',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'View Job Results',
          validContainerTypes: ['*']
        },
        function (selection) {
          var params = selection[0].parameters;
          var path = encodePath(params.output_path + '/' + params.output_file);
          Topic.publish('/navigate', { href: '/workspace' + path });
        },
        false
      ], [
        'KillJob',
        'MultiButton fa icon-ban fa-2x',
        {
          label: 'KILL JOB',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Kill (Cancel) Selected Job',
          validContainerTypes: ['*']
        },
        function (selection) {
          var sel = selection[0],
            id = sel.id;

          var conf = 'Are you sure you want to terminate this ' + sel.app + ' job?<br><br>' +
            '<b>Job ID</b>: ' + id + '<br><br>';

          var dlg = new Confirmation({
            title: 'Kill Job',
            content: conf,
            style: { width: '375px' },
            onConfirm: function (evt) {
              JobManager.killJob(id);
            }
          });
          dlg.startup();
          dlg.show();

        },
        false
      ], [
        'ReportIssue',
        'MultiButton fa icon-commenting-o fa-2x',
        {
          label: 'REPORT<br>ISSUE...',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Report an Issue with this Job',
          validContainerTypes: ['*']
        },
        function (selection) {
          var sel = selection[0];

          var descriptRequired = sel.status !== 'failed';

          try {
            var content =
              (descriptRequired ? '' :
                '\n[Please feel free to add any additional information regarding this issue here.]\n\n\n') +
              '********************** JOB INFO *************************\n\n' +
              'Job ID: ' + sel.id + '\n' +
              'Job Status: ' + sel.status + '\n' +
              'Service Name: ' + sel.app + '\n' +
              'App Name: ' + sel.application_name + '\n\n' +
              'Stdout: ' + window.App.serviceAPI + '/task_info/' + sel.id + '/stdout\n' +
              'Stderr: ' + window.App.serviceAPI + '/task_info/' + sel.id + '/stderr\n\n' +
              'Submit Time: ' + sel.submit_time + '\n' +
              'Start Time: ' + sel.submit_time + '\n' +
              'Completed Time: ' + sel.submit_time + '\n\n' +
              'Parameters:\n' +
              '{code}\n' +
              JSON.stringify(sel.parameters, null, 4) +
              '\n{code}\n';
          } catch (e) {
            var content = 'There was an issue fetching some of job info.  Error: ' + e;
          }

          Topic.publish('/openDialog', {
            type: 'reportProblem',
            params: {
              issueText: content,
              issueSubject: 'Reporting Issue with ' + sel.application_name,
              jobDescriptRequired: descriptRequired,
              jobStatus: sel.status
            }
          });
        },
        false
      ], [
        'Rerun',
        'MultiButton fa icon-rotate-left fa-2x',
        {
          label: 'RERUN',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Return to service page with same job parameters',
          validContainerTypes: ['*']
        },
        function (selection) {
          rerunUtility.rerun(JSON.stringify(selection[0].parameters), selection[0].app, window, Topic);
        },
        false
      ], [
        'CopilotChat',
        'fa icon-comment fa-2x',
        {
          label: 'Chat',
          tooltip: 'Chat with Copilot',
          persistent: true,
          multiple: false,
          validTypes: ['*'],
        },
        function (selection, container, button) {
          console.log('CopilotChat');
          // Check if chat panel already exists
          if (this.chatPanelWrapper) {
            // If chat panel exists, toggle between chat and details panel
            if (this.getChildren().indexOf(this.chatPanelWrapper) > -1) {
              // Chat panel is currently shown, switch to details panel
              this.removeChild(this.chatPanelWrapper);
              if (this.itemDetailPanel) {
                this.addChild(this.itemDetailPanel);
              }
            } else {
              // Details panel is shown, switch to chat panel
              if (this.itemDetailPanel) {
                this.removeChild(this.itemDetailPanel);
              }
              this.addChild(this.chatPanelWrapper);
            }
            return;
          }

          // Create new CopilotAPI
          this.copilotAPI = new CopilotAPI({
            user_id: window.App.user.l_id
          });

          this.copilotAPI.getModelList().then(lang.hitch(this, function(modelsAndRag) {

            var modelList = JSON.parse(modelsAndRag.models);
            var ragList = JSON.parse(modelsAndRag.vdb_list);

            // Add options bar to top of sidebar
            var chatOptionsBar = new ChatSessionOptionsBar({
              region: 'top',
              style: 'height: 30px; ',
              copilotApi: this.copilotAPI,
              modelList: modelList,
              ragList: ragList
            });

            // Create new chat panel wrapped in a ContentPane to prevent layout conflicts
            this.chatPanelWrapper = new ContentPane({
              region: 'right',
              splitter: true,
              style: 'width: 32%; padding: 0; margin: 0; overflow: hidden;',
              layoutPriority: 1
            });

            this.chatPanel = new ChatSessionContainerSidePanel({
              style: 'width: 100%; height: 100%; border: 0; padding: 0; margin: 0;',
              copilotApi: this.copilotAPI,
              containerSelection: selection,
              optionsBar: chatOptionsBar,
              context: 'job-manager'
            });

            this.chatPanel._setupContainerWatch();

            // Add chat panel to wrapper
            this.chatPanelWrapper.addChild(this.chatPanel);

            // Remove itemDetailPanel if it exists and add wrapped chat panel in its place
            if (this.itemDetailPanel && this.getChildren().indexOf(this.itemDetailPanel) > -1) {
              this.removeChild(this.itemDetailPanel);
            }

            // Add wrapped chat panel
            this.addChild(this.chatPanelWrapper);

            // Wait for input widget to be created before setting initial selection
            Topic.subscribe('setInitialJobSelection', lang.hitch(this, function() {
              var selection = this.actionBar.get('selection');
              if (this.chatPanel.inputWidget && selection.length > 0) {
                this.chatPanel.set('containerSelection', selection);
                this.chatPanel.inputWidget.setSystemPromptWithData(selection);
                this.chatPanel.inputWidget.setCurrentSelection(selection);
              }
            }));
          })).catch(lang.hitch(this, function(err) {
            new Dialog({
              title: "Service Unavailable",
              content: "The BV-BRC Copilot service is currently disabled. Please try again later.",
              style: "width: 300px"
            }).show();
            console.error('Error setting up chat panel:', err);
          }));
        },
        false
      ]
    ],

    startup: function () {
      // Always clear the store cache when navigating to the jobs page
      // This ensures fresh data is displayed even if the widget was previously started
      var store = JobManager.getStore();
      if (store && store.clearCache) {
        store.clearCache();
      }

      if (this._started) {
        // Widget was already started - restore state from URL and refresh
        // Use skipGridQuery=true since we'll refresh manually after
        this._restoreStateFromUrl(true);
        if (this.grid && typeof this.grid.refresh === 'function') {
          // Apply serviceFilter to grid query before refresh
          if (this.serviceFilter) {
            this.grid.set('query', this.serviceFilter);
          } else {
            this.grid.refresh();
          }
        }
        return;
      }
      this.inherited(arguments);

      var _self = this;

      this.grid = new JobsGrid({
        region: 'center'
      });


      this.containerActionBar = new JobContainerActionBar({
        region: 'top',
        className: 'BrowserHeader',
        header: 'Job Status',
        layoutPriority: 3
      });

      this.actionBar = new ActionBar({
        splitter: false,
        region: 'right',
        layoutPriority: 2,
        style: 'width:58px;text-align:center;'
      });

      this.itemDetailPanel = new ItemDetailPanel({
        region: 'right',
        layoutPriority: 1,
        splitter: true,
        style: 'width:250px;'
      });

      this.setupActions();

      this.grid.on('ItemDblClick', lang.hitch(this, function (evt) {
        if (evt.selected) {
          var params = evt.selected.parameters,
            path = encodePath(params.output_path + '/' + params.output_file);
          Topic.publish('/navigate', { href: '/workspace' + path });
        }
      }));

      this.grid.on('select', lang.hitch(this, function (evt) {
        var sel = Object.keys(evt.selected).map(lang.hitch(this, function (rownum) {
          var d = evt.grid.row(rownum).data;

          d._formatterType = 'job_status_meta';
          return d;
        }));

        this.actionBar.set('selection', sel);
        this.itemDetailPanel.set('selection', sel);

        if (this.chatPanelWrapper && this.chatPanel) {
          this.chatPanel.set('containerSelection', sel);
        }

        // Update URL with selected job ID
        if (sel.length === 1 && sel[0].id) {
          var currentFilters = lang.mixin({}, this.serviceFilter || {});
          currentFilters.selectedJob = sel[0].id;
          // Get current page if available
          if (this.grid._currentPage) {
            currentFilters.page = this.grid._currentPage;
          }
          this._updateHash(currentFilters);
        }
      }));

      // Handle deselection - remove selection from URL
      this.grid.on('dgrid-deselect', lang.hitch(this, function (evt) {
        // Check if there are any remaining selections
        var remainingSelections = Object.keys(this.grid.selection || {});
        if (remainingSelections.length === 0) {
          var currentFilters = lang.mixin({}, this.serviceFilter || {});
          delete currentFilters.selectedJob;
          // Keep current page
          if (this.grid._currentPage) {
            currentFilters.page = this.grid._currentPage;
          }
          this._updateHash(currentFilters);
        }
      }));

      // Handle page changes - persist page to URL
      this.grid.on('dgrid-page-complete', lang.hitch(this, function (evt) {
        // Only update URL after initial load is complete
        if (this._pendingPage === null && this.grid._currentPage) {
          var currentFilters = lang.mixin({}, this.serviceFilter || {});
          currentFilters.page = this.grid._currentPage;
          // Preserve current selection if any
          var selectedIds = Object.keys(this.grid.selection || {});
          if (selectedIds.length === 1) {
            currentFilters.selectedJob = selectedIds[0];
          }
          this._updateHash(currentFilters);
        }
      }));

      // Handle sort changes - persist sort to URL
      this.grid.on('dgrid-sort', lang.hitch(this, function (evt) {
        var sort = evt.sort;
        if (sort && sort.length > 0) {
          var currentFilters = lang.mixin({}, this.serviceFilter || {});
          currentFilters.sort = sort[0].attribute;
          currentFilters.sortDesc = sort[0].descending;
          // Preserve current page
          if (this.grid._currentPage) {
            currentFilters.page = this.grid._currentPage;
          }
          // Preserve current selection if any
          var selectedIds = Object.keys(this.grid.selection || {});
          if (selectedIds.length === 1) {
            currentFilters.selectedJob = selectedIds[0];
          }
          // Update serviceFilter to keep sort state
          this.serviceFilter = currentFilters;
          this._updateHash(currentFilters);
        }
      }));

      // Track if grid has loaded for the first time
      var gridFirstLoadComplete = false;

      // Store current local filter text for re-application after grid refresh
      this._localFilterText = '';

      // Helper function to apply local filter to visible rows
      var applyLocalFilter = lang.hitch(this, function() {
        var filterText = this._localFilterText;
        if (!this.grid || !this.grid.domNode) {
          return;
        }

        // Get all visible rows in the grid
        var rows = query('.dgrid-row', this.grid.domNode);

        rows.forEach(lang.hitch(this, function (rowNode) {
          var row = this.grid.row(rowNode);
          if (!row || !row.data) {
            return;
          }

          var job = row.data;
          var visible = true;

          if (filterText && filterText.trim() !== '') {
            // Check if any searchable field contains the filter text
            var searchableText = [
              job.id || '',
              job.application_name || '',
              job.status || '',
              (job.parameters && job.parameters.output_file) || ''
            ].join(' ').toLowerCase();

            visible = searchableText.indexOf(filterText.toLowerCase()) !== -1;
          }

          // Show or hide the row
          rowNode.style.display = visible ? '' : 'none';
        }));
      });

      // Handle grid refresh completion
      this.grid.on('dgrid-refresh-complete', lang.hitch(this, function (evt) {
        // Note: App filter labels are now updated via fetchAppSummaryCounts() which
        // calls query_app_summary_filtered API for accurate totals across all pages.
        // We no longer update filter labels from the current page's jobs.

        // Re-apply local filter after grid refresh
        if (this._localFilterText) {
          // Use setTimeout to ensure the grid rows are fully rendered
          setTimeout(applyLocalFilter, 50);
        }

        // After grid has fully loaded for the first time, call query_task_summary
        // to ensure status bar shows correct counts
        if (!gridFirstLoadComplete) {
          gridFirstLoadComplete = true;
          // Call getStatus to update the status bar with current job counts
          if (JobManager.getStatus) {
            JobManager.getStatus();
          }

          // Restore page and selection from URL after first load
          if (this._pendingPage || this._pendingSelection) {
            this._restorePageAndSelection();
          }
        }
      }));

      this.addChild(this.containerActionBar);
      this.addChild(this.actionBar);
      this.addChild(this.itemDetailPanel);

      // Restore filter state from URL hash BEFORE adding grid
      // This sets serviceFilter which the grid will use on first load
      // Pass true to skip grid.set('query') since grid isn't added yet
      // Note: containerActionBar is already added above, so its _selector exists
      // and we can restore the app filter value now
      this._restoreStateFromUrl(true);

      // After restoring state, re-fetch app summary counts to show correct selection
      // This is needed because containerActionBar.startup() already called fetchAppSummaryCounts()
      // before we restored the URL state
      if (this.containerActionBar && this.containerActionBar.fetchAppSummaryCounts) {
        this.containerActionBar.fetchAppSummaryCounts();
      }

      // Set grid query from restored filters BEFORE adding grid as child
      // This ensures the grid uses the correct filters when it starts loading
      if (this.serviceFilter && Object.keys(this.serviceFilter).length > 0) {
        this.grid.query = this.serviceFilter;
      }

      // Now add the grid - this triggers its startup and initial data load
      this.addChild(this.grid);

      // show / hide item detail panel event
      var hideBtn = query('[rel="ToggleItemDetail"]', this.actionBar.domNode)[0];
      on(hideBtn, 'click', function (e) {
        var icon = query('.fa', hideBtn)[0],
          text = query('.ActionButtonText', hideBtn)[0];

        domClass.toggle(icon, 'icon-chevron-circle-right');
        domClass.toggle(icon, 'icon-chevron-circle-left');

        if (domClass.contains(icon, 'icon-chevron-circle-left')) { domAttr.set(text, 'textContent', 'SHOW'); }
        else { domAttr.set(text, 'textContent', 'HIDE'); }
      });

      // listen for new job data
      Topic.subscribe('/Jobs', lang.hitch(this, function (info) {
        if (info.status == 'updated') {
          // When job status changes are detected (via polling), refresh the grid
          // to show the updated data with a fresh API call to enumerate_tasks
          if (this.grid && typeof this.grid.refresh === 'function') {
            // Check if grid has been initialized - if it has a domNode, it's ready
            if (this.grid.domNode) {
              // Ensure cache is cleared before refresh to force a new API call
              var store = JobManager.getStore();
              if (store && store.clearCache) {
                store.clearCache();
              }
              // Refresh will trigger gotoPage(1) which will query the store
              // Since cache is cleared, it will make a new API call to enumerate_tasks
              this.grid.refresh();
            }
          }
        }
      }));


      // listen for filtering
      Topic.subscribe('/JobFilter', lang.hitch(this, function (filters) {
        // remove any non-specific filter states
        if (filters.app === 'all') delete filters.app;
        if (!filters.status) delete filters.status;
        if (!filters.includeArchived) delete filters.includeArchived;

        // need to filter on all possible AWE-defined statuses
        if (filters.status === 'queued') {
          filters.status = new RegExp('queued|init|pending');
        } else if (filters.status === 'failed') {
          filters.status = new RegExp('failed|deleted');
        }

        // Clear cache when filters change to ensure fresh data
        var store = JobManager.getStore();
        if (store && store.clearCache) {
          store.clearCache();
        }

        if (!this.serviceFilter) {
          this.serviceFilter = {};
        }
        this.serviceFilter = filters;

        // Update URL hash with current filter state
        this._updateHash(filters);

        // Setting the query will trigger the grid to refresh and re-fetch data
        _self.grid.set('query', filters);
      }));

      // listen for keyword/search filtering
      Topic.subscribe('/KeywordFilter', lang.hitch(this, function (keyword) {
        // Clear cache when search changes
        var store = JobManager.getStore();
        if (store && store.clearCache) {
          store.clearCache();
        }

        // Start with current filters or empty object
        var filters = {};
        if (this.serviceFilter) {
          if (this.serviceFilter.app) {
            filters.app = this.serviceFilter.app;
          }
          if (this.serviceFilter.status) {
            filters.status = this.serviceFilter.status;
          }
          if (this.serviceFilter.includeArchived) {
            filters.includeArchived = this.serviceFilter.includeArchived;
          }
        }

        // Add or remove search filter
        if (keyword.trim() === '') {
          delete filters.search;
          delete filters.keyword;
        } else {
          // Use 'search' key for server-side filtering via SimpleTaskFilter
          filters.search = keyword.trim();
          filters.keyword = keyword.trim(); // Keep for URL persistence
        }

        // Update serviceFilter
        this.serviceFilter = filters;

        // Update URL hash with current filter state
        this._updateHash(filters);

        // Setting the query will trigger the grid to refresh and re-fetch data
        // Note: Do NOT call grid.refresh() after this - set('query', ...) already
        // triggers a refresh internally via the Pagination extension's _setQuery method.
        // Calling refresh() again causes "This deferred has already been resolved" errors.
        _self.grid.set('query', filters);
      }));

      // listen for local/page filtering (client-side, filters visible rows only)
      Topic.subscribe('/LocalFilter', lang.hitch(this, function (filterText) {
        // Store the filter text so it can be re-applied after grid refresh
        this._localFilterText = filterText || '';
        applyLocalFilter();
      }));

      // Hide the panel on a small screen
      if (window.innerWidth <= 768 && this.actionBar) {
        const hideBtn = query('[rel="ToggleItemDetail"]', this.actionBar.domNode)[0];
        hideBtn.click();
      }
    },

    setupActions: function () {
      this.selectionActions.forEach(function (a) {
        this.actionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
      }, this);
    }

  });
});
