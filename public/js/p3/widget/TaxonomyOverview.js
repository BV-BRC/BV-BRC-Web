define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dojo/text!./templates/TaxonomyOverview.html',
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

      if (state.taxonomy) {
        this.set('taxonomy', state.taxonomy);
      }

      // widgets called by genome ids
      var sumWidgets = ['apmSummaryWidget'];

      sumWidgets.forEach(function (w) {
        if (this[w]) {
          this[w].set('query', this.state.search);
        }
      }, this);

      // widgets called by taxon_id
      sumWidgets = ['rgSummaryWidget', 'gmSummaryWidget'];
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

    _setTaxonomyAttr: function (genome) {
      this.genome = genome;
      this.createSummary(genome);
      // this.getWikiDescription(genome);
    },

    createSummary: function (genome) {
      domConstruct.empty(this.taxonomySummaryNode);
      domConstruct.place(DataItemFormatter(genome, 'taxonomy_data', {}), this.taxonomySummaryNode, 'first');
      if (this.searchName != genome.taxon_name) {
        this.searchName = this.genome.taxon_name;
        domConstruct.empty(this.pubmedSummaryNode);
        domConstruct.place(ExternalItemFormatter(genome, 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
      }
    },

    getWikiDescription: function (genome) {

      var wikiApiUrl = 'https://en.wikipedia.org/w/api.php';

      // var token = '?action=centralauthtoken&format=json';
      var query = '?action=query&prop=extracts&exintro=&format=json&titles=';

      var origin = '&origin=' + window.location.origin;

      var taxonName = genome.taxon_name.split(' ').join('+');

      if (this.searchName != genome.taxon_name) {

        when(xhr.get(wikiApiUrl + query + taxonName + origin, {
          handleAs: 'json',
          headers: {
            'X-Requested-With': null,
            Accept: 'application/json'
          }
        }), function (response) {
          console.log('response: ', response);
        });
      }
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
    }
  });
});
