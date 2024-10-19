define([
    'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dijit/layout/ContentPane', './CopilotGrid'
  ], function (
    declare, BorderContainer, ContentPane, Grid
  ) {

    return declare([BorderContainer], {
      gridCtor: Grid,
      containerType: 'copilot',
      facetFields: [],
      dataModel: 'llm',
      query: '',
      design: 'headline',
      gutters: false,
      style: 'height: 100%; width: 100%;',

      postCreate: function () {
        this.inherited(arguments);

        // Top Section (optional content, such as a header or filters)
        var topPane = new ContentPane({
          region: 'top',
          style: 'height: 50px; padding: 10px;',
          content: 'Filter panel or instructions can go here.'
        });
        this.addChild(topPane);

        // Center Section (Grid)
        var gridPane = new ContentPane({
          region: 'center',
          style: 'padding: 0;',
          content: '' // Grid will be added here.
        });
        this.addChild(gridPane);

        // Create and attach the grid
        this.grid = new this.gridCtor({
          region: 'center',
          style: 'height: 100%; width: 100%;'
        }, gridPane.domNode);

        // Start up grid after attaching
        this.grid.startup();
      },

      // You can define additional methods like filter panel rendering here.
      getFilterPanel: function (opts) {
        // Example filter panel creation logic.
      },

      containerActions: []
    });
  });
