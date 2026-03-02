define([
  'dojo/_base/declare', 'dojo/on', 'dojo/_base/lang', 'dojo/query',
  'dojo/dom-class', 'dojo/dom-attr', './WorkflowsGrid', './WorkflowContainerActionBar',
  'dojo/_base/Deferred', '../../WorkflowManager', 'dojo/topic',
  'dijit/layout/BorderContainer', '../ActionBar', '../ItemDetailPanel', 'dijit/Dialog'
], function (
  declare, on, lang, query,
  domClass, domAttr, WorkflowsGrid, WorkflowContainerActionBar,
  Deferred, WorkflowManager, Topic,
  BorderContainer, ActionBar, ItemDetailPanel, Dialog
) {
  return declare([BorderContainer], {
    disabled: false,
    path: '/',
    serviceFilter: null,

    listWorkflows: function () {
      return Deferred.when(WorkflowManager.getWorkflows(), function (res) {
        return res;
      });
    },
    postCreate: function () {
      this.inherited(arguments);
      domClass.add(this.domNode, 'JobManager');
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
        function () {
          var children = this.getChildren();
          if (children.some(function (child) {
            return this.itemDetailPanel && (child.id == this.itemDetailPanel.id);
          }, this)) {
            this.removeChild(this.itemDetailPanel);
          } else {
            this.addChild(this.itemDetailPanel);
          }
        },
        true
      ], [
        'ViewWorkflowJson',
        'MultiButton fa icon-eye fa-2x',
        {
          label: 'VIEW',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'View Workflow JSON',
          validContainerTypes: ['*']
        },
        function (selection) {
          if (!selection || selection.length < 1) {
            return;
          }
          var selected = selection[0];
          var jsonText = JSON.stringify(selected.raw || selected, null, 2);
          var content = '<pre style="max-height:500px;overflow:auto;">' +
            jsonText.replace(/[<>&]/g, function (c) {
              return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
            }) +
            '</pre>';
          new Dialog({
            title: 'Workflow ' + selected.workflow_id,
            content: content,
            style: 'width:700px;'
          }).show();
        },
        false
      ]
    ],

    startup: function () {
      if (this._started) {
        WorkflowManager.refreshWorkflows();
        if (this.grid && typeof this.grid.refresh === 'function') {
          this.grid.refresh();
        }
        return;
      }
      this.inherited(arguments);

      this.grid = new WorkflowsGrid({
        region: 'center'
      });

      this.containerActionBar = new WorkflowContainerActionBar({
        region: 'top',
        className: 'BrowserHeader',
        header: 'Workflow Status',
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
        if (!evt.selected) {
          return;
        }
        var selected = evt.selected;
        var jsonText = JSON.stringify(selected.raw || selected, null, 2);
        var content = '<pre style="max-height:500px;overflow:auto;">' +
          jsonText.replace(/[<>&]/g, function (c) {
            return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
          }) +
          '</pre>';
        new Dialog({
          title: 'Workflow ' + selected.workflow_id,
          content: content,
          style: 'width:700px;'
        }).show();
      }));

      this.grid.on('select', lang.hitch(this, function (evt) {
        var sel = Object.keys(evt.selected).map(function (rownum) {
          return evt.grid.row(rownum).data;
        }).filter(function (item) { return !!item; });

        this.actionBar.set('selection', sel);
        this.itemDetailPanel.set('selection', sel);
      }));

      this.addChild(this.containerActionBar);
      this.addChild(this.actionBar);
      this.addChild(this.itemDetailPanel);
      this.addChild(this.grid);

      var hideBtn = query('[rel="ToggleItemDetail"]', this.actionBar.domNode)[0];
      on(hideBtn, 'click', function () {
        var icon = query('.fa', hideBtn)[0];
        var text = query('.ActionButtonText', hideBtn)[0];

        domClass.toggle(icon, 'icon-chevron-circle-right');
        domClass.toggle(icon, 'icon-chevron-circle-left');

        if (domClass.contains(icon, 'icon-chevron-circle-left')) {
          domAttr.set(text, 'textContent', 'SHOW');
        } else {
          domAttr.set(text, 'textContent', 'HIDE');
        }
      });

      Topic.subscribe('/Workflows', lang.hitch(this, function (info) {
        if (info && info.status === 'updated' && this.grid) {
          this.grid.refresh();
        }
      }));

      Topic.subscribe('/WorkflowFilter', lang.hitch(this, function (filters) {
        var queryObj = {};
        if (filters && filters.status) {
          queryObj.status = filters.status;
        }
        if (filters && filters.keyword) {
          // Escape regex special chars for safe client-side search
          var escaped = String(filters.keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          queryObj.search_text = new RegExp(escaped, 'i');
        }
        this.serviceFilter = queryObj;
        this.grid.set('query', queryObj);
      }));

      WorkflowManager.refreshWorkflows();
    },

    setupActions: function () {
      this.selectionActions.forEach(function (a) {
        this.actionBar.addAction(a[0], a[1], a[2], lang.hitch(this, a[3]), a[4]);
      }, this);
    }
  });
});

