define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/topic',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/ComprehensiveSARS2Analysis.html', 'dojo/store/Memory', 'dojox/xml/parser',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  './AppBase', '../../WorkspaceManager'
], function (
  declare, lang, Topic,
  on, xhr, domClass, domConstruct,
  Template, Memory, xmlParser,
  popup, TooltipDialog, Dialog,
  AppBase, WorkspaceManager
) {

  return declare([AppBase], {
    baseClass: 'App ComprehensiveSARS2Analysis',
    pageTitle: 'SARS-CoV-2 Genome Assembly and Annotation Service | BV-BRC',
    templateString: Template,
    applicationName: 'ComprehensiveSARS2Analysis',
    requireAuth: true,
    applicationLabel: 'SARS-CoV-2 Genome Analysis',

    isBVBRC: true,  // override patric configuration and tell AppBase to use bvbrcHelpURL and bvbrcTutorialURL
    bvbrcHelpURL: '/docs/user-guides/sars-cov-2',
    bvbrcTutorialURL: '/patric/pdf/sars-cov-2-tutorial.pdf',

    applicationDescription: 'The SARS-CoV-2 Genome Analysis Service provides a streamlined "meta-service" that accepts raw reads and performs genome assembly, annotation, and variation analysis.  ',
    applicationHelp: 'quick_references/services/sars_cov_2_assembly_annotation_service.html',
    tutorialLink: 'tutorial/sars_cov_2_assembly_annotation/sars_cov_2_assembly_annotation.html',
    videoLink: '',
    libraryData: null,
    defaultPath: '',
    startingRows: 9,
    libCreated: 0,
    // 'https://www.ebi.ac.uk/ena/data/view/{0}&display=xml',
    srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmax=1&db=sra&field=accn&term={0}&retmode=json',
    srrValidationUrl2: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?retmax=10&db=sra&id={0}', // the data we need is in xml string no matter what. might as well get it properly nested
    // below are from annotation
    required: true,
    genera_four: ['Acholeplasma', 'Entomoplasma', 'Hepatoplasma', 'Hodgkinia', 'Mesoplasma', 'Mycoplasma', 'Spiroplasma', 'Ureaplasma'],
    code_four: false,

    constructor: function () {
      this.addedLibs = { counter: 0 };
      this.pairToAttachPt = ['read1', 'read2'];
      this.singleToAttachPt = ['single_end_libsWidget'];
      this.libraryStore = new Memory({ data: [], idProperty: '_id' });

      this.advPairToAttachPt = ['paired_platform'];
      this.advSingleToAttachPt = ['single_platform'];

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
      this.numlibs.startup();

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
      if (this.startWithRead.checked) { // start from read file
        var pairedList = this.libraryStore.query({ _type: 'paired' });
        var singleList = this.libraryStore.query({ _type: 'single' });
        var srrAccessionList = this.libraryStore.query({ _type: 'srr_accession' });
        var pairedLibs = [];
        var singleLibs = [];
        var srrAccessions = [];

        pairedLibs = pairedList.map(function (lrec) {
          var rrec = {};
          Object.keys(lrec).forEach(lang.hitch(this, function (attr) {
            if (!attr.startsWith('_')) {
              rrec[attr] = lrec[attr];
            }
          }));
          return rrec;
        });
        if (pairedLibs.length) {
          values.paired_end_libs = pairedLibs;
        }

        singleLibs = singleList.map(function (lrec) {
          var rrec = {};
          Object.keys(lrec).forEach(lang.hitch(this, function (attr) {
            if (!attr.startsWith('_')) {
              rrec[attr] = lrec[attr];
            }
          }));
          return rrec;
        });
        if (singleLibs.length) {
          values.single_end_libs = singleLibs;
        }

        srrAccessions = srrAccessionList.map(function (lrec) {
          return lrec._id;
        });
        if (srrAccessions.length) {
          values.srr_ids = srrAccessions;
        }
        delete values.contigs;       // contigs file is not needed
        values.input_type = 'reads'; // set input_type to be 'reads'

      } // startWithRead

      values.scientific_name = this.output_nameWidget.get('displayedValue');
      values.taxonomy_id = this.tax_idWidget.get('displayedValue');
      if (this.startWithContigs.checked) {  // starting from contigs
        values.input_type = 'contigs'; // set input_type to be 'contigs'
        var assembly_inputs = ['recipe', 'primers', 'primer_version', 'genome_size', 'trim', 'racon_iter', 'pilon_iter', 'min_contig_len', 'min_contig_cov'];
        assembly_inputs.forEach(function (key) {
          if (Object.prototype.hasOwnProperty.call(values, key)) {
            delete values[key];
          }
        });
      }

      // don't index genomes for now
      values.skip_indexing = true;

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
        if (attachname == 'paired_platform' || attachname == 'single_platform') {
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

    // counter is a widget for requirements checking
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
      if (!this.single_platform.get('value')) {
        var msg = 'Please select a <i>platform</i> for this reads file.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }

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

    onAddSRR: function () {
      var accession = this.srr_accession.get('value');
      if ( !accession.match(/^[a-z0-9]+$/i)) {
        this.srr_accession_validation_message.innerHTML = ' Your input is not valid.<br>Hint: only one SRR at a time.';
      }
      else {
        // SRR5121082
        this.srr_accession.set('disabled', true);
        this.srr_accession_validation_message.innerHTML = ' Validating ' + accession + ' ...';
        xhr.get(lang.replace(this.srrValidationUrl, [accession]), { headers: { 'X-Requested-With': null } })
          .then(lang.hitch(this, function (json_resp) {
            var resp = JSON.parse(json_resp);
            try {
              var chkPassed = resp['esearchresult']['count'] > 0;
              var uid = resp['esearchresult']['idlist']['0'];
              var title = '';
              if (chkPassed) {
                xhr.get(lang.replace(this.srrValidationUrl2, [uid]), { headers: { 'X-Requested-With': null } })
                  .then(lang.hitch(this, function (xml_resp) {
                    try {
                      var xresp = xmlParser.parse(xml_resp).documentElement;
                      title = '';
                      title = xresp.children[0].childNodes[3].children[1].childNodes[0].innerHTML;
                    }
                    catch (e) {
                      console.error('could not get title from SRA record');
                    }
                    var lrec = { _type: 'srr_accession', title: title };
                    var chkPassed = this.ingestAttachPoints(['srr_accession'], lrec);
                    if (chkPassed) {
                      var infoLabels = {
                        title: { label: 'Title', value: 1 }
                      };
                      this.addLibraryRow(lrec, infoLabels, 'srrdata');
                    }
                    this.srr_accession_validation_message.innerHTML = '';
                    this.srr_accession.set('disabled', false);
                  }));
              }
              else {
                throw new Error('No ids returned from esearch');
              }
            } catch (e) {
              console.error(e);
              this.srr_accession.set('disabled', false);
              this.srr_accession_validation_message.innerHTML = ' Your input ' + accession + ' is not valid';
              this.srr_accession.set('value', '');
            }
          }));
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

      if (!this.paired_platform.get('value')) {
        var msg = 'Please select a <i>platform</i> for these paired reads.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }

      var lrec = { _type: 'paired' };
      var pairToIngest = this.pairToAttachPt;
      var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
      this.ingestAttachPoints(this.advPairToAttachPt, lrec, false);
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
            advInfo.push(infoLabels[key].label + ': ' + lrec[key]);
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

    // below is from annotation
    /* todo: remove
    changeCode: function (item) {
      this.code_four = false;
      item.lineage_names.forEach(lang.hitch(this, function (lname) {
        if (array.indexOf(this.genera_four, lname) >= 0) {
          this.code_four = true;
        }
      }));
      this.code_four ? this.genetic_code.set('value', '4') : this.genetic_code.set('value', '11');
    },
    */

    onTaxIDChange: function (val) {
      this._autoNameSet = true;
      var tax_id = this.tax_idWidget.get('item').taxon_id;
      // var tax_obj=this.tax_idWidget.get("item");
      if (tax_id) {
        var name_promise = this.scientific_nameWidget.store.get(tax_id);
        name_promise.then(lang.hitch(this, function (tax_obj) {
          if (tax_obj) {
            this.scientific_nameWidget.set('item', tax_obj);
            this.scientific_nameWidget.validate();
            // this.changeCode(this.tax_idWidget.get('item'));
          }
        }));
      }
      this._autoTaxSet = false;
    },

    updateOutputName: function () {
      var charError = document.getElementsByClassName('charError')[0];
      charError.innerHTML = '&nbsp;';
      var current_output_name = [];
      var sci_item = this.scientific_nameWidget.get('item');
      var label_value = this.myLabelWidget.get('value');
      if (label_value.indexOf('/') !== -1 || label_value.indexOf('\\') !== -1) {
        return charError.innerHTML = 'slashes are not allowed';
      }
      if (sci_item && sci_item.lineage_names.length > 0) {
        current_output_name.push(sci_item.lineage_names.slice(-1)[0].replace(/\(|\)|\||\/|:/g, ''));
      }
      if (label_value.length > 0) {
        current_output_name.push(label_value);
      }
      if (current_output_name.length > 0) {
        this.output_nameWidget.set('value', current_output_name.join(' '));
      }
      this.checkParameterRequiredFields();
    },

    onSuggestNameChange: function (val) {
      this._autoTaxSet = true;
      var tax_id = this.scientific_nameWidget.get('value');
      if (tax_id) {
        this.tax_idWidget.set('displayedValue', tax_id);
        this.tax_idWidget.set('value', tax_id);
        // this.changeCode(this.scientific_nameWidget.get('item'));
        this.updateOutputName();
      }
      this._autoNameSet = false;
    },

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkParameterRequiredFields: function () {
      if (this.scientific_nameWidget.get('item') && this.myLabelWidget.get('value')
         && this.output_path.get('value') && this.output_nameWidget.get('displayedValue') ) {
        this.validate();
      }
      else {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
      }
    },

    setContigsFile: function () {
      this.checkParameterRequiredFields();
    },

    onRecipeChange: function () {
      if (this.recipe.value == 'cdc-illumina') {
        this.primers.set('disabled', true);
        this.primer_version.set('disabled', true);

      }
      if (this.recipe.value == 'cdc-nanopore') {
        this.primers.set('disabled', true);
        this.primer_version.set('disabled', true);
      }
      if (this.recipe.value == 'artic-nanopore') {
        this.primers.set('disabled', true);
        this.primer_version.set('disabled', true);
      }
      // Disabling auto for now. Not sure if needed down the line.
      // if (this.recipe.value == 'auto') {
      //   this.primers.set('disabled', true);
      //   this.primer_version.set('disabled', true);
      // }
      if (this.recipe.value == 'onecodex') {
        this.primers.set('disabled', false);
        this.primer_version.set('disabled', false);
      }
    },

    onPrimersChange: function (value) {
      var articOptions = [
        { label: 'V5.3.2', value: 'V5.3.2' },
        { label: 'V4.1', value: 'V4.1' },
        { label: 'V4', value: 'V4' },
        { label: 'V3', value: 'V3' },
        { label: 'V2', value: 'V2' },
        { label: 'V1', value: 'V1' }
      ];
      var midnightOptions = [
        { label: 'V1', value: 'V1' }
      ];
      var qiagenOptions = [
        { label: 'V1', value: 'V1' }
      ];
      var swiftOptions = [
        { label: 'V1', value: 'V1' }
      ];
      var varskipOptions = [
        { label: 'V2', value: 'V2' },
        { label: 'V1a', value: 'V1a' }
      ];
      var varskipLongOptions = [
        { label: 'V1a', value: 'V1a' }
      ];

      if (value === 'midnight') {
        this.primer_version.set('options', midnightOptions);
        this.primer_version.set('value', 'V1');
      }
      else if (value === 'qiagen') {
        this.primer_version.set('options', qiagenOptions);
        this.primer_version.set('value', 'V1');
      }
      else if (value === 'swift') {
        this.primer_version.set('options', swiftOptions);
        this.primer_version.set('value', 'V1');
      }
      else if (value === 'varskip') {
        this.primer_version.set('options', varskipOptions);
        this.primer_version.set('value', 'V2');
      }
      else if (value === 'varskip-long') {
        this.primer_version.set('options', varskipLongOptions);
        this.primer_version.set('value', 'V1a');
      }
      else if (value === 'ARTIC') {
        this.primer_version.set('options', articOptions);
        this.primer_version.set('value', 'V5.3.2');
      }
      else {
        console.log('Invalid Selection');
      }
    },

    onStartWithChange: function () {
      if (this.startWithRead.checked == true) {
        this.readTable.style.display = 'block';
        this.assemblyStrategy.style.display = 'block';
        this.primersStrategy.style.display = 'block';
        // this.assembly_additional_parameters_block.style.display = 'block';
        this.annotationFileBox.style.display = 'none';
        this.numlibs.constraints.min = 1;
        this.contigsFile.reset();
        this.contigsFile.set('required', false);
        this.checkParameterRequiredFields();
      }
      if (this.startWithContigs.checked == true) {
        this.readTable.style.display = 'none';
        this.assemblyStrategy.style.display = 'none';
        this.primersStrategy.style.display = 'none';
        // this.genome_size_block.style.display = 'none';
        // this.assembly_additional_parameters_block.style.display = 'none';
        this.annotationFileBox.style.display = 'block';
        this.numlibs.constraints.min = 0;
        this.contigsFile.set('required', true);
        this.checkParameterRequiredFields();
      }
    },

    // TODO:
    // checkBaseParameters: function() {},

    intakeRerunForm: function () {
      // assuming only one key
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        rerun_key = rerun_fields[1];
        var sessionStorage = window.sessionStorage;
        if (sessionStorage.hasOwnProperty(rerun_key)) {
          try {
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            var param_dict = {
              'output_folder': 'output_path', 'strategy': 'recipe', 'target_genome_id': 'taxonomy_id', 'contigs': 'contigs'
            };
            var widget_map = { 'taxonomy_id': 'tax_idWidget', 'contigs': 'contigsFile' };
            param_dict['widget_map'] = widget_map;
            job_data = this.formatRerunJson(job_data);
            this.selectStartWith(job_data);
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            if (this.startWithRead.checked == true) {
              AppBase.prototype.loadLibrary.call(this, job_data, param_dict);
            } else {
              this.contigsFile.set('value', job_data['contigs']);
            }
            this.recipe.set('value', job_data['recipe']);
            this.form_flag = true;
          } catch (error) {
            console.log('Error during intakeRerunForm: ', error);
          } finally {
            sessionStorage.removeItem(rerun_key);
          }
        }
      }
    },

    // Selects the start with button: reads or contigs
    // Checking it helps the rest of the form filling run smoothly
    selectStartWith: function (job_data) {
      if (job_data.input_type == 'contigs') {
        this.startWithContigs.set('checked', true);
      }
      else {
        this.startWithRead.set('checked', true);
      }
    },

    formatRerunJson: function (job_data) {
      if (!job_data.paired_end_libs) {
        job_data.paired_end_libs = [];
      }
      if (!job_data.single_end_libs) {
        job_data.single_end_libs = [];
      }
      return job_data;
    }
  });
});
