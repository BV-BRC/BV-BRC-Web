define([
  'dojo/_base/declare', 'dojo/_base/lang', '../../heatmap/dist/heatmap'
], function (
  declare, lang, Heatmap
) {

  return declare([], {
    hmapDom: null,
    currentData: null,
    chart: null,

    initializeHeatmap: function () {
      /**
       * new heatmap experiment
       */

      var target = document.getElementById('heatmapTarget');
      target.innerHTML = 'loading...';
      // window.hmapReady = lang.hitch(this, 'heatmapReady');
      // window.hmapRequestsData = lang.hitch(this, 'hmapUpdate');
      // window.hmapCellClicked = lang.hitch(this, 'hmapCellClicked');
      // window.hmapCellsSelected = lang.hitch(this, 'hmapCellsSelected');


      this.hmapDom = document.getElementById('heatmapTarget');
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

    // flash interface functions
    hmapReady: function () {
      // update this.currentData
      // this.flashDom.refreshData();
    },

    hmapUpdate: function () {
      if (!this.currentData) return;
      let { rows, cols, matrix } = this.formatData(this.currentData);
      console.log('{rows, cols, matrix} ', { rows, cols, matrix } );

      if (!this.chart) {
        this.chart = new Heatmap({
          ele: this.hmapDom,
          cols: cols,
          rows: rows,
          matrix: matrix,
          showLogo: false,
          color: {
            bins: ['=0', '=1', '=2', '>=3'],
            colors: [0x000000, 16440142, 16167991, 16737843]
          },
          defaults: {
            cellW: 3,
            cellH: 20
          }
        });
      } else {
        this.chart.update({ rows, cols, matrix });
      }

      this.initialized = true;
      return this.currentData;
    },
    hmapCellClicked: function (flashObjectID, colID, rowID) {
      // implement
    },
    hmapCellsSelected: function (flashObjectID, colIDs, rowIDs) {
      // implement
    },
    formatData: function (data) {
      var rows = data.rows.map(r => {
        return {
          // categories: ['1', '1', '1'], // todo(nc): remove
          name: r.rowLabel
        };
      });
      var cols = data.columns.map(c => {
        return {
          name: c.colLabel,
          distribution: c.distribution,
          meta: c.meta
        };
      });

      // get lists of vals for each column
      let vals = cols.map(c => {
        let hexStrs = c.distribution.match(/.{2}/g), // convert hex string to vals
          vals = hexStrs.map(hex => parseInt(hex, 16));

        delete c.distribution; // we no longer need the distribution
        return vals;
      });

      // make pass of all column val data (i times, where i = number of rows)
      let matrix = [];
      for (let i = 0; i < vals[0].length; i++) {
        let row = [];
        for (let j = 0; j < vals.length; j++) {
          row.push(vals[j][i]);
        }
        matrix.push(row);
      }

      return { cols, rows, matrix };
    }
  });
});
