define([
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
