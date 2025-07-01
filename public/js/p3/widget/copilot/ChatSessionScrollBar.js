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
  'dojo/_base/lang', // Language utilities like hitch
  'dojo/topic', // Pub/sub messaging
  './ChatSessionScrollCard' // Individual session card widget
], function (
  declare, ContentPane, domConstruct, lang, topic, ChatSessionScrollCard
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
     * @property {Object} sessionCards
     * Map of session IDs to card widgets for quick access
     */
    sessionCards: {},

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
      declare.safeMixin(this, args);
      this.sessionCards = {};
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
        class: 'chatSessionScrollContainer'
      }, this.containerNode);

      this.getSessions();

      topic.subscribe('reloadUserSessions', lang.hitch(this, function(data) {
        if (data && data.highlightSessionId) {
          // Store the session ID to highlight after reload
          this._highlightAfterReload = data.highlightSessionId;
        }
        this.getSessions();
      }));

      // Subscribe to session selection events to highlight the selected session
      topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
        this.highlightSession(data.sessionId);
      }));
    },

    /**
     * @method renderSessions
     * Renders the full list of chat session cards using ChatSessionScrollCard
     * Overrides parent method to use small window version of cards
     */
    renderSessions: function() {
      // Clear existing content
      domConstruct.empty(this.scrollContainer);

      // Reset session cards map
      this.sessionCards = {};

      // Create session cards using small window version
      this.sessions_list.forEach(function(session) {
          var sessionCard = new ChatSessionScrollCard({
              session: session,
              copilotApi: this.copilotApi
          });
          sessionCard.placeAt(this.scrollContainer);

          // Store reference to the card widget keyed by session ID
          this.sessionCards[session.session_id] = sessionCard;
      }, this);
    },

    /**
     * @method highlightSession
     * @param {string} sessionId - ID of session to highlight
     *
     * Implementation:
     * - Removes highlighting from all sessions
     * - Adds highlight class to the specified session
     * - If session card is found, changes its background color
     * - Scrolls the highlighted session into view
     */
    highlightSession: function(sessionId) {
      if (!this.sessionCards) {
        return;
      }

      // If no sessionId provided, just clear all highlighting
      if (!sessionId) {
        this.clearHighlight();
        return;
      }

      // Get the session card for this ID
      var sessionCard = this.sessionCards[sessionId];

      if (sessionCard) {
        // Reset all cards to their default style
        this.clearHighlight();

        // Highlight the selected card
        sessionCard.containerNode.style.backgroundColor = '#e6f7ff';
        sessionCard.containerNode.style.borderLeft = '3px solid #1890ff';

        // Scroll card into view if it's out of the visible area
        if (sessionCard.containerNode) {
          sessionCard.containerNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    },

    /**
     * @method clearHighlight
     * Clears highlighting from all session cards, resetting them to default state
     */
    clearHighlight: function() {
      if (!this.sessionCards) {
        return;
      }

      // Reset all cards to their default style
      for (var id in this.sessionCards) {
        if (this.sessionCards[id] && this.sessionCards[id].containerNode) {
          var card = this.sessionCards[id];
          card.containerNode.style.backgroundColor = card.defaultBackgroundColor || '#f0f0f0';
          card.containerNode.style.borderLeft = '1px solid #ccc';
        }
      }
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

      // If there's a session to highlight after reload, do it now
      if (this._highlightAfterReload) {
        // Use setTimeout to ensure the DOM is updated before highlighting
        setTimeout(lang.hitch(this, function() {
          this.highlightSession(this._highlightAfterReload);
          this._highlightAfterReload = null; // Clear the pending highlight
        }), 300);
      }
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

        // If no specific session to highlight, attempt to highlight the currently stored session
        if (!this._highlightAfterReload) {
          try {
            var savedId = (window && window.localStorage) ? localStorage.getItem('copilot-current-session-id') : null;
            if (savedId) {
              setTimeout(lang.hitch(this, function() {
                this.highlightSession(savedId);
              }), 300);
            }
          } catch (e) {
            console.warn('Unable to access localStorage for current session id', e);
          }
        }
      }));
    }
  });
});
