define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dojo/text!./templates/BacteriaOverview.html',
  'dojo/request', 'dojo/_base/lang', 'dojo/when',
  'dojox/charting/action2d/Tooltip', 'dojo/dom-construct', '../util/PathJoin', './GenomeFeatureSummary', './DataItemFormatter', './ExternalItemFormatter'

], function (
  declare, WidgetBase, on, _WidgetsInTemplateMixin,
  domClass, Templated, Template,
  xhr, lang, when,
  ChartTooltip, domConstruct, PathJoin, GenomeFeatureSummary, DataItemFormatter,
  ExternalItemFormatter
) {

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'TaxonomyOverview',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    genome: null,
    state: null,
    genome_ids: null,
    searchName: null,
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'user_guides/organisms_taxon/overview.html',

    _setStateAttr: function (state) {
      this._set('state', state);

      if (state.taxon_id) {
        this.set('taxonomy', state.taxon_id);
      }

      // widgets called by genome ids
      var sumWidgets = ['apmSummaryWidget'];

      sumWidgets.forEach(function (w) {
        if (this[w]) {
          this[w].set('query', this.state.search);
        }
      }, this);

      // widgets called by taxon_id
      sumWidgets = ['rgSummaryWidget', 'bmSummaryWidget'];
      // sumWidgets = [];

      var taxonQuery = 'eq(taxon_lineage_ids,' + state.taxon_id + ')';
      // check whether we have extra filter
      if (this.state.taxonomy && this.state.genome_ids
        && this.state.genome_ids.length !== 25000
        && this.state.taxonomy.genomes !== this.state.genome_ids.length) {
        taxonQuery += '&' + this.state.search;
      }
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
      domConstruct.place(DataItemFormatter(data, 'bacteria_data', {}), this.taxonomySummaryNode, 'first');
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
