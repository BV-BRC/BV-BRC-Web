require({cache:{
'url:p3/widget/app/templates/MetagenomicReadMapping.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit\">\n  <div class=\"appTemplate\">\n    <div class=\"appTitle\">\n      <span class=\"breadcrumb\">Services</span>\n      <h3>${applicationLabel}\n        <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n          <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n        </div>\n        <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n          <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n        </div>\n      </h3>\n      <p>${applicationDescription} For further explanation, please see <a href=\"${docsServiceURL}${applicationHelp}\" target=\"_blank\">${applicationLabel} Service User Guide</a> and\n        <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\">Tutorial</a>.\n      </p>\n    </div>\n    <div class=\"formFieldsContainer\">\n      <div style=\"display: none;\">\n        <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\" data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\" />\n      </div>\n      <table data-dojo-attach-point=\"readTable\" style=\"width:100%\">\n        <tr>\n          <td>\n            <div id=\"pairedBox\" class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\">Input File</label>\n                  <div name=\"input-file\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                  </div>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"paramlabel\">Paired read library</label>\n                </div>\n                <div style=\"width:10%;display:inline-block;\">\n                  <i data-dojo-attach-event=\"click:onAddPair\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\" data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE 1'\"></div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-attach-point=\"read2block\">\n                  <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\" data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE 2'\"></div>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"paramlabel\">Single read library</label>\n                </div>\n                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSingle\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_readfile\" data-dojo-attach-point=\"single_end_libs\" style=\"width:285px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE'\"></div>\n              </div>\n              <div class=\"appRow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"paramlabel\">SRA run accession</label> <i data-dojo-attach-point=\"srr_accession_validation_message\"></i>\n                </div>\n                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSRR\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-type=\"dijit/form/ValidationTextBox\" data-dojo-attach-point=\"srr_accession\" style=\"width: 300px\" required=\"false\" data-dojo-props=\"intermediateChanges:true, missingMessage:'You must provide an accession', trim:true, placeHolder:'SRR'\"></div>\n              </div>\n            </div>\n          </td>\n          <td>\n            <div class=\"appBox appShadow\" style=\"height:213px; width:330px\">\n              <div class=\"headerrow\">\n                <label class=\"appBoxLabel\">Selected libraries</label>\n                <div name=\"selected-libraries\" class=\"infobox iconbox infobutton tooltipinfo\">\n                  <i class=\"fa icon-question-circle fa\"></i>\n                </div>\n                <br>\n                <div class=\"appsublabel\">Place read files here using the arrow buttons.</div>\n              </div>\n              <div class=\"appRow\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\" style=\"margin:0 0 0 10px; width:90%;\">\n                  <tbody data-dojo-attach-point=\"libsTableBody\">\n                  </tbody>\n                </table>\n              </div>\n            </div>\n          </td>\n        </tr>\n      </table>\n      <div id=\"parameterBox\" style=\"width:400px; \" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <div style=\"width:85%;display:inline-block;\">\n            <label class=\"appBoxLabel\">Parameters</label>\n            <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n        </div>\n        <div class=\"appRow\" style=\"display:none\">\n          <label class=\"paramlabel\">Gene Set Type</label><br>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"geneSetTypePredefinedList\" name=\"gene_set_type\" value=\"predefined_list\" checked />\n          <label for=\"radio1\">Predefined List</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"geneSetTypeFastaFile\" name=\"gene_set_type\" value=\"fasta_file\" data-dojo-attach-event=\"onChange:onGeneSetTypeChange\" />\n          <label for=\"radio2\">Fasta File</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"geneSetTypeFeatureGroup\" name=\"gene_set_type\" value=\"feature_group\" data-dojo-attach-event=\"onChange:onGeneSetTypeChange\" />\n          <label for=\"radio3\">Feature Group</label>\n        </div>\n        <div data-dojo-attach-point = \"geneSetTypeBox\">\n        <div class=\"appRow\">\n            <label class=\"paramlabel\">Predefined Gene Set Name</label><br>\n            <select data-dojo-type=\"dijit/form/Select\" data-dojo-attach-point=\"gene_set_name\" name=\"gene_set_name\" style=\"width:150px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,trim:true\">\n              <option value=\"CARD\">CARD</option>\n              <option value=\"VFDB\">VFDB</option>\n            </select>\n          </div>\n        </div>\n        <div data-dojo-attach-point = \"geneSetFastaWidgetBox\" style=\"display:none\">\n          <div class=\"appRow\">\n            <label class=\"paramlabel\">Gene Set Fasta</label><br>\n            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"gene_set_fasta\" name=\"gene_set_fasta\" required=\"false\"  data-dojo-props=\"type:['feature_protein_fasta'],multi:false,promptMessage:'Select or Upload protein fasta file to your workspace', placeHolder:''\"></div>\n          </div>\n        </div>\n        <div data-dojo-attach-point = \"geneSetFeaturegroupWidgetBox\" style=\"display:none\">\n          <div class=\"appRow\">\n          <label class=\"paramlabel\">Gene Set Feature Group</label><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"gene_set_feature_group\" name=\"gene_set_feature_group\" required=\"false\"  data-dojo-props=\"type:['feature_group'],multi:false,promptMessage:'Select a feature group from your workspace', placeHolder:''\"></div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Output Folder</label><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"output_path\" name=\"output_path\"  data-dojo-attach-event=\"onChange:onOutputPathChange\" style=\"width:100%\" required=\"true\" data-dojo-props=\"title:'Select an Output Folder',autoSelectCurrent:true,selectionText:'Destination',type:['folder'],multi:false\"></div>\n        </div>\n        <div class=\"appRow\">\n            <label class=\"paramlabel\">Output Name</label><br>\n            <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" data-dojo-attach-point=\"outputFileWidget\" name=\"output_file\"   style=\"width:380px\" required=\"true\" data-dojo-props=\"promptMessage:'The output name for your Mapping Results',missingMessage:'Output Name must be provided.',trim:true,placeHolder:'Output Name'\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"appSubmissionArea\">\n      <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n        Submitting Metagenomic Read Mapping Job\n      </div>\n      <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n        Error Submitting Job\n      </div>\n      <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n        Metagenomic Read Mapping Job has been queued.\n      </div>\n      <div style=\"margin-top: 10px; text-align:center;\">\n        <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n        <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n      </div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/MetagenomicReadMapping", [
  'dojo/_base/declare', 'dojo/_base/array', 'dijit/_WidgetBase', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/MetagenomicReadMapping.html', 'dojo/NodeList-traverse', 'dojo/store/Memory',
  'dojox/xml/parser',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  './AppBase', '../../WorkspaceManager'
], function (
  declare, array, WidgetBase, lang, Deferred,
  on, xhr, domClass, domConstruct,
  Template, children, Memory,
  xmlParser,
  popup, TooltipDialog, Dialog,
  AppBase, WorkspaceManager
) {

  return declare([AppBase], {
    baseClass: 'App Assembly2',
    pageTitle: 'Metagenomic Read Mapping Service',
    templateString: Template,
    applicationName: 'MetagenomicReadMapping',
    requireAuth: true,
    applicationLabel: 'Metagenomic Read Mapping',
    applicationDescription: 'The Metagenomic Read Mapping Service uses KMA to align reads against antibiotic resistance genes from CARD and virulence factors from VFDB.',
    applicationHelp: 'user_guides/services/metagenomic_read_mapping_service.html',
    tutorialLink: 'tutorial/metagenomic_read_mapping/metagenomic_read_mapping.html',
    defaultPath: '',
    startingRows: 6,
    libCreated: 0,
    geneSetType: null,
    srrValidationUrl: 'https://www.ebi.ac.uk/ena/data/view/{0}&display=xml',
    required: true,

    constructor: function () {
      this.addedLibs = { counter: 0 };
      this.pairToAttachPt = ['read1', 'read2'];
      this.singleToAttachPt = ['single_end_libs'];
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
        if (attachname == 'read1' || attachname == 'read2' || attachname == 'single_end_libs') {
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
        if (attachname == 'single_end_libs') {
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
          var fn = this.single_end_libs.searchBox.get('displayedValue');
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
          var fn = this.single_end_libs.searchBox.get('value');
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

      // SRR5121082
      this.srr_accession.set('disabled', true);
      this.srr_accession_validation_message.innerHTML = ' Validating ' + accession + ' ...';
      xhr.get(lang.replace(this.srrValidationUrl, [accession]), {})
        .then(lang.hitch(this, function (xml_resp) {
          var resp = xmlParser.parse(xml_resp).documentElement;
          this.srr_accession.set('disabled', false);
          try {
            var title = resp.children[0].childNodes[3].innerHTML;
            this.srr_accession_validation_message.innerHTML = '';
            var lrec = { _type: 'srr_accession', title: title };
            var chkPassed = this.ingestAttachPoints(['srr_accession'], lrec);
            if (chkPassed) {
              var infoLabels = {
                title: { label: 'Title', value: 1 }
              };
              this.addLibraryRow(lrec, infoLabels, 'srrdata');
            }
          } catch (e) {
            this.srr_accession_validation_message.innerHTML = ' Your input ' + accession + ' is not valid';
            this.srr_accession.set('value', '');
          }
        }));
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
      if (this.output_path.get('value') && this.outputFileWidget.get('displayedValue') ) {
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

    onGeneSetTypeChange: function () {
      if (this.geneSetTypePredefinedList.checked) {
        this.geneSetTypeBox.style.display = 'block';
        this.geneSetFastaWidgetBox.style.display = 'none';
        this.geneSetFeaturegroupWidgetBox.style.display = 'none';
        this.gene_set_fasta.set('required', false);
        this.gene_set_feature_group.set('required', false);
        this.checkParameterRequiredFields();
      }
      if (this.geneSetTypeFastaFile.checked) {
        this.geneSetTypeBox.style.display = 'none';
        this.geneSetFastaWidgetBox.style.display = 'block';
        this.geneSetFeaturegroupWidgetBox.style.display = 'none';
        this.gene_set_fasta.set('required', true);
        this.gene_set_feature_group.set('required', false);
        this.checkParameterRequiredFields();
      }
      if (this.geneSetTypeFeatureGroup.checked) {
        this.geneSetTypeBox.style.display = 'none';
        this.geneSetFastaWidgetBox.style.display = 'none';
        this.geneSetFeaturegroupWidgetBox.style.display = 'block';
        this.gene_set_fasta.set('required', false);
        this.gene_set_feature_group.set('required', true);
        this.checkParameterRequiredFields();
      }
    }
  });
});
