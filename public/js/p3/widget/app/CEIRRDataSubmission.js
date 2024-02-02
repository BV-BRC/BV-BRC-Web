define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/query', '../WorkspaceObjectSelector',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic', 'dojo/when', './AppBase',
  'dojo/text!./templates/CEIRRDataSubmission.html', '../../util/PathJoin', '../../WorkspaceManager',
  'dijit/registry'
], function (
  declare, lang, on, query, WorkspaceObjectSelector,
  domClass, domConstruct, domStyle, Topic, when, AppBase,
  Template, PathJoin, WorkspaceManager,
  registry
) {

  return declare([AppBase], {
    baseClass: 'CEIRRDataSubmission',
    requireAuth: true,
    applicationDescription: '',
    videoLink: '',
    pageTitle: 'CEIRR Data Submission Service | BV-BRC',
    appBaseURL: 'CEIRR Data Submission',
    templateString: Template,
    applicationName: 'CEIRRDataSubmission',
    applicationLabel: 'CEIRR Data Submission',
    applicationHelp: '',
    tutorialLink: '',
    defaultPath: '',
    demo: false,
    allowMultiple: true,
    ceirrDataLength: 0,

    constructor: function () {
    },

    startup: function () {
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);

      this.onInputChange(true);

      this._started = true;
      this.form_flag = false;
      var _self = this;
      var rerun_data;
      try {
        rerun_data = this.intakeRerunForm();
        if (this.form_flag) {
          _self.output_file.focus();
        }
      } catch (error) {
        console.error(error);
        var localStorage = window.localStorage;
        if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
          localStorage.removeItem('bvbrc_rerun_job');
        }
      }

      // activate genome group selector when user is logged in
      if (window.App.user) {
        this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;

        this.onAddDataRow(rerun_data);
      }
    },

    openJobsList: function () {
      Topic.publish('/navigate', {href: '/job/'});
    },

    validate: function () {
      if (this.inherited(arguments)) {
        var val = true;

        if (val) {
          this.submitButton.set('disabled', false);
          return true;
        }
      }
      this.submitButton.set('disabled', true);
      return false;
    },

    onAddDataRow: function (rerun_data) {
      const index = this.ceirrDataLength++;
      let dataRowDom = query('div[id="dataRow"]')[0];

      let mainDiv = domConstruct.create('div', {'id': 'mainDiv' + index}, 'dataRow');
      let sd = new WorkspaceObjectSelector();
      sd.set('name', 'ceirr_data');
      sd.set('required', true);
      sd.set('type', ['csv']);
      sd.set('multi', false);
      sd.set('style', 'width:85%;display:inline-block;');
      sd.promptMessage = 'Select or upload CSV file to your workspace.';
      sd.missingMessage = 'CEIRR data file is required.';
      sd.placeHolder = 'CEIRR data file';
      sd.on('change', lang.hitch(this, 'validate'));
      if (rerun_data) {
        this.output_path.set('value', rerun_data['output_path']);
        sd.set('value', rerun_data['ceirr_data']);
      }
      sd.placeAt(mainDiv);

      let iconDiv = domConstruct.create('div', {'style': 'width:10%;display:inline-block;'}, mainDiv);
      let addIconDiv = domConstruct.create('div', {
        'style': 'display:inline-block;',
        onclick: lang.hitch(this, 'onAddDataRow')
      }, iconDiv);
      domConstruct.create('i', {'class': 'fa icon-plus fa-lg'}, addIconDiv);

      if (index > 0) {
        let removeIconDiv = domConstruct.create('div', {
          'style': 'margin-left:10px;display:inline-block;',
          onclick: lang.hitch(this, this.onRemoveDataRow)
        }, iconDiv);
        domConstruct.create('i', {'id': 'removeIcon' + index, 'class': 'fa icon-minus fa-lg'}, removeIconDiv);
      }

      this.validate();
    },

    onRemoveDataRow: function (element) {
      const index = element.srcElement.id.replace('removeIcon', '');
      domConstruct.destroy('mainDiv' + index);
      this.ceirrDataLength--;

      this.validate();
    },

    onSubmit: async function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        domClass.add(this.domNode, 'Working');
        domClass.remove(this.domNode, 'Error');
        domClass.remove(this.domNode, 'Submitted');
        this.submitButton.set('disabled', true);

        var values = this.getValues();

        _self.workingMessage.innerHTML = 'Submitting CEIRR Data Submission job';

        var start_params = {
          'base_url': window.App.appBaseURL
        };

        let isSuccessful = true;
        for (let value of values) {
          _self.doSubmit(value, start_params).then(function (results) {
            console.log('Job Submission Results: ', results);

            if (window.gtag) {
              gtag('event', this.applicationName, {event_category: 'Services'});
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
        }
      } else {
        console.log('Form is incomplete');
      }
    },

    getValues: function () {
      let submit_values = [];

      const output_file = this.output_file.get('value');
      const output_path = this.output_path.get('value');
      if (typeof this.value.ceirr_data === 'string') {
        submit_values.push({
          'ceirr_data': this.value.ceirr_data,
          'output_file': output_file,
          'output_path': output_path
        });
      } else {
        // prepare submission values
        for (let i = 0; i < this.value.ceirr_data.length; ++i) {
          submit_values.push({
            'ceirr_data': this.value.ceirr_data[i],
            'output_file': output_file + '_' + (i + 1),
            'output_path': output_path
          });
        }
      }

      return submit_values;
    },

    resubmit: function () {
      domClass.remove(query('.service_form')[0], 'hidden');
      domClass.remove(query('.appSubmissionArea')[0], 'hidden');
      query('.reSubmitBtn').style('visibility', 'hidden');
    },

    checkOutputName: function () {
      if (this.demo) {
        return true;
      }
      this.validate();
      return this.inherited(arguments);
    },

    onInputChange: function (evt) {
      if (!evt) {
        this.validate();
      }
    },

    onReset: function (evt) {
      this.inherited(arguments);
    },

    intakeRerunForm: function () {
      // assuming only one key
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      var job_data;
      if (rerun_fields.length > 1) {
        rerun_key = rerun_fields[1];
        var sessionStorage = window.sessionStorage;
        if (sessionStorage.hasOwnProperty(rerun_key)) {
          this.form_flag = true;
          job_data = JSON.parse(sessionStorage.getItem(rerun_key));
          sessionStorage.removeItem(rerun_key);
        }
      }
      return job_data;
    },
  });
});
