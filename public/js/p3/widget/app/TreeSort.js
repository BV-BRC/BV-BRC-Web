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

   // An "enum" for inference methods
   const InferenceMethod = Object.freeze({
      Local: "local",
      MinCut: "mincut"
   })

   // Options for the inference method control.
   const InferenceMethodOptions = [
      { value: InferenceMethod.Local, label: "local (default)" },
      { value: InferenceMethod.MinCut, label: "mincut" }
   ]

   // An "enum" for input sources
   const InputSource = Object.freeze({
      FastaFileID: "fasta_file_id"
   })

   // An "enum" for match types
   const MatchType = Object.freeze({
      Default: "default",
      EPI: "epi",
      Regex: "regex",
      Strain: "strain"
   });

   // Options for the match type control.
   const MatchTypeOptions = [
      { value: MatchType.Default, label: `Default` },
      { value: MatchType.EPI, label: `EPI_ISL_XXX field` },
      { value: MatchType.Regex, label: `Regular expression` },
      { value: MatchType.Strain, label: `Strain name` }
   ];

   // An "enum" for reference tree inference.
   const RefTreeInference = Object.freeze({
      FastTree: "FastTree",
      IQTree: "IQTree"
   })

   // Options for the ref tree inference control.
   const RefTreeInferenceOptions = [
      { value: RefTreeInference.FastTree, label: `FastTree` },
      { value: RefTreeInference.IQTree, label: `IQ-Tree` }
   ]


   return declare([AppBase], {

      //----------------------------------------------------------------------------------------------------------------------------
      // Application settings
      //----------------------------------------------------------------------------------------------------------------------------
      appBaseURL: "TreeSort",
      applicationDescription: "The TreeSort tool infers both recent and ancestral reassortment events along the branches of a phylogenetic " +
         "tree of a fixed genomic segment. It uses a statistical hypothesis testing framework to identify branches where reassortment with " +
         "other segments has occurred and reports these events.",
      applicationHelp: "quick_references/services/treesort_service.html",
      applicationLabel: "TreeSort",
      applicationName: "TreeSort",
      baseClass: "TreeSort",
      defaultPath: "", // The workspace manager's default folder.
      demo: false,
      form_flag: false, // TODO: This is something related to intakeRerunForm
      pageTitle: "TreeSort Service | BV-BRC",
      requireAuth: true,
      templateString: Template,
      tutorialLink: "tutorial/treesort/treesort.html",
      videoLink: "",


      // TODO: A future version can use this variable to lookup different segments in the SegmentedViruses JSON.
      virusTaxon: "influenza",

      // This is set by createSegmentControls().
      defaultRefSegment: null,

      displayDefaults: true,

      //----------------------------------------------------------------------------------------------------------------------------
      // Data
      //----------------------------------------------------------------------------------------------------------------------------
      inputSource: InputSource.FastaFileID, // The default input source


      //----------------------------------------------------------------------------------------------------------------------------
      // References to HTML elements/controls
      //----------------------------------------------------------------------------------------------------------------------------

      // The "advanced options" container and control.
      advancedOptionsContainerEl: null,
      advancedOptionsControlEl: null,

      //clades_path: null,
      deviationEl: null,
      equalRatesEl: null,

      // FASTA file ID elements
      fastaFileIdEl: null,
      fastaFileIdPanelEl: null,

      // Inference method elements
      inferenceMethodEl: null,
      inferenceMethodMessageEl: null,

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

      // Output filename element
      outputFilenameEl: null,
      outputFilenameMessageEl: null,

      // P-value elements
      pValueEl: null,
      pValueMessageEl: null,

      // Reference segment element
      refSegmentEl: null,
      refSegmentMessageEl: null,

      // Reference tree inference element
      refTreeInferenceEl: null,

      // Segments elements
      segmentsContainerEl: null,
      segmentsMessageEl: null,

      // The segment checkbox elements.
      segmentCheckboxes: [],


      // C-tor
      constructor: function () {
         // TODO: Do I need to do something like this???
         //this.genomeToAttachPt = ['genome_id'];
         //this.genomeGroupToAttachPt = ['query_genomegroup'];
         //this.fastaToAttachPt = ['query_fasta'];
      },

      // Dynamically generate segment controls and add them to the page.
      createSegmentControls: function () {

         // Validate the reference to the container element.
         if (!this.segmentsContainerEl) { throw new Error("Invalid segments container element"); }

         const segments = SegmentedViruses[this.virusTaxon].segments;
         if (!segments) { throw new Error("Invalid virus segment data"); }

         this.segmentCheckboxes = [];

         segments.forEach((segment_, index_) => {

            // If this is the default segment, set the corresponding member attribute.
            if (segment_.isDefault) { this.defaultRefSegment = segment_.name; }

            const segmentControl = document.createElement("div");
            segmentControl.className = "treesort--segment-control";
            segmentControl.setAttribute("data-index", `${index_}`);

            // Create a checkbox for a segment and add its DOM element to the page.
            const checkbox = new Checkbox({
               id: `segmentCheckbox_${index_}`,
               name: segment_.name,
               checked: true,
               value: segment_.name
            })

            // Add the checkbox to the control.
            segmentControl.appendChild(checkbox.domNode);

            // Initialize the checkbox dijit widget.
            checkbox.startup();

            // Add the widget to the array of segment checkbox references.
            this.segmentCheckboxes.push(checkbox);

            // Create a label element and add it to the page.
            const label = document.createElement("label");
            label.setAttribute("for", `${index_}_segmentCheckbox`);
            label.innerHTML = segment_.name;
            label.style.marginRight = "1.0rem";

            // Add the label to the control.
            segmentControl.appendChild(label);

            this.segmentsContainerEl.appendChild(segmentControl);
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
         let fastaFileId = this.fastaFileIdEl.get("value");
         let inferenceMethod = this.inferenceMethodEl.get("value");
         let isTimeScaled = this.isTimeScaledEl.get("checked");
         let matchRegex = this.matchRegexEl.get("value");
         let matchType = this.matchTypeEl.get("value");
         let noCollapse = this.noCollapseEl.get("checked");
         let outputPath = this.outputPathEl.get("value");
         let outputFilename = this.outputFilenameEl.get("value");
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
            "input_fasta_data": null, // TODO: Use fastaData in the future.
            "input_fasta_existing_dataset": null, // TODO: Use fastaExistingDataset in the future.
            "input_fasta_file_id": fastaFileId,
            "input_fasta_group_id": null, // TODO: Use fastaGroupId in the future.
            "input_source": this.inputSource,
            "is_time_scaled": isTimeScaled,
            "match_regex": matchRegex,
            "match_type": matchType,
            "no_collapse": noCollapse,
            "output_filename": outputFilename,
            "output_path": outputPath,
            "p_value": pValue,
            "ref_segment": refSegment,
            "ref_tree_inference": refTreeInference,
            "segments": segments
         };

         console.log("In getValues submit values = ", submit_values)
         console.log("inherited arguments = ", this.inherited(arguments));
         /*
         TODO: Do I need to include something like this?

         if (this.demo) {

            resultType = 'custom';
            submit_values['db_source'] = 'fasta_data';
            submit_values['db_fasta_data'] = '>id1\ngtgtcgtttatcagtcttgcaagaaatgtttttgtatatatatcaattgggttatttgta\ngctccaatattttcgttagtatcaattatattcactgaacgcgaagtagtagatttgttt\ngcgtatattttttctgaatatacagttaatactgtaattttaatgttaggtgttgggatt\n' +
               '>id2\nataacgttgattgttgggatagcaacagcttggtttgtaacttattattcttttcctgga\ncgtaagttttttgagatagcacttttcttgccactttcaataccagggtatatagttgca\ntatgtatatgtaaatatttttgaattttcaggtcctgtacaaagttttttaagggtgata\ntttcattggaataaaggtgattattactttcctagtgtgaaatcattagcatgtggaatt\n'
         }*/

         if (this.validate()) { return submit_values; }
      },

      // Handle a click event on the advanced options control.
      handleAdvancedOptionsClick() {
         this.advancedOptionsContainerEl.classList.toggle("visible");
      },

      // Handle a change to the deviation control.
      handleDeviationChange: function (value_) {

         let result = this.isDeviationValid(value_);
         if (!result.isValid) {
            this.deviationEl.set("state", "Error");
            this.deviationEl.set("message", result.errorMessage);
            this.deviationMessageEl.innerHTML = result.errorMessage;
         } else {
            // Clear any existing error status.
            this.deviationEl.set("state", "");
            this.deviationEl.set("message", "");
            this.deviationMessageEl.innerHTML = "";
         }

         // Validate all controls
         this.validate();

         return result.isValid;
      },

      // Handle a change to the FASTA file ID control.
      handleFastaFileIdChange: function (value_) {

         console.log(`In validateFastaFileID value_ = `, value_)

         let result = this.isFastaFileIdValid(value_);
         if (!result.isValid) {
            this.deviationEl.set("state", "Error");
            this.deviationEl.set("message", result.errorMessage);
            this.deviationMessageEl.innerHTML = result.errorMessage;
         } else {
            // Clear any existing error status.
            this.deviationEl.set("state", "");
            this.deviationEl.set("message", "");
            this.deviationMessageEl.innerHTML = "";
         }

         // Validate all controls
         this.validate();

         return result.isValid;
      },

      // Handle a change to the match's regular expression control.
      handleMatchRegexChange: function (value_) {

         let result = this.isMatchRegexValid(value_);

         if (!result.isValid) {
            this.matchRegexEl.set("state", "Error");
            this.matchRegexEl.set("message", result.errorMessage);
            this.matchRegexMessageEl.innerHTML = result.errorMessage;
         } else {
            this.matchRegexEl.set("state", "");
            this.matchRegexEl.set("message", "");
            this.matchRegexMessageEl.innerHTML = "";
         }

         // Validate all controls
         this.validate();

         return result.isValid;
      },

      // Handle a change to the match type control.
      handleMatchTypeChange: function () {

         if (this.matchTypeEl.value == MatchType.Regex) {
            this.matchRegexContainerEl.style.display = "block";
            //this.matchRegexEl.set("required", true);

         } else {
            this.matchRegexContainerEl.style.display = "none";
            //this.matchRegexEl.set("required", false);
         }

         return;
      },

      // Handle a change to the output filename control.
      handleOutputFilenameChange: function (value_) {

         let result = this.isOutputFilenameValid(value_);

         if (!result.isValid) {
            this.outputFilenameEl.set("state", "Error");
            this.outputFilenameEl.set("message", result.errorMessage);
            this.outputFilenameMessageEl.innerHTML = result.errorMessage;
         } else {
            this.outputFilenameEl.set("state", "");
            this.outputFilenameEl.set("message", "");
            this.outputFilenameMessageEl.innerHTML = "";
         }

         // Validate all controls
         this.validate();

         return result.isValid;
      },

      // Handle a change to the output path control.
      handleOutputPathChange: function (value_) {

         let result = this.isOutputPathValid(value_);

         if (!result.isValid) {
            this.outputPathEl.set("state", "Error");
            this.outputPathEl.set("message", result.errorMessage);
            this.outputPathMessageEl.innerHTML = result.errorMessage;
         } else {
            this.outputPathEl.set("state", "");
            this.outputPathEl.set("message", "");
            this.outputPathMessageEl.innerHTML = "";
         }

         // Validate all controls
         this.validate();

         return result.isValid;
      },

      // Handle a change to the p-value control.
      handlePValueChange: function (value_) {

         let result = this.isPValueValid(value_);

         if (!result.isValid) {
            this.pValueEl.set("state", "Error");
            this.pValueEl.set("message", result.errorMessage);
            this.pValueMessageEl.innerHTML = result.errorMessage;
         } else {
            // Clear any existing error status.
            this.pValueEl.set("state", "");
            this.pValueEl.set("message", "");
            this.pValueMessageEl.innerHTML = "";
         }

         // Validate all controls
         this.validate();

         return result.isValid;
      },

      // Handle a change to the reference segment or the segment checkboxes.
      handleSegmentChange: function () {

         const result = this.isRefSegmentValid();

         console.log("in handleSegmentChange and result = ", result)

         if (!result.isValid) {
            this.refSegmentEl.set("state", "Error");
            this.refSegmentEl.set("message", result.errorMessage);
            this.refSegmentMessageEl.innerHTML = result.errorMessage;
         } else {
            // Clear any existing error status.
            this.refSegmentEl.set("state", "");
            this.refSegmentEl.set("message", "");
            this.refSegmentMessageEl.innerHTML = "";
         }

         // Validate all controls
         this.validate();
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

                  // TODO: How is this used?
                  this.form_flag = true;

                  // Deserialize the job_data
                  let jobData = JSON.parse(sessionStorage.getItem(rerun_key));
                  if (jobData) {

                     // Don't display the default values in the page controls.
                     this.displayDefaults = false;

                     // Populate page controls using job data.
                     this.populateFromJobData(jobData);
                  }
               }
            } catch (error) {
               console.log(`Error during intakeRerunForm: ${error}`);
            } finally {
               sessionStorage.removeItem(rerun_key);
            }
         }
      },

      // Is this deviation value valid?
      isDeviationValid: function (value_) {

         // Initialize the result
         let result = { isValid: true, errorMessage: null };

         value_ = this.safeTrim(value_);
         if (!value_) {

            // If no value was provided, get the value directly from the control.
            value_ = this.safeTrim(this.deviationEl.get("value"));
            if (!value_) {
               result.isValid = false;
               result.errorMessage = "Enter an integer ≥ 1";
               return result;
            }
         }

         let deviation = parseInt(value_);
         if (isNaN(deviation) || deviation < 1.0) {
            result.isValid = false;
            result.errorMessage = "Enter an integer ≥ 1";
         }

         return result;
      },

      // Is the FASTA file ID valid?
      isFastaFileIdValid: function (value_) {

         // Initialize the result
         let result = { isValid: true, errorMessage: null };

         value_ = this.safeTrim(value_);

         // If no value was provided, get the value directly from the control.
         if (!value_) { value_ = this.safeTrim(this.fastaFileIdEl.get("value")); }

         if (!value_) {
            result.isValid = false;
            result.errorMessage = "Select a FASTA file";
         }

         return result;
      },

      // Is the match's regular expression valid?
      isMatchRegexValid: function (value_) {

         // Initialize the result
         let result = { isValid: true, errorMessage: null };

         value_ = this.safeTrim(value_);

         // If no value was provided, get the value directly from the control.
         if (!value_) { value_ = this.safeTrim(this.matchRegexEl.get("value")); }

         if (!value_) {
            result.isValid = false;
            result.errorMessage = "Enter a valid regular expression";
         }

         return result;
      },

      // Is the output filename valid?
      isOutputFilenameValid: function (value_) {

         // Initialize the result
         let result = { isValid: true, errorMessage: null };

         value_ = this.safeTrim(value_);

         // If no value was provided, get the value directly from the control.
         if (!value_) { value_ = this.safeTrim(this.outputFilenameEl.get("value")); }

         if (!value_) {
            result.isValid = false;
            result.errorMessage = "Enter a valid filename";
         }

         return result;
      },

      // Is the output path valid?
      isOutputPathValid: function (value_) {

         // Initialize the result
         let result = { isValid: true, errorMessage: null };

         value_ = this.safeTrim(value_);

         // If no value was provided, get the value directly from the control.
         if (!value_) { value_ = this.safeTrim(this.outputPathEl.get("value")); }

         if (!value_) {
            result.isValid = false;
            result.errorMessage = "Select an output folder";
         }

         return result;
      },

      // Is the p-value valid?
      isPValueValid: function (value_) {

         // Initialize the result
         let result = { isValid: true, errorMessage: null };

         value_ = this.safeTrim(value_);

         // If no value was provided, get the value directly from the control.
         if (!value_) { value_ = this.safeTrim(this.pValueEl.get("value")); }

         let pValue = parseFloat(value_);
         if (isNaN(pValue) || pValue < 0 || pValue > 1.0) {
            result.isValid = false;
            result.errorMessage = "Enter a number between 0 and 1.0";
         }

         return result;
      },

      // Is the reference segment valid?
      isRefSegmentValid: function () {

         // Initialize the result
         let result = { isValid: true, errorMessage: null };

         if (!this.segmentCheckboxes) { throw new Error("Invalid segment checkboxes"); }

         const refSegment = this.refSegmentEl.get("value");

         // Make sure the segment selected as the reference segment isn't unchecked.
         this.segmentCheckboxes.forEach(checkbox_ => {
            if (!checkbox_.get("checked")) {
               const segment = checkbox_.get("name");
               if (segment == refSegment) {
                  result.isValid = false;
                  result.errorMessage = `Reference segment ${refSegment} is unchecked and will not be included`;
               }
            }
         })

         return result;
      },

      onReset: function () {

         console.log("In onReset")

         // TODO: What does this do?
         this.inherited(arguments);
      },

      openJobsList: function () {
         Topic.publish('/navigate', { href: '/job/' });
      },

      // Populate page controls using job data.
      populateFromJobData: function (jobData) {

         if (!jobData) { throw new Error("Invalid job data"); }

         // TODO: clades_path
         if (jobData.deviation) { this.deviationEl.set("value", jobData.deviation); }
         if (jobData.equal_rates) { this.equalRatesEl.set("checked", jobData.equal_rates); }
         if (jobData.inference_method) { this.inferenceMethodEl.set("value", jobData.inference_method); }
         if (jobData.input_fasta_file_id) { this.fastaFileIdEl.set("value", jobData.input_fasta_file_id); }
         // TODO: Include these in a future version.
         //if (jobData.input_fasta_data) { this.fastaDataEl.set("value", jobData.input_fasta_data); }
         //if (jobData.input_fasta_existing_dataset) { this.fastaFileIdEl.set("value", jobData.input_fasta_existing_dataset); }
         //if (jobData.input_fasta_group_id) { this.fastaGroupIdEl.set("value", jobData.input_fasta_group_id); }
         if (jobData.input_source) { this.inputSource = jobData.input_source; }
         if (jobData.is_time_scaled) { this.isTimeScaledEl.set("checked", jobData.is_time_scaled); }
         if (jobData.match_regex) { this.matchRegexEl.set("value", jobData.match_regex); }
         if (jobData.match_type) { this.matchTypeEl.set("value", jobData.match_type); }
         if (jobData.no_collapse) { this.noCollapseEl.set("checked", jobData.no_collapse); }
         if (jobData.output_filename) { this.outputFilenameEl.set("value", jobData.outputFilename); }
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

      // Safely trim non-null values and return an empty string for a null value.
      safeTrim: function (value_) {
         if (!value_) { return ""; }
         if (typeof value_ === 'string' || value_ instanceof String) { return value_.trim(); }
         return String(value_);
      },

      // Update the page controls with default values.
      setDefaultValues() {

         this.deviationEl.set("value", 2);
         this.equalRatesEl.set("value", false);
         this.fastaFileIdEl.set("value", "");
         this.inferenceMethodEl.set("value", InferenceMethod.Local);
         this.inputSource = InputSource.FastaFileID;
         this.isTimeScaledEl.set("value", true);
         this.matchRegexEl.set("value", "");
         this.matchTypeEl.set("value", MatchType.Default);
         this.noCollapseEl.set("value", true);
         this.outputFilenameEl.set("value", " ");
         this.outputPathEl.set("value", "");
         this.pValueEl.set("value", 0.001);
         this.refSegmentEl.set("value", this.defaultRefSegment);
         this.refTreeInferenceEl.set("value", RefTreeInference.FastTree);

         // Select all segment checkboxes.
         this.segmentCheckboxes.forEach(checkbox_ => {
            checkbox_.set("checked", true);
         })

         /* TODO: Include these in a future version.
         // FASTA input sources
         this.fastaDataEl.set("value", "");
         this.fastaExistingDatasetEl.set("value", "");
         this.fastaGroupIdEl.set("value", "");

         // Select the default input source radio button.
         this.updateInputSourceControls();
         */

         return;
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

         // Add a click event handler to the container of the segment controls.
         this.segmentsContainerEl.addEventListener("click", (event_) => {

            if (event_.target.nodeName == "INPUT") { return false; }

            // Get the parent DIV and its "data-index" attribute.
            const segmentControl = event_.target.closest("div");
            const strIndex = segmentControl.getAttribute("data-index");
            if (!strIndex) { return false; }

            const index = parseInt(strIndex);
            if (isNaN(index)) { return false; }

            // Find the checkbox at this index and toggle its value.
            const checkbox = this.segmentCheckboxes[index];
            if (!checkbox) { return false; }

            checkbox.set('checked', !checkbox.get('checked'));

            // Make sure the segment used as the reference segment is still checked.
            this.handleSegmentChange();
         })

         // TODO: Include this in a future version.
         // Select the default input source radio button.
         //this.updateInputSourceControls();

         try {
            // NOTE: this sets this.displayDefaults to false if we are populating the
            // page controls using job data.
            this.intakeRerunForm();

         } catch (error) {
            console.error(error);
         }

         if (this.displayDefaults) {
            // Populate the page controls with default values.
            this.setDefaultValues();
         }

         // TEST
         this.validate();
         this._started = true;
      },

      // Validate all page controls that require validation.
      validate: function () {

         let result;

         console.log("in validate")

         if (this.inherited(arguments)) {

            let isValid = true;

            result = this.isDeviationValid();
            isValid = isValid && result.isValid;

            result = this.isFastaFileIdValid();
            isValid = isValid && result.isValid;

            if (this.matchTypeEl.get("value") == MatchType.Regex) {
               result = this.isMatchRegexValid();
               isValid = isValid && result.isValid;
            }

            result = this.isOutputFilenameValid();
            isValid = isValid && result.isValid;

            result = this.isOutputPathValid();
            isValid = isValid && result.isValid;

            result = this.isPValueValid();
            isValid = isValid && result.isValid;

            if (isValid) {
               console.log("submit btn is enabled")
               this.submitButton.set("disabled", false);
               return true;
            }
         }

         console.log("disabling submit btn")
         this.submitButton.set("disabled", true);
         return false;
      }



      /*
      TODO: Include these in a future version.

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

      // Use the input source to determine which radio button to select.
      updateInputSourceControls: function () {

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
      },

      validateFastaData: function () {

         // Get the FASTA text and validate it.
         let fastaText = this.fastaDataEl.get("value");
         const result = this.validateFasta(fastaText, 'DNA', true, 'record_1');
         */
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
         /*
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

      validateFastaGroupID: function (evt) {

         console.log(`In validateFastaGroupID evt = `, evt)

         // input_fasta_group_id
      },

      validateFastaExistingDataset: function (evt) {

         console.log(`In validateFastaExistingDataset evt = `, evt)

        // input_fasta_existing_dataset
      },

      */
   });
});
