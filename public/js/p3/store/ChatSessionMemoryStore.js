define([
  'dojo/_base/declare',
  'dojo/store/Memory',
  'dojo/_base/lang',
  'dojo/topic'
], function (
  declare,
  Memory,
  lang,
  topic
) {
  return declare([Memory], {

    /**
     * Constructor for the ChatSessionMemoryStore
     * Initializes the store with message_id as the idProperty and sets up a dictionary to store chats by session
     * Subscribes to ChatSessionStore.changeData topic to handle incoming message updates
     */
    constructor: function(options) {
      this.inherited(arguments);
      this.idProperty = 'message_id'; // Changed to 'message_id' to match API response
      this.data = []; // Array to store chats by session ID
      declare.safeMixin(this, options);
    },

    /**
     * Sets chat message data
     * @param {Array} messages - Array of message objects to add
     */
    setData: function(messages) {
        this.data = messages;
    },

    addMessage: function(message) {
      this.data.push(message);
    },

    addMessages: function(messages) {
      this.data.push(...messages);
    },

    clearData: function() {
      this.data = [];
    },

    query: function(query) {
      return this.data;
    }
  });
});
