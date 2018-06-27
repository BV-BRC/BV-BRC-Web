require({cache:{
'url:p3/widget/app/templates/MetagenomeBinning.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n  <div class=\"appTemplate\">\n    <div class=\"appTitle\">\n      <span class=\"breadcrumb\">Services</span>\n      <h3>Metagenome Binning\n                <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n                    <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n                </div>\n            </h3>\n      <p>Metagenome binning from sequencing reads.</p>\n    </div>\n    <div class=\"formFieldsContainer\">\n      <div style=\"display: none;\">\n        <input data-dojo-attach-event=\"onChange:validate\" data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\" data-dojo-attach-point=\"numInputs\" data-dojo-props=\"constraints:{min:1,max:1000},\" />\n      </div>\n      <table class=\"assemblyblocks\" style=\"width:100%\">\n        <tr>\n          <td>\n            <!-- paired read -->\n            <div id=\"pairedBox\" class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\"> Paired read library</label>\n                  <div name=\"paired-read-library\" class=\"infobox iconbox infobutton dialoginfo\">\n                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                  </div>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Read File 1</label><br>\n                <div data-dojo-attach-event=\"onChange:onSuggestReadChange\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\" data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n              </div>\n              <div class=\"appRow\">\n                <div data-dojo-attach-point=\"read2block\">\n                  <label class=\"paramlabel\">Read File 2</label><br>\n                  <div data-dojo-attach-event=\"onChange:onSuggestReadChange\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\" data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n                </div>\n              </div>\n            </div>\n            <!--\n                        <div><span>OR</span></div>\n\n                        <div class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\">SRA run accession</label>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">SRR Accession</label><br>\n                                <div data-dojo-type=\"dijit/form/ValidationTextBox\"\n                                    data-dojo-attach-point=\"srr_accession\" style=\"width: 300px\" required=\"false\"\n                                    data-dojo-props=\"intermediateChanges:true, missingMessage:'You must provide an accession', trim:true, placeHolder:'SRR'\"></div>\n                            </div>\n                        </div>\n-->\n            <div><span>OR</span></div>\n\n            <div class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <div style=\"width:85%;display:inline-block;\">\n                  <label class=\"appBoxLabel\">Contigs</label>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <div class=\"appFieldLong\">\n                  <label>Contigs</label><br>\n                  <div data-dojo-attach-event=\"onChange:onSuggestContigsChange\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"contigs\" data-dojo-attach-point=\"contig\" style=\"width:100%\" required=\"false\" data-dojo-props=\"type:['contigs'],multi:false,promptMessage:'Select or Upload Contigs to your workspace for Annotation',missingMessage:'Contigs must be provided.'\"></div>\n                </div>\n              </div>\n            </div>\n\n          </td>\n          <td>\n            <div class=\"appBox appShadow\">\n              <div class=\"headerrow\">\n                <label class=\"appBoxLabel\">Parameters</label>\n                <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n                  <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                </div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Output Folder</label><br>\n                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\" data-dojo-attach-point=\"output_path\" style=\"width:300px\" required=\"true\" data-dojo-props=\"type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:validate\"></div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Output Name</label><span class=\"charError\" style=\"color:red; font-size:8pt; padding-left:10px; font-weight:bold\">&nbsp;</span><br>\n                <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" data-dojo-attach-event=\"onChange:checkOutputName\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n              </div>\n              <div class=\"appRow\">\n                <label class=\"paramlabel\">Genome Group Name</label><br>\n                <div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"genome_group\" data-dojo-attach-point=\"genome_group\" style=\"width: 300px\" required=\"false\" data-dojo-props=\"intermediateChanges:false, missingMessage:'You must provide a genome group name',trim:true,placeHolder:'My Genome Group'\"></div>\n              </div>\n            </div>\n          </td>\n        </tr>\n      </table>\n    </div>\n    <div class=\"appSubmissionArea\">\n      <div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n        Submitting Job\n      </div>\n\n      <div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n        Job has been queued.\n      </div>\n\n      <div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n        <div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Job</div>\n        <p data-dojo-attach-point=\"errorMessage\">Error</p>\n      </div>\n\n      <div style=\"margin-top: 10px; text-align:center;\">\n        <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel\n        </div>\n        <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n        <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n      </div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/MetagenomeBinning", [
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/MetagenomeBinning.html', 'dojo/NodeList-traverse', 'dojo/store/Memory',
  'dojox/xml/parser', 'dijit/Dialog',
  'dijit/popup', 'dijit/TooltipDialog',
  './AppBase', '../../WorkspaceManager'
], function (
  declare, WidgetBase, lang, Deferred,
  on, xhr, domClass, domConstruct,
  Template, children, Memory,
  xmlParser, Dialog,
  popup, TooltipDialog,
  AppBase, WorkspaceManager
) {

  return declare([AppBase], {
    baseClass: 'App Assembly',
    pageTitle: 'Metagenome Binning Service',
    templateString: Template,
    applicationName: 'MetagenomeBinning',
    applicationHelp: 'user_guides/services/metagenome_binning_service.html',
    tutorialLink: 'tutorial/metagenomic_binning/metagenomic_binning.html',
    libraryData: null,
    defaultPath: '',
    startingRows: 13,
    libCreated: 0,
    srrValidationUrl: 'https://www.ebi.ac.uk/ena/data/view/{0}&display=xml',
    input_mode: null, // paired_read | sra | contigs

    constructor: function () {
      this.pairToAttachPt1 = ['read1', 'read2'];
      this.pairToAttachPt2 = ['read1'];
      this.paramToAttachPt = ['output_path', 'output_file', 'genome_group'];
      this.inputCounter = 0;

    },
    // checkOutputName function is in AppBase.js
    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      var _self = this;
      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);
      this.pairToAttachPt1.forEach(lang.hitch(this, function (attachname) {
        this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function (/* anything */ value, /* __Constraints */ constraints) {
          return (new RegExp('^(?:' + this._computeRegexp(constraints) + ')' + (this.required ? '' : '?') + '$')).test(value) &&
            (!this._isEmpty(value)) &&
            (this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
        });
      }));
      this.numInputs.startup();
      this._started = true;
    },

    getValues: function () {
      // console.log("getValues is called")

      this.inherited(arguments);

      var assembly_values = {};

      this.ingestAttachPoints(this.paramToAttachPt, assembly_values, true);

      switch (this.input_mode) {
        case 'paired_read':
          assembly_values.paired_end_libs = ['read1', 'read2'].map(function (rec) {
            return this[rec].searchBox.value;
          }, this);
          break;

        // case 'sra':
        //   assembly_values.srr_ids = srrAccessions;
        //   break;

        case 'contigs':
          assembly_values.contigs = this.contig.searchBox.value;
          break;

        default:
          break;
      }

      return assembly_values;
    },

    ingestAttachPoints: function (input_pts, target, req) {
      // console.log("ingestAttachPoints", input_pts)
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      var duplicate = false;

      input_pts.forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var browser_select = 0;
        var alias = attachname;
        if (attachname == 'read1' || attachname == 'read2') {
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
        if (attachname == 'paired_platform') {
          alias = 'platform';
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

    onSuggestReadChange: function () {
      if (this.read1.searchBox.get('value') && this.read2.searchBox.get('value')) {
        // both read1 and read2 are set
        if (this.read1.searchBox.get('value') == this.read2.searchBox.get('value')) {
          var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
          new Dialog({ title: 'Notice', content: msg }).show();
          this.submitButton.set('disabled', true);
          return;
        }

        if (this.input_mode == 'contigs') {
          var msg = 'You can only have paired read OR contigs.';
          new Dialog({ title: 'Notice', content: msg }).show();
          this.submitButton.set('disabled', true);
          return;
        }

        this.input_mode = 'paired_read';
        this.inputCounter = this.inputCounter + 1;
        this.numInputs.set('value', Number(this.inputCounter));


      }
      else {
        if (this.input_mode == 'paired_read') {
          this.input_mode = null;
          this.inputCounter = this.inputCounter - 1;
          this.numInputs.set('value', Number(this.inputCounter));
        }
      }
    },

    onSuggestContigsChange: function () {
      if (this.contig.searchBox.get('value') != '') {
        if (this.input_mode == 'paired_read') {
          var msg = 'You can only have paired read OR contigs.';
          new Dialog({ title: 'Notice', content: msg }).show();
          this.submitButton.set('disabled', true);
          return;
        }

        this.input_mode = 'contigs';
        this.inputCounter = this.inputCounter + 1;
        this.numInputs.set('value', Number(this.inputCounter));

      }
      else {
        if (this.input_mode == 'contigs') {
          this.input_mode = null;
          this.inputCounter = this.inputCounter - 1;
          this.numInputs.set('value', Number(this.inputCounter));
        }
      }
    },

    // TODO: remove adding to library
    validateSRR: function () {
      var accession = this.srr_accession.get('value');
      // console.log("updateSRR", accession, accession.substr(0, 3))
      if (accession.substr(0, 3) !== 'SRR') {
        this.srr_accession.set('state', 'Error');
        return false;
      }

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
            var lrec = { _type: 'srr_accession', title: title };

            var chkPassed = this.ingestAttachPoints(['srr_accession'], lrec);
            if (chkPassed) {
              var infoLabels = {
                title: { label: 'Title', value: 1 }
              };
              this.addLibraryRow(lrec, infoLabels, 'srrdata');
            }

          } catch (e) {
            this.srr_accession.set('state', 'Error');
            console.debug(e);
          }
        }));
    },

    validate: function () {
      var valid = this.inherited(arguments);
      if (valid && this.input_mode) {
        this.submitButton.set('disabled', false);
        return true;
      }
      this.submitButton.set('disabled', true);
      return false;
    }
  });
});
