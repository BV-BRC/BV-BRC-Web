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
    // global variables?
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

    constructor: function () {
      // TODO: initialize important variables
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
      // add other startup functionality
      on(this.advanced, 'click', lang.hitch(this, function () {
        this.toggleAdvanced((this.advancedOptions.style.display == 'none'));
      }));
      on(this.exclude_button, 'click', lang.hitch(this, function (event) {
        this.markSelectedRegion("exclude_button");
      }));
      on(this.include_button, 'click', lang.hitch(this, function () {
        this.markSelectedRegion("include_button");
      }));
      on(this.target_button, 'click', lang.hitch(this, function () {
        this.markSelectedRegion("target_button");
      }));
      on(this.clear_button, 'click', lang.hitch(this, function () {
        this.markSelectedRegion("clear_button");
      }));
      this.sequence_selected_text = "";

      this._started = true;
    },

    // validate inputs
    validation: function () {

    },

    toggleAdvanced: function (flag) {
      if (flag) {
        this.advancedOptions.style.display = 'block';
        this.advancedOptionIcon.className = 'fa icon-caret-left fa-1';
      }
      else {
        this.advancedOptions.style.display = 'none';
        this.advancedOptionIcon.className = 'fa icon-caret-down fa-1';
      }
    },

    // create a json object and return it
    // this object is the payload that will be passed to the service
    // modify the payload before it reaches the service here
    getValues: function () {
      var curr_vars = this.inherited(arguments); // the form values with everything (including empty fields)
      var json_payload = {};
      // Sequence input
      if (this.startWithWorkspace.checked == true) {
        json_payload['sequence_input'] = curr_vars['sequence_workspace'];
        json_payload['input_type'] = 'workspace_fasta';
      }
      if (this.startWithInput.checked == true) {
        json_payload['sequence_input'] = this.getSequenceForSubmission(curr_vars['sequence_template']);
        json_payload['sequence_id'.toUpperCase()] = curr_vars['input_sequence_identifier'];
        json_payload['input_type'] = 'sequence_text';
      }
      if (this.startWithIdentifier.checked == true) {
        json_payload['sequence_input'] = curr_vars['sequence_id'];
        json_payload['input_type'] = 'database_id';
      }
      // sequence regions
      var region_keys = ['sequence_excluded_region', 'sequence_target', 'sequence_included_region', 'sequence_overlap_junction_list'];
      for (var x = 0; x < region_keys.length; x++) {
        if (curr_vars[region_keys[x]]) {
          json_payload[region_keys[x].toUpperCase()] = curr_vars[region_keys[x]];
        }
      }
      // settings
      if (curr_vars['primer_num_return']) {
        json_payload['primer_num_return'.toUpperCase()] = curr_vars['primer_num_return'];
      }
      if (curr_vars['primer_product_size_range']) {
        json_payload['primer_product_size_range'.toUpperCase()] = curr_vars['primer_product_size_range'].replace(',', '-');
      }
      var settings_keys = ['size', 'tm', 'gc'];
      for (var x = 0; x < settings_keys.length; x++) {
        var min_key = 'primer_min_' + settings_keys[x];
        var opt_key = 'primer_opt_' + settings_keys[x];
        var max_key = 'primer_max_' + settings_keys[x];
        if (curr_vars[min_key]) {
          json_payload[min_key.toUpperCase()] = curr_vars[min_key];
        }
        if (curr_vars[opt_key]) {
          if (settings_keys[x] == 'gc') {
            json_payload['PRIMER_OPT_GC_PERCENT'] = curr_vars[opt_key];
          }
          else {
            json_payload[opt_key.toUpperCase()] = curr_vars[opt_key];
          }
        }
        if (curr_vars[max_key]) {
          json_payload[max_key.toUpperCase()] = curr_vars[max_key];
        }
      }
      if (curr_vars['primer_pair_max_diff_tm']) {
        json_payload['primer_pair_max_diff_tm'.toUpperCase()] = curr_vars['primer_pair_max_diff_tm'];
      }
      var concentration_keys = ['salt_monovalent', 'dna_conc', 'salt_divalent', 'dntp_conc'];
      for (var x = 0; x < concentration_keys.length; x++) {
        var curr_conc_key = 'primer_' + concentration_keys[x];
        if (curr_vars[curr_conc_key]) {
          json_payload[curr_conc_key.toUpperCase()] = curr_vars[curr_conc_key];
        }
      }
      // output
      json_payload['output_path'] = curr_vars['output_path'];
      json_payload['output_file'] = curr_vars['output_file'];
      return json_payload;
    },

    // swap between sequence input types based on what is checked
    // resets the values of sequence_* when switching to a different option
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

    // When a user pastes a fasta sequence into the input fasta section
    // checks if a fasta header is present and adds to the identifier
    // then sets the 'sanitized' sequence in the sequence template
    onChangeSequence: function (val) {
      if (!val) {
        this.sequence_message.innerHTML = 'Please provide a nucleotide sequence.';
        return;
      }
      else if (this.isProteinSequence(val)) {
        this.sequence_message.innerHTML = 'This looks like a protein sequence. Please provide a nucleotide sequence';
        return;
      }
      else if (!this.hasSingleFastaSequence(val)) {
        this.sequence_message.innerHTML = 'Primer Design accepts only one sequence at a time. Please provide only one sequence.';
        return;
      }
      else {
        this.sequence_message.innerHTML = '';
      }
      var sanitized = this.sanitizeFastaSequence(val);
      var fasta_header = this.getFastaHeader(sanitized);
      // var fasta_sequence = this.getSequence(sanitized);
      var fasta_sequence = sanitized;
      if (fasta_header) {
        this.input_sequence_identifier.set('value', fasta_header);
      }
      this.sequence_template.set('value', fasta_sequence);
      this.sequence_message.innerHTML = '';
    },

    isProteinSequence: function(val) {
      var split_seq = val.toLowerCase().split("\n");
      var valid_chars = ["a","c","t","g","n","<",">","[","]","{","}"];
      var remaining_seq = "";
      for (var index in split_seq) {
        var line = split_seq[index];
        if (line.charAt(0) === '>') {
          continue;
        }
        for (var char in valid_chars) {
          remaining_seq = remaining_seq + line.replace(char,"");
        }
      }
      if (remaining_seq.length > 0) {
        return true;
      } else {
        return false;
      }
    },

    // checks for the occurence of multiple fastas records
    hasSingleFastaSequence: function (sequence) {
      // return sequence.split('\n').filter(function (line) { return line.match(/^>.*/) !== null; }).length <= 1;
      var header_count = 0;
      var split_seq = sequence.toLowerCase().split('\n');
      for (var index in split_seq) {
        var line = split_seq[index];
        if ((line.charAt(0) === '>')) {
          var tmp_line = this.removeNucleotides(line.toLowerCase());
          if (tmp_line.length > 1) {
            header_count += 1;
          }
          if (header_count > 1) {
            return false;
          }
        }
      }
      return true;
    },

    // removes bad portions of a sequence? Stolen from BLAST.js
    sanitizeFastaSequence: function (sequence) {
      var header = sequence.split('\n').filter(function (line) { return line.match(/^>.*/) !== null; });
      var sanitized = sequence.split('\n').filter(function (line) { return line.match(/^>.*/) == null; }).map(function (line) { return line.replace(/ /g, ''); });
      return header.concat(sanitized).join('\n');
    },

    // Gets the header from the fasta record or returns null if not present
    // assumes the first line is the fasta record
    getFastaHeader: function (sequence) {
      if (sequence.charAt(0) === '>') {
        var split_seq = sequence.split('\n');
        if (this.removeNucleotides(split_seq[0]).length > 1) {
          return String(split_seq[0]).replace('>', '');
        }
        // var header = sequence.split('\n').filter(function (line) { return line.match(/^>.*/) !== null; });
        // return String(header).replace('>','');
      }
      return null;
    },

    hasFastaHeader: function (sequence) {
      if (sequence.charAt(0) === '>') {
        var split_seq = sequence.split('\n');
        if (this.removeNucleotides(split_seq[0]).length > 1) {
          return true;
        }
      }
      return false;
    },

    // Gets the sequence from the fasta record
    getSequence: function (sequence) {
      var split_seq = sequence.split('\n');
      if (this.hasFastaHeader(sequence)) {
        return split_seq.slice(1, split_seq.length).join('\n');
      }
      else {
        return sequence;
      }
    },

    // Gets the sequence for payload submission
    getSequenceForSubmission: function (sequence) {
      var split_seq = sequence.split('\n');
      if (this.hasFastaHeader(sequence)) {
        return split_seq.slice(1, split_seq.length).join('');
      }
      else {
        return split_seq.slice(0, split_seq.length).join('');
      }
    },

    // remove nucleotide characters from the input string
    // used to test whether the line with '>' in it is a header or a sequence
    removeNucleotides: function (val) {
      var nucleotide_list = ['a', 'c', 't', 'g', 'n']; // add more valid nucleotides as necessary
      for (var nuc in nucleotide_list) {
        val = val.replace(nuc, '');
      }
      return val;
    },

    // Message to display when selecting a workspace file
    displayNote: function () {
      this.workspace_input_message.innerHTML = 'Note: only the first fasta record will be used';
    },

    getSelectedText: function() {
      //var selected_text = window.getSelection().toString();
      //Apparently there is a firefox bug where window.getSelection().toString() and other easy
      //ways to get the selected text do not work in a TextArea
      var field = this.sequence_template.textbox;
      var startPos = field.selectionStart;
      var endPos = field.selectionEnd;
      var sequence_text = this.sequence_template.get("displayedValue");
      var selected_text = sequence_text.substring(startPos,endPos);
      if (selected_text == "" || selected_text.trim() == "") {
        return;
      }
      this.sequence_selected_text = selected_text;
    },

    //TODO: html background color not working
    highlightSelectedText: function() {
      if (this.sequence_selected_text == "" || this.sequence_selected_text.trim() == "") {
        return;
      }
      var sequence_text = this.sequence_template.get("displayedValue");
      var txt_idx = this.sequence_template.textbox.selectionStart;
      if (txt_idx >= 0) {
        var before_highlight = sequence_text.substring(0,txt_idx);
        var after_highlight = sequence_text.substring(txt_idx+this.sequence_selected_text.length,sequence_text.length);
        var highlight_text = before_highlight + "<span style='background:yellow'>" + this.sequence_selected_text + "</span>" + after_highlight;
        this.sequence_template.set("value",highlight_text);
      }
    },

    //Does not check for if markers have already been place in other locations in the sequence text
    markSelectedRegion: function(button_name) {
      var selected_text = this.sequence_selected_text;
      var sequence_text = this.sequence_template.get("displayedValue");
      if (button_name == "clear_button") {
        var header = "";
        if (this.hasFastaHeader(sequence_text)) {
          header = this.getFastaHeader(sequence_text);
          var sequence = this.getSequence(sequence_text);
        } else{
          var sequence = sequence_text;
        }
        var markers = ["<",">","[","]","{","}"];
        markers.forEach(function(m) {
          sequence = sequence.replace(m,"");
        },this);
        if (header != "") {
          var clear_sequence = ">" + header + "\n" + sequence;
        } else {
          var clear_sequence = sequence;
        }
        this.sequence_template.set("value",clear_sequence);
        this.sequence_selected_text = "";
        return;
      }
      if (selected_text == "" || selected_text.trim() == "") {
        return;
      }
      if (button_name != "clear_button" && sequence_text.includes(selected_text)) { //shouldn't ever be clear_button here but just in case
        var txt_idx = this.sequence_template.textbox.selectionStart;
        if (this.hasFastaHeader(sequence_text)) {
          var header = this.getFastaHeader(sequence_text);
          if (txt_idx <= header.length) {
            return;
          }
        }
        var before_marker = sequence_text.substring(0,txt_idx);
        var after_marker = sequence_text.substring(txt_idx+this.sequence_selected_text.length,sequence_text.length);
        if (button_name == "exclude_button") {
          var marker = ["<",">"];
        }
        else if (button_name == "target_button") {
          var marker = ["[","]"];
        }
        else { //include button
          var marker = ["{","}"];
        }
        var marker_text = before_marker + marker[0] + this.sequence_selected_text + marker[1] + after_marker;
        this.sequence_template.set("value",marker_text);
        this.sequence_selected_text = "";
      }
    }
  });
});
