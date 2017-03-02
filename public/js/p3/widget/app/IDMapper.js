define([
	"dojo/_base/declare", "dijit/_WidgetBase", "dojo/on",
	"dojo/dom-class", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/IDMapper.html", "dijit/form/Form", "../../util/PathJoin",
	"dojo/request", "../viewer/IDMappingApp", "../../WorkspaceManager", "../WorkspaceObjectSelector",
    "dojo/query"

], function(declare, WidgetBase, on,
			domClass, Templated, WidgetsInTemplate,
			Template, FormMixin, PathJoin,
			xhr, ResultContainer, WorkspaceManager, WorkspaceObjectSelector,query){
	return declare([WidgetBase, FormMixin, Templated, WidgetsInTemplate], {
		"baseClass": "IDMapper",
		templateString: Template,
		path: "",
		mapFromIDs: null,
		mapToIDs: null,
        result_store: null,
        result_grid: null,
        defaultPath: "",

		startup: function(){

			// activate genome group selector when user is logged in
			if(window.App.user){
				this.defaultPath = WorkspaceManager.getDefaultFolder() || this.activeWorkspacePath;
            }
                
			this.result = new ResultContainer({
				id: this.id + "_idmapResult",
				style: "min-height: 700px; visibility:hidden;"
			});
			this.result.placeAt(this.idmap_result_div);
			this.result.startup();
        },


		constructor: function(){
			this.mapFromIDs = [];
			this.mapToIDs = [];
			this.watch("mapFromIDs", function(attr, oldVal, val){
				this.leftColumnCount.innerHTML = (val.length || "0") + ((val && val.length > 1) ? " IDs" : " ID");
			});

			this.watch("mapToIDs", function(attr, oldVal, val){
				this.rightColumnCount.innerHTML = (val.length || "0") + ((val && val.length > 1) ? " IDs" : " ID");
				this.rightList.set('value', val.join('\n'));
			});

		},

		validate: function(){
			/*
			console.log("this.validate()",this);
			var valid = this.inherited(arguments);
			if (valid){
				this.saveButton.set("disabled", false)
			}else{
				this.saveButton.set("disabled",true);
			}
			return valid;
			*/
			return true;
		},

		onChange: function(){
			console.log("onChangeType: ", this.leftTypeSelect.get('value'), this.rightTypeSelect.get('value'));
			if(this.leftTypeSelect.get('value') && (this.mapFromIDs && (this.mapFromIDs.length > 0))){
				this.mapButton.set('disabled', false);
			}else{
				this.mapButton.set('disabled', false);
			}

		},

		map: function(){
			console.log("MAP: ", this.mapFromIDs, this.leftTypeSelect.get('value'), this.rightTypeSelect.get('value'));
			var from = this.leftTypeSelect.get('value');
			var to = this.rightTypeSelect.get('value');
			//var ids = this.mapFromIDs.map(encodeURIComponent).join(",");
			var ids = this.mapFromIDs.join(",");
			var q;
            var fromIdGroup = null;
            var toIdGroup = null;
            var patric_id_group ={"patric_id":"","feature_id":"","P2_feature_id":"","alt_locus_tag":"","refseq_locus_tag":"","gene_id":"","gi":"","refseq":""};

            fromIdGroup = (from in patric_id_group) ? "PATRIC" : "OTHER";
            toIdGroup = (to in patric_id_group) ? "PATRIC" : "OTHER";

			var _self = this;

            if (this.leftList.get('value').replace(/^\s+|\s+$/gm,'') != ""){

			    console.log("ids: ", ids);
			    query(".idmap_result_div .GridContainer").style("visibility", "visible");
                _self.result.set('state', {"fromIdGroup": fromIdGroup, "fromId": from, "toIdGroup":toIdGroup, "toId":to, "fromIdValue":ids});
            }

			return;
			if(ids && (ids.length > 0)){
				switch(from){
					case "UniProtKB-ID":
						q = "in(uniprotkb_accession,(" + ids + "))";
						break;
					default:
						q = 'in(id_value,(' + ids + '))&eq(id_type,' + from + ')&limit(99999)'
				}
			}

			console.log('ID MAP Query: ', q);
			xhr.post(PathJoin(window.App.dataAPI, "id_ref") + "/", {
				handleAs: 'json',
				headers: {
					'Accept': "application/json",
					'Content-Type': "application/rqlquery+x-www-form-urlencoded",
					'X-Requested-With': null,
					'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
				},
				data: q
			}).then(function(res){
				console.log("RES: ", res);
				var uniprotIDs = res.map(function(item){
					return item['uniprotkb_accession']
				});

				var lq = 'in(uniprotkb_accession,(' + uniprotIDs.join(',') + '))&eq(id_type,' + to + ')'
				xhr.post(PathJoin(window.App.dataAPI, "id_ref") + "/", {
					handleAs: 'json',
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
					},
					data: lq
				}).then(function(res){
					_self.set('mapToIDs', res.map(function(x){
						return x['id_value'];
					}));
					console.log("RES: ", res);
				});
			});
		},

		onChangeLeft: function(val){
			console.log("VAL: ", val);
			var ids = [];
			var nsplit = val.split("\n");
			nsplit.forEach(function(i){
				var y = i.replace(/^\s+|\s+$/gm,'').split(/[\s,;\t]+/);
				ids = ids.concat(y);
			});
			ids = ids.filter(function(id){
				return !!id;
			});

			var m = {};
			ids.forEach(function(id){
				m[id] = true;
			});
			ids = Object.keys(m);

			this.set("mapFromIDs", ids);

			console.log("FromIDs: ", ids);

			var dispVal = ids.join("\n");

			if(this.leftList.get('value') != dispVal){
			    this.onChange();
				this.leftList.set('value', ids.join("\n"));
			}
		},

		onChangeRight: function(val){
			console.log("VAL: ", val);
		}
	});
});
