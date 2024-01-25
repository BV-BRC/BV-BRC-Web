define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/AppLogin.html', 'dijit/form/Form', 'p3/widget/WorkspaceObjectSelector', 'dojo/topic', 'dojo/_base/lang',
  '../../util/PathJoin', 'dojox/xml/parser',
  'dijit/Dialog', 'dojo/request', 'dojo/dom-construct', 'dojo/query', 'dijit/TooltipDialog', 'dijit/popup', 'dijit/registry', 'dojo/dom',
  '../../JobManager', '../../util/loading'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  LoginTemplate, FormMixin, WorkspaceObjectSelector, Topic, lang,
  PathJoin, xmlParser,
  Dialog, xhr, domConstruct, query, TooltipDialog, popup, registry, dom,
  JobManager, Loading
) {
  return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
    baseClass: 'App Sleep',
    templateString: '',
    docsServiceURL: window.App.docsServiceURL,
    path: '',
    applicationName: 'Date',
    requireAuth: false,
    applicationLabel: '',
    applicationDescription: '',
    showCancel: false,
    activeWorkspace: '',
    activeWorkspacePath: '',
    lookaheadJob: false,
    lookaheadCallback: null,
    lookaheadError: null,
    lookaheadGif: null,
    maxFastaText: 64000,
    ignoreMaxFastaTextLimit: false,
    help_doc: null,
    activeUploads: [],
    // srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmax=1&db=sra&field=accn&term={0}&retmode=json',
    srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?retmax=10&db=sra&id={0}', // the data we need is in xml string no matter what.

    // common JSON parameters for each of the services: not all are used in each service, but these are the most common
    single_end_libs: [],
    paired_end_libs: [],
    sra_libs: [], // srr_libs in some services
    contigs: '', // as far as I can tell none of the services have a list of contigs files: TODO (recheck)
    target_genome_id: '', // referred to as taxon_id or target_genome. The reference genome for most services.
    // Is a list in GenomeAlignment.js
    taxon_name: '', // name associated with the target_genome_id
    genome_group: '', // TODO: not sure if this is necessary: user can specify either the name to assign the group or the name of the group to be used in the service
    strategy: '', // controls the 'program', 'workflow', or 'algorithm' a service will use. Sometimes referred to as 'recipe'
    output_name: '', // name of the output file/folder. Some services do not have this field
    output_folder: '', // location where the output_name will be placed in the user's workspace. Some services do not have this field

    postMixInProperties: function () {
      // use AppLogin.html when requireAuth & user is not logged in
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {

        // also, if this is a bv-brc specific app, the docs are
        // on the same site, so don't preapend docsServiceURL, and use newer urls
        if (this.isBVBRC) {
          this.templateString = LoginTemplate
            .replace(/\$\{docsServiceURL\}\$\{applicationHelp\}/g, '${bvbrcHelpURL}')
            .replace(/\${docsServiceURL\}\${tutorialLink\}/g, '${bvbrcTutorialURL}');
          return;
        }

        this.templateString = LoginTemplate;
        return;
      }

      this.activeWorkspace = this.activeWorkspace || window.App.activeWorkspace;
      this.activeWorkspacePath = this.activeWorkspacePath || window.App.activeWorkspacePath;
      this.inherited(arguments);
    },

    _setValueAttr: function (val) {
      this.value = val || window.App.activeWorkspacePath;
    },

    gethelp: function () {

      if (this.applicationHelp) {
        var helprequest = xhr.get(PathJoin(this.docsServiceURL, this.applicationHelp), {
          handleAs: 'text'
        });
        helprequest.then(function (data) {
          data = data.replace('<img src="../../_static/patric_logo.png" class="logo" />', '');
          this.help_doc = domConstruct.toDom(data);
          var ibuttons = query('.infobutton');
          ibuttons.forEach(function (item) {
            // var help_text= help_doc.getElementById(item.attributes.name.value) || "Help text missing";
            // basic flat child workaround for getting help in safari. will break if nested.
            var help_text = null;
            for (var i = 0; i < this.help_doc.childNodes.length; i++) {
              if (this.help_doc.childNodes[i].id == item.attributes.name.value) {
                help_text = this.help_doc.childNodes[i];
              }
            }
            help_text = help_text || dom.byId(item.attributes.name.value, this.help_doc) || domConstruct.toDom('<div>Help text missing</div>');
            help_text.style.overflowY = 'auto';
            help_text.style.maxHeight = '400px';
            if (domClass.contains(item, 'dialoginfo')) {
              item.info_dialog = new Dialog({
                content: help_text,
                'class': 'helpModal',
                draggable: true,
                style: 'max-width: 350px;'
              });
              item.open = false;
              on(item, 'click', function () {
                if (!item.open) {
                  item.open = true;
                  item.info_dialog.show();
                }
                else {
                  item.open = false;
                  item.info_dialog.hide();
                }
              });
            }
            else if (domClass.contains(item, 'tooltipinfo')) {
              item.info_dialog = new TooltipDialog({
                content: help_text,
                'class': 'helpTooltip',
                style: 'overflow-y: auto; max-width: 350px; max-height: 400px',
                onMouseLeave: function () {
                  popup.close(item.info_dialog);
                }
              });
              on(item, 'mouseover', function () {
                popup.open({
                  popup: item.info_dialog,
                  around: item
                });
              });
              on(item, 'mouseout', function () {
                popup.close(item.info_dialog);
              });
            }
          });
        });
      }

    },

    onOutputPathChange: function (val) {
      registry.byClass('p3.widget.WorkspaceFilenameValidationTextBox').forEach(function (obj) {
        obj.set('path', val);
      });
    },

    startup: function () {
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }

      this.inherited(arguments);
      var state = this.get('state');
      if ((state == 'Incomplete') || (state == 'Error')) {
        this.submitButton.set('disabled', true);
      }

      this.watch('state', function (prop, val, val2) {
        if (val2 == 'Incomplete' || val2 == 'Error') {
          this.submitButton.set('disabled', true);
        } else {
          this.submitButton.set('disabled', false);
        }
      });

      if (!this.showCancel && this.cancelButton) {
        domClass.add(this.cancelButton.domNode, 'dijitHidden');
      }

      if (this.pageTitle) {
        window.document.title = this.pageTitle;
      }

      this.gethelp();
      Topic.subscribe('/upload', lang.hitch(this, 'onUploadMessage'));
      Topic.subscribe('/UploaderDialog', lang.hitch(this, function (msg) {
        if (msg && msg.type == 'UploaderClose') {
          this.validate();
        }
      }));
      if (this.submitButton) {
        var uploadTolltip = new TooltipDialog({
          content: 'Upload in progress, please wait.',
          onMouseLeave: function () {
            popup.close(uploadTolltip);
          }
        });
        var a = this.submitButton.domNode;
        on(a, 'mouseover', lang.hitch(this, function () {
          if (this.activeUploads && this.activeUploads.length != 0) {
            popup.open({
              popup: uploadTolltip,
              around: a,
              orient: ['above-centered', 'below-centered']
            });
          }
        }));
        on(a, 'mouseout', function () {
          popup.close(uploadTolltip);
        });
      }

      this._started = true;
    },

    setJobHook: function (callback, error_callback) {
      this.lookaheadJob = true;
      this.lookaheadCallback = callback;
      if (error_callback) {
        this.lookaheadError = error_callback;
      }
    },

    onReset: function (evt) {
      domClass.remove(this.domNode, 'Working');
      domClass.remove(this.domNode, 'Error');
      domClass.remove(this.domNode, 'Submitted');
    },

    onUploadMessage: function (msg) {
      var path = msg.workspacePath;
      if (msg.workspacePath.substr(-1) != '/') {
        path += '/';
      }
      path += msg.filename;
      if (msg && msg.type == 'UploadStart' && this.activeUploads.indexOf(msg.workspacePath + msg.filename) == -1) {
        // add file this.activeUploads
        this.activeUploads.push(path);
        this.validate();
        return;
      }

      if (msg && msg.type == 'UploadProgress') {
        this.validate();
        return;
      }

      if (msg && msg.type == 'UploadComplete') {
        // remove file from this.activeUploads
        var i = this.activeUploads.indexOf(path);
        if (i != -1) {
          this.activeUploads.splice(i, 1);
        }
        this.validate();

      }
    },

    validate: function () {
      var valid = this.inherited(arguments);
      if (valid && this.activeUploads.length == 0) {
        if (this.submitButton) { this.submitButton.set('disabled', false); }
        return valid;
      }

      if (this.submitButton) { this.submitButton.set('disabled', true); }
      return false;

    },

    doSubmit: function (values, start_params) {
      // tack on container build ID if specified in debugging panel
      if (window.App.containerBuildID) {
        values.container_id = window.App.containerBuildID;
      }
      if (this.lookaheadJob) {
        // var jobPath = `${this.output_path.value || ''}/${this.output_file.value || ''}`;
        var liveMsg = '<br>Live job!<br>Stick around to see results.';
        if (this.submittedMessage && this.lookaheadGif == null) {
          var gif_container = domConstruct.toDom('<div style="margin: 0 auto;"></div>');
          domConstruct.place(gif_container, this.submittedMessage);
          this.lookaheadGif = Loading(gif_container, liveMsg);
          var gif_container2 = domConstruct.toDom('<div style="margin: 0 auto;"></div>');
          domConstruct.place(gif_container2, this.workingMessage);
          this.lookaheadGif2 = Loading(gif_container2, liveMsg);
        }
      }

      if (window.App.noJobSubmission) {
        var dlg = new Dialog({
          title: 'Job Submission Params: ',
          content: '<pre>' + JSON.stringify(values, null, 4) + '</pre>'
        });
        dlg.startup();
        dlg.show();
        return;
      }
      return window.App.api.service('AppService.start_app2', [this.applicationName, values, start_params]).then(lang.hitch(this, function (results) {
        if (this.lookaheadJob) {
          var jobPath = `${this.output_path.value || ''}/${this.output_file.value || ''}`;
          var jobLabel = `${this.output_file.value || this.applicationName}`;
          var jobInfo = { 'jobID': results[0].id, 'jobLabel': jobLabel, 'jobPath': jobPath }
          JobManager.setJobHook(jobInfo, this.lookaheadCallback, this.lookaheadError);
        }
        return results;
      }), lang.hitch(this, function (error) {
        // if there is an error submitting the job and there is a lookahead error function, call it.
        // will also be called if JobManager gets back a failed.
        if (this.lookaheadJob && this.lookaheadError) {
          this.lookaheadError('Job submission not accepted. Please try again or report this error.');
        }
        throw (error);
      }));
    },

    onSubmit: function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        var values = this.getValues();

        domClass.add(this.domNode, 'Working');
        domClass.remove(this.domNode, 'Error');
        domClass.remove(this.domNode, 'Submitted');


        this.submitButton.set('disabled', true);
        var start_params = {
          'base_url': window.App.appBaseURL
        }
        _self.doSubmit(values, start_params).then(function (results) {
          console.log('Job Submission Results: ', results);

          if (window.gtag) {
            gtag('event', this.applicationName, { event_category: 'Services' });
          }

          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Submitted');
          _self.submitButton.set('disabled', false);
          registry.byClass('p3.widget.WorkspaceFilenameValidationTextBox').forEach(function (obj) {
            obj.reset();
          });
        }, function (err) {
          console.log('Error:', err);
          domClass.remove(_self.domNode, 'Working');
          domClass.add(_self.domNode, 'Error');
          _self.errorMessage.innerHTML = err;
        });
      } else {
        console.log('Form is incomplete');
      }
    },

    onCancel: function (evt) {
      console.log('Cancel/Close Dialog', evt);
      on.emit(this.domNode, 'dialogAction', { action: 'close', bubbles: true });
    },

    checkOutputName: function () {
      var charError = document.getElementsByClassName('charError')[0];
      var label_value = this.output_file.get('value');
      // charError.innerHTML = '&nbsp;';
      if (label_value.indexOf('/') !== -1 || label_value.indexOf('\\') !== -1) {
        charError.innerHTML = 'slashes are not allowed';
        // console.log(this.output_file);
        this.output_file.set('value', '');
      } else {
        if (label_value !== '') {
          charError.innerHTML = '&nbsp;';
        }
      }
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

    onAddSRRHelper: function (title) {
      this.srr_accession.set('state', '');
      if (!(typeof this.exp_design === 'undefined')) {
        // For the Rnaseq service.
        var toIngest = this.exp_design.checked ? this.srrConditionToAttachPt : this.srrToAttachPt;
        var lrec = { type: 'srr_accession', title: title };
        console.log('Create New Row', domConstruct);
      } else if (!(typeof this.srrToAttachPt === 'undefined')) {
        // For the FastqUtil service.
        var toIngest = this.srrToAttachPt;
        var lrec = { type: 'srr_accession', title: title };
        console.log('Create New Row', domConstruct);
      } else {
        // All other services.
        var toIngest = ['srr_accession'];
        if (this.applicationName === 'Variation') {
          var toIngest = { 'srr_accession': null };
        }
        var lrec = { _type: 'srr_accession', title: title };
      }
      var chkPassed = this.ingestAttachPoints(toIngest, lrec);
      var maybeSampleID;
      if (chkPassed && ('srr_sample_id' in this)) {
        maybeSampleID = this.srr_sample_id.get('displayedValue');
        chkPassed = this.checkForInvalidChars(maybeSampleID);
      }
      if (chkPassed) {
        var infoLabels = {
          title: { label: 'Title', value: 1 }
        };
        if (maybeSampleID){
          lrec.sample_id = maybeSampleID;
          console.log(lrec.sample_id)
        }

        this.addLibraryRow(lrec, infoLabels, 'srrdata');
      } else {
        throw new Error('Did not pass add library check. ');
      }
      this.srr_accession_validation_message.innerHTML = '';
      this.srr_accession.set('disabled', false);
      return true;
    },

    onAddSRR: function () {
      var accession = this.srr_accession.get('value');
      if (!accession.match(/^[a-z]{3}[0-9]+$/i)) {
        this.srr_accession_validation_message.innerHTML = ' Your input is not valid.<br>Hint: only one SRR at a time.';
      }
      else {
        // SRR5121082, ERR3827346, SRX981334
        this.srr_accession.set('disabled', true);
        this.srr_accession_validation_message.innerHTML = ' Validating ' + accession + ' ...';
        // January 2023: SRA is erratically returning Content-Type that is not text/xml
        // which is then causing this code to return plain text instead of parsed XML documents.
        // As a result, don't try to handleAs: 'xml' and instead explicitly parse in code.
        try {
          xhr.get(lang.replace(this.srrValidationUrl, [accession]),
            {
              sync: false,
              headers: { 'X-Requested-With': null },
              timeout: 15000,
              handleAs: 'text',
            }).then(
            lang.hitch(this, function (xml_text) {

              var show_failure = lang.hitch(this, function(msg, user_msg) {
                console.log('SRR validation failure: ' + msg);
                this.srr_accession.set('disabled', false);
                this.srr_accession_validation_message.innerHTML = ' ' + user_msg;
              });

              var xml_resp;
              var title = '';
              var runs = [];

              try {
                xml_resp = xmlParser.parse(xml_text);
              } catch (e) {
                return show_failure('XML parse failed: ' + e, 'Validation failed')
              }
              try {
                title = xml_resp.evaluate('//STUDY/DESCRIPTOR/STUDY_TITLE//text()', xml_resp, null, XPathResult.STRING_TYPE, null);
                title = title.stringValue;
              }
              catch (e) {
                console.log(xml_resp);
                console.error('Could not get title from SRA record.  Error: ' + e);
              }

              // Determine if the identifier provided is for an experiment
              //
              var keep_all_runs = false;
              var path = lang.replace('//EXPERIMENT_PACKAGE/EXPERIMENT[@accession="{0}"]', [accession]);
              var experiment = xml_resp.evaluate(path, xml_resp, null, XPathResult.ANY_TYPE, null);
              var item = experiment.iterateNext();
              if (item) {
                keep_all_runs = true;
              }
              try {
                var iter = xml_resp.evaluate('//EXPERIMENT_PACKAGE_SET/EXPERIMENT_PACKAGE/RUN_SET/RUN/@accession',
                                xml_resp, null, XPathResult.ANY_TYPE, null);
                var item = iter.iterateNext();
                while (item) {
                  if (item.textContent.toLowerCase() == accession.toLowerCase()) {
                    runs.push(item.textContent);
                    // Canonicalize case to what SRA uses
                    accession = item.textContent
                    break;
                  } else if (keep_all_runs) {
                    runs.push(item.textContent);
                  }
                  item = iter.iterateNext()
                }
              } catch (e) {
                console.log(xml_resp);
                console.error('Could not get run id from SRA record.  Error: ' + e);
              }
              if (runs.length > 0) {
                runs.forEach(lang.hitch(this, function(item) {
                  try {
                    this.srr_accession.setValue(item);
                    this.onAddSRRHelper(title);
                  } catch (e) {
                    this.srr_accession.set('disabled', false);
                    this.srr_accession_validation_message.innerHTML = ' Failed to add ' + accession;
                  }
                }));
              }  else {
                this.srr_accession.set('disabled', false);
                this.srr_accession_validation_message.innerHTML = ' The accession is not a run id.';
              }
            }),
            lang.hitch(this,
              function (err) {
                var status = err.response.status;
                this.srr_accession.set('disabled', false);
                //                console.log(status);
                //                console.log(err);
                if (status >= 400 && status < 500) {
                  // NCBI eutils gives error code 400 when the accession does not exist.
                  this.srr_accession_validation_message.innerHTML = ' Your input ' + accession + ' is not valid';
                } else if (err.message.startsWith('Timeout exceeded')) {
                  this.onAddSRRHelper(title);
                  this.srr_accession_validation_message.innerHTML = ' Timeout exceeded.';
                } else {
                  throw new Error('Unhandled SRA validation error.');
                }
              })
            );
        } catch (e) {
          console.error(e);
          this.srr_accession.set('disabled', false);
          this.srr_accession_validation_message.innerHTML = ' Something went wrong.';
          // this.srr_accession.set('value', '');
        }
      }
    },

    // Assumes the localStorage ID is "bvbrc_rerun_job"
    // Note: delete "bvbrc_rerun_job" key in function defined in each service (intakeRerunForm)
    // Note: omit "output_name" since the user should fill this out every time
    // Note: do paired/single/sra_libs in each service (intakeRerunForm) due to extra parameters in some libraries
    // CONTEXT: "this" refers to the "this" from where the function is called from
    // param_dict: is a dictionary mapping non-standard names for each service
    // Example: {"example_base_name":"example_service_name","single_end_libs":"single_end_libsWidget"}
    // Use this format when calling this function: AppBase.prototype.intakeRerunFormBase.call(this,param_dict);
    intakeRerunFormBase: function (param_dict) {
      var base_params = ['contigs', 'target_genome_id', 'taxon_name', 'genome_group', 'strategy', 'output_folder'];
      var localStorage = window.localStorage;
      if (localStorage.hasOwnProperty('bvbrc_rerun_job')) {
        var storage_params = JSON.parse(localStorage.getItem('bvbrc_rerun_job'));
        for (var idx = 0; idx < base_params.length; idx++) {
          if (this.hasOwnProperty(base_params[idx]) || param_dict.hasOwnProperty(base_params[idx])) {
            if (param_dict.hasOwnProperty(base_params[idx]) && param_dict[base_params[idx]] === 'NONE') {
              continue;
            }
            if (this.hasOwnProperty([base_params[idx]])) {
              var attach_point = base_params[idx];
              if (param_dict.hasOwnProperty('widget_map') && param_dict['widget_map'].hasOwnProperty(attach_point)) {
                attach_point = param_dict['widget_map'][attach_point];
              }
              if (!this[attach_point]) {
                console.log('(1) attach_point not found: ', attach_point);
              }
              else {
                this[attach_point].set('value', storage_params[base_params[idx]]);
              }
            }
            else if (param_dict.hasOwnProperty(base_params[idx])) {
              var attach_point = param_dict[base_params[idx]];
              var job_point = attach_point;
              if (param_dict.hasOwnProperty('widget_map') && param_dict['widget_map'].hasOwnProperty(attach_point)) {
                attach_point = param_dict['widget_map'][attach_point];
              }
              if (!this[attach_point]) {
                console.log('(2) attach_point not found: ', attach_point);
              }
              else {
                this[attach_point].set('value', storage_params[job_point]);
              }
            }
            else {
              console.log('(3) attach_point not found: ', base_params[idx]);
            }
          }
        }
        if (param_dict.hasOwnProperty('service_specific')) {
          var service_fields = param_dict['service_specific'];
          Object.keys(service_fields).forEach(function (job_field) {
            var attach_point = service_fields[job_field];
            if (storage_params.hasOwnProperty(job_field)) {
              this[attach_point].set('value', storage_params[job_field]);
            }
          }, this);
        }
      }
    },

    // Load library parameters from localStorage
    // Conditions assumes a field "experimental_conditions" is present in local_job
    loadLibrary: function (local_job, param_dict) {
      local_job.paired_end_libs.forEach(lang.hitch(this, function (paired_lib) {
        var lrec = { _type: 'paired', type: 'paired' };
        this.setupLibraryData(lrec, paired_lib, 'paired');
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read1: { label: 'Read1', value: 1 },
          read2: { label: 'Read2', value: 1 },
          interleaved: { label: 'Interleaved', value: 0 },
          read_orientation_outward: { label: 'Mate Paired', value: 0 }
        };
        this.addLibraryRowFormFill(lrec, infoLabels, 'pairdata');
      }));
      local_job.single_end_libs.forEach(lang.hitch(this, function (single_lib) {
        var lrec = { _type: 'single', type: 'single' };
        this.setupLibraryData(lrec, single_lib, 'single');
        var infoLabels = {
          platform: { label: 'Platform', value: 1 },
          read: { label: 'Read File', value: 1 }
        };
        this.addLibraryRowFormFill(lrec, infoLabels, 'singledata');
      }));
      // load SRA names: can be in eithers srr_ids (list of ids) or sra_libs/srr_libs (list of key-item entries)
      // TODO: change this to one list
      if (local_job.srr_ids) {
        local_job.srr_ids.forEach(lang.hitch(this, function (srr_id) {
          var lrec = { _type: 'srr_accession', type: 'srr_accession', title: srr_id };
          // this.setupLibraryData(lrec,srr_id,'srr_accession');
          lrec._id = this.makeLibraryIDFormFill(srr_id, lrec.type);
          lrec.id = this.makeLibraryIDFormFill(srr_id, lrec.type);
          var infoLabels = {
            title: { label: 'Title', value: 1 }
          };
          this.addLibraryRowFormFill(lrec, infoLabels, 'srrdata');
        }));
      }
      if (local_job.sra_libs) {
        local_job.sra_libs.forEach(lang.hitch(this, function (sra_lib) {
          var lrec = { _type: 'srr_accession', type: 'srr_accession', title: sra_lib['srr_accession'] };
          this.setupLibraryData(lrec, sra_lib, 'srr_accession');
          var infoLabels = {
            title: { label: 'Title', value: 1 }
          };
          this.addLibraryRowFormFill(lrec, infoLabels, 'srrdata');
        }));
      }
      if (local_job.srr_libs) {
        local_job.srr_libs.forEach(lang.hitch(this, function (sra_lib) {
          var lrec = { _type: 'srr_accession', type: 'srr_accession', title: sra_lib['srr_accession'] };
          this.setupLibraryData(lrec, sra_lib, 'srr_accession');
          var infoLabels = {
            title: { label: 'Title', value: 1 }
          };
          this.addLibraryRowFormFill(lrec, infoLabels, 'srrdata');
        }));
      }
    },

    addLibraryRowFormFill: function (lrec, infoLabels, mode) {
      var tr = this.libsTable.insertRow(0);
      lrec._row = tr;
      lrec.row = tr;
      var td = domConstruct.create('td', { 'class': 'textcol ' + mode, libID: this.libCreated, innerHTML: '' }, tr);
      var advInfo = [];
      switch (mode) {
        case 'pairdata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryNameFormFill(lrec, 'paired') + '</div>';
          advInfo.push('Paired Library');
          break;
        case 'singledata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryNameFormFill(lrec, 'single') + '</div>';
          advInfo.push('Single Library');
          break;
        case 'srrdata':
          td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryNameFormFill(lrec, 'srr_accession') + '</div>';
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
      // add condition stuff
      if (lrec.hasOwnProperty('icon')) {
        domConstruct.create('td', { 'class': 'iconcol', innerHTML: lrec.icon }, tr);
      }
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
      if (this.addedLibs.counter < this.startingRows) {
        this.libsTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        this.destroyLibRow(lrec._id, '_id');
      }));
      // TODO: standardize this across services
      lrec._handle = handle;
      lrec.handle = handle;
      this.libraryStore.put(lrec);
      // debugger;
      this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
    },

    makeLibraryIDFormFill: function (job_data, mode) {
      switch (mode) {
        case 'paired':
          var fn1 = job_data['read1'];
          var fn2 = job_data['read2'];
          return fn1 + fn2;
        case 'single':
          var fn = job_data['read'];
          return fn;
        case 'srr_accession':
          if (job_data.hasOwnProperty('title')) {
            var name = job_data['title'];
          }
          else if (job_data.hasOwnProperty('srr_accession')) {
            var name = job_data['srr_accession'];
          }
          else {
            var name = job_data;
          }
          return '' + name;
        default:
          console.log('error');
          return false;
      }
    },

    cleanFasta: function (fastaText) {
      /*
      Removes unnecessary whitespace from the FASTA text.
      */
      var newFasta = '';
      var records = fastaText.trim();
      records = records.replace(/[\r\n]/g, '\n');
      records = records.replace(/\r|\f/g, '\n');
      records = records.replace(/^\s*[\r\n]/gm, '');
      var arr = records.split('\n');
      for (var i = 0; i < arr.length; i++) {
        if (arr[i][0] == '>') {
          newFasta += arr[i].trim();
        } else {
          newFasta += arr[i].replace(/\s/g, '');
        }
        if (i < arr.length - 1) {
          newFasta += '\n';
        }
      }
      return newFasta;
    },

    isDNA: function (sequenceText) {
      var st = sequenceText.toLowerCase();
      var count = 0;
      var gaps = 0;
      for (let i = 0; i < st.length; i++) {
        if (st[i] == '-') {
          gaps += 1;
        }
        else if (['a', 'c', 't', 'g', 'n'].includes(st[i])) {
          count += 1;
        }
      }
      if (sequenceText.length > 0) {
        return (count / (sequenceText.length - gaps)) >= 0.75;
      }
      return undefined;
    },

    validateFasta: function (fastaText, seqType = 'aa', replace = true, firstName = 'record_1') {
      /*
      Calculates the validity of a FASTA file.

      Parameters
      ----------
      fastaText: string
        A string representing a FASTA data
      seqType: string
        Use 'dna' to indicate that the FASTA file should just be nucleotide sequences.
      firstName: The fasta id to call the first record.

      Returns
      -------
      valid: boolean
        True if valid FASTA. False if invalid.
      status: string
        Description of issues found with the FASTA file.
      numseq: int
        The number of sequences.
      message: string
        Example message

      */
      var valid = false;
      var status = '';
      var numseq = 0;
      var message = '';
      var trimFasta = '';
      var reto = {
        valid,
        status,
        numseq,
        message,
        trimFasta,
      };
      if (!this.ignoreMaxFastaTextLimit && fastaText.length > this.maxFastaText) {
        reto.status = 'too_long';
        reto.message = 'The text input is too large. Save the data to a file.';
        return reto;
      }
      var records = this.cleanFasta(fastaText);
      reto.trimFasta = records;
      records = records.replace(/^\s*[\r\n]/gm, '');
      if (records != '' && records[0] != '>' && !replace) {
        reto.status = 'invalid_start'
        reto.message = 'A fasta record is at least two lines and starts with ">".'
        return reto;
      } else if (records != '' && records[0] != '>' && replace) {
        records = '>' + firstName + '\n' + records;
        reto.trimFasta = records;
      }
      var arr = records.split('\n');
      if (arr.length == 0 || arr[0] == '') {
        reto.status = 'empty'
        reto.message = '';
        return reto;
      }
      if (arr[0][0] != '>' || arr.length <= 1) {
        reto.status = 'too_short';
        reto.message = 'A fasta record is at least two lines and starts with ">".';
        return reto;
      }
      var nextseq = 0; // Checks that there are the same number of identifiers as sequences.
      var protein = false;
      for (var i = 0; i < arr.length; i++) {
        if (arr[i][0] == '>') {
          numseq += 1;
          nextseq += 1;
          continue;
        }
        nextseq -= 1;
        nextseq = Math.max(0, nextseq);
        if (!protein && !this.isDNA(arr[i])) { // !(/^[ACTGN\-\n]+$/i.test(arr[i].toUpperCase()))
          if (seqType == 'dna') {
            reto.status = 'need_dna'
            reto.message = 'Too few nucleotide letters on line ' + (i + 1) + '.';
            return reto;
          }
          protein = true;
        }
        if (!(/^[ABCDEFGHIJKLMNOPQRSTUVWXYZ\-\n]+$/i.test(arr[i].toUpperCase()))) { // extended amino acid alphabet
          reto.status = 'invalid_letters';
          reto.message = ' The sequences must have valid letters. Check line: ' + (i + 1) + '.';
          return reto;
        }
      }
      if (nextseq) {
        reto.status = 'missing_seqs';
        reto.message = ' There are missing sequences or extra fasta identifier lines.'
        return reto;
      }
      reto.valid = true;
      reto.status = (protein ? 'valid_protein' : 'valid_dna');
      reto.numseq = numseq;
      reto.message = '';
      return reto;
    },

    makeLibraryNameFormFill: function (job_data, mode) {
      switch (mode) {
        case 'paired':
          var fn = job_data['read1'].split('/')[job_data['read1'].split('/').length - 1];
          var fn2 = job_data['read2'].split('/')[job_data['read2'].split('/').length - 1];
          var maxName = 14;
          if (fn.length > maxName) {
            fn = fn.substr(0, (maxName / 2) - 2) + '...' + fn.substr((fn.length - (maxName / 2)) + 2);
          }
          if (fn2.length > maxName) {
            fn2 = fn2.substr(0, (maxName / 2) - 2) + '...' + fn2.substr((fn2.length - (maxName / 2)) + 2);
          }
          return 'P(' + fn + ', ' + fn2 + ')';
        case 'single':
          var fn = job_data['read'].split('/')[job_data['read'].split('/').length - 1];
          maxName = 24;
          if (fn.length > maxName) {
            fn = fn.substr(0, (maxName / 2) - 2) + '...' + fn.substr((fn.length - (maxName / 2)) + 2);
          }
          return 'S(' + fn + ')';
        case 'srr_accession':
          if (job_data.hasOwnProperty('srr_accession')) {
            var name = job_data['srr_accession'];
          }
          else if (job_data.hasOwnProperty('title')) {
            var name = job_data['title'];
          }
          else {
            var name = job_data;
          }
          return '' + name;
        default:
          return '';
      }
    },

    // Called to get the necessary information into lrec
    setupLibraryData: function (lrec, job_data, mode) {
      lrec._id = this.makeLibraryIDFormFill(job_data, mode);
      lrec.id = this.makeLibraryIDFormFill(job_data, mode);
      Object.keys(job_data).forEach(function (field) {
        lrec[field] = job_data[field];
      });
    }
  });
});
