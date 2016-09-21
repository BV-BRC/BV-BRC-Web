require({cache:{
'url:p3/widget/app/templates/Assembly.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div style=\"width: 700px;margin:auto;\">\n    <div class=\"apptitle\" id=\"apptitle\">\n                <h3>Genome Assembly</h3>\n                <p>Assemble contigs from sequencing reads.</p>\n    </div>\n\t<div style=\"width:700px; margin:auto\" class=\"formFieldsContainer\">\n\t\t<div style=\"display: none;\">\n\t\t\t<input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\" data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n\t\t</div>\n\t\t<table class=\"assemblyblocks\" style=\"width:100%\">\n\t\t<tr>\n\t\t<td>\n\t\t<div id=\"pairedBox\" class=\"appbox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t<label class=\"appboxlabel\"> Paired read library</label>\n\t\t\t\t\t<div name=\"pairinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n\t\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddPair\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label class=\"paramlabel\" for=\"libdat_file1pair\">Read File 1</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file1pair\" data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div data-dojo-attach-point=\"read2block\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"libdat_file2pair\">Read File 2</label><br>\n\t\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_file2pair\" data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div class=\"approwsegment\" data-dojo-attach-point=\"advanced\">\n\t\t\t\t\t<label class=\"largelabel\">Advanced</label>\n\t\t\t\t\t<div class=\"iconbox\" style=\"margin-left:0px\">\n\t\t\t\t\t\t<i data-dojo-attach-point=\"advicon\" class=\"fa icon-caret-down fa-1\"></i>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\"  data-dojo-attach-point=\"advrow\" style=\"display: none\">\n\t\t\t\t<div class=\"approwsegment\" style=\"margin:0 0 0 0\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"libdat_interleaved\">File 1 Interleaved</label><br>\n\t\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"libdat_interleaved\" data-dojo-attach-point=\"interleaved\" required=\"false\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t<option value=\"false\">False</option>\n\t\t\t\t\t<option value=\"true\">True</option>\n\t\t\t\t\t</select>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"approwsegment\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"libdat_avginsert\">Mean Insert Size</label><br>\n\t\t\t\t\t<div class=\"insertspinner\" name=\"libdat_avginsert\" data-dojo-type=\"dijit/form/NumberSpinner\" data-dojo-attach-point=\"insert_size_mean\" data-dojo-props=\"smallDelta:10, constraints:{min:10,max:2000,places:0}\" ></div>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"approwsegment\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"libdat_stdinsert\">Std. Insert Size</label><br>\t\t\n\t\t\t\t\t<div class=\"insertspinner\" name=\"libdat_stdinsert\" data-dojo-type=\"dijit/form/NumberSpinner\" data-dojo-attach-point=\"insert_size_stdev\" data-dojo-props=\"smallDelta:10, constraints:{min:10,max:2000,places:0}\" ></div>\t\t\n\t\t\t\t</div>\n\t\t\t    <div class=\"approw\"  data-dojo-attach-point=\"advrow2\">\n\t\t\t\t    <div class=\"approwsegment\" style=\"margin:0 0 0 0\">\n                        <label class=\"paramlabel\">Mate paired</label><br>\n                        <select data-dojo-type=\"dijit/form/Select\" name=\"read_orientation_outward\" data-dojo-attach-point=\"read_orientation_outward\" required=\"false\" data-dojo-props=\"intermediateChanges:true,missingMessage:'',trim:true,placeHolder:''\">\n                        <option value=\"false\">False</option>\n                        <option value=\"true\">True</option>\n                        </select>\n                    </div>\n                </div>\n\t\t\t</div>\n                </div>\n\n\t\t<div class=\"appbox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t<label class=\"appboxlabel\">Single read library</label>\n\t\t\t\t</div>\n\t\t\t\t<div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSingle\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label class=\"paramlabel\" for=\"singleread\">Read File</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"libdat_readfile\" data-dojo-attach-point=\"single_end_libs\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false\"></div>\n\t\t\t</div>\n                </div>\n\n\t\t<div class=\"appbox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<label class=\"appboxlabel\">Parameters</label>\n\t\t\t\t<div name=\"parameterinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label for=\"recipe\" class=\"paramlabel\">Assembly Strategy</label><br>\n\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"recipe\" data-dojo-attach-point=\"recipe\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t<option value=\"auto\">auto</option>\n\t\t\t\t<option value=\"fast\">fast</option>\n\t\t\t\t<option value=\"full_spades\">full spades</option>\n\t\t\t\t<option value=\"kiki\">kiki</option>\n\t\t\t\t<option value=\"miseq\">miseq</option>\n\t\t\t\t<option value=\"plasmid\">plasmid</option>\n\t\t\t\t<option value=\"smart\">smart</option>\n\t\t\t\t</select>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label for=\"output_path\" class=\"paramlabel\">Output Folder</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"output_path\" data-dojo-attach-point=\"output_path\" style=\"width:300px\" required=\"true\" data-dojo-props=\"type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<label class=\"paramlabel\">Output Name</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n                                <label class=\"paramlabel\" for=\"reference_assembly\">Benchmark Contigs</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"reference_assembly\" data-dojo-attach-point=\"reference_assembly\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['contigs'],multi:false,placeHolder:'Optional'\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t<div class=\"approwsegment\" >\n                    <div data-dojo-attach-point=\"advanced2\" style=\"display:inline-block\">\n                        <label class=\"largelabel\">Advanced</label>\n                        <div class=\"iconbox\" style=\"margin-left:0px\">\n                            <i data-dojo-attach-point=\"advicon2\" class=\"fa icon-caret-down fa-1\"></i>\n                        </div>\n                    </div>\n\t\t\t\t</div>\n\t\t\t</div>\n            <div class=\"approw\"  data-dojo-attach-point=\"advrow2\" style=\"display: none\">\n                <div class=\"appField\">\n                    <label class=\"paramlabel\">Assembly pipeline arguments</label>\n                    <div name=\"pipelineinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                        <i class=\"fa icon-info-circle fa\"></i>\n                    </div>\n                    <div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"pipeline\" style=\"width:100%\" required=\"false\" data-dojo-props=\"intermediateChanges:true,promptMessage:'Advanced assembly pipeline arguments that overrides recipe.',missingMessage:'',trim:true,placeHolder:'Arguments override recipe'\"></div>\n                </div>\n            </div>\n        \t</div>\n\t\t</td>\n\t\t<td>\n\t\t<div class=\"appbox appshadow\" style=\"height:251px; width:330px\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<label class=\"appboxlabel\">Selected libraries</label>\n\t\t\t\t<div name=\"selectedinfo\" class=\"infobox iconbox infobutton tooltipinfo\">\n\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t</div><br>\n\t\t\t\t<div class=\"appsublabel\">Place read files here using the arrow buttons.</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\" style=\"width:100%; margin-top:10px; text-align: center;\">\n\t\t\t<table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\" style='margin:0 0 0 10px; width:90%;'>\n\t\t\t\t<tbody data-dojo-attach-point=\"libsTableBody\">\n\t\t\t\t\t\t\n\t\t\t\t</tbody>\n\t\t\t</table>\n\t\t\t</div>\n\t\t</div>\n\t\t</td>\n\t\t</tr>\n\t\t</table>\n\t\t\n\t\t\n\t</div>\n\t<div class=\"appSubmissionArea\">\n\t\t<div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n\t\t\tSubmitting Assembly Job\n\t\t</div>\n\n\t\t<div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n\t\t\tAssembly Job has been queued.\n\t\t</div>\n\n\t\t<div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n\t\t\t<div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Assembly Job</div>\n\t\t\t<p data-dojo-attach-point=\"errorMessage\">Error</p>\n\t\t</div>\n\t\t\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Assemble</div>\n\t\t</div>\n\t</div>\n\t\n</form>\n\n"}});
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

		constructor: function(){

			this.addedLibs = 0;
			this.addedPairs = 0;
			this.pairToAttachPt1 = ["read1", "read2"];
			this.pairToAttachPt2 = ["read1"];
			this.advPairToAttachPt = ["interleaved", "insert_size_mean", "insert_size_stdev", "read_orientation_outward"];
			this.paramToAttachPt = ["recipe", "output_path", "output_file", "reference_assembly"];
			this.singleToAttachPt = ["single_end_libs"];
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
			pairedList.forEach(function(item){
				pairedLibs.push(item.libRecord)
			});
			if(pairedLibs.length){
				assembly_values["paired_end_libs"] = pairedLibs;
			}
			singleList.forEach(function(item){
				singleLibs.push(item.libRecord["single_end_libs"])
			});
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
		makePairName: function(libRecord){
			var fn = this.read1.searchBox.get("displayedValue");
			var fn2 = this.read2.searchBox.get("displayedValue");
			var maxName = 12;
			if(fn.length > maxName){
				fn = fn.substr(0, (maxName / 2) - 2) + ".." + fn.substr((fn.length - (maxName / 2)) + 2);
			}
			if(fn2.length > maxName){
				fn2 = fn2.substr(0, (maxName / 2) - 2) + ".." + fn2.substr((fn2.length - (maxName / 2)) + 2);
			}
			if(this.interleaved.turnedOn){
				return "P(" + fn + ")";
			}
			else{
				return "P(" + fn + ", " + fn2 + ")";
			}
		},

		makeSingleName: function(libRecord){
			var fn = this.single_end_libs.searchBox.get("displayedValue");
			maxName = 24
			if(fn.length > maxName){
				fn = fn.substr(0, (maxName / 2) - 2) + ".." + fn.substr((fn.length - (maxName / 2)) + 2);
			}
			return "S(" + fn + ")";
		},

		increaseLib: function(){
			this.addedLibs = this.addedLibs + 1;
			this.numlibs.set('value', Number(this.addedLibs));

		},
		decreaseLib: function(){
			this.addedLibs = this.addedLibs - 1;
			this.numlibs.set('value', Number(this.addedLibs));
		},
		onAddSingle: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
			if(chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol singledata", innerHTML: ""}, tr);
				td.libRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makeSingleName() + "</div>";
				var tdinfo = domConstruct.create("td", {innerHTML: ""}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					console.log("Delete Row");
					domConstruct.destroy(tr);
					this.decreaseLib();
					if(this.addedLibs < this.startingRows){
						var ntr = this.libsTable.insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseLib();
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
				var tr = this.libsTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol pairdata", innerHTML: ""}, tr);
				td.libRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.makePairName() + "</div>";
				var advPairInfo = [];
				if(lrec["insert_size_mean"]){
					advPairInfo.push("Mean Insert Size:" + lrec["insert_size_mean"]);
				}
				if(lrec["insert_size_stdev"]){
					advPairInfo.push("Std. Insert Size:" + lrec["insert_size_stdev"]);
				}
				if(lrec["read_orientation_outward"]){
					advPairInfo.push("Mate Paired");
				}
				if(advPairInfo.length){
					var tdinfo = domConstruct.create("td", {innerHTML: "<i class='fa icon-info fa-1' />"}, tr);
					var ihandle = new Tooltip({
						connectId: [tdinfo],
						label: advPairInfo.join("</br>")
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
		}

	});
});

