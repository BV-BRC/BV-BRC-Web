define([
  'dojo/_base/declare', 'dojo/topic',
  'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/PredictStructure.html', './AppBase',
  '../../WorkspaceManager',
  'dijit/form/Button', 'dijit/form/Select', 'dijit/form/SimpleTextarea',
  'p3/widget/WorkspaceFilenameValidationTextBox', 'p3/widget/WorkspaceObjectSelector'
], function (
  declare, Topic,
  Templated, WidgetsInTemplate,
  Template, AppBase, WorkspaceManager
) {
  return declare([AppBase], {
    baseClass: 'PredictStructure',
    templateString: Template,
    applicationName: 'PredictStructure',
    requireAuth: true,
    applicationLabel: 'Protein Structure Prediction',
    applicationDescription: 'Predict biomolecular structures (proteins, complexes, protein-DNA/RNA, protein-ligand) using Boltz, OpenFold 3, Chai, AlphaFold 2, or ESMFold. Provides a unified interface with automatic parameter mapping, format conversion, output normalization, and confidence scoring.',
    applicationHelp: 'quick_references/services/predict_structure_service.html',
    tutorialLink: 'tutorial/predict_structure/predict_structure.html',
    videoLink: '',
    pageTitle: 'Protein Structure Prediction Service | BV-BRC',
    required: true,
    defaultPath: '',
    validLigands: true,
    validSmiles: true,

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
      // Default Job Name = <applicationName>-yymmdd-hhmmss, unless rerun-form intake
      // (or a stored value) already filled it.
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
      this._updateLigandLabel();
      this.onMsaSourceChange();
      this.onToolChange();
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    onToolChange: function () {
      this._refreshMsaPolicyMessage();
      this.checkParameterRequiredFields();
    },

    _refreshMsaPolicyMessage: function () {
      if (!this.msa_policy_message) { return; }
      var tool = this.tool ? this.tool.get('value') : 'auto';
      var msg;
      if (tool === 'esmfold') {
        msg = 'ESMFold does not use an MSA; this section is ignored.';
      } else if (tool === 'alphafold') {
        msg = 'AlphaFold 2 builds its own MSA from BV-BRC databases; this section is ignored.';
      } else if (tool === 'boltz' || tool === 'openfold' || tool === 'chai') {
        msg = 'Required for the selected prediction tool. Choose <i>Precomputed MSA from Workspace</i> to upload one, or <i>Use MSA Server or Service</i> to have BV-BRC compute one with ColabFold.';
      } else {
        // tool === 'auto' (or unknown)
        msg = 'Optional in Auto mode. With no MSA the service falls back to ESMFold for a single protein chain.';
      }
      this.msa_policy_message.innerHTML = msg;
    },

    onMsaSourceChange: function () {
      var source = this.msa_source ? this.msa_source.get('value') : 'none';
      if (this.msa_workspace_row) {
        this.msa_workspace_row.style.display = source === 'workspace' ? '' : 'none';
      }
      // Clear the workspace selection when switching away from workspace mode so
      // the form doesn't carry a stale value into submission.
      if (source !== 'workspace' && this.msa_file && this.msa_file.get('value')) {
        this.msa_file.set('value', '');
      }
      this.checkParameterRequiredFields();
    },

    onLigandTypeChange: function () {
      // Switching CCD <-> SMILES re-runs the same validator against the new
      // type. Preserve typed content; the user can clear if it makes no sense
      // under the new notation.
      this._updateLigandLabel();
      this.checkLigandInput();
    },

    _updateLigandLabel: function () {
      if (!this.ligand_input_label || !this.ligand_type || !this.ligand_input) { return; }
      var isCcd = this.ligand_type.get('value') === 'ccd';
      this.ligand_input_label.textContent = isCcd ? 'CCD codes' : 'SMILES strings';
      // Use literal newlines so the textarea placeholder shows the
      // actual expected format. Comma-separated input fails validation.
      this.ligand_input.set('placeholder', isCcd
        ? 'ATP\nNAD\nNAG'
        : 'CCO\nC1=CC=CC=C1');
    },

    getValues: function () {
      var values = this.inherited(arguments);
      var submit = {
        tool: values.tool,
        output_path: values.output_path
      };

      this._copyIfPresent(submit, 'input_file', values.input_file);
      this._copyIfPresent(submit, 'dna_file', values.dna_file);
      this._copyIfPresent(submit, 'rna_file', values.rna_file);
      this._copyIfPresent(submit, 'output_file', values.output_file);

      // MSA: only send msa_file when the user picked the "workspace" source.
      // "none" or "server" mean no msa_file in the submission.
      if (values.msa_source === 'workspace') {
        this._copyIfPresent(submit, 'msa_file', values.msa_file);
      }

      // Combined ligand input → submit.ligand (CCD) or submit.smiles
      // depending on which notation was selected.
      var entries = this._parseLines(values.ligand_input);
      if (entries.length > 0) {
        if (values.ligand_type === 'smiles') {
          submit.smiles = entries;
        } else {
          submit.ligand = entries.map(function (e) { return e.toUpperCase(); });
        }
      }

      return submit;
    },

    _copyIfPresent: function (target, key, value) {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        target[key] = value;
      }
    },

    _parseLines: function (value) {
      if (!value) { return []; }
      return String(value)
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; });
    },

    _parseLigands: function (value) {
      return this._parseLines(value).map(function (line) {
        return line.toUpperCase();
      });
    },

    _listToText: function (value, key) {
      if (!value) { return ''; }
      if (!Array.isArray(value)) { return String(value); }
      return value.map(function (item) {
        if (item && typeof item === 'object') {
          return item[key] || '';
        }
        return item;
      }).filter(function (item) {
        return item !== undefined && item !== null && String(item).trim() !== '';
      }).join('\n');
    },

    _hasAnyBiomoleculeInput: function () {
      if (this.input_file && this.input_file.get('value')) { return true; }
      if (this.dna_file && this.dna_file.get('value')) { return true; }
      if (this.rna_file && this.rna_file.get('value')) { return true; }
      return false;
    },

    _isMsaRequired: function () {
      if (!this.tool) { return false; }
      var tool = this.tool.get('value');
      return tool === 'boltz' || tool === 'openfold' || tool === 'chai';
    },

    _hasRequiredMsa: function () {
      if (!this._isMsaRequired()) { return true; }
      // Tool needs an MSA. "workspace" requires a selected file; "server" is
      // satisfied by itself (ColabFold MSA is computed at submission time).
      var source = this.msa_source ? this.msa_source.get('value') : 'none';
      if (source === 'server') { return true; }
      if (source === 'workspace') {
        return !!(this.msa_file && this.msa_file.get('value'));
      }
      return false;
    },

    _isValidSmiles: function (smiles) {
      // Must contain only legal SMILES characters
      if (!/^[A-Za-z0-9@+\-\[\]()\=#:\/\\\.%*]+$/.test(smiles)) {
        return false;
      }

      // Must start with a valid atom: bracket atom [..], or organic-subset atom
      // Organic subset: B, C, N, O, P, S, F, Cl, Br, I (and aromatic b,c,n,o,p,s)
      if (!/^(\[|B(?!r)|C(?!l)|N|O|P|S(?!i)|F|Cl|Br|I|b|c|n|o|p|s)/.test(smiles)) {
        return false;
      }

      // Must contain at least one atom (letter that is a valid element start)
      // Reject strings that are purely digits/symbols with no atom letter
      if (!/[A-Za-z]/.test(smiles)) {
        return false;
      }

      // Check balanced parentheses and brackets
      var parenDepth = 0;
      var bracketDepth = 0;
      var inBracket = false;
      for (var i = 0; i < smiles.length; i++) {
        var c = smiles[i];
        if (c === '[') {
          bracketDepth++;
          inBracket = true;
        } else if (c === ']') {
          bracketDepth--;
          inBracket = false;
          if (bracketDepth < 0) { return false; }
        } else if (!inBracket) {
          if (c === '(') { parenDepth++; }
          else if (c === ')') {
            parenDepth--;
            if (parenDepth < 0) { return false; }
          }
        }
      }
      if (parenDepth !== 0 || bracketDepth !== 0) { return false; }

      // Reject bare backslashes not used as bond stereo (must be followed by a valid char)
      // A lone \ or \\ at end is invalid
      if (/\\$/.test(smiles)) { return false; }

      // Reject strings with no valid organic-subset atom or bracket atom at all.
      // Valid atom pattern: bracket [...] or one of B,C,N,O,P,S,F,Cl,Br,I (case-sensitive for capitals),
      // or aromatic b,c,n,o,p,s
      var atomPattern = /\[|(?:Cl|Br|[BCNOPSFIbcnops])/;
      if (!atomPattern.test(smiles)) { return false; }

      return true;
    },

    checkLigandInput: function () {
      // Consolidated validator for the combined Ligands textarea. Validates
      // against whichever notation the type selector currently points at and
      // sets validLigands / validSmiles to keep the rest of the form logic
      // unchanged.
      var lines = this.ligand_input ? this._parseLines(this.ligand_input.get('value')) : [];
      var type = this.ligand_type ? this.ligand_type.get('value') : 'ccd';
      var message = '';
      var ok = true;
      if (type === 'smiles') {
        var firstInvalid = -1;
        for (var i = 0; i < lines.length; i++) {
          if (!this._isValidSmiles(lines[i])) { firstInvalid = i + 1; break; }
        }
        ok = firstInvalid === -1;
        if (!ok) {
          message = 'Invalid SMILES string on line ' + firstInvalid + '. Check for unbalanced brackets/parentheses or illegal characters.';
        }
      } else {
        // CCD codes: 1-3 alphanumeric characters
        for (var j = 0; j < lines.length; j++) {
          if (!/^[A-Za-z0-9]{1,3}$/.test(lines[j])) { ok = false; break; }
        }
        if (!ok) {
          message = 'CCD codes must be 1-3 alphanumeric characters.';
        }
      }
      // Keep the two booleans in sync with the active notation so legacy
      // callers (validate / checkParameterRequiredFields) continue to work.
      this.validLigands = type === 'ccd' ? ok : true;
      this.validSmiles = type === 'smiles' ? ok : true;
      if (this.ligand_message) {
        this.ligand_message.textContent = message;
      }
      this.checkParameterRequiredFields();
    },

    validate: function () {
      var valid = this.inherited(arguments);
      if (!valid || !this._hasAnyBiomoleculeInput() || !this._hasRequiredMsa() || !this.validLigands || !this.validSmiles) {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
        return false;
      }
      return valid;
    },

    checkParameterRequiredFields: function () {
      if (
        this._hasAnyBiomoleculeInput() &&
        this.output_path.get('value') &&
        this.output_file && this.output_file.get('value') &&
        this._hasRequiredMsa() &&
        this.validLigands &&
        this.validSmiles
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
        // Trim trailing slash on folder, leading slash on name, then join with a single /.
        var f = String(folder).replace(/\/+$/, '');
        var n = String(name).replace(/^\/+/, '');
        this.output_path_preview.textContent = f + '/' + n;
      } else if (folder) {
        this.output_path_preview.textContent = String(folder).replace(/\/+$/, '') + '/(enter Job Name)';
      } else {
        this.output_path_preview.textContent = '(set Output Folder and Job Name)';
      }
    },

    addRerunFields: function (job_params) {
      if (job_params.tool) { this.tool.set('value', job_params.tool); }
      if (job_params.input_file) { this.input_file.set('value', job_params.input_file); }
      if (job_params.dna_file) { this.dna_file.set('value', job_params.dna_file); }
      if (job_params.rna_file) { this.rna_file.set('value', job_params.rna_file); }
      if (job_params.msa_file) {
        this.msa_source.set('value', 'workspace');
        this.msa_file.set('value', job_params.msa_file);
      }
      // Ligand rerun: if the prior submission had a ligand list, populate as CCD.
      // If it had SMILES, populate as SMILES. If somehow both (legacy form
      // allowed it), prefer ligand and drop smiles — the consolidated input
      // can only carry one notation at a time.
      if (job_params.ligand) {
        this.ligand_type.set('value', 'ccd');
        this.ligand_input.set('value', this._listToText(job_params.ligand, 'ccd_code'));
      } else if (job_params.smiles) {
        this.ligand_type.set('value', 'smiles');
        this.ligand_input.set('value', this._listToText(job_params.smiles, 'smiles_str'));
      }
      if (job_params.output_path) { this.output_path.set('value', job_params.output_path); }
      if (job_params.output_file) { this.output_file.set('value', job_params.output_file); }

      this.checkLigandInput();
      this.onMsaSourceChange();
      this.onToolChange();
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
