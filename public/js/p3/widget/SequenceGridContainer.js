define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/dom-construct', 'dojo/topic',
  'dijit/popup', 'dijit/TooltipDialog',
  './SequenceGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin'

], function (
  declare, lang, on, domConstruct, Topic,
  popup, TooltipDialog,
  SequenceGrid, AdvancedSearchFields, GridContainer,
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
    gridCtor: SequenceGrid,
    containerType: 'sequence_data',
    tutorialLink: 'quick_references/organisms_taxon/sequences.html',
    facetFields: AdvancedSearchFields['genome_sequence'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['genome_sequence'].filter((ff) => ff.search),
    dataModel: 'genome_sequence',
    primaryKey: 'sequence_id',
    tooltip: 'The "Sequences" tab lists genomic sequences (e.g. chromosomes, plasmids, contigs) for genomes associated with the current view.',
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
        'GenomeBrowser',
        'fa icon-genome-browser fa-2x',
        {
          label: 'Browser',
          multiple: false,
          validTypes: ['*'],
          validContainerTypes: ['sequence_data'],
          tooltip: 'View in Genome Browser'
        },
        function (selection) {

          var target = selection[0];

          var hash = lang.replace('#view_tab=browser&loc={0}:{1}..{2}&tracks=refseqs,PATRICGenes,RefSeqGenes', [target.accession, 0, 10000]);

          Topic.publish('/navigate', {
            href: '/view/Genome/' + target.genome_id + hash
          });
        },
        false
      ]
    ])
  });
});
