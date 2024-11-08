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
    sessions_list: [], // Array to hold chat session data

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

      this.getSessions();

      topic.subscribe('reloadUserSessions', lang.hitch(this, 'getSessions'));
    },

    renderSessions: function() {
        // Clear existing content
        domConstruct.empty(this.scrollContainer);

        // Create session cards
        this.sessions_list.forEach(function(session) {
          var sessionCard = new ChatSessionScrollCard({
            session: session,
            copilotApi: this.copilotApi
          });
          sessionCard.placeAt(this.scrollContainer);
        }, this);
    },

    addSession: function(session) {
      this.sessions_list.push(session);
      this.renderSessions();
    },

    setSessions: function(sessions) {
      this.sessions_list = sessions;
      this.renderSessions();
    },

    getSessions: function() {
      this.copilotApi.getUserSessions().then(lang.hitch(this, function(sessions) {
        this.setSessions(sessions);
      }));
    }
  });
});
