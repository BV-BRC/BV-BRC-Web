define([
  'dojo/_base/declare', 'dijit/TooltipDialog', 'dijit/popup',
  'dojo/on'

], function (
  declare, TooltipDialog, Popup,
  on
) {
  return declare([TooltipDialog], {
    startup: function () {
      this.inherited(arguments);
      var self = this;
      on(this.domNode, 'click', function () {
        Popup.close(self);
      });
    }
  });
});
