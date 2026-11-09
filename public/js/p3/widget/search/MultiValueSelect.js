define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/dom-construct',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dijit/form/FilteringSelect', 'dijit/Tooltip'
], function (declare, lang, on, domConstruct, WidgetBase, TemplatedMixin, WidgetsInTemplateMixin, FilteringSelect, Tooltip) {
  return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
    templateString: '<div class="bvs-multi-select">'
      + '<div data-dojo-type="dijit/form/FilteringSelect" data-dojo-attach-point="searchBox" '
      + 'data-dojo-props="required:false,searchAttr:\'name\'" style="width:100%"></div>'
      + '<div data-dojo-attach-point="selectedNode" class="bvs-chip-group bvs-multi-selected"></div>'
      + '<div data-dojo-attach-point="limitNode" class="bvs-multi-limit" role="status"></div>'
      + '</div>',
    value: null,
    store: null,
    placeHolder: 'Select one or more',
    fieldLabel: '',
    helpText: '',
    maxSelections: 5,

    postCreate: function postCreate() {
      this.inherited(postCreate, arguments);
      this.searchBox.set('placeHolder', this.placeHolder);
      this.searchBox.focusNode.setAttribute('aria-label', this.fieldLabel);
      this.limitNode.id = this.id + '_limit';
      this.searchBox.focusNode.setAttribute('aria-describedby', this.limitNode.id);
      var helpLabel = this.domNode.parentNode.querySelector('label');
      if (helpLabel) {
        helpLabel.htmlFor = this.searchBox.focusNode.id;
        helpLabel.setAttribute('aria-describedby', this.limitNode.id);
        this.helpTooltip = new Tooltip({ connectId: [helpLabel], label: this.helpText, position: ['above', 'below'] });
        this.own(this.helpTooltip);
      }
      if (this.store) this.searchBox.set('store', this.store);
      this._setValueAttr(this.value);
      this.own(this.searchBox.on('change', lang.hitch(this, function (value) {
        if (!value) return;
        this.set('value', this.value.concat([value]));
        this.searchBox.set('value', '');
      })));
      this.own(on(this.selectedNode, 'button:click', lang.hitch(this, function (evt) {
        var value = evt.target.getAttribute('data-value');
        this.set('value', this.value.filter(function (selected) { return selected !== value; }));
        this.searchBox.focus();
      })));
    },

    _setStoreAttr: function (store) {
      this._set('store', store);
      if (this.searchBox) this.searchBox.set('store', store);
    },

    _setValueAttr: function (value) {
      var values = Array.isArray(value) ? value : (value ? [value] : []);
      values = values.filter(function (item, index) {
        return item && values.indexOf(item) === index;
      }).slice(0, this.maxSelections);
      var previous = this.value || [];
      var changed = values.length !== previous.length || values.some(function (item, index) {
        return item !== previous[index];
      });
      this._set('value', values);
      if (this.selectedNode) {
        domConstruct.empty(this.selectedNode);
        values.forEach(function (item) {
          var button = domConstruct.create('button', {
            type: 'button',
            className: 'bvs-chip is-active',
            'data-value': item,
            title: 'Remove ' + item,
            'aria-label': 'Remove ' + item
          }, this.selectedNode);
          button.textContent = item + ' \u00d7';
        }, this);
      }
      var atLimit = values.length >= this.maxSelections;
      if (this.searchBox) this.searchBox.set('disabled', atLimit);
      if (this.limitNode) {
        this.limitNode.textContent = atLimit ? 'Maximum ' + this.maxSelections + ' selected. Remove one to add another.' : '';
      }
      if (this.helpTooltip) {
        this.helpTooltip.set('label', (atLimit ? 'Maximum ' + this.maxSelections + ' selected. Remove one to add another. ' : '') + this.helpText);
      }
      if (!values.length && this.searchBox) this.searchBox.set('value', '');
      if (changed) this.onChange(values.slice());
    },

    onChange: function (value) {}
  });
});
