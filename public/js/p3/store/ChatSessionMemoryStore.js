/**
 * @module p3/store/ChatSessionMemoryStore
 * @description A Memory store implementation for managing chat session messages.
 * Extends dojo/store/Memory to provide storage and retrieval of chat messages.
 *
 * Implementation:
 * - Stores chat messages in memory as an array
 * - Provides methods to add, query, and manage messages
 * - Uses message_id as unique identifier for messages
 * - Handles session title updates
 */
define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dojo/store/Memory', // Parent class for in-memory data store
  'dojo/_base/lang', // Language utilities
  'dojo/topic' // Pub/sub messaging
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
     *
     * Implementation:
     * - Calls parent Memory constructor
     * - Sets message_id as unique identifier
     * - Initializes empty data array
     * - Mixes in any provided options
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
     *
     * Implementation:
     * - Completely replaces existing data array with new messages
     * - Used for bulk loading/resetting of message history
     */
    setData: function(messages) {
      this.data = messages;
    },

    /**
     * @method addMessage
     * @param {Object} message - Single message object to add
     *
     * Implementation:
     * - Appends single message to end of data array
     * - Used for adding individual new messages
     */
    addMessage: function(message) {
      this.data.push(message);
    },

    /**
     * @method addMessages
     * @param {Array} messages - Array of message objects to add
     *
     * Implementation:
     * - Uses spread operator to append multiple messages
     * - More efficient than adding messages one at a time
     * - Maintains message order from input array
     */
    addMessages: function(messages) {
      this.data.push(...messages);
    },

    /**
     * @method clearData
     *
     * Implementation:
     * - Resets data array to empty
     * - Used when starting new chat session
     * - Removes all existing messages
     */
    clearData: function() {
      this.data = [];
    },

    /**
     * @method query
     * @param {Object} query - Query parameters (unused)
     * @returns {Array} Complete array of stored messages
     *
     * Implementation:
     * - Returns entire data array unfiltered
     * - Query param included for API compatibility
     * - Could be extended to support filtering in future
     */
    query: function(query) {
      return this.data;
    },

    /**
     * @method updateSessionTitle
     * @param {string} sessionId - Session identifier
     * @param {string} newTitle - New title for the session
     *
     * Implementation:
     * - Iterates through all messages
     * - Updates title field for messages matching sessionId
     * - Used when user renames a chat session
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
