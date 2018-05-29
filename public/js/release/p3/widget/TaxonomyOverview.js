require({cache:{
'url:p3/widget/templates/TaxonomyOverview.html':"<div>\n  <div class=\"column-sub\">\n    <div class=\"section\">\n      <div data-dojo-attach-point=\"taxonomySummaryNode\">\n        Loading Taxonomy Summary...\n      </div>\n    </div>\n\n    <div class=\"section\">\n      <h3 class=\"section-title close\" title=\"Select genomes of high quality sequences and annotations and/or used by researchers for clinical studies, experimental validation, and comparative analysis.\"><span class=\"wrap\">Reference/Representative Genomes</span></h3>\n      <div class=\"rgSummaryWidget\" data-dojo-attach-point=\"rgSummaryWidget\"\n        data-dojo-type=\"p3/widget/ReferenceGenomeSummary\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"column-prime\">\n    <div class=\"section hidden\">\n      <h3 class=\"section-title close\" title=\"Summary of genomes by available antimicrobial resistance phenotype data.\"><span class=\"wrap\">Genomes by Antimicrobial Resistance</span></h3>\n      <div class=\"apmSummaryWidget\" data-dojo-attach-point=\"apmSummaryWidget\"\n        data-dojo-type=\"p3/widget/AMRPanelMetaSummary\">\n      </div>\n    </div>\n\n    <div class=\"section\">\n      <h3 class=\"section-title close\" title=\"Summary of genomes by key metadata attributes.\"><span class=\"wrap\">Genomes by Metadata</span></h3>\n      <div class=\"gmSummaryWidget\" data-dojo-attach-point=\"gmSummaryWidget\"\n        data-dojo-type=\"p3/widget/GenomeMetaSummary\">\n      </div>\n    </div>\n  </div>\n\n  <div class=\"column-opt\">\n    <div class=\"section\">\n      <h3 class=\"section-title close2x\" title=\"Recent PubMed articles relevant to the current context.\"><span class=\"wrap\">Recent PubMed Articles</span></h3>\n      <div data-dojo-attach-point=\"pubmedSummaryNode\">\n        Loading...\n      </div>\n    </div>\n  </div>\n</div>\n"}});
define("p3/widget/TaxonomyOverview", [
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

      var token = '?action=centralauthtoken&format=json';
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
