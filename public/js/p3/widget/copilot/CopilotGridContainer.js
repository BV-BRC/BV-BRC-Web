/**
 * @module p3/widget/CopilotGridContainer
 * @description A BorderContainer-based widget that creates the main layout for the Copilot chat interface.
 * It consists of a left sidebar containing chat session options and history, and a main content area
 * for the active chat session.
 *
 * Implementation:
 * - Extends BorderContainer to create a two-pane layout
 * - Left sidebar contains options bar and scrollable chat history
 * - Main content area displays active chat session
 * - Handles initialization of CopilotAPI and model/RAG database loading
 * - Provides error handling for service availability
 */
define([
    'dojo/_base/declare', // Base class for creating Dojo classes
    'dijit/layout/BorderContainer', // Parent class for layout container
    'dojo/_base/lang', // Language utilities like hitch
    'dijit/Dialog', // Dialog widget for error messages
    './CopilotDisplay', // Chat message display widget
    './CopilotInput', // Chat input widget
    './CopilotApi', // API client for backend communication
    'dojo/topic', // Pub/sub messaging
    'dijit/layout/ContentPane', // Basic content container
    './ChatSessionScrollBar', // Scrollable chat history widget
    './ChatSessionContainer', // Main chat session container
    './ChatSessionOptionsBar' // Options bar widget
  ], function (
    declare, BorderContainer, lang, Dialog, CopilotDisplay, CopilotInput, CopilotAPI, topic, ContentPane, ChatSessionScrollBar, ChatSessionContainer, ChatSessionOptionsBar
  ) {

    /**
     * @class CopilotGridContainer
     * @extends {dijit/layout/BorderContainer}
     *
     * Main container widget that creates the Copilot interface layout.
     * Manages initialization of child widgets and API communication.
     */
    return declare([BorderContainer], {
      /** Identifies this as a copilot container for widget type checking */
      containerType: 'copilot',

      /** Disables visual gutters between container regions */
      gutters: false,

      /** Makes container fill its parent element */
      style: 'height: 100%; width: 100%;',

      /**
       * Sets up the container layout after widget creation
       * Implementation:
       * - Initializes CopilotAPI with user ID
       * - Loads available models and RAG databases
       * - Creates left sidebar with:
       *   - Options bar for settings/controls
       *   - Scrollable chat history list
       * - Creates main chat area
       * - Handles service availability errors
       */
      postCreate: function () {
        this.inherited(arguments);

        // Initialize API client with current user's ID
        this.copilotApi = new CopilotAPI({
          user_id: window.App.user.l_id
        });

        // Load available models and RAG databases
        console.log('getting model list');
        this.copilotApi.getModelList().then(lang.hitch(this, function(modelsAndRag) {

          // Parse model and database lists from response
          var modelList = JSON.parse(modelsAndRag.models);
          var ragList = JSON.parse(modelsAndRag.vdb_list);

          // Create left sidebar container with splitter for resizing
          var leftContainer = new BorderContainer({
            region: 'left',
            splitter: true,
            style: 'width: 240px;'
          });

          // Add options bar to top of sidebar
          var leftTopPane = new ChatSessionOptionsBar({
            region: 'top',
            style: 'height: 30px; ',
            copilotApi: this.copilotApi,
            modelList: modelList,
            ragList: ragList
          });
          leftContainer.addChild(leftTopPane);

          // Add scrollable chat history below options bar
          var chatSessionPane = new ChatSessionScrollBar({
            region: 'center',
            style: 'padding: 0px; border: 1px solid grey;',
            copilotApi: this.copilotApi
          });
          leftContainer.addChild(chatSessionPane);

          this.addChild(leftContainer);

          // Create main chat container in center region
          var rightContainer = new ChatSessionContainer({
            region: 'center',
            gutters: false,
            copilotApi: this.copilotApi
          });
          this.addChild(rightContainer);

        })).catch(lang.hitch(this, function(err) {
          // Show error dialog if service is unavailable
          new Dialog({
            title: "Service Unavailable",
            content: "The BV-BRC Copilot service is currently disabled. Please try again later.",
            style: "width: 300px"
          }).show();
          console.error('Error getting model list:', err);
        }));
      }
    });
  });