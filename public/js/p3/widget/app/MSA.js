define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/MSA.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox', 'dijit/form/Textarea',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when'
], function (
  declare, WidgetBase, Topic, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox, Textarea,
  query, dom, popup, Tooltip, Dialog, TooltipDialog,
  children, WorkspaceManager, Memory, Standby, when
) {
  return declare([AppBase], {
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'MSA',
    requireAuth: true,
    applicationLabel: 'Multiple Sequence Alignment and SNP/Variation Analysis',
    applicationDescription: 'The multiple sequence alignment service with variation and SNP analysis can be used with feature groups, fasta files, aligned fasta files, and user input fasta records. If a single alignment file is given, then only the variation analysis is run.',
    applicationHelp: 'quick_references/services/msa_snp_variation_service.html',
    tutorialLink: 'tutorial/msa_snp_variation/msa_snp_variation.html',
    videoLink: '',
    pageTitle: 'Multiple Sequence Alignment and SNP/Variation Analysis',
    appBaseURL: 'MSA',
    defaultPath: '',
    startingRows: 14,
    // maxGenomes: 256,
    validFasta: false,
    textInput: false,

    startup: function () {
      var _self = this;
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }

      this.inherited(arguments);

      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
        var localStorage = window.localStorage;
        if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
          localStorage.removeItem('bvbrc_rerun_job');
        }
      }
    },

    onChangeStatus: function (start) {
      this.inputInitialize();
      this.user_genomes_alignment.set('disabled', true);
      if (this.unaligned.checked == true) {
        this.unaligned_box.style.display = 'inline-block';
        this.aligned_box.style.display = 'none';
        this.onChangeType();
      } else if (this.aligned.checked == true) {
        this.unaligned_box.style.display = 'none';
        this.aligned_box.style.display = 'inline-block';
        this.user_genomes_alignment.set('required', true);
        this.user_genomes_alignment.set('disabled', false);
      }
      this.validate();
    },

    inputInitialize: function () {
      // Disable everything
      this.aligner.set('disabled', true);
      this.user_genomes_featuregroup.set('disabled', true);
      this.dna.set('disabled', true);
      this.protein.set('disabled', true);
      this.user_genomes_fasta.set('disabled', true);
      this.fasta_keyboard_input.set('disabled', true);
      this.user_genomes_alignment.set('disabled', true);
      // Do not require anything
      this.aligner.set('required', false);
      this.user_genomes_featuregroup.set('required', false);
      this.dna.set('required', false);
      this.protein.set('required', false);
      this.user_genomes_fasta.set('required', false);
      this.fasta_keyboard_input.set('required', false);
      this.user_genomes_alignment.set('required', false);
    },

    onChangeType: function () {
      this.inputInitialize();
      this.aligner.set('required', true);
      this.aligner.set('disabled', false);
      if (this.input_group.checked == true) {
        this.user_genomes_featuregroup.set('required', true);
        this.user_genomes_featuregroup.set('disabled', false);
        this.dna.set('disabled', false);
        this.protein.set('disabled', false);
      } else if (this.input_fasta.checked == true) {
        this.user_genomes_fasta.set('required', true);
        this.user_genomes_fasta.set('disabled', false);
      } else if (this.input_sequence.checked == true) {
        this.fasta_keyboard_input.set('required', true);
        this.fasta_keyboard_input.set('disabled', false);
      }
      this.validate();
    },

    checkFasta: function () {
      // Check the FASTA data.
      var fastaText = this.fasta_keyboard_input.get('value');
      var fastaObject = this.validateFasta(fastaText);
      // Replace the FASTA data with trimmed data.
      this.fasta_keyboard_input.set('value', fastaObject.trimFasta);
      // Update the error message.
      this.sequence_message.innerHTML = fastaObject.message;
      // Set the validity and check that there are at least two sequences.
      if (fastaObject.valid && fastaObject.numseq >= 2) {
        this.validFasta = true;
        return true;
      }
      if (fastaObject.valid) {
        this.sequence_message.innerHTML = 'At least two sequences are required.';
        this.validFasta = false;
        return false;
      }
      this.validFasta = false;
      return false
    },

    validate: function () {
      if (this.inherited(arguments)) {
        if (this.input_sequence.get('checked') && (!this.fasta_keyboard_input.get('value') || !this.validFasta)) {
          this.submitButton.set('disabled', true);
          return false;
        }
        this.submitButton.set('disabled', false);
        return true;
      }
      this.submitButton.set('disabled', true);
      return false;
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    getValues: function () {
      var values = this.inherited(arguments);
      if (!values.fasta_keyboard_input) {
        values.fasta_keyboard_input = '';
      }
      if (values.user_genomes_featuregroup) {
        var featureGroups = [values.user_genomes_featuregroup];
        values.feature_groups = featureGroups;
        delete values.user_genomes_featuregroup;
      }
      var fastaFiles = [];
      var my_input_type = '';
      if (values.user_genomes_alignment) {
        my_input_type = 'user_genomes_alignment';
      } else if (values.user_genomes_fasta) {
        my_input_type = 'user_genomes_fasta';
      }
      if (!values.alphabet) {
        values.alphabet = 'dna';
      }
      if (my_input_type) {
        var rec = {};
        rec.type = this[my_input_type].searchBox.onChange.target.item.type;
        if (rec.type.search('protein') > -1) {
          values.alphabet = 'protein';
        }
        rec.file = this[my_input_type].get('value');
        fastaFiles.push(rec);
        delete values[my_input_type];
      }
      if (fastaFiles.length > 0) {
        values.fasta_files = fastaFiles;
      }
      return values;
    },

    checkBaseParameters: function (values, seqcomp_values) {
      seqcomp_values.output_path = values.output_path;
      this.output_folder = values.output_path;
      seqcomp_values.output_file = values.output_file;
      this.output_name = values.output_file;
      return seqcomp_values;
    },

    intakeRerunForm: function () {
      var localStorage = window.localStorage;
      if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
        var param_dict = { 'output_folder': 'output_path', 'strategy': 'aligner' };
        var job_data = JSON.parse(localStorage.getItem('bvbrc_rerun_job'));
        this.setStatusFormFill(job_data);
        this.setAlphabetFormFill(job_data);
        this.setUnalignedInputFormFill(job_data);
        AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
        // this.addSequenceFilesFormFill(job_data);
        localStorage.removeItem('bvbrc_rerun_job');
        this.form_flag = true;
      }
    },

    setStatusFormFill: function (job_data) {
      var status = job_data['input_status'];
      console.log(job_data);
      if (status === 'aligned') {
        this.unaligned.set('checked', false);
        this.aligned.set('checked', true);
        this.onChangeStatus();
        console.log(job_data['fasta_files']['file']);
        this.user_genomes_alignment.set('value', job_data['fasta_files'][0]['file']);
      }
    },

    setAlphabetFormFill: function (job_data) {
      if (job_data['alphabet'] == 'dna') {
        this.protein.set('checked', false);
        this.dna.set('checked', true);
      }
      else {
        this.dna.set('checked', false);
        this.protein.set('checked', true);
      }
    },

    setUnalignedInputFormFill: function (job_data) {
      if (job_data['input_status'] === 'aligned') {
        return;
      }
      if (job_data['input_type'] === 'input_group') {
        this.input_group.set('checked', true);
        this.input_fasta.set('checked', false);
        this.input_sequence.set('checked', false);
        this.user_genomes_featuregroup.set('value', job_data['feature_groups'][0]);
      }
      else if (job_data['input_type'] === 'input_fasta') {
        this.input_group.set('checked', false);
        this.input_fasta.set('checked', true);
        this.input_sequence.set('checked', false);
        this.user_genomes_fasta.set('value', job_data['fasta_files'][0]['file']);
      }
      else if (job_data['input_type'] === 'input_sequence') {
        this.input_group.set('checked', false);
        this.input_fasta.set('checked', false);
        this.input_sequence.set('checked', true);
        this.fasta_keyboard_input.set('value', job_data['fasta_keyboard_input']);
      }
      else {
        console.log('Error: invalid unaligned input');

      }
    }
  });
});
