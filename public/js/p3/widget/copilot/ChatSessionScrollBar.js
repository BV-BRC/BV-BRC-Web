/**
 * @module p3/widget/ChatSessionScrollBar
 * @description A ContentPane-based widget that displays a scrollable list of chat sessions.
 * Manages fetching, rendering and updating of chat session cards.
 *
 * Implementation:
 * - Extends ContentPane to provide scrollable container functionality
 * - Maintains list of chat sessions and handles updates
 * - Creates ChatSessionScrollCard widgets for each session
 * - Provides API for adding/updating sessions
 */
define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dijit/layout/ContentPane', // Parent class for scrollable container
  'dojo/dom-construct', // DOM manipulation utilities
  'dojo/on', // Event handling
  'dojo/_base/lang', // Language utilities like hitch
  'dojo/topic', // Pub/sub messaging
  './ChatSessionScrollCard' // Individual session card widget
], function (
  declare, ContentPane, domConstruct, on, lang, topic, ChatSessionScrollCard
) {
  /**
   * @class ChatSessionScrollBar
   * @extends {dijit/layout/ContentPane}
   *
   * Main widget class that manages the scrollable list of chat sessions.
   * Handles session data storage, rendering, and updates.
   */
  return declare([ContentPane], {
    /**
     * @property {Array} sessions_list
     * Internal array to store chat session data objects
     * Each object contains session metadata like id, title, etc
     */
    sessions_list: [],

    /**
     * @constructor
     * @param {Object} args - Configuration arguments
     *
     * Implementation:
     * - Calls parent constructor
     * - Mixes in any provided configuration options
     * - Initializes empty sessions list
     */
    constructor: function(args) {
      this.inherited(arguments);
      declare.safeMixin(this, args);
    },

    /**
     * @method postCreate
     * Called after widget is created but before being rendered
     *
     * Implementation:
     * - Creates scrollable container div that fills parent
     * - Sets up flex column layout for session cards
     * - Fetches initial session data
     * - Subscribes to reload events to refresh sessions
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
     * Renders the full list of chat session cards
     *
     * Implementation:
     * - Clears existing content from container
     * - Creates new ChatSessionScrollCard widget for each session
     * - Places cards in container in order
     * - Maintains consistent styling and layout
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
     *
     * Implementation:
     * - Adds new session object to internal array
     * - Triggers re-render of all sessions
     * - Maintains array order
     */
    addSession: function(session) {
      this.sessions_list.push(session);
      this.renderSessions();
    },

    /**
     * @method setSessions
     * @param {Array} sessions - Array of session objects
     *
     * Implementation:
     * - Replaces entire sessions array with new data
     * - Triggers complete re-render
     * - Used for bulk updates
     */
    setSessions: function(sessions) {
      this.sessions_list = sessions;
      this.renderSessions();
    },

    /**
     * @method getSessions
     * Fetches user's chat sessions from API
     *
     * Implementation:
     * - Calls API method to get user sessions
     * - Updates internal sessions list with response
     * - Handles promise resolution
     * - Uses lang.hitch to maintain scope
     */
    getSessions: function() {
      this.copilotApi.getUserSessions().then(lang.hitch(this, function(sessions) {
        this.setSessions(sessions);
      }));
    }
  });
});
