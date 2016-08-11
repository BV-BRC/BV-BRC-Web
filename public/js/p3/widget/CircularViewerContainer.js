define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar", "./ContainerActionBar", "dijit/layout/TabContainer",
	"./TrackController", "circulus/Viewer", "circulus/LineTrack",
	"circulus/SectionTrack", "circulus/SectionTrackWithLabel", "dojo/_base/lang", "dojo/request", "./DataItemFormatter", "../util/PathJoin"
], function(declare, BorderContainer, on,
			ActionBar, ContainerActionBar, TabContainer,
			TrackController, CirculusViewer, LineTrack,
			SectionTrack, SectionTrackWithLabel, lang, xhr, DataItemFormatter, PathJoin){

	return declare([BorderContainer], {
		gutters: true,
		query: null,
		genome_id: "",
		apiServiceUrl: window.App.dataAPI,

		_setQueryAttr: function(query){
		},

		onSetGenomeId: function(attr, oldVal, gid){
			this.getReferenceSequences(gid).then(lang.hitch(this, function(refseqs){
				this.set("referenceSequences", refseqs)
			}))
		},

		getReferenceSequences: function(gid, includeSequences, refresh){

			var query = "?eq(genome_id," + gid + ")&select(topology,gi,accession,length,sequence_id,gc_content,owner,sequence_type,taxon_id,public,genome_id,genome_name,date_inserted,date_modified" + (includeSequences ? ",sequence" : "") + ")&sort(+accession)&limit(1000)";

			return xhr.get(PathJoin(this.apiServiceUrl, "genome_sequence", query), {
				headers: {
					accept: "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(refseqs){
				refseqs = refseqs.map(function(r){
					r.name = r.accession;
					r.start = 0;
					r.end = r.length;
					return r;
				}).sort(function(a, b){
					return a.name > b.name;
				})
				return refseqs;
			}));
		},

		addFeatureTrack: function(title, gid, filter, strand, fill, stroke, background){
			var fields = ["feature_id", "feature_type", "sequence_id", "segments", "gi", "na_length", "pos_group", "strand", "public", "aa_length", "patric_id", "owner",
				"location", "protein_id", "refseq_locus_tag", "taxon_id", "accession", "end", "genome_name", "product", "genome_id", "annotation", "start"]

			var query = "?and(eq(genome_id," + gid + "),ne(feature_type,source)," + filter + ")&sort(+accession,+start)" + "&select(" + fields.join(",") + ")&limit(25000)";
			//console.log("******track title:", title, " query:", PathJoin(this.apiServiceUrl, "genome_feature", query));

			var track = this.viewer.addTrack({
				type: SectionTrack,
				options: {
					title: title,
					loadingText: "LOADING " + title.toUpperCase(),
					loading: true,
					trackWidth: 0.08,
					fill: fill,
					stroke: stroke,
					gap: 0,
					background: background,
					formatPopupContent: function(item){
						//return item.patric_id + " (" + item.feature_type + ")<br>Product: " + item.product + "<br>Location: " + item.location;
						return DataItemFormatter(item, "feature_data", {mini: true, linkTitle: true})
					},
					formatDialogContent: function(item){
						return DataItemFormatter(item, "feature_data", {linkTitle: true})
					}
				}
			})

			return xhr.get(PathJoin(this.apiServiceUrl, "genome_feature", query), {
				headers: {
					accept: "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(refseqs){
				//console.log("******track title:", title, " refseqs:", refseqs, " strand", strand);
				
				if (refseqs.length == 0) {
					track.set('loading', false);
					return refseqs;
				} 
								
				refseqs = refseqs.filter(function(r){
					if(strand === null){
						return true;
					}
					if(strand){
						return r.strand && r.strand == "+";
					}else{
						return r.strand != "+";
					}
				}).map(function(r){
					r.name = r.accession;
					r.length = r.end - r.start;
					return r;
				}).sort(function(a, b){
					return a.name > b.name;
				})

				//console.log("******before set data track title:", title, " refseqs:", refseqs);
				track.set("data", refseqs);

				return refseqs;
			}));
		},

		onSetReferenceSequences: function(attr, oldVal, refseqs){
			// console.log("RefSeqs: ", refseqs);

			this.viewer.addTrack({
				type: SectionTrackWithLabel,
				options: {
					title: "Position Label (Mbp)",
					trackWidth: 0.1,
					//fill: "#eeeeee",
					stroke: null,
					gap: 1,
					background: {fill: null, stroke: null}
				},
				data: refseqs
			}, "perimeter", false);

			this.viewer.addTrack({
				type: SectionTrack,
				options: {
					title: "Contigs/Chromosomes",
					trackWidth: 0.03,
					fill: "#000F7D",
					stroke: null,
					gap: 1,
					background: {fill: null, stroke: null},
					formatPopupContent: function(item){
						return DataItemFormatter(item, "sequence_data", {mini: true, linkTitle: true})
					},
					formatDialogContent: function(item){
						return DataItemFormatter(item, "sequence_data", {linkTitle: true})
					}
				},
				data: refseqs
			}, "outer", true);

			this.addFeatureTrack("CDS - FWD", this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(strand,%22\+%22))", true, "#307D32", null)
			this.addFeatureTrack("CDS - REV", this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(strand,%22-%22))", false, "#833B76", null)

			var fillFn = function(item){
				switch(item.feature_type){
					case "pseudogene":
						return "#75DF6F";
					case "tRNA":
						return "#3F76DF";
					case "rRNA":
						return "#DFC63A";
					default:
						return "#21DFD7";
				}
			};
			this.addFeatureTrack("Non-CDS Features", this.state.genome_ids[0], "and(eq(annotation,PATRIC),ne(feature_type,CDS))", null, fillFn, null, {
				fill: null,
				stroke: null
			});
			// this.addFeatureTrack("Pseudogenes",this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,pseudogene))", null, [77, 83, 233], null, {stroke: "", fill: "#eeeeee"})
			// this.addFeatureTrack("tRNA", this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,tRNA))", null, [162, 0, 152], null, {stroke: ""})
			// this.addFeatureTrack("rRNA", this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,rRNA))", null, [243, 110, 0], null, {stroke: "",fill: "#eeeeee"})

			var gcContentTrack = this.viewer.addTrack({
				type: LineTrack,

				options: {
					title: "GC Content",
					loadingText: "LOADING GC CONTENT",
					visible: false,
					max: 1,
					min: 0,
					trackWidth: 0.18,
					stroke: {width: .5, color: "black"},
					gap: 1,
					background: {fill: "#EBD4F4", stroke: null}
				}
			}, "outer");

			var gcSkewTrack = this.viewer.addTrack({
				type: LineTrack,
				options: {
					title: "GC Skew",
					loadingText: "LOADING GC SKEW",
					visible: false,
					max: 1,
					min: -1,
					scoreProperty: "skew",
					trackWidth: 0.1,
					stroke: {width: .5, color: "black"},
					gap: 1,
					background: {fill: "#F3CDA0", stroke: null}
				}
			}, "outer");

			this.getReferenceSequences(this.genome_id, true).then(lang.hitch(this, function(data){
				var gcContentData = this.getGCContent(data);
				// console.log("GC CONTENT: ", gcContentData);
				gcContentTrack.set('data', gcContentData)
				gcSkewTrack.set('data', gcContentData)
			}))
		},

		getGCContent: function(data, windowSize){
			windowSize = windowSize || 400;

			var gcData = [];

			function calculateGC(accession, seq, ws){
				var cur = seq;
				var slen = seq.length;
				var gc = [];
				var current = 0;
				for(current = 0; current < seq.length; current += ws){
					var win = seq.substr(current, ws).toUpperCase();
					var wl = win.length;
					var G = 0;
					var C = 0;
					var gs = win.match(/G/g || []);
					if(gs){
						G = gs.length;
					}

					var cs = win.match(/C/g || []);
					if(cs){
						C = cs.length;
					}

					var GC = G + C; // for skew, (G-C)/(G+C), G+C can't be 0
					if(GC == 0){
						GC = 1;
					}
					gcData.push({
						accession: accession,
						score: (G + C) / wl,
						skew: (G - C) / GC,
						start: current,
						end: current + wl
					});
				}
				return gc;
			}

			data.forEach(function(contig){
				calculateGC(contig.accession, contig.sequence, windowSize);
			});
			return gcData
		},

		onSetState: function(attr, oldVal, state){
			// console.log("CircularViewerContainer onSetState", state);
			if(state.genome_ids && state.genome_ids[0]){
				this.set("genome_id", state.genome_ids[0]);
			}
		},

		postCreate: function(){
			this.inherited(arguments);
			this.watch("state", lang.hitch(this, "onSetState"));
			this.watch("genome_id", lang.hitch(this, "onSetGenomeId"));
			this.watch("referenceSequences", lang.hitch(this, "onSetReferenceSequences"));
		},

		visible: false,
		_setVisibleAttr: function(visible){
			// console.log("GridContainer setVisible: ", visible)
			this.visible = visible;
			if(this.visible && !this._firstView){
				// console.log("Trigger First View: ", this.id)
				this.onFirstView();
				this._firstView = true;
			}
		},

		onFirstView: function(){
			// console.log("onFirstView()");
			if(this._firstView){
				return;
			}
			if(!this.controlPanel){
				this.controlPanel = new TrackController({region: "left", splitter: true, style: "width:250px;"});
			}

			if(!this.viewer){
				this.viewer = new CirculusViewer({
					region: "center",
					centerRadius: 100
				});
			}

			this.addChild(this.controlPanel);
			this.addChild(this.viewer);
		}
	});
});

