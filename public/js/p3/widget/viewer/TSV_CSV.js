define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/dom-style',
  '../TSV_CSV_GridContainer', '../formatter', '../../WorkspaceManager', 'dojo/_base/Deferred', 'dojo/dom-attr', 
  'dojo/_base/array', '../GridSelector', 'dojo/_base/lang', '../../store/TsvCsvMemoryStore',
  './Base', 'dijit/form/Textarea', 'dijit/form/Button', 'dijit/form/CheckBox', 'dijit/form/Select', 'dojo/topic',
  '../TsvCsvFeatures'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct, domStyle,
  TSV_CSV_GridContainer, formatter, WS, Deferred, domAttr, 
  array, selector, lang, TsvCsvStore, 
  ViewerBase, TextArea, Button, CheckBox, Select, Topic,
  tsvCsvFeatures
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
    hasColumnHeaders: true,

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
            // key name is found
            if (Object.keys(tsvCsvFeatures[keyName]).length > 1) {
              newType = 'csvFeature';
            }
          }
        });
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

      console.log ("in createFilterPanel in viewer");

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
          this.set('hasColumnHeaders', val);
        }));
        domConstruct.create('label', {innerHTML: 'testing'}, this.checkBox_headers);

        domConstruct.place(checkBox_headers.domNode, columnDiv, 'first');
        domConstruct.place(columnDiv, filterPanel.containerNode, 'last');
        domConstruct.create('span', { innerHTML: 'First Row Contains Column Headers' }, columnDiv);
      }
      this.addChild(filterPanel);
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
            
            var tsvCsvStore = new TsvCsvStore({
              type: 'separatedValues',
              topicId: 'TsvCsv'
            }); 

            var tsvGC = new TSV_CSV_GridContainer({
              title: 'TSV View',
              id: this.viewer.id + '_tsv',
              disable: false,
              store: tsvCsvStore
            }); 
            
            tsvGC.set('state', {dataType: this.file.metadata.type, dataFile: this.file.metadata.name, data: this.file.data});
            this.createFilterPanel(tsvCsvStore.columns);

						// make a grid and fill it 
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
