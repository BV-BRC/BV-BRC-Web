require({cache:{
'p3/widget/CreateFolder':function(){
define([
  "dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
  "dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
  "dojo/text!./templates/CreateFolder.html", "dijit/form/Form",
  "dojo/topic", "../WorkspaceManager"
], function(declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, Topic, WorkspaceManager) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: "CreateFolder",
    templateString: Template,
    path: "",
    cws: null,
    startup: function() {
      this.saveButton.set("disabled", true);
      this.cws = document.getElementsByClassName('cws')[0];
      //console.log(this.cws);
      this.cws.addEventListener('keyup', this.checkChars);
      this.cws.addEventListener('input', this.checkChars);
      this.cws.button = this.saveButton;
      this.cws.errorMessage = document.getElementsByClassName('charError')[0];
    },
    checkChars: function(evt) {
      document.getElementsByClassName('cws')[0].button.set("disabled", true);
      //console.log('checking for no slashes');
      //console.log(evt.target.value);
      if (evt.target.value.indexOf('/') === -1 && evt.target.value.indexOf('\\') === -1 && evt.target.value !== '') {
        //console.log(document.getElementsByClassName('cws')[0].button);
        document.getElementsByClassName('cws')[0].button.set("disabled", false);
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = '&nbsp;';
        return true
      }
      if (evt.target.value !== '') {
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = 'Folder name shall not contain any slashes';
      }
      if (evt.target.value === '') {
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = '&nbsp;';
      }
      return false;
    },
    _setPathAttr: function(p) {
      if (p && p.charAt(-1) != "/") {
        this.path = p + "/";
      } else {
        this.path = p;
      }
    },
    validate: function() {
      var valid = this.inherited(arguments);
      if (valid) {
        this.saveButton.set("disabled", false)
      } else {
        this.saveButton.set("disabled", true);
      }
      return valid;
    },

    onSubmit: function(evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();

      if (this.validate()) {
        var values = this.getValues();
        domClass.add(this.domNode, "Working");

        WorkspaceManager.createFolder(this.path + values.name).then(function(results) {
          domClass.remove(_self.domNode, "Working");
          var path = "/" + ["workspace", results.path].join("/");
          Topic.publish("/refreshWorkspace", {});
          on.emit(_self.domNode, "dialogAction", {
            action: "close",
            navigate: path,
            bubbles: true
          });

          Topic.publish("/Notification", {
            message: "Folder Created"
          });

        }, function(err) {
          domClass.remove(_self.domNode, "Working");
          domClass.add(_self.domNode, "Error");
          _self.errorMessage.innerHTML = err;

          Topic.publish("/Notification", {
            message: "Error Creating Folder",
            type: "error"
          });
        })
      } else {
        console.log("Form is incomplete");
      }
    },

    onCancel: function(evt) {
      on.emit(this.domNode, "dialogAction", {
        action: "close",
        bubbles: true
      });
    }
  });
});

},
'p3/widget/CreateWorkspace':function(){
define([
  "dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
  "dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
  "dojo/text!./templates/CreateWorkspace.html", "dijit/form/Form",
  "dojo/topic", "../WorkspaceManager"
], function(declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, Topic, WorkspaceManager) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: "CreateWorkspace",
    templateString: Template,
    cws: null,
    startup: function() {
      this.saveButton.set("disabled", true);
      this.cws = document.getElementsByClassName('cws')[0];
      //console.log(this.cws);
      this.cws.addEventListener('keyup', this.checkChars);
      this.cws.addEventListener('input', this.checkChars);
      this.cws.button = this.saveButton;
      this.cws.errorMessage = document.getElementsByClassName('charError')[0];
    },
    checkChars: function(evt) {
      document.getElementsByClassName('cws')[0].button.set("disabled", true);
      //console.log('checking for no slashes');
      //console.log(evt.target.value);
      if (evt.target.value.indexOf('/') === -1 && evt.target.value.indexOf('\\') === -1 && evt.target.value !== '') {
        //console.log(document.getElementsByClassName('cws')[0].button);
        document.getElementsByClassName('cws')[0].button.set("disabled", false);
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = '&nbsp;';
        return true
      }
      if (evt.target.value !== '') {
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = 'Workspace name shall not contain any slashes';
      }
      if (evt.target.value === '') {
        document.getElementsByClassName('cws')[0].errorMessage.innerHTML = '&nbsp;';
      }
      return false;
    },
    validate: function() {
      var valid = this.inherited(arguments);
      if (valid) {
        this.saveButton.set("disabled", false)
      } else {
        this.saveButton.set("disabled", true);
      }
      return valid;
    },

    onSubmit: function(evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();

      if (this.validate()) {
        var values = this.getValues();
        domClass.add(this.domNode, "Working");

        WorkspaceManager.createWorkspace(values.name).then(function(results) {
          domClass.remove(_self.domNode, "Working");
          var path = "/" + ["workspace", results.path].join("/");
          Topic.publish("/refreshWorkspace", {});

          on.emit(_self.domNode, "dialogAction", {
            action: "close",
            bubbles: true
          });

          Topic.publish("/Notification", {
            message: "Wroksapce Created",
            positionDirection: 'bl-up'
          });

        }, function(err) {
          domClass.remove(_self.domNode, "Working");
          domClass.add(_self.domNode, "Error");
          _self.errorMessage.innerHTML = err;

          Topic.publish("/Notification", {
            message: "Error Creating Workspace",
            type: "error"
          });
        })
      } else {
        //console.log("Form is incomplete");
      }
    },

    onCancel: function(evt) {
      on.emit(this.domNode, "dialogAction", {
        action: "close",
        bubbles: true
      });
    }
  });
});

},
'url:p3/widget/templates/CreateFolder.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n  <div>\n    <div class=\"cws\" data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"name\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'My Folder'\"></div>\n  </div>\n  <div class=\"workingMessage messageContainer\">\n    Creating new folder ...\n  </div>\n  <div class=\"errorMessage messageContainer\">\n    <div style=\"font-weight:900;font-size:1.1em;\">Error Creating Folder</div>\n    <p data-dojo-attach-point=\"errorMessage\">Error</p>\n  </div>\n  <div style=\"margin:4px;margin-top:8px;text-align:right;\">\n    <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n    <div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Create Folder</div>\n    <div style=\"text-align:left; margin-top:10px\">\n      <p class=\"charError\" style=\"color:red\">&nbsp;</p>\n    </div>\n  </div>\n</form>\n",
'url:p3/widget/templates/CreateWorkspace.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n  <div>\n    <div class=\"cws\" data-dojo-attach-point=\"wsn\" data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"name\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Workspace',trim:true,placeHolder:'My Workspace'\"></div>\n  </div>\n  <div class=\"workingMessage messageContainer\">\n    Creating new workspace ...\n  </div>\n  <div class=\"errorMessage messageContainer\">\n    <div style=\"font-weight:900;font-size:1.1em;\">Error Creating Workspace</div>\n    <p data-dojo-attach-point=\"errorMessage\">Error</p>\n  </div>\n  <div style=\"margin:4px;margin-top:8px;text-align:right;\">\n    <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n    <div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Create Workspace</div>\n    <div style=\"text-align:left; margin-top:10px\">\n      <p class=\"charError\" style=\"color:red\">&nbsp;</p>\n    </div>\n  </div>\n</form>\n"}});
define("p3/layer/panels", [], 1);
