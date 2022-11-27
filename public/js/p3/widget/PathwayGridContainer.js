define([
  'dojo/_base/declare', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog',
  './PathwayGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin'

], function (
  declare, on, Topic, domConstruct,
  popup, TooltipDialog,
  PathwayGrid, AdvancedSearchFields, GridContainer,
  PathJoin
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    gridCtor: PathwayGrid,
    containerType: 'pathwayTab_data',
    tutorialLink: 'quick_references/organisms_taxon/pathways.html',
    facetFields: AdvancedSearchFields['pathway'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['pathway'].filter((ff) => ff.search),
    filter: '',
    dataModel: 'pathway',
    primaryKey: 'id',
    defaultFilter: '',
    tooltip: 'The “Pathways” tab shows the list of metabolic pathways annotated for the genomes associated with the current view.',
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
    ]),
    selectionActions: GridContainer.prototype.selectionActions.concat([
      [
        'ViewPathwayMap',
        'fa icon-map-o fa-2x',
        {
          label: 'Map',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'View PathwayMap',
          validContainerTypes: ['pathwayTab_data']
        },
        function (selection) {
          var url = { annotation: 'PATRIC' };
          url.genome_id = selection[0].genome_id;
          url.pathway_id = selection[0].pathway_id;
          url.feature_id = selection[0].feature_id;

          var params = Object.keys(url).map(function (p) {
            return p + '=' + url[p];
          }).join('&');
          // console.log(params);
          Topic.publish('/navigate', { href: '/view/PathwayMap/?' + params, target: 'blank' });
        },
        false
      ]
    ]),
  });
});
