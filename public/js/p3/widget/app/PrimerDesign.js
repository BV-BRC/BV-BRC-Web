define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/PrimerDesign.html', './AppBase', 'dojo/dom-construct',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby',
  'dojox/xml/parser', 'dojo/request'
], function (
  declare, WidgetBase, on,
  domClass,
  Template, AppBase, domConstruct,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog,
  children, WorkspaceManager, Memory, Standby,
  xmlParser, xhr
) {
  return declare([AppBase], {
    //global variables?
    baseClass: 'Primer Design',
    templateString: Template,
    applicationName: 'PrimerDesign',
    requireAuth: true,
    applicationLabel: 'Primer Design',
    applicationDescription: 'The Primer Design Service utilizes Primer3 to design primers from a given input sequence under a variety of temperature, size, and concentration constraints.',
    applicationHelp: 'TODO',
    tutorialLink: 'TODO',
    pageTitle: 'Primer Design',
    libraryData: null,
    defaultPath: '',

    listValues: function (obj) {
        var results = [];
        Object.keys(obj).forEach(function (key) {
            results.append(obj[key]);
        });
    },

    constructor: function() {
        //TODO: initialize important variables
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
        _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activateWorkspacePath;
        _self.output_path.set('value', _self.defaultPath);
        //TODO: add other startup functionality
    },

    //validate inputs
    validation: function() {

    },

    //create a json object and return it
    //this object is the payload that will be passed to the service
    //modify the payload before it reaches the service here
    //TODO: Come back and reformat this function
    //regExp:([0-9]+((\.[0-9]+)?))-([0-9]+((\.[0-9]+)?))
    getValues: function() {
        var curr_vars = this.inherited(arguments); //the form values with everything (including empty fields)
        var json_payload = {};
        //Sequence input
        /*
        if (this.startWithWorkspace.checked == true) {
            json_payload["input_workspace_fasta".toUpperCase()] = curr_vars["sequence_workspace"];
        }
        */
        if (this.startWithInput.checked == true) {
            json_payload["sequence_template".toUpperCase()] = this.getSequenceForSubmission(curr_vars["sequence_template"]);
            json_payload["sequence_id".toUpperCase()] = curr_vars["input_sequence_identifier"];
        }
        /*
        if (this.startWithIdentifier.checked == true) {
            json_payload["input_bvbrc_id".toUpperCase()] = curr_vars["sequence_id"];
        }
        */
        //sequence regions
        var region_keys = ["sequence_excluded_region","sequence_target","sequence_included_region","sequence_overlap_junction_list"];
        for (var x = 0; x < region_keys.length; x++) {
            if (curr_vars[region_keys[x]]) {
                json_payload[region_keys[x].toUpperCase()] = curr_vars[region_keys[x]];
            }
        }
        //settings
        if (curr_vars["primer_num_return"]){
            json_payload["primer_num_return".toUpperCase()] = curr_vars["primer_num_return"];
        }
        if (curr_vars["primer_product_size_range"]){
            json_payload["primer_product_size_range".toUpperCase()] = curr_vars["primer_product_size_range"].replace(",","-");
        }
        var settings_keys = ["size","tm","gc"];
        for (var x = 0; x < settings_keys.length; x++) {
            var min_key = "primer_min_" + settings_keys[x];
            var opt_key = "primer_opt_" + settings_keys[x];
            var max_key = "primer_max_" + settings_keys[x];
            if (curr_vars[min_key]) {
                json_payload[min_key.toUpperCase()] = curr_vars[min_key];
            }
            if (curr_vars[opt_key]) {
                if (settings_keys[x] == "gc") {
                    json_payload["PRIMER_OPT_GC_PERCENT"] = curr_vars[opt_key];
                }
                else {
                    json_payload[opt_key.toUpperCase()] = curr_vars[opt_key];
                }
            }
            if (curr_vars[max_key]) {
                json_payload[max_key.toUpperCase()] = curr_vars[max_key];
            }
        }
        if (curr_vars["primer_pair_max_diff_tm"]) {
            json_payload["primer_pair_max_diff_tm".toUpperCase()] = curr_vars["primer_pair_max_diff_tm"];
        }
        var concentration_keys = ["salt_monovalent","dna_conc","salt_divalent","dntp_conc"];
        for (var x = 0; x < concentration_keys.length; x++) {
            var curr_conc_key = "primer_" + concentration_keys[x];
            if (curr_vars[curr_conc_key]) {
                json_payload[curr_conc_key.toUpperCase()] = curr_vars[curr_conc_key];
            }
        }
        //output
        json_payload["output_path".toUpperCase()] = curr_vars["output_path"];
        json_payload["output_file".toUpperCase()] = curr_vars["output_file"];
        return json_payload;
    },

    //swap between sequence input types based on what is checked
    //resets the values of sequence_* when switching to a different option
    onStartWithChange: function () {
        if (this.startWithWorkspace.checked == true) {
            this.fasta_workspace_table.style.display = 'table';
            this.fasta_input_table.style.display = 'none';
            this.patric_sequence_identifier.style.display = 'none';
        }
        if (this.startWithInput.checked == true) {
            this.fasta_workspace_table.style.display = 'none';
            this.fasta_input_table.style.display = 'table';
            this.patric_sequence_identifier.style.display = 'none';
        }
        if (this.startWithIdentifier.checked == true) {
            this.fasta_workspace_table.style.display = 'none';
            this.fasta_input_table.style.display = 'none';
            this.patric_sequence_identifier.style.display = 'table';
        }
    },

    //When a user pastes a fasta sequence into the input fasta section
    //checks if a fasta header is present and adds to the identifier
    //then sets the 'sanitized' sequence in the sequence template
    onChangeSequence: function(val) {
        if (!val) {
            this.sequence_message.innerHTML = 'Please provide a nucleotide sequence.';
            return;
        }
        if (!this.hasSingleFastaSequence(val)) {
            this.sequence_message.innerHTML = 'Primer Design accepts only one sequence at a time. Please provide only one sequence.';
            return;
        }
        var sanitized = this.sanitizeFastaSequence(val);
        var fasta_header = this.getFastaHeader(sanitized);
        var fasta_sequence = this.getSequence(sanitized);
        if (fasta_header) {
            this.input_sequence_identifier.set('value',fasta_header);
        }
        this.sequence_template.set('value',fasta_sequence);
        this.sequence_message.innerHTML = '';
    },

    //checks for the occurence of multiple fastas records
    hasSingleFastaSequence: function (sequence) {
        return sequence.split('\n').filter(function (line) { return line.match(/^>.*/) !== null; }).length <= 1;
    },

    //removes bad portions of a sequence? Stolen from BLAST.js
    sanitizeFastaSequence: function (sequence) {
        var header = sequence.split('\n').filter(function (line) { return line.match(/^>.*/) !== null; });
        var sanitized = sequence.split('\n').filter(function (line) { return line.match(/^>.*/) == null; }).map(function (line) { return line.replace(/ /g, ''); });
        return header.concat(sanitized).join('\n');
    },

    //Gets the header from the fasta record or returns null if not present
    getFastaHeader: function(sequence) {
        if (sequence.includes(">")) {
            var header = sequence.split('\n').filter(function (line) { return line.match(/^>.*/) !== null; });
            return String(header).replace(">","");
        }
        return null;
    },

    //Gets the sequence for payload submission
    getSequenceForSubmission: function(sequence) {
        var split_seq = sequence.split('\n');
        if (sequence.includes(">")) {
            return split_seq.slice(1,split_seq.length).join("");
        }
        else {
            return split_seq.slice(0,split_seq.length).join("");
        }
    },

    //Gets the sequence from the fasta record
    getSequence: function(sequence) {
        var split_seq = sequence.split('\n');
        if (sequence.includes(">")) {
            return split_seq.slice(1,split_seq.length).join("\n");
        }
        else {
            return sequence;
        }
    },

    //Message to display when selecting a workspace file
    displayNote: function() {
        this.workspace_input_message.innerHTML = 'Note: only the first fasta record will be used';
    }
  });
});