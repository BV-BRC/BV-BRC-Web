define("cid/app/app", [
	"dojo/_base/declare","dojo/parser",
	"dojo/topic","dojo/on","dojo/dom","dojo/dom-class","dojo/dom-attr",
	"dijit/registry","dojo/request","dijit/layout/ContentPane",
	"dojo/_base/Deferred","../widget/Drawer","../widget/WorkspaceManager",
	"dojo/ready","dojo/parser","rql/query","../widget/GenomeList"
],function(
	declare,parser,
	Topic,on,dom,domClass,domAttr,
	Registry,xhr,ContentPane,
	Deferred,Drawer,WorkspaceManager,
	Ready,Parser,rql
) {
	return declare(null, {
		constructor: function(opts){
			if (opts){	
				for (prop in opts) {
					this[prop]=opts[prop]
				}
			}

			var _self=this;
			this._containers={};
			console.log("Launching Application...");

			Ready(this,function(){
				console.log("Instantiate App Widgets");
				Parser.parse().then(function() {
					console.log("ApplicationContainer: ", _self.getApplicationContainer());
					_self.startup();
				});
			});	
		},
		startup: function() {	
			var _self=this;

			this.initHistory();

			Topic.subscribe("/navigate", function(msg){
				console.log("do navigation");
				_self.navigate(msg);
			});	

			//on(window,".WorkspaceHeader:click", function(){
			//	_self.toggleFooterMenu();
			//});


			console.log("Application Startup()");
		},

		stateFromLocation: function(){
			console.log("getStateFromLocation");
			var _self=this;
			var query = window.location.search;
			if (window.location.search.charAt(0)=="?") { query = window.location.search.substr(1); }
			var X = rql.Query(query);
			var state = {}
			var current = _self.getCurrentContainer();
//			console.log("getCurrentContainer: ", current);
			var widgetClass = domAttr.get(current.domNode,"data-dojo-type") || current.dojoType;
			if (widgetClass) { state.widgetClass = widgetClass; }
			console.log("StateFromLocation widgetClass: ", widgetClass);	
			X.args.forEach(function(term) {
//				console.log('term',term)
				if (term.name == "filter") {
					state.filter=term.args[0].toString();
				}

			});
			return state;

		},
		initHistory: function(){
			var _self=this;
			var first;
			var fn = function(evt){
				console.log("history state: ", evt?evt.state:"NO EVT PASSED");	
				var state;
				if (evt && evt.state && (Object.keys(evt.state).length>0)){
					console.log("HANDLE EXISTING STATE: ", evt.state);
					state = evt.state;
				}else {
					var s = _self.stateFromLocation();
					window.history.replaceState(s,s.name || s.id || s.href,s.href)
					console.log("HISTORY INIT STATE: ", window.history.state);
					state = window.history.state;
				}

				if (state) {
					console.log("call _doNavigation EVT.STATE: ",state);
					//_self._doNavigation(state);
				}else{
					console.log("No State in History");
				}
			}

			window.onpopstate=fn;
			fn(window.history.state);
			
		},
		applicationContainer: null,

		getApplicationContainer: function(){
			if (this.applicationContainer){
				console.log("Already existing AppContainer");
				return this.applicationContainer;
			}
			this.applicationContainer = Registry.byId("ApplicationContainer");
			console.log("Application Container from registry: ", this.applicationContainer);
			return this.applicationContainer;
		},


		getToolbar: function(){
			if (this.toolbar){
				return this.toolbar;
			}
			this.toolbar= Registry.byId("ApplicationToolbar");
			return this.toolbar;
		},

		getCurrentContainer: function(){
			var ac = this.getApplicationContainer();
			console.log("AppContainer: ", ac);
			var ch = ac.getChildren().filter(function(child){
				console.log("Child Region: ", child.region, child);
				return child.region=="center";
			});
			if (!ch || ch.length<1){ console.warn("Unable to find current container"); return false; }

			return ch[0];
		},

		getConstructor: function(cls){
			var def = new Deferred();
			require([cls], function(ctor){
				def.resolve(ctor);
			});
			return def.promise;
		},

		_doNavigation: function(newNavState){
			var _self=this;
			if (!newNavState){
				return;
			}

			console.log("Do Navigation to href: ", newNavState);

			var appContainer = this.getApplicationContainer();

			var ctor=ContentPane;
			var prop = "content";

			console.log("Ctor: ", ctor);
			if (newNavState.set && (typeof newNavState.value != 'undefined')){
				this.getCurrentContainer().set(newNavState.set,newNavState.value);
				return;
			}

			if (newNavState.widgetClass) {
				ctor = this.getConstructor(newNavState.widgetClass)
				prop = "data";
			}


			Deferred.when(ctor, function(ctor) {		
				var acceptType = newNavState.widgetClass?"application/json":"text/html";
				console.log("got CTOR for ", newNavState.widgetClass);
				var instance;
				var cur = _self.getCurrentContainer();	
				if (cur instanceof ctor) {
					console.log("cur is isntance of ctor");
					instance = cur; 
					if (newNavState.filter) {
						if (!instance.apiServer || instance.apiServer!=_self.apiServer) {
							instance.set("apiServer", _self.apiServer);
						}	
						instance.set("activeFilter",newNavState.filter);
					}

					if ((instance instanceof ContentPane) && !newNavState.content) {
						var dest =  (newNavState.href || window.location.pathname || "/") + "?http_templateStyle=" + (newNavState.templateStyle?newNavState.templateStyle:"embedded")
						console.log("set href to: ", dest);
						instance.set('href', dest);
					}else if (instance.resize){
						 instance.resize(); 
					}
					return;
				}

				console.log("set apiServer: ", _self.apiServer);
				var opts = {region: "center", apiServer: _self.apiServer} 
				if (newNavState.filter){
					opts.activeFilter = newNavState.filter;
				}
				console.log("New Instance Opts: ", opts);
				instance = new ctor(opts);
				if (cur){ 
					appContainer.removeChild(cur,true);
				}
				console.log("Add Instance: ", instance);
				appContainer.addChild(instance);	
			});
		},

		getNavigationContent: function(href,acceptType){
			href = this.apiServer + href;
			var headers = {
				"Accept": acceptType,
				'X-Requested-With':null
			}

			console.log("getNavigationContent: ", href, acceptType);
			return xhr.get(href, {
				headers: headers,
				handleAs:  (acceptType=="application/json")?"json":"",
				query: (acceptType=="text/html")?{"http_templateStyle":"embedded"}:"",
				withCredentials: true
			})/*.then(function(res){
				if (acceptType == "text/html") {
					
				}		
				var cp = new ContentPane({content: "<div class='wideLayer'>"+res+"</div>", region: "center"});
				_self._containers[href]=cp;
				if (_self._currentContainer){
					ac.removeChild(_self._currentContainer,true)
				}

				ac.addChild(cp);
				_self._currentContainer = cp;
			});*/
		},
		navigate: function(msg){
			console.log("Navigate to ", msg.href);
			if (!msg.href) {
				if (msg.id) {
					msg.href = msg.id;
				}
			}else{
				if ((msg.href==(window.location.pathname + window.location.search)) ||
					(msg.href==window.location.href)) {
					return;
				}
			}

			this._doNavigation(msg);
			console.log("PUSH STATE: ", msg.href, msg);
			window.history.pushState(msg,null,encodeURIComponent(msg.href));
		},
		toggleFooterMenu: function(){
			var fm = Registry.byId("FooterMenu");
			var _self=this;
			console.log("fm: ", fm);
			if (fm) {
				if (domClass.contains(fm.domNode,"toggled")){
					domClass.remove(fm.domNode,"toggled");
				}else{
					domClass.add(fm.domNode,"toggled");
				}
				_self.getApplicationContainer().resize();

			}
		}

	});
});
