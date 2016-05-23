define([
	"dojo/_base/declare", "dojo/_base/lang", "dojo/on", "dojo/topic", "dojo/dom-construct",
	"dijit/layout/BorderContainer", "dijit/layout/TabContainer", "dijit/layout/TabController", "dijit/layout/ContentPane",
	"dijit/form/RadioButton", "dijit/form/Textarea", "dijit/form/TextBox", "dijit/form/Button", "dijit/form/Select",
	"./ActionBar", "./ContainerActionBar",
	"dojox/charting/Chart2D", "dojox/charting/themes/WatersEdge", "dojox/charting/themes/Distinctive", "../store/GeneExpressionMetadataChartMemoryStore",  
	"dojo/aspect",  "dojo/_base/Deferred", "dojo/fx/easing", "dojo/when", "dojox/charting/action2d/MoveSlice", "dojox/charting/action2d/Highlight", "dojox/charting/action2d/Tooltip", "dojox/charting/plot2d/Pie"
], function(declare, lang, on, Topic, domConstruct,
			BorderContainer, TabContainer, StackController, ContentPane,
			RadioButton, TextArea, TextBox, Button, Select,
			ActionBar, ContainerActionBar,
			Chart2D, Theme, Distinctive, Store, aspect, Deferred, easing, when, MoveSlice, Highlight, Tooltip, Pie){
	var tgState = {
		keyword: "",
		upFold: 0,
		downFold: 0,
		upZscore: 0,
		downZscore: 0
	};
	
	return declare([BorderContainer], {
		id: "GEChartContainer",
		gutters: false,
		state: null,
		tgState: tgState,
		filter_type: "",
		apiServer: window.App.dataServiceURL,
		constructor: function(){
			var self = this;
			console.log("GeneExpressionMetadataChartContainer Constructor: this", this);
			console.log("GeneExpressionMetadataChartContainer Constructor: state", this.state);

			Topic.subscribe("GeneExpression", lang.hitch(self, function(){
				console.log("GeneExpressionMetadataChartContainer subscribe GeneExpression:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "applyConditionFilter":
						self.tgState = value;
						self.store.reload();
						// for strain
						when(self.processData("strain"), function(chartData){
							self.pschart.updateSeries("Strains", chartData[2]);
							self.pschart.render();
							console.log("GeneExpressionChartContainer applyConditionFilter reload store:", self.store.data);
						});
						// for mutant
						when(self.processData("mutant"), function(chartData){
							self.pmchart.updateSeries("Mutants", chartData[2]);
							self.pmchart.render();
						});
						// for condition
						when(self.processData("condition"), function(chartData){
							self.pcchart.updateSeries("Conditions", chartData[2]);
							self.pcchart.render();
						});

						break;
						
					case "updateTgState":
						self.tgState = value;
						self.store.reload();
						// for strain
						when(self.processData("strain"), function(chartData){
							self.pschart.updateSeries("Strains", chartData[2]);
							self.pschart.render();
							console.log("GeneExpressionChartContainer applyConditionFilter reload store:", self.store.data);
						});
						// for mutant
						when(self.processData("mutant"), function(chartData){
							self.pmchart.updateSeries("Mutants", chartData[2]);
							self.pmchart.render();
						});
						// for condition
						when(self.processData("condition"), function(chartData){
							self.pcchart.updateSeries("Conditions", chartData[2]);
							self.pcchart.render();
						});

						break;
					default:
						break;
				}
			}));
		},
		onSetState: function(attr, oldVal, state){
			console.log("GeneExpressionMetadataChartContainer onSetState set state: ", state);
			this._set('state', state);
		},

		_setStateAttr: function(state){
			this.inherited(arguments);
			if(!state){
				return;
			}
			var self = this;
			this._set("state", state);
			console.log("In GeneExpressionMetadataChartContainer _setStateAttr: state", state);
			if(!this.store){
				this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, state, "strain"));
			}else{
				this.store.set('state', state);

				this.refresh();
			}

			console.log("GeneExpressionMetadataChartContainer this._set: ", this.state);
		},
		
		startup: function(){
			//console.log("GeneExpressionGridContainer startup()");
			if (this._started) { return; }
			this.inherited(arguments);
			var self=this;
			this._set("state", this.get("state"));
			console.log("GeneExpressionMetadataChartContainer startup(), tgState", this.tgState);

			var chartTabContainer1 = new TabContainer({region: "center", style: "height: 300px; width: 500px; ", doLayout: false, id: this.id + "_chartTabContainer1"});
			var cp1 = new ContentPane({
					title: "Strain",
					style: "height:300px;"
			});
								
			var cp2 = new ContentPane({
					title: "Gene Modification"
			});

			var cp3 = new ContentPane({
					title: "Experimental Condition"
			});
					
			chartTabContainer1.addChild(cp1);
			chartTabContainer1.addChild(cp2);
			chartTabContainer1.addChild(cp3);
			this.addChild(chartTabContainer1);

			console.log("###Before GeneExpressionMetadataChartContainer startup() Create Store: store=", this.store);		

			aspect.before(this, 'renderArray', function(results){
				console.log("GeneExpressionMetadataChartContainer aspect.before: results=", results);
				Deferred.when(results.total, function(x){
					this.set("totalRows", x);
				});
			});

			this.set('store', this.createStore(this.apiServer, this.apiToken || window.App.authorizationToken, this.state, "strain"));

			console.log("###After GeneExpressionChartContainer startup() Create Store: store=", this.store); 
			console.log("###After GeneExpressionChartContainer startup() Create Store: store.data=", this.store.data); 

			// bar chart for strain
/*
			this.schart = new Chart2D(cp1.domNode);
			console.log("GeneExpressionChartContainer after chart = new Chart2D");
			this.schart.setTheme(Theme);

			this.schart.addPlot("default", {
				type: "Columns",
				markers: true,
				gap: 5,
				animate: {duration: 1000, easing: easing.linear}
			});
 
			when(this.processData("strain"), function(chartData){ 
				console.log("ChartData: ", chartData);
				self.schart.addAxis("x", {
					title: "Log Ratio",
					titleOrientation: "away",
					majorLabels: true,
					minorTicks: false,
					minorLabels: false,
					microTicks: false,
					labels: chartData[0]
				});
				self.schart.addAxis("y", {title: "Comparisons", vertical: true, fixLower: "major", fixUpper: "major" });

				self.schart.addSeries("Comparisons",chartData[1]);
				self.schart.render();
				console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData); 					
			});
*/
				
			// Donut chart 	
			var Donut = declare(Pie, {
				render: function (dim, offsets) {
					// Call the Pie's render method
					this.inherited(arguments);

					// Draw a white circle in the middle
				   var rx = (dim.width - offsets.l - offsets.r) / 2,
					   ry = (dim.height - offsets.t - offsets.b) / 2,
						r = Math.min(rx, ry) / 2;
				   var circle = {
					   cx: offsets.l + rx,
					   cy: offsets.t + ry,
					   r: "20px"
				   };
				   var s = this.group;

				   s.createCircle(circle).setFill("#fff").setStroke("#fff");
			   }
		   });
			
			// pie chart for strains
			this.pschart = new Chart2D(cp1.domNode);
			this.pschart.addPlot("default", {
				type: Donut,
				radius: 100,
				//labelOffset: -10,
				stroke:"black",
				//labelWiring: "cccc",
				labelStyle: "columns"
			}).setTheme(Distinctive);
			
			new MoveSlice(this.pschart, "default");
			new Highlight(this.pschart, "default");
			new Tooltip(this.pschart, "default");	 

			when(this.processData("strain"), function(chartData){ 
				console.log("ChartData: ", chartData);
				self.pschart.addSeries("Strains",chartData[2]);
				self.pschart.render();
				console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData); 					
			});
			
			// pie chart for mutant
			this.pmchart = new Chart2D(cp2.domNode);
			this.pmchart.addPlot("default", {
				type: Donut,
				radius: 100,
				//labelOffset: -10,
				stroke:"black",
				//labelWiring: "cccc",
				labelStyle: "columns"
			}).setTheme(Distinctive);
			
			new MoveSlice(this.pmchart, "default");
			new Highlight(this.pmchart, "default");
			new Tooltip(this.pmchart, "default");	 

			when(this.processData("mutant"), function(chartData){ 
				console.log("ChartData: ", chartData);
				self.pmchart.addSeries("Mutants",chartData[2]);
				self.pmchart.render();
				console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData); 					
			});						

			// pie chart for condition
			this.pcchart = new Chart2D(cp3.domNode);
			this.pcchart.addPlot("default", {
				type: Donut,
				radius: 100,
				//labelOffset: -10,
				stroke:"black",
				//labelWiring: "cccc",
				labelStyle: "columns"
			}).setTheme(Distinctive);
			
			new MoveSlice(this.pcchart, "default");
			new Highlight(this.pcchart, "default");
			new Tooltip(this.pcchart, "default");	 

			when(this.processData("condition"), function(chartData){ 
				console.log("ChartData: ", chartData);
				self.pcchart.addSeries("Conditions",chartData[2]);
				self.pcchart.render();
				console.log("GeneExpressionChartContainer update chart = new Chart2D, chartData", chartData); 					
			});
			
			this.watch("state", lang.hitch(this, "onSetState"));
			this.inherited(arguments);
			this._started = true;
			//console.log("new GeneExpressionGridContainer arguments: ", arguments);
		},


		postCreate: function(){
			this.inherited(arguments);
		},

		createStore: function(server, token, state, filter_type){
			console.log("###GeneExpressionChartContainer Create Store: state=", this.state);
			var store = new Store({
				token: token,
				apiServer: this.apiServer || window.App.dataServiceURL,
				state: this.state || state,
				filter_type: filter_type 
			});
			//store.watch('refresh', lang.hitch(this, "refresh"));
			this.watch("state", lang.hitch(this, "onSetState"));

			console.log("Create Store: store=", store);

			return store;
		},

		processData: function(filter_type){
			console.log("GeneExpressionChartContainer processData: this.store ", this.store);
			return when(this.store.query({}), function(data){
				console.log("GeneExpressionChartContainer processData: filter_type, data ", filter_type, data);
				if(!data){
					console.log("INVALID Chart DATA", data);
					return;
				}

				var myData = [];
				
				if (filter_type === "strain") {
					myData = data[0];
					console.log("GeneExpressionChartContainer processData: strain, myData ", filter_type, myData);
				}
				else if (filter_type === "mutant") {
					myData = data[1];
					console.log("GeneExpressionChartContainer processData: mutant, myData ", filter_type, myData);
				}
				else {
					myData = data[2];
					console.log("GeneExpressionChartContainer processData: condition, myData ", filter_type, myData);
				}
				console.log("GeneExpressionChartContainer processData: filter_type, myData ", filter_type, myData);

				if(!myData){
					console.log("INVALID Chart DATA", data);
					return;
				}
								
				var xData = [];
				var yData = [];
				var pieData =[];
				var chartData = {};
				var i=0;
				var j=0;				
				while(i<myData.length)
				{
					if (j<5 && j<myData.length) {
						xData.push(myData[i]);
						yData.push(myData[i+1]);	
						j++;
					}
					var txt = myData[i];
					var val = myData[i+1];
					pieData.push({x: txt, y: val, text: txt, tooltip: txt+ " (" + val + ")"});
					i=i+2;
				}
				var xLabel = [];
				xData.map(function(val, idx) {
					xLabel.push({text: val, value: idx+1});
				});
	
				chartData[0]=xLabel;
				chartData[1]=yData;
				chartData[2]=pieData;
				console.log("GeneExpressionChartContainer processData: xData, yData, xLabel, pieData", xData, yData, xLabel, pieData);
				return chartData;
			});
		}						
	});
});