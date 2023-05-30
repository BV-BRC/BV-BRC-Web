define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/ready',
  'dojo/sniff',
  '../proteinStructure/ProteinStructureState',
  '../proteinStructure/ProteinStructure',
  '../proteinStructure/LigandHighlights',
  '../proteinStructure/Highlights',
  'dojo/data/ItemFileReadStore',
  'dojo/store/DataStore',
  './Base',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!../templates/proteinStructure/ProteinStructureViewer.html',
  'dojo/request',
  '../DataItemFormatter',
  '../../util/PathJoin'
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
  LigandHighlights,
  Highlights,
  ItemFileReadStore,
  DataStore,
  Base,
  Templated,
  WidgetsInTmeplateMixin,
  templateString,
  xhr,
  DataItemFormatter,
  PathJoin
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
    epitopeHighlights: [],
    featureHighlights: [],
    postCreate: async function () {
      this.isWorkspace = (this.state.hashParams.path !== undefined);

      // Mol* viewer object
      this.molstar = new ProteinStructureDisplay({
        id: this.id + '_structure'
      });

      if (!this.isWorkspace) {
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

        const accessionId = this.state.hashParams.accession || this.viewDefaults.get('accession');
        const accessionIds = accessionId.toUpperCase().split(',');

        let index = 0;
        let hasHighlighter = false;
        for (let id of accessionIds) {
          const urls =[
            `${this.contentServer}/structures/protein_features/${id}.fea`,
            `${this.contentServer}/structures/epitopes/${id}.epi`
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

          if (!(featureContent instanceof Error)) {
            let featureHighlight = new Highlights({
              index: index,
              accessionId: id,
              type: 'features',
              title: accessionIds.length > 1 ? 'Features - ' + id : 'Features',
              color: '#0000ff',
              data: JSON.parse(featureContent).data,
              idProperty: 'name',
              columns: {
                name: { label: 'Name' }
              }
            });
            featureHighlight.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
              let highlights = new Map(this.viewState.get('highlights'));
              highlights.set('features', new Map(newValue));
              this.get('viewState').set('highlights', highlights);
            }));
            this.highlighters.addChild(featureHighlight);

            hasHighlighter = true;
          }

          if (!(epitopeContent instanceof Error)) {
            let epitopeHighlight = new Highlights({
              index: index,
              accessionId: id,
              type: 'epitopes',
              title: accessionIds.length > 1 ? 'Epitopes - ' + id : 'Epitopes',
              color: '#ffff00',
              data: JSON.parse(epitopeContent).data,
              idProperty: 'id',
              columns: {
                id: { label: 'IEDB ID', field: 'id' },
                name: { label: 'SEQ', field: 'name', className: 'proteinStructure-hl-cell' }
              }
            });

            epitopeHighlight.watch('positions', lang.hitch(this, function (attr, oldValue, newValue) {
              let highlights = new Map(this.viewState.get('highlights'));
              highlights.set('epitopes', new Map(newValue));
              this.get('viewState').set('highlights', highlights);
            }));
            this.highlighters.addChild(epitopeHighlight);

            hasHighlighter = true;
          }

          index += 1;
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
          viewState.set('accession', viewData[0]);
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
        if (Array.isArray(accessionInfo)) {
          for (let i = 0; i < accessionInfo.length; ++i) {
            domConstruct.place(DataItemFormatter(accessionInfo[i], 'structure_data', {}), this.accessionTitle.containerNode,
                i === 0 ? 'first' : '');
          }
        } else {
          domConstruct.place(DataItemFormatter(accessionInfo, 'structure_data', {}), this.accessionTitle.containerNode, 'first');
        }
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
        let val = hashParams.accession || this.viewDefaults.get('accession');
        // console.log('get viewState.accession record for ' + val);
        dataPromises.push(this.getAccessionInfo(val));

        // console.log('get viewState.zoomLevel for ' + val);
        dataPromises.push(Promise.resolve(val));
      } else {
        dataPromises.push(decodeURIComponent(workspacePath));
      }

      return Promise.all(dataPromises);
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
