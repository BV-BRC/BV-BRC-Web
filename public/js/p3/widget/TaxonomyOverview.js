define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom-class', 'dijit/_TemplatedMixin', 'dojo/text!./templates/TaxonomyOverview.html',
  'dojo/request', 'dojo/_base/lang', 'dojo/when', 'dojo/dom-construct',
  'p3/widget/ReferenceGenomeSummary', 'p3/widget/AMRPanelMetaSummary', 'p3/widget/GenomeMetaSummary',
  '../util/PathJoin', './DataItemFormatter', './ExternalItemFormatter'

], function (
  declare, WidgetBase, on, _WidgetsInTemplateMixin,
  domClass, Templated, Template,
  xhr, lang, when, domConstruct,
  ReferenceGenomeSummary, AMRPanelMetaSummary, GenomeMetaSumary, // preload widgets
  PathJoin, DataItemFormatter, ExternalItemFormatter
) {

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'TaxonomyOverview',
    disabled: false,
    templateString: Template,
    state: null,
    searchName: null,
    docsServiceURL: window.App.docsServiceURL,
    tutorialLink: 'quick_references/organisms_taxon/overview.html',
    tooltip: 'The “Overview” tab provides a summary of available data, metadata, and list of reference genomes for current taxon level.',

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

      const taxonQuery = `eq(taxon_lineage_ids,${state.taxon_id})`;
      sumWidgets.forEach(function (w) {
        if (this[w]) {
          this[w].set('query', taxonQuery);
        }
      }, this);
    },

    _setTaxonomyAttr: function (taxon) {
      this.createSummary(taxon)
      this.createExternalLinks(taxon);
      this.createPubmedLinks(taxon);
    },

    createSummary: function (taxon) {
      domConstruct.empty(this.taxonomySummaryNode);
      domConstruct.place('<p>Loading...</p>', this.taxonomySummaryNode, 'first')

      xhr.get(PathJoin(window.App.dataAPI, 'data/summary_by_taxon', taxon.taxon_id), {
        headers: {
          accept: 'application/json'
        },
        handleAs: 'json'
      }).then(lang.hitch(this, function (summary) {
        domConstruct.empty(this.taxonomySummaryNode);
        const taxonSummary = lang.mixin(taxon, summary)
        domConstruct.place(DataItemFormatter(taxonSummary, 'taxonomy_overview_data', {}), this.taxonomySummaryNode, 'first');
      }))
    },
    createPubmedLinks: function (taxon) {
      if (this.searchName != taxon.taxon_name) {
        this.searchName = taxon.taxon_name;
        domConstruct.empty(this.pubmedSummaryNode);
        domConstruct.place(ExternalItemFormatter(taxon, 'pubmed_data', {}), this.pubmedSummaryNode, 'first');
      }
    },

    createExternalLinks: function (genome) {
      domConstruct.empty(this.externalLinkNode);

      // BEI Resources
      var linkBEI = 'https://www.beiresources.org/Catalog.aspx?f_instockflag=In+Stock%23~%23Temporarily+Out+of+Stock&q=' + genome.taxon_name;
      var string = domConstruct.create('a', {
        href: linkBEI,
        innerHTML: 'BEI Resources',
        target: '_blank'
      }, this.externalLinkNode);
      domConstruct.place('<br>', string, 'after');
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
    }
  });
});
