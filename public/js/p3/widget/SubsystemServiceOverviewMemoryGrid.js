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
    }
  });
});
