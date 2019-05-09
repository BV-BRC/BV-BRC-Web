define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dojo/topic', 'dojo/_base/lang',
  'dojo/dom-construct', '../JobManager',
  'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/JobStatus.html',
  'dijit/_HasDropDown', 'dijit/layout/ContentPane',
  'dijit/Tooltip'
], function (
  declare, WidgetBase, on,
  domClass, Topic, lang,
  domConstr, JobManager,
  TemplatedMixin, WidgetsInTemplate, template,
  HasDropDown, ContentPane, Tooltip
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

      this.jobsQueuedNode.innerHTML = status.queued;
      this.jobsRunningNode.innerHTML = status.inProgress;
      this.jobsCompleteNode.innerHTML = status.completed;

    }
  });
});
