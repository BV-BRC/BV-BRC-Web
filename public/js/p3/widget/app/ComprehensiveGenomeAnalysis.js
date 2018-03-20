define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/_base/lang", "dojo/_base/Deferred",
	"dojo/on", "dojo/request", "dojo/dom-class", "dojo/dom-construct",
	"dojo/text!./templates/ComprehensiveGenomeAnalysis.html", "dojo/NodeList-traverse", "dojo/store/Memory",
	"dojox/xml/parser",
	"dijit/popup", "dijit/TooltipDialog", "dijit/Dialog",
	"./AppBase", "../../WorkspaceManager"
], function(declare, WidgetBase, lang, Deferred,
	on, xhr, domClass, domConstruct,
	Template, children, Memory,
	xmlParser,
	popup, TooltipDialog, Dialog,
	AppBase, WorkspaceManager){

	return declare([AppBase], {
		"baseClass": "App Assembly2",
		pageTitle: "Comprehensive Genome Analysis Service",
		templateString: Template,
		applicationName: "ComprehensiveGenomeAnalysis",
		applicationHelp: "user_guide/genome_data_and_tools/Comprehensive_genome_analysis_service.html",
		tutorialLink: "tutorial/comprehensive_genome_analysis/comprehensive_genome_analysis.html",
		libraryData: null,
		defaultPath: "",
		startingRows: 6,
		libCreated: 0,
		srrValidationUrl: "https://www.ebi.ac.uk/ena/data/view/{0}&display=xml",
		//below are from annotation
		required: true,
		genera_four: ["Acholeplasma","Entomoplasma","Hepatoplasma","Hodgkinia","Mesoplasma","Mycoplasma","Spiroplasma","Ureaplasma"],
		code_four: false,

		constructor: function(){
			this.addedLibs = {counter: 0};
			this.addedPairs = 0;
			this.pairToAttachPt = ["read1", "read2"];
			this.singleToAttachPt = ["single_end_libs"];
			this.libraryStore = new Memory({data: [], idProperty: "_id"});
			this._autoTaxSet=false;
			this._autoNameSet=false;
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

			this.pairToAttachPt.concat(this.singleToAttachPt).forEach(lang.hitch(this, function(attachname){
				this[attachname].searchBox.validator = lang.hitch(this[attachname].searchBox, function(/*anything*/ value, /*__Constraints*/ constraints){
					return (new RegExp("^(?:" + this._computeRegexp(constraints) + ")" + (this.required ? "" : "?") + "$")).test(value) &&
						(!this._isEmpty(value)) &&
						(this._isEmpty(value) || this.parse(value, constraints) !== undefined); // Boolean
				}
				)
			}));

			this._started = true;
		},

		getValues: function(){
			var values = this.inherited(arguments);
			//inputs that are NOT needed by the backend
			var not_needed_inputs = ["startWith", "libdat_file1pair", "libdat_file2pair", "libdat_readfile"];
			not_needed_inputs.forEach(function(key){
				if(values.hasOwnProperty(key)){
					delete values[key];
				}
			});

			if(this.startWithRead.checked){ //start from read file
				//???
				if(typeof String.prototype.startsWith != 'function'){
					String.prototype.startsWith = function(str){
						return this.slice(0, str.length) == str;
					};
				}

				var pairedList = this.libraryStore.query({"_type": "paired"});
				var singleList = this.libraryStore.query({"_type": "single"});
				var srrAccessionList = this.libraryStore.query({"_type": "srr_accession"});
				var pairedLibs = [];
				var singleLibs = [];
				var srrAccessions = [];

				pairedLibs = pairedList.map(function(lrec){
					var rrec = {};
					Object.keys(lrec).forEach(lang.hitch(this, function(attr){
						if(!attr.startsWith("_")){
							rrec[attr] = lrec[attr];
						}
					}));
					return rrec;
				});
				if(pairedLibs.length){
					values["paired_end_libs"] = pairedLibs;
				}

				singleLibs = singleList.map(function(lrec){
					var rrec = {};
					Object.keys(lrec).forEach(lang.hitch(this, function(attr){
						if(!attr.startsWith("_")){
							rrec[attr] = lrec[attr];
						}
					}));
					return rrec;
				});
				if(singleLibs.length){
					values["single_end_libs"] = singleLibs;
				}

				srrAccessions = srrAccessionList.map(function(lrec){
					return lrec._id;
				})
				if(srrAccessions.length){
					values["srr_ids"] = srrAccessions;
				}
				delete values["contigs"];       //contigs file is not needed
				values["input_type"] = 'reads'; //set input_type to be 'reads'

      } // startWithRead

			values["scientific_name"]=this.output_nameWidget.get('displayedValue');
			values["taxonomy_id"]=this.tax_idWidget.get('displayedValue');
			if(this.startWithContigs.checked){  //starting from contigs
				delete values['recipe'];          //assembly strategy is not needed
				values["input_type"] = 'contigs'; //set input_type to be 'contigs'
			}

			return values;
		},

		ingestAttachPoints: function(input_pts, target, req){
			req = typeof req !== 'undefined' ? req : true;
			var success = 1;
			var duplicate = false;
			if(target._type){
				target["_id"] = this.makeLibraryID(target._type);
				duplicate = target._id in this.libraryStore.index;
			}
			input_pts.forEach(function(attachname){
				var cur_value = null;
				var incomplete = 0;
				var browser_select = 0;
				var alias = attachname;
				if(attachname == "read1" || attachname == "read2" || attachname == "single_end_libs"){
					cur_value = this[attachname].searchBox.value;
					browser_select = 1;
				}
				else if(attachname == "output_path"){
					cur_value = this[attachname].searchBox.value;
					browser_select = 1;
				}
				else{
					cur_value = this[attachname].value;
				}

				// Assign cur_value to target
				if(attachname == "single_end_libs"){
					alias = "read";
				}
				if(typeof(cur_value) == "string"){
					target[alias] = cur_value.trim();
				}
				else{
					target[alias] = cur_value;
				}
				if(req && (duplicate || !target[alias] || incomplete)){
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

		makeLibraryName: function(mode){

			switch(mode){
				case "paired":
					var fn = this.read1.searchBox.get("displayedValue");
					var fn2 = this.read2.searchBox.get("displayedValue");
					var maxName = 14;
					if(fn.length > maxName){
						fn = fn.substr(0, (maxName / 2) - 2) + "..." + fn.substr((fn.length - (maxName / 2)) + 2);
					}
					if(fn2.length > maxName){
						fn2 = fn2.substr(0, (maxName / 2) - 2) + "..." + fn2.substr((fn2.length - (maxName / 2)) + 2);
					}
					return "P(" + fn + ", " + fn2 + ")";

				case "single":
					var fn = this.single_end_libs.searchBox.get("displayedValue");;
					maxName = 24
					if(fn.length > maxName){
						fn = fn.substr(0, (maxName / 2) - 2) + "..." + fn.substr((fn.length - (maxName / 2)) + 2);
					}
					return "S(" + fn + ")";

				case "srr_accession":
					var name = this.srr_accession.get("value");
					return "" + name;

				default:
					return "";
			}
		},

		makeLibraryID: function(mode){
			switch(mode){
				case "paired":
					var fn = this.read1.searchBox.get("value");
					var fn2 = this.read2.searchBox.get("value");
					return fn + fn2;

				case "single":
					var fn = this.single_end_libs.searchBox.get("value");
					return fn;

				case "srr_accession":
					var name = this.srr_accession.get("value");
					return name;

				default:
					return false;
			}
		},

		onReset: function(evt){
			domClass.remove(this.domNode, "Working");
			domClass.remove(this.domNode, "Error");
			domClass.remove(this.domNode, "Submitted");
			var toDestroy = [];
			this.libraryStore.data.forEach(lang.hitch(this, function(lrec){
				toDestroy.push(lrec["_id"]);
			}));
			//because its removing rows cells from array needs separate loop
			toDestroy.forEach(lang.hitch(this, function(id){
				this.destroyLibRow(query_id = id, "_id");
			}));
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

		onAddSingle: function(){
			// console.log("Create New Row", domConstruct);
			var lrec = { _type: "single" };
			var chkPassed = this.ingestAttachPoints(this.singleToAttachPt, lrec);
			if(chkPassed){
				infoLabels = {
					"platform": { "label": "Platform", "value": 1 },
					"read": { "label": "Read File", "value": 1 }
				};
				this.addLibraryRow(lrec, infoLabels, "singledata");
			}
		},

		onAddSRR: function(){
			var accession = this.srr_accession.get('value');
			// console.log("updateSRR", accession, accession.substr(0, 3))
			// var prefixList = ['SRR', 'ERR']
			// if(prefixList.indexOf(accession.substr(0, 3)) == -1){
			// 	this.srr_accession.set("state", "Error")
			// 	return false;
			// }

			// TODO: validate and populate title
			// SRR5121082
			this.srr_accession.set('disabled', true);
			xhr.get(lang.replace(this.srrValidationUrl, [accession]), {})
			.then(lang.hitch(this, function(xml_resp){
				resp = xmlParser.parse(xml_resp).documentElement;
				this.srr_accession.set('disabled', false);
				try {
					title = resp.children[0].childNodes[3].innerHTML;

					this.srr_accession.set("state", "")
					var lrec = {_type: "srr_accession", "title": title};

					var chkPassed = this.ingestAttachPoints(['srr_accession'], lrec);
					if(chkPassed){
						infoLabels = {
							"title": { "label": "Title", "value": 1 }
						}
						this.addLibraryRow(lrec, infoLabels, "srrdata");
					}

				} catch (e) {
					this.srr_accession.set("state", "Error")
					console.debug(e)
				}
			}))
		},

		updateSRR: function(){
		},

		destroyLibRow: function(query_id, id_type){

			var query_obj = {};
			query_obj[id_type] = query_id;
			var toRemove = this.libraryStore.query(query_obj);
			toRemove.forEach(function(obj){
				domConstruct.destroy(obj._row);
				this.decreaseRows(this.libsTable, this.addedLibs, this.numlibs);
				if(this.addedLibs.counter < this.startingRows){
					var ntr = this.libsTable.insertRow(-1);
					var ntd = domConstruct.create('td', { innerHTML: "<div class='emptyrow'></div>" }, ntr);
					var ntd2 = domConstruct.create("td", { innerHTML: "<div class='emptyrow'></div>" }, ntr);
					var ntd3 = domConstruct.create("td", { innerHTML: "<div class='emptyrow'></div>" }, ntr);
				}
				obj._handle.remove();
				this.libraryStore.remove(obj._id);
			}, this);
		},

		onAddPair: function(){
			if(this.read1.searchBox.get("value") == this.read2.searchBox.get("value")){
				var msg = "READ FILE 1 and READ FILE 2 cannot be the same.";
				new Dialog({title: "Notice", content: msg}).show();
				return;
			}
			var lrec = { _type: "paired" };

			var pairToIngest = this.pairToAttachPt;
		  var chkPassed = this.ingestAttachPoints(pairToIngest, lrec);
			if(chkPassed){
				infoLabels = {
					"platform": {"label": "Platform", "value": 1},
					"read1": {"label": "Read1", "value": 1},
					"read2": {"label": "Read2", "value": 1}
				};
				this.addLibraryRow(lrec, infoLabels, "pairdata");
			}
		},

		addLibraryRow: function(lrec, infoLabels, mode){
			var tr = this.libsTable.insertRow(0);
			lrec["_row"] = tr;
			var td = domConstruct.create('td', { "class": "textcol " + mode, "libID": this.libCreated, innerHTML: "" }, tr);
			var advInfo = [];

			switch(mode){
				case "pairdata":
					td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName("paired") + "</div>";
					advInfo.push("Paired Library");
					break;

				case "singledata":
					td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName("single") + "</div>";
					advInfo.push("Single Library");
					break;

				case "srrdata":
					td.innerHTML = "<div class='libraryrow'>" + this.makeLibraryName("srr_accession") + "</div>";
					advInfo.push("SRA run accession");
					break;

				default:
					console.error("wrong data type", lrec, infoLabels, mode)
					break;
			}
			//fill out the html of the info mouse over
			Object.keys(infoLabels).forEach(lang.hitch(this, function(key){
				if(lrec[key] && lrec[key] != "false"){
					if(infoLabels[key].value){
						advInfo.push(infoLabels[key].label + ":" + lrec[key]);
					}
					else{
						advInfo.push(infoLabels[key].label);
					}
				}
			}));
			if(advInfo.length){
				var tdinfo = domConstruct.create("td", { innerHTML: "<i class='fa icon-info fa-1' />" }, tr);
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
				var tdinfo = domConstruct.create("td", { innerHTML: "" }, tr);
			}
			var td2 = domConstruct.create("td", { innerHTML: "<i class='fa icon-x fa-1x' />" }, tr);
			if(this.addedLibs.counter < this.startingRows){
				this.libsTable.deleteRow(-1);
			}
			var handle = on(td2, "click", lang.hitch(this, function(evt){
				this.destroyLibRow(query_id = lrec["_id"], "_id");
			}));
			this.libraryStore.put(lrec);
			lrec["_handle"] = handle;
			this.increaseRows(this.libsTable, this.addedLibs, this.numlibs);
		},

		//below is from annotation
		changeCode: function(item){
			this.code_four=false;
			item.lineage_names.forEach(lang.hitch(this, function(lname){
				if (dojo.indexOf(this.genera_four, lname)>=0){
					this.code_four=true;
				};
			}));
			this.code_four ? this.genetic_code.set("value","4") : this.genetic_code.set("value","11");
		},

		onTaxIDChange: function(val){
      this._autoNameSet=true;
      var tax_id=this.tax_idWidget.get("item").taxon_id;
      var sci_name=this.tax_idWidget.get("item").taxon_name;
      //var tax_obj=this.tax_idWidget.get("item");
      if(tax_id){
        var name_promise=this.scientific_nameWidget.store.get(tax_id);
        name_promise.then(lang.hitch(this, function(tax_obj) {
            if(tax_obj){
                this.scientific_nameWidget.set('item',tax_obj);
                this.scientific_nameWidget.validate();
          this.changeCode(this.tax_idWidget.get("item"));
            }
        }));
      }
			this._autoTaxSet=false;
		},

    updateOutputName: function(){
      var current_output_name = [];
      var sci_item = this.scientific_nameWidget.get("item");
      var label_value = this.myLabelWidget.get("value");
      if(sci_item && sci_item.lineage_names.length > 0){
          current_output_name.push(sci_item.lineage_names.slice(-1)[0].replace(/\(|\)|\||\/|\:/g,''));
      }
      if(label_value.length >0){
          current_output_name.push(label_value);
      }
      if(current_output_name.length > 0){
          this.output_nameWidget.set("value", current_output_name.join(" "));
      }
    },

		onSuggestNameChange: function(val){
      this._autoTaxSet=true;
      var tax_id=this.scientific_nameWidget.get("value");
      if(tax_id){
        this.tax_idWidget.set('displayedValue',tax_id);
        this.tax_idWidget.set('value',tax_id);
        this.changeCode(this.scientific_nameWidget.get("item"));
        this.updateOutputName();
      }
			this._autoNameSet=false;
		},

		onStartWithChange: function(){
			if(this.startWithRead.checked){
				this.readTable.style.display = 'block';
				this.assemblyStrategy.style.display = 'block';
				this.annotationFileBox.style.display = 'none';
				this.numlibs.constraints.min = 1;
				this.contigsFile.required = false;
			}
			if(this.startWithContigs.checked){
				this.readTable.style.display = 'none';
				this.assemblyStrategy.style.display = 'none';
				this.annotationFileBox.style.display = 'block';
				this.numlibs.constraints.min = 0;
				this.contigsFile.required = true;
			}
    }

	});
});
