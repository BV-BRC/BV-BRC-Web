define([
  'dojo/_base/declare', './ActionBar', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/on',
  'dijit/form/Select', 'dojo/topic', 'dojo/query', '../JobManager',
  'dojo/dom-class', './formatter', '../util/getTime', 'dijit/form/TextBox'
], function (
  declare, ActionBar, domConstruct, domStyle, on,
  Select, Topic, query, JobManager,
  domClass, formatter, getTime, Textbox
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
       * add header/ title
       */
      if (this.header) {
        var header = domConstruct.create('b', {
          style: {
            fontSize: '1.2em',
            float: 'left',
            lineHeight: '.8em'
          },
          innerHTML: this.header + '<br>'
        }, this.container);

        var lastUpdated = domConstruct.create('span', {
          style: {
            fontSize: '.6em',
            color: '#666'
          },
          innerHTML: self.loadingHTML
        });
        domConstruct.place(lastUpdated, header, 'last');
      }


      /**
       * add option containers
       */
      var options = domConstruct.create('span', {
        style: {
          'float': 'right'
        }
      }, this.container);

      this.setupKeywordSearch(options);

      var statusBtns = this.statusBtns = domConstruct.create('span', {
        'class': 'JobFilters',
        style: {
          'float': 'right'
        }
      }, options);

      var appFilter = domConstruct.create('span', {
        style: {
          'float': 'right'
        }
      }, options);

      /**
       * app filter
       */
      var selector = new Select({
        name: 'type',
        style: {
          width: '150px', 'float': 'right', marginRight: '2.0em'
        },
        options: [
          { label: 'All Services', value: 'all', selected: true }
        ]
      }, appFilter);

      this.filters = {
        app: 'all',
        status: null
      };
      on(selector, 'change', function (val) {
        self.filters.application_name = val;
        Topic.publish('/JobFilter', self.filters);
      });

      // initialize app filters
      var apps = self.getFilterLabels(JobManager.getStore().data);
      selector.set('options', apps).reset();


      /**
       * status filters / counts
       */
      var allBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-undo"></i> All statuses',
        style: {
          fontSize: '1.2em',
          margin: '0 1.0em 0 0'
        }
      }, statusBtns);
      domStyle.set(allBtn, 'display', 'none');
      on(allBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: null });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'none');
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
      });

      var inProgressBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-play22 Running"></i> ' +
          '<span>-</span> running',
        style: {
          fontSize: '1.2em',
          marginLeft: '1.0em'
        }
      }, statusBtns);
      on(inProgressBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: 'in-progress' });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'inline');
      });

      var completedBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-checkmark2 Completed"></i> ' +
          '<span>-</span> completed',
        style: {
          fontSize: '1.2em',
          marginLeft: '1.0em'
        }
      }, statusBtns);
      on(completedBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: 'completed' });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'inline');
      });

      var failedBtn = domConstruct.create('span', {
        'class': 'JobFilter',
        innerHTML: '<i class="icon-warning2 Failed"></i> ' +
          '<span>-</span> failed',
        style: {
          fontSize: '1.2em',
          marginLeft: '1.0em'
        }
      }, statusBtns);
      on(failedBtn, 'click', function (val) {
        self.activate(this);
        Object.assign(self.filters,  { status: 'failed' });
        Topic.publish('/JobFilter', self.filters);
        domStyle.set(allBtn, 'display', 'inline');
      });

      // listen for job status counts
      var loadingJobList = false;
      Topic.subscribe('/JobStatus', function (status) {
        if (status == 'failed') return;

        domClass.remove(header, 'Failed');

        query('span', queuedBtn)[0].innerHTML = status.queued;
        query('span', inProgressBtn)[0].innerHTML = status.inProgress;
        query('span', completedBtn)[0].innerHTML = status.completed;
        query('span', failedBtn)[0].innerHTML = status.failed;

        if (!loadingJobList) {
          lastUpdated.innerHTML = 'Last updated: ' + getTime();
        }
      });

      /**
       * listen for job list changes (to update job types) and for loading status
       */
      Topic.subscribe('/Jobs', function (info) {
        if (info.status == 'loading') {
          lastUpdated.innerHTML = self.loadingHTML;
          loadingJobList = true;
        } else if (info.status == 'updated') {
          var labels = self.getFilterLabels(info.jobs);
          selector.set('options', labels).reset();

          lastUpdated.innerHTML = 'Last updated: ' + getTime();
          loadingJobList = false;
        } else if (info.status == 'filtered') {
          var labels = self.getFilterLabels(info.jobs);
          selector.set('options', labels);

          lastUpdated.innerHTML = 'Last updated: ' + getTime();
          loadingJobList = false;
        } else if (info.status == 'failed') {
          domClass.add(header, 'Failed');
          lastUpdated.innerHTML = '<span class="Failed">Update failed.  Retrying...</span>';
        }
      });

      this.inherited(arguments);
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
      if (self.filters.application_name == 'all') facet.selected = true;
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
          if (k == self.filters.application_name) facet.selected = true;
          apps.push(facet);
        }
      }
      // apps.sort(function (a, b) { return b.count - a.count; });
      apps.sort(function (a, b) { return (b.serviceLabel < a.serviceLabel) ? 1 : -1; });

      return apps;
    },

    setupKeywordSearch: function (options) {
      var textBoxNode = domConstruct.create('span', {
        style: {
          'float': 'left',
          margin: '0 1.0em 0 0'
        }
      }, options);
      var keywordSearch = Textbox({
        style: {
          width: '200px',
          margin: '0 1.0em 0 1.0em'
        },
        placeHolder: 'Filter by job output name',
        onChange: function () {
          var keywords = keywordSearch.value;
          Topic.publish('/KeywordFilter', keywords);
        },
        intermediateChanges: true
      });
      keywordSearch.placeAt(textBoxNode);
    }

  });
});
