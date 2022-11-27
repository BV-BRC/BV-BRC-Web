define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/on', 'dojo/topic',
  'dijit/TooltipDialog', 'dijit/popup', 'dijit/Dialog',
  './GridContainer', './AMRPanelGrid', './PerspectiveToolTip', './SelectionToGroup',
  '../util/PathJoin', './AdvancedSearchFields',
], function (
  declare, lang,
  domConstruct, on, Topic,
  TooltipDialog, popup, Dialog,
  GridContainer, Grid, PerspectiveToolTipDialog, SelectionToGroup,
  PathJoin, AdvancedSearchFields
) {

  const dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  const downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    containerType: 'genome_amr_data',
    tutorialLink: 'quick_references/organisms_taxon/amr_phenotypes.html',
    tooltip: 'The “AMR Phenotype” lists antimicrobial resistant phenotypes for genomes, inferred using computational and laboratory methods.',
    facetFields: AdvancedSearchFields['genome_amr'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['genome_amr'].filter((ff) => ff.search),
    dataModel: 'genome_amr',
    primaryKey: 'id',
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
        'ViewGenomeItem',
        'MultiButton fa icon-selection-Genome fa-2x',
        {
          label: 'GENOME',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Genome View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['genome_amr_data'],
          pressAndHold: function (selection, button, opts, evt) {
            popup.open({
              popup: new PerspectiveToolTipDialog({ perspectiveUrl: '/view/Genome/' + selection[0].genome_id }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          var sel = selection[0];

          Topic.publish('/navigate', { href: '/view/Genome/' + sel.genome_id, target: 'blank' });
        },
        false
      ],
      [
        'ViewAntibioticItem',
        'fa icon-selection-Antibiotic fa-2x',
        {
          label: 'ANTIBIOTIC',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Antibiotic View',
          ignoreDataType: true,
          validContainerTypes: ['genome_amr_data']
        },
        function (selection) {
          var sel = selection[0];
          var query = '?eq(antibiotic_name,' + encodeURIComponent(sel.antibiotic) + ')';

          Topic.publish('/navigate', { href: '/view/Antibiotic/' + query, target: 'blank' });
        },
        false
      ],
      [
        'AddGroup',
        'fa icon-object-group fa-2x',
        {
          label: 'GROUP',
          ignoreDataType: true,
          multiple: true,
          validTypes: ['*'],
          requireAuth: true,
          max: 10000,
          tooltip: 'Add selection to a new or existing group',
          validContainerTypes: ['genome_amr_data']
        },
        function (selection, containerWidget) {

          var dlg = new Dialog({ title: 'Add selected items to group' });
          var type = 'genome_group';

          var stg = new SelectionToGroup({
            selection: selection,
            type: type,
            path: ''
          });
          on(dlg.domNode, 'dialogAction', function (evt) {
            dlg.hide();
            setTimeout(function () {
              dlg.destroy();
            }, 2000);
          });
          domConstruct.place(stg.domNode, dlg.containerNode, 'first');
          stg.startup();
          dlg.startup();
          dlg.show();
        },
        false
      ]
    ]),
    gridCtor: Grid
  });
});
