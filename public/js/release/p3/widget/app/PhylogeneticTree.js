require({cache:{
'url:p3/widget/app/templates/PhylogeneticTree.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div class=\"appTemplate\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Phylogenetic Tree Building\n                <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n                    <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n                </div>\n            </h3>\n            <p>Phylogenetic Tree Building.</p>\n        </div>\n\n        <div class=\"formFieldsContainer\">\n            <div style=\"display: none;\">\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\"\n                       data-dojo-attach-point=\"inGroupNumGenomes\" data-dojo-props=\"constraints:{min:3,max:100},\"/>\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\"\n                        data-dojo-attach-point=\"outGroupNumGenomes\" data-dojo-props=\"constraints:{min:1,max:5},\"/>\n            </div>\n\n            <table class=\"assemblyblocks\">\n                <tr>\n                    <td style=\"width:50%\">\n                        <table>\n                          <tr>\n                              <td>\n\n                                <div class=\"appBox appShadow\">\n                                    <div class=\"headerrow\">\n                                        <div style=\"width:90%;display:inline-block;\">\n                                            <label class=\"appBoxLabel\">Ingroup Genomes</label>\n                                            <div name=\"ingroup-genomes-selection\" class=\"infobox iconbox infobutton dialoginfo\">\n                                                <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                                            </div>\n                                        </div>\n                                    </div>\n                                    <div class=\"appRow\">\n                                        <label>ADD AT LEAST 3 (UP TO 50 ) GENOMES. USE PLUS BUTTONS TO ADD.</label></br>\n                                        <label>Select genome</label></br>\n                                        <div style=\"width:85%;display:inline-block;\"\n                                             data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"in_genome_id\" maxHeight=200\n                                             required=\"false\" data-dojo-attach-point=\"in_genome_id\"\n                                             data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\"></div>\n                                        <div style=\"width:10%;display:inline-block;\"><i\n                                                data-dojo-attach-event=\"click:onAddInGroupGenome\"\n                                                class=\"fa icon-plus-circle fa-lg\"></i></div>\n                                        </br>\n                                        <label>And/or select genome group</label></br>\n                                        <div style=\"width:85%;display:inline-block;\"\n                                             data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"in_genomes_genomegroup\"\n                                             required=\"false\" data-dojo-attach-point=\"in_genomes_genomegroup\"\n                                             data-dojo-props=\"type:['genome_group'],multi:false,promptMessage:'Select a genome group from your workspace',missingMessage:'Genome group is optional.', placeHolder:'Optional'\"></div>\n                                        <div style=\"width:10%;display:inline-block;\"><i\n                                                data-dojo-attach-event=\"click:onAddInGroupGenomeGroup\"\n                                                class=\"fa icon-plus-circle fa-lg\"></i></div>\n                                        </br>\n                                    </div>\n\n                                    <div class=\"appRow\">\n                                        <label> selected ingroup genome table</label>\n                                    </div>\n\n                                    <div class=\"appRow\" style=\"width:90%; margin-top:10px; text-align: center;\">\n                                        <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"inGroupGenomeTable\"\n                                               style='margin:0 0 0 10px; width:100%;'>\n                                            <tbody data-dojo-attach-point=\"inGroupGenomeTableBody\">\n\n                                            </tbody>\n                                        </table>\n                                    </div>\n\n                                </div>\n\n                              </td>\n                          </tr>\n                            <tr>\n                                <td>\n\n                                    <div class=\"appBox appShadow\">\n                                        <div class=\"headerrow\">\n                                            <div style=\"width:85%;display:inline-block;\">\n                                                <label class=\"appBoxLabel\">Parameters</label>\n                                                <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n                                                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                                                </div>\n                                            </div>\n                                        </div>\n\n                                        <div class=\"appRow\">\n                                            <label class=\"paramlabel\">Output Folder</label></br>\n                                            <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\"\n                                                 data-dojo-attach-point=\"output_path\" required=\"true\"\n                                                 data-dojo-props=\"type:['folder'],multi:false\"\n                                                 data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n                                        </div>\n                                        <div class=\"appRow\">\n                                            <label class=\"paramlabel\">Output Name</label></br>\n                                            <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\"\n                                                 name=\"output_file\" data-dojo-attach-point=\"output_file\"\n                                                 style=\"width:85%\" required=\"true\"\n                                                 data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n                                        </div>\n                                        <div class=\"appRow\">\n                                            <label class=\"paramlabel\">Full Tree Method</label><br>\n                                            <select data-dojo-type=\"dijit/form/Select\" name=\"full_tree_method\" data-dojo-attach-point=\"full_tree_method\"\n                                                    style=\"width:300px\" required=\"false\"\n                                                    data-dojo-props=\"intermediateChanges:true,trim:true\">\n                                                <option value=\"ft\">FastTree</option>\n                                                <option value=\"ml\">Maximum Likelihood (RAxML)</option>\n\n                                            </select>\n                                        </div>\n                                        <div class=\"appRow\">\n                                            <label class=\"paramlabel\">Automated Progressive Refinement</label><br>\n                                            <select data-dojo-type=\"dijit/form/Select\" name=\"refinement\" data-dojo-attach-point=\"refinement\"\n                                                    style=\"width:300px\" required=\"false\"\n                                                    data-dojo-props=\"intermediateChanges:true,trim:true\">\n                                                <option value=\"no\">No</option>\n                                                <option value=\"yes\">Yes</option>\n                                            </select>\n                                        </div>\n                                    </div>\n\n                                </td>\n                            </tr>\n\n                        </table>\n\n                    </td>\n                    <td>\n                        <div class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:90%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\">Outgroup Genomes</label>\n                                    <div name=\"outgroup-genomes-selection\" class=\"infobox iconbox infobutton dialoginfo\">\n                                        <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                                    </div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label>ADD AT LEAST 1 (UP TO 5) GENOME TO ROOT THE TREE. USE PLUS BUTTONS TO ADD.</label></br>\n                                <label>Select genome</label></br>\n                                <div style=\"width:85%;display:inline-block;\"\n                                     data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"out_genome_id\" maxHeight=200\n                                     required=\"false\" data-dojo-attach-point=\"out_genome_id\"\n                                     data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\"></div>\n                                <div style=\"width:10%;display:inline-block;\"><i\n                                        data-dojo-attach-event=\"click:onAddOutGroupGenome\"\n                                        class=\"fa icon-plus-circle fa-lg\"></i></div>\n                                </br>\n                                <label>And/or select genome group</label></br>\n                                <div style=\"width:85%;display:inline-block;\"\n                                     data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"out_genomes_genomegroup\"\n                                     required=\"false\" data-dojo-attach-point=\"out_genomes_genomegroup\"\n                                     data-dojo-props=\"type:['genome_group'],multi:false,promptMessage:'Select a genome group from your workspace',missingMessage:'Genome group is optional.', placeHolder:'Optional'\"></div>\n                                <div style=\"width:10%;display:inline-block;\"><i\n                                        data-dojo-attach-event=\"click:onAddOutGroupGenomeGroup\"\n                                        class=\"fa icon-plus-circle fa-lg\"></i></div>\n                                </br>\n                            </div>\n\n                            <div class=\"appRow\">\n                                <label> selected outgroup genome table</label>\n                            </div>\n\n                            <div class=\"appRow\" style=\"width:90%; margin-top:10px; text-align: center;\">\n                                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"outGroupGenomeTable\"\n                                       style='margin:0 0 0 10px; width:100%;'>\n                                    <tbody data-dojo-attach-point=\"outGroupGenomeTableBody\">\n\n                                    </tbody>\n                                </table>\n                            </div>\n\n                        </div>\n                    </td>\n                </tr>\n            </table>\n        </div>\n    </div>\n\n    <div class=\"appSubmissionArea\">\n\n        <div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\"\n             style=\"margin-top:10px; text-align:center;\">\n            Submitting Phylogenetic Tree Building Job\n        </div>\n        <div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\"\n             style=\"margin-top:10px; text-align:center;\">\n            Error Submitting Job. Please check the submission form.\n        </div>\n        <div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\"\n             style=\"margin-top:10px; text-align:center;\">\n            The Phylogenetic Tree job has been submitted.\n            This could take hours to a day to complete, depending on the number of genomes and their size.\n            Check your workspace to see the progress of your job.\n        </div>\n        <div style=\"margin-top: 10px; text-align:center;\">\n            <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n            <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n        </div>\n    </div>\n</form>\n"}});
define("p3/widget/app/PhylogeneticTree", [
	"dojo/_base/declare", "dojo/on", "dojo/dom-class",
	"dojo/text!./templates/PhylogeneticTree.html", "./AppBase", "dojo/dom-construct", "dijit/registry",
	"dojo/_base/lang", "dojo/domReady!", "dojo/query", "dojo/dom", "dijit/Dialog",
	"../../WorkspaceManager", "dojo/when"
], function(declare, on, domClass,
			Template, AppBase, domConstruct, registry,
			lang, domReady, query, dom, Dialog,
			WorkspaceManager, when){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		templateString: Template,
		applicationName: "PhylogeneticTree",
		applicationHelp: "user_guide/genome_data_and_tools/phylogenetic_tree_building_service.html",
		tutorialLink: "tutorial/phylogenetic_tree_building/tree_building.html",
		pageTitle: "Phylogenetic Tree Building",
		defaultPath: "",
		startingRows: 9,

		constructor: function(){
			this._selfSet = true;
			this.inGroup = {};
			this.inGroup.addedList = []; //list of genome id, duplicate is allowed
			this.inGroup.addedNum = 0;
			this.inGroup.genomeToAttachPt = ["in_genome_id"];
			this.inGroup.genomeGroupToAttachPt = ["in_genomes_genomegroup"];
			this.inGroup.maxGenomes = 100;
			this.outGroup = {};
			this.outGroup.addedList = [];
			this.outGroup.addedNum = 0;
			this.outGroup.genomeToAttachPt = ["out_genome_id"];
			this.outGroup.genomeGroupToAttachPt = ["out_genomes_genomegroup"];
			this.outGroup.maxGenomes = 5;
			this.selectedTR = []; //list of selected TR for ingroup and outgroup, used in onReset()
		},

		startup: function(){
			var _self = this;
			if(this._started){
				return;
			}
			this.inherited(arguments);

			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.output_path.set('value', _self.defaultPath);

			this.emptyTable(this.inGroupGenomeTable, this.startingRows);
			this.emptyTable(this.outGroupGenomeTable, this.startingRows);
			this.inGroupNumGenomes.startup();
			this.outGroupNumGenomes.startup();
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
				if(attachname == "output_path"){
					cur_value = this[attachname].searchBox.value;
					browser_select = 1;
				}
				else if(attachname == "in_genomes_genomegroup" || attachname == "out_genomes_genomegroup"){
					cur_value = this[attachname].searchBox.value;
					var attachType = "genomes_genomegroup";
					var inDuplicate = this.checkDuplicate(cur_value, "in", attachType);
					var outDuplicate = this.checkDuplicate(cur_value, "out", attachType);
					success = success * inDuplicate * outDuplicate;
				}
				else if(attachname == "in_genome_id" || attachname == "out_genome_id"){
					cur_value = this[attachname].value;
					var attachType = "genome_id";
					var inDuplicate = this.checkDuplicate(cur_value, "in", attachType);
					var outDuplicate = this.checkDuplicate(cur_value, "out", attachType);
					success = success * inDuplicate * outDuplicate;
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

		checkDuplicate: function(cur_value, groupTypePrefix, attachType){
			var success = 1;
			var genomeIds = [];
			var genomeList = query("."+groupTypePrefix+"GroupGenomeData");
			genomeList.forEach(function(item){
					genomeIds.push(item.genomeRecord[groupTypePrefix+"_"+attachType]);
				});
			if(genomeIds.length > 0 && genomeIds.indexOf(cur_value) > -1) {//found duplicate
				success = 0;
			}
			return success;
		},

		makeGenomeName: function(groupType){
			var name = this[this[groupType].genomeToAttachPt].get("displayedValue");
			var maxLength = 36;
			return this.genDisplayName(name, maxLength);
		},

		makeGenomeGroupName: function(groupType, newGenomeIds){
			var name = this[this[groupType].genomeGroupToAttachPt].searchBox.get("displayedValue");
			var maxLength = 36;
			return this.genDisplayName(name, maxLength)+' ('+newGenomeIds.length+ ' genomes)';
		},

		genDisplayName: function(name, maxLength){ //generate a display name up to maxLength
			var display_name = name;
			if(name.length > maxLength){
				display_name = name.substr(0, (maxLength / 2) - 2) + "..." + name.substr((name.length - (maxLength / 2)) + 2);
			}
			return display_name;
		},

		increaseGenome: function(groupType, newGenomeIds){
			newGenomeIds.forEach(lang.hitch(this, function(id){
				this[groupType].addedList.push(id);
			}));
			this[groupType].addedNum = this[groupType].addedList.length;
			this[groupType+'NumGenomes'].set('value', Number(this[groupType].addedNum));
		},

		decreaseGenome: function(groupType, newGenomeIds){
			newGenomeIds.forEach(lang.hitch(this, function(id){
				var idx = this[groupType].addedList.indexOf(id);
				if(idx > -1){
					this[groupType].addedList.splice(idx, 1);
				}
			}));
			this[groupType].addedNum = this[groupType].addedList.length;
			this[groupType+'NumGenomes'].set('value', Number(this[groupType].addedNum));
		},

		onAddInGroupGenome: function(){
			var groupType = "inGroup";
			this.onAddGenome(groupType);
		},

		onAddOutGroupGenome: function(){
			var groupType = "outGroup";
			this.onAddGenome(groupType);
		},

		onAddGenome: function(groupType){
			//console.log("Create New Row", domConstruct);
			var lrec = {};
			lrec["groupType"] = groupType;
			var chkPassed = this.ingestAttachPoints(this[groupType].genomeToAttachPt, lrec);
			//console.log("this.genomeToAttachPt = " + this.genomeToAttachPt);
			//console.log("chkPassed = " + chkPassed + " lrec = " + lrec);

			if(chkPassed && this[groupType].addedNum < this[groupType].maxGenomes){
				var newGenomeIds =[lrec[this[groupType].genomeToAttachPt]];
				var tr = this[groupType+'GenomeTable'].insertRow(0);
				lrec["row"] = tr;
				var td = domConstruct.create('td', {"class": "textcol "+groupType+"GenomeData", innerHTML: ""}, tr);
				td.genomeRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeName(groupType) + "</div>";
				var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this[groupType].addedNum < this.startingRows){
					this[groupType+'GenomeTable'].deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
				// console.log("Delete Row: groupType ="+groupType+" newGenomeIds = " + newGenomeIds);
					domConstruct.destroy(tr);
					this.decreaseGenome(groupType, newGenomeIds);
					if(this[groupType].addedNum < this.startingRows){
						var ntr = this[groupType+'GenomeTable'].insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				lrec["handle"] = handle;
				this.selectedTR.push(lrec);
				this.increaseGenome(groupType, newGenomeIds);
			}
			//console.log(lrec);
		},

		onAddInGroupGenomeGroup: function(){
			var groupType = "inGroup";
			this.onAddGenomeGroup(groupType);
		},

		onAddOutGroupGenomeGroup: function(){
			var groupType = "outGroup";
			this.onAddGenomeGroup(groupType);
		},

		onAddGenomeGroup: function(groupType){
			//console.log("Create New Row", domConstruct);
			var lrec = {};
			lrec["groupType"] = groupType;
			var chkPassed = this.ingestAttachPoints(this[groupType].genomeGroupToAttachPt, lrec);
			//console.log("this[groupType].genomeGroupToAttachPt = " + this[groupType].genomeGroupToAttachPt);
			//console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
			var path = lrec[this[groupType].genomeGroupToAttachPt];
			when(WorkspaceManager.getObject(path), lang.hitch(this, function(res){
				if(typeof res.data == "string"){
					res.data = JSON.parse(res.data);
				}
				if(res && res.data && res.data.id_list){
					if(res.data.id_list["genome_id"]){
						var newGenomeIds =  res.data.id_list["genome_id"];
					}
				}
				//display a notice if adding new genome group exceeds maximum allowed number
				var count = this[groupType].addedNum +newGenomeIds.length;
				if(count > this[groupType].maxGenomes){
					var msg = "Sorry, you can only add up to "+this[groupType].maxGenomes+" genomes";
					msg += " in "+groupType[0].toUpperCase()+groupType.substring(1).toLowerCase();
					msg += " and you are trying to select "+count + ".";
					new Dialog({title: "Notice", content: msg}).show();
				}
        //console.log("newGenomeIds = ", newGenomeIds);
				if(chkPassed && this[groupType].addedNum < this[groupType].maxGenomes
					&& newGenomeIds.length > 0
					&& this[groupType].addedNum +newGenomeIds.length <= this[groupType].maxGenomes){
					var tr = this[groupType+'GenomeTable'].insertRow(0);
					lrec["row"] = tr;
					var td = domConstruct.create('td', {"class": "textcol "+groupType+"GenomeData", innerHTML: ""}, tr);
					td.genomeRecord = lrec;
					td.innerHTML = "<div class='libraryrow'>" + this.makeGenomeGroupName(groupType, newGenomeIds) + "</div>";
					var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
					var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
					if(this[groupType].addedNum < this.startingRows){
						this[groupType+'GenomeTable'].deleteRow(-1);
					}
					var handle = on(td2, "click", lang.hitch(this, function(evt){
						//console.log("Delete Row");
						domConstruct.destroy(tr);
						this.decreaseGenome(groupType, newGenomeIds);
						if(this[groupType].addedNum < this.startingRows){
							var ntr = this[groupType+'GenomeTable'].insertRow(-1);
							var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
							var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
							var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						}
						handle.remove();
					}));
					lrec["handle"] = handle;
					this.selectedTR.push(lrec);
					this.increaseGenome(groupType, newGenomeIds);
				}

			}));

			//console.log(lrec);
		},

		onSubmit: function(evt){
			var _self = this;

			evt.preventDefault();
			evt.stopPropagation();
			if(this.validate()){
				var values = this.getValues();
				//console.log("values: ", values);
				if(values["in_genome_ids"].length >=3 && values["out_genome_ids"].length >=1){
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

		onReset: function(evt){
			domClass.remove(this.domNode, "Working");
			domClass.remove(this.domNode, "Error");
			domClass.remove(this.domNode, "Submitted");
			this.selectedTR.forEach(lang.hitch(this,function(lrec){
				domConstruct.destroy(lrec.row);
				lrec.handle.remove();
				groupType = lrec["groupType"];
				var ntr = this[groupType+'GenomeTable'].insertRow(-1);
				var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
				var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
				var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
			}));
			this.selectedTR = [];
			this.inGroup.addedList = [];
			this.inGroup.addedNum = 0;
			this.outGroup.addedList = [];
			this.outGroup.addedNum = 0;
		},

		getValues: function(){
			var ptb_values = {};
			var values = this.inherited(arguments);
			//remove duplicate genomes
			var inGroupGenomesFiltered = [];
			this.inGroup.addedList.forEach(function(id){
				if(inGroupGenomesFiltered.indexOf(id)  == -1) {
					inGroupGenomesFiltered.push(id);
				}
			});
			var outGroupGenomesFiltered = [];
			this.outGroup.addedList.forEach(function(id){
				if(outGroupGenomesFiltered.indexOf(id)  == -1) {
					outGroupGenomesFiltered.push(id);
				}
			});

			ptb_values["in_genome_ids"] = inGroupGenomesFiltered;
			ptb_values["out_genome_ids"] = outGroupGenomesFiltered;
			ptb_values["output_path"] = values["output_path"];
			ptb_values["output_file"] = values["output_file"];
			ptb_values["full_tree_method"] = values["full_tree_method"];
			ptb_values["refinement"] = values["refinement"];

			return ptb_values;
		}

	});
});
