define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_Templated'

], function (
  declare, WidgetBase, Templated
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'OutbreaksTab',
    disabled: false,
    templateString: null,
    apiServiceUrl: window.App.dataAPI,

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
    }
  });
});
