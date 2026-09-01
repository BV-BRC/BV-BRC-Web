define([
  'dojo/_base/declare', 'dojo/topic',
  'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/StabiliNNator.html', './AppBase',
  '../../WorkspaceManager',
  'dijit/form/Button', 'dijit/form/Select',
  'p3/widget/WorkspaceFilenameValidationTextBox', 'p3/widget/WorkspaceObjectSelector'
], function (
  declare, Topic,
  Templated, WidgetsInTemplate,
  Template, AppBase, WorkspaceManager
) {
  return declare([AppBase], {
    baseClass: 'StabiliNNator',
    templateString: Template,
    applicationName: 'StabiliNNator',
    requireAuth: true,
    applicationLabel: 'Protein Stability Prediction',
    applicationDescription: 'Identify positions in a protein structure where a targeted mutation is likely to increase thermal stability. Two graph neural networks score every residue: proliNNator for favorable proline substitutions and disulfiNNate for likely disulfide bonds. Probabilities are returned in the B-factor column of an annotated PDB, alongside ranked summaries and an interactive report.',
    applicationHelp: 'quick_references/services/stabilinnator_service.html',
    tutorialLink: 'tutorial/stabilinnator/stabilinnator.html',
    videoLink: '',
    pageTitle: 'Protein Stability Prediction Service | BV-BRC',
    required: true,
    defaultPath: '',

    startup: function () {
      var _self = this;
      if (this._started) { return; }
      this.inherited(arguments);
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
      // Default Job Name = <applicationName>-yymmdd-hhmmss, unless rerun-form
      // intake (or a stored value) already filled it. The service rejects a
      // submission with no output_file, and results are written to
      // <output_path>/.<output_file>/, so every run needs its own name.
      if (this.output_file && !this.output_file.get('value')) {
        this.output_file.set('value', this._defaultJobName());
      }
      this.updateOutputPathPreview();
      this.checkParameterRequiredFields();
    },

    _defaultJobName: function () {
      var d = new Date();
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      var stamp = pad(d.getFullYear() % 100) + pad(d.getMonth() + 1) + pad(d.getDate())
        + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
      return (this.applicationName || 'job') + '-' + stamp;
    },

    postCreate: function () {
      this.inherited(arguments);
      this.onAnalysisTypeChange();
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    // Both analyses are independent and each is sub-second; the wall time a
    // user actually sees is container staging. Set that expectation rather
    // than implying the analysis choice changes the wait.
    onAnalysisTypeChange: function () {
      if (this.analysis_message) {
        var t = this.analysis_type ? this.analysis_type.get('value') : 'both';
        var msg;
        if (t === 'proline') {
          msg = 'Scores every residue for substitution to proline. Positions that are already proline tend to score high and are flagged in the summary as <i>already PRO</i>.';
        } else if (t === 'disulfide') {
          msg = 'Scores cysteines for their likelihood of forming a disulfide bond. The annotated PDB carries a value on every residue, but only cysteines are meaningful; the ranked summary is filtered to them.';
        } else {
          msg = 'Runs proliNNator and disulfiNNate. They are independent, and together take only a few seconds longer than either alone.';
        }
        this.analysis_message.innerHTML = msg;
      }
      this.checkParameterRequiredFields();
    },

    getValues: function () {
      var values = this.inherited(arguments);
      // Build the submission explicitly. Anything not in the app spec makes
      // AppScript::preprocess_parameters warn about unknown parameters, so
      // only send fields the spec declares.
      var submit = {
        input_file: values.input_file,
        analysis_type: values.analysis_type || 'both',
        output_path: values.output_path,
        output_file: values.output_file
      };
      if (values.theme) { submit.theme = values.theme; }
      return submit;
    },

    _hasInput: function () {
      return !!(this.input_file && this.input_file.get('value'));
    },

    validate: function () {
      var valid = this.inherited(arguments);
      if (!valid || !this._hasInput()) {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
        return false;
      }
      return valid;
    },

    checkParameterRequiredFields: function () {
      if (
        this._hasInput()
        && this.output_path.get('value')
        && this.output_file && this.output_file.get('value')
      ) {
        this.validate();
      } else {
        if (this.submitButton) {
          this.submitButton.set('disabled', true);
        }
      }
    },

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.updateOutputPathPreview();
      this.checkParameterRequiredFields();
    },

    checkOutputName: function (val) {
      this.inherited(arguments);
      this.updateOutputPathPreview();
      this.checkParameterRequiredFields();
    },

    updateOutputPathPreview: function () {
      if (!this.output_path_preview) { return; }
      var folder = this.output_path && this.output_path.get('value');
      var name = this.output_file && this.output_file.get('value');
      if (folder && name) {
        var f = String(folder).replace(/\/+$/, '');
        var n = String(name).replace(/^\/+/, '');
        this.output_path_preview.textContent = f + '/' + n;
      } else if (folder) {
        // Non-breaking spaces: this is one placeholder token, and with the
        // path now wrapping it would otherwise break after "Job".
        this.output_path_preview.textContent = String(folder).replace(/\/+$/, '') + '/(enter\u00a0Job\u00a0Name)';
      } else {
        this.output_path_preview.textContent = '(set Output Folder and Job Name)';  // wraps fine: it is prose, not a path
      }
    },

    addRerunFields: function (job_params) {
      if (job_params.input_file) { this.input_file.set('value', job_params.input_file); }
      if (job_params.analysis_type) { this.analysis_type.set('value', job_params.analysis_type); }
      if (job_params.theme && this.theme) { this.theme.set('value', job_params.theme); }
      if (job_params.output_path) { this.output_path.set('value', job_params.output_path); }
      if (job_params.output_file) { this.output_file.set('value', job_params.output_file); }

      this.onAnalysisTypeChange();
    },

    intakeRerunForm: function () {
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        rerun_key = rerun_fields[1];
        var sessionStorage = window.sessionStorage;
        if (sessionStorage.hasOwnProperty(rerun_key)) {
          try {
            var param_dict = { 'output_folder': 'output_path' };
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            this.addRerunFields(JSON.parse(sessionStorage.getItem(rerun_key)));
            this.form_flag = true;
          } catch (error) {
            console.log('Error during intakeRerunForm: ', error);
          } finally {
            sessionStorage.removeItem(rerun_key);
          }
        }
      }
    }
  });
});
