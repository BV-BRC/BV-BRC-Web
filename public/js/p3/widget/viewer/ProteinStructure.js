define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/ready',
  '../ProteinStructure',
  '../ProteinStructureSelect',
  '../ProteinStructureDisplayControl',
  'dojo/data/ItemFileReadStore',
  './Base',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!../templates/ProteinStructureViewer.html',

],
function (
  declare,
  lang,
  domConstruct,
  ready,
  ProteinStructureDisplay,
  ProteinSelect,
  ProteinStructureDisplayControl,
  ItemFileReadStore,
  Base,
  Templated,
  WidgetsInTmeplateMixin,
  templateString
)
{
  return declare([Base, Templated, WidgetsInTmeplateMixin], {
    id: 'proteinStructureViewer',
    className: 'ProteinStructureViewer',
    templateString: templateString,
    jsmol: null,
    state: {},
    onSetState: function (attr, oldValue, newValue) {
      console.log(this.id + '.state changed from ' + oldValue + ' to ' + newValue);
      this.inherited(arguments);
      if (newValue && newValue.hashParams && newValue.hashParams.accession) {
        console.log('From state accession is ' + newValue.hashParams.accession);
      }
    },
    postCreate: function () {
      console.log('starting ' + this.id + '.postCreate');
      var accession = '6VXX';

      this.proteinStore =  new ItemFileReadStore({
        url:'/public/js/p3/resources/jsmol/SARS-CoV-2.json'
      });
      this.displayTypeStore = new ItemFileReadStore({
        url:'/public/js/p3/resources/jsmol/display-types.json'
      });

      this.jsmol = new ProteinStructureDisplay({
        id: this.id + '_structure'
      });

      domConstruct.place(this.jsmol.getViewerHTML(), this.contentDisplay.containerNode);

      this.proteinSelect = new ProteinSelect({
        id: this.id + '_select',
        proteinStore: this.proteinStore,
        accession: accession,
        region: 'left',
      });
      domConstruct.place(this.proteinSelect.domNode, this.select);

      this.displayControl = new ProteinStructureDisplayControl({
        id: this.id + '_displayControl',
        displayTypeStore: this.displayTypeStore,
        displayType: 'cartoon',
        region: 'left',
      });

      domConstruct.place(this.displayControl.domNode, this.displayControls);

      this.displayControl.watch('displayType', lang.hitch(this, this.onDisplayTypeChange));
      this.proteinSelect.watch('accession', lang.hitch(this, this.onAccessionChange));
      this.displayControl.watch('zoomLevel', lang.hitch(this, function () {
        console.log('zoom is now ' + this.displayControl.zoomLevel);
        this.jsmol.runScript('zoom ' + this.displayControl.zoomLevel + ';');
      }))
      console.log('finished ' + this.id + '.postCreate');

      // TODO this is temporary
      ready(lang.hitch(this, function () {
        var accession = this.proteinSelect.get('accession');
        this.updateAccessionInfo(accession);
        console.log('running ready ' + this.id);
        console.log('In ready accession is ' + accession);
        if (accession) {
          this.proteinStore.get(accession).then(accessionInfo => this.jsmol.set('accession', accessionInfo));
        }
        var displayType = this.displayControl.get('displayType');
        console.log('In ready displayType is ' + displayType);
        if (displayType) {
          this.displayTypeStore.get(displayType).then(displayTypeInfo => this.jsmol.set('displayType', displayTypeInfo));
        }
      }));

    },
    onAccessionChange: function (attr, oldValue, newValue) {
      console.log('accession went from ' + oldValue + ' to new value ' + newValue);
      this.updateAccessionInfo(newValue);
    },
    onDisplayTypeChange: function (attr, oldValue, newValue) {
      console.log('displayType changed from ' + oldValue + ' to ' + newValue);
      if (oldValue != newValue) {
        this.displayTypeStore.get(newValue).then(displayType => {
          this.jsmol.set('displayType', displayType);
        });
      }
    },
    updateAccessionInfo: function (accession) {
      console.log('running ' + this.id + '.updateAccessionInfo');
      this.proteinStore.get(accession).then(accessionInfo => {
        domConstruct.empty(this.accessionTitle.containerNode);
        domConstruct.place('<span class="searchField" style="font-size: large;">' + accessionInfo.label + '</span>', this.accessionTitle.containerNode);
        domConstruct.place('<div>' + accessionInfo.description + '</div>', this.accessionTitle.containerNode);
        this.jsmol.set('accession', accessionInfo);
      });
    }
  });
});
