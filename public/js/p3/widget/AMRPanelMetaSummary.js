define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dijit/_WidgetBase',
  'dojo/on', 'dojo/dom-class',
  './SummaryWidget', './D3StackedBarChart'

], function (
  declare, lang, WidgetBase,
  on, domClass,
  SummaryWidget, D3StackedBarChart
) {

  var phenotypeDef = {
    Resistant: 0,
    Susceptible: 1,
    Intermediate: 2
  };

  var chartNavBarHtml = [
    "<span class='label'>Scale</span>",
    "<ul class='scale'>",
    "<li class='real active'>Counts</li>",
    "<li class='normalize'>Percent</li> ",
    '</ul>',
    "<span class='label'>Order by</span>",
    "<ul class='sort'>",
    "<li class='label active'>Name</li>",
    "<li class='value'>Count</li>",
    '</ul>'
  ].join('\n');

  return declare([SummaryWidget], {
    dataModel: 'genome_amr',
    query: '',
    baseQuery: '&in(resistant_phenotype,(Resistant,Susceptible,Intermediate))&limit(1)&facet((pivot,(antibiotic,resistant_phenotype,genome_id)),(mincount,1),(limit,-1))&json(nl,map)',
    columns: [{
      label: 'Antibiotic',
      field: 'antibiotic'
    }, {
      label: 'Susceptible',
      field: 'Susceptible'
    }, {
      label: 'Intermediate',
      field: 'Intermediate'
    }, {
      label: 'Resistant',
      field: 'Resistant'
    }],
    processData: function (data) {

      if (!data || !data.facet_counts || !data.facet_counts.facet_pivot || !data.facet_counts.facet_pivot['antibiotic,resistant_phenotype,genome_id']) {
        console.log('INVALID SUMMARY DATA', data);
        return;
      }

      // control based on data availability
      if (data.response.numFound === 0) {
        domClass.add(this.domNode.parentNode, 'hidden');
        return;
      }
      domClass.remove(this.domNode.parentNode, 'hidden');


      var antibiotic_data = data.facet_counts.facet_pivot['antibiotic,resistant_phenotype,genome_id'];

      var chartData = [];
      var tableData = [];

      var baseUrl = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
      var linkBase = (window.location.href).split(baseUrl)[1].replace(window.location.hash, '');

      antibiotic_data.forEach(function (d) {
        var antibiotic = d.value;
        if (d.pivot) {
          // process table data
          var item = { antibiotic: antibiotic };
          d.pivot.forEach(function (phenotype) {
            item[phenotype.value] = phenotype.count;
          });
          tableData.push(item);

          // process chart data
          var dist = [0, 0, 0];
          d.pivot.forEach(function (phenotype) {
            if (Object.prototype.hasOwnProperty.call(phenotypeDef, phenotype.value)) {
              dist[phenotypeDef[phenotype.value]] = phenotype.count;
            }
          });
          var total = dist.reduce(function (a, b) {
            return a + b;
          });

          var phenotypes = ['Resistant', 'Susceptible', 'Intermediate'];

          chartData.push({
            label: antibiotic,
            tooltip: function (d, idx) {

              return lang.replace('Antibiotic: {0}<br/>Phenotype: {1}<br/>Count: {2}', [d.label, phenotypes[idx], d.dist[idx]]);
            },
            link: function (d, idx) {
              return lang.replace(linkBase + '#view_tab=amr&filter=and(eq(antibiotic,{0}),eq(resistant_phenotype,{1}))', [antibiotic, phenotypes[idx]]);
            },
            total: total,
            dist: dist
          });
        }
      });
      // console.log(chartData, tableData);
      this._tableData = tableData;

      this.set('data', chartData);
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
        this.chart = new D3StackedBarChart();
        this.chart.init(this.chartNode, 'amr');

        var legend = Object.keys(phenotypeDef);
        this.chart.renderNav(chartNavBarHtml);
        this.chart.renderLegend('', legend);
        this.chart.render(this.data);

      } else {
        this.chart.update(this.data);
      }
    },

    render_table: function () {
      this.inherited(arguments);

      this.grid.refresh();
      this.grid.renderArray(this._tableData);
    }
  });
});