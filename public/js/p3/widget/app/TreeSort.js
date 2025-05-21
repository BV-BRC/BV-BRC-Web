define([
   'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
   'dojo/on', 'dojo/query', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
   './AppBase', 'dijit/form/Checkbox',
   'dojo/text!./templates/TreeSort.html', 'dijit/form/Form',
   '../../util/PathJoin', '../../WorkspaceManager'
], function (
   declare, lang, Deferred,
   on, query, domClass, domConstruct, domStyle, Topic,
   AppBase, Checkbox,
   Template, FormMixin, PathJoin, WorkspaceManager

) {

   // TODO: This could be expanded to include other segmented viruses.
   const SegmentedViruses = {
      influenza: {
         segments: [
            { name: "PB2", isDefault: false },
            { name: "PB1", isDefault: false },
            { name: "PA", isDefault: false },
            { name: "HA", isDefault: true },
            { name: "NP", isDefault: false },
            { name: "NA", isDefault: false },
            { name: "MP", isDefault: false },
            { name: "NS", isDefault: false }
         ]
      }
   }


   const InferenceMethodOptions = [
      { value: "local", label: "local (default)" },
      { value: "mincut", label: "mincut" } // Always determine the most parsimonious reassortment placement even in ambiguous circumstances
   ]

   // An "enum" for input sources
   const InputSource = Object.freeze({
      FastaData: "fasta_data",
      FastaExistingDataset: "fasta_existing_dataset",
      FastaFileID: "fasta_file_id",
      FastaGroupID: "fasta_group_id",
   })

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
      defaultPath: "", // The workspace manager's default folder.
      demo: true, // dmd
      form_flag: false, // TODO: This is something related to intakeRerunForm
      pageTitle: "TreeSort Service | BV-BRC",
      requireAuth: false,  // dmd
      templateString: Template,
      tutorialLink: "tutorial/treesort/treesort.html",
      videoLink: "",


      // TODO: A future version can use this variable to lookup different segments in the SegmentedViruses JSON.
      virusTaxon: "influenza",



      //----------------------------------------------------------------------------------------------------------------------------
      // Data
      //----------------------------------------------------------------------------------------------------------------------------
      inputSource: InputSource.FastaFileID, // The default input source

      //----------------------------------------------------------------------------------------------------------------------------
      // References to HTML elements/controls
      //----------------------------------------------------------------------------------------------------------------------------
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
      inputSource_FastaDataEl: null,
      inputSource_FastaExistingDatasetEl: null,
      inputSource_FastaFileIdEl: null,
      inputSource_FastaGroupIdEl: null,

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
      segmentsContainerEl: null,
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

      // Dynamically generate segment controls and add them to the page.
      createSegmentControls: function () {

         //const containerEl = document.querySelector(".segmentsPanel");
         if (!this.segmentsContainerEl) { throw new Error("Invalid segments container element"); }

         const segments = SegmentedViruses[this.virusTaxon].segments;
         if (!segments) { throw new Error("Invalid virus segment data"); }

         segments.forEach((segment_, index_) => {

            // Create a checkbox for a segment and add its DOM element to the page.
            const checkbox = new Checkbox({
               id: `${index_}_segmentCheckbox`,
               name: segment_.name,
               checked: true,
               value: segment_.name
            })

            this.segmentsContainerEl.appendChild(checkbox.domNode);

            // Initialize the checkbox dijit widget.
            checkbox.startup();

            // Create a label element and add it to the page.
            const label = document.createElement("label");
            label.setAttribute("for", `${index_}_segmentCheckbox`);
            label.innerHTML = segment_.name;
            label.style.marginRight = "1.0rem";

            this.segmentsContainerEl.appendChild(label);
         })
      },

      // Iterate over the virus taxon's segments to create list options.
      getSegmentOptions: function () {

         const segments = SegmentedViruses[this.virusTaxon].segments;
         if (!segments) { throw new Error("Invalid virus segment data"); }

         return segments.map((segment_) => {
            let label = segment_.name;
            if (segment_.isDefault) { label += " (default) "; }
            return { value: segment_.name, label: label};
         });
      },

      getValues: function () {

         var _self = this;

         /*var sequence = this.sequence.get('value');
         var output_file = this.output_file.get('value');
         var output_path = this.output_path.get('value');*/


         let deviation = this.deviationEl.get("value");
         let equalRates = this.equalRatesEl.get("checked");

         /*fastaDataEl
         fastaExistingDatasetEl
         fastaFileIdEl
         fastaGroupIdEl*/
         let inferenceMethod = this.inferenceMethodEl.get("value");
         let isTimeScaled = this.isTimeScaledEl.get("checked");
         let matchRegex = this.matchRegexEl.get("value");
         let matchType = this.matchTypeEl.get("value");
         let noCollapse = this.noCollapseEl.get("checked");
         //outputPathEl
         let pValue = this.pValueEl.get("value");
         let refSegment = this.refSegmentEl.get("value");
         let refTreeInference = this.refTreeInferenceEl.get("value");

         // TODO: Segments

         // Prepare the submission values (I think this will become job_desc.json)
         let submit_values = {
            "clades_path": "",
            "deviation": deviation,
            "equal_rates": equalRates,
            "inference_method": inferenceMethod,
            "input_fasta_existing_dataset": null,
            "input_fasta_data": null,
            "input_fasta_file_id": null,
            "input_fasta_group_id": null,
            "input_source": this.input_source,
            "is_time_scaled": isTimeScaled,
            "match_regex": matchRegex,
            "match_type": matchType,
            "no_collapse": noCollapse,
            "output_path": null,
            "p_value": pValue,
            "ref_segment": refSegment,
            "ref_tree_inference": refTreeInference,
            "segments": null
         };

         console.log(submit_values)

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

      // Handle a change event on the match_type list.
      handleMatchTypeChange: function () {

         if (this.matchTypeEl.value == MatchType.Regex) {
            this.matchRegexContainerEl.style.display = "block";
            this.matchRegexEl.set("required", true);

         } else {
            this.matchRegexContainerEl.style.display = "none";
            this.matchRegexEl.set("required", false);
         }

         return;
      },

      intakeRerunForm: function () {

         // We are assuming that there's only 1 rerun key in the query string parameters.
         let service_fields = window.location.search.replace('?', '');
         let rerun_fields = service_fields.split('=');
         let rerun_key;
         if (rerun_fields.length > 1) {
            try {
               rerun_key = rerun_fields[1];

               // Look for an existing job_data object from session storage.
               let sessionStorage = window.sessionStorage;
               if (sessionStorage.hasOwnProperty(rerun_key)) {
                  this.form_flag = true;

                  // Deserialize the job_data
                  let jobData = JSON.parse(sessionStorage.getItem(rerun_key));
                  if (jobData) { this.populateFromJobData(jobData); }
               }
            } catch (error) {
               console.log(`Error during intakeRerunForm: ${error}`);
            } finally {
               sessionStorage.removeItem(rerun_key);
            }
         }
      },

      // Handle a change event on the input_source radio buttons.
      onInputSourceChange: function (evt) {

         // Hide all FASTA panels
         this.fastaDataPanelEl.style.display = "none";
         this.fastaFileIdPanelEl.style.display = "none";
         this.fastaGroupIdPanelEl.style.display = "none";
         this.fastaExistingDatasetPanelEl.style.display = "none";

         // Make all FASTA elements optional.
         this.fastaDataEl.set("required", false);
         this.fastaFileIdEl.set("required", false);
         this.fastaGroupIdEl.set("required", false);
         this.fastaExistingDatasetEl.set("required", false);

         // The selected input source control determines which table is displayed.
         if (this.inputSourceFastaDataEl.checked) {
            this.input_source = "fasta_data";
            this.fastaDataPanelEl.style.display = "block";
            this.fastaDataEl.set("required", true);

         } else if (this.inputSourceFastaFileIdEl.checked) {
            this.input_source = "fasta_file_id";
            this.fastaFileIdPanelEl.style.display = "block";
            this.fastaFileIdEl.set("required", true);

         } else if (this.inputSourceFastaGroupIdEl.checked) {
            this.input_source = "fasta_group_id";
            this.fastaGroupIdPanelEl.style.display = "block";
            this.fastaGroupIdEl.set("required", true);

         } else if (this.inputSourceFastaExistingDatasetEl.checked) {
            this.input_source = "existing_dataset";
            this.fastaExistingDatasetPanelEl.style.display = "block";
            this.fastaExistingDatasetEl.set("required", true);

         } else {
            console.log("unrecognized input source")
         }

         if (!evt) { this.validate(); }
      },

      onOutputPathChange: function (evt) {

      },

      onReset: function () {

         // TODO: What does this do?
         this.inherited(arguments);
      },

      openJobsList: function () {
         Topic.publish('/navigate', { href: '/job/' });
      },

      populateFromJobData: function (jobData) {



      },

      resubmit: function () {
         domClass.remove(query('.service_form')[0], 'hidden');
         domClass.remove(query('.appSubmissionArea')[0], 'hidden');
         query('.reSubmitBtn').style('visibility', 'hidden');
      },

      setTooltips: function () {
         new Tooltip({
            connectId: ['exclude_tooltip'],
            label: 'OR: mark the source sequence with < and >: e.g. ...ATCT&#60;CCCC&#62;TCAT.. forbids primers in the central CCCC. '
         });

      },

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

         // Populate the select lists.
         this.inferenceMethodEl.addOption(InferenceMethodOptions);
         this.matchTypeEl.addOption(MatchTypeOptions);
         this.refSegmentEl.addOption(this.getSegmentOptions());
         this.refTreeInferenceEl.addOption(RefTreeInferenceOptions);

         // Dynamically generate segment controls and add them to the page.
         this.createSegmentControls();

         this._started = true;

         try {
            this.intakeRerunForm();
         } catch (error) {
            console.error(error);
         }

         // TEST: Click the input source radio button.
         switch (this.inputSource) {

            case InputSource.FastaData:
               this.inputSourceFastaDataEl.set("checked", true);
               break;

            case InputSource.FastaExistingDataset:
               this.inputSourceFastaExistingDatasetEl.set("checked", true);
               break;

            case InputSource.FastaData:
               this.inputSourceFastaDataEl.set("checked", true);
               break;

            case InputSource.FastaData:
               this.inputSourceFastaDataEl.set("checked", true);
               break;

            default:

         }
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

      // TEST
      validateDeviation: function (value_, evt_) {

         console.log("value_ = ", value_)
         console.log("evt_ = ", evt_)

         this.getValues();

         return;
      },

      validateFastaData: function (evt) {

         let fasta = this.fastaDataEl.get("value");
         if (!fasta) { }

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

      },

      validatePValue: function (evt) {

      }

   });
});
