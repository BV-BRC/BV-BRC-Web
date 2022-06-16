define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on', 'dojo/_base/Deferred',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dijit/Tooltip',
  'dojo/_base/xhr', 'dojo/_base/lang', './PageGrid', './formatter', '../store/SubsystemsOverviewMemoryStore', 'dojo/request',
  'dojo/aspect', './GridSelector', 'dojo/when', 'd3/d3', 'dojo/Stateful', 'dojo/topic', '../util/PathJoin', 'dojo/promise/all',
  './DataVisualizationTheme', 'dojox/widget/Standby', './SubSystemsOverviewMemoryGrid'
], function (
  declare, BorderContainer, on, Deferred,
  domClass, ContentPane, domConstruct, Tooltip,
  xhr, lang, Grid, formatter, SubsystemsOverviewMemoryStore, request,
  aspect, selector, when, d3, Stateful, Topic, PathJoin, All, Theme, Standby, oldSubsystemMemoryGrid
) {
  return declare([Stateful, BorderContainer, oldSubsystemMemoryGrid], {

    constructor: function (options) {
      this.watch('state', lang.hitch(this, 'onSetState'));
      this.store = options.store;
    },

    onSetState: function (attr, oldState, state) {
      this.loadingMask.show();

      this.state = state;
      if (!this.store) {
        this.set('store', this.createStore());
      } else {
        this.store.set('state', lang.mixin({}, state));
      }

      var that = this;
      Deferred.when(this.store.query(), function (data) {
        if (!data) {
          return;
        }
        // debugger;
        // TODO: change implementation to not use id 'subsystempiechart'
        // if (oldState) {
        d3.select('#subsystemspiechart').selectAll('*').remove();
        // }
        that.drawSubsystemPieChartGraph(data);
        that.drawCountsLabel(data);
        that.loadingMask.hide();
      });
    },

    postCreate: function () {
      this.loadingMask = new Standby({
        target: this.id,
        image: '/public/js/p3/resources/images/spin.svg',
        color: '#efefef'
      });
      this.addChild(this.loadingMask);
      this.loadingMask.startup();
    },

    createStore: function () {
      console.log('create store');
      if (this.store) {
        return this.store;
      }
      else {
        return null;
      }
    },

    drawCountsLabel: function (data) {

      var width = $( window ).width() * 0.85;
      var height = $( window ).height() * 0.6;
      var radius = Math.min(width, height) / 2 - 50;

      var that = this;

      if (width < 800) {
        width = 800;
      }

      if (height < 450) {
        height = 450;
      }
      var legendTitleOffset = 100;
      var legendHorizontalOffset = (radius + 50) * 2 + 300;

      that.subsystemReferenceData = $.extend(true, [], data);

      // only render legend title once
      d3.select('#subsystemspiechart svg').append('text')
        .attr('x', legendHorizontalOffset)
        .attr('y', legendTitleOffset)
        .attr('text-anchor', 'top')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .text('Subsystem Counts');

      d3.select('#subsystemspiechart svg').append('text')
        .attr('x', legendHorizontalOffset + 135)
        .attr('y', legendTitleOffset)
        .attr('text-anchor', 'top')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .style('fill', '#76a72d')
        .text(' (Subsystems, ');

      d3.select('#subsystemspiechart svg').append('text')
        .attr('x', legendHorizontalOffset + 230)
        .attr('y', legendTitleOffset)
        .attr('text-anchor', 'top')
        .style('font-weight', 'bold')
        .style('font-size', '14px')
        .style('fill', '#ffcb00')
        .text('Genes)');
    }
  });
});
