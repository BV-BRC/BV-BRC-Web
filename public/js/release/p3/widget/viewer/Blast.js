define("p3/widget/viewer/Blast", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/topic",
	"dijit/layout/StackContainer", "dijit/layout/TabController",
	"dijit/layout/ContentPane", "dojox/widget/Standby",
	"./Base", "../BlastResultGridContainer", "../../store/BlastResultMemoryStore",
	"../GridSelector"
], function(declare, lang, Topic,
			TabContainer, StackController,
			ContentPane, Standby,
			ViewerBase, GridContainer, BlastResultMemoryStore,
			selector){

	return declare([ViewerBase], {
		"disabled": false,
		"query": null,
		loadingMask: null,
		visible: true,

		constructor: function(options){

			this.topicId = "Blast_" + options.id.split('_blastResult')[0];

			Topic.subscribe(this.topicId, lang.hitch(this, function(){
				// console.log("BlastResult:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "showLoadingMask":
						this.loadingMask.show();
						break;
					case "hideLoadingMask":
						this.loadingMask.hide();
						break;
					default:
						break;
				}
			}));
		},

		onSetState: function(attr, oldVal, state){

			if(!state){
				return;
			}

			// console.log(state);
			if(this.state.resultType == "genome_feature"){
				this.gfGrid.set('state', state);
				this.tabContainer.selectChild(this.gfGrid);
			}else{
				this.gsGrid.set('state', state);
				this.tabContainer.selectChild(this.gsGrid);
			}
		},

		postCreate: function(){

			this.loadingMask = new Standby({
				target: this.id,
				image: "/public/js/p3/resources/images/spin.svg",
				color: "#efefef"
			});
			this.addChild(this.loadingMask);
			this.loadingMask.startup();

			this.tabContainer = new TabContainer({region: "center", id: this.id + "_TabContainer"});
			var tabController = new StackController({
				containerId: this.id + "_TabContainer",
				region: "top",
				"class": "TextTabButtons"
			});
			this.addChild(tabController);
			this.addChild(this.tabContainer);

			var gfStore = new BlastResultMemoryStore({
				type: "genome_feature",
				idProperty: "feature_id",
				topicId: this.topicId,
				queryOptions: {
					sort: [{attribute: "pident", descending: true}]
				}
			});
			var gsStore = new BlastResultMemoryStore({
				type: "genome_sequence",
				idProperty: "sequence_id",
				topicId: this.topicId,
				queryOptions: {
					sort: [{attribute: "pident", descending: true}]
				}
			});

			this.gfGrid = new GridContainer({
				title: 'gf',
				type: 'genome_feature',
				containerType: "feature_data",
				region: "center",
				store: gfStore,
				columns: {
					"Selection Checkboxes": selector({label: '', sortable: false, unhidable: true}),
					expand: {
						label: '', field: '', sortable: false, unhidable: true, renderCell: function(obj, val, node){
							node.innerHTML = '<div class="dgrid-expando-icon ui-icon ui-icon-triangle-1-e"></div>';
						}
					},
					genome: {label: 'Genome', field: "genome_name"},
					genome_id: {label: 'Genome ID', field: 'genome_id', hidden: true},
					patric_id: {label: 'PATRIC ID', field: 'patric_id'},
					refseq_locus_tag: {label: 'RefSeq Locus Tag', field: 'refseq_locus_tag', hidden: true},
					gene: {label: 'Gene', field: 'gene'},
					product: {label: 'Product', field: "function"},
					identity: {label: 'Identity (%)', field: "pident"},
					q_coverage: {label: 'Query cover (%)', field: "query_coverage"},
					s_coverage: {label: 'Subject cover (%', field: "subject_coverage"},
					length: {label: 'Length', field: "length"},
					score: {label: 'Score', field: 'bitscore'},
					evalue: {label: 'E value', field: 'evalue'}
				}
			});
			// gfStore.watch('refresh', this.gfGrid.refresh);

			this.gsGrid = new GridContainer({
				title: 'gs',
				type: 'genome_sequence',
				containerType: "sequence_data",
				region: "center",
				store: gsStore,
				columns: {
					"Selection Checkboxes": selector({label: '', sortable: false, unhidable: true}),
					expand: {
						label: '', field: '', sortable: false, unhidable: true, renderCell: function(obj, val, node){
							node.innerHTML = '<div class="dgrid-expando-icon ui-icon ui-icon-triangle-1-e"></div>';
						}
					},
					genome: {label: 'Genome', field: "genome_name"},
					genome_id: {label: 'Genome ID', field: 'genome_id', hidden: true},
					accession: {label: 'Accession', field: 'accession'},
					description: {label: 'Description', field: 'description', hidden: true},
					product: {label: 'Product', field: "function"},
					identity: {label: 'Identity (%)', field: "pident"},
					q_coverage: {label: 'Query cover (%)', field: "query_coverage"},
					s_coverage: {label: 'Subject cover (%', field: "subject_coverage"},
					length: {label: 'Length', field: "length"},
					score: {label: 'Score', field: 'bitscore'},
					evalue: {label: 'E value', field: 'evalue'}
				}
			});

			this.tabContainer.addChild(this.gfGrid);
			this.tabContainer.addChild(this.gsGrid);

			// viewerHeader

			this.inherited(arguments);
		}

	})
});