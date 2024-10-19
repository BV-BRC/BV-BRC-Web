define([
    'dojo/_base/declare', 'dgrid/Grid', 'dgrid/Selection', 'dgrid/Keyboard', 'dgrid/extensions/ColumnResizer'
  ], function (
    declare, Grid, Selection, Keyboard, ColumnResizer
  ) {

    return declare([Grid, Selection, Keyboard, ColumnResizer], {
      columns: {
        id: 'ID',
        name: 'Name',
        description: 'Description'
      },

      selectionMode: 'single', // Allows selecting rows
      loadingMessage: 'Loading data...', // Message when data is loading
      noDataMessage: 'No data found.', // Message when no data is available

      postCreate: function () {
        this.inherited(arguments);

        // Sample data to populate the grid
        this.renderArray([
          { id: 1, name: 'Item 1', description: 'Description 1' },
          { id: 2, name: 'Item 2', description: 'Description 2' },
          { id: 3, name: 'Item 3', description: 'Description 3' }
        ]);
      }
    });
  });
