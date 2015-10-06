define([
	"dojo/_base/declare", "./GridContainer","dojo/on",
	"./FeatureGrid","dijit/popup","dojo/topic",
	"dijit/TooltipDialog","./FacetFilterPanel",
	"dojo/_base/lang"

], function(
	declare, GridContainer,on,
	FeatureGrid,popup,Topic,
	TooltipDialog,FacetFilterPanel,
	lang
){

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

	return declare([GridContainer],{
		gridCtor: FeatureGrid,
		style: "margin-left:15px;",
		facetFields: ["annotation","feature_type"],
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
		getFilterPanel: function(){
			if (!this.filterPanel) { 
				this.filterPanel = new FacetFilterPanel({style: "color:#fff;",facets: {} });

				this.filterPanel.watch("filter", lang.hitch(this,function(attr,oldValue,newValue){
					on.emit(this.domNode, "UpdateHash", {bubbles: true, cancelable: true, hashProperty: "filter", value: newValue, oldValue: oldValue} )
				}))
			}
			this.filterPanel.clearFilters();
			return this.filterPanel 
		},

		filter: null,

		_setFilterAttr: function(filter){
			console.log("FeatureGridContainer Filter: ", filter);
			this.inherited(arguments);

			if (filter){
				console.log("Parsing hashParams Filter: ", this.hashParams.filter);
				var re = /(eq\(\w+\,\w+\))+/gi;
				var innerRE = /eq\(\w+\,\w+\)/
				var matches = filter.match(re);
				console.log("Matches: ", matches);
				var selected = matches.map(function(match){
					var parts = match.replace("eq(","").replace(/\)$/,"").split(",");
					return parts[0] +":"+ parts[1];
				})

				console.log("Selected: ", selected);
				if (this.filterPanel){
						this.filterPanel.set('selected', selected);
				}
			}
		},
		startup: function(){
			if (this._started) { return; }			
			var _self=this;
			this.inherited(arguments);
			
			this.grid.store.on("facet_counts", function(evt){
				if (_self.filterPanel){
					_self.filterPanel.set("facets", evt.facet_counts.facet_fields);
					console.log("FeatureGridContainer Facets: ", evt.facet_counts);
				}
			})	
		}
	});
});
