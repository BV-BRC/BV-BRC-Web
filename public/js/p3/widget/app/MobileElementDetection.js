define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/MobileElementDetection.html', 'dojo/NodeList-traverse', 'dojo/store/Memory',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  './AppBase', '../../WorkspaceManager'
], function (
  declare, WidgetBase, Topic, lang, Deferred,
  on, xhr, domClass, domConstruct,
  Template, children, Memory,
  popup, TooltipDialog, Dialog,
  AppBase, WorkspaceManager
) {

  return declare([AppBase], {
    baseClass: 'App MobileElementDetection',
    pageTitle: 'Mobile Element Detection Service | DXKB',
    templateString: Template,
    applicationName: 'MobileElementDetection',
    requireAuth: true,
    applicationLabel: 'Mobile Element Detection',
    applicationDescription: 'Executes genome assembly (if needed) followed by geNomad pipeline for plasmid and virus identification, with automated annotation of viral and plasmid genomes.',
    applicationHelp: 'quick_references/services/mobile_element_detection_service.html',
    tutorialLink: 'tutorial/mobile_element_detection/mobile_element_detection.html',
    // videoLink: 'https://youtube.com',
    libraryData: null,
    defaultPath: '',
    startingRows: 13,
    libCreated: 0,

    constructor: function () {
      this.addedLibs = { counter: 0 };
      this.addedPairs = 0;
      this.pairToAttachPt1 = ['read1', 'read2'];
      this.pairToAttachPt2 = ['read1'];
      this.advPairToAttachPt = ['interleaved', 'read_orientation_outward', 'platform'];
      this.paramToAttachPt = ['input_file', 'recipe', 'output_path', 'output_file', 'genome_size'];
      this.singleToAttachPt = ['single_end_libsWidget'];
      this.advSingleToAttachPt = ['platform'];
      this.libraryStore = new Memory({ data: [], idProperty: '_id' });
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
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);
      for (var i = 0; i < this.startingRows; i++) {
        var tr = this.libsTable.insertRow(0);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
      this.numlibs.startup();

      // Setup advanced sections
      this.advrow.turnedOn = (this.advrow.style.display != 'none');
      on(this.advanced, 'click', lang.hitch(this, function () {
        this.advrow.turnedOn = (this.advrow.style.display != 'none');
        if (!this.advrow.turnedOn) {
          this.advrow.turnedOn = true;
          this.advrow.style.display = 'block';
          this.advicon.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.advrow.turnedOn = false;
          this.advrow.style.display = 'none';
          this.advicon.className = 'fa icon-caret-down fa-1';
        }
      }));

      this.advrow2.turnedOn = (this.advrow2.style.display != 'none');
      on(this.advanced2, 'click', lang.hitch(this, function () {
        this.advrow2.turnedOn = (this.advrow2.style.display != 'none');
        if (!this.advrow2.turnedOn) {
          this.advrow2.turnedOn = true;
          this.advrow2.style.display = 'block';
          this.advicon2.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.advrow2.turnedOn = false;
          this.advrow2.style.display = 'none';
          this.advicon2.className = 'fa icon-caret-down fa-1';
        }
      }));

      this.advrow3.turnedOn = (this.advrow3.style.display != 'none');
      on(this.advanced3, 'click', lang.hitch(this, function () {
        this.advrow3.turnedOn = (this.advrow3.style.display != 'none');
        if (!this.advrow3.turnedOn) {
          this.advrow3.turnedOn = true;
          this.advrow3.style.display = 'block';
          this.advicon3.className = 'fa icon-caret-left fa-1';
        }
        else {
          this.advrow3.turnedOn = false;
          this.advrow3.style.display = 'none';
          this.advicon3.className = 'fa icon-caret-down fa-1';
        }
      }));

      // Setup input type change handlers for radio buttons
      on(this.inputTypeContigs, 'change', lang.hitch(this, this.onInputTypeChange));
      on(this.inputTypeReads, 'change', lang.hitch(this, this.onInputTypeChange));

      this.pairToAttachPt1.concat(this.singleToAttachPt).forEach(lang.hitch(this, function (attachname) {
        this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function (value, constraints) {
          return (new RegExp('^(?:' + this._computeRegexp(constraints) + ')' + (this.required ? '' : '?') + '$')).test(value) &&
            (!this._isEmpty(value)) &&
            (this._isEmpty(value) || this.parse(value, constraints) !== undefined);
        });
      }));

      this.interleaved.turnedOn = (this.interleaved.value == 'true');
      on(this.interleaved, 'change', lang.hitch(this, function () {
        if (this.interleaved.turnedOn) {
          this.interleaved.turnedOn = false;
          this.read2.set('disabled', false);
        }
        else {
          this.interleaved.turnedOn = true;
          this.read2.set('disabled', true);
        }
      }));

      // Set initial visibility based on default selection
      this.contigs_input_section.style.display = 'block';
      this.reads_input_section.style.display = 'none';
      this.selected_libraries_cell.style.display = 'none';
      this.assembly_parameters.style.display = 'none';

      // Set initial required state and constraints (contigs mode by default)
      this.input_file.set('required', true);
      this.numlibs.set('required', false);
      this.numlibs.set('constraints', {min:0,max:1000});

      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }

      // Check parameter validation after startup
      this.checkParameterRequiredFields();

      // Add click handler to submit button for debugging
      if (this.submitButton) {
        on(this.submitButton, 'click', lang.hitch(this, function() {
          // Check each form field for validation errors
          var formFields = this.getChildren();
          formFields.forEach(function(field) {
            if (field.validate && typeof field.validate === 'function') {
              var isValid = field.validate();
              if (!isValid) {
                console.log('Invalid field:', field.name || field.id || field.declaredClass, field.get('state'));
              }
            }
          });
        }));
      }
    },

    onInputTypeChange: function () {
      var inputType = 'contigs'; // default
      if (this.inputTypeReads.get('checked')) {
        inputType = 'reads';
      }

      if (inputType === 'contigs') {
        this.contigs_input_section.style.display = 'block';
        this.reads_input_section.style.display = 'none';
        this.selected_libraries_cell.style.display = 'none';
        this.assembly_parameters.style.display = 'none';


        // In contigs mode: input_file required, numlibs not required
        this.input_file.set('required', true);
        this.numlibs.set('required', false);
        this.numlibs.set('constraints', {min:0,max:1000});

        // Force validation of input_file field when switching to contigs mode
        if (this.input_file && this.input_file.validate) {
          this.input_file.validate();
        }
      } else if (inputType === 'reads') {
        this.contigs_input_section.style.display = 'none';
        this.reads_input_section.style.display = 'block';
        this.selected_libraries_cell.style.display = 'table-cell';
        this.assembly_parameters.style.display = 'block';
        // In reads mode: input_file not required, numlibs required
        this.input_file.set('required', false);
        this.numlibs.set('required', true);
        this.numlibs.set('constraints', {min:1,max:1000});
      }

      // Use setTimeout to ensure validation completes before checking parameters
      var _self = this;
      setTimeout(function() {
        // Force validation of output fields as well
        if (_self.output_file && _self.output_file.validate) {
          _self.output_file.validate();
        }
        if (_self.output_path && _self.output_path.validate) {
          _self.output_path.validate();
        }
        _self.checkParameterRequiredFields();
      }, 100);
    },


    validate: function () {
      console.log('MobileElementDetection validate() called');

      // Check input type specific validation first
      var inputType = 'contigs'; // default
      if (this.inputTypeReads.get('checked')) {
        inputType = 'reads';
      }

      var hasRequiredInput = false;
      if (inputType === 'contigs') {
        // For contigs mode, input_file is required
        hasRequiredInput = this.input_file.get('value') && this.input_file.get('value').trim() !== '';
      } else if (inputType === 'reads') {
        // For reads mode, at least one library is required
        hasRequiredInput = this.libraryStore.data.length > 0;
      }

      // Only call parent validation if our custom validation passes
      if (!hasRequiredInput) {
        console.log('Custom validation failed - disabling submit button');
        if (this.submitButton) { this.submitButton.set('disabled', true); }
        return false;
      }

      var valid = this.inherited(arguments);

      if (valid && this.activeUploads.length == 0) {
        if (this.submitButton) { this.submitButton.set('disabled', false); }
        return valid;
      }

      if (this.submitButton) { this.submitButton.set('disabled', true); }
      return false;
    },


    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    getValues: function () {
      var mobile_element_values = {};
      var values = this.inherited(arguments);

      // Add input_type based on radio button selection
      var inputType = 'contigs'; // default
      if (this.inputTypeReads.get('checked')) {
        inputType = 'reads';
      }
      values.input_type = inputType;

      // Generic JSON parameters are added to mobile element values in this function
      mobile_element_values = this.checkBaseParameters(values, mobile_element_values);

      if (!this.form_flag) {
        // Only include input_file for contigs mode
        var paramsToProcess = ['output_path', 'output_file'];
        if (inputType === 'contigs') {
          paramsToProcess.push('input_file');
        } else if (inputType === 'reads') {
          paramsToProcess.push('recipe', 'genome_size');
        }
        this.ingestAttachPoints(paramsToProcess, mobile_element_values, true);
      }

      // Add specific parameters from JSON spec
      var assembly_params = ['racon_iter', 'pilon_iter', 'target_depth', 'min_contig_len', 'min_contig_cov', 'max_bases', 'filtering-preset', 'composition', 'debug'];

      // Process simple parameter mappings
      assembly_params.forEach(function(param) {
        if (Object.prototype.hasOwnProperty.call(values, param) && values[param]) {
          mobile_element_values[param] = values[param];
        }
      });

      // Process checkbox parameters (convert to boolean)
      var checkboxParams = ['trim', 'normalize', 'filtlong', 'cleanup', 'restart', 'verbose', 'lenient-taxonomy', 'full-ictv-lineage', 'force-auto'];
      checkboxParams.forEach(function(param) {
        if (Object.prototype.hasOwnProperty.call(values, param) && values[param]) {
          var targetKey = param;
          mobile_element_values[targetKey] = (values[param][0] === 'on');
        }
      });

      // Handle special case for genome_size
      if (Object.prototype.hasOwnProperty.call(values, 'genome_size') && values.genome_size) {
        var genome_size = parseInt(values.genome_size);
        var genome_size_units = values.genome_size_units;
        var genome_size_value = (genome_size_units == 'M') ? 1000000 : 1000;
        mobile_element_values.genome_size = genome_size_value * genome_size;
      }

      // Delete assembly parameters when in contigs mode
      if (inputType === 'contigs') {
        var assembly_inputs = ['recipe', 'genome_size', 'trim', 'normalize', 'filtlong', 'target_depth', 'racon_iter', 'pilon_iter', 'min_contig_len', 'min_contig_cov', 'max_bases', 'genome_size', 'filtering_preset', 'cleanup', 'restart', 'verbose', 'lenient-taxonomy', 'full-ictv-lineage', 'composition', 'force-auto', 'debug', 'srr_ids', 'paired_end_libs', 'single_end_libs'];
        assembly_inputs.forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(mobile_element_values, key)) {
            delete mobile_element_values[key];
          }
        });
      }

      return mobile_element_values;
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      var duplicate = false;
      if (target._type) {
        target._id = this.makeLibraryID(target._type);
        duplicate = target._id in this.libraryStore.index;
      }

      // Check if we should validate input_file based on input type
      var inputType = 'contigs'; // default
      if (this.inputTypeReads && this.inputTypeReads.get('checked')) {
        inputType = 'reads';
      }

      input_pts.forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var browser_select = 0;
        var alias = attachname;
        var isRequired = req;

        // For input_file, only require it in contigs mode
        if (attachname == 'input_file' && inputType === 'reads') {
          isRequired = false;
        }

        if (attachname == 'read1' || attachname == 'read2' || attachname == 'single_end_libsWidget') {
          cur_value = this[attachname].searchBox.value;
          browser_select = 1;
        }
        else if (attachname == 'output_path' || attachname == 'input_file') {
          cur_value = this[attachname].searchBox.value;
          browser_select = 1;
        }
        else {
          cur_value = this[attachname].value;
        }
        // Assign cur_value to target
        if (attachname == 'platform') {
          alias = 'platform';
        }
        if (attachname == 'single_end_libsWidget') {
          alias = 'read';
        }
        if (typeof (cur_value) === 'string') {
          target[alias] = cur_value.trim();
        }
        else {
          target[alias] = cur_value;
        }
        if (isRequired && (duplicate || !target[alias] || incomplete)) {
          if (browser_select) {
            this[attachname].searchBox.validate();
            this[attachname].searchBox._set('state', 'Error');
            this[attachname].focus = true;
          }
          success = 0;
        }
        else {
          this[attachname]._set('state', '');
        }
        if (target[alias] != '') {
          target[alias] = target[alias] || undefined;
        }
        else if (target[alias] == 'true') {
          target[alias] = true;
        }
        else if (target[alias] == 'false') {
          target[alias] = false;
        }
      }, this);
      return (success);
    },

    makeLibraryName: function (mode) {
      switch (mode) {
        case 'paired':
          var fn = this.read1.searchBox.get('displayedValue');
          var fn2 = this.read2.searchBox.get('displayedValue');
          var maxName = 14;
          if (fn.length > maxName) {
            fn = fn.substr(0, (maxName / 2) - 2) + '...' + fn.substr((fn.length - (maxName / 2)) + 2);
          }
          if (fn2.length > maxName) {
            fn2 = fn2.substr(0, (maxName / 2) - 2) + '...' + fn2.substr((fn2.length - (maxName / 2)) + 2);
          }
          return 'P(' + fn + ', ' + fn2 + ')';
        case 'single':
          var fn = this.single_end_libsWidget.searchBox.get('displayedValue');
          maxName = 24;
          if (fn.length > maxName) {
            fn = fn.substr(0, (maxName / 2) - 2) + '...' + fn.substr((fn.length - (maxName / 2)) + 2);
          }
          return 'S(' + fn + ')';
        case 'srr_accession':
          var name = this.srr_accession.get('value');
          return '' + name;
        default:
          return '';
      }
    },

    makeLibraryID: function (mode) {
      switch (mode) {
        case 'paired':
          var fn = this.read1.searchBox.get('value');
          var fn2 = this.read2.searchBox.get('value');
          return fn + fn2;
        case 'single':
          var fn = this.single_end_libsWidget.searchBox.get('value');
          return fn;
        case 'srr_accession':
          var name = this.srr_accession.get('value');
          return name;
        default:
          return false;
      }
    },

    onReset: function (evt) {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');
      var toDestroy = [];
      this.libraryStore.data.forEach(lang.hitch(this, function (lrec) {
        toDestroy.push(lrec._id);
      }));
      toDestroy.forEach(lang.hitch(this, function (id) {
        this.destroyLibRow(id, '_id');
      }));
    },

    increaseRows: function (targetTable, counter, counterWidget) {
      counter.counter += 1;
      if (typeof counterWidget !== 'undefined') {
        counterWidget.set('value', Number(counter.counter));
      }
    },

    decreaseRows: function (targetTable, counter, counterWidget) {
      counter.counter -= 1;
      if (typeof counterWidget !== 'undefined') {
        counterWidget.set('value', Number(counter.counter));
      }
    },

    onAddSingle: function () {
      var lrec = { _type: 'single' };
      var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
      this.ingestAttachPoints(this.advSingleToAttachPt, lrec, false);
      if (chkPassed) {
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read: { label: 'Read File', value: 1 }
        };
        this.addLibraryRow(lrec, infoLabels, 'singledata');
      }
    },

    destroyLibRow: function (query_id, id_type) {
      var query_obj = {};
      query_obj[id_type] = query_id;
      var toRemove = this.libraryStore.query(query_obj);
      toRemove.forEach(function (obj) {
        domConstruct.destroy(obj._row);
        this.decreaseRows(this.libsTable, this.addedLibs, this.numlibs);
        if (this.addedLibs.counter < this.startingRows) {
          var ntr = this.libsTable.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        obj._handle.remove();
        this.libraryStore.remove(obj._id);
      }, this);
    },

    onAddPair: function () {
      if (this.read1.searchBox.get('value') == this.read2.searchBox.get('value')) {
        var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }
      var lrec = { _type: 'paired' };
      var pairToIngest = this.interleaved.turnedOn ? this.pairToAttachPt2 : this.pairToAttachPt1;
      var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
      this.ingestAttachPoints(this.advPairToAttachPt, lrec, false);
      if (chkPassed) {
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read1: { label: 'Read1', value: 1 },
          read2: { label: 'Read2', value: 1 },
          interleaved: { label: 'Interleaved', value: 0 },
          read_orientation_outward: { label: 'Mate Paired', value: 0 }
        };
        this.addLibraryRow(lrec, infoLabels, 'pairdata');
      }
    },


    addLibraryRow: function (lrec, infoLabels, mode) {
      var tr = this.libsTable.insertRow(0);
      lrec._row = tr;
      var td = domConstruct.create('td', { 'class': 'textcol ' + mode, libID: this.libCreated, innerHTML: '' }, tr);
      var advInfo = [];
      switch (mode) {
        case 'pairdata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('paired') + '</div>';
          advInfo.push('Paired Library');
          break;
        case 'singledata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('single') + '</div>';
          advInfo.push('Single Library');
          break;
        case 'srrdata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('srr_accession') + '</div>';
          advInfo.push('SRA run accession');
          break;
        default:
          console.error('wrong data type', lrec, infoLabels, mode);
          break;
      }

      Object.keys(infoLabels).forEach(lang.hitch(this, function (key) {
        if (lrec[key] && lrec[key] != 'false') {
          if (infoLabels[key].value) {
            advInfo.push(infoLabels[key].label + ':' + lrec[key]);
          }
          else {
            advInfo.push(infoLabels[key].label);
          }
        }
      }));

      if (advInfo.length) {
        var tdinfo = domConstruct.create('td', { innerHTML: "<i class='fa icon-info fa-1' />" }, tr);
        var ihandle = new TooltipDialog({
          content: advInfo.join('</br>'),
          onMouseLeave: function () {
            popup.close(ihandle);
          }
        });
        on(tdinfo, 'mouseover', function () {
          popup.open({
            popup: ihandle,
            around: tdinfo
          });
        });
        on(tdinfo, 'mouseout', function () {
          popup.close(ihandle);
        });
      }
      else {
        var tdinfo = domConstruct.create('td', { innerHTML: '' }, tr);
      }
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
      if (this.addedLibs.counter < this.startingRows) {
        this.libsTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        this.destroyLibRow(lrec._id, '_id');
      }));
      this.libraryStore.put(lrec);
      lrec._handle = handle;
      this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
      this.checkParameterRequiredFields();
    },

    checkParameterRequiredFields: function () {
      var inputType = 'contigs'; // default
      if (this.inputTypeReads.get('checked')) {
        inputType = 'reads';
      }
      var hasRequiredInput = false;

      if (inputType === 'contigs') {
        hasRequiredInput = this.input_file.get('value') && this.input_file.get('value').trim() !== '';
      } else if (inputType === 'reads') {
        hasRequiredInput = this.libraryStore.data.length > 0;
      }

      var outputPathValue = this.output_path.get('value');
      var outputFileValue = this.output_file.get('value');

      // console.log('Validation check:');
      // console.log('- inputType:', inputType);
      // console.log('- hasRequiredInput:', hasRequiredInput);
      // console.log('- outputPathValue:', outputPathValue);
      // console.log('- outputFileValue:', outputFileValue);
      // console.log('- submitButton exists:', !!this.submitButton);

      if (hasRequiredInput && outputPathValue && outputFileValue) {
        console.log('All validation passed, enabling submit button');
        if (this.submitButton) { this.submitButton.set('disabled', false); }
      }
      else {
        console.log('Validation failed, disabling submit button');
        if (this.submitButton) { this.submitButton.set('disabled', true); }
      }
    },

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkOutputName: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    onRecipeChange: function () {
      var recipeValue = this.recipe.value;
      var showGenomeSize = (recipeValue == 'canu' || recipeValue == 'flye');

      if (showGenomeSize) {
        this.genome_size_block.style.display = 'block';
      } else {
        this.genome_size_block.style.display = 'none';
      }

      this.checkParameterRequiredFields();
    },

    onGenomeSizeUnitsChange: function () {
      if (this.genome_size_units.value == 'M') {
        this.genome_size.set('constraints', { min: 1, max: 10, places: 0, smallDelta: 1 });
        this.genome_size.set('value', 5);
        this.genome_size.set('smallDelta', 1);
      }
      else {
        this.genome_size.set('constraints', { min: 100, max: 10000, places: 0 });
        this.genome_size.set('value', 500);
        this.genome_size.set('smallDelta', 100);
      }
    },

    checkBaseParameters: function (values, mobile_element_values) {
      var pairedList = this.libraryStore.query({ _type: 'paired' });
      var singleList = this.libraryStore.query({ _type: 'single' });
      var srrAccessionList = this.libraryStore.query({ _type: 'srr_accession' });

      // Input type
      mobile_element_values.input_type = values.input_type;

      // Input file for contigs
      if (values.input_type === 'contigs' && values.input_file) {
        mobile_element_values.input_file = values.input_file;
      }

      // Paired end libraries
      this.paired_end_libs = pairedList.map(function (lrec) {
        var rrec = {};
        Object.keys(lrec).forEach(lang.hitch(this, function (attr) {
          if (!attr.startsWith('_')) {
            rrec[attr] = lrec[attr];
          }
        }));
        rrec['read_orientation_outward'] = (rrec['read_orientation_outward'] === 'true');
        rrec['interleaved'] = (rrec['interleaved'] === 'true');
        return rrec;
      });
      if (this.paired_end_libs.length) {
        mobile_element_values.paired_end_libs = this.paired_end_libs;
      }

      // Single end libraries
      this.single_end_libs = singleList.map(function (lrec) {
        var rrec = {};
        Object.keys(lrec).forEach(lang.hitch(this, function (attr) {
          if (!attr.startsWith('_')) {
            rrec[attr] = lrec[attr];
          }
        }));
        return rrec;
      });
      if (this.single_end_libs.length) {
        mobile_element_values.single_end_libs = this.single_end_libs;
      }

      // SRA libraries
      this.sra_libs = srrAccessionList.map(function (lrec) {
        return lrec._id;
      });
      if (this.sra_libs.length) {
        mobile_element_values.srr_ids = this.sra_libs;
      }

      // Recipe
      this.strategy = values.recipe;
      mobile_element_values.recipe = values.recipe;

      // Output path and file
      mobile_element_values.output_path = values.output_path;
      this.output_folder = values.output_path;
      mobile_element_values.output_file = values.output_file;
      this.output_name = values.output_file;

      return mobile_element_values;
    },

    setRecipe: function (recipe) {
      this.recipe.set('value', recipe);
    },

    intakeRerunForm: function () {
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        rerun_key = rerun_fields[1];
        var sessionStorage = window.sessionStorage;
        if (sessionStorage.hasOwnProperty(rerun_key)) {
          try {
            var param_dict = { 'output_folder': 'output_path' };
            var widget_map = { 'single_end_libs': 'single_end_libsWidget' };
            param_dict['widget_map'] = widget_map;
            var service_spec = {
              'trim': 'trim', 'min_contig_len': 'min_contig_len', 'racon_iter': 'racon_iter',
              'pilon_iter': 'pilon_iter', 'min_contig_cov': 'min_contig_cov', 'target_depth': 'target_depth',
              'max_bases': 'max_bases', 'filtering_preset': 'filtering_preset', 'cleanup': 'cleanup',
              'restart': 'restart', 'verbose': 'verbose', 'lenient-taxonomy': 'lenient-taxonomy',
              'full-ictv-lineage': 'full-ictv-lineage', 'composition': 'composition',
              'force-auto': 'force-auto', 'debug': 'debug'
            };
            param_dict['service_specific'] = service_spec;
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            job_data = this.formatRerunJson(job_data);
            this.setRecipe(job_data['recipe']);
            AppBase.prototype.loadLibrary.call(this, job_data, param_dict);
            this.form_flag = true;
          }
          catch (error) {
            console.log('Error during intakeRerunForm: ', error);
          }
          finally {
            sessionStorage.removeItem(rerun_key);
          }
        }
      }
    },

    formatRerunJson: function (job_data) {
      if (!job_data.paired_end_libs) {
        job_data.paired_end_libs = [];
      }
      if (!job_data.single_end_libs) {
        job_data.single_end_libs = [];
      }
      if (!job_data.srr_ids) {
        job_data.srr_ids = [];
      }
      return job_data;
    }
  });
});
