define([
  'dojo/_base/declare', './GridContainer', 'dojo/on',
  './CorrelatedGenesGrid', 'dijit/popup', 'dojo/topic',
  'dijit/TooltipDialog', './FacetFilterPanel', './CorrelatedGenesActionBar',
  'dojo/_base/lang'

], function (
  declare, GridContainer, on,
  CorrelatedGenesGrid, popup, Topic,
  TooltipDialog, FacetFilterPanel, ContainerActionBar,
  lang
) {

  var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div><hr><div class="wsActionTooltip" rel="dna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloaddna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloadprotein"> ';
  var viewFASTATT = new TooltipDialog({
    content: vfc,
    onMouseLeave: function () {
      popup.close(viewFASTATT);
    }
  });

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  on(downloadTT.domNode, 'div:click', function (evt) {
    var rel = evt.target.attributes.rel.value;
    console.log('REL: ', rel);
    var selection = self.actionPanel.get('selection');
    var dataType = (self.actionPanel.currentContainerWidget.containerType == 'genome_group') ? 'genome' : 'genome_feature';
    var currentQuery = self.actionPanel.currentContainerWidget.get('query');
    console.log('selection: ', selection);
    console.log('DownloadQuery: ', dataType, currentQuery);
    window.open('/api/' + dataType + '/' + currentQuery + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken) + '&http_accept=' + rel + '&http_download');
    popup.close(downloadTT);
  });

  return declare([GridContainer], {
    gridCtor: CorrelatedGenesGrid,
    containerType: 'feature_data',
    tutorialLink: '/quick_references/organisms_gene/correlated_genes.html',
    enableFilterPanel: true,
    apiServer: window.App.dataServiceURL,

    createFilterPanel: function () {
      this.containerActionBar = this.filterPanel = new ContainerActionBar({
        region: 'top',
        layoutPriority: 7,
        splitter: false,
        className: 'BrowserHeader',
        dataModel: this.dataModel,
        state: this.state,
        enableAnchorButton: this.enableAnchorButton,
        currentContainerWidget: this
      });
    },
    _setQueryAttr: function (query) {
      // override _setQueryAttr since we're going to build query inside PathwayMemoryStore
    },

    buildQuery: function () {
      return '';
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
        function (selection) {
          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true
      ]
    ]),

    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state) {
        return;
      }
      // console.log("CorrelatedGenesGridContainer _setStateAttr: ", state.feature_id);
      if (this.grid) {
        // console.log("   call set state on this.grid: ", this.grid);
        this.grid.set('state', state);
      } else {
        console.log('No Grid Yet (CorrelatedGenesGridContainer)');
      }

      this._set('state', state);
    }
  });
});
