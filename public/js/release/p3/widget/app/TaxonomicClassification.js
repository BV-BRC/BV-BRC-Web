require({cache:{
'url:p3/widget/app/templates/TaxonomicClassification.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit\">\n  <div class=\"appTemplate\">\n    <div class=\"appTitle\">\n      <span class=\"breadcrumb\">Services</span>\n      <h3>${applicationLabel}\n        <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n          <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n        </div>\n        <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n          <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\" ><i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i></a>\n        </div>\n      </h3>\n      <p>${applicationDescription} For further explanation, please see <a href=\"${docsServiceURL}${applicationHelp}\"\n          target=\"_blank\">${applicationLabel} Service User Guide</a> and\n        <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\">Tutorial</a>.\n      </p>\n    </div>\n    <div class=\"formFieldsContainer\">\n      <div style=\"display: none;\">\n        <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\" data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\" />\n      </div>\n      <div id=\"startWithBox\" style=\"width:400px;\" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <label class=\"appBoxLabel\">Start With:</label>\n          <div name=\"start-with\" class=\"infobox iconbox infobutton dialoginfo\">\n            <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"startWithRead\" name=\"startWith\" value=\"read\" checked />\n          <label for=\"radio1\">Read File</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"startWithContigs\" name=\"startWith\" value=\"contigs\" data-dojo-attach-event=\"onChange:onStartWithChange\" />\n          <label for=\"radio2\">Assembled Contigs</label>\n        </div>\n      </div>\n      <table data-dojo-attach-point=\"readTable\" style=\"width:100%\">\n        <tr>\n          <td>\n            <div id=\"pairedBox\" class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\">Input File</label>\n                  <div name=\"input-file\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                  </div>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"paramlabel\">Paired read library</label>\n                </div>\n                <div style=\"width:10%;display:inline-block;\">\n                  <i data-dojo-attach-event=\"click:onAddPair\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\" data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE 1'\"></div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-attach-point=\"read2block\">\n                  <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\" data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE 2'\"></div>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"paramlabel\">Single read library</label>\n                </div>\n                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSingle\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_readfile\" data-dojo-attach-point=\"single_end_libs\" style=\"width:285px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE'\"></div>\n              </div>\n              <div class=\"appRow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"paramlabel\">SRA run accession</label><i data-dojo-attach-point=\"srr_accession_validation_message\"></i>\n                </div>\n                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSRR\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-type=\"dijit/form/ValidationTextBox\" data-dojo-attach-point=\"srr_accession\" style=\"width: 300px\" required=\"false\" data-dojo-props=\"intermediateChanges:true, missingMessage:'You must provide an accession', trim:true, placeHolder:'SRR'\"></div>\n              </div>\n            </div>\n          </td>\n          <td>\n            <div class=\"appBox appShadow\" style=\"height:213px; width:330px\">\n              <div class=\"headerrow\">\n                <label class=\"appBoxLabel\">Selected libraries</label>\n                <div name=\"selected-libraries\" class=\"infobox iconbox infobutton tooltipinfo\">\n                  <i class=\"fa icon-question-circle fa\"></i>\n                </div>\n                <br>\n                <div class=\"appsublabel\">Place read files here using the arrow buttons.</div>\n              </div>\n              <div class=\"appRow\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\" style=\"margin:0 0 0 10px; width:90%;\">\n                  <tbody data-dojo-attach-point=\"libsTableBody\">\n                  </tbody>\n                </table>\n              </div>\n            </div>\n          </td>\n        </tr>\n      </table>\n      <div data-dojo-attach-point=\"annotationFileBox\" style=\"width:400px; display:none\" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <div style=\"width:85%;display:inline-block;\">\n            <label class=\"appBoxLabel\">Input File</label>\n          </div>\n        </div>\n        <div class=\"appRow\">\n            <label class=\"paramlabel\">Contigs</label><br>\n            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"contigs\" data-dojo-attach-point=\"contigsFile\" data-dojo-attach-event=\"onChange:setContigsFile\" style=\"width:100%\" required=\"false\" data-dojo-props=\"type:['contigs'],multi:false,promptMessage:'Select or Upload Contigs to your workspace for Annotation'\">\n            </div>\n        </div>\n      </div>\n      <div id=\"parameterBox\" style=\"width:400px; \" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <div style=\"width:85%;display:inline-block;\">\n            <label class=\"appBoxLabel\">Parameters</label>\n            <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Algorithm</label><br>\n          <select data-dojo-type=\"dijit/form/Select\" name=\"algorithm\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,trim:true\">\n            <option value=\"Kraken2\">Kraken2</option>\n          </select>\n        </div>\n        <div class=\"appRow\">\n            <label>Database</label><br>\n            <select data-dojo-type=\"dijit/form/Select\" name=\"database\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true\">\n              <option value=\"Kraken2\">All genomes</option>\n              <!-- <option value=\"RDP\">RDP (SSU rRNA)</option>\n              <option value=\"SILVA\">SILVA (SSU rRNA)</option> -->\n            </select>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Save Classified Sequences</label><br>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" name=\"save_classified_sequences\" value=\"false\" checked />\n          <label for=\"radio1\">No</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" name=\"save_classified_sequences\" value=\"true\" />\n          <label for=\"radio2\">Yes</label>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Save Unclassified Sequences</label><br>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" name=\"save_unclassified_sequences\" value=\"false\" checked />\n          <label for=\"radio1\">No</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" name=\"save_unclassified_sequences\" value=\"true\" />\n          <label for=\"radio2\">Yes</label>\n        </div>\n\n        <div class=\"appRow\">\n          <label>Output Folder</label><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n            name=\"output_path\"\n            data-dojo-attach-point=\"output_path\"\n            required=\"true\"\n            data-dojo-props=\"title:'Select an Output Folder',autoSelectCurrent:true,selectionText:'Destination',type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\">\n          </div>\n        </div>\n\n        <div class=\"appRow\">\n          <label>Output Name</label><span class=\"charError\" style=\"color:red; font-size:8pt; padding-left:10px; font-weight:bold\">&nbsp;</span><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\"\n            data-dojo-attach-event=\"onChange:checkOutputName\"\n            name=\"output_file\"\n            data-dojo-attach-point=\"output_file\"\n            style=\"width:85%\"\n            required=\"true\"\n            data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\">\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class=\"appSubmissionArea\">\n      <div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n        Submitting Taxonomic Classification Job\n      </div>\n      <div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n        Taxonomic Classification Job has been queued.\n      </div>\n      <div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n        <div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Taxonomic Classification Job</div>\n        <p data-dojo-attach-point=\"errorMessage\">Error</p>\n      </div>\n      <div style=\"margin-top: 10px; text-align:center;\">\n        <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel\n        </div>\n        <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n        <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n      </div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/TaxonomicClassification", [
  'dojo/_base/declare', 'dojo/_base/array', 'dijit/_WidgetBase', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/TaxonomicClassification.html', 'dojo/NodeList-traverse', 'dojo/store/Memory',
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
    pageTitle: 'Taxonomic Classification Service',
    templateString: Template,
    applicationName: 'TaxonomicClassification',
    requireAuth: true,
    applicationLabel: 'Taxonomic Classification',
    applicationDescription: 'The Taxonomic Classification Service computes taxonomic classification for read data.',
    applicationHelp: 'user_guides/services/taxonomic_classification_service.html',
    tutorialLink: 'tutorial/taxonomic_classification/taxonomic_classification.html',
    libraryData: null,
    defaultPath: '',
    startingRows: 6,
    libCreated: 0,
    srrValidationUrl: 'https://www.ebi.ac.uk/ena/data/view/{0}&display=xml',
    // below are from annotation
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

      if (this.startWithContigs.checked) {  // starting from contigs
        values.input_type = 'contigs'; // set input_type to be 'contigs'
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
      this.srr_accession_validation_message.innerHTML = 'Validating ' + accession + ' ...';
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
            this.srr_accession_validation_message.innerHTML = 'Your input ' + accession + ' is not valid';
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

    // below is from annotation


    checkParameterRequiredFields: function () {
      if (this.output_path.get('value') && this.output_file.get('displayedValue') ) {
        this.validate();
      }
      else {
        if (this.submitButton) { this.submitButton.set('disabled', true); }
      }
    },

    setContigsFile: function () {
      this.checkParameterRequiredFields();
    },

    onOutputPathChange: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    checkOutputName: function (val) {
      this.inherited(arguments);
      this.checkParameterRequiredFields();
    },

    onStartWithChange: function () {
      if (this.startWithRead.checked == true) {
        this.readTable.style.display = 'block';
        this.annotationFileBox.style.display = 'none';
        this.numlibs.constraints.min = 1;
        this.contigsFile.reset();
        this.contigsFile.set('required', false);
        this.checkParameterRequiredFields();
      }
      if (this.startWithContigs.checked == true) {
        this.readTable.style.display = 'none';
        this.annotationFileBox.style.display = 'block';
        this.numlibs.constraints.min = 0;
        this.contigsFile.set('required', true);
        this.checkParameterRequiredFields();
      }
    }
  });
});
