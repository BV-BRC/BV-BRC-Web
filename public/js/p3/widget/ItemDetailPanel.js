define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/ItemDetailPanel.html", "dojo/_base/lang", "./formatter", "dojo/dom-style",
	"../WorkspaceManager", "dojo/dom-construct", "dojo/query", "./DataItemFormatter"
], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, lang, formatter, domStyle,
			WorkspaceManager, domConstruct, query, DataItemFormatter){
	return declare([WidgetBase, Templated, WidgetsInTemplate], {
		baseClass: "ItemDetailPanel",
		disabled: false,
		changeableTypes: {
			unspecified: {label: "unspecified", value: "unspecified"},
			contigs: {label: "contigs", value: "contigs"},
			reads: {label: "reads", value: "reads"},
			diffexp_input_data: {label: "diffexp_input_data", value: "diffexp_input_data"},
			diffexp_input_metadata: {label: "diffexp_input_metadata", value: "diffexp_input_metadata"}
		},
		templateString: Template,
		selection: null,
		item: null,
		containerWidget: null,

		property_aliases: {
			document_type: "type",
			organism_name: "name"
		},
		_setContainerWidgetAttr: function(val){
			// console.log("Set Container Widget: ", val);
			this._set("containerWidget", val);
		},
		startup: function(){
			var _self = this;
			//if (this._started) { return; }
			var currentIcon;

			this.watch("containerWidget", lang.hitch(this, function(prop, oldVal, containerWidget){

				// console.log("set containerWidget", containerWidget);

				if(oldVal && oldVal.containerType){
					domClass.remove(this.domNode, oldVal.containerType);
				}

				this.containerWidget = containerWidget;
				if(this.containerWidget && this.containerWidget.containerType){
					domClass.add(this.domNode, this.containerWidget.containerType);
				}

			}));

			this.watch("selection", lang.hitch(this, function(prop, oldVal, selection){

				if(!selection || selection.length < 1){
					// console.log("no selection set");
					domClass.add(this.domNode, "noSelection");
					domClass.remove(this.domNode, "multipleSelection");
					domClass.remove(this.domNode, "singleSelection");
				}else if(selection && selection.length == 1){
					// console.log("single selection set");
					domClass.remove(this.domNode, "noSelection");
					domClass.remove(this.domNode, "multipleSelection");
					domClass.add(this.domNode, "singleSelection");
					this.set("item", selection[0]);
				}else if(selection && selection.length > 1){
					// console.log("multiple Selection set");
					domClass.remove(this.domNode, "noSelection");
					domClass.add(this.domNode, "multipleSelection");
					domClass.remove(this.domNode, "singleSelection");
					this.countDisplayNode.innerHTML = selection.length + " items selected.";
				}
			}));

			this.watch("item", lang.hitch(this, function(prop, oldVal, item){
				domClass.remove(_self.typeIcon, currentIcon)
				// console.log("Container Widget: ", this.containerWidget);
				if(item.type){
					domClass.add(this.domNode, "workspaceItem");
					domClass.remove(this.domNode, "dataItem");

					var t = item.document_type || item.type;
					switch(t){
						case "folder":
							domClass.add(_self.typeIcon, "fa icon-folder fa-2x")
							currentIcon = "fa icon-folder fa-2x";
							break;
						//case "contigs":
						//	domClass.add(_self.typeIcon,"fa icon-contigs fa-3x")
						//	currentIcon="fa icon-folder fa-3x";
						//	break;
						case "contigs":
							domClass.add(_self.typeIcon, "fa icon-contigs fa-2x")
							currentIcon = "fa icon-contigs fa-2x";
							break;
						case "fasta":
							domClass.add(_self.typeIcon, "fa icon-fasta fa-2x")
							currentIcon = "fa icon-fasta fa-2x";
							break;
						case "genome_group":
							domClass.add(_self.typeIcon, "fa icon-genome_group fa-2x")
							currentIcon = "fa icon-genome_group fa-2x";
							break;
						case "job_result":
							domClass.add(_self.typeIcon, "fa icon-flag-checkered fa-2x")
							currentIcon = "fa icon-flag-checkered fa-2x";
							break;
						case "feature_group":
							domClass.add(_self.typeIcon, "fa icon-genome-features fa-2x")
							currentIcon = "fa icon-genome-features fa-2x";
							break;

						default:
							domClass.add(_self.typeIcon, "fa icon-file fa-2x")
							currentIcon = "fa icon-file fa-2x";
							break;
					}

					//silence all special help divs
					var specialHelp = query(".specialHelp");
					specialHelp.forEach(function(item){
						dojo.style(item, 'display', 'none');
					});
					Object.keys(item).forEach(function(key){
						var val = item[key];
						if(key == "creation_time"){
							val = formatter.date(val);
						}
						if(key == "name"){
							if(val == "Feature Groups"){
								dojo.style(this.featureGroupHelp, 'display', 'inline-block');
							}
							else if(val == "Genome Groups"){
								dojo.style(this.genomeGroupHelp, 'display', 'inline-block');
							}
							else if(val == "Experiments"){
								dojo.style(this.experimentHelp, 'display', 'inline-block');
							}
							else if(val == "Experiment Groups"){
								dojo.style(this.experimentGroupHelp, 'display', 'inline-block');
							}
						}
						if(key == "type"){
							_self[key + "Node"].set('value', val);
							_self[key + "Node"].set('displayedValue', val);
							_self[key + "Node"].cancel();

							if(this.changeableTypes.hasOwnProperty(val)){
								// build change type dropdown
								_self[key + "Node"].set('disabled', false);
								domStyle.set(_self[key + "Node"].domNode, "text-decoration", "underline");

								domConstruct.place(' <i class="fa icon-caret-down" style="text-decoration: none;"></i>',
									_self[key + "Node"].domNode)

								var type_options = [];
								Object.keys(this.changeableTypes).forEach(function(change_type){
									type_options.push(this.changeableTypes[change_type]);
								}, this);
								_self[key + "Node"].editorParams.options = type_options;
							}
							else{
								_self[key + "Node"].set('disabled', true);
								domStyle.set(_self[key + "Node"].domNode, "text-decoration", "none");
							}
						}
						else if(this.property_aliases[key] && _self[this.property_aliases[key] + "Node"]){
							_self[this.property_aliases[key] + "Node"].innerHTML = val;
						}else if(this.property_aliases[key] && _self[this.property_aliases[key] + "Widget"]){
							_self[this.property_aliases[key] + "Widget"].set("value", val);
						}else if(_self[key + "Node"]){
							_self[key + "Node"].innerHTML = val;
						}else if(_self[key + "Widget"]){
							_self[key + "Widget"].set("value", val);
						}else if(key == "autoMeta"){
							var curAuto = formatter.autoLabel("itemDetail", item.autoMeta);
							subRecord = [];
							Object.keys(curAuto).forEach(function(prop){
								if(!curAuto[prop] || prop == "inspection_started"){
									return;
								}
								if(curAuto[prop].hasOwnProperty("label") && curAuto[prop].hasOwnProperty("value")){
									subRecord.push('<div class="ItemDetailAttribute">' + curAuto[prop]["label"] + ': <span class="ItemDetailAttributeValue">' + curAutoLabel[prop]["value"] + '</span></div></br>');
								}
								else if(curAuto[prop].hasOwnProperty("label")){
									subRecord.push('<div class="ItemDetailAttribute">' + curAuto[prop]["label"] + '</div></br>');
								}
							}, this);
							_self["autoMeta"].innerHTML = subRecord.join("\n");
							//	Object.keys(val).forEach(function(aprop){
							//	},this);
						}
					}, this);
				}else if(this.containerWidget && this.containerWidget.containerType){
					domClass.remove(this.domNode, "workspaceItem");
					domClass.add(this.domNode, "dataItem");

					var node = DataItemFormatter(item, this.containerWidget.containerType)
					domConstruct.empty(this.itemBody);
					domConstruct.place(node, this.itemBody, "first");
				}else if(item && item._formatterType){

					domClass.remove(this.domNode, "workspaceItem");
					domClass.add(this.domNode, "dataItem");

					var node = DataItemFormatter(item, item._formatterType)
					domConstruct.empty(this.itemBody);
					domConstruct.place(node, this.itemBody, "first");

				}else{

					domClass.remove(this.domNode, "workspaceItem");
					domClass.add(this.domNode, "dataItem");

					var node = DataItemFormatter(item, "default")
					domConstruct.empty(this.itemBody);
					domConstruct.place(node, this.itemBody, "first");
				}
			}));
			this.inherited(arguments);
		},

		saveType: function(val, val2){
			// only update meta if value has changed
			if(this.item.type == val) return;

			WorkspaceManager.updateMetadata(this.item.path, false, val)
				.then(function(meta){
					this.item = WorkspaceManager.metaListToObj(meta);
				});
		}
	});
});
