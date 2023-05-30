define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/Variation.html', './AppBase', 'dojo/dom-construct',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby'
], function (
  declare, WidgetBase, Topic, on,
  domClass,
  Template, AppBase, domConstruct,
  Deferred, aspect, lang, domReady, NumberTextBox, query,
  dom, popup, Tooltip, Dialog, TooltipDialog, children, WorkspaceManager, Memory, Standby
) {
  return declare([AppBase], {
    baseClass: 'App Variation',
    templateString: Template,
    applicationName: 'Variation',
    requireAuth: true,
    applicationLabel: 'Variation Analysis',
    applicationDescription: 'The Variation Analysis Service can be used to identify and annotate sequence variations.',
    applicationHelp: 'quick_references/services/variation_analysis_service.html',
    tutorialLink: 'tutorial/variation_analysis/variation_analysis.html',
    videoLink: '',
    pageTitle: 'Variation Analysis Service | BV-BRC',
    libraryData: null,
    defaultPath: '',
    startingRows: 7,

    listValues: function (obj) {
      var results = [];
      Object.keys(obj).forEach(function (key) {
        results.append(obj[key]);
      });
    },

    constructor: function () {

      this.addedLibs = { counter: 0 };
      this.addedCond = { counter: 0 };
      // these objects map dojo attach points to desired alias for ingestAttachPoint function
      // key is attach point array of values is alias
      // if there is no alias the key in the resulting object will be the same name as attach point
      this.pairToAttachPt1 = { read1: null, read2: null };
      this.pairConditionToAttachPt = { read1: null, read2: null, condition_paired: ['condition'] };
      this.advPairToAttachPt = { interleaved: null, insert_size_mean: null, insert_size_stdev: null };
      this.paramToAttachPt = { output_path: null, output_file: null };
      this.singleToAttachPt = { read: null };
      this.singleConditionToAttachPt = { read: null, condition_single: ['condition'] };
      this.conditionToAttachPt = { condition: ['condition', 'id', 'label'] };
      this.targetGenomeID = '';
      this.shapes = ['icon-square', 'icon-circle'];
      this.colors = ['blue', 'green', 'red', 'purple', 'orange'];
      this.color_counter = 0;
      this.shape_counter = 0;
      this.libraryStore = new Memory({ data: [], idProperty: '_id' });
      this.libraryID = 0;
    },


    startup: function () {
      if (this._started) { return; }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);
      var _self = this;
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);

      // create help dialog for infobutton's with infobuttoninfo div's
      this.emptyTable(this.libsTable, this.startingRows);

      // adjust validation for each of the attach points associated with read files
      Object.keys(this.pairToAttachPt1).concat(Object.keys(this.singleToAttachPt)).forEach(lang.hitch(this, function (attachname) {
        this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function (/* anything */ value, /* __Constraints */ constraints) {
          return (new RegExp('^(?:' + this._computeRegexp(constraints) + ')' + (this.required ? '' : '?') + '$')).test(value) &&
            (!this._isEmpty(value)) &&
            (this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
        }); }));
      // this.block_condition.show();

      // this.read1.set('value',"/" +  window.App.user.id +"/home/");
      // this.read2.set('value',"/" +  window.App.user.id +"/home/");
      // this.single_end_libs.set('value',"/" +  window.App.user.id +"/home/");
      // this.output_path.set('value',"/" +  window.App.user.id +"/home/");
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

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr =  target.insertRow(0);// domConstr.create("tr",{},this.libsTableBody);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    getValues: function () {
      var submit_values = {};
      var values = this.inherited(arguments);

      submit_values = this.checkBaseParameters(values, submit_values);
      if (!this.form_flag) {
        this.ingestAttachPoints(this.paramToAttachPt, submit_values);
      }
      // for (var k in values) {
      //   if(!k.startsWith("libdat_")){
      //     submit_values[k]=values[k];
      //   }
      // }

      submit_values.mapper = values.mapper;
      submit_values.caller = values.caller;

      return submit_values;

    },
    // gets values from dojo attach points listed in input_ptsi keys.
    // aliases them to input_pts values.  validates all values present if req
    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      var prevalidate_ids = ['read1', 'read2', 'read', 'output_path', 'condition', 'condition_single', 'condition_paired'];
      var duplicate = false;
      if (target._type) {
        target._id = this.makeLibraryID(target._type);
        duplicate = target._id in this.libraryStore.index;
      }
      Object.keys(input_pts).forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var prevalidate = (prevalidate_ids.indexOf(attachname) > -1);// truth variable whether to do validation separate from form
        var targetnames = [attachname];
        if (input_pts[attachname]) {
          targetnames = input_pts[attachname];
        }
        if (attachname == 'read1' || attachname == 'read2' || attachname == 'read' || attachname == 'output_path') {
          cur_value = this[attachname].searchBox.value;// ? "/_uuid/"+this[attachname].searchBox.value : "";
          if (attachname == 'read2' && this.read2.searchBox.value == this.read1.searchBox.value) {
            this.read2.searchBox.value = '';
          }
          // cur_value=this[attachname].searchBox.get('value');
          // incomplete=((cur_value.replace(/^.*[\\\/]/, '')).length==0);
        }
        else if (attachname == 'condition') {
          cur_value = this[attachname].displayedValue;// ? "/_uuid/"+this[attachname].searchBox.value : "";
          // cur_value="/_uuid/"+this[attachname].searchBox.value;
          // cur_value=this[attachname].searchBox.get('value');
        }
        else {
          cur_value = this[attachname].value;
        }

        if (typeof (cur_value) == 'string') {
          cur_value = cur_value.trim();
        }
        // set validation state for widgets since they are non-blocking presubmission fields
        if (req && (duplicate || !cur_value || incomplete)) {
          if (prevalidate) {
            if (this[attachname].searchBox) {
              this[attachname].searchBox.validate(); // this should be whats done but it doesn't actually call the new validator
              this[attachname].searchBox._set('state', 'Error');
            }
            else {
              this[attachname].validate();
              this[attachname]._set('state', 'Error');
            }
            this[attachname].focus = true;
          }
          success = 0;
        }
        else {
          this[attachname]._set('state', '');
        }
        // set alias target values to cur_value and format values in resulting object
        targetnames.forEach(function (targetname) {
          target[targetname] = cur_value;
          if (target[targetname] != '') {
            target[targetname] = target[targetname] || undefined;
          }
          else if (target[targetname] == 'true') {
            target[targetname] = true;
          }
          else if (target[targetname] == 'false') {
            target[targetname] = false;
          }
        }, target);
      }, this);
      return (success);
    },

    showConditionLabels: function (item, store) {
      var label = item.condition + ' ' + item.icon;
      return label;
    },

    makeLibraryName: function (mode) {
      if (mode == 'paired') {
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
      }
      else if (mode == 'single') {

        var fn = this.read.searchBox.get('displayedValue');
        maxName = 24;
        if (fn.length > maxName) {
          fn = fn.substr(0, (maxName / 2) - 2) + '...' + fn.substr((fn.length - (maxName / 2)) + 2);
        }
        return 'S(' + fn + ')';
      }
      else if (mode == 'srr_accession') {
        return '' + this.srr_accession.get('value');
      }
      return '';
    },

    makeLibraryID: function (mode) {
      if (mode == 'paired') {
        var fn = this.read1.searchBox.get('value');
        var fn2 = this.read2.searchBox.get('value');
        return fn + fn2;
      }
      if (mode == 'srr_accession') {
        var name = this.srr_accession.get('value');
        return name;
      }
      var fn = this.read.searchBox.get('value');
      return fn;
    },

    //    onAddSRR: function () {
    //      var accession = this.srr_accession.get('value');
    //      if ( !accession.match(/^[a-z0-9]+$/i)) {
    //        this.srr_accession_validation_message.innerHTML = ' Your input is not valid.<br>Hint: only one SRR at a time.';
    //      }
    //      else {
    //        // SRR5121082
    //        this.srr_accession.set('disabled', true);
    //        this.srr_accession_validation_message.innerHTML = ' Validating ' + accession + ' ...';
    //        xhr.get(lang.replace(this.srrValidationUrl, [accession]), {})
    //          .then(lang.hitch(this, function (xml_resp) {
    //            var resp = xmlParser.parse(xml_resp).documentElement;
    //            this.srr_accession.set('disabled', false);
    //            try {
    //              var title = resp.children[0].childNodes[3].innerHTML;
    //              this.srr_accession_validation_message.innerHTML = '';
    //              var lrec = { _type: 'srr_accession', title: title };
    //              var chkPassed = this.ingestAttachPoints({ 'srr_accession': null }, lrec);
    //              if (chkPassed) {
    //                var infoLabels = {
    //                  title: { label: 'Title', value: 1 }
    //                };
    //                this.addLibraryRow(lrec, infoLabels, 'srrdata');
    //              }
    //            } catch (e) {
    //              this.srr_accession_validation_message.innerHTML = ' Your input ' + accession + ' is not valid';
    //              this.srr_accession.set('value', '');
    //            }
    //          }));
    //      }
    //    },

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


    makeConditionName: function () {
      return this.condition.get('displayedValue');
    },

    // counter is a widget for requirements checking
    increaseRows: function (targetTable, counter, counterWidget) {
      counter.counter += 1;
      if (typeof counterWidget != 'undefined') {
        counterWidget.set('value', Number(counter.counter));
      }
    },
    decreaseRows: function (targetTable, counter, counterWidget) {
      counter.counter -= 1;
      if (typeof counterWidget != 'undefined') {
        counterWidget.set('value', Number(counter.counter));
      }
    },

    onAddSingle: function () {
      console.log('Create New Row', domConstruct);
      var lrec = { _type: 'single' };
      var toIngest = this.singleToAttachPt;
      var chkPassed = this.ingestAttachPoints(toIngest, lrec);
      if (chkPassed) {
        var infoLabels = {
          read: { label: 'Read File', value: 1 }
        };
        this.addLibraryRow(lrec, infoLabels, 'singledata');
      }
    },

    destroyLibRow: function (query_id, id_type) {
      console.log('Delete Rows');
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

    onSuggestNameChange: function () {
    },


    onAddPair: function () {
      console.log('Create New Row', domConstruct);
      if (this.read1.searchBox.get('value') == this.read2.searchBox.get('value')) {
        var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }
      var lrec = { _type: 'paired' };
      // If you want to disable advanced parameters while not shown this would be the place.
      // but for right now, if you set them and then hide them, they are still active
      var pairToIngest = this.pairToAttachPt1;
      // pairToIngest=pairToIngest.concat(this.advPairToAttachPt);
      var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
      // this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
      if (chkPassed && lrec.read1 != lrec.read2) {
        var infoLabels = {
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
      if (mode == 'pairdata') {
        td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('paired') + '</div>';
        advInfo.push('Paired Library');
      }
      else if (mode == 'singledata') {
        td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('single') + '</div>';
        advInfo.push('Single Library');
      }
      else if (mode == 'srrdata') {
        td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('srr_accession') + '</div>';
        advInfo.push('SRA run accession');
      } else {
        console.error('wrong data type', lrec, infoLabels, mode);
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
      if (this.output_path.get('value') && this.output_file.get('displayedValue') ) {
        this.validate();
      }
      else {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
      }
    },

    checkBaseParameters: function (values, submit_values) {
      var pairedList = this.libraryStore.query({ _type: 'paired' });
      var pairedAttrs = ['read1', 'read2'];
      var singleAttrs = ['read'];
      var singleList = this.libraryStore.query({ _type: 'single' });
      var srrAccessionList = this.libraryStore.query({ _type: 'srr_accession' });
      var condLibs = [];

      pairedList.concat(singleList);
      submit_values.reference_genome_id = values.genome_name;


      pairedList.forEach(function (libRecord) {
        var toAdd = {};
        if ('condition' in libRecord && this.exp_design.checked) {
          toAdd.condition = condLibs.indexOf(libRecord.condition) + 1;
        }
        pairedAttrs.forEach(function (attr) { toAdd[attr] = libRecord[attr]; });
        this.paired_end_libs.push(toAdd);
      }, this);
      if (this.paired_end_libs.length) {
        submit_values.paired_end_libs = this.paired_end_libs;
      }
      singleList.forEach(function (libRecord) {
        var toAdd = {};
        if ('condition' in libRecord && this.exp_design.checked) {
          toAdd.condition = condLibs.indexOf(libRecord.condition) + 1;
        }
        singleAttrs.forEach(function (attr) { toAdd[attr] = libRecord[attr]; });
        this.single_end_libs.push(toAdd);
      }, this);
      if (this.single_end_libs.length) {
        submit_values.single_end_libs = this.single_end_libs;
      }
      this.sra_libs = srrAccessionList.map(function (lrec) {
        return lrec._id;
      });
      if (this.sra_libs.length) {
        submit_values.srr_ids = this.sra_libs;
      }

      // empty paired, single, and sra libs
      this.paired_end_libs = [];
      this.single_end_libs = [];
      this.sra_libs = [];

      return submit_values;
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
            var param_dict = { 'output_folder': 'output_path', 'target_genome_id': 'reference_genome_id' };
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            job_data = this.formatRerunJson(job_data);
            AppBase.prototype.loadLibrary.call(this, job_data, param_dict);
            this.setParams(job_data);
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setParams: function (job_data) {
      var keys = Object.keys(job_data);
      if (keys.includes('reference_genome_id')) {
        this.genome_nameWidget.set('value', job_data['reference_genome_id']);
      }
      if (keys.includes('mapper')) {
        this.mapper.set('value', job_data['mapper']);
      }
      if (keys.includes('caller')) {
        this.caller.set('value', job_data['caller']);
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
