define([
  'dojo/_base/declare', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/on', 'dojo/topic', 'dojo/_base/lang'
], function (
  declare, ContentPane, domConstruct, on, topic, lang
) {
  return declare([ContentPane], {

    copilotQuery: null,

    constructor: function(args) {
      declare.safeMixin(this, args);
    },

    postCreate: function() {
      this.inherited(arguments);

      // Create a container for displaying the query result
      this.resultContainer = domConstruct.create('div', {
        class: 'copilot-result-container',
        style: 'width: 100%; height: 100%; overflow-y: auto; padding: 10px;'
      }, this.containerNode);

      // Subscribe to the 'query' topic
      topic.subscribe('CopilotQuery', lang.hitch(this, 'onQueryResult'));
    },

    onQueryResult: function() {
      console.log('onQueryResult');
      if (this.copilotQuery) {
        var result = this.copilotQuery.getStoredResult();
        if (result && result.choices && result.choices.length > 0) {
          var content = result.choices[0].message.content;
          domConstruct.empty(this.resultContainer);
          domConstruct.create('pre', {
            innerHTML: content,
            style: 'white-space: pre-wrap; word-wrap: break-word;'
          }, this.resultContainer);
        } else {
          console.error('Invalid result structure');
        }
      } else {
        console.error('CopilotQuery not initialized');
      }
    }
  });
});
