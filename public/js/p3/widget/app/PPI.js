/* eslint-disable strict */

define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dojo/text!./templates/PPI.html', './AppBase', '../../WorkspaceManager',
  'dijit/form/Button', 'dijit/form/RadioButton', 'dijit/form/Textarea',
  'p3/widget/WorkspaceFilenameValidationTextBox', 'p3/widget/WorkspaceObjectSelector'
], function (
  declare, lang, Topic,
  Template, AppBase, WorkspaceManager
) {
  return declare([AppBase], {
    baseClass: 'PPI',
    templateString: Template,
    applicationName: 'CEPI-PPI',
    requireAuth: true,
    applicationLabel: 'Protein-Protein Interface Prediction',
    applicationDescription: 'Predict interacting residues between two sets of protein sequences.',
    applicationHelp: '',
    tutorialLink: '',
    pageTitle: 'Protein-Protein Interface Prediction Service | BV-BRC',
    defaultPath: '',
    queryValid: false,
    targetValid: false,

    startup: function () {
      if (this._started) { return; }
      this.inherited(arguments);
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }

      this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
      this.output_path.set('value', this.defaultPath);
      if (!this.output_file.get('value')) {
        this.output_file.set('value', this._defaultJobName());
      }
      this.watch('state', lang.hitch(this, function () {
        this.checkParameterRequiredFields();
      }));
      this.onQuerySourceChange();
      this.onTargetSourceChange();
      this.checkParameterRequiredFields();
    },

    reset: function () {
      this.inherited(arguments);

      var sides = ['query', 'target'];
      for (var i = 0; i < sides.length; i++) {
        var side = sides[i];
        this[side + 'Paste'].set('checked', true);
        this[side + 'File'].set('checked', false);
        this[side + 'Group'].set('checked', false);
        this[side + 'PasteInput'].set('value', '');
        this[side + 'FileInput'].set('value', '');
        this[side + 'GroupInput'].set('value', '');
        this[side + 'Message'].textContent = '';
        this[side + 'Valid'] = false;
      }

      this.output_path.set('value', this.defaultPath);
      this.output_file.set('value', this._defaultJobName());
      this.onQuerySourceChange();
      this.onTargetSourceChange();
      this.checkParameterRequiredFields();
    },

    _selectedSource: function (side) {
      if (this[side + 'File'].get('checked')) { return 'file'; }
      if (this[side + 'Group'].get('checked')) { return 'group'; }
      return 'paste';
    },

    _sourceParameter: function (side, source) {
      var prefix = side === 'query' ? 'query' : 'target';
      var suffixes = {
        file: 'fasta_file',
        group: 'feature_group',
        paste: 'fasta_keyboard_input'
      };
      return prefix + '_' + suffixes[source];
    },

    _setSource: function (side) {
      var source = this._selectedSource(side);
      var sources = ['File', 'Group', 'Paste'];
      var sourceNames = ['file', 'group', 'paste'];

      sources.forEach(lang.hitch(this, function (name, index) {
        var active = source === sourceNames[index];
        var panel = this[side + name + 'Panel'];
        var widget = this[side + name + 'Input'];
        panel.style.display = active ? 'block' : 'none';
        widget.set('disabled', !active);
        widget.set('required', active);
      }));

      this._validateSide(side, false);
      this.checkParameterRequiredFields();
    },

    onQuerySourceChange: function () {
      this._setSource('query');
    },

    onTargetSourceChange: function () {
      this._setSource('target');
    },

    _validateSide: function (side, normalize) {
      var source = this._selectedSource(side);
      var message = this[side + 'Message'];
      var widget;
      var valid = false;

      message.textContent = '';
      if (source === 'file') {
        widget = this[side + 'FileInput'];
        valid = !!widget.get('value');
      } else if (source === 'group') {
        widget = this[side + 'GroupInput'];
        valid = !!widget.get('value');
      } else {
        widget = this[side + 'PasteInput'];
        var fasta = this.validateFasta(widget.get('value'), 'aa', true, side + '_1');
        valid = fasta.valid;
        message.textContent = fasta.message;
        if (valid && normalize && widget.get('value') !== fasta.trimFasta) {
          widget.set('value', fasta.trimFasta);
        }
      }

      this[side + 'Valid'] = valid;
      return valid;
    },

    onQueryInputChange: function () {
      this._validateSide('query', false);
      this.checkParameterRequiredFields();
    },

    onTargetInputChange: function () {
      this._validateSide('target', false);
      this.checkParameterRequiredFields();
    },

    validate: function () {
      var valid = this.inherited(arguments);
      if (!this.queryPaste || !this.targetPaste || !this.output_path || !this.output_file) {
        return valid;
      }

      valid = valid && this._validateSide('query', false);
      valid = valid && this._validateSide('target', false);
      valid = valid && !!this.output_path.get('value');
      valid = valid && !!this.output_file.get('value');

      if (this.submitButton) {
        this.submitButton.set('disabled', !valid);
      }
      return valid;
    },

    checkParameterRequiredFields: function () {
      this.validate();
    },

    onOutputPathChange: function (value) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkOutputName: function () {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    _defaultJobName: function () {
      var d = new Date();
      var pad = function (number, length) {
        var value = String(number);
        while (value.length < length) { value = '0' + value; }
        return value;
      };
      return 'PPI-' + d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2)
        + '-' + pad(d.getHours(), 2) + pad(d.getMinutes(), 2) + pad(d.getSeconds(), 2)
        + '-' + pad(d.getMilliseconds(), 3);
    },

    _fastaValue: function (side) {
      var widget = this[side + 'PasteInput'];
      var fasta = this.validateFasta(widget.get('value'), 'aa', true, side + '_1');
      return fasta.trimFasta;
    },

    getValues: function () {
      var querySource = this._selectedSource('query');
      var targetSource = this._selectedSource('target');
      var values = {
        threshold: 0.5,
        seq_type: 2,
        output_path: this.output_path.get('value'),
        output_file: this.output_file.get('value')
      };

      if (querySource === 'file') {
        values[this._sourceParameter('query', querySource)] = this.queryFileInput.get('value');
      } else if (querySource === 'group') {
        values[this._sourceParameter('query', querySource)] = [this.queryGroupInput.get('value')];
      } else {
        values[this._sourceParameter('query', querySource)] = this._fastaValue('query');
      }

      if (targetSource === 'file') {
        values[this._sourceParameter('target', targetSource)] = this.targetFileInput.get('value');
      } else if (targetSource === 'group') {
        values[this._sourceParameter('target', targetSource)] = [this.targetGroupInput.get('value')];
      } else {
        values[this._sourceParameter('target', targetSource)] = this._fastaValue('target');
      }

      return values;
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    }
  });
});
