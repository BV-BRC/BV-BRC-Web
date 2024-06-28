define([
  'dojo/_base/declare', 'dojo/_base/array', 'dojo/topic', 'dijit/_WidgetBase', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/SARS2Wastewater.html', 'dojo/NodeList-traverse', 'dojo/store/Memory',
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
    baseClass: 'App SARS2Wastewater Analysis',
    pageTitle: 'SARS-CoV-2 Wastewater | BV-BRC',
    templateString: Template,
    applicationName: 'SARS2Wastewater',
    requireAuth: true,
    applicationLabel: 'SARS-CoV-2 Wastewater Analysis',
    applicationDescription: 'The SARS-CoV-2 Wastewater Analysis assembles raw reads with the Sars One Codex pipeline and preforms vairant analysis with Freyja',
    applicationHelp: 'quick_references/services/sars_cov_2_wastewater_analysis_service.html',
    tutorialLink: 'tutorial/sars_cov_2_wastewater/sars_cov_2_wastewater.html',
    videoLink: '',
    appBaseURL: 'SARS2Wastewater',
    libraryData: null,
    defaultPath: '',
    startingRows: 14,
    libCreated: 0,
     // 'https://www.ebi.ac.uk/ena/data/view/{0}&display=xml',
     srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmax=1&db=sra&field=accn&term={0}&retmode=json',
     srrValidationUrl2: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?retmax=10&db=sra&id={0}', // the data we need is in xml string no matter what. might as well get it properly nested
    required: true,

    constructor: function () {
      this.addedLibs = { counter: 0 };
      this.pairToAttachPt = ['read1', 'read2'];
      this.singleToAttachPt = ['single_end_libsWidget'];
      this.libraryStore = new Memory({ data: [], idProperty: '_id', sample_id:[] });
      this.sample_level_date = "";

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
      var not_needed_inputs = ['libdat_file1pair', 'libdat_file2pair', 'libdat_readfile'];
      not_needed_inputs.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          delete values[key];
        }
      });
      values = this.checkBaseParameters(values);
      return values;
    },

    checkForInvalidChars: function (value) {
      var valid = true;
      var invalid_chars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=',':', '@', '"', "'", ';', '[', ']', '{', '}', '|', '`'];
      invalid_chars.forEach(lang.hitch(this, function (char) {
        if (value.includes(char)) {
          valid = false;
        }
      }));
      if (!valid) {
        var msg = 'Remove invalid characters from name: - : @ " \' ; [ ] { } | `';
        new Dialog({ title: 'Notice', content: msg }).show();
      }
      return valid;
    },

    replaceInvalidChars: function (value) {
      var invalid_chars = ['-', ':', '@', '"', "'", ';', '[', ']', '{', '}', '|', '`'];
      invalid_chars.forEach(lang.hitch(this, function (char) {
        value = value.replaceAll(char, '_');
      }));
      return value;
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

        // if (attachname == 'read1' || attachname == 'read2' || attachname == 'single_end_libsWidget') {
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

    setSrrId: function () {
      var srr_user_input = this.srr_accession.get('displayedValue');
      this.input_sample_id.set('value', this.replaceInvalidChars(srr_user_input.split('.')[0]));
    },

    // from SARS CGA
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
                      console.log(title)
                    }
                    catch (e) {
                      console.error('could not get title from SRA record');
                    }
                    var lrec = { _type: 'srr_accession'};

                    var chkPassed = this.ingestAttachPoints(['srr_accession'], lrec);
                    if (chkPassed) {
                      var infoLabels = {
                        title: { label: 'Title', value: 1 },
                        platform: { label: 'Platform', value: 1 },
                        sample_id: {label: 'Sample ID' , value: 1 },
                        primers: {label: 'Sample Primers', value: 1},
                        primer_version: {label: 'Primer Version', value: 1},
                        sample_level_date: {label: 'Date', value: 1}
                      };
                      lrec.title = title
                      // check if user changed the sample id
                      if (typeof this.input_sample_id._lastInputEventValue === 'undefined') {
                        // user did not change the sample id - use default
                        lrec.sample_id = this.input_sample_id.getValue()
                      } else {
                        // user changes sample id - update to user input
                        lrec.sample_id = this.input_sample_id._lastInputEventValue
                      }
                      // clear the sample id for nex input
                      // this.input_sample_id.reset()
                      lrec.primers = this.primers.value
                      lrec.primer_version = this.primer_version.value
                      if (this.sample_level_date) {
                      // if the string is not empty add to library
                      // sample level date is optional
                        lrec.sample_level_date = this.sample_level_date.value
                        this.sample_level_date.reset()
                    } 
                      this.addLibraryRow(lrec, infoLabels, 'srrdata');
                    }
                    this.srr_accession_validation_message.innerHTML = '';
                    this.srr_accession.set('disabled', false);
                    // // clear the SRR box
                    this.srr_accession.reset()
                    // console.log()
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

    customFunction: function() {
      console.log('This is a custom function');
    },

    onAddInputs: function () {
      var accession =  this.srr_accession.get('displayedValue');
      var single_read = this.single_end_libsWidget.searchBox.get('displayedValue');
      // using read 1 to use the error handling in onAddPaired function
      var paired_r1 = this.read1.searchBox.get('displayedValue');
      // step 1 if one of the fields are  not empty - hey add something
      if (!accession && !single_read && !paired_r1) {
        this.submit_selected_libs_validation_message.innerHTML = ' <br> All three fields are empty.<br>Hint: Fill in one input field.';
        // give an error for the user
      } 
      // step 2 if more than one field has something in it - tell the user to go hey only one at a time 
      else if ((accession && paired_r1) || (accession && single_read) || (paired_r1 && single_read)) {
        this.submit_selected_libs_validation_message.innerHTML = ' <br> You can only submit one sample at a time.<br>';
      }
      // step 3 which ever field has something in call the function
      // setting sample ID to ensure correct sample Id is given even if the fields change
      else if (accession) {
        this.setSrrId();
        this.onAddSRR();
      }
      else if (single_read) {
        this.setSingleId();
        this.onAddSingle();
      }
      else if (paired_r1) {
        this.setPairedId();
        this.onAddPair();
      }
      else {
        console.log('invalid input')
      }
    },

    setSingleId: function () {
      var read_name = this.single_end_libsWidget.searchBox.get('displayedValue');
      this.input_sample_id.set('value', this.replaceInvalidChars(read_name.split('.')[0]));
    },

    onAddSingle: function () {
      var lrec = { _type: 'single' };
      var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
      if (chkPassed) {
        chkPassed = this.checkForInvalidChars(this.input_sample_id.getValue());
      }
      if (chkPassed) {
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read: { label: 'Read File', value: 1 },
          sample_id: {label: 'Sample ID' , value: 1 },
          primers: {label: 'Sample Primers', value: 1},
          primer_version: {label: 'Primer Version', value: 1},
          sample_level_date: {label: 'Date', value: 1}
        };
        // check if user changed the sample id
        if (typeof this.input_sample_id._lastInputEventValue === 'undefined') {
          // user did not change the sample id - use default
          lrec.sample_id = this.input_sample_id.getValue()
        } else {
          // user changes sample id - update to user input
          lrec.sample_id = this.input_sample_id._lastInputEventValue
        }
        // clear the sample id for next input
        this.input_sample_id.reset()
        lrec.primers = this.primers.value
        lrec.primer_version = this.primer_version.value
        if (this.sample_level_date) {
          // if the string is not empty add to library
          // sample level date is optional
          lrec.sample_level_date = this.sample_level_date.value
          // reset date textbox
          this.sample_level_date.reset()
      } 
        this.addLibraryRow(lrec, infoLabels, 'singledata');
        // empty single lib search box after adding to thel ibrary row
        this.single_end_libsWidget.searchBox.reset()
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

    setPairedId: function () {
      var read_name = this.read1.searchBox.get('displayedValue');
      this.input_sample_id.set('value', this.replaceInvalidChars(read_name.split('.')[0]));
    },

    onAddPair: function () {
      if (this.read1.searchBox.get('value') == this.read2.searchBox.get('value')) {
        var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }
      if (chkPassed) {
        chkPassed = this.checkForInvalidChars(this.input_sample_id.getValue());
      }
      var lrec = { _type: 'paired' };
      var pairToIngest = this.pairToAttachPt;
      var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
      if (chkPassed) {
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read1: { label: 'Read1', value: 1 },
          read2: { label: 'Read2', value: 1 },
          sample_id: {label: 'Sample ID' , value: 1 },
          primers: {label: 'Sample Primers', value: 1},
          primer_version: {label: 'Primer Version', value: 1},
          sample_level_date: {label: 'Date', value: 1}
        };
        // check if user changed the sample id
        if (typeof this.input_sample_id._lastInputEventValue === 'undefined') {
          // user did not change the sample id - use default
          lrec.sample_id = this.input_sample_id.getValue()
        } else {
          // user changes sample id - update to user input
          lrec.sample_id = this.input_sample_id._lastInputEventValue
        }
        // clear the sample id for nex input
        this.input_sample_id.reset()
        lrec.primers = this.primers.value
        lrec.primer_version = this.primer_version.value
        if (this.sample_level_date) {
          // If the string is not empty add to library
          // sample level date is optional
          lrec.sample_level_date = this.sample_level_date.value
          // clear sample level date box 
          this.sample_level_date.reset()
      } 
        this.addLibraryRow(lrec, infoLabels, 'pairdata');
        // // reset the singe end libs box 
        this.read1.searchBox.reset()
        this.read2.searchBox.reset()
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
      if (this.output_path.get('value')) {
        this.validate();
      }
      else {
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

    checkBaseParameters: function (values) {
      // reads and SRA
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
        var rrec = {};
        Object.keys(lrec).forEach(lang.hitch(this, function (attr) {
          if (!attr.startsWith('_')) {
            rrec[attr] = lrec[attr];
          }
        }));
        return rrec;
      });
      if (this.sra_libs.length) {
        values.srr_libs = this.sra_libs;
      }

      return values;
    },
    // TO DO ReRun Form

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
            var param_dict = { 'output_folder': 'output_path', 'strategy': 'analysis_type' };
            // widget_map
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            job_data = this.formatRerunJson(job_data);
            AppBase.prototype.loadLibrary.call(this, job_data, param_dict);
            this.setAnalysisType(job_data);
            this.output_path.set('value', job_data['output_path']);
            this.form_flag = true;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    // formatRerunJson: function (job_data) {
    //   if (!job_data.paired_end_libs) {
    //     job_data.paired_end_libs = [];
    //   }
    //   if (!job_data.single_end_libs) {
    //     job_data.single_end_libs = [];
    //   }
    //   return job_data;
    // }
  });
});
