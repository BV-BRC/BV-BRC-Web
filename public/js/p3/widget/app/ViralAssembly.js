define([
  'dojo/_base/declare', 'dojo/topic', 'dojo/_base/lang', 'dojo/on', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style',
  'dojo/text!./templates/ViralAssembly.html', 'dojo/store/Memory', 'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  './AppBase', '../../WorkspaceManager', 'dojo/request'
], function (
  declare, Topic, lang, on, domClass, domConstruct, domStyle,
  Template, Memory, popup, TooltipDialog, Dialog,
  AppBase, WorkspaceManager, xhr
) {

  return declare([AppBase], {
    baseClass: 'ViralAssembly',
    pageTitle: 'Viral Assembly Service - BETA',
    templateString: Template,
    applicationName: 'ViralAssembly',
    requireAuth: true,
    applicationLabel: 'Viral Assembly - BETA',
    applicationDescription: 'The Viral Assembly Service utilizes IRMA (Iterative Refinement Meta-Assembler) to assemble viral genomes. Users must select the virus genome for processing. This service is currently in beta, any feedback or improvement is welcomed.',
    applicationHelp: '',
    tutorialLink: 'tutorial/viral_assembly/assembly.html',
    defaultPath: '',
    srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmax=1&db=sra&field=accn&term={0}&retmode=json',
    isSRAValid: false,

    constructor: function () {
      this.paramToAttachPt = ['strategy', 'output_path', 'output_file', 'module'];
    },

    startup: function () {
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);
      var _self = this;
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    inputTypeChanged: function () {
      if (this.pairedReadCheck.checked === true) {
        document.getElementById('pairedReadLibraryBox').style.display = 'block';
        document.getElementById('singleReadLibraryBox').style.display = 'none';
        document.getElementById('sraAccessionBox').style.display = 'none';
      } else if (this.singleReadCheck.checked === true) {
        document.getElementById('pairedReadLibraryBox').style.display = 'none';
        document.getElementById('singleReadLibraryBox').style.display = 'block';
        document.getElementById('sraAccessionBox').style.display = 'none';
      } else {
        document.getElementById('pairedReadLibraryBox').style.display = 'none';
        document.getElementById('singleReadLibraryBox').style.display = 'none';
        document.getElementById('sraAccessionBox').style.display = 'block';
      }
    },

    openJobsList: function () {
      Topic.publish('/navigate', {href: '/job/'});
    },

    getValues: function () {
      let values = this.inherited(arguments);

      let assemblyValues = {
        strategy: values.strategy,
        module: values.module,
        output_path: values.output_path,
        output_file: values.output_file
      };

      if (values.inputType === 'pairedRead') {
        assemblyValues.paired_end_lib = {
          read1: values.read1,
          read2: values.read2
        };
      } else if (values.inputType === 'singleRead') {
        assemblyValues.single_end_lib = {
          read: values.read
        };
      } else {
        if (this.isSRAValid) {
          // Validate SRR accession id
          //this.onAddSRR();
          assemblyValues.srr_id = values.srr_accession;
        } else {
          return false;
        }
      }

      return assemblyValues;
    },

    onReset: function () {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');
    },

    checkParameterRequiredFields: function () {
      if (this.output_path.get('value') && this.output_file.get('displayedValue')) {
        this.validate();
      } else {
        if (this.submitButton) {
          this.submitButton.set('disabled', true);
        }
      }
    },

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkOutputName: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    onStrategyChange: function () {
      if (this.strategy.value == 'canu') {
        this.checkParameterRequiredFields();
      } else {
        this.checkParameterRequiredFields();
      }
    },

    onSRRChange: function () {
      const accession = this.srr_accession.get('value');
      this.isSRAValid = false;

      if (!accession.match(/^[a-z]{3}[0-9]+$/i)) {
        this.srr_accession_validation_message.innerHTML = 'Please provide a valid SRA number';
      } else {
        this.srr_accession.set('disabled', true);
        this.srr_accession_validation_message.innerHTML = 'Validating ' + accession + '.';

        try {
          xhr.get(lang.replace(this.srrValidationUrl, [accession]),
            {
              sync: false,
              headers: {'X-Requested-With': null},
              timeout: 15000,
              handleAs: 'text'
            }).then(
            lang.hitch(this, function (response) {
              const jsonResponse = JSON.parse(response);

              if (jsonResponse.esearchresult.count === '0') {
                this.srr_accession_validation_message.innerHTML = 'The accession is not a valid id.';
              } else {
                this.srr_accession_validation_message.innerHTML = 'The accession is a valid id.';
                this.isSRAValid = true;
              }

              this.srr_accession.set('disabled', false);
            })
          );
        } catch (e) {
          console.error(e);
          this.srr_accession_validation_message.innerHTML = 'Something went wrong. Please try again.';
        }
      }
    },

    setStrategy: function (strategy) {
      console.log('strategy = ', strategy);
      this.strategy.set('value', strategy);
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
          try {
            const jobData = JSON.parse(sessionStorage.getItem(rerun_key));

            if (jobData['module']){
              this.module.set('value', jobData['module']);
            }
            if (jobData['output_path']){
              this.output_path.set('value', jobData['output_path']);
            }
            if (jobData['srr_id']){
              this.srr_accession.set('value', jobData['srr_id']);
              this.sraAccessionCheck.set('checked', true);
              this.onSRRChange();
            } else if (jobData['paired_end_lib']) {
              this.read1.set('value', jobData['paired_end_lib'].read1);
              this.read2.set('value', jobData['paired_end_lib'].read2);
              this.pairedReadCheck.set('checked', true);
            } else if (jobData['single_end_lib']) {
              this.read.set('value', jobData['single_end_lib'].read);
              this.singleReadCheck.set('checked', true);
            }
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
