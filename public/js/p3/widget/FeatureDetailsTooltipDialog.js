define([
  'dojo/_base/declare', 'dojo/on', 'dojo/dom-construct',
  'dojo/_base/lang', 'dojo/mouse',
  'dijit/popup', 'dijit/TooltipDialog'
], function (
  declare, on, domConstruct,
  lang, Mouse,
  popup, TooltipDialog
) {

  return declare([TooltipDialog], {
    selection: null,
    label: '',
    selectionList: null,
    genome_id: null,

    featureDetailLabels: [
      { label: 'Pathways', link: 'overview' },
      { label: 'Virulence Factors', link: 'amr' },
      { label: 'Subsystems', link: 'phylogeny' },
      { label: 'Antimicrobial Resistance', link: 'browser' }
    ],

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

      var d = domConstruct.create('div', {}, dstContent);
      domConstruct.create('a', { 'class': 'navigationLinkOut', innerHTML: 'Pathways', href: '/view/PathwaySummary/?features=' + this.selectionList.join(',') }, d);
      var d = domConstruct.create('div', {}, dstContent);
      domConstruct.create('a', { 'class': 'navigationLinkOut', innerHTML: 'Subsystems', href: '/view/GenomeList/?in(genome_id,(' + this.genome_id + '))#view_tab=subsystems&filter=in(' + this.selectionList.join(',') + ')' }, d);
      var d = domConstruct.create('div', {}, dstContent);
      domConstruct.create('a', { 'class': 'navigationLinkOut', innerHTML: 'Virulence Factors', href: '/view/GenomeList/#view_tab=specialtyGenes&filter=and(eq(property,"Virulence%20Factor"),in(feature_id,(' + this.selectionList.join(',') + ')))' }, d);
      var d = domConstruct.create('div', {}, dstContent);
      domConstruct.create('a', { 'class': 'navigationLinkOut', innerHTML: 'Antimicrobial Resistance', href: '/view/GenomeList/#view_tab=amr&filter=in(' + this.selectionList.join(',') + ')' }, d);

      this.set('content', dstContent);

      this._started = true;
      this.set('label', 'Feature Details');
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
