require({cache:{
'url:p3/widget/app/templates/SeqComparison.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div class=\"appTemplate\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Proteome Comparison\n              <div name=\"overview\" class=\"infobox iconbox infobutton dialoginfo\">\n                  <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n              </div>\n              <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n                <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n              </div>\n            </h3>\n            <p>Protein sequence-based comparison using bi-directional BLASTP.</p>\n        </div>\n\n        <div class=\"formFieldsContainer\">\n            <div style=\"display: none;\">\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\"\n                       data-dojo-attach-point=\"numgenomes\" data-dojo-props=\"constraints:{min:1,max:10},\"/>\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\"\n                       data-dojo-attach-point=\"numref\" data-dojo-props=\"constraints:{min:0},\"/>\n            </div>\n\n            <table class=\"assemblyblocks\">\n                <tr>\n                    <td style=\"width:50%\">\n                        <table>\n                            <tr>\n                                <td>\n\n                                    <div class=\"appBox appShadow\">\n                                        <div class=\"headerrow\">\n                                            <div style=\"width:85%;display:inline-block;\">\n                                                <label class=\"appBoxLabel\">Parameters</label>\n                                                <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n                                                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                                                </div>\n                                            </div>\n                                        </div>\n\n                                        <div class=\"appRow\">\n                                            <div class=\"appRow\" data-dojo-attach-point=\"advanced\">\n                                                <label>Advanced Parameters (optional)</label>\n                                                <div class=\"iconbox\" style=\"margin-left:0px\">\n                                                    <i data-dojo-attach-point=\"advicon\"\n                                                       class=\"fa icon-caret-down fa-1\"></i>\n                                                </div>\n                                            </div>\n                                        </div>\n                                        <div class=\"appRow\" data-dojo-attach-point=\"advrow\" style=\"display: none\">\n                                            <div class=\"halfAppRow\">\n                                                <label class=\"paramlabel\">Minimum %\n                                                    coverage</label></br>\n                                                <div class=\"insertspinner\" name=\"min_seq_cov\"\n                                                     data-dojo-type=\"dijit/form/NumberSpinner\" value=\"30\"\n                                                     data-dojo-attach-point=\"insert_size_mean\"\n                                                     data-dojo-props=\"smallDelta:5, constraints:{min:10,max:100,places:0}\"></div>\n                                            </div>\n                                            <div class=\"half2AppRow\">\n                                                <label class=\"paramlabel\">Blast E-value</label></br>\n                                                <div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"max_e_val\"\n                                                     value=\"1e-5\" style=\"width:100%\" required=\"false\"\n                                                     data-dojo-props=\"intermediateChanges:true,promptMessage:'E value is optional, default is set to 1e-5',missingMessage:'E value is optional, default is set to 1e-5.',trim:true,placeHolder:'1e-5'\"></div>\n                                            </div>\n                                            <div class=\"halfAppRow\">\n                                                <label class=\"paramlabel\">Minimum %\n                                                    identity</label></br>\n                                                <div class=\"insertspinner\" name=\"min_ident\"\n                                                     data-dojo-type=\"dijit/form/NumberSpinner\" value=\"10\"\n                                                     data-dojo-attach-point=\"min_ident\"\n                                                     data-dojo-props=\"smallDelta:5, constraints:{min:10,max:100,places:0}\"></div>\n                                            </div>\n                                        </div>\n                                        <div class=\"appRow\">\n                                            <label class=\"paramlabel\">Output Folder</label></br>\n                                            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\"\n                                                 data-dojo-attach-point=\"output_path\" required=\"true\"\n                                                 data-dojo-props=\"type:['folder'],multi:false\"\n                                                 data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n                                        </div>\n                                        <div class=\"appRow\">\n                                            <label class=\"paramlabel\">Output Name</label></br>\n                                            <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\"\n                                                 name=\"output_file\" data-dojo-attach-point=\"output_file\"\n                                                 style=\"width:85%\" required=\"true\"\n                                                 data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n                                        </div>\n\n                                    </div>\n\n                                </td>\n                            </tr>\n                            <tr>\n                                <td>\n                                    <div class=\"appBox appShadow\">\n                                        <div class=\"headerrow\">\n                                            <div style=\"width:85%;display:inline-block;\">\n                                                <label class=\"appBoxLabel\">Reference Genome</label>\n                                                <div name=\"reference-genome-selection\" class=\"infobox iconbox infobutton dialoginfo\">\n                                                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                                                </div>\n                                            </div>\n                                        </div>\n                                        <div class=\"appRow\">\n                                            <label>Select one reference genome from the following options:</label></br>\n                                            <label>Select a genome</label></br>\n                                            <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                                                 data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"ref_genome_id\"\n                                                 maxHeight=200 style=\"width:85%\" required=\"false\"\n                                                 data-dojo-attach-point=\"ref_genome_id\"></div>\n                                            </br>\n                                            <label>or a fasta file</label></br>\n                                            <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                                                 data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n                                                 name=\"ref_user_genomes_fasta\" style=\"width:100%\" required=\"false\"\n                                                 data-dojo-attach-point=\"ref_user_genomes_fasta\"\n                                                 data-dojo-props=\"type:['feature_protein_fasta'],multi:false,promptMessage:'Select or Upload protein fasta file to your workspace for Comparison',missingMessage:'User genome file is optional.', placeHolder:'Optional'\"></div>\n                                            <label>or a feature group</label></br>\n                                            <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                                                 data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"\n                                                 name=\"ref_user_genomes_featuregroup\" style=\"width:100%\"\n                                                 required=\"false\" data-dojo-attach-point=\"ref_user_genomes_featuregroup\"\n                                                 data-dojo-props=\"type:['feature_group'],multi:false,promptMessage:'Select a feature group',missingMessage:'Feature group is optional.', placeHolder:'Optional'\"></div>\n                                        </div>\n                                    </div>\n\n                                </td>\n                            </tr>\n                        </table>\n\n                    </td>\n                    <td>\n                        <div class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:90%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\">Comparison Genomes</label>\n                                    <div name=\"comparison-genomes-selection\" class=\"infobox iconbox infobutton dialoginfo\">\n                                        <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                                    </div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label>ADD UP TO 9 GENOMES TO COMPARE (USE PLUS BUTTONS TO ADD)</label></br>\n                                <label>Select genome</label></br>\n                                <div style=\"width:85%;display:inline-block;\"\n                                     data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                                     data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"comp_genome_id\" maxHeight=200\n                                     required=\"false\" data-dojo-attach-point=\"comp_genome_id\"\n                                     data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\"></div>\n                                <div style=\"width:10%;display:inline-block;\"><i\n                                        data-dojo-attach-event=\"click:onAddGenome\"\n                                        class=\"fa icon-plus-circle fa-lg\"></i></div>\n                                </br>\n                                <label>And/or select fasta file</label></br>\n                                <div style=\"width:85%;display:inline-block;\"\n                                     data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"user_genomes_fasta\"\n                                     required=\"false\" data-dojo-attach-point=\"user_genomes_fasta\"\n                                     data-dojo-props=\"type:['feature_protein_fasta'],multi:false,promptMessage:'Select or Upload protein fasta file to your workspace for Comparison',missingMessage:'User genome file is optional.', placeHolder:'Optional'\"></div>\n                                <div style=\"width:10%;display:inline-block;\"><i\n                                        data-dojo-attach-event=\"click:onAddFasta\" class=\"fa icon-plus-circle fa-lg\"></i>\n                                </div>\n                                </br>\n                                <label>And/or select feature group</label></br>\n                                <div style=\"width:85%;display:inline-block;\"\n                                     data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"user_genomes_featuregroup\"\n                                     required=\"false\" data-dojo-attach-point=\"user_genomes_featuregroup\"\n                                     data-dojo-props=\"type:['feature_group'],multi:false,promptMessage:'Select a feature group from your workspace for Comparison',missingMessage:'Feature group is optional.', placeHolder:'Optional'\"></div>\n                                <div style=\"width:10%;display:inline-block;\"><i\n                                        data-dojo-attach-event=\"click:onAddFeatureGroup\"\n                                        class=\"fa icon-plus-circle fa-lg\"></i></div>\n                                </br>\n                            </div>\n\n                            <div class=\"appRow\">\n                                <label> selected genome table</label>\n                            </div>\n\n                            <div class=\"appRow\" style=\"width:90%; margin-top:10px; text-align: center;\">\n                                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"genomeTable\"\n                                       style='margin:0 0 0 10px; width:100%;'>\n                                    <tbody data-dojo-attach-point=\"genomeTableBody\">\n\n                                    </tbody>\n                                </table>\n                            </div>\n\n                        </div>\n                    </td>\n                </tr>\n            </table>\n        </div>\n    </div>\n\n    <div class=\"appSubmissionArea\">\n\n        <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\"\n             style=\"margin-top:10px; text-align:center;\">\n            Comparing Genomes\n        </div>\n        <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\"\n             style=\"margin-top:10px; text-align:center;\">\n            Error Submitting Job. Please check the submission form and make sure that ONE reference genome is selected.\n        </div>\n        <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\"\n             style=\"margin-top:10px; text-align:center;\">\n            Proteome Comparison should be finished shortly. Check workspace for results.\n        </div>\n        <div style=\"margin-top: 10px; text-align:center;\">\n            <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n            <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n        </div>\n    </div>\n</form>\n"}});
define("p3/widget/app/SeqComparison", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/SeqComparison.html", "./AppBase", "dojo/dom-construct", "dijit/registry",
	"dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "dojo/domReady!", "dijit/form/NumberTextBox",
	"dojo/query", "dojo/dom", "dijit/popup", "dijit/Tooltip", "dijit/Dialog", "dijit/TooltipDialog",
	"dojo/NodeList-traverse", "../../WorkspaceManager", "dojo/store/Memory", "dojox/widget/Standby"
], function(declare, WidgetBase, on,
			domClass,
			Template, AppBase, domConstruct, registry,
			Deferred, aspect, lang, domReady, NumberTextBox,
			query, dom, popup, Tooltip, Dialog, TooltipDialog,
			children, WorkspaceManager, Memory, Standby){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		templateString: Template,
		applicationName: "GenomeComparison",
		applicationHelp: "user_guide/genome_data_and_tools/proteome_comparison_service.html",
		tutorialLink: "tutorial/proteome_comparison/proteome_comparison.html",
		pageTitle: "Proteome Comparison",
		defaultPath: "",
		startingRows: 9,
		maxGenomes: 9,

		constructor: function(){
			this._selfSet = true;
			this.addedGenomes = 0;
			this.genomeToAttachPt = ["comp_genome_id"];
			this.fastaToAttachPt = ["user_genomes_fasta"];
			this.featureGroupToAttachPt = ["user_genomes_featuregroup"];
			this.numref = 0;
		},

		startup: function(){
			var _self = this;
			if(this._started){
				return;
			}
			this.inherited(arguments);

			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.output_path.set('value', _self.defaultPath);

			this.numref = 0;
			this.emptyTable(this.genomeTable, this.startingRows);
			this.numgenomes.startup();
			this.advrow.turnedOn = (this.advrow.style.display != 'none');
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
			this._started = true;
		},

		emptyTable: function(target, rowLimit){
			for(i = 0; i < rowLimit; i++){
				var tr = target.insertRow(0);//domConstr.create("tr",{},this.genomeTableBody);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
		},

		ingestAttachPoints: function(input_pts, target, req){
			req = typeof req !== 'undefined' ? req : true;
			var success = 1;
			input_pts.forEach(function(attachname){
				var cur_value = null;
				var incomplete = 0;
				var browser_select = 0;
				if(attachname == "output_path" || attachname == "ref_user_genomes_fasta" || attachname == "ref_user_genomes_featuregroup"){
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					browser_select = 1;
				}
				else if(attachname == "user_genomes_fasta"){
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					var compGenomeList = query(".genomedata");
					var genomeIds = [];

					compGenomeList.forEach(function(item){
						genomeIds.push(item.genomeRecord.user_genomes_fasta)
					});

					if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
					{
						success = 0;
					}
				}
				else if(attachname == "user_genomes_featuregroup"){
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					var compGenomeList = query(".genomedata");
					var genomeIds = [];

					compGenomeList.forEach(function(item){
						genomeIds.push(item.genomeRecord.user_genomes_featuregroup)
					});

					if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
					{
						success = 0;
					}
				}
				else if(attachname == "comp_genome_id"){
					var compGenomeList = query(".genomedata");
					var genomeIds = [];

					compGenomeList.forEach(function(item){
						genomeIds.push(item.genomeRecord.comp_genome_id)
					});

					cur_value = this[attachname].value;

					//console.log("genomeIds = " + genomeIds + " cur_value = " + cur_value + " index = " +genomeIds.indexOf(cur_value));
					if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1)  // no same genome ids are allowed
					{
						success = 0;
					}
				}
				else{
					cur_value = this[attachname].value;
				}

				console.log("cur_value=" + cur_value);

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

		onSuggestNameChange: function(){
			if (this.ref_genome_id.get('value') || this.ref_user_genomes_fasta.get('value') || this.ref_user_genomes_featuregroup.get('value')) {
				this.numref = 1;
			} else {
				this.numref = 0;
			}
			//console.log("change genome name, this.numref=", this.numref, "this.ref_genome_id.get('value')=", this.ref_genome_id.get('value'));
		},

		makeGenomeName: function(){
			var name = this.comp_genome_id.get("displayedValue");
			var maxName = 36;
			var display_name = name;
			if(name.length > maxName){
				display_name = name.substr(0, (maxName / 2) - 2) + "..." + name.substr((name.length - (maxName / 2)) + 2);
			}

			return display_name;
		},

		makeFastaName: function(){
			var name = this.user_genomes_fasta.searchBox.get("displayedValue");
			var maxName = 36;
			var display_name = name;

			if(name.length > maxName){
				display_name = name.substr(0, (maxName / 2) - 2) + "..." + name.substr((name.length - (maxName / 2)) + 2);
			}

			return display_name;
		},

		makeFeatureGroupName: function(){
			var name = this.user_genomes_featuregroup.searchBox.get("displayedValue");
			var maxName = 36;
			var display_name = name;
			//console.log("this.user_genomes_featuregroup name = " + this.name);

			if(name.length > maxName){
				display_name = name.substr(0, (maxName / 2) - 2) + "..." + name.substr((name.length - (maxName / 2)) + 2);
			}

			return display_name;
		},

		increaseGenome: function(){
			this.addedGenomes = this.addedGenomes + 1;
			this.numgenomes.set('value', Number(this.addedGenomes));

		},
		decreaseGenome: function(){
			this.addedGenomes = this.addedGenomes - 1;
			this.numgenomes.set('value', Number(this.addedGenomes));
		},

		onAddGenome: function(){
			//console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);
			//console.log("this.genomeToAttachPt = " + this.genomeToAttachPt);
			//console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
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
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseGenome();
					if(this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseGenome();
			}
			//console.log(lrec);
		},

		onAddFasta: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.fastaToAttachPt, lrec);
			//console.log("this.fastaToAttachPt = " + this.fastaToAttachPt);
			//console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
			if(chkPassed && this.addedGenomes < this.maxGenomes){
				var tr = this.genomeTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol genomedata", innerHTML: ""}, tr);
				td.genomeRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeFastaName() + "</div>";
				var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedGenomes < this.startingRows){
					this.genomeTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseGenome();
					if(this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseGenome();
			}
			//console.log(lrec);
		},

		onAddFeatureGroup: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.featureGroupToAttachPt, lrec);
			//console.log("this.featureGroupToAttachPt = " + this.featureGroupToAttachPt);
			//console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
			if(chkPassed && this.addedGenomes < this.maxGenomes){
				var tr = this.genomeTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol genomedata", innerHTML: ""}, tr);
				td.genomeRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeFeatureGroupName() + "</div>";
				var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedGenomes < this.startingRows){
					this.genomeTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseGenome();
					if(this.addedGenomes < this.startingRows){
						var ntr = this.genomeTable.insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseGenome();
			}
			//console.log(lrec);
		},

		onSubmit: function(evt){
			var _self = this;

			evt.preventDefault();
			evt.stopPropagation();
			if(this.validate()){
				var values = this.getValues();
				//console.log("user_genomes ", values["user_genomes"]);
				//console.log("user_feature_groups ", values["user_feature_groups"]);
				//console.log("genome_ids ", values["genome_ids"]);
				//console.log("reference_genome_index ", values["reference_genome_index"]);
				var numUserGenome = 0;

				if (values["user_genomes"]) {
					numUserGenome += values["user_genomes"].length;
				}
				if (values["user_feature_groups"]) {
					numUserGenome += values["user_feature_groups"].length;
				}
				if (values["genome_ids"]) {
					numUserGenome += values["genome_ids"].length;
				}

				if(numUserGenome>1 && values["reference_genome_index"] > 0){
					domClass.add(this.domNode, "Working");
					domClass.remove(this.domNode, "Error");
					domClass.remove(this.domNode, "Submitted");

					if(window.App.noJobSubmission){
						var dlg = new Dialog({
							title: "Job Submission Params: ",
							content: "<pre>" + JSON.stringify(values, null, 4) + "</pre>"
						});
						dlg.startup();
						dlg.show();
						return;
					}
					this.submitButton.set("disabled", true);
					window.App.api.service("AppService.start_app", [this.applicationName, values]).then(function(results){
						console.log("Job Submission Results: ", results);
						domClass.remove(_self.domNode, "Working")
						domClass.add(_self.domNode, "Submitted");
						_self.submitButton.set("disabled", false);
						registry.byClass("p3.widget.WorkspaceFilenameValidationTextBox").forEach(function(obj){
							obj.reset();
						});
					}, function(err){
						console.log("Error:", err)
						domClass.remove(_self.domNode, "Working");
						domClass.add(_self.domNode, "Error");
						_self.errorMessage.innerHTML = err;
					})
				}else{
					domClass.add(this.domNode, "Error");
					console.log("Form is incomplete");
				}

			}else{
				domClass.add(this.domNode, "Error");
				console.log("Form is incomplete");
			}
		},

		getValues: function(){
			var seqcomp_values = {};
			var values = this.inherited(arguments);
			var compGenomeList = query(".genomedata");
			var genomeIds = [];
			var userGenomes = [];
			var featureGroups = [];
			var refType = "";
			var refIndex = 0;

			if(values["ref_genome_id"]){
				refType = "ref_genome_id";
				genomeIds.push(values["ref_genome_id"]);
			}
			else if(values["ref_user_genomes_fasta"]){
				refType = "ref_user_genomes_fasta";
				userGenomes.push(values["ref_user_genomes_fasta"]);
			}
			else if(values["ref_user_genomes_featuregroup"]){
				refType = "ref_user_genomes_featuregroup";
				featureGroups.push(values["ref_user_genomes_featuregroup"]);
			}

			compGenomeList.forEach(function(item){
				if(item.genomeRecord.comp_genome_id){
					genomeIds.push(item.genomeRecord.comp_genome_id);
				}
			});

			compGenomeList.forEach(function(item){
				if(item.genomeRecord.user_genomes_fasta){
					userGenomes.push(item.genomeRecord.user_genomes_fasta);
				}
			});

			compGenomeList.forEach(function(item){
				if(item.genomeRecord.user_genomes_featuregroup){
					featureGroups.push(item.genomeRecord.user_genomes_featuregroup);
				}
			});

			//console.log("compGenomeList = " + compGenomeList);
			//console.log("ref genome = " + values["ref_genome_id"]);

			seqcomp_values["genome_ids"] = genomeIds;
			if(userGenomes.length > 0){
				seqcomp_values["user_genomes"] = userGenomes;
			}

			if(featureGroups.length > 0){
				seqcomp_values["user_feature_groups"] = featureGroups;
			}

			if(refType == "ref_genome_id"){
				refIndex = 1;
			}
			else if(refType == "ref_user_genomes_fasta"){
				refIndex = genomeIds.length + 1;
			}
			else if(refType == "ref_user_genomes_featuregroup"){
				refIndex = genomeIds.length + userGenomes.length + 1;
			}

			seqcomp_values["reference_genome_index"] = refIndex;

			if(values["min_seq_cov"]){
				seqcomp_values["min_seq_cov"] = values["min_seq_cov"] / 100;
			}
			if(values["max_e_val"]){
				seqcomp_values["max_e_val"] = values["max_e_val"];
			}
			if(values["min_ident"]){
				seqcomp_values["min_ident"] = values["min_ident"] / 100;
			}

			seqcomp_values["output_path"] = values["output_path"];
			seqcomp_values["output_file"] = values["output_file"];

			return seqcomp_values;
		}

	});
});
