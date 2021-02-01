define([
  'dojo/_base/declare', 'dojo/dom-construct', 'dojo/text!./templates/VariantDetail.html',
  'dijit/form/Select', 'dijit/_WidgetBase', 'dijit/_Templated'

], function (
  declare, domConstruct, Template,
  Select, WidgetBase, Templated
) {
  return declare([WidgetBase, Templated], {
    baseClass: 'VariantDetail',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    state: null,
    docsServiceURL: window.App.docsServiceURL,
    _setStateAttr: function (state) {
      this._set('state', state);
      // this.set('properties', state.lineage_id || 'B.1.1.7');
    },
    _setPropertiesAttr: function(lineage_id) {
      domConstruct.empty(this.lineagePropertiesNode);
      var table = domConstruct.create('table', { 'class': 'p3basic striped' }, this.variantPropertiesNode);
      var tbody = domConstruct.create('tbody', {}, table);

      var htr;
      Object.entries(this.data[lineage_id]).forEach(([key, value]) => {
        htr = domConstruct.create('tr', {}, tbody);
        domConstruct.create('th', { innerHTML: key, scope: 'row', style: 'width:25%;font-weight:bold' }, htr);
        if (typeof(value) != 'string') {
          var inner = ['<ol>'];
          value.forEach(function(el) {
            inner.push(`<li>${el}</li>`);
          })
          inner.push('</ol>');

          domConstruct.create('td', { innerHTML: inner.join('') || '&nbsp;' }, htr);
        } else {
          domConstruct.create('td', { innerHTML: value || '&nbsp;' }, htr);
        }
      })
    },
    _buildSelectBox: function() {

      var select_lineage = new Select({
        name: 'selectVoC',
        id: 'selectVoC',
        options: [].map((el) => {return {'label': el, 'value': el}}),
        style: 'width: 200px; margin: 5px 0'
      });

      var self = this;
      select_lineage.on('change', function() {
        var selected = this.get("value");
        self.set('properties', selected);
      });
      var label_select_lineage = domConstruct.create('label', {
        style: 'margin-left: 5px;',
        innerHTML: 'Select Variant of Concern (VoC): '
      });
      domConstruct.place(label_select_lineage, this.variantSelectNode, 'last');
      domConstruct.place(select_lineage.domNode, this.variantSelectNode, 'last');
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._buildSelectBox()
    },
    data: {
    },
  });
});
