define([
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/on',
  'dojo/_base/lang',
  'dijit/Dialog',
  './CopilotDisplay',
  './ChatSessionController',
  './CopilotApi',
  './ChatSessionOptionsBar'
], function (
  declare,
  WidgetBase,
  TemplatedMixin,
  domConstruct,
  domClass,
  on,
  lang,
  Dialog,
  CopilotDisplay,
  ChatSessionController,
  CopilotAPI,
  ChatSessionOptionsBar
) {

  return declare([WidgetBase, TemplatedMixin], {
    baseClass: 'CopilotController',

    templateString: '<div class="${baseClass}">' +
      '<button class="${baseClass}Button icon-plus" data-dojo-attach-point="buttonNode"></button>' +
      '<div class="${baseClass}Window" data-dojo-attach-point="windowNode"></div>' +
      '</div>',

    // Reference to the chat session controller
    chatController: null,

    // Window state
    isOpen: false,

    // Number of buttons created
    buttonCount: 0,

    postCreate: function() {
      this.inherited(arguments);

      // Create new CopilotAPI
      this.copilotApi = new CopilotAPI({
        user_id: window.App.user.l_id
      });

      // Add click handler to toggle window and create new button
      on(this.buttonNode, 'click', lang.hitch(this, function(evt) {
        this.copilotApi.getModelList().then(lang.hitch(this, function(modelsAndRag) {

          var modelList = JSON.parse(modelsAndRag.models);
          var ragList = JSON.parse(modelsAndRag.vdb_list);

          if (this.buttonCount <= 2) {

            // Add options bar to top of sidebar
            var chatOptionsBar = new ChatSessionOptionsBar({
              region: 'top',
              style: 'height: 30px; ',
              copilotApi: this.copilotAPI,
              modelList: modelList,
              ragList: ragList
            });

            var chatController = new ChatSessionController({
              id: this.id + 'chat-session-controller' + this.buttonCount,
              copilotApi: this.copilotApi,
              optionsBar: chatOptionsBar
            });
            this.createNewButton(chatController);
            this.buttonCount++;
          }
        })).catch(lang.hitch(this, function(err) {
          new Dialog({
            title: "Service Unavailable",
            content: "The BV-BRC Copilot service is currently disabled. Please try again later.",
            style: "width: 300px"
          }).show();
          console.error('Error setting up chat panel:', err);
        }));
      }));

      // Initially hide the window
      domClass.add(this.windowNode, 'hidden');

      // Add styles
      this.addStyles();
    },

    createNewButton: function(chatController) {
      // Create new button with same styling
      var newButton = domConstruct.create('button', {
        className: this.baseClass + 'Button icon-comment',
        style: 'margin-left: 10px;'  // Add some spacing between buttons
      }, this.domNode);

      // Add click handler to new button
      on(newButton, 'click', lang.hitch(this, function(evt) {
        if (!chatController.isOpen) {
          chatController.show(newButton);
        } else {
          chatController.hide();
        }
      }));
    },

    addStyles: function() {
      // Add required CSS styles
      var styleText = [
        '.' + this.baseClass + ' { position: relative; }',
        '.' + this.baseClass + 'Button { width: 40px; height: 40px; border-radius: 5px; border: none; background: var(--blue); color: white; cursor: pointer; font-family: "Font Awesome 5 Free"; font-weight: 900; font-size: 25px; }',
        '.' + this.baseClass + 'Button:hover { background: #1976D2; }',
        '.' + this.baseClass + 'Window { position: absolute; top: 50px; left: 0; width: 350px; height: 500px; background: white; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1000; }',
        '.' + this.baseClass + 'Window.hidden { display: none; }'
      ].join('\n');

      domConstruct.create('style', {
        innerHTML: styleText
      }, document.head);
    }
  });
});
