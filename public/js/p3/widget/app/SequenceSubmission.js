define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred', 'dojo/store/Memory', 'dojo/on', 'dojo/query',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic', 'dojo/when', 'dojo/request',
  './AppBase', 'dojox/data/CsvStore', '../../store/SequenceSubmissionSample', 'dojo/text!./templates/SequenceSubmission.html',
  'dijit/form/Form', '../../util/PathJoin', '../../WorkspaceManager', 'dijit/registry', 'dijit/Dialog', 'FileSaver'
], function (
  declare, lang, Deferred, Memory, on, query,
  domClass, domConstruct, domStyle, Topic, when, request,
  AppBase, CsvStore, SubmissionSample, Template,
  FormMixin, PathJoin, WorkspaceManager, registry, Dialog, saveAs
) {

  return declare([AppBase], {
    baseClass: 'SequenceSubmission',
    requireAuth: true,
    applicationDescription: 'The Sequence Submission service allows user to validate and submit virus sequences to NCBI ' +
        'Genbank. User-provided metadata and FASTA sequences are validated against the Genbank data submission standards ' +
        'to identify any sequence errors before submission.  Sequences are also annotated using the VIGOR4 and FLAN annotation ' +
        'tools for internal use by users. The Sequence Submission service provides a validation report that should be reviewed ' +
        'by the user before submitting the sequences to the Genbank.',
    videoLink: '',
    templateFolderURL: 'https://www.bv-brc.org/workspace/BVBRC@patricbrc.org/BV-BRC%20Templates',
    pageTitle: 'Sequence Submission Service | BV-BRC',
    appBaseURL: 'Sequence Submission',
    templateString: Template,
    applicationName: 'SequenceSubmission',
    applicationLabel: 'Sequence Submission',
    applicationHelp: 'quick_references/services/sequence_submission_service.html',
    tutorialLink: 'tutorial/sequence_submission/sequence_submission.html',
    validFasta: 0,
    loadingMask: null,
    result_store: null,
    result_grid: null,
    defaultPath: '',
    demo: false,
    sequence_type: null,
    allowMultiple: true,
    input_source: null,
    usPhonePattern: '^\\(?(\\d{3})\\)?[-| ]?(\\d{3})[-| ]?(\\d{4})$',
    intPhonePattern: '^\\d(\\d|-){7,20}',
    sampleIdKey: 'Unique_Sample_Identifier',
    sequenceIdKey: 'Unique_Sequence_Identifier',
    numberOfSequences: 0,

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

      this.submitterrow.turnedOn = (this.submitterrow.style.display != 'none');
      on(this.submitterinfo, 'click', lang.hitch(this, function () {
        this.submitterrow.turnedOn = (this.submitterrow.style.display != 'none');
        if (!this.submitterrow.turnedOn) {
          this.submitterrow.turnedOn = true;
          this.submitterrow.style.display = 'block';
          this.submittericon.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.submitterrow.turnedOn = false;
          this.submitterrow.style.display = 'none';
          this.submittericon.className = 'fa icon-caret-down fa-1';
        }
      }));

      // activate genome group selector when user is logged in
      if (window.App.user) {
        this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;

        var user = window.App.user;
        this.first_name.set('value', user.first_name);
        this.last_name.set('value', user.last_name);
        this.affiliation.set('value', user.affiliation);
        this.email.set('value', user.email);
        this.country.set('store', this.retrieveCountryMemory());
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
    },

    retrieveCountryMemory: function () {
      const options = SubmissionSample.submissionCountryList.map(val => {
        return {
          'name': val,
          'id': val
        };
      });
      return new Memory({
        data: options
      });
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

        // Validate phone number
        if (this.phoneNumber.value) {
          const country = this.country.value;
          const pattern = country && (country === 'USA' || country === 'Canada') ? this.usPhonePattern : this.intPhonePattern;
          const re = new RegExp(pattern);
          const match = re.exec(this.phoneNumber.value.trim());
          if (!match || match.length === 0) {
            val = false;
            this.phoneNumber.focus();
            this.phoneNumber_message.innerHTML = 'Error';
            this.phoneNumber.set('message', 'Phone number is not valid.');
          } else {
            this.phoneNumber_message.innerHTML = '';
          }
        }

        if (val) {
          this.submitButton.set('disabled', false);
          return true;
        }
      }
      this.submitButton.set('disabled', true);
      return false;
    },

    validateMetadata: function (data) {
      let store = new CsvStore({data: data, identifier: 'Sample Identifier'});
      store.fetch();
      const rows = store._arrayOfAllItems;

      let validations = new Map();
      for (var data of rows) {
        const sample = new SubmissionSample({store, data});

        sample.validate();

        validations.set(sample.sampleIdentifier, sample.validations);
      }

      store.close();
      return validations;
    },

    validateFastaHeader: function (data, sampleIdentifiers) {
      // Reset number of sequences
      this.numberOfSequences = 0;

      let errors = new Map();
      errors.set('missingHeaders', []);
      errors.set('missingSamples', []);
      errors.set('missingSampleIds', []);
      errors.set('missingSequenceIds', []);
      errors.set('invalidSampleId', []);
      errors.set('invalidSequenceId', []);
      errors.set('sampleContainsMoreThan8Sequences', []);
      errors.set('duplicatedSequenceId', []);
      errors.set('invalidNucleotype', []);
      let sampleSequenceMap = new Map();
      this.ignoreMaxFastaTextLimit = true;
      const reto = this.validateFasta(data, 'aa', false);

      if (reto.valid) {
        const nucleotypeRegex = new RegExp(/^[ACGTURYSWKMBDHVN]+$/, 'i');
        const records = reto.trimFasta.split(/[>>]/);
        for (let record of records) {
          if (record.trim() != '') {
            this.numberOfSequences += 1;
            const values = record.split('\n');
            // We made sure header exists in validateFasta
            const header = values.shift();

            let sampleId;
            let sequenceId;

            const isSampleIdExists = header.includes(this.sampleIdKey);
            const isSequenceIdExists = header.includes(this.sequenceIdKey);

            // Check if both unique sample id and unique sequence id are provided
            if (isSampleIdExists && isSequenceIdExists) {
              const ids = header.split('|');
              sampleId = ids[0].replace(`${this.sampleIdKey}:`, '').trim();
              sequenceId = ids[1].replace(`${this.sequenceIdKey}:`, '').trim();

              // Validate sample id
              if (sampleId.length > 50 || sampleId.includes('.') || sampleId.includes('%') || sampleId.includes('\'')
                  || sampleId.includes('"') || sampleId.includes(' ') || sampleId.includes('/')) {
                errors.set('invalidSampleId', [...errors.get('invalidSampleId'), sampleId]);
              }

              // Validate sequence id
              const sequenceIdParts = sequenceId.split('-');
              let isValidSequenceId = true;
              if (sequenceIdParts.length !== 2) {
                isValidSequenceId = false;
              } else {
                // Validate segment number
                const segmentRegex = new RegExp(/^[0-8]+$/);
                const segmentNumber = sequenceIdParts[1];

                if (!segmentNumber.match(segmentRegex)) {
                  isValidSequenceId = false;
                }
              }

              if (isValidSequenceId) {
                // Validate sequence id uniqueness
                if (sampleSequenceMap.has(sampleId)) {
                  const sequenceIds = sampleSequenceMap.get(sampleId);

                  // Check if sequence id already exists for sample id
                  if (sequenceIds.includes(sequenceId) && !errors.get('duplicatedSequenceId').includes(sequenceId)) {
                    errors.set('duplicatedSequenceId', [...errors.get('duplicatedSequenceId'), sequenceId]);
                  } else if (sequenceIds.length >= 8 && !errors.get('sampleContainsMoreThan8Sequences').includes(sampleId)) {
                    errors.set('sampleContainsMoreThan8Sequences', [...errors.get('sampleContainsMoreThan8Sequences'), sampleId]);
                  }

                  sampleSequenceMap.set(sampleId, [...sequenceIds, sequenceId]);
                } else {
                  sampleSequenceMap.set(sampleId, [sequenceId]);
                }
              } else {
                errors.set('invalidSequenceId', [...errors.get('invalidSequenceId'), sequenceId]);
              }
            } else {
              if (!isSampleIdExists) {
                errors.set('missingSampleIds', [...errors.get('missingSampleIds'), header]);
              }

              if (!isSequenceIdExists) {
                errors.set('missingSequenceIds', [...errors.get('missingSequenceIds'), header]);
              }
            }

            // Validate nucleotype sequence
            if (!values.join('').match(nucleotypeRegex)) {
              errors.set('invalidNucleotype', [...errors.get('invalidNucleotype'), header]);
            }
          }
        }
      } else {
        if (reto.status == 'invalid_start') {
          errors.set('missingHeaders', `Header is missing. ${reto.message}`);
        }
      }

      const ids = [...sampleSequenceMap.keys()];
      for (let sampleIdentifier of sampleIdentifiers) {
        if (!ids.includes(sampleIdentifier)) {
          errors.set('missingSamples', [...errors.get('missingSamples'), sampleIdentifier]);
        }
      }

      return errors;
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

    onSubmit: async function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        domClass.add(this.domNode, 'Working');
        domClass.remove(this.domNode, 'Error');
        domClass.remove(this.domNode, 'Submitted');
        this.submitButton.set('disabled', true);

        let isValid = true;

        let fastaData, metadata;
        if (_self.input_source == 'fasta_file') {
          const objs = await WorkspaceManager.getObjects([this.metadata.value, this.query_fasta.value], false);
          metadata = objs.find(o => o.metadata.type === 'csv').data;
          fastaData = objs.find(o => o.metadata.type.includes('fasta') || o.metadata.type == ('contigs')).data;
        } else {
          const obj = await WorkspaceManager.getObject(this.metadata.value, false);
          metadata = obj.data;
          fastaData = this.sequence.value;
        }

        const sampleValidations = this.validateMetadata(metadata);
        const sampleIdentifiers = [...sampleValidations.keys()];

        // Make sure metadata file is not empty
        if (sampleIdentifiers.length === 0) {
          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Error');
          _self.errorMessage.innerHTML = 'Metadata file is empty. Please make sure to select a file with at least one sample.';
        } else {
          const fastaErrors = this.validateFastaHeader(fastaData, sampleIdentifiers);

          // Generate error and warning HTMLs
          let metadataErrorHTML = '';
          let metadataWarningHTML = '';
          for (const [id, validations] of sampleValidations) {
            if (validations.length > 0) {
              let errorHTML = '';
              let warningHTML = '';
              for (let validation of validations) {
                if (validation.type === 'error') {
                  errorHTML += `<li>${validation.message}</li>`;
                } else if (validation.type === 'warning') {
                  warningHTML += `<li>${validation.message}</li>`;
                }
              }

              if (errorHTML) {
                metadataErrorHTML += `Sample Id: ${id}<br><ul>${errorHTML}</ul><br>`;
              }
              if (warningHTML) {
                metadataWarningHTML += `Sample Id: ${id}<br><ul>${warningHTML}</ul><br>`;
              }
              isValid = false;
            }
          }

          let fastaErrorHTML = '';
          for (const [key, errors] of fastaErrors) {
            if (errors.length > 0) {
              let displayMetadataError = '';
              if (key == 'missingSamples') {
                displayMetadataError += 'Sample(s) provided in metadata file are missing in FASTA file.<br>';
              }
              if (key == 'missingSampleIds') {
                fastaErrorHTML += 'Unique_Sample_Identifier is missing or misspelled in the header.<br>';
              }
              if (key == 'missingSequenceIds') {
                fastaErrorHTML += 'Unique_Sequence_Identifier is missing or misspelled in the header.<br>';
              }
              if (key == 'invalidSampleId') {
                fastaErrorHTML += 'Sample id(s) are not valid. Sample id cannot be longer than 50 characters or cannot ' +
                    'include ".", "%", "\'", """, " ", "/".<br>';
              }
              if (key == 'invalidSequenceId') {
                fastaErrorHTML += 'Sequence id(s) are not valid. Valid Format: "yourSampleId-segmentNumber". Valid Segment Numbers: [1-8]<br>';
              }
              if (key == 'sampleContainsMoreThan8Sequences') {
                fastaErrorHTML += 'Sample cannot contain more than 8 sequences.<br>';
              }
              if (key == 'duplicatedSequenceId') {
                fastaErrorHTML += 'There are more than 1 sequence id for the sample.<br>';
              }
              if (key == 'invalidNucleotype') {
                fastaErrorHTML += 'Invalid nucleotype sequence(s). Sequence can only have "ACGTURYSWKMBDHVN" nucleotide codes.<br>';
              }

              if (key == 'missingHeaders') {
                fastaErrorHTML += errors + '<br>';
              } else if (key == 'missingSamples') {
                displayMetadataError += '<ul>';
                for (let error of errors) {
                  displayMetadataError += `<li>${error}</li>`;
                }
                displayMetadataError += '</ul><br>';

                metadataErrorHTML = displayMetadataError + metadataErrorHTML;
              } else {
                fastaErrorHTML += '<ul>';
                for (let error of errors) {
                  fastaErrorHTML += `<li>${error}</li>`;
                }
                fastaErrorHTML += '</ul><br>';
              }
              isValid = false;
            }
          }


          if (isValid) {
            var values = this.getValues();
            values['numberOfSequences'] = _self.numberOfSequences;

            _self.workingMessage.innerHTML = 'Submitting Sequence Submission job';

            var start_params = {
              'base_url': window.App.appBaseURL
            }
            _self.doSubmit(values, start_params).then(function (results) {
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

              //Notify submission team
              let formData = new FormData();
              formData.append('subject', 'New Sequence Submission job is submitted');
              formData.append('ownerId', results[0].owner);
              formData.append('submissionJobPath', results[0].output_path + '/' + results[0].output_file);
              formData.append('numberOfSequences', _self.numberOfSequences);

              when(request.post('/notifySubmitSequence', {
                headers: {
                  'Authorization': (window.App.authorizationToken || ''),
                  'enctype': 'multipart/form-data'
                },
                data: formData
              }), function (results) {
                console.log('Succ notifying team for the submission: ', results);
              }, function (err) {
                console.log('Error notifying team for the submission: ', err);
              });
            }, function (err) {
              console.log('Error:', err);
              domClass.remove(_self.domNode, 'Working');
              domClass.add(_self.domNode, 'Error');
              _self.errorMessage.innerHTML = err;
            });
          } else {
            let contentText = '';
            if (metadataWarningHTML) {
              contentText += `<b>Please review metadata warnings below;</b><br>${metadataWarningHTML}`;
            }
            if (metadataErrorHTML) {
              contentText += `<b>Please review metadata errors below;</b><br>${metadataErrorHTML}`;
            }
            if (fastaErrorHTML) {
              contentText += `<b>Please review fasta errors below;</b><br>${fastaErrorHTML}`;
            }

            errorDialog = new Dialog({
              title: 'Validation Error(s)',
              style: 'min-width: 500px;',
              content: contentText
            });

            downloadErrorReport = function () {
              saveAs(new Blob([contentText], {type: 'text/html;charset=utf-8;'}), 'validation_error_report.html');
            };

            domClass.remove(_self.domNode, 'Working');
            domClass.add(_self.domNode, 'Error');
            _self.errorMessage.innerHTML = 'There are errors in your submission sequence or metadata file. ' +
                '<a onclick="javascript:downloadErrorReport();">Download</a> the error report, or click ' +
                '<a onclick="javascript:errorDialog.show();">here</a> to view the report.';
          }
        }
      } else {
        console.log('Form is incomplete');
      }
    },

    getValues: function () {
      var _self = this;
      var sequence = this.sequence.get('value');
      var output_file = this.output_file.get('value');
      var output_path = this.output_path.get('value');

      // prepare submission values
      var submit_values = {
        'input_source': _self.input_source,
        'metadata': this.metadata.value,
        'output_file': output_file,
        'output_path': output_path,
        'first_name': this.first_name.value,
        'last_name': this.last_name.value,
        'email': this.email.value,
        'consortium': this.consortium.value,
        'affiliation': this.affiliation.value,
        'phoneNumber': this.phoneNumber.value,
        'country': this.country.value,
        'street': this.street.value,
        'postal_code': this.postal_code.value,
        'city': this.city.value,
        'state': this.state_info.value
      };

      if (_self.input_source == 'fasta_file') {
        submit_values['input_fasta_file'] = _self.query_fasta.get('value');
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
      if (this.input_sequence.checked == true) {
        this.input_source = 'fasta_data';
        this.sequence_table.style.display = 'table';
        this.fasta_table.style.display = 'none';
        this.sequence.set('required', true);
      }
      else if (this.input_fasta.checked == true) {
        this.input_source = 'fasta_file';
        this.sequence_table.style.display = 'none';
        this.fasta_table.style.display = 'table';
        this.query_fasta.set('required', true);
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
        this.sequence.set('value', job_data['input_fasta_data']);
      }
      else if (s === 'fasta_file') {
        this.input_fasta.set('checked', true);
        this.input_sequence.set('checked', false);
        this.query_fasta.set('value', job_data['input_fasta_file']);
      }

      this.output_path.set('value', job_data['output_path']);
      this.metadata.set('value', job_data['metadata']);
      this.country.set('value', job_data['country']);
      this.phoneNumber.set('value', job_data['phoneNumber']);
      this.consortium.set('value', job_data['consortium']);
    },

    downloadMetadataTemplate: function () {
      Deferred.when(WorkspaceManager.getDownloadUrls(this.metadataTemplatePath), function (url) {
        if (url && url.length > 0 && url[0] !== null) {
          window.open(url);
        }
      });
    }
  });
});
