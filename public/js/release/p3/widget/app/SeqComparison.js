require({cache:{
'url:p3/widget/app/templates/SeqComparison.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n    dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n\n    <div style=\"width:800px;margin:auto;\">\n\t<div class=\"apptitle\" id=\"apptitle\">\n\t    <h3>Proteome Comparison</h3>\n\t    <p>Protein sequence-based comparison using bi-directional BLASTP.</p>\n\t</div>\n  \n\t<div style=\"width:800px; margin:auto\" class=\"formFieldsContainer\">\n\t\t<div style=\"display: none;\">\n\t\t\t<input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"false\" data-dojo-attach-point=\"numgenomes\" data-dojo-props=\"constraints:{min:0,max:10},\"/>\n\t\t</div>\n\n\t\t<table class=\"assemblyblocks\" style=\"width:100%\">\n\t\t<tr>\n\t\t<td style=\"width:50%\">\n\t\t\t<table style=\"width:100%\">\n\t\t\t<tr>\n\t\t\t<td>\n\t\t\n\t\t\t<div id=\"dataBox\" class=\"appbox appshadow\">\n\t\t\t\t<div class=\"headerrow\">\n\t\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t\t<label class=\"appboxlabel\">Parameters</label>\n\t\t\t\t\t\t<div name=\"parameterinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n\t\t\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\n\t\t\t\t<div class=\"approw\">\n\t\t\t\t\t<div class=\"approw\" data-dojo-attach-point=\"advanced\">\n\t\t\t\t\t\t<label>Advanced Parameters (optional)</label>\n\t\t\t\t\t\t<div class=\"iconbox\" style=\"margin-left:0px\">\n\t\t\t\t\t\t\t<i data-dojo-attach-point=\"advicon\" class=\"fa icon-caret-down fa-1\"></i>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"approw\"  data-dojo-attach-point=\"advrow\" style=\"display: none\">\n\t\t\t\t\t<div class=\"halfAppRow\">\n\t\t\t\t\t\t<label class=\"paramlabel\" for=\"min_seq_cov\">Minimum % coverage</label></br>\n\t\t\t\t\t\t<div class=\"insertspinner\" name=\"min_seq_cov\" data-dojo-type=\"dijit/form/NumberSpinner\" value=\"30\" data-dojo-attach-point=\"insert_size_mean\" data-dojo-props=\"smallDelta:5, constraints:{min:10,max:100,places:0}\" ></div>\n\t\t\t\t\t</div>\n\t\t\t\t<div class=\"half2AppRow\">\n\t\t\t\t\t\t<label class=\"paramlabel\" for=\"max_e_val\">Blast E-value</label></br>\t\t\n\t\t\t\t\t\t<div data-dojo-type=\"dijit/form/ValidationTextBox\" name=\"max_e_val\" value=\"1e-5\" style=\"width:100%\" required=\"false\" data-dojo-props=\"intermediateChanges:true,promptMessage:'E value is optional, default is set to 1e-5',missingMessage:'E value is optional, default is set to 1e-5.',trim:true,placeHolder:'1e-5'\"></div>\n\t\t\t\t\t</div>\n\t\t\t\t<div class=\"halfAppRow\">\n\t\t\t\t\t\t<label class=\"paramlabel\" for=\"min_ident\">Minimum % identity</label></br>\n\t\t\t\t\t\t<div class=\"insertspinner\" name=\"min_ident\" data-dojo-type=\"dijit/form/NumberSpinner\" value=\"10\" data-dojo-attach-point=\"min_ident\" data-dojo-props=\"smallDelta:5, constraints:{min:10,max:100,places:0}\" ></div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"approw\">\n\t\t\t\t\t<label for=\"output_path\" class=\"paramlabel\">Output Folder</label></br>\n\t\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\"  name=\"output_path\" data-dojo-attach-point=\"output_path\"  required=\"true\" data-dojo-props=\"type:['folder'],multi:false\" data-dojo-attach-event=\"onChange:onOutputPathChange\"></div>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"approw\">\n\t\t\t\t\t<label class=\"paramlabel\">Output Name</label></br>\n\t\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceFilenameValidationTextBox\" name=\"output_file\" data-dojo-attach-point=\"output_file\" style=\"width:85%\" required=\"true\" data-dojo-props=\"intermediateChanges:true,missingMessage:'Name must be provided for the job result',trim:true,placeHolder:'Output Name'\"></div>\n\t\t\t\t</div>\n\n\t\t\t</div>\n\t\t\t\n\t\t\t</td>\n\t\t\t</tr>\n\t\t\t<tr>\n\t\t\t<td>\t\t\n\t\t\t<div id=\"dataBox\" class=\"appbox appshadow\">\n\t\t\t\t<div class=\"headerrow\">\n\t\t\t\t\t<div style=\"width:85%;display:inline-block;\">\n\t\t\t\t\t\t<label class=\"appboxlabel\">Reference Genome</label>\n\t\t\t\t\t\t<div name=\"referenceinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n\t\t\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"approw\">\n\t\t\t\t\t\t<label>Select one reference genome from the following options:</label></br>\n\t\t\t\t\t\t<label>Select a genome</label></br>\n\t\t\t\t\t\t<div data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"ref_genome_id\" maxHeight=200 style=\"width:85%\" required=\"false\" data-dojo-attach-point=\"ref_genome_id\"></div></br>\n\t\t\t\t\t\t<label>or a fasta file</label></br>\n\t\t\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"ref_user_genomes_fasta\" style=\"width:100%\" required=\"false\" data-dojo-props=\"type:['feature_protein_fasta'],multi:false,promptMessage:'Select or Upload protein fasta file to your workspace for Comparison',missingMessage:'User genome file is optional.', placeHolder:'Optional'\"></div>\n\t\t\t\t\t\t<label>or a feature group</label></br>\n\t\t\t\t\t\t<div data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"ref_user_genomes_featuregroup\" style=\"width:100%\" required=\"false\" data-dojo-props=\"type:['feature_group'],multi:false,promptMessage:'Select a feature group',missingMessage:'Feature group is optional.', placeHolder:'Optional'\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t\n\t\t\t</td>\n\t\t\t</tr>\t\t\t\n\t\t\t</table>\n\t\t\t\n\t\t</td>\t\t\n\t\t<td>\t\n\t\t<div id=\"dataBox\" class=\"appbox appshadow\">\n\t\t\t<div class=\"headerrow\">\n\t\t\t\t<div style=\"width:90%;display:inline-block;\">\n\t\t\t\t\t<label class=\"appboxlabel\">Comparison Genomes</label>\n\t\t\t\t\t<div name=\"comparisoninfo\" class=\"infobox iconbox infobutton dialoginfo\">\n\t\t\t\t\t\t<i class=\"fa icon-info-circle fa\"></i>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div class=\"approw\">\n\t\t\t\t\t<label>ADD UP TO 9 GENOMES TO COMPARE (USE PLUS BUTTONS TO ADD)</label></br>                     \n                    <label>Select genome</label></br>\n                    <div style=\"width:85%;display:inline-block;\" data-dojo-attach-event=\"onChange:onSuggestNameChange\" data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"comp_genome_id\" maxHeight=200 required=\"false\" data-dojo-attach-point=\"comp_genome_id\" data-dojo-props=\"placeHolder:'e.g. M. tuberculosis CDC1551'\"></div>\n\t\t\t\t\t<div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddGenome\" class=\"fa icon-plus-circle fa-lg\"></i></div></br>\n                    <label>And/or select fasta file</label></br>\n\t\t\t\t\t<div style=\"width:85%;display:inline-block;\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"user_genomes_fasta\" required=\"false\" data-dojo-attach-point=\"user_genomes_fasta\" data-dojo-props=\"type:['feature_protein_fasta'],multi:false,promptMessage:'Select or Upload protein fasta file to your workspace for Comparison',missingMessage:'User genome file is optional.', placeHolder:'Optional'\"></div>\n\t\t\t\t\t<div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddFasta\" class=\"fa icon-plus-circle fa-lg\"></i></div></br>\n                    <label>And/or select feature group</label></br>\n\t\t\t\t\t<div style=\"width:85%;display:inline-block;\" data-dojo-type=\"p3/widget/WorkspaceObjectSelector\" name=\"user_genomes_featuregroup\" required=\"false\" data-dojo-attach-point=\"user_genomes_featuregroup\" data-dojo-props=\"type:['feature_group'],multi:false,promptMessage:'Select a feature group from your workspace for Comparison',missingMessage:'Feature group is optional.', placeHolder:'Optional'\"></div>\n\t\t\t\t\t<div style=\"width:10%;display:inline-block;\"><i data-dojo-attach-event=\"click:onAddFeatureGroup\" class=\"fa icon-plus-circle fa-lg\"></i></div></br>\n\t\t\t</div>\n\n\t\t\t<div class=\"approw\">\n\t\t\t\t\t<label> selected genome table</label>\n\t\t\t</div>\n\t\t\t\t\t\t\n\t\t\t<div class=\"approw\" style=\"width:90%; margin-top:10px; text-align: center;\">\n\t\t\t<table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"genomeTable\" style='margin:0 0 0 10px; width:100%;'>\n\t\t\t\t<tbody data-dojo-attach-point=\"genomeTableBody\">\n\t\t\t\t\t\t\n\t\t\t\t</tbody>\n\t\t\t</table>\n\t\t\t</div>\t\t\t\n\n\t\t</div>\n\t\t</td>\t\t\n\t\t</tr>\n\t\t</table>\n\t  </div>\n\t</div>\n\n\t<div class=\"appSubmissionArea\">\n\n\t\t<div data-dojo-attach-point=\"workingMessage\" class=\"messageContainer workingMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t    Comparing Genomes\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"errorMessage\" class=\"messageContainer errorMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tError Submitting Job\n\t\t</div>\n\t\t<div data-dojo-attach-point=\"submittedMessage\" class=\"messageContainer submittedMessage\" style=\"margin-top:10px; text-align:center;\">\n\t\t\tGenome Comparison should be finished shortly. Check workspace for results.\n\t\t</div>\n\t\t<div style=\"margin-top: 10px; text-align:center;\">\n\t\t\t<div data-dojo-attach-point=\"resetButton\" type=\"reset\" data-dojo-type=\"dijit/form/Button\">Reset</div>\n\t\t\t<div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Submit</div>\n\t\t</div>\n\t</div>\n</form>\n\n"}});
define("p3/widget/app/SeqComparison", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class",
	"dojo/text!./templates/SeqComparison.html", "./AppBase", "dojo/dom-construct",
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
		applicationName: "GenomeComparison",
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
		},

		startup: function(){
			var _self = this;
			if(this._started){
				return;
			}
			this.inherited(arguments);

			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			_self.output_path.set('value', _self.defaultPath);

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
			console.log("change genome name");
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
			console.log("this.user_genomes_featuregroup name = " + this.name);

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
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.genomeToAttachPt, lrec);
			console.log("this.genomeToAttachPt = " + this.genomeToAttachPt);
			console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
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
			console.log(lrec);
		},

		onAddFasta: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.fastaToAttachPt, lrec);
			console.log("this.fastaToAttachPt = " + this.fastaToAttachPt);
			console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
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
			console.log(lrec);
		},

		onAddFeatureGroup: function(){
			console.log("Create New Row", domConstruct);
			var lrec = {};
			var chkPassed = this.ingestAttachPoints(this.featureGroupToAttachPt, lrec);
			console.log("this.featureGroupToAttachPt = " + this.featureGroupToAttachPt);
			console.log("chkPassed = " + chkPassed + " lrec = " + lrec);
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
			console.log(lrec);
		},

		onSubmit: function(evt){
			var _self = this;

			evt.preventDefault();
			evt.stopPropagation();
			if(this.validate()){
				var values = this.getValues();
				//console.log(values["user_genomes"]);
				//console.log(values["genome_ids"]);
				if((values["user_genomes"] || values["user_feature_groups"] || values["genome_ids"]) && values["reference_genome_index"] > 0){
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

