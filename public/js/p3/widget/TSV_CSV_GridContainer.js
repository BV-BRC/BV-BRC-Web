define([
  'dojo/_base/declare', './GridContainer', 'dojo/on',
  './TSV_CSV_Grid', 'dijit/popup',
  'dijit/TooltipDialog', 'dojo/dom-construct'
], function (
  declare, GridContainer, on,
  TSV_CSV_Grid, popup,
  TooltipDialog, domConstruct
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
    ])
  });

});

