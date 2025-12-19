define([
  'dojo/_base/declare', 'dojo/on',
  'dojo/dom-construct',
  'dijit/_Templated', 'dijit/_WidgetBase',
  'dojo/text!./templates/FilterValueButton.html'
], function (
  declare, on,
  domConstruct,
  Templated, WidgetBase,
  template
) {

  return declare([WidgetBase, Templated], {
    templateString: template,
    baseClass: 'FilteredValueButton',
    category: '',
    selected: null,

    _setSelectedAttr: function (selected) {
      console.log('FilteredValueButton _setSelected: ', selected);

      // Clean and prepare selected values
      selected = selected.map(function (s, idx) {
        return s.replace(/"/g, '');
      }, this);

      if (!this._started) {
        return;
      }

      // Clear and build content safely with DOM construction
      domConstruct.empty(this.selectedNode);

      // Build the value wrappers
      selected.forEach(function (s, idx) {
        // Add separator if needed
        if (idx > 0) {
          if (idx === selected.length - 1) {
            domConstruct.place(document.createTextNode(' or '), this.selectedNode, 'last');
          } else {
            domConstruct.place(document.createTextNode(', '), this.selectedNode, 'last');
          }
        }

        // Create value wrapper div
        var wrapper = domConstruct.create('div', {
          'class': 'ValueWrapper'
        }, this.selectedNode, 'last');

        // Create value content span
        domConstruct.create('span', {
          'class': 'ValueContent',
          textContent: s
        }, wrapper, 'last');
      }, this);

    },
    clearAll: function () {
      this.innerHTML = '';
      on.emit(this.domNode, 'UpdateFilterCategory', {
        category: this.category,
        selected: [],
        bubbles: true,
        cancelable: true
      });
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.set('selected', this.selected);
    },
    postCreate: function () {
      this.inherited(arguments);
    }
  });
});
