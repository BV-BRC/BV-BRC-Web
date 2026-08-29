define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog',
  './GenomeGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin'

], function (
  declare, lang, on, domConstruct,
  popup, TooltipDialog,
  GenomeGrid, AdvancedSearchFields, GridContainer,
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
    gridCtor: GenomeGrid,
    containerType: 'genome_data',
    tutorialLink: 'quick_references/organisms_taxon/genome_table.html',
    tooltip: 'The "Genomes" tab lists all genomes or segments associated with the current view and associated metadata',
    facetFields: AdvancedSearchFields['genome'].filter((ff) => ff.facet),
    advancedSearchFields: AdvancedSearchFields['genome'].filter((ff) => ff.search),
    getFilterPanel: function (opts) {

    },
    enableAnchorButton: true,
    dataModel: 'genome',
    primaryKey: 'genome_id',
    organismContext: null,

    setOrganismContext: function (context) {
      this.organismContext = context;
      if (this.grid) {
        this._applyOrganismContext();
      }
    },

    _applyOrganismContext: function () {
      if (!this.grid) {
        return;
      }
      var columns = this.grid.get('columns');
      if (!columns) {
        return;
      }

      if (columns.contigs) {
        columns.contigs = lang.mixin({}, columns.contigs);
        switch (this.organismContext) {
          case 'virus':
            columns.contigs.label = 'Segments';
            break;
          case 'mixed':
            columns.contigs.label = 'Contigs/Segments';
            break;
          default:
            columns.contigs.label = 'Contigs';
        }
      }

      if (this.organismContext === 'virus') {
        if (columns.contig_l50) {
          columns.contig_l50 = lang.mixin({}, columns.contig_l50, { hidden: true });
        }
        if (columns.contig_n50) {
          columns.contig_n50 = lang.mixin({}, columns.contig_n50, { hidden: true });
        }
      }

      this.grid.set('columns', columns);
    },

    onFirstView: function () {
      this.inherited(arguments);
      if (this.organismContext) {
        this._applyOrganismContext();
      }
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
          const query = `${currentQuery}&sort(${primaryKey})&limit(${totalRows})`

          on(downloadTT.domNode, 'div:click', function (evt) {
            const typeAccept = evt.target.attributes.rel.value

            const baseUrl = `${PathJoin(window.App.dataServiceURL, dataType)}/?http_accept=${typeAccept}&http_download=true`

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
            // Add authorization as form field for POST requests
            if (window.App.authorizationToken) {
              domConstruct.create('input', {
                type: 'hidden',
                value: window.App.authorizationToken,
                name: 'http_authorization'
              }, form);
            }
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
