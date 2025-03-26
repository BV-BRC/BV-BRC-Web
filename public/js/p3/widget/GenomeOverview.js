define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/request', 'dojo/topic',
  'dojo/dom-class', 'dojo/query', 'dojo/dom-style', 'dojo/text!./templates/GenomeOverview.html', 'dojo/dom-construct',
  'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dijit/_WidgetsInTemplateMixin', 'dijit/Dialog',
  '../util/PathJoin', './SelectionToGroup', './GenomeFeatureSummary', './DataItemFormatter',
  './ExternalItemFormatter', './DownloadTooltipDialog', 'dijit/form/TextBox', 'dijit/form/Form', './Confirmation',
  './InputList', 'dijit/form/SimpleTextarea', 'dijit/form/DateTextBox', './MetaEditor',
  '../DataAPI', './PermissionEditor', './ServicesTooltipDialog', 'dijit/popup'
], function (
  declare, lang, on, xhr, Topic,
  domClass, domQuery, domStyle, Template, domConstruct,
  WidgetBase, Templated, _WidgetsInTemplateMixin, Dialog,
  PathJoin, SelectionToGroup, GenomeFeatureSummary, DataItemFormatter,
  ExternalItemFormatter, DownloadTooltipDialog, TextBox, Form, Confirmation,
  InputList, TextArea, DateTextBox, MetaEditor,
  DataAPI, PermissionEditor, ServicesTooltipDialog, popup
) {

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'GenomeOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    genome: null,
    state: null,
    context: 'bacteria',
    bacteriSummaryWidgets: ['apSummaryWidget', 'gfSummaryWidget', 'pfSummaryWidget', 'spgSummaryWidget'],
    virusSummaryWidgets: ['gfSummaryWidget'],
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/organisms_genome/overview.html',

    _setContextAttr: function (context) {
      if (this.context !== context) {
        if (context === 'virus') {
          this.changeToVirusContext()
        } else {
          this.changeToBacteriaContext()
        }
      }

      this.context = context
    },

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
    changeToVirusContext: function () {
      domClass.add(this.pfSummaryWidget.domNode.parentNode, 'hidden');
      domClass.add(this.spgSummaryWidget.domNode.parentNode, 'hidden');
    },
    changeToBacteriaContext: function () {
      domClass.remove(this.pfSummaryWidget.domNode.parentNode, 'hidden');
      domClass.remove(this.spgSummaryWidget.domNode.parentNode, 'hidden');
    },
    _setGenomeAttr: function (genome) {
      if (this.genome && (this.genome.genome_id == genome.genome_id)) {
        // console.log("Genome ID Already Set")
        return;
      }
      this.genome = genome;

      this.createSummary(genome);
      this.createPubMed(genome);
      this.createExternalLinks(genome);

      // context sensitive widget update
      const sumWidgets = (this.context === 'bacteria') ? this.bacteriSummaryWidgets : this.virusSummaryWidgets
      sumWidgets.forEach(function (w) {
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

    createExternalLinks: function (genome) {
      domConstruct.empty(this.externalLinkNode);

      // BEI Resources
      var linkBEI = 'https://www.beiresources.org/Catalog.aspx?f_instockflag=In+Stock%23~%23Temporarily+Out+of+Stock&q=' + genome.genome_name;
      var string = domConstruct.create('a', {
        href: linkBEI,
        innerHTML: 'BEI Resources',
        target: '_blank'
      }, this.externalLinkNode);
      domConstruct.place('<br>', string, 'after');
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

        DataAPI.setGenomePermissions(ids, newPerms).then(function (res) {
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
      popup.open({
        popup: new DownloadTooltipDialog({
          selection: [this.genome],
          containerType: 'genome_data',
          isGenomeOverview: true
        }),
        parent: this,
        around: this.genomeDownloadButton,
        orient: ['below']
      });
    },

    onClickUserGuide: function () {
      window.open(PathJoin(this.docsServiceURL, this.tutorialLink));
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      if (this.genome) {
        this.set('genome', this.genome);
      }
    },

    // TODO: ask about default database type
    // TODO: ask about services that require reads
    onGenomeServiceSelection: function () {
      console.log(this.genome);
      if (!this.genome.genome_id) {
        console.log('genome_id not found');
        return;
      }
      if (this.genome.genome_id === '') {
        console.log('genome_id is empty');
        return;
      }
      var data = {};
      data.genome = this.genome;
      data.data_type = 'genome';
      data.multiple = false;
      popup.open({
        popup: new ServicesTooltipDialog({
          context: 'genome_overview',
          data: data,
          multiple: false
        }),
        parent: this,
        around: this.genomeServiceSelectionButton,
        orient: ['below']
      });
    }
  });
});
