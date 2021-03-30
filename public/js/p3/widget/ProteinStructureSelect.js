define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dijit/layout/ContentPane',
  'dijit/form/Select',
  'dojo/data/ItemFileReadStore'
], function (
  declare,
  lang,
  domConstruct,
  ContentPane,
  Select
) {
  return declare( [ContentPane], {
    baseClass: 'ProteinStructureSelect',
    disabled: false,
    accession: null,
    proteinStore: null,
    postCreate: function () {
      this.inherited(arguments);
      this.select = new Select({
        id: this.id + '_proteinSelect',
        name:'proteinId',
        store: this.proteinStore,
        maxHeight: -1,
        style: 'width: 8em; font-size: large;',
        title: 'Change Displayed Protein'
      });
      this.addChild(this.select);
      this.select.startup();
      if (this.accession) {
        this.select.set('value', this.accession);
      }
      this.select.on('change', lang.hitch(this, function () {
        this.set('accession', this.select.get('value'));
        console.log('accession is ' + this.accession);
      }));
    }
  });
});
