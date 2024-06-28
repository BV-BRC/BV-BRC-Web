define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dojo/_base/lang', 'dojo/mouse',
  'dojo/topic', 'dojo/query', 'dijit/layout/ContentPane',
  'dijit/Dialog', 'dijit/popup', 'dijit/TooltipDialog',
  './AdvancedDownload', 'dojo/dom-class', 'dojo/when'
], function (
  declare, on, domConstruct,
  lang, Mouse,
  Topic, query, ContentPane,
  Dialog, popup, TooltipDialog,
  AdvancedDownload, domClass, when
) {

  return declare([TooltipDialog], {
    containerType: '',
    selection: null,
    grid: null,
    conf: null,

    _setSelectionAttr: function (val) {
      // console.log("CopyTooltipDialog._setSelectionAttr: ", val);
      this.selection = val;
    },
    timeout: function (val) {
      var _self = this;
      this._timer = setTimeout(function () {
        popup.close(_self);
      }, val || 2500);
    },

    onMouseEnter: function () {
      if (this._timer) {
        clearTimeout(this._timer);
      }

      this.inherited(arguments);
    },
    onMouseLeave: function () {
      popup.close(this);
    },

    // convert the selection into TSV format, skipping headers and columns as specified
    _totsv: function (selection, includeHeader, selectedOnly) {
      var out = [];

      // remove any undefined entries
      var clean_selection = [];
      selection.forEach(function (obj) {
        if (obj) {
          clean_selection.push(obj);
        }
      });

      // sort based on the columns defined elsewhere on the UI
      var columns = this.grid.columns;
      var key_list = Array.from(Object.keys(columns));

      // filter out blacklisted columns
      key_list = key_list.filter(function (i) {
        return ['Selection Checkboxes', 'public'].indexOf(i) < 0;
      });

      // filter out not selected columns
      if (selectedOnly) {
        key_list = key_list.filter(function (j) {
          return (typeof columns[j].hidden == 'undefined' || !columns[j].hidden);
        });
      }

      // console.log('[CopyTooltipDialog] columns: ', columns)
      // console.log('[CopyTooltipDialog] selection: ', selection)
      // console.log('[CopyTooltipDialog] key_list: ', key_list);

      // if we want the header, push it to the array
      if (includeHeader) {
        var header = [];
        key_list.forEach(function (key) {
          header.push(columns[key].label);
        });
        out.push(header.join('\t'));
      }

      // for each selected item, push its data to the result array
      clean_selection.forEach(function (obj) {
        var io = [];
        key_list.forEach(function (col_key) {
          var key = columns[col_key].field;
          if (obj[key] instanceof Array) {
            io.push(obj[key].join(';'));
          } else {
            io.push(obj[key]);
          }
        });
        out.push(io.join('\t'));
      });
      return out.join('\n');

    },

    copySelection: function (type, selection) {

      // format the text
      var includeHeader;
      var selectedOnly;
      // var pkOnly;
      switch (type) {
        case 'full_w_header':
          includeHeader = true;
          selectedOnly = false;
          break;
        case 'full_wo_header':
          includeHeader = false;
          selectedOnly = false;
          break;
        case 'selected_w_header':
          includeHeader = true;
          selectedOnly = true;
          break;
        case 'selected_wo_header':
          includeHeader = false;
          selectedOnly = true;
          break;
        default:
          includeHeader = true;
          selectedOnly = false;
          break;
      }

      // convert to tsv
      var copy_text = this._totsv(selection, includeHeader, selectedOnly);

      navigator.clipboard.writeText(copy_text);

      // close the popup; this gives a bit of a visual indicator it worked
      var _self = this;
      popup.close(_self);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      on(this.domNode, Mouse.enter, lang.hitch(this, 'onMouseEnter'));
      on(this.domNode, Mouse.leave, lang.hitch(this, 'onMouseLeave'));
      var _self = this;
      on(this.domNode, '.wsActionTooltip:click', function (evt) {
        // console.log("evt.target: ", evt.target, evt.target.attributes);
        var rel = evt.target.attributes.rel.value;
        _self.copySelection(rel, _self.selection);
      });

      var dstContent = domConstruct.create('div', {});
      this.labelNode = domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;' }, dstContent);
      this.selectedCount = domConstruct.create('div', {}, dstContent);
      var table = domConstruct.create('table', {}, dstContent);

      var tr = domConstruct.create('tr', {}, table);
      var tData = this.tableCopyNode = domConstruct.create('td', { style: 'vertical-align:top;' }, tr);
      // spacer
      domConstruct.create('td', { style: 'width:10px;' }, tr);
      this.otherCopyNode = domConstruct.create('td', { style: 'vertical-align:top;' }, tr);

      domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'full_w_header', innerHTML: 'All Columns (with headers)' }, tData);
      domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'full_wo_header', innerHTML: 'All Columns (without headers)' }, tData);
      domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'selected_w_header', innerHTML: 'Selected Columns (with headers)' }, tData);
      domConstruct.create('div', { 'class': 'wsActionTooltip', rel: 'selected_wo_header', innerHTML: 'Selected Columns (without headers)' }, tData);

      tr = domConstruct.create('tr', {}, table);
      domConstruct.create('td', { colspan: 3, style: 'text-align:right' }, tr);

      this.set('content', dstContent);

      this._started = true;
      this.set('label', this.label);
      this.set('selection', this.selection);

    },

    _setLabelAttr: function (val) {
      // console.log("CopyTooltipDialog._setLabelAttr: ", val);
      this.label = val;
      if (this._started) {
        this.labelNode.innerHTML = 'Copy selected ' + this.label + ' (' + (this.selection ? this.selection.length : '0') + ') as...';
      }
    },

    copyableConfig: {
      genome_data: {
        label: 'Genomes',
        dataType: 'genome',
        pk: 'genome_id',
        tableData: true,
        advanced: true
      },
      sequence_data: {
        label: 'Sequences',
        dataType: 'genome_sequence',
        pk: 'sequence_id',
        tableData: true,
        otherData: ['dna+fasta']
      },
      feature_data: {
        label: 'Features',
        dataType: 'genome_feature',
        pk: 'feature_id',
        tableData: true,
        otherData: ['dna+fasta', 'protein+fasta']
      },
      spgene_data: {
        dataType: 'sp_gene',
        field: 'feature_id',
        pk: 'id',
        label: 'Specialty Genes',
        tableData: true
      },
      spgene_ref_data: {
        dataType: 'sp_gene_ref',
        pk: 'id',
        label: 'Specialty VF Genes',
        tableData: true
      },
      pathway_data: {
        pk: 'pathway_id',
        dataType: 'pathway',
        label: 'Pathways',
        tableData: true
      },
      gene_expression_data: {
        dataType: 'transcriptomics_gene',
        pk: 'id',
        label: 'Gene Expression',
        tableData: true
      },
      transcriptomics_gene_data: {
        dataType: 'genome_feature',
        pk: 'feature_id',
        label: 'Features',
        tableData: true
      },
      transcriptomics_experiment_data: {
        dataType: 'transcriptomics_experiment',
        pk: 'eid',
        label: 'Experiments',
        tableData: true
      },
      transcriptomics_sample_data: {
        dataType: 'transcriptomics_sample',
        pk: 'pid',
        label: 'Comparisons',
        tableData: true
      },
      interaction_data: {
        dataType: 'ppi',
        pk: 'id',
        label: 'Interactions',
        tableData: true
      },
      genome_amr_data: {
        dataType: 'genome_amr',
        pk: 'id',
        label: 'AMR Phenotypes',
        tableData: true
      },
      'default': {
        label: 'Items',
        pk: 'id',
        tableData: true
      }
    },

    _setContainerTypeAttr: function (val) {
      // console.log("CopyTooltipDialog.setContainerType: ", val);

      this.containerType = val;
      this.conf = this.copyableConfig[val] || this.copyableConfig['default'];
      this.set('label', this.conf.label);

      if (!this._started) {
        return;
      }

      domConstruct.empty(this.otherCopyNode);

      if (this.conf.otherData) {
        this.conf.otherData.forEach(function (type) {
          domConstruct.create('div', {
            'class': 'wsActionTooltip',
            rel: type,
            innerHTML: null
          }, this.otherCopyNode);
        }, this);
      }

    }
  });

});
