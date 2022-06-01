define([
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
        values.jiraLabel = window.App.jiraLabel;
        values.url = window.location.href;

        if (window.App.user && window.App.user.id) {
          values.userId = window.App.user.id.replace('@' + localStorage.getItem('realm'), '');
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
