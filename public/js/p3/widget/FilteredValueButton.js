define([
  'dojo/_base/declare', 'dojo/on',
  'dijit/_Templated', 'dijit/_WidgetBase',
  'dojo/text!./templates/FilterValueButton.html'
], function (
  declare, on,
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

      const content = [];
      selected = selected.map(function (s, idx) {
        var s = s.replace(/"/g, '');
        var co = [];
        co.push('<div class="ValueWrapper">');
        co.push('<span class="ValueContent">' + s + '</span>');
        co.push('</div>');
        content.push(co.join(''));
        return s;
      }, this);
      // console.log(content, selected)
      // this._set('selected', selected);

      if (!this._started) {
        // this._set('selected', selected);
        return;
      }

      if (content.length == 1) {
        this.selectedNode.innerHTML = content[0];
      } else if (content.length == 2) {
        this.selectedNode.innerHTML = content.join('&nbsp;or&nbsp;');
      } else {
        this.selectedNode.innerHTML = content.slice(0, -1).join(',&nbsp;') + '&nbsp;or&nbsp;' + content[content.length - 1];
      }
      // this._set('selected', selected);

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
