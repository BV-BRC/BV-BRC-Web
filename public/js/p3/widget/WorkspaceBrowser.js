define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', 'dojo/query',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-attr',
  './WorkspaceExplorerView', 'dojo/topic', './ItemDetailPanel',
  './ActionBar', 'dojo/_base/Deferred', '../WorkspaceManager', 'dojo/_base/lang', '../util/PathJoin',
  './Confirmation', './SelectionToGroup', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dijit/popup', 'dijit/form/Select', './ContainerActionBar', './GroupExplore', './PerspectiveToolTip',
  'dijit/form/TextBox', './WorkspaceObjectSelector', './PermissionEditor',
  'dojo/promise/all', '../util/encodePath',

  'dojo/NodeList-traverse'
], function (
  declare, BorderContainer, on, query,
  domClass, domConstruct, domAttr,
  WorkspaceExplorerView, Topic, ItemDetailPanel,
  ActionBar, Deferred, WorkspaceManager, lang, PathJoin,
  Confirmation, SelectionToGroup, Dialog, TooltipDialog,
  popup, Select, ContainerActionBar, GroupExplore, PerspectiveToolTipDialog,
  TextBox, WSObjectSelector, PermissionEditor,
  All, encodePath
) {

  var mmc = '<div class="wsActionTooltip" rel="dna">Nucleotide</div><div class="wsActionTooltip" rel="protein">Amino Acid</div>';
  var viewMSATT = new TooltipDialog({
    content: mmc,
    onMouseLeave: function () {
      popup.close(viewMSATT);
    }
  });

  on(viewMSATT.domNode, 'click', function (evt) {
    var rel = evt.target.attributes.rel.value;
    var sel = viewMSATT.selection;
    Topic.publish('/navigate', { href: '/view/MSA/' + rel + sel, target: 'blank' });
  });

  return declare([BorderContainer], {
    baseClass: 'WorkspaceBrowser',
    disabled: false,
    path: '/',
    gutters: false,
    navigableTypes: ['parentfolder', 'folder', 'job_result', 'experiment_group',
      'experiment', 'unspecified', 'contigs', 'reads', 'model', 'txt', 'html',
      'pdf', 'string', 'json', 'csv', 'diffexp_experiment',
      'diffexp_expression', 'diffexp_mapping', 'diffexp_sample',
      'diffexp_input_data', 'diffexp_input_metadata', 'svg', 'gif', 'png', 'jpg'],
    design: 'sidebar',
    splitter: false,
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'user_guides/workspaces/workspace.html',
    startup: function () {
      var self = this;

      if (this._started) {
        return;
      }

      this.actionPanel = new ActionBar({
        splitter: false,
        region: 'right',
        layoutPriority: 2,
        style: 'width: 57px; text-align: center;'
      });

      this.browserHeader = new ContainerActionBar({
        region: 'top',
        className: 'BrowserHeader WSBrowserHeader',
        path: this.path,
        layoutPriority: 3
      });

      this.actionPanel.addAction('ToggleItemDetail', 'fa icon-chevron-circle-right fa-2x', {
        label: 'HIDE',
        persistent: true,
        validTypes: ['*'],
        tooltip: 'Toggle Selection Detail'
      }, function (selection) {
        if (self.getChildren().some(function (child) {
          return child === self.itemDetailPanel;
        })) {
          self.removeChild(self.itemDetailPanel);
        } else {
          self.addChild(self.itemDetailPanel);
        }
      }, true);

      // show / hide item detail panel button
      var hideBtn = query('[rel="ToggleItemDetail"]', this.actionPanel.domNode)[0];
      on(hideBtn, 'click', function (e) {
        var icon = query('.fa', hideBtn)[0],
          text = query('.ActionButtonText', hideBtn)[0];

        domClass.toggle(icon, 'icon-chevron-circle-right');
        domClass.toggle(icon, 'icon-chevron-circle-left');

        if (domClass.contains(icon, 'icon-chevron-circle-left'))
        { domAttr.set(text, 'textContent', 'SHOW'); }
        else
        { domAttr.set(text, 'textContent', 'HIDE'); }
      });

      this.actionPanel.addAction('UserGuide', 'fa icon-info-circle fa-2x', {
        label: 'GUIDE <i class="icon-external-link"></i>',
        persistent: true,
        validTypes: ['*'],
        tooltip: 'Open User Guide in a new Tab'
      }, function (selection, container) {
        var type = container && '_resultType' in container ? container._resultType : null;
        var path;
        if (!type) {
          path = self.tutorialLink;
        } else if (type == 'GenomeAssembly') {
          path = 'user_guides/services/genome_assembly_service.html#output-results';
        } else if (type == 'GenomeAnnotation') {
          path = 'user_guides/services/genome_annotation_service.html#output-results';
        } else if (type == 'ComprehensiveGenomeAnalysis') {
          path = 'user_guides/services/comprehensive_genome_analysis_service.html#output-results';
        } else if (type == 'GenomeAlignment') {
          path = 'user_guides/services/genome_alignment_service.html#output-results';
        } else if (type == 'MetagenomeBinning') {
          path = 'user_guides/services/metagenomic_binning_service.html#output-results';
        } else if (type == 'MetagenomicReadMapping') {
          path = 'user_guides/services/metagenomic_read_mapping_service.html#output-results';
        } else if (type == 'TaxonomicClassification') {
          path = 'user_guides/services/taxonomic_classification_service.html#output-results';
        } else if (type == 'PhylogeneticTree') {
          path = 'user_guides/services/phylogenetic_tree_building_service.html#output-results';
        } else if (type == 'RNASeq') {
          path = 'user_guides/services/rna_seq_analysis_service.html#output-results';
        } else if (type == 'TnSeq') {
          path = 'user_guides/services/tn_seq_analysis_service.html#output-results';
        } else if (type == 'Variation') {
          path = 'user_guides/services/variation_analysis_service.html#output-results';
        } else if ('data' in container && container.data.type == 'model') {
          // modeling service uses typed folders
          path = 'user_guides/services/model_reconstruction_service.html#output-results';
        } else if ('_appLabel' in container && container._appLabel == 'Genome Comparison') {
          // _resultType is not set; todo: fix in job result container
          path = 'user_guides/services/proteome_comparison_service.html#output-results';
        } else if ('_appLabel' in container && container._appLabel == 'Differential Expression') {
          // _resultType is not set
          path = 'user_guides/services/expression_data_import_service.html#output-results';
        } else {
          path = self.tutorialLink;
        }

        window.open(PathJoin(self.docsServiceURL, path), '_blank');
      }, true);

      this.actionPanel.addAction('ViewGenomeGroup', 'MultiButton fa icon-selection-GenomeList fa-2x', {
        label: 'VIEW',
        validTypes: ['genome_group'],
        multiple: false,
        tooltip: 'Switch to the Genome Group View.',
        pressAndHold: function (selection, button, opts, evt) {

          popup.open({
            popup: new PerspectiveToolTipDialog({
              perspective: 'GenomeGroup',
              perspectiveUrl: '/view/GenomeGroup/' + encodePath(selection[0].path)
            }),
            around: button,
            orient: ['below']
          });
        }
      }, function (selection) {
        if (selection.length == 1) {
          Topic.publish('/navigate', { href: '/view/GenomeGroup' + encodePath(selection[0].path) });
        } else {
          var q = selection.map(function (sel) {
            return 'in(genome_id,GenomeGroup(' + encodeURIComponent(sel.path) + '))';
          });
          q = 'or(' + q.join(',') + ')';
          Topic.publish('/navigate', { href: '/view/GenomeList/?' + q });
        }
      }, false);

      this.actionPanel.addAction('ViewGenomeGroups', 'MultiButton fa icon-selection-GenomeList fa-2x', {
        label: 'VIEW',
        validTypes: ['genome_group'],
        multiple: true,
        min: 2,
        tooltip: 'Switch to the Genome List View.',
        pressAndHold: function (selection, button, opts, evt) {

          var q = selection.map(function (sel) {
            return 'in(genome_id,GenomeGroup(' + encodeURIComponent(sel.path) + '))';
          });
          q = 'or(' + q.join(',') + ')';
          popup.open({
            popup: new PerspectiveToolTipDialog({
              perspective: 'GenomeList',
              perspectiveUrl: '/view/GenomeList/' + q
            }),
            around: button,
            orient: ['below']
          });
        }
      }, function (selection) {
        if (selection.length == 1) {
          Topic.publish('/navigate', { href: '/view/GenomeGroup' + encodePath(selection[0].path) });
        } else {
          var q = selection.map(function (sel) {
            return 'in(genome_id,GenomeGroup(' + encodeURIComponent(sel.path) + '))';
          });
          q = 'or(' + q.join(',') + ')';
          Topic.publish('/navigate', { href: '/view/GenomeList/?' + q });
        }
      }, false);

      this.actionPanel.addAction('ViewFeatureGroup', 'MultiButton fa icon-selection-FeatureList fa-2x', {
        label: 'VIEW',
        validTypes: ['feature_group'],
        multiple: false,
        tooltip: 'Switch to the Feature Group View.',
        pressAndHold: function (selection, button, opts, evt) {

          popup.open({
            popup: new PerspectiveToolTipDialog({
              perspective: 'FeatureGroup',
              perspectiveUrl: '/view/FeatureGroup/' + encodePath(selection[0].path)
            }),
            around: button,
            orient: ['below']
          });
        }
      }, function (selection) {
        if (selection.length == 1) {
          Topic.publish('/navigate', { href: '/view/FeatureGroup' + encodePath(selection[0].path) });
        } else {
          var q = selection.map(function (sel) {
            return 'in(feature_id,FeatureGroup(' + encodeURIComponent(sel.path) + '))';
          });
          q = 'or(' + q.join(',') + ')';

          Topic.publish('/navigate', { href: '/view/FeatureList/?' + q });
        }
      });

      this.actionPanel.addAction('ViewFeatureGroups', 'MultiButton fa icon-selection-FeatureList fa-2x', {
        label: 'VIEW',
        validTypes: ['feature_group'],
        multiple: true,
        min: 2,
        tooltip: 'Switch to the Feature List View.',
        pressAndHold: function (selection, button, opts, evt) {

          var q = selection.map(function (sel) {
            return 'in(feature_id,FeatureGroup(' + encodeURIComponent(sel.path) + '))';
          });
          q = 'or(' + q.join(',') + ')';
          popup.open({
            popup: new PerspectiveToolTipDialog({
              perspective: 'FeatureList',
              perspectiveUrl: '/view/FeatureList/' + q
            }),
            around: button,
            orient: ['below']
          });
        }
      }, function (selection) {
        if (selection.length == 1) {
          Topic.publish('/navigate', { href: '/view/FeatureGroup' + encodePath(selection[0].path) });
        } else {
          var q = selection.map(function (sel) {
            return 'in(feature_id,FeatureGroup(' + encodeURIComponent(sel.path) + '))';
          });
          q = 'or(' + q.join(',') + ')';

          Topic.publish('/navigate', { href: '/view/FeatureList/?' + q });
        }
      });

      this.actionPanel.addAction('MultipleSeqAlignmentFeatures', 'fa icon-alignment fa-2x', {
        label: 'MSA',
        validTypes: ['feature_group'],
        multiple: false,
        tooltipDialog: viewMSATT,
        tooltip: 'Multiple Sequence Alignment'
      }, function (selection) {
        var q = self.getQuery(selection[0]);
        viewMSATT.selection = q;
        popup.open({
          popup: this._actions.MultipleSeqAlignmentFeatures.options.tooltipDialog,
          around: this._actions.MultipleSeqAlignmentFeatures.button,
          orient: ['below']
        });
      }, false);

      this.actionPanel.addAction('DownloadItem', 'fa icon-download fa-2x', {
        label: 'DWNLD',
        multiple: false,
        validTypes: WorkspaceManager.downloadTypes,
        tooltip: 'Download'
      }, function (selection) {
        WorkspaceManager.downloadFile(selection[0].path);
      }, false);

      var dfc = '<div>Download Table As...</div>' +
          '<div class="wsActionTooltip" rel="text/tsv">Text</div>' +
          '<div class="wsActionTooltip" rel="text/csv">CSV</div>' +
          '<div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
      var downloadTT = new TooltipDialog({
        content: dfc,
        onMouseLeave: function () {
          popup.close(downloadTT);
        }
      });

      on(downloadTT.domNode, 'div:click', function (evt) {
        var rel = evt.target.attributes.rel.value;
        var dataType = (self.actionPanel.currentContainerWidget.containerType == 'genome_group') ? 'genome' : 'genome_feature';
        var currentQuery = self.actionPanel.currentContainerWidget.get('query');

        window.open(window.App.dataServiceURL + '/' + dataType + '/' + currentQuery + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken) + '&http_accept=' + rel + '&http_download=true');
        popup.close(downloadTT);
      });

      this.browserHeader.addAction('DownloadTable', 'fa icon-download fa-2x', {
        label: 'DWNLD',
        multiple: false,
        validTypes: ['genome_group', 'feature_group'],
        tooltip: 'Download Table',
        tooltipDialog: downloadTT
      }, function (selection) {
        popup.open({
          popup: this._actions.DownloadTable.options.tooltipDialog,
          around: this._actions.DownloadTable.button,
          orient: ['below']
        });
      }, false);

      var downloadTTSelect = new TooltipDialog({
        content: dfc,
        onMouseLeave: function () {
          popup.close(downloadTTSelect);
        }
      });

      on(downloadTTSelect.domNode, 'div:click', function (evt) {
        if (!('rel' in evt.target.attributes)) return;

        var rel = evt.target.attributes.rel.value;

        var selection = self.actionPanel.get('selection');
        var type = selection[0].type;
        var dataType = type === 'genome_group' ? 'genome' : 'genome_feature';
        var currentQuery = self.getQuery(selection[0]);

        var urlStr = window.App.dataServiceURL + '/' + dataType + '/' + currentQuery + '&http_authorization=' +
          encodeURIComponent(window.App.authorizationToken) + '&http_accept=' + rel + '&limit(25000)&http_download=true';

        // cursorMark requires a sort on an unique key
        urlStr += type === 'genome_group' ? '&sort(+genome_id)' : '&sort(+feature_id)';

        window.open(urlStr);
        popup.close(downloadTT);
      });

      this.actionPanel.addAction('SelectDownloadTable', 'fa icon-download fa-2x', {
        label: 'DWNLD',
        multiple: false,
        validTypes: ['genome_group', 'feature_group'],
        tooltip: 'Download Selection',
        tooltipDialog: downloadTTSelect
      }, function (selection) {
        if (selection.length == 1) {
          popup.open({
            popup: this._actions.SelectDownloadTable.options.tooltipDialog,
            around: this._actions.SelectDownloadTable.button,
            orient: ['below']
          });
        }

      }, false);

      var dtsfc = '<div>Download Job Results:</div>' +
          '<div class="wsActionTooltip" rel="circos.svg">SVG Image</div>' +
          '<div class="wsActionTooltip" rel="genome_comparison.txt">Genome Comparison Table (txt)</div>' +
          '<div class="wsActionTooltip" rel="genome_comparison.xls">Genome Comparison Table (xls)</div>';
      var downloadTTSelectFile = new TooltipDialog({
        content: dtsfc,
        onMouseLeave: function () {
          popup.close(downloadTTSelectFile);
        }
      });

      this.actionPanel.addAction('ViewItem', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: WorkspaceManager.viewableTypes,
        tooltip: 'View in Browser'
      }, function (selection) {
        // console.log("[WorkspaceBrowser] View Item Action", selection);
        Topic.publish('/navigate', { href: '/workspace' + encodePath(selection[0].path) });
      }, false);

      this.browserHeader.addAction('ViewSeqComparison', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['GenomeComparison'],
        tooltip: 'Toggle Summary View'
      }, function (selection) {
        var cid = encodePath(self.actionPanel.currentContainerWidget.getComparisonId());
        if (self.actionPanel.currentContainerWidget.isSummaryView()) {
          Topic.publish('/navigate', { href: '/workspace' + cid });
        } else {
          Topic.publish('/navigate', { href: '/workspace' + cid + '#summary' });
        }
      }, false);

      this.browserHeader.addAction('ViewTaxonomicClassification', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['TaxonomicClassification'],
        tooltip: 'View Taxonomic Classification'
      }, function (selection) {
        var sel = selection[0],
          path = sel.path + '.' + sel.name + '/TaxonomicReport.html';
        Topic.publish('/navigate', { href: '/workspace' + path });
      }, false);

      this.browserHeader.addAction('ViewGenomeAlignment', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['GenomeAlignment'],
        tooltip: 'View Alignment'
      }, function (selection) {
        var sel = selection[0],
          path = sel.path + '.' + sel.name + '/alignment.json';

        Topic.publish('/navigate', { href: '/view/GenomeAlignment' + encodePath(path) });
      }, false);

      this.browserHeader.addAction('SelectDownloadSeqComparison', 'fa icon-download fa-2x', {
        label: 'DWNLD',
        multiple: false,
        validTypes: ['GenomeComparison'],
        tooltip: 'Download Results',
        tooltipDialog: downloadTTSelectFile
      }, lang.hitch(this.browserHeader, function (selection) {
        this._actions.SelectDownloadSeqComparison.selection = selection[0];
        if (selection.length == 1) {
          popup.open({
            popup: this._actions.SelectDownloadSeqComparison.options.tooltipDialog,
            around: this._actions.SelectDownloadSeqComparison.button,
            orient: ['below']
          });
        }
      }), false);

      on(downloadTTSelectFile.domNode, 'div:click', lang.hitch(this.browserHeader, function (evt) {
        var rel = evt.target.attributes.rel.value;
        var outputFiles = this._actions.SelectDownloadSeqComparison.selection.autoMeta.output_files;
        outputFiles.some(function (t) {
          var fname = t[0];
          if (fname.indexOf(rel) >= 0) {
            WorkspaceManager.downloadFile(fname);
            return true;
          }
          return false;
        });
        popup.close(downloadTTSelectFile);
      }));

      this.browserHeader.addAction('ViewAnnotatedGenome', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['GenomeAnnotation', 'GenomeAnnotationGenbank', 'ComprehensiveGenomeAnalysis'],
        tooltip: 'View Annotated Genome'
      }, function (selection) {
        var gid = self.actionPanel.currentContainerWidget.getGenomeId();
        Topic.publish('/navigate', { href: '/view/Genome/' + gid });

      }, false);

      // XXX WIP
      // this.actionPanel.addAction('ViewAnnotatedGenome', 'fa icon-eye fa-2x', {
      //   label: 'VIEW',
      //   multiple: false,
      //   validTypes: ['GenomeAnnotation', 'GenomeAnnotationGenbank'],
      //   tooltip: 'View Annotated Genome'
      // }, function (selection) {
      //   console.log("View Annotated Genome selection: ", selection);
      //   var gid = selection[0].reference_genome_id;
      //   Topic.publish('/navigate', { href: '/view/Genome/' + gid });
      // }, false);

      this.browserHeader.addAction('ViewModel', 'fa icon-eye fa-2x', {
        label: 'VIEW <i class="icon-external-link"></i>',
        multiple: false,
        validTypes: ['model'],
        tooltip: 'View Model @ ModelSEED.org'
      }, function (selection) {
        var path = self.actionPanel.currentContainerWidget.getModelPath();

        // adjust path for legacy modelseed
        var parts = path.split('/');
        var isLegacy = parts[1] == 'models';
        path = parts.slice(0, -1).join('/') + '/' + (isLegacy ? '' : '.') + parts.slice(-1)[0];

        var url = 'http://modelseed.theseed.org/#/model' + path + '?login=patric';
        window.open(url, '_blank');
      }, false);

      this.browserHeader.addAction('ViewAnnotatedGenomeCDS', 'fa icon-genome-features-cds fa-2x', {
        label: 'CDS',
        multiple: false,
        validTypes: ['GenomeAnnotation', 'GenomeAnnotationGenbank'],
        tooltip: 'View CDS for Annotated Genome'
      }, function (selection) {
        var gid = self.actionPanel.currentContainerWidget.getGenomeId();
        Topic.publish('/navigate', {
          href: '/view/Genome/' + gid + '#view_tab=features&filter=and(eq(feature_type,CDS),eq(annotation,PATRIC))'
        });
      }, false);

      this.browserHeader.addAction('ViewAnnotatedGenomeBrowser', 'fa icon-genome-browser fa-2x', {
        label: 'BROWSER',
        multiple: false,
        validTypes: ['GenomeAnnotation', 'GenomeAnnotationGenbank'],
        tooltip: 'View Annotated Genome in Genome Browser'
      }, function (selection) {
        var gid = self.actionPanel.currentContainerWidget.getGenomeId();
        Topic.publish('/navigate', { href: '/view/Genome/' + gid + '#view_tab=browser' });

      }, false);

      this.browserHeader.addAction('Upload', 'fa icon-upload fa-2x', {
        label: 'UPLOAD',
        multiple: true,
        validTypes: ['folder'],
        tooltip: 'Upload to Folder'
      }, function (selection) {
        Topic.publish('/openDialog', { type: 'Upload', params: selection[0].path + selection[0].name });
      }, false);

      this.browserHeader.addAction('CreateFolder', 'fa icon-folder-plus fa-2x', {
        label: 'ADD FOLDER',
        validTypes: ['folder'],
        tooltip: 'Create Folder'
      }, function (sel) {
        // selection may not be set if top level.
        var path = sel ? sel[0].path + sel[0].name : '/' + window.App.user.id;
        Topic.publish('/openDialog', {
          type: 'CreateFolder',
          params: path
        });
      }, self.path.split('/').length > 3);

      this.browserHeader.addAction('ShowHidden', (window.App.showHiddenFiles ? 'fa icon-eye-slash' : 'fa icon-eye'), {
        label: window.App.showHiddenFiles ? 'HIDE HIDDEN' : 'SHOW HIDDEN',
        multiple: true,
        validTypes: ['folder'],
        tooltip: 'Show hidden folders/files'
      }, function (selection) {
        window.App.showHiddenFiles = !window.App.showHiddenFiles;
        self.activePanel.set('showHiddenFiles', window.App.showHiddenFiles);

        // change icon/text based on state
        var icon = query('[rel="ShowHidden"] .fa', this.domNode)[0],
          text = query('[rel="ShowHidden"] .ActionButtonText', this.domNode)[0];

        domClass.toggle(icon, 'icon-eye-slash');
        domClass.toggle(icon, 'icon-eye');

        if (window.App.showHiddenFiles)
        { domAttr.set(text, 'textContent', 'HIDE HIDDEN'); }
        else
        { domAttr.set(text, 'textContent', 'SHOW HIDDEN'); }

        Topic.publish('/refreshWorkspace');
      }, false);

      this.browserHeader.addAction('CreateWorkspace', 'fa icon-add-workspace fa-2x', {
        label: 'NEW WS',
        validTypes: ['folder'],
        tooltip: 'Create Workspace'
      }, function (sel) {

        Topic.publish('/openDialog', {
          type: 'CreateWorkspace'
        });
      }, self.path.split('/').length < 3);

      this.browserHeader.addAction('ViewCodonTree', 'fa icon-tree2 fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['CodonTree'],
        tooltip: 'View Codon Tree'
      }, function (selection) {
        var sel = selection[0],
          path = sel.path + '.' + sel.name + '/codontree_treeWithGenomeIds.nwk';

        Topic.publish('/navigate', { href: '/view/PhylogeneticTree/?&labelSearch=true&idType=genome_id&labelType=genome_name&wsTreeFile=' + encodePath(path) });
      }, false);

      this.browserHeader.addAction('ViewTree', 'fa icon-tree2 fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['PhylogeneticTree'],
        tooltip: 'View Tree'
      }, function (selection) {
        var expPath = this.get('path');
        Topic.publish('/navigate', { href: '/view/PhylogeneticTree/?&labelSearch=true&idType=genome_id&labelType=genome_name&wsTreeFolder=' + encodePath(expPath) });

      }, false);

      this.browserHeader.addAction('ViewCGAFullGenomeReport', 'fa icon-bars fa-2x', {
        label: 'REPORT',
        multiple: false,
        validTypes: ['ComprehensiveGenomeAnalysis'],
        tooltip: 'View Full Genome Report'
      }, function (selection) {
        var path = self.actionPanel.currentContainerWidget.getReportPath();
        Topic.publish('/navigate', { href: '/workspace' + path });
      }, false);

      this.actionPanel.addAction('ViewNwk', 'fa icon-tree2 fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['nwk'],
        tooltip: 'View Tree'
      }, function (selection) {
        var path = selection.map(function (obj) { return obj.path; });
        Topic.publish('/navigate', { href: '/view/PhylogeneticTree/?&labelSearch=true&idType=genome_id&labelType=genome_name&wsTreeFile=' + encodePath(path[0]) });
      }, false);

      this.browserHeader.addAction('ViewExperimentSummary', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['DifferentialExpression'],
        tooltip: 'Toggle Summary View'
      }, function (selection) {
        var eid = encodePath(self.actionPanel.currentContainerWidget.getExperimentId());
        if (self.actionPanel.currentContainerWidget.isSummaryView()) {
          Topic.publish('/navigate', { href: '/workspace' + eid });
        } else {
          Topic.publish('/navigate', { href: '/workspace' + eid + '#summary' });
        }
      }, false);

      this.browserHeader.addAction('ViewExperiment', 'fa icon-selection-Experiment fa-2x', {
        label: 'EXPRMNT',
        multiple: false,
        validTypes: ['DifferentialExpression'],
        tooltip: 'View Experiment'
      }, function (selection) {
        var eid = encodePath(self.actionPanel.currentContainerWidget.getExperimentId());
        Topic.publish('/navigate', { href: '/view/TranscriptomicsExperiment/?&wsExpId=' + eid });

      }, false);

      this.browserHeader.addAction('ViewTracks', 'fa icon-genome-browser fa-2x', {
        label: 'BROWSER',
        multiple: false,
        validTypes: ['RNASeq', 'TnSeq', 'Variation'],
        tooltip: 'View tracks in genome browser.'
      }, function (selection) {
        // console.log("View Tracks: ", this);
        var genomeId = self.actionPanel.currentContainerWidget.getGenomeId();
        var urlQueryParams = self.actionPanel.currentContainerWidget.getJBrowseURLQueryParams();
        Topic.publish('/navigate', { href: '/view/Genome/' + genomeId + '#' + urlQueryParams });

      }, false);

      this.actionPanel.addAction('ExperimentGeneList', 'fa icon-list-unordered fa-2x', {
        label: 'GENES',
        multiple: true,
        validTypes: ['DifferentialExpression'],
        tooltip: 'View Gene List'
      }, function (selection) {
        var url = '/view/TranscriptomicsExperiment/?&wsExpId=' + selection.map(function (s) {
          return encodePath(s.path);
        });
        Topic.publish('/navigate', { href: url });
      }, false);

      this.actionPanel.addAction('ExperimentGeneList3', 'fa icon-list-unordered fa-2x', {
        label: 'GENES',
        multiple: true,
        validTypes: ['*'],
        validContainerTypes: ['experiment'],
        tooltip: 'View Experiment Gene List'
      }, function (selection) {
        var expPath = this.currentContainerWidget.get('path');
        var url = '/view/TranscriptomicsExperiment/?&wsExpId=' + encodePath(expPath) + '&wsComparisonId=' + selection.map(function (s) {
          return s.pid;
        });
        Topic.publish('/navigate', { href: url });
      }, false);

      this.actionPanel.addAction('ExperimentGeneList2', 'fa icon-list-unordered fa-2x', {
        label: 'GENES',
        multiple: true,
        allowMultiTypes: true,
        validContainerTypes: ['experiment_group'],
        validTypes: ['*'],
        tooltip: 'View Experiment Group Gene List'
      }, function (selection) {
        // console.log("View Gene List2", selection);
        var eids = [];
        var wsExps = [];
        selection.forEach(function (s) {
          if (s.path) {
            wsExps.push(encodePath(s.path));
          } else if (s.eid) {
            eids.push(s.eid);
          }

        });
        var url = '/view/TranscriptomicsExperiment/?';
        if (eids && eids.length > 0) {
          url = url + 'in(eid,(' + eids.join(',') + '))';
        }
        if (wsExps && wsExps.length > 0) {
          url = url + '&wsExpId=' + wsExps.join(',');
        }

        Topic.publish('/navigate', { href: url });
      }, false);


      this.actionPanel.addAction('SplitItems', 'fa icon-split fa-2x', {
        label: 'SPLIT',
        ignoreDataType: true,
        multiple: true,
        validTypes: ['*'],
        validContainerTypes: ['experiment_group'],
        tooltip: 'Add selection to a new or existing group'
      }, function (selection, containerWidget) {
        // console.log("Add Items to Group", selection);
        var dlg = new Dialog({ title: 'Add selected items to group' });
        var stg = new SelectionToGroup({
          selection: selection,
          type: containerWidget.containerType,
          path: containerWidget.get('path')
        });
        on(dlg.domNode, 'dialogAction', function (evt) {
          dlg.hide();
          setTimeout(function () {
            dlg.destroy();
          }, 2000);
        });
        domConstruct.place(stg.domNode, dlg.containerNode, 'first');
        stg.startup();
        dlg.startup();
        dlg.show();
      }, false);

      this.actionPanel.addAction(
        'GroupExplore', 'fa icon-venn_circles fa-2x', {
          label: 'VennDiag',
          ignoreDataType: false,
          allowMultiTypes: false,
          min: 2,
          max: 3,
          multiple: true,
          validTypes: ['genome_group', 'feature_group', 'experiment_group'],
          tooltip: 'Select two or three groups to compare'
        }, function (selection, containerWidget) {

          var dlg = new Dialog({
            title: 'Group Comparison',
            style: 'width: 1250px !important; height: 750px !important;',
            onHide: function () {
              dlg.destroy();
            }
          });
          var bc = new BorderContainer({});
          domConstruct.place(bc.domNode, dlg.containerNode);
          var stg = new GroupExplore({
            selection: selection,
            type: containerWidget.containerType,
            path: containerWidget.get('path'),
            containerNode: dlg.containerNode
          });
          bc.addChild(stg);
          dlg.startup();
          dlg.show();
        },
        false
      );

      /* Assuming we want to allow deletion of all types for now
      this.actionPanel.addAction("DeleteItem", "fa icon-trash-o fa-2x", {
        label: "DELETE",
        allowMultiTypes: true,
        multiple: true,
        validTypes: [
          "genome_group", "feature_group", "experiment_group", "job_result",
          "unspecified", "contigs", "reads", "diffexp_input_data", "diffexp_input_metadata",
          "DifferentialExpression", "GenomeAssembly", "GenomeAnnotation", "RNASeq", "feature_protein_fasta"
        ],
        tooltip: "Delete Selection"
      }, function(selection){
        var objs = selection.map(function(s){
          return s.path || s.data.path;
        });
        var conf = "Are you sure you want to delete" +
          ((objs.length > 1) ? " these objects" : " this object") +
          " from your workspace?"

        var dlg = new Confirmation({
          content: conf,
          onConfirm: function(evt){
            var prom = WorkspaceManager.deleteObject(objs, true, false);
            Deferred.when(prom, function(){
              self.activePanel.clearSelection();
            }, function(e){
              console.log('e', e)
            })
          }
        });
        dlg.startup();
        dlg.show();
      }, false);
      */

      this.actionPanel.addAction('Delete', 'fa icon-trash-o fa-2x', {
        label: 'DELETE',
        allowMultiTypes: true,
        multiple: true,
        validTypes: ['*'],
        tooltip: 'Delete Folder'
      }, function (selection) {
        var objs = selection.map(function (o) { return o.path; }),
          types = selection.map(function (o) { return o.type; });

        // omit special any folders
        try {
          WorkspaceManager.omitSpecialFolders(objs, 'delete');
        } catch (e) {
          new Dialog({
            content: e.toString(),
            title: "Sorry, you can't delete that...",
            style: 'width: 250px !important;'
          }).show();
          return;
        }

        var isWorkspace = self.path.split('/').length < 3;
        var conf = 'Are you sure you want to delete ' +
          (objs.length > 1 ? 'these' : 'this') +
          (isWorkspace ? ' workspace' : ' folder') +
          (objs.length > 1 ? 's' : '') +
          ' and its contents?';

        var dlg = new Confirmation({
          content: conf,
          onConfirm: function (evt) {
            var prom = WorkspaceManager.deleteObjects(objs, true, true, types);
            Deferred.when(prom, function () {
              self.activePanel.clearSelection();
            });
          }
        });
        dlg.startup();
        dlg.show();

      }, false);


      this.actionPanel.addAction('Rename', 'fa icon-pencil-square-o fa-2x', {
        label: 'RENAME',
        validTypes: ['*'],
        disabled: true,
        tooltip: 'Rename has been <b>temporarily disabled</b><br>while we address a technical issue.'
      }, function (sel) {
        /*
        var path = sel[0].path,
          isJob = sel[0].type === 'job_result';

        // omit special any folders
        try {
          WorkspaceManager.omitSpecialFolders(path, 'rename');
        } catch (e) {
          new Dialog({
            content: e.toString(),
            title: "Sorry, you can't rename that...",
            style: 'width: 250px;'
          }).show();
          return;
        }

        try {
          self.renameDialog(path, isJob);
        } catch (e) {
          new Dialog({
            content: e.toString(),
            title: "Sorry, you can't rename that...",
            style: 'width: 250px;'
          }).show();
        }
        */
      }, false);

      this.actionPanel.addAction('Copy', 'fa icon-files-o fa-2x', {
        label: 'COPY',
        allowMultiTypes: true,
        multiple: true,
        validTypes: ['*'],
        tooltip: 'Copy selected objects'
      }, function (selection) {
        var paths = selection.map(function (obj) { return obj.path; }),
          types = selection.map(function (obj) { return obj.type; });

        // open object selector to get destination
        var objSelector = new WSObjectSelector({
          allowUpload: false,
          autoSelectCurrent: true,
          allowUserSpaceSelection: true,
          onlyWritable: true,
          selectionText: 'Destination'
        });
        objSelector.set('type', ['folder']);
        objSelector.title = 'Copy contents of ' + selection.length +
          (selection.length ? ' items' : ' item') +
          ' to...';

        // always set to user's root
        objSelector.set('path', '/' + window.App.user.id);

        // on selection, do the copy
        objSelector.onSelection = function (destPath) {
          // only allow folders to be copied to top level
          var fileCount = selection.filter(function (o) { return o.type != 'folder'; }).length;
          if (fileCount && destPath.split('/').length == 2) {
            new Dialog({
              content: 'Sorry, you cannot copy objects to the top level, <i>' + destPath + '</i>',
              title: 'Sorry!',
              style: 'width: 250px;'
            }).show();
            return;
          }

          var prom = WorkspaceManager.copy(paths, destPath, types);
          Deferred.when(prom, function () {
            self.activePanel.clearSelection();
          }, function (e) {
            Topic.publish('/Notification', {
              message: 'Copy failed',
              type: 'error'
            });
            var msg = /_ERROR_(.*)_ERROR_/g.exec(e)[1];

            if (msg.indexOf('overwrite flag is not set') != -1) {
              var re = /object (.+) and overwrite/g;
              msg = 'Can not overwrite ' + re.exec(msg)[1];
            }

            new Dialog({
              content: msg,
              title: 'Copy failed'
            }).show();
          });
        };

        objSelector.openChooser();
      }, false);


      this.actionPanel.addAction('Move', 'fa icon-arrow-right fa-2x', {
        label: 'MOVE',
        allowMultiTypes: true,
        multiple: true,
        validTypes: ['*'],
        tooltip: 'Move selected objects'
      }, function (selection) {
        var paths = selection.map(function (obj) { return obj.path; }),
          types = selection.map(function (obj) { return obj.type; });

        // omit special any folders
        try {
          WorkspaceManager.omitSpecialFolders(paths, 'move');
        } catch (e) {
          new Dialog({
            content: e.toString(),
            title: "Sorry, you can't move that...",
            style: 'width: 250px;'
          }).show();
          return;
        }

        // open object selector to get destination
        var objSelector = new WSObjectSelector({
          allowUpload: false,
          autoSelectCurrent: true,
          allowUserSpaceSelection: true,
          onlyWritable: true,
          selectionText: 'Destination'
        });
        objSelector.set('type', ['folder']);
        objSelector.title = 'Move contents of ' + selection.length +
          (selection.length ? ' items' : ' item') +
          ' to...';

        // always set to user's root
        objSelector.set('path', '/' + window.App.user.id);

        objSelector.onSelection = function (destPath) {
          // only allow folders to be copied to top level
          var fileCount = selection.filter(function (o) { return o.type != 'folder'; }).length;
          if (fileCount && destPath.split('/').length == 2) {
            new Dialog({
              content: 'Sorry, you cannot move objects to the top level, <i>' + destPath + '</i>',
              title: 'Sorry!',
              style: 'width: 250px;'
            }).show();
            return;
          }

          var prom = WorkspaceManager.move(paths, destPath, types);
          Deferred.when(prom, function () {
            self.activePanel.clearSelection();
          }, function (e) {
            var msg = /_ERROR_(.*)_ERROR_/g.exec(e)[1];

            if (msg.indexOf('overwrite flag is not set') != -1) {
              msg = 'Can not overwrite ' + msg.split(' ')[2];
            }

            new Dialog({
              title: 'Move failed',
              content: msg,
              style: 'width: 250px;'
            }).show();
          });
        };

        objSelector.openChooser();
      }, false);

      this.actionPanel.addAction('EditType', 'fa icon-tag fa-2x', {
        label: 'EDIT TYPE',
        validTypes: ['*'],
        allowMultiTypes: true,
        multiple: true,
        tooltip: 'Edit the object type of selected item(s)'
      }, function (sel) {
        self.editTypeDialog(sel);
      }, false);

      this.actionPanel.addAction('ShareFolder', 'fa icon-user-plus fa-2x', {
        label: 'SHARE',
        allowMultiTypes: false,
        multiple: false,
        validTypes: ['folder'],
        tooltip: 'Share Folder'
      }, function (selection) {
        self.showPermDialog(selection);
      }, false);


      // listen for opening user permisssion dialog
      Topic.subscribe('/openUserPerms', function (selection) {
        self.showPermDialog(selection);
      });

      this.itemDetailPanel = new ItemDetailPanel({
        region: 'right',
        style: 'width: 300px',
        splitter: true,
        layoutPriority: 1
      });
      this.itemDetailPanel.startup();
      this.addChild(this.actionPanel);
      this.addChild(this.itemDetailPanel);
      this.addChild(this.browserHeader);

      this.inherited(arguments);
    },

    showPermDialog: function (selection) {
      var self = this,
        selection = selection[0], // only allows one selection
        existingPerms = selection.permissions;

      // update workspace list on confirm
      var onConfirm = function (newPerms, publicPermission) {
        // set any deleted users' permissions to 'n'
        var newUsers = newPerms.map(function (p) { return p.user; });
        existingPerms.forEach(function (p) {
          var user = p[0];

          if (p[0] == 'global_permission') return;

          if (newUsers.indexOf(user) == -1)
          { newPerms.push({ user: user, permission: 'n' }); }
        });

        Topic.publish('/Notification', {
          message: "<span class='default'>Updating permissions...</span>",
          type: 'default',
          duration: 50000
        });

        var prom = WorkspaceManager.setPermissions(selection.path, newPerms);

        // also update public permission
        if (['n', 'r'].indexOf(publicPermission) !== -1) {
          var publicProm = WorkspaceManager.setPublicPermission(selection.path, publicPermission);
        }

        Deferred.when(All(prom, publicProm)).then(function () {

          setTimeout(function () {
            Topic.publish('/refreshWorkspace');

            Topic.publish('/Notification', {
              message: 'Permissions updated.',
              type: 'message'
            });
          }, 100);

          // refresh list in detail panel
          self.activePanel.clearSelection();

        }, function (err) {
          console.log('error', err);
          Topic.publish('/Notification', {
            message: 'Failed. ' + err.response.status,
            type: 'error'
          });
        });
      };

      var permEditor = new PermissionEditor({
        selection: selection,
        onConfirm: onConfirm,
        user: window.App.user.id || '',
        permissions: existingPerms
      });

      permEditor.show();
    },

    renameDialog: function (path, isJob) {
      var self = this;

      var currentName = path.slice(path.lastIndexOf('/') + 1);
      var nameInput = new TextBox({
        name: 'name',
        value: currentName,
        style: { width: '400px' },
        placeHolder: 'Enter your new name...'
      });

      var dlg = new Confirmation({
        title: 'Rename <i>' + path + '</i>',
        content: nameInput.domNode,
        okLabel: 'Rename',
        closeOnOK: false,
        style: { width: '500px' },
        onConfirm: function (evt) {
          var _self = this;

          try {
            var prom;
            var newName = nameInput.get('value');
            if (path.split('/').length <= 3) {
              prom =  WorkspaceManager.renameWorkspace(path, newName);
            } else {
              prom = WorkspaceManager.rename(path, nameInput.get('value'), isJob);
            }

            Deferred.when(prom, function (res) {
              Topic.publish('/refreshWorkspace', {});
              Topic.publish('/Notification', { message: 'File renamed', type: 'message' });

              self.actionPanel.set('selection', []);
              self.itemDetailPanel.set('selection', []);
              _self.hideAndDestroy();
            }, function (error) {
              new Dialog({
                content: 'The name <i>' + newName + '</i> already exists!  Please pick a unique name.',
                title: 'Sorry!',
                style: 'width: 400px;'
              }).show();
            });
          } catch (error) {
            new Dialog({
              content: error.toString(),
              title: 'Sorry!',
              style: 'width: 400px !important;'
            }).show();
          }
        }
      });

      dlg.startup();
      dlg.show();
    },

    editTypeDialog: function (selection) {
      var self = this;

      /**
       * Handle unaccepted requests
       */
      var types = this.itemDetailPanel.changeableTypes;
      var options = Object.keys(types).map(function (key) { return types[key]; });
      var validTypes = options.map(function (item) { return item.value; });

      var unchangeableTypes = selection.filter(function (obj) {
        return validTypes.indexOf(obj.type) == -1;
      }).map(function (obj) {
        return obj.type;
      }).filter(function (val, i, self) { // only return unique
        return self.indexOf(val) === i;
      });

      if (unchangeableTypes.length > 0) {
        new Confirmation({
          title: 'Cannot change type',
          okLabel: 'OK',
          cancelLabel: null,
          content:
            '<b>The selected items must be one of the following types:</b> <br>' +
            validTypes.join('<br>') + '.<br><br>' +
            '<b>However, your selection contained the type(s):</b> <br>' +
            unchangeableTypes.join('<br>'),
          style: 'width: 400px;',
          onConfirm: function (evt) {
            this.hideAndDestroy();
          }
        }).show();
        return;
      }

      /**
       * build form
       */
      var form = domConstruct.toDom('<div class="editTypeForm">');

      // addd type dropdown to form
      options = [{ label: 'Select a new type...', value: 'helptext', selected: true }].concat(options);
      var typeSelector = new Select({
        name: 'typeSelector',
        style: { width: '200px', margin: '10px 0px 20px 0' },
        options: options
      });
      domConstruct.place(typeSelector.domNode, form);

      // open form in dialog
      var paths = selection.map(function (obj) { return obj.path; });
      var dlg = new Confirmation({
        title: 'Change '  + (paths.length > 1 ? paths.length + ' Object Types' : ' Object Type' ),
        okLabel: 'Save',
        content: form,
        style: { width: '300px' },
        onConfirm: function (evt) {
          var newType = typeSelector.attr('value');
          var newObjs = selection.map(function (obj) {
            return Object.assign(obj, { type: newType } );
          });

          Topic.publish('/Notification', {
            message: "<span class='default'>Changing " +
              (paths.length > 1 ?  paths.length + ' types...' : ' type...') +
            '</span>'
          });

          WorkspaceManager.updateMetadata(newObjs)
            .then(function () {
              Topic.publish('/Notification', {
                message: 'Type change complete', type: 'message'
              });
              Topic.publish('/refreshWorkspace');
            }, function () {
              Topic.publish('/Notification', {
                message: 'Type change failed',
                type: 'error'
              });
            });

          this.hideAndDestroy();
          self.activePanel.clearSelection();
        },
        onCancel: function () { // also do updates on close checkbox
          this.hideAndDestroy();
          self.activePanel.clearSelection();
        }
      });

      dlg.okButton.setDisabled(true);

      // give warning on change, and disable 'save' button
      on(typeSelector, 'change', function (val) {
        if (paths.length > 1) {
          domConstruct.place(domConstruct.toDom('<br><b>Warning:</b> clicking "Save" will change the type of '
            + paths.length + ' selected objects.'), form);
        }
        dlg.okButton.setDisabled(false);
      });

      dlg.startup();
      dlg.show();
    },

    _setPathAttr: function (val) {

      // extract extra URL parameters
      var components = val.split('#');
      val = components[0];
      this.path = decodeURIComponent(val);
      var uriParams = [];
      if (components[1]) {
        uriParams = decodeURIComponent(components[1]);
      }
      // console.log("[WorkspaceBrowser] uriParams:",uriParams)

      var parts = this.path.split('/').filter(function (x) {
        return x != '';
      }).map(function (c) {
        return decodeURIComponent(c);
      });

      var obj;
      if (parts[0] == 'public') {
        if (parts.length == 1) {
          obj = {
            metadata: { type: 'folder' }, type: 'folder', path: '/', isPublic: true
          };
        } else {
          var val = '/' + val.split('/').slice(2).join('/');
          obj = WorkspaceManager.getObject(val, true);
        }
      } else if (!parts[1]) {
        obj = {
          metadata: { type: 'folder' }, type: 'folder', path: '/' + window.App.user.id, isWorkspace: true
        };
      } else {
        obj = WorkspaceManager.getObject(val, true);
      }
      Deferred.when(obj, lang.hitch(this, function (obj) {
        if (this.browserHeader) {
          this.browserHeader.set('selection', [obj]);
        }
        var panelCtor;
        var params = { path: this.path, region: 'center' };

        switch (obj.type) {
          case 'folder':
            panelCtor = WorkspaceExplorerView;
            break;
          case 'genome_group':
            panelCtor = window.App.getConstructor('p3/widget/viewer/WSGenomeGroup');
            params.query = '?&in(genome_id,GenomeGroup(' + encodeURIComponent(this.path).replace('(', '%28').replace(')', '%29') + '))';
            break;
          case 'feature_group':
            panelCtor = window.App.getConstructor('p3/widget/viewer/WSFeatureList');
            params.query = '?&in(feature_id,FeatureGroup(' + encodeURIComponent(this.path) + '))';
            break;
          case 'model':
            panelCtor = window.App.getConstructor('p3/widget/viewer/Model');
            params.data = obj;
            break;
          case 'job_result':
            var d = 'p3/widget/viewer/JobResult';
            if (obj && obj.autoMeta && obj.autoMeta.app) {
              var id = obj.autoMeta.app.id || obj.autoMeta.app;
              switch (id) {
                case 'DifferentialExpression':
                  if (uriParams === 'summary') {
                    d = 'p3/widget/viewer/Experiment';
                  } else {
                    d = 'p3/widget/viewer/DifferentialExpression';
                  }
                  break;
                case 'GenomeComparison':
                  if (uriParams === 'summary') {
                    d = 'p3/widget/viewer/SeqComparison';
                  } else {
                    d = 'p3/widget/viewer/GenomeComparison';
                  }
                  break;
                case 'GenomeAnnotation':
                case 'GenomeAnnotationGenbank':
                  d = 'p3/widget/viewer/GenomeAnnotation';
                  break;
                case 'Variation':
                case 'RNASeq':
                case 'TnSeq':
                  d = 'p3/widget/viewer/Seq';
                  break;
                case 'ComprehensiveGenomeAnalysis':
                  d = 'p3/widget/viewer/ComprehensiveGenomeAnalysis';
                  break;
              }
            }
            panelCtor = window.App.getConstructor(d);
            params.data = obj;
            // params.query="?&in(feature_id,FeatureGroup("+encodeURIComponent(this.path)+"))";
            break;
          case 'experiment_group':
            panelCtor = window.App.getConstructor('p3/widget/viewer/ExperimentGroup');
            params.data = obj;
            break;
          default:
            panelCtor = window.App.getConstructor('p3/widget/viewer/File');
            params.file = { metadata: obj };
        }

        Deferred.when(panelCtor, lang.hitch(this, function (Panel) {
          if (!this.activePanel || !(this.activePanel instanceof Panel)) {
            if (this.activePanel) {
              this.removeChild(this.activePanel);
            }

            var newPanel = new Panel(params);
            var hideTimer;

            if (this.actionPanel) {
              this.actionPanel.set('currentContainerWidget', newPanel);
              this.itemDetailPanel.set('containerWidget', newPanel);
            }

            if (newPanel.on) {
              newPanel.on('select', lang.hitch(this, function (evt) {
                var sel = Object.keys(evt.selected).map(lang.hitch(this, function (rownum) {
                  return evt.grid.row(rownum).data;
                }));

                if (hideTimer) {
                  clearTimeout(hideTimer);
                }
                if (sel.length > 0) {
                  this.addChild(this.actionPanel);
                }

                this.actionPanel.set('selection', sel);
                this.itemDetailPanel.set('selection', sel);
              }));

              newPanel.on('deselect', lang.hitch(this, function (evt) {
                if (!evt.selected) {
                  this.actionPanel.set('selection', []);
                  this.itemDetailPanel.set('selection', []);
                } else {
                  var sel = Object.keys(evt.selected).map(lang.hitch(this, function (rownum) {
                    return evt.grid.row(rownum).data;
                  }));
                }

                this.actionPanel.set('selection', sel);
                this.itemDetailPanel.set('selection', sel);
              }));

              newPanel.on('ItemDblClick', lang.hitch(this, function (evt) {
                if (evt.item && evt.item.type && (this.navigableTypes.indexOf(evt.item.type) >= 0)) {
                  Topic.publish('/navigate', { href: '/workspace' + evt.item_path });
                  this.actionPanel.set('selection', []);
                  this.itemDetailPanel.set('selection', []);
                  if ('clearSelection' in newPanel) {
                    newPanel.clearSelection();
                  }
                } else {
                  console.log('non-navigable type, todo: show info panel when dblclick');
                }

              }));
            }

            this.addChild(newPanel);
            this.activePanel = newPanel;
          } else {
            this.activePanel.set('path', this.path);
            if (this.activePaneal && 'clearSelection' in this.activePaneal) {
              this.activePanel.clearSelection();
            }
          }

          if (this.browserHeader) {
            this.browserHeader.set('path', this.path);
          }

        }));

      }), lang.hitch(this, function (err) {
        var parts = err.split('_ERROR_');
        var m = parts[1] || parts[0];
        var d = new Dialog({
          content: m,
          title: 'Error Loading Workspace',
          style: 'width: 250px !important;'
        });
        d.show();
      }));
    },

    getQuery: function (obj) {
      var query = '';
      switch (obj.type) {
        case 'genome_group':
          query = '?&in(genome_id,GenomeGroup(' + encodeURIComponent(obj.path).replace('(', '%28').replace(')', '%29') + '))';
          break;
        case 'feature_group':
          query = '?&in(feature_id,FeatureGroup(' + encodeURIComponent(obj.path) + '))';
          break;
      }
      return query;
    },

    refresh: function () {
      if (this.activePanel instanceof WorkspaceExplorerView) {
        this.explorer.refreshWorkspace();
      }
    },

    getMenuButtons: function () {
      this.buttons = [];
      return this.buttons;

    }
  });
});
