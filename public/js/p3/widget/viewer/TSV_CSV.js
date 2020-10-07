define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/dom-style',
  '../TSV_CSV_GridContainer', '../formatter', '../../WorkspaceManager', 'dojo/_base/Deferred', 'dojo/dom-attr', 
  'dojo/_base/array', '../GridSelector', 'dojo/_base/lang', '../../store/TsvCsvMemoryStore',
  './Base', 'dijit/form/Textarea', 'dijit/form/Button', 'dijit/form/CheckBox', 'dijit/form/Select', 'dojo/topic',
  '../TsvCsvFeatures', 'dojo/request', '../../util/PathJoin', 'dijit/popup', 
  '../PerspectiveToolTip', 'dojo/promise/all', 'dojo/when'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct, domStyle,
  TSV_CSV_GridContainer, formatter, WS, Deferred, domAttr, 
  array, selector, lang, TsvCsvStore, 
  ViewerBase, TextArea, Button, CheckBox, Select, Topic,
  tsvCsvFeatures, request, PathJoin, popup, 
  PerspectiveToolTipDialog, all, when
) {

  return declare([ViewerBase], {    // was BorderContainer
    baseClass: 'CSV_Viewer',
    disabled: false,
    //containerType: 'csvFeature',
    file: null,
    viewable: false,
    url: null,
    preload: true,
    containerType: null,
    userDefinedTable: true,
    userDefinedColumnHeaders: false,
    userDefinedGeneIDHeader: null,
    //featureQueryReturned: false,
    //genomeIDQueryReturned: false,

    _setFileAttr: function (val) {
      // console.log('[File] _setFileAttr:', val);
      if (!val) {
        this.file = {}; this.filepath = ''; this.url = '';
        return;
      }
      if (typeof val == 'string') {
        this.set('filepath', val);
      } else {
        this.filepath =
        'path' in val.metadata ?
          val.metadata.path +
          ((val.metadata.path.charAt(val.metadata.path.length - 1) == '/') ? '' : '/')
          + val.metadata.name : '/';

        this.file = val;

        // For tsv/csv displays, we need to disable the FEATURE(S) and GENOME(S) buttons when
        // the tables do not have the right features.
        /*
        var _self = this;
        var keyList = Object.keys(tsvCsvFeatures);
        var columnName = '';
        var newType = null;
        keyList.forEach(function (keyName) {
          if (_self.file.metadata.name.indexOf(keyName) >= 0) {
            // key name is found, this is a known suffix
            _self.userDefinedTable = false;
            _self.userDefinedGeneIDHeader = null;
            if (Object.keys(tsvCsvFeatures[keyName]).length > 1) {
              newType = 'csvFeature';
            }
          }
        });

        this.set('containerType', newType);
*/
        this.refresh();
      }
    },

    _setFilepathAttr: function (val) {
      // console.log('[File] _setFilepathAttr:', val);
      this.filepath = val;
      var _self = this;
      return Deferred.when(WS.getObject(val, true), function (meta) {
        _self.file = { metadata: meta };
        _self.refresh();
      });
    },

    setActionPanel: function (actionPanel) {
        this.actionPanel = actionPanel;
    },

    onSetState: function (attr, oldVal, state) {

      if (!state) {
        return;
      }
      //this.tsvGC.set('state', state);
    },

    postCreate: function() {
      console.log('in postCreate');
      this.inherited(arguments);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      //this.viewHeader = new ContentPane({ content: '', region: 'top' });
      this.viewSubHeader = new ContentPane({ content: '', region: 'top' });
      this.viewer = new ContentPane({ content: '', region: 'center' });
      //this.addChild(this.viewHeader);
      this.addChild(this.viewSubHeader);
      this.addChild(this.viewer);

      var _self = this;
      Deferred.when(WS.getDownloadUrls(_self.filepath), function (url) {
        _self.url = url;
      }).then(function () {
        _self.refresh();
      });

      if (WS.viewableTypes.indexOf(this.file.metadata.type) >= 0 && this.file.metadata.size <= 10000000) {
        this.viewable = true;
      }
      // console.log('[File] viewable?:', this.viewable);

      if (!this.file.data && this.viewable) {
        var _self = this;

        // get the object to display
        Deferred.when(WS.getObject(this.filepath, !this.preload), function (obj) {
          _self.set('file', obj);
        });
      }
      
			this.refresh();
    },

    createFilterPanel: function(columnHeaders) {
      if (this._filterCreated) {
        return;
      }

      this.containerType = '';

      var filterPanel = new ContentPane({
        region: 'top',
        style: {display: 'inline-block', 'vertical-align': 'top'}
      });

      var downld = '<div><a href=' + this.url + '><i class="fa icon-download pull-left fa-2x"></i></a></div>';

      var ta_keyword = this.ta_keyword = new TextArea({
        style: 'width:272px; min-height:20px; marginRight: 2.0em'
      });
      var label_keyword = domConstruct.create('label', { innerHTML: 'KEYWORDS   ' });

      var columnFilter = domConstruct.create('span', {
        style: {
          'float': 'right'
        }
      });

      /**
       * app filter
       */
      var selector = new Select({
        name: 'type',
        style: {
          width: '150px', marginRight: '2.0em'
        },
        options: [
          { label: 'All Columns', value: 'all', selected: true }
        ],
      }, columnFilter);

      this.filters = {
        column: 'all',
        status: null
      };
      on(selector, 'change', function (val) {
        self.filters.column = val;
      });

      // initialize app filters
      var items = [];
      columnHeaders.forEach(function(header){
        items.push({'label': header.label, 'value': header.label});
      });
      items.shift(); // remove checkboxes from column selection item list
      items.unshift({'label': "All Columns", 'value': "All Columns"}); // add an All Columns option to the top of the list
      selector.set('options', items).reset();

      domConstruct.place(downld, filterPanel.containerNode, 'last');
      domConstruct.place(label_keyword, filterPanel.containerNode, 'last');
      domConstruct.place(ta_keyword.domNode, filterPanel.containerNode, 'last');
      domConstruct.place(selector.domNode, filterPanel.containerNode, 'last');

      var btn_reset = new Button({
        label: 'Reset',
        onClick: lang.hitch(this, function () {

          ta_keyword.set('value', '');
          selector.set('value', "All Columns");
          var filter = {};
          filter.keyword = '';
          filter.columnSelection = "All Columns";

          Topic.publish('applyKeywordFilter', filter);
        })
      });

      var btn_submit = new Button({
        label: 'Filter',
        onClick: lang.hitch(this, function () {

          var filter = {};

          filter.keyword = ta_keyword.get('value');
          filter.columnSelection = selector.get('value');
         
          Topic.publish('applyKeywordFilter', filter); 
          console.log("after publish");
        })
      });
      domConstruct.place(btn_submit.domNode, filterPanel.containerNode, 'last');
      domConstruct.place(btn_reset.domNode, filterPanel.containerNode, 'last');

      // add button or checkbox for column headers if suffix is not known (user supplied data file)
      var _self = this;
      var isNotKnownSuffix = true;
      var keyList = Object.keys(tsvCsvFeatures);
      keyList.forEach(function (keyName) {
        if (_self.file.metadata.name.indexOf(keyName) >= 0) {
          isNotKnownSuffix = false;
        }
      });
      if (isNotKnownSuffix) {
        var columnDiv = domConstruct.create('div', {});
        var checkBox_headers = new CheckBox({
          style: { checked: true, 'margin-left': '10px'}
        });
        checkBox_headers.on('change', lang.hitch(this, function (val) {
          _self.actionPanel.set('selection', []);     // if user clicks while row(s) selected, must clear out the action panel
          this.set('userDefinedColumnHeaders', val);
          this.refresh();
        }));
        domConstruct.create('label', {innerHTML: 'testing'}, this.checkBox_headers);

        domConstruct.place(checkBox_headers.domNode, columnDiv, 'first');
        domConstruct.place(columnDiv, filterPanel.containerNode, 'last');
        domConstruct.create('span', { innerHTML: 'First Row Contains Column Headers' }, columnDiv);
      }
      this.addChild(filterPanel);
    },

    processData: function(test) {
      console.log ('in process data')
    },

    checkForGenomeIDs: function (data) {

      //console.log(data);
      _self = this;

      // clear out the last used action panel buttons and start again
      _self.containerType = '';
      _self.actionPanel.deleteAction('ViewFeatureItem', 'FEATURE');
      _self.actionPanel.deleteAction('ViewFeatureGroups', 'FEATURES');
      _self.actionPanel.deleteAction('ViewGenomeItem', 'GENOME');
      _self.actionPanel.deleteAction('ViewGenomeItems', 'GENOMES');
      Topic.publish('changeActionPanel', _self.actionPanel);

      var numColumns = Object.keys(data[0]).length;
      var checkFeatureIDs = [];
      var checkGeneIDs = [];

      for (i = 0; i < numColumns; i++) {
        // check the first 20 rows to see if this column contains gene_id, skip the first row because it may contain headers
        for (j = 1; j < 20 && j < data.length; j++) {

          // if this cell contains a feature id
          if (String(data[j][Object.keys(data[j])[i]]).match(/^fig\|\d+.\d+/)) {
            var featureString = String(data[j][Object.keys(data[j])[i]]).replace("|", "%7C");
            var elementPos = checkFeatureIDs.map(function(x) {return x.feature; }).indexOf(featureString);
            if (elementPos === -1) {
              checkFeatureIDs.push({columns: [Object.keys(data[j])[i]], feature: (featureString)});
            }
            else {
              if (checkFeatureIDs[elementPos].columns.indexOf(Object.keys(data[j])[i]) == -1) {
                checkFeatureIDs[elementPos].columns.push(Object.keys(data[j])[i]);
              }
            }
          }

          // if the cell contains a gene_id
          var geneMatch = String(data[j][Object.keys(data[j])[i]]).match(/\d+\.\d+/);

          if (geneMatch) {
            var elementPos = checkGeneIDs.map(function(x) {return x.geneID; }).indexOf(geneMatch[0]);
            if (elementPos === -1) {
              checkGeneIDs.push({columns: [Object.keys(data[j])[i]], geneID: geneMatch[0]});
            }
            else {
              if (checkGeneIDs[elementPos].columns.indexOf(Object.keys(data[j])[i]) == -1) {
                checkGeneIDs[elementPos].columns.push(Object.keys(data[j])[i]);
              }
            }
          }
        }  // end for rows
      }  // end for each column

      var getFeatureReturned = when(request.get(PathJoin(window.App.dataAPI, 'genome_feature', this.featurequery), {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        
        }}), function (response) {
          return response;
      });

      var getGeneIDReturned = when(request.get(PathJoin(window.App.dataAPI, 'genome', this.genequery), {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        
        }}), function (response) {
          return response;
      });

      if (checkFeatureIDs.length > 0) {
        var featureList = checkFeatureIDs.map(function(item) {
          return item.feature;
        }).join(",");
        this.featurequery = '?in(patric_id,(' + featureList + '))&select(feature_id)';
      }

      if (checkGeneIDs.length > 0) {
        var geneIDList = checkGeneIDs.map(function(item) {
          return item.geneID;
        }).join(",");

        this.genequery = '?in(genome_id,(' + geneIDList + '))&select(genome_id)'; 
      }   

      //return when(all([getFeatureReturned, getGeneIDReturned, testagain]), lang.hitch(this, 'processData'));
      return when(all([getFeatureReturned, getGeneIDReturned]), function(results)
      {
        console.log(results);
        // move results here.  Also need to take into account that sometimes both responses are not necessary.
      });


/*

      if (checkFeatureIDs.length > 0) {
        var featureList = checkFeatureIDs.map(function(item) {
          return item.feature;
        }).join(",");
        query = '?in(patric_id,(' + featureList + '))&select(feature_id)';            //&limit(10)', when limited to 10 later columns are skipped
        request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
          handleAs: 'json',
          headers: {
            Accept: 'application/solr+json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          
          }
        }).then(function (response) {
          console.log ("in response");
          if (response.response.numFound > 0) {

            var featureResponses = [];
            response.response.docs.forEach(function (item) {
              featureResponses.push (item.feature_id.match(/\d+\.\d+/)[0]);
            });

            var featureCounts = [];
            checkFeatureIDs.forEach(function (item) {
              var cols = item.columns;
              cols.forEach (function (colItem) {
                var elementPos = featureCounts.map(function(x) {return x.columnName; }).indexOf(colItem);
                if (elementPos === -1) {
                  featureCounts.push ({ columnName: colItem, featureCount: 1 });
                }
                else {
                  featureCounts[elementPos]['featureCount']++;
                }
              });
            });

            featureResponses.forEach(function (item) {
              var elementPos = checkFeatureIDs.map(function(x) {return x.feature.match(/\d+\.\d+/)[0]; }).indexOf(item);
              if (elementPos > -1) {
                 //get cols and find them in featureCounts, add or increment responseCount
                var cols = checkFeatureIDs[elementPos].columns;
                cols.forEach (function (colItem) {
                  var countPosition = featureCounts.map(function(x) {return x.columnName; }).indexOf(colItem);
                  if (featureCounts[countPosition]['responseCount']) {
                    featureCounts[countPosition]['responseCount']++;
                  }
                  else {
                    featureCounts[countPosition]['responseCount'] = 1;    // first time this col is counted in response
                  }
                })                
              }
            });

            // detection of feature(s) if over 90%
            if (featureCounts[0].responseCount/featureCounts[0].featureCount > .90) {

              _self.containerType = 'csvFeature';              
              
              _self.actionPanel.addAction('ViewFeatureItem', 'MultiButton fa icon-selection-Feature fa-2x', {
                label: 'FEATURE',
                validTypes: ['*'],
                validContainerTypes: ['csvFeature'],    // csv and tsv tables only
                multiple: false,
                tooltip: 'Switch to Feature View.  Press and Hold for more options.',
                pressAndHold: function(selection, button, opts, evt) {
                  var columnName = featureCounts[0].columnName;
                  if (columnName in selection[0]) {
                    var sel = (selection[0][columnName]).replace("|", "%7C");      
                    var query = '?eq(' + 'patric_id' + ',' + sel + ')&select(feature_id)';
          
                    request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
                      handleAs: 'json',
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                        'X-Requested-With': null,
                        Authorization: (window.App.authorizationToken || '')
                      
                      }
                    }) .then(function(response){
                      popup.open ({
                        popup: new PerspectiveToolTipDialog ({
                          perspective: 'Feature',
                          perspectiveUrl: '/view/Feature/' + response[0].feature_id
                        }),
                        around: button,
                        orient: ['below']
                      });
                    }); 
                  }
                }
              
              }, function (selection) {
                var columnName = featureCounts[0].columnName;      
                if (columnName in selection[0]) {   
                  var sel = (selection[0][columnName]).replace("|", "%7C");  
                  var query = '?eq(' + 'patric_id' + ',' + sel + ')&select(feature_id)';

                  request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')
                    
                    }
                  }).then( function(response){
                    Topic.publish('/navigate', { href: '/view/Feature/' + response[0].feature_id })
                  }); 
                }       
              });

              _self.actionPanel.addAction('ViewFeatureGroups', 'MultiButton fa icon-selection-FeatureList fa-2x', {
                label: 'FEATURES',
                validTypes: ['*'],
                validContainerTypes: ['csvFeature'],
                multiple: true,
                min: 2,
                tooltip: 'Switch to the Feature List View. Press and Hold for more options.',
                pressAndHold: function (selection, button, opts, evt) { 

                  var columnName = featureCounts[0].columnName;
                  if (selection.length == 1) {
                    Topic.publish('/navigate', { href: '/view/FeatureGroup' + encodePath(selection[0].path) });
                  } else {
                    var q = selection.map(function (sel) {
                      if (sel[columnName]) {
                        return (sel[columnName]).replace("|", "%7C");
                      }
                      return "";
                    });
          
                    // some entries in the table do not have PATRIC_ID, so they cannot be linked to the features list
                    var noEmptyFeatureIDs = q.filter(function(elem) {
                      return (elem != "");
                    });
                    
                    q = '?in('+ 'patric_id' + ',(' + noEmptyFeatureIDs + '))&select(feature_id)';
                    request.get(PathJoin(window.App.dataAPI, 'genome_feature', q), {
                      handleAs: 'json',
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                        'X-Requested-With': null,
                        Authorization: (window.App.authorizationToken || '')
                      
                      }
                    }).then(function(response){
                      var featureIDs = response.map(function(response) { return response.feature_id; }).join(',');
                      var featureList = '?in(feature_id,(' + featureIDs + '))';
                      popup.open ({
                        popup: new PerspectiveToolTipDialog ({
                          perspective: 'FeatureList',
                          perspectiveUrl: '/view/FeatureList/' + featureList
                        }),
                        around: button,
                        orient: ['below']
                      });
                    }); 
                  }
                },    
              }, function (selection) {
                var columnName = featureCounts[0].columnName;
                if (selection.length == 1) {
                  Topic.publish('/navigate', { href: '/view/FeatureGroup' + encodePath(selection[0].path) });
                } else {
                  var q = selection.map(function (sel) {
                    if (sel[columnName]) {
                      return (sel[columnName]).replace("|", "%7C");
                    }
                    return "";
                  });
        
                  // some entries in the table do not have PATRIC_ID, so they cannot be linked to the features list
                  var noEmptyFeatureIDs = q.filter(function(elem) {
                    return (elem != "");
                  });
                  
                  q = '?in(' + 'patric_id' + ',(' + noEmptyFeatureIDs + '))&select(feature_id)';
                  request.get(PathJoin(window.App.dataAPI, 'genome_feature', q), {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')
                    
                    }
                  }).then(function(response){
                    var featureIDs = response.map(function(response) { return response.feature_id; }).join(',');
                    var featureList = '?in(feature_id,(' + featureIDs + '))';
                    Topic.publish('/navigate', { href: '/view/FeatureList/' +  featureList})
                  }); 
                }
              });

              //Topic.publish('changeActionPanel', _self.actionPanel);

            }  // end FEATURE if feature count > .9
            
          }  // end responses
        });
      } 
      
      if (checkGeneIDs.length > 0) {
        var geneIDList = checkGeneIDs.map(function(item) {
          return item.geneID;
        }).join(",");

        query = '?in(genome_id,(' + geneIDList + '))&select(genome_id)';    
        request.get(PathJoin(window.App.dataAPI, 'genome', query), {
          handleAs: 'json',
          headers: {
            Accept: 'application/solr+json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          
          }
        }).then(function (response) {
          console.log ("in response");
          if (response.response.numFound > 0) {

            var geneIDResponses = [];
            response.response.docs.forEach(function (item) {
              geneIDResponses.push (item.genome_id.match(/\d+\.\d+/)[0]);
            });

            var geneIDCounts = [];
            checkGeneIDs.forEach(function (item) {
              var cols = item.columns;
              cols.forEach (function (colItem) {
                var elementPos = geneIDCounts.map(function(x) {return x.columnName; }).indexOf(colItem);
                if (elementPos === -1) {
                  geneIDCounts.push ({ columnName: colItem, geneIDCount: 1 });
                }
                else {
                  geneIDCounts[elementPos]['geneIDCount']++;
                }
              });
            });

            geneIDResponses.forEach(function (item) {
              var elementPos = checkGeneIDs.map(function(x) {return x.geneID.match(/\d+\.\d+/)[0]; }).indexOf(item);
              if (elementPos > -1) {
                 //get cols and find them in featureCounts, add or increment responseCount
                var cols = checkGeneIDs[elementPos].columns;
                cols.forEach (function (colItem) {
                  var countPosition = geneIDCounts.map(function(x) {return x.columnName; }).indexOf(colItem);
                  if (geneIDCounts[countPosition]['responseCount']) {
                    geneIDCounts[countPosition]['responseCount']++;
                  }
                  else {
                    geneIDCounts[countPosition]['responseCount'] = 1;    // first time this col is counted in response
                  }
                })                
              }
            });

            // detection of genome(s) if over 90%
            if (geneIDCounts[0].responseCount/geneIDCounts[0].geneIDCount > .90) {

              _self.containerType = 'csvFeature';
              
              _self.actionPanel.addAction('ViewGenomeItem', 'MultiButton fa icon-selection-Genome fa-2x', {
                label: 'GENOME',
                validTypes: ['*'],
                ignoreDataType: true,
                validContainerTypes: ['csvFeature'],    // csv and tsv tables only
                multiple: false,
                tooltip: 'Switch to Genome View.  Press and Hold for more options.',
                pressAndHold: function(selection, button, opts, evt) {
                  var columnName = geneIDCounts[0].columnName;
                  if (selection[0][columnName]) {
                    var sel = (selection[0][columnName]).match(/\d+\.\d+/);  
                    var query = '?eq(' + 'genome_id' + ',' + sel + ')&select(genome_id)';
          
                    request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
                      handleAs: 'json',
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                        'X-Requested-With': null,
                        Authorization: (window.App.authorizationToken || '')
                      
                      }
                    }).then(function(response){
                      popup.open ({
                        popup: new PerspectiveToolTipDialog ({
                          perspective: 'Genome',
                          perspectiveUrl: '/view/Genome/' + response[0].genome_id
                        }),
                        around: button,
                        orient: ['below']
                      });
                    }); 
                  }
                },
              
              }, function (selection) {
                var columnName = geneIDCounts[0].columnName;
                if (selection[0][columnName]) { 
                  var sel = (selection[0][columnName]).match(/\d+\.\d+/);     
                  var query = '?eq(' + 'genome_id' + ',' + sel + ')&select(genome_id)';
        
                  request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')
                    
                    }
                  }).then(function(response){
                    Topic.publish('/navigate', { href: '/view/Genome/' + response[0].genome_id })
                  }); 
                }       
              }); 

              _self.actionPanel.addAction('ViewGenomeItems', 'MultiButton fa icon-selection-GenomeList fa-2x', {
                label: 'GENOMES',
                validTypes: ['*'],
                validContainerTypes: ['csvFeature'],
                multiple: true,
                min: 2,
                tooltip: 'Switch to the Genome List View. Press and Hold for more options.',
                pressAndHold: function (selection, button, opts, evt) { 
                  var columnName = geneIDCounts[0].columnName;
                  if (selection.length == 1) {
                    Topic.publish('/navigate', { href: '/view/GenomeList' + encodePath(selection[0].path) });
                  } else {
                    var q = selection.map(function (sel) {
                      if (sel[columnName]) {
                        return (selection[0][columnName]).match(/\d+\.\d+/);  
                      }
                      return "";
                    });
          
                    // some entries in the table do not have PATRIC_ID, so they cannot be linked to the features list
                    var noEmptyFeatureIDs = q.filter(function(elem) {
                      return (elem != "");
                    });
                    
                    q = '?in(' + 'genome_id' + ',(' + noEmptyFeatureIDs + '))&select(genome_id)';
                    request.get(PathJoin(window.App.dataAPI, 'genome_feature', q), {
                      handleAs: 'json',
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                        'X-Requested-With': null,
                        Authorization: (window.App.authorizationToken || '')
                      
                      }
                    }).then(function(response){
                      var featureIDs = response.map(function(response) { return response.genome_id; }).join(',');
                      var featureList = '?in(genome_id,(' + featureIDs + '))';
                      popup.open ({
                        popup: new PerspectiveToolTipDialog ({
                          perspective: 'GenomeList',
                          perspectiveUrl: '/view/GenomeList/' + featureList
                        }),
                        around: button,
                        orient: ['below']
                      });
                    }); 
                  }
                },    
              }, function (selection) {
                var columnName = geneIDCounts[0].columnName;
                if (selection.length == 1) {
                  Topic.publish('/navigate', { href: '/view/GenomeList' + encodePath(selection[0].path) });
                } else {
                  var q = selection.map(function (sel) {
                    if (sel[columnName]) {
                      return (selection[0][columnName]).match(/\d+\.\d+/);  

                    }
                    return "";
                  });
        
                  // some entries in the table do not have PATRIC_ID, so they cannot be linked to the features list
                  var noEmptyFeatureIDs = q.filter(function(elem) {
                    return (elem != "");
                  });
                  
                  q = '?in(' + 'genome_id' + ',(' + noEmptyFeatureIDs + '))&select(genome_id)';
                  request.get(PathJoin(window.App.dataAPI, 'genome_feature', q), {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')
                    
                    }
                  }).then(function(response){
                    var featureIDs = response.map(function(response) { return response.genome_id; }).join(',');
                    var featureList = '?in(genome_id,(' + featureIDs + '))';
                    Topic.publish('/navigate', { href: '/view/GenomeList/' +  featureList})
                  }); 
                }
              });

            }  // end if genome counts greater than .90

            Topic.publish('changeActionPanel', _self.actionPanel);  //THIS ONE WORKS

          }
        });
      }      
      //}  // end for each column
      
      this.isActionPanelSet = true;

      */
    },

    formatFileMetaData: function (showMetaDataRows) {
      var fileMeta = this.file.metadata;
      if (this.file && fileMeta) {
        var content = '<div><h3 class="section-title-plain close2x pull-left"><b>' + fileMeta.type + ' file</b>: ' + fileMeta.name + '</h3>';

        if (WS.downloadTypes.indexOf(fileMeta.type) >= 0) {
          content += '<a href=' + this.url + '><i class="fa icon-download pull-left fa-2x"></i></a>';
        }
        content += '</tbody></table></div>';
      }

      return content;
    },

    refresh: function () {
      if (!this._started) {
        return;
      }
      if (!this.file || !this.file.metadata) {
        this.viewer.set('content', "<div class='error'>Unable to load file</div>");
        return;
      }

      if (this.file && this.file.metadata) {
        if (this.viewable) {
          //this.viewSubHeader.set('content', this.formatFileMetaData(false));

          if (this.file.data || (!this.preload && this.url)) {
            
            // store
            var tsvCsvStore = new TsvCsvStore({
              type: 'separatedValues',
              topicId: 'TsvCsv',
              userDefinedColumnHeaders: this.userDefinedColumnHeaders
            }); 

            this.viewer.set('content', '');

            // gridContainer
            var tsvGC = new TSV_CSV_GridContainer({
              title: 'TSV View',
              id: this.viewer.id + '_tsv',
              disable: false,
              store: tsvCsvStore
            }); 

            tsvGC.set('state', {dataType: this.file.metadata.type, dataFile: this.file.metadata.name, data: this.file.data});
            this.createFilterPanel(tsvCsvStore.columns);
            this._filterCreated = true;

            //if (this.userDefinedTable) {
              // check for feature/genome columns
              this.checkForGenomeIDs(tsvCsvStore.data);
            //}
 
            this.viewer.set('content', tsvGC);
          } else {
            this.viewer.set('content', '<pre style="font-size:.8em; background-color:#ffffff;">Loading file preview.  Content will appear here when available.  Wait time is usually less than 10 seconds.</pre>');
          }
        } else {
          this.viewSubHeader.set('content', this.formatFileMetaData(true));
        }
      } // end if  file and metadata
    }  // end refresh
  });
});
