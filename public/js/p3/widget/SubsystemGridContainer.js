define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog',
  './SubsystemGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin'

], function (
  declare, on, domConstruct,
  popup, TooltipDialog,
  SubsystemGrid, AdvancedSearchFields, GridContainer,
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
    gridCtor: SubsystemGrid,
    containerType: 'subsystemTab_data',
    tutorialLink: 'quick_references/organisms_taxon/subsystems_tab.html',
    facetFields: AdvancedSearchFields['subsystem'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['subsystem'].filter((ff) => ff.search),
    filter: '',
    dataModel: 'subsystem',
    primaryKey: 'id',
    defaultFilter: '',
    tooltip: 'The “Subsystems” tab shows the list of subsystems assignments for the genomes associated with the current view.',
    getFilterPanel: function (opts) {

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
          const _self = this;

          const totalRows = _self.grid.totalRows;
          const dataType = _self.dataModel
          const primaryKey = _self.primaryKey
          const currentQuery = _self.grid.get('query')
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
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true,
        'left'
      ]
    ])
  });
});
