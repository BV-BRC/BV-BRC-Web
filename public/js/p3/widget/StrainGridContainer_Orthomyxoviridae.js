define([
  'dojo/_base/declare', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/popup', 'dijit/Dialog', 'dijit/TooltipDialog',
  './StrainGrid_Orthomyxoviridae', './AdvancedSearchFields', './GridContainer',
  './PerspectiveToolTip', './SelectionToGroup',
  '../util/PathJoin'

], function (
  declare, on, Topic, domConstruct,
  popup, Dialog, TooltipDialog,
  StrainGrid_Orthomyxoviridae, AdvancedSearchFields, GridContainer,
  PerspectiveToolTipDialog, SelectionToGroup,
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
    gridCtor: StrainGrid_Orthomyxoviridae,
    containerType: 'strain_data',
    tutorialLink: 'quick_references/organisms_taxon/strains.html',
    facetFields: AdvancedSearchFields['strain'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['strain'].filter((ff) => ff.search),
    filter: '',
    dataModel: 'strain',
    primaryKey: 'id',
    defaultFilter: '',
    tooltip: 'The “Strains” tab shows list of unique strains, corresponding genomic segments, and related metadata for multi-segment viruses.',
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
        'ViewGenomeItems',
        'MultiButton fa icon-selection-GenomeList fa-2x',
        {
          label: 'GENOMES',
          validTypes: ['*'],
          multiple: true,
          min: 1,
          max: 0,
          tooltip: 'Switch to Genome List View. Press and Hold for more options.',
          ignoreDataType: true,
          validContainerTypes: ['strain_data'],
          pressAndHold: function (selection, button, opts, evt) {
            const genome_ids = Array.from(selection.reduce((p, v) => { return p.add(v.genome_ids) }, new Set()))
            popup.open({
              popup: new PerspectiveToolTipDialog({
                perspective: 'GenomeList',
                perspectiveUrl: '/view/GenomeList/?eq(*,*)&genome(in(genome_id,(' + genome_ids.join(',') + ')))'
              }),
              around: button,
              orient: ['below']
            });
          }
        },
        function (selection) {
          const genome_ids = Array.from(selection.reduce((p, v) => { return p.add(v.genome_ids) }, new Set()))
          Topic.publish('/navigate', { href: '/view/GenomeList/?eq(*,*)&genome(in(genome_id,(' + genome_ids.join(',') + ')))' });
        },
        false
      ], [
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
          validContainerTypes: ['strain_data']
        },
        function (selection, containerWidget) {
          const dlg = new Dialog({ title: 'Add selected items to group' });
          const genome_ids = Array.from(selection.reduce((p, v) => { return p.add(v.genome_ids) }, new Set()))
          const sel = genome_ids.flat().map((genome_id) => {
            return { 'genome_id': genome_id }
          })
          if (!containerWidget) {
            return;
          }

          var stg = new SelectionToGroup({
            selection: sel,
            type: 'genome_group',
            inputType: containerWidget.containerType,
            path: containerWidget.get('path')
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
      ],
    ])
  });
});
