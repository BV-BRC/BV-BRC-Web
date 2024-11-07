define([
  'dojo/_base/declare',
  'dijit/layout/ContentPane',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/_base/lang',
  'dojo/topic',
  './ChatSessionScrollCard'
], function (
  declare, ContentPane, domConstruct, on, lang, topic, ChatSessionScrollCard
) {
  return declare([ContentPane], {
    sessions: [], // Array to hold chat session data

    constructor: function(args) {
      this.inherited(arguments);
      declare.safeMixin(this, args);
    },

    postCreate: function() {
      this.inherited(arguments);

      // Create scrollable container
      this.scrollContainer = domConstruct.create('div', {
        style: 'width: 100%; height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding: 10px;'
      }, this.containerNode);


      topic.subscribe('CopilotApiSessions', lang.hitch(this, function(sessions) {
        this.setSessions(JSON.parse(sessions.sessions));
      }));
    },

    renderSessions: function() {
        // Clear existing content
        domConstruct.empty(this.scrollContainer);

        // Create session cards
        this.sessions.sessions.forEach(function(session) {
          var sessionCard = new ChatSessionScrollCard({
            session: session,
            copilotApi: this.copilotApi
          });
          sessionCard.placeAt(this.scrollContainer);
        }, this);
    },

    addSession: function(session) {
      this.sessions.push(session);
      this.renderSessions();
    },

    setSessions: function(sessions) {
      this.sessions = sessions;
      this.renderSessions();
    }
  });
});
