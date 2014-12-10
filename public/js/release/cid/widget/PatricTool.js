define("cid/widget/PatricTool", [
	"dojo/_base/declare","dijit/_WidgetBase","dojo/on",
	"dojo/dom-class","dojo/request"
], function(
	declare, WidgetBase, on,
	domClass,xhr
){
	return declare([], {
		activeFilter: "",
		dataModel: "",
		query: "",
		apiServer: "",
		_setActiveFilterAttr: function(filter){
			console.log("Set Active Filter: ", filter, "started:", this._started);
			this.activeFilter = filter;
			if (this._started) {
				var _self=this;
				this.getData({handleAs:"json"}).then(function(data){
					if (_self.refresh) { _self.refresh(data) };
				});
			}
		},
		buildQuery: function(extra){
			return "/"+ this.dataModel + "/?" + (this.activeFilter?("&fq("+this.activeFilter+")"):"") +  (this.query||"") + (this.extra||"");
		},

		getData: function() {
			var extra;
			if (arguments[0] && typeof arguments[0]=="string") {
				extra = arguments[0];
				options = arguments[1]||{};
			}else {
				options	= arguments[0]||{};
			}
				
			var url = this.apiServer +  this.buildQuery(extra);
			console.log("URL: ", url);
			var headers = {
				accept: "application/json",
				"content-type": "application/json",
				'X-Requested-With':null
			}

			if (options && options.headers) { 	
				for (prop in options.headers){
					headers[prop]=options.headers[prop];	
				}
			}

			var reqOpts = {headers:headers,withCredentials:true,handleAs:(options&&options.handleAs)?options.handleAs:""};
			return xhr.get(url, reqOpts).then(function(data){
				this.data = data;
				return data;
			});
		},

		_setQueryAttr: function(query){
			this.query=query;
			if (this._started) {
				if (this.refresh) { this.refresh() };
			}

		},
		_setDataModelAttr: function(model){
			this.dataModel=model;
			if (this._started) {
				if (this.refresh) { this.refresh() };
			}
		},
	
		postCreate: function(){
			this.inherited(arguments);
			domClass.add(this.domNode,"PatricTool");
		}

	});
});
