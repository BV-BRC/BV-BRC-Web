define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/CreateFolder.html', 'dijit/form/Form',
  'dojo/topic', '../WorkspaceManager'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, Topic, WorkspaceManager
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: 'CreateFolder',
    templateString: Template,
    path: '',
    cws: null,
    startup: function () {
      this.saveButton.set('disabled', true);
      this.cws = document.getElementsByClassName('cws')[0];
      // console.log(this.cws);
      this.cws.addEventListener('keyup', this.checkChars);
      this.cws.addEventListener('input', this.checkChars);
      this.cws.button = this.saveButton;
      this.cws.errorMessage = document.getElementsByClassName('charError')[0];
    },
    checkChars: function (evt) {
      document.getElementsByClassName('cws')[0].button.set('disabled', true);
      // console.log('checking for no slashes');
      // console.log(evt.target.value);
      if (evt.target.value.indexOf('/') === -1 && evt.target.value.indexOf('\\') === -1 && evt.target.value !== '') {
        // console.log(document.getElementsByClassName('cws')[0].button);
        document.getElementsByClassName('cws')[0].button.set('disabled', false);
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = '&nbsp;';
        return true;
      }
      if (evt.target.value !== '') {
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = 'Folder name shall not contain any slashes';
      }
      if (evt.target.value === '') {
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = '&nbsp;';
      }
      return false;
    },
    _setPathAttr: function (p) {
      if (p && p.charAt(-1) != '/') {
        this.path = p + '/';
      } else {
        this.path = p;
      }
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

        WorkspaceManager.createFolder(this.path + values.name).then(function (results) {
          domClass.remove(_self.domNode, 'Working');
          var path = '/' + ['workspace', results.path].join('/');
          Topic.publish('/refreshWorkspace', {});
          on.emit(_self.domNode, 'dialogAction', {
            action: 'close',
            navigate: path,
            bubbles: true
          });

          Topic.publish('/Notification', {
            message: 'Folder Created'
          });

        }, function (err) {
          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Error');
          _self.errorMessage.innerHTML = err;

          Topic.publish('/Notification', {
            message: 'Error Creating Folder',
            type: 'error'
          });
        });
      } else {
        console.log('Form is incomplete');
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
