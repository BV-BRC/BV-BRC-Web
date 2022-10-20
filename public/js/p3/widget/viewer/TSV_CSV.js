define([
  'dojo/_base/declare', 'dojo/on', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  '../TSV_CSV_GridContainer', '../../WorkspaceManager', 'dojo/_base/Deferred',
  'dojo/_base/lang', '../../store/TsvCsvMemoryStore', './Base', 'dijit/form/Textarea',
  'dijit/form/Button', 'dijit/form/CheckBox', 'dijit/form/Select', 'dojo/topic',
  '../TsvCsvFeatures', 'dojo/request', '../../util/PathJoin', 'dijit/popup',
  '../PerspectiveToolTip', 'dojo/promise/all', 'dojo/when',
  '../CopyTooltipDialog', '../../util/encodePath', 'dijit/registry', 'dijit/dijit'
], function (
  declare, on, ContentPane, domConstruct,
  TSV_CSV_GridContainer, WS, Deferred,
  lang, TsvCsvStore, ViewerBase, TextArea,
  Button, CheckBox, Select, Topic,
  tsvCsvFeatures, request, PathJoin, popup,
  PerspectiveToolTipDialog, all, when,
  CopyTooltipDialog, encodePath, registry, dijit
) {

  var copySelectionTT = new CopyTooltipDialog({});
  copySelectionTT.startup();

  return declare([ViewerBase], {
    baseClass: 'CSV_Viewer',
    disabled: false,
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

    postCreate: function () {
      this.inherited(arguments);
    },

    startup: function () {
      if (this._started) {
        return;
      }

      this.inherited(arguments);
      this.viewSubHeader = new ContentPane({ content: '', region: 'top' });
      this.viewer = new ContentPane({ content: '', region: 'center' });
      this.addChild(this.viewSubHeader);
      this.addChild(this.viewer);

      var _self = this;
      Deferred.when(WS.getDownloadUrls(_self.filepath), function (url) {
        _self.url = url;
      }).then(function () {
        _self.refresh();
      });

      if (WS.viewableTypes.indexOf(this.file.metadata.type) >= 0 && this.file.metadata.size <= 150000000) {
        this.viewable = true;
      } else {
        this.viewer.set('content', '<pre style="font-size:.8em; background-color:red;"> The file is unviewable because it is too large. Size: ' + (this.file.metadata.size / 1000000).toFixed(2) + ' MB </pre > ');
      }

      if (!this.file.data && this.viewable) {
        var _self = this;

        // get the object to display
        Deferred.when(WS.getObject(this.filepath, !this.preload), function (obj) {
          _self.set('file', obj);
        });
      }

      this.refresh();
    },

    createFilterPanel: function () {
      if (this._filterCreated) {
        return;
      }

      // if the user has already displayed a table, these must be destroyed
      if (registry.byId('filterPanel') !== undefined) {
        registry.byId('filterPanel').destroyRecursive();
        registry.remove('filterPanel');

        registry.byId('filterPanel_splitter').destroyRecursive();
        registry.byId('filterPanel_splitter');
      }

      this.containerType = '';

      this.filterPanel = new ContentPane({
        id: 'filterPanel',
        region: 'top',
        style: { display: 'inline-block', 'vertical-align': 'top' }
      });

      var downld = '<div><a href=' + this.url + '><i class="fa icon-download pull-left fa-2x"></i></a></div>';

      var ta_keyword = this.ta_keyword = new TextArea({
        style: 'width:272px; min-height:20px; max-height:24px; marginRight: 2.0em'
      });
      //
      // var label_keyword = domConstruct.create('label', { innerHTML: 'KEYWORDS   ' });

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
        id: 'columnsList',
        style: {
          width: '150px', marginRight: '2.0em'
        },
        options: [
          { label: 'All Columns', value: 'all', selected: true }
        ]
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
      this.tsvCsvStore.columns.forEach(function (header) {
        items.push({ 'label': header.label, 'value': header.label });
      });
      items.shift(); // remove checkboxes from column selection item list
      items.unshift({ 'label': 'All Columns', 'value': 'All Columns' }); // add an All Columns option to the top of the list
      selector.set('options', items).reset();

      domConstruct.place(downld, this.filterPanel.containerNode, 'last');

      var filterType = domConstruct.create('span', {
        style: {
          'float': 'right'
        }
      });
      var filterSelect = new Select({
        name: 'filterSelect',
        style: {
          width: '150px', marginRight: '2.0em'
        },
        options: [
          { value: 'fuzzy', label: 'Substring Filter', selected: true },
          { value: 'exact', label: 'Exact Filter' },
          { value: 'range', label: 'Range Filter' },
        ]
      }, filterType);

      domConstruct.place(filterSelect.domNode, this.filterPanel.containerNode, 'last');
      domConstruct.place(ta_keyword.domNode, this.filterPanel.containerNode, 'last');
      domConstruct.place(selector.domNode, this.filterPanel.containerNode, 'last');


      var apply_filter = new Button({
        label: 'Apply',
        onClick: lang.hitch(this, function () {
          var filter = {};
          filter.keyword = ta_keyword.get('value');
          filter.columnSelection = selector.get('value');
          filter.type = filterSelect.get('value')
          Topic.publish('applyKeywordFilter', filter);
        })
      });

      var btn_reset = new Button({
        label: 'Reset',
        onClick: lang.hitch(this, function () {

          ta_keyword.set('value', '');
          selector.set('value', 'All Columns');
          Topic.publish('applyResetFilter');
        })
      });

      domConstruct.place(apply_filter.domNode, this.filterPanel.containerNode, 'last');
      domConstruct.place(btn_reset.domNode, this.filterPanel.containerNode, 'last');

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
          style: { checked: true, 'margin-left': '10px' }
        });
        checkBox_headers.on('change', lang.hitch(this, function (val) {
          this.tsvGC.grid.set('rowIsSelected', false);
          _self.actionPanel.set('selection', []);     // if user clicks while row(s) selected, must clear out the action panel
          this.set('userDefinedColumnHeaders', val);
          this.refresh();

          // update the select list of column names on the filter panel
          var items = [];
          this.tsvCsvStore.columns.forEach(function (header) {
            items.push({ 'label': header.label, 'value': header.label });
          });
          items.shift(); // remove checkboxes from column selection item list
          items.unshift({ 'label': 'All Columns', 'value': 'All Columns' }); // add an All Columns option to the top of the list
          dijit.byId('columnsList').set('options', items).reset();
        }));

        domConstruct.create('label', { innerHTML: 'testing' }, this.checkBox_headers);
        domConstruct.place(checkBox_headers.domNode, columnDiv, 'first');
        domConstruct.place(columnDiv, this.filterPanel.containerNode, 'last');
        domConstruct.create('span', { innerHTML: 'First Row Contains Column Headers' }, columnDiv);
      }
      this.addChild(this.filterPanel);
    },

    checkForGenomeIDs: function (data) {

      var _self = this;

      // clear out the last used action panel buttons and start again
      _self.containerType = '';
      _self.actionPanel.deleteAction('ViewFeatureItem', 'FEATURE');
      _self.actionPanel.deleteAction('ViewFeatureGroups', 'FEATURES');
      _self.actionPanel.deleteAction('ViewGenomeItem', 'GENOME');
      _self.actionPanel.deleteAction('ViewGenomeItems', 'GENOMES');
      _self.actionPanel.deleteAction('CopySelection', 'COPY');
      Topic.publish('changeActionPanel', _self.actionPanel);

      // add copy button to action panel
      this.actionPanel.addAction('CopySelection', 'fa icon-clipboard2 fa-2x', {
        label: 'COPY ROWS',
        multiple: true,
        validTypes: ['*'],
        ignoreDataType: true,
        tooltip: 'Copy Selection to Clipboard.',
        tooltipDialog: copySelectionTT,
        max: 5000,
        validContainerTypes: ['csvFeature', '']
      },
      function (selection, container) {
        _self.actionPanel._actions.CopySelection.options.tooltipDialog.set('selection', selection);
        _self.actionPanel._actions.CopySelection.options.tooltipDialog.set('containerType', this.containerType);
        if (container && container.tsvGC.grid) {
          _self.actionPanel._actions.CopySelection.options.tooltipDialog.set('grid', container.tsvGC.grid);
        }

        _self.actionPanel._actions.CopySelection.options.tooltipDialog.timeout(3500);

        setTimeout(lang.hitch(this, function () {
          popup.open({
            popup: _self.actionPanel._actions.CopySelection.options.tooltipDialog,
            around: _self.actionPanel._actions.CopySelection.button,
            orient: ['below']
          });
        }), 10);
      });

      var numColumns = Object.keys(data[0]).length;
      var checkFeatureIDs = [];
      var checkGeneIDs = [];

      for (var i = 0; i < numColumns; i++) {
        // check the first 20 rows to see if this column contains gene_id, skip the first row because it may contain headers
        for (var j = 1; j < 20 && j < data.length; j++) {

          // if this cell contains a feature id
          if (String(data[j][Object.keys(data[j])[i]]).match(/^fig\|\d+.\d+/)) {
            var featureString = String(data[j][Object.keys(data[j])[i]]).replace('|', '%7C');
            var elementPos = checkFeatureIDs.map(function (x) { return x.feature; }).indexOf(featureString);
            if (elementPos === -1) {
              checkFeatureIDs.push({ columns: [Object.keys(data[j])[i]], feature: (featureString) });
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
            var elementPos = checkGeneIDs.map(function (x) { return x.geneID; }).indexOf(geneMatch[0]);
            if (elementPos === -1) {
              checkGeneIDs.push({ columns: [Object.keys(data[j])[i]], geneID: geneMatch[0] });
            }
            else {
              if (checkGeneIDs[elementPos].columns.indexOf(Object.keys(data[j])[i]) == -1) {
                checkGeneIDs[elementPos].columns.push(Object.keys(data[j])[i]);
              }
            }
          }
        }  // end for rows
      }  // end for each column

      this.featurequery = null;
      if (checkFeatureIDs.length > 0) {
        var featureList = checkFeatureIDs.map(function (item) {
          return item.feature;
        }).join(',');
        this.featurequery = '?in(patric_id,(' + featureList + '))&select(feature_id)';
      }

      this.genequery = null;
      if (checkGeneIDs.length > 0) {
        var geneIDList = checkGeneIDs.map(function (item) {
          return item.geneID;
        }).join(',');

        this.genequery = '?in(genome_id,(' + geneIDList + '))&select(genome_id)';
      }

      if (this.featurequery) {
        var getFeatureReturned = when(request.get(PathJoin(window.App.dataAPI, 'genome_feature', this.featurequery), {
          handleAs: 'json',
          headers: {
            Accept: 'application/solr+json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')

          }
        }), function (response) {
          return response;
        });
      }

      if (this.genequery) {
        var getGeneIDReturned = when(request.get(PathJoin(window.App.dataAPI, 'genome', this.genequery), {
          handleAs: 'json',
          headers: {
            Accept: 'application/solr+json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')

          }
        }), function (response) {
          return response;
        });
      }

      return when(all([!this.featurequery || getFeatureReturned, !this.genequery || getGeneIDReturned]), function (results) {
        // console.log(results);

        // move results here.  Also need to take into account that sometimes both responses are not necessary.
        if (results[0].response && results[0].response.numFound > 0) {

          var featureResponses = [];
          results[0].response.docs.forEach(function (item) {
            featureResponses.push(item.feature_id.match(/\d+\.\d+/)[0]);
          });

          var featureCounts = [];
          checkFeatureIDs.forEach(function (item) {
            var cols = item.columns;
            cols.forEach(function (colItem) {
              var elementPos = featureCounts.map(function (x) { return x.columnName; }).indexOf(colItem);
              if (elementPos === -1) {
                featureCounts.push({ columnName: colItem, featureCount: 1 });
              }
              else {
                featureCounts[elementPos]['featureCount']++;
              }
            });
          });

          featureResponses.forEach(function (item) {
            var elementPos = checkFeatureIDs.map(function (x) { return x.feature.match(/\d+\.\d+/)[0]; }).indexOf(item);
            if (elementPos > -1) {
              // get cols and find them in featureCounts, add or increment responseCount
              var cols = checkFeatureIDs[elementPos].columns;
              cols.forEach(function (colItem) {
                var countPosition = featureCounts.map(function (x) { return x.columnName; }).indexOf(colItem);
                if (featureCounts[countPosition]['responseCount']) {
                  featureCounts[countPosition]['responseCount']++;
                }
                else {
                  featureCounts[countPosition]['responseCount'] = 1;    // first time this col is counted in response
                }
              });
            }
          });

          // detection of feature(s) if over 90%
          if (featureCounts[0].responseCount / featureCounts[0].featureCount > 0.90) {

            _self.containerType = 'csvFeature';

            _self.actionPanel.addAction('ViewFeatureItem', 'MultiButton fa icon-selection-Feature fa-2x', {
              label: 'FEATURE',
              validTypes: ['*'],
              validContainerTypes: ['csvFeature'],    // csv and tsv tables only
              multiple: false,
              tooltip: 'Switch to Feature View.  Press and Hold for more options.',
              pressAndHold: function (selection, button, opts, evt) {
                var columnName = featureCounts[0].columnName;
                if (columnName in selection[0]) {
                  var sel = (selection[0][columnName]).replace('|', '%7C');
                  var query = '?eq(patric_id,' + sel + ')&select(feature_id)';
                  request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')

                    }
                  }).then(function (response) {
                    popup.open({
                      popup: new PerspectiveToolTipDialog({
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
                var sel = (selection[0][columnName]).replace('|', '%7C');
                var query = '?eq(patric_id,' + sel + ')&select(feature_id)';
                request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
                  handleAs: 'json',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                    'X-Requested-With': null,
                    Authorization: (window.App.authorizationToken || '')

                  }
                }).then(function (response) {
                  Topic.publish('/navigate', { href: '/view/Feature/' + response[0].feature_id, target: 'blank' });
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
                  Topic.publish('/navigate', { href: '/view/FeatureGroup' + encodePath(selection[0].path), target: 'blank' });
                } else {
                  var q = selection.map(function (sel) {
                    if (sel[columnName]) {
                      return (sel[columnName]).replace('|', '%7C');
                    }
                    return '';
                  });

                  // some entries in the table do not have PATRIC_ID, so they cannot be linked to the features list
                  var noEmptyFeatureIDs = q.filter(function (elem) {
                    return (elem != '');
                  });

                  q = '?in(patric_id,(' + noEmptyFeatureIDs + '))&select(feature_id)&limit(1000)';
                  request.get(PathJoin(window.App.dataAPI, 'genome_feature', q), {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')

                    }
                  }).then(function (response) {
                    var featureIDs = response.map(function (response) { return response.feature_id; }).join(',');
                    var featureList = '?in(feature_id,(' + featureIDs + '))';
                    popup.open({
                      popup: new PerspectiveToolTipDialog({
                        perspective: 'FeatureList',
                        perspectiveUrl: '/view/FeatureList/' + featureList
                      }),
                      around: button,
                      orient: ['below']
                    });
                  });
                }
              }
            }, function (selection) {
              var columnName = featureCounts[0].columnName;
              if (selection.length == 1) {
                Topic.publish('/navigate', { href: '/view/FeatureGroup' + encodePath(selection[0].path), target: 'blank' });
              } else {
                var q = selection.map(function (sel) {
                  if (sel[columnName]) {
                    return (sel[columnName]).replace('|', '%7C');
                  }
                  return '';
                });

                // some entries in the table do not have PATRIC_ID, so they cannot be linked to the features list
                var noEmptyFeatureIDs = q.filter(function (elem) {
                  return (elem != '');
                });

                q = '?in(patric_id,(' + noEmptyFeatureIDs + '))&select(feature_id)&limit(1000)';
                request.get(PathJoin(window.App.dataAPI, 'genome_feature', q), {
                  handleAs: 'json',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                    'X-Requested-With': null,
                    Authorization: (window.App.authorizationToken || '')

                  }
                }).then(function (response) {
                  var featureIDs = response.map(function (response) { return response.feature_id; }).join(',');
                  var featureList = '?in(feature_id,(' + featureIDs + '))';
                  Topic.publish('/navigate', { href: '/view/FeatureList/' + featureList, target: 'blank' });
                });
              }
            });
          }  // end FEATURE if feature count > .9
        }  // end features

        if (results[1].response && results[1].response.numFound > 0) {

          var geneIDResponses = [];
          results[1].response.docs.forEach(function (item) {
            geneIDResponses.push(item.genome_id.match(/\d+\.\d+/)[0]);
          });

          var geneIDCounts = [];
          checkGeneIDs.forEach(function (item) {
            var cols = item.columns;
            cols.forEach(function (colItem) {
              var elementPos = geneIDCounts.map(function (x) { return x.columnName; }).indexOf(colItem);
              if (elementPos === -1) {
                geneIDCounts.push({ columnName: colItem, geneIDCount: 1 });
              }
              else {
                geneIDCounts[elementPos]['geneIDCount']++;
              }
            });
          });

          geneIDResponses.forEach(function (item) {
            var elementPos = checkGeneIDs.map(function (x) { return x.geneID.match(/\d+\.\d+/)[0]; }).indexOf(item);
            if (elementPos > -1) {
              // get cols and find them in featureCounts, add or increment responseCount
              var cols = checkGeneIDs[elementPos].columns;
              cols.forEach(function (colItem) {
                var countPosition = geneIDCounts.map(function (x) { return x.columnName; }).indexOf(colItem);
                if (geneIDCounts[countPosition]['responseCount']) {
                  geneIDCounts[countPosition]['responseCount']++;
                }
                else {
                  geneIDCounts[countPosition]['responseCount'] = 1;    // first time this col is counted in response
                }
              });
            }
          });

          // detection of genome(s) if over 90%
          if (geneIDCounts[0].responseCount / geneIDCounts[0].geneIDCount > 0.90) {

            _self.containerType = 'csvFeature';

            _self.actionPanel.addAction('ViewGenomeItem', 'MultiButton fa icon-selection-Genome fa-2x', {
              label: 'GENOME',
              validTypes: ['*'],
              ignoreDataType: true,
              validContainerTypes: ['csvFeature'],    // csv and tsv tables only
              multiple: false,
              tooltip: 'Switch to Genome View.  Press and Hold for more options.',
              pressAndHold: function (selection, button, opts, evt) {
                var columnName = geneIDCounts[0].columnName;
                if (selection[0][columnName]) {
                  var sel = (selection[0][columnName]).match(/\d+\.\d+/);
                  var query = '?eq(genome_id,' + sel + ')&select(genome_id)&limit(1000)';

                  request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')

                    }
                  }).then(function (response) {
                    popup.open({
                      popup: new PerspectiveToolTipDialog({
                        perspective: 'Genome',
                        perspectiveUrl: '/view/Genome/' + response[0].genome_id
                      }),
                      around: button,
                      orient: ['below']
                    });
                  });
                }
              }

            }, function (selection) {
              var columnName = geneIDCounts[0].columnName;
              if (selection[0][columnName]) {
                var sel = (selection[0][columnName]).match(/\d+\.\d+/);
                var query = '?eq(genome_id,' + sel + ')&select(genome_id)&limit(1000)';

                request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
                  handleAs: 'json',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                    'X-Requested-With': null,
                    Authorization: (window.App.authorizationToken || '')

                  }
                }).then(function (response) {
                  Topic.publish('/navigate', { href: '/view/Genome/' + response[0].genome_id, target: 'blank' });
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
                  Topic.publish('/navigate', { href: '/view/GenomeList' + encodePath(selection[0].path), target: 'blank' });
                } else {
                  var q = selection.map(function (sel) {
                    if (sel[columnName]) {
                      return (selection[0][columnName]).match(/\d+\.\d+/);
                    }
                    return '';
                  });

                  // some entries in the table do not have PATRIC_ID, so they cannot be linked to the features list
                  var noEmptyFeatureIDs = q.filter(function (elem) {
                    return (elem != '');
                  });

                  q = '?in(genome_id,(' + noEmptyFeatureIDs + '))&select(genome_id)&limit(1000)';
                  request.get(PathJoin(window.App.dataAPI, 'genome_feature', q), {
                    handleAs: 'json',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                      'X-Requested-With': null,
                      Authorization: (window.App.authorizationToken || '')

                    }
                  }).then(function (response) {
                    var featureIDs = response.map(function (response) { return response.genome_id; }).join(',');
                    var featureList = '?in(genome_id,(' + featureIDs + '))';
                    popup.open({
                      popup: new PerspectiveToolTipDialog({
                        perspective: 'GenomeList',
                        perspectiveUrl: '/view/GenomeList/' + featureList
                      }),
                      around: button,
                      orient: ['below']
                    });
                  });
                }
              }
            }, function (selection) {
              var columnName = geneIDCounts[0].columnName;
              if (selection.length == 1) {
                Topic.publish('/navigate', { href: '/view/GenomeList' + encodePath(selection[0].path), target: 'blank' });
              } else {
                var q = selection.map(function (sel) {
                  if (sel[columnName]) {
                    return (selection[0][columnName]).match(/\d+\.\d+/);

                  }
                  return '';
                });

                // some entries in the table do not have PATRIC_ID, so they cannot be linked to the features list
                var noEmptyFeatureIDs = q.filter(function (elem) {
                  return (elem != '');
                });

                q = '?in(genome_id,(' + noEmptyFeatureIDs + '))&select(genome_id)&limit(1000)';
                request.get(PathJoin(window.App.dataAPI, 'genome_feature', q), {
                  handleAs: 'json',
                  headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
                    'X-Requested-With': null,
                    Authorization: (window.App.authorizationToken || '')

                  }
                }).then(function (response) {
                  var featureIDs = response.map(function (response) { return response.genome_id; }).join(',');
                  var featureList = '?in(genome_id,(' + featureIDs + '))';
                  Topic.publish('/navigate', { href: '/view/GenomeList/' + featureList, target: 'blank' });
                });
              }
            });
          }  // end if genome counts greater than .90
        }

        // update the action panel for display
        Topic.publish('changeActionPanel', _self.actionPanel);

        // if a row was selected before the queries finished, retrigger the selection event
        if (_self.tsvGC.grid.rowIsSelected) {
          _self.tsvGC.grid.triggerSelectionEvent();
        }
      });
    },

    formatFileMetaData: function (showMetaDataRows) {
      var fileMeta = this.file.metadata;
      if (this.file && fileMeta) {
        var content = '<div><h3 class="section-title-plain close2x pull-left"><b>' + fileMeta.type + ' file</b>: ' + fileMeta.name + '</h3>';

        if (!WS.forbiddenDownloadTypes.includes(fileMeta.type)) {
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

          if (this.file.data || (!this.preload && this.url)) {

            // store
            this.tsvCsvStore = new TsvCsvStore({
              type: 'separatedValues',
              topicId: 'TsvCsv',
              userDefinedColumnHeaders: this.userDefinedColumnHeaders
            });

            this.viewer.set('content', '');

            // gridContainer
            this.tsvGC = new TSV_CSV_GridContainer({
              title: 'TSV View',
              id: this.viewer.id + '_tsv',
              disable: false,
              store: this.tsvCsvStore
            });

            this.tsvGC.set('state', { dataType: this.file.metadata.type, dataFile: this.file.metadata.name, data: this.file.data });
            this.createFilterPanel();
            this._filterCreated = true;

            // check for feature/genome columns
            this.checkForGenomeIDs(this.tsvCsvStore.data);

            this.viewer.set('content', this.tsvGC);
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
