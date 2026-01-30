define([
  'dojo/_base/declare', './ActionBar', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/on',
  'dijit/form/Select', 'dojo/topic', 'dojo/query', '../JobManager',
  'dojo/dom-class', './formatter', '../util/getTime', 'dijit/form/TextBox', 'dojo/_base/lang'
], function (
  declare, ActionBar, domConstruct, domStyle, on,
  Select, Topic, query, JobManager,
  domClass, formatter, getTime, Textbox, lang
) {
  return declare([ActionBar], {
    path: null,
    loadingHTML:
      '<img src="/patric/images/loader.gif" style="vertical-align: middle;" height="20"/> ' +
      '<span>loading...</span>',
    postCreate: function () {
      this.inherited(arguments);
      this.container = domConstruct.create('div', {}, this.domNode);
      this.containerNode = domConstruct.create('div', {
        'class': '',
        style: 'border: none;'
      }, this.domNode);
    },

    startup: function () {
      var self = this;

      this.gutters = false;
      domStyle.set(this.domNode, {
        border: 'none',
        margin: '10px 0 0 0',
        padding: '3px 5px'
      });

      /**
       * Two-row layout:
       * Row 1: Title/timestamp (left) + keyword search (right)
       * Row 2: All filters (status buttons, app dropdown, archive toggle)
       */

      // Row 1 container
      var row1 = domConstruct.create('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }
      }, this.container);

      // Row 2 container
      var row2 = domConstruct.create('div', {
        style: {
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5em'
        }
      }, this.container);

      /**
       * Row 1: header/title (left side)
       */
      var header;
      if (this.header) {
        header = domConstruct.create('b', {
          style: {
            fontSize: '1.2em',
            lineHeight: '1.2em'
          },
          innerHTML: this.header + ' '
        }, row1);

        this.lastUpdated = domConstruct.create('span', {
          style: {
            fontSize: '.6em',
            color: '#666',
            fontWeight: 'normal'
          },
          innerHTML: self.loadingHTML
        });
        domConstruct.place(this.lastUpdated, header, 'last');

        // Set initial time after a short delay to ensure it's visible
        setTimeout(function() {
          if (self.lastUpdated) {
            self.lastUpdated.innerHTML = 'Last updated: ' + getTime();
          }
        }, 100);
      }

      /**
       * Row 1: keyword search (right side)
       */
      this.setupKeywordSearch(row1);

      /**
       * Row 2: filters container
       */
      var statusBtns = this.statusBtns = domConstruct.create('span', {
        'class': 'JobFilters',
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5em'
        }
      }, row2);

      var appFilter = domConstruct.create('span', {
        style: {
          marginLeft: '1em'
        }
      }, row2);

      /**
       * app filter
       */
      var selector = new Select({
        name: 'type',
        style: {
          width: '150px'
        },
        options: [
          { label: 'All Services', value: 'all', selected: true }
        ]
      }, appFilter);

      // Store selector reference for filter label updates
      this._selector = selector;

      this.filters = {
        app: 'all',
        status: null
      };
      on(selector, 'change', function (val) {
        self.filters.app = val;
        Topic.publish('/JobFilter', self.filters);
      });

      // initialize app filters - don't query during startup to avoid duplicate queries
      // The filter labels will be updated when the grid loads its first page
      // via the /Jobs topic subscription below
      var apps = self.getFilterLabels([]);
      selector.set('options', apps).reset();


      /**
       * status filters / counts
       */
      var allBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-undo"></i> All statuses',
        style: {
          fontSize: '1.2em'
        }
      }, statusBtns);
      domStyle.set(allBtn, 'display', 'none');
      on(allBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: null });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'none');
        self.fetchAppSummaryCounts();
      });


      var queuedBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-tasks Queued"></i> ' +
          '<span>-</span> queued',
        style: {
          fontSize: '1.2em'
        }
      }, statusBtns);
      on(queuedBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: 'queued' });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'inline');
        self.fetchAppSummaryCounts();
      });

      var inProgressBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-play22 Running"></i> ' +
          '<span>-</span> running',
        style: {
          fontSize: '1.2em'
        }
      }, statusBtns);
      on(inProgressBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: 'in-progress' });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'inline');
        self.fetchAppSummaryCounts();
      });

      var completedBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-checkmark2 Completed"></i> ' +
          '<span>-</span> completed',
        style: {
          fontSize: '1.2em'
        }
      }, statusBtns);
      on(completedBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: 'completed' });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'inline');
        self.fetchAppSummaryCounts();
      });

      var failedBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-warning2 Failed"></i> ' +
          '<span>-</span> failed',
        style: {
          fontSize: '1.2em'
        }
      }, statusBtns);
      on(failedBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: 'failed' });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'inline');
        self.fetchAppSummaryCounts();
      });

      // Include Archived toggle - compact style
      var archiveLabel = domConstruct.create('label', {
        'class': 'ArchiveToggle',
        style: {
          fontSize: '1.0em',
          marginLeft: '0.5em',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          whiteSpace: 'nowrap'
        }
      }, row2);
      this._archiveCheckbox = domConstruct.create('input', {
        type: 'checkbox',
        style: {
          marginRight: '0.3em',
          cursor: 'pointer'
        }
      }, archiveLabel);
      domConstruct.create('span', {
        innerHTML: 'Archived'
      }, archiveLabel);
      this.filters.includeArchived = false;
      on(this._archiveCheckbox, 'change', function () {
        self.filters.includeArchived = this.checked;
        Topic.publish('/JobFilter', self.filters);
        // Refresh app summary counts when archive filter changes
        self.fetchAppSummaryCounts();
      });

      // listen for job status counts
      var loadingJobList = false;
      var firstStatusUpdate = true;
      Topic.subscribe('/JobStatus', function (status) {
        if (status == 'failed') return;

        if (header) {
          domClass.remove(header, 'Failed');
        }

        query('span', queuedBtn)[0].innerHTML = status.queued;
        query('span', inProgressBtn)[0].innerHTML = status.inProgress;
        query('span', completedBtn)[0].innerHTML = status.completed;
        query('span', failedBtn)[0].innerHTML = status.failed;

        // Always update time on first status update, or if not loading
        if (self.lastUpdated && (firstStatusUpdate || !loadingJobList)) {
          self.lastUpdated.innerHTML = 'Last updated: ' + getTime();
          firstStatusUpdate = false;
        }
      });

      /**
       * listen for job list changes (to update job types) and for loading status
       */
      Topic.subscribe('/Jobs', function (info) {
        if (!self.lastUpdated) return;

        if (info.status == 'loading') {
          self.lastUpdated.innerHTML = self.loadingHTML;
          loadingJobList = true;
        } else if (info.status == 'updated') {
          // Don't query the store here - it causes duplicate API calls
          // The grid will already have loaded the first page, and filter labels
          // will be updated when the user interacts with the grid or filters
          self.lastUpdated.innerHTML = 'Last updated: ' + getTime();
          loadingJobList = false;
        } else if (info.status == 'filtered') {
          // Don't update filter labels from page data - we now use fetchAppSummaryCounts()
          // which gets accurate totals from query_app_summary_filtered API
          self.lastUpdated.innerHTML = 'Last updated: ' + getTime();
          loadingJobList = false;
        } else if (info.status == 'failed') {
          if (header) {
            domClass.add(header, 'Failed');
          }
          self.lastUpdated.innerHTML = '<span class="Failed">Update failed.  Retrying...</span>';
        }
      });

      // Fetch initial app summary counts
      this.fetchAppSummaryCounts();

      // Subscribe to keyword filter changes to update app counts
      Topic.subscribe('/KeywordFilter', lang.hitch(this, function (keyword) {
        if (keyword && keyword.trim() !== '') {
          this.filters.search = keyword.trim();
        } else {
          delete this.filters.search;
        }
        // Refresh app summary counts to reflect the new search filter
        this.fetchAppSummaryCounts();
      }));

      this.inherited(arguments);
    },

    // Update filter labels from job data
    updateFilterLabels: function (jobs) {
      if (this._selector && jobs && jobs.length > 0) {
        var labels = this.getFilterLabels(jobs);
        // Get current value before updating options
        var currentValue = this.filters.app || 'all';
        // Set options without reset - getFilterLabels already marks the correct option as selected
        this._selector.set('options', labels);
        // Restore the value without triggering change event
        this._selector.set('value', currentValue, false);
      }
    },

    // style custom btns with "active" state
    activate: function (node) {
      query('.JobFilter', this.container).forEach(function (node) {
        domClass.remove(node, 'active');
      });

      domClass.add(node, 'active');
    },

    // takes job objects, returns sorted list of objects of form:
    // [{label: 'AppName  (count)', value: 'AppName', count: x}, ... ]
    getFilterLabels: function (jobs) {
      var self = this;

      // count by apps
      var info = {};
      jobs.forEach(function (job) {
        info[job.application_name] = job.application_name in info ? info[job.application_name] + 1 : 1;
      });

      // add 'all apps' option
      var apps = [];
      var facet = { label: 'All Services', value: 'all' };
      if (self.filters.app == 'all') facet.selected = true;
      apps.push(facet);

      // organize options by app count
      for (var k in info) {
        // guard-for-in
        if (Object.prototype.hasOwnProperty.call(info, k)) {
          var facet = {
            label: formatter.serviceLabel(k) + ' (' + info[k] + ')',
            serviceLabel: formatter.serviceLabel(k),
            value: k,
            count: info[k]
          };
          if (k == self.filters.app) facet.selected = true;
          apps.push(facet);
        }
      }
      // apps.sort(function (a, b) { return b.count - a.count; });
      apps.sort(function (a, b) { return (b.serviceLabel < a.serviceLabel) ? 1 : -1; });

      return apps;
    },

    // Fetch app summary counts from the API and update the app filter dropdown
    // Uses query_app_summary_filtered when available to get accurate counts
    fetchAppSummaryCounts: function () {
      var self = this;
      var simpleFilter = {};

      // Include status filter if set
      if (this.filters.status) {
        simpleFilter.status = this.filters.status;
      }

      // Include archived filter if set
      if (this.filters.includeArchived) {
        simpleFilter.include_archived = 1;  // Use 1 instead of true for API compatibility
      }

      // Include search filter if set
      if (this.filters.search) {
        simpleFilter.search = this.filters.search;
      }

      // Call the filtered app summary API
      window.App.api.service('AppService.query_app_summary_filtered', [simpleFilter])
        .then(lang.hitch(this, function (res) {
          if (!res || !res[0]) {
            return;
          }

          var appCounts = res[0];
          var apps = [];

          // Add 'All Services' option
          var allFacet = { label: 'All Services', value: 'all' };
          if (self.filters.app === 'all') allFacet.selected = true;
          apps.push(allFacet);

          // Build options from API response
          for (var appName in appCounts) {
            if (Object.prototype.hasOwnProperty.call(appCounts, appName)) {
              var count = appCounts[appName];
              var facet = {
                label: formatter.serviceLabel(appName) + ' (' + count + ')',
                serviceLabel: formatter.serviceLabel(appName),
                value: appName,
                count: count
              };
              if (appName === self.filters.app) facet.selected = true;
              apps.push(facet);
            }
          }

          // Sort by service label
          apps.sort(function (a, b) {
            if (a.value === 'all') return -1;
            if (b.value === 'all') return 1;
            return (b.serviceLabel < a.serviceLabel) ? 1 : -1;
          });

          // Update the selector
          if (self._selector) {
            var currentValue = self.filters.app || 'all';
            self._selector.set('options', apps);
            self._selector.set('value', currentValue, false);
          }
        }), function (err) {
          console.error('Error fetching app summary counts:', err);
          // Fall back to existing behavior - counts from current page
        });
    },

    setupKeywordSearch: function (parentNode) {
      var self = this;
      var textBoxNode = domConstruct.create('span', {
        style: {
          display: 'inline-block'
        }
      }, parentNode);

      // Debounce timer for search
      var searchTimer = null;
      var DEBOUNCE_DELAY = 500; // ms
      var isUnloading = false;

      // Track page unload to prevent firing during reload
      var beforeUnloadHandler = function() {
        isUnloading = true;
        if (searchTimer) {
          clearTimeout(searchTimer);
          searchTimer = null;
        }
      };
      window.addEventListener('beforeunload', beforeUnloadHandler);

      var keywordSearch = Textbox({
        style: {
          width: '200px'
        },
        placeHolder: 'Search by output name',
        onChange: function () {
          // Don't process changes during page unload
          if (isUnloading) {
            return;
          }

          var keywords = keywordSearch.value;

          // Clear any pending search
          if (searchTimer) {
            clearTimeout(searchTimer);
            searchTimer = null;
          }

          // Skip if empty or only whitespace - don't trigger API call
          if (!keywords || keywords.trim() === '') {
            // Immediate clear for empty search (no debounce needed)
            Topic.publish('/KeywordFilter', '');
            return;
          }

          // Debounce: wait for user to stop typing before triggering search
          searchTimer = setTimeout(function () {
            searchTimer = null;
            // Double-check we're not unloading
            if (!isUnloading) {
              Topic.publish('/KeywordFilter', keywords);
            }
          }, DEBOUNCE_DELAY);
        },
        intermediateChanges: true
      });
      keywordSearch.placeAt(textBoxNode);

      // Store reference to clear timer on destroy
      this._clearSearchTimer = function() {
        if (searchTimer) {
          clearTimeout(searchTimer);
          searchTimer = null;
        }
        window.removeEventListener('beforeunload', beforeUnloadHandler);
      };
    }

  });
});
