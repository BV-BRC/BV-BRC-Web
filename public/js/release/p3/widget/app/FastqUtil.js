require({cache:{
'url:p3/widget/app/templates/FastqUtil.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n  <div class=\"appTemplate\">\n    <div class=\"appTitle\">\n      <span class=\"breadcrumb\">Services</span>\n      <h3>${applicationLabel}\n        <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n          <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n        </div>\n        <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n          <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\" ><i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i></a>\n        </div>\n      </h3>\n      <p>${applicationDescription} For further explanation, please see <a href=\"${docsServiceURL}${applicationHelp}\" target=\"_blank\">${applicationLabel} Service User Guide</a>        and\n        <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\">Tutorial</a>.\n      </p>\n    </div>\n    <div class=\"formFieldsContainer\">\n      <div style=\"display: none;\">\n        <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\" data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\" />\n      </div>\n      <div style=\"display: none;\">\n        <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\" data-dojo-attach-point=\"numCondWidget\" data-dojo-props=\"constraints:{min:1,max:1000},\" />\n      </div>\n      <table class=\"assemblyblocks\" style=\"width:100%\">\n        <tr>\n          <td>\n            <div id=\"pipelineBox\" class=\"appBox appShadow\" style=\"min-height: 170px; height:auto\">\n              <div style=\"width:85%;display:inline-block;\">\n                <label class=\"appBoxLabel\">Parameters</label>\n                <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n                  <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Output Folder</label><br>\n                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\" data-dojo-attach-point=\"output_path\" style=\"width:300px\" required=\"true\" data-dojo-props=\"title:'Select an Output Folder',autoSelectCurrent:true,selectionText:'Destination',type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Output Name</label><span class=\"charError\" style=\"color:red; font-size:8pt; padding-left:10px; font-weight:bold\">&nbsp;</span><br>\n                <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" data-dojo-attach-event=\"onChange:checkOutputName\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n              </div>\n            </div>\n          </td>\n          <td>\n            <div id=\"conditionbox\" class=\"appBox appShadow\" style=\"min-height: 220px; height:auto; width:330px\">\n              <div class=\"headerrow\">\n                <label class=\"appBoxLabel\">Pipeline</label>\n                <div name=\"groups-conditions\" class=\"infobox iconbox infobutton tooltipinfo\">\n                  <i class=\"fa icon-question-circle fa\"></i>\n                </div>\n                <br>\n              </div>\n              <div class=\"appRow\" style=\"width:270px; padding-left:10px; padding-right:40px;\" data-dojo-attach-point=\"advrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                <select data-dojo-type=\"dijit/form/FilteringSelect\" name=\"action_select\" data-dojo-attach-point=\"action_select\" style=\"width:200px\" required=\"false\" data-dojo-props=\"labelType:'html',searchAttr:'label',intermediateChanges:true,trim:true,placeHolder:'Select Action'\">\n                </select>\n                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddCondition\" class=\"fa icon-plus-circle fa-lg\"></i></div>\n              </div>\n              <div class=\"appRow\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"condTable\" style=\"margin:0 0 0 10px; width:90%;\">\n                  <tbody data-dojo-attach-point=\"condTableBody\">\n                  </tbody>\n                </table>\n              </div>\n              <div class=\"appRow\">\n                <div class=\"appField\">\n                  <label>Target Genome</label><br>\n                  <div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome_name\" maxHeight=\"200\" style=\"width:100%\" required=\"true\" data-dojo-attach-point=\"genome_nameWidget\" data-dojo-props=\"disabled: true\"></div>\n                </div>\n              </div>\n            </div>\n            <!-- <div data-dojo-attach-point=\"block_condition\" data-dojo-type=\"dojox.widget.Standby\" data-dojo-props=\"opacity:'0.5',color:'rgb(231,231,231)', text:'Disabled',centerIndicator:'text',target:'conditionbox'\"></div> -->\n          </td>\n        </tr>\n        <tr>\n          <td>\n            <div id=\"pairedBox\" class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\"> Paired read library</label>\n                  <div name=\"paired-read-library\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                  </div>\n                </div>\n                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddPair\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Read File 1</label><br>\n                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\" data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-attach-point=\"read2block\">\n                  <label class=\"paramlabel\">Read File 2</label><br>\n                  <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\" data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n                </div>\n              </div>\n            </div>\n            <div class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\">Single read library</label>\n                </div>\n                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSingle\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Read File</label><br>\n                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_readfile\" data-dojo-attach-point=\"read\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n              </div>\n            </div>\n            <div class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\">SRA run accession <small>(Temporarily Disabled)</small></label>\n                </div>\n                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSRR\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">SRR Accession</label><br>\n                <div data-dojo-type=\"dijit/form/ValidationTextBox\" data-dojo-attach-event=\"onChange:updateSRR\" data-dojo-attach-point=\"srr_accession\" style=\"width: 300px\" required=\"false\" data-dojo-props=\"disabled:true,intermediateChanges:true, missingMessage:'You must provide an accession', trim:true, placeHolder:'SRR'\"></div>\n              </div>\n            </div>\n          </td>\n          <td>\n            <div class=\"appBox appShadow\" style=\"min-height: 320px; height:auto; width:330px\">\n              <div class=\"headerrow\">\n                <label class=\"appBoxLabel\">Selected libraries</label>\n                <div name=\"selected-libraries\" class=\"infobox iconbox infobutton tooltipinfo\">\n                  <i class=\"fa icon-question-circle fa\"></i>\n                </div>\n                <br>\n                <div class=\"appsublabel\">Place read files here using the arrow buttons.</div>\n              </div>\n              <div class=\"appRow\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\" style=\"margin:0 0 0 10px; width:90%;\">\n                  <tbody data-dojo-attach-point=\"libsTableBody\">\n                  </tbody>\n                </table>\n              </div>\n            </div>\n          </td>\n        </tr>\n      </table>\n    </div>\n    <div class=\"appSubmissionArea\">\n      <div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n        Submitting Fastq Utils job\n      </div>\n      <div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n        Fastq Utils job has been queued.\n      </div>\n      <div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n        <div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Assembly Job</div>\n        <p data-dojo-attach-point=\"errorMessage\">Error</p>\n      </div>\n      <div style=\"margin-top: 10px; text-align:center;\">\n        <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel\n        </div>\n        <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n        <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n      </div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/FastqUtil", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/FastqUtil.html', './AppBase', 'dojo/dom-construct',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby',
  'dojox/xml/parser', 'dojo/request'
], function (
  declare, WidgetBase, on,
  domClass,
  Template, AppBase, domConstruct,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog,
  children, WorkspaceManager, Memory, Standby,
  xmlParser, xhr
) {
  return declare([AppBase], {
    baseClass: 'App Assembly',
    templateString: Template,
    applicationName: 'FastqUtils',
    requireAuth: true,
    applicationLabel: 'Fastq Utilities',
    applicationDescription: 'The Fastq Utilites Service provides capability for aligning, measuring base call quality, and trimmiing fastq read files.',
    applicationHelp: 'user_guides/services/fastq_utilities_service.html',
    tutorialLink: 'tutorial/fastq-utilities/fastq-utilities.html',
    pageTitle: 'Fastq Utilities',
    libraryData: null,
    defaultPath: '',
    startingRows: 12,
    initConditions: 5,
    maxConditions: 5,
    conditionStore: null,
    srrValidationUrl: 'https://www.ebi.ac.uk/ena/data/view/{0}&display=xml',
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
      // temporary until contrasts table added
      this.updateConditionStore(trim, false);
      this.updateConditionStore(fastqc, false);
      this.updateConditionStore(align, false);
      this.action_select.labelFunc = this.showConditionLabels;
      // this.block_condition.show();

      // this.read1.set('value',"/" +  window.App.user.id +"/home/");
      // this.read2.set('value',"/" +  window.App.user.id +"/home/");
      // this.single_end_libs.set('value',"/" +  window.App.user.id +"/home/");
      // this.output_path.set('value',"/" +  window.App.user.id +"/home/");
      this._started = true;
    },

    onAddSRR: function () {
      console.log('Create New Row', domConstruct);
      var toIngest = this.srrToAttachPt;
      var accession = this.srr_accession.get('value');
      // console.log("updateSRR", accession, accession.substr(0, 3))
      // var prefixList = ['SRR', 'ERR']
      // if(prefixList.indexOf(accession.substr(0, 3)) == -1){
      //   this.srr_accession.set("state", "Error")
      //   return false;
      // }

      // TODO: validate and populate title
      // SRR5121082
      this.srr_accession.set('disabled', true);
      xhr.get(lang.replace(this.srrValidationUrl, [accession]), {})
        .then(lang.hitch(this, function (xml_resp) {
          var resp = xmlParser.parse(xml_resp).documentElement;
          this.srr_accession.set('disabled', false);
          try {
            var title = resp.children[0].childNodes[3].innerHTML;

            this.srr_accession.set('state', '');
            var lrec = { type: 'srr_accession', title: title };

            var chkPassed = this.ingestAttachPoints(toIngest, lrec);
            if (chkPassed) {
              var infoLabels = {
                title: { label: 'Title', value: 1 }
              };
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
            }
          } catch (e) {
            this.srr_accession.set('state', 'Error');
            console.debug(e);
          }
        }));
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
      var pairedList = this.libraryStore.query({ type: 'paired' });
      var pairedAttrs = ['read1', 'read2'];
      var singleAttrs = ['read'];
      var srrAttrs = ['srr_accession'];
      var condList = this.activeConditionStore.data;
      var singleList = this.libraryStore.query({ type: 'single' });
      var srrList = this.libraryStore.query({ type: 'srr_accession' });
      var condLibs = [];
      var pairedLibs = [];
      var singleLibs = [];
      var srrLibs = [];
      this.ingestAttachPoints(this.paramToAttachPt, assembly_values);
      // for (var k in values) {
      //   if(!k.startsWith("libdat_")){
      //     assembly_values[k]=values[k];
      //   }
      // }
      assembly_values.reference_genome_id = values.genome_name;
      condList.forEach(function (condRecord) {
        condLibs.push(condRecord.condition);
      });

      pairedList.forEach(function (libRecord) {
        var toAdd = {};
        pairedAttrs.forEach(function (attr) {
          toAdd[attr] = libRecord[attr];
        });
        pairedLibs.push(toAdd);
      }, this);
      if (pairedLibs.length) {
        assembly_values.paired_end_libs = pairedLibs;
      }
      if (condLibs.length) {
        assembly_values.recipe = condLibs;
      }
      singleList.forEach(function (libRecord) {
        var toAdd = {};
        singleAttrs.forEach(function (attr) {
          toAdd[attr] = libRecord[attr];
        });
        singleLibs.push(toAdd);
      }, this);
      if (singleLibs.length) {
        assembly_values.single_end_libs = singleLibs;
      }
      srrList.forEach(function (libRecord) {
        var toAdd = {};
        srrAttrs.forEach(function (attr) {
          toAdd[attr] = libRecord[attr];
        });
        srrLibs.push(toAdd);
      }, this);
      if (srrLibs.length) {
        assembly_values.srr_libs = srrLibs;
      }
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
        this.addLibraryInfo(lrec, { 'read': { 'label': this.read.searchBox.get('displayedValue') } }, tr);
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
    }

  });
});
