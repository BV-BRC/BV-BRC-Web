define([
   'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
   'dojo/on', 'dojo/query', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
   './AppBase', 'dijit/form/CheckBox', 'dijit/Tooltip',
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
      // TODO: Other sources will be added in a future release.
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
      defaultPath: "",
      demo: false,
      form_flag: false, // This is something related to intakeRerunForm
      pageTitle: "TreeSort Service | BV-BRC",
      requireAuth: true,
      templateString: Template,
      tutorialLink: "tutorial/treesort/treesort.html",
      videoLink: "",


      // Certain controls aren't validated after resetting the form or populating from job data.
      validationContext: {

         // The number of controls that are required and default to an empty value.
         controlCount: 4,

         // Should we skip validation of these controls?
         isSuspended: false,

         // The number of controls that haven't been processed to skip validation. When skipping validation, this count is initially set to
         // "controlCount" and decremented every time a control is skipped. When the value is < 1, isSuspended is set to false.
         unprocessed: 0
      },

      // TODO: A future version can use this variable to lookup different segments in the SegmentedViruses JSON.
      virusTaxon: "influenza",

      // This is set by createSegmentControls().
      defaultRefSegment: null,

      displayDefaults: true,

      //----------------------------------------------------------------------------------------------------------------------------
      // Data
      //----------------------------------------------------------------------------------------------------------------------------
      inputSource: InputSource.FastaFileID, // The default input source

      // Keep track of which controls are required based on the dojo/dijit control "required" property.
      requiredControls: [],

      //----------------------------------------------------------------------------------------------------------------------------
      // References to HTML elements/controls
      //----------------------------------------------------------------------------------------------------------------------------

      // The "advanced options" container and control.
      advancedOptionsContainerEl: null,
      advancedOptionsControlEl: null,

      cladesPathEl: null,
      deviationEl: null,
      equalRatesEl: null,

      // FASTA file ID elements
      fastaFileIdEl: null,
      fastaFileIdPanelEl: null,
      fastaFileIdMessageEl: null,

      // Inference method elements
      inferenceMethodEl: null,
      inferenceMethodMessageEl: null,

      // Match regex elements
      matchRegexEl: null,
      matchRegexContainerEl: null,

      // Match type element
      matchTypeEl: null,

      // "No collapse" element
      noCollapseEl: null,

      // Output filename element
      outputFileEl: null,
      outputFileMessageEl: null,

      // Output path element
      outputPathEl: null,
      outputPathMessageEl: null,

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
               onClick: this.handleSegmentChange.bind(this),
               value: segment_.name
            })

            // Add the index as a custom attribute on the Checkbox's DOM element.
            checkbox.domNode.setAttribute("data-index", `${index_}`);

            // Add the checkbox to the control.
            segmentControl.appendChild(checkbox.domNode);

            // Initialize the checkbox dijit widget.
            checkbox.startup();

            // Add the widget to the array of segment checkbox references.
            this.segmentCheckboxes.push(checkbox);

            // Create a label element and add it to the page.
            const label = document.createElement("label");
            label.setAttribute("for", `segmentCheckbox_${index_}`);
            label.innerHTML = segment_.name;

            // Add the label to the control.
            segmentControl.appendChild(label);

            // Add the control to the parent container.
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

         let cladesPath = this.cladesPathEl.get("value");
         let deviation = this.deviationEl.get("value");
         let equalRates = this.equalRatesEl.get("checked");
         let fastaFileId = this.fastaFileIdEl.get("value");
         let inferenceMethod = this.inferenceMethodEl.get("value");
         let matchRegex = this.matchRegexEl.get("value");
         let matchType = this.matchTypeEl.get("value");
         let noCollapse = this.noCollapseEl.get("checked");
         let outputPath = this.outputPathEl.get("value");
         let outputFile = this.outputFileEl.get("value");
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

         let jobDescription;

         if (this.demo) {

            // Create an example job description.
            jobDescription = {
               "clades_path": "cladeInfo",
               "deviation": 2.0,
               "equal_rates": true,
               "inference_method": "local",
               "input_fasta_existing_dataset": null,
               "input_fasta_data": null,
               "input_fasta_file_id": "/testUser@bvbrc/home/TreeSort/swine_H1/swine_H1_HANA.fasta",
               "input_fasta_group_id": null,
               "input_source": "fasta_file_id",
               "match_regex": null,
               "match_type": "default",
               "no_collapse": true,
               "output_file": "annotatedTree",
               "output_path": "/testUser@bvbrc/home/TreeSort/swine_H1/output",
               "p_value": 0.001,
               "ref_segment": "HA",
               "ref_tree_inference": "FastTree",
               "segments": null
            }

         } else {

            // Create the job description JSON that will be submitted to the TreeSort service.
            jobDescription = {
               "clades_path": cladesPath,
               "deviation": deviation,
               "equal_rates": equalRates,
               "inference_method": inferenceMethod,
               "input_fasta_data": null, // TODO: Use fastaData in the future.
               "input_fasta_existing_dataset": null, // TODO: Use fastaExistingDataset in the future.
               "input_fasta_file_id": fastaFileId,
               "input_fasta_group_id": null, // TODO: Use fastaGroupId in the future.
               "input_source": this.inputSource,
               "match_regex": matchRegex,
               "match_type": matchType,
               "no_collapse": noCollapse,
               "output_file": outputFile,
               "output_path": outputPath,
               "p_value": pValue,
               "ref_segment": refSegment,
               "ref_tree_inference": refTreeInference,
               "segments": segments
            };
         }

         if (this.validate()) { return jobDescription; }
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

         // If we're suspending validation for this control, make it temporarily optional.
         if (this.validationContext.isSuspended) { this.fastaFileIdEl.set("required", false); }

         let result = this.isFastaFileIdValid(value_);

         if (!result.isValid && !this.validationContext.isSuspended) {
            this.fastaFileIdEl.set("state", "Error");
            this.fastaFileIdEl.set("message", result.errorMessage);
            this.fastaFileIdMessageEl.innerHTML = result.errorMessage;

            // Update the control as required since it has an invalid value.
            this.fastaFileIdEl.set("required", true);

         } else {

            // Clear any existing error status.
            this.fastaFileIdEl.set("state", "");
            this.fastaFileIdEl.set("message", "");
            this.fastaFileIdMessageEl.innerHTML = "";

            // Make the control optional until it is assigned an invalid value.
            this.fastaFileIdEl.set("required", false);
         }

         // Validate all controls
         this.validate();

         // Update the validation context's "unprocessed" count.
         if (this.validationContext.isSuspended) { this.updateValidationContext(); }

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
         } else {
            this.matchRegexContainerEl.style.display = "none";
         }

         // Validate all controls
         this.validate();
         return;
      },

      // Handle a change to the output filename control.
      handleOutputFileChange: function (value_) {

         // If we're suspending validation for this control, make it temporarily optional.
         if (this.validationContext.isSuspended) { this.outputFileEl.set("required", false); }

         let result = this.isOutputFileValid(value_);

         if (!result.isValid && !this.validationContext.isSuspended) {
            this.outputFileEl.set("state", "Error");
            this.outputFileEl.set("message", result.errorMessage);
            this.outputFileMessageEl.innerHTML = result.errorMessage;

            // Update the control as required since it has an invalid value.
            this.outputFileEl.set("required", true);

         } else {

            // Clear any existing error status.
            this.outputFileEl.set("state", "");
            this.outputFileEl.set("message", "");
            this.outputFileMessageEl.innerHTML = "";

            // Make the control optional until it is assigned an invalid value.
            this.outputFileEl.set("required", false);
         }

         // Validate all controls
         this.validate();

         // Update the validation context's "unprocessed" count.
         if (this.validationContext.isSuspended) { this.updateValidationContext(); }

         return result.isValid;
      },

      // Handle a change to the output path control.
      handleOutputPathChange: function (value_) {

         // If we're suspending validation for this control, make it temporarily optional.
         if (this.validationContext.isSuspended) { this.outputPathEl.set("required", false); }

         // TEST: This is a huge hack to make the output file control required after it has been initialized.
         this.outputFileEl.set("required", true);

         let result = this.isOutputPathValid(value_);

         if (!result.isValid && !this.validationContext.isSuspended) {
            this.outputPathEl.set("state", "Error");
            this.outputPathEl.set("message", result.errorMessage);
            this.outputPathMessageEl.innerHTML = result.errorMessage;

            // Update the control as required since it has an invalid value.
            this.outputPathEl.set("required", true);

         } else {

            // Clear any existing error status.
            this.outputPathEl.set("state", "");
            this.outputPathEl.set("message", "");
            this.outputPathMessageEl.innerHTML = "";

            // Make the control optional until it is assigned an invalid value.
            this.outputPathEl.set("required", false);
         }

         // Validate all controls
         this.validate();

         // Update the validation context's "unprocessed" count.
         if (this.validationContext.isSuspended) { this.updateValidationContext(); }

         // TEST: This is a huge hack to make the output file control required at a later point than when it is initialized.
         this.outputFileEl.set("required", true);

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

         // Validate the reference segment.
         const result = this.isRefSegmentValid();

         if (!result.isValid) {
            this.refSegmentEl.set("state", "Error");
            this.refSegmentEl.set("message", result.errorMessage);
            this.segmentsMessageEl.innerHTML = result.errorMessage;
         } else {

            // Clear any existing error status.
            this.refSegmentEl.set("state", "");
            this.refSegmentEl.set("message", "");
            this.segmentsMessageEl.innerHTML = "";
         }

         // Validate all controls
         this.validate();
      },

      intakeRerunForm: function () {

         // We are assuming that there's only 1 rerun key in the query string parameters.
         let service_fields = window.location.search.replace('?', '');
         let rerun_fields = service_fields.split('=');
         if (rerun_fields.length < 1) { return; }

         let rerun_key = rerun_fields[1];

         try {
            // Look for an existing job_data object from session storage.
            let sessionStorage = window.sessionStorage;
            if (sessionStorage.hasOwnProperty(rerun_key)) {

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
      isOutputFileValid: function (value_) {

         // Initialize the result
         let result = { isValid: true, errorMessage: null };

         value_ = this.safeTrim(value_);

         // If no value was provided, get the value directly from the control.
         if (!value_) { value_ = this.safeTrim(this.outputFileEl.get("value")); }

         if (!value_) {
            result.isValid = false;
            result.errorMessage = "Enter a valid output name";
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

         // Get the reference segment for comparison.
         const refSegment = this.refSegmentEl.get("value");

         // Make sure the segment selected as the reference segment is checked.
         this.segmentCheckboxes.forEach(checkbox_ => {
            if (!checkbox_.get("checked")) {
               const segment = checkbox_.get("name");
               if (segment == refSegment) {
                  result.isValid = false;
                  result.errorMessage = `${refSegment} should be checked in order to be the reference segment`;
               }
            }
         })

         return result;
      },

      onReset: function () {

         // TODO: Is this necessary?
         this.inherited(arguments);

         // Wait until after the default reset has modified the form controls.
         setTimeout(() => { this.setDefaultValues(); }, 0);

         return true;
      },

      openJobsList: function () {
         Topic.publish('/navigate', { href: '/job/' });
      },

      // Populate page controls using job data.
      populateFromJobData: function (jobData) {

         if (!jobData) { throw new Error("Invalid job data"); }

         // Suspend/skip validation on controls that are required but default to an empty value.
         this.suspendValidation();

         if (jobData.cladesPath) { this.cladesPathEl.set("value", jobData.cladesPath); }
         if (jobData.deviation) { this.deviationEl.set("value", jobData.deviation); }
         if (jobData.equal_rates) { this.equalRatesEl.set("checked", jobData.equal_rates); }
         if (jobData.inference_method) { this.inferenceMethodEl.set("value", jobData.inference_method); }
         if (jobData.input_fasta_file_id) { this.fastaFileIdEl.set("value", jobData.input_fasta_file_id); }
         if (jobData.input_source) { this.inputSource = jobData.input_source; }
         if (jobData.match_regex) { this.matchRegexEl.set("value", jobData.match_regex); }
         if (jobData.match_type) { this.matchTypeEl.set("value", jobData.match_type); }
         if (jobData.no_collapse) { this.noCollapseEl.set("checked", jobData.no_collapse); }
         if (jobData.output_file) { this.outputFileEl.set("value", jobData.outputFile); }
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

      // Update the form controls with default values.
      setDefaultValues() {

         // Suspend/skip validation on controls that are required but default to an empty value.
         this.suspendValidation();

         // Populate all controls with default values.
         this.cladesPathEl.set("value", "");
         this.deviationEl.set("value", 2);
         this.equalRatesEl.set("value", false);
         this.fastaFileIdEl.set("value", "");
         this.inferenceMethodEl.set("value", InferenceMethod.Local);
         this.inputSource = InputSource.FastaFileID;
         this.matchRegexEl.set("value", "");
         this.matchTypeEl.set("value", MatchType.Default);
         this.noCollapseEl.set("value", true);
         this.outputFileEl.set("value", "");
         this.outputPathEl.set("value", this.defaultPath);
         this.pValueEl.set("value", 0.001);
         this.refSegmentEl.set("value", this.defaultRefSegment);
         this.refTreeInferenceEl.set("value", RefTreeInference.FastTree);

         // Select all segment checkboxes.
         this.segmentCheckboxes.forEach(checkbox_ => {
            checkbox_.set("checked", true);
         })

         return;
      },

      startup: function() {

         if (this._started) { return; }
         if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
            return;
         }

         this.form_flag = false;

         this.inherited(arguments);

         if (window.App.user) {

            // Get the default path and assign it to the output path element.
            this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
            this.outputPathEl.set('value', this.defaultPath);
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

            if (event_.target.nodeName == "INPUT") { return true; }

            // Get the parent DIV and its "data-index" attribute.
            const segmentControl = event_.target.closest("div.treesort--segment-control");

            // Get the data index attribute to determine the associated checkbox.
            const strIndex = segmentControl.getAttribute("data-index");
            if (!strIndex) { return false; }

            const index = parseInt(strIndex);
            if (isNaN(index)) { return false; }

            // Find the checkbox at this index and toggle its value.
            const checkbox = this.segmentCheckboxes[index];
            if (!checkbox) { return false; }

            checkbox.set('checked', !checkbox.get('checked'));
         })

         try {
            // NOTE: this sets this.displayDefaults to false if we are populating the page controls using job data.
            this.intakeRerunForm();

         } catch (error) {
            console.error(error);
         }

         // Should we populate the form controls with default values?
         if (this.displayDefaults) { this.setDefaultValues(); }

         this._started = true;
      },

      // Suspend/skip validation on controls that are required but default to an empty value.
      suspendValidation() {

         this.validationContext.isSuspended = true;

         // No controls have been processed yet.
         this.validationContext.unprocessed = this.validationContext.controlCount;
      },

      // If we're suspending validation, update the number of unprocessed controls and the "is suspended" flag.
      updateValidationContext() {

         // Decrement the number of skipped/processed controls.
         this.validationContext.unprocessed -= 1;

         // If this is the last control that skips validation, reset the count and flag.
         if (this.validationContext.unprocessed < 1) {
            this.validationContext.unprocessed = 0;
            this.validationContext.isSuspended = false;
         }
      },

      // Validate all page controls that require validation.
      validate: function () {

         if (this.demo) {
            this.submitButton.set("disabled", true);
            return true;
         }

         let result;

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

            result = this.isOutputFileValid();
            isValid = isValid && result.isValid;

            result = this.isOutputPathValid();
            isValid = isValid && result.isValid;

            result = this.isPValueValid();
            isValid = isValid && result.isValid;

            result = this.isRefSegmentValid();
            isValid = isValid && result.isValid;

            if (isValid) {
               this.submitButton.set("disabled", false);
               return true;
            }
         }

         this.submitButton.set("disabled", true);
         return false;
      }

   });
});
