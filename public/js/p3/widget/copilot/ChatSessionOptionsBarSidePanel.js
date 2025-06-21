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
         * Override to only show the New Chat button, but inherit parent initialization
         */
        postCreate: function() {
            // Call parent postCreate to inherit all initialization including bvbrc_helpdesk default
            this.inherited(arguments);

            // Clear the container that was created by parent
            this.containerNode.innerHTML = '';

            // Create container for the New Chat button only
            var buttonsContainer = domConstruct.create('div', {
                class: 'sidePanelButtonContainer'
            }, this.containerNode);

            // Add New Chat button with hover effects
            this.newChatButton = new Button({
                label: 'New Chat',
                style: 'height: 30px; margin-right: 10px; margin-top: 10px;',
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