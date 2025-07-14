define([
  'dojo/_base/declare', 'dojo/on', 'dojo/_base/lang', 'dojo/query',
  'dojo/dom-class', 'dojo/dom-attr', 'dojo/dom-construct', './JobsGrid', './JobContainerActionBar',
  'dojo/_base/Deferred', '../JobManager', './Confirmation', './RerunUtility',
  'dojo/topic', 'dijit/layout/BorderContainer', './ActionBar', './ItemDetailPanel', '../util/encodePath',
  './copilot/ChatSessionContainerSidePanel', './copilot/CopilotApi', './copilot/ChatSessionOptionsBarSidePanel',
  'dijit/Dialog', 'dijit/layout/ContentPane'
], function (
  declare, on, lang, query,
  domClass, domAttr, domConstr, JobsGrid, JobContainerActionBar,
  Deferred, JobManager, Confirmation, rerunUtility,
  Topic, BorderContainer, ActionBar, ItemDetailPanel, encodePath,
  ChatSessionContainerSidePanel, CopilotAPI, ChatSessionOptionsBar,
  Dialog, ContentPane
) {
  return declare([BorderContainer], {
    disabled: false,
    path: '/',
    serviceFilter: null,

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
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      var _self = this;

      this.grid = new JobsGrid({
        region: 'center'
      });

      this.grid.set('sort', [
        { attribute: 'submit_time', descending: true }
      ]);

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
      }));

      this.addChild(this.grid);
      this.addChild(this.containerActionBar);
      this.addChild(this.actionBar);
      this.addChild(this.itemDetailPanel);

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
      Topic.subscribe('/Jobs', function (info) {
        if (info.status == 'updated') {
          var store = JobManager.getStore();
          _self.grid.set('store', store);
        }
      });


      // listen for filtering
      Topic.subscribe('/JobFilter', function (filters) {
        // remove any non-specific filter states
        if (filters.app === 'all') delete filters.app;
        if (!filters.status) delete filters.status;

        // need to filter on all possible AWE-defined statuses
        if (filters.status === 'queued') {
          filters.status = new RegExp('queued|init|pending');
        } else if (filters.status === 'failed') {
          filters.status = new RegExp('failed|deleted');
        }
        if (!this.serviceFilter) {
          this.serviceFilter = {};
        }
        this.serviceFilter = filters;
        _self.grid.set('query', filters);
      });

      // listen for filtering
      Topic.subscribe('/KeywordFilter', function (keyword) {
        // remove any non-specific filter states
        if (keyword.trim() === '') {
          _self.grid.set('query', {});
        }
        var filters = {};
        // keyword = keyword.trim();
        var keyfil = new RegExp(`.*${keyword}.*`);
        filters['parameters'] = {
          test: function (entry) {
            return keyfil.test(entry.output_file);
          }
        };
        // filter by job output with other filters applied
        if (this.serviceFilter) {
          if (this.serviceFilter.app) {
            filters['app'] = this.serviceFilter.app;
          }
        }
        _self.grid.set('query', filters);
      });

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
