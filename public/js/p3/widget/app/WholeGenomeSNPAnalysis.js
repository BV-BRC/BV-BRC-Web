define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/WholeGenomeSNPAnalysis.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
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
    baseClass: 'Whole Genome SNP Analysis',
    templateString: Template,
    applicationName: 'WholeGenomeSNPAnalysis',
    requireAuth: true,
    applicationLabel: 'Whole Genome SNP Analysis',
    applicationDescription: 'The Whole Genome SNP Analysis service accepts genome groups. This service will identify single nucleotide polymorphisms (SNPs) for tracking viral and bacterial pathogens during outbreaks. The software, kSNP4 will identify SNPs and estimate phylogenetic trees based on those SNPs.',
    applicationHelp: 'quick_references/services/Whole Genome SNP Analysis_service.html',
    tutorialLink: 'tutorial/WholeGenome SNPAnalysis/WholeGenomeSNPAnalysis.html',
    videoLink: '',
    pageTitle: 'Whole Genome SNP Analysis Service | BV-BRC',
    appBaseURL: 'Whole Genome SNP Analysis',
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
      // on(this.max-strong-linkage), "change", (value) => {this.min_mid_linkage.set("value", value);}
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    onChangeMinMidLinkage: function () {
      console.log('called_onchange event')
      if (this.min_mid_linkage.value !== null) {
        this.max_strong_linkage.set("value", this.min_mid_linkage.value);
      }
    },

    // can delete if we field remains disabled
    onChangeMaxStrongLinkage: function () {
      console.log('called_onchange event')
      if (this.max_strong_linkage.value !== null) {
        console.log(this.max_strong_linkage.value);
        this.min_mid_linkage.set("value", this.max_strong_linkage.value);
      }
    },
    onChangeMaxMidLinkage: function () {
      console.log('called_onchange event')
      if (this.max_mid_linkage.value !== null) {
        this.min_weak_linkage.set("value", this.max_mid_linkage.value);
      }
      
    },

    // can delete if we field remains disabled
    onChangeMinWeakLinkage: function () {
      console.log('called_onchange event')
      if (this.min_weak_linkage.value !== null) {
        console.log(this.min_weak_linkage.value);
        this.max_mid_linkage.set("value", this.min_weak_linkage.value);
      }
    },
    onAddGenomeGroup: function () {
      console.log("Fetching genome group path...");
      
      var path = this.input_genome_group;
      if (!path) {
        console.warn("No genome group path provided.");
        return;
      }
    
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data === "string") {
          res.data = JSON.parse(res.data);
        }
        if (res?.data?.id_list?.genome_id) {
          var newGenomeIds = res.data.id_list.genome_id;
          this.checkBacterialGenomes(newGenomeIds, groupType, false, path);
        }
      }));
    },

    validate: function () {
      return this.inherited(arguments);
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

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    getValues: function () {
      var values = this.inherited(arguments);
      //  Adding genome type and analysis type for future dev
      values.input_genome_type = "genome_group";
      values.analysis_type = "Whole Genome SNP Analysis";
      if (values.select_genomegroup) {
        values.select_genomegroup = [values.select_genomegroup];
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
  });
});