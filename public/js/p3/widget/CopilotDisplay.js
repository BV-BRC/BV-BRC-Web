define([
  'dojo/_base/declare', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/on', 'dojo/topic', 'dojo/_base/lang'
], function (
  declare, ContentPane, domConstruct, on, topic, lang
) {
  return declare([ContentPane], {

    copilotApi: null,
    messages: [],

    constructor: function(args) {
      declare.safeMixin(this, args);
    },

    postCreate: function() {
      this.inherited(arguments);

      // Create a container for displaying the query result
      this.resultContainer = domConstruct.create('div', {
        class: 'copilot-result-container',
        style: 'width: 100%; height: 100%; overflow-y: auto; padding: 10px; border: 2px solid yellow;'
      }, this.containerNode);

      // Subscribe to the 'query' topic
      topic.subscribe('RefreshSessionDisplay', lang.hitch(this, 'showMessages'));
      topic.subscribe('CopilotApiError', lang.hitch(this, 'onQueryError'));
      topic.subscribe('ChatSession:Selected', lang.hitch(this, 'onSessionSelected'));
    },

    showMessages: function(messages) {
      if (messages.length) {
        domConstruct.empty(this.resultContainer);
        console.log('show messages', messages);
        // Create a message element for each message
        messages.forEach(lang.hitch(this, function(message) {
            var messageDiv = domConstruct.create('div', {
                class: 'message ' + message.role,
                style: 'margin-bottom: 10px; padding: 10px; border-radius: 5px; ' +
                        (message.role === 'user' ? 'background-color: #e6f3ff;' : 'background-color: #f5f5f5;')
            }, this.resultContainer);

            domConstruct.create('div', {
                innerHTML: message.content,
                style: 'white-space: pre-wrap; word-wrap: break-word;'
            }, messageDiv);
        }));
      }
    },

    onQueryError: function() {
      console.log('onQueryError');
      domConstruct.empty(this.resultContainer);
      domConstruct.create('div', {
        innerHTML: 'An error occurred while processing your request. Please try again later.',
        style: 'color: red; padding: 10px;'
      }, this.resultContainer);
    },

    onSessionSelected: function(data) {
      console.log('onSessionSelected CopilotDisplay', data);
      const sessionId = data.sessionId;
      const messages = data.messages;

      domConstruct.empty(this.resultContainer);

      // Create a message element for each message
      messages.forEach(lang.hitch(this, function(message) {
            var messageDiv = domConstruct.create('div', {
                class: 'message ' + message.role,
                style: 'margin-bottom: 10px; padding: 10px; border-radius: 5px; ' +
                        (message.role === 'user' ? 'background-color: #e6f3ff;' : 'background-color: #f5f5f5;')
            }, this.resultContainer);

            domConstruct.create('div', {
                innerHTML: message.content,
                style: 'white-space: pre-wrap; word-wrap: break-word;'
            }, messageDiv);
        }));
    }
  });
});
