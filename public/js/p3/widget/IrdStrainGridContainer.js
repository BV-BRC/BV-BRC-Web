define([
  'dojo/_base/declare', 'dojo/_base/lang',
  './GenomeGridContainer', './GenomeGrid',
  '../store/IrdSegmentAccessionStore', '../util/irdColumns'
], function (
  declare, lang,
  GenomeGridContainer, GenomeGrid,
  IrdSegmentAccessionStore, irdColumns
) {

  /**
   * The genome grid for IRD's Strain Display (viewer/IrdResults): the
   * ordinary genome grid and actions, plus IRD's per-segment accession
   * columns (1 PB2 ... 8 NS), filled per page by IrdSegmentAccessionStore.
   */

  var segmentColumns = {};
  irdColumns.SEGMENT_COLUMNS.forEach(function (col) {
    segmentColumns['ird_seg_' + col.segment] = {
      label: col.label,
      field: 'ird_segments',
      sortable: false,
      hidden: false,
      renderCell: function (row, value, node) {
        var cell = irdColumns.segmentCell(row, col.segment);
        node.textContent = cell.text;
        if (cell.title) node.title = cell.title;
      }
    };
  });

  var IrdStrainGrid = declare([GenomeGrid], {
    columns: lang.mixin({}, GenomeGrid.prototype.columns, segmentColumns),

    postMixInProperties: function () {
      this.inherited(arguments);
      // GenomeGrid's store is shared on its prototype; wrap it per grid.
      this.store = IrdSegmentAccessionStore(this.store, this.apiServer || window.App.dataServiceURL);
    }
  });

  return declare([GenomeGridContainer], {
    gridCtor: IrdStrainGrid
  });
});
