define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dojo/promise/all', 'dojo/when',
  'dojo/dom-class', './SummaryWidget',
  'dojo/request', 'dojo/_base/lang', 'dojox/charting/Chart2D', './PATRICTheme', 'dojox/charting/action2d/MoveSlice',
  'dojox/charting/action2d/Tooltip', 'dojo/dom-construct', '../util/PathJoin', 'dojo/fx/easing'

], function (
  declare, WidgetBase, on, All, when,
  domClass, SummaryWidget,
  xhr, lang, Chart2D, Theme, MoveSlice,
  ChartTooltip, domConstruct, PathJoin, easing
) {

  var labels = ['Hypothetical proteins', 'Proteins with functional assignments', 'Proteins with EC number assignments', 'Proteins with GO assignments', 'Proteins with Pathway assignments', 'Proteins with Subsystem assignments', 'Proteins with PATRIC genus-specific family (PLfam) assignments', 'Proteins with PATRIC cross-genus family (PGfam) assignments', 'Proteins with FIGfam assignments'];
  var shortLabels = ['Hypothetical', 'Functional', 'EC assigned', 'GO assigned', 'Pathway assigned', 'Subsystem assigned', 'PLfam assigned', 'PGfam assigned', 'FIGfam assigned'];
  var filters = ['eq(product,hypothetical+protein),eq(feature_type,CDS)', 'ne(product,hypothetical+protein),eq(feature_type,CDS)', 'eq(property,EC*)', 'eq(go,*)', 'eq(property,Pathway)', 'eq(property,Subsystem)', 'eq(plfam_id,PLF*)', 'eq(pgfam_id,PGF*)', 'eq(figfam_id,*)'];

  return declare([SummaryWidget], {
    dataModel: 'genome_feature',
    query: '',
    view: 'table',
    baseQuery: '&in(annotation,(PATRIC,RefSeq))&limit(1)&facet((field,annotation),(mincount,1))&json(nl,map)',
    columns: [{
      label: ' ',
      field: 'label'
    }, {
      label: 'PATRIC',
      field: 'PATRIC',
      renderCell: function (obj, val, node) {
        node.innerHTML = val ? ('<a href="#view_tab=features&filter=and(eq(annotation,PATRIC),' + obj.filter + ')" target="_blank">' + val + '</a>') : '0';
      }
    }, {
      label: 'RefSeq',
      field: 'RefSeq',
      renderCell: function (obj, val, node) {
        node.innerHTML = val ? ('<a href="#view_tab=features&filter=and(eq(annotation,RefSeq),' + obj.filter + ')" target="_blank">' + val + '</a>') : '0';
      }
    }],
    onSetQuery: function (attr, oldVal, query) {

      var url = PathJoin(this.apiServiceUrl, this.dataModel) + '/';

      // OPTIMIZED: Single API call using SOLR JSON facet API (replaces 9 separate calls)
      // The main query filters by genome_id and annotation
      // Each facet query inherits this base filter automatically
      var genomeId = this.query.match(/eq\(genome_id,([^)]+)\)/);
      var genomeFilter = genomeId ? 'genome_id:' + genomeId[1] : '*:*';

      var jsonFacet = JSON.stringify({
        hypothetical: {
          type: 'query',
          q: 'product:hypothetical+protein AND feature_type:CDS',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        },
        functional: {
          type: 'query',
          q: '(*:* NOT product:hypothetical+protein) AND feature_type:CDS',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        },
        ec_assigned: {
          type: 'query',
          q: 'property:EC*',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        },
        go_assigned: {
          type: 'query',
          q: 'go:*',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        },
        pathway_assigned: {
          type: 'query',
          q: 'property:Pathway',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        },
        subsystem_assigned: {
          type: 'query',
          q: 'property:Subsystem',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        },
        plfam_assigned: {
          type: 'query',
          q: 'plfam_id:PLF*',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        },
        pgfam_assigned: {
          type: 'query',
          q: 'pgfam_id:PGF*',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        },
        figfam_assigned: {
          type: 'query',
          q: 'figfam_id:*',
          facet: { by_annotation: { type: 'terms', field: 'annotation' } }
        }
      });

      // Main query filters by genome and annotation; facet queries inherit this
      var solrMainQuery = genomeFilter + ' AND annotation:(PATRIC OR RefSeq)';
      var solrData = 'q=' + encodeURIComponent(solrMainQuery) + '&rows=0&json.facet=' + encodeURIComponent(jsonFacet);

      return when(xhr.post(url, {
        handleAs: 'json',
        headers: {
          'accept': 'application/solr+json',
          'content-type': 'application/solrquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          'Authorization': (window.App.authorizationToken || '')
        },
        data: solrData
      }), lang.hitch(this, 'processData'));
    },
    processData: function (response) {
      // OPTIMIZED: Process SOLR JSON facet response
      var facetOrder = ['hypothetical', 'functional', 'ec_assigned', 'go_assigned',
                        'pathway_assigned', 'subsystem_assigned', 'plfam_assigned',
                        'pgfam_assigned', 'figfam_assigned'];

      var results = facetOrder.map(function(facetName) {
        var facetData = response.facets[facetName];
        var result = {};
        if (facetData && facetData.by_annotation && facetData.by_annotation.buckets) {
          facetData.by_annotation.buckets.forEach(function(bucket) {
            result[bucket.val] = bucket.count;
          });
        }
        return result;
      });

      this._tableData = results.map(function (row, idx) {
        row.label = labels[idx];
        row.filter = filters[idx];
        return row;
      });

      var data = { PATRIC: [], RefSeq: [] };
      results.forEach(function (row, idx) {
        data.PATRIC.push({ label: labels[idx], y: row.PATRIC || 0 });
        data.RefSeq.push({ label: labels[idx], y: row.RefSeq || 0 });
      });

      this.set('data', data);
    },

    render_chart: function () {

      if (!this.chart) {
        var chart = this.chart = new Chart2D(this.chartNode)
          .setTheme(Theme)
          .addPlot('default', {
            type: 'ClusteredBars',
            markers: true,
            gap: 2,
            // labels: true,
            minBarSize: 7,
            labelStyle: 'outside',
            labelOffset: 20,
            // labelFunc: function(o){
            //   return o.annotation;
            // },
            animate: { duration: 1000, easing: easing.linear }
          })
          .addAxis('x', {
            vertical: true,
            majorLabels: true,
            minorTicks: false,
            minorLabels: false,
            microTicks: false,
            labels: shortLabels.map(function (val, idx) { return { text: val, value: idx + 1 }; })
          })
          .addAxis('y', {
            minorTicks: false
          });

        new ChartTooltip(this.chart, 'default', {
          text: function (o) {
            var d = o.run.data[o.index];
            return '[' + o.run.name + '] ' + d.label + 's (' + d.y + ')';
          }
        });

        Object.keys(this.data).forEach(lang.hitch(this, function (key) {
          chart.addSeries(key, this.data[key]);
        }));

        chart.render();
      } else {

        Object.keys(this.data).forEach(lang.hitch(this, function (key) {
          this.chart.updateSeries(key, this.data[key]);
        }));
        this.chart.render();

      }
    },

    render_table: function () {
      this.inherited(arguments);

      this.grid.refresh();
      this.grid.renderArray(this._tableData);
    }
  });
});
