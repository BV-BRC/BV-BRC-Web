define([
    'dojo/_base/declare', 'dijit/layout/BorderContainer', './CopilotDisplay',
    './CopilotInput', './CopilotQuery', 'dojo/topic'
  ], function (
    declare, BorderContainer, CopilotDisplay, CopilotInput, CopilotQuery, topic
  ) {

    return declare([BorderContainer], {
      containerType: 'copilot',
      gutters: false,
      style: 'height: 100%; width: 100%;',

      postCreate: function () {
        this.inherited(arguments);

        // Add CopilotQuery widget
        this.copilotQuery = new CopilotQuery({});

        // Subscribe to the 'query' topic
        topic.subscribe('CopilotQuery', function(queryData) {
          console.log('Query submitted:', queryData);
          // Handle the query submission here
          // You can update the display or perform other actions based on the query
        });

        // Top Section (optional content, such as a header or filters)
        var displayPane = new CopilotDisplay({
          region: 'center',
          style: 'height: 50px; padding: 10px; border: 2px solid red;',
          content: 'Query Output will go here.',
          copilotQuery: this.copilotQuery  // Pass the CopilotQuery instance to CopilotDisplay
        });
        this.addChild(displayPane);

        // Center Section (Grid)
        var inputPane = new CopilotInput({
          region: 'bottom',
          style: 'padding: 10px;border: 2px solid blue;',
          content: '',
          copilotQuery: this.copilotQuery  // Pass the CopilotQuery instance to CopilotInput
        });
        this.addChild(inputPane);

      }
    });
  });
