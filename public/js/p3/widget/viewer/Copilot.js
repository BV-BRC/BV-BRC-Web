/**
 * @module p3/widget/viewer/Copilot
 * @description Main viewer widget for the Copilot chat interface. Extends Base viewer class to provide
 * a container for the CopilotGridContainer which manages the chat UI layout and functionality.
 *
 * Implementation:
 * - Creates and initializes CopilotGridContainer for chat interface
 * - Handles layout and sizing of container
 * - Manages viewer state and configuration
 */
define([
    'dojo/_base/declare', // Base class for creating Dojo classes
    'dojo/request', // AJAX request handling
    './Base', // Base viewer class
    '../copilot/CopilotGridContainer', // Main chat interface container
    'dojo/dom-construct', // DOM manipulation utilities
    'dojo/on', // Event handling
    'dijit/Dialog' // Dialog component for showing error messages
  ], function (
    declare, request, Base, GridContainer, domConstruct, on, Dialog
  ) {
    return declare([Base], {

      // Flag to disable viewer functionality if needed
      disabled: false,

      // Query parameters for data loading
      query: null,

      // Type identifier for container
      containerType: '',

      // Label shown in UI for this perspective
      perspectiveLabel: 'Copilot',

      // URL for API service calls
      apiServiceUrl: window.App.dataAPI,

      /**
       * Sets up the viewer after DOM creation
       * Implementation:
       * - Calls parent class initialization
       * - Logs debug information
       * - Creates and attaches grid container
       */
      postCreate: function () {
        console.log('window.App ', window.App);
        // Initialize parent class
        this.inherited(arguments);

        // Debug logging of viewer state
        console.log(this.state);

        // Check if user is logged in
        this._checkUserAuthentication();

        // Set up main container
        this._initializeGridContainer();
      },

      /**
       * Checks if the user is logged in and shows an error dialog if not
       * Implementation:
       * - Checks for authentication token and user profile
       * - Shows login dialog if user is not authenticated
       */
      _checkUserAuthentication: function() {
        // Check if user is logged in by verifying authentication token and user profile
        if (!window.App.authorizationToken || !window.App.user || !window.App.user.id) {
          // Create and show login required dialog
          var loginDialog = new Dialog({
            title: "Login Required",
            content: "<div style='text-align: center; padding: 10px;'>" +
                     "<p>You must be logged in to use the Copilot feature.</p>" +
                     "<p>Please sign in with your BV-BRC account to continue.</p>" +
                     "</div>",
            style: "width: 400px"
          });

          loginDialog.startup();
          loginDialog.show();

          // Disable the viewer functionality
          this.disabled = true;
        }
      },

      /**
       * Creates and configures the main grid container
       * Implementation:
       * - Creates container DOM node
       * - Initializes CopilotGridContainer with configuration
       * - Attaches container to viewer
       */
      _initializeGridContainer: function () {
        if (!this.disabled) {
          // Create wrapper div for grid container
          var containerNode = domConstruct.create('div', {
            id: 'gridContainerNode',
            style: 'height: 500px; width: 100%;'
          }, this.domNode);

          // Initialize main grid container with config
          this.gridContainer = new GridContainer({
            gridCtor: this._getGridConstructor(),
            containerType: 'copilot',
            facetFields: [],
            dataModel: 'llm',
            style: 'height: 100%; width: 100%;',
            region: 'center'
          }, containerNode);

          // Startup call currently disabled
          // this.gridContainer.startup();
        }
      },

      /**
       * Returns constructor function for grid component
       * Implementation:
       * - Currently returns placeholder function
       * - To be expanded with actual grid initialization logic
       */
      _getGridConstructor: function () {
        return function (node) {
          // Placeholder for grid initialization logic
        };
      }
    });
  });
