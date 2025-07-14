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
  'dojo/on',
  'dojo/dom-style',
  '../../store/ChatSessionsMemoryStore', // Memory store for sessions
  './ChatSessionScrollCard' // Individual session card widget
], function (
  declare, ContentPane, domConstruct, lang, topic, on, domStyle, ChatSessionsMemoryStore, ChatSessionScrollCard
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
    currentHighlighted: null,

    /**
     * @property {boolean} hasMore
     * Indicates if there are more sessions available to load.
     */
    hasMore: true,

    /**
     * @property {number} pageSize
     * Number of sessions to fetch per page.
     */
    pageSize: 20,

    /**
     * @property {number} offset
     * The current offset for pagination.
     */
    offset: 0,

    /**
     * @property {HTMLElement} loadMoreButton
     * The button element for loading more sessions.
     */
    loadMoreButton: null,

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

      // Pagination related defaults
      this.pageSize = 20;
      this.offset = 0;
      this.hasMore = true;

      // Initialize (or retrieve) the shared sessions memory store
      if (window && window.App) {
        if (!window.App.chatSessionsStore) {
          window.App.chatSessionsStore = new ChatSessionsMemoryStore();
        }
        this.sessionsStore = window.App.chatSessionsStore;
      } else {
        // Fallback – unlikely in BV-BRC context
        this.sessionsStore = new ChatSessionsMemoryStore();
      }

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

      // Initial load
      this._refreshSessions();

      topic.subscribe('reloadUserSessions', lang.hitch(this, function(data) {
        if (data && data.highlightSessionId) {
          // Store the session ID to highlight after reload
          this._highlightAfterReload = data.highlightSessionId;
        }
        this._refreshSessions();
      }));

      // Subscribe to session selection events to highlight the selected session
      topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
        this.highlightSession(data.sessionId);
      }));

      // Subscribe to title change events so the scroll card updates immediately
      topic.subscribe('ChatSessionTitleChanged', lang.hitch(this, function(data) {
        if (!data || !data.sessionId) {
          return;
        }

        // 1. Update local sessions list
        for (var i = 0; i < this.sessions_list.length; i++) {
          if (this.sessions_list[i].session_id === data.sessionId) {
            this.sessions_list[i].title = data.title;
            break;
          }
        }

        // 2. Update the in-memory store (shared with other widgets)
        if (this.sessionsStore && this.sessionsStore.updateSessionTitle) {
          this.sessionsStore.updateSessionTitle(data.sessionId, data.title);
        }

        // 3. Update the title on the existing card UI if it has already been rendered
        var card = this.sessionCards[data.sessionId];
        if (card && card.titleNode) {
          card.session.title = data.title; // keep card.session in sync
          card.titleNode.innerHTML = data.title;
        }
      }));

      // When a brand-new chat is started, nothing should be highlighted yet
      topic.subscribe('createNewChatSession', lang.hitch(this, function() {
        this._highlightAfterReload = null;
        this.currentHighlighted = null;
        this.clearHighlight();

        // Remove the persisted current-session-id so automatic highlight won't find it
        try {
          if (window && window.localStorage) {
            localStorage.removeItem('copilot-current-session-id');
          }
        } catch (e) {
          console.warn('Unable to clear localStorage current session id', e);
        }
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

      // Ensure the load-more button visibility/state is updated after rendering
      this._renderLoadMoreButton();
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
      this.currentHighlighted = sessionId || null;
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

      // Ensure the load-more button visibility/state is updated after rendering
      this._renderLoadMoreButton();

      // If there's a session to highlight after reload, do it now
      if (this._highlightAfterReload) {
        // Use setTimeout to ensure the DOM is updated before highlighting
        setTimeout(lang.hitch(this, function() {
          this.highlightSession(this._highlightAfterReload);
          this._highlightAfterReload = null; // Clear the pending highlight
        }), 300);
      } else if (this.currentHighlighted) {
        // Re-apply existing highlight after rerender
        setTimeout(lang.hitch(this, function() {
          this.highlightSession(this.currentHighlighted);
        }), 0);
      }
    },

    _refreshSessions: function() {
      // Reset pagination state on a full refresh
      this.offset = 0;

      var storeData = this.sessionsStore.query();

      // If we already have sessions cached, use them directly (but still honour pagination)
      if (storeData && storeData.length > 0) {
        this.setSessions(storeData);
        this._highlightSavedSession();
        return;
      }

      // Load first page from API
      this.copilotApi.getUserSessions(this.pageSize, this.offset).then(lang.hitch(this, function(res) {
        var sessions = res.sessions || [];
        this.hasMore = res.has_more;
        this.offset += sessions.length;

        this.sessionsStore.setSessions(sessions);
        this.setSessions(sessions);
        this._highlightSavedSession();
      }));
    },

    /*
     * Loads the next page of sessions when the user presses the "Load More" button.
     */
    _loadMoreSessions: function() {
      if (!this.hasMore) { return; }

      // Capture the current scroll position so we can restore it after the list re-renders.
      // Using the absolute scrollTop value (distance from the top) avoids the previous
      // behaviour where the view jumped to the bottom after new sessions were appended.
      var prevScrollTop = this.scrollContainer.scrollTop;

      this.copilotApi.getUserSessions(this.pageSize, this.offset).then(lang.hitch(this, function(res) {
        var newSessions = res.sessions || [];
        this.hasMore = res.has_more;
        this.offset += newSessions.length;

        // Merge with existing list without duplicates
        var combined = this.sessions_list.concat(newSessions);
        this.sessionsStore.setSessions(combined);
        this.setSessions(combined);

        // Using a timeout ensures the DOM has finished re-rendering before we attempt to restore the scroll position.
        setTimeout(lang.hitch(this, function() {
          // Restore the previous scroll position so the user’s viewport remains stable.
          this.scrollContainer.scrollTop = prevScrollTop;
        }), 0);
      }));
    },

    /*
     * Creates / updates the Load-More button based on `hasMore` flag.
     */
    _renderLoadMoreButton: function() {
      if (!this.loadMoreButton) {
        // Create the button once and wire the click handler
        this.loadMoreButton = domConstruct.create('button', {
          innerHTML: 'Load More Sessions',
          class: 'chatLoadMoreButton',
          style: 'width: 100%; padding: 6px; margin-top: 4px; background-color: #ffffff; border: 1px solid #ccc; cursor: pointer;'
        }, this.scrollContainer);

        on(this.loadMoreButton, 'click', lang.hitch(this, this._loadMoreSessions));
      }

      // Ensure the button is inside the container (empty() removes children)
      if (this.loadMoreButton && this.loadMoreButton.parentNode !== this.scrollContainer) {
        this.scrollContainer.appendChild(this.loadMoreButton);
      }

      // Toggle visibility
      domStyle.set(this.loadMoreButton, 'display', this.hasMore ? 'block' : 'none');
    },

    _highlightSavedSession: function() {
      if (this._highlightAfterReload) {
        return; // Will be handled in setSessions
      }

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
  });
});
