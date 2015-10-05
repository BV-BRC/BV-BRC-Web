define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on","dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/TabContainer",
	"./PathwaysGrid", "dijit/layout/ContentPane","./GridContainer","dijit/TooltipDialog",
	"./ItemDetailPanel"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer,
			PathwaysGrid, ContentPane, GridContainer,TooltipDialog,
			ItemDetailPanel
) {


	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div><hr><div class="wsActionTooltip" rel="dna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloaddna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloadprotein"> '
	var viewFASTATT=  new TooltipDialog({content: vfc, onMouseLeave: function(){ popup.close(viewFASTATT); }})

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>'
	var downloadTT=  new TooltipDialog({content: dfc, onMouseLeave: function(){ popup.close(downloadTT); }})

	on(downloadTT.domNode, "div:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		console.log("REL: ", rel);
		var selection = self.actionPanel.get('selection')
		var dataType=(self.actionPanel.currentContainerWidget.containerType=="genome_group")?"genome":"genome_feature"
		var currentQuery = self.actionPanel.currentContainerWidget.get('query');
		console.log("selection: ", selection);
		console.log("DownloadQuery: ", dataType, currentQuery );
		window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");		
		popup.close(downloadTT);
	});

	return declare([BorderContainer], {
		gutters: false,
		params: null,
		//query: null,
		//_setQueryAttr: function(query){
		//	this.query = query;
		//	if (this.pathwaysGrid) {
		//		this.pathwaysGrid.set("query", query);
		//	}
		//},
		_setParamsAttr: function(params) {
			this.params = params;
			if(this._started && this.pathwaysGrid){
				var q = [];
				if(params.genome_id != null) q.push('genome_id:' + params.genome_id);
				if(params.annotation != null) q.push('annotation:' + params.annotation);
				if(params.pathway_id != null) q.push('pathway_id:' + prarms.pathway_id);

				this.pathwaysGrid.set("params", params);

				/*
				//console.log(params, q);
				this.pathwaysGrid.set("query", {
					q: q.join(' AND '),
					rows: 1,
					facet: true,
					'json.facet': '{stat:{field:{field:pathway_id,limit:-1,facet:{genome_count:"unique(genome_id)",gene_count:"unique(feature_id)",ec_count:"unique(ec_number)",genome_ec:"unique(genome_ec)"}}}}'
				});
				*/
			}
		},
		listen: function(){
			this.pathwaysGrid.on("select", lang.hitch(this,function(evt){
				console.log("Selected: ", evt);
				var sel = Object.keys(evt.selected).map(lang.hitch(this,function(rownum){
					console.log("rownum: ", rownum);
					console.log("Row: ", evt.grid.row(rownum).data);
					return evt.grid.row(rownum).data;
				}));
				console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));	

			this.pathwaysGrid.on("deselect", lang.hitch(this,function(evt){

				if (!evt.selected) { 
					this.actionPanel.set("selection", []); 
					this.itemDetailPanel.set("selection", []);
				}else{
					var sel = Object.keys(evt.selected).map(lang.hitch(this,function(rownum){
						console.log("rownum: ", rownum);
						console.log("Row: ", evt.grid.row(rownum).data);
						return evt.grid.row(rownum).data;
					}));
				}
				console.log("selection: ", sel);
				this.selectionActionBar.set("selection", sel);
				this.itemDetailPanel.set('selection', sel);
			}));
		},
		containerActions: GridContainer.prototype.containerActions.concat([
			[
				"DownloadTable",
				"fa fa-download fa-2x",
				{label:"DOWNLOAD",multiple: false,validTypes:["*"],tooltip: "Download Table", tooltipDialog:downloadTT}, 
				function(selection){	
					popup.open({
						popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
						around: this.containerActionBar._actions.DownloadTable.button,
						orient: ["below"]
					});
				},
				true
			]
		]),
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"ViewFASTA",
				"fa icon-fasta fa-2x",
				{label: "FASTA",ignoreDataType:true, multiple: true,validTypes:["*"], tooltip: "View FASTA Data",tooltipDialog:viewFASTATT},
				function(selection){
					popup.open({
						popup: this.selectionActionBar._actions.ViewFASTA.options.tooltipDialog,
						around: this.selectionActionBar._actions.ViewFASTA.button,
						orient: ["below"]
					});
				},
				false
			]

		]),
		setupActions: function(){
			this.containerActions.forEach(function(a){
				this.containerActionBar.addAction(a[0],a[1],a[2],lang.hitch(this,a[3]),a[4]);
			}, this);

			this.selectionActions.forEach(function(a){
				this.selectionActionBar.addAction(a[0],a[1],a[2],lang.hitch(this,a[3]),a[4]);
			}, this);
		},

		startup: function() {
			console.log("**************** *************** PathwaysContainer startup()")
			if(this._started){
				return;
			}
			this.containerActionBar = new ContainerActionBar({
				region: "top",
				splitter: false,
				"className": "BrowserHeader"
			});
			this.selectionActionBar = new ActionBar({
				region: "right",
				layoutPriority: 2,
				style: "width:48px;text-align:center;",
				splitter: false
			});
			this.itemDetailPanel = new ItemDetailPanel({region: "right", style: "width:300px", splitter: false, layoutPriority:1});
			this.tabContainer = new TabContainer({region: "center"});

			this.pathwaysGrid = new PathwaysGrid({title: "Pathways", content: "Pathways Grid",params:this.params,query:{}});
			if (this.params){
				this.set("params",this.params);
			}
			this.ecNumbersGrid = new ContentPane({title: "EC Numbers", content: "EC Numbers Grid"});
			this.genesGrid = new ContentPane({title: "Genes", content: "Genes Grid"});


			this.tabContainer.addChild(this.pathwaysGrid);
			this.tabContainer.addChild(this.ecNumbersGrid);
			this.tabContainer.addChild(this.genesGrid);

			this.addChild(this.containerActionBar);
			this.addChild(this.tabContainer);
			this.addChild(this.selectionActionBar);

			this.listen();
			this.setupActions();
			this.inherited(arguments);
		}
	});
});

