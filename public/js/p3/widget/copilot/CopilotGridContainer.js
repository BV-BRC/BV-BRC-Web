/**
 * @module p3/widget/CopilotGridContainer
 * @description A BorderContainer-based widget that creates the main layout for the Copilot chat interface.
 * It consists of a left sidebar containing chat session options and history, and a main content area
 * for the active chat session.
 */
define([
    'dojo/_base/declare', 'dijit/layout/BorderContainer', './CopilotDisplay',
    './CopilotInput', './CopilotApi', 'dojo/topic', 'dijit/layout/ContentPane', './ChatSessionScrollBar', './ChatSessionContainer', './ChatSessionOptionsBar'
  ], function (
    declare, BorderContainer, CopilotDisplay, CopilotInput, CopilotApi, topic, ContentPane, ChatSessionScrollBar, ChatSessionContainer, ChatSessionOptionsBar
  ) {

    return declare([BorderContainer], {
      /** @property {string} containerType - Identifies this as a copilot container */
      containerType: 'copilot',

      /** @property {boolean} gutters - Disables gutters between panes */
      gutters: false,

      /** @property {string} style - Sets container to fill available space */
      style: 'height: 100%; width: 100%;',

      /**
       * @method postCreate
       * @description Sets up the container layout after the widget is created.
       * Creates a two-pane layout with:
       * 1. Left sidebar (300px wide) containing:
       *    - Options bar at top (50px height)
       *    - Scrollable chat session history
       * 2. Main content area containing the active chat session
       */
      postCreate: function () {
        this.inherited(arguments);

        // Initialize the CopilotApi with current user's ID
        this.copilotApi = new CopilotApi({
          user_id: window.App.user.l_id
        });

        // Create left sidebar container
        var leftContainer = new BorderContainer({
          region: 'left',
          splitter: true, // Allows resizing
          style: 'width: 240px;'
        });

        // Add options bar to top of sidebar
        var leftTopPane = new ChatSessionOptionsBar({
          region: 'top',
          style: 'height: 30px; ',
          copilotApi: this.copilotApi
        });
        leftContainer.addChild(leftTopPane);

        // Add scrollable chat history to sidebar
        var chatSessionPane = new ChatSessionScrollBar({
          region: 'center',
          style: 'padding: 0px; border: 1px solid grey;',
          copilotApi: this.copilotApi
        });
        leftContainer.addChild(chatSessionPane);

        this.addChild(leftContainer);

        // Create main chat container
        var rightContainer = new ChatSessionContainer({
          region: 'center',
          gutters: false,
          copilotApi: this.copilotApi
        });
        this.addChild(rightContainer);
      }
    });
  });
