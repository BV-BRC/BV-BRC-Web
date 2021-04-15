define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dijit/layout/ContentPane',
  'dijit/form/Select',
], function (
  declare,
  lang,
  domConstruct,
  ContentPane,
  Select,
) {
  return declare( [ContentPane], {
    baseClass: 'ProteinStructureSelect',
    disabled: false,
    proteinStore: null,
    accessionId: null,
    postCreate: function () {
      this.inherited(arguments);
      this.select = new Select({
        id: this.id + '_proteinSelect',
        name: 'proteinId',
        store: this.proteinStore,
        maxHeight: -1,
        style: 'width: 8em; font-size: large;',
        title: 'Change Displayed Protein'
      });
      this.addChild(this.select);
      if (this.get('accessionId')) {
        this.select.set('value', this.get('accessionId'));
      }
      this.watch('accessionId', lang.hitch(this, function (attr, oldValue, newValue) {
        console.log('%s.accessionId changed to %s', this.id, newValue);
        this.select.set('value', newValue);
      }));
      this.select.on('change', lang.hitch(this, function () {
        this.set('accessionId', this.select.get('value'));
      }));
    }
  });
});
