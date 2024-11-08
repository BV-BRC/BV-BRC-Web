define([
    'dojo/_base/declare', 'dijit/layout/BorderContainer', './CopilotDisplay',
    './CopilotInput', './CopilotApi', 'dojo/topic', 'dijit/layout/ContentPane', './ChatSessionScrollBar', './ChatSessionContainer'
  ], function (
    declare, BorderContainer, CopilotDisplay, CopilotInput, CopilotApi, topic, ContentPane, ChatSessionScrollBar, ChatSessionContainer
  ) {

    return declare([BorderContainer], {
      containerType: 'copilot',
      gutters: false,
      style: 'height: 100%; width: 100%;',

      postCreate: function () {
        this.inherited(arguments);

        // Add CopilotApi widget
        this.copilotApi = new CopilotApi({
          user_id: window.App.user.l_id
        });

        // Left Section (Chat Session Scroll Bar)
        var leftPane = new ChatSessionScrollBar({
          region: 'left',
          splitter: true,
          style: 'width: 200px; padding: 10px; border: 2px solid purple;',
          copilotApi: this.copilotApi
        });
        this.addChild(leftPane);

        // Create right side container
        var rightContainer = new ChatSessionContainer({
          region: 'center',
          gutters: false,
          copilotApi: this.copilotApi
        });
        this.addChild(rightContainer);
      }
    });
  });
