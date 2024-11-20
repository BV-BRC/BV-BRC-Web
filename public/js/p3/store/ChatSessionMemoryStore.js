/**
 * @module p3/store/ChatSessionMemoryStore
 * @description A Memory store implementation for managing chat session messages.
 * Extends dojo/store/Memory to provide storage and retrieval of chat messages.
 */
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
     * @constructor
     * @param {Object} options - Configuration options for the store
     * @description Initializes the chat session memory store.
     * Sets up message_id as the unique identifier property and initializes an empty data array.
     * Mixes in any provided options.
     */
    constructor: function(options) {
      this.inherited(arguments);
      this.idProperty = 'message_id'; // Unique identifier for messages
      this.data = []; // Array to store chat messages
      declare.safeMixin(this, options);
    },

    /**
     * @method setData
     * @param {Array} messages - Array of message objects to store
     * @description Replaces the entire store contents with the provided messages array
     */
    setData: function(messages) {
      this.data = messages;
    },

    /**
     * @method addMessage
     * @param {Object} message - Single message object to add
     * @description Appends a single message to the store
     */
    addMessage: function(message) {
      this.data.push(message);
    },

    /**
     * @method addMessages
     * @param {Array} messages - Array of message objects to add
     * @description Appends multiple messages to the store using spread operator
     */
    addMessages: function(messages) {
      this.data.push(...messages);
    },

    /**
     * @method clearData
     * @description Removes all messages from the store by resetting to empty array
     */
    clearData: function() {
      this.data = [];
    },

    /**
     * @method query
     * @param {Object} query - Query parameters (unused in current implementation)
     * @returns {Array} The complete array of stored messages
     * @description Returns all messages in the store. Query parameter included for API compatibility
     * but currently unused.
     */
    query: function(query) {
      return this.data;
    },

    /**
     * @method updateSessionTitle
     * @param {string} sessionId - Session identifier
     * @param {string} newTitle - New title for the session
     * @description Updates the title of a chat session
     */
    updateSessionTitle: function(sessionId, newTitle) {
      this.data.forEach(message => {
        if (message.session_id === sessionId) {
          message.title = newTitle;
        }
      });
    }
  });
});
