define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"./ActionBar","./ContainerActionBar","dijit/layout/TabContainer",
	"dijit/layout/ContentPane","circulus/Viewer","circulus/LineTrack",
	"circulus/SectionTrack","dojo/_base/lang","dojo/request"
], function(
	declare,BorderContainer,on,
	ActionBar, ContainerActionBar,TabContainer,
	ContentPane,CirculusViewer,LineTrack,SectionTrack,lang,xhr
){

	return declare([BorderContainer], {
		gutters: true,
		query: null,
		genome_id: "",
		apiServiceUrl: window.App.dataAPI,

		_setQueryAttr: function(query){
		},

		onSetGenomeId: function(attr,oldVal,gid){
			this.getReferenceSequences(gid).then(lang.hitch(this, function(refseqs){
				this.set("referenceSequences",refseqs)
			}))
		},

		getReferenceSequences: function(gid, includeSequences, refresh){

			var query = "?eq(genome_id," + gid + ")&select(topology,gi,accession,length,sequence_id,gc_content,owner,sequence_type,taxon_id,public,genome_id,genome_name,date_inserted,date_modified" + (includeSequences?",sequence":"")+ ")&sort(+accession)&limit(1000)";

			return xhr.get(this.apiServiceUrl + "/genome_sequence/" + query, {
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
				}).sort(function(a,b){
					return a.name > b.name;
				})
				return refseqs;
			}));
		},

		addFeatureTrack: function(gid, filter, strand,fill,stroke,background){
			var fields=["feature_id","feature_type","sequence_id","segments","gi","na_length","pos_group","strand","public","aa_length","patric_id","owner",
						"location","protein_id","refseq_locus_tag","taxon_id","accession","end", "genome_name", "product","genome_id","annotation","start"]

			var query =  "?and(eq(genome_id," + gid + "),ne(feature_type,source)," + filter + ")&sort(+accession,+start)" + "&select(" + fields.join(",") + ")&limit(25000)";
		

			var track = this.viewer.addTrack({
				type: SectionTrack,
				options: {loading: true, trackWidth: 32,fill: fill, stroke: stroke, gap: 0, background: background},
			})


			return xhr.get(this.apiServiceUrl + "/genome_feature/" + query, {
				headers: {
					accept: "application/json",
					'X-Requested-With': null,
					'Authorization': (window.App.authorizationToken || "")
				},
				handleAs: "json"
			}).then(lang.hitch(this, function(refseqs){
				refseqs = refseqs.filter(function(r){
					if (strand === null){ return true};
					if (strand){
						return r.strand && r.strand=="+"
					}else{
						return r.strand != "+";
					}
				}).map(function(r){
					r.name = r.accession;
					r.length = r.end - r.start;
					return r;
				}).sort(function(a,b){
					return a.name > b.name;
				})

				console.log("Features: ", refseqs)

				track.set("data", refseqs)

				return refseqs;
			}));
		},


		onSetReferenceSequences: function(attr,oldVal, refseqs){
			console.log("RefSeqs: ", refseqs);

			this.viewer.addTrack({
				type: SectionTrack,
				options: {trackWidth: 10,fill: [2, 0, 123], stroke: null, gap: .5, background: {fill: null, stroke: null}},
				data: refseqs
			},"perimeter", true)

			this.addFeatureTrack(this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(strand,\+))", true, [50, 137, 34], null)
			this.addFeatureTrack(this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,CDS),eq(strand,%22-%22))", false, [105, 243, 101], null)
			// this.addFeatureTrack(this.state.genome_ids[0], "ne(feature_type,CDS)", false, [105, 243, 101], null)
			this.addFeatureTrack(this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,pseudogene))", null, [77, 83, 233], null, {stroke: "", fill: "#eeeeee"})
			this.addFeatureTrack(this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,tRNA))", null, [162, 0, 152], null, {stroke: ""})
			this.addFeatureTrack(this.state.genome_ids[0], "and(eq(annotation,PATRIC),eq(feature_type,rRNA))", null, [243, 110, 0], null, {stroke: "",fill: "#eeeeee"})


			var gcContentTrack = this.viewer.addTrack({
				type: LineTrack,
	
				options: {max: 1, min: 0,trackWidth: 75,fill: [2, 0, 123], stroke: {width: .5,color: "black"}, gap: .35, background: {fill: [235, 213, 243], stroke: null}},
			},"outer")

			var gcSkewTrack = this.viewer.addTrack({
				type: LineTrack,
				options: {max: 1, min: -1, scoreProperty: "skew", trackWidth: 32,fill: [2, 0, 123], stroke: {width: .5,color: "black"}, gap: .35, background: {fill: [243, 206, 160], stroke: null}},
			},"outer")

			this.getReferenceSequences(this.genome_id, true).then(lang.hitch(this, function(data){
				var gcContentData = this.getGCContent(data);
				console.log("GC CONTENT: ", gcContentData);
				gcContentTrack.set('data', gcContentData)
				gcSkewTrack.set('data', gcContentData)
			}))
		},

		getGCContent: function(data,windowSize){
			windowSize = windowSize||400;

			var gcData=[]

			function calculateGC(accession, seq,ws){
				var cur = seq;
				var slen = seq.length;
				var gc=[];
				var current=0;
				for(current=0;current<seq.length;current+=ws){
					var win = seq.substr(current,ws);
					var wl = win.length;
					var gcs = win.replace(/A/g,"").replace(/T/g,"");
					var gs = gcs.replace(/C/g,"");
					var G = gs.length;
					var C = gcs.length-G;

					gcData.push({accession: accession, score: gcs.length/wl, skew: (G-C)/(G+C), start: current,end: current+wl});
				}
				return gc;
			}

			data.forEach(function(contig){
					calculateGC(contig.accession, contig.sequence,windowSize);
			})
			return gcData
		},

		onSetState: function(attr,oldVal,state){
			console.log("CircularViewerContainer onSetState", state);
			if (state.genome_ids && state.genome_ids[0]){
				this.set("genome_id", state.genome_ids[0]);
				
				// this.addFeatureTrack(state.genome_ids[0], "eq(feature_type,CDS)", false, [71, 154, 43], null)
				// this.addFeatureTrack(state.genome_ids[0], "eq(feature_type,tRNA)", null, [154, 58, 133], null)
				// this.addFeatureTrack(state.genome_ids[0], "eq(feature_type,pseudogene)", null, [154, 58, 133], null)
				// this.addFeatureTrack(state.genome_ids[0], "eq(feature_type,rRNA)", null, [154, 58, 133], null)
			}
		},

		postCreate: function(){
			this.inherited(arguments);
			this.watch("state", lang.hitch(this, "onSetState"));
			this.watch("genome_id", lang.hitch(this,"onSetGenomeId"));
			this.watch("referenceSequences",lang.hitch(this,"onSetReferenceSequences"));
		},

		visible: false,
		_setVisibleAttr: function(visible) {
			// console.log("GridContainer setVisible: ", visible)
			this.visible = visible;
			if (this.visible && !this._firstView) {
				// console.log("Trigger First View: ", this.id)
				this.onFirstView();
				this._firstView=true;
			}
		},

		onFirstView: function(){
			console.log("onFirstView()")
			if (this._firstView) {
				return;
			}
			if (!this.controlPanel){
				this.controlPanel = new ContentPane({content: "Controller", region: "left",splitter:true, style:"width:175px;"});
			}

			if (!this.viewer){
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

