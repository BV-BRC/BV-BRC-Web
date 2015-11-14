define([
	"dojo/_base/declare", "./Base", "dojo/on", "dojo/topic",
	"dojo/dom-class", "dijit/layout/ContentPane", "dojo/dom-construct",
	"../formatter", "../TabContainer", "dojo/_base/Deferred",
	"dojo/request", "dojo/_base/lang","dojo/when",
	"../ActionBar", "../ContainerActionBar"
], function(declare, Base, on, Topic,
			domClass, ContentPane, domConstruct,
			formatter, TabContainer, Deferred,
			xhr, lang,when,
			ActionBar
){
	return declare([Base], {
		"disabled": false,
		"query": null,
		"loading": false,
		data: null,
		maxSequences: 500,

		onSetLoading: function(attr, oldVal, loading){
			if (loading){
				this.contentPane.set("content", "<div>Performing Multiple Sequence Alignment. Please Wait...</div>");
			}
		},
		checkSequenceCount: function(query){
			var q = query + "&limit(1)";
			console.log("Check Sequence Count: ",this.apiServiceUrl + "/genome_feature/", q );
			var def = new Deferred();
			xhr.post(this.apiServiceUrl + "/genome_feature/",{
				data: q,
				headers:  {
					"accept": "application/solr+json",
          	    	"content-type": "application/rqlquery+x-www-form-urlencoded",
            	    'X-Requested-With': null,
                	'Authorization': (window.App.authorizationToken || "")
                },
                handleAs: "json"
			}).then(lang.hitch(this, function(res){
				console.log("Check Res: ", res.response.numFound)
				if (res && res.response && res.response.numFound && (res.response.numFound < this.maxSequences)){
					console.log("  Amount OK")
					def.resolve(res.response.numFound);
					return;
				}
				console.log("   TOO Many Sequences");
				def.reject(false);
			}))

			return def.promise;
		},
		onSetState: function(attr,oldVal, state){
			console.log("MSA Viewer onSetState: ", state);
			if (state && state.search){
				when(this.checkSequenceCount(state.search), lang.hitch(this, function(ok){
					console.log("CHECK SEQ COUNT ok: ", ok)
					this.doAlignment()
				}), lang.hitch(this, function(){
					this.showError("There are too many sequences in your query.  Please reduce to below 500 Sequences.");
				}))
			}
		},

		showError: function(msg){
			this.contentPane.set('content', '<div style="background:red; color: #fff;">' + msg + "</div>");
		},
		onSetData: function(attr,oldVal, data){
			this.render();
		},

		render: function(){
			this.contentPane.set('content', "<pre>" + JSON.stringify(this.data,null,3) + "</pre>");
		},

		doAlignment: function(){
			console.log("doAlignment()");
			this.set('loading', true);
			if (this.state && this.state.search){
				var q = this.state.search;



				console.log("RUN MSA Against: ", this.state.search)
				return when(window.App.api.data("multipleSequenceAlignment",[q]),lang.hitch(this,function(res){
					console.log("MSA Results: ", res);
					this.set('loading', false);
					this.set('data', res);
				}))
			}
			
		},
		postCreate: function(){
			this.contentPane = new ContentPane({"region": "center"});
			this.addChild(this.contentPane)
		},
		startup: function(){

			if (this._started){return;}

			this.watch("loading", lang.hitch(this, "onSetLoading"));
			this.watch("data", lang.hitch(this, "onSetData"))

			this.inherited(arguments);
		}
	})
});