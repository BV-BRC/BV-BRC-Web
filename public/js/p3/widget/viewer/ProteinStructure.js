define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
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
  'dojo/request',
  '../DataItemFormatter',
  '../../util/PathJoin',
  '../../util/dataStoreHelpers'
],
function (
  declare,
  lang,
  domConstruct,
  domStyle,
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
  xhr,
  DataItemFormatter,
  PathJoin,
  dataStoreHelpers
)
{
  return declare([Base, Templated, WidgetsInTmeplateMixin], {
    id: 'proteinStructureViewer',
    className: 'ProteinStructureViewer',
    templateString: templateString,
    molstar: null,
    isWorkspace: false,
    viewState: new ProteinStructureState({}),
    state: {},
    apiServiceUrl: window.App.dataAPI,
    contentServer: `${window.App.dataServiceURL}/content`,
    postCreate: async function () {
      // console.log('starting ' + this.id + '.postCreate');

      this.proteinStore = new ItemFileReadStore({
        url: '/public/js/p3/resources/jsmol/SARS-CoV-2.json'
      });
      this.displayTypeStore = new ItemFileReadStore({
        url: '/public/js/p3/resources/jsmol/display-types.json'
      });

      this.isWorkspace = (this.state.hashParams.path !== undefined);

      // Mol* viewer object
      this.molstar = new ProteinStructureDisplay({
        id: this.id + '_structure'
      });

      if (!this.isWorkspace) {
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
              newState.set('accession', record);
              this.set('viewState', newState);
            });
          }
        }));

        this.ligandHighlight = new LigandHighlights({
          id: this.id + '_ligands',
          color: '#00ff00'
        });
        this.ligands.addChild(this.ligandHighlight);
        this.ligandHighlight.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
          let highlights = new Map(this.viewState.get('highlights'));
          highlights.set('ligands', new Map(newValue));
          this.get('viewState').set('highlights', highlights);
        }));

        let accessionId = this.state.hashParams.accession || this.viewDefaults.get('accession');
        accessionId = accessionId.toUpperCase();

        const urls = [
          `${this.contentServer}/structures/protein_features/${accessionId}.fea`,
          `${this.contentServer}/structures/epitopes/${accessionId}.epi`
        ];

        /* Fetch data files together before parsing feature and epitope content
          @return JSON object
          @exception Error object
         */
        const response = await Promise.all(
            urls.map(url => xhr.get(url, {
              headers: {
                'Accept': 'application/solr+json',
                'Authorization': window.App.authorizationToken
              }
            }).then(res => res)
                .catch(e => e))
        );

        const featureContent = response[0];
        const epitopeContent = response[1];

        let hasHighlighter = false;
        if (!(featureContent instanceof Error)) {
          this.featureHighlights = new SARS2FeatureHighlights({
            data: JSON.parse(featureContent).data
          });
          this.featureHighlights.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
            // console.log('old highlights %s new highlights %s',  JSON.stringify(oldValue), JSON.stringify(newValue));
            // console.log('viewState.highlights is ' + JSON.stringify(this.get('viewState').get('highlights')));
            let highlights = new Map(this.viewState.get('highlights'));
            highlights.set('features', new Map(newValue));
            this.get('viewState').set('highlights', highlights);
          }));
          this.highlighters.addChild(this.featureHighlights);
          hasHighlighter = true;
        }

        if (!(epitopeContent instanceof Error)) {
          this.epitopeHighlight = new EpitopeHighlights({
            id: this.id + '_epitopes',
            color: '#ffff00',
            data: JSON.parse(epitopeContent).data
          });
          this.highlighters.addChild(this.epitopeHighlight);

          this.epitopeHighlight.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
            // console.log('old highlights %s new highlights %s',  JSON.stringify(oldValue), JSON.stringify(newValue));
            // console.log('viewState.highlights is ' + JSON.stringify(this.get('viewState').get('highlights')));
            let highlights = new Map(this.viewState.get('highlights'));
            highlights.set('epitopes', new Map(newValue));
            this.get('viewState').set('highlights', highlights);
          }));

          hasHighlighter = true;
        }

        // Expand accession info box if no highlighter data
        if (!hasHighlighter) {
          this.highlighters.destroyRecursive();
          domStyle.set(this.accessionTitle.containerNode, 'height', '85%');
        }
      }

      this.watch('viewState', lang.hitch(this, function (attr, oldValue, newValue) {
        this.onViewStateChange(newValue);
      }));

      this.getInitialViewState().then(lang.hitch(this, function (viewData) {
        var viewState = new ProteinStructureState({});

        if (viewData.length > 1) {
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
        } else {
          viewState.set('workspacePath', viewData[0]);
        }
        // console.log('initial viewstate is ' + JSON.stringify(viewState));
        this.set('viewState', viewState);
      }));
    },
    onViewStateChange: function (viewState) {
      // console.log('updating viewState for child objects to ' + JSON.stringify(viewState));
      this.updateFromViewState(viewState);
    },
    updateFromViewState: function (viewState) {
      // this.displayControl.set('accessionId', viewState.get('accession').pdb_id);
      if (this.epitopeHighlight) {
        this.epitopeHighlight.set('positions', viewState.get('highlights').get('epitopes'));
        this.epitopeHighlight.set('accessionId', viewState.get('accession').pdb_id);
      }
      if (this.featureHighlights) {
        this.featureHighlights.set('accessionId', viewState.get('accession').pdb_id);
      }
      this.updateAccessionInfo(viewState.get('accession'));
      this.molstar.set('viewState', viewState);
    },
    updateAccessionInfo: function (accessionInfo) {
      if (this.isWorkspace) {
        domConstruct.destroy(this.proteinLeftPanel.containerNode);
        domStyle.set(this.proteinMolstarView.containerNode, 'width', '100%');
        domStyle.set(this.proteinMolstarView.containerNode, 'left', '0px');
      } else {
        domConstruct.empty(this.accessionTitle.containerNode);
        domConstruct.place(DataItemFormatter(accessionInfo, 'structure_data', {}), this.accessionTitle.containerNode, 'first');
      }
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
      let workspacePath = hashParams.path;

      if (workspacePath === undefined) {
        let val = hashParams.displayType || this.viewDefaults.get('displayType');
        // console.log('get viewState.displayType record for ' + val);
        dataPromises.push(this.getDisplayTypeInfo(val));
        val = hashParams.accession || this.viewDefaults.get('accession');
        // console.log('get viewState.accession record for ' + val);
        dataPromises.push(this.getAccessionInfo(val));

        val = hashParams.zoomLevel || this.viewDefaults.get('zoomLevel') || 100;
        // console.log('get viewState.zoomLevel for ' + val);
        dataPromises.push(Promise.resolve(val));
      } else {
        dataPromises.push(decodeURIComponent(workspacePath));
      }

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
      return new Promise(
        (resolve, reject) => {
          const experiment = xhr.get(PathJoin(this.apiServiceUrl, 'protein_structure', accessionId), {
            headers: {
              accept: 'application/json',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            },
            handleAs: 'json'
          });

          resolve(experiment);
        });
    }
  });
});
