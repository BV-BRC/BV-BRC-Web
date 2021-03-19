define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./templates/AppLogin.html', 'dijit/form/Form', 'p3/widget/WorkspaceObjectSelector', 'dojo/topic', 'dojo/_base/lang',
  '../../util/PathJoin', 'dojox/xml/parser',
  'dijit/Dialog', 'dojo/request', 'dojo/dom-construct', 'dojo/query', 'dijit/TooltipDialog', 'dijit/popup', 'dijit/registry', 'dojo/dom'
], function (
  declare, WidgetBase, on,
  domClass, Templated, WidgetsInTemplate,
  LoginTemplate, FormMixin, WorkspaceObjectSelector, Topic, lang,
  PathJoin, xmlParser,
  Dialog, xhr, domConstruct, query, TooltipDialog, popup, registry, dom
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
    help_doc: null,
    activeUploads: [],
    // srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmax=1&db=sra&field=accn&term={0}&retmode=json',
    srrValidationUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?retmax=10&db=sra&id={0}', // the data we need is in xml string no matter what.

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
          if (this.activeUploads && this.activeUploads.length != 0)
          { popup.open({
            popup: uploadTolltip,
            around: a,
            orient: ['above-centered', 'below-centered']
          }); }
        }));
        on(a, 'mouseout', function () {
          popup.close(uploadTolltip);
        });
      }

      this._started = true;
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

    onSubmit: function (evt) {
      var _self = this;

      evt.preventDefault();
      evt.stopPropagation();
      if (this.validate()) {
        var values = this.getValues();

        domClass.add(this.domNode, 'Working');
        domClass.remove(this.domNode, 'Error');
        domClass.remove(this.domNode, 'Submitted');

        // tack on container build ID if specified in debugging panel
        if (window.App.containerBuildID) {
          values.container_id = window.App.containerBuildID;
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

        this.submitButton.set('disabled', true);
        var start_params = {
          'base_url': window.App.appBaseURL
        }
        window.App.api.service('AppService.start_app2', [this.applicationName, values, start_params]).then(function (results) {
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
      if (chkPassed) {
        var infoLabels = {
          title: { label: 'Title', value: 1 }
        };
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
      var isrun = false;
      if (!accession.match(/^[a-z]{3}[0-9]+$/i)) {
        this.srr_accession_validation_message.innerHTML = ' Your input is not valid.<br>Hint: only one SRR at a time.';
      }
      else {
        // SRR5121082, ERR3827346, SRX981334
        this.srr_accession.set('disabled', true);
        this.srr_accession_validation_message.innerHTML = ' Validating ' + accession + ' ...';
        var title = '';
        try {
          xhr.get(lang.replace(this.srrValidationUrl, [accession]),
            {
              sync: false, handleAs: 'xml', headers: { 'X-Requested-With': null }, timeout: 15000
            }).then(
            lang.hitch(this, function (xml_resp) {
              try {
                title = xml_resp.children[0].children[0].childNodes[3].children[1].childNodes[0].innerHTML;
              }
              catch (e) {
                console.log(xml_resp);
                console.error('Could not get title from SRA record.  Error: ' + e);
              }
              try {
                xml_resp.children[0].children[0].childNodes.forEach(function (item) {
                  if (item.nodeName == 'RUN_SET') {
                    item.childNodes.forEach(function (currentValue) {
                      if (accession == currentValue.attributes.accession.nodeValue) {
                        isrun = true;
                      }
                    });
                  }
                });
              }
              catch (e) {
                console.log(xml_resp);
                console.error('Could not get run id from SRA record.  Error: ' + e);
              }
              if (isrun) {
                this.onAddSRRHelper(title);
              } else {
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
    }

  });
});
