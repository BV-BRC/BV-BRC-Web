define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/Rnaseq.html', './AppBase', 'dojo/dom-construct',
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
    baseClass: 'App  RNASeq',
    templateString: Template,
    applicationName: 'RNASeq',
    requireAuth: true,
    applicationLabel: 'RNA-Seq Analysis',
    applicationDescription: 'The RNA-Seq Analysis Service provides services for aligning, assembling, and testing differential expression on RNA-Seq data.',
    applicationHelp: 'quick_references/services/rna_seq_analysis_service.html',
    tutorialLink: 'tutorial/rna_seq/rna_seq.html',
    videoLink: 'https://youtu.be/kEhdQJ2o-tI',
    pageTitle: 'RNA-Seq Analysis Service | BV-BRC',
    libraryData: null,
    defaultPath: '',
    startingRows: 18,
    initConditions: 5,
    initContrasts: 8,
    maxConditions: 10,
    maxContrasts: 100,
    hostGenomes: {
      9606.33: '', 6239.6: '', 7955.5: '', 7227.4: '', 9031.4: '', 9544.2: '', 10090.24: '', 9669.1: '', 10116.5: '', 9823.5: ''
    },

    listValues: function (obj) {
      var results = [];
      Object.keys(obj).forEach(function (key) {
        results.append(obj[key]);
      });
    },

    constructor: function () {
      this.addedLibs = { counter: 0 };
      this.addedCond = { counter: 0 };
      this.addedContrast = { counter: 0 };
      // these objects map dojo attach points to desired alias for ingestAttachPoint function
      // key is attach point array of values is alias
      // if there is no alias the key in the resulting object will be the same name as attach point
      this.pairToAttachPt1 = { read1: null, read2: null };
      this.pairConditionToAttachPt = { read1: null, read2: null, condition_paired: ['condition'] };
      this.advPairToAttachPt = { interleaved: null, insert_size_mean: null, insert_size_stdev: null };
      this.paramToAttachPt = { output_path: null, output_file: null, recipe: null };
      this.singleToAttachPt = { read: null };
      this.singleConditionToAttachPt = { read: null, condition_single: ['condition'] };
      this.srrToAttachPt = { srr_accession: null };
      this.srrConditionToAttachPt = { srr_accession: null, condition_srr: ['condition'] };
      this.conditionToAttachPt = { condition: ['condition', 'id', 'label'] };
      this.contrastToAttachPt = { contrast_cd1: ['condition1'], contrast_cd2: ['condition2'] };
      this.targetGenomeID = '';
      this.shapes = ['icon-square', 'icon-circle'];
      this.colors = ['blue', 'green', 'red', 'purple', 'orange'];
      this.color_counter = 0;
      this.shape_counter = 0;
      this.conditionStore = new Memory({ data: [] });
      this.contrastStore = new Memory({ data: [] });
      this.activeConditionStore = new Memory({ data: [] }); // used to store conditions with more than 0 libraries assigned
      this.libraryStore = new Memory({ data: [], idProperty: 'id' });
      this.libraryID = 0;
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

      // create help dialog for infobutton's with infobuttoninfo div's
      this.emptyTable(this.libsTable, this.startingRows, 4);
      this.emptyTable(this.condTable, this.initConditions, 3);
      this.emptyTable(this.contrastTable, this.initContrasts, 5);

      // adjust validation for each of the attach points associated with read files
      Object.keys(this.pairToAttachPt1).concat(Object.keys(this.singleToAttachPt)).forEach(lang.hitch(this, function (attachname) {
        this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function (/* anything */ value, /* __Constraints */ constraints) {
          return (new RegExp('^(?:' + this._computeRegexp(constraints) + ')' + (this.required ? '' : '?') + '$')).test(value) &&
            (!this._isEmpty(value)) &&
            (this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
        });
      }));
      on(this.group_switch, 'click', lang.hitch(this, function (evt) {
        this.exp_design.checked = !this.exp_design.checked;
        this.exp_design.value = this.exp_design.checked ? 'on' : 'off';
        this.onDesignToggle();
      }));
      this.condition_single.labelFunc = this.showConditionLabels;
      this.condition_srr.labelFunc = this.showConditionLabels;
      this.condition_paired.labelFunc = this.showConditionLabels;
      this.contrast_cd1.labelFunc = this.showConditionLabels;
      this.contrast_cd2.labelFunc = this.showConditionLabels;

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

    validate: function () {
      var pairedList = this.libraryStore.query({ type: 'paired' });
      var singleList = this.libraryStore.query({ type: 'single' });
      var srrList = this.libraryStore.query({ type: 'srr_accession' });
      var libraryList = pairedList.concat(singleList);
      libraryList = libraryList.concat(srrList);
      var condition_counts = {};
      // Count number of library samples for each condition, if HTSeq-DESeq2 terminate if not at least 2 for each
      if (this.exp_design.checked && this.recipe.getValue() === 'HTSeq-DESeq') {
        console.log('validating conditions');
        if (libraryList.length == 0) {
          this.submitButton.set('disabled', true);
          return false;
        }
        libraryList.forEach(lang.hitch(this, function (libRecord) {
          if ('condition' in libRecord) {
            var cond = libRecord.condition;
            if (cond in condition_counts) {
              condition_counts[cond] += 1;
            } else {
              condition_counts[cond] = 1;
            }
          } else {
            console.log('Error: no condition supplied to sample');
            return false;
          }
        }));
        var disable_button = false;
        Object.keys(condition_counts).forEach(lang.hitch(this, function (cond) {
          // also terminate if they add a condition that doesnt get used
          if (condition_counts[cond] < 2) {
            this.recipe_message.innerHTML = 'At least 2 replicates per condition are required for the HTSeq-DESeq pipeline.';
            disable_button = true;
          } else {
            this.recipe_message.innerHTML = '';
          }
        }));
        if (disable_button) {
          this.submitButton.set('disabled', true);
          return false;
        }
      } else {
        this.recipe_message.innerHTML = '';
      }
      return this.inherited(arguments);
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    onDesignToggle: function () {
      var design_status = this.exp_design.checked;
      this.condition.set('disabled', !design_status);
      this.condition_single.set('disabled', !design_status);
      this.condition_srr.set('disabled', !design_status);
      this.condition_paired.set('disabled', !design_status);
      this.contrast_cd1.set('disabled', !this.contrastEnabled());
      this.contrast_cd2.set('disabled', !this.contrastEnabled());
      if (!design_status) { // design status not enabled
        // this.block_condition.show();
        this.numCondWidget.set('value', Number(1));
        this.destroyLib({}, true, 'design');
        domClass.add(this.condTable, 'disabled');
        this.numContrastWidget.set('required', false);
        this.numContrastWidget.set('disabled', true);
        this.destroyContrastRow(true, 'contrast');
        domClass.add(this.contrastTable, 'disabled');
      }
      else {
        // this.block_condition.hide();
        this.numCondWidget.set('value', Number(this.addedCond.counter));
        this.destroyLib({}, false, 'design');
        domClass.remove(this.condTable, 'disabled');
        this.numContrastWidget.set('value', Number(this.addedContrast.counter));
        this.destroyContrastRow(false, 'contrast');
        if (this.contrastEnabled()) {
          this.numContrastWidget.set('required', true);
          this.numContrastWidget.set('disabled', false);
          domClass.remove(this.contrastTable, 'disabled');
        }
        else {
          this.numContrastWidget.set('required', false);
          this.numContrastWidget.set('disabled', true);
          domClass.add(this.contrastTable, 'disabled');
        }
      }
    },

    addLibraryInfo: function (lrec, infoLabels, tr) {
      var advInfo = [];
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
    },

    updateSRR: function () {
    },

    addLibraryRow: function (lrec, infoLabels, mode) {

      var tr = this.libsTable.insertRow(0);
      lrec.row = tr;
      // this code needs to be refactored to use addLibraryRow like the Assembly app
      var td = domConstruct.create('td', { 'class': 'textcol srrdata', innerHTML: '' }, tr);
      td.libRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('srr_accession') + '</div>';
      this.addLibraryInfo(lrec, infoLabels, tr);
      var advPairInfo = [];
      if (lrec.condition) {
        advPairInfo.push('Condition:' + lrec.condition);
      }
      if (advPairInfo.length) {
        lrec.design = true;
        var condition_icon = this.getConditionIcon(lrec.condition);
        var tdinfo = domConstruct.create('td', { 'class': 'iconcol', innerHTML: condition_icon }, tr);
        new Tooltip({
          connectId: [tdinfo],
          label: advPairInfo.join('</br>')
        });
      }
      else {
        lrec.design = false;
        var tdinfo = domConstruct.create('td', { innerHTML: '' }, tr);
      }
      var td2 = domConstruct.create('td', {
        'class': 'iconcol',
        innerHTML: "<i class='fa icon-x fa-1x' />"
      }, tr);
      if (this.addedLibs.counter < this.startingRows) {
        this.libsTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        this.destroyLib(lrec, lrec.id, 'id');
      }));
      lrec.handle = handle;
      this.createLib(lrec);
      this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
    },

    emptyTable: function (target, rowLimit, colNum) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);// domConstr.create("tr",{},this.libsTableBody);
        for (var j = 0; j < colNum; j++) {
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        }
      }
    },

    getValues: function () {
      var assembly_values = {};
      var values = this.inherited(arguments);

      // Make sure experimental conditions has all conditions from samples
      // Have seen errors where not all conditions from samples are present for some reason (cannot replicate)
      assembly_values = this.checkBaseParameters(values, assembly_values);

      // get trimming value
      if (this.trimming_true.checked) {
        assembly_values['trimming'] = true;
      } else {
        assembly_values['trimming'] = false;
      }

      if (!this.form_flag) {
        this.ingestAttachPoints(this.paramToAttachPt, assembly_values);
      }
      // for (var k in values) {
      //   if(!k.startsWith("libdat_")){
      //     assembly_values[k]=values[k];
      //   }
      // }
      if (Boolean(this.genome_nameWidget.item.host) && 'ftp' in this.genome_nameWidget.item) {
        assembly_values['host_ftp'] = this.genome_nameWidget.item['ftp'];
      }

      return assembly_values;
    },

    // gets values from dojo attach points listed in input_ptsi keys.
    // aliases them to input_pts values.  validates all values present if req
    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      var prevalidate_ids = ['read1', 'read2', 'read', 'output_path', 'condition', 'condition_single', 'condition_paired', 'srr_accession', 'condition_srr'];
      target.id = this.makeStoreID(target.type);
      var duplicate = target.id in this.libraryStore.index;
      // For each named obj in input_pts get the attributes from the dojo attach point of the same name in the template
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
          var fn = this.read.searchBox.get('displayedValue');
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

    makeStoreID: function (mode) {
      if (mode == 'paired') {
        var fn = this.read1.searchBox.get('value');
        var fn2 = this.read2.searchBox.get('value');
        return fn + fn2;
      }
      else if (mode == 'single') {
        var fn = this.read.searchBox.get('value');
        return fn;
      }
      else if (mode == 'contrast') {
        var fn = this.contrast_cd1.get('value') + this.contrast_cd2.get('value');
        return fn;
      }
      else if (mode == 'condition') {
        var fn = this.condition.displayedValue;
        return fn;
      }
      else if (mode == 'srr_accession') {
        var fn = this.srr_accession.displayedValue;
        return fn;
      }
    },

    onReset: function (evt) {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');
      var toDestroy = [];
      this.libraryStore.data.forEach(lang.hitch(this, function (lrec) {
        toDestroy.push(lrec.id);
      }));
      // because its removing rows cells from array needs separate loop
      toDestroy.forEach(lang.hitch(this, function (id) {
        this.destroyLib({}, id, 'id');
      }));
    },

    makeConditionName: function (conditionName) {
      return conditionName;
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

    getConditionIcon: function (query_id) {
      var result = '';
      if (!query_id) {
        result = "<i style='color:" + this.colors[this.color_counter] + "' class='fa " + this.shapes[this.shape_counter] + " fa-1x' />";
        this.color_counter = this.color_counter + 1 < this.colors.length ? this.color_counter + 1 : 0;
        this.shape_counter = this.shape_counter + 1 < this.shapes.length ? this.shape_counter + 1 : 0;
      }
      else {
        var conditionList = this.conditionStore.query({ id: query_id });
        result = conditionList.length ? conditionList[0].icon : "<i class='fa icon-info fa-1' />";
      }
      return result;
    },

    replaceInvalidChars: function (value) {
      var invalid_chars = ['-', ':', '@', '"', "'", ';', '[', ']', '{', '}', '|', '`'];
      invalid_chars.forEach(lang.hitch(this, function (char) {
        value = value.replaceAll(char, '_');
      }));
      return value;
    },

    checkForInvalidChars: function (value) {
      var valid = true;
      var invalid_chars = ['-', ':', '@', '"', "'", ';', '[', ']', '{', '}', '|', '`'];
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

    onAddCondition: function () {
      console.log('Create New Row', domConstruct);
      var lrec = { count: 0, type: 'condition' }; // initialized to the number of libraries assigned
      var toIngest = this.conditionToAttachPt;
      var disable = !this.exp_design.checked;
      var chkPassed = this.ingestAttachPoints(toIngest, lrec);
      // make sure condition doesn't contain invalid characters
      if (chkPassed) {
        chkPassed = this.checkForInvalidChars(this.condition.getValue());
      }
      var conditionSize = this.conditionStore.data.length;
      if (this.addedCond.counter < this.maxConditions) {
        this.updateConditionStore(lrec, false);
      }
      // make sure all necessary fields, not disabled, available condition slots, and checking conditionSize checks dups
      if (chkPassed && !disable && this.addedCond.counter < this.maxConditions && conditionSize < this.conditionStore.data.length) {
        lrec.icon = this.getConditionIcon();
        var tr = this.condTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol conditiondata', innerHTML: '' }, tr);
        td.libRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeConditionName(this.condition.get('displayedValue')) + '</div>';
        domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon }, tr);
        var td2 = domConstruct.create('td', {
          'class': 'iconcol',
          innerHTML: "<i class='fa icon-x fa-1x' />"
        }, tr);
        if (this.addedCond.counter < this.initConditions) {
          this.condTable.deleteRow(-1);
        }

        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          console.log('Delete Row');
          domConstruct.destroy(tr);
          this.destroyLib(lrec, lrec.condition, 'condition');
          // this.destroyContrastRow(query_id = lrec["condition"]);
          this.updateConditionStore(lrec, true);
          this.decreaseRows(this.condTable, this.addedCond, this.numCondWidget);
          if (this.addedCond.counter < this.maxConditions) {
            var ntr = this.condTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          this.condition_single.reset();
          this.condition_srr.reset();
          this.condition_paired.reset();
          handle.remove();
        }));
        this.increaseRows(this.condTable, this.addedCond, this.numCondWidget);
      }
    },

    updateConditionStore: function (record, remove) {
      // if there is no real condition specified return
      if (!record.condition.trim()) {
        return;
      }
      if (remove) {
        var toRemove = this.conditionStore.query({ id: record.id });
        // remove condition from data store
        toRemove.forEach(function (obj) {
          if (obj.libraries) {
            obj.libraries.forEach(function (lib_row) {
              lib_row.remove();
            });
          }
          this.conditionStore.remove(obj.id);
        }, this);
      }
      else {
        this.conditionStore.put(record);
      }
      this.condition_paired.set('store', this.conditionStore);
      this.condition_single.set('store', this.conditionStore);
      this.condition_srr.set('store', this.conditionStore);
      this.contrast_cd1.set('store', this.activeConditionStore);
      this.contrast_cd2.set('store', this.activeConditionStore);
    },

    updateContrastStore: function (record, remove) {
      // if there is no real condition specified return
      if (!record.condition1.trim() || !record.condition2.trim()) {
        return;
      }
      if (remove) {
        var toRemove = this.contrastStore.query({ id: record.id });
        // remove condition from data store
        toRemove.forEach(function (obj) {
          if (obj.contrasts) {
            obj.contrasts.forEach(function (contrast_row) {
              contrast_row.remove();
            });
          }
          this.contrastStore.remove(obj.id);
        }, this);
      }
      else {
        this.contrastStore.put(record);
      }
    },

    onAddContrast: function () {
      console.log('Create New Row', domConstruct);
      var lrec = { type: 'contrast' };
      var disable = !this.exp_design.checked;
      var chkPassed = this.ingestAttachPoints(this.contrastToAttachPt, lrec);
      var contrastSize = this.contrastStore.data.length;
      if (this.addedContrast.counter < this.maxContrasts) {
        this.updateContrastStore(lrec, false);
      }
      // make sure all necessary fields, not disabled, available condition slots, and checking conditionSize checks dups
      if (chkPassed && !disable && this.addedContrast.counter < this.maxContrasts && contrastSize < this.contrastStore.data.length) {
        var condition1 = this.contrast_cd1.get('displayedValue');
        var condition2 = this.contrast_cd2.get('displayedValue');
        lrec.icon1 = this.getConditionIcon(condition1);
        lrec.icon2 = this.getConditionIcon(condition2);
        var tr = this.contrastTable.insertRow(0);
        lrec.row = tr;

        var td_cd1 = domConstruct.create('td', { 'class': 'conditiondata', innerHTML: '' }, tr);
        td_cd1.innerHTML = "<div class='contrastrow'>" + this.makeConditionName(condition1) + '</div>';
        domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon1 }, tr);

        var td_cd2 = domConstruct.create('td', { 'class': 'conditiondata', innerHTML: '' }, tr);
        td_cd2.innerHTML = "<div class='contrastrow'>" + this.makeConditionName(condition2) + '</div>';
        domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon2 }, tr);

        var tdx = domConstruct.create('td', { 'class': 'iconcol', innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedContrast.counter < this.initContrasts) {
          this.contrastTable.deleteRow(-1);
        }

        var handle = on(tdx, 'click', lang.hitch(this, function (evt) {
          console.log('Delete Row');
          domConstruct.destroy(tr);
          this.updateContrastStore(lrec, true);
          this.decreaseRows(this.contrastTable, this.addedContrast, this.numContrastWidget);
          if (this.addedContrast.counter < this.maxContrasts) {
            var ntr = this.condTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
          this.destroyContrastRow(lrec.contrast, 'contrast');
        }));
        this.increaseRows(this.contrastTable, this.addedContrast, this.numContrastWidget);
      }
      this.validate();
    },

    createLib: function (lrec) {
      this.libraryStore.put(lrec);
      if (lrec.condition) {
        var query_obj = { id: lrec.condition };
        var toUpdate = this.conditionStore.query(query_obj);
        toUpdate.forEach(function (obj) {
          obj.count += 1;
        });
      }
      this.updateContrasts();
    },

    destroyLib: function (lrec, query_id, id_type) {
      this.destroyLibRow(query_id, id_type);
      if (lrec.condition) {
        var query_obj = { id: lrec.condition };
        var toUpdate = this.conditionStore.query(query_obj);
        toUpdate.forEach(function (obj) {
          obj.count -= 1;
        });
      }
      this.updateContrasts();
    },

    changeTrimmingFlag: function () {
      if (this.trimming_true.checked) {
        this.trimming_true.set('checked', false);
        this.trimming_false.set('checked', true);
      }
      if (this.trimming_false.checked) {
        this.trimming_true.set('checked', true);
        this.trimming_false.set('checked', false);
      }
    },

    contrastEnabled: function () {
      // the penguin doesn't support specifying contrasts
      return (this.exp_design.checked && this.recipe.value != 'Rockhopper');
    },

    updateContrasts: function () {
      if (this.contrastEnabled()) {

        // var disableConditions = this.conditionStore.query({"count":0});
        var disableConditions = this.conditionStore.query(function (obj) { return obj.count == 0; });
        var enableConditions = this.conditionStore.query(function (obj) { return obj.count > 0; });

        disableConditions.forEach(lang.hitch(this, function (obj) {
          // disable in contrast_cd widget
          this.activeConditionStore.remove(obj.id); // used to store conditions with more than 0 libraries assigned
          this.destroyContrastRow(obj.id);
        }));
        enableConditions.forEach(lang.hitch(this, function (obj) {
          // enable in contrast_cd widget
          this.activeConditionStore.put(obj);
        }));
        this.contrast_cd1.reset();
        this.contrast_cd2.reset();
      }
    },

    setSingleId: function () {
      var read_name = this.read.searchBox.get('displayedValue');
      this.single_sample_id.set('value', this.replaceInvalidChars(read_name.split('.')[0]));
    },

    onAddSingle: function () {
      console.log('Create New Row', domConstruct);
      var lrec = { type: 'single' };
      var toIngest = this.exp_design.checked ? this.singleConditionToAttachPt : this.singleToAttachPt;
      var chkPassed = this.ingestAttachPoints(toIngest, lrec);
      if (chkPassed) {
        chkPassed = this.checkForInvalidChars(this.single_sample_id.getValue());
      }
      if (chkPassed) {
        var tr = this.libsTable.insertRow(0);
        lrec.row = tr;
        var td = domConstruct.create('td', { 'class': 'textcol singledata', innerHTML: '' }, tr);
        // td.libRecord=lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('single') + '</div>';
        var advPairInfo = [];
        if (lrec.condition) {
          advPairInfo.push('Condition:' + lrec.condition);
        }        this.addLibraryInfo(lrec, { 'read': { 'label': this.read.searchBox.get('displayedValue') } }, tr);
        if (advPairInfo.length) {
          var condition_icon = this.getConditionIcon(lrec.condition);
          lrec.design = true;
          var tdinfo = domConstruct.create('td', { 'class': 'iconcol', innerHTML: condition_icon }, tr);
          new Tooltip({
            connectId: [tdinfo],
            label: advPairInfo.join('</br>')
          });
        }
        else {
          lrec.design = false;
          var tdinfo = domConstruct.create('td', { innerHTML: '' }, tr);
        }
        var td2 = domConstruct.create('td', {
          'class': 'iconcol',
          innerHTML: "<i class='fa icon-x fa-1x' />"
        }, tr);
        if (this.addedLibs.counter < this.startingRows) {
          this.libsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          this.destroyLib(lrec, lrec.id, 'id');
          this.validate();
        }));
        lrec.handle = handle;
        lrec.sample_id = this.single_sample_id.get('displayedValue');
        this.createLib(lrec);
        this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
      }
      this.validate();
    },

    onAddSRR: function () {
      this.validate();
      this.inherited(arguments);
    },

    // When a condition is removed, remove the corresponding libraries assigned to them
    destroyLibRow: function (query_id, id_type) {
      console.log('Delete Rows');
      var query_obj = {};
      query_obj[id_type] = query_id;
      var toRemove = this.libraryStore.query(query_obj);
      toRemove.forEach(function (obj) {
        domConstruct.destroy(obj.row);
        this.decreaseRows(this.libsTable, this.addedLibs, this.numlibs);
        if (this.addedLibs.counter < this.startingRows) {
          var ntr = this.libsTable.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        obj.handle.remove();
        this.libraryStore.remove(obj.id);
      }, this);
    },

    // When a condition is removed, remove the contrasts assigned to them
    destroyContrastRow: function (query_id) {
      console.log('Delete Rows');
      var attrs = ['condition1', 'condition2'];
      attrs.forEach(function (attr) {
        var query_obj = {};
        query_obj[attr] = query_id;
        var toRemove = this.contrastStore.query(query_obj);
        toRemove.forEach(function (obj) {
          domConstruct.destroy(obj.row);
          this.decreaseRows(this.contrastTable, this.addedContrast, this.numContrastWidget);
          if (this.addedContrast.counter < this.initContrasts) {
            var ntr = this.contrastTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          this.contrastStore.remove(obj.id);
        }, this);
      }, this);
    },

    onStrategyChange: function () {
      this.onDesignToggle();
      this.validate();
    },

    onSuggestNameChange: function () {
      var curRecipe = this.recipe.value;
      if (this.genome_nameWidget.item.host) {
        var newOptions = [
          {
            label: 'Host HISAT2', value: 'Host', selected: true, disabled: false
          },
          {
            label: 'HTSeq-DESeq', value: 'HTSeq-DESeq', selected: false, disabled: true
          },
          {
            label: 'Tuxedo', value: 'cufflinks', selected: false, disabled: true
          }];
        this.recipe.set('options', newOptions).reset();
        this.recipe.set('value', 'Host');
      }
      else {
        var newOptions = [
          {
            label: 'HTSeq-DESeq', value: 'HTSeq-DESeq', selected: false, disabled: false
          },
          {
            label: 'Tuxedo', value: 'cufflinks', selected: false, disabled: false
          },
          {
            label: 'Host HISAT2', value: 'Host', selected: false, disabled: true
          }];
        this.recipe.set('options', newOptions).reset();
        if (curRecipe == 'cufflinks') {
          this.recipe.set('value', 'cufflinks');
        }
        else if (curRecipe == 'HTSeq-DESeq') {
          this.recipe.set('value', 'HTSeq-DESeq');
        }
      }
    },

    setPairedId: function () {
      var read_name = this.read1.searchBox.get('displayedValue');
      this.paired_sample_id.set('value', this.replaceInvalidChars(read_name.split('.')[0]));
    },

    onAddPair: function () {
      console.log('Create New Row', domConstruct);
      if (this.read1.get('value') == this.read2.get('value')) {
        var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }
      var lrec = { type: 'paired' };
      // If you want to disable advanced parameters while not shown this would be the place.
      // but for right now, if you set them and then hide them, they are still active
      var pairToIngest = this.exp_design.checked ? this.pairConditionToAttachPt : this.pairToAttachPt1;
      // pairToIngest=pairToIngest.concat(this.advPairToAttachPt);
      var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
      // this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
      if (chkPassed) {
        chkPassed = this.checkForInvalidChars(this.paired_sample_id.getValue());
      }
      if (chkPassed && lrec.read1 != lrec.read2) {
        var tr = this.libsTable.insertRow(0);
        lrec.row = tr;
        var td = domConstruct.create('td', { 'class': 'textcol pairdata', innerHTML: '' }, tr);
        td.libRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('paired') + '</div>';
        var advPairInfo = [];
        if (lrec.condition) {
          advPairInfo.push('Condition:' + lrec.condition);
        }
        this.addLibraryInfo(lrec, { 'read1': { 'label': this.read1.searchBox.get('displayedValue') }, 'read2': { 'label': this.read2.searchBox.get('displayedValue') } }, tr);
        if (advPairInfo.length) {
          lrec.design = true;
          var condition_icon = this.getConditionIcon(lrec.condition);
          var tdinfo = domConstruct.create('td', { 'class': 'iconcol', innerHTML: condition_icon }, tr);
          new Tooltip({
            connectId: [tdinfo],
            label: advPairInfo.join('</br>')
          });
        }
        else {
          lrec.design = false;
          var tdinfo = domConstruct.create('td', { innerHTML: '' }, tr);
        }
        var td2 = domConstruct.create('td', {
          'class': 'iconcol',
          innerHTML: "<i class='fa icon-x fa-1x' />"
        }, tr);
        if (this.addedLibs.counter < this.startingRows) {
          this.libsTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          this.destroyLib(lrec, lrec.id, 'id');
          this.validate();
        }));
        lrec.handle = handle;
        lrec.sample_id = this.paired_sample_id.get('displayedValue');
        this.createLib(lrec);
        this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
      }
      this.validate();
    },

    checkBaseParameters: function (values, assembly_values) {

      var pairedList = this.libraryStore.query({ type: 'paired' });
      var pairedAttrs = ['read1', 'read2', 'sample_id'];
      var singleAttrs = ['read', 'sample_id'];
      var srrAttrs = ['srr_accession'];
      var condList = this.conditionStore.data;
      var contrastList = this.contrastStore.data;
      var singleList = this.libraryStore.query({ type: 'single' });
      var srrList = this.libraryStore.query({ type: 'srr_accession' });
      var condLibs = [];
      var contrastPairs = [];
      console.log('assembly_values = ', assembly_values);
      var combinedList = pairedList.concat(singleList).concat(srrList);
      if (this.exp_design.checked) {
        condList.forEach(function (condRecord) {
          for (var i = 0; i < combinedList.length; i++) {
            if (combinedList[i].condition == condRecord.condition) {
              condLibs.push(condRecord.condition);
              break;
            }
          }
        });
        contrastList.forEach(function (contrastRecord) {
          contrastPairs.push([contrastRecord.condition1, contrastRecord.condition2]);
        });
        assembly_values.contrasts = contrastPairs;
      }
      else {
        assembly_values.contrasts = [];
      }
      // reads or sra TODO bam
      var check_conds = [];
      pairedList.forEach(function (libRecord) {
        var toAdd = {};
        if ('condition' in libRecord && this.exp_design.checked) {
          toAdd.condition = libRecord.condition;
          if (!check_conds.includes(libRecord.condition)) {
            check_conds.push(libRecord.condition);
          }
        }
        pairedAttrs.forEach(function (attr) {
          toAdd[attr] = libRecord[attr];
        });
        this.paired_end_libs.push(toAdd);
      }, this);
      if (this.paired_end_libs.length) {
        assembly_values.paired_end_libs = this.paired_end_libs;
      }
      singleList.forEach(function (libRecord) {
        var toAdd = {};
        if ('condition' in libRecord && this.exp_design.checked) {
          toAdd.condition = libRecord.condition;
          if (!check_conds.includes(libRecord.condition)) {
            check_conds.push(libRecord.condition);
          }
        }
        singleAttrs.forEach(function (attr) {
          toAdd[attr] = libRecord[attr];
        });
        this.single_end_libs.push(toAdd);
      }, this);
      if (this.single_end_libs.length) {
        assembly_values.single_end_libs = this.single_end_libs;
      }
      srrList.forEach(function (libRecord) {
        var toAdd = {};
        if ('condition' in libRecord && this.exp_design.checked) {
          toAdd.condition = libRecord.condition;
          if (!check_conds.includes(libRecord.condition)) {
            check_conds.push(libRecord.condition);
          }
        }
        srrAttrs.forEach(function (attr) {
          toAdd[attr] = libRecord[attr];
          if (attr === 'srr_accession') {
            toAdd['sample_id'] = libRecord[attr];
          }
        });
        this.sra_libs.push(toAdd);
      }, this);
      if (this.sra_libs.length) {
        assembly_values.srr_libs = this.sra_libs;
      }

      if (condLibs.length) {
        assembly_values.experimental_conditions = condLibs;
      }
      else {
        assembly_values.experimental_conditions = [];
      }
      if (check_conds.length != condLibs.length) {
        console.log('Error: conditions list is not correct, replacing');
        console.log('conditions_list = ', condLibs);
        console.log('should be = ', check_conds);
        assembly_values.experimental_conditions = check_conds;
      }

      // strategy (recipe)
      assembly_values.recipe = values.recipe;
      if (values.recipe === 'Host') {
        assembly_values['genome_type'] = 'host';
      }
      else {
        assembly_values['genome_type'] = 'bacteria';
      }
      /*
      if (values.recipe == 'HTSeq-DESeq') {
        assembly_values.feature_count = 'htseq';
        assembly_values.recipe = 'RNA-Rocket';
      } else if (values.recipe == 'RNA-Rocket') {
        assembly_values.feature_count = 'cufflinks';
      } else { // host
        assembly_values.feature_count = 'stringtie';
      }
      */

      // target_genome
      assembly_values.reference_genome_id = values.genome_name;
      // output_folder
      assembly_values.output_path = values.output_path;
      this.output_folder = values.output_path;
      // output_file
      assembly_values.output_file = values.output_file;
      this.output_name = values.output_file;

      // empty paired, single, and sra libs
      this.paired_end_libs = [];
      this.single_end_libs = [];
      this.sra_libs = [];

      return assembly_values;
    },

    intakeRerunForm: function () {
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        try {
          rerun_key = rerun_fields[1];
          var sessionStorage = window.sessionStorage;
          if (sessionStorage.hasOwnProperty(rerun_key)) {
            var param_dict = { 'output_folder': 'output_path', 'strategy': 'recipe', 'target_genome_id': 'reference_genome_id' };
            var widget_map = { 'reference_genome_id': 'genome_nameWidget' };
            param_dict['widget_map'] = widget_map;
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            job_data = this.formatRerunJson(job_data);
            this.checkConditionsFormFill(job_data);
            this.checkContrastsFormFill(job_data);
            if (Object.keys(job_data).includes('reference_genome_id')) {
              this.genome_nameWidget.set('value', job_data['reference_genome_id']);
            }
            // TODO: check conditions/library pairing
            job_data = this.addConditionInfoFormFill(job_data);
            AppBase.prototype.loadLibrary.call(this, job_data, param_dict);
            this.form_flag = true;
          }
        }
        catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        }
        finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    // Sometimes RNASeq jobs put single ends reads into paired_end_libs
    // This function puts all reads from paired_end_libs with 1 read into single_end_libs
    formatRerunJson: function (job_data) {
      if (!job_data.paired_end_libs) {
        job_data.paired_end_libs = [];
      }
      if (!job_data.single_end_libs) {
        job_data.single_end_libs = [];
      }
      for (var x = job_data.paired_end_libs.length - 1; x >= 0; x--) {
        var paired_record = job_data.paired_end_libs[x];
        if (paired_record.hasOwnProperty('read1') && !paired_record.hasOwnProperty('read2')) {
          if (!job_data.hasOwnProperty('single_end_libs')) {
            job_data.single_end_libs = [];
          }
          var single_record = paired_record;
          single_record['read'] = paired_record['read1'];
          delete single_record['read1'];
          job_data.single_end_libs.push(single_record);
          job_data.paired_end_libs.splice(x, 1);
        }
      }
      if (!job_data.hasOwnProperty('srr_libs')) {
        job_data.srr_libs = [];
      }
      if (!job_data.hasOwnProperty('sra_libs')) {
        job_data['sra_libs'] = job_data.srr_libs;
      }
      return job_data;
    },

    // /add icon information
    addConditionInfoFormFill: function (job_data) {
      var conditions = job_data.experimental_conditions;
      // paired libs
      for (var x = 0; x < job_data.paired_end_libs.length; x++) {
        var curr_reads = job_data.paired_end_libs[x];
        if (curr_reads.hasOwnProperty('condition')) {
          var curr_cond = curr_reads['condition'];
          job_data.paired_end_libs[x].icon = this.getConditionIcon(curr_cond);
          job_data.paired_end_libs[x].condition = curr_cond;
        }
      }
      // single libs
      for (var x = 0; x < job_data.single_end_libs.length; x++) {
        var curr_read = job_data.single_end_libs[x];
        if (curr_read.hasOwnProperty('condition')) {
          var curr_cond = curr_read['condition'];
          job_data.single_end_libs[x].icon = this.getConditionIcon(curr_cond);
          job_data.single_end_libs[x].condition = curr_cond;
        }
      }
      // sra library
      for (var x = 0; x < job_data.srr_libs.length; x++) {
        var curr_srr = job_data.srr_libs[x];
        if (curr_srr.hasOwnProperty('condition')) {
          var curr_cond = curr_srr['condition'];
          job_data.srr_libs[x].icon = this.getConditionIcon(curr_cond);
          job_data.srr_libs[x].condition = curr_cond;
        }
      }
      return job_data;
    },

    checkConditionsFormFill: function (job_data) {
      if (job_data['experimental_conditions'].length > 0) {
        this.exp_design.checked = true;
        this.exp_design.value = this.exp_design.checked ? 'on' : 'off';
        this.onDesignToggle();
        var condition_counts = this.getConditionCounts(job_data);
        // for each
        job_data['experimental_conditions'].forEach(function (cond) {
          var lrec = { count: condition_counts[cond], type: 'condition', condition: cond };
          lrec.icon = this.getConditionIcon();
          lrec.id = cond;
          lrec._id = cond;
          if (this.addedCond.counter < this.maxConditions) {
            this.updateConditionStore(lrec, false);
            this.updateContrasts();
          }
          var tr = this.condTable.insertRow(0);
          var td = domConstruct.create('td', { 'class': 'textcol conditiondata', innerHTML: '' }, tr);
          td.libRecord = lrec;
          td.innerHTML = "<div class='libraryrow'>" + lrec.condition + '</div>';
          domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon }, tr);
          var td2 = domConstruct.create('td', {
            'class': 'iconcol',
            innerHTML: "<i class='fa icon-x fa-1x' />"
          }, tr);
          if (this.addedCond.counter < this.initConditions) {
            this.condTable.deleteRow(-1);
          }

          var handle = on(td2, 'click', lang.hitch(this, function (evt) {
            console.log('Delete Row');
            domConstruct.destroy(tr);
            this.destroyLib(lrec, lrec.condition, 'condition');
            var query_id = lrec['condition']
            this.destroyContrastRow(query_id);
            this.updateConditionStore(lrec, true);
            this.decreaseRows(this.condTable, this.addedCond, this.numCondWidget);
            if (this.addedCond.counter < this.maxConditions) {
              var ntr = this.condTable.insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            this.condition_single.reset();
            this.condition_srr.reset();
            this.condition_paired.reset();
            handle.remove();
          }));
          this.increaseRows(this.condTable, this.addedCond, this.numCondWidget);
        }, this);
      }
    },

    checkContrastsFormFill: function (job_data) {
      // var disable = !this.exp_design.checked;
      // var contrastSize = this.contrastStore.data.length;
      var conditions = job_data['experimental_conditions'];
      job_data['contrasts'].forEach(function (contrast) {
        var curr_contrast = contrast;
        var condition1 = curr_contrast[0];
        var condition2 = curr_contrast[1];
        // var condition1 = ''+curr_contrast[0];
        // var condition2 = ''+curr_contrast[1];
        var lrec = { type: 'contrast' };
        lrec.condition1 = condition1;
        lrec.condition2 = condition2;
        lrec.icon1 = this.getConditionIcon(condition1);
        lrec.icon2 = this.getConditionIcon(condition2);
        if (this.addedContrast.counter < this.maxContrasts) {
          this.updateContrastStore(lrec, false);
        }
        var tr = this.contrastTable.insertRow(0);
        lrec.row = tr;
        lrec._row = tr;

        var td_cd1 = domConstruct.create('td', { 'class': 'conditiondata', innerHTML: '' }, tr);
        td_cd1.innerHTML = "<div class='contrastrow'>" + this.makeConditionName(condition1) + '</div>';
        domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon1 }, tr);

        var td_cd2 = domConstruct.create('td', { 'class': 'conditiondata', innerHTML: '' }, tr);
        td_cd2.innerHTML = "<div class='contrastrow'>" + this.makeConditionName(condition2) + '</div>';
        domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon2 }, tr);

        var tdx = domConstruct.create('td', { 'class': 'iconcol', innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedContrast.counter < this.initContrasts) {
          this.contrastTable.deleteRow(-1);
        }

        var handle = on(tdx, 'click', lang.hitch(this, function (evt) {
          console.log('Delete Row');
          domConstruct.destroy(tr);
          this.updateContrastStore(lrec, true);
          this.decreaseRows(this.contrastTable, this.addedContrast, this.numContrastWidget);
          if (this.addedContrast.counter < this.maxContrasts) {
            var ntr = this.condTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
          this.destroyContrastRow(lrec.contrast, 'contrast');
        }));
        this.increaseRows(this.contrastTable, this.addedContrast, this.numContrastWidget);
      }, this);
    },

    getConditionCounts: function (job_data) {
      var counts = {};
      var conditions = job_data['experimental_conditions'];
      conditions.forEach(function (cond) {
        counts[cond] = 0;
      });
      var offset = 1;
      var combinedList = job_data.paired_end_libs.concat(job_data.single_end_libs).concat(job_data.sra_libs);
      for (var x = 0; x < combinedList.length; x++) {
        var curr_lib = combinedList[x];
        counts[conditions[curr_lib['condition']]]++;
      }
      return counts;
    }

  });
});
