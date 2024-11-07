define([
    'dojo/_base/declare', 'dijit/layout/BorderContainer', './CopilotDisplay',
    './CopilotInput', './CopilotApi', 'dojo/topic', 'dijit/layout/ContentPane', './ChatSessionScrollBar'
  ], function (
    declare, BorderContainer, CopilotDisplay, CopilotInput, CopilotApi, topic, ContentPane, ChatSessionScrollBar
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

        // Subscribe to the 'query' topic
        topic.subscribe('CopilotApi', function(queryData) {
          console.log('Query submitted:', queryData);
          // Handle the query submission here
          // You can update the display or perform other actions based on the query
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
        var rightContainer = new BorderContainer({
          region: 'center',
          gutters: false
        });
        this.addChild(rightContainer);

        // Add display pane to right container
        var displayPane = new CopilotDisplay({
          region: 'center',
          style: 'padding: 10px; border: 2px solid red;',
          copilotApi: this.copilotApi
        });
        rightContainer.addChild(displayPane);

        // Add input pane to right container
        var inputPane = new CopilotInput({
          region: 'bottom',
          style: 'padding: 10px; border: 2px solid blue;',
          copilotApi: this.copilotApi
        });
        rightContainer.addChild(inputPane);
      }
    });
  });
