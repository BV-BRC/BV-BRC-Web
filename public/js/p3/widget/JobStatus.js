define([
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
