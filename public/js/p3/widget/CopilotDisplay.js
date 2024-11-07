define([
  'dojo/_base/declare', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/on', 'dojo/topic', 'dojo/_base/lang'
], function (
  declare, ContentPane, domConstruct, on, topic, lang
) {
  return declare([ContentPane], {

    copilotApi: null,

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
      topic.subscribe('CopilotApi', lang.hitch(this, 'onQueryResult'));
      topic.subscribe('CopilotApiError', lang.hitch(this, 'onQueryError'));
    },

    onQueryResult: function() {
      console.log('onQueryResult');
      if (this.copilotApi) {
        var result = this.copilotApi.getStoredResult();
        // if (result && result.choices && result.choices.length > 0) {
        if (result && result.response) {
          var content = result.response.content;
          domConstruct.empty(this.resultContainer);
          domConstruct.create('pre', {
            innerHTML: content,
            style: 'white-space: pre-wrap; word-wrap: break-word;'
          }, this.resultContainer);
        } else {
          console.error('Invalid result structure');
        }
      } else {
        console.error('CopilotApi not initialized');
      }
    },

    onQueryError: function() {
      console.log('onQueryError');
      domConstruct.empty(this.resultContainer);
      domConstruct.create('div', {
        innerHTML: 'An error occurred while processing your request. Please try again later.',
        style: 'color: red; padding: 10px;'
      }, this.resultContainer);
    }
  });
});
