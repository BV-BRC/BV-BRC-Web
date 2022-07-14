define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dojo/_base/lang', 'dojo/mouse',
  'dojo/topic', 'dojo/query', 'dijit/layout/ContentPane',
  'dijit/Dialog', 'dijit/popup', 'dijit/TooltipDialog',
  './AdvancedDownload', 'dojo/dom-class'
], function (
  declare, on, domConstruct,
  lang, Mouse,
  Topic, query, ContentPane,
  Dialog, popup, TooltipDialog,
  AdvancedDownload, domClass
) {

  return declare([TooltipDialog], {
    perspective: 'Genome',
    perspectiveUrl: '',
    selection: null,
    label: '',
    subsections: {
      Genome: [
        { label: 'Overview', link: 'overview' },
        { label: 'AMR Phenotypes', link: 'amr' },
        { label: 'Phylogeny', link: 'phylogeny' },
        { label: 'Genome Browser', link: 'browser' },
        { label: 'Circular Viewer', link: 'circular' },
        { label: 'Sequences', link: 'sequences' },
        { label: 'Features', link: 'features' },
        { label: 'Specialty Genes', link: 'specialtyGenes' },
        { label: 'Protein Families', link: 'proteinFamilies' },
        { label: 'Pathways', link: 'pathways' },
        { label: 'Transcriptomics', link: 'transcriptomics' },
        { label: 'Interactions', link: 'interactions' }
      ],
      GenomeList: [
        { label: 'Overview', link: 'overview' },
        { label: 'Genomes', link: 'genomes' },
        { label: 'Sequences', link: 'sequences' },
        { label: 'Features', link: 'features' },
        { label: 'Specialty Genes', link: 'specialtyGenes' },
        { label: 'Protein Families', link: 'proteinFamilies' },
        { label: 'Pathways', link: 'pathways' },
        { label: 'Transcriptomics', link: 'transcriptomics' }
      ],
      GenomeGroup: [
        { label: 'Overview', link: 'overview' },
        { label: 'Genomes', link: 'genomes' },
        { label: 'Sequences', link: 'sequences' },
        { label: 'Features', link: 'features' },
        { label: 'Specialty Genes', link: 'specialtyGenes' },
        { label: 'Protein Families', link: 'proteinFamilies' },
        { label: 'Pathways', link: 'pathways' },
        { label: 'Transcriptomics', link: 'transcriptomics' }
      ],
      Taxonomy: [
        { label: 'Overview', link: 'overview' },
        { label: 'Phylogeny', link: 'phylogeny' },
        { label: 'Taxonomy', link: 'taxontree' },
        { label: 'Genomes', link: 'genomes' },
        { label: 'Sequences', link: 'sequences' },
        { label: 'Features', link: 'features' },
        { label: 'Specialty Genes', link: 'specialtyGenes' },
        { label: 'Protein Families', link: 'proteinFamilies' },
        { label: 'Pathways', link: 'pathways' },
        { label: 'Transcriptomics', link: 'transcriptomics' }
      ],
      Feature: [
        { label: 'Overview', link: 'overview' },
        { label: 'Genome Browser', link: 'genomeBrowser' },
        { label: 'Compare Region Viewer', link: 'compareRegionViewer' },
        { label: 'Transcriptomics', link: 'transcriptomics' },
        { label: 'Correlated Genes', link: 'correlatedGenes' },
        { label: 'Interactions', link: 'interactions' }
      ],
      FeatureList: [
        { label: 'Overview', link: 'overview' },
        { label: 'Features', link: 'features' },
        { label: 'Compare regions', link: 'feature' }
      ]
    },

    _setSelectionAttr: function (val) {
      // console.log("DownloadTooltipDialog set selection: ", val);
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

    startup: function () {
      if (this._started) {
        return;
      }
      on(this.domNode, Mouse.enter, lang.hitch(this, 'onMouseEnter'));
      on(this.domNode, Mouse.leave, lang.hitch(this, 'onMouseLeave'));
      // var _self = this;
      on(this.domNode, '.wsActionTooltip:click', function (evt) {
        // console.log("evt.target: ", evt.target, evt.target.attributes);
        // var rel = evt.target.attributes.rel.value;

      });

      var dstContent = domConstruct.create('div', {});
      this.labelNode = domConstruct.create('div', { style: 'background:#09456f;color:#fff;margin:0px;margin-bottom:4px;padding:4px;text-align:center;' }, dstContent);
      this.selectedCount = domConstruct.create('div', {}, dstContent);


      var subs = this.subsections[this.perspective];

      subs.forEach(function (sub) {
        var d = domConstruct.create('div', {}, dstContent);
        domConstruct.create('a', { 'class': 'navigationLink', innerHTML: sub.label, href: this.perspectiveUrl + '#view_tab=' + sub.link }, d);
      }, this);


      this.set('content', dstContent);

      this._started = true;
      this.set('label', this.label || 'Switch to ' + this.perspective + ' View');
      this.set('selection', this.selection);

    },

    _setLabelAttr: function (val) {
      this.label = val;
      if (this._started) {
        this.labelNode.innerHTML = val;
      }
    }
  });

});
