define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/query', 'dojo/dom-class', 'dojo/topic', 'dojo/dom', './AppBase',
  'dojo/text!./templates/HASubtypeNumberingConversion.html'
], function (
  declare, lang, query, domClass, Topic, dom, AppBase,
  Template
) {

  const HaReferenceTypes = [
    {value: 'H1_PR34', label: 'H1PR34'},
    {value: 'H1_1933', label: 'H11933'},
    {value: 'H1post1995', label: 'H1post1995'},
    {value: 'H1N1pdm', label: 'H1N1pdm'},
    {value: 'H2', label: 'H2'},
    {value: 'H3', label: 'H3'},
    {value: 'H4', label: 'H4'},
    {value: 'H5mEA-nonGsGD', label: 'H5mEAnonGsGD'},
    {value: 'H5', label: 'H5'},
    {value: 'H5c221', label: 'H5c221'},
    {value: 'H6', label: 'H6'},
    {value: 'H7N3', label: 'H7N3'},
    {value: 'H7N7', label: 'H7N7'},
    {value: 'H8', label: 'H8'},
    {value: 'H9', label: 'H9'},
    {value: 'H10', label: 'H10'},
    {value: 'H11', label: 'H11'},
    {value: 'H12', label: 'H12'},
    {value: 'H13', label: 'H13'},
    {value: 'H14', label: 'H14'},
    {value: 'H15', label: 'H15'},
    {value: 'H16', label: 'H16'},
    {value: 'H17', label: 'H17'},
    {value: 'H18', label: 'H18'},
    {value: 'B/HONG KONG/8/73', label: 'BHongKong'},
    {value: 'B/FLORIDA/4/2006', label: 'BFlorida'},
    {value: 'B/HUMAN/BRISBANE/60/2008', label: 'BBrisbane'}
  ];

  return declare([AppBase], {
    baseClass: 'HASubtypeNumberingConversion',
    requireAuth: true,
    pageTitle: 'HA Subtype Numbering Conversion | BV-BRC',
    appBaseURL: 'HA Subtype Numbering Conversion',
    templateString: Template,
    applicationName: 'HASubtypeNumberingConversion',
    applicationLabel: 'HA Subtype Numbering Conversion',
    applicationHelp: 'quick_references/services/ha_numbering_service.html',
    tutorialLink: 'tutorial/ha_numbering/ha_numbering.html ',
    validFasta: 0,
    loadingMask: null,
    result_store: null,
    result_grid: null,
    defaultPath: '',
    demo: false,
    sequence_type: null,
    allowMultiple: true,
    input_source: null,
    conversionSchemeMultiSelect: null,

    constructor: function () {
      this.genomeToAttachPt = ['genome_id'];
      this.fastaToAttachPt = ['query_fasta'];
    },

    startup: function () {
      if (this._started) { return; }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);

      this.conversionScheme.addOption(HaReferenceTypes);
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

        if (val && this.conversionScheme.get('value').length > 0) {
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
      return false;
    },

    getValues: function () {
      var _self = this;
      var sequence = this.sequence.get('value');
      var output_file = this.output_file.get('value');
      var output_path = this.output_path.get('value');
      var selectedTypes = this.conversionScheme.get('value');

      // prepare submission values
      var submit_values = {
        'input_source': _self.input_source,
        'output_file': output_file,
        'output_path': output_path,
        'types': selectedTypes
      };

      if (_self.input_source == 'fasta_file') {
        submit_values['input_fasta_file'] = _self.query_fasta.get('value');
      } else if (_self.input_source == 'feature_group') {
        submit_values['input_feature_group'] = _self.feature_group.get('value');
      } else if (_self.input_source == 'fasta_data') {
        submit_values['input_fasta_data'] = '';
        if (sequence) {
          if (this.validFasta == 0) {
            sequence = '>fasta_record1\n' + sequence;
          }
          submit_values['input_fasta_data'] = sequence;
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
      this.sequence.set('required', false);
      this.query_fasta.set('required', false);
      this.feature_group.set('required', false);
      if (this.input_sequence.checked == true) {
        this.input_source = 'fasta_data';
        this.sequence_table.style.display = 'table';
        this.fasta_table.style.display = 'none';
        this.feature_group_table.style.display = 'none';
        this.sequence.set('required', true);
      } else if (this.input_fasta.checked == true) {
        this.input_source = 'fasta_file';
        this.sequence_table.style.display = 'none';
        this.fasta_table.style.display = 'table';
        this.feature_group_table.style.display = 'none';
        this.query_fasta.set('required', true);
      } else if (this.input_feature_group.checked == true) {
        this.input_source = 'feature_group';
        this.sequence_table.style.display = 'none';
        this.fasta_table.style.display = 'none';
        this.feature_group_table.style.display = 'table';
        this.feature_group.set('required', true);
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
          this.setInputSource(job_data);
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setInputSource: function (job_data) {
      var s = job_data['input_source'];
      if (s === 'fasta_data') {
        this.input_sequence.set('checked', true);
        this.input_fasta.set('checked', false);
        this.input_feature_group.set('checked', false);
        this.sequence.set('value', job_data['input_fasta_data']);
      } else if (s === 'fasta_file') {
        this.input_fasta.set('checked', true);
        this.input_sequence.set('checked', false);
        this.input_feature_group.set('checked', false);
        this.query_fasta.set('value', job_data['input_fasta_file']);
      } else if (s === 'feature_group') {
        this.input_feature_group.set('checked', true);
        this.input_fasta.set('checked', false);
        this.input_sequence.set('checked', false);
        this.feature_group.set('value', job_data['input_feature_group']);
      }

      this.output_path.set('value', job_data['output_path']);
    }
  });
});
