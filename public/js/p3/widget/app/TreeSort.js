define([
   'dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/Deferred',
   'dojo/on', 'dojo/query', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
   './AppBase', 'dijit/form/CheckBox', 'dijit/Dialog', 'dijit/Tooltip',
   'dojo/text!./templates/TreeSort.html', 'dijit/form/Form',
   '../../util/PathJoin', '../../WorkspaceManager'
], function (
   declare, lang, Deferred,
   on, query, domClass, domConstruct, domStyle, Topic,
   AppBase, Checkbox, Dialog, Tooltip,
   Template, FormMixin, PathJoin, WorkspaceManager

) {

   const FluSegments = ["PB2", "PB1", "PA", "HA", "NP", "NA", "MP", "NS"];

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

   // The result status of FASTA validation.
   const FastaStatus = Object.freeze({

      //--------------------------------------------------------------------------------
      // Not yet validated
      //--------------------------------------------------------------------------------
      NOT_VALIDATED: "NOT_VALIDATED",

      //--------------------------------------------------------------------------------
      // Successful validation states
      //--------------------------------------------------------------------------------

      // All expected strains are valid.
      ALL_VALID_STRAINS: "ALL_VALID_STRAINS",

      // Most expected strains are valid.
      MOSTLY_VALID_STRAINS: "MOSTLY_VALID_STRAINS",

      //--------------------------------------------------------------------------------
      // Failed validation states
      //--------------------------------------------------------------------------------

      // The number of valid names were fewer than expected.
      FEWER_STRAINS_THAN_EXPECTED: "FEWER_STRAINS_THAN_EXPECTED",

      // Strain name parsing error: We used too much of the header as the strain name.
      NOT_ENOUGH_SEGMENT_SEQUENCES: "NOT_ENOUGH_SEGMENT_SEQUENCES",

      // Not enough strains for an analysis.
      NOT_ENOUGH_STRAINS_FOR_ANALYSIS: "NOT_ENOUGH_STRAINS_FOR_ANALYSIS",

      // No valid strains were found.
      NO_VALID_STRAINS: "NO_VALID_STRAINS",

      // Strain name parsing error: Many of the strains only had a sequence for a single segment, so
      // we probably included too much text in the calculated strain name.
      STRAIN_NAMES_WITH_ONE_SEQUENCE: "STRAIN_NAMES_WITH_ONE_SEQUENCE",

      // Strain name parsing error: The calculated strain name is only part of the actual name and isn't unique.
      TOO_MANY_SEGMENT_SEQUENCES: "TOO_MANY_SEGMENT_SEQUENCES"
   })

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
   /*const MatchTypeOptions = [
      { value: MatchType.Default, label: `Default` },
      { value: MatchType.EPI, label: `EPI_ISL_XXX field` },
      { value: MatchType.Regex, label: `Regular expression` },
      { value: MatchType.Strain, label: `Strain name` }
   ];*/

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

      // An example FASTA header and highlighted strain name for every match type that found a strain name in the FASTA headers.
      matchTypeExamples: {},

      // Settings and constants used by FASTA file validation.
      settings: {

         // The maximum number of FASTA errors or warnings to display.
         MAX_FASTA_MESSAGES_TO_DISPLAY: 10,

         // The minimum number of strains required to run TreeSort.
         MIN_STRAIN_COUNT: 10,

         // When considering edge cases after parsing the FASTA for strain names, this threshold determines
         // whether to attribute discrepancies to (harmless) user error or a (serious) parsing error.
         FASTA_ERROR_THRESHOLD: 0.9,

         //------------------------------------------------------------------------------------------------------
         // Regular expressions
         //------------------------------------------------------------------------------------------------------

         // A regex to find FASTA headers/deflines.
         REGEX_HEADERS: /^>[^\n]*\r?\n/gm,

         // The required format for segment names in the header (surrounded by pipe symbols).
         REGEX_SEGMENT: /\|(PB2|PB1|PA|HA|NP|NA|MP|NS)\|/i,

         // Regexes used to find the isolate/strain name in a FASTA header.
         REGEX_STRAIN_NAME: /([ABCD](\/[^/\|]+){3,5})/i,
         REGEX_EPI_ISL_REGEX: /EPI_ISL_\d+/i
      },

      // The results of validating the FASTA input file.
      validatedFASTA: {

         // A list of error messages
         errors: [],

         // Is the FASTA file valid?
         isValid: false,

         // The number of strains that don't have a sequence for every segment.
         notEnoughSegments: 0,

         // The recommended type of regex to use when parsing strain names from FASTA headers (formerly "match type").
         regexType: null,

         score: 0,

         // All segment names found in the FASTA headers (default to all Influenza segments).
         segments: this.FluSegments,

         // The number of total sequences
         sequenceCount: 0,

         // The status of the FASTA validation.
         status: FastaStatus.NOT_VALIDATED,

         // The number of strains that have multiples of segments.
         tooManySegments: 0,

         // The total number of names that were found (valid or invalid).
         totalNames: 0,

         // The number of valid names
         validNames: 0,

         // A list of warning messages
         warnings: []
      },

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

      // A panel that displays the summary of FASTA validation.
      fastaValidationPanelEl: null,

      // Inference method elements
      inferenceMethodEl: null,
      inferenceMethodMessageEl: null,

      // Match regex elements
      //matchRegexEl: null,
      //matchRegexContainerEl: null,

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

      // Create a validation summary for a FASTA file with errors.
      createInvalidFastaSummary: function () {

         let title = "";
         let description = "";
         let listItems = [];

         // An alias for convenience.
         const results = this.validatedFASTA;

         let errorCount = results.errors.length;
         let segmentCount = results.segments.length;
         let missingSegSeqs = results.notEnoughSegments;

         const expectedNames = Math.floor(results.sequenceCount / segmentCount);


         title = "Your FASTA file cannot be processed";

         let message = "";

         switch (this.validatedFASTA.status) {

            // The number of valid names were fewer than expected.
            case FastaStatus.FEWER_STRAINS_THAN_EXPECTED:
               message = `Based on the number of sequences and segments found in your FASTA file, ${expectedNames} strains should've been
               found but there were only ${results.validNames}.`
               break;

            // Strain name parsing error: We probably used too much of the header as the strain name.
            case FastaStatus.NOT_ENOUGH_SEGMENT_SEQUENCES:
               let percent = Math.floor(this.settings.FASTA_ERROR_THRESHOLD * 100);
               message = `Since less than ${percent}% of the strains had sequences for all segments, there might have been a problem
               extracting the strain names from the FASTA headers: `
               break;

            // Not enough strains for an analysis.
            case FastaStatus.NOT_ENOUGH_STRAINS_FOR_ANALYSIS:
               message = `TreeSort requires at least ${this.settings.MIN_STRAIN_COUNT} strains for analysis, but you provided ${this.validatedFASTA.validNames}.`
               break;

            // No valid strains were found.
            case FastaStatus.NO_VALID_STRAINS:
               message = "No valid strains were found."
               break;

            // Strain name parsing error: What it thinks is the strain name is only part of the actual name and isn't unique.
            case FastaStatus.TOO_MANY_SEGMENT_SEQUENCES:
               message = `There was a problem extracting the strain names from the FASTA headers: It appears that only part of the actual strain name
                  was found, so sequences whose actual strain names are similar will appear to have multiple sequences for the same strain and segment.
                  For example: If a FASTA file contains HA and NA sequences for strains "abc/123" and "abc/789" (4 sequences total), but "abc" was
                  determined to be the strain name, the file will be interpreted as having
                  2 HA sequences and 2 NA sequences for strain "abc".`;
               break;

            default:
               message = "An unknown error occurred."
         }


         let html = `<div class="treesort--validation-summary treesort--error">
            <div class="treesort--validation-title">${title}</div>
            <div class="treesort--validation-description">${message}</div>
         </div>`;

         return html;

         /*
         //------------------------------------------------------------------------------------------------
         // Add messages to the list (item) array.
         //------------------------------------------------------------------------------------------------

         if (results.validNames < 1) {
            listItems.push("No strain names were found.");
         } else if (results.totalNames > results.validNames) {
            listItems.push(`Only ${results.validNames} out of ${results.totalNames} strain names were valid.`);
         }

         const segmentCount = results.segments.length;

         if (segmentCount < 1) {
            listItems.push("No segment names were found.");

         } else if (segmentCount === 1) {
            listItems.push("TreeSort requires at least 2 segments for analysis, but only one was found.");

         } else {

            let segmentsFound = `${results.segments.length} segments were found`;

            let segmentList = "";

            // Format the segments as a delimited list.
            results.segments.forEach(segment_ => {
               if (segmentList) { segmentList += ", "; }
               segmentList += segment_;
            })

            if (segmentList.length > 0) { segmentsFound += `: ${segmentList}`; }

            listItems.push(segmentsFound);
         }

         if (results.notEnoughSegments > 0 && segmentCount > 1 && results.validNames.length > 0) {

            const strainText = results.notEnoughSegments === 1
               ? "1 strain"
               : `${results.notEnoughSegments} strains`

            listItems.push(`${strainText} didn't have sequences for all ${segmentCount} segments and will not be included in the analysis.`);
         }

         if (results.validNames > 0 && results.validNames < this.settings.MIN_STRAIN_COUNT) {
            const strainFoundText = results.validNames === 1
               ? "strain was found"
               : "strains were found";
            listItems.push(`A minimum of ${this.settings.MIN_STRAIN_COUNT} strains is required and only ${results.validNames} valid ${strainFoundText}`);
         }

         // Format and return the summary.
         return this.formatFastaValidationSummary(title, description, listItems);*/
      },


      // Create a validation summary for a successfully validated FASTA file.
      createValidFastaSummary() {

         // An alias for convenience.
         const results = this.validatedFASTA;

         // The number of segments found in the file.
         const segmentCount = results.segments.length;

         // Format the segments as a delimited list.
         let segmentList = "";
         results.segments.forEach(segment_ => {
            if (segmentList) { segmentList += ", "; }
            segmentList += segment_;
         })

         let ignoredStrains = "";
         const notEnoughSegments = results.notEnoughSegments;

         if (notEnoughSegments > 0) {

            const strainText = notEnoughSegments === 1
               ? "1 strain"
               : `${notEnoughSegments} strains`

            ignoredStrains = `<div class="treesort--ignored-strains">
               Note: ${strainText} didn't have sequences for all ${segmentCount} segments and will not be included in the analysis.
            </div>`;
         }

         // Populate the panel that displays an example header with the strain name highlighted.
         let example = this.matchTypeExamples[results.regexType];
         let exampleHeader = "";
         let exampleHTML = "";

         if (example && example.header && example.strain) {

            // Highlight the strain name in the FASTA header.
            exampleHeader = example.header.replace(example.strain, `<span class="treesort--highlighted-text">${example.strain}</span>`);

            exampleHTML = `<div class="treesort--example-panel">
               <div class="treesort--example-message">In this example FASTA header, we found the highlighted strain name:</div>
               <pre class="treesort--example-header">>${exampleHeader}</pre>
               <div class="treesort--example-help">If this isn't correct, please contact our technical support for assistance.</div>
            </div>`;
         }

         return `<div class="treesort--validation-summary">
            <div class="treesort--validation-title treesort--success">Your FASTA file was successfully validated.</div>
            <div class="treesort--validation-description">Please make sure the following summary is what you expected:</div>
            <ul class="treesort--validation-list">
               <li>${results.segments.length} segments: ${segmentList}</li>
               <li>${results.validNames.toLocaleString()} valid strains</li>
            </ul>
            ${ignoredStrains}
            ${exampleHTML}
         </div>`;
      },

      // Iterate over the virus taxon's segments to create list options.
      getSegmentOptions: function () {

         const segments = SegmentedViruses[this.virusTaxon].segments;
         if (!segments) { throw new Error("Invalid virus segment data"); }

         return segments.map((segment_) => {
            let label = segment_.name;
            if (segment_.isDefault) { label += " (default) "; }
            return {label: label, value: segment_.name};
         });
      },

      getValues: function () {

         let cladesPath = this.cladesPathEl.get("value");
         let deviation = this.deviationEl.get("value");
         let equalRates = this.equalRatesEl.get("checked");
         let fastaFileId = this.fastaFileIdEl.get("value");
         let inferenceMethod = this.inferenceMethodEl.get("value");
         //let matchRegex = this.matchRegexEl.get("value");
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
               "match_regex": null, //matchRegex,
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
      handleFastaFileIdChange: async function (value_) {

         // If we're suspending validation for this control, make it temporarily optional.
         if (this.validationContext.isSuspended) { this.fastaFileIdEl.set("required", false); }

         // Initialize the result
         let result = { isValid: false, errorMessage: null };

         // If no value was provided, get the value directly from the control.
         if (!value_) { value_ = this.safeTrim(this.fastaFileIdEl.get("value")); }

         // This will be displayed below the input FASTA file control.
         let summaryHTML = "";

         if (value_.length > 0) {

            // Get the input FASTA file selected from the workspace.
            const fastaFile = await WorkspaceManager.getObject(value_, false);

            if (!fastaFile || !fastaFile.data || fastaFile.data.length < 1) {
               result.errorMessage = "The selected FASTA file is invalid";
               result.isValid = false;

            } else {

               // Validate the FASTA and populate this.validatedFASTA with the results.
               this.validateFASTA(fastaFile.data);

               if (this.validatedFASTA.isValid) {

                  result.isValid = true;

                  // Create a summary of the successfully validated FASTA file.
                  summaryHTML = this.createValidFastaSummary();

               } else {

                  result.isValid = false;

                  // Create a summary of the errors in the FASTA file.
                  summaryHTML = this.createInvalidFastaSummary();
               }
            }

         } else {
            result.errorMessage = "Select a FASTA file";
            result.isValid = false;
         }

         if (!result.isValid && !this.validationContext.isSuspended) {
            this.fastaFileIdEl.set("state", "Error");
            this.fastaFileIdEl.set("message", result.errorMessage);

            // Update the control as required since it has an invalid value.
            this.fastaFileIdEl.set("required", true);

         } else {
            // Clear any existing error status.
            this.fastaFileIdEl.set("state", "");
            this.fastaFileIdEl.set("message", "");

            // Make the control optional until it is assigned an invalid value.
            this.fastaFileIdEl.set("required", false);
         }

         // If the FASTA validation panel is valid, populate it with the validation summary.
         if (this.fastaValidationPanelEl) {
            this.fastaValidationPanelEl.innerHTML = summaryHTML;
         }

         // Validate all controls
         this.validate();

         // Update the validation context's "unprocessed" count.
         if (this.validationContext.isSuspended) { this.updateValidationContext(); }

         // Update the control as required.
         this.fastaFileIdEl.set("required", true);

         return result.isValid;
      },

      /*
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
      },*/

      /*
      // Handle a change to the match type control.
      handleMatchTypeChange: function () {

         console.log("in handleMatchTypeChange")

         if (this.matchTypeEl.value == MatchType.Regex) {
            this.matchRegexContainerEl.style.display = "block";
         } else {
            this.matchRegexContainerEl.style.display = "none";
         }

         // Validate all controls
         this.validate();
         return;
      },*/

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

         // This is a huge hack to make the output FILE (not path) control required after it has been initialized.
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

         // This is a huge hack to make the output FILE (not path) control required at a later point than when it is initialized.
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
      isFastaFileIdValid: function () {
         return {
            isValid: this.validatedFASTA.isValid,
            errorMessage: "" //this.formatFastaErrors()
         }
      },

      // Is the match's regular expression valid?
      /*isMatchRegexValid: function (value_) {

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
      },*/

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

         // Was this segment found in the FASTA input file?
         if (Array.isArray(this.validatedFASTA.segments) && !this.validatedFASTA.segments.includes(refSegment)) {
            result.isValid = false;
            result.errorMessage = `Segment ${refSegment} was not found in the FASTA input file`;
            return result;
         }

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
         //if (jobData.match_regex) { this.matchRegexEl.set("value", jobData.match_regex); }
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

         // Wait until the form controls have been modified to de-suspend the validation context.
         setTimeout(() => { this.validationContext.isSuspended = false; }, 0);
         return;
      },

      // Re-inititalize the example headers and strain names for each match type.
      resetMatchTypeExamples: function () {

         this.matchTypeExamples[MatchType.Default] = {
            header: null,
            strain: null
         }
         this.matchTypeExamples[MatchType.EPI] = {
            header: null,
            strain: null
         }
         this.matchTypeExamples[MatchType.Regex] = {
            header: null,
            strain: null
         }
         this.matchTypeExamples[MatchType.Strain] = {
            header: null,
            strain: null
         }

         console.log("in resetMatchTypeExamples matchTypeExamples = ", this.matchTypeExamples)
      },

      // Re-initialize the FASTA validation data.
      resetValidatedFASTA: function () {
         this.validatedFASTA = {
            errors: [],
            exampleHeader: null,
            exampleStrain: null,
            isValid: false,
            notEnoughSegments: 0,
            regexType: null,
            score: 0,
            segments: this.FluSegments,
            sequenceCount: 0,
            totalNames: 0,
            validNames: 0,
            warnings: []
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
         //this.matchRegexEl.set("value", "");
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

         // Wait until the form controls have been modified to de-suspend the validation context.
         setTimeout(() => { this.validationContext.isSuspended = false; }, 0);

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
         this.inferenceMethodEl.set("options", InferenceMethodOptions);
         //this.matchTypeEl.set("options", MatchTypeOptions);
         this.refSegmentEl.set("options", this.getSegmentOptions());
         this.refTreeInferenceEl.set("options", RefTreeInferenceOptions);

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
      suspendValidation: function () {

         this.validationContext.isSuspended = true;

         // No controls have been processed yet.
         this.validationContext.unprocessed = this.validationContext.controlCount;
      },

      // Update a name map with an isolate and segment.
      updateNameMap: function (isolateName_, map_, segment_) {

         let segmentMap;

         // Has this name already been added to the map?
         if (!map_.has(isolateName_)) {

            // Create a new segment map and add the segment with a count of 1.
            segmentMap = new Map();
            segmentMap.set(segment_, 1);

         } else {
            segmentMap = map_.get(isolateName_);
            if (!segmentMap) {
               console.error(`${isolateName_} has an invalid segment map`);
               return;
            }

            let count = 0;

            // If this segment already has a count, retrieve it.
            if (segmentMap.has(segment_)) {
               count = segmentMap.get(segment_);
            }

            // Increment the segment's count.
            segmentMap.set(segment_, count + 1)
         }

         // Update the name map.
         map_.set(isolateName_, segmentMap);
      },

      // Update the list of selectable ref segments.
      updateSegmentOptions: function () {

         // TODO: We should probably display an error if there aren't any segments...
         if (!Array.isArray(this.validatedFASTA.segments) || this.validatedFASTA.segments.length < 1) { return; }

         // Get all possible segments for the virus taxon.
         const allSegments = SegmentedViruses[this.virusTaxon].segments;
         if (!allSegments) { throw new Error("Invalid virus segment data"); }

         let options = [];

         // Iterate over all possible segments and add an option if it's in the validatedFASTA data. Note: the reason
         // we're comparing against all segments is the "isDefault" attribute. This could be simplified if we maintain
         // the default segment separately.
         allSegments.forEach((segment_) => {

            if (!this.validatedFASTA.segments.includes(segment_.name)) { return; }

            let option = {
               label: segment_.name,
               value: segment_.name
            }

            if (segment_.isDefault) {
               option.label += " (default)";
               option.selected = true;
            }

            options.push(option);
         })

         this.refSegmentEl.set("options", options);
      },

      // If we're suspending validation, update the number of unprocessed controls and the "is suspended" flag.
      updateValidationContext: function () {

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

            /*if (this.matchTypeEl.get("value") == MatchType.Regex) {
               result = this.isMatchRegexValid();
               isValid = isValid && result.isValid;
            }*/

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
      },

      // Validate the format of the deflines/headers in the FASTA input file.
      validateFASTA: function (fasta_) {

         // Re-initialize the FASTA validation data that will be populated by this function.
         this.resetValidatedFASTA();

         // Re-inititalize the example headers and strain names for each match type.
         this.resetMatchTypeExamples();

         // Validate the FASTA parameter.
         fasta_ = this.safeTrim(fasta_);
         if (!fasta_) {

            // Update the validation results and exit.
            this.validatedFASTA.errors.push("The FASTA file is empty");
            this.validatedFASTA.isValid = false;
            return false;
         }

         // Errors found while parsing the headers.
         let errors = [];

         // All segments found in the FASTA headers will be added to this set.
         const segments = new Set();

         // Get an array of the headers/deflines.
         const headers = fasta_.match(/^>[^\n]*\r?\n/gm);

         // Validate the array of FASTA headers.
         if (!Array.isArray(headers) || headers.length < 1) {

            // Update the validation results and exit.
            this.validatedFASTA.errors.push("No headers were found in the input FASTA file");
            this.validatedFASTA.isValid = false;
            return false;
         }

         const sequenceCount = headers.length;

         // Initialize the name maps.
         const defaultNames = new Map();
         const epiIslNames = new Map();
         const strainNames = new Map();


         // TEST
         let invalidFileError = null; // empty or no headers were found
         let headersWithoutSegments = 0;

         // Iterate over all FASTA headers.
         headers.forEach(header_ => {

            // Remove the leading ">"
            let header = header_.trim().substring(1);

            // Look for a properly-formatted segment in the header.
            const segmentMatch = this.settings.REGEX_SEGMENT.exec(header);
            if (!Array.isArray(segmentMatch) || segmentMatch.length < 1) {
               //errors.push(`Unable to find a segment name in >${header}`);
               headersWithoutSegments += 1;
               return;
            }

            // Get the segment and add it to the result's set of unique segment names.
            let segment = segmentMatch[1].trim();
            segments.add(segment);

            // Remove the sequence description
            const spaceIndex = header.indexOf(" ");
            if (spaceIndex > 0) {
               header = header.substring(0, spaceIndex);
            }

            // Remove the segment from the header.
            header = header.replace(`|${segment}|`, "|").trim();

            //--------------------------------------------------------------------------------------------------
            // Below, we will use 3 different methods to try to find strain names in the headers.
            // Each method will populate its own "name map" with the potential strain names it finds.
            //--------------------------------------------------------------------------------------------------

            // Method #1: The isolate name is the header's sequence ID with the segment name removed.
            let isolateName = header;

            // Example strain names for each match type.
            let defaultExample = `${isolateName}`;
            let epiExample = null;
            let strainExample = null;

            // Add the isolate name and segment to the default name map.
            this.updateNameMap(isolateName, defaultNames, segment);

            // Method #2: Look for EPI_ISL_XXX identifiers.
            let matches = isolateName.match(this.settings.REGEX_EPI_ISL_REGEX);
            if (matches && matches.length > 0 && matches[0]) {
               epiExample = matches[0];
               this.updateNameMap(epiExample, epiIslNames, segment);
            }

            // Method #3: Look for the "standard" format of Influenza names.
            matches = isolateName.match(this.settings.REGEX_STRAIN_NAME);
            if (matches && matches.length > 0 && matches) {
               strainExample = matches[0];
               this.updateNameMap(strainExample, strainNames, segment);
            }

            //--------------------------------------------------------------------------------------------------
            // Update unpopulated match type examples.
            //--------------------------------------------------------------------------------------------------
            if (defaultExample && !this.matchTypeExamples[MatchType.Default].strain) {
               this.matchTypeExamples[MatchType.Default] = {
                  header: header,
                  strain: defaultExample
               }
            }
            if (epiExample && !this.matchTypeExamples[MatchType.EPI].strain) {
               this.matchTypeExamples[MatchType.EPI] = {
                  header: header,
                  strain: epiExample
               }
            }
            if (strainExample && !this.matchTypeExamples[MatchType.Strain].strain) {
               this.matchTypeExamples[MatchType.Strain] = {
                  header: header,
                  strain: strainExample
               }
            }
         })

         // Validate the name maps.
         const results = [
            this.validateNameMap(defaultNames, MatchType.Default, sequenceCount, segments.size),
            this.validateNameMap(epiIslNames, MatchType.EPI, sequenceCount, segments.size),
            this.validateNameMap(strainNames, MatchType.Strain, sequenceCount, segments.size)
            // TODO: Include a custom regex name map?
         ];

         // Sort the results in descending order by score.
         results.sort((a, b) => {
            return b.score - a.score;
         });

         // Get the result with the highest score.
         let topResult = results[0];

         // Populate the sequence count and initialize the segments array.
         topResult.sequenceCount = sequenceCount;
         topResult.segments = [];

         // Populate the result's array of segment names using the segments found in the FASTA file.
         segments.forEach(segment_ => {
            topResult.segments.push(segment_);
         })

         // Replace the FASTA validation data.
         this.validatedFASTA = topResult;

         // Add the errors that were found outside of the name map validation.
         if (errors.length > 0) {
            this.validatedFASTA.errors = [...this.validatedFASTA.errors, ...errors];
         }

         // TEST
         console.log(this.matchTypeExamples)
         console.log("at the end of validateFASTA this.validatedFASTA = ", this.validatedFASTA)

         // Disable checkboxes for segments not found in the FASTA file.
         this.segmentCheckboxes.forEach(checkbox_ => {
            const segment = checkbox_.get("name");
            if (!this.validatedFASTA.segments.includes(segment)) {
               checkbox_.set("checked", false);
               checkbox_.set("disabled", true);
            } else {
               checkbox_.set("checked", true);
               checkbox_.set("disabled", false);
            }
         })

         // Update the list of selectable ref segments.
         this.updateSegmentOptions();

         // Validate the ref segment.
         this.handleSegmentChange();

         // Set the match type.
         this.matchTypeEl.set("value", this.validatedFASTA.regexType);
      },

      // Validate the name map that was populated with names from the FASTA file's headers.
      validateNameMap: function (map_, regexType_, sequenceCount_, totalSegmentCount_) {

         // Scores for different types of error.
         const ErrorScore = {
            InsufficientData: -1,
            InvalidNames: -2
         }

         // NOTE: This should have the same attributes as this.validatedFASTA!
         const result = {

            // A list of error messages
            errors: [],

            // Is the FASTA file valid?
            isValid: false,

            // The number of strains that don't have a sequence for every segment.
            notEnoughSegments: 0,

            // Strains that only have a single sequence and segment.
            onlyOneSequence: 0,

            // The recommended type of regex to use when parsing strain names from FASTA headers (formerly "match type").
            regexType: regexType_,

            // This is used to rank the results of multiple validateNameMap() calls.
            score: 0,

            // All segment names found in the FASTA headers.
            segments: null,

            // The number of total sequences
            sequenceCount: sequenceCount_,

            status: FastaStatus.NOT_VALIDATED,

            // The number of strains that have multiples of segments.
            tooManySegments: 0,

            // The total number of names that were found (valid or invalid).
            totalNames: 0,

            // The number of valid names
            validNames: 0,

            // A list of warning messages
            warnings: []
         }

         if (!map_ || map_.size < 1) {
            // No strains were found
            result.status = FastaStatus.NO_VALID_STRAINS;
            result.score = ErrorScore.InvalidNames;
            return result;
         }

         // The total number of names that were found (valid or invalid).
         result.totalNames = map_.size;

         // Iterate over the names in the map.
         for (const name of map_.keys()) {

            // A count for every segment found in the strain's sequences.
            const segmentMap = map_.get(name);
            if (!segmentMap) {
               // A technical issue not caused by the user: The strain was added without at least one segment.
               continue;
            }

            const segmentCount = segmentMap === null ? 0 : segmentMap.size;

            if (segmentCount === 1) {
               result.onlyOneSequence += 1;
               continue;
            } else if (segmentCount < totalSegmentCount_) {
               result.notEnoughSegments += 1;
               continue;
            }

            // Iterate over the strain's segments and their counts.
            for (const segment of segmentMap.keys()) {
               const count = segmentMap.get(segment);
               if (isNaN(count) || count < 1) {
                  // A technical issue not caused by the user: The segment is missing a count value.
                  continue;
               } else if (count > 1) {
                  result.tooManySegments += 1;
                  continue;
               }
            }

            // If we get this far, we have a valid name with a sequence for all segments.
            result.validNames += 1;
         }

         // The number of names we expected based on the number of sequences and segments that were found
         const expectedNames = sequenceCount_ / totalSegmentCount_;

         // If we take into account a small amount of user error (for example, including strains that don't have
         // sequences for all segments), we can compare to these threshold values instead of the total expected.
         const upperThreshold = Math.floor(this.settings.FASTA_ERROR_THRESHOLD * expectedNames);
         const lowerThreshold = Math.floor((1.0 - this.settings.FASTA_ERROR_THRESHOLD) * expectedNames);

         if (result.validNames === 0) {

            // No valid strains were found
            result.status = FastaStatus.NO_VALID_STRAINS;
            result.score = ErrorScore.InvalidNames;

         } else if (result.validNames < this.settings.MIN_STRAIN_COUNT) {

            // Not enough strains for an analysis.
            result.status = FastaStatus.NOT_ENOUGH_STRAINS_FOR_ANALYSIS;
            result.score = ErrorScore.InsufficientData;

         } else if (result.validNames < upperThreshold) {

            // Why do we have fewer than expected valid names?
            if (result.onlyOneSequence > lowerThreshold) {

               // Strain name parsing error: Many of the strains only had a sequence for a single segment, so
               // we probably included too much text in the calculated strain name.
               result.status = FastaStatus.STRAIN_NAMES_WITH_ONE_SEQUENCE;
               result.score = ErrorScore.InvalidNames;

            } else if (result.tooManySegments > lowerThreshold) {

               // Strain name parsing error: What it thinks is the strain name is only part of the actual name and isn't unique.
               result.status = FastaStatus.TOO_MANY_SEGMENT_SEQUENCES;
               result.score = ErrorScore.InvalidNames;

            } else if (result.notEnoughSegments > lowerThreshold) {

               // Strain name parsing error: we used too much of the header as the strain name.
               result.status = FastaStatus.NOT_ENOUGH_SEGMENT_SEQUENCES;
               result.score = ErrorScore.InvalidNames;

            } else {

               // Probably some other parsing error.
               result.status = FastaStatus.FEWER_STRAINS_THAN_EXPECTED;
               result.score = ErrorScore.InsufficientData;
            }

         } else if (result.validNames === expectedNames) {

            // All expected strains are valid.
            result.status = FastaStatus.ALL_VALID_STRAINS;
            result.score = result.validNames;
            result.isValid = true;

         } else {

            // At least the threshold amount of expected names.
            result.status = FastaStatus.MOSTLY_VALID_STRAINS;
            result.score = 1 / result.validNames;
            result.isValid = true;
         }

         console.log(result)
         console.log("\n")

         return result;
      }

   });
});
