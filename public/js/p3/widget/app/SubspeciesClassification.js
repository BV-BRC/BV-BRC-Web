define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/query', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
  './AppBase',
  'dojo/text!./templates/SubspeciesClassification.html', 'dijit/form/Form',
  '../../util/PathJoin', '../../WorkspaceManager'
], function (
  declare, lang, Deferred,
  on, query, domClass, domConstruct, domStyle, Topic,
  AppBase,
  Template, FormMixin, PathJoin, WorkspaceManager
) {

  var VirusTypes = [
    { value: 'HCV', label: 'HCV' },
    { value: 'DENGUE', label: 'Dengue' },
    { value: 'STLOUIS', label: 'St. Louis Encephalitis Virus' },
    { value: 'WESTNILE', label: 'West Nile Virus' },
    { value: 'JAPENCEPH', label: 'Japanese Encephalitis Virus' },
    { value: 'TKBENCEPH', label: 'Tick borne Encephalitis Virus' },
    { value: 'YELLOWFEVER', label: 'Yellow Fever Virus' },
    { value: 'BOVDIARRHEA1', label: 'Bovine viral diarrheal virus 1' },
    { value: 'MURRAY', label: 'Murray Valley encephalitis virus' },
    { value: 'ZIKA', label: 'Zika virus' },
    { value: 'NOROORF1', label: 'Norovirus ORF1' },
    { value: 'NOROORF2', label: 'Norovirus ORF2' }
  ];

  return declare([AppBase], {
    baseClass: 'SubspeciesClassification',
    templateString: Template,
    applicationHelp: '',
    applicationName: 'SubspeciesClassification',
    tutorialLink: '',
    validFasta: 0,
    loadingMask: null,
    result_store: null,
    result_grid: null,
    defaultPath: '',
    demo: false,
    sequence_type: null,
    allowMultiple: true,
    input_source: null,
    constructor: function () {
      this.genomeToAttachPt = ['genome_id'];
      this.genomeGroupToAttachPt = ['query_genomegroup'];
      this.fastaToAttachPt = ['query_fasta'];
    },

    startup: function () {

      if (this._started) { return; }
      this.inherited(arguments);

      // activate genome group selector when user is logged in
      if (window.App.user) {
        this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
      }

      this.onInputChange(true);

      this._started = true;
      this.form_flag = false;
      var _self = this;
      try {
        this.intakeRerunForm();
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
      this.virus_type.addOption(VirusTypes);
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    validate: function () {
      if (this.inherited(arguments)) {
        var val = true;
        switch (this.input_source) {
          case 'fasta_data': // Validate the sequence text area.
            val = (this.sequence.get('value') && this.validFasta);
            break;
          default:
            break;
        }
        if (val) {
          this.submitButton.set('disabled', false);
          return true;
        }
      }
      this.submitButton.set('disabled', true);
      return false;
    },

    checkFasta: function () {
      // Check the FASTA data.
      var fastaText = this.sequence.get('value');
      var fastaObject = this.validateFasta(fastaText, this.input_type);
      // Replace the FASTA data with trimmed data.
      this.sequence.set('value', fastaObject.trimFasta);
      // Update the error message.
      if (fastaObject.status == 'need_dna') {
        this.sequence_message.innerHTML = this.program.toUpperCase() + ' requires nucleotide sequences. ' + fastaObject.message;
      } else {
        this.sequence_message.innerHTML = fastaObject.message;
      }
      // Set the validity with the number of records.
      if (fastaObject.valid) {
        this.validFasta = fastaObject.numseq;
        return true;
      }
      this.validFasta = 0;
      return false
    },

    getValues: function () {
      var _self = this;
      var sequence = this.sequence.get('value');
      var output_file = this.output_file.get('value');
      var output_path = this.output_path.get('value');
      var ref_msa_fasta = this.ref_msa_fasta_file.get('value');

      // prepare submission values
      var submit_values = {
        'input_source': _self.input_source,
        'virus_type': this.virus_type.value,
        'output_file': output_file,
        'output_path': output_path,
      };

      if (ref_msa_fasta !== '') {
        submit_values['ref_msa_fasta'] = ref_msa_fasta
      }

      if (_self.input_source == 'fasta_file') {
        submit_values['input_fasta_file'] = _self.query_fasta.get('value')
      } else if (_self.input_source == 'fasta_data') {
        submit_values['input_fasta_data'] = '';
        if (sequence) {
          if (this.validFasta == 0) {
            sequence = '>fasta_record1\n' + sequence;
          }
          submit_values['input_fasta_data'] = sequence;
        }
      } else if (_self.input_source == 'genome_group') {
        submit_values['input_genome_group'] = _self.query_genomegroup.get('value')
      }
      if (this.demo) {
        // resultType = "custom";
        resultType = 'custom';
        submit_values['db_source'] = 'fasta_data';
        submit_values['db_fasta_data'] = '>id1\ngtgtcgtttatcagtcttgcaagaaatgtttttgtatatatatcaattgggttatttgta\ngctccaatattttcgttagtatcaattatattcactgaacgcgaagtagtagatttgttt\ngcgtatattttttctgaatatacagttaatactgtaattttaatgttaggtgttgggatt\n' +
            '>id2\nataacgttgattgttgggatagcaacagcttggtttgtaacttattattcttttcctgga\ncgtaagttttttgagatagcacttttcttgccactttcaataccagggtatatagttgca\ntatgtatatgtaaatatttttgaattttcaggtcctgtacaaagttttttaagggtgata\ntttcattggaataaaggtgattattactttcctagtgtgaaatcattagcatgtggaatt\n'
      }
      if (this.validate()) {
        return submit_values;
      }
    },

    setLiveJob: function () {
      this.live_job.value = this.live_job.checked;
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
      this.sequence.set('required', false);
      this.query_fasta.set('required', false);
      this.query_genomegroup.set('required', false);
      if (this.input_sequence.checked == true) {
        this.input_source = 'fasta_data';
        this.sequence_table.style.display = 'table';
        this.fasta_table.style.display = 'none';
        this.group_table.style.display = 'none';
        this.sequence.set('required', true);
      }
      else if (this.input_fasta.checked == true) {
        this.input_source = 'fasta_file';
        this.sequence_table.style.display = 'none';
        this.fasta_table.style.display = 'table';
        this.group_table.style.display = 'none';
        this.query_fasta.set('required', true);
      }
      else if (this.input_group.checked == true) {
        this.input_source = 'genome_group';
        this.sequence_table.style.display = 'none';
        this.fasta_table.style.display = 'none';
        this.group_table.style.display = 'table';
        this.query_genomegroup.set('required', true);
      }
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
      if (rerun_fields.length > 1) {
        rerun_key = rerun_fields[1];
        var sessionStorage = window.sessionStorage;
        if (sessionStorage.hasOwnProperty(rerun_key)) {
          this.form_flag = true;
          var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
          console.log('job_data=', job_data);
          var param_dict = { 'output_folder': 'output_path' };
          var service_specific = { 'input_fasta_data': 'sequence' };
          param_dict['service_specific'] = service_specific;
          this.setInputSource(job_data);
          console.log('query_genomegroup=', this.query_genomegroup.value);
          console.log('query_genomegroup(value)=', this.query_genomegroup.get('value'));
          AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setInputSource: function (job_data) {
      var s = job_data['input_source'];
      if (s === 'fasta_data') {
        this.input_sequence.set('checked', true);
        this.input_fasta.set('checked', false);
        this.input_group.set('checked', false);
        this.sequence.set('value', job_data['input_fasta_data']);
      }
      else if (s === 'fasta_file') {
        this.input_fasta.set('checked', true);
        this.input_sequence.set('checked', false);
        this.input_group.set('checked', false);
        this.query_fasta.set('value', job_data['input_fasta_file']);
      }
      else if (s === 'genome_group') {
        this.input_group.set('checked', true);
        this.input_sequence.set('checked', false);
        this.input_fasta.set('checked', false);
        this.query_genomegroup.set('value', job_data['input_genome_group']);
      }
    }
  });
});
