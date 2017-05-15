define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on", "dojo/_base/lang",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/StackContainer", "dijit/layout/TabController",
	"./SubSystemsMemoryGridContainer", "dijit/layout/ContentPane", "./GridContainer", "dijit/TooltipDialog",
	"../store/SubSystemMemoryStore", "dojo/dom-construct", "dojo/topic", "./GridSelector"
], function(declare, BorderContainer, on, lang,
			ActionBar, ContainerActionBar, TabContainer, StackController,
			SubSystemsGridContainer, ContentPane, GridContainer, TooltipDialog,
			SubSystemMemoryStore, domConstruct, topic, selector){
	var vfc = '<div class="wsActionTooltip" rel="dna">View FASTA DNA</div><div class="wsActionTooltip" rel="protein">View FASTA Proteins</div><hr><div class="wsActionTooltip" rel="dna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloaddna">Download FASTA DNA</div><div class="wsActionTooltip" rel="downloadprotein"> ';
	var viewFASTATT = new TooltipDialog({
		content: vfc, onMouseLeave: function(){
			popup.close(viewFASTATT);
		}
	});

	var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
	var downloadTT = new TooltipDialog({
		content: dfc, onMouseLeave: function(){
			popup.close(downloadTT);
		}
	});

	on(downloadTT.domNode, "div:click", function(evt){
		var rel = evt.target.attributes.rel.value;
		var selection = self.actionPanel.get('selection');
		var dataType = (self.actionPanel.currentContainerWidget.containerType == "genome_group") ? "genome" : "genome_feature";
		var currentQuery = self.actionPanel.currentContainerWidget.get('query');

		window.open("/api/" + dataType + "/" + currentQuery + "&http_authorization=" + encodeURIComponent(window.App.authorizationToken) + "&http_accept=" + rel + "&http_download");
		popup.close(downloadTT);
	});

	return declare([BorderContainer], {
		gutters: false,
		state: null,
		maxGenomeCount: 500,
		tooltip: 'The "Subsystems" tab contains a list of subsystems for genomes associated with the current view',
		apiServer: window.App.dataServiceURL,
		//defaultFilter: "eq(subclass,%22*%22)",

		postCreate: function(){
			this.inherited(arguments);
			this.watch("state", lang.hitch(this, "onSetState"));
		},

		onSetState: function(attr, oldVal, state){

			if(!state){
				return;
			}

			if(this.tabContainer && this.tabContainer.selectedChildWidget && this._firstView && this.tabContainer.selectedChildWidget.state != state){
				this.tabContainer.selectedChildWidget.set('state', state);
			}

			if(state.autoFilterMessage){
				var msg = '<table><tr style="background: #f9ff85;"><td><div class="WarningBanner">' + state.autoFilterMessage + "&nbsp;<i class='fa-1x icon-question-circle-o DialogButton' rel='help:/misc/GenomesLimit' /></div></td><td style='width:30px;'><i style='font-weight:400;color:#333;cursor:pointer;' class='fa-1x icon-cancel-circle close closeWarningBanner' style='color:#333;font-weight:200;'></td></tr></table>";
				if(!this.messagePanel){
					this.messagePanel = new ContentPane({
						"class": "WarningPanel",
						region: "top",
						content: msg
					});

					var _self = this;
					on(this.messagePanel.domNode, ".closeWarningBanner:click", function(evt){
						if(_self.messagePanel){
							_self.removeChild(_self.messagePanel);
						}
					});
				}else{
					this.messagePanel.set("content", msg);
				}
				this.addChild(this.messagePanel);
			}else{
				if(this.messagePanel){
					this.removeChild(this.messagePanel)
				}
			}
		},

		visible: false,
		_setVisibleAttr: function(visible){

			this.visible = visible;

			if(this.visible && !this._firstView){
				this.onFirstView();
			}
		},

		selectChild: function(child){
			topic.publish(this.id + "-selectChild", child);
		},

		onFirstView: function(){
			if(this._firstView){
				return;
			}
			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});

			var subsystemsStore = this.subsystemsStore = new SubSystemMemoryStore({type: "subsystems"});
			var geneSubsystemsStore = this.geneSubsystemsStore = new SubSystemMemoryStore({type: "genes"});

			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});


			this.subsystemsGrid = new SubSystemsGridContainer({
				title: "Subsystems",
				type: "subsystems",
				// state: this.state,
				apiServer: this.apiServer,
				//defaultFilter: this.defaultFilter,
				store: subsystemsStore,
				facetFields: ["subclass"],
				columns: {
					"Selection Checkboxes": selector({unhidable: true}),
					id: {label: 'ID', field: 'id', hidden: true},
					subsystem_id: {label: 'Subsystem ID', field: 'subsystem_id', hidden: true},
					class: {label: "Class", field: "class"},
					subclass: {label: 'Subclass', field: 'subclass'},
					subsystem_name: {label: 'Subsystem Name', field: 'subsystem_name'},
					genome_count: {label: 'Genome Count', field: 'genome_count'},
					gene_count: {label: 'Gene Count', field: 'gene_count'},
					role_count: {label: 'Role Count', field: 'role_count'},
					role_id: {label: "Role ID", field: "role_id", hidden: true},
					role_name: {label: "Role Name", field: "role_name"},
					active: {label: "Active", field: "active"},
					patric_id: {label: "Patric ID", field: "patric_id"},
					gene: {label: "Gene", field: "gene"},
					product: {label: "Product", field: "product"}
					
				},
				queryOptions: {
					sort: [{attribute: "id"}]
				},
				enableFilterPanel: true,
				visible: true
			});

			this.genesGrid = new SubSystemsGridContainer({
				title: "Genes",
				type: "genes",
				// state: this.state,
				apiServer: this.apiServer,
				//defaultFilter: this.defaultFilter,
				store: geneSubsystemsStore,
				facetFields: ["class", "subclass", "active"],
				columns: {
					"Selection Checkboxes": selector({unhidable: true}),
					id: {label: 'ID', field: 'id', hidden: true},
					subsystem_id: {label: 'Subsystem ID', field: 'subsystem_id', hidden: true},
					class: {label: "Class", field: "class"},
					subclass: {label: 'Subclass', field: 'subclass'},
					subsystem_name: {label: 'Subsystem Name', field: 'subsystem_name'},
					role_id: {label: "Role ID", field: "role_id", hidden: true},
					role_name: {label: "Role Name", field: "role_name"},
					active: {label: "Active", field: "active"},
					patric_id: {label: "Patric ID", field: "patric_id"},
					gene: {label: "Gene", field: "gene"},
					product: {label: "Product", field: "product"}
				},
				queryOptions: {
					sort: [{attribute: "id"}]
				},
				enableFilterPanel: true,
				visible: true
			});

			this.addChild(tabController);
			this.addChild(this.tabContainer);
			this.tabContainer.addChild(this.subsystemsGrid);
			this.tabContainer.addChild(this.genesGrid);
			
			topic.subscribe(this.id + "_TabContainer-selectChild", lang.hitch(this, function(page){
				page.set('state', this.state)
			}));

			this._firstView = true;
		}
	})
});
