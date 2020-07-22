define([
  'dojo/_base/declare', './GridContainer', 'dojo/on',
  './TSV_CSV_Grid', 'dijit/popup', 'dojo/_base/lang',
  'dijit/TooltipDialog', 'dojo/topic', 'dojo/dom-construct',
  'dijit/layout/ContentPane', 'dijit/form/Textarea'
], function (
  declare, GridContainer, on,
  TSV_CSV_Grid, popup, lang,
  TooltipDialog, Topic, domConstruct,
  ContentPane, TextArea
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActi    onTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';

  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function() {
      popup.close(downloadTT);
    }
  }); 

  return declare([GridContainer], {
    //gridCtor: tsvGrid,
    gridCtor: TSV_CSV_Grid,
    containerType: 'csvFeature',
    enableAnchorButton: true,
    maxDownloadSize: 25000,
    primaryKey: 'RowNumber',
    enableFilterPanel: false,
    visible: true,
    onSetState: function (attr, oldState, state) {
      if (!state) {
        return;
      }
      if (this.grid) {
        this.grid.set('state', state);
      }
      
    },
    setColumns: function (newColumns) {
      var gridColumns = newColumns; 
      this.grid.setColumns(gridColumns);      
    },

    containerActions: GridContainer.prototype.containerActions.concat([
    [
      'DownloadTable',
      'fa icon-download fa-2x',
      {
        label: 'DOWNLOAD',
        multiple: false,
        validTypes: ['*'],
        tooltip: 'Download Table',
        tooltipDialog: downloadTT
      },

      function () {
        var _self = this;

        var totalRows = _self.grid.totalRows;
        if (totalRows > _self.maxDownloadSize) { 
          downloadTT.set('content', 'This table exceeds the maximum download size of ' + _self.maxDownloadSize);
        } else {
          downloadTT.set('content', dfc);
        
          on(downloadTT.domNode, 'div:click', function(evt) {
            var rel = evt.target.attributes.rel.value;
            var dataType = _self.dataModel;
            var currentQuery = _self.grid.get('query');

            var query = currentQuery + '&sort(+' + _self.primaryKey + ')&limit(' + _self.maxDownloadSize + ')';

            var baseUrl = baseUrl + dataType + '/?';

            if (window.App.authorizationToken) {
              baseUrl = baseUrl + '&http_authorization' + encodeURIComponent(window.App.authorizationToken);
            }

            baseUrl = baseUrl + '&http_accept=' + rel + '&http_download=true';
            var form = domConstruct.create('form', {
              style: 'display: none;',
              id: 'downloadForm',
              enctype: 'application/x-www-form-urlencoded',
              name: 'downloadForm',
              method: 'post',
              action: baseUrl
            }, _self.domNode);
            domConstruct.create('input', {
              type: 'hidden',
              value: encodeURIComponent(query),
              name: 'rq1'
            }, form);
            form.submit();

            popup.close(downloadTT);
          });
        }

        popup.open({
          popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
          around: this.containerActionBar._actions.DownloadTable.button,
          orient: ['below']
        });
      },
      true,
      'left'
    ],


  ]),

  selectionActions: GridContainer.prototype.selectionActions.concat([
    [
      'ViewFeatureItem', 
      'MultiButton fa icon-selection-Feature fa-2x', {
      
      label: 'FEATURE',
      validTypes: ['*'],
      validContainerTypes: ['csvFeature'],    // csv and tsv tables only
      multiple: false,
      //tooltip: 'Switch to Feature View.  Press and Hold for more options.',
      tooltip: 'Switch to Feature View.',
      pressAndHold: function(selection, button, opts, evt) {
        if (selection[0].Gene_ID) {
          var sel = (selection[0].Gene_ID).replace("|", "%7C");      // if the table has Gene_ID, this should work.
          var query = '?eq(patric_id,' + sel + ')&select(feature_id)';

          when(request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
            handleAs: 'json',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
              'X-Requested-With': null,
              Authorization: (window.App.authorizationToken || '')
            
            }
          }), function(response){
            popup.open ({
              popup: new PerspectiveToolTipDialog ({
                perspective: 'Feature',
                perspectiveUrl: '/view/Feature/' + response[0].feature_id
              }),
              around: button,
              orient: ['below']
            });
            //Topic.publish('/navigate', { href: '/view/Feature/' + response[0].feature_id })
          }); 
        }
      },
    
    }, function (selection) {
      if (selection[0].Gene_ID) {
        var sel = (selection[0].Gene_ID).replace("|", "%7C");      // if the table has Gene_ID, this should work.
        var query = '?eq(patric_id,' + sel + ')&select(feature_id)';

        when(request.get(PathJoin(window.App.dataAPI, 'genome_feature', query), {
          handleAs: 'json',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
            'X-Requested-With': null,
            Authorization: (window.App.authorizationToken || '')
          
          }
        }), function(response){
          Topic.publish('/navigate', { href: '/view/Feature/' + response[0].feature_id })
        }); 
      } 
    }
    ],
  ])
  //gridCTor: tsvGrid  
  });

});

