define([
	"dojo/_base/declare", "dojo/_base/lang",
	"dojo/topic",
	"dijit/popup",
	"./GridContainer", "./BlastResultGrid", "./PerspectiveToolTip"
], function(declare, lang,
			Topic,
			popup,
			GridContainer, BlastResultGrid, PerspectiveToolTipDialog){

	return declare([GridContainer], {
		gridCtor: BlastResultGrid,
		containerType: "",
		enableFilterPanel: false,
		visible: true,
		store: null,

		buildQuery: function(){
		},
		_setQueryAttr: function(q){
		},

		_setStoreAttr: function(store){
			if(this.grid){
				this.grid.store = store;
			}
			this._set('store', store);
		},

		onSetState: function(attr, oldState, state){
			if(!state){
				return;
			}

			if(this.grid){
				this.grid.set('state', state);
			}
		},
		/*
		add GenomeBrowser as a special case and override ViewGenomeItem, ViewGenomeItems, ViewCDSFeaturesSeq,
		ViewFeatureItem, ViewFeatureItem to open in a new tab
		*/
		selectionActions: GridContainer.prototype.selectionActions.concat([
			[
				"GenomeBrowser",
				"fa icon-genome-browser fa-2x",
				{
					label: "Browser",
					multiple: false,
					validTypes: ["*"],
					validContainerTypes: ["sequence_data"],
					tooltip: "View in Genome Browser"
				},
				function(selection){

					var target = selection[0];
					var hit_from = target.detail.hsps[0].hit_from;
					var hit_to = target.detail.hsps[0].hit_to;

					var hash = lang.replace("#view_tab=browser&loc={0}:{1}..{2}&highlight={0}:{3}..{4}&tracks=refseqs,PATRICGenes,RefSeqGenes", [target.accession, Math.min(hit_from, hit_from - 200), Math.max(hit_to, hit_to + 200), hit_from, hit_to]);

					Topic.publish("/navigate", {
						href: "/view/Genome/" + target.genome_id + hash,
						target: "blank"
					});
				},
				false
			],
			[
				"ViewGenomeItem",
				"MultiButton fa icon-selection-Genome fa-2x",
				{
					label: "GENOME",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Genome View. Press and Hold for more options.",
					ignoreDataType: true,
					validContainerTypes: ["sequence_data", "feature_data", "spgene_data", "sequence_data"],
					pressAndHold: function(selection, button, opts, evt){
						popup.open({
							popup: new PerspectiveToolTipDialog({perspectiveUrl: "/view/Genome/" + selection[0].genome_id}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var sel = selection[0];

					Topic.publish("/navigate", {href: "/view/Genome/" + sel.genome_id, target: "blank"});
				},
				false
			],
			[
				"ViewGenomeItems",
				"MultiButton fa icon-selection-GenomeList fa-2x",
				{
					label: "GENOMES",
					validTypes: ["*"],
					multiple: true,
					min: 2,
					max: 1000,
					tooltip: "Switch to Genome List View. Press and Hold for more options.",
					ignoreDataType: true,
					validContainerTypes: ["genome_data", "sequence_data", "feature_data", "spgene_data", "sequence_data"],
					pressAndHold: function(selection, button, opts, evt){
						var map = {};
						selection.forEach(function(sel){
							if(!map[sel.genome_id]){
								map[sel.genome_id] = true
							}
						})
						var genome_ids = Object.keys(map);
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "GenomeList",
								perspectiveUrl: "/view/GenomeList/?in(genome_id,(" + genome_ids.join(",") + "))"
							}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){
					var map = {};
					selection.forEach(function(sel){
						if(!map[sel.genome_id]){
							map[sel.genome_id] = true
						}
					});
					var genome_ids = Object.keys(map);
					Topic.publish("/navigate", {
						href: "/view/GenomeList/?in(genome_id,(" + genome_ids.join(",") + "))",
						target: "blank"
					});
				},
				false
			],
			[
				"ViewCDSFeaturesSeq",
				"MultiButton fa icon-selection-FeatureList fa-2x",
				{
					label: "FEATURES",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Feature List View. Press and Hold for more options.",
					validContainerTypes: ["sequence_data"],
					pressAndHold: function(selection, button, opts, evt){
						// console.log("PressAndHold");
						// console.log("Selection: ", selection, selection[0])
						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "FeatureList",
								perspectiveUrl: "/view/FeatureList/?and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(sequence_id," + selection[0].sequence_id + "))"
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){

					var sel = selection[0];
					Topic.publish("/navigate", {
						href: "/view/FeatureList/?and(eq(annotation,PATRIC),eq(sequence_id," + sel.sequence_id + "),eq(feature_type,CDS))",
						target: "blank"
					});
				},
				false
			],
			[
				"ViewFeatureItem",
				"MultiButton fa icon-selection-Feature fa-2x",
				{
					label: "FEATURE",
					validTypes: ["*"],
					multiple: false,
					tooltip: "Switch to Feature View. Press and Hold for more options.",
					validContainerTypes: ["feature_data"],
					pressAndHold: function(selection, button, opts, evt){

						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "Feature",
								perspectiveUrl: "/view/Feature/" + selection[0].feature_id
							}),
							around: button,
							orient: ["below"]
						});
					}
				},
				function(selection){
					var sel = selection[0];
					Topic.publish("/navigate", {
						href: "/view/Feature/" + sel.feature_id + "#view_tab=overview",
						target: "blank"
					});
				},
				false
			],
			[
				"ViewFeatureItems",
				"MultiButton fa icon-selection-FeatureList fa-2x",
				{
					label: "FEATURES",
					validTypes: ["*"],
					multiple: true,
					min: 2,
					max: 5000,
					tooltip: "Switch to Feature List View. Press and Hold for more options.",
					validContainerTypes: ["feature_data"],
					pressAndHold: function(selection, button, opts, evt){

						popup.open({
							popup: new PerspectiveToolTipDialog({
								perspective: "FeatureList",
								perspectiveUrl: "/view/FeatureList/?in(feature_id,(" + selection.map(function(x){
									return x.feature_id;
								}).join(",") + "))"
							}),
							around: button,
							orient: ["below"]
						});

					}
				},
				function(selection){

					Topic.publish("/navigate", {
						href: "/view/FeatureList/?in(feature_id,(" + selection.map(function(x){
							return x.feature_id;
						}).join(",") + "))",
						target: "blank"
					});
				},
				false
			]
		])
	});
});