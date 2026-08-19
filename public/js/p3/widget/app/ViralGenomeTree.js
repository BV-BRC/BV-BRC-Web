define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/topic', 'dojo/on',
  'dojo/dom-class',
  'dojo/text!./templates/ViralGenomeTree.html', './AppBase', 'dojo/dom-construct', 'dijit/registry',
  'dojo/_base/Deferred', 'dojo/aspect', 'dojo/_base/lang', 'dojo/domReady!', 'dijit/form/NumberTextBox',
  'dojo/query', 'dojo/dom', 'dijit/popup', 'dijit/Tooltip', 'dijit/Dialog', 'dijit/TooltipDialog', '../../DataAPI',
  'dojo/NodeList-traverse', '../../WorkspaceManager', 'dojo/store/Memory', 'dojox/widget/Standby', 'dojo/when', '../AdvancedSearchFields',
  '../../util/ViralGenomeGroupClassifier'
], function (
  declare, WidgetBase, Topic, on,
  domClass,
  Template, AppBase, domConstruct, registry,
  Deferred, aspect, lang, domReady, NumberTextBox,
  query, dom, popup, Tooltip, Dialog, TooltipDialog, DataAPI,
  children, WorkspaceManager, Memory, Standby, when, AdvancedSearchFields,
  ViralGenomeGroupClassifier
) {
  return declare([AppBase], {
    baseClass: 'App ViralGenomeTree',
    templateString: Template,
    applicationName: 'GeneTree',
    requireAuth: true,
    applicationLabel: 'Viral Genome Tree',
    applicationDescription: 'The Viral Genome Tree Service enables construction of whole genome alignment based phylogenetic trees for user-selected viral genomes.',
    applicationHelp: 'quick_references/services/genetree.html',
    tutorialLink: 'tutorial/genetree/genetree.html',
    videoLink: 'https://youtu.be/VtXWBRSdXRo',
    pageTitle: 'Viral Genome Tree Service | BV-BRC',
    defaultPath: '',
    startingRows: 3,
    metadataStartingRows: 5,
    maxGenomes: 5000,
    maxGenomeLength: 250000,

    constructor: function () {
      this._selfSet = true;
      this.addedGenomes = 0;
      this.genomeToAttachPt = ['comp_genome_id'];
      this.fastaToAttachPt = ['user_genomes_fasta'];
      this.unalignedFastaToAttachPt = ['user_genomes_unaligned_fasta'];
      this.featureGroupToAttachPt = ['user_genomes_featuregroup'];
      this.genomeGroupToAttachPt = ['user_genomes_genomegroup'];
      this.userGenomeList = [];
      this.numref = 0;
      this.fastaNamesAndTypes = [];
      this.metadataDict = {};
      this.genomeGroupClassifications = {};
      this.genomeGroupSelectedSegments = [];
      this.genomeGroupAvailableSegments = [];
      this.genomeGroupSegmentLabelScheme = null;
      this.genomeGroupLoading = false;
      this.genomeGroupConcatSegments = false;
      this.genomeGroupSelectionInitialized = false;
      this.genomeGroupRequestedSegments = null;
    },

    startup: function () {
      var _self = this;
      if (this._started) {
        return;
      }
      if (this.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        return;
      }
      this.inherited(arguments);

      _self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
      _self.output_path.set('value', _self.defaultPath);

      on(this.advanced, 'click', lang.hitch(this, function () {
        this.toggleAdvanced((this.advancedOptions.style.display == 'none'));
      }));

      this.numref = 0;
      this.emptyTable(this.genomeTable, this.startingRows);
      this.startupMetadataTable();
      this.startupAdvMetadata();
      this.numgenomes.startup();
      this.setTooltips();
      this._started = true;
      this.form_flag = false;
      try {
        this.intakeRerunForm();
      } catch (error) {
        console.error(error);
      }
    },

    toggleAdvanced: function (flag) {
      if (flag) {
        this.advancedOptions.style.display = 'block';
        this.advancedOptionIcon.className = 'fa icon-caret-left fa-1';
      }
      else {
        this.advancedOptions.style.display = 'none';
        this.advancedOptionIcon.className = 'fa icon-caret-down fa-1';
      }
    },

    onAddMetadata: function () {
      var metadata_value = this.metadata_selector.getValue();
      var metadata_field = this.metadata_selector.get('displayedValue');
      if (Object.keys(this.metadataDict).includes(metadata_value)) {
        return;
      }

      var tr = this.metadataTableBody.insertRow(0);
      this.metadata_count++;
      var td = domConstruct.create('td', { class: 'textcol', innerHTML: '' }, tr);
      td.innerHTML = "<div class='libraryrow'>" + metadata_field + '</div>';
      tr.value = metadata_value;
      this.metadataDict[metadata_value] = metadata_field;
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        // console.log("Delete Row: groupType ="+groupType+" newGenomeIds = " + newGenomeIds);
        domConstruct.destroy(tr);
        this.metadata_count--;
        delete this.metadataDict[tr.value];
        if (this.metadata_count < this.metadataStartingRows) {
          var ntr = this.metadataTableBody.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        handle.remove();
      }));
      if (this.metadata_count <= this.metadataStartingRows) {
        this.metadataTableBody.deleteRow(-1);
      }
    },

    startupMetadataTable: function () {
      this.checkMoreOptions('initialize_options'); // initializes the list of options
      var default_metadata_fields = ['Genome ID', 'Genome Name', 'Species', 'Strain', 'Accession', 'Subtype'].reverse();
      var default_metadata_values = ['genome_id', 'genome_name', 'species', 'strain', 'accession', 'subtype'].reverse();
      this.metadata_count = 0;
      var default_index = 0;
      default_metadata_fields.forEach(lang.hitch(this, function (metfield) {
        var tr = this.metadataTableBody.insertRow(0);
        this.metadata_count++;
        var metadata_value = default_metadata_values[default_index];
        this.metadataDict[metadata_value] = metfield;
        tr.value = metadata_value;
        var td = domConstruct.create('td', { 'met_val': metadata_value, class: 'textcol', innerHTML: '' }, tr);
        td.innerHTML = "<div class='libraryrow'>" + metfield + '</div>';
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row: groupType ="+groupType+" newGenomeIds = " + newGenomeIds);
          domConstruct.destroy(tr);
          this.metadata_count--;
          delete this.metadataDict[tr.value];
          if (this.metadata_count < this.metadataStartingRows) {
            var ntr = this.metadataTableBody.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            // domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        default_index++;
      }));
    },

    startupAdvMetadata: function () {
      this.advMetadata = [];
      AdvancedSearchFields['genome'].forEach(lang.hitch(this, function (obj) {
        var disable_field = obj['field'].includes('---');
        var newOpt = {
          label: obj['field'],
          value: obj['field'],
          selected: false,
          disabled: disable_field
        }
        this.advMetadata.push(newOpt);
      }));
      this.advMetadata.push({
        label: '... Fewer Options ...',
        value: 'less_options',
        selected: false
      });
    },

    openJobsList: function () {
      Topic.publish('/navigate', { href: '/job/' });
    },

    emptyTable: function (target, rowLimit) {
      for (var i = 0; i < rowLimit; i++) {
        var tr = target.insertRow(0);// domConstr.create("tr",{},this.genomeTableBody);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
        domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, tr);
      }
    },

    checkDuplicate: function (cur_value, attachType) {
      var duplicate = 0;
      var genomeIds = [];
      var genomeList = query('.genomedata');
      genomeList.forEach(function (item) {
        genomeIds.push(item.genomeRecord[attachType]);
      });
      if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1) { // found duplicate
        duplicate = 1;
      }
      return duplicate;
    },

    ingestAttachPoints: function (input_pts, target, req) {
      req = typeof req !== 'undefined' ? req : true;
      var success = 1;
      input_pts.forEach(function (attachname) {
        var cur_value = null;
        var incomplete = 0;
        var browser_select = 0;
        if (attachname == 'output_path' || attachname == 'ref_user_genomes_fasta' || attachname == 'ref_user_genomes_featuregroup') {
          cur_value = this[attachname].searchBox.value;// ? "/_uuid/"+this[attachname].searchBox.value : "";
          browser_select = 1;
        }
        else if (attachname == 'user_genomes_fasta' || attachname == 'user_genomes_unaligned_fasta') {
          cur_value = this[attachname].searchBox.value;// ? "/_uuid/"+this[attachname].searchBox.value : "";
          var compGenomeList = query('.genomedata');
          var genomeIds = [];

          compGenomeList.forEach(function (item) {
            genomeIds.push(item.genomeRecord.user_genomes_fasta);
          });

          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
          {
            success = 0;
          }
        }
        else if (attachname == 'user_genomes_featuregroup') {
          cur_value = this[attachname].searchBox.value;// ? "/_uuid/"+this[attachname].searchBox.value : "";
          var compGenomeList = query('.genomedata');
          var genomeIds = [];

          compGenomeList.forEach(function (item) {
            genomeIds.push(item.genomeRecord.user_genomes_featuregroup);
          });

          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
          {
            success = 0;
          }
        }
        else if (attachname == 'comp_genome_id') {
          var compGenomeList = query('.genomedata');
          var genomeIds = [];

          compGenomeList.forEach(function (item) {
            genomeIds.push(item.genomeRecord.comp_genome_id);
          });

          cur_value = this[attachname].value;

          // console.log("genomeIds = " + genomeIds + " cur_value = " + cur_value + " index = " +genomeIds.indexOf(cur_value));
          if (genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
          {
            success = 0;
          }
        }
        else if (attachname == 'user_genomes_genomegroup') {
          cur_value = this[attachname].searchBox.value;
          var duplicate_genome = this.checkDuplicate(cur_value, 'user_genomes_genomegroup');
          if (duplicate_genome) {
            success = 0;
          }
        }
        else {
          cur_value = this[attachname].value;
        }

        // console.log("cur_value=" + cur_value);

        if (typeof (cur_value) == 'string') {
          target[attachname] = cur_value.trim();
        }
        else {
          target[attachname] = cur_value;
        }
        if (req && (!target[attachname] || incomplete)) {
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
        if (target[attachname] != '') {
          target[attachname] = target[attachname] || undefined;
        }
        else if (target[attachname] == 'true') {
          target[attachname] = true;
        }
        else if (target[attachname] == 'false') {
          target[attachname] = false;
        }
      }, this);
      return (success);
    },

    checkMoreOptions: function (sel) {
      if (sel === 'more_options') {
        this.metadata_selector.set('options', this.advMetadata).reset();
        this.metadata_selector.toggleDropDown();
      }
      if (sel === 'less_options' || sel === 'initialize_options') {
        var newOpts = [
          {
            label: 'Genome Name', value: 'genome_name', selected: false
          },
          {
            label: 'Genome Length', value: 'genome_length', selected: false
          },
          {
            label: 'Genome Group', value: 'genome_group', selected: false
          },
          {
            label: 'Genus', value: 'genus', selected: false
          },
          {
            label: 'Species', value: 'species', selected: false
          },
          {
            label: 'Strain', value: 'strain', selected: false
          },
          {
            label: 'Accession', value: 'accession', selected: false
          },
          {
            label: 'Subtype', value: 'subtype', selected: false
          },
          {
            label: 'Lineage', value: 'lineage', selected: false
          },
          {
            label: 'H1 Clade Global', value: 'h1_clade_global', selected: false
          },
          {
            label: 'H1 Clade US', value: 'h1_clade_us', selected: false
          },
          {
            label: 'H3 Clade', value: 'h3_clade', selected: false
          },
          {
            label: 'H5 Clade', value: 'h5_clade', selected: false
          },
          {
            label: 'Host Group', value: 'host_group', selected: false
          },
          {
            label: 'Host Common Name', value: 'host_common_name', selected: false
          },
          {
            label: 'Collection Date', value: 'collection_date', selected: false
          },
          {
            label: 'Collection Year', value: 'collection_year', selected: false
          },
          {
            label: 'Geographic Group', value: 'geographic_group', selected: false
          },
          {
            label: 'Isolation Country', value: 'isolation_country', selected: false
          },
          {
            label: 'Geographic Location', value: 'geographic_location', selected: false
          },
          {
            label: '... More Options ...', value: 'more_options', selected: false
          }
        ];
        this.metadata_selector.set('options', newOpts).reset();
        if (sel === 'less_options') {
          this.metadata_selector.toggleDropDown();
        }
      }
    },

    onSuggestNameChange: function () {
      if (this.ref_genome_id.get('value') || this.ref_user_genomes_fasta.get('value') || this.ref_user_genomes_featuregroup.get('value')) {
        this.numref = 1;
      } else {
        this.numref = 0;
      }
      // console.log("change genome name, this.numref=", this.numref, "this.ref_genome_id.get('value')=", this.ref_genome_id.get('value'));
    },

    handleGenomeGroupSelectionChange: function () {
      var path = this.user_genomes_genomegroup.get('value');

      if (!path) {
        this.genomeGroupLoading = false;
        this.updateGenomeGroupSummary();
        return;
      }

      this.genomeGroupLoading = true;
      this.genomeGroupRequestedSegments = null;
      this.updateGenomeGroupSummary(path);
      ViralGenomeGroupClassifier.fetchGenomeGroupClassification(path).then(lang.hitch(this, function (classification) {
        if (this.user_genomes_genomegroup.get('value') !== path) {
          return;
        }
        this.genomeGroupClassifications[path] = classification;
        this.genomeGroupLoading = false;
        this.syncGenomeGroupSelection(this.getGenomeGroupPaths(true));
        this.updateGenomeGroupSummary(path);
      }), lang.hitch(this, function () {
        if (this.user_genomes_genomegroup.get('value') !== path) {
          return;
        }
        delete this.genomeGroupClassifications[path];
        this.genomeGroupLoading = false;
        this.syncGenomeGroupSelection(this.getGenomeGroupPaths(true));
        this.updateGenomeGroupSummary();
      }));
    },

    getGenomeGroupPaths: function (includeCurrentSelection) {
      var paths = [];

      this.fastaNamesAndTypes.forEach(function (item) {
        if (item.type === 'genome_group' && paths.indexOf(item.filename) === -1) {
          paths.push(item.filename);
        }
      });

      if (includeCurrentSelection && this.user_genomes_genomegroup) {
        var currentPath = this.user_genomes_genomegroup.get('value');
        if (currentPath && paths.indexOf(currentPath) === -1) {
          paths.push(currentPath);
        }
      }

      return paths.filter(lang.hitch(this, function (path) {
        return !!this.genomeGroupClassifications[path];
      }));
    },

    syncGenomeGroupSelection: function (paths) {
      var classifications = (paths || []).map(lang.hitch(this, function (path) {
        return this.genomeGroupClassifications[path];
      })).filter(function (classification) {
        return !!classification;
      });
      var combined = ViralGenomeGroupClassifier.combineClassifications(classifications);
      var availableSegments = combined.available_segments || [];
      var previousAvailableSegments = this.genomeGroupAvailableSegments || [];
      var selectedSegments = this.genomeGroupSelectedSegments || [];
      var hadAllSelected = previousAvailableSegments.length
        && selectedSegments.length === previousAvailableSegments.length
        && previousAvailableSegments.every(function (segment) {
          return selectedSegments.indexOf(segment) > -1;
        });

      this.genomeGroupSegmentLabelScheme = combined.segment_label_scheme || null;

      if (!availableSegments.length) {
        this.genomeGroupAvailableSegments = [];
        this.genomeGroupSelectedSegments = [];
        this.genomeGroupSelectionInitialized = false;
        this.refreshGenomeGroupTableLabels();
        return combined;
      }

      if (this.genomeGroupRequestedSegments) {
        this.genomeGroupSelectedSegments = this.genomeGroupRequestedSegments.filter(function (segment) {
          return availableSegments.indexOf(segment) > -1;
        });
      } else if (!this.genomeGroupSelectionInitialized || hadAllSelected) {
        this.genomeGroupSelectedSegments = availableSegments.slice();
      } else {
        this.genomeGroupSelectedSegments = selectedSegments.filter(function (segment) {
          return availableSegments.indexOf(segment) > -1;
        });
      }

      this.genomeGroupAvailableSegments = availableSegments.slice();
      this.genomeGroupSelectionInitialized = true;
      this.refreshGenomeGroupTableLabels();
      return combined;
    },

    getSelectedGenomeGroupSegments: function () {
      var selected = [];

      if (this.genomegroup_summary) {
        var inputs = query('input[data-genome-group-segment]', this.genomegroup_summary);
        if (!inputs.length) {
          return this.genomeGroupSelectedSegments.slice();
        }
        inputs.forEach(function (node) {
          if (node.checked) {
            selected.push(node.value);
          }
        });
        this.genomeGroupSelectedSegments = selected.slice();
        return selected;
      }

      return this.genomeGroupSelectedSegments ? this.genomeGroupSelectedSegments.slice() : [];
    },

    setGenomeGroupSegmentsChecked: function (checked) {
      if (!this.genomegroup_summary) {
        return;
      }

      this.genomeGroupRequestedSegments = null;
      query('input[data-genome-group-segment]', this.genomegroup_summary).forEach(function (node) {
        node.checked = checked;
      });
      this.getSelectedGenomeGroupSegments();
      this.refreshGenomeGroupTableLabels();
    },

    bindGenomeGroupSummaryControls: function () {
      if (!this.genomegroup_summary) {
        return;
      }

      query('[data-segment-action]', this.genomegroup_summary).forEach(lang.hitch(this, function (node) {
        on(node, 'click', lang.hitch(this, function (evt) {
          evt.preventDefault();
          evt.stopPropagation();
          this.setGenomeGroupSegmentsChecked(node.getAttribute('data-segment-action') === 'all');
        }));
      }));

      query('input[data-genome-group-segment]', this.genomegroup_summary).forEach(lang.hitch(this, function (node) {
        on(node, 'change', lang.hitch(this, function () {
          this.genomeGroupRequestedSegments = null;
          this.getSelectedGenomeGroupSegments();
          this.refreshGenomeGroupTableLabels();
        }));
      }));

      query('input[data-genome-group-concat]', this.genomegroup_summary).forEach(lang.hitch(this, function (node) {
        node.checked = !!this.genomeGroupConcatSegments;
        on(node, 'change', lang.hitch(this, function () {
          this.genomeGroupConcatSegments = node.checked;
        }));
      }));
    },

    getGenomeGroupConcatSegments: function () {
      if (this.genomegroup_summary) {
        var node = query('input[data-genome-group-concat]', this.genomegroup_summary)[0];
        if (node) {
          this.genomeGroupConcatSegments = node.checked;
        }
      }

      return !!this.genomeGroupConcatSegments;
    },

    updateGenomeGroupSummary: function (path) {
      if (!this.genomegroup_summary) {
        return;
      }

      if (this.genomeGroupLoading) {
        this.genomegroup_summary.innerHTML = 'Fetching segments...';
        return;
      }

      path = path || this.user_genomes_genomegroup.get('value');
      var paths = this.getGenomeGroupPaths(true);
      var classification = this.syncGenomeGroupSelection(paths);

      if (!path || !classification || !classification.genome_count) {
        this.genomegroup_summary.innerHTML = '';
        return;
      }

      if (classification.segmentation_mode === 'segmented' && classification.available_segments.length) {
        var selectedSegments = this.genomeGroupSelectedSegments || [];
        var labels = classification.available_segment_labels || classification.available_segments;
        var hasPartialSegments = !!classification.segments_missing_in_some_genomes.length;
        var html = [
          '<div class="genome-group-segment-summary">',
          '<div class="genome-group-segment-summary__header">',
          '<span class="genome-group-segment-summary__title">Available segments</span>',
          '<span class="genome-group-segment-summary__actions">',
          '<button type="button" class="genome-group-segment-summary__action" data-segment-action="all">Select all</button>',
          '<button type="button" class="genome-group-segment-summary__action" data-segment-action="none">Clear</button>',
          '</span>',
          '</div>',
          '<label class="genome-group-segment-summary__toggle">',
          '<input type="checkbox" data-genome-group-concat="1"', this.getGenomeGroupConcatSegments() ? ' checked' : '', '> ',
          'Concatenate selected segments',
          '</label>',
          '<div class="genome-group-segment-summary__options">'
        ];
        classification.available_segments.forEach(function (segment, idx) {
          var checked = selectedSegments.indexOf(segment) > -1 ? ' checked' : '';
          var partial = (classification.segment_genome_counts[segment] || 0) < classification.genome_count;
          html.push(
            '<label class="genome-group-segment-summary__option">' +
            '<input type="checkbox" data-genome-group-segment="1" value="' + segment + '"' + checked + '> ' +
            labels[idx] +
            (partial ? ' <span class="genome-group-segment-summary__indicator" title="Not present in all genomes">*</span>' : '') +
            '</label>'
          );
        });
        html.push('</div>');
        if (hasPartialSegments) {
          html.push('<div class="genome-group-segment-summary__note">* indicates a segment that is not present in all selected genomes.</div>');
        }
        html.push('</div>');
        this.genomegroup_summary.innerHTML = html.join('');
        this.bindGenomeGroupSummaryControls();
        return;
      }

      this.genomegroup_summary.innerHTML = '<div class="genome-group-segment-summary genome-group-segment-summary__status">No segment values found. This group will be treated as unsegmented.</div>';
    },

    resetGenomeGroupSelection: function () {
      this.genomeGroupClassifications = {};
      this.genomeGroupSelectedSegments = [];
      this.genomeGroupAvailableSegments = [];
      this.genomeGroupSegmentLabelScheme = null;
      this.genomeGroupLoading = false;
      this.genomeGroupConcatSegments = false;
      this.genomeGroupSelectionInitialized = false;
      this.genomeGroupRequestedSegments = null;
      if (this.genomegroup_summary) {
        this.genomegroup_summary.innerHTML = '';
      }
    },

    onAlphabetChanged: function () {
      // can't mix DNA and Protein file types, so clear the file table and the array of file/filetypes
      while (this.genomeTable.rows.length > 0) {
        this.genomeTable.deleteRow(-1);
      }
      // Only clear away aligned and unaligned fasta files, leave feature and genome groups in table
      var feature_groups = [];
      var genome_groups = [];
      console.log('onAlphabetChanged fastaNamesAndTypes:', this.fastaNamesAndTypes);
      this.fastaNamesAndTypes.forEach(lang.hitch(this, function (obj) {
        if (obj.type == 'feature_group') {
          feature_groups.push(obj);
          this.decreaseGenome('feature_group', obj['filename']);
        }
        else if (obj.type == 'genome_group') {
          genome_groups.push(obj);
          this.decreaseGenome('genome_group', obj['genome_ids'])
        }
        else {
          this.decreaseGenome(obj['type'], obj['filename']);
        }
      }))
      this.fastaNamesAndTypes = [];
      // this.fastaNamesAndTypes = new_fastaNamesAndTypes;
      // this.userGenomeList = [];
      // var numRows = this.startingRows;
      var total_groups = feature_groups.length + genome_groups.length;
      // var numRows = total_groups.length >= this.startingRows ? -1 : this.startingRows - total_groups.length;
      this.emptyTable(this.genomeTable, this.startingRows);
      // this.userGenomeList = [];
      // this.fastaNamesAndTypes = [];

      // Add featuregroups and genomegroups back to table
      // TODO: add each individually
      console.log('feature_groups', feature_groups);
      console.log('genome_groups', genome_groups);

      feature_groups.forEach(lang.hitch(this, function (obj) {
        this.addFeatureGroupAlphabetChange(obj.filename);
      }));
      genome_groups.forEach(lang.hitch(this, function (obj) {
        this.addGenomeGroupToTableAlphabetChanged(obj.filename, obj.genome_ids)
      }))
      /*
      var groups = {};
      groups['sequences'] = [];
      keep_fastaNamesAndTypes.forEach(lang.hitch(this, function (obj) {
        console.log(obj);
        var new_seq = {};
        new_seq.type = obj.type;
        new_seq.filename = obj.filename;
        groups['sequences'].push(new_seq);
      }));
      this.addSequenceFilesFormFill(groups, true);
      */
      this.substitution_model.options = [];
      if (this.dna.checked) {
        var newOptions = [
          {
            value: 'GTR', label: 'GTR', selected: true, disabled: false
          },
          {
            value: 'TN93', label: 'TN93', selected: true, disabled: false
          },
          {
            value: 'HKY85', label: 'HKY85', selected: true, disabled: false
          },
          {
            value: 'F84', label: 'F84', selected: true, disabled: false
          },
          {
            value: 'F81', label: 'F81', selected: true, disabled: false
          },
          {
            value: 'K80', label: 'K80', selected: true, disabled: false
          },
          {
            value: 'JC69', label: 'JC69', selected: true, disabled: false
          }
        ];
        this.substitution_model.set('options', newOptions);
        this.user_genomes_fasta.set('type', 'aligned_dna_fasta');
        this.user_genomes_unaligned_fasta.set('type', 'feature_dna_fasta');
      }
      else {
        var newOptions = [{
          value: 'LG', label: 'LG', selected: false, disabled: false
        },
        {
          value: 'WAG', label: 'WAG', selected: false, disabled: false
        },
        {
          value: 'JTT', label: 'JTT', selected: false, disabled: false
        },
        {
          value: 'Blosum62', label: 'Blosum62', selected: false, disabled: false
        },
        {
          value: 'Dayhoff', label: 'Dayhoff', selected: true, disabled: false
        },
        {
          value: 'HIVw', label: 'HIVw', selected: false, disabled: false
        },
        {
          value: 'HIVb', label: 'HIVb', selected: false, disabled: false
        }];
        this.substitution_model.set('options', newOptions);
        this.user_genomes_fasta.set('type', 'aligned_protein_fasta');
        this.user_genomes_unaligned_fasta.set('type', 'feature_protein_fasta');
      }
      this.substitution_model.reset();
    },

    makeGenomeName: function () {
      var name = this.comp_genome_id.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }

      return display_name;
    },

    makeFastaName: function () {
      var name = this.user_genomes_fasta.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;

      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }

      return display_name;
    },

    makeUnalignedFastaName: function () {
      var name = this.user_genomes_unaligned_fasta.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;

      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }

      return display_name;
    },

    makeFeatureGroupName: function () {
      var name = this.user_genomes_featuregroup.searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      // console.log("this.user_genomes_featuregroup name = " + this.name);

      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }

      return display_name;
    },

    makeGenomeGroupName: function (newGenomeIds) {
      var name = this[this.genomeGroupToAttachPt].searchBox.get('displayedValue');
      var maxName = 36;
      var display_name = name;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }

      return display_name;
    },

    formatSelectedGenomeGroupSegments: function () {
      var selectedSegments = this.getSelectedGenomeGroupSegments();

      if (!selectedSegments.length) {
        return 'Segments: none';
      }

      return 'Segments: ' + selectedSegments.map(function (segment) {
        var info = ViralGenomeGroupClassifier.getSegmentDisplayInfo(
          segment,
          this.genomeGroupSegmentLabelScheme
        );
        return info.shortName || info.value;
      }, this).join(', ');
    },

    buildGenomeGroupTableLabel: function (path, genomeCount) {
      var displayName = this.makeFormFillName((path || '').split('/').reverse()[0] || '');
      return displayName + ' (' + genomeCount + ') | ' + this.formatSelectedGenomeGroupSegments();
    },

    refreshGenomeGroupTableLabels: function () {
      query('.genomedata', this.genomeTable).forEach(lang.hitch(this, function (node) {
        if (!node.genomeRecord || !node.genomeRecord.user_genomes_genomegroup) {
          return;
        }

        node.innerHTML = "<div class='libraryrow'>" + this.buildGenomeGroupTableLabel(
          node.genomeRecord.user_genomes_genomegroup,
          node.genomeGroupCount || 0
        ) + '</div>';
      }));
    },

    increaseGenome: function (genomeType, newGenomeIds) {
      if (genomeType == 'genome' || genomeType == 'genome_group') {
        newGenomeIds.forEach(lang.hitch(this, function (id) {
          this.userGenomeList.push(id);
        }));
        this.addedGenomes = this.addedGenomes + newGenomeIds.length;
        this.numgenomes.set('value', Number(this.addedGenomes));
      } else {
        this.addedGenomes = this.addedGenomes + 1;
        this.numgenomes.set('value', Number(this.addedGenomes));
      }
      // console.log("increase this.userGenomeList = " + this.userGenomeList);
    },

    decreaseGenome: function (genomeType, newGenomeIds) {
      if (genomeType == 'genome' || genomeType == 'genome_group') {
        newGenomeIds.forEach(lang.hitch(this, function (id) {
          var idx = this.userGenomeList.indexOf(id);
          if (idx > -1) {
            this.userGenomeList.splice(idx, 1);
          }
        }));
        this.addedGenomes = this.addedGenomes - newGenomeIds.length;
        this.numgenomes.set('value', Number(this.addedGenomes));
      } else {
        this.addedGenomes = this.addedGenomes - 1;
        this.numgenomes.set('value', Number(this.addedGenomes));
      }
      // console.log("decrease this.userGenomeList = " + this.userGenomeList);
    },

    onAddGenome: function () {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);
      // console.log("this.genomeToAttachPt = " + this.genomeToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var newGenomeIds = [lrec[this.genomeToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row");
          domConstruct.destroy(tr);
          this.decreaseGenome('genome', newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
        }));
        this.increaseGenome('genome', newGenomeIds);
      }
      // console.log(lrec);
    },

    onAddFasta: function () {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.fastaToAttachPt, lrec);
      // console.log("this.fastaToAttachPt = " + this.fastaToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var newGenomeIds = [lrec[this.fastaToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFastaName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row");
          domConstruct.destroy(tr);
          this.decreaseGenome('fasta', newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
          this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.fastaToAttachPt]);
        }));
        this.increaseGenome('fasta', newGenomeIds);
        this.sequenceSource = 'ws';

        var path = lrec[this.fastaToAttachPt];
        when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
          var fileType = res.metadata.type;
          this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
        }));
      }
      // console.log(lrec);
    },

    onAddUnalignedFasta: function () {
      // console.log("Create New Row", domConstruct);
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.unalignedFastaToAttachPt, lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var newGenomeIds = [lrec[this.unalignedFastaToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeUnalignedFastaName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row");
          domConstruct.destroy(tr);
          this.decreaseGenome('fasta', newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
          this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.unalignedFastaToAttachPt]);
        }));
        this.increaseGenome('fasta', newGenomeIds);
        this.sequenceSource = 'ws';

        var path = lrec[this.unalignedFastaToAttachPt];
        when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
          var fileType = res.metadata.type;
          this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
        }));
      }
    },

    onAddFeatureGroup: function () {
      console.log('Create New Row', domConstruct);
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.featureGroupToAttachPt, lrec);
      // console.log("this.featureGroupToAttachPt = " + this.featureGroupToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      if (chkPassed && this.addedGenomes < this.maxGenomes) {
        var newGenomeIds = [lrec[this.featureGroupToAttachPt]];
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row");
          domConstruct.destroy(tr);
          this.decreaseGenome('feature_group', newGenomeIds);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
          // remove entry from this.fastaNamesAndTypes
          this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.featureGroupToAttachPt]);
        }));
        this.increaseGenome('feature_group', newGenomeIds);
        this.sequenceSource = 'feature_group';

        var path = lrec[this.featureGroupToAttachPt];
        when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
          var fileType = res.metadata.type;
          this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
        }));

      }
      // console.log(lrec);
    },

    addFeatureGroupAlphabetChange: function (feature_group) {
      var lrec = { 'user_genomes_featuregroup': feature_group };
      var newGenomeIds = [lrec[this.featureGroupToAttachPt]];
      var tr = this.genomeTable.insertRow(0);
      var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
      td.genomeRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + '</div>';
      domConstruct.create('td', { innerHTML: '' }, tr);
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
      if (this.addedGenomes < this.startingRows) {
        this.genomeTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        // console.log("Delete Row");
        domConstruct.destroy(tr);
        this.decreaseGenome('feature_group', newGenomeIds);
        if (this.addedGenomes < this.startingRows) {
          var ntr = this.genomeTable.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        handle.remove();
        // remove entry from this.fastaNamesAndTypes
        this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.featureGroupToAttachPt]);
      }));
      this.increaseGenome('feature_group', newGenomeIds);
      this.sequenceSource = 'feature_group';

      var path = lrec[this.featureGroupToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        var fileType = res.metadata.type;
        this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
      }));
    },

    // adding a genome group
    onAddGenomeGroup: function () {
      // console.log("this.genomeGroupToAttachPt = " + this.genomeGroupToAttachPt);
      // console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
      var lrec = {};
      this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
      var path = lrec[this.genomeGroupToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          if (res.data.id_list.genome_id) {
            // viral genome checks
            this.checkViralGenomes(res.data.id_list.genome_id, false, path);
          }
        }
      }));

      // console.log(lrec);
    },

    // TODO: there may be a limit to the number of genome_ids that can be passed into the query, check that
    checkViralGenomes: function (genome_id_list, rerun, filename) {
      // As far as I have seen Bacteria do not have a superkingdom field, only viruses
      var query = `in(genome_id,(${genome_id_list.toString()}))&select(genome_id,superkingdom,genome_length,contigs,segment,species,genome_name)&limit(${genome_id_list.length})`;
      console.log('query = ', query);
      DataAPI.queryGenomes(query).then(lang.hitch(this, function (res) {
        console.log('result = ', res);
        var all_valid = true;
        var errors = {};
        if (filename) {
          this.genomeGroupClassifications[filename] = ViralGenomeGroupClassifier.classifyGenomeItems(res && res.items ? res.items : []);
          this.syncGenomeGroupSelection(this.getGenomeGroupPaths(true));
          if (this.user_genomes_genomegroup && this.user_genomes_genomegroup.get('value') === filename) {
            this.updateGenomeGroupSummary(filename);
          }
        }
        res.items.forEach(lang.hitch(this, function (obj) {
          if (obj.superkingdom) {
            var duplicate_genome = this.checkDuplicate(obj.genome_id, 'user_genomes_genomegroup');
            if (duplicate_genome) {
              all_valid = false;
              if (!Object.keys(errors).includes('duplicate_error')) {
                errors['duplicate_error'] = 'Duplicate GenomeIds:<br> First occurence for genome_id: ' + obj.genome_id;
              }
            }
            if (obj.superkingdom != 'Viruses') {
              all_valid = false;
              if (!Object.keys(errors).includes('kingdom_error')) {
                errors['kingdom_error'] = 'Invalid Superkingdom: only virus genomes are permitted<br>First occurence for genome_id: ' + obj.genome_id;
              }
            }
            if (obj.genome_length > this.maxGenomeLength) {
              all_valid = false;
              if (!Object.keys(errors).includes('genomelength_error')) {
                errors['genomelength_error'] = 'Error: genome exceeds maximum length ' + this.maxGenomeLength.toString() + '<br>First occurence for genome_id: ' + obj.genome_id;
              }
            }
          } else { // TODO: don't think this is correct, add other criteria
            all_valid = false;
          }
        }));
        if (rerun) {
          this.addGenomeGroupToTableFormFill(all_valid, genome_id_list, errors, filename);
          // this.addGenomeGroupToTableAlphabetChanged(filename, genome_ids);
        } else {
          this.addGenomeGroupToTable(all_valid, genome_id_list, errors);
        }
      }));
    },

    addGenomeGroupToTableFormFill: function (all_valid, genome_id_list, errors, filename) {
      if (all_valid) {
        this.addGenomeGroupToTableAlphabetChanged(filename, genome_id_list);
      } else {
        var error_msg = 'This looks like an invalid genome group. The following errors were found:';
        Object.values(errors).forEach(lang.hitch(this, function (err) {
          error_msg = error_msg + '<br>- ' + err;
        }));
        this.genomegroup_message.innerHTML = error_msg;
        setTimeout(lang.hitch(this, function () {
          this.genomegroup_message.innerHTML = '';
        }), 5000);
      }
    },

    addGenomeGroupToTableAlphabetChanged: function (genome_group, genome_id_list) {
      var lrec = { 'user_genomes_genomegroup': genome_group };
      var count = this.addedGenomes + genome_id_list.length;
      if (count > this.maxGenomes) {
        var msg = 'Sorry, you can only add up to ' + this.maxGenomes + ' genomes';
        msg += ' and you are trying to select ' + count + '.';
        new Dialog({ title: 'Notice', content: msg }).show();
      }
      console.log("genome_id_list = ", genome_id_list);
      if (this.addedGenomes < this.maxGenomes
        && genome_id_list.length > 0
        && count <= this.maxGenomes) {
        var tr = this.genomeTable.insertRow(0);
        var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
        td.genomeRecord = lrec;
        td.genomeGroupCount = genome_id_list.length;
        td.innerHTML = "<div class='libraryrow'>" + this.buildGenomeGroupTableLabel(genome_group, genome_id_list.length) + '</div>';
        domConstruct.create('td', { innerHTML: '' }, tr);
        var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
        if (this.addedGenomes < this.startingRows) {
          this.genomeTable.deleteRow(-1);
        }
        var handle = on(td2, 'click', lang.hitch(this, function (evt) {
          // console.log("Delete Row");
          domConstruct.destroy(tr);
          this.decreaseGenome('genome_group', genome_id_list);
          if (this.addedGenomes < this.startingRows) {
            var ntr = this.genomeTable.insertRow(-1);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          }
          handle.remove();
          this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.genomeGroupToAttachPt]);
          this.syncGenomeGroupSelection(this.getGenomeGroupPaths(true));
          this.updateGenomeGroupSummary();
        }));
        this.increaseGenome('genome_group', genome_id_list);
        this.sequenceSource = 'genome_group';

        var path = lrec[this.genomeGroupToAttachPt];
        when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
          var fileType = res.metadata.type;
          this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType, 'genome_ids': genome_id_list });
        }));
      }
    },

    addGenomeGroupToTable: function (all_valid, genome_id_list, errors) {
      var lrec = {};
      var chkPassed = this.ingestAttachPoints(this.genomeGroupToAttachPt, lrec);
      console.log('all genomes valid = ', all_valid);
      console.log('chkPassed = ', chkPassed);
      if (all_valid) {
        // display a notice if adding new genome group exceeds maximum allowed number
        var count = this.addedGenomes + genome_id_list.length;
        if (count > this.maxGenomes) {
          var msg = 'Sorry, you can only add up to ' + this.maxGenomes + ' genomes';
          msg += ' and you are trying to select ' + count + '.';
          new Dialog({ title: 'Notice', content: msg }).show();
        }

        if (chkPassed && this.addedGenomes < this.maxGenomes
          && genome_id_list.length > 0
          && count <= this.maxGenomes) {
          var tr = this.genomeTable.insertRow(0);
          var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
          td.genomeRecord = lrec;
          td.genomeGroupCount = genome_id_list.length;
          td.innerHTML = "<div class='libraryrow'>" + this.buildGenomeGroupTableLabel(lrec[this.genomeGroupToAttachPt], genome_id_list.length) + '</div>';
          domConstruct.create('td', { innerHTML: '' }, tr);
          var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
          if (this.addedGenomes < this.startingRows) {
            this.genomeTable.deleteRow(-1);
          }
          var handle = on(td2, 'click', lang.hitch(this, function (evt) {
            // console.log("Delete Row");
            domConstruct.destroy(tr);
            this.decreaseGenome('genome_group', genome_id_list);
            if (this.addedGenomes < this.startingRows) {
              var ntr = this.genomeTable.insertRow(-1);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
              domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
            }
            handle.remove();
            // remove entry from this.fastaNamesAndTypes
            this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.genomeGroupToAttachPt]);
            this.syncGenomeGroupSelection(this.getGenomeGroupPaths(true));
            this.updateGenomeGroupSummary();
          }));
          this.increaseGenome('genome_group', genome_id_list);
          this.sequenceSource = 'genome_group';

          var path = lrec[this.genomeGroupToAttachPt];
          when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
            var fileType = res.metadata.type;
            //this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType, 'genome_ids': genome_id_list });
            this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
          }));
        }
      }
      else {
        var error_msg = 'This looks like an invalid genome group. The following errors were found:';
        Object.values(errors).forEach(lang.hitch(this, function (err) {
          error_msg = error_msg + '<br>- ' + err;
        }));
        this.genomegroup_message.innerHTML = error_msg;
        setTimeout(lang.hitch(this, function () {
          this.genomegroup_message.innerHTML = '';
        }), 5000);
      }
    },

    setTooltips: function () {
      new Tooltip({
        connectId: ['genomeGroup_tooltip'],
        label: 'Each GenomeGroup Member Must: <br>- Be a Virus <br>- Be less than ' + this.maxGenomeLength.toString() + ' BP in length '
      });
    },

    getValues: function () {
      var seqcomp_values = {};
      var values = this.inherited(arguments);
      var compGenomeList = query('.genomedata');
      var genomeIds = [];
      var userGenomes = [];
      var featureGroups = [];

      this.userGenomeList.forEach(lang.hitch(this, function (id) {
        genomeIds.push(id);
      }));

      compGenomeList.forEach(function (item) {
        if (item.genomeRecord.user_genomes_fasta) {
          userGenomes.push(item.genomeRecord.user_genomes_fasta);
        }
      });

      compGenomeList.forEach(function (item) {
        if (item.genomeRecord.user_genomes_featuregroup) {
          featureGroups.push(item.genomeRecord.user_genomes_featuregroup);
        }
      });

      // get metadata fields
      seqcomp_values.genome_metadata_fields = [];
      if (this.metadata_count > 0) {
        seqcomp_values.genome_metadata_fields = Object.keys(this.metadataDict);
      }

      seqcomp_values.alphabet = values.alphabet;
      seqcomp_values.tree_type = values.tree_type;
      seqcomp_values.recipe = values.recipe;
      seqcomp_values.substitution_model = values.substitution_model;
      seqcomp_values.trim_threshold = values.trim_threshold;
      seqcomp_values.gap_threshold = values.gap_threshold;
      seqcomp_values.sequences = this.fastaNamesAndTypes.map(function (item) {
        return {
          filename: item.filename,
          type: item.type
        };
      });
      if (this.fastaNamesAndTypes.some(function (item) { return item.type === 'genome_group'; })) {
        this.syncGenomeGroupSelection(this.getGenomeGroupPaths(false));
        seqcomp_values.genome_selection = {
          selected_segments: this.getSelectedGenomeGroupSegments(),
          concat_segments: this.getGenomeGroupConcatSegments()
        };
      }
      seqcomp_values = this.checkBaseParameters(values, seqcomp_values);

      this.resetSubmit();

      return seqcomp_values;
    },

    checkBaseParameters: function (values, seqcomp_values) {
      seqcomp_values.output_path = values.output_path;
      seqcomp_values.output_file = values.output_file;
      this.output_folder = values.output_path;
      this.output_name = values.output_file;
      return seqcomp_values;
    },

    intakeRerunForm: function () {
      // assuming only one key
      var service_fields = window.location.search.replace('?', '');
      var rerun_fields = service_fields.split('=');
      var rerun_key;
      if (rerun_fields.length > 1) {
        try {
          rerun_key = rerun_fields[1];
          var sessionStorage = window.sessionStorage;
          if (sessionStorage.hasOwnProperty(rerun_key)) {
            this.form_flag = true;
            var job_data = JSON.parse(sessionStorage.getItem(rerun_key));
            console.log(job_data);
            if (job_data.genome_selection) {
              this.genomeGroupSelectedSegments = (job_data.genome_selection.selected_segments || []).slice();
              this.genomeGroupRequestedSegments = this.genomeGroupSelectedSegments.slice();
              this.genomeGroupConcatSegments = !!job_data.genome_selection.concat_segments;
              this.genomeGroupSelectionInitialized = true;
            }
            var param_dict = { 'output_folder': 'output_path' };
            var service_specific = { 'gap_threshold': 'gap_threshold', 'trim_threshold': 'trim_threshold', 'substitution_model': 'substitution_model' };
            param_dict['service_specific'] = service_specific;
            // this.setAlphabetFormFill(job_data);
            this.setRecipeFormFill(job_data);
            // AppBase.prototype.intakeRerunFormBase.call(this, param_dict);
            this.addSequenceFilesFormFill(job_data);
            this.setParameters(job_data);
          }
        } catch (error) {
          console.log('Error during intakeRerunForm: ', error);
        } finally {
          sessionStorage.removeItem(rerun_key);
        }
      }
    },

    setParameters: function (job_data) {
      if (job_data['gap_threshold']) {
        this.gap_threshold.set('value', job_data['gap_threshold']);
      }
      if (job_data['trim_threshold']) {
        this.trim_threshold.set('value', job_data['trim_threshold']);
      }
      if (job_data['substitution_model']) {
        // model dropdown is reset without setTimeout, avoids but doesn't fix issue
        setTimeout(lang.hitch(this, function () {
          this.substitution_model.set('value', job_data['substitution_model']);
        }), 1);
      }
    },

    setAlphabetFormFill: function (job_data) {
      if (job_data['alphabet'] == 'DNA') {
        this.protein.set('checked', false);
        this.dna.set('checked', true);
      }
      else {
        this.dna.set('checked', false);
        this.protein.set('checked', true);
      }
      this.onAlphabetChanged();
    },

    setRecipeFormFill: function (job_data) {
      if (job_data['recipe'] == 'RAxML') {
        this.recipePhyML.set('checked', false);
        this.recipeFastTree.set('checked', false);
        this.recipeRAxML.set('checked', true);
      }
      else if (job_data['recipe'] == 'PhyML') {
        this.recipeRAxML.set('checked', false);
        this.recipeFastTree.set('checked', false);
        this.recipePhyML.set('checked', true);
      }
      else {
        this.recipeRAxML.set('checked', false);
        this.recipePhyML.set('checked', false);
        this.recipeFastTree.set('checked', true);
      }
    },

    addSequenceFilesFormFill: function (job_data) {
      var sequence_files = job_data['sequences'];
      var path_list = [];
      sequence_files.forEach(function (seq_file) {
        var path = seq_file['filename'];
        path_list.push(path);
      }, this);
      var _self = this;
      var data_list = [];
      when(WorkspaceManager.getObjects(path_list, true).then(lang.hitch(this, function (res) {
        for (var x = 0; x < path_list.length; x++) {
          var fileType = res[x].type;
          data_list.push({ 'filename': path_list[x], 'type': fileType });
        }
        _self.formFillPopulateTable(data_list);
      })));
    },

    // assumes dna/protein button is selected correctly
    formFillPopulateTable: function (data_list) {
      // do query for all genome groups to get number of genomes
      data_list.forEach(lang.hitch(this, function (obj) {
        if (obj.type === 'feature_group') {
          this.addFeatureGroupAlphabetChange(obj.filename);
        }
        else if (obj.type === 'genome_group') {
          var query = 'in(genome_id,GenomeGroup(' + encodeURIComponent(obj.filename) + '))';
          DataAPI.queryGenomes(query, { 'limit': 5000 }).then(lang.hitch(this, function (res) {
            var genome_ids = res.items.map(x => x.genome_id);
            var filename = obj.filename;
            this.checkViralGenomes(genome_ids, true, filename);
          }));
        }
        else if ((obj.type === 'aligned_protein_fasta') || (obj.type === 'aligned_dna_fasta')) {
          // user_genomes_fasta
          // aligned_protein_fasta, aligned_dna_fasta
          this.onAddFastaFormFill(obj.filename);
        }
        else {
          // user_genomes_unaligned_fasta
          // feature_dna_fasta, feature_protein_fasta
          this.onAddUnalignedFastaFormFill(obj.filename);
        }
      }));
    },

    onAddFastaFormFill: function (fasta) {
      var lrec = { 'user_genomes_fasta': fasta };
      var newGenomeIds = [lrec['user_genomes_fasta']];
      var tr = this.genomeTable.insertRow(0);
      var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
      td.genomeRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.makeFormFillName(fasta.split('/').reverse()[0]) + '</div>';
      domConstruct.create('td', { innerHTML: '' }, tr);
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
      if (this.addedGenomes < this.startingRows) {
        this.genomeTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        // console.log("Delete Row");
        domConstruct.destroy(tr);
        this.decreaseGenome('fasta', newGenomeIds);
        if (this.addedGenomes < this.startingRows) {
          var ntr = this.genomeTable.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        handle.remove();
        this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.fastaToAttachPt]);
      }));
      this.increaseGenome('fasta', newGenomeIds);
      this.sequenceSource = 'ws';

      var path = lrec[this.fastaToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        var fileType = res.metadata.type;
        this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
      }));
    },

    onAddUnalignedFastaFormFill: function (unaligned_fasta) {
      var lrec = { 'user_genomes_unaligned_fasta': unaligned_fasta };
      var newGenomeIds = [lrec['user_genomes_unaligned_fasta']];
      var tr = this.genomeTable.insertRow(0);
      var td = domConstruct.create('td', { 'class': 'textcol genomedata', innerHTML: '' }, tr);
      td.genomeRecord = lrec;
      td.innerHTML = "<div class='libraryrow'>" + this.makeFormFillName(unaligned_fasta.split('/').reverse()[0]) + '</div>';
      domConstruct.create('td', { innerHTML: '' }, tr);
      var td2 = domConstruct.create('td', { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
      if (this.addedGenomes < this.startingRows) {
        this.genomeTable.deleteRow(-1);
      }
      var handle = on(td2, 'click', lang.hitch(this, function (evt) {
        // console.log("Delete Row");
        domConstruct.destroy(tr);
        this.decreaseGenome('fasta', newGenomeIds);
        if (this.addedGenomes < this.startingRows) {
          var ntr = this.genomeTable.insertRow(-1);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
          domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
        }
        handle.remove();
        this.fastaNamesAndTypes = this.fastaNamesAndTypes.filter(obj => obj.filename !== lrec[this.unalignedFastaToAttachPt]);
      }));
      this.increaseGenome('fasta', newGenomeIds);
      this.sequenceSource = 'ws';

      var path = lrec[this.unalignedFastaToAttachPt];
      when(WorkspaceManager.getObject(path), lang.hitch(this, function (res) {
        var fileType = res.metadata.type;
        this.fastaNamesAndTypes.push({ 'filename': path, 'type': fileType });
      }));
    },

    makeFormFillName: function (name) {
      var display_name = name;
      var maxName = 36;
      if (name.length > maxName) {
        display_name = name.substr(0, (maxName / 2) - 2) + '...' + name.substr((name.length - (maxName / 2)) + 2);
      }
      return display_name;
    },

    resetSubmit: function () {
      this.fastaNamesAndTypes = [];
      this.resetGenomeGroupSelection();
      for (var x = this.genomeTable.rows.length - 1; x >= 0; x--) {
        this.genomeTable.deleteRow(x);
      }
      this.emptyTable(this.genomeTable, this.startingRows);
      this.numgenomes.startup();
    },

    reset: function () {
      this.inherited(arguments);
      this.fastaNamesAndTypes = [];
      this.resetGenomeGroupSelection();
      for (var x = this.genomeTable.rows.length - 1; x >= 0; x--) {
        this.genomeTable.deleteRow(x);
      }
      this.emptyTable(this.genomeTable, this.startingRows);
      this.numgenomes.startup();
    }

  });
});
