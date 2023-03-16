define([
  'dojo/_base/declare', 'dojo/_base/array', 'dojo/topic', 'dijit/_WidgetBase', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/MetagenomicBinning.html', 'dojo/NodeList-traverse', 'dojo/store/Memory',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  './AppBase', '../../WorkspaceManager'
], function (
  declare, array, Topic, WidgetBase, lang, Deferred,
  on, xhr, domClass, domConstruct,
  Template, children, Memory,
  popup, TooltipDialog, Dialog,
  AppBase, WorkspaceManager
) {

  return declare([AppBase], {
    baseClass: 'App MetagenomicBinning',
    pageTitle: 'Metagenomic Binning Service | BV-BRC',
    templateString: Template,
    applicationName: 'MetagenomeBinning',
    requireAuth: true,
    applicationLabel: 'Metagenomic Binning',
    applicationDescription: 'The Metagenomic Binning Service accepts either reads or contigs, and attempts to "bin" the data into a set of genomes. This service can be used to reconstruct bacterial and archael genomes from environmental samples.',
    applicationHelp: 'quick_references/services/metagenomic_binning_service.html',
    tutorialLink: 'tutorial/metagenomic_binning/metagenomic_binning.html',
    videoLink: 'https://youtu.be/Xt1ptDtG-UQ',
    libraryData: null,
    defaultPath: '',
    startingRows: 6,
    libCreated: 0,
    // below are from annotation
    required: true,
    genera_four: ['Acholeplasma', 'Entomoplasma', 'Hepatoplasma', 'Hodgkinia', 'Mesoplasma', 'Mycoplasma', 'Spiroplasma', 'Ureaplasma'],
    code_four: false,

    constructor: function () {
      this.addedLibs = { counter: 0 };
      this.pairToAttachPt = ['read1', 'read2'];
      this.singleToAttachPt = ['single_end_libsWidget'];
      this.libraryStore = new Memory({ data: [], idProperty: '_id' });
      this._autoTaxSet = false;
      this._autoNameSet = false;
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
        var tr = this.libsTable.insertRow(0);// domConstr.create("tr",{},this.libsTableBody);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }

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

      this.pairToAttachPt.concat(this.singleToAttachPt).forEach(lang.hitch(this, function (attachname) {
        this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function (/* anything */ value, /* __Constraints */ constraints) {
          return (new RegExp('^(?:' + this._computeRegexp(constraints) + ')' + (this.required ? '' : '?') + '$')).test(value) &&
            (!this._isEmpty(value)) &&
            (this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
        });
      }));
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

    getValues: function () {
      var values = this.inherited(arguments);
      // inputs that are NOT needed by the backend
      var not_needed_inputs = ['startWith', 'libdat_file1pair', 'libdat_file2pair', 'libdat_readfile'];
      not_needed_inputs.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          delete values[key];
        }
      });
      values = this.checkBaseParameters(values);

      if (values.organism == 'bacteria') {
        values.perform_bacterial_annotation = true;
      }
      else if (values.organism == 'viral') {
        values.perform_bacterial_binning = false;
        values.perform_viral_annotation = true;
        values.perform_viral_binning = true;
      }
      else if (values.organism == 'both') {
        values.perform_bacterial_annotation = true;
        values.perform_viral_annotation = true;
      }

      if (this.disable_dangling.checked)
      {
	  values.danglen = 0;
      }

      delete values['organism'];

      return values;
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      var duplicate = false;
      if (target._type) {
        target._id = this.makeLibraryID(target._type);
        duplicate = target._id in this.libraryStore.index;
      }
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var browser_select = 0;
        var alias = attachname;
        if (attachname == 'read1' || attachname == 'read2' || attachname == 'single_end_libsWidget') {
          cur_value = this[attachname].searchBox.value;
          browser_select = 1;
        }
        else if (attachname == 'output_path') {
          cur_value = this[attachname].searchBox.value;
          browser_select = 1;
        }
        else {
          cur_value = this[attachname].value;
        }

        // Assign cur_value to target
        if (attachname == 'single_end_libsWidget') {
          alias = 'read';
        }
        if (typeof (cur_value) === 'string') {
          target[alias] = cur_value.trim();
        }
        else {
          target[alias] = cur_value;
        }
        if (req && (duplicate || !target[alias] || incomplete)) {
          if (browser_select) {
            this[attachname].searchBox.validate(); // this should be whats done but it doesn't actually call the new validator
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
      // because its removing rows cells from array needs separate loop
      toDestroy.forEach(lang.hitch(this, function (id) {
        this.destroyLibRow(id, '_id');
      }));
    },

    // When the set of items in the list of libraries change, update the
    // enabled settings on the assembler choice buttons.
    updateAssemblerChoice: function() {
      if (this.libraryStore.data.length == 1 && this.libraryStore.data[0]._type == 'paired') {
        this.metaspades.set('disabled', false);
        this.auto.set('checked', true);
      }
      else if (this.libraryStore.data.length == 1 && this.libraryStore.data[0]._type == 'single') {
        this.metaspades.set('disabled', true);
        this.auto.set('checked', true);
      }
      else if (this.libraryStore.data.length == 1 && this.libraryStore.data[0]._type == 'srr_accession') {
        this.metaspades.set('disabled', true);
        this.auto.set('checked', true);
      }
      else {
        this.metaspades.set('disabled', true);
        this.auto.set('checked', true);
      }
    },



    onAddSingle: function () {
      // console.log("Create New Row", domConstruct);
      var lrec = { _type: 'single' };
      var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
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
        obj._handle.remove();
        this.libraryStore.remove(obj._id);

      }, this);
      while (this.libsTableBody.childElementCount < this.startingRows) {
        var ntr = this.libsTable.insertRow(-1);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
      }
      this.checkParameterRequiredFields();
    },

    onAddPair: function () {
      if (this.read1.searchBox.get('value') == this.read2.searchBox.get('value')) {
        var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }
      var lrec = { _type: 'paired' };
      var pairToIngest = this.pairToAttachPt;
      var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
      if (chkPassed) {
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read1: { label: 'Read1', value: 1 },
          read2: { label: 'Read2', value: 1 }
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
      // fill out the html of the info mouse over
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
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        this.destroyLibRow(lrec._id, '_id');
      }));
      this.libraryStore.put(lrec);
      // If we have added a row, and our length is still less than our target of
      // this.startingRows in the widget, delete the last row.
      if (this.libraryStore.data.length  <= this.startingRows) {
        this.libsTable.deleteRow(-1);
      }
      lrec._handle = handle;
      this.checkParameterRequiredFields();
    },

    // below is from annotation
    changeCode: function (item) {
      this.code_four = false;
      item.lineage_names.forEach(lang.hitch(this, function (lname) {
        if (array.indexOf(this.genera_four, lname) >= 0) {
          this.code_four = true;
        }
      }));
      this.code_four ? this.genetic_code.set('value', '4') : this.genetic_code.set('value', '11');
    },

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkParameterRequiredFields: function () {
      var valid = false;
      if ( this.output_path.get('value') && this.output_file.get('displayedValue') ) {
        valid = this.validate();
      }
      if (this.submitButton) {
        this.submitButton.set('disabled', ! valid);
      }
      this.updateAssemblerChoice();
    },

    validate: function() {
      var valid = this.inherited(arguments);
      if (!valid) {
        return valid;
      }
      if (this.startWithRead.checked) {
        return this.libraryStore.data.length > 0;
      } else {
        return this.output_path.get('value') != '';
      }
    },

    setContigsFile: function () {
      this.checkParameterRequiredFields();
    },

    onStartWithChange: function () {
      if (this.startWithRead.checked == true) {
        this.readTable.style.display = 'block';
        this.annotationFileBox.style.display = 'none';
        this.contigsFile.reset();
        this.contigsFile.set('required', false);
        this.checkParameterRequiredFields();
        this.assemblyStategy.style.display = 'block';
        this.auto.set('disabled', false);
        this.megahit.set('disabled', false);
      }
      if (this.startWithContigs.checked == true) {
        this.readTable.style.display = 'none';
        this.annotationFileBox.style.display = 'block';
        this.contigsFile.set('required', true);
        this.checkParameterRequiredFields();
        this.assemblyStategy.style.display = 'none';
        this.auto.set('checked', true);
        this.auto.set('disabled', true);
        this.megahit.set('disabled', true);
        this.metaspades.set('disabled', true);
      }
    },

    checkBaseParameters: function (values) {
      // reads, sra, or contigs
      if (this.startWithRead.checked) { // start from read file
        var pairedList = this.libraryStore.query({ _type: 'paired' });
        var singleList = this.libraryStore.query({ _type: 'single' });
        var srrAccessionList = this.libraryStore.query({ _type: 'srr_accession' });

        this.paired_end_libs = pairedList.map(function (lrec) {
          var rrec = {};
          Object.keys(lrec).forEach(lang.hitch(this, function (attr) {
            if (!attr.startsWith('_')) {
              rrec[attr] = lrec[attr];
            }
          }));
          return rrec;
        });
        if (this.paired_end_libs.length) {
          values.paired_end_libs = this.paired_end_libs;
        }

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
          values.single_end_libs = this.single_end_libs;
        }

        this.sra_libs = srrAccessionList.map(function (lrec) {
          return lrec._id;
        });
        if (this.sra_libs.length) {
          values.srr_ids = this.sra_libs;
        }
        delete values.contigs;       // contigs file is not needed
        // values.input_type = 'reads'; // set input_type to be 'reads'

      } // startWithRead
      if (this.startWithContigs.checked) {
        this.contigs = values.contigs;
      }
      // strategy (assembly)
      if (values.assembler) {
        this.strategy = values.assembler;
      }
      // output_folder
      this.output_folder = values.output_path;
      // output_name
      this.output_name = values.output_file;
      // genome group
      this.genome_group = values.genome_group;

      return values;
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
            var param_dict = { 'output_folder': 'output_path', 'contigs': 'NONE' };
            // var widget_map = {"contigs":"contigsFile"};
            // param_dict["widget_map"] = widget_map;
            // AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            this.selectOrganismFormFill(job_data);
            this.selectStartWith(job_data);
            if (this.startWithRead.checked) {
              AppBase.prototype.loadLibrary.call(this, this.formatRerunJson(job_data), param_dict);
            }
            else {
              this.setContigsFileFormFill(job_data);
            }
            this.setStrategyFormFill(job_data);
            this.setAdvParams(job_data);
            // TODO set other parameters
            this.form_flag = true;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setStrategyFormFill: function (job_data) {
      var assembler = job_data['assembler'];
      if (assembler === 'metaspades') {
        this.metaspades.set('checked', true);
        this.megahit.set('checked', false);
        this.auto.set('checked', false);
      } else if (assembler === 'megahit') {
        this.metaspades.set('checked', false);
        this.megahit.set('checked', true);
        this.auto.set('checked', false);
      } else { // auto
        this.metaspades.set('checked', false);
        this.megahit.set('checked', false);
        this.auto.set('checked', true);
      }
    },

    setAdvParams: function (job_data) {
      if (Object.keys(job_data).includes('min_contig_len')) {
        this.min_contig_len.set('value', job_data['min_contig_len']);
      }
      if (Object.keys(job_data).includes('min_contig_cov')) {
        this.min_contig_cov.set('value', job_data['min_contig_cov']);
      }
      if (Object.keys(job_data).includes('genome_group')) {
        this.genome_group.set('value', job_data['genome_group']);
      }
    },

    setContigsFileFormFill: function (job_data) {
      this.contigsFile.set('value', job_data['contigs']);
      // this.contigsFile.set('displayedValue', job_data['contigs']);
      this.checkParameterRequiredFields();
    },

    selectOrganismFormFill: function (job_data) {
      var check_bacteria = job_data['perform_bacterial_annotation'] == true;
      var check_viruses = job_data['perform_viral_annotation'] == true;
      if (!check_bacteria && !check_viruses) {
        return;
      }
      if (check_bacteria && !check_viruses) {
        this.bacteria.set('checked', true);
      }
      else if (!check_bacteria && check_viruses) {
        this.viruses.set('checked', true);
      }
      else {
        this.bacteriaAndViruses.set('checked', true);
      }
    },

    // Selects the start with button: reads or contigs
    // Checking it helps the rest of the form filling run smoothly
    selectStartWith: function (job_data) {
      if (job_data.contigs) {
        this.startWithContigs.set('checked', true);
        this.startWithRead.set('checked', false);
      }
      else {
        this.startWithRead.set('checked', true);
        this.startWithContigs.set('checked', false);
      }
    },

    // Job object can apparently have paired end libs without read1 read2 identifiers
    formatRerunJson: function (job_data) {
      if (!job_data.paired_end_libs) {
        job_data.paired_end_libs = [];
      }
      if (!job_data.single_end_libs) {
        job_data.single_end_libs = [];
      }
      if (job_data.paired_end_libs.length == 2) {
        if (!job_data.paired_end_libs[0].hasOwnProperty('read1')) {
          var new_record = { 'read1': job_data.paired_end_libs[0], 'read2': job_data.paired_end_libs[1] };
          job_data.paired_end_libs = [];
          job_data.paired_end_libs.push(new_record);
        }
      }
      if (!job_data.single_end_libs) {
        job_data.single_end_libs = [];
      }
      return job_data;
    },

    checkOutputName: function () {
      this.checkParameterRequiredFields();
    }
  });
});
