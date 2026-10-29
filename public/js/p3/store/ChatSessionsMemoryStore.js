define([
  'dojo/_base/declare',
  'dojo/store/Memory'
], function (
  declare,
  Memory
) {
  return declare([Memory], {
    /** API pagination cursor — shared across all ScrollBar instances. */
    paginationOffset: 0,

    /** Whether the API has more pages beyond the current offset. */
    paginationHasMore: true,

    constructor: function(options) {
      this.inherited(arguments);
      this.idProperty = 'session_id';
      this.data = [];
      this.paginationOffset = 0;
      this.paginationHasMore = true;
      declare.safeMixin(this, options);
    },

    // Replace entire sessions list
    setSessions: function(sessions) {
      var sanitized = (sessions || []).map(function(s) {
        if (s && s.messages) {
          delete s.messages;
        }
        return s;
      });
      this.data = sanitized;
      this._rebuildIndex();
    },

    /**
     * Merge a page of sessions into the store, deduplicating by session_id.
     * Existing entries (earlier / newer) take precedence — new entries are
     * only appended if their id is not already present.
     * @param {Array} newSessions - The page returned by the API
     */
    mergeSessions: function(newSessions) {
      if (!newSessions || !newSessions.length) { return; }
      var existing = {};
      this.data.forEach(function(s) { existing[s.session_id] = true; });
      var toAdd = [];
      newSessions.forEach(function(s) {
        if (s && s.messages) { delete s.messages; }
        if (s && !existing[s.session_id]) {
          toAdd.push(s);
        }
      });
      this.data = this.data.concat(toAdd);
      this._rebuildIndex();
    },

    // Add or move session to front (most recent first)
    addSession: function(session) {
      if (!session) return;
      if (session.messages) delete session.messages;
      this.data = this.data.filter(function(s) { return s.session_id !== session.session_id; });
      this.data.unshift(session);
      this._rebuildIndex();
    },

    removeSession: function(sessionId) {
      this.data = this.data.filter(function(s) { return s.session_id !== sessionId; });
      this._rebuildIndex();
    },

    updateSessionTitle: function(sessionId, newTitle) {
      this.data.forEach(function(s) { if (s.session_id === sessionId) { s.title = newTitle; } });
    },

    _rebuildIndex: function() {
      this.index = {};
      for (var i = 0; i < this.data.length; i++) {
        this.index[this.data[i].session_id] = i;
      }
    }
  });
});