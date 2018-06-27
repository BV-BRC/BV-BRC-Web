define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/layout/BorderContainer', 'dijit/layout/TabContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/RadioButton', 'dijit/form/Textarea', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select',
  './ActionBar', './ContainerActionBar',
  'dojox/charting/Chart2D', 'dojox/charting/themes/Distinctive', '../store/GeneExpressionChartMemoryStore',
  'dojo/aspect',  'dojo/_base/Deferred', 'dojo/fx/easing', 'dojo/when',  'dojox/charting/action2d/Highlight', 'dojox/charting/action2d/Tooltip'
], function (
  declare, lang, on, Topic, domConstruct,
  BorderContainer, TabContainer, StackController, ContentPane,
  RadioButton, TextArea, TextBox, Button, Select,
  ActionBar, ContainerActionBar,
  Chart2D, Theme, Store, aspect, Deferred, easing, when, Highlight, Tooltip
) {
  var tgState = {
    keyword: '',
    upFold: 0,
    downFold: 0,
    upZscore: 0,
    downZscore: 0
  };

  return declare([BorderContainer], {
    id: 'GEChartContainer',
    gutters: false,
    state: null,
    tgState: tgState,
    filter_type: '',
    apiServer: window.App.dataServiceURL,
    constructor: function () {
      var self = this;
      // console.log("GeneExpressionChartContainer Constructor: this", this);
      // console.log("GeneExpressionChartContainer Constructor: state", this.state);

      Topic.subscribe('GeneExpression', lang.hitch(self, function () {
        // console.log("GeneExpressionChartContainer subscribe GeneExpression:", arguments);
        var key = arguments[0],
          value = arguments[1];

        switch (key) {
          case 'updateTgState':
            self.tgState = value;
            tgState = value;
            self.store.reload(self.tgState);
            when(self.processData('log_ratio'), function (chartData) {
              console.log('GeneExpressionChartContainer updateTgState: chartData', chartData);
              if (chartData[0].length < 10) {
                self.lgchart.addAxis('x', {
                  title: 'Log Ratio',
                  titleOrientation: 'away',
                  majorLabels: true,
                  minorTicks: false,
                  minorLabels: false,
                  microTicks: false,
                  labels: chartData[0]
                });
              } else {
                self.lgchart.addAxis('x', {
                  title: 'Log Ratio',
                  titleOrientation: 'away',
                  labels: chartData[0]
                });
              }
              self.lgchart.updateSeries('Comparisons', chartData[1]);
              self.lgchart.render();
              // console.log("GeneExpressionChartContainer updateTgState reload store:", self.store.data);
            });

            // for z_score
            when(self.processData('z_score'), function (chartData) {
              console.log('GeneExpressionChartContainer updateTgState: chartData', chartData);
              if (chartData[0].length < 10) {
                self.zchart.addAxis('x', {
                  title: 'Z-score',
                  titleOrientation: 'away',
                  majorLabels: true,
                  minorTicks: false,
                  minorLabels: false,
                  microTicks: false,
                  labels: chartData[0]
                });
              } else {
                self.zchart.addAxis('x', {
                  title: 'Z-score',
                  titleOrientation: 'away',
                  labels: chartData[0]
                });
              }
              self.zchart.updateSeries('Comparisons', chartData[1]);
              self.zchart.render();
              // console.log("GeneExpressionChartContainer updateTgState reload store:", self.store.data);
            });
            break;
          default:
            break;
        }
      }));
    },
    onSetState: function (attr, oldVal, state) {
      // console.log("GeneExpressionChartContainer onSetState set state: ", state);
      this._set('state', state);
    },

    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state) {
        return;
      }

      this._set('state', state);
      // console.log("In GeneExpressionChartContainer _setStateAttr: state", state);
      if (!this.store) {
        this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state, 'log_ratio'));
      } else {
        this.store.set('state', state);

        this.refresh();
      }

      // console.log("GeneExpressionChartContainer this._set: ", this.state);
    },

    startup: function () {
      // console.log("GeneExpressionGridContainer startup()");
      if (this._started) { return; }
      this.inherited(arguments);
      var self = this;
      this._set('state', this.get('state'));
      console.log('GeneExpressionChartContainer startup(), tgState', this.tgState);

      var chartTabContainer1 = new TabContainer({
        region: 'center', style: 'height: 300px; width: 500px; ', doLayout: false, id: this.id + '_chartTabContainer1'
      });
      var cp1 = new ContentPane({
        title: 'Log Ratio',
        style: 'height:300px; width: 500px;'
      });

      var cp2 = new ContentPane({
        title: 'Z-score',
        style: 'height:300px; width: 500px;'
      });

      chartTabContainer1.addChild(cp1);
      chartTabContainer1.addChild(cp2);
      this.addChild(chartTabContainer1);

      // console.log("###Before GeneExpressionChartContainer startup() Create Store: store=", this.store);

      aspect.before(this, 'renderArray', function (results) {
        console.log('GeneExpressionChartContainer aspect.before: results=', results);
        Deferred.when(results.total, function (x) {
          this.set('totalRows', x);
        });
      });

      this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, this.state, 'log_ratio'));

      // console.log("###After GeneExpressionChartContainer startup() Create Store: store=", this.store);
      // console.log("###After GeneExpressionChartContainer startup() Create Store: store.data=", this.store.data);

      // chart for log_ratio
      this.lgchart = new Chart2D(cp1.domNode);
      // console.log("GeneExpressionChartContainer after chart = new Chart2D, cp1.domNode", cp1.domNode);
      this.lgchart.setTheme(Theme);

      // Add the only/default plot
      this.lgchart.addPlot('default', {
        type: 'Columns',
        markers: true,
        gap: 5,
        labels: true,
        labelStyle: 'outside',
        animate: { duration: 1000, easing: easing.linear }
      });

      new Highlight(this.lgchart, 'default');
      new Tooltip(this.lgchart, 'default');

      when(this.processData('log_ratio'), function (chartData) {
        console.log('ChartData: ', chartData);
        // Add axes
        if (chartData[0].length < 10) {
          self.lgchart.addAxis('x', {
            title: 'Log Ratio',
            titleOrientation: 'away',
            majorLabels: true,
            minorTicks: false,
            minorLabels: false,
            microTicks: false,
            labels: chartData[0]
          });
        } else {
          self.lgchart.addAxis('x', {
            title: 'Log Ratio',
            titleOrientation: 'away',
            labels: chartData[0]
          });
        }
        self.lgchart.addAxis('y', {
          title: 'Comparisons', min: 0, vertical: true, fixLower: 'major', fixUpper: 'major'
        });

        self.lgchart.addSeries('Comparisons', chartData[1]);
        self.lgchart.render();
        // console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData);
      });

      // chart for z_score
      this.zchart = new Chart2D(cp2.domNode);
      console.log('GeneExpressionChartContainer after chart = new Chart2D');
      this.zchart.setTheme(Theme);

      // Add the only/default plot
      this.zchart.addPlot('default', {
        type: 'Columns',
        markers: true,
        gap: 5,
        labels: true,
        labelStyle: 'outside',
        animate: { duration: 1000, easing: easing.linear }
      });

      new Highlight(this.zchart, 'default');
      new Tooltip(this.zchart, 'default');

      when(this.processData('z_score'), function (chartData) {
        console.log('ChartData: ', chartData);
        // Add axes
        if (chartData[0].length < 10) {
          self.zchart.addAxis('x', {
            title: 'Z-score',
            titleOrientation: 'away',
            majorLabels: true,
            minorTicks: false,
            minorLabels: false,
            microTicks: false,
            labels: chartData[0]
          });
        } else {
          self.zchart.addAxis('x', {
            title: 'Z-score',
            titleOrientation: 'away',
            labels: chartData[0]
          });
        }
        self.zchart.addAxis('y', {
          title: 'Comparisons', min: 0, vertical: true, fixLower: 'major', fixUpper: 'major'
        });

        self.zchart.addSeries('Comparisons', chartData[1]);
        self.zchart.render();
        // console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData);
      });

      this.watch('state', lang.hitch(this, 'onSetState'));
      this.inherited(arguments);
      this._started = true;
      // console.log("new GeneExpressionGridContainer arguments: ", arguments);
    },


    postCreate: function () {
      this.inherited(arguments);
    },

    createStore: function (server, token, state, filter_type) {
      console.log('###GeneExpressionChartContainer Create Store: state=', this.state);
      var store = new Store({
        token: token,
        apiServer: this.apiServer || window.App.dataServiceURL,
        state: this.state || state,
        filter_type: filter_type
      });
      // store.watch('refresh', lang.hitch(this, "refresh"));
      this.watch('state', lang.hitch(this, 'onSetState'));

      console.log('Create Store: store=', store);

      return store;
    },

    processData: function (filter_type) {
      console.log('GeneExpressionChartContainer processData: this.store ', this.store);
      return when(this.store.query({}), function (data) {
        console.log('GeneExpressionChartContainer processData: filter_type, data ', filter_type, data);
        if (!data) {
          console.log('INVALID Chart DATA', data);
          return;
        }

        var myData = [];

        if (filter_type === 'z_score') {
          myData = data[1];
          // console.log("GeneExpressionChartContainer processData: z_score, myData ", filter_type, myData);
        }
        else {
          myData = data[0];
          // console.log("GeneExpressionChartContainer processData: log_ratio, myData ", filter_type, myData);
        }
        // console.log("GeneExpressionChartContainer processData: filter_type, myData ", filter_type, myData);

        if (!myData) {
          console.log('INVALID Chart DATA', data);
          return;
        }

        var xLabel = [];
        var yData = [];
        var chartData = {};
        var i = 0;
        for (i == 0; i < myData.length; i++) {
          xLabel.push({ text: myData[i].category, value: i + 1 });
          yData.push(myData[i].count);
        }

        chartData[0] = xLabel;
        // chartData[1]=yData;
        chartData[1] = yData.map(function (val) { return { y: val, text: val.toFixed(0) }; });
        // console.log('GeneExpressionChartContainer processData: yData, xLabel, chartData[1]', yData, xLabel, chartData[1]);
        return chartData;
      });
    }
  });
});
