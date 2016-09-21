define([
	"dojo/_base/declare", "dojo/parser",
	"dojo/topic", "dojo/on", "dojo/dom", "dojo/dom-class", "dojo/dom-attr",
	"dijit/registry", "dojo/request", "dijit/layout/ContentPane",
	"dojo/_base/Deferred","dojo/query","dojo/NodeList-dom",
	"dojo/ready", "dojo/parser", "rql/query", "dojo/_base/lang",
	"p3/router", "dijit/Dialog", "dojo/dom-construct"
], function(declare, parser,
			Topic, on, dom, domClass, domAttr,
			Registry, xhr, ContentPane,
			Deferred,query,nodeListDom,
			Ready, Parser, rql, lang,
			Router, Dialog, domConstruct){
	return declare(null, {
		panels: {},
		constructor: function(opts){
			if(opts){
				for(var prop in opts){
					this[prop] = opts[prop]
				}
			}

			var _self = this;
			this._containers = {};
			// console.log("Launching Application...");

			/* these two on()s enable the p2 header mouse overs */
			on(document.body, ".has-sub:mouseover", function(evt){
				// console.log("has sub");
				var target = evt.target;
				while(!domClass.contains(target, "has-sub") && target.parentNode){
					target = target.parentNode
				}
				domClass.add(target, "hover");
			});
			on(document.body, ".has-sub:mouseout", function(evt){
				var target = evt.target;
				while(!domClass.contains(target, "has-sub") && target.parentNode){
					target = target.parentNode
				}
				domClass.remove(target, "hover");
			});

			on(window, "message", function(evt){
				var msg = evt.data;
				// console.log("window.message: ", msg);
				if(!msg || !msg.type){
					return;
				}

				switch(msg.type){
					case "AuthenticationSuccess":
						if(_self.loginWindow){
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

			Ready(this, function(){
				// console.log("Instantiate App Widgets");
				query(".showOnLoad").removeClass("dijitHidden");
				Parser.parse().then(function(){
					// console.log("ApplicationContainer: ", _self.getApplicationContainer());
					_self.startup();
				});
			});
		},
		startup: function(){
			var _self = this;
			Router.startup();
			this.listen();
		},

		listen: function(){
			var _self = this;

			on(document, ".DialogButton:click", function(evt){
				// console.log("DialogButton Click", evt);
				evt.preventDefault();
				evt.stopPropagation();
				var params = {};

				var rel = evt.target.attributes.rel.value;
				var parts = rel.split(":");
				var type = parts[0];
				params = parts[1];

				var panel = _self.panels[type];
				if (!panel){
					throw error("Ivalid Panel: " + type);
					return;
				}

				if (panel.requireAuth && (!_self.user || !_self.user.id)){
					Topic.publish("/login");
					return;
				}

				var w = _self.loadPanel(type, params);
				Deferred.when(w, function(w){
					if(!_self.dialog){
						_self.dialog = new Dialog({parseOnLoad: false, title: w.title});
					}else{
						_self.dialog.set('title', w.title);
					}
					_self.dialog.set('content', '');
					domConstruct.place(w.domNode, _self.dialog.containerNode);
					_self.dialog.show();
					w.startup();
				});

				// console.log("Open Dialog", type);
			});

			on(document, "dialogAction", function(evt){
				// console.log("dialogAction", evt)
				if(_self.dialog && evt.action == "close"){
					_self.dialog.hide();
				}

			});

			Topic.subscribe("/openDialog", function(msg){
				// console.log("OpenDialog: ", msg);
				var type = msg.type
				var params = msg.params || {};
				var w = _self.loadPanel(type, params);
				Deferred.when(w, function(w){
					if(!_self.dialog){
						_self.dialog = new Dialog({parseOnLoad: false, title: w.title});
					}else{
						_self.dialog.set('title', w.title);
					}
					_self.dialog.set('content', '');
					domConstruct.place(w.domNode, _self.dialog.containerNode);
					_self.dialog.show();
					w.startup();
				});

				// console.log("Open Dialog", type);
			});

			on(window,"message", function(msg){
				if (msg && msg.data=="RemoteReady"){
					return;
				}
				msg = JSON.parse(msg.data);
				if (msg && msg.topic){
					Topic.publish(msg.topic, msg.payload);
				}
			},"*")

			Topic.subscribe("/navigate", function(msg){
				//console.log("app.js handle /navigate msg");
				//console.log("msg.href length: ", msg.href.length)
				if (!msg || !msg.href ){
					console.error("Missing navigation message");
					return;
				}

				 if (msg.target && msg.target=="blank"){
						var child = window.open('/remote', '_blank');
						var handle = on(child,"message", function(cmsg){
							if (cmsg && cmsg.data && cmsg.data=="RemoteReady") {
								child.postMessage(JSON.stringify({
									"topic": "/navigate",
									"payload": {"href": msg.href}
								}), "*")
								handle.remove();
							}
						});
						return;
				}
				Router.go(msg.href);
			});

			var showAuthDlg = function(evt){
				// console.log("Login Link Click", evt);
				if(evt){
					evt.preventDefault();
					evt.stopPropagation();
					// console.log("Target", evt.target.href);
					// console.log("Create Dialog()", evt.target.href);
				}
				var dlg = new Dialog({
					title: "Login",
					content: '<iframe style="width:400px;height:300px;" src="/login"></iframe>'
				});
				dlg.show();
				// console.log("end loginLink Lcik");
			};

			var timer;
			on(document, ".HomeServiceLink:click", function(evt){
				var target = evt.target;
				var rel;
				console.log("TARGET: ", target);
				if (target.attributes.rel && target.attributes.rel.value){
					rel = target.attributes.rel.value;
				}else{
					target = target.parentNode;
					rel = target.attributes.rel.value;
				}

				console.log("SELECT ", rel);
				console.log("Child: ", Registry.byId(rel))
				Registry.byId("p3carousel").selectChild(Registry.byId(rel));
				query(".HomeServiceLink").removeClass("selected");
				domClass.add(target,"selected");


				/*
				if (timer){
					clearTimeout(timer);
				}

				timer = setTimeout(function(){
					Registry.byId("p3carousel").selectChild(Registry.byId("carousel_home"));
				},120000)
				*/
			});

			on(document, ".loginLink:click", showAuthDlg);
			on(document, ".registrationLink:click", function(){
				window.open(_self.accountURL + "/register");
			});
			Topic.subscribe("/login", showAuthDlg);

			on(document, ".navigationLink:click", function(evt){
				// console.log("NavigationLink Click", evt);
				evt.preventDefault();
				// evt.stopPropagation();
				// console.log("APP Link Target: ", evt.target.pathname, evt.target.href, evt.target);
				var parts = evt.target.href.split(evt.target.pathname);
				// console.log("navigationLink:click - " + evt.target.pathname + (parts[1]||"") )
				Router.go(evt.target.pathname + (parts[1] || ""));
			})
		},
		loadPanel: function(id, params, callback){
			var def = new Deferred();
			// console.log("Load Panel", id, params);
			var p = this.panels[id];
			if(!p.params){
				p.params = {};
			}

			p.params.title = p.params.title || p.title;
			p.params.closable = true;
			if(p.ctor && typeof p.ctor == "function"){
				var w = new p.ctor(p.params);
				def.resolve(w);
			}else if(p.ctor && typeof p.ctor == "string"){
				var reqs = [];
				if(window.App && window.App.production && p.layer){
					reqs.push(p.layer);
				}

				reqs.push(p.ctor);
				require(reqs, function(){
					var prop;
					var ctor = arguments[arguments.length - 1];
					var w = new ctor(p.params);
					if(params && p.dataParam){
						w.set(p.dataParam, params);
					}else if(typeof params == "object"){
						for(prop in params){
							w.set(prop, params[prop]);
						}
					}
					if(p.wrap){
						var cp = new ContentPane({title: p.params.title || p.title, closable: true});
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
			if(this.applicationContainer){
				// console.log("Already existing AppContainer");
				return this.applicationContainer;
			}
			this.applicationContainer = Registry.byId("ApplicationContainer");
			// console.log("Application Container from registry: ", this.applicationContainer);
			return this.applicationContainer;
		},
		getCurrentContainer: function(){
			var ac = this.getApplicationContainer();
			// console.log("AppContainer: ", ac);
			var ch = ac.getChildren().filter(function(child){
				// console.log("Child Region: ", child.region, child);
				return child.region == "center";
			});
			if(!ch || ch.length < 1){
				console.warn("Unable to find current container");
				return false;
			}

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
			var _self = this;
			if(!newNavState){
				return;
			}

			// console.log("Do Navigation to href: ", newNavState);

			var appContainer = this.getApplicationContainer();

			// if (newNavState.set && (typeof newNavState.value != 'undefined')){
			// 	this.getCurrentContainer().set(newNavState.set,newNavState.value);
			// 	return;
			// }

			if(newNavState.widgetClass){
				ctor = this.getConstructor(newNavState.widgetClass)
			}else{
				ctor = ContentPane;
			}

			// console.log("Ctor: ", ctor);


			// console.log("newNavState.requireAuth: ", newNavState.requireAuth, window.App);
			if(newNavState.requireAuth && (!window.App.user || !window.App.user.id)){
				var cur = _self.getCurrentContainer();
				if(cur){
					appContainer.removeChild(cur, true);
				}

				var lp = ContentPane({
					region: "center",
					content: '<div style="text-align: center;width:100%;"><h3>PATRIC Login</h3><p>This service requires authentication.  Please login or <a href="https://user.patricbrc.org/register/" target="_top">register as a new user.</a></p> <iframe style="width:400px;height:300px;display:inline-block;" src="/login"></iframe></div>'
				});
				appContainer.addChild(lp);
				return;
			}

			Deferred.when(ctor, function(ctor){
				if(!ctor){
					console.error("Unable to load CTOR");
					return;
				}
				var acceptType = newNavState.widgetClass ? "application/json" : "text/html";
				var instance;
				var cur = _self.getCurrentContainer();
				if(cur instanceof ctor){
					instance = cur;
					// console.log("newNavState: ", newNavState);

					instance.set('state', newNavState);

					if(newNavState.set){
						instance.set(newNavState.set, newNavState.value);
					}
					if(instance.resize){
						instance.resize();
					}
					// if ((instance instanceof ContentPane) && !newNavState.content) {

					// 	var dest =  (newNavState.href || window.location.pathname || "/") + "?http_templateStyle=" + (newNavState.templateStyle?newNavState.templateStyle:"embedded")
					// 	instance.set('href', dest);
					// }else if (newNavState){
					// 	instance.set("state", newNavState);
					// }

					// if (instance.resize){
					// 	 instance.resize(); 
					// }
					return;
				}

				var opts = {region: "center", apiServer: _self.apiServer, state: newNavState}
				if(newNavState.set){
					opts[newNavState.set] = newNavState.value;
				}
				// console.log("New Instance Opts: ", opts);
				instance = new ctor(opts);
				// console.log("new instance: ", instance);
				if(cur){
					appContainer.removeChild(cur, true);
				}

				// console.log("Add Instance: ", instance);
				appContainer.addChild(instance);
			});
		},

		getNavigationContent: function(href, acceptType){
			href = this.apiServer + href;
			var headers = {
				"Accept": acceptType,
				'X-Requested-With': null
			}

			// console.log("getNavigationContent: ", href, acceptType);
			return xhr.get(href, {
				headers: headers,
				handleAs: (acceptType == "application/json") ? "json" : "",
				query: (acceptType == "text/html") ? {"http_templateStyle": "embedded"} : "",
				withCredentials: true
			});
			/*.then(function(res){
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
			// console.log("Navigate to ", msg);
			if(!msg.href){
				if(msg.id){
					msg.href = msg.id;
				}
			}
			if(msg.pageTitle){
				window.document.title = msg.pageTitle;
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
