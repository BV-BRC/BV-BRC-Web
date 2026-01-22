define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/MSA.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox', 'dijit/form/Textarea', 'dijit/form/Select', 'dijit/form/FilteringSelect',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog', '../../DataAPI',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when'
], function (
  declare, WidgetBase, Topic, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox, Textarea, Select, FilteringSelect,
  query, dom, popup, Tooltip, Dialog, TooltipDialog, DataAPI,
  children, WorkspaceManager, Memory, Standby, when
) {
  return declare([AppBase], {
    baseClass: 'MSA',
    templateString: Template,
    applicationName: 'MSA',
    requireAuth: true,
    applicationLabel: 'Multiple Sequence Alignment and SNP / Variation Analysis',
    applicationDescription: 'The Multiple Sequence Alignment (MSA) and Single Nucleotide Polymorphism (SNP) / Variation Analysis Service allows users to choose an alignment algorithm to align sequences selected from: a search result, a FASTA file saved to the workspace, or through simply cutting and pasting. The service can also be used for variation and SNP analysis with feature groups, FASTA files, aligned FASTA files, and user input FASTA records.',
    applicationHelp: 'quick_references/services/msa_snp_variation_service.html',
    tutorialLink: 'tutorial/msa_snp_variation/msa_snp_variation.html',
    videoLink: 'https://youtu.be/ea6GboAZPQs',
    pageTitle: 'Multiple Sequence Alignment and SNP / Variation Analysis Service | BV-BRC',
    appBaseURL: 'MSA',
    defaultPath: '',
    startingRows: 14,
    alphabet: '',
    ref_id_length: 60,
    input_seq_rows: 10,
    input_seq_min_seqs: 2,
    maxGenomes: 5000,
    maxGenomeLength: 250000,
    fid_value: '',
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
      this.setTooltips();
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }

      this.strategyrow.turnedOn = (this.strategyrow.style.display != 'none');
      on(this.strategy, 'click', lang.hitch(this, function () {
        this.strategyrow.turnedOn = (this.strategyrow.style.display != 'none');
        if (!this.strategyrow.turnedOn) {
          this.strategyrow.turnedOn = true;
          this.strategyrow.style.display = 'block';
          this.strategyicon.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.strategyrow.turnedOn = false;
          this.strategyrow.style.display = 'none';
          this.strategyicon.className = 'fa icon-caret-down fa-1';
        }
      }));
    },

    onChangeStatus: function (start) {
      this.inputInitialize();
      this.user_genomes_alignment.set('disabled', true);
      if (this.unaligned.checked == true) {
        this.unaligned_box.style.display = 'inline-block';
        this.aligned_box.style.display = 'none';
        this.aligner_table.style.display = 'table';
        this.onChangeType();
      } else if (this.aligned.checked == true) {
        if (this.feature_id.get('checked') || this.genome_id.get('checked') || this.reference_string.get('checked')) {
          this.reference_none.set('checked', true);
        }
        this.aligner_table.style.display = 'none';
        this.unaligned_box.style.display = 'none';
        this.aligned_box.style.display = 'inline-block';
        this.user_genomes_alignment.set('required', true);
        this.user_genomes_alignment.set('disabled', false);
        this.reference_none.set('disabled', false);
        this.reference_first_table.style.display = 'table';
        this.reference_first.set('disabled', false);
        this.feature_id_table.style.display = 'none';
        this.feature_id.set('disabled', true);
        this.genome_id_table.style.display = 'none';
        this.genome_id.set('disabled', true);
        this.reference_string_table.style.display = 'none';
        this.reference_string.set('disabled', true);
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
      this.select_genomegroup.set('disabled', true);
      // Do not require anything
      this.sequence_message.innerHTML = '';
      this.genomegroup_message.innerHTML = '';
      this.aligner.set('required', false);
      this.user_genomes_featuregroup.set('required', false);
      this.dna.set('required', false);
      this.protein.set('required', false);
      this.user_genomes_fasta.set('required', false);
      this.fasta_keyboard_input.set('required', false);
      this.user_genomes_alignment.set('required', false);
      this.select_genomegroup.set('required', false);
      this.featuregroup_table.style.display = 'none';
      this.genomegroup_table.style.display = 'none';
      this.fastafile_table.style.display = 'none';
      this.fastainput_table.style.display = 'none';
      this.reference_none.set('disabled', false);
      this.reference_first_table.style.display = 'table';
      this.reference_first.set('disabled', false);
      this.feature_id_table.style.display = 'table';
      this.feature_id.set('disabled', false);
      this.genome_id_table.style.display = 'table';
      this.genome_id.set('disabled', false);
      this.reference_string_table.style.display = 'table';
      this.reference_string.set('disabled', false);
    },

    onChangeType: function () {
      this.inputInitialize();
      this.aligner.set('required', true);
      this.aligner.set('disabled', false);
      this.genomegroup_message.innerHTML = '';
      // Reset the reference to none if the current reference selection makes no sense for the type.
      if (((this.feature_id.get('checked') || this.genome_id.get('checked')) &&
        (this.input_fasta.get('checked') || this.input_sequence.get('checked'))) ||
        (this.reference_first.get('checked') &&
          (this.input_group.get('checked') || this.input_genomegroup.get('checked')))) {
        this.reference_none.set('checked', true);
      }
      if ((this.feature_id.get('checked') && this.input_genomegroup.get('checked')) ||
        (this.genome_id.get('checked') && this.input_group.get('checked'))) {
        this.reference_none.set('checked', true);
      }
      if (this.input_group.checked == true) {
        this.user_genomes_featuregroup.set('required', true);
        this.user_genomes_featuregroup.set('disabled', false);
        this.dna.set('disabled', false);
        this.protein.set('disabled', false);
        this.featuregroup_table.style.display = 'table';
        this.reference_first_table.style.display = 'none';
        this.reference_first.set('disabled', true);
        this.genome_id_table.style.display = 'none';
        this.genome_id.set('disabled', true);
        // this.handleFeatureGroup();
      } else if (this.input_genomegroup.checked == true) {
        this.select_genomegroup.set('required', true);
        this.select_genomegroup.set('disabled', false);
        this.genomegroup_table.style.display = 'table';
        this.reference_first_table.style.display = 'none';
        this.reference_first.set('disabled', true);
        this.feature_id_table.style.display = 'none';
        this.feature_id.set('disabled', true);
        // this.handleGenomeGroup();
      } else if (this.input_fasta.checked == true) {
        this.user_genomes_fasta.set('required', true);
        this.user_genomes_fasta.set('disabled', false);
        this.fastafile_table.style.display = 'table';
        this.feature_id_table.style.display = 'none';
        this.feature_id.set('disabled', true);
        this.genome_id_table.style.display = 'none';
        this.genome_id.set('disabled', true);
      } else if (this.input_sequence.checked == true) {
        this.fasta_keyboard_input.set('required', true);
        this.fasta_keyboard_input.set('disabled', false);
        this.fasta_keyboard_input.set('rows', this.input_seq_rows);
        this.fastainput_table.style.display = 'table';
        this.feature_id_table.style.display = 'none';
        this.feature_id.set('disabled', true);
        this.genome_id_table.style.display = 'none';
        this.genome_id.set('disabled', true);
        this.checkFasta();
      }
      this.validate();
    },

    referenceInitialize: function () {
      this.select_feature_id.set('disabled', true);
      this.select_genome_id.set('disabled', true);
      this.fasta_keyboard_reference.set('disabled', true);
      this.select_feature_id.set('required', false);
      this.select_genome_id.set('required', false);
      this.fasta_keyboard_reference.set('required', false);
      this.fasta_reference_message.innerHTML = '';
      this.ref_feature_id_table.style.display = 'none';
      this.ref_genome_id_table.style.display = 'none';
      this.ref_seq_table.style.display = 'none';
    },

    onChangeReference: function () {
      this.referenceInitialize();
      if (this.feature_id.checked == true) {
        this.select_feature_id.set('disabled', false);
        this.select_feature_id.set('required', true);
        this.ref_feature_id_table.style.display = 'table';
      } else if (this.genome_id.checked == true) {
        this.select_genome_id.set('disabled', false);
        this.select_genome_id.set('required', true);
        this.ref_genome_id_table.style.display = 'table';
      } else if (this.reference_string.checked == true) {
        this.fasta_keyboard_reference.set('disabled', false);
        this.fasta_keyboard_reference.set('required', true);
        this.fasta_keyboard_reference.set('rows', this.input_seq_rows);
        this.ref_seq_table.style.display = 'table';
        this.checkRefFasta();
      }
      if (this.input_sequence.get('checked')) {
        this.checkFasta();
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
      // Set the alphabet if we get a valid protein or dna.
      if (fastaObject.status == 'valid_protein') {
        this.alphabet = 'protein';
      } else if (fastaObject.status == 'valid_dna') {
        this.alphabet = 'dna';
      }
      // Set the validity and check that there are at least two sequences.
      var minseqs = this.input_seq_min_seqs;
      var minseqs_msg = 'two';
      if (this.reference_string.get('checked')) { // One seq if using a reference seq.
        minseqs = this.input_seq_min_seqs - 1;
        minseqs_msg = 'one';
      }
      if (fastaObject.valid && fastaObject.numseq >= minseqs) {
        this.validFasta = true;
        return true;
      }
      if (fastaObject.valid) {
        this.sequence_message.innerHTML = 'At least ' + minseqs_msg + ' sequence(s) are required.';
        this.validFasta = false;
        return false;
      }
      this.validFasta = false;
      return false
    },

    checkRefFasta: function () {
      // Check the FASTA data.
      var fastaText = this.fasta_keyboard_reference.get('value');
      var fastaObject = this.validateFasta(fastaText, undefined, undefined, 'reference_seq');
      // Replace the FASTA data with trimmed data.
      this.fasta_keyboard_reference.set('value', fastaObject.trimFasta);
      // Update the error message.
      this.fasta_reference_message.innerHTML = fastaObject.message;
      // Set the validity and check that there are is only one sequence.
      if (fastaObject.valid && fastaObject.numseq == 1) {
        this.validFasta = true;
        return true;
      }
      if (fastaObject.valid) {
        this.fasta_reference_message.innerHTML = 'Only one sequence is allowed.';
        this.validFasta = false;
        return false;
      }
      this.validFasta = false;
      return false
    },

    initializeRefId: function () {
      // this.select_feature_id.reset();
      // this.select_feature_id.set('store', new Memory({
      //   data: [{ label: '', id: '', selected: true }]
      // }));
      this.select_feature_id.set('value', '');
    },

    handleFeatureGroup: function (feature_group) {
      var self = this;
      self.initializeRefId();
      DataAPI.queryGenomeFeatures('in(feature_id,FeatureGroup(' + encodeURIComponent(self.user_genomes_featuregroup.get('value')) + '))', { 'limit': 1000 })
        .then((result) => {
          const feature_list = [];
          result.items.forEach(function (sel) {
            feature_list.push({ id: sel.patric_id, label: sel.patric_id + ' -- ' + sel.product.substring(0, 60) });
          });
          // console.log(feature_list);
          self.select_feature_id.set('store', new Memory({ data: feature_list }));
          // console.log('Feature value: ' + self.fid_value);
          if (self.fid_value) {
            self.select_feature_id.set('value', self.fid_value);
            self.fid_value = '';
          }
        }).catch((error) => {
          console.log('Getting the features from the feature group could not be done.');
          console.log(error);
        });
      self.validate();
    },

    // handleGenomeGroup: function (value = '') {
    //   this.initializeRefId();
    //   DataAPI.queryGenomes('in(genome_id,GenomeGroup(' + encodeURIComponent(this.select_genomegroup.get('value')) + '))', { 'limit': 1000 })
    //     .then((result) => {
    //       const id_list = [];
    //       result.items.forEach(function (sel) {
    //         id_list.push({ label: sel.genome_id + ' -- ' + sel.genome_name.substring(0, 60), value: sel.genome_id });
    //       });
    //       this.select_feature_id.set('options', id_list);
    //       if (value) {
    //         this.select_feature_id.set('value', value)
    //       }
    //     });
    //   this.validate();
    // },

    setTooltips: function () {
      new Tooltip({
        connectId: ['genomeGroup_tooltip'],
        label: 'The genome group must have less than ' + this.maxGenomes.toString() + ' genomes.<br> Each genome must: <br>- Be a virus <br>- Be less than ' + this.maxGenomeLength.toString() + ' base pairs in length '
      });
      new Tooltip({
        connectId: ['reference_first_tooltip'],
        label: 'This option applies to a selected fasta file or a fasta file entered in the text box.'
      });
      new Tooltip({
        connectId: ['feature_id_tooltip'],
        label: 'This option applies to a selected feature group or a selected genome group.'
      });
    },

    validate: function (value) {
      var def = this.inherited(arguments);
      this.genomegroup_message.innerHTML = '';
      this.genome_id_message.innerHTML = '';
      this.fastafile_message.innerHTML = '';
      this.submitButton.set('disabled', true);

      // Hide strategy options if muscle aligner selected
      if (this.aligner.get('value') === 'Muscle' || this.aligned.checked == true) {
        this.strategy.style.display = 'none';
        this.strategyrow.style.display = 'none';
      } else if (!(value && value.srcElement && value.srcElement.name && value.srcElement.name === 'strategy_settings')){
        this.strategy.style.display = 'inline-block';
        this.strategyrow.turnedOn = false;
        this.strategyrow.style.display = 'none';
        this.strategyicon.className = 'fa icon-caret-down fa-1';
      }

      // console.log('def: ' + def);
      if (this.select_genomegroup.get('required') && this.select_genomegroup.searchBox.item && (this.input_genomegroup.checked == true) && (this.unaligned.checked == true)) {
        var ref_id = this.select_genome_id.get('value');
        var id_valid = true;
        if (this.genome_id.get('checked')) {
          id_valid = this.validateReferenceID(ref_id);
        }
        var genomes_valid = this.validateGenomeGroup();
        if (id_valid && genomes_valid && def) {
          this.submitButton.set('disabled', false);
        }
        return id_valid && genomes_valid && def
      }
      if (this.input_sequence.get('checked') && (!this.fasta_keyboard_input.get('value') || !this.validFasta)) {
        // this.submitButton.set('disabled', true);
        return false;
      } else if (this.input_fasta.checked == true) {
        const fastaFilePath = this.user_genomes_fasta.value;
        if (fastaFilePath) {
          when(WorkspaceManager.getObject(fastaFilePath), lang.hitch(this, function (res) {
            const type = res.metadata.type;
            const seqType = type.includes('protein') ? 'protein' : 'dna';
            const reto = this.validateFasta(res.data, seqType, false);

            if (!reto.valid) {
              this.fastafile_message.innerHTML = reto.message;
              this.submitButton.set('disabled', true);
            } else if (reto.numseq < this.input_seq_min_seqs) {
              this.fastafile_message.innerHTML = 'At least ' +  this.input_seq_min_seqs + ' sequence(s) are required.';
              this.submitButton.set('disabled', true);
            }
          }));
        }
      }
      if (def) {
        this.submitButton.set('disabled', false);
      }
      return def;
    },

    validateGenomeGroup: function () {
      // this.submitButton.set('disabled', true);
      var path = this.select_genomegroup.searchBox.item.path;
      var genomes_valid = true;
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list && res.data.id_list.genome_id) {
          // viral genome checks
          genomes_valid = this.checkViralGenomes(res.data.id_list.genome_id);
        }
      }));
      return genomes_valid;
    },

    validateReferenceID: function (ref_id) {
      var valid = true;
      // console.log('ref_id: ' + ref_id);
      if (!ref_id) {
        // this.submitButton.set('disabled', true);
        return false;
      }
      var query = `in(genome_id,(${ref_id}))&select(genome_id,superkingdom,genome_length)&limit(1)`
      // console.log('ref query = ', query);
      DataAPI.queryGenomes(query).then(lang.hitch(this, function (res) {
        var errors = {};
        res.items.forEach(lang.hitch(this, function (obj) {
          if (obj.superkingdom && obj.superkingdom != 'Viruses') {
            valid = false;
            errors['kingdom_error'] = 'Error: The genome selected needs to be a viral genome.';
          }
          if (obj.genome_length > this.maxGenomeLength) {
            valid = false;
            errors['genomelength_error'] = 'Error: The genome exceeds the maximum length of ' + this.maxGenomeLength.toString();
          }
        }));
        if (!valid) {
          this.submitButton.set('disabled', true);
          var error_msg = 'This is an invalid genome.';
          Object.values(errors).forEach(lang.hitch(this, function (err) {
            error_msg = error_msg + '<br>- ' + err;
          }));
          this.genome_id_message.innerHTML = error_msg;
        }
      }));
      return valid;
    },

    // TODO: there may be a limit to the number of genome_ids that can be passed into the query, check that
    checkViralGenomes: function (genome_id_list) {
      // As far as I have seen Bacteria do not have a superkingdom field, only viruses
      var query = `in(genome_id,(${genome_id_list.toString()}))&select(genome_id,superkingdom,genome_length)&limit(${genome_id_list.length})`;
      // console.log('query = ', query);
      var all_valid = true;
      DataAPI.queryGenomes(query).then(lang.hitch(this, function (res) {
        // console.log('result = ', res);
        var errors = {};
        if (genome_id_list.length > this.maxGenomes) {
          errors['genomecount_error'] = 'Error: the number of genomes ( ' + genome_id_list.length + ' ) exceeds the maximum count of ' + this.maxGenomes.toString();
          all_valid = false;
        }
        res.items.forEach(lang.hitch(this, function (obj) {
          if (obj.superkingdom) {
            if (obj.superkingdom != 'Viruses') {
              all_valid = false;
              if (!Object.keys(errors).includes('kingdom_error')) {
                errors['kingdom_error'] = 'Invalid Superkingdom: only virus genomes are permitted<br>First occurence for genome_id: ' + obj.genome_id;
              }
            }
            if (obj.genome_length > this.maxGenomeLength) {
              all_valid = false;
              if (!Object.keys(errors).includes('genomelength_error')) {
                errors['genomelength_error'] = 'Error: genome exceeds maximum length ' + this.maxGenomeLength.toString() + '<br>First occurence for genome_id: ' + obj.genome_id;
              }
            }
          } else { // TODO: don't think this is correct, add other criteria
            all_valid = false;
          }
        }));
        // if (all_valid && def) {
        //   // this.submitButton.set('disabled', false);
        //   // this.genomegroup_message.innerHTML = '';
        // } else

        if (!all_valid) {
          this.submitButton.set('disabled', true);
          var error_msg = 'This is an invalid genome group. The following errors were found:';
          Object.values(errors).forEach(lang.hitch(this, function (err) {
            error_msg = error_msg + '<br>- ' + err;
          }));
          this.genomegroup_message.innerHTML = error_msg;
        }
      }));
      return all_valid;
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
        values.feature_groups = [values.user_genomes_featuregroup];
        delete values.user_genomes_featuregroup;
      }
      if (values.select_genomegroup) {
        values.select_genomegroup = [values.select_genomegroup];
      }
      var fastaFiles = [];
      var my_input_type = '';
      if (values.user_genomes_alignment) {
        my_input_type = 'user_genomes_alignment';
      } else if (values.user_genomes_fasta) {
        my_input_type = 'user_genomes_fasta';
      }
      if (!values.user_genomes_alignment) {
        delete values.user_genomes_alignment;
      }
      // Set the alphabet
      if (!values.alphabet) {
        values.alphabet = 'dna';
      }
      if (this.input_sequence.get('checked')) {
        values.alphabet = this.alphabet;
      }
      // Adjust the reference type
      values.ref_type = values.ref_type.replace('reference_', '');
      values.ref_string = '';
      if (values.ref_type == 'string') {
        values.ref_string = values.fasta_keyboard_reference;
        delete values.fasta_keyboard_reference;
      } else if (values.ref_type == 'feature_id') {
        values.ref_string = values.select_feature_id;
        delete values.select_feature_id;
      } else if (values.ref_type == 'genome_id') {
        values.ref_string = values.select_genome_id;
        delete values.select_genome_id;
      }
      // Create array of fasta files if needed.
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
      if (this.aligner.get('value') === 'Mafft') {
        values.strategy = query("input[type=radio][name=strategy_settings]:checked")[0].value;
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
      // assuming only one key
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        try {
          rerun_key = rerun_fields[1];
          var sessionStorage = window.sessionStorage;
          if (sessionStorage.hasOwnProperty(rerun_key)) {
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            this.setStatusFormFill(job_data);
            this.setAlphabetFormFill(job_data);
            this.setUnalignedInputFormFill(job_data);
            this.setReferenceFormFill(job_data);
            // this.addSequenceFilesFormFill(job_data);
            this.setAlignerFormFill(job_data);
            this.form_flag = true;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    // service defaults to Mafft, so switch to muscle if in job data
    // set value is not working for some reason
    setAlignerFormFill: function (job_data) {
      if (Object.keys(job_data).includes('aligner')) {
        if (job_data['aligner'] === 'Muscle') {
          this.aligner.set('value', 'Muscle');
        }
      }
    },

    setStatusFormFill: function (job_data) {
      var status = job_data['input_status'];
      // console.log(job_data);
      if (status === 'aligned') {
        this.unaligned.set('checked', false);
        this.aligned.set('checked', true);
        this.onChangeStatus();
        // console.log(job_data['fasta_files']['file']);
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

    setReferenceFormFill: function (job_data) {
      if (job_data['ref_type'] == 'first') {
        this.reference_first.set('checked', true);
      } else if (job_data['ref_type'] == 'genome_id') {
        this.genome_id.set('checked', true);
        this.select_genome_id.set('value', job_data['ref_string']);
      } else if (job_data['ref_type'] == 'string') {
        this.reference_string.set('checked', true);
        this.fasta_keyboard_reference.set('value', job_data['ref_string']);
      } else if (job_data['ref_type'] == 'none') {
        this.reference_none.set('checked', true);
      }
    },

    setUnalignedInputFormFill: function (job_data) {
      if (job_data['input_status'] === 'aligned') {
        return;
      }
      this.input_group.set('checked', false);
      this.input_genomegroup.set('checked', false);
      this.input_fasta.set('checked', false);
      this.input_sequence.set('checked', false);
      if (job_data['input_type'] === 'input_group') {
        this.input_group.set('checked', true);
        if (job_data['ref_type'] == 'feature_id') {
          this.feature_id.set('checked', true);
          this.fid_value = job_data['ref_string'];
        }
        this.user_genomes_featuregroup.set('value', job_data['feature_groups'][0]);
      }
      else if (job_data['input_type'] === 'input_fasta') {
        this.input_fasta.set('checked', true);
        this.user_genomes_fasta.set('value', job_data['fasta_files'][0]['file']);
      }
      else if (job_data['input_type'] === 'input_sequence') {
        this.input_sequence.set('checked', true);
        this.fasta_keyboard_input.set('value', job_data['fasta_keyboard_input']);
      }
      else if (job_data['input_type'] === 'input_genomegroup') {
        this.input_genomegroup.set('checked', true);
        this.select_genomegroup.set('value', job_data['select_genomegroup'][0]);
      }
      else {
        console.log('Error: invalid unaligned input');
      }
    }
  });
});
