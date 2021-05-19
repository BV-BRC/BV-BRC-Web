define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/ready',
  'dojo/sniff',
  '../proteinStructure/ProteinStructureState',
  '../proteinStructure/ProteinStructure',
  '../proteinStructure/ProteinStructureDisplayControl',
  '../proteinStructure/EpitopeHighlights',
  '../proteinStructure/LigandHighlights',
  '../proteinStructure/StructureHighlight',
  '../proteinStructure/SARS2FeatureHighlights',
  'dojo/data/ItemFileReadStore',
  'dojo/store/DataStore',
  './Base',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!../templates/proteinStructure/ProteinStructureViewer.html',
  '../../util/dataStoreHelpers'
],
function (
  declare,
  lang,
  domConstruct,
  ready,
  has,
  ProteinStructureState,
  ProteinStructureDisplay,
  ProteinStructureDisplayControl,
  EpitopeHighlights,
  LigandHighlights,
  StructureHighlights,
  SARS2FeatureHighlights,
  ItemFileReadStore,
  DataStore,
  Base,
  Templated,
  WidgetsInTmeplateMixin,
  templateString,
  dataStoreHelpers
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
      // console.log('starting ' + this.id + '.postCreate');

      this.proteinStore =   new ItemFileReadStore({
        url: '/public/js/p3/resources/jsmol/SARS-CoV-2.json'
      });
      this.displayTypeStore = new ItemFileReadStore({
        url: '/public/js/p3/resources/jsmol/display-types.json'
      });

      // Opera and especially Safari suffer from performance issues with JMol with larger view sizes.
      let viewerSize = ( has('safari') || has('opera') ) ? '500' : '100%';
      // the JMol viewer object
      this.jsmol = new ProteinStructureDisplay({
        id: this.id + '_structure',
        jmolInfo: {
          height: viewerSize,
          width: viewerSize,
        }
      });

      domConstruct.place(this.jsmol.getViewerHTML(), this.contentDisplay.containerNode);

      this.displayControl = new ProteinStructureDisplayControl({
        id: this.id + '_displayControl',
        displayTypeStore: this.displayTypeStore,
        proteinStore: this.proteinStore,
        region: 'left'
      });

      this.displayControl.watch('accessionId', lang.hitch(this, function (attr, oldValue, newValue) {
        if (oldValue != newValue) {
          // console.log('%s.accessionId changed from %s to %s', this.displayControl.id, oldValue, newValue);
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

      this.displayControl.watch('scriptText', lang.hitch(this, function (attr, oldValue, newValue) {
        this.jsmol.executeScript(newValue);
      }));
      this.displayControl.watch('effect', lang.hitch(this, function (attr, oldValue, newValue) {
        this.get('viewState').set('effect', newValue);
      }));
      this.displayControl.watch('zoomLevel', lang.hitch(this, function (attr, oldValue, newValue) {
        this.get('viewState').set('zoomLevel', newValue);
      }));
      this.displayControl.watch('displayType', lang.hitch(this, function (attr, oldValue, newValue) {
        // console.log('control displayType changed from ' + oldValue + ' to ' + newValue);
        this.getDisplayTypeInfo(newValue).then(record => {
          this.get('viewState').set('displayType', record);
          this.displayControl.set('displayTypeInfo', record);
        });
      }));
      domConstruct.place(this.displayControl.domNode, this.displayControls);

      // console.log('finished ' + this.id + '.postCreate');

      this.ligandHighlight = new LigandHighlights({
        id: this.id + '_ligands',
        color: '#00ff00'
      });
      this.highlighters.addChild(this.ligandHighlight);
      this.ligandHighlight.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
        let highlights = new Map(this.viewState.get('highlights'));
        highlights.set('ligands', new Map(newValue));
        this.get('viewState').set('highlights', highlights);
      }));

      // this.structureHighlighter = new StructureHighlights({});
      // this.highlighters.addChild(this.structureHighlighter);

      this.featureHighlights = new SARS2FeatureHighlights({
      });
      this.featureHighlights.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
        // console.log('old highlights %s new highlights %s',  JSON.stringify(oldValue), JSON.stringify(newValue));
        // console.log('viewState.highlights is ' + JSON.stringify(this.get('viewState').get('highlights')));
        let highlights = new Map(this.viewState.get('highlights'));
        highlights.set('features', new Map(newValue));
        this.get('viewState').set('highlights', highlights);
      }));
      this.highlighters.addChild(this.featureHighlights);

      // TODO highlighters need to be dependent on proteins and what's available in the database
      this.epitopeHighlight = new EpitopeHighlights({
        id: this.id + '_epitopes',
        color: '#ffff00'
      });
      this.highlighters.addChild(this.epitopeHighlight);

      this.epitopeHighlight.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
        // console.log('old highlights %s new highlights %s',  JSON.stringify(oldValue), JSON.stringify(newValue));
        // console.log('viewState.highlights is ' + JSON.stringify(this.get('viewState').get('highlights')));
        let highlights = new Map(this.viewState.get('highlights'));
        highlights.set('epitopes', new Map(newValue));
        this.get('viewState').set('highlights', highlights);
      }));

      this.watch('viewState', lang.hitch(this, function (attr, oldValue, newValue) {
        this.onViewStateChange(newValue);
      }));

      this.getInitialViewState().then(lang.hitch(this, function (viewData) {
        var viewState = new ProteinStructureState({});
        // console.log('viewData for initialViewState is ' + JSON.stringify(viewData));
        viewState.set('displayType', viewData[0]);
        viewState.set('accession', viewData[1]);
        viewState.set('zoomLevel', viewData[2]);
        let highlights = new Map([
          ['ligands', new Map()],
          ['epitopes', new Map()],
          ['features', new Map()]
        ]);
        viewState.set('highlights', highlights);
        // console.log('initial viewstate is ' + JSON.stringify(viewState));
        this.set('viewState', viewState);
      }));
      if ( has('safari') ) {
        domConstruct.create('div',
          {
            innerHTML: 'Note: The JMol interactive 3D protein viewer is best viewed using the Chrome browser (<a href="https://www.google.com/chrome/">download</a>). For help see the <a href="https://wiki.jmol.org/index.php/JSMol">JSMol Wiki</a>.',
          },
          this.contentDisplay.containerNode,
          'first'
        );
      }
    },
    onViewStateChange: function (viewState) {
      // console.log('updating viewState for child objects to ' + JSON.stringify(viewState));
      this.updateFromViewState(viewState);
    },
    updateFromViewState: function (viewState) {
      this.displayControl.set('displayTypeInfo', viewState.get('displayType'));
      this.displayControl.set('zoomLevel', viewState.get('zoomLevel'));
      this.displayControl.set('accessionId', viewState.get('accession').id);
      this.epitopeHighlight.set('positions', viewState.get('highlights').get('epitopes'));
      this.featureHighlights.set('accessionId', viewState.get('accession').id);
      this.epitopeHighlight.set('accessionId', viewState.get('accession').id);
      this.jsmol.set('viewState', viewState);
      this.updateAccessionInfo(viewState.get('accession'));
    },
    updateAccessionInfo: function (accessionInfo) {
      // console.log('running ' + this.id + '.updateAccessionInfo with ' + JSON.stringify(accessionInfo) );
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
      // console.log('get viewState.displayType record for ' + val);
      dataPromises.push(this.getDisplayTypeInfo(val));
      val = hashParams.accession || this.viewDefaults.get('accession');
      // console.log('get viewState.accession record for ' + val);
      dataPromises.push(this.getAccessionInfo(val));

      val = hashParams.zoomLevel || this.viewDefaults.get('zoomLevel') || 100;
      // console.log('get viewState.zoomLevel for ' + val);
      dataPromises.push(Promise.resolve(val));

      return Promise.all(dataPromises);
    },
    /*
    return a Promise with the information for displayType.
     */
    getDisplayTypeInfo: function (displayTypeId) {
      return dataStoreHelpers.itemByIdToPromise(this.displayTypeStore, displayTypeId);
    },
    /*
    Return a Promise for the protein accession information
     */
    getAccessionInfo: function (accessionId) {
      return dataStoreHelpers.itemByIdToPromise(this.proteinStore, accessionId);
    }
  });
});
