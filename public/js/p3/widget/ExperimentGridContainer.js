define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog',
  './ExperimentGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin'

], function (
  declare, on, domConstruct,
  popup, TooltipDialog,
  ExperimentGrid, AdvancedSearchFields, GridContainer,
  PathJoin
) {

  const dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  const downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    gridCtor: ExperimentGrid,
    containerType: 'experiment_data',
    tutorialLink: 'quick_references/organisms_taxon/experiments_comparisons_tables.html',
    facetFields: AdvancedSearchFields['experiment'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['experiment'].filter((ff) => ff.search),
    dataModel: 'experiment',
    getFilterPanel: function (opts) {
    },
    primaryKey: 'exp_id',
    query: '&keyword(*)',
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
          const _self = this;

          let grid, dataType, primaryKey;
          if (_self.tabContainer.selectedChildWidget.title == 'Experiments') {
            grid = _self.experimentsGrid;
            dataType = 'experiment';
            primaryKey = '+exp_id';
          } else {
            grid = _self.biosetGrid;
            dataType = 'bioset';
            primaryKey = '+bioset_id';
          }

          if (!grid) {
            console.log('Grid Not Defined');
            return;
          }

          const totalRows = grid.totalRows;
          const currentQuery = `in(exp_id,(${_self.eids.join(',')}))`;
          const authToken = (window.App.authorizationToken) ? `&http_authorization=${encodeURIComponent(window.App.authorizationToken)}` : ''
          const query = `${currentQuery}&sort(${primaryKey})&limit(${totalRows})`

          on(downloadTT.domNode, 'div:click', function (evt) {
            const typeAccept = evt.target.attributes.rel.value

            const baseUrl = `${PathJoin(window.App.dataServiceURL, dataType)}/?${authToken}&http_accept=${typeAccept}&http_download=true`

            const form = domConstruct.create('form', {
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
              name: 'rql'
            }, form);
            form.submit();

            popup.close(downloadTT);
          });


          popup.open({
            popup: this.filterPanel._actions.DownloadTable.options.tooltipDialog,
            around: this.filterPanel._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true
      ]
    ])
  });
});
