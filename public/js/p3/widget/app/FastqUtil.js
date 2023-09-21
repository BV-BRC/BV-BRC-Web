define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/FastqUtil.html', './AppBase', 'dojo/dom-construct',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby',
  'dojox/xml/parser', 'dojo/request', '../../DataAPI'
], function (
  declare, WidgetBase, Topic, on,
  domClass,
  Template, AppBase, domConstruct,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog,
  children, WorkspaceManager, Memory, Standby,
  xmlParser, xhr, DataAPI
) {
  return declare([AppBase], {
    baseClass: 'App Fastq',
    templateString: Template,
    applicationName: 'FastqUtils',
    requireAuth: true,
    applicationLabel: 'Fastq Utilities',
    applicationDescription: 'The Fastq Utilites Service provides capability for aligning, measuring base call quality, and trimmiing fastq read files.',
    applicationHelp: 'quick_references/services/fastq_utilities_service.html',
    tutorialLink: 'tutorial/fastq_utilities/fastq_utilities.html',
    videoLink: 'https://youtube.com/playlist?list=PLWfOyhOW_Oas1LLS2wRlWzilruoSxVeJw',
    pageTitle: 'Fastq Utilities Service | BV-BRC',
    libraryData: null,
    defaultPath: '',
    startingRows: 12,
    initConditions: 5,
    maxConditions: 5,
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
      // these objects map dojo attach points to desired alias for ingestAttachPoint function
      // key is attach point array of values is alias
      // if there is no alias the key in the resulting object will be the same name as attach point
      this.pairToAttachPt1 = { read1: null, read2: null };
      this.pairConditionToAttachPt = { read1: null, read2: null, condition_paired: ['condition'] };
      this.advPairToAttachPt = { interleaved: null, insert_size_mean: null, insert_size_stdev: null };
      this.paramToAttachPt = { output_path: null, output_file: null };
      this.singleToAttachPt = { read: null };
      this.singleConditionToAttachPt = { read: null, condition_single: ['condition'] };
      this.srrToAttachPt = { srr_accession: null };
      this.srrConditionToAttachPt = { srr_accession: null, condition_srr: ['condition'] };
      this.conditionToAttachPt = { action_select: ['condition', 'label'] };
      this.targetGenomeID = '';
      this.shapes = ['icon-square', 'icon-circle'];
      this.colors = ['blue', 'green', 'red', 'purple', 'orange'];
      this.color_counter = 0;
      this.shape_counter = 0;
      this.conditionStore = new Memory({ data: [] });
      this.activeConditionStore = new Memory({ data: [] }); // used to store conditions with more than 0 libraries assigned
      this.libraryStore = new Memory({ data: [], idProperty: 'id' });
      this.libraryID = 0;
      this.numAlign = 0;
      this.num_action = 0;
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

      // adjust validation for each of the attach points associated with read files
      Object.keys(this.pairToAttachPt1).concat(Object.keys(this.singleToAttachPt)).forEach(lang.hitch(this, function (attachname) {
        this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function (/* anything */ value, /* __Constraints */ constraints) {
          return (new RegExp('^(?:' + this._computeRegexp(constraints) + ')' + (this.required ? '' : '?') + '$')).test(value) &&
            (!this._isEmpty(value)) &&
            (this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
        });
      }));
      // for initial rollout use two conditions. this will change when contrasts are specified and the condition table comes back
      var trim = {
        id: 'trim', condition: 'trim', label: 'Trim', icon: this.getConditionIcon()
      };
      var fastqc = {
        id: 'fastqc', condition: 'fastqc', label: 'FastQC', icon: this.getConditionIcon()
      };
      var align = {
        id: 'align', condition: 'align', label: 'Align', icon: this.getConditionIcon()
      };
      var filter = {
        id: 'paired_filter', condition: 'paired_filter', label: 'Paired_Filter', icon: this.getConditionIcon()
      };
      // temporary until contrasts table added
      this.updateConditionStore(trim, false);
      this.updateConditionStore(filter, false);
      this.updateConditionStore(fastqc, false);
      this.updateConditionStore(align, false);
      this.action_select.labelFunc = this.showConditionLabels;
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
        var localStorage = window.localStorage;
        if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
          localStorage.removeItem('bvbrc_rerun_job');
        }
      }
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
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
      var condList = this.activeConditionStore.data;
      var condLibs = [];
      // var pairedLibs = [];
      // var singleLibs = [];
      condList.forEach(function (condRecord) {
        condLibs.push(condRecord.condition);
      });
      if (condLibs.length) {
        assembly_values.recipe = condLibs;
      }
      if (!this.form_flag) {
        this.ingestAttachPoints(this.paramToAttachPt, assembly_values);
      }
      // for (var k in values) {
      //   if(!k.startsWith("libdat_")){
      //     assembly_values[k]=values[k];
      //   }
      // }
      assembly_values = this.checkBaseParameters(values, assembly_values);
      return assembly_values;

    },
    // gets values from dojo attach points listed in input_ptsi keys.
    // aliases them to input_pts values.  validates all values present if req
    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      var prevalidate_ids = ['read1', 'read2', 'read', 'output_path', 'action_select', 'action_store', 'srr_accession'];
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
        else if (attachname == 'action_select') {
          cur_value = this[attachname].displayedValue;// ? "/_uuid/"+this[attachname].searchBox.value : "";
          if (cur_value == 'Align') {
            this.numAlign += 1;
            this.toggleGenome();
          }
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
      var label = item.condition;
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
      else if (mode == 'action_store') {
        var fn = this.action_select.displayedValue;
        return fn;
      }
      else if (mode == 'action_select') {
        this.num_action += 1;
        var fn = this.action_select.displayedValue + String(this.num_action);
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
      var condRows = this.condTable.rows.length;
      this.activeConditionStore = new Memory({ data: [] });
      for (var i = 0; i < condRows; i++) {
        this.condTable.deleteRow(0);
      }
      this.emptyTable(this.condTable, this.initConditions, 3);
      this.addedCond = { counter: 0 };
      this.numAlign = 0;
      this.toggleGenome();
      var toDestroy = [];
      this.libraryStore.data.forEach(lang.hitch(this, function (lrec) {
        toDestroy.push(lrec.id);
      }));
      // because its removing rows cells from array needs separate loop
      toDestroy.forEach(lang.hitch(this, function (id) {
        this.destroyLib({}, id, 'id');
      }));
      this.libraryStore = new Memory({ data: [], idProperty: 'id' });
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

    toggleGenome: function () {
      if (this.numAlign > 0) {
        this.genome_nameWidget.set('disabled', false);
        this.genome_nameWidget.set('required', true);
      }
      else {
        this.genome_nameWidget.set('disabled', true);
        this.genome_nameWidget.set('required', false);
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

    onAddCondition: function () {
      console.log('Create New Row', domConstruct);
      var lrec = { count: 0, type: 'action_select' }; // initialized to the number of libraries assigned
      var toIngest = this.conditionToAttachPt;
      var disable = false;
      var chkPassed = this.ingestAttachPoints(toIngest, lrec);
      var conditionSize = this.activeConditionStore.data.length;
      if (this.addedCond.counter < this.maxConditions) {
        this.updateActiveStore(lrec, false);
      }
      // make sure all necessary fields, not disabled, available condition slots, and checking conditionSize checks dups
      if (chkPassed && !disable && this.addedCond.counter < this.maxConditions && conditionSize < this.activeConditionStore.data.length) {
        lrec.icon = this.getConditionIcon();
        if (this.addedCond.counter < this.initConditions) {
          this.condTable.deleteRow(0);
        }
        var tr = this.condTable.insertRow();
        var td = domConstruct.create('td', { 'class': 'textcol conditiondata', innerHTML: '' }, tr);
        td.libRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeConditionName(this.action_select.get('displayedValue')) + '</div>';
        domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon }, tr);
        var td2 = domConstruct.create('td', {
          'class': 'iconcol',
          innerHTML: "<i class='fa icon-x fa-1x' />"
        }, tr);

        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          console.log('Delete Row');
          domConstruct.destroy(tr);
          this.destroyLib(lrec, lrec.condition, 'condition');
          if (lrec.condition == 'Align') {
            this.numAlign -= 1;
            this.toggleGenome();
          }
          // this.destroyContrastRow(query_id = lrec["condition"]);
          this.updateActiveStore(lrec, true);
          this.decreaseRows(this.condTable, this.addedCond, this.numCondWidget);
          if (this.addedCond.counter < this.maxConditions) {
            var ntr = this.condTable.insertRow(0);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          this.action_select.reset();
          handle.remove();
        }));
        this.increaseRows(this.condTable, this.addedCond, this.numCondWidget);
      }
    },

    updateActiveStore: function (record, remove) {
      // if there is no real condition specified return
      if (!record.condition.trim()) {
        return;
      }
      if (remove) {
        var toRemove = this.activeConditionStore.query({ id: record.id });
        // remove condition from data store
        toRemove.forEach(function (obj) {
          if (obj.libraries) {
            obj.libraries.forEach(function (lib_row) {
              lib_row.remove();
            });
          }
          this.activeConditionStore.remove(obj.id);
        }, this);
      }
      else {
        this.activeConditionStore.put(record);
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
      this.action_select.set('store', this.conditionStore);
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
    },

    onAddSingle: function () {
      console.log('Create New Row', domConstruct);
      var lrec = { type: 'single' };
      var toIngest = this.singleToAttachPt;
      var chkPassed = this.ingestAttachPoints(toIngest, lrec);
      if (chkPassed) {
        var tr = this.libsTable.insertRow(0);
        lrec.row = tr;
        var td = domConstruct.create('td', { 'class': 'textcol singledata', innerHTML: '' }, tr);
        // td.libRecord=lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName('single') + '</div>';
        var advPairInfo = [];
        if (lrec.condition) {
          advPairInfo.push('Condition:' + lrec.condition);
        }
        var platform = this.platform_select.get("value");
        lrec.platform = platform;
        this.addLibraryInfo(lrec, { 'read': { 'label': this.read.searchBox.get('displayedValue') }, "platform": {'label': platform} }, tr);
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
        }));
        lrec.handle = handle;
        this.createLib(lrec);
        this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
      }
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

    onSuggestNameChange: function () {
      if (this.genome_nameWidget.value in this.hostGenomes) {
        console.log('Host Genome');
      }
    },

    onAddPair: function () {
      console.log('Create New Row', domConstruct);
      if (this.read1.searchBox.get('value') == this.read2.searchBox.get('value')) {
        var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
        new Dialog({ title: 'Notice', content: msg }).show();
        return;
      }
      var lrec = { type: 'paired' };
      // If you want to disable advanced parameters while not shown this would be the place.
      // but for right now, if you set them and then hide them, they are still active
      var pairToIngest = this.pairToAttachPt1;
      // pairToIngest=pairToIngest.concat(this.advPairToAttachPt);
      var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
      // this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
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
        }));
        lrec.handle = handle;
        this.createLib(lrec);
        this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
      }
    },

    checkBaseParameters: function (values, assembly_values) {
      // reads,sra
      var pairedList = this.libraryStore.query({ type: 'paired' });
      var pairedAttrs = ['read1', 'read2'];
      var singleAttrs = ['read', 'platform'];
      var srrAttrs = ['srr_accession'];
      var singleList = this.libraryStore.query({ type: 'single' });
      var srrList = this.libraryStore.query({ type: 'srr_accession' });
      assembly_values.reference_genome_id = values.genome_name;

      pairedList.forEach(function (libRecord) {
        var toAdd = {};
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
        srrAttrs.forEach(function (attr) {
          toAdd[attr] = libRecord[attr];
        });
        this.sra_libs.push(toAdd);
      }, this);
      if (this.sra_libs.length) {
        assembly_values.srr_libs = this.sra_libs;
      }
      // strategy = pipeline
      this.strategy = assembly_values.recipe;
      // output_folder
      this.output_folder = values.output_path;
      assembly_values.output_path = values.output_path;
      // output_name
      this.output_name = values.output_file;
      assembly_values.output_file = values.output_file;
      // target_genome
      assembly_values.reference_genome_id = values.genome_name;
      this.target_genome_id = assembly_values.reference_genome_id;

      // empty paired, single, and sra libs
      this.paired_end_libs = [];
      this.single_end_libs = [];
      this.sra_libs = [];

      return assembly_values;
    },

    // TODO: align to genome not filling in genome
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
            var param_dict = { 'output_folder': 'output_path' };
            var widget_map = { 'reference_genome_id': 'genome_nameWidget' };
            param_dict['widget_map'] = widget_map;
            var job_data = this.formatRerunJson(JSON.parse(sessionStorage.getItem(rerun_key)));
            this.checkConditionsFormFill(job_data);
            AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            AppBase.prototype.loadLibrary.call(this, job_data, param_dict);
            this.addJobParams(job_data);
            this.form_flag = true;
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
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
      if (!job_data.srr_libs) {
        job_data.srr_libs = [];
      }
      if (!job_data.hasOwnProperty('sra_libs')) {
        job_data.sra_libs = job_data.srr_libs;
      }
      return job_data;
    },

    addJobParams: function (job_data) {
      if (job_data['recipe'].includes('Align')) {
        var query = 'eq(genome_id,' + job_data['reference_genome_id'] + ')';
        DataAPI.queryGenomes(query).then(lang.hitch(this, function (res) {
          var genome = res.items[0];
          this.genome_nameWidget.set('value', genome.genome_id);
        }));
      }
    },

    checkConditionsFormFill: function (job_data) {
      for (var x = 0; x < job_data.recipe.length; x++) {
        var curr_recipe = job_data.recipe[x];
        var lrec = { count: 0, type: 'action_select', condition: curr_recipe }; // initialized to the number of libraries assigned
        console.log('Create New Row', domConstruct);
        if (this.addedCond.counter < this.maxConditions) {
          this.updateActiveStore(lrec, false);
        }
        lrec.icon = this.getConditionIcon();
        if (this.addedCond.counter < this.initConditions) {
          this.condTable.deleteRow(0);
        }
        var tr = this.condTable.insertRow();
        var td = domConstruct.create('td', { 'class': 'textcol conditiondata', innerHTML: '' }, tr);
        td.libRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeConditionName(lrec.condition) + '</div>';
        domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon }, tr);
        var td2 = domConstruct.create('td', {
          'class': 'iconcol',
          innerHTML: "<i class='fa icon-x fa-1x' />"
        }, tr);

        if (lrec.condition == 'Align') {
          this.numAlign += 1;
          this.toggleGenome();
        }

        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          console.log('Delete Row');
          domConstruct.destroy(tr);
          this.destroyLib(lrec, lrec.condition, 'condition');
          if (lrec.condition == 'Align') {
            this.numAlign -= 1;
            this.toggleGenome();
          }
          // this.destroyContrastRow(query_id = lrec["condition"]);
          this.updateActiveStore(lrec, true);
          this.decreaseRows(this.condTable, this.addedCond, this.numCondWidget);
          if (this.addedCond.counter < this.maxConditions) {
            var ntr = this.condTable.insertRow(0);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          this.action_select.reset();
          handle.remove();
        }));
        this.increaseRows(this.condTable, this.addedCond, this.numCondWidget);
      }
    }
  });
});
