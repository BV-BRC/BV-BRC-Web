require({cache:{
'url:p3/widget/app/templates/Sleep.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width: 420px;margin:auto;margin-top: 10px;padding:10px;\">\n    <h2>Sleep</h2>\n    <p>Sleep Application For Testing Purposes</p>\n    <div style=\"margin-top:10px;text-align:left\">\n      <label>Sleep Time</label><br>\n      <input data-dojo-type=\"dijit/form/NumberSpinner\" value=\"10\" name=\"sleep_time\" require=\"true\" data-dojo-props=\"constraints:{min:1,max:100}\" />\n    </div>\n    <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n      Submitting Sleep Job\n    </div>\n    <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n      Error Submitting Job\n    </div>\n    <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n      Sleep Job has been queued.\n    </div>\n    <div style=\"margin-top: 10px; text-align:center;\">\n      <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n      <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n      <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Run</div>\n    </div>\n  </div>\n</form>\n\n"}});
define("p3/widget/app/AppBase", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/Sleep.html', 'dijit/form/Form', 'p3/widget/WorkspaceObjectSelector', 'dojo/topic', 'dojo/_base/lang',
  '../../util/PathJoin',
  'dijit/Dialog', 'dojo/request', 'dojo/dom-construct', 'dojo/query', 'dijit/TooltipDialog', 'dijit/popup', 'dijit/registry', 'dojo/dom'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, WorkspaceObjectSelector, Topic, lang,
  PathJoin,
  Dialog, xhr, domConstruct, query, TooltipDialog, popup, registry, dom
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: 'App Sleep',
    templateString: Template,
    docsServiceURL: window.App.docsServiceURL,
    path: '',
    applicationName: 'Date',
    showCancel: false,
    activeWorkspace: '',
    activeWorkspacePath: '',
    help_doc: null,
    activeUploads: [],

    postMixInProperties: function () {
      this.activeWorkspace = this.activeWorkspace || window.App.activeWorkspace;
      this.activeWorkspacePath = this.activeWorkspacePath || window.App.activeWorkspacePath;
      this.inherited(arguments);
    },

    _setValueAttr: function (val) {
      this.value = val || window.App.activeWorkspacePath;
    },

    gethelp: function () {

      if (this.applicationHelp) {
        var helprequest = xhr.get(PathJoin(this.docsServiceURL, this.applicationHelp), {
          handleAs: 'text'
        });
        helprequest.then(function (data) {
          data = data.replace('<img src="../../_static/patric_logo.png" class="logo" />', '');
          this.help_doc = domConstruct.toDom(data);
          var ibuttons = query('.infobutton');
          ibuttons.forEach(function (item) {
            // var help_text= help_doc.getElementById(item.attributes.name.value) || "Help text missing";
            // basic flat child workaround for getting help in safari. will break if nested.
            var help_text = null;
            for (i = 0; i < this.help_doc.childNodes.length; i++) {
              if (this.help_doc.childNodes[i].id == item.attributes.name.value) {
                help_text = this.help_doc.childNodes[i];
              }
            }
            help_text = help_text || dom.byId(item.attributes.name.value, this.help_doc) || domConstruct.toDom('<div>Help text missing</div>');
            help_text.style.overflowY = 'auto';
            help_text.style.maxHeight = '400px';
            if (dojo.hasClass(item, 'dialoginfo')) {
              item.info_dialog = new Dialog({
                content: help_text,
                'class': 'helpModal',
                draggable: true,
                style: 'max-width: 350px;'
              });
              item.open = false;
              on(item, 'click', function () {
                if (!item.open) {
                  item.open = true;
                  item.info_dialog.show();
                }
                else {
                  item.open = false;
                  item.info_dialog.hide();
                }
              });
            }
            else if (dojo.hasClass(item, 'tooltipinfo')) {
              item.info_dialog = new TooltipDialog({
                content: help_text,
                'class': 'helpTooltip',
                style: 'overflow-y: auto; max-width: 350px; max-height: 400px',
                onMouseLeave: function () {
                  popup.close(item.info_dialog);
                }
              });
              on(item, 'mouseover', function () {
                popup.open({
                  popup: item.info_dialog,
                  around: item
                });
              });
              on(item, 'mouseout', function () {
                popup.close(item.info_dialog);
              });
            }
          });
        });
      }

      var tutorials = query('.tutorialButton');
      var tutorialLink = PathJoin(this.docsServiceURL, (this.tutorialLink || 'tutorial/'));
      tutorials.forEach(function (item) {
        if (dojo.hasClass(item, 'tutorialInfo')) {
          on(item, 'click', function () {
            // console.log(tutorialLink)
            window.open(tutorialLink, 'Tutorials');
          });
        }
      });

    },

    onOutputPathChange: function (val) {
      registry.byClass('p3.widget.WorkspaceFilenameValidationTextBox').forEach(function (obj) {
        obj.set('path', val);
      });
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      var state = this.get('state');
      if ((state == 'Incomplete') || (state == 'Error')) {
        this.submitButton.set('disabled', true);
      }

      this.watch('state', function (prop, val, val2) {
        if (val2 == 'Incomplete' || val2 == 'Error') {
          this.submitButton.set('disabled', true);
        } else {
          this.submitButton.set('disabled', false);
        }
      });

      if (!this.showCancel && this.cancelButton) {
        domClass.add(this.cancelButton.domNode, 'dijitHidden');
      }

      if (this.pageTitle) {
        window.document.title = this.pageTitle;
      }

      this.gethelp();
      Topic.subscribe('/upload', lang.hitch(this, 'onUploadMessage'));
      Topic.subscribe('/UploaderDialog', lang.hitch(this, function (msg) {
        if (msg && msg.type == 'UploaderClose') {
          this.validate();
        }
      }));
      if (this.submitButton) {
        var uploadTolltip = new TooltipDialog({
          content: 'Upload in progress, please wait.',
          onMouseLeave: function () {
            popup.close(uploadTolltip);
          }
        });
        var a = this.submitButton.domNode;
        on(a, 'mouseover', lang.hitch(this, function () {
          if (this.activeUploads && this.activeUploads.length != 0)
          { popup.open({
            popup: uploadTolltip,
            around: a,
            orient: ['above-centered', 'below-centered']
          }); }
        }));
        on(a, 'mouseout', function () {
          popup.close(uploadTolltip);
        });
      }

      this._started = true;
    },

    onReset: function (evt) {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');
    },

    onUploadMessage: function (msg) {
      var path = msg.workspacePath;
      if (msg.workspacePath.substr(-1) != '/') {
        path += '/';
      }
      path += msg.filename;
      if (msg && msg.type == 'UploadStart' && this.activeUploads.indexOf(msg.workspacePath + msg.filename) == -1) {
        // add file this.activeUploads
        this.activeUploads.push(path);
        this.validate();
        return;
      }

      if (msg && msg.type == 'UploadProgress') {
        this.validate();
        return;
      }

      if (msg && msg.type == 'UploadComplete') {
        // remove file from this.activeUploads
        var i = this.activeUploads.indexOf(path);
        if (i != -1) {
          this.activeUploads.splice(i, 1);
        }
        this.validate();

      }
    },

    validate: function () {
      var valid = this.inherited(arguments);
      if (valid && this.activeUploads.length == 0) {
        if (this.submitButton) { this.submitButton.set('disabled', false); }
        return valid;
      }

      if (this.submitButton) { this.submitButton.set('disabled', true); }
      return false;

    },

    onSubmit: function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        var values = this.getValues();

        domClass.add(this.domNode, 'Working');
        domClass.remove(this.domNode, 'Error');
        domClass.remove(this.domNode, 'Submitted');

        if (window.App.noJobSubmission) {
          var dlg = new Dialog({
            title: 'Job Submission Params: ',
            content: '<pre>' + JSON.stringify(values, null, 4) + '</pre>'
          });
          dlg.startup();
          dlg.show();
          return;
        }
        this.submitButton.set('disabled', true);
        window.App.api.service('AppService.start_app', [this.applicationName, values]).then(function (results) {
          console.log('Job Submission Results: ', results);

          if (window.gtag) {
            gtag('event', this.applicationName, { event_category: 'Services' });
          }

          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Submitted');
          _self.submitButton.set('disabled', false);
          registry.byClass('p3.widget.WorkspaceFilenameValidationTextBox').forEach(function (obj) {
            obj.reset();
          });
        }, function (err) {
          console.log('Error:', err);
          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Error');
          _self.errorMessage.innerHTML = err;
        });
      } else {
        console.log('Form is incomplete');
      }
    },

    onCancel: function (evt) {
      console.log('Cancel/Close Dialog', evt);
      on.emit(this.domNode, 'dialogAction', { action: 'close', bubbles: true });
    },

    checkOutputName: function () {
      var charError = document.getElementsByClassName('charError')[0];
      var label_value = this.output_file.get('value');
      // charError.innerHTML = '&nbsp;';
      if (label_value.indexOf('/') !== -1 || label_value.indexOf('\\') !== -1) {
        charError.innerHTML = 'slashes are not allowed';
        // console.log(this.output_file);
        this.output_file.set('value', '');
      } else {
        if (label_value !== '') {
          charError.innerHTML = '&nbsp;';
        }
      }
    }
  });
});
