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

      var defHypothetical = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&and(eq(product,hypothetical+protein),eq(feature_type,CDS))' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      var defFunctional = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&and(ne(product,hypothetical+protein),eq(feature_type,CDS))' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      var defECAssigned = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&eq(property,EC*)' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      var defGOAssigned = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&eq(go,*)' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      var defPathwayAssigned = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&eq(property,Pathway)' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      var defSubsystemAssigned = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&eq(property,Subsystem)' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      var defPLfamAssigned = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&eq(plfam_id,PLF*)' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      var defPGfamAssigned = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&eq(pgfam_id,PGF*)' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      var defFigfamAssigned = when(xhr.post(url, {
        handleAs: 'json',
        headers: this.headers,
        data: this.query + '&eq(figfam_id,*)' + this.baseQuery
      }), function (response) {
        return response.facet_counts.facet_fields.annotation;
      });

      return when(All([defHypothetical, defFunctional, defECAssigned, defGOAssigned, defPathwayAssigned, defSubsystemAssigned, defPLfamAssigned, defPGfamAssigned, defFigfamAssigned]), lang.hitch(this, 'processData'));
    },
    processData: function (results) {

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
