define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/PrimerDesign.html', './AppBase', 'dojo/dom-construct',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby',
  'dojox/xml/parser', 'dojo/request'
], function (
  declare, WidgetBase, Topic, on,
  domClass,
  Template, AppBase, domConstruct,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog,
  children, WorkspaceManager, Memory, Standby,
  xmlParser, xhr
) {
  return declare([AppBase], {
    // global variables?
    baseClass: 'PrimerDesign',
    templateString: Template,
    applicationName: 'PrimerDesign',
    requireAuth: true,
    applicationLabel: 'Primer Design',
    applicationDescription: 'The Primer Design Service utilizes Primer3 to design primers from a given input sequence under a variety of temperature, size, and concentration constraints.',
    applicationHelp: 'quick_references/services/primer_design_service.html',
    tutorialLink: 'tutorial/primer_design/primer_design.html',
    videoLink: 'https://youtu.be/4MlDw9V5H7w',
    pageTitle: 'Primer Design Service | BV-BRC',
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
        this.markSelectedRegion('exclude_button');
      }));
      on(this.include_button, 'click', lang.hitch(this, function () {
        this.markSelectedRegion('include_button');
      }));
      on(this.target_button, 'click', lang.hitch(this, function () {
        this.markSelectedRegion('target_button');
      }));
      on(this.clear_button, 'click', lang.hitch(this, function () {
        this.markSelectedRegion('clear_button');
      }));
      this.setTooltips();
      this.sequence_selected_text = '';
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
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
      var values = this.inherited(arguments); // the form values with everything (including empty fields)
      var json_payload = {};
      // Sequence input
      if (this.startWithWorkspace.checked == true) {
        json_payload['sequence_input'] = values['sequence_workspace'];
        json_payload['input_type'] = 'workspace_fasta';
      }
      if (this.startWithInput.checked == true) {
        json_payload['sequence_input'] = this.getSequenceForSubmission(values['sequence_template']);
        json_payload['sequence_id'.toUpperCase()] = values['input_sequence_identifier'];
        json_payload['input_type'] = 'sequence_text';
      }
      /*
      if (this.startWithIdentifier.checked == true) {
        json_payload['sequence_input'] = values['sequence_id'];
        json_payload['input_type'] = 'database_id';
      }
      */
      // Primer pick internal oligonucleotide sequence
      if (this.internal_oligo_checkbox.checked) {
        json_payload['PRIMER_PICK_INTERNAL_OLIGO'] = true;
      } else {
        json_payload['PRIMER_PICK_INTERNAL_OLIGO'] = false;
      }
      // sequence regions
      var region_keys = ['sequence_excluded_region', 'sequence_target', 'sequence_included_region', 'sequence_overlap_junction_list'];
      for (var x = 0; x < region_keys.length; x++) {
        if (values[region_keys[x]]) {
          json_payload[region_keys[x].toUpperCase()] = values[region_keys[x]];
        }
      }
      // settings
      if (values['primer_num_return']) {
        json_payload['primer_num_return'.toUpperCase()] = values['primer_num_return'];
      }
      if (values['primer_product_size_range']) {
        json_payload['primer_product_size_range'.toUpperCase()] = values['primer_product_size_range'].replace(',', '-');
      }
      var settings_keys = ['size', 'tm', 'gc'];
      for (var x = 0; x < settings_keys.length; x++) {
        var min_key = 'primer_min_' + settings_keys[x];
        var opt_key = 'primer_opt_' + settings_keys[x];
        var max_key = 'primer_max_' + settings_keys[x];
        if (values[min_key]) {
          json_payload[min_key.toUpperCase()] = values[min_key];
        }
        if (values[opt_key]) {
          if (settings_keys[x] == 'gc') {
            json_payload['PRIMER_OPT_GC_PERCENT'] = values[opt_key];
          }
          else {
            json_payload[opt_key.toUpperCase()] = values[opt_key];
          }
        }
        if (values[max_key]) {
          json_payload[max_key.toUpperCase()] = values[max_key];
        }
      }
      if (values['primer_pair_max_diff_tm']) {
        json_payload['primer_pair_max_diff_tm'.toUpperCase()] = values['primer_pair_max_diff_tm'];
      }
      var concentration_keys = ['salt_monovalent', 'dna_conc', 'salt_divalent', 'dntp_conc'];
      for (var x = 0; x < concentration_keys.length; x++) {
        var curr_conc_key = 'primer_' + concentration_keys[x];
        if (values[curr_conc_key]) {
          json_payload[curr_conc_key.toUpperCase()] = values[curr_conc_key];
        }
      }
      // output
      json_payload = this.checkBaseParameters(values, json_payload);
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
      /*
      if (this.startWithIdentifier.checked == true) {
        this.fasta_workspace_table.style.display = 'none';
        this.fasta_input_table.style.display = 'none';
        this.patric_sequence_identifier.style.display = 'table';
      }
      */
    },

    // When a user pastes a fasta sequence into the input fasta section
    // checks if a fasta header is present and adds to the identifier
    // then sets the 'sanitized' sequence in the sequence template
    onChangeSequence: function (val) {
      if (!val) {
        this.sequence_message.innerHTML = 'Please provide a nucleotide sequence.';
        return;
      }
      else if (this.isInvalidSequence(val)) {
        this.sequence_message.innerHTML = 'This looks like an invalid sequence. Please provide a valid nucleotide sequence';
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

    validate: function () {
      if (this.output_path.get('value') === '') {
        this.submitButton.set('disabled', true);
        return false;
      }
      if (this.output_file.get('value') === '') {
        this.submitButton.set('disabled', true);
        return false;
      }
      if (this.startWithInput.checked == true) {
        var seq = this.getSequenceForSubmission(this.sequence_template.get('value'));
        if (seq === '') {
          this.submitButton.set('disabled', true);
          return false;
        }
        if (this.isInvalidSequence(seq)) {
          this.submitButton.set('disabled', true);
          return false;
        }
      }
      else if (this.startWithWorkspace.checked == true) {
        if (this.sequence_workspace.get('value') === '') {
          this.submitButton.set('disabled', true);
          return false;
        }
      } else { // bvbrc-id
        if (this.input_bvbrc_identifier.get('value') === '') {
          this.submitButton.set('disabled', true);
          return false;
        }
      }
      this.submitButton.set('disabled', false);
      return true;
    },

    // Removes all valid nucleotide sequence characters and and valid markings and
    // assumes the remaining characters are invalid
    isInvalidSequence: function (val) {
      var split_seq = val.toLowerCase().split('\n');
      for (var index in split_seq) {
        var line = split_seq[index].trim();
        if (line.charAt(0) === '>') {
          continue;
        }
        // case insensitive replace a,g,c,t,>,<,[,],{,}
        line = line.replace(/a|g|c|t|n/gi, '');
        // eslint-disable-next-line no-useless-escape
        line = line.replace(/[\[\]{}<>']+/g, '');
        if (line.length > 0) {
          return true;
        }
      }
      return false;
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
      this.validate();
    },

    checkBaseParameters: function (values, json_payload) {
      json_payload['output_path'] = values['output_path'];
      this.output_folder = values['output_path'];
      json_payload['output_file'] = values['output_file'];
      this.output_name = values['output_file'];
      return json_payload;
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
            this.setSequenceSourceFormFill(job_data);
            this.setAdvancedParamsFormFill(job_data);
            this.setRegionsFormFill(job_data);
            this.form_flag = true;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setRegionsFormFill: function (job_data) {
      var region_dict = {
        'SEQUENCE_EXCLUDED_REGION': 'sequence_excluded_region',
        'SEQUENCE_TARGET': 'sequence_target',
        'SEQUENCE_INCLUDED_REGION': 'sequence_included_region',
        'SEQUENCE_OVERLAP_JUNCTION_LIST': 'sequence_overlap_junction_list'
      };
      var _self = this;
      Object.keys(region_dict).forEach(lang.hitch(this, function (region) {
        if (Object.keys(job_data).includes(region)) {
          _self[region_dict[region]].set('value', job_data[region]);
        }
      }));
    },

    setAdvancedParamsFormFill: function (job_data) {
      var params1 = { 'PRIMER_PICK_INTERNAL_OLIGO': 'internal_oligo_checkbox','PRIMER_NUM_RETURN': 'primer_num_return', 'PRIMER_PRODUCT_SIZE_RANGE': 'primer_product_size_range' };
      var min_dict = { 'PRIMER_MIN_SIZE': 'primer_min_size', 'PRIMER_MIN_TM': 'primer_min_tm', 'PRIMER_MIN_GC': 'primer_min_gc' };
      var opt_dict = { 'PRIMER_OPT_SIZE': 'primer_opt_size', 'PRIMER_OPT_GC_PERCENT': 'primer_opt_gc', 'PRIMER_OPT_TM': 'primer_opt_tm' };
      var max_dict = {
        'PRIMER_MAX_SIZE': 'primer_max_size', 'PRIMER_MAX_GC': 'primer_max_gc', 'PRIMER_MAX_TM': 'primer_max_tm', 'PRIMER_PAIR_MAX_DIFF_TM': 'primer_pair_max_diff_tm'
      };
      var concentration_dict = {
        'PRIMER_SALT_MONOVALENT': 'primer_salt_monovalent', 'PRIMER_DNA_CONC': 'primer_dna_conc', 'PRIMER_SALT_DIVALENT': 'primer_salt_divalent', 'PRIMER_NTP_CONC': 'primer_ntp_conc'
      };
      var all_params = Object.assign({}, params1, min_dict, opt_dict, max_dict, concentration_dict);
      var advanced_settings = false;
      Object.keys(all_params).forEach(function (field) {
        if (job_data.hasOwnProperty(field)) {
          advanced_settings = true;
        }
      }, this);
      if (advanced_settings) {
        this.toggleAdvanced((this.advancedOptions.style.display == 'none'));
      }
      Object.keys(params1).forEach(function (field) {
        if (job_data.hasOwnProperty(field)) {
          this[params1[field]].set('value', job_data[field]);
        }
      }, this);
      Object.keys(min_dict).forEach(function (field) {
        if (job_data.hasOwnProperty(field)) {
          this[min_dict[field]].set('value', job_data[field]);
        }
      }, this);
      Object.keys(opt_dict).forEach(function (field) {
        if (job_data.hasOwnProperty(field)) {
          this[opt_dict[field]].set('value', job_data[field]);
        }
      }, this);
      Object.keys(max_dict).forEach(function (field) {
        if (job_data.hasOwnProperty(field)) {
          this[max_dict[field]].set('value', job_data[field]);
        }
      }, this);
      Object.keys(concentration_dict).forEach(function (field) {
        if (job_data.hasOwnProperty(field)) {
          this[concentration_dict[field]].set('value', job_data[field]);
        }
      }, this);
    },

    setSequenceSourceFormFill: function (job_data) {
      if (job_data['input_type'] == 'database_id') {
        // this.startWithIdentifier.set("checked",true);
        this.startWithInput.set('checked', false);
        this.startWithWorkspace.set('checked', false);
        // add input
        this.input_bvbrc_identifier.set('value', job_data['sequence_input']);
      }
      else if (job_data['input_type'] == 'sequence_text') {
        this.startWithInput.set('checked', true);
        // this.startWithIdentifier.set("checked",false);
        this.startWithWorkspace.set('checked', false);
        // add input
        this.input_sequence_identifier.set('value', job_data['sequence_id'.toUpperCase()]);
        this.sequence_template.set('value', job_data['sequence_input']);
      }
      else {
        this.startWithWorkspace.set('checked', true);
        // this.startWithIdentifier.set("checked",false);
        this.startWithInput.set('checked', false);
        // add input
        this.sequence_workspace.set('value', job_data['sequence_input']);
      }
    },

    setTooltips: function () {
      new Tooltip({
        connectId: ['exclude_tooltip'],
        label: 'OR: mark the source sequence with < and >: e.g. ...ATCT&#60;CCCC&#62;TCAT.. forbids primers in the central CCCC. '
      });
      new Tooltip({
        connectId: ['target_tooltip'],
        label: 'OR: mark the source sequence with [ and ]: e.g. ...ATCT[CCCC]TCAT.. means that primers must flank the central CCCC'
      });
      new Tooltip({
        connectId: ['include_tooltip'],
        label: 'OR: use { and } in the source sequence to mark the beginning and end of the included region: e.g. in ATC{TTC...TCT}AT the included region is TTC...TCT'
      });
      new Tooltip({
        connectId: ['numReturn_tooltip'],
        label: "The maximum number of primer pairs to return. Primer pairs returned are sorted by their 'quality', in other words by the value of the objective function (where a lower number indicates a better primer pair). Caution: setting this parameter to a large value will increase running time."
      });
      new Tooltip({
        connectId: ['prodSize_tooltip'],
        label: 'Minimum, Optimum, and Maximum lengths (in bases) of the PCR product. Primer3 will not generate primers with products shorter than Min or longer than Max, and with default arguments Primer3 will attempt to pick primers producing products close to the Optimum length.'
      });
      new Tooltip({
        connectId: ['primerSize_tooltip'],
        label: 'Minimum, Optimum, and Maximum lengths (in bases) of a primer oligo. Primer3 will not pick primers shorter than Min or longer than Max, and with default arguments will attempt to pick primers close with size close to Opt. Min cannot be smaller than 1. Max cannot be larger than 36. (This limit is governed by maximum oligo size for which melting-temperature calculations are valid.) Min cannot be greater than Max.'
      });
      new Tooltip({
        connectId: ['primerTemp_tooltip'],
        label: 'Minimum, Optimum, and Maximum melting temperatures (Celsius) for a primer oligo. Primer3 will not pick oligos with temperatures smaller than Min or larger than Max, and with default conditions will try to pick primers with melting temperatures close to Opt.'
      });
      new Tooltip({
        connectId: ['primerGC_tooltip'],
        label: 'Minimum, Optimum, and Maximum percentage of Gs and Cs in any primer or oligo.'
      });
    },

    getSelectedText: function () {
      // var selected_text = window.getSelection().toString();
      // Apparently there is a firefox bug where window.getSelection().toString() and other easy
      // ways to get the selected text do not work in a TextArea
      var field = this.sequence_template.textbox;
      var startPos = field.selectionStart;
      var endPos = field.selectionEnd;
      var sequence_text = this.sequence_template.get('displayedValue');
      var selected_text = sequence_text.substring(startPos, endPos);
      if (selected_text == '' || selected_text.trim() == '') {
        return;
      }
      this.sequence_selected_text = selected_text;
    },

    // TODO: html background color not working
    highlightSelectedText: function () {
      if (this.sequence_selected_text == '' || this.sequence_selected_text.trim() == '') {
        return;
      }
      var sequence_text = this.sequence_template.get('displayedValue');
      var txt_idx = this.sequence_template.textbox.selectionStart;
      if (txt_idx >= 0) {
        var before_highlight = sequence_text.substring(0, txt_idx);
        var after_highlight = sequence_text.substring(txt_idx + this.sequence_selected_text.length, sequence_text.length);
        var highlight_text = before_highlight + "<span style='background:yellow'>" + this.sequence_selected_text + '</span>' + after_highlight;
        this.sequence_template.set('value', highlight_text);
      }
    },

    // Does not check for if markers have already been place in other locations in the sequence text
    markSelectedRegion: function (button_name) {
      var selected_text = this.sequence_selected_text;
      var sequence_text = this.sequence_template.get('displayedValue');
      if (button_name == 'clear_button') {
        var header = '';
        if (this.hasFastaHeader(sequence_text)) {
          header = this.getFastaHeader(sequence_text);
          var sequence = this.getSequence(sequence_text);
        } else {
          var sequence = sequence_text;
        }
        var markers = ['<', '>', '[', ']', '{', '}'];
        markers.forEach(function (m) {
          sequence = sequence.replace(m, '');
        }, this);
        if (header != '') {
          var clear_sequence = '>' + header + '\n' + sequence;
        } else {
          var clear_sequence = sequence;
        }
        this.sequence_template.set('value', clear_sequence);
        this.sequence_selected_text = '';
        return;
      }
      if (selected_text == '' || selected_text.trim() == '') {
        return;
      }
      if (button_name != 'clear_button' && sequence_text.includes(selected_text)) { // shouldn't ever be clear_button here but just in case
        var txt_idx = this.sequence_template.textbox.selectionStart;
        if (this.hasFastaHeader(sequence_text)) {
          var header = this.getFastaHeader(sequence_text);
          if (txt_idx <= header.length) {
            return;
          }
        }
        var before_marker = sequence_text.substring(0, txt_idx);
        var after_marker = sequence_text.substring(txt_idx + this.sequence_selected_text.length, sequence_text.length);
        if (button_name == 'exclude_button') {
          var marker = ['<', '>'];
        }
        else if (button_name == 'target_button') {
          var marker = ['[', ']'];
        }
        else { // include button
          var marker = ['{', '}'];
        }
        var marker_text = before_marker + marker[0] + this.sequence_selected_text + marker[1] + after_marker;
        this.sequence_template.set('value', marker_text);
        this.sequence_selected_text = '';
      }
    }
  });
});
