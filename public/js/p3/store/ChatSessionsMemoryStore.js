define([
  'dojo/_base/declare',
  'dojo/store/Memory'
], function (
  declare,
  Memory
) {
  return declare([Memory], {
    constructor: function(options) {
      this.inherited(arguments);
      this.idProperty = 'session_id';
      this.data = [];
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