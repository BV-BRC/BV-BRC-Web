define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/ready',
  '../ProteinStructureState',
  '../ProteinStructure',
  '../ProteinStructureSelect',
  '../ProteinStructureDisplayControl',
  '../ProteinStructureHighlight',
  'dojo/data/ItemFileReadStore',
  'dojo/store/DataStore',
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
  ProteinStructureState,
  ProteinStructureDisplay,
  ProteinSelect,
  ProteinStructureDisplayControl,
  Highlight,
  ItemFileReadStore,
  DataStore,
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
    viewState: new ProteinStructureState({}),
    state: {},
    postCreate: function () {
      console.log('starting ' + this.id + '.postCreate');

      this.proteinStore =   new ItemFileReadStore({
        url: '/public/js/p3/resources/jsmol/SARS-CoV-2.json'
      });
      this.displayTypeStore = new ItemFileReadStore({
        url: '/public/js/p3/resources/jsmol/display-types.json'
      });
      this.epitopes = new DataStore({
        idProperty: 'id',
        store: new ItemFileReadStore({
          url: '/public/js/p3/resources/jsmol/sars2-epitopes.json'
        })
      });

      // the JMol viewer object
      this.jsmol = new ProteinStructureDisplay({
        id: this.id + '_structure',
      });

      domConstruct.place(this.jsmol.getViewerHTML(), this.contentDisplay.containerNode);

      this.proteinSelector = new ProteinSelect({
        id: this.id + '_proteinSelector',
        proteinStore: this.proteinStore
      });
      this.proteinSelector.startup();
      this.proteinSelector.watch('accessionId', lang.hitch(this, function (attr, oldValue, newValue) {
        if (oldValue != newValue) {
          console.log('%s.accessionId changed from %s to %s', this.proteinSelector.id, oldValue, newValue);
          // if the accession changes we keep all view state values but highlights
          this.getAccessionInfo(newValue).then(record => {
            var newState = new ProteinStructureState({});
            newState.set('displayType', this.viewState.get('displayType'));
            newState.set('effect', this.viewState.get('effect'));
            newState.set('accession', record);
            this.set('viewState', newState);
          });
        }
      }));
      domConstruct.place(this.proteinSelector.domNode, this.proteinSelectionContainer);

      this.displayControl = new ProteinStructureDisplayControl({
        id: this.id + '_displayControl',
        displayTypeStore: this.displayTypeStore,
        region: 'left'
      });

      this.displayControl.watch('effect', lang.hitch(this, function (attr, oldValue, newValue) {
        this.get('viewState').set('effect', newValue);
      }));
      this.displayControl.watch('zoomLevel', lang.hitch(this, function (attr, oldValue, newValue) {
        this.get('viewState').set('zoomLevel', newValue);
      }));
      this.displayControl.watch('displayType', lang.hitch(this, function (attr, oldValue, newValue) {
        console.log('control displayType changed from ' + oldValue + ' to ' + newValue);
        this.getDisplayTypeInfo(newValue).then(record => this.get('viewState').set('displayType', record));
      }));
      domConstruct.place(this.displayControl.domNode, this.displayControls);

      console.log('finished ' + this.id + '.postCreate');

      // TODO we should figure out how to handle or at least display errors
      // when running code
      this.commandRun.on('click', lang.hitch(this, function () {
        var scriptText = this.commandEntry.get('value');
        console.log('script to run is ' + scriptText);
        this.jsmol.runScript(scriptText);
      }));
      this.commandClear.on('click', lang.hitch(this, function () {
        this.commandEntry.set('value', '');
      }));

      // TODO highlighters need to be dependent on proteins and whats available in the database
      this.epitopeHighlight = new Highlight({
        id: this.id + '_epitopes',
        title: 'Epitopes',
        store: this.epitopes,
        color: '#ffff00'
      });
      domConstruct.place(this.epitopeHighlight.domNode, this.highlighters, 'last');

      // TODO highlighting will have to be extended to support more than one group of highlighting
      this.epitopeHighlight.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
        console.log('old highlights %s new highlights %s',  JSON.stringify(oldValue), JSON.stringify(newValue));
        console.log('viewState.highlights is ' + JSON.stringify(this.get('viewState').get('highlights')));
        this.get('viewState').set('highlights', new Map(newValue));
      }));

      this.watch('viewState', lang.hitch(this, function (attr, oldValue, newValue) {
        this.onViewStateChange(newValue);
      }));

      this.getInitialViewState().then(lang.hitch(this, function (viewData) {
        var viewState = new ProteinStructureState({});
        console.log('viewData for initialViewState is ' + JSON.stringify(viewData));
        viewState.set('displayType', viewData[0]);
        viewState.set('accession', viewData[1]);
        viewState.set('zoomLevel', viewData[2]);
        viewState.set('highlights', new Map());
        console.log('initial viewstate is ' + JSON.stringify(viewState));
        this.set('viewState', viewState);
      }));
    },
    onViewStateChange: function (viewState) {
      console.log('updating viewState for child objects to ' + JSON.stringify(viewState));
      this.updateFromViewState(viewState);
    },
    updateFromViewState: function (viewState) {
      this.proteinSelector.set('accessionId', viewState.get('accession').id);
      this.displayControl.set('displayTypeInfo', viewState.get('displayType'));
      this.displayControl.set('zoomLevel', viewState.get('zoomLevel'));
      this.epitopeHighlight.set('positions', viewState.get('highlights'));
      this.jsmol.set('viewState', viewState);
      this.updateAccessionInfo(viewState.get('accession'));
    },
    updateAccessionInfo: function (accessionInfo) {
      console.log('running ' + this.id + '.updateAccessionInfo with ' + JSON.stringify(accessionInfo) );
      domConstruct.empty(this.accessionTitle.containerNode);
      domConstruct.place('<span class="searchField" style="font-size: large;">' + accessionInfo.label + '</span>', this.accessionTitle.containerNode);
      domConstruct.place('<div>' + accessionInfo.description + '</div>', this.accessionTitle.containerNode);
    },
    viewDefaults: new Map([
      ['accession', '6VXX'],
      ['displayType', 'cartoon'],
      ['zoomLevel', 100]
    ]),
    /**
    Get the initial view state using hash parameters or defaults as necessary
     */
    getInitialViewState: function () {
      const hashParams = (this.state && this.state.hashParams) || {};
      var dataPromises = [];
      let val = hashParams.displayType || this.viewDefaults.get('displayType');
      console.log('get viewState.displayType record for ' + val);
      dataPromises.push(this.getDisplayTypeInfo(val));
      val = hashParams.accession || this.viewDefaults.get('accession');
      console.log('get viewState.accession record for ' + val);
      dataPromises.push(this.getAccessionInfo(val));

      val = hashParams.zoomLevel || this.viewDefaults.get('zoomLevel') || 100;
      console.log('get viewState.zoomLevel for ' + val);
      dataPromises.push(Promise.resolve(val));

      return Promise.all(dataPromises);
    },
    /*
    return a Promise with the information for displayType.
     */
    getDisplayTypeInfo: function (displayTypeId) {
      return new Promise(
        (resolve, reject) => {
          this.displayTypeStore.fetchItemByIdentity({
            identity: displayTypeId,
            onItem: lang.hitch(this, (record) => {
              var displayType = {
                id: this.displayTypeStore.getValue(record, 'id'),
                label: this.displayTypeStore.getValue(record, 'label'),
                icon: this.displayTypeStore.getValue(record, 'icon'),
                description: this.displayTypeStore.getValue(record, 'description'),
                colorMode: this.displayTypeStore.getValue(record, 'colorMode'),
                script: this.displayTypeStore.getValue(record, 'script'),
              };
              console.log('DisplayType fetched was ' + JSON.stringify(displayType));
              resolve(displayType);
            }),
            onError: error=>reject(error)
          });
        });
    },
    /*
    Return a Promise for the protein accession information
     */
    getAccessionInfo: function (accessionId) {
      return new Promise(
        (resolve, reject) => {
          this.proteinStore.fetchItemByIdentity({
            identity: accessionId,
            onItem: lang.hitch(this, (item) => {
              var accessionInfo = {
                id: this.proteinStore.getValue(item, 'id'),
                label: this.proteinStore.getValue(item, 'label'),
                description: this.proteinStore.getValue(item, 'description')
              };
              console.log('Accession fetched was ' + JSON.stringify(accessionInfo));
              resolve(accessionInfo);
            }),
            onError: error=>reject(error)
          });
        });
    }
  });
});
