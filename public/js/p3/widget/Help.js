define([
  'dojo/_base/declare', 'dijit/layout/ContentPane', 'dojo/on',
  'dojo/query', 'dojo/dom-attr', 'dojo/dom-class', 'dojo/_base/lang'
], function (
  declare, ContentPane, on,
  Query, domAttr, domClass, lang
) {

  return declare([ContentPane], {
    helpId: '',
    baseUrl: '/public/help',
    style: 'width: 640px; overflow: auto;',
    section: null,

    onDownloadEnd: function () {
      if (this.section) {
        console.log('Filter To Section: ', this.section);

        Query('section', this.containerNode).forEach(function (node) {
          var sectionName = domAttr.get(node, 'name');
          if (sectionName != this.section) {
            console.log('Hide Section: ', sectionName);
            domClass.add(node, 'dijitHidden');
          }
        }, this);
      }

      console.log('Emit ContentReady: ', this);
      on.emit(this.domNode, 'ContentReady', {
        bubbles: true,
        cancelable: true
      });

    },
    _setHelpIdAttr: function (id) {
      this.helpId = id;
      this.set('href', this.baseUrl + id);
    },

    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);
      if (this.helpId) {
        this.set('helpId', this.helpId);
      }
    }
  });
});
