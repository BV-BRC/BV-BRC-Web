define([
  'dojo/_base/declare', './GridContainer',
  './AntibioticGrid', 'dijit/popup',
  'dijit/TooltipDialog', './FacetFilterPanel',
  'dojo/_base/lang', 'dojo/on', 'dojo/dom-construct', 'dojo/topic'
], function (
  declare, GridContainer,
  Grid, popup,
  TooltipDialog, FacetFilterPanel,
  lang, on, domConstruct, Topic
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  return declare([GridContainer], {
    containerType: 'antibiotic_data',
    facetFields: ['atc_classification'],
    dataModel: 'antibiotics',
    getFilterPanel: function (opts) {
    },
    primaryKey: 'pubchem_cid',
    selectionActions: GridContainer.prototype.selectionActions.concat([
      [
        'ViewAntibioticItem',
        'fa icon-selection-Antibiotic fa-2x',
        {
          label: 'ANTIBIOTIC',
          validTypes: ['*'],
          multiple: false,
          tooltip: 'Switch to Antibiotic View',
          ignoreDataType: true,
          validContainerTypes: ['antibiotic_data']
        },
        function (selection) {
          var sel = selection[0];
          var query = '?eq(antibiotic_name,' + encodeURIComponent(sel.antibiotic_name) + ')';

          Topic.publish('/navigate', { href: '/view/Antibiotic/' + query, target: 'blank' });
        },
        false
      ]
    ]),
    gridCtor: Grid

  });
});
