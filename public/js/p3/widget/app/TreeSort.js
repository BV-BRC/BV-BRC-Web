define([
   'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
   'dojo/on', 'dojo/query', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
   './AppBase',
   'dojo/text!./templates/TreeSort.html', 'dijit/form/Form',
   '../../util/PathJoin', '../../WorkspaceManager'
], function (
   declare, lang, Deferred,
   on, query, domClass, domConstruct, domStyle, Topic,
   AppBase,
   Template, FormMixin, PathJoin, WorkspaceManager
) {


   const FluSegmentOptions = [
      { value: "PB2", label: "PB2" },
      { value: "PB1", label: "PB1" },
      { value: "PA", label: "PA" },
      { value: "HA", label: "HA (default)" },
      { value: "NP", label: "NP" },
      { value: "NA", label: "NA" },
      { value: "MP", label: "MP" },
      { value: "NS", label: "NS" }
   ];

   const FluSegments = ["PB2", "PB1", "PA", "HA", "NP", "NA", "MP", "NS"];

   const InferenceMethodOptions = [
      { value: "local", label: "local (default)" },
      { value: "mincut", label: "mincut: Always determine the most parsimonious reassortment placement even in ambiguous circumstances" }
   ]

   const InputSourceOptions = [
      { value: "fasta_data", label: "FASTA data" },
      { value: "fasta_existing_dataset", label: "An existing dataset" },
      { value: "fasta_file_id", label: "A file from the workspace" },
      { value: "fasta_group_id", label: "A genome group" }
   ];

   // An "enum" for match types
   const MatchType = Object.freeze({
      Default: "default",
      EPI: "epi",
      Regex: "regex",
      Strain: "strain"
   });

   const MatchTypeOptions = [
      { value: MatchType.Default, label: `Default` },
      { value: MatchType.EPI, label: `EPI_ISL_XXX field` },
      { value: MatchType.Regex, label: `Regular expression` }, // Provide a regular expression to match segments across the alignments
      { value: MatchType.Strain, label: `Strain name` } // Match the names across the segments based on the strain name
   ];

   const RefTreeInferenceOptions = [
      { value: "FastTree", label: `FastTree` },
      { value: "IQTree", label: `IQ-Tree` }
   ]


   return declare([AppBase], {

      //----------------------------------------------------------------------------------------------------------------------------
      // Application settings
      //----------------------------------------------------------------------------------------------------------------------------
      appBaseURL: "TreeSort",
      applicationDescription: "The TreeSort tool infers both recent and ancestral reassortment events along the branches of a phylogenetic tree of a fixed genomic segment. It uses a statistical hypothesis testing framework to identify branches where reassortment with other segments has occurred and reports these events.",
      applicationHelp: "quick_references/services/treesort_service.html",
      applicationLabel: "TreeSort",
      applicationName: "TreeSort",
      baseClass: "TreeSort",

      // The workspace manager's default folder.
      defaultPath: "",

      demo: true, // dmd
      pageTitle: "TreeSort Service | BV-BRC",
      requireAuth: false,  // dmd
      templateString: Template,
      tutorialLink: "tutorial/treesort/treesort.html",
      videoLink: "",

      // References to HTML elements/controls
      //clades_path: null,
      deviationEl: null,
      equalRatesEl: null,

      // FASTA data elements
      fastaDataEl: null,
      fastaDataMessageEl: null,
      fastaDataPanelEl: null,

      // FASTA existing dataset elements
      fastaExistingDatasetEl: null,
      fastaExistingDatasetPanelEl: null,

      // FASTA file ID elements
      fastaFileIdEl: null,
      fastaFileIdPanelEl: null,

      // FASTA group ID elements
      fastaGroupIdEl: null,
      fastaGroupIdPanelEl: null,

      // Inference method elements
      inferenceMethodEl: null,
      inferenceMethodMessageEl: null,

      // The radio buttons that select the input source type.
      inputSourceFastaDataEl: null,
      inputSourceFastaExistingDatasetEl: null,
      inputSourceFastaFileIdEl: null,
      inputSourceFastaGroupIdEl: null,

      // "Is time scaled" element
      isTimeScaledEl: null,

      // Match regex elements
      matchRegexEl: null,
      matchRegexContainerEl: null,

      // Match type element
      matchTypeEl: null,

      // "No collapse" element
      noCollapseEl: null,

      // Output path element
      outputPathEl: null,

      // P-value elements
      pValueEl: null,
      pValueMessageEl: null,

      // Reference segment element
      refSegmentEl: null,

      // Reference tree inference element
      refTreeInferenceEl: null,

      // Segments elements
      segmentsEl: null,
      segmentsMessageEl: null,


      constructor: function () {
         //this.genomeToAttachPt = ['genome_id'];
         //this.genomeGroupToAttachPt = ['query_genomegroup'];
         //this.fastaToAttachPt = ['query_fasta'];
      },


      checkFasta: function () {

         /*
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
         }*/
         this.validFasta = 0;
         return false
      },



      checkOutputName: function () {
         if (this.demo) { return true; }
         this.validate();
         return this.inherited(arguments);
      },


      getValues: function () {

         var _self = this;

         /*var sequence = this.sequence.get('value');
         var output_file = this.output_file.get('value');
         var output_path = this.output_path.get('value');*/

         // Prepare the submission values (I think this will become job_desc.json)
         var submit_values = {
            /*'input_source': _self.input_source,
            'virus_type': this.virus_type.value,
            'output_file': output_file,
            'output_path': output_path,*/
         };


         /*
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

            resultType = 'custom';
            submit_values['db_source'] = 'fasta_data';
            submit_values['db_fasta_data'] = '>id1\ngtgtcgtttatcagtcttgcaagaaatgtttttgtatatatatcaattgggttatttgta\ngctccaatattttcgttagtatcaattatattcactgaacgcgaagtagtagatttgttt\ngcgtatattttttctgaatatacagttaatactgtaattttaatgttaggtgttgggatt\n' +
               '>id2\nataacgttgattgttgggatagcaacagcttggtttgtaacttattattcttttcctgga\ncgtaagttttttgagatagcacttttcttgccactttcaataccagggtatatagttgca\ntatgtatatgtaaatatttttgaattttcaggtcctgtacaaagttttttaagggtgata\ntttcattggaataaaggtgattattactttcctagtgtgaaatcattagcatgtggaatt\n'

         }*/
         if (this.validate()) {
            return submit_values;
         }
      },

      intakeRerunForm: function () {
         // assuming only one key
         let service_fields = window.location.search.replace('?', '');
         let rerun_fields = service_fields.split('=');
         let rerun_key;
         if (rerun_fields.length > 1) {
            try {
               rerun_key = rerun_fields[1];
               /*
               // Look for an existing job_data object from session storage.
               let sessionStorage = window.sessionStorage;
               if (sessionStorage.hasOwnProperty(rerun_key)) {
                  this.form_flag = true;

                  // Deserialize the job_data
                  let job_data = JSON.parse(sessionStorage.getItem(rerun_key));
                  this.setInputSource(job_data);

                  // Populate form controls using the job data.
                  if (Object.keys(job_data).includes('virus_type')) {
                     this.virus_type.set('value', job_data['virus_type']);
                  }
               }*/
            } catch (error) {
               console.log(`Error during intakeRerunForm: ${error}`);
            } finally {
               sessionStorage.removeItem(rerun_key);
            }
         }
      },

      // Handle a change event on the input_source radio buttons.
      onInputSourceChange: function (evt) {

         // Hide all input source tables.
         this.fasta_data_table.style.display = "none";
         this.fasta_file_id_table.style.display = "none";
         this.fasta_group_id_table.style.display = "none";
         this.fasta_existing_dataset_table.style.display = "none";

         // Remove existing requirements.
         this.fasta_data.set("required", false);
         this.fasta_file_id.set("required", false);
         this.fasta_group_id.set("required", false);
         this.fasta_existing_dataset.set("required", false);

         // The selected input source control determines which table is displayed.
         if (this.fasta_data_ctrl.checked) {
            this.input_source = "fasta_data";
            this.fasta_data_table.style.display = "table";
            this.fasta_data.set("required", true);

         } else if (this.fasta_file_id_ctrl.checked) {
            this.input_source = "fasta_file_id";
            this.fasta_file_id_table.style.display = "table";
            this.fasta_file_id.set("required", true);

         } else if (this.fasta_group_id_ctrl.checked) {
            this.input_source = "fasta_group_id";
            this.fasta_group_id_table.style.display = "table";
            this.fasta_group_id.set("required", true);

         } else if (this.existing_dataset_ctrl.checked) {
            this.input_source = "existing_dataset";
            this.fasta_existing_dataset_table.style.display = "table";
            this.fasta_existing_dataset.set("required", true);

         } else {
            console.log("unrecognized input source")
         }

         if (!evt) { this.validate(); }
      },

      // Handle a change event on the match_type list.
      onMatchTypeChange: function (evt) {

         if (this.match_type.value == MatchType.Regex) {
            this.match_regex_container.style.display = "block";
            this.match_regex.set("required", true);

         } else {
            this.match_regex_container.style.display = "none";
            this.match_regex.set("required", false);
         }

         return;
      },

      onOutputPathChange: function (evt) {

      },

      onReset: function (evt) {
         this.inherited(arguments);
      },

      openJobsList: function () {
         Topic.publish('/navigate', { href: '/job/' });
      },

      resubmit: function () {
         domClass.remove(query('.service_form')[0], 'hidden');
         domClass.remove(query('.appSubmissionArea')[0], 'hidden');
         query('.reSubmitBtn').style('visibility', 'hidden');
      },

      setInputSource: function (job_data) {

         /*
         var s = job_data['input_source'];
         if (s === 'fasta_data') {
            this.input_sequence.set('checked', true);
            this.input_fasta.set('checked', false);
            this.sequence.set('value', job_data['input_fasta_data']);
         } else if (s === 'fasta_file') {
            this.input_fasta.set('checked', true);
            this.input_sequence.set('checked', false);
            this.query_fasta.set('value', job_data['input_fasta_file']);
         }

         this.output_path.set('value', job_data['output_path']);
         this.virus_type.set('value', job_data['virus_type']);
         */
      },

      /* TODO: add these
      setTooltips: function () {
         new Tooltip({
            connectId: ['exclude_tooltip'],
            label: 'OR: mark the source sequence with < and >: e.g. ...ATCT&#60;CCCC&#62;TCAT.. forbids primers in the central CCCC. '
         });

      },*/

      startup: function() {

         if (this._started) { return; }
         if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
            return;
         }

         this.inherited(arguments);

         // Determine the default path.
         if (window.App.user) {
            this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
         }

         //this.onInputSourceChange(true);

         // Populate the select lists.
         this.inference_method.addOption(InferenceMethodOptions);
         this.match_type.addOption(MatchTypeOptions);
         this.ref_segment.addOption(FluSegmentOptions);
         this.ref_tree_inference.addOption(RefTreeInferenceOptions);

         this._started = true;

         /*try {
            this.intakeRerunForm();
         } catch (error) {
            console.error(error);
         }*/
      },

      validate: function () {
         if (this.inherited(arguments)) {

            console.log("this.inherited(arguments) = ", this.inherited(arguments))

            /*var val = true;
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
            }*/
         }
         //this.submitButton.set('disabled', true);
         //return false;
         return true;
      },

      validateFastaData: function (evt) {

         console.log(`In validateFastaData evt = `, evt)

         // input_fasta_data
      },

      validateFastaFileID: function (evt) {

         console.log(`In validateFastaFileID evt = `, evt)

         // input_fasta_file_id
      },

      validateFastaGroupID: function (evt) {

         console.log(`In validateFastaGroupID evt = `, evt)

         // input_fasta_group_id
      },

      validateFastaExistingDataset: function (evt) {

         console.log(`In validateFastaExistingDataset evt = `, evt)

        // input_fasta_existing_dataset
      },

      validateMatchRegex: function (evt) {

      }

   });
});
