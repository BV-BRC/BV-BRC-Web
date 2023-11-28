define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dojo/text!./templates/VirusOverview.html',
  'dojo/request', 'dojo/_base/lang', 'dojo/when', 'dojo/dom-construct',
  'p3/widget/VirusMetaSummary', '../util/PathJoin', './DataItemFormatter', './ExternalItemFormatter'

], function (
  declare, WidgetBase, on, _WidgetsInTemplateMixin,
  domClass, Templated, Template,
  xhr, lang, when, domConstruct,
  VirusMetaSummary, PathJoin, DataItemFormatter, ExternalItemFormatter
) {

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'TaxonomyOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    state: null,
    searchName: null,
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'user_guides/organisms_taxon/overview.html',

    _setStateAttr: function (state) {
      this._set('state', state);

      if (state.taxonomy) {
        this.set('taxonomy', state.taxonomy);
      }

      // widgets called by taxon_id
      const sumWidgets = ['vmSummaryWidget'];

      const taxonQuery = `eq(taxon_lineage_ids,${state.taxon_id})`;
      sumWidgets.forEach(function (w) {
        if (this[w]) {
          this[w].set('query', taxonQuery);
        }
      }, this);
    },

    _setTaxonomyAttr: function (taxon) {
      xhr.get(PathJoin(this.apiServiceUrl, 'data/summary_by_taxon', taxon.taxon_id), {
        headers: {
          accept: 'application/json'
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (taxonomy) {
        this.createSummary(taxonomy);
      }));
      this.createExternalLinks(taxon);
      this.createPubmedLinks(taxon);
    },

    createSummary: function (data) {
      domConstruct.empty(this.taxonomySummaryNode);
      domConstruct.place(DataItemFormatter(data, 'virus_data', {}), this.taxonomySummaryNode, 'first');
    },

    createExternalLinks: function (taxon) {
      domConstruct.empty(this.externalLinkNode);

      // BEI Resources
      var linkBEI = 'https://www.beiresources.org/Catalog.aspx?f_instockflag=In+Stock%23~%23Temporarily+Out+of+Stock&q=' + taxon.taxon_name;
      var string = domConstruct.create('a', {
        href: linkBEI,
        innerHTML: 'BEI Resources',
        target: '_blank'
      }, this.externalLinkNode);
      domConstruct.place('<br>', string, 'after');
    },

    createPubmedLinks: function (taxon) {
      if (this.searchName != taxon.taxon_name) {
        this.searchName = taxon.taxon_name;
        domConstruct.empty(this.pubmedSummaryNode);
        domConstruct.place(ExternalItemFormatter(taxon, 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
      }
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);
    }
  });
});
