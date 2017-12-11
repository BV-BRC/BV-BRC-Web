require({cache:{
'url:p3/widget/app/templates/Tnseq.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div class=\"appTemplate\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Tn-Seq Analysis\n                <div class=\"infobox iconbox tutorialButton tutorialInfo\">\n                    <i class=\"fa icon-books fa-1x\" title=\"click to open tutorial\"></i>\n                </div>\n            </h3>\n            <p>Align reads, measure essentiality.</p>\n        </div>\n        <div class=\"formFieldsContainer\">\n            <div style=\"display: none;\">\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\"\n                       data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n            </div>\n            <div style=\"display: none;\">\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"1\" required=\"true\"\n                       data-dojo-attach-point=\"numCondWidget\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n            </div>\n            <table class=\"assemblyblocks\" style=\"width:100%\">\n                <tr>\n                    <td>\n                        <div id=\"pipelineBox\" class=\"appBox appShadow\">\n                            <div style=\"width:85%;display:inline-block;\">\n                                <label class=\"appBoxLabel\">Parameters</label>\n                                <div name=\"parameters\" class=\"infobox iconbox infobutton dialoginfo\">\n                                    <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Strategy</label><br>\n                                <select data-dojo-type=\"dijit/form/Select\" name=\"recipe\" data-dojo-attach-point=\"recipe\"\n                                        style=\"width:300px\" required=\"true\" data-dojo-attach-event=\"onChange:onRecipeChange\"\n                                        data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n                                    <option value=\"gumbel\">Essential</option>\n                                    <option value=\"resampling\">Conditionally Essential</option>\n                                </select>\n                            </div>\n                            <div class=\"appRow\">\n                                <div class=\"appField\">\n                                    <label>Target Genome</label><br>\n                                    <div data-dojo-attach-event=\"onChange:onSuggestNameChange\"\n                                         data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome_name\" maxHeight=200\n                                         style=\"width:100%\" required=\"true\"\n                                         data-dojo-attach-point=\"genome_nameWidget\"></div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Output Folder</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\"\n                                     data-dojo-attach-point=\"output_path\" style=\"width:300px\" required=\"true\"\n                                     data-dojo-props=\"type:['folder'],multi:false\"\n                                     data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Output Name</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\"\n                                     data-dojo-attach-point=\"output_file\" style=\"width:300px\" required=\"true\"\n                                     data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n                            </div>\n\n                        </div>\n                    </td>\n                    <td>\n                    </td>\n                </tr>\n                <tr>\n                    <td>\n                        <div id=\"pairedBox\" class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\"> Paired read library</label>\n                                    <div name=\"paired-read-library\" class=\"infobox iconbox infobutton dialoginfo\">\n                                        <i class=\"fa icon-info-circle fa\" title=\"click to open info dialog\"></i>\n                                    </div>\n                                </div>\n                                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddPair\"\n                                                                                class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Read File 1</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\"\n                                     data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\"\n                                     data-dojo-props=\"type:['reads'],multi:false\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <div data-dojo-attach-point=\"read2block\">\n                                    <label class=\"paramlabel\">Read File 2</label><br>\n                                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\"\n                                         data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\"\n                                         data-dojo-props=\"type:['reads'],multi:false\"></div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Condition</label><br>\n                                <select data-dojo-type=\"dijit/form/FilteringSelect\" name=\"condition_paired\"\n                                        data-dojo-attach-point=\"condition_paired\" style=\"width:300px\" required=\"false\"\n                                        data-dojo-props=\"disabled: true,labelType:'html', searchAttr:'label',intermediateChanges:true,trim:true,placeHolder:'Condition Name'\">\n                                </select>\n                            </div>\n                        </div>\n\n                        <div class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\">Single read library</label>\n                                </div>\n                                <div style=\"width:10%;display:inline-block;\"><i\n                                        data-dojo-attach-event=\"click:onAddSingle\"\n                                        class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Read File</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_readfile\"\n                                     data-dojo-attach-point=\"read\" style=\"width:300px\" required=\"false\"\n                                     data-dojo-props=\"type:['reads'],multi:false\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Condition</label><br>\n                                <select data-dojo-type=\"dijit/form/FilteringSelect\" name=\"condition_single\"\n                                        data-dojo-attach-point=\"condition_single\" style=\"width:300px\" required=\"false\"\n                                        data-dojo-props=\"labelType:'html',disabled: true,searchAttr:'label',intermediateChanges:true,trim:true,placeHolder:'Condition Name'\">\n                                </select>\n                            </div>\n                        </div>\n\n                    </td>\n                    <td>\n                        <div class=\"appBox appShadow\" style=\"min-height: 320px; height:auto; width:330px\">\n                            <div class=\"headerrow\">\n                                <label class=\"appBoxLabel\">Selected libraries</label>\n                                <div name=\"selected-libraries\" class=\"infobox iconbox infobutton tooltipinfo\">\n                                    <i class=\"fa icon-question-circle fa\"></i>\n                                </div>\n                                <br>\n                                <div class=\"appsublabel\">Place read files here using the arrow buttons.</div>\n                            </div>\n                            <div class=\"appRow\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\"\n                                       style='margin:0 0 0 10px; width:90%;'>\n                                    <tbody data-dojo-attach-point=\"libsTableBody\">\n\n                                    </tbody>\n                                </table>\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n            </table>\n\n\n        </div>\n        <div class=\"appSubmissionArea\">\n            <div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n                Submitting Tn-Seq job\n            </div>\n\n            <div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n                Tn-Seq job has been queued.\n            </div>\n\n            <div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n                <div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Assembly Job</div>\n                <p data-dojo-attach-point=\"errorMessage\">Error</p>\n            </div>\n\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\"\n                     data-dojo-type=\"dijit/form/Button\">Cancel\n                </div>\n                <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n            </div>\n        </div>\n    </div>\n</form>\n"}});
define("p3/widget/app/Tnseq", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/Tnseq.html", "./AppBase", "dojo/dom-construct",
	"dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "dojo/domReady!", "dijit/form/NumberTextBox",
	"dojo/query", "dojo/dom", "dijit/popup", "dijit/Tooltip", "dijit/Dialog", "dijit/TooltipDialog",
	"dojo/NodeList-traverse", "../../WorkspaceManager", "dojo/store/Memory", "dojox/widget/Standby"
], function(declare, WidgetBase, on,
			domClass,
			Template, AppBase, domConstruct,
			Deferred, aspect, lang, domReady, NumberTextBox,
			query, dom, popup, Tooltip, Dialog, TooltipDialog,
			children, WorkspaceManager, Memory, Standby){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		templateString: Template,
		applicationName: "TnSeq",
		applicationHelp: "user_guide/genome_data_and_tools/tn_seq_analysis_service.html",
		tutorialLink: "",
		pageTitle: "Tn-Seq Analysis",
		libraryData: null,
		defaultPath: "",
		startingRows: 11,
		initConditions: 5,
		maxConditions: 10,
		conditionStore: null,
        hostGenomes: {"9606.33":"","6239.6":"","7955.5":"","7227.4":"","9031.4":"","9544.2":"","10090.24":"","9669.1":"","10116.5":"","9823.5":""},

		listValues: function(obj){
			var results = [];
			Object.keys(obj).forEach(function(key){
				results.append(obj[key]);
			});
		},

		constructor: function(){

			this.addedLibs = {counter: 0};
			this.addedCond = {counter: 0};
			//these objects map dojo attach points to desired alias for ingestAttachPoint function
			//key is attach point array of values is alias
			//if there is no alias the key in the resulting object will be the same name as attach point
			this.pairToAttachPt1 = {"read1": null, "read2": null};
			this.pairConditionToAttachPt = {"read1": null, "read2": null, "condition_paired": ["condition"]};
			this.advPairToAttachPt = {"interleaved": null, "insert_size_mean": null, "insert_size_stdev": null};
			this.paramToAttachPt = {"output_path": null, "output_file": null, "recipe": null};
			this.singleToAttachPt = {"read": null};
			this.singleConditionToAttachPt = {"read": null, "condition_single": ["condition"]};
			this.conditionToAttachPt = {"condition": ["condition", "id", "label"]};
			this.targetGenomeID = "";
			this.shapes = ["icon-square", "icon-circle"];
			this.colors = ["blue", "green", "red", "purple", "orange"];
			this.color_counter = 0;
			this.shape_counter = 0;
			this.conditionStore = new Memory({data: []});
			this.libraryStore = new Memory({data: [],idProperty:"id"});
			this.libraryID = 0;
            this.exp_design = {"checked":false};
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			var _self = this;
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.output_path.set('value', _self.defaultPath);

			//create help dialog for infobutton's with infobuttoninfo div's
			this.emptyTable(this.libsTable, this.startingRows);
			//this.emptyTable(this.condTable, this.initConditions);

            //for initial rollout use two conditions. this will change when contrasts are specified and the condition table comes back
            var control = {id: "control", condition: "control", label: "Control", icon:this.getConditionIcon()};
            var treatment = {id: "treatment", condition: "treatment", label: "Treatment", icon:this.getConditionIcon()};
            //temporary until contrasts table added
            this.updateConditionStore(record = control, remove = false);
            this.updateConditionStore(record = treatment, remove = false);
            this.addedCond.counter=2;


			//adjust validation for each of the attach points associated with read files
			Object.keys(this.pairToAttachPt1).concat(Object.keys(this.singleToAttachPt)).forEach(lang.hitch(this, function(attachname){
				this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function(/*anything*/ value, /*__Constraints*/ constraints){
						return (new RegExp("^(?:" + this._computeRegexp(constraints) + ")" + (this.required ? "" : "?") + "$")).test(value) &&
							(!this._isEmpty(value)) &&
							(this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
					}
				)
			}));
			//var handle = on(this.group_switch, "click", lang.hitch(this, function(evt){
			//	this.exp_design.checked = !this.exp_design.checked ? true : false;
			//	this.exp_design.value = this.exp_design.checked ? "on" : "off";
			//	this.onDesignToggle();
			//}));
			this.condition_single.labelFunc = this.showConditionLabels;
			this.condition_paired.labelFunc = this.showConditionLabels;
			// this.block_condition.show();

			//this.read1.set('value',"/" +  window.App.user.id +"/home/");
			//this.read2.set('value',"/" +  window.App.user.id +"/home/");
			//this.single_end_libs.set('value',"/" +  window.App.user.id +"/home/");
			//this.output_path.set('value',"/" +  window.App.user.id +"/home/");
			this._started = true;
		},


        onRecipeChange: function(){
            var strategy= this.recipe.get("value");
            if(strategy == "resampling"){
                this.exp_design.checked=true;
            }
            else{
                this.exp_design.checked=false;
            }
            this.onDesignToggle();
        },
		onDesignToggle: function(){
			var disable = !this.exp_design.checked;
			//this.condition.set("disabled", disable);
			this.condition_single.set("disabled", disable);
			this.condition_paired.set("disabled", disable);
			if(disable){
				// this.block_condition.show();
				this.numCondWidget.set('value', Number(1));
				this.destroyLibRow(query_id = true, id_type = "design");
				//dojo.addClass(this.condTable, "disabled");
			}
			else{
				// this.block_condition.hide();
				this.numCondWidget.set('value', Number(this.addedCond.counter));
				this.destroyLibRow(query_id = false, id_type = "design");
				//dojo.removeClass(this.condTable, "disabled");
			}
		},

		emptyTable: function(target, rowLimit){
			for(i = 0; i < rowLimit; i++){
				var tr = target.insertRow(0);//domConstr.create("tr",{},this.libsTableBody);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
		},

		getValues: function(){
			if(typeof String.prototype.startsWith != 'function'){
				String.prototype.startsWith = function(str){
					return this.slice(0, str.length) == str;
				};
			}
			var assembly_values = {};
			var values = this.inherited(arguments);
			var pairedList = this.libraryStore.query({"type": "paired"});
			var pairedAttrs = ["read1", "read2"];
			var singleAttrs = ["read"];
			var condList = this.conditionStore.data;
			var singleList = this.libraryStore.query({"type": "single"});
			var condLibs = [];
			var allLibs = {};
			var singleLibs = [];
			this.ingestAttachPoints(this.paramToAttachPt, assembly_values);
            var defaultCond = "control";
			//for (var k in values) {
			//	if(!k.startsWith("libdat_")){
			//		assembly_values[k]=values[k];
			//	}
			//}
			var combinedList = pairedList.concat(singleList);
			assembly_values["reference_genome_id"] = values["genome_name"];
			if(this.exp_design.checked){
				condList.forEach(function(condRecord){
					for(var i = 0; i < combinedList.length; i++){
						if(combinedList[i].condition == condRecord.condition){
							condLibs.push(condRecord.condition);
							break;
						}
					}
				});
			}
            else{
                condLibs.push(defaultCond);
            }

			pairedList.forEach(function(libRecord){
				var toAdd = {};
                var curCond = null;
				if('condition' in libRecord && this.exp_design.checked){
					//toAdd['condition'] = condLibs.indexOf(libRecord['condition']) + 1;
                    curCond=libRecord['condition'];
				}
                else{
                    curCond=defaultCond;
                }
				pairedAttrs.forEach(function(attr){
					toAdd[attr] = libRecord[attr]
				});
				//pairedLibs.push(toAdd);
                if( ! (curCond in allLibs)){
                    allLibs[curCond]={'replicates':[],'library':curCond};
                }
                allLibs[curCond]['replicates'].push(toAdd);
			}, this);
			//if(pairedLibs.length){
			//	assembly_values["paired_end_libs"] = pairedLibs;
			//}
			if(condLibs.length){
				assembly_values["experimental_conditions"] = condLibs;
			}
			singleList.forEach(function(libRecord){
				var toAdd = {};
                var curCond = null;
				if('condition' in libRecord && this.exp_design.checked){
					//toAdd['condition'] = condLibs.indexOf(libRecord['condition']) + 1;
                    curCond=libRecord['condition'];
				}
                else{
                    curCond=defaultCond;
                }
				singleAttrs.forEach(function(attr){
					toAdd[attr] = libRecord[attr]
				});
                if( ! (curCond in allLibs)){
                    allLibs[curCond]={'replicates':[],'library':curCond};
                }
				//singleLibs.push(toAdd);
                allLibs[curCond]['replicates'].push(toAdd);
			}, this);
			//if(singleLibs.length){
			//	assembly_values["single_end_libs"] = singleLibs;
			//}
            assembly_values["read_files"]=allLibs;
            if (assembly_values["recipe"] == "resampling"){
                assembly_values["contrasts"]=[["control","treatment"]];
            }
            else{
                assembly_values["contrasts"]=[["control"]];
            }

			return assembly_values;

		},
		//gets values from dojo attach points listed in input_ptsi keys.
		//aliases them to input_pts values.  validates all values present if req
		ingestAttachPoints: function(input_pts, target, req){
			req = typeof req !== 'undefined' ? req : true;
			var success = 1;
			var prevalidate_ids = ["read1", "read2", "read", "output_path", "condition", "condition_single", "condition_paired"];
            target["id"]=this.makeLibraryID(target.type);
            var duplicate = target.id in this.libraryStore.index;
			Object.keys(input_pts).forEach(function(attachname){
				var cur_value = null;
				var incomplete = 0;
				var prevalidate = (prevalidate_ids.indexOf(attachname) > -1);//truth variable whether to do validation separate from form
				var targetnames = [attachname];
				if(input_pts[attachname]){
					targetnames = input_pts[attachname];
				}
				if(attachname == "read1" || attachname == "read2" || attachname == "read" || attachname == "output_path"){
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					if(attachname == "read2" && this["read2"].searchBox.value == this["read1"].searchBox.value){
						this["read2"].searchBox.value = "";
					}
					//cur_value=this[attachname].searchBox.get('value');
					//incomplete=((cur_value.replace(/^.*[\\\/]/, '')).length==0);
				}
				else if(attachname == "condition"){
					cur_value = this[attachname].displayedValue;//? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value="/_uuid/"+this[attachname].searchBox.value;
					//cur_value=this[attachname].searchBox.get('value');
				}
				else{
					cur_value = this[attachname].value;
				}

				if(typeof(cur_value) == "string"){
					cur_value = cur_value.trim();
				}
				//set validation state for widgets since they are non-blocking presubmission fields
				if(req && (duplicate || !cur_value || incomplete)){
					if(prevalidate){
						if(this[attachname].searchBox){
							this[attachname].searchBox.validate(); //this should be whats done but it doesn't actually call the new validator
							this[attachname].searchBox._set("state", "Error");
						}
						else{
							this[attachname].validate();
							this[attachname]._set("state", "Error");
						}
						this[attachname].focus = true;
					}
					success = 0;
				}
				else{
					this[attachname]._set("state", "");
				}
				//set alias target values to cur_value and format values in resulting object
				targetnames.forEach(function(targetname){
					target[targetname] = cur_value;
					if(target[targetname] != ""){
						target[targetname] = target[targetname] || undefined;
					}
					else if(target[targetname] == "true"){
						target[targetname] = true;
					}
					else if(target[targetname] == "false"){
						target[targetname] = false;
					}
				}, target);
			}, this);
			return (success);
		},
		showConditionLabels: function(item, store){
			var label = item.condition + " " + item.icon;
			return label;
		},
		makeLibraryName:function(mode){
            if(mode == "paired"){
                var fn =this.read1.searchBox.get("displayedValue");
                var fn2 =this.read2.searchBox.get("displayedValue");
                var maxName=14;
                if(fn.length > maxName){
                    fn=fn.substr(0,(maxName/2)-2)+"..."+fn.substr((fn.length-(maxName/2))+2);
                }
                if(fn2.length > maxName){
                    fn2=fn2.substr(0,(maxName/2)-2)+"..."+fn2.substr((fn2.length-(maxName/2))+2);
                }
                return "P("+fn+", "+fn2+")";
            }
            else {

                var fn =this.read.searchBox.get("displayedValue");
                            maxName=24
                if(fn.length > maxName){
                    fn=fn.substr(0,(maxName/2)-2)+"..."+fn.substr((fn.length-(maxName/2))+2);
                }
                return "S("+fn+")";
            }
		},
        makeLibraryID:function(mode){
            if(mode == "paired"){
                var fn =this.read1.searchBox.get("value");
                var fn2 =this.read2.searchBox.get("value");
                return fn+fn2;
            }
            else{
                var fn =this.read.searchBox.get("value");
                return fn;
            }
        },

        onReset: function(evt){
			domClass.remove(this.domNode, "Working");
			domClass.remove(this.domNode, "Error");
			domClass.remove(this.domNode, "Submitted");
            var toDestroy = [];
            this.libraryStore.data.forEach(lang.hitch(this,function(lrec){
                toDestroy.push(lrec["id"]);
		    }));
            //because its removing rows cells from array needs separate loop
            toDestroy.forEach(lang.hitch(this,function(id){
                this.destroyLibRow(query_id=id, "id");
            }));
        },

		makeConditionName: function(){
			return this.condition.get("displayedValue");
		},



		//counter is a widget for requirements checking
		increaseRows: function(targetTable, counter, counterWidget){
			counter.counter = counter.counter + 1;
			if(typeof counterWidget != "undefined"){
				counterWidget.set('value', Number(counter.counter));
			}
		},
		decreaseRows: function(targetTable, counter, counterWidget){
			counter.counter = counter.counter - 1;
			if(typeof counterWidget != "undefined"){
				counterWidget.set('value', Number(counter.counter));
			}
		},
		getConditionIcon: function(query_id){
			var result = "";
			if(!query_id){
				result = "<i style='color:" + this.colors[this.color_counter] + "' class='fa " + this.shapes[this.shape_counter] + " fa-1x' />";
				this.color_counter = this.color_counter + 1 < this.colors.length ? this.color_counter + 1 : 0;
				this.shape_counter = this.shape_counter + 1 < this.shapes.length ? this.shape_counter + 1 : 0;
			}
			else{
				var conditionList = this.conditionStore.query({id: query_id});
				result = conditionList.length ? conditionList[0].icon : "<i class='fa icon-info fa-1' />";
			}
			return result;
		},

		onAddCondition: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var toIngest = this.conditionToAttachPt;
			var disable = !this.exp_design.checked;
			var chkPassed = this.ingestAttachPoints(toIngest, lrec);
			var conditionSize = this.conditionStore.data.length;
			if(this.addedCond.counter < this.maxConditions){
				this.updateConditionStore(record = lrec, remove = false);
			}
			//make sure all necessary fields, not disabled, available condition slots, and checking conditionSize checks dups
			if(chkPassed && !disable && this.addedCond.counter < this.maxConditions && conditionSize < this.conditionStore.data.length){
				lrec["icon"] = this.getConditionIcon();
				var tr = this.condTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol conditiondata", innerHTML: ""}, tr);
				td.libRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeConditionName() + "</div>";
				var tdinfo = domConstruct.create("td", {"class": "iconcol", innerHTML: lrec["icon"]}, tr);
				var td2 = domConstruct.create("td", {
					"class": "iconcol",
					innerHTML: "<i class='fa icon-x fa-1x' />"
				}, tr);
				if(this.addedCond.counter < this.initConditions){
					this.condTable.deleteRow(-1);
				}

				var handle = on(td2, "click", lang.hitch(this, function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.updateConditionStore(record = lrec, remove = true);
					this.decreaseRows(this.condTable, this.addedCond, this.numCondWidget);
					if(this.addedCond.counter < this.maxConditions){
						var ntr = this.condTable.insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					this.condition_single.reset();
					this.condition_paired.reset();
					handle.remove();
					this.destroyLibRow(query_id = lrec["condition"], id_type = "condition");
				}));
				this.increaseRows(this.condTable, this.addedCond, this.numCondWidget);
			}
		},

		updateConditionStore: function(record, remove){
			// if there is no real condition specified return
			if(!record.condition.trim() || !record.condition){
				return;
			}
			if(remove){
				var toRemove = this.conditionStore.query({id: record["id"]});
				//remove condition from data store
				toRemove.forEach(function(obj){
					if(obj.libraries){
						libraries.forEach(function(lib_row){
							lib_row.remove();
						});
					}
					this.conditionStore.remove(obj.id);
				}, this);
			}
			else{
				this.conditionStore.put(record);
			}
			this.condition_paired.set("store", this.conditionStore);
			this.condition_single.set("store", this.conditionStore);
		},

		onAddSingle: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {type:"single"};
			var toIngest = this.exp_design.checked ? this.singleConditionToAttachPt : this.singleToAttachPt;
			var chkPassed = this.ingestAttachPoints(toIngest, lrec);
			if(chkPassed){
				var tr = this.libsTable.insertRow(0);
				lrec["row"] = tr;
				var td = domConstruct.create('td', {"class": "textcol singledata", innerHTML: ""}, tr);
				//td.libRecord=lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName("single") + "</div>";
				var advPairInfo = [];
				if(lrec["condition"]){
					advPairInfo.push("Condition:" + lrec["condition"]);
				}
				if(advPairInfo.length){
					condition_icon = this.getConditionIcon(lrec["condition"]);
					lrec["design"] = true;
					var tdinfo = domConstruct.create("td", {"class": "iconcol", innerHTML: condition_icon}, tr);
					var ihandle = new Tooltip({
						connectId: [tdinfo],
						label: advPairInfo.join("</br>")
					});
				}
				else{
					lrec["design"] = false;
					var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				}
				var td2 = domConstruct.create("td", {
					"class": "iconcol",
					innerHTML: "<i class='fa icon-x fa-1x' />"
				}, tr);
				if(this.addedLibs.counter < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					this.destroyLibRow(query_id = lrec["id"], "id")
				}));
				lrec["handle"] = handle;
				this.libraryStore.put(lrec);
				this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
			}
		},

		destroyLibRow: function(query_id, id_type){
			console.log("Delete Rows");
			var query_obj = {};
			query_obj[id_type] = query_id;
			var toRemove = this.libraryStore.query(query_obj);
			toRemove.forEach(function(obj){
				domConstruct.destroy(obj.row);
				this.decreaseRows(this.libsTable, this.addedLibs, this.numlibs);
				if(this.addedLibs.counter < this.startingRows){
					var ntr = this.libsTable.insertRow(-1);
					var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
				}
				obj.handle.remove();
				this.libraryStore.remove(obj.id);
			}, this);
		},

		onSuggestNameChange: function(){
            var curRecipe = this.recipe.value;
		},

		onAddPair: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {type:"paired"};
			//If you want to disable advanced parameters while not shown this would be the place.
			//but for right now, if you set them and then hide them, they are still active
			var pairToIngest = this.exp_design.checked ? this.pairConditionToAttachPt : this.pairToAttachPt1;
			//pairToIngest=pairToIngest.concat(this.advPairToAttachPt);
			var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
			//this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
			if(chkPassed && lrec.read1 != lrec.read2){
				var tr = this.libsTable.insertRow(0);
				lrec["row"] = tr;
				var td = domConstruct.create('td', {"class": "textcol pairdata", innerHTML: ""}, tr);
				td.libRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName("paired") + "</div>";
				var advPairInfo = [];
				if(lrec["condition"]){
					advPairInfo.push("Condition:" + lrec["condition"]);
				}
				if(advPairInfo.length){
					lrec["design"] = true;
					condition_icon = this.getConditionIcon(lrec["condition"]);
					var tdinfo = domConstruct.create("td", {"class": "iconcol", innerHTML: condition_icon}, tr);
					var ihandle = new Tooltip({
						connectId: [tdinfo],
						label: advPairInfo.join("</br>")
					});
				}
				else{
					lrec["design"] = false;
					var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				}
				var td2 = domConstruct.create("td", {
					"class": "iconcol",
					innerHTML: "<i class='fa icon-x fa-1x' />"
				}, tr);
				if(this.addedLibs.counter < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					this.destroyLibRow(query_id = lrec["id"], id_type = "id")
				}));
				lrec["handle"] = handle;
				this.libraryStore.put(lrec);
				this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
			}
		}

	});
});
