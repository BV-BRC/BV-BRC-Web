define([
	"dojo/_base/declare","dojo/parser",
	"dojo/topic","dojo/on","dojo/dom","dojo/dom-class","dojo/dom-attr",
	"dijit/registry","dojo/request","dijit/layout/ContentPane",
	"dojo/_base/Deferred",
	"dojo/ready","dojo/parser","rql/query","dojo/_base/lang",
	"p3/router","dijit/Dialog","dojo/dom-construct"
],function(
	declare,parser,
	Topic,on,dom,domClass,domAttr,
	Registry,xhr,ContentPane,
	Deferred,
	Ready,Parser,rql,lang,
	Router,Dialog,domConstruct
) {
	return declare(null, {
		panels: {},
		constructor: function(opts){
			if (opts){	
				for (prop in opts) {
					this[prop]=opts[prop]
				}
			}

			var _self=this;
			this._containers={};
			console.log("Launching Application...");


			on(window,"message", function(evt){
				var msg = evt.data;
				console.log("window.message: ", msg);
				if (!msg || !msg.type) { return; }

				switch(msg.type){
					case "AuthenticationSuccess":
						if (_self.loginWindow){
							_self.loginWindow.close();
						}		
						window.location.reload();
						break;
//						self.accessToken = msg.accessToken;
//						self.user = msg.userProfile;	
//						domClass.add(document.body, "Authenticated");
//						break;
				}					

				Topic.publish("/" + msg.type, msg);
			});

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
			Router.startup();
			this.listen();
		},

		listen: function(){
			var _self = this;

			on(document, ".DialogButton:click", function(evt){
				console.log("DialogButton Click", evt);
				evt.preventDefault();
				evt.stopPropagation();
				var params={};

				var rel = evt.target.attributes.rel.value;
				var parts = rel.split(":");
				var type = parts[0];
				params=parts[1];
				var w = _self.loadPanel(type,params);
		                Deferred.when(w, function(w){
               			     if (!_self.dialog) {
		                            _self.dialog = new Dialog({parseOnLoad:false,title: w.title});
               			     }else{
		                            _self.dialog.set('title', w.title);
               			     }
		                    _self.dialog.set('content', '');
       			             domConstruct.place(w.domNode, _self.dialog.containerNode);
		                    _self.dialog.show();
               			     w.startup();
		                });

				console.log("Open Dialog", type);
			})

			on(document, "dialogAction", function(evt){
				console.log("dialogAction", evt)
				 if (_self.dialog && evt.action=="close"){
					 _self.dialog.hide();
				 }

			});


			Topic.subscribe("/openDialog", function(msg){
				console.log("OpenDialog: ", msg);
				var type = msg.type
				var params=msg.params||{};
				var w = _self.loadPanel(type,params);
		                Deferred.when(w, function(w){
               			     if (!_self.dialog) {
		                            _self.dialog = new Dialog({parseOnLoad:false,title: w.title});
               			     }else{
		                            _self.dialog.set('title', w.title);
               			     }
		                    _self.dialog.set('content', '');
       			             domConstruct.place(w.domNode, _self.dialog.containerNode);
		                    _self.dialog.show();
               			     w.startup();
		                });

				console.log("Open Dialog", type);
			});

			Topic.subscribe("/navigate",function(msg){
					Router.go(msg.href);
			})

			on(document, "A.loginLink:click", function(evt){
				console.log("Login Link Click", evt);
				evt.preventDefault();
				evt.stopPropagation();
				console.log("Target", evt.target.href);
				console.log("Create Dialog()", evt.target.href);
				var dlg = new Dialog({title: "Login", content: '<iframe style="width:400px;height:300px" src="' + evt.target.href + '"></iframe>'});
				dlg.show();
//				_self.loginWindow = window.open(evt.target.href, "_blank", "width=640,height=400,toolbar=0,scrollbars=0,status=0,resizable=0,location=0,menuBar=0");
				console.log("end loginLink Lcik");
			});

			on(document, ".navigationLink:click", function(evt){
				console.log("NavigationLink Click", evt);
				evt.preventDefault();
				evt.stopPropagation();
				console.log("Target", evt.target, evt);
				Router.go(evt.target.pathname || evt.target.href);
			})
		},
        loadPanel: function(id,params,callback){
                var def = new Deferred();
                console.log("Load Panel", id, params);
                var p = this.panels[id];
                if (!p.params){
                        p.params={};
                }

                p.params.title =p.params.title || p.title;
                p.params.closable =true ;
                if (p.ctor && typeof p.ctor=="function"){
                        var w = new p.ctor(p.params);
                        def.resolve(w);
                }else if (p.ctor && typeof p.ctor=="string"){
                        var reqs=[];
                        if (window.App && window.App.production&&p.layer){
                                reqs.push(p.layer);
                        }

                        reqs.push(p.ctor);
                        require(reqs, function(){
                                var prop;
                                var ctor = arguments[arguments.length-1];
                                var w = new ctor(p.params);
                                if(params && p.dataParam){
                                        w.set(p.dataParam,params);
                                }else if (typeof params == "object") {
                                        for (prop in params){
                                                w.set(prop, params[prop]);
                                        }
                                }
                                if (p.wrap) {
                                        var cp = new ContentPane({title: p.params.title || p.title, closable:true});
                                        cp.containerNode.appendChild(w.domNode);
                                        w.startup();
                                        def.resolve(cp);
                                }else{
                                        def.resolve(w);
                                }
                        });
                }
                return def.promise;
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

			// if (newNavState.set && (typeof newNavState.value != 'undefined')){
			// 	this.getCurrentContainer().set(newNavState.set,newNavState.value);
			// 	return;
			// }

			if (newNavState.widgetClass) {
				ctor = this.getConstructor(newNavState.widgetClass)
			}else {
				ctor=ContentPane;
			}

			console.log("Ctor: ", ctor);

			Deferred.when(ctor, function(ctor) {		
				if (!ctor){
					console.error("Unable to load CTOR");
					return;
				}
				var acceptType = newNavState.widgetClass?"application/json":"text/html";
				console.log("got CTOR for ", newNavState.widgetClass);
				var instance;
				var cur = _self.getCurrentContainer();	
				if (cur instanceof ctor) {
					console.log("cur is isntance of ctor");
					instance = cur; 
					
					if ((instance instanceof ContentPane) && !newNavState.content) {
						var dest =  (newNavState.href || window.location.pathname || "/") + "?http_templateStyle=" + (newNavState.templateStyle?newNavState.templateStyle:"embedded")
						console.log("set href to: ", dest);
						instance.set('href', dest);
					}else if (newNavState.set){
						console.log("Set ", newNavState.set, " to ", newNavState.value);
						instance.set(newNavState.set,newNavState.value);
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
				if (newNavState.set){
					opts[newNavState.set]=newNavState.value;
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
			console.log("Navigate to ", msg);
			if (!msg.href) {
				if (msg.id) {
					msg.href = msg.id;
				}
			}
			// }else{
			// 	if ((msg.href==(window.location.pathname + window.location.search)) ||
			// 		(msg.href==window.location.href)) {
			// 		return;
			// 	}
			// }

			this._doNavigation(msg);
		}

	});
});
