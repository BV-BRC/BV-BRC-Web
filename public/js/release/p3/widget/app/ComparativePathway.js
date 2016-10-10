require({cache:{
'url:p3/widget/app/templates/ComparativePathway.html':"<form dojoAttachPoint=\"containerNode\" class=\"PanelForm App ${baseClass}\"\n      dojoAttachEvent=\"onreset:_onReset,onsubmit:_onSubmit,onchange:validate\">\n    <div style=\"width: 700px;margin:auto;\">\n        <div class=\"apptitle\" id=\"apptitle\">\n            <h3>Comparative Pathway Tool</h3>\n            <p>[placeholder for description]</p>\n        </div>\n        <div style=\"width:700px; margin:auto\" class=\"formFieldsContainer\">\n            <div style=\"display: none;\">\n                <input data-dojo-type=\"dijit/form/NumberTextBox\" value=\"0\" required=\"true\"\n                       data-dojo-attach-point=\"numlibs\" data-dojo-props=\"constraints:{min:1,max:1000},\"/>\n            </div>\n            <table class=\"assemblyblocks\" style=\"width:100%\">\n                <tr>\n                    <td>\n                        <div class=\"appbox appshadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appboxlabel\"> Select Genome</label>\n                                </div>\n                                <div style=\"width:10%;display:inline-block;\">\n                                    <i data-dojo-attach-event=\"click:onAddGenome\"\n                                       class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                                </div>\n                            </div>\n                            <div class=\"approw\">\n                                <label class=\"paramlabel\">Genome</label><br>\n                                <div data-dojo-type=\"p3/widget/GenomeNameSelector\" name=\"genome\"\n                                     data-dojo-attach-point=\"genome\" style=\"width: 300px\" required=\"false\"></div>\n                            </div>\n                        </div>\n                        <div class=\"appbox appshadow\">\n                            <div class=\"headerrow\">\n                                <div style=\"width:85%;display:inline-block;\">\n                                    <label class=\"appboxlabel\"> Select Genome Group</label>\n                                </div>\n                                <div style=\"width:10%;display:inline-block;\">\n                                    <i data-dojo-attach-event=\"click:onAddGenomeGroup\"\n                                       class=\"fa icon-arrow-circle-o-right fa-lg\"></i>\n                                </div>\n                            </div>\n                            <div class=\"approw\">\n                                <label class=\"paramlabel\">Genome Group</label><br>\n                                <div name=\"genome_group\" style=\"width:300px\">\n                                    Disabled: please login to enable genome group selection\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"appbox appshadow\">\n                            <div class=\"headerrow\">\n                                <label class=\"appboxlabel\">Parameters</label>\n                                <div name=\"parameterinfo\" class=\"infobox iconbox infobutton dialoginfo\">\n                                    <i class=\"fa icon-info-circle fa\"></i>\n                                </div>\n                            </div>\n                            <div class=\"approw\">\n                                <br/>\n                                <select data-dojo-type=\"dijit/form/Select\"\n                                        name=\"search_on\" style=\"width: 25%\"\n                                        data-dojo-attach-point=\"search_on\" required=\"true\">\n                                    <option value=\"keyword\">Keyword</option>\n                                    <option value=\"pathway_id\">Pathway ID</option>\n                                    <option value=\"ec_number\">EC Number</option>\n                                </select>\n                                <div data-dojo-type=\"dijit/form/TextBox\"\n                                     name=\"keyword\" style=\"width: 70%\"\n                                     data-dojo-attach-point=\"keyword\"\n                                     data-dojo-props=\"trim:true,placeHolder:'Keyword'\"></div>\n                            </div>\n                            <div class=\"approw\">\n                                <label class=\"paramlabel\">Annotation</label><br>\n                                <select data-dojo-type=\"dijit/form/Select\" name=\"annotation\"\n                                        data-dojo-attach-point=\"annotation\" style=\"width:300px\" required=\"true\">\n                                    <option value=\"ALL\">All</option>\n                                    <option value=\"PATRIC\" selected=\"selected\">PATRIC</option>\n                                    <option value=\"RefSeq\">RefSeq</option>\n                                </select>\n                            </div>\n                        </div>\n                    </td>\n                    <td>\n                        <div class=\"appbox appshadow\" style=\"height:251px; width:330px\">\n                            <div class=\"headerrow\">\n                                <label class=\"appboxlabel\">Selected genomes</label>\n                                <div name=\"selectedinfo\" class=\"infobox iconbox infobutton tooltipinfo\">\n                                    <i class=\"fa icon-info-circle fa\"></i>\n                                </div>\n                                <br>\n                                <div class=\"appsublabel\">Place genome(s) here using the arrow buttons.</div>\n                            </div>\n                            <div class=\"approw\" style=\"width:100%; margin-top:10px; text-align: center;\">\n                                <table class=\"librarytable\" frame=\"box\" data-dojo-attach-point=\"libsTable\"\n                                       style='margin:0 0 0 10px; width:90%;'>\n                                    <tbody data-dojo-attach-point=\"libsTableBody\">\n\n                                    </tbody>\n                                </table>\n                            </div>\n                        </div>\n                    </td>\n                </tr>\n            </table>\n        </div>\n\n        <div class=\"appSubmissionArea\">\n            <div style=\"margin-top: 10px; text-align:center;\">\n                <div data-dojo-attach-point=\"submitButton\" type=\"submit\" data-dojo-type=\"dijit/form/Button\">Search</div>\n            </div>\n        </div>\n    </div>\n</form>\n\n"}});
define("p3/widget/app/ComparativePathway", [
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on", "dojo/topic",
	"dojo/dom-class",
	"dojo/text!./templates/ComparativePathway.html", "./AppBase", "dojo/dom-construct",
	"dojo/_base/Deferred", "dojo/aspect", "dojo/_base/lang", "dojo/domReady!", "dijit/form/NumberTextBox",
	"dojo/query", "dojo/dom", "dijit/popup", "dijit/Tooltip", "dijit/Dialog", "dijit/TooltipDialog", "dojo/NodeList-traverse", "../../WorkspaceManager",
	"../WorkspaceObjectSelector"
], function(declare, WidgetBase, on, Topic,
			domClass,
			Template, AppBase, domConstruct,
			Deferred, aspect, lang, domReady, NumberTextBox,
			query, dom, popup, Tooltip, Dialog, TooltipDialog, children, WorkspaceManager,
			WorkspaceObjectSelector){
	return declare([AppBase], {
		"baseClass": "App Assembly",
		templateString: Template,
		applicationName: "ComparativePathway",
		pageTitle: "Comparative Pathway Tool",
		libraryData: null,
		defaultPath: "",
		startingRows: 8,

		constructor: function(){

			this.addedLibs = 0;
			this.addedList = [];
		},

		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			var _self = this;
			_self.defaultPath = WorkspaceManager.getDefaultFolder() || _self.activeWorkspacePath;
			for(var i = 0; i < this.startingRows; i++){
				var tr = this.libsTable.insertRow(0);
				var td = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
				var td3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, tr);
			}
			this.numlibs.startup();
			this._started = true;

			// activate genome group selector when user is logged in
			if(window.App.user){
				var ggDom = query('div[name="genome_group"]')[0];

				this.genome_group = new WorkspaceObjectSelector();
				this.genome_group.set('type', ['genome_group']);
				this.genome_group.placeAt(ggDom, "only");
			}
		},
		increaseLib: function(rec){
			this.addedList.push(rec);
			this.addedLibs = this.addedList.length;
			this.numlibs.set('value', Number(this.addedLibs));
		},
		decreaseLib: function(rec){
			var idx = this.addedList.indexOf(rec);
			if(idx > -1){
				this.addedList.splice(idx, 1);
			}
			this.addedList = this.addedList.filter(function(d){
				return d !== undefined;
			});
			this.addedLibs = this.addedList.length;
			this.numlibs.set('value', Number(this.addedLibs));
		},
		formatName: function(name){
			var maxName = 30;
			if(name.length > maxName){
				name = name.substr(0, (maxName / 2) - 2) + ".." + name.substr((name.length - (maxName / 2)) + 2);
			}
			return name;
		},
		onAddGenome: function(){
			var lrec = {};

			var label = this.genome.get("displayedValue");
			var genome_id = this.genome.get("value");
			lrec.label = label;
			lrec.genome_ids = [genome_id];
			lrec.type = "genome";

			// console.log(lrec);

			var tr = this.libsTable.insertRow(0);
			var td = domConstruct.create('td', {"class": "textcol singledata", innerHTML: ""}, tr);

			td.libRecord = lrec;
			td.innerHTML = "<div class='libraryrow'>" + this.formatName(label) + "</div>";
			var tdinfo = domConstruct.create('td', {innerHTML: ""}, tr);
			var td2 = domConstruct.create('td', {innerHTML: "<i class='fa icon-x fa-1x'/>"}, tr);

			if(this.addedLibs < this.startingRows){
				this.libsTable.deleteRow(-1);
			}
			var handle = on(td2, "click", lang.hitch(this, function(evt){
				domConstruct.destroy(tr);
				this.decreaseLib(lrec);
				if(this.addedLibs < this.startingRows){
					var ntr = this.libsTable.insertRow(-1);
					var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
				}
				handle.remove();
			}));
			this.increaseLib(lrec);
		},
		onAddGenomeGroup: function(){
			var lrec = {};

			var label = this.genome_group.searchBox.get("displayedValue");
			var paths = this.genome_group.searchBox.get("value");
			lrec.path = paths;
			lrec.label = label;
			lrec.type = "genome_group";

			WorkspaceManager.getObjects(paths, false).then(lang.hitch(this, function(objs){

				var genomeIdHash = {};
				objs.forEach(function(obj){
					var data = JSON.parse(obj.data);
					data.id_list.genome_id.forEach(function(d){
						if(!genomeIdHash.hasOwnProperty(d)){
							genomeIdHash[d] = true;
						}
					})
				});
				lrec.genome_ids = Object.keys(genomeIdHash);
				var count = lrec.genome_ids.length;

				// console.log(lrec);

				var tr = this.libsTable.insertRow(0);
				var td = domConstruct.create('td', {"class": "textcol singledata", innerHTML: ""}, tr);

				td.libRecord = lrec;
				td.innerHTML = "<div class='libraryrow'>" + this.formatName(label) + " (" + count + " genomes)" + "</div>";
				var tdinfo = domConstruct.create('td', {innerHTML: ""}, tr);
				var td2 = domConstruct.create('td', {innerHTML: "<i class='fa icon-x fa-1x'/>"}, tr);

				if(this.addedLibs < this.startingRows){
					this.libsTable.deleteRow(-1);
				}
				var handle = on(td2, "click", lang.hitch(this, function(evt){
					domConstruct.destroy(tr);
					this.decreaseLib(lrec);
					if(this.addedLibs < this.startingRows){
						var ntr = this.libsTable.insertRow(-1);
						var ntd = domConstruct.create('td', {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd2 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
						var ntd3 = domConstruct.create("td", {innerHTML: "<div class='emptyrow'></div>"}, ntr);
					}
					handle.remove();
				}));
				this.increaseLib(lrec);
			}));
		},
		onSubmit: function(evt){
			evt.preventDefault();
			evt.stopPropagation();
			if(this.validate()){
				var values = this.getValues();

				console.log(values, this.addedList);

				if(this.addedLibs === 0) return;

				console.log(this.addedList);
				// if(values['taxon_id'] !== ""){
				// 	Topic.publish("/navigate", {href: "/view/Taxonomy/" + values['taxon_id'] + "#view_tab=pathways"});
				// 	return;
				// }

				if(this.addedList.length === 1 && this.addedList[0]['type'] === 'genome_group'){
					Topic.publish("/navigate", {href: "/view/GenomeGroup" + this.addedList[0]['path'] + "#view_tab=pathways"});
				}else{
					var genomeList = [];
					this.addedList.forEach(function(rec){
						genomeList.push(rec.genome_ids);
					});

					Topic.publish("/navigate", {href: "/view/GenomeList/?in(genome_id,(" + genomeList + "))#view_tab=pathways"});
				}
			}else{
				console.error("Form is incomplete");
			}
		}
	});
});
