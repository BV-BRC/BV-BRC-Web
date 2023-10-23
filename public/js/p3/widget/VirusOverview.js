define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dojo/text!./templates/VirusOverview.html',
  'dojo/request', 'dojo/_base/lang', 'dojo/when', 'dojo/dom-construct',
  'p3/widget/VirusMetaSummary', '../util/generateLinkedInFeed',
  '../util/PathJoin', './DataItemFormatter', './ExternalItemFormatter'

], function (
  declare, WidgetBase, on, _WidgetsInTemplateMixin,
  domClass, Templated, Template,
  xhr, lang, when, domConstruct,
  VirusMetaSummary, generateLinkedInFeed,
  PathJoin, DataItemFormatter, ExternalItemFormatter
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

      if (state.taxon_id) {
        this.set('taxonomy', state.taxon_id);
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

    _setTaxonomyAttr: function (taxon_id) {
      xhr.get(PathJoin(this.apiServiceUrl, 'data/summary_by_taxon', taxon_id), {
        headers: {
          accept: 'application/json'
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (taxonomy) {
        this.createSummary(taxonomy);
      }));
    },

    createSummary: function (data) {
      domConstruct.empty(this.taxonomySummaryNode);
      domConstruct.place(DataItemFormatter(data, 'virus_data', {}), this.taxonomySummaryNode, 'first');
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      generateLinkedInFeed('VIRUS');
    }
  });
});
