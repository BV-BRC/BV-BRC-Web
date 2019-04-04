require({cache:{
'url:p3/widget/app/templates/MetagenomicReadMapping.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\" dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit\">\n  <div class=\"appTemplate\">\n    <div class=\"appTitle\">\n      <span class=\"breadcrumb\">Services</span>\n      <h3>${applicationLabel}\n        <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n          <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n        </div>\n        <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n          <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n        </div>\n      </h3>\n      <p>${applicationDescription} For further explanation, please see <a href=\"${docsServiceURL}${applicationHelp}\" target=\"_blank\">${applicationLabel} Service User Guide</a> and\n        <a href=\"${docsServiceURL}${tutorialLink}\" target=\"_blank\">Tutorial</a>.\n      </p>\n    </div>\n    <div style=\"width:450px; margin:auto\" class=\"formFieldsContainer\">\n      <div id=\"inputTypeBox\" style=\"width:400px;\" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <label class=\"appBoxLabel\">Start With</label>\n          <div name=\"start-with\" class=\"infobox iconbox infobutton dialoginfo\">\n            <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"singleEndReads\" name=\"input_type\" value=\"single_end_reads\" checked />\n          <label for=\"radio1\">Single End Reads</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"pairedEndReads\" name=\"input_type\" value=\"paired_end_reads\" data-dojo-attach-event=\"onChange:onInputTypeChange\" />\n          <label for=\"radio2\">Paired End Reads</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"SRAIDs\" name=\"input_type\" value=\"sra_ids\" data-dojo-attach-event=\"onChange:onInputTypeChange\" />\n          <label for=\"radio3\">SRA ID</label>\n        </div>\n      </div>\n      <div id=\"inputFileBox\" style=\"width:400px;\" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <label class=\"appBoxLabel\">Input File</label>\n        </div>\n        <div data-dojo-attach-point = \"singleReadInputFileBox\">\n          <div class=\"appRow\">\n            <label class=\"paramlabel\">Single read library</label>\n            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"read\" name=\"read\" style=\"width:100%\" required=\"true\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE'\"></div>\n          </div>\n        </div>\n        <div data-dojo-attach-point = \"pairedReadInputFileBox\" style=\"display:none\">\n          <div class=\"appRow\">\n            <div style=\"width:85%;display:inline-block;\">\n              <label class=\"paramlabel\">Paired read library</label>\n            </div>\n          </div>\n          <div class=\"appRow\">\n            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"read1\" name=\"read1\" style=\"width:100%\" data-dojo-attach-event=\"onChange:validatePairedReads\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE 1'\"></div>\n          </div>\n          <div class=\"appRow\">\n            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"read2\" name=\"read2\" style=\"width:100%\" data-dojo-attach-event=\"onChange:validatePairedReads\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,placeHolder:'READ FILE 2'\"></div>\n          </div>\n        </div>\n        <div data-dojo-attach-point = \"SRAInputFileBox\" style=\"display:none\">\n          <div class=\"appRow\">\n            <div style=\"width:85%;display:inline-block;\">\n              <label class=\"paramlabel\">SRA run accession</label>\n            </div>\n          </div>\n          <div class=\"appRow\">\n            <div data-dojo-type=\"dijit/form/ValidationTextBox\" data-dojo-attach-point=\"srr_ids\" style=\"width: 200px\" data-dojo-attach-event=\"onBlur:validateSRR\" required=\"false\" data-dojo-props=\"intermediateChanges:true, missingMessage:'You must provide an accession', trim:true, placeHolder:'SRR'\"></div>\n            <i data-dojo-attach-point=\"srr_accession_validation_message\"></i>\n          </div>\n        </div>\n      </div>\n      <div id=\"parameterBox\" style=\"width:400px; \" class=\"appBox appShadow\">\n        <div class=\"headerrow\">\n          <div style=\"width:85%;display:inline-block;\">\n            <label class=\"appBoxLabel\">Parameters</label>\n            <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n              <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n            </div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Gene Set Type</label><br>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"geneSetTypePredefinedList\" name=\"geneSetType\" value=\"predefined_list\" checked />\n          <label for=\"radio1\">Predefined List</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"geneSetTypeFastaFile\" name=\"geneSetType\" value=\"fasta_file\" data-dojo-attach-event=\"onChange:onGeneSetTypeChange\" />\n          <label for=\"radio2\">Fasta File</label>\n          <input type=\"radio\" data-dojo-type=\"dijit/form/RadioButton\" data-dojo-attach-point=\"geneSetTypeFeatureGroup\" name=\"geneSetType\" value=\"feature_group\" data-dojo-attach-event=\"onChange:onGeneSetTypeChange\" />\n          <label for=\"radio3\">Feature Group</label>\n        </div>\n        <div data-dojo-attach-point = \"geneSetTypeBox\">\n        <div class=\"appRow\">\n            <label class=\"paramlabel\">Predefined Gene Set Name</label><br>\n            <select data-dojo-type=\"dijit/form/Select\" data-dojo-attach-point=\"geneSetName\" name=\"geneSetName\" style=\"width:150px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,trim:true\">\n              <option value=\"MLST\">MLST</option>\n              <option value=\"CARD\">CARD</option>\n            </select>\n          </div>\n        </div>\n        <div data-dojo-attach-point = \"geneSetFastaWidgetBox\" style=\"display:none\">\n          <div class=\"appRow\">\n            <label class=\"paramlabel\">Gene Set Fasta</label><br>\n            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"geneSetFastaWidget\" name=\"gene_set_fasta\" required=\"false\"  data-dojo-props=\"type:['feature_protein_fasta'],multi:false,promptMessage:'Select or Upload protein fasta file to your workspace', placeHolder:''\"></div>\n          </div>\n        </div>\n        <div data-dojo-attach-point = \"geneSetFeaturegroupWidgetBox\" style=\"display:none\">\n          <div class=\"appRow\">\n          <label class=\"paramlabel\">Gene Set Feature Group</label><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"geneSetFeaturegroupWidget\" name=\"gene_set_feature_group\" required=\"false\"  data-dojo-props=\"type:['feature_group'],multi:false,promptMessage:'Select a feature group from your workspace', placeHolder:''\"></div>\n          </div>\n        </div>\n        <div class=\"appRow\">\n          <label class=\"paramlabel\">Output Folder</label><br>\n          <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" data-dojo-attach-point=\"outputPathWidget\" name=\"output_path\"  data-dojo-attach-event=\"onChange:onOutputPathChange\" style=\"width:100%\" required=\"true\" data-dojo-props=\"title:'Select an Output Folder',autoSelectCurrent:true,selectionText:'Destination',type:['folder'],multi:false\"></div>\n        </div>\n        <div class=\"appRow\">\n            <label class=\"paramlabel\">Output Name</label><br>\n            <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" data-dojo-attach-point=\"outputFileWidget\" name=\"output_file\"   style=\"width:380px\" required=\"true\" data-dojo-props=\"promptMessage:'The output name for your Mapping Results',missingMessage:'Output Name must be provided.',trim:true,placeHolder:'Output Name'\"></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"appSubmissionArea\">\n      <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n        Submitting Metagenomic Read Mapping Job\n      </div>\n      <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n        Error Submitting Job\n      </div>\n      <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n        Metagenomic Read Mapping Job has been queued.\n      </div>\n      <div style=\"margin-top: 10px; text-align:center;\">\n        <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n        <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n      </div>\n    </div>\n  </div>\n</form>\n"}});
define("p3/widget/app/MetagenomicReadMapping", [
  'dojo/_base/declare', 'dojo/_base/array', 'dijit/_WidgetBase', 'dojo/_base/lang', 'dojo/_base/Deferred',
  'dojo/on', 'dojo/request', 'dojo/dom-class', 'dojo/dom-construct',
  'dojo/text!./templates/MetagenomicReadMapping.html', 'dojo/NodeList-traverse',
  'dojox/xml/parser',
  'dijit/popup', 'dijit/TooltipDialog', 'dijit/Dialog',
  './AppBase', '../../WorkspaceManager'
], function (
  declare, array, WidgetBase, lang, Deferred,
  on, xhr, domClass, domConstruct,
  Template, children,
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
    applicationDescription: 'The Metagenomic Read Mapping Service provides ... blah blah blah blah blah blah blah blah',
    applicationHelp: 'user_guides/services/comprehensive_genome_analysis_service.html',
    tutorialLink: 'tutorial/comprehensive-genome-analysis/comprehensive-genome-analysis.html',
    inputType: null,
    geneSetType: null,
    defaultPath: '',
    srrValidationUrl: 'https://www.ebi.ac.uk/ena/data/view/{0}&display=xml',
    required: true,

    constructor: function () {

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
      _self.outputPathWidget.set('value', _self.defaultPath);

      this._started = true;
    },

    getValues: function () { // TODO 11/15/2018
      var values = this.inherited(arguments);
      // input_type = values.inputType;

      // inputs that are NOT needed by the backend
      var not_needed_inputs = ['readfile', 'paired_read1file', 'paired_read2file'];
      not_needed_inputs.forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          delete values[key];
        }
      });
      return values;
    },

    validatePairedReads: function () {
      if (this.read1.searchBox.get('value') && this.read1.searchBox.get('value') == this.read2.searchBox.get('value')) {
        var msg = 'READ FILE 1 and READ FILE 2 cannot be the same.';
        new Dialog({ title: 'Notice', content: msg }).show();
        this.read2.searchBox.set('value', '');
        this.read2.searchBox.focus();
        if (this.submitButton) { this.submitButton.set('disabled', true); }
        return false;
      }
    },

    validateSRR: function () {
      // SRR5121082 (a valid SRR example)
      var accession = this.srr_ids.get('value');
      this.srr_ids.set('disabled', true);
      this.srr_accession_validation_message.innerHTML = 'Validating ' + accession + ' ...';
      xhr.get(lang.replace(this.srrValidationUrl, [accession]), {})
        .then(lang.hitch(this, function (xml_resp) {
          var resp = xmlParser.parse(xml_resp).documentElement;
          this.srr_ids.set('disabled', false);
          try {
            var title = resp.children[0].childNodes[3].innerHTML;
            this.srr_accession_validation_message.innerHTML = title;
            this.srr_accession_validation_message.innerHTML = '';
          } catch (e) {
            this.srr_accession_validation_message.innerHTML = 'Your input ' + accession + ' is not valid';
            this.srr_ids.set('value', '');
          }
        }));
      this.checkParameterRequiredFields();
    },

    checkParameterRequiredFields: function () {
      if (this.outputPathWidget.get('value') && this.outputFileWidget.get('displayedValue') ) {
        this.validate();
      }
    },

    onInputTypeChange: function () {
      if (this.singleEndReads.checked) {
        this.singleReadInputFileBox.style.display = 'block';
        this.pairedReadInputFileBox.style.display = 'none';
        this.SRAInputFileBox.style.display = 'none';
        this.read.set('required', true);
        this.read1.set('required', false);
        this.read2.set('required', false);
        this.srr_ids.set('required', false);
        this.checkParameterRequiredFields();
      }
      if (this.pairedEndReads.checked) {
        this.singleReadInputFileBox.style.display = 'none';
        this.pairedReadInputFileBox.style.display = 'block';
        this.SRAInputFileBox.style.display = 'none';
        this.read.set('required', false);
        this.read1.set('required', true);
        this.read2.set('required', true);
        this.srr_ids.set('required', false);
        this.checkParameterRequiredFields();
      }
      if (this.SRAIDs.checked) {
        this.singleReadInputFileBox.style.display = 'none';
        this.pairedReadInputFileBox.style.display = 'none';
        this.SRAInputFileBox.style.display = 'block';
        this.read.set('required', false);
        this.read1.set('required', false);
        this.read2.set('required', false);
        this.srr_ids.set('required', true);
        this.checkParameterRequiredFields();
      }
    },

    onGeneSetTypeChange: function () {
      if (this.geneSetTypePredefinedList.checked) {
        this.geneSetTypeBox.style.display = 'block';
        this.geneSetFastaWidgetBox.style.display = 'none';
        this.geneSetFeaturegroupWidgetBox.style.display = 'none';
        this.geneSetFastaWidget.set('required', false);
        this.geneSetFeaturegroupWidget.set('required', false);
        this.checkParameterRequiredFields();
      }
      if (this.geneSetTypeFastaFile.checked) {
        this.geneSetTypeBox.style.display = 'none';
        this.geneSetFastaWidgetBox.style.display = 'block';
        this.geneSetFeaturegroupWidgetBox.style.display = 'none';
        this.geneSetFastaWidget.set('required', true);
        this.geneSetFeaturegroupWidget.set('required', false);
        this.checkParameterRequiredFields();
      }
      if (this.geneSetTypeFeatureGroup.checked) {
        this.geneSetTypeBox.style.display = 'none';
        this.geneSetFastaWidgetBox.style.display = 'none';
        this.geneSetFeaturegroupWidgetBox.style.display = 'block';
        this.geneSetFastaWidget.set('required', false);
        this.geneSetFeaturegroupWidget.set('required', true);
        this.checkParameterRequiredFields();
      }
    }
  });
});
