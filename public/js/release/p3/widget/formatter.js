define("p3/widget/formatter", ["dojo/date/locale", "dojo/dom-construct", "dojo/dom-class"], function(locale, domConstruct, domClass){

	var dateFormatter = function(obj, format){
		if(!obj || obj == "0001-01-01T00:00:00Z"){
			return ""
		}
		if(typeof obj == "string"){
			obj = new Date(Date.parse(obj));
		}else if(typeof obj == "number"){
			obj = new Date(obj);
		}
		if(!obj || !obj.getMonth){
			return " "
		}

		return locale.format(obj, format || {formatLength: "short"});
	};

	var decimalFormatter = function(number, decimal){
		return Math.round(number * Math.pow(10, decimal)) / Math.pow(10, decimal);
	};

	var findObjectByLabel = function(obj, label){
		if(obj.label === label){
			return obj;
		}
		for(var i in obj){
			if(obj.hasOwnProperty(i)){
				var foundLabel = findObjectByLabel(obj[i], label);
				if(foundLabel){
					return foundLabel;
				}
			}
		}
		return null;
	};

	var dateFromEpoch = function(obj, format){
		obj = new Date(new Date().setTime(obj * 1000));
		if(!obj || !obj.getMonth){
			return " "
		}
		return locale.format(obj, format || {formatLength: "short"});
	};

	var formatters = {
		linkGenome: function(value, row){
			return '<a href="/portal/portal/patric/Genome?cType=genome&cId=' + row.genome_id + '">' + value + '</a>';
		},
		linkGenomePATRICCDS: function(value, row){
			if(value == 0 || value == ''){
				return value;
			}
			else{
				return '<a href="/portal/portal/patric/FeatureTable?cType=genome&cId=' + row.genome_id + '&featuretype=CDS&annotation=PATRIC&filtertype=">' + value + '</a>';
			}
		},
		linkGenomeBRC1CDS: function(value, row){
			if(value == 0 || value == ''){
				return value;
			}
			else{
				return '<a href="/portal/portal/patric/FeatureTable?cType=genome&cId=' + row.genome_id + '&featuretype=CDS&annotation=BRC1&filtertype=">' + value + '</a>';
			}
		},
		linkGenomeRefSeqCDS: function(value, row){
			if(value == 0 || value == ''){
				return value;
			}
			else{
				return '<a href="/portal/portal/patric/FeatureTable?cType=genome&cId=' + row.genome_id + '&featuretype=CDS&annotation=RefSeq&filtertype=">' + value + '</a>';
			}
		},
		dateOnly: function(obj){
			return dateFormatter(obj, {selector: "date", formatLength: "short"});
		},
		toInteger: function(obj){
			return decimalFormatter(obj, 0);
		},
		twoDecimalNumeric: function(obj){
			return decimalFormatter(obj, 2);
		},
		date: dateFormatter,
		epochDate: dateFromEpoch,
		runTime: function(obj){
			var hours = Math.floor(obj / 3600);
			var minutes = Math.floor((obj - hours * 3600) / 60);
			var seconds = obj - minutes * 60;
			var run_time = hours ? hours.toString() + "h" : "";
			run_time += minutes ? minutes.toString() + "m" : "";
			run_time += seconds ? seconds.toFixed(0).toString() + "s" : "";
			return run_time;
		},

		objectOrFileSize: function(obj){
			if(obj.type == "folder"){
				return ""
			}
			// console.log("Has UserMeta: ", obj.userMeta);

			if(obj.autoMeta && obj.autoMeta["item_count"]){
				out = obj.autoMeta.item_count;
				switch(obj.type){
					case "genome_group":
						out = out + " genomes";
						break;
					case "feature_group":
						out = out + " features";
						break;
					case "experiment_group":
						out = out + " experiments";
						break;
				}
				return out;
			}else{
				return formatters.humanFileSize(obj.size, true);
			}
		},

		humanFileSize: function(bytes, si){
			if(!bytes && bytes !== 0){
				return ""
			}
			var thresh = si ? 1000 : 1024;
			if(bytes < thresh) return bytes + ' B';
			var units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
			var u = -1;
			do{
				bytes /= thresh;
				++u;
			}while(bytes >= thresh);
			return bytes.toFixed(1) + ' ' + units[u];
		},

		multiDate: function(fields){
			return function(obj){
				var out = [];
				fields.forEach(function(f){
					out.push("<div>" + dateFormatter(obj[f]) + "</div>");
				});
				return out.join("");
			}
		},

		lineage: function(val){
			var out = [];
			if(val && val instanceof Array){
				out = val.reverse().map(function(t){
					return '/ <a href="/taxonomy/' + t.NCBI_TAX_ID + '" rel="cid/widget/TaxonomyViewer">' + t.NAME + "</a>&nbsp;"
				});
				return out.join('');
			}
			return val;
		},
		baseUsername: function(val){
			if(!val){
				return ""
			}
			var parts = val.split("@");
			return parts[0];
		},
		status: function(val){
			return val;
			switch(val){
				case "completed":
					return '<i class="fa icon-check fa-1x" title="Folder" />'
				case "queued":
					return '<i class="fa icon-contigs fa-1x" title="Contigs" />'
			}
		},
		status_alias: function(val){
			switch(val){
				case "deleted":
					return 'failed'
				default:
					return val
			}
		},
		status_indicator: function(val){
			switch(val){
				case "in-progress":
					return '<div><i class="fa icon-circle fa-1x" style="color:green" title="Running" /></div>'
				case "deleted":
					return '<i class="fa icon-circle fa-1x" style="color:red" title="Failed" />'
				case "completed":
					return '<i class="fa icon-circle fa-1x" style="color:blue" title="Completed" />'
				case "failed":
					return '<i class="fa icon-circle fa-1x" style="color:red" title="Failed" />'
				case "queued":
					return '<i class="fa icon-circle fa-1x" style="color:orange" title="Queued" />'
			}
		},
		wsItemType: function(val){
			switch(val){
				case "parentfolder":
					return '<i class="fa icon-level-up fa-1x" title="Folder" />';
				case "folder":
					return '<i class="fa icon-folder fa-1x" title="Folder" />';
				case "contigs":
					return '<i class="fa icon-contigs fa-1x" title="Contigs" />';
				case "fasta":
					return '<i class="fa icon-fasta fa-1x" title="Contigs" />';
				case "feature_group":
					return '<i class="icon-genome-features " title="Contigs" />';
				case "genome_group":
					return '<img src="/public/js/p3/resources/images/genomegroup.svg" style="width:16px;height:16px;"  class="fa fa-2x" title="Genome Group" />';
				case "job_result_DifferentialExpression":
					return '<i class="fa icon-lab fa-1x" title="DiffExp" />';
				case "job_result_GenomeAnnotation":
					return '<i class="fa icon-flag-checkered fa-1x" title="Annotation" />';
				case "job_result_GenomeAssembly":
					return '<i class="fa icon-flag-checkered fa-1x" title="Assembly" />';
				case "job_result_RNASeq":
					return '<i class="fa icon-flag-checkered fa-1x" title="Assembly" />';
				default:
					return '<i class="fa icon-file fa-1x" title="' + (val || "Unspecified Document Type") + '" />'
			}
		},
		appLabel: function(appName){
			if(appName == "GenomeComparison"){
				return "Proteome Comparison"
			}
			return appName;
		},
		autoLabel: function(ws_location, autoData){
			_autoLabels = {};
			if(ws_location == "itemDetail"){
				_app_label = null;
				if(autoData.hasOwnProperty("app") && autoData["app"].hasOwnProperty("id")){
					_app_label = autoData["app"]["id"];
				}
				if(_app_label == "GenomeAnnotation"){
					_autoLabels = {
						"app_label": {"label": "Genome Annotation"},
						"scientific_name": {"label": "Organism"},
						"domain": {"label": "Domain"},
						"num_features": {"label": "Feature count"},
						"genome_id": {"label": "Annotation ID"}
					};
				}
				if(_app_label == "GenomeAssembly"){
					_autoLabels = {"app_label": {"label": "Genome Assembly"}};
				}
				Object.keys(_autoLabels).forEach(function(key){
					var curValue = null;//findObjectByLabel(autoData,key);
					if(curValue){
						_autoLabels[key]["value"] = curValue;
					}
				}, this);
			}
			if(ws_location == "fileView"){
				_autoLabels = {
					"name": {"label": "Filename"},
					"type": {"label": "Type"},
					"creation_time": {"label": "Created", "format": this.date},
					"owner_id": {"label": "Owner"},
					"path": {"label": "Path"},
					"size": {"label": "File Size", "format": this.humanFileSize}
				};
				Object.keys(autoData).forEach(function(key){
					if(_autoLabels.hasOwnProperty(key)){
						if(_autoLabels[key].hasOwnProperty("format")){
							_autoLabels[key]["value"] = _autoLabels[key]["format"](autoData[key]);
						}
						else{
							_autoLabels[key]["value"] = autoData[key];
						}
					}
				});
			}

			return _autoLabels;
		}

	};

	return formatters;
});


