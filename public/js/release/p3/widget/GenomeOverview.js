require({cache:{
'url:p3/widget/templates/GenomeOverview.html':"<div>\n  <div class=\"column-sub\">\n    <div class=\"section\">\n      <div data-dojo-attach-point=\"genomeSummaryNode\">\n        Loading Genome Summary...\n      </div>\n    </div>\n  </div>\n\n  <div class=\"column-prime\">\n    <div class=\"section hidden\">\n      <h3 class=\"close section-title\" title=\"Antimicrobial resistance data from antimicrobial susceptibility testing\"><span class=\"wrap\">Antimicrobial Resistance</span></h3>\n      <div class=\"apSummaryWidget\" data-dojo-attach-point=\"apSummaryWidget\"\n      data-dojo-type=\"p3/widget/AMRPanelSummary\"></div>\n    </div>\n\n    <div class=\"section\">\n      <h3 style=\"margin-bottom:-26px\" class=\"close section-title\" title=\"Summary of genomic features annotated by PATRIC and GenBank/RefSeq\"><span class=\"wrap\">Genomic Features</span></h3>\n      <div class=\"gfSummaryWidget\" data-dojo-attach-point=\"gfSummaryWidget\"\n      data-dojo-type=\"p3/widget/GenomeFeatureSummary\"></div>\n    </div>\n\n    <div class=\"section\">\n      <h3 style=\"margin-bottom:-26px;margin-top:40px\" class=\"close section-title\" title=\"Summary of proteins by their functional attributes and protein family assignments\"><span class=\"wrap\">Protein Features</span></h3>\n      <div class=\"pfSummaryWidget\" data-dojo-attach-point=\"pfSummaryWidget\"\n      data-dojo-type=\"p3/widget/ProteinFeatureSummary\"></div>\n      <p class=\"proteinFeature\" style=\"display:none;text-align:center;margin-top:-15px;margin-bottom:40px;font-family:times;font-size:11pt\">Feature Count</p>\n    </div>\n\n    <div class=\"section\">\n      <h3 style=\"margin-bottom:-26px;margin-top:40px\" class=\"close section-title\" title=\"Genes of special interest to infectious disease researchers, such as virulence factors, antimicrobial resistance genes, human homologs, and potential drug targets\"><span class=\"wrap\">Specialty Genes</span></h3>\n      <div class=\"spgSummaryWidget\" data-dojo-attach-point=\"spgSummaryWidget\"\n      data-dojo-type=\"p3/widget/SpecialtyGeneSummary\"></div>\n      <p class=\"specialty\" style=\"display:none;text-align:center;margin-top:-60px;margin-bottom:40px;font-family:times;font-size:11pt\">Gene Count</p>\n\n    </div>\n  </div>\n\n  <div class=\"column-opt\">\n    <div class=\"section\">\n      <div class=\"BrowserHeader right\">\n        <div class=\"ActionButtonWrapper\" data-dojo-attach-event=\"onclick:onAddGenome\" style=\"margin-top: 2px\">\n          <div class=\"ActionButton fa icon-object-group fa-2x\"></div>\n          <div class=\"ActionButtonText\">Add To Group</div>\n        </div>\n\n        <div class=\"ActionButtonWrapper btnDownloadGenome\" data-dojo-attach-event=\"onclick:onDownload\" style=\"margin-top: 2px\">\n          <div class=\"ActionButton fa icon-download fa-2x\"></div>\n          <div class=\"ActionButtonText\">Download</div>\n        </div>\n\n        <div class=\"ActionButtonWrapper btnShareGenome\" data-dojo-attach-event=\"onclick:onShareGenome\" style=\"margin-top: 2px\">\n          <div class=\"ActionButton fa icon-user-plus fa-2x\"></div>\n          <div class=\"ActionButtonText\">Share</div>\n        </div>        \n      </div>\n      <div class=\"clear\"></div>\n      <!--\n      <div class=\"SummaryWidget\">\n      <button data-dojo-attach-event=\"onclick:onAddGenome\">Add Genome to Group</button>\n      <button data-dojo-attach-event=\"onclick:onDownload\">Download Genome</button>\n    </div>\n  -->\n</div>\n<div class=\"section\">\n  <h3 class=\"section-title close2x\" title=\"Recent PubMed articles relevant to the current context\"><span class=\"wrap\">Recent PubMed Articles</span></h3>\n  <div data-dojo-attach-point=\"pubmedSummaryNode\">\n    Loading...\n  </div>\n</div>\n</div>\n</div>\n"}});
define("p3/widget/GenomeOverview", [
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/request', 'dojo/topic',
  'dojo/dom-class', 'dojo/query', 'dojo/dom-style', 'dojo/text!./templates/GenomeOverview.html', 'dojo/dom-construct',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin', 'dijit/Dialog',
  '../util/PathJoin', './SelectionToGroup', './GenomeFeatureSummary', './DataItemFormatter',
  './ExternalItemFormatter', './AdvancedDownload', 'dijit/form/TextBox', 'dijit/form/Form', './Confirmation',
  './InputList', 'dijit/form/SimpleTextarea', 'dijit/form/DateTextBox', './MetaEditor',
  '../DataAPI', './PermissionEditor'
], function (
  declare, lang, on, xhr, Topic,
  domClass, domQuery, domStyle, Template, domConstruct,
  WidgetBase, Templated, _WidgetsInTemplateMixin, Dialog,
  PathJoin, SelectionToGroup, GenomeFeatureSummary, DataItemFormatter,
  ExternalItemFormatter, AdvancedDownload, TextBox, Form, Confirmation,
  InputList, TextArea, DateTextBox, MetaEditor,
  DataAPI, PermissionEditor
) {

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'GenomeOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    genome: null,
    state: null,
    sumWidgets: ['apSummaryWidget', 'gfSummaryWidget', 'pfSummaryWidget', 'spgSummaryWidget'],


    _setStateAttr: function (state) {
      this._set('state', state);
      if (state.genome) {
        this.set('genome', state.genome);
      } else {
        domConstruct.empty(this.genomeSummaryNode);
        domConstruct.empty(this.pubmedSummaryNode);
        domConstruct.place(domConstruct.toDom('<br><h4>Genome not found</h4>'), this.genomeSummaryNode, 'first');
        domConstruct.place(domConstruct.toDom('Not available'), this.pubmedSummaryNode, 'first');
      }
    },

    _setGenomeAttr: function (genome) {
      if (this.genome && (this.genome.genome_id == genome.genome_id)) {
        // console.log("Genome ID Already Set")
        return;
      }
      this.genome = genome;

      this.createSummary(genome);
      this.createPubMed(genome);

      this.sumWidgets.forEach(function (w) {
        if (this[w]) {
          this[w].set('query', 'eq(genome_id,' + this.genome.genome_id + ')');
        }
      }, this);

      // display/hide download button per public status
      if (genome['public']) {
        domStyle.set(domQuery('div.ActionButtonWrapper.btnDownloadGenome')[0], 'display', 'inline-block');
      } else {
        // private, hide button
        domStyle.set(domQuery('div.ActionButtonWrapper.btnDownloadGenome')[0], 'display', 'none');
      }

      // hide share button if genome not owned by user
      if (genome.owner === window.App.user.id) {
        domStyle.set(domQuery('div.ActionButtonWrapper.btnShareGenome')[0], 'display', 'inline-block');
      } else {
        domStyle.set(domQuery('div.ActionButtonWrapper.btnShareGenome')[0], 'display', 'none');
      }
    },

    createSummary: function (genome) {
      var self = this;
      domConstruct.empty(self.genomeSummaryNode);

      domConstruct.place(DataItemFormatter(genome, 'genome_data', {}), self.genomeSummaryNode, 'first');

      // if user owns genome, add edit button
      if (window.App.user && genome.owner == window.App.user.id) {
        var editBtn = domConstruct.toDom('<a style="float: right; margin-top: 15px;">' +
          '<i class="icon-pencil"></i> Edit' +
        '</a>');

        on(editBtn, 'click', function () {
          var tableNames = DataItemFormatter(genome, 'genome_meta_table_names', {}),
            spec = DataItemFormatter(genome, 'genome_meta_spec', {});

          var editor = new MetaEditor({
            tableNames: tableNames,
            spec: spec,
            data: genome,
            dataId: genome.genome_id,
            onSuccess: function () {
              // get new genome meta
              xhr.get(PathJoin(self.apiServiceUrl, 'genome', genome.genome_id), {
                headers: {
                  accept: 'application/json',
                  'X-Requested-With': null,
                  Authorization: (window.App.authorizationToken || '')
                },
                handleAs: 'json'
              }).then(lang.hitch(this, function (genome) {
                self.createSummary(genome);

                // notify user
                Topic.publish('/Notification', {
                  message: 'genome metadata updated',
                  type: 'message'
                });
              }));

            }
          });
          editor.startup();
          editor.show();
        });
        domConstruct.place(editBtn, this.genomeSummaryNode, 'first');
      }
    },

    createPubMed: function (genome) {
      domConstruct.empty(this.pubmedSummaryNode);
      domConstruct.place(ExternalItemFormatter(genome, 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
    },

    onAddGenome: function () {
      if (!window.App.user || !window.App.user.id) {
        Topic.publish('/login');
        return;
      }

      var dlg = new Dialog({ title: 'Add This Genome To Group' });
      var stg = new SelectionToGroup({
        selection: [this.genome],
        type: 'genome_group'
      });
      on(dlg.domNode, 'dialogAction', function () {
        dlg.hide();
        setTimeout(function () {
          dlg.destroy();
        }, 2000);
      });
      domConstruct.place(stg.domNode, dlg.containerNode, 'first');
      stg.startup();
      dlg.startup();
      dlg.show();
    },

    onShareGenome: function () {
      if (!window.App.user || !window.App.user.id) {
        Topic.publish('/login');
        return;
      }

      var self = this;

      var initialPerms = DataAPI.solrPermsToObjs([this.genome]);

      var onConfirm = function (newPerms) {
        var ids = [self.genome.genome_id];

        Topic.publish('/Notification', {
          message: "<span class='default'>Updating permissions (this could take several minutes)...</span>",
          type: 'default',
          duration: 50000
        });

        var prom = DataAPI.setGenomePermissions(ids, newPerms).then(function (res) {
          self.refreshSummary();

          Topic.publish('/Notification', {
            message: 'Permissions updated.',
            type: 'message'
          });

        }, function (err) {
          console.log('error', err);
          Topic.publish('/Notification', {
            message: 'Failed. ' + err.response.status,
            type: 'error'
          });
        });
      };

      var permEditor = new PermissionEditor({
        selection: [this.genome],
        onConfirm: onConfirm,
        user: window.App.user.id || '',
        useSolrAPI: true,
        permissions: initialPerms
      });

      permEditor.show();

    },

    refreshSummary: function () {
      xhr.get(PathJoin(this.apiServiceUrl, 'genome', this.genome.genome_id), {
        headers: {
          accept: 'application/json',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (genome) {
        this.createSummary(genome);
      }), lang.hitch(this, function (error) {
        console.log('error fetching genome', error);
      }));
    },

    onDownload: function () {
      var dialog = new Dialog({ title: 'Download' });
      var advDn = new AdvancedDownload({ selection: [this.genome], containerType: 'genome_data' });
      domConstruct.place(advDn.domNode, dialog.containerNode);
      dialog.show();
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      if (this.genome) {
        this.set('genome', this.genome);
      }
    }
  });
});
