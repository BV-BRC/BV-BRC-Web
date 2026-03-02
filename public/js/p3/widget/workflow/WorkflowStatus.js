define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/_base/lang',
  'dojo/dom-style', 'dijit/_TemplatedMixin',
  'dojo/text!./templates/WorkflowStatus.html', 'dijit/Tooltip', '../../WorkflowManager'
], function (
  declare, WidgetBase, Topic, lang,
  style, TemplatedMixin,
  template, Tooltip, WorkflowManager
) {
  return declare([WidgetBase, TemplatedMixin], {
    baseClass: 'WorkspaceController',
    disabled: false,
    templateString: template,
    constructor: function () {},
    startup: function () {
      this.inherited(arguments);

      Topic.subscribe('/WorkflowStatus', lang.hitch(this, this.onWorkflowMessage));
      WorkflowManager.getStatus();

      this.tooltip = new Tooltip({
        connectId: [this.domNode],
        label: '<i class="icon-tasks Queued"></i> Pending | ' +
          '<i class="icon-play22 Running"></i> Running | ' +
          '<i class="icon-checkmark2 Completed"></i> Completed',
        position: ['above']
      });
    },
    openWorkflows: function () {
      Topic.publish('/navigate', { href: '/app/workflows/' });
    },
    onWorkflowMessage: function (status) {
      if (!status) {
        return;
      }

      if (status == 'failed') {
        style.set(this.workflowStatusTicker, { display: 'none' });
        style.set(this.workflowsStatusFailed, { display: 'inline-block' });
        return;
      }

      style.set(this.workflowStatusTicker, { display: 'inline-block' });
      style.set(this.workflowsStatusFailed, { display: 'none' });

      this.workflowsPendingNode.innerHTML = status.pending || 0;
      this.workflowsRunningNode.innerHTML = status.running || 0;
      this.workflowsCompleteNode.innerHTML = status.completed || 0;
    }
  });
});

