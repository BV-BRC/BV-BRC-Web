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
    'dojo/dom-style',
    'dojo/dom-class',
    'dijit/form/Button',
    './ChatSessionOptionsBar'
], function (
    declare,
    lang,
    topic,
    domConstruct,
    domStyle,
    domClass,
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

        baseClass: 'ChatSessionOptionsBarSidePanel',

        style: 'overflow: hidden;',

        /**
         * Called after widget creation
         * Override to only show the New Chat button, but inherit parent initialization
         */
        postCreate: function() {
            // Call parent postCreate to inherit all initialization including bvbrc_helpdesk default
            this.inherited(arguments);

            // Remove the inherited "-extended" CSS classes from parent
            domClass.remove(this.containerNode, 'ChatSessionOptionsBar-extended-one');
            domClass.remove(this.containerNode, 'ChatSessionOptionsBar-extended-two');

            // Clear the container that was created by parent
            this.containerNode.innerHTML = '';

            // Create container for the New Chat button only
            var buttonsContainer = domConstruct.create('div', {
                class: 'sidePanelButtonContainer'
            }, this.containerNode);

            // Add New Chat button with hover effects
            this.newChatButton = new Button({
                label: 'New Chat',
                style: 'margin-left: 3px; margin-top: 2px; ',
                onClick: lang.hitch(this, function() {
                    // Create a new chat session immediately
                    if (this.copilotApi) {
                        // Publish the createNewChatSession topic
                        topic.publish('createNewChatSession');
                    }
                })
            });
            this.newChatButton.placeAt(buttonsContainer);
        }
    });
});