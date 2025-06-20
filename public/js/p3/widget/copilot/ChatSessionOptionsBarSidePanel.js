/**
 * @module p3/widget/ChatSessionOptionsBarSidePanel
 * @description A simple extension of ChatSessionOptionsBar that only shows the New Chat button.
 * This widget inherits from ChatSessionOptionsBar but overrides postCreate to provide a minimal interface.
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/topic',
    'dojo/dom-construct',
    'dijit/form/Button',
    './ChatSessionOptionsBar'
], function (
    declare,
    lang,
    topic,
    domConstruct,
    Button,
    ChatSessionOptionsBar
) {
    /**
     * @class ChatSessionOptionsBarSidePanel
     * @extends {p3/widget/copilot/ChatSessionOptionsBar}
     *
     * Minimal extension of ChatSessionOptionsBar that only shows the New Chat button.
     */
    return declare([ChatSessionOptionsBar], {

        /**
         * Called after widget creation
         * Override to only show the New Chat button
         */
        postCreate: function() {
            // Initialize CopilotAPI if not provided
            if (!this.copilotApi) {
                this.copilotApi = new CopilotAPI({
                    user_id: window.App.user ? window.App.user.l_id : null
                });
            }

            // Create container for the New Chat button only
            var buttonsContainer = domConstruct.create('div', {
                style: 'display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; margin-top: 10px; font-size: 0.9em; gap: 2px;'
            }, this.containerNode);

            // Add New Chat button with hover effects
            this.newChatButton = new Button({
                label: 'New Chat',
                style: 'height: 30px; margin-right: 10px;',
                onClick: lang.hitch(this, function() {
                    // Create a new chat session immediately
                    if (this.copilotApi) {
                        // Publish reloadUserSessions to remove session highlight
                        topic.publish('reloadUserSessions');

                        // Publish the createNewChatSession topic
                        topic.publish('createNewChatSession');
                    }
                })
            });
            this.newChatButton.placeAt(buttonsContainer);
        }
    });
});