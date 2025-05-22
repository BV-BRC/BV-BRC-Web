define([
   'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
   'dojo/on', 'dojo/query', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
   './AppBase', 'dijit/form/Checkbox', 'dijit/Tooltip',
   'dojo/text!./templates/TreeSort.html', 'dijit/form/Form',
   '../../util/PathJoin', '../../WorkspaceManager'
], function (
   declare, lang, Deferred,
   on, query, domClass, domConstruct, domStyle, Topic,
   AppBase, Checkbox, Tooltip,
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
      outputPathMessageEl: null,

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

      segmentCheckboxes: [],


      // C-tor
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

         this.segmentCheckboxes = [];

         segments.forEach((segment_, index_) => {

            // Create a checkbox for a segment and add its DOM element to the page.
            const checkbox = new Checkbox({
               id: `segmentCheckbox_${index_}`,
               name: segment_.name,
               checked: true,
               value: segment_.name
            })

            this.segmentsContainerEl.appendChild(checkbox.domNode);

            // Initialize the checkbox dijit widget.
            checkbox.startup();

            // Add the widget to the array of segment checkbox references.
            this.segmentCheckboxes.push(checkbox);

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

         let deviation = this.deviationEl.get("value");
         let equalRates = this.equalRatesEl.get("checked");

         let fastaData = null;
         let fastaExistingDataset = null;
         let fastaFileId = null;
         let fastaGroupId = null;

         switch (this.inputSource) {
            case InputSource.FastaData:
               fastaData = this.fastaDataEl.get("value");
               console.log(this.fastaDataEl)
               break;

            case InputSource.FastaExistingDataset:
               fastaExistingDataset = this.fastaExistingDatasetEl.get("value");
               break;

            case InputSource.FastaFileID:
               fastaFileId = this.fastaFileIdEl.get("value");
               break;

            case InputSource.FastaGroupID:
               fastaGroupId = this.fastaGroupIdEl.get("value");
               break;

            default:
               // TODO: error!
         }

         let inferenceMethod = this.inferenceMethodEl.get("value");
         let isTimeScaled = this.isTimeScaledEl.get("checked");
         let matchRegex = this.matchRegexEl.get("value");
         let matchType = this.matchTypeEl.get("value");
         let noCollapse = this.noCollapseEl.get("checked");
         let outputPath = this.outputPathEl.get("value");
         let pValue = this.pValueEl.get("value");
         let refSegment = this.refSegmentEl.get("value");
         let refTreeInference = this.refTreeInferenceEl.get("value");

         let segments = "";

         // Segments
         if (this.segmentCheckboxes) {
            this.segmentCheckboxes.forEach(checkbox_ => {
               if (checkbox_.get("checked")) {
                  if (segments.length > 0) { segments += ","; }
                  segments += checkbox_.get("name");
               }
            })
         }

         // Prepare the submission values (I think this will become job_desc.json)
         let submit_values = {
            "clades_path": "",
            "deviation": deviation,
            "equal_rates": equalRates,
            "inference_method": inferenceMethod,
            "input_fasta_data": fastaData,
            "input_fasta_existing_dataset": fastaExistingDataset,
            "input_fasta_file_id": fastaFileId,
            "input_fasta_group_id": fastaGroupId,
            "input_source": this.inputSource,
            "is_time_scaled": isTimeScaled,
            "match_regex": matchRegex,
            "match_type": matchType,
            "no_collapse": noCollapse,
            "output_path": outputPath,
            "p_value": pValue,
            "ref_segment": refSegment,
            "ref_tree_inference": refTreeInference,
            "segments": segments
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

      // Handle a change event on the input_source radio buttons.
      handleInputSourceChange: function (evt) {

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
         if (this.inputSource_FastaDataEl.checked) {
            this.inputSource = InputSource.FastaData;
            this.fastaDataPanelEl.style.display = "block";
            this.fastaDataEl.set("required", true);

         } else if (this.inputSource_FastaFileIdEl.checked) {
            this.inputSource = InputSource.FastaFileID;
            this.fastaFileIdPanelEl.style.display = "block";
            this.fastaFileIdEl.set("required", true);

         } else if (this.inputSource_FastaGroupIdEl.checked) {
            this.inputSource = InputSource.FastaGroupID;
            this.fastaGroupIdPanelEl.style.display = "block";
            this.fastaGroupIdEl.set("required", true);

         } else if (this.inputSource_FastaExistingDatasetEl.checked) {
            this.inputSource = InputSource.FastaExistingDataset;
            this.fastaExistingDatasetPanelEl.style.display = "block";
            this.fastaExistingDatasetEl.set("required", true);

         } else {
            console.log("unrecognized input source")
         }

         if (!evt) { this.validate(); }
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

      onReset: function () {

         // TODO: What does this do?
         this.inherited(arguments);
      },

      openJobsList: function () {
         Topic.publish('/navigate', { href: '/job/' });
      },

      populateFromJobData: function (jobData) {

         if (!jobData) { throw new Error("Invalid job data"); }

         // TODO: clades_path
         if (jobData.deviation) { this.deviationEl.set("value", jobData.deviation); }
         if (jobData.equal_rates) { this.equalRatesEl.set("checked", jobData.equal_rates); }
         if (jobData.inference_method) { this.inferenceMethodEl.set("value", jobData.inference_method); }
         if (jobData.input_fasta_data) { this.fastaDataEl.set("value", jobData.input_fasta_data); }
         if (jobData.input_fasta_existing_dataset) { this.fastaFileIdEl.set("value", jobData.input_fasta_existing_dataset); }
         if (jobData.input_fasta_group_id) { this.fastaGroupIdEl.set("value", jobData.input_fasta_group_id); }
         if (jobData.input_source) { this.inputSource = jobData.input_source; }
         if (jobData.is_time_scaled) { this.isTimeScaledEl.set("checked", jobData.is_time_scaled); }
         if (jobData.match_regex) { this.matchRegexEl.set("value", jobData.match_regex); }
         if (jobData.match_type) { this.matchTypeEl.set("value", jobData.match_type); }
         if (jobData.no_collapse) { this.noCollapseEl.set("checked", jobData.no_collapse); }
         if (jobData.output_path) { this.outputPathEl.set("value", jobData.output_path); }
         if (jobData.p_value) { this.pValueEl.set("value", jobData.p_value); }
         if (jobData.ref_segment) { this.refSegmentEl.set("value", jobData.ref_segment); }
         if (jobData.ref_tree_inference) { this.refTreeInferenceEl.set("value", jobData.ref_tree_inference); }

         if (jobData.segments) {
            const segmentArray = jobData.segments.split(",");
            if (segmentArray && this.segmentCheckboxes) {

               // Iterate over all segment checkboxes.
               this.segmentCheckboxes.forEach(checkbox_ => {

                  // If the segment array contains the checkbox name, checked = true.
                  checkbox_.set("checked", segmentArray.includes(checkbox_.get("name")));
               })
            }
         }


      },

      resubmit: function () {
         domClass.remove(query('.service_form')[0], 'hidden');
         domClass.remove(query('.appSubmissionArea')[0], 'hidden');
         query('.reSubmitBtn').style('visibility', 'hidden');
      },

      setTooltips: function () {
         new Tooltip({
            connectId: ["output_path_tooltip"],
            label: "The path to the output file where the tree will be saved in nexus format."
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

         // Click the input source radio button.
         switch (this.inputSource) {

            case InputSource.FastaData:
               this.inputSource_FastaDataEl.focusNode.click();
               break;

            case InputSource.FastaExistingDataset:
               this.inputSource_FastaExistingDatasetEl.focusNode.click();
               break;

            case InputSource.FastaData:
               this.inputSource_FastaDataEl.focusNode.click();
               break;

            case InputSource.FastaData:
               this.inputSource_FastaDataEl.focusNode.click();
               break;

            default:
               this.inputSource_FastaExistingDatasetEl.focusNode.click();
         }

         // Add tooltips
         this.setTooltips();
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

      // Validate the deviation widget.
      validateDeviation: function (strValue_) {

         let errorMessage = "";
         let isValid = true;

         let value = parseInt(strValue_);
         if (isNaN(value)) {
            isValid = false;
            errorMessage = "Enter a valid integer";
         } else if (value < 1.0) {
            isValid = false;
            errorMessage = "Enter an integer ≥ 1";
         }

         if (!isValid) {
            this.deviationEl.set("state", "Error");
            this.deviationEl.set("message", errorMessage);
            this.deviationMessageEl.innerHTML = errorMessage;
         } else {

            // Clear any existing error status.
            this.deviationEl.set("state", "");
            this.deviationEl.set("message", "");
            this.deviationMessageEl.innerHTML = "";
         }

         // REMOVE THIS SOON!
         this.getValues();

         return;
      },

      validateFastaData: function () {

         // Get the FASTA text and validate it.
         let fastaText = this.fastaDataEl.get("value");
         const result = this.validateFasta(fastaText, 'DNA', true, 'record_1');

         /*
         The result object schema:
         {
            valid,
            status,
            numseq,
            message,
            trimFasta
         }
         */

         // Replace the FASTA text with trimmed text.
         this.fastaDataEl.set('value', result.trimFasta);

         // Update the error message.
         if (result.status == "need_dna") {
            this.fastaDataMessageEl.innerHTML = `TreeSort requires nucleotide sequences. ${result.message}`;
         } else {
            this.fastaDataMessageEl.innerHTML = result.message;
         }

         // Set the validity with the number of records.
         if (result.valid) {
            this.validFasta = result.numseq;
            return true;
         }

         this.validFasta = 0;

         return false;
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

      validateMatchRegex: function () {

         let isValid = true;

         let regex = this.matchRegexEl.get("value");
         if (regex) { regex = regex.trim(); }

         if (!regex || regex.length < 1) {
            isValid = false;
            this.matchRegexEl.set("state", "Error");
            this.matchRegexEl.set("message", "Enter a non-empty regular expression");
            this.matchRegexMessageEl.innerHTML = "Enter a non-empty regular expression";
         } else {
            this.matchRegexEl.set("state", "");
            this.matchRegexEl.set("message", "");
            this.matchRegexMessageEl.innerHTML = "";
         }

         return isValid;
      },

      // Validate the output path.
      validateOutputPath: function () {

         let isValid = true;

         let outputPath = this.outputPathEl.get("value");
         if (outputPath) { outputPath = regex.trim(); }

         if (!outputPath || outputPath.length < 1) {
            isValid = false;
            this.outputPathEl.set("state", "Error");
            this.outputPathEl.set("message", "Enter an output path");
            this.outputPathMessageEl.innerHTML = "Enter an output path";
         } else {
            this.outputPathEl.set("state", "");
            this.outputPathEl.set("message", "");
            this.outputPathMessageEl.innerHTML = "";
         }

         return isValid;
      },

      // Validate the p-value cuttoff.
      validatePValue: function (strValue_) {

         let errorMessage = "";
         let isValid = true;

         let value = parseFloat(strValue_);
         if (isNaN(value)) {
            isValid = false;
            errorMessage = "Please enter a valid number";
         } else if (value < 0 || value > 1.0) {
            isValid = false;
            errorMessage = "Please enter a number between 0 and 1";
         }

         if (!isValid) {
            this.pValueEl.set("state", "Error");
            this.pValueEl.set("message", errorMessage);
            this.pValueMessageEl.innerHTML = errorMessage;
         } else {
            // Clear any existing error status.
            this.pValueEl.set("state", "");
            this.pValueEl.set("message", "");
            this.pValueMessageEl.innerHTML = "";
         }

         return;
      }

   });
});
