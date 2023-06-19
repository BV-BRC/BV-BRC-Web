define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/request', 'dojo/when',
  'dijit/layout/ContentPane',
  './Base', '../../util/PathJoin', '../Phylogeny2', '../../WorkspaceManager',
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
    maxGenomesPerList: 10000,

    onSetState: function (attr, oldVal, state) {
      // console.warn("TE onSetState", state);

      if (!state) {
        return;
      }

      this.viewer.set('visible', true);

      this.buildHeaderContent(state);
      window.document.title = 'Phylogenetic Tree';
    },

    buildHeaderContent: function (state) {

      // be strict to single public experiment to display further header info.
      /* var check = state.search.match(/^eq\(eid,\((.*)\)\)/);
      if(check && !isNaN(check[1])){
        var eid = check[1];
        var self = this;
        // console.log("found eid", eid);
        return when(request.get(PathJoin(this.apiServiceUrl, "transcriptomics_experiment", eid), {
          headers: {
            'Accept': "application/json",
            'Content-Type': "application/rqlquery+x-www-form-urlencoded"
          },
          handleAs: "json"
        }), function(exp){

          self.queryNode.innerHTML = "<b>" + exp.title + "</b>";
          self.totalCountNode.innerHTML = " ( " + exp.samples + " Comparisons )";
        });
      } */
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

      /* var headerContent = domConstruct.create("div", {"class": "PerspectiveHeader"});
      domConstruct.place(headerContent, this.viewerHeader.containerNode, "last");
      domConstruct.create("i", {"class": "fa PerspectiveIcon " + this.perspectiveIconClass}, headerContent);
      domConstruct.create("div", {
        "class": "PerspectiveType",
        innerHTML: this.perspectiveLabel
      }, headerContent);
      this.queryNode = domConstruct.create("span", {"class": "PerspectiveQuery"}, headerContent);

      this.totalCountNode = domConstruct.create("span", {
        "class": "PerspectiveTotalCount"
      }, headerContent); */
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
      var fileType = this.state.search.match(/fileType=..+?(?=&|$)/);
      var isClassification = this.state.search.match(/isClassification=.+?(?=&|$)/);
      var initialValue = this.state.search.match(/initialValue=.+?(?=&|$)/);
      // console.log('fileType', fileType);

      if (idType && !isNaN(idType.index)) {
        idType = idType[0].split('=')[1];
      }
      else { idType = 'genome_id'; }
      if (labelType && !isNaN(labelType.index)) {
        labelType = labelType[0].split('=')[1];
      }
      else { labelType = 'genome_name'; }

      if (fileType && !isNaN(fileType.index)) {
        fileType = fileType[0].split('=')[1];
      }
      else { fileType = 'phyloxml'; }

      if (isClassification && !isNaN(isClassification.index)) {
        isClassification = isClassification[0].split('=')[1];
        isClassification = (isClassification === 'true') || (isClassification === '1');
      }
      else { isClassification = false; }

      if (initialValue && !isNaN(initialValue.index)) {
        initialValue = initialValue[0].split('=')[1];
      }

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
              } else if (obj.type == 'nwk' && obj.path.endsWith('treeWithGenomeIds.nwk')) {
                nwkIds = obj.path;
              } else if (obj.type == 'nwk' && obj.path.endsWith('treeWithGenomeNames.nwk')) {
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
                  _self.prepareTree(treeDat, idType, labelType, labelSearch, fileType);
                });
            } else if (nwkIds || nwkNames) {
              var objPath = nwkIds || nwkNames;
              WorkspaceManager.getObjects([objPath]).then(lang.hitch(this, function (objs) {
                var obj = objs[0];
                var treeDat = {};
                if (typeof obj.data == 'string') {
                  treeDat.tree = obj.data.replace(/[^(,)]+_@_/g, ''); // get rid of ridiculously annoying, super dirty embedded labels
                  _self.prepareTree(treeDat, idType, labelType, labelSearch, fileType);
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
            treeDat.tree = obj.data;
            if (isClassification) {
              treeDat.options = {};
              treeDat.options.externalNodeFontSize = 10;
              treeDat.options.branchWidthDefault = 1;
              treeDat.options.found0ColorDefault = '#800000';

              // Shorten names to render a better tre display
              if (obj.metadata && obj.metadata.name && obj.metadata.name.length > 100) {
                treeDat.options.shortenNodeNames = true;

                treeDat.setting = {};
                treeDat.setting.showShortenNodeNamesButton = true;
              }

              if (initialValue) {
                treeDat.options.searchAinitialValue = '_#';
              }
            }
            _self.prepareTree(treeDat, idType, labelType, labelSearch, fileType);
          }
        }));
      }
    },

    prepareTree: function (treeDat, idType, labelType, labelSearch, fileType) {
      if (labelSearch) {
        this.findLabels(treeDat, idType, labelType, fileType);
      }
      else {
        this.viewer.processTreeData(treeDat, idType, fileType);
      }
    },


    findLabels: function (treeDat, idType, labelType, fileType) {
      var _self = this;
      var ids = treeDat.tree.match(/[^(,)]+(?=:)/g);
      var toQuery = [];
      ids.forEach(function (id) {
        if (id.includes('.')) {
          toQuery.push(id);
        }
      });

      var query = 'in(' + idType + ',(' + toQuery.join(',') + '))';
      var url = PathJoin(this.apiServiceUrl, 'genome', '?' + (query) + '&select(' + idType + ',' + labelType + ')&limit(' + this.maxGenomesPerList + 1 + ')');

      xhr.post(PathJoin(this.apiServiceUrl, 'genome'), {
        headers: {
          accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
        data: (query) + '&select(' + idType + ',' + labelType + ')&limit(' + this.maxGenomesPerList + 1 + ')'

      }).then(function (res) {
        // console.log(" URL: ", url);
        // console.log("Get GenomeList Res: ", res);
        if (res && res.response && res.response.docs) {
          var genomes = res.response.docs;
          treeDat.labels = {};
          genomes.forEach(function (genome) {
            treeDat.labels[genome.genome_id] = genome.genome_name;
          });
        }
        else {
          console.warn('Invalid Response for: ', url);
        }
        _self.viewer.processTreeData(treeDat, idType, fileType);
        return true;
      }, function (err) {
        console.error('Error Retreiving Genomes: ', err);
        _self.viewer.processTreeData(treeDat, idType, fileType);
        return false;
      });
      return true;
    }
  });
});
