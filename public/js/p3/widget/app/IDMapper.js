define([
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin",
	"dojo/text!./templates/IDMapper.html","dijit/form/Form","../../util/PathJoin",
	"dojo/request"
], function(
	declare, WidgetBase, on,
	domClass,Templated,WidgetsInTemplate,
	Template,FormMixin,PathJoin,
	xhr
){
	return declare([WidgetBase,FormMixin,Templated,WidgetsInTemplate], {
		"baseClass": "IDMapper",
		templateString: Template,
		path: "",
		mapFromIDs: null,
		mapToIDs: null,
		constructor: function(){
			this.mapFromIDs = []
			this.mapToIDs = [];
			this.watch("mapFromIDs", function(attr,oldVal,val){
				this.leftColumnCount.innerHTML = (val.length || "0") + ((val && val.length>1)?" IDs":" ID") ;
			});	

			this.watch("mapToIDs", function(attr,oldVal,val){
				this.rightColumnCount.innerHTML = (val.length || "0") + ((val && val.length>1)?" IDs":" ID") ;
				this.rightList.set('value',val.join('\n'));
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
			if (this.leftTypeSelect.get('value') && this.rightTypeSelect.get('value') && (this.mapFromIDs && (this.mapFromIDs.length>0))){
				this.mapButton.set('disabled', false);
			}else{
				this.mapButton.set('disabled', true);
			}

		},

		map: function(){
			console.log("MAP: ", this.mapFromIDs, this.leftTypeSelect.get('value'), this.rightTypeSelect.get('value'));
			var from = this.leftTypeSelect.get('value');	
			var to = this.rightTypeSelect.get('value');	
			var ids = this.mapFromIDs.map(encodeURIComponent).join(",");
			var q;

			var _self=this;

			console.log("ids: ", ids);

			return;
			if (ids && (ids.length>0)){
				switch(from){
					case "UniProtKB-ID":
						q = "in(uniprotkb_accession,(" + ids + "))";
						break;
					default:
						q = 'in(id_value,(' + ids + '))&eq(id_type,' + from + ')&limit(99999)'
				}
			}

			console.log('ID MAP Query: ', q);	
			xhr.post(PathJoin(window.App.dataAPI,"id_ref")+"/", {
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
				var uniprotIDs = res.map(function(item) { return item['uniprotkb_accession'] });

				var lq = 'in(uniprotkb_accession,(' + uniprotIDs.join(',') + '))&eq(id_type,' + to + ')'
				xhr.post(PathJoin(window.App.dataAPI,"id_ref")+"/", {
	                                handleAs: 'json',
					headers: {
						'Accept': "application/json",
						'Content-Type': "application/rqlquery+x-www-form-urlencoded",
						'X-Requested-With': null,
						'Authorization': this.token ? this.token : (window.App.authorizationToken || "")
					},
					data: lq
				}).then(function(res){
					_self.set('mapToIDs', res.map(function(x){ return x['id_value'] ; }));
					console.log("RES: ", res);
				});
			});
		},

		onChangeLeft: function(val){
			console.log("VAL: ", val);
			var ids=[];
			var nsplit = val.split("\n");
			nsplit.forEach(function(i){
				var y = i.split(",");
				ids = ids.concat(y);	
			});
			ids = ids.filter(function(id){ return !!id; });

			var m = {};
			ids.forEach(function(id){ m[id]=true; });
			ids = Object.keys(m);
	
			this.set("mapFromIDs", ids);

			console.log("FromIDs: ", ids);
	
			var dispVal = ids.join("\n");


			if (this.leftList.get('value') != dispVal){
				this.leftList.set('value', ids.join("\n")); 
				this.onChange();
			}
		},

		onChangeRight: function(val){
			console.log("VAL: ", val);
		}
	});
});
