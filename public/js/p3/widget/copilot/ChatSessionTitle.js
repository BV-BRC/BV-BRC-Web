/**
 * @module p3/widget/ChatSessionTitle
 * @description A ContentPane-based widget that displays and manages the title of a chat session.
 * Provides functionality to display, edit, and update chat session titles.
 *
 * Implementation:
 * - Extends ContentPane to provide title display and editing capabilities
 * - Uses TextBox widget for inline title editing
 * - Handles keyboard events for save/cancel during editing
 * - Publishes title change events for other widgets to subscribe to
 * - Provides API for enabling/disabling title editing
 */
define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dijit/layout/ContentPane', // Parent class for layout container
  'dojo/dom-construct', // DOM manipulation utilities
  'dojo/on', // Event handling
  'dojo/topic', // Pub/sub messaging
  'dojo/_base/lang', // Language utilities like hitch
  'dijit/form/TextBox' // Text input widget
], function (
  declare,
  ContentPane,
  domConstruct,
  on,
  topic,
  lang,
  TextBox
) {
  /**
   * @class ChatSessionTitle
   * @extends {dijit/layout/ContentPane}
   *
   * Main widget class that manages chat session title display and editing.
   * Handles title updates, editing state, and user interactions.
   */
  return declare([ContentPane], {

    /** Reference to the CopilotAPI instance for backend operations */
    copilotApi: null,

    /** Current chat session identifier */
    sessionId: null,

    /** Current title text of the chat session */
    title: 'New Chat',

    /** Flag indicating if title is currently in edit mode */
    isEditing: false,

    /** Flag controlling whether title editing is allowed */
    editingEnabled: true,

    /**
     * Constructor that initializes the widget
     * Mixes in any provided configuration options using safeMixin
     */
    constructor: function(args) {
      declare.safeMixin(this, args);
    },

    /**
     * Sets up the widget after DOM creation
     * - Creates main title container with flex layout
     * - Initializes title display and editor components
     * - Sets up event subscriptions for session changes
     */
    postCreate: function() {
      this.inherited(arguments);

      // Create container for title elements
      this.titleContainer = domConstruct.create('div', {
        class: 'chat-session-title',
        style: 'display: flex; align-items: center; padding: 5px;'
      }, this.containerNode);

      this.createTitleDisplay();
      this.createTitleEditor();

      // Subscribe to relevant topics
      topic.subscribe('ChatSessionSelected', lang.hitch(this, 'onSessionSelected'));
      topic.subscribe('ChatSessionTitleUpdated', lang.hitch(this, 'updateTitle'));
    },

    /**
     * Creates the title display element
     * - Adds clickable div showing current title
     * - Sets up click handler to start editing
     * - Uses flex layout to fill available space
     */
    createTitleDisplay: function() {
      this.titleDisplay = domConstruct.create('div', {
        innerHTML: this.title,
        style: 'cursor: pointer; padding: 5px; flex-grow: 1; font-size: 1.2em; font-weight: bold;'
      }, this.titleContainer);

      on(this.titleDisplay, 'click', lang.hitch(this, 'startEditing'));
    },

    /**
     * Creates the title editor input field
     * - Uses TextBox widget for editing
     * - Initially hidden until edit mode activated
     * - Handles Enter to save and Escape to cancel
     * - Auto-saves on blur event
     */
    createTitleEditor: function() {
      this.titleEditor = new TextBox({
        style: 'display: none; width: 100%; font-size: 1.2em; font-weight: bold;',
        maxLength: 100
      });
      this.titleEditor.placeAt(this.titleContainer);

      // Handle save on Enter and cancel on Escape
      on(this.titleEditor, 'keydown', lang.hitch(this, function(evt) {
        if (evt.keyCode === 13) { // Enter
          this.saveTitleEditor();
        } else if (evt.keyCode === 27) { // Escape
          this.cancelEditing();
        }
      }));

      // Handle blur event
      on(this.titleEditor, 'blur', lang.hitch(this, 'saveTitleEditor'));
    },

    /**
     * Activates title editing mode
     * - Shows editor and hides display
     * - Sets focus to editor
     * - Only works if session exists and editing enabled
     */
    startEditing: function() {
      if (!this.sessionId || !this.editingEnabled) return;

      this.isEditing = true;
      this.titleDisplay.style.display = 'none';
      this.titleEditor.set('value', this.title);
      this.titleEditor.domNode.style.display = 'block';
      this.titleEditor.focus();
    },

    /**
     * Saves changes from title editor
     * - Validates new title is not empty and changed
     * - Calls API to update title
     * - Publishes title change event
     * - Handles errors via topic publish
     */
    saveTitleEditor: function() {
      if (!this.isEditing) return;

      var newTitle = this.titleEditor.get('value').trim();
      if (newTitle && newTitle !== this.title) {
        this.copilotApi.updateSessionTitle(this.sessionId, newTitle).then(lang.hitch(this, function() {
          this.updateTitle(newTitle);
          topic.publish('ChatSessionTitleChanged', {
            sessionId: this.sessionId,
            title: newTitle
          });
        }), lang.hitch(this, function(error) {
          topic.publish('UpdateSessionTitleError', error);
        }));
      }
      this.cancelEditing();
    },

    /**
     * Saves current title to session
     * - Makes API call to update title
     * - Publishes title change event
     * - Handles errors via topic publish
     */
    saveTitle: function() {
      if (!this.sessionId) return;

      this.copilotApi.updateSessionTitle(this.sessionId, this.title).then(lang.hitch(this, function() {
        topic.publish('ChatSessionTitleChanged', {
          sessionId: this.sessionId,
          title: this.title
        });
      }), lang.hitch(this, function(error) {
        topic.publish('UpdateSessionTitleError', error);
      }));
    },

    /**
     * Cancels title editing mode
     * - Hides editor and shows display
     * - Resets editing state
     */
    cancelEditing: function() {
      this.isEditing = false;
      this.titleEditor.domNode.style.display = 'none';
      this.titleDisplay.style.display = 'block';
    },

    /**
     * Updates displayed title text
     * - Sets title property
     * - Updates display element HTML
     */
    updateTitle: function(newTitle) {
      this.title = newTitle;
      this.titleDisplay.innerHTML = newTitle;
    },

    /**
     * Handles session selection events
     * - Updates session ID and title
     * - Uses default title if none provided
     */
    onSessionSelected: function(sessionData) {
      this.sessionId = sessionData.session_id;
      this.updateTitle(sessionData.title || 'New Chat');
    },

    /**
     * Starts new chat session
     * - Sets session ID if provided
     * - Resets title to default
     * - Cancels any active editing
     */
    startNewChat: function(sessionId) {
      if (sessionId) {
        this.sessionId = sessionId;
        this.updateTitle('New Chat');
      }
      this.cancelEditing();
    },

    /**
     * Sets the session identifier
     * Simple setter for sessionId property
     */
    setSessionId: function(sessionId) {
      this.sessionId = sessionId;
    },

    /**
     * Enables title editing functionality
     * - Sets editing flag
     * - Updates cursor style to indicate clickable
     */
    enableEditing: function() {
      this.editingEnabled = true;
      this.titleDisplay.style.cursor = 'pointer';
    },

    /**
     * Disables title editing functionality
     * - Clears editing flag
     * - Updates cursor style
     * - Cancels any active editing
     */
    disableEditing: function() {
      this.editingEnabled = false;
      this.titleDisplay.style.cursor = 'default';
      if (this.isEditing) {
        this.cancelEditing();
      }
    }
  });
});
