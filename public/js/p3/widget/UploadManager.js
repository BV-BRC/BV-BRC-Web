define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dojo/dom-construct', '../UploadManager',
  'dojo/_base/lang'
], function (
  declare, WidgetBase, on,
  domClass, domConstruct, UploadManager,
  lang
) {
  return declare([WidgetBase], {
    baseClass: 'UploadManager',
    disabled: false,
    startup: function () {
      UploadManager.getUploadSummary().then(lang.hitch(this, 'onUploadMessage'));
    },
    onUploadMessage: function (msg) {
      // console.log("WorkspaceController onUploadMsg", msg);
      if (msg && msg.type == 'UploadStatSummary') {
        var data = msg.summary;
        var keys = Object.keys(data.activeFiles);
        if (keys.length < 1) {
          this.domNode.innerHTML = '<p>There are no active uploads at this time.</p>';
          return;
        }

        keys.forEach(function (fname) {
          // var f = data.activeFiles[fname];
          domConstruct.create('div', { innerHTML: fname }, this.domNode);

        }, this);
      }
    }
  });
});
