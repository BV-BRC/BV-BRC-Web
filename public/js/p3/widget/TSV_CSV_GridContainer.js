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
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
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

            on(downloadTT.domNode, 'div:click', function (evt) {
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
      ]
    ]),
  });

});

