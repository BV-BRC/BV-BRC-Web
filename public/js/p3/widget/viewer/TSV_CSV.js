define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/dom-style',
  '../TSV_CSV_GridContainer', '../formatter', '../../WorkspaceManager', 'dojo/_base/Deferred', 'dojo/dom-attr', 
  'dojo/_base/array', '../GridSelector', 'dojo/_base/lang', '../../store/TsvCsvMemoryStore',
  './Base', 'dijit/form/Textarea', 'dijit/form/Button', 'dojo/topic'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct, domStyle,
  TSV_CSV_GridContainer, formatter, WS, Deferred, domAttr, 
  array, selector, lang, TsvCsvStore, 
  ViewerBase, TextArea, Button, Topic
) {

  //var tsvGC = new TSV_CSV_GridContainer();

  return declare([ViewerBase], {    // was BorderContainer
    baseClass: 'CSV_Viewer',
    disabled: false,
    containerType: 'csvFeature',
    file: null,
    viewable: false,
    url: null,
    preload: true,
    //pfState: null,

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

      //this.createFilterPanel();

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

        //this.createFilterPanel();

				// DEV DLB, remove reference to non-csv/tsv files
        // get the object to display
        Deferred.when(WS.getObject(this.filepath, !this.preload), function (obj) {
          // console.log('[File] obj:', obj);
          _self.set('file', obj);
        //}).then(function () {
        //  _self.refresh();
        });
      }

			this.refresh();
    },

    createFilterPanel: function() {

      console.log ("in createFilterPanel in viewer");

      var filterPanel = new ContentPane({
        region: 'top'
      });

      var downld = '<a href=' + this.url + '><i class="fa icon-download pull-left fa-2x"></i></a>';

      var ta_keyword = this.ta_keyword = new TextArea({
        style: 'width:272px; min-height:20px; margin-bottom: 10px'
      });
      var label_keyword = domConstruct.create('label', { innerHTML: 'KEYWORDS   ' });
      domConstruct.place(downld, filterPanel.containerNode, 'last');
      domConstruct.place(label_keyword, filterPanel.containerNode, 'last');
      domConstruct.place(ta_keyword.domNode, filterPanel.containerNode, 'last');

      var btn_reset = new Button({
        label: 'Reset',
        onClick: lang.hitch(this, function () {

          ta_keyword.set('value', '');

          // reset store
          //this.pfState = lang.mixin(this.pfState, defaultFilterValue);
          // console.log(this.pfState);
          //Topic.publish(this.topicId, 'applyConditionFilter', this.pfState);
        })
      });
      //domConstruct.place(btn_reset.domNode, filterPanel.containerNode, 'last');

      var btn_submit = new Button({
        label: 'Filter',
        onClick: lang.hitch(this, function () {

          var filter = {};

          filter.keyword = ta_keyword.get('value');
         
          Topic.publish('applyKeywordFilter', filter.keyword);
          console.log("after publish");
        })
      });
      domConstruct.place(btn_submit.domNode, filterPanel.containerNode, 'last');
      domConstruct.place(btn_reset.domNode, filterPanel.containerNode, 'last');

      this.addChild(filterPanel);
      //return filterPanel;
    },

    formatFileMetaData: function (showMetaDataRows) {
      var fileMeta = this.file.metadata;
      if (this.file && fileMeta) {
        var content = '<div><h3 class="section-title-plain close2x pull-left"><b>' + fileMeta.type + ' file</b>: ' + fileMeta.name + '</h3>';

        if (WS.downloadTypes.indexOf(fileMeta.type) >= 0) {
          content += '<a href=' + this.url + '><i class="fa icon-download pull-left fa-2x"></i></a>';
        }

        //var filterPanel = this.createFilterPanel();
        //content += filterPanel;

        //if (showMetaDataRows) {
        //  var formatLabels = formatter.autoLabel('fileView', fileMeta);
        //  content += formatter.keyValueTable(formatLabels);
        //}
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
          this.viewSubHeader.set('content', this.formatFileMetaData(false));

          if (this.file.data || (!this.preload && this.url)) {

            this.createFilterPanel();

            // get data for tsv (currently typed as txt)
            if (this.file.metadata.type == 'txt') {
              // split on new lines, to get the grid rows
              var dataLines = this.file.data.split(/\r?\n/);

              // get the headers for the columns by splitting the first line.  
              var tmpColumnHeaders = dataLines[0].split(/\t/);	
            } else {    // csv
              var dataLines = this.file.data.split(/\r?\n/); 
            }
            // make column labels from the first line of dataLines
            var gridColumns = [];
            //gridColumns.push({'Selection Checkboxes' : selector({ unhidable: true})});
            for (i = 0; i < tmpColumnHeaders.length; i++) {
              //var columnHeaders = { label: tmpColumnHeaders[i], field: 'column' + i };
              var columnHeaders = { label: tmpColumnHeaders[i], field: tmpColumnHeaders[i] };

              gridColumns.push(columnHeaders);
            }
          
						// fill with data, start with second line of dataLines
						var columnData = [];
						for (i = 1; i < dataLines.length; i++) {
							var tmpData = dataLines[i].split(/\t/);
							var dataRow = {};
							for (j = 0; j < tmpData.length; j++) {
                //dataRow["column" + j] = tmpData[j];	
                dataRow[gridColumns[j].field] = tmpData[j];
							}
							columnData.push(dataRow);
            }

            // note:  dojo/store/Memory works but specialty store does not.
            // 6/10 moving store to the grid, as per Dustin's suggestion.  
            //var tsvCsvStore = new TsvCsvStore({dataType: this.file.metadata.type, rawData: this.file.data, data: columnData});
            //tsvCsvStore.loadData();
            
            var tsvCsvStore = new TsvCsvStore({
              type: 'separatedValues',
              topidId: 'TsvCsv'
            }); 

            var tsvGC = new TSV_CSV_GridContainer({
              title: 'TSV View',
              id: this.viewer.id + '_tsv',
              disable: false,
              store: tsvCsvStore
            }); 
            
            tsvGC.set('state', {dataType: this.file.metadata.type, data: this.file.data});
            //tsvGC.setData(columnData);
            tsvGC.setColumns(gridColumns);
            //tsvGC.setStore(tsvCsvStore);

						// make a grid and fill it 
            //this.viewer.addChild(tsvGC.gridCtor);       // DLB was set
            //this.viewer.set('content', tsvGC.gridCtor);       // this used to work
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
