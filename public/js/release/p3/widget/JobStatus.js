require({cache:{
'url:p3/widget/templates/JobStatus.html':"<div class=\"JobStatusButton\" data-dojo-attach-event=\"onclick:openJobs\">\n  <span>Jobs</span>\n  <span class=\"JobStatusCounts\" data-dojo-attach-point=\"jobStatusTicker\">\n\n    <i class=\"icon-tasks Queued\"></i>\n    <span data-dojo-attach-point=\"jobsQueuedNode\"></span>\n\n    <span class=\"divider\"></span>\n\n    <i class=\"icon-play22 Running\"></i>\n    <span data-dojo-attach-point=\"jobsRunningNode\"></span>\n\n    <span class=\"divider\"></span>\n\n    <i class=\"icon-checkmark2 Completed\"></i>\n    <span data-dojo-attach-point=\"jobsCompleteNode\"></span>\n\n  </span>\n\n  <span data-dojo-attach-point=\"jobsStatusFailed\" class=\"JobStatusCounts Failed\" style=\"display: none; font-weight: bold;\">\n    &nbsp;N/A&nbsp;\n  </span>\n\n</div>\n"}});
define("p3/widget/JobStatus", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/_base/lang',
  'dojo/dom-style',  'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/JobStatus.html', 'dijit/layout/ContentPane', 'dijit/Tooltip'
], function (
  declare, WidgetBase, Topic, lang,
  style, TemplatedMixin, WidgetsInTemplate,
  template, ContentPane, Tooltip
) {

  var UploadSummaryPanel = new ContentPane({ content: 'No Active Uploads', style: 'background:#fff;' });
  return declare([WidgetBase, TemplatedMixin], {
    baseClass: 'WorkspaceController',
    disabled: false,
    templateString: template,
    dropDown: UploadSummaryPanel,
    constructor: function () {},
    startup: function () {
      this.inherited(arguments);

      Topic.subscribe('/JobStatus', lang.hitch(this, this.onJobMessage));

      this.tooltip = new Tooltip({
        connectId: [this.domNode],
        label: '<i class="icon-tasks Queued"></i> Queued | ' +
          '<i class="icon-play22 Running"></i> Running | ' +
          '<i class="icon-checkmark2 Completed"></i> Completed',
        position: ['above']
      });
    },
    openJobs: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },
    onJobMessage: function (status) {
      if (!status) return;

      if (status == 'failed') {
        style.set(this.jobStatusTicker, { display: 'none' });
        style.set(this.jobsStatusFailed, { display: 'inline-block' });
        return;
      }

      // restyle on recover from fail
      style.set(this.jobStatusTicker, { display: 'inline-block' });
      style.set(this.jobsStatusFailed, { display: 'none' });

      this.jobsQueuedNode.innerHTML = status.queued;
      this.jobsRunningNode.innerHTML = status.inProgress;
      this.jobsCompleteNode.innerHTML = status.completed;

    }
  });
});
