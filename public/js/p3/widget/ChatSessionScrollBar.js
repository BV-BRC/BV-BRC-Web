/**
 * @module p3/widget/ChatSessionScrollBar
 * @description A ContentPane-based widget that displays a scrollable list of chat sessions.
 * Manages fetching, rendering and updating of chat session cards.
 */
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
  /**
   * @class ChatSessionScrollBar
   * @extends {dijit/layout/ContentPane}
   */
  return declare([ContentPane], {
    /** @property {Array} sessions_list - Array to hold chat session data */
    sessions_list: [],

    /**
     * @constructor
     * @param {Object} args - Configuration arguments
     * @description Initializes the widget and mixes in provided options
     */
    constructor: function(args) {
      this.inherited(arguments);
      declare.safeMixin(this, args);
    },

    /**
     * @method postCreate
     * @description Sets up the widget after creation
     * Creates scrollable container and fetches initial sessions
     * Subscribes to session reload events
     */
    postCreate: function() {
      this.inherited(arguments);

      // Create scrollable container that fills parent width
      this.scrollContainer = domConstruct.create('div', {
        style: 'width: 100%; height: 100%; overflow-y: auto; display: flex; flex-direction: column; padding: 0;'
      }, this.containerNode);

      this.getSessions();

      topic.subscribe('reloadUserSessions', lang.hitch(this, 'getSessions'));
    },

    /**
     * @method renderSessions
     * @description Renders the list of chat session cards
     * Clears existing content and creates new cards for each session
     */
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

    /**
     * @method addSession
     * @param {Object} session - Session object to add
     * @description Adds a new session to the list and re-renders
     */
    addSession: function(session) {
      this.sessions_list.push(session);
      this.renderSessions();
    },

    /**
     * @method setSessions
     * @param {Array} sessions - Array of session objects
     * @description Updates the full list of sessions and re-renders
     */
    setSessions: function(sessions) {
      this.sessions_list = sessions;
      this.renderSessions();
    },

    /**
     * @method getSessions
     * @description Fetches user's chat sessions from the API
     * Updates the sessions list when complete
     */
    getSessions: function() {
      this.copilotApi.getUserSessions().then(lang.hitch(this, function(sessions) {
        this.setSessions(sessions);
      }));
    }
  });
});
