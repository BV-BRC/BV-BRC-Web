define([
	"dojo/_base/declare", "dojo/_base/lang", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dojo/dom-construct", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/BLAST.html", "dijit/form/Form", "../../util/PathJoin",
	"dojo/request", "dojo/dom", "dojo/query",
	"dojo/store/Memory", "dojo/store/Observable", "dgrid/OnDemandGrid", "dgrid/Selection", "dgrid/selector"
], function(declare, lang, WidgetBase, on,
			domClass, domConstruct, Templated, WidgetsInTemplate,
			Template, FormMixin, PathJoin,
			xhr, dom, query,
			Memory, Observable, Grid, Selection, selector){
	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "BLAST",
		templateString: Template,
		path: "",
		addedGenomes: 0,
		maxGenomes: 20,
		startingRows: 5,
		result_grid: undefined,
		result_store: undefined,
		constructor: function(){
			this.genomeToAttachPt = ["genome_id"];
		},

		startup: function(){
			this.emptyTable(this.genomeTable, this.startingRows);

			on(this.advanced, 'click', lang.hitch(this, function(){
				this.advrow.turnedOn = (this.advrow.style.display != 'none');
				if(!this.advrow.turnedOn){
					this.advrow.turnedOn = true;
					this.advrow.style.display = 'block';
					this.advicon.className = "fa icon-caret-left fa-1";
				}
				else{
					this.advrow.turnedOn = false;
					this.advrow.style.display = 'none';
					this.advicon.className = "fa icon-caret-down fa-1";
				}
			}));
		},

		validate: function(){
			if(this.sequence.get('value') && (this.sequence.get('value')).length > 1
				&& (/*this.database.get('value') != "" || */ this.addedGenomes > 0)
				&& this.program.get('value')){
				this.mapButton.set('disabled', false);
				return true;
			}else{
				this.mapButton.set('disabled', true);
				return false;
			}
		},

		submit: function(){
			var _self = this;
			var q = {};
			q.program = _self.program.get('value');
			q.parameters = [];
			q.output_format = "tabular";
			q.evalue = _self.evalue.get('value');
			q.max_hits = parseInt(_self.max_hits.get('value'));
			q.min_coverage = 70;

			q.query = _self.sequence.get('value');
			//q.subject_database = this.database.get('value');
			q.subject_genome = [];
			query(".genomedata").forEach(function(item){
				q.subject_genome.push(item.genomeRecord.genome_id);
			});

			xhr.post("https://p3.theseed.org/services/similarity_service_rest/search", {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Content-Type": "application/x-www-form-urlencoded"
				},
				data: JSON.stringify(q)
			}).then(function(res){

				var data = _self.parseTabularOutput(res);
				_self.buildGridOutput(data);

			}, function(err){
				_self.buildErrorMessage(err);
			});
		},
		buildErrorMessage: function(err){
			query("#blast_result")[0].innerHTML = err.response.data;
		},
		buildGridOutput: function(data){

			if(this.result_grid != undefined){
				this.result_grid.destroy();
				domConstruct.create('div', {id: "blast_result"}, "blast_result_wrapper");

			}
			this.result_store = new (declare([Memory, Observable]))({
				data: data,
				idProperty: "sseqid",
				queryOptions: {
					sort: [{attribute: "pident"}]
				}
			});
			this.result_grid = new (declare([Grid, Selection]))({
				selectionMode: 'single',
				store: this.result_store,
				columns: {
					cb: selector({label: ''}),
					query_seq_id: {label: 'Query Seq ID', field: "qseqid"},
					subject_seq_id: {label: 'Subject Seq ID', field: "sseqid"},
					percent_identical_matches: {label: '% Identical Matches', field: "pident"},
					align_length: {label: 'Alignment Length', field: "length"},
					mis_match: {label: 'Num. mis-matches', field: "mismatch"},
					gap_open: {label: 'Num. gap openings', field: "gapopen"},
					q_start: {label: 'Start in Query', field: 'qstart'},
					q_end: {label: 'End in Query', field: 'qend'},
					s_start: {label: 'Start in Subject', field: 'sstart'},
					s_end: {label: 'End in Subject', field: 'send'},
					e_value: {label: 'e-value', field: 'evalue'},
					bit_score: {label: 'bit score', field: 'bitscore'}
				}
			}, 'blast_result');

		},

		/*formatJSONResult: function(json){
			console.log(json);
			var root = json[0][0].report.results.search;
			var hits = root.hits;
			var query_id = root.query_id;
			var metadata = json[1];
			var identical = json[2] || {};

			var entries = [];
			hits.forEach(function(hit, index){
				//console.log(hit);
				var target_id = hit.description[0].id;
				entries.push({
					"qseqid": query_id,
					"sseqid": target_id,
					"pident": parseInt(Number(hit.hsps[0].identity / hit.len * 10000))/100,
					"length": hit.len,
					"qstart": hit.hsps[0].query_from,
					"qend": hit.hsps[0].query_to,
					"sstart": hit.hsps[0].hit_from,
					"send": hit.hsps[0].hit_to,
					"evalue": hit.hsps[0].evalue,
					"bitscore": Math.round(hit.hsps[0].bit_score),
					"genome_id": metadata[target_id].genome_id,
					"genome_name": metadata[target_id].genome_name,
					"function": metadata[target_id].function,
					"detail": {
						"match_count": metadata[target_id].match_count || 0,
						"matches": identical[target_id] || [],
						"qseq": hit.hsps[0].qseq,
						"hseq": hit.hsps[0].hseq,
						"midline": hit.hsps[0].midline
					}
				});
			});
			return entries;
		},*/
		parseTabularOutput: function(output){
			var lines = output.split('\n');
			var entries = [];
			lines.forEach(function(line){
				var cols = line.split('\t');
				if(cols.length > 1){
					entries.push({
						"qseqid": cols[0],
						"sseqid": cols[1],
						"pident": Number(cols[2]),
						"length": Number(cols[3]),
						"mismatch": cols[4],
						"gapopen": cols[5],
						"qstart": Number(cols[6]),
						"qend": Number(cols[7]),
						"sstart": Number(cols[8]),
						"send": Number(cols[9]),
						"evalue": cols[10],
						"bitscore": cols[11]
					});
				}
			});
			return entries;
		},

		onSuggestNameChange: function(){
			// TODO: implement
			this.validate();
		},

		onAddGenome: function(){

			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);

			if(chkPassed && this.addedGenomes < this.maxGenomes){
				var tr = this.genomeTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol genomedata", innerHTML: ""}, tr);
				td.genomeRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName() + "</div>";
				var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedGenomes < this.startingRows){
					this.genomeTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					domConstruct.destroy(tr);
					this.decreaseGenome();
					if(this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);
						domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseGenome();
			}
		},

		ingestAttachPoints: function(input_pts, target, req){
			req = typeof req !== 'undefined' ? req : true;
			var success = 1;
			input_pts.forEach(function(attachname){
				var incomplete = 0;
				var browser_select = 0;

				var compGenomeList = query(".genomedata");
				var genomeIds = [];

				compGenomeList.forEach(function(item){
					genomeIds.push(item.genomeRecord.genome_id)
				});

				var cur_value = this[attachname].value;

				//console.log("genomeIds = " + genomeIds + " cur_value = " + cur_value + " index = " +genomeIds.indexOf(cur_value));
				if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
				{
					success = 0;
				}

				if(typeof(cur_value) == "string"){
					target[attachname] = cur_value.trim();
				}
				else{
					target[attachname] = cur_value;
				}
				if(req && (!target[attachname] || incomplete)){
					if(browser_select){
						this[attachname].searchBox.validate(); //this should be whats done but it doesn't actually call the new validator
						this[attachname].searchBox._set("state", "Error");
						this[attachname].focus = true;
					}
					success = 0;
				}
				else{
					this[attachname]._set("state", "");
				}
				if(target[attachname] != ""){
					target[attachname] = target[attachname] || undefined;
				}
				else if(target[attachname] == "true"){
					target[attachname] = true;
				}
				else if(target[attachname] == "false"){
					target[attachname] = false;
				}
			}, this);
			return (success);
		},

		makeGenomeName: function(){
			var name = this.genome_id.get("displayedValue");
			var maxName = 50;
			var display_name = name;
			if(name.length > maxName){
				display_name = name.substr(0, (maxName / 2) - 2) + "...." + name.substr((name.length - (maxName / 2)) + 2);
			}

			return display_name;
		},

		increaseGenome: function(){
			this.addedGenomes = this.addedGenomes + 1;
			//this.nuMgenomes.set('value', Number(this.addedGenomes));

		},

		decreaseGenome: function(){
			this.addedGenomes = this.addedGenomes - 1;
			//this.numgenomes.set('value', Number(this.addedGenomes));
		},

		emptyTable: function(target, rowLimit){
			for(var i = 0; i < rowLimit; i++){
				var tr = target.insertRow(0); //domConstr.create("tr",{},this.genomeTableBody);
				domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
		},

		onChangeDatabase: function(val){
			this.validate();
		},
		//onChangeOrganism: function(val){
		//	this.validate();
		//},
		onChangeSequence: function(val){
			this.validate();
		}
	});
});
