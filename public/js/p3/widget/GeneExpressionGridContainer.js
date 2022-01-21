define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/popup', 'dijit/TooltipDialog',
  './GeneExpressionGrid', './AdvancedSearchFields', './GridContainer',
  '../util/PathJoin'

], function (
  declare, lang, on, Topic, domConstruct,
  popup, TooltipDialog,
  GeneExpressionGrid, AdvancedSearchFields, GridContainer,
  PathJoin
) {

  const dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  const downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  // on(downloadTT.domNode, 'div:click', function (evt) {
  //   var rel = evt.target.attributes.rel.value;
  //   var self = this;

  //   // var selection = self.actionPanel.get('selection');
  //   var dataType = (self.actionPanel.currentContainerWidget.containerType == 'genome_group') ? 'genome' : 'genome_feature';
  //   var currentQuery = self.actionPanel.currentContainerWidget.get('query');

  //   window.open('/api/' + dataType + '/' + currentQuery + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken) + '&http_accept=' + rel + '&http_download');
  //   popup.close(downloadTT);
  // });

  var tgState = {
    keyword: '',
    upFold: 0,
    downFold: 0,
    upZscore: 0,
    downZscore: 0
  };
  return declare([GridContainer], {
    gridCtor: GeneExpressionGrid,
    containerType: 'gene_expression_data',
    facetFields: [],
    tgState: tgState,
    enableFilterPanel: false,
    tutorialLink: 'user_guides/organisms_gene/transcriptomics.html',
    constructor: function () {
      var self = this;
      Topic.subscribe('GeneExpression', lang.hitch(self, function () {
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            self.tgState = value;
            break;
          default:
            break;
        }
      }));
    },
    buildQuery: function () {
      // prevent further filtering. DO NOT DELETE
    },
    _setQueryAttr: function (query) {
      // block default query handler for now.
    },
    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state) {
        return;
      }
      var self = this;
      // console.log("GeneExpressionGridContainer _setStateAttr: state", state);
      // console.log("GeneExpressionGridContainer _setStateAttr: this.state", this.state);
      if (this.grid) {
        console.log('   call set state on this.grid: ', this.grid);
        this.grid.set('state', state);
      } else {
        console.log('No Grid Yet (GeneExpressionGridContainer), this is ', self);
      }

      this._set('state', state);
      // console.log("GeneExpressionGridContainer this._set: ", this.state);
      // console.log("set state (GeneExpressionGridContainer), this= ", self);
      // console.log("set state (GeneExpressionGridContainer), self.grid= ", self.grid);
    },

    startup: function () {
      // console.log("GeneExpressionGridContainer startup()");
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      this._set('state', this.get('state'));
      // console.log("GeneExpressionGridContainer startup(), arguments, state", arguments, this.get("state"));
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
        true
      ]
    ])
  });
});
