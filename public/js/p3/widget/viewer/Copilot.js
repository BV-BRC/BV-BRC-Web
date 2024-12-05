define([
    'dojo/_base/declare', 'dojo/request', './Base', '../copilot/CopilotGridContainer', 'dojo/dom-construct', 'dojo/on'
  ], function (
    declare, request, Base, GridContainer, domConstruct, on
  ) {
    return declare([Base], {

      disabled: false,
      query: null,
      containerType: '',
      perspectiveLabel: 'Copilot',
      apiServiceUrl: window.App.dataAPI,

      postCreate: function () {
        console.log('window.App ', window.App);
        // Call the inherited methods from the Base class
        this.inherited(arguments);

        // Log the state of the object to ensure it's initialized
        console.log(this.state);

        // Create the GridContainer and attach it to the DOM
        this._initializeGridContainer();
      },

      _initializeGridContainer: function () {
        // Create a container element to place the GridContainer into
        var containerNode = domConstruct.create('div', {
          id: 'gridContainerNode',
          style: 'height: 500px; width: 100%;'
        }, this.domNode);

        // Initialize the GridContainer with necessary configuration
        this.gridContainer = new GridContainer({
          gridCtor: this._getGridConstructor(),
          containerType: 'copilot',  // Specify container type if needed
          facetFields: [],
          dataModel: 'llm',
          style: 'height: 100%; width: 100%;',
          region: 'center'
        }, containerNode);

        // Start the GridContainer to render the content
       // this.gridContainer.startup();
      },

      _getGridConstructor: function () {
        // This function returns the grid constructor. It could be configured
        // or passed down as an option. For now, assume the default grid constructor.
        return function (node) {
          // Placeholder for actual grid logic.
        };
      }
    });
  });
