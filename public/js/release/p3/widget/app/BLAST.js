require({cache:{
'url:p3/widget/app/templates/BLAST.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div class=\"appTemplate\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>BLAST</h3>\n            <p>The BLAST Search allows you to search against public or private genomes in PATRIC or other reference\n                databases using a DNA or protein sequence and find matching genomes, genes, RNAs, or proteins.</p>\n        </div>\n\n        <div class=\"service_form\">\n            <div class=\"appBox appShadow\">\n                <div class=\"headerrow\" style=\"margin-bottom: 7px\">\n                    <label class=\"appBoxLabel\">Sequence</label>\n                </div>\n                <textarea name=\"sequence\"\n                          style=\"width:96%; height:175px; margin-left:10px; font-family: monospace; font-size:12px\"\n                          data-dojo-attach-point=\"sequence\"\n                          data-dojo-type=\"dijit/form/Textarea\"\n                          data-dojo-props=\"rows:13, placeholder:'Enter a query nucleotide or protein sequence to search. Multiple query sequences are currently not supported.', intermediateChanges:true\"\n                          data-dojo-attach-event=\"onChange:onChangeSequence\"></textarea>\n                <div class=\"form_msg_warning\" data-dojo-attach-point=\"sequence_message\"></div>\n\n                <div class=\"headerrow\" style=\"margin-bottom: 7px\">\n                    <label class=\"appBoxLabel\">Program</label>\n                </div>\n                <select name=\"program\" style=\"margin-left:10px; width:96%\"\n                        data-dojo-type=\"dijit/form/Select\"\n                        data-dojo-attach-event=\"onChange:onChangeProgram\"\n                        data-dojo-props=\"disabled:true\"\n                        data-dojo-attach-point=\"program\">\n                </select>\n                <div class=\"form_msg_warning\" data-dojo-attach-point=\"program_message\"></div>\n\n                <div class=\"headerrow\" style=\"margin: 16px 0 7px 0\">\n                    <label class=\"appBoxLabel\">Database</label>\n                </div>\n                <select name=\"database\" style=\"width:96%; margin-left:10px\"\n                        data-dojo-type=\"dijit/form/Select\"\n                        data-dojo-attach-event=\"onChange:onChangeDatabase\"\n                        data-dojo-props=\"disabled:true\"\n                        data-dojo-attach-point=\"database\">\n                </select>\n                <div class=\"form_msg_warning\" data-dojo-attach-point=\"database_message\"></div>\n            </div>\n\n            <div class=\"appRow\" style=\"text-align:center\">\n                <div class=\"appRowSegment\" data-dojo-attach-point=\"advanced\">\n                    <label class=\"largelabel\">Advanced options</label>\n                    <div class=\"iconbox\" style=\"margin-left:0\">\n                        <i data-dojo-attach-point=\"advancedOptionIcon\" class=\"fa icon-caret-down fa-1\"></i>\n                    </div>\n                </div>\n            </div>\n\n            <div data-dojo-attach-point=\"advancedOptions\" style=\"display: none\">\n                <div class=\"appBox appShadow hidden\" data-dojo-attach-point=\"genome_id_wrapper\">\n                    <div class=\"left half\" style=\"vertical-align: top\">\n                        <label class=\"paramlabel\">Add Genomes to Search: </label>\n                        <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                             data-dojo-type=\"p3/widget/GenomeNameSelector\"\n                             data-dojo-attach-point=\"genome_id\"\n                             data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\"\n                             style=\"width:310px;\">\n                        </div>\n                        <div style=\"width:17px; display:inline-block;\">\n                            <i data-dojo-attach-event=\"click:onAddGenome\"\n                               class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                        </div>\n                    </div>\n                    <div class=\"left half\">\n                        <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"genomeTable\"\n                               style='width:330px;'>\n                            <tbody data-dojo-attach-point=\"genomeTableBody\"></tbody>\n                        </table>\n                    </div>\n                    <div class=\"clear\"></div>\n                    <div class=\"form_msg_warning\" data-dojo-attach-point=\"genome_id_message\"></div>\n                </div>\n\n                <div class=\"appBox appShadow hidden\" data-dojo-attach-point=\"genome_group_wrapper\">\n                    <label class=\"paramlabel\">Select genome group: </label><br/>\n                    <div name=\"genome_group\" style=\"width: 650px\"></div>\n                    <div class=\"form_msg_warning\" data-dojo-attach-point=\"genome_group_message\"></div>\n                </div>\n\n                <div class=\"appBox appShadow hidden\" data-dojo-attach-point=\"taxon_wrapper\">\n                    <label class=\"paramlabel\">Select Taxon: </label><br/>\n                    <select name=\"taxon\" style=\"width: 650px\"\n                            data-dojo-type=\"p3/widget/TaxonNameSelector\"\n                            data-dojo-attach-point=\"taxonomy\">\n                    </select>\n                    <div class=\"form_msg_warning\" data-dojo-attach-point=\"taxonomy_message\"></div>\n                </div>\n\n                <div class=\"appBox appShadow hidden\" data-dojo-attach-point=\"search_for_wrapper\">\n                    <label class=\"paramlabel\">Search for: </label><br/>\n                    <select name=\"search_for\" style=\"width:250px\"\n                            data-dojo-type=\"dijit/form/Select\"\n                            data-dojo-attach-point=\"search_for\">\n                    </select>\n                    <div class=\"form_msg_warning\" data-dojo-attach-point=\"search_for_message\"></div>\n                </div>\n\n                <div class=\"appBox appShadow\">\n                    <div class=\"headerrow\">\n                        <label class=\"appBoxLabel\">BLAST Parameters</label>\n                    </div>\n                    <div class=\"left third\">\n                        <label class=\"paramlabel\">Max hits: </label><br/>\n                        <select name=\"max_target\" style=\"width: 100px\"\n                                data-dojo-type=\"dijit/form/Select\"\n                                data-dojo-attach-point=\"max_hits\">\n                            <option value=\"1\">1</option>\n                            <option value=\"10\">10</option>\n                            <option value=\"50\" selected=\"selected\">50</option>\n                            <option value=\"100\">100</option>\n                            <option value=\"500\">500</option>\n                        </select>\n                    </div>\n\n                    <div class=\"left third\">\n                        <label class=\"paramlabel\">E value threshold: </label><br/>\n                        <select name=\"threshold\" type=\"text\" value=\"10\" style=\"width:50px\"\n                               data-dojo-type=\"dijit/form/Select\"\n                               data-dojo-attach-point=\"evalue\">\n                            <option value=\"0.0001\">0.0001</option>\n                            <option value=\"0.001\">0.001</option>\n                            <option value=\"0.01\">0.01</option>\n                            <option value=\"0.1\">0.1</option>\n                            <option value=\"1\">1</option>\n                            <option value=\"10\" selected=\"selected\">10</option>\n                        </select>\n                    </div>\n                    <div class=\"clear\"></div>\n                </div>\n            </div>\n        </div>\n        <div class=\"appSubmissionArea\">\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-type=\"dijit/form/Button\"\n                     data-dojo-attach-point=\"mapButton\"\n                     data-dojo-attach-event=\"onClick:submit\"\n                     data-dojo-props=\"disabled:true\">\n                    Search\n                </div>\n            </div>\n        </div>\n        <div class=\"reSubmitBtn\" style=\"visibility: hidden\"\n             data-dojo-type=\"dijit/form/Button\"\n             data-dojo-attach-event=\"onClick:resubmit\">Edit form and resubmit\n        </div>\n    </div>\n\n    <div class=\"service_error hidden\">\n        <h3></h3>\n        <div class=\"service_message\"></div>\n    </div>\n    <div class=\"blast_result\"></div>\n</form>\n\n"}});
define("p3/widget/app/BLAST", [
	"dojo/_base/declare", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/query", "dojo/dom-class", "dojo/dom-construct", "dojo/dom-style", "dojo/topic",
	"dijit/_WidgetBase", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/BLAST.html", "dijit/form/Form",
	"../viewer/Blast", "../../util/PathJoin", "../../WorkspaceManager", "../WorkspaceObjectSelector"
], function(declare, lang, Deferred,
			on, query, domClass, domConstruct, domStyle, Topic,
			WidgetBase, Templated, WidgetsInTemplate,
			Template, FormMixin,
			BlastResultContainer, PathJoin, WorkspaceManager, WorkspaceObjectSelector){

	var NA = "nucleotide", AA = "protein";

	var ProgramDefs = [
		{
			value: "blastn",
			label: "blastn - search a nucleotide database using a nucleotide query",
			validDatabase: ['.fna', '.ffn', '.frn', 'selGenome', 'selGroup', 'selTaxon'],
			validSearchFor: ["contigs", "features"],
			validQuery: [NA]
		},
		{
			value: "blastp",
			label: "blastp - search protein database using a protein query",
			validDatabase: ['faa', 'selGenome', 'selGroup', 'selTaxon'],
			validSearchFor: ["features"],
			validQuery: [AA]
		},
		{
			value: "blastx",
			label: "blastx - search protein database using a translated nucleotide query",
			validDatabase: ['faa', 'selGenome', 'selGroup', 'selTaxon'],
			validSearchFor: ["features"],
			validQuery: [NA]
		},
		{
			value: "tblastn",
			label: "tblastn - search translated nucleotide database using a protein query",
			validDatabase: ['fna', 'ffn', 'selGenome', 'selGroup', 'selTaxon'],
			validSearchFor: ["contigs", "features"],
			validQuery: [AA]
		},
		{
			value: "tblastx",
			label: "tblastx - search translated nucleotide database using a translated nucleotide query",
			validDatabase: ['fna', 'ffn', 'selGenome', 'selGroup', 'selTaxon'],
			validSearchFor: ["contigs", "features"],
			validQuery: [NA]
		}
	];

	var DatabaseDefs = [
		{value: "ref.fna", label: "Reference or Representative Genomes (fna)"},
		{value: "ref.ffn", label: "Reference or Representative Genome features (ffn)"},
		{value: "ref.faa", label: "Reference or Representative Genome proteins (faa)"},
		{value: "ref.frn", label: "Reference or Representative Genome RNAs features (frn)"},
		{value: "16sRNA.frn", label: "PATRIC 16s RNA Genes (frn)"},
		{value: "transcriptomics.ffn", label: "Transcriptomics Genomes features (ffn)"},
		{value: "transcriptomics.faa", label: "Transcriptomics Genomes proteins (faa)"},
		{value: "plasmid.fna", label: "plasmid contigs (fna)"},
		// {value: "plasmid.ffn", label: "plasmid contigs features (ffn)"},
		// {value: "plasmid.faa", label: "plasmid contigs proteins (faa)"},
		{value: "spgenes.faa", label: "Specialty gene reference proteins (faa)"},
		{value: "selGenome", label: "Search within selected genomes"},
		{value: "selGroup", label: "Search within selected genome group"},
		{value: "selTaxon", label: "Search within selected taxon"}
	];

	var SearchForDefs = [
		{value: "contigs", label: "Genomic sequences (contigs)"},
		{value: "features", label: "Genomic features (genes, proteins or RNAs)"}
	];

	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "BLAST",
		templateString: Template,
		addedGenomes: 0,
		maxGenomes: 20,
		startingRows: 5,
		loadingMask: null,
		result_store: null,
		result_grid: null,
		defaultPath: "",
		constructor: function(){
			this.genomeToAttachPt = ["genome_id"];
		},

		startup: function(){

			// activate genome group selector when user is logged in
			if(window.App.user){
				this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;

				var ggDom = query('div[name="genome_group"]')[0];

				this.genome_group = new WorkspaceObjectSelector();
				this.genome_group.set('path', this.defaultPath);
				this.genome_group.set('type', ['genome_group']);
				this.genome_group.placeAt(ggDom, "only");
			}

			this.emptyTable(this.genomeTable, this.startingRows);

			on(this.advanced, 'click', lang.hitch(this, function(){
				this.toggleAdvanced((this.advancedOptions.style.display == 'none'));
			}));

			this.result = new BlastResultContainer({
				id: this.id + "_blastResult",
				style: "min-height: 700px; visibility:hidden;"
			});
			this.result.placeAt(query(".blast_result")[0]);
			this.result.startup();

			Topic.subscribe("BLAST_UI", lang.hitch(this, function(){
				// console.log("BLAST_UI:", arguments);
				var key = arguments[0], value = arguments[1];

				switch(key){
					case "showErrorMessage":
						this.showErrorMessage(value);
						this.hideResultGridContainer();
						break;
					case "showNoResultMessage":
						this.showNoResultMessage();
						this.hideResultGridContainer();
						break;
					default:
						break;
				}
			}));
		},
		toggleAdvanced: function(flag){
			if(flag){
				this.advancedOptions.style.display = 'block';
				this.advancedOptionIcon.className = "fa icon-caret-left fa-1";
			}
			else{
				this.advancedOptions.style.display = 'none';
				this.advancedOptionIcon.className = "fa icon-caret-down fa-1";
			}
		},

		hasSingleFastaSequence: function(sequence){
			return (sequence.indexOf('>') == sequence.lastIndexOf('>'));
		},

		isNucleotideFastaSequence: function(sequence){
			var patternFastaHeader = /^>.*\n/gi;
			var patternDnaSequence = /[atcgn\n\s]/gi;

			return (sequence.replace(patternFastaHeader, '').replace(patternDnaSequence, '').length === 0);
		},

		validate: function(){
			// console.log("validate", this.sequence.get('value'), (this.sequence.get('value')).length,  this.database.get('value'), this.program.get('value'));

			var sequence = this.sequence.get('value');

			if(sequence && sequence.length > 1
				&& this.database.get('value')
				&& this.program.get('value')
				&& this.hasSingleFastaSequence(sequence)){

				// console.log("validation passed");
				this.mapButton.set('disabled', false);
				return true;
			}else{
				this.mapButton.set('disabled', true);
				return false;
			}
		},

		submit: function(){
			var _self = this;
			var sequence = this.sequence.get('value');
			var database = this.database.get('value');
			var useDatabase = !(["selGenome", "selGroup", "selTaxon"].indexOf(database) > -1);
			var program = this.program.get('value');
			var evalue = this.evalue.get('value');
			var max_hits = parseInt(this.max_hits.get('value'));
			var def = new Deferred();
			var resultType;

			if(useDatabase){
				if(!sequence){
					this.sequence_message.innerHTML = "Sequence is empty";
					return;
				}

				resultType = database.split(".")[1] == "fna" ? "genome_sequence" : "genome_feature";
				if(database == 'spgenes.faa'){
					resultType = 'specialty_genes';
				}

				var q = {
					method: "HomologyService.blast_fasta_to_database",
					params: [encodeURIComponent(sequence), program, database, evalue, max_hits, 0]
				};
				def.resolve(q)
			}else{
				// blast against genomes/groups/taxon
				var genomeIds = [];
				var search_for = this.search_for.get('value');
				resultType = search_for == "contigs" ? "genome_sequence" : "genome_feature";

				switch(database){
					case "selGenome":
						query(".genomedata").forEach(function(item){
							genomeIds.push(item.genomeRecord.genome_id);
						});
						if(genomeIds.length == 0){
							this.genome_id_message.innerHTML = 'No genome has selected. Please use arrow button to collect genomes to search.';
							return;
						}else{
							this.genome_id_message.innerHTML = '';
						}
						var q = {
							method: "HomologyService.blast_fasta_to_genomes",
							params: [sequence, program, genomeIds, search_for, evalue, max_hits, 0]
						};
						def.resolve(q);
						break;
					case "selGroup":
						var path = this.genome_group.get('value');
						// console.log("selGroup", path);
						if(path === ''){
							this.genome_group_message.innerHTML = "No genome group has selected";
							return;
						}

						WorkspaceManager.getObjects(path, false).then(lang.hitch(this, function(objs){

							var genomeIdHash = {};
							objs.forEach(function(obj){
								var data = JSON.parse(obj.data);
								data.id_list.genome_id.forEach(function(d){
									if(!genomeIdHash.hasOwnProperty(d)){
										genomeIdHash[d] = true;
									}
								})
							});
							var genomeIds = Object.keys(genomeIdHash);
							var q = {
								method: "HomologyService.blast_fasta_to_genomes",
								params: [sequence, program, genomeIds, search_for, evalue, max_hits, 0]
							};
							def.resolve(q);
						}));
						break;
					case "selTaxon":
						var taxon = this.taxonomy.get('value');
						if(taxon === ''){
							this.taxonomy_message.innerHTML = 'No taxon has selected';
							return;
						}

						var q = {
							method: "HomologyService.blast_fasta_to_taxon",
							params: [sequence, program, taxon, search_for, evalue, max_hits, 0]
						};
						def.resolve(q);
						break;
					default:
						break;
				}
			}

			//
			_self.result.loadingMask.show();
			query(".blast_result .GridContainer").style("visibility", "visible");
			domClass.add(query(".service_form")[0], "hidden");
			domClass.add(query(".appSubmissionArea")[0], "hidden");
			domClass.add(query(".service_error")[0], "hidden");
			query(".reSubmitBtn").style("visibility", "visible");

			def.promise.then(function(q){
				_self.result.set('state', {query: q, resultType: resultType});
			});

		},

		resubmit: function(){
			domClass.remove(query(".service_form")[0], "hidden");
			domClass.remove(query(".appSubmissionArea")[0], "hidden");
			query(".reSubmitBtn").style("visibility", "hidden");
		},

		showErrorMessage: function(err){
			domClass.remove(query(".service_error")[0], "hidden");
			domClass.remove(query(".service_message")[0], "hidden");
			query(".service_error h3")[0].innerHTML = "We were not able to complete your BLAST request. Please let us know with detail message below.";
			query(".service_message")[0].innerHTML = err.response.data.error.message;

			query(".blast_result .GridContainer").style("visibility", "hidden");
		},

		showNoResultMessage: function(){
			domClass.remove(query(".service_error")[0], "hidden");
			query(".service_error h3")[0].innerHTML = "BLAST has no match. Please revise query and submit again.";
			domClass.add(query(".service_message")[0], "hidden");

			query(".blast_result .GridContainer").style("visibility", "hidden");
		},

		hideResultGridContainer: function(){
			domStyle.set(this.result.domNode, 'visibility', 'hidden');
		},

		onSuggestNameChange: function(){
			// console.log("onSuggestNameChange");
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
				display_name = name.substr(0, (maxName / 2) - 2) + "..." + name.substr((name.length - (maxName / 2)) + 2);
			}

			return display_name;
		},

		increaseGenome: function(){
			this.addedGenomes = this.addedGenomes + 1;
		},

		decreaseGenome: function(){
			this.addedGenomes = this.addedGenomes - 1;
		},

		emptyTable: function(target, rowLimit){
			for(var i = 0; i < rowLimit; i++){
				var tr = target.insertRow(0);
				domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
		},

		onChangeSequence: function(val){
			// console.log("onChangeSequence: [", val, "]");
			if(!val){
				this.sequence_message.innerHTML = 'Please provide query sequence.';
				return;
			}
			if(!this.hasSingleFastaSequence(val)){
				this.sequence_message.innerHTML = 'PATRIC BLAST accepts only one sequence at a time. Please provide only one sequence.';
				return;
			}
			this.sequence_message.innerHTML = '';
			if(this.program.isLoaded()){
				this.program.closeDropDown();
			}
			this.program.set('disabled', false);

			var sequence_type = this.isNucleotideFastaSequence(val) ? NA : AA;
			this.program.removeOption(ProgramDefs);
			this.program.addOption(ProgramDefs.filter(function(p){
				return p.validQuery.indexOf(sequence_type) > -1
			}));
			this.program.loadAndOpenDropDown();
		},

		onChangeProgram: function(val){
			// console.log("onChangeProgram: [", val, "]");

			this.database.set('disabled', false);

			var validDatabaseTypes = ProgramDefs.find(function(p){
				return p.value === val
			}).validDatabase;

			// console.log(validDatabaseTypes);
			this.database.removeOption(DatabaseDefs);
			this.database.addOption(DatabaseDefs.filter(function(d){
				return validDatabaseTypes.some(function(t){
					return (d.value).match(t);
				})
			}));

			var validSearchForTypes = ProgramDefs.find(function(p){
				return p.value === val;
			}).validSearchFor;
			// console.log(validSearchForTypes);
			this.search_for.removeOption(SearchForDefs);
			this.search_for.addOption(SearchForDefs.filter(function(s){
				return validSearchForTypes.some(function(t){
					return (s.value).match(t);
				})
			}));

			this.validate();
		},

		onChangeDatabase: function(val){
			if(["selGenome", "selGroup", "selTaxon"].indexOf(val) > -1){
				// show advance options
				this.toggleAdvanced(true);

				domClass.remove(this.search_for_wrapper, "hidden");

				switch(val){
					case "selGenome":
						domClass.remove(this.genome_id_wrapper, "hidden");
						if(this.genome_group){
							domClass.add(this.genome_group_wrapper, "hidden");
						}
						domClass.add(this.taxon_wrapper, "hidden");
						break;
					case "selGroup":
						if(!window.App.user){
							this.database_message.innerHTML = "Please login first to use genome group selection";
							return;
						}

						domClass.add(this.genome_id_wrapper, "hidden");
						if(this.genome_group){
							domClass.remove(this.genome_group_wrapper, "hidden");
						}
						domClass.add(this.taxon_wrapper, "hidden");
						break;
					case "selTaxon":
						domClass.add(this.genome_id_wrapper, "hidden");
						if(this.genome_group){
							domClass.add(this.genome_group_wrapper, "hidden");
						}
						domClass.remove(this.taxon_wrapper, "hidden");
						break;
					default:
						break;
				}
			}else{
				this.toggleAdvanced(false);

				domClass.add(this.search_for_wrapper, "hidden");
				domClass.add(this.genome_id_wrapper, "hidden");
				domClass.add(this.genome_group_wrapper, "hidden");
				domClass.add(this.taxon_wrapper, "hidden");
			}

			this.validate();
		}
	});
});
