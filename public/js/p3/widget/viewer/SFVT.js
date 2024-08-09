define([
  'dojo/_base/declare', './TabViewerBase', 'dojo/on', 'dgrid/OnDemandGrid', 'dojo/dom-construct', '../ActionBar',
  'dijit/popup', 'FileSaver', 'dijit/TooltipDialog', 'dojo/query', 'dojo/store/Memory', 'dijit/form/Button',
  '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang', 'dojo/topic', 'dijit/Dialog', 'dijit/ConfirmDialog',
  '../PageGrid', 'dojo/dom-style', 'dgrid/Grid', 'dgrid/extensions/Pagination', 'dgrid/extensions/ColumnResizer',
  '../ItemDetailPanel'
], function (
  declare, TabViewerBase, on, OnDemandGrid, domConstruct, ActionBar,
  popup, saveAs, TooltipDialog, dojoQuery, Memory, Button,
  PathJoin, xhr, lang, Topic, Dialog, ConfirmDialog,
  PageGrid, domStyle, Grid, Pagination, ColumnResizer,
  ItemDetailPanel
) {

  const dfc = '<div style="background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;">Download Table As...</div>' +
    '<div class="wsActionTooltip" rel="text/tsv">Text</div>' +
    '<div class="wsActionTooltip" rel="text/csv">CSV</div>' +
    '<div class="wsActionTooltip" rel="protein+fasta">Protein FASTA</div>';
  const downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  on(downloadTT.domNode, 'div:click', lang.hitch(function (evt) {
    const rel = evt.target.attributes.rel.value;

    if (rel === 'protein+fasta') {
      const patricIds = downloadTT.get('patricIds');

      // Retrieve feature ids
      xhr.post(PathJoin('https://www.bv-brc.org/api/', 'genome_feature'), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        data: 'in(patric_id,(' + patricIds.map(s => encodeURIComponent(s)).join(',') + '))&sort(+patric_id)&select(feature_id)&limit(100000)'
      }).then(lang.hitch(this, function (featureIds) {
        //let baseUrl = (window.App.dataServiceURL ? (window.App.dataServiceURL) : '');
        let baseUrl = 'https://alpha.bv-brc.org/api';

        if (baseUrl.charAt(-1) !== '/') {
          baseUrl += '/';
        }
        baseUrl += 'genome_feature/';
        const query = 'in(feature_id,(' + featureIds.map(f => f.feature_id).join(',') + '))&sort(+feature_id)&limit(100000)';

        baseUrl = baseUrl + '?&http_download=true&http_accept=application/protein+fasta';
        if (window.App.authorizationToken) {
          baseUrl = baseUrl + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken);
        }

        let form = domConstruct.create('form', {
          style: 'display: none;',
          id: 'downloadForm',
          enctype: 'application/x-www-form-urlencoded',
          name: 'downloadForm',
          method: 'post',
          action: baseUrl
        }, dojoQuery('body')[0]);
        domConstruct.create('input', {type: 'hidden', value: encodeURIComponent(query), name: 'rql'}, form);
        form.submit();
      }));
    } else {
      const data = downloadTT.get('data');
      const headers = downloadTT.get('headers');
      const sfId = downloadTT.get('sfId');

      let delimiter, ext;
      if (rel === 'text/csv') {
        delimiter = ',';
        ext = 'csv';
      } else {
        delimiter = '\t';
        ext = 'txt';
      }

      const content = data.map(function (d) {
        return d.join(delimiter);
      });

      saveAs(new Blob([headers.join(delimiter) + '\n' + content.join('\n')], {type: rel}), `sfvt_${sfId.replace(/ /g, '_')}.${ext}`);
    }

    popup.close(downloadTT);
  }));

  // Helper function to create table rows
  function createRow(parent, col1Text, col2Text) {
    let row = domConstruct.create('tr', null, parent);
    domConstruct.create('td', {innerHTML: '<b>' + col1Text + '</b>'}, row);
    domConstruct.create('td', {innerHTML: col2Text}, row);
    return row;
  }

  return declare([TabViewerBase], {
    baseClass: 'SFVT',
    disabled: false,
    containerType: 'sequence_feature_data',
    sf_id: null,
    grid: null,
    findDialog: null,
    referenceCoordinates: {},
    apiServiceUrl: window.App.dataAPI,
    perspectiveLabel: 'Sequence Feature Variant Types',
    perspectiveIconClass: 'icon-alignment-green',
    overlayNode: null,
    // defaultTab: "Overview",

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this.onSetState('state', '', this.state);

      let self = this;

      this.itemDetailPanel = new ItemDetailPanel({
        region: 'right',
        style: 'width:300px',
        splitter: true,
        layoutPriority: 1,
        containerWidget: this
      });
      this.addChild(this.itemDetailPanel);
      this.itemDetailPanel.startup();

      this.actionPanel = new ActionBar({
        splitter: false,
        region: 'right',
        layoutPriority: 2,
        style: 'width: 57px; text-align: center;'
      });

      this.actionPanel.addAction('DownloadTable', 'fa icon-download fa-2x', {
        label: 'DWNLD',
        persistent: true,
        validTypes: ['*'],
        tooltip: 'Download Selection',
        tooltipDialog: downloadTT
      }, function (selection) {
        popup.open({
          popup: self.actionPanel._actions.DownloadTable.options.tooltipDialog,
          around: self.actionPanel._actions.DownloadTable.button,
          orient: ['below']
        });
      }, true);

      /*this.actionPanel.addAction('ViewNwkXml', 'fa icon-tree2 fa-2x', {
        label: 'VIEW',
        persistent: true,
        validTypes: ['*'],
        tooltip: 'View Archaeopteryx Tree'
      }, function (selection) {
      }, true);*/

      this.actionPanel.addAction('FindVT', 'fa icon-search fa-2x', {
        label: 'FIND',
        persistent: true,
        validTypes: ['*'],
        tooltip: 'Find a VT(s)'
      }, function (selection) {
        self.findDialog.show();
      }, true);

      this.addChild(this.actionPanel);
    },

    _setStateAttr: function (state) {
      this.state = this.state || {};
      const parts = state.pathname.split('/');
      const decodedPart = decodeURIComponent(parts[parts.length - 1]);
      this.set('sf_id', decodedPart);
      state.sf_id = decodedPart;
      this.sf_id = state.sf_id;

      this._set('state', state);
    },

    onSetState: function (attr, oldVal, state) {
      // console.log("GenomeList onSetState()  OLD: ", oldVal, " NEW: ", state);

      var parts = state.pathname.split('/');
      const decodedPart = decodeURIComponent(parts[parts.length - 1]);
      this.set('sf_id', decodedPart);
      state.sf_id = decodedPart;
      if (!state) {
        return;
      }

      if (state.hashParams && state.hashParams.view_tab) {
        // console.log("state.hashParams.view_tab=", state.hashParams.view_tab);

        if (this[state.hashParams.view_tab]) {
          var vt = this[state.hashParams.view_tab];
          vt.set('visible', true);
          this.viewer.selectChild(vt);
        } else {
          console.log('No view-tab supplied in State Object');
        }
      }
    },

    // Helper function to convert filter patterns with wildcards to regex
    wildcardToRegex: function (pattern) {
      // Escape special characters, then replace '*' with '.*' to create the regex pattern
      const escapedPattern = pattern.replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&');
      const regexPattern = escapedPattern.replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`);
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);
      let self = this;
      this.overlayNode = domConstruct.create('div', {
        style: 'display: none; position: absolute; background: rgba( 26, 26, 26, 0.7 ); width: 100%; height: 100%; z-index: 5;'
      }, this.viewer.containerNode);
      let loadingIconDiv = domConstruct.create('div', {
        style: 'top: 35%;left: 35%;position: fixed;height: 100%;width: 100%;z-index: 1001;background: url("//ajax.googleapis.com/ajax/libs/dojo/1.10.4/dijit/themes/claro/images/loadingAnimation.gif") 10px 23px no-repeat transparent;'
      }, this.overlayNode);
      domConstruct.create('div', {
        style: 'padding: 25px 40px; color: white;',
        innerHTML: 'Loading genome info...'
      }, loadingIconDiv);


      const sfvtQuery = '?eq(sf_id,"' + this.sf_id + '")&limit(1000000)';
      xhr.get(PathJoin(this.apiServiceUrl, 'sequence_feature_vt', sfvtQuery), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (variantTypes) {
        if (variantTypes && variantTypes.length == 0) {
          this.totalCountNode.innerHTML = `No variant types calculated for ${this.sf_id}`;
          return;
        }

        // Update subtitle text for VT
        this.totalCountNode.innerHTML = `${variantTypes.length} variant types calculated for ${this.sf_id}`;

        // Sort variant types based on sfvt_id (VT-*) to represent in the table
        variantTypes.sort((a, b) => {
          return a.sfvt_id.localeCompare(b.sfvt_id, undefined, {numeric: true});
        });

        // Retrieve SF coordinates
        const sfQuery = '?eq(sf_id,"' + this.sf_id + '")&limit(1)';
        xhr.get(PathJoin(this.apiServiceUrl, 'sequence_feature', sfQuery), {
          headers: {
            accept: 'application/json',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          },
          handleAs: 'json'
        }).then(lang.hitch(this, function (sf) {
          this.itemDetailPanel.set('selection', sf);

          const segments = sf[0].segments;
          const coordinates = segments[0].split(',');

          let node = domConstruct.create('div', {style: 'height: 75%; margin: 20px;'}, this.viewer.containerNode);

          // Create table header
          let columns = [{
            label: 'Protein Count',
            field: 'st',
            width: '100',
            resizable: false,
            renderCell: function (object, value, node) {
              const ids = variantTypes.find(v => v.sfvt_id === object.vt).sfvt_genome_ids;

              let anchor = domConstruct.create("a");
              anchor.innerHTML = value;
              let patricIds = [];
              let proteinIds = [];
              for (let id of ids) {
                if (id.startsWith('fig|')) {
                  patricIds.push(encodeURIComponent(id));
                } else {
                  proteinIds.push(encodeURIComponent(id));
                }
              }
              let featureParams = '';
              if (patricIds.length > 0 && proteinIds.length > 0) {
                featureParams = 'or(in(patric_id,(' + patricIds.join(',') + ')),in(protein_id,(' + proteinIds.join(',') + ')))';
              } else if (patricIds.length > 0) {
                featureParams = 'in(patric_id,(' + patricIds.join(',') + '))';
              } else if (proteinIds.length > 0) {
                featureParams = 'in(protein_id,(' + proteinIds.join(',') + '))';
              }
              anchor.onclick = function () {
                Topic.publish('/navigate', {
                  href: '/view/FeatureList/?' + featureParams
                });
              };
              return anchor;
            }
          }, {
            label: 'Variant Type',
            field: 'vt',
            width: '100'
          }];

          let findDialogContent = '<div style="overflow-x: auto"><div class="dgrid dgrid-grid ui-widget" style="border: none; height: 0;min-height: 70px;">' +
            '<div class="dgrid-header dgrid-header-row ui-widget-header" style="overflow-x: auto;">' +
            '<table class="dgrid-row-table" style="max-width: 100%;"><thead><tr>';
          let findDialogTableInput = '';
          coordinates.forEach((coordinate) => {
            const startEnd = coordinate.split('-');
            if (startEnd.length > 1) {
              let start = parseInt(startEnd[0]);
              const end = parseInt(startEnd[1]);
              while (start <= end) {
                columns.push({
                  label: start,
                  field: start,
                  formatter: function (value) {
                    return value;
                  },
                  width: 40
                });

                findDialogContent += `<th class="dgrid-cell dgrid-cell-padding" style="width: 40px;">${start}</th>`;
                findDialogTableInput += `<td class="dgrid-cell dgrid-cell-padding"><input class="filterSelection" id="field-${start}" value="{{field-${start++}-data}}" style="width: 25px; text-align: center;"/></td>`;
              }
            } else {
              columns.push({
                label: startEnd[0],
                field: startEnd[0],
                formatter: function (value) {
                  return value;
                },
                width: 40
              });

              findDialogContent += `<th class="dgrid-cell dgrid-cell-padding" style="width: 40px;">${startEnd[0]}</th>`;
              findDialogTableInput += `<td class="dgrid-cell dgrid-cell-padding"><input class="filterSelection" id="field-${startEnd[0]}" value="{{field-${startEnd[0]}-data}}" style="width: 25px; text-align: center;"/></td>`;
            }
          });
          columns.push({
            label: 'Total Variations',
            field: 'tv',
            width: 105
          });
          findDialogContent += `</thead><tbody><tr style="background-color: #fff;">${findDialogTableInput}</tr></tbody></table></div></div></div>`;

          let data = [];
          let content = [];
          let patricIds = [];
          const refSequence = variantTypes[0].sfvt_sequence; // Keep VT-1 sequence for comparison
          for (const [index, variantType] of variantTypes.entries()) {
            let seqData = {
              st: variantType.sfvt_genome_count,
              vt: variantType.sfvt_id,
              tv: variantType.sfvt_variations
            };
            let contentData = [
              variantType.sfvt_genome_count,
              variantType.sfvt_id,
            ];

            let sequence = variantType.sfvt_sequence;

            //Check if there is any insertion
            let insertion = ''
            const insertionStart = sequence.indexOf('[');
            if (insertionStart !== -1) {
              const insertionEnd = sequence.indexOf(']') + 1;
              insertion = sequence.slice(insertionStart, insertionEnd);
              sequence = sequence.slice(0, insertionStart) + sequence.slice(insertionEnd);
            }

            let vtValue = '';
            for (let i = 0; i < sequence.length; i++) {
              let contentValue = '';
              const coordinateField = columns[i + 2].field;

              if (index == 0) {
                vtValue = sequence[i];
                contentValue = sequence[i];
                this.referenceCoordinates[coordinateField] = vtValue;
                findDialogContent = findDialogContent.replace(`{{field-${coordinateField}-data}}`, vtValue);
              } else if (variantType.sfvt_id === 'VT-unknown') {
                vtValue = '?';
                contentValue = '?';
              } else {
                if (sequence[i] === refSequence[i]) {
                  vtValue = '<i class="fa icon-circle" style="font-size: 4px; pointer-events: none;"></i>';
                  contentValue = '.';
                } else {
                  vtValue = sequence[i] === '-' ? '<p style="font-weight: bold; color: red;">-</p>' : sequence[i];
                  contentValue = sequence[i];
                }

                // Insert to the previous base
                if (insertionStart - 1 === i) {
                  vtValue += insertion;
                  contentValue += insertion;
                }
              }

              seqData[coordinateField] = vtValue;
              contentData.push(contentValue);
            }

            contentData.push(variantType.sfvt_variations);

            data.push(seqData);
            content.push(contentData);
            if (variantType.sfvt_id !== 'VT-unknown') {
              for (const id of variantType.sfvt_genome_ids) {
                patricIds.push(id);
              }
            }
          }
          let store = new Memory({data: data});
          this.grid = new (declare([Grid, Pagination, ColumnResizer]))({
            store: store,
            columns: columns,
            pagingLinks: 1,
            pagingTextBox: true,
            firstLastArrows: true,
            rowsPerPage: 25,
            loadingMessage: 'Loading SFVT data...',
            pageSizeOptions: [25, 50, 100, 200]
          }, node);
          this.grid.startup();
          this.grid.addCssRule('.dgrid-cell', 'text-align: center;');
          dojoQuery('.dgrid-page-size').style('margin', '8px 5px 0 4px');

          // Set find dialog content
          this.findDialog = new ConfirmDialog({
            title: 'Search for the VTs',
            style: 'width: 85%;',
            content: findDialogContent
          });

          // change find dialog button labels
          this.findDialog.set('buttonOk', 'Search');
          this.findDialog.set('buttonCancel', 'Done');

          new Button({
            label: 'Reset',
            onClick: function () {
              self.grid.setQuery({});

              for (const coordinate in self.referenceCoordinates) {
                dojoQuery(`#field-${coordinate}`)[0].value = self.referenceCoordinates[coordinate];
              }
            }
          }).placeAt(this.findDialog.actionBarNode, 2);

          // register filter event
          this.findDialog.on('execute', function () {
            const filterSelection = dojoQuery('.filterSelection');
            let filter = {};
            for (let selection of filterSelection) {
              const val = selection.value;
              if (val) {
                const id = selection.id.replace('field-', '');
                filter[id] = val;
              }
            }

            if (Object.keys(filter).length > 0) {
              self.grid.setQuery(function (element) {
                // Always display VT-1/reference VT
                if (element.vt === 'VT-1') {
                  return true;
                }

                for (const column in filter) {
                  const referenceValue = self.referenceCoordinates[column];

                  const filterValue = filter[column].trim().toUpperCase().replace('.', referenceValue);
                  const elementValue = element[column]
                    .replace('<i class="fa icon-circle" style="font-size: 4px; pointer-events: none;"></i>', referenceValue)
                    .replace('<p style="font-weight: bold; color: red;">-</p>', '-');

                  // Pass all elements if filterValue is '*'
                  if (filterValue === '*') {
                    continue;
                  }

                  // Handle special case where filterValue has wildcards inside square brackets
                  if (filterValue.includes('[') && filterValue.includes(']')) {
                    const pattern = self.wildcardToRegex(filterValue);
                    if (!pattern.test(elementValue)) {
                      return false;
                    }
                  }
                  // '?' is a wild card so yes for all VTs
                  // AA should match with filter value
                  // Search for . if filter value matches with ref seq AA
                  else if (filterValue !== '?' && elementValue !== filterValue) {
                    return false;
                  }
                }
                return true;
              });
            } else {
              self.grid.setQuery({});
            }
          });

          // Set info for download
          downloadTT.set('sfId', this.sf_id);
          downloadTT.set('data', content);
          downloadTT.set('headers', columns.map(c => c.label));
          downloadTT.set('patricIds', patricIds);

          // Create information table
          let informationDiv = domConstruct.create('div', {style: 'margin: 10px 20px;'}, this.viewer.containerNode);
          let table = domConstruct.create('table', {border: '1', style: 'width: auto;'}, informationDiv);
          let tbody = domConstruct.create('tbody', null, table);

          // Create rows and cells
          createRow(tbody, '"?":', 'Indicates the sequence is unknown');
          createRow(tbody, '"<font color="red">-</font>":', 'Indicates a deletion (gap) relative to the VT-1 sequence');
          createRow(tbody, '".":', 'Indicates the same amino acid as the VT-1 sequence');
          createRow(tbody, '"[ ]":', 'Indicates an insertion relative to the VT-1 sequence');
          createRow(tbody, '"X":', 'Indicates any amino acid');
        }));
      }));
    }
  });
});
