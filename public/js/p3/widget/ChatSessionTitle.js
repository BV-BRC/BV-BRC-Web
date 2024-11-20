/**
 * @module p3/widget/ChatSessionTitle
 * @description A ContentPane-based widget that displays and manages the title of a chat session.
 * Provides functionality to display, edit, and update chat session titles.
 */
define([
  'dojo/_base/declare',
  'dijit/layout/ContentPane',
  'dojo/dom-construct',
  'dojo/on',
  'dojo/topic',
  'dojo/_base/lang',
  'dijit/form/TextBox'
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
   */
  return declare([ContentPane], {

    /** @property {Object} copilotApi - Reference to the CopilotAPI instance */
    copilotApi: null,

    /** @property {string} sessionId - Current chat session identifier */
    sessionId: null,

    /** @property {string} title - Current title of the chat session */
    title: 'New Chat',

    /** @property {boolean} isEditing - Flag indicating if title is being edited */
    isEditing: false,

    /** @property {boolean} editingEnabled - Flag indicating if editing is enabled */
    editingEnabled: true,

    /**
     * @constructor
     * @param {Object} args - Configuration arguments
     * @description Initializes the widget and mixes in provided options
     */
    constructor: function(args) {
      declare.safeMixin(this, args);
    },

    /**
     * @method postCreate
     * @description Sets up the widget after creation
     * Creates title display and edit functionality
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
     * @method createTitleDisplay
     * @description Creates the title display element
     */
    createTitleDisplay: function() {
      this.titleDisplay = domConstruct.create('div', {
        innerHTML: this.title,
        style: 'cursor: pointer; padding: 5px; flex-grow: 1; font-size: 1.2em; font-weight: bold;'
      }, this.titleContainer);

      on(this.titleDisplay, 'click', lang.hitch(this, 'startEditing'));
    },

    /**
     * @method createTitleEditor
     * @description Creates the title editor input field
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
          this.saveTitle();
        } else if (evt.keyCode === 27) { // Escape
          this.cancelEditing();
        }
      }));

      // Handle blur event
      on(this.titleEditor, 'blur', lang.hitch(this, 'saveTitle'));
    },

    /**
     * @method startEditing
     * @description Switches to edit mode for the title
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
     * @method saveTitle
     * @description Saves the edited title
     */
    saveTitle: function() {
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
     * @method cancelEditing
     * @description Cancels title editing mode
     */
    cancelEditing: function() {
      this.isEditing = false;
      this.titleEditor.domNode.style.display = 'none';
      this.titleDisplay.style.display = 'block';
    },

    /**
     * @method updateTitle
     * @param {string} newTitle - New title to display
     * @description Updates the displayed title
     */
    updateTitle: function(newTitle) {
      this.title = newTitle;
      this.titleDisplay.innerHTML = newTitle;
    },

    /**
     * @method onSessionSelected
     * @param {Object} sessionData - Data about the selected session
     * @description Handles session selection events
     */
    onSessionSelected: function(sessionData) {
      this.sessionId = sessionData.session_id;
      this.updateTitle(sessionData.title || 'New Chat');
    },

    /**
     * @method startNewChat
     * @description Starts a new chat with a new title
     */
    startNewChat: function(sessionId) {
      if (sessionId) {
        this.sessionId = sessionId;
        this.updateTitle('New Chat');
      }
      this.cancelEditing();
    },

    /**
     * @method setSessionId
     * @param {string} sessionId - Session identifier
     * @description Sets the session identifier
     */
    setSessionId: function(sessionId) {
      this.sessionId = sessionId;
    },

    /**
     * @method enableEditing
     * @description Enables title editing functionality
     */
    enableEditing: function() {
      this.editingEnabled = true;
      this.titleDisplay.style.cursor = 'pointer';
    },

    /**
     * @method disableEditing
     * @description Disables title editing functionality
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
