define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', 'dojo/query',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-attr',
  './WorkspaceExplorerView', 'dojo/topic', './ItemDetailPanel',
  './ActionBar', 'dojo/_base/Deferred', '../WorkspaceManager', 'dojo/_base/lang', '../util/PathJoin',
  './Confirmation', './SelectionToGroup', 'dijit/Dialog', 'dijit/TooltipDialog',
  'dijit/popup', 'dijit/form/Select', './ContainerActionBar', './GroupExplore', './PerspectiveToolTip',
  'dijit/form/TextBox', './WorkspaceObjectSelector', './PermissionEditor', './ServicesTooltipDialog',
  'dojo/promise/all', '../util/encodePath', 'dojo/when', 'dojo/request', './TsvCsvFeatures', './RerunUtility', './viewer/JobResult',
  'dojo/NodeList-traverse', './app/Homology', './app/GenomeAlignment', './app/PhylogeneticTree'
], function (
  declare, BorderContainer, on, query,
  domClass, domConstruct, domAttr,
  WorkspaceExplorerView, Topic, ItemDetailPanel,
  ActionBar, Deferred, WorkspaceManager, lang, PathJoin,
  Confirmation, SelectionToGroup, Dialog, TooltipDialog,
  popup, Select, ContainerActionBar, GroupExplore, PerspectiveToolTipDialog,
  TextBox, WSObjectSelector, PermissionEditor, ServicesTooltipDialog,
  All, encodePath, when, request, tsvCsvFeatures, rerunUtility, JobResult, NodeList_traverse, Homology, GenomeAlignment, PhylogeneticTree
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
      'diffexp_input_data', 'diffexp_input_metadata', 'svg', 'gif', 'png', 'jpg', 'nwk', 'phyloxml'],
    design: 'sidebar',
    splitter: false,
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/workspace_groups_upload.html',
    tsvCsvFilename: '',

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

        if (domClass.contains(icon, 'icon-chevron-circle-left')) { domAttr.set(text, 'textContent', 'SHOW'); }
        else { domAttr.set(text, 'textContent', 'HIDE'); }
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

      this.browserHeader.addAction('PathwaysServiceViewer', 'MultiButton fa icon-git-pull-request fa-2x', {
        label: 'Pathways',
        validTypes: ['ComparativeSystems'],
        tooltip: 'View Pathways Tables'
      }, function (selection, container, button) {
        console.log(selection);
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (data_file) {
          if (data_file[0].includes('_pathways_tables.json')) {
            path = data_file[0];
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/view/PathwayService' + path, target: 'blank' });
        } else {
          console.log('Error: could not find pathways data file');
        }
      }, false);

      this.browserHeader.addAction('ProteinFamiliesServiceViewer', 'MultiButton fa icon-group fa-2x', {
        label: 'Families',
        validTypes: ['ComparativeSystems'],
        tooltip: 'View Protein Families Tables'
      }, function (selection, container, button) {
        console.log(selection);
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (data_file) {
          if (data_file[0].includes('_proteinfams_tables.json')) {
            path = data_file[0];
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/view/ProteinFamiliesService' + path, target: 'blank' });
        } else {
          console.log('Error: could not find pathways data file');
        }
      }, false);

      this.browserHeader.addAction('SubsystemsServiceViewer', 'MultiButton fa icon-venn_circles fa-2x', {
        label: 'Subsystems',
        validTypes: ['ComparativeSystems'],
        tooltip: 'View Subsystems Tables'
      }, function (selection, container, button) {
        console.log(selection);
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (data_file) {
          if (data_file[0].includes('_subsystems_tables.json')) {
            path = data_file[0];
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/view/SubsystemService' + path, target: 'blank' });
        } else {
          console.log('Error: could not find pathways data file');
        }
      }, false);

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

      // TODO: add ServicesFeatureGroup
      this.actionPanel.addAction('ServicesFeatureGroups', 'MultiButton fa icon-cog fa-2x', {
        label: 'SERVICES',
        validTypes: ['feature_group'],
        multiple: false,
        tooltip: 'Select services using this FeatureGroup'
      }, function (selection, container, button) {
        var data = {};
        data.data_type = 'feature';
        var multiple = false;
        if (selection.length > 1) {
          multiple = true;
        }
        data.multiple = multiple;
        data.selection = selection;
        popup.open({
          popup: new ServicesTooltipDialog({
            context: 'workspace',
            data: data
          }),
          around: button,
          orient: ['below']
        });
      });

      this.actionPanel.addAction('ServicesGenomeGroups', 'MultiButton fa icon-cog fa-2x', {
        label: 'SERVICES',
        validTypes: ['genome_group'],
        multiple: true,
        tooltip: 'Select services using this GenomeGroup'
      }, function (selection, container, button) {
        var data = {};
        data.data_type = 'genome';
        var multiple = false;
        if (selection.length > 1) {
          multiple = true;
        }
        data.multiple = multiple;
        data.selection = selection;
        popup.open({
          popup: new ServicesTooltipDialog({
            context: 'workspace',
            data: data
          }),
          around: button,
          orient: ['below']
        });
      });

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

      this.actionPanel.addAction('ViewProteinStructure', 'MultiButton fa icon-selection-Sequence fa-2x', {
        label: 'VIEW',
        validTypes: ['pdb'],
        multiple: false,
        tooltip: 'Open PDB in Protein Structure Viewer'
      }, function (selection, button, opts) {
        var filepath = selection[0].path;
        if (filepath) {
          Topic.publish('/navigate', { href: '/view/ProteinStructure#path=' + filepath, target: 'blank' });
        } else {
          console.log('err, path does not exist');
        }
      });

      this.actionPanel.addAction('MultipleSeqAlignmentFeaturesService', 'fa icon-alignment fa-2x', {
        label: 'MSA',
        validTypes: ['feature_group'],
        multiple: false,
        tooltipDialog: viewMSATT,
        tooltip: 'Multiple Sequence Alignment'
      }, function (selection) {
        var feature_group = selection[0].path;
        var job_data = {
          'feature_groups': [feature_group],
          'alphabet': 'dna',
          'aligner': 'Muscle',
          'input_type': 'input_group'
        };
        rerunUtility.rerun(JSON.stringify(job_data), 'MSA', window, Topic);
      }, false);

      this.actionPanel.addAction('FeatureGroupSubsystems', 'fa icon-selection-SequenceList fa-2x', {
        label: 'Subsystems',
        validTypes: ['feature_group'],
        multiple: true,
        tooltip: 'Subsystems in Feature Group'
      }, function (selection) {
        console.log(selection);
        var fgs = selection.map(x => x.path);
        WorkspaceManager.getObjects(fgs).then(lang.hitch(this, function (res) {
          var res_data = res.map(x => JSON.parse(x.data));
          var feature_list = [];
          res_data.forEach(lang.hitch(this, function (obj) {
            feature_list = feature_list.concat(obj.id_list.feature_id);
          }));
          feature_list = [... new Set(feature_list)];
          var new_query = '?in(feature_id,(' + feature_list.join(',') + '))';
          Topic.publish('/navigate', { href: '/view/SubsystemList/' + new_query, target: 'blank' });
        }));
      }, false);

      this.actionPanel.addAction('FeatureGroupPathways', 'fa icon-git-pull-request fa-2x', {
        label: 'Pathways',
        validTypes: ['feature_group'],
        multiple: true,
        tooltip: 'Pathways in Feature Group'
      }, function (selection) {
        console.log(selection);
        var fgs = selection.map(x => x.path);
        WorkspaceManager.getObjects(fgs).then(lang.hitch(this, function (res) {
          var res_data = res.map(x => JSON.parse(x.data));
          var feature_list = [];
          res_data.forEach(lang.hitch(this, function (obj) {
            feature_list = feature_list.concat(obj.id_list.feature_id);
          }));
          feature_list = [... new Set(feature_list)];
          var new_query = '?in(feature_id,(' + feature_list.join(',') + '))';
          Topic.publish('/navigate', { href: '/view/PathwayList/' + new_query, target: 'blank' });
        }));
      }, false);

      // TODO: why isn't download appearing for job_results
      this.actionPanel.addAction('DownloadItem', 'fa icon-download fa-2x', {
        label: 'DWNLD',
        multiple: true,
        allowMultiTypes: true,
        persistent: true,
        forbiddenTypes: WorkspaceManager.forbiddenDownloadTypes,
        tooltip: 'Download'
      }, function (selection) {
        console.log('selection=', selection);
        // TODO: job_result folders are downloaded with their '.' prefix, making them initially hidden in the zip file
        // some users may not like that
        // criteria for single download: one file and is not a folder and is not a job_result
        if ((selection.length == 1) & !(selection[0].autoMeta.is_folder) & !(selection[0].type === 'job_result')) {
          console.log('download one item:', selection[0].path);
          WorkspaceManager.downloadFile(selection[0].path);
        } else {
          var tmp_archive_name = '';
          // add different defaults here
          if (this.currentContainerType === 'job_result') {
            tmp_archive_name = this.currentContainerWidget.data.name;
          }
          // get_archive_url(get_archive_url_params input) returns (string url, int file_count, int total_size)
          var path_list = [];
          selection.forEach(function (selected_file) {
            // if file is a job result, add hidden file to download list
            if (selected_file.type === 'job_result') {
              var path = selected_file.path.split('/');
              var base = path.pop();
              var new_path = path.join('/') + '/.' + base;
              path_list.push(new_path);
            }
            path_list.push(selected_file.path);
          }, this);
          // /create dialog with name and archive options
          var dwnldContent = domConstruct.create('div', {});
          // create table header row
          var table = domConstruct.create('table', {}, dwnldContent);
          var title_tr = domConstruct.create('tr', {}, table);
          domConstruct.create('td', { innerHTML: '<p>File Name</p>' }, title_tr);
          domConstruct.create('td', { innerHTML: '<p>File Type</p>' }, title_tr);
          // create input row
          var option_tr = domConstruct.create('tr', {}, table);
          var archive_name_td = domConstruct.create('td', {}, option_tr);
          var archive_name_input = domConstruct.create('input', { type: 'text', placeholder: tmp_archive_name, value: tmp_archive_name }, archive_name_td);
          var dropdown_row = domConstruct.create('td', {}, option_tr);
          var dropdown_select = domConstruct.create('select', {}, dropdown_row);
          // Add more archive types as they become available
          domConstruct.create('option', { value: 'zip', innerHTML: 'zip' }, dropdown_select);
          // example: domConstruct.create('option',{value:'opt2',innerHTML:'opt2'},dropdown_select);
          // add submit button:
          var btn_td = domConstruct.create('td', {}, option_tr);
          var submit_btn = domConstruct.create('button', { type: 'button', innerHTML: 'Submit', style: 'background-color:#09456f;color:#fff' }, btn_td);
          // get input and validate
          var archive_name = '';
          var archive_type = '';
          on(submit_btn, 'click', lang.hitch(this, function (button) {
            var valid = true;
            if (!archive_name_input.value) {
              return;
            }
            var invalid_chars = archive_name_input.value.match(/[~`!#$%^&*+=\\[\]\\';,/{}|\\":<>?]/g);
            // returns null if no matches in regular expression
            if (invalid_chars) {
              if (invalid_chars.length > 0) {
                valid = false;
              }
            }
            if (valid) {
              archive_name = archive_name_input.value;
              archive_type = dropdown_select.value;
              archive_name = archive_name + '.' + archive_type;
              var recursive = true;
              try {
                var archive_url = WorkspaceManager.downloadArchiveFile(path_list, archive_name, archive_type, recursive);
                console.log('archive_url = ', archive_url);
                dwnld_dialog.onHide();
              }
              catch (error) {
                console.log(error);
              }
            }
            else {

              let error_unique = [...new Set(invalid_chars)];
              var error_msg = 'Error in download filename, remove invalid characters: ' + error_unique.join(', ');
              var errorTT = new TooltipDialog({
                content: domConstruct.create('div', { innerHTML: '<p>' + error_msg + '</p>' }),
                onMouseLeave: function () {
                  popup.close(errorTT);
                }
              });
              popup.open({
                popup: errorTT,
                around: archive_name_input,
                orient: ['below']
              });
            }
          }));
          // show dialog
          var dwnld_dialog = new Dialog({
            title: 'Download File Options',
            content: dwnldContent,
            onHide: function () {
              dwnld_dialog.destroy();
            }
          });
          dwnld_dialog.show();
        }
        //
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

      this.browserHeader.addAction('ViewMetaCATS', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['MetaCATS'],
        tooltip: 'View in Browser'
      }, function (selection, container, button) {
        console.log(selection);
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (meta_file_data) {
          var meta_file = meta_file_data[0].split('-');
          if (meta_file[meta_file.length - 1] === 'chisqTable.tsv') {
            path = meta_file.join('-');
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/workspace' + encodePath(path) });
        } else {
          console.log('Error: could not find chisqTable.tsv output file');
        }
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

        var url = 'https://modelseed.org/model' + path + '?login=patric';
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

      this.browserHeader.addAction('ViewBlastResults', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['Homology'],
        tooltip: 'View alignments'
      }, function (selection) {
        // console.log("Current Container Widget: ", self.actionPanel.currentContainerWidget, "Slection: ", selection)
        var modPath = self.actionPanel.currentContainerWidget.path.replace(/^\/public/, '');
        Topic.publish('/navigate', { href: '/view/Homology' + modPath });
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

      this.browserHeader.addAction('ShowHidden', (window.App.showHiddenFiles ? 'fa icon-eye-slash fa-2x' : 'fa icon-eye fa-2x'), {
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

        if (window.App.showHiddenFiles) { domAttr.set(text, 'textContent', 'HIDE HIDDEN'); }
        else { domAttr.set(text, 'textContent', 'SHOW HIDDEN'); }

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

      /*
      this.browserHeader.addAction('ViewTree', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['PhylogeneticTree', 'CodonTree'],
        tooltip: 'View Tree'
      }, function (selection) {
        var expPath = this.get('path');
        Topic.publish('/navigate', { href: '/view/PhylogeneticTree/?&labelSearch=true&idType=genome_id&labelType=genome_name&wsTreeFolder=' + encodePath(expPath) });

      }, false);
*/
      this.browserHeader.addAction('ViewCGAFullGenomeReport', 'fa icon-eye fa-2x', {
        label: 'REPORT',
        multiple: false,
        validTypes: ['ComprehensiveGenomeAnalysis'],
        tooltip: 'View Full Genome Report'
      }, function (selection) {
        console.log('self.actionPanel.currentContainerWidget.containerType', self.actionPanel.currentContainerWidget.containerType);
        console.log('self.browserHeader', self.browserHeader);
        var path = self.actionPanel.currentContainerWidget.getReportPath();
        Topic.publish('/navigate', { href: '/workspace' + path });
      }, false);

      this.browserHeader.addAction('ViewCGASarsFullGenomeReport', 'fa icon-eye fa-2x', {
        label: 'REPORT',
        multiple: false,
        validTypes: ['ComprehensiveSARS2Analysis'],
        tooltip: 'View Full Genome Report'
      }, function (selection) {
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (file_data) {
          var filepath = file_data[0].split('/');
          if (filepath[filepath.length - 1] === 'FullGenomeReport.html') {
            path = filepath.join('/');
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/workspace' + path });
        } else {
          console.log('Error: could not find FullGenomeReport.html');
        }
      });
      this.browserHeader.addAction(
        "ViewDockingReport",
        "fa icon-eye fa-2x",
        {
          label: "REPORT",
          multiple: false,
          validTypes: ["Docking"],
          tooltip: "View Docking Report",
        },
        function (selection) {
          var path;
          selection[0].autoMeta.output_files.forEach(
            lang.hitch(this, function (file_data) {
              var filepath = file_data[0].split("/");
              if (filepath[filepath.length - 1] === "DockingReport.html") {
                path = filepath.join("/");
              }
            })
          );
          if (path) {
            Topic.publish("/navigate", { href: "/workspace" + path });
          } else {
            console.log("Error: could not find DockingReport.html");
          }
        }
      );
      // TODO: Paired_Filter report??
      this.browserHeader.addAction('ViewFastqUtilsOutput', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['FastqUtils'],
        tooltip: 'View FastqUtils Report'
      }, function (selection, container, button) {
        var path;
        console.log('selection = ', selection);
        var recipes = selection[0].autoMeta.parameters.recipe;
        if (recipes.length > 1) {
          var dropdown = domConstruct.create('div', {});
          domConstruct.create('div', {
            innerHTML: 'Select View',
            style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;'
          }, dropdown);
          recipes.forEach(lang.hitch(this, function (pipeline) {
            domConstruct.create('div', {
              innerHTML: pipeline,
              'pipeline': pipeline,
              'class': 'wsActionTooltip'
            }, dropdown);
          }));
          on(dropdown, '.wsActionTooltip:click', lang.hitch(this, function (evt) {
            console.log('sel = ', evt);
            var pipeline = evt.target.attributes.pipeline.value;
            console.log('pipeline = ', pipeline);
            selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (file_data) {
              var filepath = file_data[0].split('/');
              if (pipeline === 'Trim') {
                if (filepath[filepath.length - 1].includes('fastq_trimming_report.txt')) {
                  path = filepath.join('/');
                }
              } else if (pipeline === 'FastQC') {
                if (filepath[filepath.length - 1].includes('fastqc.html')) {
                  path = filepath.join('/');
                }
              } else if (pipeline === 'Align') {
                if (filepath[filepath.length - 1].includes('samstat.html')) {
                  path = filepath.join('/');
                }
              } else {
                console.log('invalid pipeline recipe: not opening report');
              }
            }));
            if (path) {
              Topic.publish('/navigate', { href: '/workspace' + path });
            } else {
              console.log('Error: could not find ', pipeline, ' report');
            }
          }));
          var _self = this;
          var recipeTT = new TooltipDialog({
            content: dropdown,
            onMouseLeave: function () {
              popup.close(recipeTT);
            }
          });
          popup.open({
            popup: recipeTT,
            around: _self._actions.ViewFastqUtilsOutput.button,
            orient: ['below']
          });
        }
        else {
          var pipeline = recipes[0];
          selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (file_data) {
            var filepath = file_data[0].split('/');
            if (pipeline === 'Trim') {
              if (filepath[filepath.length - 1].includes('fastq_trimming_report.txt')) {
                path = filepath.join('/');
              }
            } else if (pipeline === 'FastQC') {
              if (filepath[filepath.length - 1].includes('fastqc.html')) {
                path = filepath.join('/');
              }
            } else if (pipeline === 'Align') {
              if (filepath[filepath.length - 1].includes('samstat.html')) {
                path = filepath.join('/');
              }
            } else {
              console.log('invalid pipeline recipe: not opening report');
            }
          }));
          if (path) {
            Topic.publish('/navigate', { href: '/workspace' + path });
          } else {
            console.log('Error: could not find ', pipeline, ' report');
          }
        }
      });

      this.browserHeader.addAction('ViewBinningReport', 'fa icon-eye fa-2x', {
        label: 'REPORT',
        multiple: false,
        validTypes: ['MetagenomeBinning'],
        tooltip: 'View Binning Report'
      }, function (selection) {
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (file_data) {
          var filepath = file_data[0].split('/');
          if (filepath[filepath.length - 1] === 'BinningReport.html') {
            path = filepath.join('/');
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/workspace' + path });
        } else {
          console.log('Error: could not find BinningReport.html');
        }
      });

      this.browserHeader.addAction('ViewReadMappingReport', 'fa icon-eye fa-2x', {
        label: 'REPORT',
        multiple: false,
        validTypes: ['MetagenomicReadMapping'],
        tooltip: 'View Metagenomic Read Mapping Report'
      }, function (selection) {
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (file_data) {
          var filepath = file_data[0].split('/');
          if (filepath[filepath.length - 1] === 'MetagenomicReadMappingReport.html') {
            path = filepath.join('/');
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/workspace' + path });
        } else {
          console.log('Error: could not find MetagenomicReadMappingReport.html');
        }
      });

      this.browserHeader.addAction('ViewPrimerDesignReport', 'fa icon-eye fa-2x', {
        label: 'REPORT',
        multiple: false,
        validTypes: ['PrimerDesign'],
        tooltip: 'View Primer Design Report'
      }, function (selection) {
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (file_data) {
          var filepath = file_data[0].split('/');
          if (filepath[filepath.length - 1].includes('_table.html')) {
            path = filepath.join('/');
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/workspace' + path });
        } else {
          console.log('Error: could not find Primer Design report');
        }
      });

      /*
      this.actionPanel.addAction('ViewNwk', 'fa icon-tree2 fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['nwk'],
        tooltip: 'View Tree'
      }, function (selection, container) {
        console.log('ViewNwk container', container);
        var path = selection.map(function (obj) { return obj.path;
          // console.log('ViewNwk obj', obj);
        });
        var labelSearch = 'true';
        var idType = 'genome_id';
        var labelType = 'genome_name';
        if (container._resultType == 'CodonTree' || container._resultType == 'PhylogeneticTree') { // handle Genome Tree
          if (encodePath(path[0]).includes('WithGenomeNames.')) {
            labelSearch = 'false';
            idType = 'genome_name';
          }
          Topic.publish('/navigate', { href: '/view/PhylogeneticTree/?&labelSearch=' + labelSearch + '&idType=' + idType + '&labelType=' + labelType + '&wsTreeFile=' + encodePath(path[0]) });
        }
        else { // handle Gene Tree
          idType = 'patric_id';
          labelSearch = 'true';
          labelType = 'feature_name';
          Topic.publish('/navigate', { href: '/view/PhylogeneticTreeGene/?&labelSearch=' + labelSearch + '&idType=' + idType + '&labelType=' + labelType + '&wsTreeFile=' + encodePath(path[0]) });
        }
      }, false);

      this.browserHeader.addAction('ViewNwk', 'fa icon-tree2 fa-2x', {
        label: 'VIEW',
        mutliple: false,
        validTypes: ['GeneTree'],
        tooltip: 'View Tree'
      }, function (selection, container, button) {
        console.log(selection);
        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this,function(file_data) {
          var gt_file = file_data[0].split(".");
          if (gt_file[gt_file.length - 1] === 'nwk') {
            path = gt_file.join(".");
          }
          if (path) {
            return;
          }
        }));
        if (path) {
          var labelSearch = 'true';
          var idType = 'patric_id';
          var labelType = 'feature_name';
          Topic.publish('/navigate', { href: '/view/PhylogeneticTree/?&labelSearch=' + labelSearch + '&idType=' + idType + '&labelType=' + labelType + '&wsTreeFile=' + encodePath(path) });
        } else {
          console.log('Error: could not find chisqTable.tsv output file');
        }
      }, false);
      */

      this.actionPanel.addAction('ViewNwkXml', 'fa icon-tree2 fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['nwk', 'phyloxml'],
        tooltip: 'View Archaeopteryx Tree'
      }, function (selection, container) {
        var path = selection.map(function (obj) {
          return obj.path;
          // console.log('ViewNwkXml obj', obj);
        });
        var fileType = selection.map(function (obj) { return obj.type; });

        var labelSearch = 'false';
        var idType = 'genome_id';
        var labelType = 'genome_name';
        Topic.publish('/navigate', { href: '/view/PhylogeneticTree2/?&labelSearch=' + labelSearch + '&idType=' + idType + '&labelType=' + labelType + '&wsTreeFile=' + encodePath(path[0]) + '&fileType=' + fileType });
      }, false);

      this.browserHeader.addAction('ViewNwkXml', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['GeneTree', 'CodonTree'],
        tooltip: 'View Archaeopteryx Tree'
      }, function (selection, container, button) {
        console.log('browserHeader selection ', selection);
        console.log('browserHeader container ', container);

        var labelSearch = 'false';
        var idType = 'genome_id';
        var labelType = 'genome_name';
        var fileType = 'nwk';
        var path;
        // var app = selection[0].autoMeta.app.id;
        // var output_name = selection[0].autoMeta.parameters.output_file;
        // var output_path = selection[0].autoMeta.parameters.output_path;
        // both CodonTree and GeneTree view buton should point to the phyloxml file if exists
        selection[0].autoMeta.output_files.every(lang.hitch(this, function (file_data) {
          var gt_file = file_data[0].split('.');
          if (gt_file[gt_file.length - 1] === 'phyloxml') {
            path = gt_file.join('.');
            fileType = 'phyloxml';
            return false;
          }
          return true;
        }));

        console.log('browserHeader path ', path);

        if (path) {
          Topic.publish('/navigate', { href: '/view/PhylogeneticTree2/?&labelSearch=' + labelSearch + '&idType=' + idType + '&labelType=' + labelType + '&wsTreeFile=' + encodePath(path) + '&fileType=' + fileType });
        } else {
          console.log('Error: could not find chisqTable.tsv output file');
        }
      }, false);

      this.browserHeader.addAction('ViewSubspeciesResult', 'fa icon-eye fa-2x', {
        label: 'VIEW',
        multiple: false,
        validTypes: ['SubspeciesClassification'],
        tooltip: 'View Result'
      }, function (selection, container, button) {
        console.log(selection);

        var path;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (meta_file_data) {
          if (meta_file_data[0].includes('classification_report.html')) {
            path = meta_file_data[0];
          }
        }));
        if (path) {
          Topic.publish('/navigate', { href: '/workspace' + encodePath(path) });
        } else {
          console.log('Error: could not find classification_report.html output file');
        }
      }, false);

      this.browserHeader.addAction('ViewHASubtypeNumberingReport', 'fa icon-eye fa-2x', {
        label: 'Report',
        multiple: false,
        validTypes: ['HASubtypeNumberingConversion'],
        tooltip: 'View HA Subtype Numbering Conversion Report'
      }, function (selection) {
        const jobPath = selection[0].path + selection[0].name;
        Topic.publish('/navigate', { href: '/view/HASubtypeNumberingReport/&path=' + jobPath, target: 'blank' });
      }, false);

      this.browserHeader.addAction('SubmitSequenceSubmission', 'fa icon-upload fa-3x', {
        label: 'Submit Sequence',
        multiple: false,
        validTypes: ['SequenceSubmission'],
        tooltip: 'Submit Sequence'
      }, function (selection, container, button) {
        button.classList.add('disabled');
        button.style['pointer-events'] = 'none';

        const submittedFileName = 'submission.submitted';
        const submittedFolderPath = `${selection[0].path}.${selection[0].name}`;

        // Check if submission is already submitted
        when(WorkspaceManager.getObject(submittedFolderPath + '/' + submittedFileName), lang.hitch(this, function (obj) {
          const d = new Dialog({
            title: 'Warning',
            content: 'You have already submitted this submission. Please reach out to BV-BRC team if you need further assistance.',
            onHide: function () {
              d.destroy();
            }
          });
          d.show();
        }), lang.hitch(this, function (err) {
          query('.ActionButtonText', button).forEach(function (node) {
            node.innerHTML = 'Processing';
          });

          let formData = new FormData();
          formData.append('subject', 'Sequence Submission is Ready');
          formData.append('ownerId', selection[0].owner_id);
          formData.append('submissionJobPath', selection[0].path + '/' + selection[0].name);
          formData.append('numberOfSequences', selection[0].autoMeta.parameters.numberOfSequences);

          when(request.post('/notifySubmitSequence', {
            headers: {
              'Authorization': (window.App.authorizationToken || ''),
              'enctype': 'multipart/form-data'
            },
            data: formData
          }), function (results) {
            console.log('Succ notifying team for the submission: ', results);

            // Create submitted file to avoid future submissions
            const obj = {
              path: submittedFolderPath,
              name: submittedFileName
            };

            WorkspaceManager.create(obj, true, true);

            const d = new Dialog({
              title: 'Successful',
              content: 'We have successfully notified BV-BRC Team for this submission.',
              onHide: function () {
                d.destroy();
              }
            });
            d.show();

            query('.ActionButtonText', button).forEach(function (node) {
              node.innerHTML = 'Successful';
            });
          }, function (err) {
            console.log('Error notifying team for the submission: ', err);

            const d = new Dialog({
              title: 'Error',
              content: 'We encountered an error while submitting your request. Please try again.',
              onHide: function () {
                d.destroy();
              }
            });
            d.show();

            button.classList.remove('disabled');
            button.style['pointer-events'] = '';
            query('.ActionButtonText', button).forEach(function (node) {
              node.innerHTML = 'Submit Sequence';
            });
          });
        }));
      }, false);

      this.actionPanel.addAction('ViewAFA', 'fa icon-alignment fa-2x', {
        label: 'MSA',
        multiple: false,
        validTypes: ['aligned_dna_fasta', 'aligned_protein_fasta'],
        tooltip: 'View aligned fasta'
      }, function (selection, container) {
        var alignType = 'protein';
        if (this.selection[0].type.includes('dna')) {
          alignType = 'dna';
        }
        console.log('container ', container);
        var msa_file = selection[0].path;
        var exist_nwk = 0;
        if (msa_file[msa_file.length - 1] === 'nwk') {
          exist_nwk = 1;
        }
        if ((!alignType)) {
          console.log('Error: Alignment file doesnt exist or alignment alphabet could not be determined');
        } else if (exist_nwk == 1) {
          Topic.publish('/navigate', { href: '/view/MSATree/&alignType=' + alignType + '&path=' + msa_file, target: 'blank' });
        } else {
          Topic.publish('/navigate', { href: '/view/MSAView/&alignType=' + alignType + '&path=' + msa_file, target: 'blank' });
        }
      }, false);

      this.browserHeader.addAction('ViewAFA', 'fa icon-eye fa-2x', {
        label: 'MSA',
        multiple: false,
        validTypes: ['MSA'],
        tooltip: 'View aligned fasta'
      }, function (selection, container, button) {
        // console.log('selection= ', selection);
        // var alignType = selection[0].autoMeta.parameters.alphabet;
        var afa_file;
        var exist_nwk = 0;
        selection[0].autoMeta.output_files.forEach(lang.hitch(this, function (msa_file_data) {
          var msa_file = msa_file_data[0].split('.');
          if (msa_file[msa_file.length - 1] === 'afa') {
            afa_file = msa_file.join('.');
          }
          if (msa_file[msa_file.length - 1] === 'nwk') {
            exist_nwk = 1;
          }
        }));
        if ((!afa_file)) {
          console.log('Error: Alignment file doesn\'t exist.');
        } else {
          when(WorkspaceManager.getObject(afa_file, true), function (data) {
            var alignType = 'protein';
            if (data.type.includes('dna')) {
              alignType = 'dna';
            }
            if (exist_nwk == 1) {
              Topic.publish('/navigate', { href: '/view/MSATree/&alignType=' + alignType + '&path=' + afa_file, target: 'blank' });
            } else {
              Topic.publish('/navigate', { href: '/view/MSAView/&alignType=' + alignType + '&path=' + afa_file, target: 'blank' });
            }
          });
        }
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
        validTypes: ['TnSeq', 'Variation', 'FastqUtils'],
        tooltip: 'View tracks in genome browser.'
      }, function (selection) {
        // console.log("View Tracks: ", this);
        try {
          var genomeId = self.actionPanel.currentContainerWidget.getGenomeId();
          var urlQueryParams = self.actionPanel.currentContainerWidget.getJBrowseURLQueryParams();
        }
        catch (err) {
          alert('The genome browser could not be opened. No genome id or no streamable files were found.');
          throw (err);
        }
        Topic.publish('/navigate', { href: '/view/Genome/' + genomeId + '#' + urlQueryParams });
      }, false);

      this.browserHeader.addAction('ViewTracksRNASeq', 'fa icon-genome-browser fa-2x', {
        label: 'BROWSER',
        multiple: false,
        validTypes: ['RNASeq'],
        tooltip: 'View tracks in genome browser.'
      }, function (selection) {
        // console.log("View Tracks: ", this);
        try {
          var genomeId = self.actionPanel.currentContainerWidget.getGenomeId();
          self.actionPanel.currentContainerWidget.getJBrowseURLQueryParamsRNASeq().then(lang.hitch(this, function (urlQueryParams) {
            Topic.publish('/navigate', { href: '/view/Genome/' + genomeId + '#' + urlQueryParams, target: 'blank' });
          }));
          // var urlQueryParams = self.actionPanel.currentContainerWidget.getJBrowseURLQueryParams();
        }
        catch (err) {
          alert('The genome browser could not be opened. No genome id or no streamable files were found.');
          throw (err);
        }
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
          selectionText: 'Destination',
          disableDropdownSelector: true
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
          selectionText: 'Destination',
          disableDropdownSelector: true
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

      this.actionPanel.addAction('Rerun', 'fa icon-rotate-left fa-2x', {
        label: 'RERUN',
        allowMultiTypes: true,
        multiple: true,
        validTypes: ['ComparativeSystems',
          'ComprehensiveGenomeAnalysis',
          'ComprehensiveSARS2Analysis',
          'DifferentialExpression',
          'FastqUtils',
          'GeneTree',
          'GenomeAssembly2',
          'GenomeAlignment',
          'GenomeAnnotation',
          'GenomeComparison',
          'Homology',
          'MetaCATS',
          'MetagenomeBinning',
          'MetagenomicReadMapping',
          'MSA',
          'PrimerDesign',
          'CodonTree',
          'RNASeq',
          'SubspeciesClassification',
          'TaxonomicClassification',
          'TnSeq',
          'Variation'
        ],
        tooltip: 'Reset job form with current parameters'
      }, function (selection) {
        rerunUtility.rerun(JSON.stringify(selection[0].autoMeta.parameters), selection[0].autoMeta.app.id, window, Topic);
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

      // Hide the panel on a small screen
      if (window.innerWidth <= 768 && this.actionPanel) {
        const hideBtn = query('[rel="ToggleItemDetail"]', this.actionPanel.domNode)[0];
        hideBtn.click();
      }
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

          if (newUsers.indexOf(user) == -1) { newPerms.push({ user: user, permission: 'n' }); }
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
              prom = WorkspaceManager.renameWorkspace(path, newName);
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
      var types = WorkspaceManager.changeableTypes;
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
        title: 'Change ' + (paths.length > 1 ? paths.length + ' Object Types' : ' Object Type'),
        okLabel: 'Save',
        content: form,
        style: { width: '300px' },
        onConfirm: function (evt) {
          var newType = typeSelector.attr('value');
          var newObjs = selection.map(function (obj) {
            return Object.assign(obj, { type: newType });
          });

          Topic.publish('/Notification', {
            message: "<span class='default'>Changing " +
              (paths.length > 1 ? paths.length + ' types...' : ' type...') +
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

      // console.log('in WorkspaceBrowser this.path', this.path);
      // console.log('in WorkspaceBrowser obj', obj);

      Deferred.when(obj, lang.hitch(this, function (obj) {
        if (this.browserHeader) {
          this.browserHeader.set('selection', [obj]);
        }
        var panelCtor;
        var params = { path: this.path, region: 'center' };

        console.log('in WorkspaceBrowser obj', obj);
        // console.log('in WorkspaceBrowser obj.autoMeta', obj.autoMeta);
        // console.log('in WorkspaceBrowser browserHeader', this.browserHeader);

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
                case 'FastqUtils':
                  d = 'p3/widget/viewer/Seq';
                  break;
                case 'ComprehensiveGenomeAnalysis':
                  d = 'p3/widget/viewer/ComprehensiveGenomeAnalysis';
                  break;
                case 'Homology':
                  d = 'p3/widget/viewer/BlastJobResult';
                  break;
                default:
                  console.log('Using the default JobResult viewer. A viewer could not be found for id: ' + id);
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
          case 'csv':
          case 'tsv':
            var tsvCsvFilename = this.tsvCsvFilename = obj.name;
            panelCtor = window.App.getConstructor('p3/widget/viewer/TSV_CSV');
            params.file = { metadata: obj };
            break;
          case 'nwk':
          case 'phyloxml':
            var labelSearch = 'false';
            var idType = 'genome_id';
            var labelType = 'genome_name';
            var filepath = obj.path + obj.name;
            Topic.publish('/navigate', { href: '/view/PhylogeneticTree2/?&labelSearch=' + labelSearch + '&idType=' + idType + '&labelType=' + labelType + '&wsTreeFile=' + encodePath(filepath) + '&fileType=' + obj.type });
            break;

          default:
            var tsvCsvFilename = this.tsvCsvFilename = obj.name;
            var isTsv = false;
            var keyList = Object.keys(tsvCsvFeatures);    // for older tsv files typed as txt
            keyList.forEach(function (keyName) {
              if (tsvCsvFilename.indexOf(keyName) >= 0) {
                // key name is found
                isTsv = true;
              }
            });
            if (isTsv) {
              panelCtor = window.App.getConstructor('p3/widget/viewer/TSV_CSV');
            } else {
              panelCtor = window.App.getConstructor('p3/widget/viewer/File');
            }
            params.file = { metadata: obj };
        }

        Deferred.when(panelCtor, lang.hitch(this, function (Panel) {
          if ((!this.activePanel) || !(this.activePanel instanceof Panel) || this.activePanel instanceof JobResult) {
            if (this.activePanel) {
              this.removeChild(this.activePanel);
            }

            var newPanel = new Panel(params);
            var hideTimer;

            if (newPanel.setActionPanel) { newPanel.setActionPanel(this.actionPanel); }

            var _self = this;
            Topic.subscribe('changeActionPanel', function (actionPanel) {
              _self.actionPanel.set('selection', []);
              _self.actionPanel.set('currentContainerWidget', newPanel);
            });

            if (this.actionPanel) {
              this.actionPanel.set('currentContainerWidget', newPanel);
              if (this.itemDetailPanel) {
                this.itemDetailPanel.set('containerWidget', newPanel);
              }
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
            if (this.activePanel && 'clearSelection' in this.activePanel) {
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
