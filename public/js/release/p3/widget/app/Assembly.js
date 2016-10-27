require({cache:{
'url:p3/widget/app/templates/Assembly.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div class=\"appTemplate\">\n        <div class=\"appTitle\">\n            <span class=\"breadcrumb\">Services</span>\n            <h3>Genome Assembly</h3>\n            <p>Assemble contigs from sequencing reads.</p>\n        </div>\n        <div class=\"formFieldsContainer\">\n            <div style=\"display: none;\">\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\"\n                       data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n            </div>\n            <table class=\"assemblyblocks\" style=\"width:100%\">\n                <tr>\n                    <td>\n                        <div id=\"pairedBox\" class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\"> Paired read library</label>\n                                    <div name=\"pairinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                                        <i class=\"fa icon-info-circle fa\"></i>\n                                    </div>\n                                </div>\n                                <div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddPair\"\n                                                                                class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Read File 1</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\"\n                                     data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\"\n                                     data-dojo-props=\"type:['reads'],multi:false\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <div data-dojo-attach-point=\"read2block\">\n                                    <label class=\"paramlabel\">Read File 2</label><br>\n                                    <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\"\n                                         data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\"\n                                         data-dojo-props=\"type:['reads'],multi:false\"></div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <div class=\"appRowSegment\" data-dojo-attach-point=\"advanced\">\n                                    <label class=\"largelabel\">Advanced</label>\n                                    <div class=\"iconbox\" style=\"margin-left:0px\">\n                                        <i data-dojo-attach-point=\"advicon\" class=\"fa icon-caret-down fa-1\"></i>\n                                    </div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\" data-dojo-attach-point=\"advrow\" style=\"display: none\">\n                                <div class=\"appRowSegment\" style=\"margin:0 0 0 0\">\n                                    <label class=\"paramlabel\">File 1 Interleaved</label><br>\n                                    <select data-dojo-type=\"dijit/form/Select\" name=\"libdat_interleaved\"\n                                            data-dojo-attach-point=\"interleaved\" required=\"false\"\n                                            data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n                                        <option value=\"false\">False</option>\n                                        <option value=\"true\">True</option>\n                                    </select>\n                                </div>\n                                <div class=\"appRowSegment\">\n                                    <label class=\"paramlabel\">Mean Insert Size</label><br>\n                                    <div class=\"insertspinner\" name=\"libdat_avginsert\"\n                                         data-dojo-type=\"dijit/form/NumberSpinner\"\n                                         data-dojo-attach-point=\"insert_size_mean\"\n                                         data-dojo-props=\"smallDelta:10, constraints:{min:10,max:2000,places:0}\"></div>\n                                </div>\n                                <div class=\"appRowSegment\">\n                                    <label class=\"paramlabel\">Std. Insert Size</label><br>\n                                    <div class=\"insertspinner\" name=\"libdat_stdinsert\"\n                                         data-dojo-type=\"dijit/form/NumberSpinner\"\n                                         data-dojo-attach-point=\"insert_size_stdev\"\n                                         data-dojo-props=\"smallDelta:10, constraints:{min:10,max:2000,places:0}\"></div>\n                                </div>\n                                <div class=\"appRow\" data-dojo-attach-point=\"advrow2\">\n                                    <div class=\"appRowSegment\" style=\"margin:0 0 0 0\">\n                                        <label class=\"paramlabel\">Mate paired</label><br>\n                                        <select data-dojo-type=\"dijit/form/Select\" name=\"read_orientation_outward\"\n                                                data-dojo-attach-point=\"read_orientation_outward\" required=\"false\"\n                                                data-dojo-props=\"intermediateChanges:true,missingMessage:'',trim:true,placeHolder:''\">\n                                            <option value=\"false\">False</option>\n                                            <option value=\"true\">True</option>\n                                        </select>\n                                    </div>\n                                    <div class=\"appRowSegment\" style=\"margin:10px 0 0 0\">\n                                        <label class=\"paramlabel\">Platform</label><br>\n                                        <select data-dojo-type=\"dijit/form/Select\" name=\"paired_platform\"\n                                                data-dojo-attach-point=\"paired_platform\" required=\"false\"\n                                                data-dojo-props=\"intermediateChanges:true,missingMessage:'',trim:true,placeHolder:''\">\n                                            <option value=\"infer\">Infer Platform</option>\n                                            <option value=\"illumina\">Illumina</option>\n                                            <option value=\"pacbio\">PacBio</option>\n                                            <option value=\"nanopore\">Nanopore</option>\n                                        </select>\n                                    </div>\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appBoxLabel\">Single read library</label>\n                                </div>\n                                <div style=\"width:10%;display:inline-block;\"><i\n                                        data-dojo-attach-event=\"click:onAddSingle\"\n                                        class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Read File</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_readfile\"\n                                     data-dojo-attach-point=\"single_end_libs\" style=\"width:300px\" required=\"false\"\n                                     data-dojo-props=\"type:['reads'],multi:false\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <div class=\"appRowSegment\" data-dojo-attach-point=\"advanced3\">\n                                    <label class=\"largelabel\">Advanced</label>\n                                    <div class=\"iconbox\" style=\"margin-left:0px\">\n                                        <i data-dojo-attach-point=\"advicon3\" class=\"fa icon-caret-down fa-1\"></i>\n                                    </div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\" data-dojo-attach-point=\"advrow3\" style=\"display: none\">\n                                <div class=\"appRowSegment\" style=\"margin:0 0 0 0\">\n                                    <label class=\"paramlabel\">Platform</label><br>\n                                    <select data-dojo-type=\"dijit/form/Select\" name=\"single_platform\"\n                                            data-dojo-attach-point=\"single_platform\" required=\"false\"\n                                            data-dojo-props=\"intermediateChanges:true,missingMessage:'',trim:true,placeHolder:''\">\n                                        <option value=\"infer\">Infer Platform</option>\n                                        <option value=\"illumina\">Illumina</option>\n                                        <option value=\"pacbio\">PacBio</option>\n                                        <option value=\"nanopore\">Nanopore</option>\n                                    </select>\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"appBox appShadow\">\n                            <div class=\"headerrow\">\n                                <label class=\"appBoxLabel\">Parameters</label>\n                                <div name=\"parameterinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                                    <i class=\"fa icon-info-circle fa\"></i>\n                                </div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Assembly Strategy</label><br>\n                                <select data-dojo-type=\"dijit/form/Select\" name=\"recipe\" data-dojo-attach-point=\"recipe\"\n                                        style=\"width:300px\" required=\"true\"\n                                        data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n                                    <option value=\"auto\">auto</option>\n                                    <option value=\"fast\">fast</option>\n                                    <option value=\"full_spades\">full spades</option>\n                                    <option value=\"kiki\">kiki</option>\n                                    <option value=\"miseq\">miseq</option>\n                                    <option value=\"plasmid\">plasmid</option>\n                                    <option value=\"smart\">smart</option>\n                                </select>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Output Folder</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"output_path\"\n                                     data-dojo-attach-point=\"output_path\" style=\"width:300px\" required=\"true\"\n                                     data-dojo-props=\"type:['folder'],multi:false\"\n                                     data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Output Name</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\"\n                                     data-dojo-attach-point=\"output_file\" style=\"width:300px\" required=\"true\"\n                                     data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <label class=\"paramlabel\">Benchmark Contigs</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"reference_assembly\"\n                                     data-dojo-attach-point=\"reference_assembly\" style=\"width:300px\" required=\"false\"\n                                     data-dojo-props=\"type:['contigs'],multi:false,placeHolder:'Optional'\"></div>\n                            </div>\n                            <div class=\"appRow\">\n                                <div class=\"appRowSegment\">\n                                    <div data-dojo-attach-point=\"advanced2\" style=\"display:inline-block\">\n                                        <label class=\"largelabel\">Advanced</label>\n                                        <div class=\"iconbox\" style=\"margin-left:0px\">\n                                            <i data-dojo-attach-point=\"advicon2\" class=\"fa icon-caret-down fa-1\"></i>\n                                        </div>\n                                    </div>\n                                </div>\n                            </div>\n                            <div class=\"appRow\" data-dojo-attach-point=\"advrow2\" style=\"display: none\">\n                                <div class=\"appField\">\n                                    <label class=\"paramlabel\">Assembly pipeline arguments</label>\n                                    <div name=\"pipelineinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                                        <i class=\"fa icon-info-circle fa\"></i>\n                                    </div>\n                                    <div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"pipeline\"\n                                         style=\"width:100%\" required=\"false\"\n                                         data-dojo-props=\"intermediateChanges:true,promptMessage:'Advanced assembly pipeline arguments that overrides recipe.',missingMessage:'',trim:true,placeHolder:'Arguments override recipe'\"></div>\n                                </div>\n                                <div class=\"appRow\" style=\"margin:0 0 0 0\">\n                                    <div class=\"appRowSegment\" style=\"margin:0 0 0 0\">\n                                        <label class=\"paramlabel\">Min. contig length</label><br>\n                                        <div class=\"insertspinner\" name=\"min_contig_len\"\n                                             data-dojo-type=\"dijit/form/NumberSpinner\"\n                                             data-dojo-attach-point=\"min_contig_len\"\n                                             data-dojo-props=\"value:300, smallDelta:10, constraints:{min:100,max:100000,places:0}\"></div>\n                                    </div>\n                                    <div class=\"appRowSegment\" style=\"margin:10px 0 0 0\">\n                                        <label class=\"paramlabel\">Min. contig coverage</label><br>\n                                        <div class=\"insertspinner\" name=\"min_contig_cov\"\n                                             data-dojo-type=\"dijit/form/NumberSpinner\"\n                                             data-dojo-attach-point=\"min_contig_cov\"\n                                             data-dojo-props=\"value:5, smallDelta:5, constraints:{min:0,max:100000,places:1}\"></div>\n                                    </div>\n                                </div>\n                            </div>\n                        </div>\n                    </td>\n                    <td>\n                        <div class=\"appBox appShadow\" style=\"height:251px; width:330px\">\n                            <div class=\"headerrow\">\n                                <label class=\"appBoxLabel\">Selected libraries</label>\n                                <div name=\"selectedinfo\" class=\"infobox iconbox infobutton tooltipinfo\">\n                                    <i class=\"fa icon-info-circle fa\"></i>\n                                </div>\n                                <br>\n                                <div class=\"appsublabel\">Place read files here using the arrow buttons.</div>\n                            </div>\n                            <div class=\"appRow\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\"\n                                       style='margin:0 0 0 10px; width:90%;'>\n                                    <tbody data-dojo-attach-point=\"libsTableBody\">\n\n                                    </tbody>\n                                </table>\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n            </table>\n\n\n        </div>\n        <div class=\"appSubmissionArea\">\n            <div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n                Submitting Assembly Job\n            </div>\n\n            <div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n                Assembly Job has been queued.\n            </div>\n\n            <div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n                <div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Assembly Job</div>\n                <p data-dojo-attach-point=\"errorMessage\">Error</p>\n            </div>\n\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\"\n                     data-dojo-type=\"dijit/form/Button\">Cancel\n                </div>\n                <div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Assemble\n                </div>\n            </div>\n        </div>\n    </div>\n</form>\n\n"}});
define("p3/widget/app/Assembly", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/Assembly.html", "./AppBase", "dojo/dom-construct",
	"dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "dojo/domReady!", "dijit/form/NumberTextBox",
	"dojo/query", "dojo/dom", "dijit/popup", "dijit/Tooltip", "dijit/Dialog", "dijit/TooltipDialog", "dojo/NodeList-traverse", "../../WorkspaceManager"
], function(declare, WidgetBase, on,
			domClass,
			Template, AppBase, domConstruct,
			Deferred, aspect, lang, domReady, NumberTextBox,
			query, dom, popup, Tooltip, Dialog, TooltipDialog, children, WorkspaceManager){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		pageTitle: "Genome Assembly Service",
		templateString: Template,
		applicationName: "GenomeAssembly",
		libraryData: null,
		defaultPath: "",
		startingRows: 8,
        libCreated: 0,
        libRecords: {},

		constructor: function(){

			this.addedLibs = 0;
			this.addedPairs = 0;
			this.pairToAttachPt1 = ["read1", "read2"];
			this.pairToAttachPt2 = ["read1"];
			this.advPairToAttachPt = ["interleaved", "insert_size_mean", "insert_size_stdev", "read_orientation_outward","paired_platform"];
			this.paramToAttachPt = ["recipe", "output_path", "output_file", "reference_assembly"];
			this.singleToAttachPt = ["single_end_libs"];
            this.advSingleToAttachPt = ["single_platform"];
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			var _self = this;
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.output_path.set('value', _self.defaultPath);
			for(i = 0; i < this.startingRows; i++){
				var tr = this.libsTable.insertRow(0);//domConstr.create("tr",{},this.libsTableBody);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
			this.numlibs.startup();
			//create help dialog for infobutton's with infobuttoninfo div's
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

			this.advrow2.turnedOn = (this.advrow2.style.display != 'none');
			on(this.advanced2, 'click', lang.hitch(this, function(){
				this.advrow2.turnedOn = (this.advrow2.style.display != 'none');
				if(!this.advrow2.turnedOn){
					this.advrow2.turnedOn = true;
					this.advrow2.style.display = 'block';
					this.advicon2.className = "fa icon-caret-left fa-1";
				}
				else{
					this.advrow2.turnedOn = false;
					this.advrow2.style.display = 'none';
					this.advicon2.className = "fa icon-caret-down fa-1";
				}
			}));
			this.advrow3.turnedOn = (this.advrow3.style.display != 'none');
			on(this.advanced3, 'click', lang.hitch(this, function(){
				this.advrow3.turnedOn = (this.advrow3.style.display != 'none');
				if(!this.advrow3.turnedOn){
					this.advrow3.turnedOn = true;
					this.advrow3.style.display = 'block';
					this.advicon3.className = "fa icon-caret-left fa-1";
				}
				else{
					this.advrow3.turnedOn = false;
					this.advrow3.style.display = 'none';
					this.advicon3.className = "fa icon-caret-down fa-1";
				}
			}));
			this.pairToAttachPt1.concat(this.singleToAttachPt).forEach(lang.hitch(this, function(attachname){
				this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function(/*anything*/ value, /*__Constraints*/ constraints){
						return (new RegExp("^(?:" + this._computeRegexp(constraints) + ")" + (this.required ? "" : "?") + "$")).test(value) &&
							(!this._isEmpty(value)) &&
							(this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
					}
				)
			}));

			this.interleaved.turnedOn = (this.interleaved.value == "true");
			on(this.interleaved, 'change', lang.hitch(this, function(){
				if(this.interleaved.turnedOn){
					this.interleaved.turnedOn = false;
					//this.read2block.style.visibility='visible';
					this.read2.set('disabled', false);
				}
				else{
					this.interleaved.turnedOn = true;
//					this.read2block.style.visibility='hidden';
					this.read2.set('disabled', true);
				}
			}));

			//this.read1.set('value',"/" +  window.App.user.id +"/home/");
			//this.read2.set('value',"/" +  window.App.user.id +"/home/");
			//this.single_end_libs.set('value',"/" +  window.App.user.id +"/home/");
			//this.output_path.set('value',"/" +  window.App.user.id +"/home/");
			this._started = true;
		},
		getValues: function(){
			if(typeof String.prototype.startsWith != 'function'){
				String.prototype.startsWith = function(str){
					return this.slice(0, str.length) == str;
				};
			}
			var assembly_values = {};
			var values = this.inherited(arguments);
			if(values.hasOwnProperty("pipeline") && values["pipeline"]){
				assembly_values["pipeline"] = values["pipeline"];
			}
			if(values.hasOwnProperty("min_contig_len") && values["min_contig_len"]){
				assembly_values["min_contig_len"] = values["min_contig_len"];
			}
			if(values.hasOwnProperty("min_contig_cov") && values["min_contig_cov"]){
				assembly_values["min_contig_cov"] = values["min_contig_cov"];
			}
			var pairedList = query(".pairdata");
			var singleList = query(".singledata");
			var pairedLibs = [];
			var singleLibs = [];
			this.ingestAttachPoints(this.paramToAttachPt, assembly_values);
			//for (var k in values) {
			//	if(!k.startsWith("libdat_")){
			//		assembly_values[k]=values[k];
			//	}
			//}
			pairedList.forEach(lang.hitch(this, function(item){
				pairedLibs.push(this.libRecords[item.getAttribute("libID")]);
			}));
			if(pairedLibs.length){
				assembly_values["paired_end_libs"] = pairedLibs;
			}
			singleList.forEach(lang.hitch(this, function(item){
				singleLibs.push(this.libRecords[item.getAttribute("libID")]);
			}));
			if(singleLibs.length){
				assembly_values["single_end_libs"] = singleLibs;
			}
			return assembly_values;

		},
		ingestAttachPoints: function(input_pts, target, req){
			req = typeof req !== 'undefined' ? req : true;
			var success = 1;
			input_pts.forEach(function(attachname){
				var cur_value = null;
				var incomplete = 0;
				var browser_select = 0;
                var alias = attachname;
				if(attachname == "read1" || attachname == "read2" || attachname == "single_end_libs"){
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value=this[attachname].searchBox.get('value');
					//incomplete=((cur_value.replace(/^.*[\\\/]/, '')).length==0);
					browser_select = 1;
				}
				else if(attachname == "output_path"){
					cur_value = this[attachname].searchBox.value;//? "/_uuid/"+this[attachname].searchBox.value : "";
					//cur_value="/_uuid/"+this[attachname].searchBox.value;
					//cur_value=this[attachname].searchBox.get('value');
					browser_select = 1;
				}
				else{
					cur_value = this[attachname].value;
				}

                //Assign cur_value to target
				if(attachname == "paired_platform" || attachname == "single_platform"){
                    alias="platform";
                }

				if(attachname == "single_end_libs"){
                    alias="read";
                }
                if(typeof(cur_value) == "string"){
					target[alias] = cur_value.trim();
				}
				else{
					target[alias] = cur_value;
				}
				if(req && (!target[alias] || incomplete)){
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
				if(target[alias] != ""){
					target[alias] = target[alias] || undefined;
				}
				else if(target[alias] == "true"){
					target[alias] = true;
				}
				else if(target[alias] == "false"){
					target[alias] = false;
				}
			}, this);
			return (success);
		},
		makePairName: function(_self){
			var fn = _self.read1.searchBox.get("displayedValue");
			var fn2 = _self.read2.searchBox.get("displayedValue");
			var maxName = 12;
			if(fn.length > maxName){
				fn = fn.substr(0, (maxName / 2) - 2) + "..." + fn.substr((fn.length - (maxName / 2)) + 2);
			}
			if(fn2.length > maxName){
				fn2 = fn2.substr(0, (maxName / 2) - 2) + "..." + fn2.substr((fn2.length - (maxName / 2)) + 2);
			}
			if(_self.interleaved.turnedOn){
				return "P(" + fn + ")";
			}
			else{
				return "P(" + fn + ", " + fn2 + ")";
			}
		},

		makeSingleName: function(_self){
			var fn = _self.single_end_libs.searchBox.get("displayedValue");
			maxName = 24
			if(fn.length > maxName){
				fn = fn.substr(0, (maxName / 2) - 2) + ".." + fn.substr((fn.length - (maxName / 2)) + 2);
			}
			return "S(" + fn + ")";
		},

		increaseLib: function(){
			this.addedLibs = this.addedLibs + 1;
			this.numlibs.set('value', Number(this.addedLibs));
            this.libCreated+=1;
		},
		decreaseLib: function(){
			this.addedLibs = this.addedLibs - 1;
			this.numlibs.set('value', Number(this.addedLibs));
		},
		onAddSingle: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
			this.ingestAttachPoints(this.advSingleToAttachPt, lrec, false)
			if(chkPassed){
                infoLabels = {
                    "platform":{"label":"Platform","value":1},
                    "read":{"label":"Read File","value":1}
                };
                this.libRecords[this.libCreated]=lrec;
                this.addLibraryRow(lrec, infoLabels, this.makeSingleName, "singledata");
			}
		},

		onAddPair: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {};
			//If you want to disable advanced parameters while not shown this would be the place.
			//but for right now, if you set them and then hide them, they are still active
			var pairToIngest = this.interleaved.turnedOn ? this.pairToAttachPt2 : this.pairToAttachPt1;
			//pairToIngest=pairToIngest.concat(this.advPairToAttachPt);
			var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
			this.ingestAttachPoints(this.advPairToAttachPt, lrec, false)
			if(chkPassed){
                infoLabels = {
                    "platform":{"label":"Platform","value":1},
                    "read1":{"label":"Read1","value":1},
                    "read2":{"label":"Read2","value":1},
                    "interleaved":{"label":"Interleaved","value":0},
                    "insert_size_mean":{"label":"Mean Insert Size","value":1},
                    "insert_size_stdev":{"label":"Std. Insert Size","value":1},
                    "read_orientation_outward":{"label":"Mate Paired","value":0}
                };
                this.libRecords[this.libCreated]=lrec;
                this.addLibraryRow(lrec, infoLabels, this.makePairName, "pairdata");
            }
		},

        addLibraryRow: function(lrec, infoLabels, nameFunc, mode){
            var tr = this.libsTable.insertRow(0);
            var td = domConstruct.create('td', {"class": "textcol "+mode, "libID": this.libCreated, innerHTML: ""}, tr);
            td.innerHTML = "<div class='libraryrow'>" + nameFunc(this) + "</div>";
            var advInfo = [];
            if(mode=="pairdata"){
                advInfo.push("Paired Library");
            }
            else{
                advInfo.push("Single Library");
            }
            //fill out the html of the info mouse over
            Object.keys(infoLabels).forEach(lang.hitch(this,function(key){
                if (lrec[key] && lrec[key]!="false"){
                    if(infoLabels[key].value){
                        advInfo.push(infoLabels[key].label+":"+lrec[key]);
                    }
                    else{
                        advInfo.push(infoLabels[key].label);
                    }
                }
            }));
            if(advInfo.length){
                var tdinfo = domConstruct.create("td", {innerHTML: "<i class='fa icon-info fa-1' />"}, tr);
                var ihandle = new TooltipDialog({
                    content: advInfo.join("</br>"),
                    onMouseLeave: function(){
                        popup.close(ihandle);
                    }
                });
                on(tdinfo, 'mouseover', function(){
                    popup.open({
                        popup: ihandle,
                        around: tdinfo
                    });
                });
                on(tdinfo, 'mouseout', function(){
                    popup.close(ihandle);
                });
            }
            else{
                var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
            }
            var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
            if(this.addedLibs < this.startingRows){
                this.libsTable.deleteRow(-1);
            }
            var handle = on(td2, "click", lang.hitch(this, function(evt){
                console.log("Delete Row");
                domConstruct.destroy(tr);
                this.decreaseLib();
                if(this.addedLibs < this.startingRows){
                    //					var ntr =  domConstr.create("tr",{});
                    //					domConstr.place("ntr",this.libsTableBody,"last");
                    var ntr = this.libsTable.insertRow(-1);
                    var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyyrow'></div>"}, ntr);
                    var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
                    var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
                }
                handle.remove();
            }));
            this.increaseLib();
        }
	});
});

