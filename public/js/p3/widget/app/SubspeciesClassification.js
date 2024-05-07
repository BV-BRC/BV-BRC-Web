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
    { value: 'MASTADENOA', label: 'Adenoviridae - Human mastadenovirus A [complete genome, genomic RNA]' },
    { value: 'MASTADENOB', label: 'Adenoviridae - Human mastadenovirus B [complete genome, genomic RNA]' },
    { value: 'MASTADENOC', label: 'Adenoviridae - Human mastadenovirus C [complete genome, genomic RNA]' },
    { value: 'MASTADENOE', label: 'Adenoviridae - Human mastadenovirus E [complete genome, genomic RNA]' },
    { value: 'MASTADENOF', label: 'Adenoviridae - Human mastadenovirus F [complete genome, genomic RNA]' },
    { type: 'separator' },
    { value: 'NOROORF1', label: 'Caliciviridae - Norovirus [VP2 gene, genomic RNA]' },
    { value: 'NOROORF2', label: 'Caliciviridae - Norovirus [VP1 gene, genomic RNA]' },
    { type: 'separator' },
    { value: 'BOVDIARRHEA1', label: 'Flaviviridae - Bovine viral diarrhea virus [5\'UTR region, genomic RNA]' },
    { value: 'DENGUE', label: 'Flaviviridae - Dengue virus [complete genome, genomic RNA' },
    { value: 'HCV', label: 'Flaviviridae - Hepatitis C virus [polyprotein gene, genomic RNA]' },
    { value: 'JAPENCEPH', label: 'Flaviviridae - Japanese encephalitis virus [complete genome, genomic RNA]' },
    { value: 'MURRAY', label: 'Flaviviridae - Murray Valley encephalitis virus [envelope protein (E), genomic RNA]' },
    { value: 'STLOUIS', label: 'Flaviviridae - St. Louis encephalitis virus [polyprotein gene, genomic RNA]' },
    { value: 'TKBENCEPH', label: 'Flaviviridae - Tick-borne encephalitis virus [polyprotein gene, genomic RNA]' },
    { value: 'WESTNILE', label: 'Flaviviridae - West Nile virus [complete genome, genomic RNA]' },
    { value: 'YELLOWFEVER', label: 'Flaviviridae - Yellow fever virus [polyprotein mRNA, mRNA]' },
    { value: 'ZIKA', label: 'Flaviviridae - Zika virus [complete genome, genomic RNA]' },
    { type: 'separator' },
    { value: 'INFLUENZAH5', label: 'Orthomyxoviridae - Influenza A H5 [Hemagglutinin gene, genomic RNA]' },
    { value: 'SWINEH1', label: 'Orthomyxoviridae - Swine influenza H1 (global classification) [Hemagglutinin gene, genomic RNA]' },
    { value: 'SWINEH1US', label: 'Orthomyxoviridae – Swine influenza H1 (US classification) [Hemagglutinin gene, genomic RNA]' },
    { value: 'SWINEH3', label: 'Orthomyxoviridae - Swine influenza H3 (global classification, beta version) [Hemagglutinin gene, genomic RNA]' },
    { type: 'separator' },
    { value: 'MEASLES', label: 'Paramyxoviridae - Measles morbillivirus [complete genome, genomic RNA]' },
    { value: 'MUMPS', label: 'Paramyxoviridae - Mumps orthorubulavirus [complete genome, genomic RNA]' },
    { type: 'separator' },
    { value: 'ROTAA', label: 'Reoviridae - Rotavirus A [complete genome, genomic RNA]' }
  ];

  return declare([AppBase], {
    baseClass: 'SubspeciesClassification',
    requireAuth: true,
    applicationDescription: 'The Subspecies Classification tool assigns the genotype/subtype of a virus, based on the genotype/subtype assignments maintained by the International Committee on Taxonomy of Viruses (ICTV). This tool infers the genotype/subtype for a query sequence from its position within a reference tree. The service uses the pplacer tool with a reference tree and reference alignment and includes the query sequence as input. Interpretation of the pplacer result is handled by Cladinator.',
    videoLink: '',
    pageTitle: 'Subspecies Classification Service | BV-BRC',
    appBaseURL: 'Subspecies Classification',
    templateString: Template,
    applicationHelp: '',
    applicationName: 'SubspeciesClassification',
    applicationLabel: 'Subspecies Classification',
    applicationHelp: 'quick_references/services/subspecies_classification_service.html',
    tutorialLink: 'tutorial/subspecies_classification/subspecies_classification.html',
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
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);

      // activate genome group selector when user is logged in
      if (window.App.user) {
        this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
      }

      this.onInputChange(true);

      this.virus_type.addOption(VirusTypes);
      this._started = true;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
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
      //var ref_msa_fasta = this.ref_msa_fasta_file.get('value');

      // prepare submission values
      var submit_values = {
        'input_source': _self.input_source,
        'virus_type': this.virus_type.value,
        'output_file': output_file,
        'output_path': output_path,
      };

      /*if (ref_msa_fasta !== '') {
        submit_values['ref_msa_fasta'] = ref_msa_fasta
      }*/

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
        try {
          rerun_key = rerun_fields[1];
          var sessionStorage = window.sessionStorage;
          if (sessionStorage.hasOwnProperty(rerun_key)) {
            this.form_flag = true;
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            this.setInputSource(job_data);
            if (Object.keys(job_data).includes('virus_type')) {
              this.virus_type.set('value', job_data['virus_type']);
            }
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setInputSource: function (job_data) {
      var s = job_data['input_source'];
      if (s === 'fasta_data') {
        this.input_sequence.set('checked', true);
        this.input_fasta.set('checked', false);
        this.sequence.set('value', job_data['input_fasta_data']);
      }
      else if (s === 'fasta_file') {
        this.input_fasta.set('checked', true);
        this.input_sequence.set('checked', false);
        this.query_fasta.set('value', job_data['input_fasta_file']);
      }

      this.output_path.set('value', job_data['output_path']);
      this.virus_type.set('value', job_data['virus_type']);
    }
  });
});
