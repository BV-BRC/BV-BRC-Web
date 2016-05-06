define([
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
				var td2 = domConstr.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"}, tr);
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
				var td2 = domConstr.create("td", {innerHTML: "<i class='fa fa-times fa-1x' />"}, tr);
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

