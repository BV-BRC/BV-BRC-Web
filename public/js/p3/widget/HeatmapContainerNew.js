define([
  'dojo/_base/declare'
], function (
  declare
) {

  return declare([], {
    hmapDom: null,
    currentData: null,
    chart: null,

    initializeHeatmap: function () {
      /**
       * setup new heatmap
       */

      var target = document.getElementById('heatmapTarget');
      target.innerHTML = 'loading...';
      this.hmapDom = target;
      return this.hmapDom;
    },

    exportCurrentData: function (isTransposed) {
      // compose heatmap raw data in tab delimited format
      // this de-transpose (if it is transposed) so that cluster algorithm can be applied to a specific data type
      var cols,
        rows,
        id_field_name,
        data_field_name,
        tablePass = [],
        header = [''];

      if (isTransposed) {
        cols = this.currentData.rows;
        rows = this.currentData.columns;
        id_field_name = 'rowID';
        data_field_name = 'colID';
      } else {
        cols = this.currentData.columns;
        rows = this.currentData.rows;
        id_field_name = 'colID';
        data_field_name = 'rowID';
      }

      cols.forEach(function (col) {
        header.push(col[id_field_name]);
      });

      tablePass.push(header.join('\t'));

      for (var i = 0, iLen = rows.length; i < iLen; i++) {
        var r = [];
        r.push(rows[i][data_field_name]);

        for (var j = 0, jLen = cols.length; j < jLen; j++) {
          if (isTransposed) {
            r.push(parseInt(rows[i].distribution[j * 2] + rows[i].distribution[j * 2 + 1], 16));
          } else {
            r.push(parseInt(cols[j].distribution[i * 2] + cols[j].distribution[i * 2 + 1], 16));
          }
        }

        tablePass.push(r.join('\t'));
      }

      return tablePass.join('\n');
    },

    hmapCellClicked: function (colID, rowID) {
      // implement
    },
    hmapCellsSelected: function (colIDs, rowIDs) {
      // implement
    }
  });
});
