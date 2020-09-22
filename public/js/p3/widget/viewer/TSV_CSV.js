define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/dom-style',
  '../TSV_CSV_GridContainer', '../formatter', '../../WorkspaceManager', 'dojo/_base/Deferred', 'dojo/dom-attr', 
  'dojo/_base/array', '../GridSelector', 'dojo/_base/lang', '../../store/TsvCsvMemoryStore',
  './Base', 'dijit/form/Textarea', 'dijit/form/Button', 'dijit/form/CheckBox', 'dijit/form/Select', 'dojo/topic',
  '../TsvCsvFeatures', 'dojo/request', '../../util/PathJoin', 'dojo/NodeList-traverse'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct, domStyle,
  TSV_CSV_GridContainer, formatter, WS, Deferred, domAttr, 
  array, selector, lang, TsvCsvStore, 
  ViewerBase, TextArea, Button, CheckBox, Select, Topic,
  tsvCsvFeatures, request, PathJoin
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

        // if suffix was not found in tsvCsvFeatures, then this is a user imported custom table.
        // Does it have auto-detected feature column?
        //if (this.userDefinedTable && val.data) {        
          
        //}

        this.set('containerType', newType);

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
        //Topic.publish('/ColumnFilter', self.filters);
      });

      // initialize app filters
      var items = [];
      columnHeaders.forEach(function(header){
        items.push({'label': header.label, 'value': header.label});
      });
      items.shift(); // remove checkboxes from column selection item list
      items.unshift({'label': "All Columns", 'value': "All Columns"}); // add an All Columns option to the top of the list
      selector.set('options', items).reset();

      //var spacer = domConstruct.create('span', {style: {'title': '     ', 'width': '10000px'} });

      domConstruct.place(downld, filterPanel.containerNode, 'last');
      domConstruct.place(label_keyword, filterPanel.containerNode, 'last');
      domConstruct.place(ta_keyword.domNode, filterPanel.containerNode, 'last');
      //domConstruct.place(spacer, filterPanel.containerNode, 'last');
      domConstruct.place(selector.domNode, filterPanel.containerNode, 'last');

      var btn_reset = new Button({
        label: 'Reset',
        onClick: lang.hitch(this, function () {

          ta_keyword.set('value', '');
          selector.set('value', "All Columns");
          //filter.columnSelection = selector.get('value');
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

    checkForGenomeIDs: function (data) {
      //console.log(data);
      _self = this;
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
              //var featureString = String(data[j][Object.keys(data[j])[i]]).replace("|", "%7C");
              checkFeatureIDs.push({columns: [i], feature: (featureString)});
              //checkFeatureIDs.push({[featureString]: [i]});
            }
            else {
              if (checkFeatureIDs[elementPos].columns.indexOf(i) == -1) {
                checkFeatureIDs[elementPos].columns.push(i);
              }
            }
          }

          // if the cell contains a gene_id
          var geneMatch = String(data[j][Object.keys(data[j])[i]]).match(/\d+\.\d+/);

          if (geneMatch) {
            var elementPos = checkGeneIDs.map(function(x) {return x.geneID; }).indexOf(geneMatch[0]);
            if (elementPos === -1) {
              checkGeneIDs.push({columns: [i], geneID: geneMatch[0]});
            }
            else {
              if (checkGeneIDs[elementPos].columns.indexOf(i) == -1) {
                checkGeneIDs[elementPos].columns.push(i);
              }
            }
          }
        }  // end for rows
      }  // end for each column
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
                var elementPos = featureCounts.map(function(x) {return x.columnNum; }).indexOf(colItem);
                if (elementPos === -1) {
                  featureCounts.push ({ columnNum: colItem, featureCount: 1 });
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
                  var countPosition = featureCounts.map(function(x) {return x.columnNum; }).indexOf(colItem);
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
              this.containerType = 'csvFeature';

              _self.actionPanel._actions.ViewFeatureItem.options.disabled = true;
              
              _self.actionPanel.addAction('Test', 'fa icon-pencil-square-o fa-2x', {
                label: 'TEST',
                validTypes: ['*'],
                validContainerTypes: ['csvFeature'],
                //disabled: true,
                tooltip: 'Rename has been <b>temporarily disabled</b><br>while we address a technical issue.'
              }, function (sel) {

              }, false);

              // ********DEV
              Topic.publish('changeActionPanel', _self.actionPanel);

            }
            
          }
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
            _self.set('containerType', 'csvFeature');
            _self.set('userDefinedGeneIDHeader', i)   // column number that contains gene id
            // must specify column
          }
        });
      }      
      //}  // end for each column
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

            if (this.userDefinedTable) {
              // check for feature/genome columns
              this.checkForGenomeIDs(tsvCsvStore.data);
            }
 
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
