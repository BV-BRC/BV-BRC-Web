require({cache:{
'url:p3/widget/app/templates/AssemblyTest.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div class=\"appsetup appshadow\">\n\t\t\t<label class=\"paramlabel\" style=\"margin:0 10px 0 0;\" for=\"upfolder\">Upload files</label>\n\t\t\t<i name=\"upfolder\"  class=\"fa icon-upload fa-lg\"></i>\n\t\t</div>\n    </div>\n    <div style=\"width: 700px;margin:auto;margin-top: 10px;padding:10px;\">\n\t<div style=\"width:700px; margin:auto\" class=\"formFieldsContainer\">\n\t\t<div style=\"display: none;\">\n\t\t\t<input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\" data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n\t\t</div>\n\t\t<table class=\"assemblyblocks\" style=\"width:100%\">\n\t\t<tr>\n\t\t<td>\n\t\t<div id=\"pairedBox\" class=\"appBox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t<h4 class=\"appBoxLabel\"> Paired read library</h4>\n\t\t\t\t</div>\n\t\t\t\t<div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddPair\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n\t\t\t</div>\n\t\t\t<div class=\"appRow\">\n\t\t\t\t<label class=\"paramlabel\" for=\"libdat_file1pair\">Read File 1</label><br>\n\t\t\t\t<div data-dojo-type=\"/dijit/form/TextBox\" name=\"libdat_file1pair\" data-dojo-attach-point=\"read1\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,value:'${activeWorkspacePath}'\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"appRow\">\n\t\t\t\t<label class=\"paramlabel\" for=\"libdat_file2pair\">Read File 2</label><br>\n\t\t\t\t<div data-dojo-type=\"dijit/form/TextBox\" name=\"libdat_file2pair\" data-dojo-attach-point=\"read2\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,value:'${activeWorkspacePath}'\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"appRow\">\n\t\t\t\t<div class=\"appRowSegment\" style=\"margin:0 0 0 0\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"libdat_interleaved\">Interleaved</label><br>\n\t\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"libdat_interleaved\" data-dojo-attach-point=\"interleaved\" required=\"false\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t\t<option value=\"true\">True</option>\n\t\t\t\t\t<option value=\"false\">False</option>\n\t\t\t\t\t</select>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"appRowSegment\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"libdat__avginsert\">Mean Insert Size</label><br>\n\t\t\t\t\t<div class=\"insertspinner\" name=\"libdat_avginsert\" data-dojo-type=\"dijit/form/NumberSpinner\" data-dojo-attach-point=\"insert_size_mean\" data-dojo-props=\"smallDelta:10, constraints:{min:10,max:2000,places:0}\" ></div>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"appRowSegment\">\n\t\t\t\t\t<label class=\"paramlabel\" for=\"libdat_stdinsert\">Std. Insert</label><br>\t\t\n\t\t\t\t\t<div class=\"insertspinner\" name=\"libdat_stdinsert\" data-dojo-type=\"dijit/form/NumberSpinner\" data-dojo-attach-point=\"insert_size_stdev\" data-dojo-props=\"smallDelta:10, constraints:{min:10,max:2000,places:0}\" ></div>\t\t\n\t\t\t\t</div>\n\t\t\t</div>\n                </div>\n\n\t\t<div class=\"appBox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t<h4 class=\"appBoxLabel\">Single read library</h4>\n\t\t\t\t</div>\n\t\t\t\t<div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddSingle\" class=\"fa icon-arrow-circle-o-right fa-lg\"></i></div>\n\t\t\t</div>\n\t\t\t<label class=\"paramlabel\" for=\"singleread\">Read File</label><br>\n\t\t\t<div data-dojo-type=\"/dijit/form/TextBox\" name=\"libdat_readfile\" data-dojo-attach-point=\"single_end_libs\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['reads'],multi:false,value:'${activeWorkspacePath}'\"></div>\n                </div>\n\n\t\t<div class=\"appBox appshadow\">\n\t\t\t<h4 class=\"appBoxLabel\">Parameters</h4>\n\t\t\t<div class=\"appRow\">\n\t\t\t\t<label for=\"recipe\" class=\"paramlabel\">Assembly Strategy</label><br>\n\t\t\t\t<select data-dojo-type=\"dijit/form/Select\" name=\"recipe\" data-dojo-attach-point=\"recipe\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'MySubFolder'\">\n\t\t\t\t<option value=\"auto\">auto</option>\n\t\t\t\t<option value=\"full_spades\">full spades</option>\n\t\t\t\t<option value=\"fast\">fast</option>\n\t\t\t\t<option value=\"miseq\">miseq</option>\n\t\t\t\t<option value=\"smart\">smart</option>\n\t\t\t\t<option value=\"kiki\">kiki</option>\n\t\t\t\t</select>\n\t\t\t</div>\n\t\t\t<div class=\"appRow\">\n\t\t\t\t<label for=\"output_path\" class=\"paramlabel\">Output Folder</label><br>\n\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"output_path\" data-dojo-attach-point=\"output_path\" style=\"width:300px\" required=\"true\" data-dojo-props=\"type:['folder'],multi:false, value:'${activeWorkspacePath}'\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"appRow\">\n\t\t\t\t<div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:300px\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name Must be provided for Folder',trim:true,placeHolder:'Output Name'\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"appRow\">\n                                <label class=\"paramlabel\" for=\"reference_assembly\">Benchmark Contigs</label><br>\n                                <div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"reference_assembly\" data-dojo-attach-point=\"reference_assembly\" style=\"width:300px\" required=\"false\" data-dojo-props=\"type:['contigs'],multi:false,placeHolder:'Optional'\"></div>\n\t\t\t</div>\n        \t</div>\n\t\t</td>\n\t\t<td>\n\t\t<div class=\"appBox appshadow\" style=\"min-height: 400px; height:auto; width:330px\">\n\t\t\t<h4 class=\"appBoxLabel\">Participating libraries</h4>\n\t\t\t<div style=\"width:100%; text-align: center;\">\n\t\t\t<table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\" style='margin:0 0 0 10px; width:90%;'>\n\t\t\t\t<tbody data-dojo-attach-point=\"libsTableBody\">\n\t\t\t\t\t\t\n\t\t\t\t</tbody>\n\t\t\t</table>\n\t\t\t</div>\n\t\t</div>\n\t\t</td>\n\t\t</tr>\n\t\t</table>\n\t\t\n\t\t\n\t</div>\n\n\t\t<div style=\"width:400px; margin:auto\" class=\"workingMessage messageContainer\">\n\t\t\tSubmitting Assembly Job\n\t\t</div>\n\n\t\t<div style=\"width:400px; margin:auto\" class=\"submittedMessage messageContainer\">\n\t\t\tAssembly Job has been queued.\n\t\t</div>\n\n\t\t<div style=\"width:400px; margin:auto\" class=\"errorMessage messageContainer\">\n\t\t\t<div style=\"font-weight:900;font-size:1.1em;\">Error Submitting Assembly Job</div>\n\t\t\t<p data-dojo-attach-point=\"errorMessage\">Error</p>\n\t\t</div>\n\t\t\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"cancelButton\" data-dojo-attach-event=\"onClick:onCancel\" data-dojo-type=\"dijit/form/Button\">Cancel</div>\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Assemble</div>\n\t\t</div>\t\n\t\n</form>\n\n"}});
define("p3/widget/app/AssemblyTest", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/AssemblyTest.html", "./AppBase", "dojo/dom-construct",
	"dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "dojo/domReady!", "dijit/form/NumberTextBox",
	"dojo/query"
], function(declare, WidgetBase, on,
			domClass,
			Template, AppBase, domConstr,
			Deferred, aspect, lang, domReady, NumberTextBox,
			query){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		templateString: Template,
		applicationName: "GenomeAssembly",
		libraryData: null,
		startingRows: 14,

		constructor: function(){

			this.addedLibs = 0;
			this.addedPairs = 0;
			this.pairToAttachPt = ["read1", "read2", "interleaved", "insert_size_mean", "insert_size_stdev"];
			this.paramToAttachPt = ["recipe", "output_path", "output_file", "reference_assembly"];
			this.singleToAttachPt = ["single_end_libs"];
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			for(i = 0; i < this.startingRows; i++){
				var tr = this.libsTable.insertRow(0);//domConstr.create("tr",{},this.libsTableBody);
				var td = domConstr.create('td', {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td2 = domConstr.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
			this.numlibs.startup();
			this.read1.set('value', "/" + window.App.user.id + "/home/");
			this.read2.set('value', "/" + window.App.user.id + "/home/");
			this.single_end_libs.set('value', "/" + window.App.user.id + "/home/");
			this.output_path.set('value', "/" + window.App.user.id + "/home/");
			/*
			this.libraryGrid = new Grid({
				columns: {'first': 'Libraries in assembly'}
			}, this.gridNode);

			this.libraryGrid.startup();
			this.libraryGrid.renderArray(this.libraryData);
			*/
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
		ingestAttachPoints: function(input_pts, target){
			var success = 1;
			input_pts.forEach(function(attachname){
				var cur_value = null;
				var incomplete = 0;
				var browser_select = 0;
				if(attachname == "read1" || attachname == "read2" || attachname == "single_end_libs"){
					cur_value = this[attachname].searchBox.get('displayedValue');
					incomplete = ((cur_value.replace(/^.*[\\\/]/, '')).length == 0);
					browser_select = 1;
				}
				else if(attachname == "output_path"){
					cur_value = this[attachname].searchBox.get('displayedValue');
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
				if((!target[attachname] || incomplete)){
					if(!browser_select){
						this[attachname]._set("state", "Error");
					}
					success = 0;
				}
				else{
					this[attachname]._set("state", "");
				}
			}, this);
			return (success);
		},
		makePairName: function(libRecord){
			var fn = libRecord["read1"].replace(/^.*[\\\/]/, '');
			var fn2 = libRecord["read2"].replace(/^.*[\\\/]/, '');
			if(fn.length > 10){
				fn = fn.substr(0, 3) + ".." + fn.substr(7, 9);
			}
			if(fn2.length > 10){
				fn2 = fn2.substr(0, 3) + ".." + fn2.substr(7, 9);
			}
			return "(" + fn + ", " + fn2 + ")";
		},

		makeSingleName: function(libRecord){
			var fn = libRecord["single_end_libs"].replace(/^.*[\\\/]/, '');
			if(fn.length > 10){
				fn = fn.substr(0, 3) + ".." + fn.substr(7, 9);
			}
			return fn;
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
			console.log("Create New Row", domConstr);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
			if(chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstr.create('td', {"class": "singledata", innerHTML: ""}, tr);
				td.libRecord = lrec;
				td.innerHTML = this.makeSingleName(td.libRecord);
				var td2 = domConstr.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					console.log("Delete Row");
					domConstr.destroy(tr);
					this.decreaseLib();
					if(this.addedLibs < this.startingRows){
						var ntr = this.libsTable.insertRow(-1);
						var ntd = domConstr.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstr.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseLib();
			}
		},

		onAddPair: function(){
			console.log("Create New Row", domConstr);
//			var tr =  domConstr.create("tr",{});
//			domConstr.place(tr,this.libsTableBody,"first");
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.pairToAttachPt, lrec);
			if(chkPassed){
				var tr = this.libsTable.insertRow(0);
				var td = domConstr.create('td', {"class": "pairdata", innerHTML: ""}, tr);
				td.libRecord = lrec;
				td.innerHTML = this.makePairName(td.libRecord);
				var td2 = domConstr.create("td", {innerHTML: "<i class='fa icon-x fa-1x' />"}, tr);
				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					console.log("Delete Row");
					domConstr.destroy(tr);
					this.decreaseLib();
					if(this.addedLibs < this.startingRows){
						//					var ntr =  domConstr.create("tr",{});
						//					domConstr.place("ntr",this.libsTableBody,"last");
						var ntr = this.libsTable.insertRow(-1);
						var ntd = domConstr.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstr.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseLib();
			}
		}
	});
});

