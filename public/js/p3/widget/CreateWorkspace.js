define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/CreateWorkspace.html', 'dijit/form/Form',
  'dojo/topic', '../WorkspaceManager'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, Topic, WorkspaceManager
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: 'CreateWorkspace',
    templateString: Template,
    cws: null,
    startup: function () {
      this.saveButton.set('disabled', true);
      this.cws = document.getElementsByClassName('cws')[0];

      this.cws.addEventListener('keyup', this.checkChars);
      this.cws.addEventListener('input', this.checkChars);
      this.cws.button = this.saveButton;
      this.cws.errorMessage = document.getElementsByClassName('charError')[0];
    },
    checkChars: function (evt) {
      document.getElementsByClassName('cws')[0].button.set('disabled', true);

      if (evt.target.value.indexOf('/') === -1 && evt.target.value.indexOf('\\') === -1 && evt.target.value !== '') {
        document.getElementsByClassName('cws')[0].button.set('disabled', false);
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = '&nbsp;';
        return true;
      }
      if (evt.target.value !== '') {
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = 'Workspace name shall not contain any slashes';
      }
      if (evt.target.value === '') {
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = '&nbsp;';
      }
      return false;
    },
    validate: function () {
      var valid = this.inherited(arguments);
      if (valid) {
        this.saveButton.set('disabled', false);
      } else {
        this.saveButton.set('disabled', true);
      }
      return valid;
    },

    onSubmit: function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();

      if (this.validate()) {
        var values = this.getValues();
        domClass.add(this.domNode, 'Working');

        WorkspaceManager.createWorkspace(values.name).then(function (results) {
          domClass.remove(_self.domNode, 'Working');

          Topic.publish('/refreshWorkspace', {});

          on.emit(_self.domNode, 'dialogAction', {
            action: 'close',
            bubbles: true
          });

          Topic.publish('/Notification', {
            message: 'Workspace Created',
            positionDirection: 'bl-up'
          });

        }, function (err) {
          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Error');
          _self.errorMessage.innerHTML = err;

          Topic.publish('/Notification', {
            message: 'Error Creating Workspace',
            type: 'error'
          });
        });
      } else {
        // console.log("Form is incomplete");
      }
    },

    onCancel: function (evt) {
      on.emit(this.domNode, 'dialogAction', {
        action: 'close',
        bubbles: true
      });
    }
  });
});
