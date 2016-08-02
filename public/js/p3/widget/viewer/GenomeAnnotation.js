define([
	"dojo/_base/declare", "dijit/layout/BorderContainer", "dojo/on",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../PageGrid", "../formatter", "../../WorkspaceManager", "dojo/_base/lang",
	"dojo/dom-attr"
], function(declare, BorderContainer, on,
			domClass, ContentPane, domConstruct,
			Grid, formatter, WorkspaceManager, lang,
			domAttr){
	return declare([BorderContainer], {
		"baseClass": "ExperimentViewer",
		"disabled": false,
		"query": null,
		data: null,
		containerType: "GenomeAnnotation",
		_resultType: null,
		_jobOut: {
			"start_time": {"label": "Start time", "format": formatter.epochDate},
			"elapsed_time": {"label": "Run time", "format": formatter.runTime},
			"end_time": {"label": "End time", "format": formatter.epochDate},
			"parameters": {"label": "Parameters", "format": JSON.stringify}
		},
		_jobOrder: ["start_time", "end_time", "elapsed_time", "parameters"],
		_appLabel: "",
		_resultMetaTypes: {},
		_autoLabels: {},
		getGenomeId: function(){
			var id;
			this._resultObjects.some(function(o){
				if(o.type == "genome"){
					console.log("GENOME OBJECT: ", o);
					id = o.autoMeta.genome_id;
					console.log("Id: ", id);
					return true;
				}
				return false;
			});
			if(id){
				return id;
			}
			throw Error("Missing ID");
		},
		_setDataAttr: function(data){
			this.data = data;
			console.log("job result viewer data: ", data);
			var paths = this.data.autoMeta.output_files.map(function(o){
				return o[0];
			});

			WorkspaceManager.getObjects(paths, true).then(lang.hitch(this, function(objs){
				this._resultObjects = objs;
				console.log("got objects: ", objs);
				this.setupResultType();
				this.refresh();
			}));

		},
		setupResultType: function(){
			if(this.data.autoMeta.app.id){
				this._resultType = this.data.autoMeta.app.id;
			}
			if(this._resultType == "GenomeAnnotation"){
				this._resultMetaTypes = {"genome": {"label": "Genome"}};
				this._appLabel = "Genome Annotation";
				this._autoLabels = {
					"scientific_name": {"label": "Organism"},
					"domain": {"label": "Domain"},
					"num_features": {"label": "Feature count"},
					"genome_id": {"label": "Annotation ID"}
				};
			}
			if(this._resultType == "GenomeAssembly"){
				this._appLabel = "Genome Assembly";
			}
		},
		refresh: function(){
			if(this.data){
				var jobHeader = '<div><div style="width:370px;" ><h3 style="color:#888;font-size:1.3em;font-weight:normal;" class="normal-case close2x"><span style="background:white" class="wrap">';
				if(this.data.autoMeta && this.data.autoMeta.app){
					jobHeader = jobHeader + this._appLabel + " ";
				}
				jobHeader = jobHeader + "Job Result" + '</span></h3>';
				//this.viewer.set('content',jobHeader);

				var output = [];
				output.push(jobHeader + '<table class="p3basic striped far2x" id="data-table"><tbody>');
				var job_output = [];

				if(this.data.autoMeta){
					this._jobOrder.forEach(function(prop){
						/*if (prop=="output_files") { return; }
						if (prop=="app") { return; }
						if (prop=="job_output") { return; }
						if (prop=="hostname") { return; }*/
						if(!this.data.autoMeta[prop]){
							return;
						}
						if(this._jobOut.hasOwnProperty(prop)){
							//this._jobOut[prop]["value"]=this.data.autoMeta[prop];
							var tableLabel = this._jobOut[prop].hasOwnProperty("label") ? this._jobOut[prop]["label"] : prop;
							var tableValue = this._jobOut[prop].hasOwnProperty("format") ? this._jobOut[prop]["format"](this.data.autoMeta[prop]) : this.data.autoMeta[prop];
							job_output.push('<tr class="alt"><th scope="row" style="width:20%"><b>' + this._jobOut[prop]["label"] + '</b></th><td class="last">' + tableValue + "</td></tr>");
						}
					}, this);
				}

				var result_output = [];
				if(this._resultObjects){
					result_output.push('<div style="display:inline-block;" ><h3 style="color:#888;font-size:1.3em;font-weight:normal;" class="normal-case close2x"><span class="wrap">Result Files</span></h3>');
					result_output.push('<table class="p3basic striped far2x"><tbody>');
					result_output.push('<tr><th></th><th>Filename</th><th>Type</th><th>File size</th>')
					var header_row = result_output.length - 1;
					result_output.push('</tr>');
					this._resultObjects.forEach(function(obj){
						result_output.push('<tr class="alt">');
						result_output.push('<th scope="row"><i class="fa icon-download fa" rel="' + obj.path + "/" + obj.name + '" /></th>');
						result_output.push('<td class="last">' + obj.name + "</td>");
						result_output.push('<td class="last">' + obj.type + "</td>");
						result_output.push('<td class="last">' + formatter.humanFileSize(obj.size, 1) + "</td>");
						var subRecord = [];
						if(!this._resultMetaTypes.hasOwnProperty(obj.type)){
							Object.keys(obj.autoMeta).forEach(function(prop){
								if(!obj.autoMeta[prop] || prop == "inspection_started"){
									return;
								}
								var label = this._autoLabels.hasOwnProperty(prop) ? this._autoLabels[prop]["label"] : prop;
								subRecord.push(label + " (" + obj.autoMeta[prop] + ")");
								result_output.push(label + ": " + obj.autoMeta[prop]);
								result_output.push("</td>");
							}, this);
							//_resultMetaTypes contain information for the Job Result table
							if(subRecord.length){
								result_output[header_row] = result_output[header_row] + '<th>Metadata</th>';
								result_output.push('<td class="last">' + subRecord.join(", ") + '</td>');
							}
							result_output.push("</tr>");
						}
						else{
							var subRecord = [];
							Object.keys(obj.autoMeta).forEach(function(prop){
								if(!obj.autoMeta[prop] || prop == "inspection_started"){
									return;
								}
								var label = this._autoLabels.hasOwnProperty(prop) ? this._autoLabels[prop]["label"] : prop;
								subRecord.push(label + " (" + obj.autoMeta[prop] + ")");
							}, this);
							job_output.unshift('<tr class="alt"><th scope="row" style="width:20%"><b>' + this._resultMetaTypes[obj.type]["label"] + '</b></th><td class="last">' + subRecord.join(", ") + "</td></tr>");
						}
					}, this);
					result_output.push("</tbody></table></div>");
				}

				output.push.apply(output, job_output);
				output.push("</tbody></table></div>");
				output.push.apply(output, result_output);

				if(this.data.userMeta){
					Object.keys(this.data.userMeta).forEach(function(prop){
						output.push("<div>" + prop + ": " + this.data.userMeta[prop] + "</div>");
					}, this);
				}

				output.push("</div>");
				this.viewer.set("content", output.join(""));
			}
		},
		startup: function(){
			if(this._started){
				return;
			}
			this.inherited(arguments);
			this.viewer = new ContentPane({content: "Loading Job Results...", region: "center"});
			//this.viewer= new ContentPane({content: "", region: "center"});
			//this.addChild(this.viewHeader);
			this.addChild(this.viewer);

			this.on("i:click", function(evt){
				var rel = domAttr.get(evt.target, 'rel');
				if(rel){
					WorkspaceManager.downloadFile(rel);
				}else{
					console.warn("link not found: ", rel);
				}
			});
		}
	});
});
