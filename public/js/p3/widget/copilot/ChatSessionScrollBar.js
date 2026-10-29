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

      // Local set of session IDs known to have an in-flight turn.
      // Survives card re-renders (renderSessions destroys/rebuilds cards).
      this._busySessionIds = {};

      // Per-session background pollers that watch Mongo's active_job_id
      // for a switched-away busy session. Keyed by sessionId; each value
      // is { intervalHandle, startedAt, sawActiveJobId, pollCount }.
      // Started on ChatSession:TurnStarted, stopped on ChatSession:TurnEnded.
      this._sessionPollers = {};
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

      // Track busy state in _busySessionIds and propagate to cards.
      // Also mark the store object so rebuilt cards pick up the state.
      topic.subscribe('ChatSession:TurnStarted', lang.hitch(this, function(data) {
        if (!data || !data.sessionId) { return; }
        this._busySessionIds[data.sessionId] = true;
        // Mark the store object so any future renderSessions picks it up
        this._setStoreBusy(data.sessionId, true);
        var card = this.sessionCards && this.sessionCards[data.sessionId];
        if (card) { card._updateBusyState(true); }
        // Start a background poll so the chip clears when the gateway
        // finishes the turn — even if the user switches sessions and the
        // local SSE stream is aborted (CopilotInput no longer publishes
        // TurnEnded on abort, so this poll is the only completion signal).
        this._startSessionPoller(data.sessionId);
      }));
      topic.subscribe('ChatSession:TurnEnded', lang.hitch(this, function(data) {
        if (!data || !data.sessionId) { return; }
        delete this._busySessionIds[data.sessionId];
        this._setStoreBusy(data.sessionId, false);
        var card = this.sessionCards && this.sessionCards[data.sessionId];
        if (card) { card._updateBusyState(false); }
        this._stopSessionPoller(data.sessionId);
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
      // Destroy existing card widgets to prevent topic/event handler leaks
      if (this.sessionCards) {
        for (var id in this.sessionCards) {
          if (this.sessionCards[id] && typeof this.sessionCards[id].destroyRecursive === 'function') {
            this.sessionCards[id].destroyRecursive();
          }
        }
      }

      // Clear existing DOM content
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

      // Restore busy state on rebuilt cards from the local _busySessionIds set
      // (covers the case where renderSessions is triggered by New Chat / title regen / delete)
      this._restoreBusyStates();

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
     * @method _highlightInPlace
     * Applies highlight styling to a session card without scrolling.
     * Used after re-render triggered by events that should not move the viewport
     * (e.g. title change, Load More).
     * @param {string} sessionId - ID of session to highlight
     */
    _highlightInPlace: function(sessionId) {
      this.currentHighlighted = sessionId || null;
      if (!sessionId || !this.sessionCards) { return; }
      this.clearHighlight();
      var sessionCard = this.sessionCards[sessionId];
      if (sessionCard && sessionCard.containerNode) {
        sessionCard.containerNode.style.backgroundColor = '#e6f7ff';
        sessionCard.containerNode.style.borderLeft = '3px solid #1890ff';
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

      // If there's a session to highlight after reload, do it now.
      // Skip scrollIntoView when appending via Load More — the caller
      // restores scrollTop itself.
      if (this._highlightAfterReload) {
        // Use setTimeout to ensure the DOM is updated before highlighting
        var hlId = this._highlightAfterReload;
        this._highlightAfterReload = null;
        setTimeout(lang.hitch(this, function() {
          this.highlightSession(hlId);
        }), 300);
      } else if (this.currentHighlighted && !this._isLoadMore) {
        // Re-apply existing highlight after rerender (not on Load More)
        setTimeout(lang.hitch(this, function() {
          this._highlightInPlace(this.currentHighlighted);
        }), 0);
      }
    },

    _refreshSessions: function() {
      var storeData = this.sessionsStore.query();

      // If we already have sessions cached, re-render from the store.
      // Do NOT reset the pagination cursor — it must stay in sync with
      // how many pages have been fetched from the API.
      if (storeData && storeData.length > 0) {
        // Sync local pagination state from the shared store
        this.offset = this.sessionsStore.paginationOffset;
        this.hasMore = this.sessionsStore.paginationHasMore;
        this.setSessions(storeData);
        this._highlightSavedSession();
        return;
      }

      // Load first page from API
      this.copilotApi.getUserSessions(this.pageSize, 0).then(lang.hitch(this, function(res) {
        var sessions = res.sessions || [];
        this.hasMore = res.has_more;
        this.offset = sessions.length;

        // Persist pagination state on the shared store
        this.sessionsStore.paginationOffset = this.offset;
        this.sessionsStore.paginationHasMore = this.hasMore;

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
      var prevScrollTop = this.scrollContainer.scrollTop;

      this.copilotApi.getUserSessions(this.pageSize, this.offset).then(lang.hitch(this, function(res) {
        var newSessions = res.sessions || [];
        this.hasMore = res.has_more;
        // Advance offset by the API page size (what we asked for), not
        // the unique count, so the next page picks up where this one left off.
        this.offset += newSessions.length;

        // Persist pagination state on the shared store
        this.sessionsStore.paginationOffset = this.offset;
        this.sessionsStore.paginationHasMore = this.hasMore;

        // Merge, deduplicating by session_id (existing entries win)
        this.sessionsStore.mergeSessions(newSessions);
        // Re-render from the canonical store data
        this._isLoadMore = true;
        this.setSessions(this.sessionsStore.query());
        this._isLoadMore = false;

        // Restore scroll position after DOM update
        setTimeout(lang.hitch(this, function() {
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
    },

    /**
     * Mark or clear the active_job_id on the in-memory store session object
     * so that future card rebuilds see the busy flag.
     * @param {string} sessionId
     * @param {boolean} busy
     */
    _setStoreBusy: function(sessionId, busy) {
      if (!this.sessionsStore) { return; }
      var session = this.sessionsStore.get(sessionId);
      if (session) {
        if (busy) {
          session.active_job_id = session.active_job_id || 'local';
        } else {
          delete session.active_job_id;
        }
      }
    },

    /**
     * After renderSessions rebuilds all cards, re-apply busy state from
     * _busySessionIds (local tracking) and session.active_job_id (API data).
     */
    _restoreBusyStates: function() {
      for (var id in this.sessionCards) {
        var card = this.sessionCards[id];
        var isBusy = !!(this._busySessionIds[id] || (card.session && card.session.active_job_id));
        if (isBusy) {
          card._updateBusyState(true);
        }
      }
    },

    /**
     * Start a background poll for `sessionId` that watches Mongo's
     * active_job_id and publishes ChatSession:TurnEnded when it clears.
     *
     * Fires every 5s. Caps at ~6 minutes (72 polls).
     *
     * False-positive guard: on the first tick, active_job_id may still be
     * null because setSessionActiveJob (chatRunner.js:187) races the poll.
     * Require either one non-null observation OR ≥ 8s elapsed before
     * treating a null as "done".
     *
     * Idempotent: calling again for a session that already has a poller
     * is a no-op.
     *
     * @param {string} sessionId
     */
    _startSessionPoller: function(sessionId) {
      if (!sessionId || this._sessionPollers[sessionId]) { return; }

      var _self = this;
      var state = {
        startedAt: Date.now(),
        sawActiveJobId: false,
        pollCount: 0,
        intervalHandle: null
      };
      var POLL_INTERVAL_MS = 5000;
      var MAX_POLLS = 72; // ~6 minutes
      var MIN_ELAPSED_BEFORE_TRUSTING_NULL_MS = 8000;

      state.intervalHandle = setInterval(function() {
        state.pollCount++;
        if (state.pollCount > MAX_POLLS) {
          console.warn('[ChatSessionScrollBar] Session poller cap reached, stopping', { sessionId: sessionId });
          topic.publish('ChatSession:TurnEnded', { sessionId: sessionId });
          return;
        }
        if (!_self.copilotApi || typeof _self.copilotApi.getSessionMessages !== 'function') {
          return;
        }
        _self.copilotApi.getSessionMessages(sessionId).then(function(res) {
          // Poller may have been cancelled between request and response.
          if (!_self._sessionPollers[sessionId]) { return; }
          var jobId = res && res.active_job_id;
          if (jobId) {
            state.sawActiveJobId = true;
            return;
          }
          // active_job_id is null. Trust it only if we've either seen it
          // non-null once or waited past the false-positive window.
          var elapsed = Date.now() - state.startedAt;
          if (state.sawActiveJobId || elapsed >= MIN_ELAPSED_BEFORE_TRUSTING_NULL_MS) {
            topic.publish('ChatSession:TurnEnded', { sessionId: sessionId });
            // If the user happens to be viewing this session, refresh it
            // so the newly-persisted assistant message appears.
            topic.publish('RefreshSession', sessionId);
          }
        }).catch(function() {
          // Ignore transient errors; try again next tick.
        });
      }, POLL_INTERVAL_MS);

      this._sessionPollers[sessionId] = state;
    },

    /**
     * Stop and remove the background poller for `sessionId` (if any).
     * @param {string} sessionId
     */
    _stopSessionPoller: function(sessionId) {
      var state = this._sessionPollers[sessionId];
      if (!state) { return; }
      if (state.intervalHandle) {
        clearInterval(state.intervalHandle);
      }
      delete this._sessionPollers[sessionId];
    }
  });
});
