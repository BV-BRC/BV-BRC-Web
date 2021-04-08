define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dijit/layout/ContentPane',
  'dijit/form/Select',
  './ProteinStructureState'
], function (
  declare,
  lang,
  domConstruct,
  ContentPane,
  Select,
  ProteinStructureState
) {
  return declare( [ContentPane], {
    baseClass: 'ProteinStructureSelect',
    disabled: false,
    viewState: new ProteinStructureState({}),
    proteinStore: null,
    accessionId: null,
    postCreate: function () {
      this.inherited(arguments);
      this.select = new Select({
        id: this.id + '_proteinSelect',
        name:'proteinId',
        store:  this.proteinStore,
        maxHeight: -1,
        style: 'width: 8em; font-size: large;',
        title: 'Change Displayed Protein'
      });
      this.addChild(this.select);
      if (this.viewState.get('accession')) {
        this.select.set('value', this.viewState.get('accession').id);
      }
      this.watch('viewState', lang.hitch(this, function (attr, oldValue, newValue) {
        var accession = newValue.get('accession');
        if (accession && accession.id) {
          this.select.set('value', accession.id);
        }
      }));
      this.select.on('change', lang.hitch(this, function () {
        let accessionId = this.select.get('value');
        console.log('Changing accession from ' + this.viewState.get('accession', {}).id + ' to ' + accessionId);
        if (accessionId !== this.viewState.get('accession', {}).id) {
          this.proteinStore.fetchItemByIdentity({
            identifier: accessionId,
            onItem: lang.hitch(this, (record) => {
              if (!record) {
                console.error('no record found for ' + accessionId);
              } else {
                var accessionInfo = {
                  id: this.proteinStore.getValue(record, 'id'),
                  label: this.proteinStore.getValue(record, 'label'),
                  description: this.proteinStore.getValue(record, 'description')
                };
                console.log('DisplayControl accession is now ' + JSON.stringify(accessionInfo));
                this.viewState.set('accession', accessionInfo);
              }
            })
          });
        }
      }));
    }
  });
});
