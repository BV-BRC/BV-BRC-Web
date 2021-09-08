define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/request', 'dojo/when',
  'dijit/layout/ContentPane',
  './Base', '../../util/PathJoin', '../PhylogenyGene', '../../WorkspaceManager',
  'dojo/request'
], function (
  declare, lang,
  domConstruct, request, when,
  ContentPane,
  ViewerBase, PathJoin, Phylogeny, WorkspaceManager,
  xhr
) {
  return declare([ViewerBase], {
    disabled: false,
    query: null,
    displayName: null,
    containerType: 'phylogenetic_tree',
    perspectiveLabel: 'Phylogenetic Tree',
    perspectiveIconClass: 'icon-selection-Experiment',
    apiServiceUrl: window.App.dataAPI,
    maxFeaturesPerList: 10000,

    onSetState: function (attr, oldVal, state) {
      // console.warn("TE onSetState", state);

      if (!state) {
        return;
      }

      this.viewer.set('visible', true);
      window.document.title = 'Phylogenetic Tree';
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      var _self = this;

      this.viewer = new Phylogeny({
        region: 'center',
        id: this.id + '_Phylogeny',
        state: this.state,
        gutters: false,
        tgState: null,
        loadingMask: null,
        apiServer: window.App.dataServiceURL
      });

      this.viewerHeader = new ContentPane({
        content: '',
        region: 'top'
      });

      this.addChild(this.viewerHeader);
      this.addChild(this.viewer);
      this.inherited(arguments);
      var dataFiles = [];
      var nwkIds = null;
      var nwkNames = null;
      var folderCheck = this.state.search.match(/wsTreeFolder=..+?(?=&|$)/);
      var fileCheck = this.state.search.match(/wsTreeFile=..+?(?=&|$)/);
      var idType = this.state.search.match(/idType=..+?(?=&|$)/);
      var labelType = this.state.search.match(/labelType=..+?(?=&|$)/);
      if (idType && !isNaN(idType.index)) {
        idType = idType[0].split('=')[1];
      }
      else { idType = 'patric_id'; }
      if (labelType && !isNaN(labelType.index)) {
        labelType = labelType[0].split('=')[1];
      }
      else { labelType = 'feature_name'; }
      var labelSearch = this.state.search.match(/labelSearch=.*/);
      if (labelSearch && !isNaN(labelSearch.index)) {
        labelSearch = labelSearch[0].split('=')[1].split('&')[0];
        if (labelSearch == 'true') {
          labelSearch = true;
        } else {
          labelSearch = false;
        }
      }
      else { labelSearch = false; }
      if (folderCheck && !isNaN(folderCheck.index)) {
        var objPathParts = folderCheck[0].split('=')[1].split('/');
        var objName = objPathParts.pop();
        this.displayName = decodeURIComponent(objName);
        objName = '.' + objName;
        objPathParts.push(objName);
        var objPath = decodeURIComponent(objPathParts.join('/'));
        if (objPath.substring(0, 7) == '/public') {
          objPath = objPath.substring(7);  // remove '/public' if needed
        }
        WorkspaceManager.getFolderContents(objPath, true, true)
          .then(function (objs) {
            // console.log("[JobResult] objects: ", objs);
            Object.values(objs).forEach(function (obj) {
              if (obj.type == 'json' && !obj.path.endsWith('final_rooted.json')) {
                dataFiles.push(obj.path);
              } else if (obj.type == 'nwk') {
                nwkIds = obj.path;
                nwkNames = obj.path;
              }
            });
            if (dataFiles.length >= 1) {
              WorkspaceManager.getObjects(dataFiles, false)
                .then(function (curFiles) {
                  var treeDat = {};
                  if (curFiles.length >= 1) {
                    treeDat = JSON.parse(curFiles[0].data);
                    treeDat.info.taxon_name = _self.displayName;
                  }
                  _self.prepareTree(treeDat, idType, labelType, labelSearch);
                });
            } else if (nwkIds || nwkNames) {
              var objPath = nwkIds || nwkNames;
              WorkspaceManager.getObjects([objPath]).then(lang.hitch(this, function (objs) {
                var obj = objs[0];
                var treeDat = {};
                if (typeof obj.data == 'string') {
                  treeDat.tree = obj.data.replace(/[^(,)]+_@_/g, ''); // get rid of ridiculously annoying, super dirty embedded labels
                  _self.prepareTree(treeDat, idType, labelType, labelSearch);
                }
              }));
            }
          });
      }
      else if (fileCheck && !isNaN(fileCheck.index)) {
        var objPath = fileCheck[0].split('=')[1];
        WorkspaceManager.getObjects([objPath]).then(lang.hitch(this, function (objs) {
          var obj = objs[0];
          var treeDat = {};
          if (typeof obj.data == 'string') {
            treeDat.tree = obj.data.replace(/[^(,)]+_@_/g, ''); // get rid of ridiculously annoying, super dirty embedded labels
            _self.prepareTree(treeDat, idType, labelType, labelSearch);
          }
        }));
      }
    },

    prepareTree: function (treeDat, idType, labelType, labelSearch) {
      // console.log('in prepareTree, idType, labelType, labelSearch', idType, labelType, labelSearch);
      if (labelSearch) {
        this.findLabels(treeDat, idType, labelType);
      }
      else {
        this.viewer.processTreeData(treeDat, idType);
      }
    },


    findLabels: function (treeDat, idType, labelType) {
      var _self = this;
      var ids = treeDat.tree.match(/[^(,)]+(?=:)/g);
      var toQuery = [];
      ids.forEach(function (id) {
        if (id.includes('.')) {
          toQuery.push(id);
        }
      });

      var query = 'in(' + idType + ',(' + toQuery.join(',') + '))';

      var url = PathJoin(this.apiServiceUrl, 'genome_feature', '?' + (query) + '&select(' + idType + ',feature_id)&limit(' + this.maxFeaturesPerList + 1 + ')');
      // console.log('in findLabels URL: ', url);

      xhr.post(PathJoin(this.apiServiceUrl, 'genome_feature'), {
        headers: {
          accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
        data: (query) + '&select(' + idType + ',feature_id)&limit(' + this.maxFeaturesPerList + 1 + ')'

      }).then(function (res) {
        // console.log('findLabels, Get FeatureList Res: ', res);
        if (res && res.response && res.response.docs) {
          var features = res.response.docs;
          treeDat.labels = {};
          features.forEach(function (feature) {
            treeDat.labels[features.patric_id] = features.patric_id;
          });
        }
        else {
          console.warn('Invalid Response for: ', url);
        }
        _self.viewer.processTreeData(treeDat, idType);
        return true;
      }, function (err) {
        console.error('Error Retreiving Features: ', err);
        _self.viewer.processTreeData(treeDat, idType);
        return false;
      });
      return true;
    }
  });
});
