define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/on', 'dojo/request',
  './SummaryWidget', '../util/PathJoin', './D3HorizontalBarChart'

], function (
  declare, lang,
  domClass, domConstruct, on, xhr,
  SummaryWidget, PathJoin, D3HorizontalBarChart
) {

  return declare([SummaryWidget], {
    dataModel: 'genome_feature',
    query: '',
    baseQuery: '&limit(1)&facet((field,genome_id),(mincount,1),(limit,-1))&json(nl,map)',
    columns: [
      { label: 'Taxon Level', field: 'label' },
      {
        label: 'Genes', field: 'count'
      }
    ],
    // TODO:
    // - make D3HorizonalBarChart modular and configurable
    // - make the facet field dynamics (phylum, class, order, family, genus, species)
    // - handle genome level profile
    //
    // onSetQuery: function(attr, oldVal, query){
    // // console.log("SummaryWidget Query: ", this.query + this.baseQuery);
    //   return xhr.post(PathJoin(this.apiServiceUrl, this.dataModel) + "/", {
    //     handleAs: "json",
    //     headers: this.headers,
    //     data: this.query + this.baseQuery
    //   }).then(lang.hitch(this, "processData"));
    // },
    processData: function (data) {

      if (!data || !data.facet_counts || !data.facet_counts.facet_fields.genome_id) {
        console.log('INVALID SUMMARY DATA', data);
        return;
      }

      var genomeFreqMap = data.facet_counts.facet_fields.genome_id;
      var genomeIds = Object.keys(genomeFreqMap);

      if (genomeIds.length > 1000) {
        this.set('data', []);
        this.loadingNode.innerHTML = 'Taxonomy Profile is supported up to 1000 genomes.';
        return;
      }

      xhr.post(PathJoin(this.apiServiceUrl, '/genome/') + '/', {
        handleAs: 'json',
        headers: {
          Accept: 'application/solr+json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: window.App.authorizationToken || ''
        },
        data: 'in(genome_id,(' + genomeIds.join(',') + '))&limit(1)&facet((pivot,(species,genome_id)),(mincount,1),(limit,-1))&json(nl,map)'
      }).then(lang.hitch(this, function (res) {

        if (res.length == 0) {
          return;
        }

        var facet = res.facet_counts.facet_pivot['species,genome_id'];
        // console.log("facet: ", facet);

        var data = [];
        var keyValueMap = {};

        facet.forEach(function (d) {
          var key = d.value;
          var count = 0;
          if (d.pivot) {
            d.pivot.forEach(function (g) {
              // console.log(genomeFreqMap[g.value], g.count);
              count += genomeFreqMap[g.value] * g.count;
            });
          }
          // console.log(key, count);
          keyValueMap[key] = count;
        });
        // console.log("keyValueMap: ", keyValueMap);

        Object.keys(keyValueMap).forEach(function (key) {
          data.push({
            label: key, count: keyValueMap[key]
          });
        });

        var filtered = data.sort(function (a, b) {
          return b.count - a.count;
        }).filter(function (d, i) {
          return i < 10;
        });

        // console.log("data: ", filtered);
        this.set('data', filtered);
      }));
    },

    postCreate: function () {
      this.inherited(arguments);

      on(window, 'resize', lang.hitch(this, 'resize'));
    },
    resize: function () {
      // console.log("resize is called in TaxonoyProfile");

      if (this.chart) {
        this.chart.resize();
      }
      this.inherited(arguments);
    },

    render_chart: function () {

      if (!this.chart) {
        this.chart = new D3HorizontalBarChart();
        this.chart.init(this.chartNode, 'txProfile');
        this.chart.render(this.data);
      } else {

        this.chart.update(this.data);
      }
    },

    render_table: function () {
      this.inherited(arguments);

      this.grid.refresh();
      this.grid.renderArray(this.data);
      this.grid.sort([{ attribute: 'count', descending: true }]);
    }
  });
});
