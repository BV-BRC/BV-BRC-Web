define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/Assembly2.html', 'dojo/NodeList-traverse', 'dojo/store/Memory',
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
    baseClass: 'App Assembly2',
    pageTitle: 'Genome Assembly Service',
    templateString: Template,
    applicationName: 'GenomeAssembly2',
    requireAuth: true,
    applicationLabel: 'Genome Assembly',
    applicationDescription: 'The Genome Assembly Service allows single or multiple assemblers to be invoked to compare results. The service attempts to select the best assembly.',
    applicationHelp: 'quick_references/services/genome_assembly_service.html',
    tutorialLink: 'tutorial/genome_assembly/assembly.html',
    videoLink: '',
    libraryData: null,
    defaultPath: '',
    startingRows: 13,
    libCreated: 0,

    constructor: function () {
      this.addedLibs = { counter: 0 };
      this.addedPairs = 0;
      this.pairToAttachPt1 = ['read1', 'read2'];
      this.pairToAttachPt2 = ['read1'];
      this.advPairToAttachPt = ['interleaved', 'read_orientation_outward', 'paired_platform'];
      this.paramToAttachPt = ['recipe', 'output_path', 'output_file', 'genome_size'];
      this.singleToAttachPt = ['single_end_libsWidget'];
      this.advSingleToAttachPt = ['single_platform'];
      this.libraryStore = new Memory({ data: [], idProperty: '_id' });
    },
    // checkOutputName function is in AppBase.js
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
      // create help dialog for infobutton's with infobuttoninfo div's
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
      this.pairToAttachPt1.concat(this.singleToAttachPt).forEach(lang.hitch(this, function (attachname) {
        this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function (/* anything */ value, /* __Constraints */ constraints) {
          return (new RegExp('^(?:' + this._computeRegexp(constraints) + ')' + (this.required ? '' : '?') + '$')).test(value) &&
            (!this._isEmpty(value)) &&
            (this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
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
      var assembly_values = {};
      var values = this.inherited(arguments);

      // Generic JSON parameters are added to assembly values in this function
      assembly_values = this.checkBaseParameters(values, assembly_values);

      if (!this.form_flag) {
        this.ingestAttachPoints(this.paramToAttachPt, assembly_values, true);
      }
      if (Object.prototype.hasOwnProperty.call(values, 'racon_iter') && values.racon_iter) {
        assembly_values.racon_iter = values.racon_iter;
      }
      if (Object.prototype.hasOwnProperty.call(values, 'pilon_iter') && values.pilon_iter) {
        assembly_values.pilon_iter = values.pilon_iter;
      }
      if (Object.prototype.hasOwnProperty.call(values, 'trim') && values.trim) {
        assembly_values.trim = (values.trim[0] === 'on');
      }
      if (Object.prototype.hasOwnProperty.call(values, 'normalize') && values.normalize) {
        assembly_values.normalize = (values.normalize[0] === 'on');
      }
      if (Object.prototype.hasOwnProperty.call(values, 'min_contig_len') && values.min_contig_len) {
        assembly_values.min_contig_len = values.min_contig_len;
      }
      if (Object.prototype.hasOwnProperty.call(values, 'min_contig_cov') && values.min_contig_cov) {
        assembly_values.min_contig_cov = values.min_contig_cov;
      }
      return assembly_values;
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
      // console.log("Create New Row", domConstruct);
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
      // If you want to disable advanced parameters while not shown this would be the place.
      // but for right now, if you set them and then hide them, they are still active
      var pairToIngest = this.interleaved.turnedOn ? this.pairToAttachPt2 : this.pairToAttachPt1;
      // pairToIngest=pairToIngest.concat(this.advPairToAttachPt);
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

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkOutputName: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    onRecipeChange: function () {
      if (this.recipe.value == 'canu') {
        this.genome_size_block.style.display = 'block';
        this.checkParameterRequiredFields();
      }
      else {
        this.genome_size_block.style.display = 'none';
        this.checkParameterRequiredFields();
      }
    },

    checkBaseParameters: function (values, assembly_values) {
      var pairedList = this.libraryStore.query({ _type: 'paired' });
      var singleList = this.libraryStore.query({ _type: 'single' });
      var srrAccessionList = this.libraryStore.query({ _type: 'srr_accession' });

      // TODO: standardize data type or define for each service??
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
        assembly_values.paired_end_libs = this.paired_end_libs;
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
        assembly_values.single_end_libs = this.single_end_libs;
      }
      this.sra_libs = srrAccessionList.map(function (lrec) {
        return lrec._id;
      });
      if (this.sra_libs.length) {
        assembly_values.srr_ids = this.sra_libs;
      }

      // recipe
      this.strategy = values.recipe;
      assembly_values.recipe = values.recipe;
      // output_path and output_file
      assembly_values.output_path = values.output_path;
      this.output_folder = values.output_path;
      assembly_values.output_file = values.output_file;
      this.output_name = values.output_file;

      return assembly_values;
    },

    setRecipe: function (recipe) {
      console.log('recipe = ', recipe);
      this.recipe.set('value', recipe);
    },

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
            var param_dict = { 'output_folder': 'output_path' };
            var widget_map = { 'single_end_libs': 'single_end_libsWidget' }; // TODO: remove this line?
            param_dict['widget_map'] = widget_map;
            var service_spec = {
              'trim': 'trim', 'min_contig_len': 'min_contig_len', 'racon_iter': 'racon_iter', 'pilon_iter': 'pilon_iter', 'min_contig_cov': 'min_contig_cov'
            }; // job : attach_point
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
      return job_data;
    }
  });
});
