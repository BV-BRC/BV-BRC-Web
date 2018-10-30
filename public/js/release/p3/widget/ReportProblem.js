require({cache:{
'url:p3/widget/templates/ReportProblem.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\" encType=\"multipart/form-data\" name=\"problemForm\"\n  dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onkeyup:validate\">\n<div >\n  <div class=\"HideWithAuth\">\n\n      <label for=\"email\"><b>Email<sup>*</sup></b></label>\n    <div data-dojo-type=\"dijit/form/TextBox\" name=\"email\" style=\"display:block;margin-bottom:8px;width:600px;\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Email Address is required',trim:true,placeHolder:'Email Address'\"></div>\n  </div>\n\n\n  <label for=\"subject\"><b>Subject<sup>*</sup></b></label>\n  <div data-dojo-type=\"dijit/form/TextBox\" name=\"subject\" style=\"display:block;margin-bottom:8px;width:600px;\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Subject must be provided',trim:true\"></div>\n\n  <div class=\"jobFeedback dijitHidden\">\n    <label for=\"description\">\n      <b>Please provide a question or relevant feedback about this <span name=\"reportedStatus\"></span> job (required)<sup>*</sup></b>\n    </label>\n    <br>\n    <div tabindex=\"1\" data-dojo-type=\"dijit/form/SimpleTextarea\" name=\"description\"  style=\"width:550px;height:50px\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Description must be provided for this job',trim:true,rows:20\"></div>\n    <br>\n  </div>\n\n  <br>\n\n  <div data-dojo-type=\"dijit/form/Textarea\" name=\"content\" style=\"width:600px;height:250px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Description must be provided',trim:true,rows:20\"></div>\n  <div>\n    Select file to attach (optional):\t<input data-dojo-attach-point=\"attachmentNode\" type=\"file\" name=\"attachment\" />\n  </div>\n</div>\n<div class=\"workingMessage messageContainer\">\n  Sending Feedback...\n</div>\n\n<div class=\"errorMessage messageContainer\">\n  <div style=\"font-weight:900;font-size:1.1em;\">There was an error submitting your report:</div>\n  <p data-dojo-attach-point=\"errorMessage\">Error</p>\n</div>\n\n<div style=\"margin:4px;margin-top:8px;text-align:right;\">\n  <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n  <div data-dojo-attach-point=\"saveButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n</div>\n</form>\n"}});
define("p3/widget/ReportProblem", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/ReportProblem.html', 'dijit/form/Form',
  'dojo/topic', 'dojo/request', 'dojo/when', 'dojo/query', 'dojo/html'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  Template, FormMixin, Topic, request, when, query, html
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    'baseClass': 'CreateWorkspace',
    templateString: Template,
    validate: function () {
      var v = this.getValues();
      var valid = v.subject && v.content;

      if (this.jobDescriptRequired) {
        valid = valid && v.description;
      }

      if (!window.App.authorizationToken) {
        valid = valid && v.email;
      }

      if (valid) {
        this.saveButton.set('disabled', false);
      } else {
        this.saveButton.set('disabled', true);
      }
      return valid;
    },
    startup: function () {
      // if require more feedback for jobs that aren't in failed state
      if (this.jobDescriptRequired) {
        domClass.remove(query('.jobFeedback')[0], 'dijitHidden');
        html.set(query('[name="reportedStatus"]')[0], this.jobStatus);
        this.saveButton.set('disabled', true);
      }

      // disable submit if just reporting failed job info
      if (!this.jobStatus) {
        this.saveButton.set('disabled', true);
      }

      if (this.issueSubject) {
        query('[name="subject"]')[0].value = this.issueSubject;
      }
      if (this.issueText) {
        query('[name="content"]')[0].value = this.issueText;
      }
    },

    onSubmit: function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();

      if (this.validate()) {
        var values = this.getValues();
        values.appVersion = window.App.appVersion;
        values.appLabel = window.App.appLabel || '';
        values.url = window.location.href;

        if (window.App.user && window.App.user.id) {
          values.userId = window.App.user.id.replace('@patricbrc.org', '');
        }

        var formData = new FormData();
        Object.keys(values).forEach(function (key) {
          formData.append(key, values[key]);
        });

        // append required job info/feedback from user if needed to content
        if (this.jobDescriptRequired) {
          formData.set('content', formData.get('description') + '\n\n\n' + formData.get('content'));
        }

        if (this.attachmentNode && this.attachmentNode.files && this.attachmentNode.files[0]) {
          formData.append('attachment', this.attachmentNode.files[0]);
        }

        domClass.add(this.domNode, 'Working');

        when(request.post('/reportProblem', {
          headers: {
            'Authorization': (window.App.authorizationToken || ''),
            'enctype': 'multipart/form-data'
          },
          data: formData
        }), function (results) {
          on.emit(_self.domNode, 'dialogAction', { action: 'close', bubbles: true });
        }, function (err) {
          console.log('Error Reporting Problem: ', err);
        });
      } else {
        // improve this?
        console.log('Form is incomplete');
      }
    },

    onCancel: function (evt) {
      on.emit(this.domNode, 'dialogAction', { action: 'close', bubbles: true });
    }
  });
});
