define([
  'dojo/_base/declare', 'dojo/_base/lang', 'dojo/on', 'dojo/topic', 'dojo/dom-construct',
  'dijit/layout/BorderContainer', 'dijit/layout/TabContainer', 'dijit/layout/TabController', 'dijit/layout/ContentPane',
  'dijit/form/RadioButton', 'dijit/form/Textarea', 'dijit/form/TextBox', 'dijit/form/Button', 'dijit/form/Select',
  './ActionBar', './ContainerActionBar',
  'dojox/charting/Chart2D', 'dojox/charting/themes/WatersEdge', 'dojox/charting/themes/Distinctive', '../store/GeneExpressionMetadataChartMemoryStore',
  'dojo/aspect',  'dojo/_base/Deferred', 'dojo/fx/easing', 'dojo/when', 'dojox/charting/action2d/MoveSlice', 'dojox/charting/action2d/Highlight',
  'dojox/charting/action2d/Tooltip', 'dojox/charting/plot2d/Pie', 'dojo/dom-style'
], function (
  declare, lang, on, Topic, domConstruct,
  BorderContainer, TabContainer, StackController, ContentPane,
  RadioButton, TextArea, TextBox, Button, Select,
  ActionBar, ContainerActionBar,
  Chart2D, Theme, Distinctive, Store, aspect, Deferred, easing, when, MoveSlice, Highlight,
  Tooltip, Pie, domStyle
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
      // console.log("GeneExpressionMetadataChartContainer Constructor: this", this);
      // console.log("GeneExpressionMetadataChartContainer Constructor: state", this.state);

      Topic.subscribe('GeneExpression', lang.hitch(self, function () {
        // console.log("GeneExpressionMetadataChartContainer subscribe GeneExpression:", arguments);
        var key = arguments[0],
          value = arguments[1];

        if (key === 'updateTgState') {
          self.tgState = value;
          self.store.reload(self.tgState);
          tgState = value;
          // console.log("GeneExpressionMetadataChartContainer Constructor: key=, tgState=", key, self.tgState);

          // for strain
          when(self.processData('strain'), function (chartData) {
            if (self.pschart) {
              self.pschart.updateSeries('Strains', chartData[2]);
              self.pschart.render();
            }
            if (self.bschart) {
              self.bschart.addAxis('x', {
                vertical: true,
                majorLabels: true,
                minorTicks: false,
                minorLabels: false,
                microTicks: false,
                labels: chartData[0]
              });
              self.bschart.addAxis('y', {
                title: 'Comparisons', titleOrientation: 'away', min: 0, fixLower: 'major', fixUpper: 'major'
              });
              self.bschart.updateSeries('TopStrains', chartData[1]);
              self.bschart.render();
            }
          });
          // for mutant
          when(self.processData('mutant'), function (chartData) {
            if (self.pmchart) {
              self.pmchart.updateSeries('Mutants', chartData[2]);
              self.pmchart.render();
            }
            if (self.bmchart) {
              self.bmchart.addAxis('x', {
                vertical: true,
                majorLabels: true,
                minorTicks: false,
                minorLabels: false,
                microTicks: false,
                labels: chartData[0]
              });
              self.bmchart.addAxis('y', {
                title: 'Comparisons', titleOrientation: 'away', min: 0, fixLower: 'major', fixUpper: 'major'
              });
              self.bmchart.updateSeries('TopMutants', chartData[1]);
              self.bmchart.render();
            }
          });
          // for condition
          when(self.processData('condition'), function (chartData) {
            if (self.pcchart) {
              self.pcchart.updateSeries('Conditions', chartData[2]);
              self.pcchart.render();
            }
            if (self.bcchart) {
              self.bcchart.addAxis('x', {
                vertical: true,
                majorLabels: true,
                minorTicks: false,
                minorLabels: false,
                microTicks: false,
                labels: chartData[0]
              });
              self.bcchart.addAxis('y', {
                title: 'Comparisons', titleOrientation: 'away', min: 0, fixLower: 'major', fixUpper: 'major'
              });
              self.bcchart.updateSeries('TopConditionss', chartData[1]);
              self.bcchart.render();
            }
          });
        }
      }));
    },
    onSetState: function (attr, oldVal, state) {
      // console.log("GeneExpressionMetadataChartContainer onSetState set state: ", state);
      this._set('state', state);
    },

    _setStateAttr: function (state) {
      this.inherited(arguments);
      if (!state) {
        return;
      }

      this._set('state', state);
      // console.log("In GeneExpressionMetadataChartContainer _setStateAttr: state", state);
      if (!this.store) {
        this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state, 'strain'));
      } else {
        this.store.set('state', state);

        this.refresh();
      }
      // console.log("GeneExpressionMetadataChartContainer this._set: ", this.state);
    },

    startup: function () {
      // console.log("GeneExpressionGridContainer startup()");
      if (this._started) { return; }
      this.inherited(arguments);
      var self = this;
      this._set('state', this.get('state'));
      // console.log("GeneExpressionMetadataChartContainer startup(), tgState", this.tgState);

      var chartTabContainer1 = new TabContainer({
        region: 'center', style: 'height: 300px; width: 500px; ', doLayout: false, id: this.id + '_chartTabContainer1'
      });
      this.cp1 = new ContentPane({
        title: 'Strain',
        style: 'height: 300px; width: 400px;'
      });

      this.cp2 = new ContentPane({
        title: 'Gene Modification',
        style: 'height: 300px; width: 400px;'
      });

      this.cp3 = new ContentPane({
        title: 'Experimental Condition',
        style: 'height: 300px; width: 400px;'
      });

      var show_all_strain = new Button({
        label: 'Show All',
        iconClass: 'fa icon-pie-chart fa-2x',
        style: 'text-align:center; position:absolute; top:10px; left:440px; float: right',
        showLabel: false,
        onClick: lang.hitch(this, function () {
          if (self.bschart) {
            // console.log("before this.bschart.destroy() called", self.bschart);
            self.bschart.destroy();
            delete self.bschart;
            // console.log("this.bschart.destroy() called", self.bschart);
            when(self.store.query({}), function (data) {
              self.showStrainPieChart();
            });
          }
        })
      });
      domStyle.set(show_all_strain.domNode, { width: '36px' });
      domStyle.set(show_all_strain.domNode.firstChild, 'display', 'block');

      domConstruct.place(show_all_strain.domNode, this.cp1.containerNode, 'last');

      var show_top_strain = new Button({
        label: 'Show Top 5',
        iconClass: 'fa icon-bar-chart fa-2x',
        style: 'text-align:center; position:absolute; top:50px; left:440px; float: right',
        showLabel: false,
        onClick: lang.hitch(this, function () {
          if (self.pschart) {
            self.pschart.destroy();
            delete self.pschart;
            when(self.store.query({}), function (data) {
              self.showStrainBarChart();
            });
          }
        })
      });
      domStyle.set(show_top_strain.domNode, { width: '36px' });
      domStyle.set(show_top_strain.domNode.firstChild, 'display', 'block');

      domConstruct.place(show_top_strain.domNode, this.cp1.containerNode, 'last');

      var show_all_mutant = new Button({
        label: 'Show All',
        iconClass: 'fa icon-pie-chart fa-2x',
        style: 'text-align:center; position:absolute; top:10px; left:440px; float: right',
        showLabel: false,
        onClick: lang.hitch(this, function () {
          if (self.bmchart) {
            self.bmchart.destroy();
            delete self.bmchart;
            when(self.store.query({}), function (data) {
              self.showMutantPieChart();
            });
          }
        })
      });
      domStyle.set(show_all_mutant.domNode, { width: '36px' });
      domStyle.set(show_all_mutant.domNode.firstChild, 'display', 'block');

      domConstruct.place(show_all_mutant.domNode, this.cp2.containerNode, 'last');

      var show_top_mutant = new Button({
        label: 'Show Top 5',
        iconClass: 'fa icon-bar-chart fa-2x',
        style: 'text-align:center; position:absolute; top:50px; left:440px; float: right',
        showLabel: false,
        onClick: lang.hitch(this, function () {
          if (self.pmchart) {
            self.pmchart.destroy();
            delete self.pmchart;
            when(self.store.query({}), function (data) {
              self.showMutantBarChart();
            });
          }
        })
      });
      domStyle.set(show_top_mutant.domNode, { width: '36px' });
      domStyle.set(show_top_mutant.domNode.firstChild, 'display', 'block');

      domConstruct.place(show_top_mutant.domNode, this.cp2.containerNode, 'last');

      var show_all_condition = new Button({
        label: 'Show All',
        iconClass: 'fa icon-pie-chart fa-2x',
        style: 'text-align:center; position:absolute; top:10px; left:440px; float: right',
        showLabel: false,
        onClick: lang.hitch(this, function () {
          if (self.bcchart) {
            self.bcchart.destroy();
            delete self.bcchart;
            when(self.store.query({}), function (data) {
              self.showConditionPieChart();
            });
          }
        })
      });
      domStyle.set(show_all_condition.domNode, { width: '36px' });
      domStyle.set(show_all_condition.domNode.firstChild, 'display', 'block');

      domConstruct.place(show_all_condition.domNode, this.cp3.containerNode, 'last');

      var show_top_condition = new Button({
        label: 'Show Top 5',
        iconClass: 'fa icon-bar-chart fa-2x',
        style: 'text-align:center; position:absolute; top:50px; left:440px; float: right',
        showLabel: false,
        onClick: lang.hitch(this, function () {
          if (self.pcchart) {
            self.pcchart.destroy();
            delete self.pcchart;
            when(self.store.query({}), function (data) {
              self.showConditionBarChart();
            });
          }
        })
      });
      domStyle.set(show_top_condition.domNode, { width: '36px' });
      domStyle.set(show_top_condition.domNode.firstChild, 'display', 'block');

      domConstruct.place(show_top_condition.domNode, this.cp3.containerNode, 'last');

      chartTabContainer1.addChild(this.cp1);
      chartTabContainer1.addChild(this.cp2);
      chartTabContainer1.addChild(this.cp3);
      this.addChild(chartTabContainer1);

      // console.log("###Before GeneExpressionMetadataChartContainer startup() Create Store: store=", this.store);

      aspect.before(this, 'renderArray', function (results) {
        // console.log("GeneExpressionMetadataChartContainer aspect.before: results=", results);
        Deferred.when(results.total, function (x) {
          this.set('totalRows', x);
        });
      });

      this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, this.state, 'strain'));

      // console.log("###After GeneExpressionChartContainer startup() Create Store: store=", this.store);
      // console.log("###After GeneExpressionChartContainer startup() Create Store: store.data=", this.store.data);


      // Donut chart
      this.Donut = declare(Pie, {
        render: function (dim, offsets) {
          // Call the Pie's render method
          this.inherited(arguments);

          // Draw a white circle in the middle
          var rx = (dim.width - offsets.l - offsets.r) / 2;
          var ry = (dim.height - offsets.t - offsets.b) / 2;
          // var r = Math.min(rx, ry) / 2;
          var circle = {
            cx: offsets.l + rx,
            cy: offsets.t + ry,
            r: '20px'
          };
          var s = this.group;

          s.createCircle(circle).setFill('#fff').setStroke('#fff');
        }
      });

      // draw pie chart
      // pie chart for strains
      var pschartNode = domConstruct.create('div', {}); domConstruct.place(pschartNode, this.cp1.containerNode, 'first');
      this.pschart = new Chart2D(pschartNode);
      this.pschart.addPlot('default', {
        type: this.Donut,
        radius: 100,
        // labelOffset: -10,
        stroke: 'black',
        // labelWiring: "cccc",
        labelStyle: 'columns'
      }).setTheme(Distinctive);

      new MoveSlice(this.pschart, 'default');
      new Highlight(this.pschart, 'default');
      new Tooltip(this.pschart, 'default');

      when(this.processData('strain'), function (chartData) {
        // console.log("ChartData: ", chartData);
        self.pschart.addSeries('Strains', chartData[2]);
        self.pschart.render();
        // console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData);
      });

      // pie chart for mutant
      var pmchartNode = domConstruct.create('div', {}); domConstruct.place(pmchartNode, this.cp2.containerNode, 'first');
      this.pmchart = new Chart2D(pmchartNode);
      this.pmchart.addPlot('default', {
        type: this.Donut,
        radius: 100,
        // labelOffset: -10,
        stroke: 'black',
        // labelWiring: "cccc",
        labelStyle: 'columns'
      }).setTheme(Distinctive);

      new MoveSlice(this.pmchart, 'default');
      new Highlight(this.pmchart, 'default');
      new Tooltip(this.pmchart, 'default');

      when(this.processData('mutant'), function (chartData) {
        // console.log("ChartData: ", chartData);
        self.pmchart.addSeries('Mutants', chartData[2]);
        self.pmchart.render();
        // console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData);
      });

      // pie chart for condition
      var pcchartNode = domConstruct.create('div', {}); domConstruct.place(pcchartNode, this.cp3.containerNode, 'first');
      this.pcchart = new Chart2D(pcchartNode);
      this.pcchart.addPlot('default', {
        type: this.Donut,
        radius: 100,
        // labelOffset: -10,
        stroke: 'black',
        // labelWiring: "cccc",
        labelStyle: 'columns'
      }).setTheme(Distinctive);

      new MoveSlice(this.pcchart, 'default');
      new Highlight(this.pcchart, 'default');
      new Tooltip(this.pcchart, 'default');

      when(this.processData('condition'), function (chartData) {
        // console.log("ChartData: ", chartData);
        self.pcchart.addSeries('Conditions', chartData[2]);
        self.pcchart.render();
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
      // console.log("###GeneExpressionChartContainer Create Store: state=", this.state);
      var store = new Store({
        token: token,
        apiServer: this.apiServer || window.App.dataServiceURL,
        state: this.state || state,
        filter_type: filter_type
      });
      // store.watch('refresh', lang.hitch(this, "refresh"));
      this.watch('state', lang.hitch(this, 'onSetState'));

      // console.log("Create Store: store=", store);

      return store;
    },

    showStrainPieChart: function () {
      // console.log("showPieChart");
      var self = this;
      self.store.reload(self.tgState);
      // var pschartNode = domConstruct.create("div",{style: "height: 300px; width: 500px;"}); domConstruct.place(pschartNode, this.cp1.containerNode, "last");
      var pschartNode = domConstruct.create('div', {}); domConstruct.place(pschartNode, this.cp1.containerNode, 'last');
      this.pschart = new Chart2D(pschartNode);
      this.pschart.addPlot('default', {
        type: this.Donut,
        radius: 100,
        // labelOffset: -10,
        stroke: 'black',
        // labelWiring: "cccc",
        labelStyle: 'columns',
        style: 'position:absolute; left:200px; float:left'
      }).setTheme(Distinctive);

      new MoveSlice(this.pschart, 'default');
      new Highlight(this.pschart, 'default');
      new Tooltip(this.pschart, 'default');

      when(this.processData('strain'), function (chartData) {
        // console.log("ChartData: ", chartData);
        self.pschart.addSeries('Strains', chartData[2]);
        self.pschart.render();
        // console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData);
      });
    },

    // pie chart for mutant
    showMutantPieChart: function () {
      // console.log("showPieChart");
      var self = this;
      self.store.reload(self.tgState);
      var pmchartNode = domConstruct.create('div', {}); domConstruct.place(pmchartNode, this.cp2.containerNode, 'last');
      this.pmchart = new Chart2D(pmchartNode);
      this.pmchart.addPlot('default', {
        type: this.Donut,
        radius: 100,
        // labelOffset: -10,
        stroke: 'black',
        // labelWiring: "cccc",
        labelStyle: 'columns'
      }).setTheme(Distinctive);

      new MoveSlice(this.pmchart, 'default');
      new Highlight(this.pmchart, 'default');
      new Tooltip(this.pmchart, 'default');

      when(this.processData('mutant'), function (chartData) {
        // console.log("ChartData: ", chartData);
        self.pmchart.addSeries('Mutants', chartData[2]);
        self.pmchart.render();
        // console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData);
      });
    },

    // pie chart for condition
    showConditionPieChart: function () {
      // console.log("showPieChart");
      var self = this;
      self.store.reload(self.tgState);
      var pcchartNode = domConstruct.create('div', {}); domConstruct.place(pcchartNode, this.cp3.containerNode, 'last');
      this.pcchart = new Chart2D(pcchartNode);
      this.pcchart.addPlot('default', {
        type: this.Donut,
        radius: 100,
        // labelOffset: -10,
        stroke: 'black',
        // labelWiring: "cccc",
        labelStyle: 'columns'
      }).setTheme(Distinctive);

      new MoveSlice(this.pcchart, 'default');
      new Highlight(this.pcchart, 'default');
      new Tooltip(this.pcchart, 'default');

      when(this.processData('condition'), function (chartData) {
        // console.log("ChartData: ", chartData);
        self.pcchart.addSeries('Conditions', chartData[2]);
        self.pcchart.render();
        // console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData);
      });
    },

    showStrainBarChart: function () {
      // console.log("showBarChart");
      var self = this;
      self.store.reload(self.tgState);
      var bschartNode = domConstruct.create('div', {}); domConstruct.place(bschartNode, this.cp1.containerNode, 'last');
      // chart for log_ratio
      this.bschart = new Chart2D(bschartNode);
      // console.log("GeneExpressionChartContainer after chart = new Chart2D");
      this.bschart.setTheme(Distinctive);

      // Add the only/default plot
      this.bschart.addPlot('default', {
        type: 'Bars',
        markers: true,
        gap: 5,
        labels: true,
        labelStyle: 'outside',
        labelOffset: 15,
        animate: { duration: 1000, easing: easing.linear }
      });

      new Highlight(this.bschart, 'default');
      new Tooltip(this.bschart, 'default');

      when(this.processData('strain'), function (chartData) {
        // console.log("ChartData: ", chartData);
        // Add axes
        self.bschart.addAxis('x', {
          vertical: true,
          majorLabels: true,
          minorTicks: false,
          minorLabels: false,
          microTicks: false,
          labels: chartData[0]
        });
        self.bschart.addAxis('y', {
          title: 'Comparisons', titleOrientation: 'away', min: 0, fixLower: 'major', fixUpper: 'major'
        });
        self.bschart.addSeries('TopStrains', chartData[1]);
        self.bschart.render();
        // console.log("GeneExpressionChartContainer top 5 chart = new Chart2D, chartData", chartData);
      });
    },

    showMutantBarChart: function () {
      // console.log("showBarChart");
      var self = this;
      self.store.reload(self.tgState);
      var bmchartNode = domConstruct.create('div', {}); domConstruct.place(bmchartNode, this.cp2.containerNode, 'last');
      // chart for log_ratio
      this.bmchart = new Chart2D(bmchartNode);
      // console.log("GeneExpressionChartContainer after chart = new Chart2D");
      this.bmchart.setTheme(Distinctive);

      // Add the only/default plot
      this.bmchart.addPlot('default', {
        type: 'Bars',
        markers: true,
        gap: 5,
        labels: true,
        labelStyle: 'outside',
        labelOffset: 15,
        animate: { duration: 1000, easing: easing.linear }
      });

      new Highlight(this.bmchart, 'default');
      new Tooltip(this.bmchart, 'default');

      when(this.processData('mutant'), function (chartData) {
        // console.log("ChartData: ", chartData);
        // Add axes
        self.bmchart.addAxis('x', {
          vertical: true,
          majorLabels: true,
          minorTicks: false,
          minorLabels: false,
          microTicks: false,
          labels: chartData[0]
        });
        self.bmchart.addAxis('y', {
          title: 'Comparisons', titleOrientation: 'away', min: 0, fixLower: 'major', fixUpper: 'major'
        });
        self.bmchart.addSeries('TopMutants', chartData[1]);
        self.bmchart.render();
        // console.log("GeneExpressionChartContainer top 5 chart = new Chart2D, chartData", chartData);
      });
    },

    showConditionBarChart: function () {
      // console.log("showBarChart");
      var self = this;
      self.store.reload(self.tgState);
      var bcchartNode = domConstruct.create('div', {}); domConstruct.place(bcchartNode, this.cp3.containerNode, 'last');
      this.bcchart = new Chart2D(bcchartNode);
      // console.log("GeneExpressionChartContainer after chart = new Chart2D");
      this.bcchart.setTheme(Distinctive);

      // Add the only/default plot
      this.bcchart.addPlot('default', {
        type: 'Bars',
        markers: true,
        gap: 5,
        labels: true,
        labelStyle: 'outside',
        labelOffset: 15,
        animate: { duration: 1000, easing: easing.linear }
      });

      new Highlight(this.bcchart, 'default');
      new Tooltip(this.bcchart, 'default');

      when(this.processData('condition'), function (chartData) {
        // console.log("ChartData: ", chartData);
        // Add axes
        self.bcchart.addAxis('x', {
          vertical: true,
          majorLabels: true,
          minorTicks: false,
          minorLabels: false,
          microTicks: false,
          labels: chartData[0]
        });
        self.bcchart.addAxis('y', {
          title: 'Comparisons', titleOrientation: 'away', min: 0, fixLower: 'major', fixUpper: 'major'
        });
        self.bcchart.addSeries('TopConditionss', chartData[1]);
        self.bcchart.render();
        // console.log("GeneExpressionChartContainer top 5 chart = new Chart2D, chartData", chartData);
      });
    },

    processData: function (filter_type) {
      // console.log("GeneExpressionChartContainer processData: this.store ", this.store);
      return when(this.store.query({}), function (data) {
        // console.log("GeneExpressionChartContainer processData: filter_type, data ", filter_type, data);
        if (!data) {
          console.log('INVALID Chart DATA', data);
          return;
        }

        var myData = [];

        if (filter_type === 'strain') {
          myData = data[0];
          // console.log("GeneExpressionChartContainer processData: strain, myData ", filter_type, myData);
        }
        else if (filter_type === 'mutant') {
          myData = data[1];
          // console.log("GeneExpressionChartContainer processData: mutant, myData ", filter_type, myData);
        }
        else {
          myData = data[2];
          // console.log("GeneExpressionChartContainer processData: condition, myData ", filter_type, myData);
        }
        // console.log("GeneExpressionChartContainer processData: filter_type, myData ", filter_type, myData);

        if (!myData) {
          console.log('INVALID Chart DATA', data);
          return;
        }

        var xData = [];
        var yData = [];
        var pieData = [];
        var chartData = {};
        var i = 0;
        var j = 0;
        while (i < myData.length)
        {
          if (j < 5 && j < myData.length) {
            xData.push(myData[i]);
            yData.push(myData[i + 1]);
            j++;
          }
          var txt = myData[i];
          var val = myData[i + 1];
          pieData.push({
            x: txt, y: val, text: txt, tooltip: txt + ' (' + val + ')'
          });
          i += 2;
        }
        var xLabel = [];
        xData.map(function (val, idx) {
          xLabel.push({ text: val, value: idx + 1 });
        });

        chartData[0] = xLabel;
        chartData[1] = yData;
        chartData[2] = pieData;
        // console.log("GeneExpressionChartContainer processData: xData, yData, xLabel, pieData", xData, yData, xLabel, pieData);
        return chartData;
      });
    }
  });
});
