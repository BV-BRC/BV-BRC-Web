(function(
	userConfig,
	defaultConfig
){
	// summary:
	//		This is the "source loader" and is the entry point for Dojo during development. You may also load Dojo with
	//		any AMD-compliant loader via the package main module dojo/main.
	// description:
	//		This is the "source loader" for Dojo. It provides an AMD-compliant loader that can be configured
	//		to operate in either synchronous or asynchronous modes. After the loader is defined, dojo is loaded
	//		IAW the package main module dojo/main. In the event you wish to use a foreign loader, you may load dojo as a package
	//		via the package main module dojo/main and this loader is not required; see dojo/package.json for details.
	//
	//		In order to keep compatibility with the v1.x line, this loader includes additional machinery that enables
	//		the dojo.provide, dojo.require et al API. This machinery is loaded by default, but may be dynamically removed
	//		via the has.js API and statically removed via the build system.
	//
	//		This loader includes sniffing machinery to determine the environment; the following environments are supported:
	//
	//		- browser
	//		- node.js
	//		- rhino
	//
	//		This is the so-called "source loader". As such, it includes many optional features that may be discarded by
	//		building a customized version with the build system.

	// Design and Implementation Notes
	//
	// This is a dojo-specific adaption of bdLoad, donated to the dojo foundation by Altoviso LLC.
	//
	// This function defines an AMD-compliant (http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition)
	// loader that can be configured to operate in either synchronous or asynchronous modes.
	//
	// Since this machinery implements a loader, it does not have the luxury of using a load system and/or
	// leveraging a utility library. This results in an unpleasantly long file; here is a road map of the contents:
	//
	//	 1. Small library for use implementing the loader.
	//	 2. Define the has.js API; this is used throughout the loader to bracket features.
	//	 3. Define the node.js and rhino sniffs and sniff.
	//	 4. Define the loader's data.
	//	 5. Define the configuration machinery.
	//	 6. Define the script element sniffing machinery and sniff for configuration data.
	//	 7. Configure the loader IAW the provided user, default, and sniffing data.
	//	 8. Define the global require function.
	//	 9. Define the module resolution machinery.
	//	10. Define the module and plugin module definition machinery
	//	11. Define the script injection machinery.
	//	12. Define the window load detection.
	//	13. Define the logging API.
	//	14. Define the tracing API.
	//	16. Define the AMD define function.
	//	17. Define the dojo v1.x provide/require machinery--so called "legacy" modes.
	//	18. Publish global variables.
	//
	// Language and Acronyms and Idioms
	//
	// moduleId: a CJS module identifier, (used for public APIs)
	// mid: moduleId (used internally)
	// packageId: a package identifier (used for public APIs)
	// pid: packageId (used internally); the implied system or default package has pid===""
	// pack: package is used internally to reference a package object (since javascript has reserved words including "package")
	// prid: plugin resource identifier
	// The integer constant 1 is used in place of true and 0 in place of false.

	// define a minimal library to help build the loader
	var	noop = function(){
		},

		isEmpty = function(it){
			for(var p in it){
				return 0;
			}
			return 1;
		},

		toString = {}.toString,

		isFunction = function(it){
			return toString.call(it) == "[object Function]";
		},

		isString = function(it){
			return toString.call(it) == "[object String]";
		},

		isArray = function(it){
			return toString.call(it) == "[object Array]";
		},

		forEach = function(vector, callback){
			if(vector){
				for(var i = 0; i < vector.length;){
					callback(vector[i++]);
				}
			}
		},

		mix = function(dest, src){
			for(var p in src){
				dest[p] = src[p];
			}
			return dest;
		},

		makeError = function(error, info){
			return mix(new Error(error), {src:"dojoLoader", info:info});
		},

		uidSeed = 1,

		uid = function(){
			// Returns a unique identifier (within the lifetime of the document) of the form /_d+/.
			return "_" + uidSeed++;
		},

		// FIXME: how to doc window.require() api

		// this will be the global require function; define it immediately so we can start hanging things off of it
		req = function(
			config,		  //(object, optional) hash of configuration properties
			dependencies, //(array of commonjs.moduleId, optional) list of modules to be loaded before applying callback
			callback	  //(function, optional) lambda expression to apply to module values implied by dependencies
		){
			return contextRequire(config, dependencies, callback, 0, req);
		},

		// the loader uses the has.js API to control feature inclusion/exclusion; define then use throughout
		global = this,

		doc = global.document,

		element = doc && doc.createElement("DiV"),

		has = req.has = function(name){
			return isFunction(hasCache[name]) ? (hasCache[name] = hasCache[name](global, doc, element)) : hasCache[name];
		},

		hasCache = has.cache = defaultConfig.hasCache;

	has.add = function(name, test, now, force){
		(hasCache[name]===undefined || force) && (hasCache[name] = test);
		return now && has(name);
	};

	 0 && has.add("host-node", userConfig.has && "host-node" in userConfig.has ?
		userConfig.has["host-node"] :
		(typeof process == "object" && process.versions && process.versions.node && process.versions.v8));
	if( 0 ){
		// fixup the default config for node.js environment
		require("./_base/configNode.js").config(defaultConfig);
		// remember node's require (with respect to baseUrl==dojo's root)
		defaultConfig.loaderPatch.nodeRequire = require;
	}

	 0 && has.add("host-rhino", userConfig.has && "host-rhino" in userConfig.has ?
		userConfig.has["host-rhino"] :
		(typeof load == "function" && (typeof Packages == "function" || typeof Packages == "object")));
	if( 0 ){
		// owing to rhino's lame feature that hides the source of the script, give the user a way to specify the baseUrl...
		for(var baseUrl = userConfig.baseUrl || ".", arg, rhinoArgs = this.arguments, i = 0; i < rhinoArgs.length;){
			arg = (rhinoArgs[i++] + "").split("=");
			if(arg[0] == "baseUrl"){
				baseUrl = arg[1];
				break;
			}
		}
		load(baseUrl + "/_base/configRhino.js");
		rhinoDojoConfig(defaultConfig, baseUrl, rhinoArgs);
	}

	has.add("host-webworker", ((typeof WorkerGlobalScope !== 'undefined') && (self instanceof WorkerGlobalScope)));
	if(has("host-webworker")){
		mix(defaultConfig.hasCache, {
			"host-browser": 0,
			"dom": 0,
			"dojo-dom-ready-api": 0,
			"dojo-sniff": 0,
			"dojo-inject-api": 1,
			"host-webworker": 1
		});

		defaultConfig.loaderPatch = {
			injectUrl: function(url, callback){
				// TODO:
				//		This is not async, nor can it be in Webworkers.  It could be made better by passing
				//		the entire require array into importScripts at.  This way the scripts are loaded in
				//		async mode; even if the callbacks are ran in sync.  It is not a major issue as webworkers
				//		tend to be long running where initial startup is not a major factor.

				try{
					importScripts(url);
					callback();
				}catch(e){
					 0 && console.info("failed to load resource (" + url + ")");
					 0 && console.error(e);
				}
			}
		};
	}

	// userConfig has tests override defaultConfig has tests; do this after the environment detection because
	// the environment detection usually sets some has feature values in the hasCache.
	for(var p in userConfig.has){
		has.add(p, userConfig.has[p], 0, 1);
	}

	//
	// define the loader data
	//

	// the loader will use these like symbols if the loader has the traceApi; otherwise
	// define magic numbers so that modules can be provided as part of defaultConfig
	var	requested = 1,
		arrived = 2,
		nonmodule = 3,
		executing = 4,
		executed = 5;

	if( false ){
		// these make debugging nice; but using strings for symbols is a gross rookie error; don't do it for production code
		requested = "requested";
		arrived = "arrived";
		nonmodule = "not-a-module";
		executing = "executing";
		executed = "executed";
	}

	var legacyMode = 0,
		sync = "sync",
		xd = "xd",
		syncExecStack = [],
		dojoRequirePlugin = 0,
		checkDojoRequirePlugin = noop,
		transformToAmd = noop,
		getXhr;
	if( 1 ){
		req.isXdUrl = noop;

		req.initSyncLoader = function(dojoRequirePlugin_, checkDojoRequirePlugin_, transformToAmd_){
			// the first dojo/_base/loader loaded gets to define these variables; they are designed to work
			// in the presence of zero to many mapped dojo/_base/loaders
			if(!dojoRequirePlugin){
				dojoRequirePlugin = dojoRequirePlugin_;
				checkDojoRequirePlugin = checkDojoRequirePlugin_;
				transformToAmd = transformToAmd_;
			}

			return {
				sync:sync,
				requested:requested,
				arrived:arrived,
				nonmodule:nonmodule,
				executing:executing,
				executed:executed,
				syncExecStack:syncExecStack,
				modules:modules,
				execQ:execQ,
				getModule:getModule,
				injectModule:injectModule,
				setArrived:setArrived,
				signal:signal,
				finishExec:finishExec,
				execModule:execModule,
				dojoRequirePlugin:dojoRequirePlugin,
				getLegacyMode:function(){return legacyMode;},
				guardCheckComplete:guardCheckComplete
			};
		};

		if( 1  || has("host-webworker")){
			// in legacy sync mode, the loader needs a minimal XHR library

			var locationProtocol = location.protocol,
				locationHost = location.host;
			req.isXdUrl = function(url){
				if(/^\./.test(url)){
					// begins with a dot is always relative to page URL; therefore not xdomain
					return false;
				}
				if(/^\/\//.test(url)){
					// for v1.6- backcompat, url starting with // indicates xdomain
					return true;
				}
				// get protocol and host
				// \/+ takes care of the typical file protocol that looks like file:///drive/path/to/file
				// locationHost is falsy if file protocol => if locationProtocol matches and is "file:", || will return false
				var match = url.match(/^([^\/\:]+\:)\/+([^\/]+)/);
				return match && (match[1] != locationProtocol || (locationHost && match[2] != locationHost));
			};


			// note: to get the file:// protocol to work in FF, you must set security.fileuri.strict_origin_policy to false in about:config
			 1 || has.add("dojo-xhr-factory", 1);
			has.add("dojo-force-activex-xhr",  1  && !doc.addEventListener && window.location.protocol == "file:");
			has.add("native-xhr", typeof XMLHttpRequest != "undefined");
			if(has("native-xhr") && !has("dojo-force-activex-xhr")){
				getXhr = function(){
					return new XMLHttpRequest();
				};
			}else{
				// if in the browser an old IE; find an xhr
				for(var XMLHTTP_PROGIDS = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'], progid, i = 0; i < 3;){
					try{
						progid = XMLHTTP_PROGIDS[i++];
						if(new ActiveXObject(progid)){
							// this progid works; therefore, use it from now on
							break;
						}
					}catch(e){
						// squelch; we're just trying to find a good ActiveX progid
						// if they all fail, then progid ends up as the last attempt and that will signal the error
						// the first time the client actually tries to exec an xhr
					}
				}
				getXhr = function(){
					return new ActiveXObject(progid);
				};
			}
			req.getXhr = getXhr;

			has.add("dojo-gettext-api", 1);
			req.getText = function(url, async, onLoad){
				var xhr = getXhr();
				xhr.open('GET', fixupUrl(url), false);
				xhr.send(null);
				if(xhr.status == 200 || (!location.host && !xhr.status)){
					if(onLoad){
						onLoad(xhr.responseText, async);
					}
				}else{
					throw makeError("xhrFailed", xhr.status);
				}
				return xhr.responseText;
			};
		}
	}else{
		req.async = 1;
	}

	//
	// loader eval
	//
	var eval_ =
		// use the function constructor so our eval is scoped close to (but not in) in the global space with minimal pollution
		new Function('return eval(arguments[0]);');

	req.eval =
		function(text, hint){
			return eval_(text + "\r\n//# sourceURL=" + hint);
		};

	//
	// loader micro events API
	//
	var listenerQueues = {},
		error = "error",
		signal = req.signal = function(type, args){
			var queue = listenerQueues[type];
			// notice we run a copy of the queue; this allows listeners to add/remove
			// other listeners without affecting this particular signal
			forEach(queue && queue.slice(0), function(listener){
				listener.apply(null, isArray(args) ? args : [args]);
			});
		},
		on = req.on = function(type, listener){
			// notice a queue is not created until a client actually connects
			var queue = listenerQueues[type] || (listenerQueues[type] = []);
			queue.push(listener);
			return {
				remove:function(){
					for(var i = 0; i<queue.length; i++){
						if(queue[i]===listener){
							queue.splice(i, 1);
							return;
						}
					}
				}
			};
		};

	// configuration machinery; with an optimized/built defaultConfig, all configuration machinery can be discarded
	// lexical variables hold key loader data structures to help with minification; these may be completely,
	// one-time initialized by defaultConfig for optimized/built versions
	var
		aliases
			// a vector of pairs of [regexs or string, replacement] => (alias, actual)
			= [],

		paths
			// CommonJS paths
			= {},

		pathsMapProg
			// list of (from-path, to-path, regex, length) derived from paths;
			// a "program" to apply paths; see computeMapProg
			= [],

		packs
			// a map from packageId to package configuration object; see fixupPackageInfo
			= {},

		map = req.map
			// AMD map config variable; dojo/_base/kernel needs req.map to figure out the scope map
			= {},

		mapProgs
			// vector of quads as described by computeMapProg; map-key is AMD map key, map-value is AMD map value
			= [],

		modules
			// A hash:(mid) --> (module-object) the module namespace
			//
			// pid: the package identifier to which the module belongs (e.g., "dojo"); "" indicates the system or default package
			// mid: the fully-resolved (i.e., mappings have been applied) module identifier without the package identifier (e.g., "dojo/io/script")
			// url: the URL from which the module was retrieved
			// pack: the package object of the package to which the module belongs
			// executed: 0 => not executed; executing => in the process of traversing deps and running factory; executed => factory has been executed
			// deps: the dependency vector for this module (vector of modules objects)
			// def: the factory for this module
			// result: the result of the running the factory for this module
			// injected: (0 | requested | arrived) the status of the module; nonmodule means the resource did not call define
			// load: plugin load function; applicable only for plugins
			//
			// Modules go through several phases in creation:
			//
			// 1. Requested: some other module's definition or a require application contained the requested module in
			//	  its dependency vector or executing code explicitly demands a module via req.require.
			//
			// 2. Injected: a script element has been appended to the insert-point element demanding the resource implied by the URL
			//
			// 3. Loaded: the resource injected in [2] has been evaluated.
			//
			// 4. Defined: the resource contained a define statement that advised the loader about the module. Notice that some
			//	  resources may just contain a bundle of code and never formally define a module via define
			//
			// 5. Evaluated: the module was defined via define and the loader has evaluated the factory and computed a result.
			= {},

		cacheBust
			// query string to append to module URLs to bust browser cache
			= "",

		cache
			// hash:(mid | url)-->(function | string)
			//
			// A cache of resources. The resources arrive via a config.cache object, which is a hash from either mid --> function or
			// url --> string. The url key is distinguished from the mid key by always containing the prefix "url:". url keys as provided
			// by config.cache always have a string value that represents the contents of the resource at the given url. mid keys as provided
			// by configl.cache always have a function value that causes the same code to execute as if the module was script injected.
			//
			// Both kinds of key-value pairs are entered into cache via the function consumePendingCache, which may relocate keys as given
			// by any mappings *iff* the config.cache was received as part of a module resource request.
			//
			// Further, for mid keys, the implied url is computed and the value is entered into that key as well. This allows mapped modules
			// to retrieve cached items that may have arrived consequent to another namespace.
			//
			 = {},

		urlKeyPrefix
			// the prefix to prepend to a URL key in the cache.
			= "url:",

		pendingCacheInsert
			// hash:(mid)-->(function)
			//
			// Gives a set of cache modules pending entry into cache. When cached modules are published to the loader, they are
			// entered into pendingCacheInsert; modules are then pressed into cache upon (1) AMD define or (2) upon receiving another
			// independent set of cached modules. (1) is the usual case, and this case allows normalizing mids given in the pending
			// cache for the local configuration, possibly relocating modules.
			 = {},

		dojoSniffConfig
			// map of configuration variables
			// give the data-dojo-config as sniffed from the document (if any)
			= {},

		insertPointSibling
			// the nodes used to locate where scripts are injected into the document
			= 0;

	if( 1 ){
		var consumePendingCacheInsert = function(referenceModule){
				var p, item, match, now, m;
				for(p in pendingCacheInsert){
					item = pendingCacheInsert[p];
					match = p.match(/^url\:(.+)/);
					if(match){
						cache[urlKeyPrefix + toUrl(match[1], referenceModule)] =  item;
					}else if(p=="*now"){
						now = item;
					}else if(p!="*noref"){
						m = getModuleInfo(p, referenceModule, true);
						cache[m.mid] = cache[urlKeyPrefix + m.url] = item;
					}
				}
				if(now){
					now(createRequire(referenceModule));
				}
				pendingCacheInsert = {};
			},

			escapeString = function(s){
				return s.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, function(c){ return "\\" + c; });
			},

			computeMapProg = function(map, dest){
				// This routine takes a map as represented by a JavaScript object and initializes dest, a vector of
				// quads of (map-key, map-value, refex-for-map-key, length-of-map-key), sorted decreasing by length-
				// of-map-key. The regex looks for the map-key followed by either "/" or end-of-string at the beginning
				// of a the search source. Notice the map-value is irrelevant to the algorithm
				dest.splice(0, dest.length);
				for(var p in map){
					dest.push([
						p,
						map[p],
						new RegExp("^" + escapeString(p) + "(\/|$)"),
						p.length]);
				}
				dest.sort(function(lhs, rhs){ return rhs[3] - lhs[3]; });
				return dest;
			},

			computeAliases = function(config, dest){
				forEach(config, function(pair){
					// take a fixed-up copy...
					dest.push([isString(pair[0]) ? new RegExp("^" + escapeString(pair[0]) + "$") : pair[0], pair[1]]);
				});
			},


			fixupPackageInfo = function(packageInfo){
				// calculate the precise (name, location, main, mappings) for a package
				var name = packageInfo.name;
				if(!name){
					// packageInfo must be a string that gives the name
					name = packageInfo;
					packageInfo = {name:name};
				}
				packageInfo = mix({main:"main"}, packageInfo);
				packageInfo.location = packageInfo.location ? packageInfo.location : name;

				// packageMap is deprecated in favor of AMD map
				if(packageInfo.packageMap){
					map[name] = packageInfo.packageMap;
				}

				if(!packageInfo.main.indexOf("./")){
					packageInfo.main = packageInfo.main.substring(2);
				}

				// now that we've got a fully-resolved package object, push it into the configuration
				packs[name] = packageInfo;
			},

			delayedModuleConfig
				// module config cannot be consumed until the loader is completely initialized; therefore, all
				// module config detected during booting is memorized and applied at the end of loader initialization
				// TODO: this is a bit of a kludge; all config should be moved to end of loader initialization, but
				// we'll delay this chore and do it with a final loader 1.x cleanup after the 2.x loader prototyping is complete
				= [],


			config = function(config, booting, referenceModule){
				for(var p in config){
					if(p=="waitSeconds"){
						req.waitms = (config[p] || 0) * 1000;
					}
					if(p=="cacheBust"){
						cacheBust = config[p] ? (isString(config[p]) ? config[p] : (new Date()).getTime() + "") : "";
					}
					if(p=="baseUrl" || p=="combo"){
						req[p] = config[p];
					}
					if( 1  && p=="async"){
						// falsy or "sync" => legacy sync loader
						// "xd" => sync but loading xdomain tree and therefore loading asynchronously (not configurable, set automatically by the loader)
						// "legacyAsync" => permanently in "xd" by choice
						// "debugAtAllCosts" => trying to load everything via script injection (not implemented)
						// otherwise, must be truthy => AMD
						// legacyMode: sync | legacyAsync | xd | false
						var mode = config[p];
						req.legacyMode = legacyMode = (isString(mode) && /sync|legacyAsync/.test(mode) ? mode : (!mode ? sync : false));
						req.async = !legacyMode;
					}
					if(config[p]!==hasCache){
						// accumulate raw config info for client apps which can use this to pass their own config
						req.rawConfig[p] = config[p];
						p!="has" && has.add("config-"+p, config[p], 0, booting);
					}
				}

				// make sure baseUrl exists
				if(!req.baseUrl){
					req.baseUrl = "./";
				}
				// make sure baseUrl ends with a slash
				if(!/\/$/.test(req.baseUrl)){
					req.baseUrl += "/";
				}

				// now do the special work for has, packages, packagePaths, paths, aliases, and cache

				for(p in config.has){
					has.add(p, config.has[p], 0, booting);
				}

				// for each package found in any packages config item, augment the packs map owned by the loader
				forEach(config.packages, fixupPackageInfo);

				// for each packagePath found in any packagePaths config item, augment the packageConfig
				// packagePaths is deprecated; remove in 2.0
				for(var baseUrl in config.packagePaths){
					forEach(config.packagePaths[baseUrl], function(packageInfo){
						var location = baseUrl + "/" + packageInfo;
						if(isString(packageInfo)){
							packageInfo = {name:packageInfo};
						}
						packageInfo.location = location;
						fixupPackageInfo(packageInfo);
					});
				}

				// notice that computeMapProg treats the dest as a reference; therefore, if/when that variable
				// is published (see dojo-publish-privates), the published variable will always hold a valid value.

				// this must come after all package processing since package processing may mutate map
				computeMapProg(mix(map, config.map), mapProgs);
				forEach(mapProgs, function(item){
					item[1] = computeMapProg(item[1], []);
					if(item[0]=="*"){
						mapProgs.star = item;
					}
				});

				// push in any paths and recompute the internal pathmap
				computeMapProg(mix(paths, config.paths), pathsMapProg);

				// aliases
				computeAliases(config.aliases, aliases);

				if(booting){
					delayedModuleConfig.push({config:config.config});
				}else{
					for(p in config.config){
						var module = getModule(p, referenceModule);
						module.config = mix(module.config || {}, config.config[p]);
					}
				}

				// push in any new cache values
				if(config.cache){
					consumePendingCacheInsert();
					pendingCacheInsert = config.cache;
					if(config.cache["*noref"]){
						consumePendingCacheInsert();
					}
				}

				signal("config", [config, req.rawConfig]);
			};

		//
		// execute the various sniffs; userConfig can override and value
		//

		if(has("dojo-cdn") ||  1 ){
			// the sniff regex looks for a src attribute ending in dojo.js, optionally preceded with a path.
			// match[3] returns the path to dojo.js (if any) without the trailing slash. This is used for the
			// dojo location on CDN deployments and baseUrl when either/both of these are not provided
			// explicitly in the config data; this is the 1.6- behavior.

			var scripts = doc.getElementsByTagName("script"),
				i = 0,
				script, dojoDir, src, match;
			while(i < scripts.length){
				script = scripts[i++];
				if((src = script.getAttribute("src")) && (match = src.match(/(((.*)\/)|^)dojo\.js(\W|$)/i))){
					// sniff dojoDir and baseUrl
					dojoDir = match[3] || "";
					defaultConfig.baseUrl = defaultConfig.baseUrl || dojoDir;

					// remember an insertPointSibling
					insertPointSibling = script;
				}

				// sniff configuration on attribute in script element
				if((src = (script.getAttribute("data-dojo-config") || script.getAttribute("djConfig")))){
					dojoSniffConfig = req.eval("({ " + src + " })", "data-dojo-config");

					// remember an insertPointSibling
					insertPointSibling = script;
				}

				// sniff requirejs attribute
				if( 0 ){
					if((src = script.getAttribute("data-main"))){
						dojoSniffConfig.deps = dojoSniffConfig.deps || [src];
					}
				}
			}
		}

		if( 0 ){
			// pass down doh.testConfig from parent as if it were a data-dojo-config
			try{
				if(window.parent != window && window.parent.require){
					var doh = window.parent.require("doh");
					doh && mix(dojoSniffConfig, doh.testConfig);
				}
			}catch(e){}
		}

		// configure the loader; let the user override defaults
		req.rawConfig = {};
		config(defaultConfig, 1);

		// do this before setting userConfig/sniffConfig to allow userConfig/sniff overrides
		if(has("dojo-cdn")){
			packs.dojo.location = dojoDir;
			if(dojoDir){
				dojoDir += "/";
			}
			packs.dijit.location = dojoDir + "../dijit/";
			packs.dojox.location = dojoDir + "../dojox/";
		}

		config(userConfig, 1);
		config(dojoSniffConfig, 1);

	}else{
		// no config API, assume defaultConfig has everything the loader needs...for the entire lifetime of the application
		paths = defaultConfig.paths;
		pathsMapProg = defaultConfig.pathsMapProg;
		packs = defaultConfig.packs;
		aliases = defaultConfig.aliases;
		mapProgs = defaultConfig.mapProgs;
		modules = defaultConfig.modules;
		cache = defaultConfig.cache;
		cacheBust = defaultConfig.cacheBust;

		// remember the default config for other processes (e.g., dojo/config)
		req.rawConfig = defaultConfig;
	}


	if( 0 ){
		req.combo = req.combo || {add:noop};
		var	comboPending = 0,
			combosPending = [],
			comboPendingTimer = null;
	}


	// build the loader machinery iaw configuration, including has feature tests
	var	injectDependencies = function(module){
			// checkComplete!=0 holds the idle signal; we're not idle if we're injecting dependencies
			guardCheckComplete(function(){
				forEach(module.deps, injectModule);
				if( 0  && comboPending && !comboPendingTimer){
					comboPendingTimer = setTimeout(function() {
						comboPending = 0;
						comboPendingTimer = null;
						req.combo.done(function(mids, url) {
							var onLoadCallback= function(){
								// defQ is a vector of module definitions 1-to-1, onto mids
								runDefQ(0, mids);
								checkComplete();
							};
							combosPending.push(mids);
							injectingModule = mids;
							req.injectUrl(url, onLoadCallback, mids);
							injectingModule = 0;
						}, req);
					}, 0);
				}
			});
		},

		contextRequire = function(a1, a2, a3, referenceModule, contextRequire){
			var module, syntheticMid;
			if(isString(a1)){
				// signature is (moduleId)
				module = getModule(a1, referenceModule, true);
				if(module && module.executed){
					return module.result;
				}
				throw makeError("undefinedModule", a1);
			}
			if(!isArray(a1)){
				// a1 is a configuration
				config(a1, 0, referenceModule);

				// juggle args; (a2, a3) may be (dependencies, callback)
				a1 = a2;
				a2 = a3;
			}
			if(isArray(a1)){
				// signature is (requestList [,callback])
				if(!a1.length){
					a2 && a2();
				}else{
					syntheticMid = "require*" + uid();

					// resolve the request list with respect to the reference module
					for(var mid, deps = [], i = 0; i < a1.length;){
						mid = a1[i++];
						deps.push(getModule(mid, referenceModule));
					}

					// construct a synthetic module to control execution of the requestList, and, optionally, callback
					module = mix(makeModuleInfo("", syntheticMid, 0, ""), {
						injected: arrived,
						deps: deps,
						def: a2 || noop,
						require: referenceModule ? referenceModule.require : req,
						gc: 1 //garbage collect
					});
					modules[module.mid] = module;

					// checkComplete!=0 holds the idle signal; we're not idle if we're injecting dependencies
					injectDependencies(module);

					// try to immediately execute
					// if already traversing a factory tree, then strict causes circular dependency to abort the execution; maybe
					// it's possible to execute this require later after the current traversal completes and avoid the circular dependency.
					// ...but *always* insist on immediate in synch mode
					var strict = checkCompleteGuard && legacyMode!=sync;
					guardCheckComplete(function(){
						execModule(module, strict);
					});
					if(!module.executed){
						// some deps weren't on board or circular dependency detected and strict; therefore, push into the execQ
						execQ.push(module);
					}
					checkComplete();
				}
			}
			return contextRequire;
		},

		createRequire = function(module){
			if(!module){
				return req;
			}
			var result = module.require;
			if(!result){
				result = function(a1, a2, a3){
					return contextRequire(a1, a2, a3, module, result);
				};
				module.require = mix(result, req);
				result.module = module;
				result.toUrl = function(name){
					return toUrl(name, module);
				};
				result.toAbsMid = function(mid){
					return toAbsMid(mid, module);
				};
				if( 0 ){
					result.undef = function(mid){
						req.undef(mid, module);
					};
				}
				if( 1 ){
					result.syncLoadNls = function(mid){
						var nlsModuleInfo = getModuleInfo(mid, module),
							nlsModule = modules[nlsModuleInfo.mid];
						if(!nlsModule || !nlsModule.executed){
							cached = cache[nlsModuleInfo.mid] || cache[urlKeyPrefix + nlsModuleInfo.url];
							if(cached){
								evalModuleText(cached);
								nlsModule = modules[nlsModuleInfo.mid];
							}
						}
						return nlsModule && nlsModule.executed && nlsModule.result;
					};
				}

			}
			return result;
		},

		execQ =
			// The list of modules that need to be evaluated.
			[],

		defQ =
			// The queue of define arguments sent to loader.
			[],

		waiting =
			// The set of modules upon which the loader is waiting for definition to arrive
			{},

		setRequested = function(module){
			module.injected = requested;
			waiting[module.mid] = 1;
			if(module.url){
				waiting[module.url] = module.pack || 1;
			}
			startTimer();
		},

		setArrived = function(module){
			module.injected = arrived;
			delete waiting[module.mid];
			if(module.url){
				delete waiting[module.url];
			}
			if(isEmpty(waiting)){
				clearTimer();
				 1  && legacyMode==xd && (legacyMode = sync);
			}
		},

		execComplete = req.idle =
			// says the loader has completed (or not) its work
			function(){
				return !defQ.length && isEmpty(waiting) && !execQ.length && !checkCompleteGuard;
			},

		runMapProg = function(targetMid, map){
			// search for targetMid in map; return the map item if found; falsy otherwise
			if(map){
			for(var i = 0; i < map.length; i++){
				if(map[i][2].test(targetMid)){
					return map[i];
				}
			}
			}
			return 0;
		},

		compactPath = function(path){
			var result = [],
				segment, lastSegment;
			path = path.replace(/\\/g, '/').split('/');
			while(path.length){
				segment = path.shift();
				if(segment==".." && result.length && lastSegment!=".."){
					result.pop();
					lastSegment = result[result.length - 1];
				}else if(segment!="."){
					result.push(lastSegment= segment);
				} // else ignore "."
			}
			return result.join("/");
		},

		makeModuleInfo = function(pid, mid, pack, url){
			if( 1 ){
				var xd= req.isXdUrl(url);
				return {pid:pid, mid:mid, pack:pack, url:url, executed:0, def:0, isXd:xd, isAmd:!!(xd || (packs[pid] && packs[pid].isAmd))};
			}else{
				return {pid:pid, mid:mid, pack:pack, url:url, executed:0, def:0};
			}
		},

		getModuleInfo_ = function(mid, referenceModule, packs, modules, baseUrl, mapProgs, pathsMapProg, aliases, alwaysCreate){
			// arguments are passed instead of using lexical variables so that this function my be used independent of the loader (e.g., the builder)
			// alwaysCreate is useful in this case so that getModuleInfo never returns references to real modules owned by the loader
			var pid, pack, midInPackage, mapItem, url, result, isRelative, requestedMid;
			requestedMid = mid;
			isRelative = /^\./.test(mid);
			if(/(^\/)|(\:)|(\.js$)/.test(mid) || (isRelative && !referenceModule)){
				// absolute path or protocol of .js filetype, or relative path but no reference module and therefore relative to page
				// whatever it is, it's not a module but just a URL of some sort
				// note: pid===0 indicates the routine is returning an unmodified mid

				return makeModuleInfo(0, mid, 0, mid);
			}else{
				// relative module ids are relative to the referenceModule; get rid of any dots
				mid = compactPath(isRelative ? (referenceModule.mid + "/../" + mid) : mid);
				if(/^\./.test(mid)){
					throw makeError("irrationalPath", mid);
				}
				// at this point, mid is an absolute mid

				// map the mid
				if(referenceModule){
					mapItem = runMapProg(referenceModule.mid, mapProgs);
				}
				mapItem = mapItem || mapProgs.star;
				mapItem = mapItem && runMapProg(mid, mapItem[1]);

				if(mapItem){
					mid = mapItem[1] + mid.substring(mapItem[3]);
					}

				match = mid.match(/^([^\/]+)(\/(.+))?$/);
				pid = match ? match[1] : "";
				if((pack = packs[pid])){
					mid = pid + "/" + (midInPackage = (match[3] || pack.main));
				}else{
					pid = "";
				}

				// search aliases
				var candidateLength = 0,
					candidate = 0;
				forEach(aliases, function(pair){
					var match = mid.match(pair[0]);
					if(match && match.length>candidateLength){
						candidate = isFunction(pair[1]) ? mid.replace(pair[0], pair[1]) : pair[1];
					}
				});
				if(candidate){
					return getModuleInfo_(candidate, 0, packs, modules, baseUrl, mapProgs, pathsMapProg, aliases, alwaysCreate);
				}

				result = modules[mid];
				if(result){
					return alwaysCreate ? makeModuleInfo(result.pid, result.mid, result.pack, result.url) : modules[mid];
				}
			}
			// get here iff the sought-after module does not yet exist; therefore, we need to compute the URL given the
			// fully resolved (i.e., all relative indicators and package mapping resolved) module id

			// note: pid!==0 indicates the routine is returning a url that has .js appended unmodified mid
			mapItem = runMapProg(mid, pathsMapProg);
			if(mapItem){
				url = mapItem[1] + mid.substring(mapItem[3]);
			}else if(pid){
				url = pack.location + "/" + midInPackage;
			}else if(has("config-tlmSiblingOfDojo")){
				url = "../" + mid;
			}else{
				url = mid;
			}
			// if result is not absolute, add baseUrl
			if(!(/(^\/)|(\:)/.test(url))){
				url = baseUrl + url;
			}
			url += ".js";
			return makeModuleInfo(pid, mid, pack, compactPath(url));
		},

		getModuleInfo = function(mid, referenceModule, fromPendingCache){
			return getModuleInfo_(mid, referenceModule, packs, modules, req.baseUrl, fromPendingCache ? [] : mapProgs, fromPendingCache ? [] : pathsMapProg, fromPendingCache ? [] : aliases);
		},

		resolvePluginResourceId = function(plugin, prid, referenceModule){
			return plugin.normalize ? plugin.normalize(prid, function(mid){return toAbsMid(mid, referenceModule);}) : toAbsMid(prid, referenceModule);
		},

		dynamicPluginUidGenerator = 0,

		getModule = function(mid, referenceModule, immediate){
			// compute and optionally construct (if necessary) the module implied by the mid with respect to referenceModule
			var match, plugin, prid, result;
			match = mid.match(/^(.+?)\!(.*)$/);
			if(match){
				// name was <plugin-module>!<plugin-resource-id>
				plugin = getModule(match[1], referenceModule, immediate);

				if( 1  && legacyMode == sync && !plugin.executed){
					injectModule(plugin);
					if(plugin.injected===arrived && !plugin.executed){
						guardCheckComplete(function(){
							execModule(plugin);
						});
					}
					if(plugin.executed){
						promoteModuleToPlugin(plugin);
					}else{
						// we are in xdomain mode for some reason
						execQ.unshift(plugin);
					}
				}



				if(plugin.executed === executed && !plugin.load){
					// executed the module not knowing it was a plugin
					promoteModuleToPlugin(plugin);
				}

				// if the plugin has not been loaded, then can't resolve the prid and  must assume this plugin is dynamic until we find out otherwise
				if(plugin.load){
					prid = resolvePluginResourceId(plugin, match[2], referenceModule);
					mid = (plugin.mid + "!" + (plugin.dynamic ? ++dynamicPluginUidGenerator + "!" : "") + prid);
				}else{
					prid = match[2];
					mid = plugin.mid + "!" + (++dynamicPluginUidGenerator) + "!waitingForPlugin";
				}
				result = {plugin:plugin, mid:mid, req:createRequire(referenceModule), prid:prid};
			}else{
				result = getModuleInfo(mid, referenceModule);
			}
			return modules[result.mid] || (!immediate && (modules[result.mid] = result));
		},

		toAbsMid = req.toAbsMid = function(mid, referenceModule){
			return getModuleInfo(mid, referenceModule).mid;
		},

		toUrl = req.toUrl = function(name, referenceModule){
			var moduleInfo = getModuleInfo(name+"/x", referenceModule),
				url= moduleInfo.url;
			return fixupUrl(moduleInfo.pid===0 ?
				// if pid===0, then name had a protocol or absolute path; either way, toUrl is the identify function in such cases
				name :
				// "/x.js" since getModuleInfo automatically appends ".js" and we appended "/x" to make name look like a module id
				url.substring(0, url.length-5)
			);
		},

		nonModuleProps = {
			injected: arrived,
			executed: executed,
			def: nonmodule,
			result: nonmodule
		},

		makeCjs = function(mid){
			return modules[mid] = mix({mid:mid}, nonModuleProps);
		},

		cjsRequireModule = makeCjs("require"),
		cjsExportsModule = makeCjs("exports"),
		cjsModuleModule = makeCjs("module"),

		runFactory = function(module, args){
			req.trace("loader-run-factory", [module.mid]);
			var factory = module.def,
				result;
			 1  && syncExecStack.unshift(module);
			if(has("config-dojo-loader-catches")){
				try{
					result= isFunction(factory) ? factory.apply(null, args) : factory;
				}catch(e){
					signal(error, module.result = makeError("factoryThrew", [module, e]));
				}
			}else{
				result= isFunction(factory) ? factory.apply(null, args) : factory;
			}
			module.result = result===undefined && module.cjs ? module.cjs.exports : result;
			 1  && syncExecStack.shift(module);
		},

		abortExec = {},

		defOrder = 0,

		promoteModuleToPlugin = function(pluginModule){
			var plugin = pluginModule.result;
			pluginModule.dynamic = plugin.dynamic;
			pluginModule.normalize = plugin.normalize;
			pluginModule.load = plugin.load;
			return pluginModule;
		},

		resolvePluginLoadQ = function(plugin){
			// plugins is a newly executed module that has a loadQ waiting to run

			// step 1: traverse the loadQ and fixup the mid and prid; remember the map from original mid to new mid
			// recall the original mid was created before the plugin was on board and therefore it was impossible to
			// compute the final mid; accordingly, prid may or may not change, but the mid will definitely change
			var map = {};
			forEach(plugin.loadQ, function(pseudoPluginResource){
				// manufacture and insert the real module in modules
				var prid = resolvePluginResourceId(plugin, pseudoPluginResource.prid, pseudoPluginResource.req.module),
					mid = plugin.dynamic ? pseudoPluginResource.mid.replace(/waitingForPlugin$/, prid) : (plugin.mid + "!" + prid),
					pluginResource = mix(mix({}, pseudoPluginResource), {mid:mid, prid:prid, injected:0});
				if(!modules[mid]){
					// create a new (the real) plugin resource and inject it normally now that the plugin is on board
					injectPlugin(modules[mid] = pluginResource);
				} // else this was a duplicate request for the same (plugin, rid) for a nondynamic plugin

				// pluginResource is really just a placeholder with the wrong mid (because we couldn't calculate it until the plugin was on board)
				// mark is as arrived and delete it from modules; the real module was requested above
				map[pseudoPluginResource.mid] = modules[mid];
				setArrived(pseudoPluginResource);
				delete modules[pseudoPluginResource.mid];
			});
			plugin.loadQ = 0;

			// step2: replace all references to any placeholder modules with real modules
			var substituteModules = function(module){
				for(var replacement, deps = module.deps || [], i = 0; i<deps.length; i++){
					replacement = map[deps[i].mid];
					if(replacement){
						deps[i] = replacement;
					}
				}
			};
			for(var p in modules){
				substituteModules(modules[p]);
			}
			forEach(execQ, substituteModules);
		},

		finishExec = function(module){
			req.trace("loader-finish-exec", [module.mid]);
			module.executed = executed;
			module.defOrder = defOrder++;
			 1  && forEach(module.provides, function(cb){ cb(); });
			if(module.loadQ){
				// the module was a plugin
				promoteModuleToPlugin(module);
				resolvePluginLoadQ(module);
			}
			// remove all occurrences of this module from the execQ
			for(i = 0; i < execQ.length;){
				if(execQ[i] === module){
					execQ.splice(i, 1);
				}else{
					i++;
				}
			}
			// delete references to synthetic modules
			if (/^require\*/.test(module.mid)) {
				delete modules[module.mid];
			}
		},

		circleTrace = [],

		execModule = function(module, strict){
			// run the dependency vector, then run the factory for module
			if(module.executed === executing){
				req.trace("loader-circular-dependency", [circleTrace.concat(module.mid).join("->")]);
				return (!module.def || strict) ? abortExec :  (module.cjs && module.cjs.exports);
			}
			// at this point the module is either not executed or fully executed


			if(!module.executed){
				if(!module.def){
					return abortExec;
				}
				var mid = module.mid,
					deps = module.deps || [],
					arg, argResult,
					args = [],
					i = 0;

				if( false ){
					circleTrace.push(mid);
					req.trace("loader-exec-module", ["exec", circleTrace.length, mid]);
				}

				// for circular dependencies, assume the first module encountered was executed OK
				// modules that circularly depend on a module that has not run its factory will get
				// the pre-made cjs.exports===module.result. They can take a reference to this object and/or
				// add properties to it. When the module finally runs its factory, the factory can
				// read/write/replace this object. Notice that so long as the object isn't replaced, any
				// reference taken earlier while walking the deps list is still valid.
				module.executed = executing;
				while((arg = deps[i++])){
					argResult = ((arg === cjsRequireModule) ? createRequire(module) :
									((arg === cjsExportsModule) ? module.cjs.exports :
										((arg === cjsModuleModule) ? module.cjs :
											execModule(arg, strict))));
					if(argResult === abortExec){
						module.executed = 0;
						req.trace("loader-exec-module", ["abort", mid]);
						 false  && circleTrace.pop();
						return abortExec;
					}
					args.push(argResult);
				}
				runFactory(module, args);
				finishExec(module);
				 false  && circleTrace.pop();
			}
			// at this point the module is guaranteed fully executed

			return module.result;
		},


		checkCompleteGuard = 0,

		guardCheckComplete = function(proc){
			try{
				checkCompleteGuard++;
				proc();
			}finally{
				checkCompleteGuard--;
			}
			if(execComplete()){
				signal("idle", []);
			}
		},

		checkComplete = function(){
			// keep going through the execQ as long as at least one factory is executed
			// plugins, recursion, cached modules all make for many execution path possibilities
			if(checkCompleteGuard){
				return;
			}
			guardCheckComplete(function(){
				checkDojoRequirePlugin();
				for(var currentDefOrder, module, i = 0; i < execQ.length;){
					currentDefOrder = defOrder;
					module = execQ[i];
					execModule(module);
					if(currentDefOrder!=defOrder){
						// defOrder was bumped one or more times indicating something was executed (note, this indicates
						// the execQ was modified, maybe a lot (for example a later module causes an earlier module to execute)
						checkDojoRequirePlugin();
						i = 0;
					}else{
						// nothing happened; check the next module in the exec queue
						i++;
					}
				}
			});
		};


	if( 0 ){
		req.undef = function(moduleId, referenceModule){
			// In order to reload a module, it must be undefined (this routine) and then re-requested.
			// This is useful for testing frameworks (at least).
			var module = getModule(moduleId, referenceModule);
			setArrived(module);
			mix(module, {def:0, executed:0, injected:0, node:0});
		};
	}

	if( 1 ){
		if(has("dojo-loader-eval-hint-url")===undefined){
			has.add("dojo-loader-eval-hint-url", 1);
		}

		var fixupUrl= typeof userConfig.fixupUrl == "function" ? userConfig.fixupUrl : function(url){
				url += ""; // make sure url is a Javascript string (some paths may be a Java string)
				return url + (cacheBust ? ((/\?/.test(url) ? "&" : "?") + cacheBust) : "");
			},

			injectPlugin = function(
				module
			){
				// injects the plugin module given by module; may have to inject the plugin itself
				var plugin = module.plugin;

				if(plugin.executed === executed && !plugin.load){
					// executed the module not knowing it was a plugin
					promoteModuleToPlugin(plugin);
				}

				var onLoad = function(def){
						module.result = def;
						setArrived(module);
						finishExec(module);
						checkComplete();
					};

				if(plugin.load){
					plugin.load(module.prid, module.req, onLoad);
				}else if(plugin.loadQ){
					plugin.loadQ.push(module);
				}else{
					// the unshift instead of push is important: we don't want plugins to execute as
					// dependencies of some other module because this may cause circles when the plugin
					// loadQ is run; also, generally, we want plugins to run early since they may load
					// several other modules and therefore can potentially unblock many modules
					plugin.loadQ = [module];
					execQ.unshift(plugin);
					injectModule(plugin);
				}
			},

			// for IE, injecting a module may result in a recursive execution if the module is in the cache

			cached = 0,

			injectingModule = 0,

			injectingCachedModule = 0,

			evalModuleText = function(text, module){
				// see def() for the injectingCachedModule bracket; it simply causes a short, safe circuit
				if(has("config-stripStrict")){
					text = text.replace(/"use strict"/g, '');
				}
				injectingCachedModule = 1;
				if(has("config-dojo-loader-catches")){
					try{
						if(text===cached){
							cached.call(null);
						}else{
							req.eval(text, has("dojo-loader-eval-hint-url") ? module.url : module.mid);
						}
					}catch(e){
						signal(error, makeError("evalModuleThrew", module));
					}
				}else{
					if(text===cached){
						cached.call(null);
					}else{
						req.eval(text, has("dojo-loader-eval-hint-url") ? module.url : module.mid);
					}
				}
				injectingCachedModule = 0;
			},

			injectModule = function(module){
				// Inject the module. In the browser environment, this means appending a script element into
				// the document; in other environments, it means loading a file.
				//
				// If in synchronous mode, then get the module synchronously if it's not xdomainLoading.

				var mid = module.mid,
					url = module.url;
				if(module.executed || module.injected || waiting[mid] || (module.url && ((module.pack && waiting[module.url]===module.pack) || waiting[module.url]==1))){
					return;
				}
				setRequested(module);

				if( 0 ){
					var viaCombo = 0;
					if(module.plugin && module.plugin.isCombo){
						// a combo plugin; therefore, must be handled by combo service
						// the prid should have already been converted to a URL (if required by the plugin) during
						// the normalize process; in any event, there is no way for the loader to know how to
						// to the conversion; therefore the third argument is zero
						req.combo.add(module.plugin.mid, module.prid, 0, req);
						viaCombo = 1;
					}else if(!module.plugin){
						viaCombo = req.combo.add(0, module.mid, module.url, req);
					}
					if(viaCombo){
						comboPending= 1;
						return;
					}
				}

				if(module.plugin){
					injectPlugin(module);
					return;
				} // else a normal module (not a plugin)


				var onLoadCallback = function(){
					runDefQ(module);
					if(module.injected !== arrived){
						// the script that contained the module arrived and has been executed yet
						// nothing was added to the defQ (so it wasn't an AMD module) and the module
						// wasn't marked as arrived by dojo.provide (so it wasn't a v1.6- module);
						// therefore, it must not have been a module; adjust state accordingly
						if(has("dojo-enforceDefine")){
							signal(error, makeError("noDefine", module));
							return;
						}
						setArrived(module);
						mix(module, nonModuleProps);
						req.trace("loader-define-nonmodule", [module.url]);
					}

					if( 1  && legacyMode){
						// must call checkComplete even in for sync loader because we may be in xdomainLoading mode;
						// but, if xd loading, then don't call checkComplete until out of the current sync traversal
						// in order to preserve order of execution of the dojo.required modules
						!syncExecStack.length && checkComplete();
					}else{
						checkComplete();
					}
				};
				cached = cache[mid] || cache[urlKeyPrefix + module.url];
				if(cached){
					req.trace("loader-inject", ["cache", module.mid, url]);
					evalModuleText(cached, module);
					onLoadCallback();
					return;
				}
				if( 1  && legacyMode){
					if(module.isXd){
						// switch to async mode temporarily; if current legacyMode!=sync, then is must be one of {legacyAsync, xd, false}
						legacyMode==sync && (legacyMode = xd);
						// fall through and load via script injection
					}else if(module.isAmd && legacyMode!=sync){
						// fall through and load via script injection
					}else{
						// mode may be sync, xd/legacyAsync, or async; module may be AMD or legacy; but module is always located on the same domain
						var xhrCallback = function(text){
							if(legacyMode==sync){
								// the top of syncExecStack gives the current synchronously executing module; the loader needs
								// to know this if it has to switch to async loading in the middle of evaluating a legacy module
								// this happens when a modules dojo.require's a module that must be loaded async because it's xdomain
								// (using unshift/shift because there is no back() methods for Javascript arrays)
								syncExecStack.unshift(module);
								evalModuleText(text, module);
								syncExecStack.shift();

								// maybe the module was an AMD module
								runDefQ(module);

								// legacy modules never get to defineModule() => cjs and injected never set; also evaluation implies executing
								if(!module.cjs){
									setArrived(module);
									finishExec(module);
								}

								if(module.finish){
									// while synchronously evaluating this module, dojo.require was applied referencing a module
									// that had to be loaded async; therefore, the loader stopped answering all dojo.require
									// requests so they could be answered completely in the correct sequence; module.finish gives
									// the list of dojo.requires that must be re-applied once all target modules are available;
									// make a synthetic module to execute the dojo.require's in the correct order

									// compute a guaranteed-unique mid for the synthetic finish module; remember the finish vector; remove it from the reference module
									// TODO: can we just leave the module.finish...what's it hurting?
									var finishMid = mid + "*finish",
										finish = module.finish;
									delete module.finish;

									def(finishMid, ["dojo", ("dojo/require!" + finish.join(",")).replace(/\./g, "/")], function(dojo){
										forEach(finish, function(mid){ dojo.require(mid); });
									});
									// unshift, not push, which causes the current traversal to be reattempted from the top
									execQ.unshift(getModule(finishMid));
								}
								onLoadCallback();
							}else{
								text = transformToAmd(module, text);
								if(text){
									evalModuleText(text, module);
									onLoadCallback();
								}else{
									// if transformToAmd returned falsy, then the module was already AMD and it can be script-injected
									// do so to improve debugability(even though it means another download...which probably won't happen with a good browser cache)
									injectingModule = module;
									req.injectUrl(fixupUrl(url), onLoadCallback, module);
									injectingModule = 0;
								}
							}
						};

						req.trace("loader-inject", ["xhr", module.mid, url, legacyMode!=sync]);
						if(has("config-dojo-loader-catches")){
							try{
								req.getText(url, legacyMode!=sync, xhrCallback);
							}catch(e){
								signal(error, makeError("xhrInjectFailed", [module, e]));
							}
						}else{
							req.getText(url, legacyMode!=sync, xhrCallback);
						}
						return;
					}
				} // else async mode or fell through in xdomain loading mode; either way, load by script injection
				req.trace("loader-inject", ["script", module.mid, url]);
				injectingModule = module;
				req.injectUrl(fixupUrl(url), onLoadCallback, module);
				injectingModule = 0;
			},

			defineModule = function(module, deps, def){
				req.trace("loader-define-module", [module.mid, deps]);

				if( 0  && module.plugin && module.plugin.isCombo){
					// the module is a plugin resource loaded by the combo service
					// note: check for module.plugin should be enough since normal plugin resources should
					// not follow this path; module.plugin.isCombo is future-proofing belt and suspenders
					module.result = isFunction(def) ? def() : def;
					setArrived(module);
					finishExec(module);
					return module;
				}

				var mid = module.mid;
				if(module.injected === arrived){
					signal(error, makeError("multipleDefine", module));
					return module;
				}
				mix(module, {
					deps: deps,
					def: def,
					cjs: {
						id: module.mid,
						uri: module.url,
						exports: (module.result = {}),
						setExports: function(exports){
							module.cjs.exports = exports;
						},
						config:function(){
							return module.config;
						}
					}
				});

				// resolve deps with respect to this module
				for(var i = 0; deps[i]; i++){
					deps[i] = getModule(deps[i], module);
				}

				if( 1  && legacyMode && !waiting[mid]){
					// the module showed up without being asked for; it was probably in a <script> element
					injectDependencies(module);
					execQ.push(module);
					checkComplete();
				}
				setArrived(module);

				if(!isFunction(def) && !deps.length){
					module.result = def;
					finishExec(module);
				}

				return module;
			},

			runDefQ = function(referenceModule, mids){
				// defQ is an array of [id, dependencies, factory]
				// mids (if any) is a vector of mids given by a combo service
				var definedModules = [],
					module, args;
				while(defQ.length){
					args = defQ.shift();
					mids && (args[0]= mids.shift());
					// explicit define indicates possible multiple modules in a single file; delay injecting dependencies until defQ fully
					// processed since modules earlier in the queue depend on already-arrived modules that are later in the queue
					// TODO: what if no args[0] and no referenceModule
					module = (args[0] && getModule(args[0])) || referenceModule;
					definedModules.push([module, args[1], args[2]]);
				}
				consumePendingCacheInsert(referenceModule);
				forEach(definedModules, function(args){
					injectDependencies(defineModule.apply(null, args));
				});
			};
	}

	var timerId = 0,
		clearTimer = noop,
		startTimer = noop;
	if( 1 ){
		// Timer machinery that monitors how long the loader is waiting and signals an error when the timer runs out.
		clearTimer = function(){
			timerId && clearTimeout(timerId);
			timerId = 0;
		};

		startTimer = function(){
			clearTimer();
			if(req.waitms){
				timerId = global.setTimeout(function(){
					clearTimer();
					signal(error, makeError("timeout", waiting));
				}, req.waitms);
			}
		};
	}

	if ( 1 ) {
		// Test for IE's different way of signaling when scripts finish loading.  Note that according to
		// http://bugs.dojotoolkit.org/ticket/15096#comment:14, IE9 also needs to follow the
		// IE specific code path even though it has an addEventListener() method.
		// Unknown if special path needed on IE10+, which also has a document.attachEvent() method.
		// Should evaluate to false for Opera and Windows 8 apps, even though they document.attachEvent()
		//  is defined in both those environments.
		has.add("ie-event-behavior", doc.attachEvent && typeof Windows === "undefined" &&
			(typeof opera === "undefined" || opera.toString() != "[object Opera]"));
	}

	if( 1  && ( 1  ||  1 )){
		var domOn = function(node, eventName, ieEventName, handler){
				// Add an event listener to a DOM node using the API appropriate for the current browser;
				// return a function that will disconnect the listener.
				if(!has("ie-event-behavior")){
					node.addEventListener(eventName, handler, false);
					return function(){
						node.removeEventListener(eventName, handler, false);
					};
				}else{
					node.attachEvent(ieEventName, handler);
					return function(){
						node.detachEvent(ieEventName, handler);
					};
				}
			},
			windowOnLoadListener = domOn(window, "load", "onload", function(){
				req.pageLoaded = 1;
				doc.readyState!="complete" && (doc.readyState = "complete");
				windowOnLoadListener();
			});

		if( 1 ){
			// if the loader is on the page, there must be at least one script element
			// getting its parent and then doing insertBefore solves the "Operation Aborted"
			// error in IE from appending to a node that isn't properly closed; see
			// dojo/tests/_base/loader/requirejs/simple-badbase.html for an example
			// don't use scripts with type dojo/... since these may be removed; see #15809
			// prefer to use the insertPoint computed during the config sniff in case a script is removed; see #16958
			var scripts = doc.getElementsByTagName("script"),
				i = 0,
				script;
			while(!insertPointSibling){
				if(!/^dojo/.test((script = scripts[i++]) && script.type)){
					insertPointSibling= script;
				}
			}

			req.injectUrl = function(url, callback, owner){
				// insert a script element to the insert-point element with src=url;
				// apply callback upon detecting the script has loaded.

				var node = owner.node = doc.createElement("script"),
					onLoad = function(e){
						e = e || window.event;
						var node = e.target || e.srcElement;
						if(e.type === "load" || /complete|loaded/.test(node.readyState)){
							loadDisconnector();
							errorDisconnector();
							callback && callback();
						}
					},
					loadDisconnector = domOn(node, "load", "onreadystatechange", onLoad),
					errorDisconnector = domOn(node, "error", "onerror", function(e){
						loadDisconnector();
						errorDisconnector();
						signal(error, makeError("scriptError", [url, e]));
					});

				node.type = "text/javascript";
				node.charset = "utf-8";
				node.src = url;
				insertPointSibling.parentNode.insertBefore(node, insertPointSibling);
				return node;
			};
		}
	}

	if( true ){
		req.log = function(){
			try{
				for(var i = 0; i < arguments.length; i++){
					 0 && console.log(arguments[i]);
				}
			}catch(e){}
		};
	}else{
		req.log = noop;
	}

	if( false ){
		var trace = req.trace = function(
			group,	// the trace group to which this application belongs
			args	// the contents of the trace
		){
			///
			// Tracing interface by group.
			//
			// Sends the contents of args to the console iff (req.trace.on && req.trace[group])

			if(trace.on && trace.group[group]){
				signal("trace", [group, args]);
				for(var arg, dump = [], text= "trace:" + group + (args.length ? (":" + args[0]) : ""), i= 1; i<args.length;){
					arg = args[i++];
					if(isString(arg)){
						text += ", " + arg;
					}else{
						dump.push(arg);
					}
				}
				req.log(text);
				dump.length && dump.push(".");
				req.log.apply(req, dump);
			}
		};
		mix(trace, {
			on:1,
			group:{},
			set:function(group, value){
				if(isString(group)){
					trace.group[group]= value;
				}else{
					mix(trace.group, group);
				}
			}
		});
		trace.set(mix(mix(mix({}, defaultConfig.trace), userConfig.trace), dojoSniffConfig.trace));
		on("config", function(config){
			config.trace && trace.set(config.trace);
		});
	}else{
		req.trace = noop;
	}

	var def = function(
		mid,		  //(commonjs.moduleId, optional)
		dependencies, //(array of commonjs.moduleId, optional) list of modules to be loaded before running factory
		factory		  //(any)
	){
		///
		// Advises the loader of a module factory. //Implements http://wiki.commonjs.org/wiki/Modules/AsynchronousDefinition.
		///
		//note
		// CommonJS factory scan courtesy of http://requirejs.org

		var arity = arguments.length,
			defaultDeps = ["require", "exports", "module"],
			// the predominate signature...
			args = [0, mid, dependencies];
		if(arity==1){
			args = [0, (isFunction(mid) ? defaultDeps : []), mid];
		}else if(arity==2 && isString(mid)){
			args = [mid, (isFunction(dependencies) ? defaultDeps : []), dependencies];
		}else if(arity==3){
			args = [mid, dependencies, factory];
		}

		if( 0  && args[1]===defaultDeps){
			args[2].toString()
				.replace(/(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg, "")
				.replace(/require\(["']([\w\!\-_\.\/]+)["']\)/g, function(match, dep){
				args[1].push(dep);
			});
		}

		req.trace("loader-define", args.slice(0, 2));
		var targetModule = args[0] && getModule(args[0]),
			module;
		if(targetModule && !waiting[targetModule.mid]){
			// given a mid that hasn't been requested; therefore, defined through means other than injecting
			// consequent to a require() or define() application; examples include defining modules on-the-fly
			// due to some code path or including a module in a script element. In any case,
			// there is no callback waiting to finish processing and nothing to trigger the defQ and the
			// dependencies are never requested; therefore, do it here.
			injectDependencies(defineModule(targetModule, args[1], args[2]));
		}else if(!has("ie-event-behavior") || ! 1  || injectingCachedModule){
			// not IE path: anonymous module and therefore must have been injected; therefore, onLoad will fire immediately
			// after script finishes being evaluated and the defQ can be run from that callback to detect the module id
			defQ.push(args);
		}else{
			// IE path: possibly anonymous module and therefore injected; therefore, cannot depend on 1-to-1,
			// in-order exec of onLoad with script eval (since it's IE) and must manually detect here
			targetModule = targetModule || injectingModule;
			if(!targetModule){
				for(mid in waiting){
					module = modules[mid];
					if(module && module.node && module.node.readyState === 'interactive'){
						targetModule = module;
						break;
					}
				}
				if( 0  && !targetModule){
					for(var i = 0; i<combosPending.length; i++){
						targetModule = combosPending[i];
						if(targetModule.node && targetModule.node.readyState === 'interactive'){
							break;
						}
						targetModule= 0;
					}
				}
			}
			if( 0  && isArray(targetModule)){
				injectDependencies(defineModule(getModule(targetModule.shift()), args[1], args[2]));
				if(!targetModule.length){
					combosPending.splice(i, 1);
				}
			}else if(targetModule){
				consumePendingCacheInsert(targetModule);
				injectDependencies(defineModule(targetModule, args[1], args[2]));
			}else{
				signal(error, makeError("ieDefineFailed", args[0]));
			}
			checkComplete();
		}
	};
	def.amd = {
		vendor:"dojotoolkit.org"
	};

	if( 0 ){
		req.def = def;
	}

	// allow config to override default implementation of named functions; this is useful for
	// non-browser environments, e.g., overriding injectUrl, getText, log, etc. in node.js, Rhino, etc.
	// also useful for testing and monkey patching loader
	mix(mix(req, defaultConfig.loaderPatch), userConfig.loaderPatch);

	// now that req is fully initialized and won't change, we can hook it up to the error signal
	on(error, function(arg){
		try{
			 0 && console.error(arg);
			if(arg instanceof Error){
				for(var p in arg){
					 0 && console.log(p + ":", arg[p]);
				}
				 0 && console.log(".");
			}
		}catch(e){}
	});

	// always publish these
	mix(req, {
		uid:uid,
		cache:cache,
		packs:packs
	});


	if( 0 ){
		mix(req, {
			// these may be interesting to look at when debugging
			paths:paths,
			aliases:aliases,
			modules:modules,
			legacyMode:legacyMode,
			execQ:execQ,
			defQ:defQ,
			waiting:waiting,

			// these are used for testing
			// TODO: move testing infrastructure to a different has feature
			packs:packs,
			mapProgs:mapProgs,
			pathsMapProg:pathsMapProg,
			listenerQueues:listenerQueues,

			// these are used by the builder (at least)
			computeMapProg:computeMapProg,
			computeAliases:computeAliases,
			runMapProg:runMapProg,
			compactPath:compactPath,
			getModuleInfo:getModuleInfo_
		});
	}

	// the loader can be defined exactly once; look for global define which is the symbol AMD loaders are
	// *required* to define (as opposed to require, which is optional)
	if(global.define){
		if( true ){
			signal(error, makeError("defineAlreadyDefined", 0));
		}
		return;
	}else{
		global.define = def;
		global.require = req;
		if( 0 ){
			require = req;
		}
	}

	if( 0  && req.combo && req.combo.plugins){
		var plugins = req.combo.plugins,
			pluginName;
		for(pluginName in plugins){
			mix(mix(getModule(pluginName), plugins[pluginName]), {isCombo:1, executed:"executed", load:1});
		}
	}

	if( 1 ){
		forEach(delayedModuleConfig, function(c){ config(c); });
		var bootDeps = dojoSniffConfig.deps ||	userConfig.deps || defaultConfig.deps,
			bootCallback = dojoSniffConfig.callback || userConfig.callback || defaultConfig.callback;
		req.boot = (bootDeps || bootCallback) ? [bootDeps || [], bootCallback] : 0;
	}
	if(! 1 ){
		!req.async && req(["dojo"]);
		req.boot && req.apply(null, req.boot);
	}
})
(this.dojoConfig || this.djConfig || this.require || {}, {
		async:0,
		hasCache:{
				'config-selectorEngine':"lite",
				'config-tlmSiblingOfDojo':1,
				'dojo-built':1,
				'dojo-loader':1,
				dom:1,
				'host-browser':1
		},
		packages:[
				{
					 location:".",
					 name:"dojo"
				},
				{
					 location:"../dijit",
					 name:"dijit"
				},
				{
					 location:"../dojox",
					 name:"dojox"
				},
				{
					 location:"../p3",
					 name:"p3"
				},
				{
					 location:"../dgrid",
					 main:"OnDemandGrid",
					 name:"dgrid"
				},
				{
					 location:"../put-selector",
					 main:"put",
					 name:"put-selector"
				},
				{
					 location:"../xstyle",
					 name:"xstyle"
				},
				{
					 location:"../dbind",
					 main:"bind",
					 name:"dbind"
				},
				{
					 location:"../rql",
					 name:"rql"
				},
				{
					 location:"../JBrowse",
					 name:"JBrowse"
				},
				{
					 location:"../jszlib",
					 name:"jszlib"
				},
				{
					 location:"../FileSaver",
					 main:"FileSaver",
					 name:"FileSaver"
				},
				{
					 location:"../circulus",
					 name:"circulus"
				},
				{
					 location:"../lazyload",
					 main:"lazyload",
					 name:"lazyload"
				},
				{
					 location:"../jDataView",
					 main:"jdataview",
					 name:"jDataView"
				},
				{
					 location:"../d3",
					 main:"index.js",
					 name:"d3"
				},
				{
					 location:"../d3.v5",
					 name:"d3.v5"
				},
				{
					 location:"../swfobject",
					 main:"swfobject.js",
					 name:"swfobject"
				},
				{
					 location:"../phyloview",
					 name:"phyloview"
				},
				{
					 location:"../cytoscape-panzoom",
					 main:"cytoscape-panzoom.js",
					 name:"cytoscape-panzoom"
				},
				{
					 location:"../cytoscape-context-menus",
					 main:"cytoscape-context-menus.js",
					 name:"cytoscape-context-menus"
				},
				{
					 location:"../cytoscape-cola",
					 main:"cytoscape-cola.js",
					 name:"cytoscape-cola"
				},
				{
					 location:"../cytoscape-dagre",
					 main:"cytoscape-dagre.js",
					 name:"cytoscape-dagre"
				}
		]
});require({cache:{
'dojo/main':function(){
define([
	"./_base/kernel",	// kernel.isAsync
	"./has",
	"require",
	"./sniff",
	"./_base/lang",
	"./_base/array",
	"./_base/config",
	"./ready",
	"./_base/declare",
	"./_base/connect",
	"./_base/Deferred",
	"./_base/json",
	"./_base/Color",
	"require",
	"./_base/browser",
	"./_base/loader"
], function(kernel, has, require, sniff, lang, array, config, ready){
	// module:
	//		dojo/main
	// summary:
	//		This is the package main module for the dojo package; it loads dojo base appropriate for the execution environment.

	// the preferred way to load the dojo firebug console is by setting  false  true in dojoConfig
	// the isDebug config switch is for backcompat and will work fine in sync loading mode; it works in
	// async mode too, but there's no guarantee when the module is loaded; therefore, if you need a firebug
	// console guaranteed at a particular spot in an app, either set config.has["dojo-firebug"] true before
	// loading dojo.js or explicitly include dojo/_firebug/firebug in a dependency list.
	if(config.isDebug){
		require(["./_firebug/firebug"]);
	}

	// dojoConfig.require is deprecated; use the loader configuration property deps
	 1 || has.add("dojo-config-require", 1);
	if( 1 ){
		var deps= config.require;
		if(deps){
			// config.require may be dot notation
			deps= array.map(lang.isArray(deps) ? deps : [deps], function(item){ return item.replace(/\./g, "/"); });
			if(kernel.isAsync){
				require(deps);
			}else{
				// this is a bit janky; in 1.6- dojo is defined before these requires are applied; but in 1.7+
				// dojo isn't defined until returning from this module; this is only a problem in sync mode
				// since we're in sync mode, we know we've got our loader with its priority ready queue
				ready(1, function(){require(deps);});
			}
		}
	}

	return kernel;
});

},
'dojo/_base/kernel':function(){
define(["../has", "./config", "require", "module"], function(has, config, require, module){
	// module:
	//		dojo/_base/kernel

	// This module is the foundational module of the dojo boot sequence; it defines the dojo object.

	var
		// loop variables for this module
		i, p,

		// create dojo, dijit, and dojox
		// FIXME: in 2.0 remove dijit, dojox being created by dojo
		global = (function () { return this; })(),
		dijit = {},
		dojox = {},
		dojo = {
			// summary:
			//		This module is the foundational module of the dojo boot sequence; it defines the dojo object.

			// notice dojo takes ownership of the value of the config module
			config:config,
			global:global,
			dijit:dijit,
			dojox:dojox
		};


	// Configure the scope map. For a 100% AMD application, the scope map is not needed other than to provide
	// a _scopeName property for the dojo, dijit, and dojox root object so those packages can create
	// unique names in the global space.
	//
	// Built, legacy modules use the scope map to allow those modules to be expressed as if dojo, dijit, and dojox,
	// where global when in fact they are either global under different names or not global at all. In v1.6-, the
	// config variable "scopeMap" was used to map names as used within a module to global names. This has been
	// subsumed by the AMD map configuration variable which can relocate packages to different names. For backcompat,
	// only the "*" mapping is supported. See http://livedocs.dojotoolkit.org/developer/design/loader#legacy-cross-domain-mode for details.
	//
	// The following computations contort the packageMap for this dojo instance into a scopeMap.
	var scopeMap =
			// a map from a name used in a legacy module to the (global variable name, object addressed by that name)
			// always map dojo, dijit, and dojox
			{
				dojo:["dojo", dojo],
				dijit:["dijit", dijit],
				dojox:["dojox", dojox]
			},

		packageMap =
			// the package map for this dojo instance; note, a foreign loader or no pacakgeMap results in the above default config
			(require.map && require.map[module.id.match(/[^\/]+/)[0]]),

		item;


	// process all mapped top-level names for this instance of dojo
	for(p in packageMap){
		if(scopeMap[p]){
			// mapped dojo, dijit, or dojox
			scopeMap[p][0] = packageMap[p];
		}else{
			// some other top-level name
			scopeMap[p] = [packageMap[p], {}];
		}
	}

	// publish those names to _scopeName and, optionally, the global namespace
	for(p in scopeMap){
		item = scopeMap[p];
		item[1]._scopeName = item[0];
		if(!config.noGlobals){
			global[item[0]] = item[1];
		}
	}
	dojo.scopeMap = scopeMap;

	/*===== dojo.__docParserConfigureScopeMap(scopeMap); =====*/

	// FIXME: dojo.baseUrl and dojo.config.baseUrl should be deprecated
	dojo.baseUrl = dojo.config.baseUrl = require.baseUrl;
	dojo.isAsync = ! 1  || require.async;
	dojo.locale = config.locale;

	var rev = "$Rev$".match(/[0-9a-f]{7,}/);
	dojo.version = {
		// summary:
		//		Version number of the Dojo Toolkit
		// description:
		//		Hash about the version, including
		//
		//		- major: Integer: Major version. If total version is "1.2.0beta1", will be 1
		//		- minor: Integer: Minor version. If total version is "1.2.0beta1", will be 2
		//		- patch: Integer: Patch version. If total version is "1.2.0beta1", will be 0
		//		- flag: String: Descriptor flag. If total version is "1.2.0beta1", will be "beta1"
		//		- revision: Number: The Git rev from which dojo was pulled

		major: 1, minor: 11, patch: 0, flag: "-pre",
		revision: rev ? rev[0] : NaN,
		toString: function(){
			var v = dojo.version;
			return v.major + "." + v.minor + "." + v.patch + v.flag + " (" + v.revision + ")";	// String
		}
	};

	// If  1  is truthy, then as a dojo module is defined it should push it's definitions
	// into the dojo object, and conversely. In 2.0, it will likely be unusual to augment another object
	// as a result of defining a module. This has feature gives a way to force 2.0 behavior as the code
	// is migrated. Absent specific advice otherwise, set extend-dojo to truthy.
	 1 || has.add("extend-dojo", 1);


	(Function("d", "d.eval = function(){return d.global.eval ? d.global.eval(arguments[0]) : eval(arguments[0]);}"))(dojo);
	/*=====
	dojo.eval = function(scriptText){
		// summary:
		//		A legacy method created for use exclusively by internal Dojo methods. Do not use this method
		//		directly unless you understand its possibly-different implications on the platforms your are targeting.
		// description:
		//		Makes an attempt to evaluate scriptText in the global scope. The function works correctly for browsers
		//		that support indirect eval.
		//
		//		As usual, IE does not. On IE, the only way to implement global eval is to
		//		use execScript. Unfortunately, execScript does not return a value and breaks some current usages of dojo.eval.
		//		This implementation uses the technique of executing eval in the scope of a function that is a single scope
		//		frame below the global scope; thereby coming close to the global scope. Note carefully that
		//
		//		dojo.eval("var pi = 3.14;");
		//
		//		will define global pi in non-IE environments, but define pi only in a temporary local scope for IE. If you want
		//		to define a global variable using dojo.eval, write something like
		//
		//		dojo.eval("window.pi = 3.14;")
		// scriptText:
		//		The text to evaluation.
		// returns:
		//		The result of the evaluation. Often `undefined`
	};
	=====*/


	if( 0 ){
		dojo.exit = function(exitcode){
			quit(exitcode);
		};
	}else{
		dojo.exit = function(){
		};
	}

	 1 || has.add("dojo-guarantee-console",
		// ensure that console.log, console.warn, etc. are defined
		1
	);
	if( 1 ){
		typeof console != "undefined" || (console = {});
		//	Be careful to leave 'log' always at the end
		var cn = [
			"assert", "count", "debug", "dir", "dirxml", "error", "group",
			"groupEnd", "info", "profile", "profileEnd", "time", "timeEnd",
			"trace", "warn", "log"
		];
		var tn;
		i = 0;
		while((tn = cn[i++])){
			if(!console[tn]){
				(function(){
					var tcn = tn + "";
					console[tcn] = ('log' in console) ? function(){
						var a = Array.prototype.slice.call(arguments);
						a.unshift(tcn + ":");
						console["log"](a.join(" "));
					} : function(){};
					console[tcn]._fake = true;
				})();
			}
		}
	}

	 true || has.add("dojo-debug-messages",
		// include dojo.deprecated/dojo.experimental implementations
		!!config.isDebug
	);
	dojo.deprecated = dojo.experimental =  function(){};
	if( true ){
		dojo.deprecated = function(/*String*/ behaviour, /*String?*/ extra, /*String?*/ removal){
			// summary:
			//		Log a debug message to indicate that a behavior has been
			//		deprecated.
			// behaviour: String
			//		The API or behavior being deprecated. Usually in the form
			//		of "myApp.someFunction()".
			// extra: String?
			//		Text to append to the message. Often provides advice on a
			//		new function or facility to achieve the same goal during
			//		the deprecation period.
			// removal: String?
			//		Text to indicate when in the future the behavior will be
			//		removed. Usually a version number.
			// example:
			//	| dojo.deprecated("myApp.getTemp()", "use myApp.getLocaleTemp() instead", "1.0");

			var message = "DEPRECATED: " + behaviour;
			if(extra){ message += " " + extra; }
			if(removal){ message += " -- will be removed in version: " + removal; }
			 0 && console.warn(message);
		};

		dojo.experimental = function(/* String */ moduleName, /* String? */ extra){
			// summary:
			//		Marks code as experimental.
			// description:
			//		This can be used to mark a function, file, or module as
			//		experimental.	 Experimental code is not ready to be used, and the
			//		APIs are subject to change without notice.	Experimental code may be
			//		completed deleted without going through the normal deprecation
			//		process.
			// moduleName: String
			//		The name of a module, or the name of a module file or a specific
			//		function
			// extra: String?
			//		some additional message for the user
			// example:
			//	| dojo.experimental("dojo.data.Result");
			// example:
			//	| dojo.experimental("dojo.weather.toKelvin()", "PENDING approval from NOAA");

			var message = "EXPERIMENTAL: " + moduleName + " -- APIs subject to change without notice.";
			if(extra){ message += " " + extra; }
			 0 && console.warn(message);
		};
	}

	 1 || has.add("dojo-modulePaths",
		// consume dojo.modulePaths processing
		1
	);
	if( 1 ){
		// notice that modulePaths won't be applied to any require's before the dojo/_base/kernel factory is run;
		// this is the v1.6- behavior.
		if(config.modulePaths){
			dojo.deprecated("dojo.modulePaths", "use paths configuration");
			var paths = {};
			for(p in config.modulePaths){
				paths[p.replace(/\./g, "/")] = config.modulePaths[p];
			}
			require({paths:paths});
		}
	}

	 1 || has.add("dojo-moduleUrl",
		// include dojo.moduleUrl
		1
	);
	if( 1 ){
		dojo.moduleUrl = function(/*String*/module, /*String?*/url){
			// summary:
			//		Returns a URL relative to a module.
			// example:
			//	|	var pngPath = dojo.moduleUrl("acme","images/small.png");
			//	|	 0 && console.dir(pngPath); // list the object properties
			//	|	// create an image and set it's source to pngPath's value:
			//	|	var img = document.createElement("img");
			//	|	img.src = pngPath;
			//	|	// add our image to the document
			//	|	dojo.body().appendChild(img);
			// example:
			//		you may de-reference as far as you like down the package
			//		hierarchy.  This is sometimes handy to avoid lengthy relative
			//		urls or for building portable sub-packages. In this example,
			//		the `acme.widget` and `acme.util` directories may be located
			//		under different roots (see `dojo.registerModulePath`) but the
			//		the modules which reference them can be unaware of their
			//		relative locations on the filesystem:
			//	|	// somewhere in a configuration block
			//	|	dojo.registerModulePath("acme.widget", "../../acme/widget");
			//	|	dojo.registerModulePath("acme.util", "../../util");
			//	|
			//	|	// ...
			//	|
			//	|	// code in a module using acme resources
			//	|	var tmpltPath = dojo.moduleUrl("acme.widget","templates/template.html");
			//	|	var dataPath = dojo.moduleUrl("acme.util","resources/data.json");

			dojo.deprecated("dojo.moduleUrl()", "use require.toUrl", "2.0");

			// require.toUrl requires a filetype; therefore, just append the suffix "/*.*" to guarantee a filetype, then
			// remove the suffix from the result. This way clients can request a url w/out a filetype. This should be
			// rare, but it maintains backcompat for the v1.x line (note: dojo.moduleUrl will be removed in v2.0).
			// Notice * is an illegal filename so it won't conflict with any real path map that may exist the paths config.
			var result = null;
			if(module){
				result = require.toUrl(module.replace(/\./g, "/") + (url ? ("/" + url) : "") + "/*.*").replace(/\/\*\.\*/, "") + (url ? "" : "/");
			}
			return result;
		};
	}

	dojo._hasResource = {}; // for backward compatibility with layers built with 1.6 tooling

	return dojo;
});

},
'dojo/has':function(){
define(["require", "module"], function(require, module){
	// module:
	//		dojo/has
	// summary:
	//		Defines the has.js API and several feature tests used by dojo.
	// description:
	//		This module defines the has API as described by the project has.js with the following additional features:
	//
	//		- the has test cache is exposed at has.cache.
	//		- the method has.add includes a forth parameter that controls whether or not existing tests are replaced
	//		- the loader's has cache may be optionally copied into this module's has cahce.
	//
	//		This module adopted from https://github.com/phiggins42/has.js; thanks has.js team!

	// try to pull the has implementation from the loader; both the dojo loader and bdLoad provide one
	// if using a foreign loader, then the has cache may be initialized via the config object for this module
	// WARNING: if a foreign loader defines require.has to be something other than the has.js API, then this implementation fail
	var has = require.has || function(){};
	if(! 1 ){
		var
			isBrowser =
				// the most fundamental decision: are we in the browser?
				typeof window != "undefined" &&
				typeof location != "undefined" &&
				typeof document != "undefined" &&
				window.location == location && window.document == document,

			// has API variables
			global = (function () { return this; })(),
			doc = isBrowser && document,
			element = doc && doc.createElement("DiV"),
			cache = (module.config && module.config()) || {};

		has = function(name){
			// summary:
			//		Return the current value of the named feature.
			//
			// name: String|Integer
			//		The name (if a string) or identifier (if an integer) of the feature to test.
			//
			// description:
			//		Returns the value of the feature named by name. The feature must have been
			//		previously added to the cache by has.add.

			return typeof cache[name] == "function" ? (cache[name] = cache[name](global, doc, element)) : cache[name]; // Boolean
		};

		has.cache = cache;

		has.add = function(name, test, now, force){
			// summary:
			//	 	Register a new feature test for some named feature.
			// name: String|Integer
			//	 	The name (if a string) or identifier (if an integer) of the feature to test.
			// test: Function
			//		 A test function to register. If a function, queued for testing until actually
			//		 needed. The test function should return a boolean indicating
			//	 	the presence of a feature or bug.
			// now: Boolean?
			//		 Optional. Omit if `test` is not a function. Provides a way to immediately
			//		 run the test and cache the result.
			// force: Boolean?
			//	 	Optional. If the test already exists and force is truthy, then the existing
			//	 	test will be replaced; otherwise, add does not replace an existing test (that
			//	 	is, by default, the first test advice wins).
			// example:
			//		A redundant test, testFn with immediate execution:
			//	|	has.add("javascript", function(){ return true; }, true);
			//
			// example:
			//		Again with the redundantness. You can do this in your tests, but we should
			//		not be doing this in any internal has.js tests
			//	|	has.add("javascript", true);
			//
			// example:
			//		Three things are passed to the testFunction. `global`, `document`, and a generic element
			//		from which to work your test should the need arise.
			//	|	has.add("bug-byid", function(g, d, el){
			//	|		// g	== global, typically window, yadda yadda
			//	|		// d	== document object
			//	|		// el == the generic element. a `has` element.
			//	|		return false; // fake test, byid-when-form-has-name-matching-an-id is slightly longer
			//	|	});

			(typeof cache[name]=="undefined" || force) && (cache[name]= test);
			return now && has(name);
		};

		// since we're operating under a loader that doesn't provide a has API, we must explicitly initialize
		// has as it would have otherwise been initialized by the dojo loader; use has.add to the builder
		// can optimize these away iff desired
		 1 || has.add("host-browser", isBrowser);
		 0 && has.add("host-node", (typeof process == "object" && process.versions && process.versions.node && process.versions.v8));
		 0 && has.add("host-rhino", (typeof load == "function" && (typeof Packages == "function" || typeof Packages == "object")));
		 1 || has.add("dom", isBrowser);
		 1 || has.add("dojo-dom-ready-api", 1);
		 1 || has.add("dojo-sniff", 1);
	}

	if( 1 ){
		// Common application level tests
		has.add("dom-addeventlistener", !!document.addEventListener);

		// Do the device and browser have touch capability?
		has.add("touch", "ontouchstart" in document
			|| ("onpointerdown" in document && navigator.maxTouchPoints > 0)
			|| window.navigator.msMaxTouchPoints);

		// Touch events support
		has.add("touch-events", "ontouchstart" in document);

		// Pointer Events support
		has.add("pointer-events", "onpointerdown" in document);
		has.add("MSPointer", "msMaxTouchPoints" in navigator); //IE10 (+IE11 preview)

		// I don't know if any of these tests are really correct, just a rough guess
		has.add("device-width", screen.availWidth || innerWidth);

		// Tests for DOMNode.attributes[] behavior:
		//	 - dom-attributes-explicit - attributes[] only lists explicitly user specified attributes
		//	 - dom-attributes-specified-flag (IE8) - need to check attr.specified flag to skip attributes user didn't specify
		//	 - Otherwise, in IE6-7. attributes[] will list hundreds of values, so need to do outerHTML to get attrs instead.
		var form = document.createElement("form");
		has.add("dom-attributes-explicit", form.attributes.length == 0); // W3C
		has.add("dom-attributes-specified-flag", form.attributes.length > 0 && form.attributes.length < 40);	// IE8
	}

	has.clearElement = function(element){
		// summary:
		//	 Deletes the contents of the element passed to test functions.
		element.innerHTML= "";
		return element;
	};

	has.normalize = function(id, toAbsMid){
		// summary:
		//	 Resolves id into a module id based on possibly-nested tenary expression that branches on has feature test value(s).
		//
		// toAbsMid: Function
		//	 Resolves a relative module id into an absolute module id
		var
			tokens = id.match(/[\?:]|[^:\?]*/g), i = 0,
			get = function(skip){
				var term = tokens[i++];
				if(term == ":"){
					// empty string module name, resolves to 0
					return 0;
				}else{
					// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
					if(tokens[i++] == "?"){
						if(!skip && has(term)){
							// matched the feature, get the first value from the options
							return get();
						}else{
							// did not match, get the second value, passing over the first
							get(true);
							return get(skip);
						}
					}
					// a module
					return term || 0;
				}
			};
		id = get();
		return id && toAbsMid(id);
	};

	has.load = function(id, parentRequire, loaded){
		// summary:
		//		Conditional loading of AMD modules based on a has feature test value.
		// id: String
		//		Gives the resolved module id to load.
		// parentRequire: Function
		//		The loader require function with respect to the module that contained the plugin resource in it's
		//		dependency list.
		// loaded: Function
		//	 Callback to loader that consumes result of plugin demand.

		if(id){
			parentRequire([id], loaded);
		}else{
			loaded();
		}
	};

	return has;
});

},
'dojo/_base/config':function(){
define(["../has", "require"], function(has, require){
	// module:
	//		dojo/_base/config

/*=====
return {
	// summary:
	//		This module defines the user configuration during bootstrap.
	// description:
	//		By defining user configuration as a module value, an entire configuration can be specified in a build,
	//		thereby eliminating the need for sniffing and or explicitly setting in the global variable dojoConfig.
	//		Also, when multiple instances of dojo exist in a single application, each will necessarily be located
	//		at an unique absolute module identifier as given by the package configuration. Implementing configuration
	//		as a module allows for specifying unique, per-instance configurations.
	// example:
	//		Create a second instance of dojo with a different, instance-unique configuration (assume the loader and
	//		dojo.js are already loaded).
	//		|	// specify a configuration that creates a new instance of dojo at the absolute module identifier "myDojo"
	//		|	require({
	//		|		packages:[{
	//		|			name:"myDojo",
	//		|			location:".", //assume baseUrl points to dojo.js
	//		|		}]
	//		|	});
	//		|
	//		|	// specify a configuration for the myDojo instance
	//		|	define("myDojo/config", {
	//		|		// normal configuration variables go here, e.g.,
	//		|		locale:"fr-ca"
	//		|	});
	//		|
	//		|	// load and use the new instance of dojo
	//		|	require(["myDojo"], function(dojo){
	//		|		// dojo is the new instance of dojo
	//		|		// use as required
	//		|	});

	// isDebug: Boolean
	//		Defaults to `false`. If set to `true`, ensures that Dojo provides
	//		extended debugging feedback via Firebug. If Firebug is not available
	//		on your platform, setting `isDebug` to `true` will force Dojo to
	//		pull in (and display) the version of Firebug Lite which is
	//		integrated into the Dojo distribution, thereby always providing a
	//		debugging/logging console when `isDebug` is enabled. Note that
	//		Firebug's `console.*` methods are ALWAYS defined by Dojo. If
	//		`isDebug` is false and you are on a platform without Firebug, these
	//		methods will be defined as no-ops.
	isDebug: false,

	// locale: String
	//		The locale to assume for loading localized resources in this page,
	//		specified according to [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt).
	//		Must be specified entirely in lowercase, e.g. `en-us` and `zh-cn`.
	//		See the documentation for `dojo.i18n` and `dojo.requireLocalization`
	//		for details on loading localized resources. If no locale is specified,
	//		Dojo assumes the locale of the user agent, according to `navigator.userLanguage`
	//		or `navigator.language` properties.
	locale: undefined,

	// extraLocale: Array
	//		No default value. Specifies additional locales whose
	//		resources should also be loaded alongside the default locale when
	//		calls to `dojo.requireLocalization()` are processed.
	extraLocale: undefined,

	// baseUrl: String
	//		The directory in which `dojo.js` is located. Under normal
	//		conditions, Dojo auto-detects the correct location from which it
	//		was loaded. You may need to manually configure `baseUrl` in cases
	//		where you have renamed `dojo.js` or in which `<base>` tags confuse
	//		some browsers (e.g. IE 6). The variable `dojo.baseUrl` is assigned
	//		either the value of `djConfig.baseUrl` if one is provided or the
	//		auto-detected root if not. Other modules are located relative to
	//		this path. The path should end in a slash.
	baseUrl: undefined,

	// modulePaths: [deprecated] Object
	//		A map of module names to paths relative to `dojo.baseUrl`. The
	//		key/value pairs correspond directly to the arguments which
	//		`dojo.registerModulePath` accepts. Specifying
	//		`djConfig.modulePaths = { "foo": "../../bar" }` is the equivalent
	//		of calling `dojo.registerModulePath("foo", "../../bar");`. Multiple
	//		modules may be configured via `djConfig.modulePaths`.
	modulePaths: {},

	// addOnLoad: Function|Array
	//		Adds a callback via dojo/ready. Useful when Dojo is added after
	//		the page loads and djConfig.afterOnLoad is true. Supports the same
	//		arguments as dojo/ready. When using a function reference, use
	//		`djConfig.addOnLoad = function(){};`. For object with function name use
	//		`djConfig.addOnLoad = [myObject, "functionName"];` and for object with
	//		function reference use
	//		`djConfig.addOnLoad = [myObject, function(){}];`
	addOnLoad: null,

	// parseOnLoad: Boolean
	//		Run the parser after the page is loaded
	parseOnLoad: false,

	// require: String[]
	//		An array of module names to be loaded immediately after dojo.js has been included
	//		in a page.
	require: [],

	// defaultDuration: Number
	//		Default duration, in milliseconds, for wipe and fade animations within dijits.
	//		Assigned to dijit.defaultDuration.
	defaultDuration: 200,

	// dojoBlankHtmlUrl: String
	//		Used by some modules to configure an empty iframe. Used by dojo/io/iframe and
	//		dojo/back, and dijit/popup support in IE where an iframe is needed to make sure native
	//		controls do not bleed through the popups. Normally this configuration variable
	//		does not need to be set, except when using cross-domain/CDN Dojo builds.
	//		Save dojo/resources/blank.html to your domain and set `djConfig.dojoBlankHtmlUrl`
	//		to the path on your domain your copy of blank.html.
	dojoBlankHtmlUrl: undefined,

	// ioPublish: Boolean?
	//		Set this to true to enable publishing of topics for the different phases of
	//		IO operations. Publishing is done via dojo/topic.publish(). See dojo/main.__IoPublish for a list
	//		of topics that are published.
	ioPublish: false,

	// useCustomLogger: Anything?
	//		If set to a value that evaluates to true such as a string or array and
	//		isDebug is true and Firebug is not available or running, then it bypasses
	//		the creation of Firebug Lite allowing you to define your own console object.
	useCustomLogger: undefined,

	// transparentColor: Array
	//		Array containing the r, g, b components used as transparent color in dojo.Color;
	//		if undefined, [255,255,255] (white) will be used.
	transparentColor: undefined,
	
	// deps: Function|Array
	//		Defines dependencies to be used before the loader has been loaded.
	//		When provided, they cause the loader to execute require(deps, callback) 
	//		once it has finished loading. Should be used with callback.
	deps: undefined,
	
	// callback: Function|Array
	//		Defines a callback to be used when dependencies are defined before 
	//		the loader has been loaded. When provided, they cause the loader to 
	//		execute require(deps, callback) once it has finished loading. 
	//		Should be used with deps.
	callback: undefined,
	
	// deferredInstrumentation: Boolean
	//		Whether deferred instrumentation should be loaded or included
	//		in builds.
	deferredInstrumentation: true,

	// useDeferredInstrumentation: Boolean|String
	//		Whether the deferred instrumentation should be used.
	//
	//		* `"report-rejections"`: report each rejection as it occurs.
	//		* `true` or `1` or `"report-unhandled-rejections"`: wait 1 second
	//			in an attempt to detect unhandled rejections.
	useDeferredInstrumentation: "report-unhandled-rejections"
};
=====*/

	var result = {};
	if( 1 ){
		// must be the dojo loader; take a shallow copy of require.rawConfig
		var src = require.rawConfig, p;
		for(p in src){
			result[p] = src[p];
		}
	}else{
		var adviseHas = function(featureSet, prefix, booting){
			for(p in featureSet){
				p!="has" && has.add(prefix + p, featureSet[p], 0, booting);
			}
		};
		var global = (function () { return this; })();
		result =  1  ?
			// must be a built version of the dojo loader; all config stuffed in require.rawConfig
			require.rawConfig :
			// a foreign loader
			global.dojoConfig || global.djConfig || {};
		adviseHas(result, "config", 1);
		adviseHas(result.has, "", 1);
	}

	if(!result.locale && typeof navigator != "undefined"){
		// Default locale for browsers.
		var language = (navigator.language || navigator.userLanguage);
		if(language){
			result.locale = language.toLowerCase();
		}
	}

	return result;
});


},
'dojo/sniff':function(){
define(["./has"], function(has){
	// module:
	//		dojo/sniff

	/*=====
	return function(){
		// summary:
		//		This module sets has() flags based on the current browser.
		//		It returns the has() function.
	};
	=====*/

	if( 1 ){
		var n = navigator,
			dua = n.userAgent,
			dav = n.appVersion,
			tv = parseFloat(dav);

		has.add("air", dua.indexOf("AdobeAIR") >= 0);
		has.add("msapp", parseFloat(dua.split("MSAppHost/")[1]) || undefined);
		has.add("khtml", dav.indexOf("Konqueror") >= 0 ? tv : undefined);
		has.add("webkit", parseFloat(dua.split("WebKit/")[1]) || undefined);
		has.add("chrome", parseFloat(dua.split("Chrome/")[1]) || undefined);
		has.add("safari", dav.indexOf("Safari")>=0 && !has("chrome") ? parseFloat(dav.split("Version/")[1]) : undefined);
		has.add("mac", dav.indexOf("Macintosh") >= 0);
		has.add("quirks", document.compatMode == "BackCompat");
		if(dua.match(/(iPhone|iPod|iPad)/)){
			var p = RegExp.$1.replace(/P/, "p");
			var v = dua.match(/OS ([\d_]+)/) ? RegExp.$1 : "1";
			var os = parseFloat(v.replace(/_/, ".").replace(/_/g, ""));
			has.add(p, os);		// "iphone", "ipad" or "ipod"
			has.add("ios", os);
		}
		has.add("android", parseFloat(dua.split("Android ")[1]) || undefined);
		has.add("bb", (dua.indexOf("BlackBerry") >= 0 || dua.indexOf("BB10") >= 0) && parseFloat(dua.split("Version/")[1]) || undefined);
		has.add("trident", parseFloat(dav.split("Trident/")[1]) || undefined);

		has.add("svg", typeof SVGAngle !== "undefined");

		if(!has("webkit")){
			// Opera
			if(dua.indexOf("Opera") >= 0){
				// see http://dev.opera.com/articles/view/opera-ua-string-changes and http://www.useragentstring.com/pages/Opera/
				// 9.8 has both styles; <9.8, 9.9 only old style
				has.add("opera", tv >= 9.8 ? parseFloat(dua.split("Version/")[1]) || tv : tv);
			}

			// Mozilla and firefox
			if(dua.indexOf("Gecko") >= 0 && !has("khtml") && !has("webkit") && !has("trident")){
				has.add("mozilla", tv);
			}
			if(has("mozilla")){
				//We really need to get away from this. Consider a sane isGecko approach for the future.
				has.add("ff", parseFloat(dua.split("Firefox/")[1] || dua.split("Minefield/")[1]) || undefined);
			}

			// IE
			if(document.all && !has("opera")){
				var isIE = parseFloat(dav.split("MSIE ")[1]) || undefined;

				//In cases where the page has an HTTP header or META tag with
				//X-UA-Compatible, then it is in emulation mode.
				//Make sure isIE reflects the desired version.
				//document.documentMode of 5 means quirks mode.
				//Only switch the value if documentMode's major version
				//is different from isIE's major version.
				var mode = document.documentMode;
				if(mode && mode != 5 && Math.floor(isIE) != mode){
					isIE = mode;
				}

				has.add("ie", isIE);
			}

			// Wii
			has.add("wii", typeof opera != "undefined" && opera.wiiremote);
		}
	}

	return has;
});

},
'dojo/_base/lang':function(){
define(["./kernel", "../has", "../sniff"], function(dojo, has){
	// module:
	//		dojo/_base/lang

	has.add("bug-for-in-skips-shadowed", function(){
		// if true, the for-in iterator skips object properties that exist in Object's prototype (IE 6 - ?)
		for(var i in {toString: 1}){
			return 0;
		}
		return 1;
	});

	// Helper methods
	var _extraNames =
			has("bug-for-in-skips-shadowed") ?
				"hasOwnProperty.valueOf.isPrototypeOf.propertyIsEnumerable.toLocaleString.toString.constructor".split(".") : [],

		_extraLen = _extraNames.length,

		getProp = function(/*Array*/parts, /*Boolean*/create, /*Object*/context){
			if(!context){
				if(parts[0] && dojo.scopeMap[parts[0]]) {
					// Voodoo code from the old days where "dojo" or "dijit" maps to some special object
					// rather than just window.dojo
					context = dojo.scopeMap[parts.shift()][1];
				}else{
					context = dojo.global;
				}
			}

			try{
				for(var i = 0; i < parts.length; i++){
					var p = parts[i];
					if(!(p in context)){
						if(create){
							context[p] = {};
						}else{
							return;		// return undefined
						}
					}
					context = context[p];
				}
				return context; // mixed
			}catch(e){
				// "p in context" throws an exception when context is a number, boolean, etc. rather than an object,
				// so in that corner case just return undefined (by having no return statement)
			}
		},

		opts = Object.prototype.toString,

		efficient = function(obj, offset, startWith){
			return (startWith||[]).concat(Array.prototype.slice.call(obj, offset||0));
		},

		_pattern = /\{([^\}]+)\}/g;

	// Module export
	var lang = {
		// summary:
		//		This module defines Javascript language extensions.

		// _extraNames: String[]
		//		Lists property names that must be explicitly processed during for-in iteration
		//		in environments that have has("bug-for-in-skips-shadowed") true.
		_extraNames:_extraNames,

		_mixin: function(dest, source, copyFunc){
			// summary:
			//		Copies/adds all properties of source to dest; returns dest.
			// dest: Object
			//		The object to which to copy/add all properties contained in source.
			// source: Object
			//		The object from which to draw all properties to copy into dest.
			// copyFunc: Function?
			//		The process used to copy/add a property in source; defaults to the Javascript assignment operator.
			// returns:
			//		dest, as modified
			// description:
			//		All properties, including functions (sometimes termed "methods"), excluding any non-standard extensions
			//		found in Object.prototype, are copied/added to dest. Copying/adding each particular property is
			//		delegated to copyFunc (if any); copyFunc defaults to the Javascript assignment operator if not provided.
			//		Notice that by default, _mixin executes a so-called "shallow copy" and aggregate types are copied/added by reference.
			var name, s, i, empty = {};
			for(name in source){
				// the (!(name in empty) || empty[name] !== s) condition avoids copying properties in "source"
				// inherited from Object.prototype.	 For example, if dest has a custom toString() method,
				// don't overwrite it with the toString() method that source inherited from Object.prototype
				s = source[name];
				if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
					dest[name] = copyFunc ? copyFunc(s) : s;
				}
			}

			if(has("bug-for-in-skips-shadowed")){
				if(source){
					for(i = 0; i < _extraLen; ++i){
						name = _extraNames[i];
						s = source[name];
						if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
							dest[name] = copyFunc ? copyFunc(s) : s;
						}
					}
				}
			}

			return dest; // Object
		},

		mixin: function(dest, sources){
			// summary:
			//		Copies/adds all properties of one or more sources to dest; returns dest.
			// dest: Object
			//		The object to which to copy/add all properties contained in source. If dest is falsy, then
			//		a new object is manufactured before copying/adding properties begins.
			// sources: Object...
			//		One of more objects from which to draw all properties to copy into dest. sources are processed
			//		left-to-right and if more than one of these objects contain the same property name, the right-most
			//		value "wins".
			// returns: Object
			//		dest, as modified
			// description:
			//		All properties, including functions (sometimes termed "methods"), excluding any non-standard extensions
			//		found in Object.prototype, are copied/added from sources to dest. sources are processed left to right.
			//		The Javascript assignment operator is used to copy/add each property; therefore, by default, mixin
			//		executes a so-called "shallow copy" and aggregate types are copied/added by reference.
			// example:
			//		make a shallow copy of an object
			//	|	var copy = lang.mixin({}, source);
			// example:
			//		many class constructors often take an object which specifies
			//		values to be configured on the object. In this case, it is
			//		often simplest to call `lang.mixin` on the `this` object:
			//	|	declare("acme.Base", null, {
			//	|		constructor: function(properties){
			//	|			// property configuration:
			//	|			lang.mixin(this, properties);
			//	|
			//	|			 0 && console.log(this.quip);
			//	|			//	...
			//	|		},
			//	|		quip: "I wasn't born yesterday, you know - I've seen movies.",
			//	|		// ...
			//	|	});
			//	|
			//	|	// create an instance of the class and configure it
			//	|	var b = new acme.Base({quip: "That's what it does!" });
			// example:
			//		copy in properties from multiple objects
			//	|	var flattened = lang.mixin(
			//	|		{
			//	|			name: "Frylock",
			//	|			braces: true
			//	|		},
			//	|		{
			//	|			name: "Carl Brutanananadilewski"
			//	|		}
			//	|	);
			//	|
			//	|	// will print "Carl Brutanananadilewski"
			//	|	 0 && console.log(flattened.name);
			//	|	// will print "true"
			//	|	 0 && console.log(flattened.braces);

			if(!dest){ dest = {}; }
			for(var i = 1, l = arguments.length; i < l; i++){
				lang._mixin(dest, arguments[i]);
			}
			return dest; // Object
		},

		setObject: function(name, value, context){
			// summary:
			//		Set a property from a dot-separated string, such as "A.B.C"
			// description:
			//		Useful for longer api chains where you have to test each object in
			//		the chain, or when you have an object reference in string format.
			//		Objects are created as needed along `path`. Returns the passed
			//		value if setting is successful or `undefined` if not.
			// name: String
			//		Path to a property, in the form "A.B.C".
			// value: anything
			//		value or object to place at location given by name
			// context: Object?
			//		Optional. Object to use as root of path. Defaults to
			//		`dojo.global`.
			// example:
			//		set the value of `foo.bar.baz`, regardless of whether
			//		intermediate objects already exist:
			//	| lang.setObject("foo.bar.baz", value);
			// example:
			//		without `lang.setObject`, we often see code like this:
			//	| // ensure that intermediate objects are available
			//	| if(!obj["parent"]){ obj.parent = {}; }
			//	| if(!obj.parent["child"]){ obj.parent.child = {}; }
			//	| // now we can safely set the property
			//	| obj.parent.child.prop = "some value";
			//		whereas with `lang.setObject`, we can shorten that to:
			//	| lang.setObject("parent.child.prop", "some value", obj);

			var parts = name.split("."), p = parts.pop(), obj = getProp(parts, true, context);
			return obj && p ? (obj[p] = value) : undefined; // Object
		},

		getObject: function(name, create, context){
			// summary:
			//		Get a property from a dot-separated string, such as "A.B.C"
			// description:
			//		Useful for longer api chains where you have to test each object in
			//		the chain, or when you have an object reference in string format.
			// name: String
			//		Path to an property, in the form "A.B.C".
			// create: Boolean?
			//		Optional. Defaults to `false`. If `true`, Objects will be
			//		created at any point along the 'path' that is undefined.
			// context: Object?
			//		Optional. Object to use as root of path. Defaults to
			//		'dojo.global'. Null may be passed.
			return getProp(name ? name.split(".") : [], create, context); // Object
		},

		exists: function(name, obj){
			// summary:
			//		determine if an object supports a given method
			// description:
			//		useful for longer api chains where you have to test each object in
			//		the chain. Useful for object and method detection.
			// name: String
			//		Path to an object, in the form "A.B.C".
			// obj: Object?
			//		Object to use as root of path. Defaults to
			//		'dojo.global'. Null may be passed.
			// example:
			//	| // define an object
			//	| var foo = {
			//	|		bar: { }
			//	| };
			//	|
			//	| // search the global scope
			//	| lang.exists("foo.bar"); // true
			//	| lang.exists("foo.bar.baz"); // false
			//	|
			//	| // search from a particular scope
			//	| lang.exists("bar", foo); // true
			//	| lang.exists("bar.baz", foo); // false
			return lang.getObject(name, false, obj) !== undefined; // Boolean
		},

		// Crockford (ish) functions

		isString: function(it){
			// summary:
			//		Return true if it is a String
			// it: anything
			//		Item to test.
			return (typeof it == "string" || it instanceof String); // Boolean
		},

		isArray: Array.isArray || function(it){
			// summary:
			//		Return true if it is an Array.
			// it: anything
			//		Item to test.
			return opts.call(it) == "[object Array]"; // Boolean
		},

		isFunction: function(it){
			// summary:
			//		Return true if it is a Function
			// it: anything
			//		Item to test.
			return opts.call(it) === "[object Function]";
		},

		isObject: function(it){
			// summary:
			//		Returns true if it is a JavaScript object (or an Array, a Function
			//		or null)
			// it: anything
			//		Item to test.
			return it !== undefined &&
				(it === null || typeof it == "object" || lang.isArray(it) || lang.isFunction(it)); // Boolean
		},

		isArrayLike: function(it){
			// summary:
			//		similar to isArray() but more permissive
			// it: anything
			//		Item to test.
			// returns:
			//		If it walks like a duck and quacks like a duck, return `true`
			// description:
			//		Doesn't strongly test for "arrayness".  Instead, settles for "isn't
			//		a string or number and has a length property". Arguments objects
			//		and DOM collections will return true when passed to
			//		isArrayLike(), but will return false when passed to
			//		isArray().
			return !!it && // Boolean
				// keep out built-in constructors (Number, String, ...) which have length
				// properties
				!lang.isString(it) && !lang.isFunction(it) &&
				!(it.tagName && it.tagName.toLowerCase() == 'form') &&
				(lang.isArray(it) || isFinite(it.length));
		},

		isAlien: function(it){
			// summary:
			//		Returns true if it is a built-in function or some other kind of
			//		oddball that *should* report as a function but doesn't
			return it && !lang.isFunction(it) && /\{\s*\[native code\]\s*\}/.test(String(it)); // Boolean
		},

		extend: function(ctor, props){
			// summary:
			//		Adds all properties and methods of props to constructor's
			//		prototype, making them available to all instances created with
			//		constructor.
			// ctor: Object
			//		Target constructor to extend.
			// props: Object
			//		One or more objects to mix into ctor.prototype
			for(var i=1, l=arguments.length; i<l; i++){
				lang._mixin(ctor.prototype, arguments[i]);
			}
			return ctor; // Object
		},

		_hitchArgs: function(scope, method){
			var pre = lang._toArray(arguments, 2);
			var named = lang.isString(method);
			return function(){
				// arrayify arguments
				var args = lang._toArray(arguments);
				// locate our method
				var f = named ? (scope||dojo.global)[method] : method;
				// invoke with collected args
				return f && f.apply(scope || this, pre.concat(args)); // mixed
			}; // Function
		},

		hitch: function(scope, method){
			// summary:
			//		Returns a function that will only ever execute in the given scope.
			//		This allows for easy use of object member functions
			//		in callbacks and other places in which the "this" keyword may
			//		otherwise not reference the expected scope.
			//		Any number of default positional arguments may be passed as parameters
			//		beyond "method".
			//		Each of these values will be used to "placehold" (similar to curry)
			//		for the hitched function.
			// scope: Object
			//		The scope to use when method executes. If method is a string,
			//		scope is also the object containing method.
			// method: Function|String...
			//		A function to be hitched to scope, or the name of the method in
			//		scope to be hitched.
			// example:
			//	|	lang.hitch(foo, "bar")();
			//		runs foo.bar() in the scope of foo
			// example:
			//	|	lang.hitch(foo, myFunction);
			//		returns a function that runs myFunction in the scope of foo
			// example:
			//		Expansion on the default positional arguments passed along from
			//		hitch. Passed args are mixed first, additional args after.
			//	|	var foo = { bar: function(a, b, c){  0 && console.log(a, b, c); } };
			//	|	var fn = lang.hitch(foo, "bar", 1, 2);
			//	|	fn(3); // logs "1, 2, 3"
			// example:
			//	|	var foo = { bar: 2 };
			//	|	lang.hitch(foo, function(){ this.bar = 10; })();
			//		execute an anonymous function in scope of foo
			if(arguments.length > 2){
				return lang._hitchArgs.apply(dojo, arguments); // Function
			}
			if(!method){
				method = scope;
				scope = null;
			}
			if(lang.isString(method)){
				scope = scope || dojo.global;
				if(!scope[method]){ throw(['lang.hitch: scope["', method, '"] is null (scope="', scope, '")'].join('')); }
				return function(){ return scope[method].apply(scope, arguments || []); }; // Function
			}
			return !scope ? method : function(){ return method.apply(scope, arguments || []); }; // Function
		},

		delegate: (function(){
			// boodman/crockford delegation w/ cornford optimization
			function TMP(){}
			return function(obj, props){
				TMP.prototype = obj;
				var tmp = new TMP();
				TMP.prototype = null;
				if(props){
					lang._mixin(tmp, props);
				}
				return tmp; // Object
			};
		})(),
		/*=====
		delegate: function(obj, props){
			// summary:
			//		Returns a new object which "looks" to obj for properties which it
			//		does not have a value for. Optionally takes a bag of properties to
			//		seed the returned object with initially.
			// description:
			//		This is a small implementation of the Boodman/Crockford delegation
			//		pattern in JavaScript. An intermediate object constructor mediates
			//		the prototype chain for the returned object, using it to delegate
			//		down to obj for property lookup when object-local lookup fails.
			//		This can be thought of similarly to ES4's "wrap", save that it does
			//		not act on types but rather on pure objects.
			// obj: Object
			//		The object to delegate to for properties not found directly on the
			//		return object or in props.
			// props: Object...
			//		an object containing properties to assign to the returned object
			// returns:
			//		an Object of anonymous type
			// example:
			//	|	var foo = { bar: "baz" };
			//	|	var thinger = lang.delegate(foo, { thud: "xyzzy"});
			//	|	thinger.bar == "baz"; // delegated to foo
			//	|	foo.thud == undefined; // by definition
			//	|	thinger.thud == "xyzzy"; // mixed in from props
			//	|	foo.bar = "thonk";
			//	|	thinger.bar == "thonk"; // still delegated to foo's bar
		},
		=====*/

		_toArray: has("ie") ?
			(function(){
				function slow(obj, offset, startWith){
					var arr = startWith||[];
					for(var x = offset || 0; x < obj.length; x++){
						arr.push(obj[x]);
					}
					return arr;
				}
				return function(obj){
					return ((obj.item) ? slow : efficient).apply(this, arguments);
				};
			})() : efficient,
		/*=====
		 _toArray: function(obj, offset, startWith){
			 // summary:
			 //		Converts an array-like object (i.e. arguments, DOMCollection) to an
			 //		array. Returns a new Array with the elements of obj.
			 // obj: Object
			 //		the object to "arrayify". We expect the object to have, at a
			 //		minimum, a length property which corresponds to integer-indexed
			 //		properties.
			 // offset: Number?
			 //		the location in obj to start iterating from. Defaults to 0.
			 //		Optional.
			 // startWith: Array?
			 //		An array to pack with the properties of obj. If provided,
			 //		properties in obj are appended at the end of startWith and
			 //		startWith is the returned array.
		 },
		 =====*/

		partial: function(/*Function|String*/ method /*, ...*/){
			// summary:
			//		similar to hitch() except that the scope object is left to be
			//		whatever the execution context eventually becomes.
			// description:
			//		Calling lang.partial is the functional equivalent of calling:
			//		|	lang.hitch(null, funcName, ...);
			// method:
			//		The function to "wrap"
			var arr = [ null ];
			return lang.hitch.apply(dojo, arr.concat(lang._toArray(arguments))); // Function
		},

		clone: function(/*anything*/ src){
			// summary:
			//		Clones objects (including DOM nodes) and all children.
			//		Warning: do not clone cyclic structures.
			// src:
			//		The object to clone
			if(!src || typeof src != "object" || lang.isFunction(src)){
				// null, undefined, any non-object, or function
				return src;	// anything
			}
			if(src.nodeType && "cloneNode" in src){
				// DOM Node
				return src.cloneNode(true); // Node
			}
			if(src instanceof Date){
				// Date
				return new Date(src.getTime());	// Date
			}
			if(src instanceof RegExp){
				// RegExp
				return new RegExp(src);   // RegExp
			}
			var r, i, l;
			if(lang.isArray(src)){
				// array
				r = [];
				for(i = 0, l = src.length; i < l; ++i){
					if(i in src){
						r.push(lang.clone(src[i]));
					}
				}
				// we don't clone functions for performance reasons
				//		}else if(d.isFunction(src)){
				//			// function
				//			r = function(){ return src.apply(this, arguments); };
			}else{
				// generic objects
				r = src.constructor ? new src.constructor() : {};
			}
			return lang._mixin(r, src, lang.clone);
		},


		trim: String.prototype.trim ?
			function(str){ return str.trim(); } :
			function(str){ return str.replace(/^\s\s*/, '').replace(/\s\s*$/, ''); },
		/*=====
		 trim: function(str){
			 // summary:
			 //		Trims whitespace from both sides of the string
			 // str: String
			 //		String to be trimmed
			 // returns: String
			 //		Returns the trimmed string
			 // description:
			 //		This version of trim() was selected for inclusion into the base due
			 //		to its compact size and relatively good performance
			 //		(see [Steven Levithan's blog](http://blog.stevenlevithan.com/archives/faster-trim-javascript)
			 //		Uses String.prototype.trim instead, if available.
			 //		The fastest but longest version of this function is located at
			 //		lang.string.trim()
		 },
		 =====*/

		replace: function(tmpl, map, pattern){
			// summary:
			//		Performs parameterized substitutions on a string. Throws an
			//		exception if any parameter is unmatched.
			// tmpl: String
			//		String to be used as a template.
			// map: Object|Function
			//		If an object, it is used as a dictionary to look up substitutions.
			//		If a function, it is called for every substitution with following parameters:
			//		a whole match, a name, an offset, and the whole template
			//		string (see https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/String/replace
			//		for more details).
			// pattern: RegEx?
			//		Optional regular expression objects that overrides the default pattern.
			//		Must be global and match one item. The default is: /\{([^\}]+)\}/g,
			//		which matches patterns like that: "{xxx}", where "xxx" is any sequence
			//		of characters, which doesn't include "}".
			// returns: String
			//		Returns the substituted string.
			// example:
			//	|	// uses a dictionary for substitutions:
			//	|	lang.replace("Hello, {name.first} {name.last} AKA {nick}!",
			//	|		{
			//	|			nick: "Bob",
			//	|			name: {
			//	|				first:	"Robert",
			//	|				middle: "X",
			//	|				last:		"Cringely"
			//	|			}
			//	|		});
			//	|	// returns: Hello, Robert Cringely AKA Bob!
			// example:
			//	|	// uses an array for substitutions:
			//	|	lang.replace("Hello, {0} {2}!",
			//	|		["Robert", "X", "Cringely"]);
			//	|	// returns: Hello, Robert Cringely!
			// example:
			//	|	// uses a function for substitutions:
			//	|	function sum(a){
			//	|		var t = 0;
			//	|		arrayforEach(a, function(x){ t += x; });
			//	|		return t;
			//	|	}
			//	|	lang.replace(
			//	|		"{count} payments averaging {avg} USD per payment.",
			//	|		lang.hitch(
			//	|			{ payments: [11, 16, 12] },
			//	|			function(_, key){
			//	|				switch(key){
			//	|					case "count": return this.payments.length;
			//	|					case "min":		return Math.min.apply(Math, this.payments);
			//	|					case "max":		return Math.max.apply(Math, this.payments);
			//	|					case "sum":		return sum(this.payments);
			//	|					case "avg":		return sum(this.payments) / this.payments.length;
			//	|				}
			//	|			}
			//	|		)
			//	|	);
			//	|	// prints: 3 payments averaging 13 USD per payment.
			// example:
			//	|	// uses an alternative PHP-like pattern for substitutions:
			//	|	lang.replace("Hello, ${0} ${2}!",
			//	|		["Robert", "X", "Cringely"], /\$\{([^\}]+)\}/g);
			//	|	// returns: Hello, Robert Cringely!

			return tmpl.replace(pattern || _pattern, lang.isFunction(map) ?
				map : function(_, k){ return lang.getObject(k, false, map); });
		}
	};

	 1  && lang.mixin(dojo, lang);

	return lang;
});

},
'dojo/_base/array':function(){
define(["./kernel", "../has", "./lang"], function(dojo, has, lang){
	// module:
	//		dojo/_base/array

	// our old simple function builder stuff
	var cache = {}, u;

	function buildFn(fn){
		return cache[fn] = new Function("item", "index", "array", fn); // Function
	}
	// magic snippet: if(typeof fn == "string") fn = cache[fn] || buildFn(fn);

	// every & some

	function everyOrSome(some){
		var every = !some;
		return function(a, fn, o){
			var i = 0, l = a && a.length || 0, result;
			if(l && typeof a == "string") a = a.split("");
			if(typeof fn == "string") fn = cache[fn] || buildFn(fn);
			if(o){
				for(; i < l; ++i){
					result = !fn.call(o, a[i], i, a);
					if(some ^ result){
						return !result;
					}
				}
			}else{
				for(; i < l; ++i){
					result = !fn(a[i], i, a);
					if(some ^ result){
						return !result;
					}
				}
			}
			return every; // Boolean
		};
	}

	// indexOf, lastIndexOf

	function index(up){
		var delta = 1, lOver = 0, uOver = 0;
		if(!up){
			delta = lOver = uOver = -1;
		}
		return function(a, x, from, last){
			if(last && delta > 0){
				// TODO: why do we use a non-standard signature? why do we need "last"?
				return array.lastIndexOf(a, x, from);
			}
			var l = a && a.length || 0, end = up ? l + uOver : lOver, i;
			if(from === u){
				i = up ? lOver : l + uOver;
			}else{
				if(from < 0){
					i = l + from;
					if(i < 0){
						i = lOver;
					}
				}else{
					i = from >= l ? l + uOver : from;
				}
			}
			if(l && typeof a == "string") a = a.split("");
			for(; i != end; i += delta){
				if(a[i] == x){
					return i; // Number
				}
			}
			return -1; // Number
		};
	}

	var array = {
		// summary:
		//		The Javascript v1.6 array extensions.

		every: everyOrSome(false),
		/*=====
		 every: function(arr, callback, thisObject){
			 // summary:
			 //		Determines whether or not every item in arr satisfies the
			 //		condition implemented by callback.
			 // arr: Array|String
			 //		the array to iterate on. If a string, operates on individual characters.
			 // callback: Function|String
			 //		a function is invoked with three arguments: item, index,
			 //		and array and returns true if the condition is met.
			 // thisObject: Object?
			 //		may be used to scope the call to callback
			 // returns: Boolean
			 // description:
			 //		This function corresponds to the JavaScript 1.6 Array.every() method, with one difference: when
			 //		run over sparse arrays, this implementation passes the "holes" in the sparse array to
			 //		the callback function with a value of undefined. JavaScript 1.6's every skips the holes in the sparse array.
			 //		For more details, see:
			 //		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/every
			 // example:
			 //	|	// returns false
			 //	|	array.every([1, 2, 3, 4], function(item){ return item>1; });
			 // example:
			 //	|	// returns true
			 //	|	array.every([1, 2, 3, 4], function(item){ return item>0; });
		 },
		 =====*/

		some: everyOrSome(true),
		/*=====
		some: function(arr, callback, thisObject){
			// summary:
			//		Determines whether or not any item in arr satisfies the
			//		condition implemented by callback.
			// arr: Array|String
			//		the array to iterate over. If a string, operates on individual characters.
			// callback: Function|String
			//		a function is invoked with three arguments: item, index,
			//		and array and returns true if the condition is met.
			// thisObject: Object?
			//		may be used to scope the call to callback
			// returns: Boolean
			// description:
			//		This function corresponds to the JavaScript 1.6 Array.some() method, with one difference: when
			//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
			//		the callback function with a value of undefined. JavaScript 1.6's some skips the holes in the sparse array.
			//		For more details, see:
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/some
			// example:
			//	| // is true
			//	| array.some([1, 2, 3, 4], function(item){ return item>1; });
			// example:
			//	| // is false
			//	| array.some([1, 2, 3, 4], function(item){ return item<1; });
		},
		=====*/

		indexOf: index(true),
		/*=====
		indexOf: function(arr, value, fromIndex, findLast){
			// summary:
			//		locates the first index of the provided value in the
			//		passed array. If the value is not found, -1 is returned.
			// description:
			//		This method corresponds to the JavaScript 1.6 Array.indexOf method, with two differences:
			//
			//		1. when run over sparse arrays, the Dojo function invokes the callback for every index
			//		   whereas JavaScript 1.6's indexOf skips the holes in the sparse array.
			//		2. uses equality (==) rather than strict equality (===)
			//
			//		For details on this method, see:
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/indexOf
			// arr: Array
			// value: Object
			// fromIndex: Integer?
			// findLast: Boolean?
			//		Makes indexOf() work like lastIndexOf().  Used internally; not meant for external usage.
			// returns: Number
		},
		=====*/

		lastIndexOf: index(false),
		/*=====
		lastIndexOf: function(arr, value, fromIndex){
			// summary:
			//		locates the last index of the provided value in the passed
			//		array. If the value is not found, -1 is returned.
			// description:
		 	//		This method corresponds to the JavaScript 1.6 Array.lastIndexOf method, with two differences:
		 	//
		 	//		1. when run over sparse arrays, the Dojo function invokes the callback for every index
		 	//		   whereas JavaScript 1.6's lasIndexOf skips the holes in the sparse array.
		 	//		2. uses equality (==) rather than strict equality (===)
		 	//
		 	//		For details on this method, see:
		 	//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/lastIndexOf
			// arr: Array,
			// value: Object,
			// fromIndex: Integer?
			// returns: Number
		},
		=====*/

		forEach: function(arr, callback, thisObject){
			// summary:
			//		for every item in arr, callback is invoked. Return values are ignored.
			//		If you want to break out of the loop, consider using array.every() or array.some().
			//		forEach does not allow breaking out of the loop over the items in arr.
			// arr:
			//		the array to iterate over. If a string, operates on individual characters.
			// callback:
			//		a function is invoked with three arguments: item, index, and array
			// thisObject:
			//		may be used to scope the call to callback
			// description:
			//		This function corresponds to the JavaScript 1.6 Array.forEach() method, with one difference: when
			//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
			//		the callback function with a value of undefined. JavaScript 1.6's forEach skips the holes in the sparse array.
			//		For more details, see:
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/forEach
			// example:
			//	| // log out all members of the array:
			//	| array.forEach(
			//	|		[ "thinger", "blah", "howdy", 10 ],
			//	|		function(item){
			//	|			 0 && console.log(item);
			//	|		}
			//	| );
			// example:
			//	| // log out the members and their indexes
			//	| array.forEach(
			//	|		[ "thinger", "blah", "howdy", 10 ],
			//	|		function(item, idx, arr){
			//	|			 0 && console.log(item, "at index:", idx);
			//	|		}
			//	| );
			// example:
			//	| // use a scoped object member as the callback
			//	|
			//	| var obj = {
			//	|		prefix: "logged via obj.callback:",
			//	|		callback: function(item){
			//	|			 0 && console.log(this.prefix, item);
			//	|		}
			//	| };
			//	|
			//	| // specifying the scope function executes the callback in that scope
			//	| array.forEach(
			//	|		[ "thinger", "blah", "howdy", 10 ],
			//	|		obj.callback,
			//	|		obj
			//	| );
			//	|
			//	| // alternately, we can accomplish the same thing with lang.hitch()
			//	| array.forEach(
			//	|		[ "thinger", "blah", "howdy", 10 ],
			//	|		lang.hitch(obj, "callback")
			//	| );
			// arr: Array|String
			// callback: Function|String
			// thisObject: Object?

			var i = 0, l = arr && arr.length || 0;
			if(l && typeof arr == "string") arr = arr.split("");
			if(typeof callback == "string") callback = cache[callback] || buildFn(callback);
			if(thisObject){
				for(; i < l; ++i){
					callback.call(thisObject, arr[i], i, arr);
				}
			}else{
				for(; i < l; ++i){
					callback(arr[i], i, arr);
				}
			}
		},

		map: function(arr, callback, thisObject, Ctr){
			// summary:
			//		applies callback to each element of arr and returns
			//		an Array with the results
			// arr: Array|String
			//		the array to iterate on. If a string, operates on
			//		individual characters.
			// callback: Function|String
			//		a function is invoked with three arguments, (item, index,
			//		array),	 and returns a value
			// thisObject: Object?
			//		may be used to scope the call to callback
			// returns: Array
			// description:
			//		This function corresponds to the JavaScript 1.6 Array.map() method, with one difference: when
			//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
			//		the callback function with a value of undefined. JavaScript 1.6's map skips the holes in the sparse array.
			//		For more details, see:
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map
			// example:
			//	| // returns [2, 3, 4, 5]
			//	| array.map([1, 2, 3, 4], function(item){ return item+1 });

			// TODO: why do we have a non-standard signature here? do we need "Ctr"?
			var i = 0, l = arr && arr.length || 0, out = new (Ctr || Array)(l);
			if(l && typeof arr == "string") arr = arr.split("");
			if(typeof callback == "string") callback = cache[callback] || buildFn(callback);
			if(thisObject){
				for(; i < l; ++i){
					out[i] = callback.call(thisObject, arr[i], i, arr);
				}
			}else{
				for(; i < l; ++i){
					out[i] = callback(arr[i], i, arr);
				}
			}
			return out; // Array
		},

		filter: function(arr, callback, thisObject){
			// summary:
			//		Returns a new Array with those items from arr that match the
			//		condition implemented by callback.
			// arr: Array
			//		the array to iterate over.
			// callback: Function|String
			//		a function that is invoked with three arguments (item,
			//		index, array). The return of this function is expected to
			//		be a boolean which determines whether the passed-in item
			//		will be included in the returned array.
			// thisObject: Object?
			//		may be used to scope the call to callback
			// returns: Array
			// description:
			//		This function corresponds to the JavaScript 1.6 Array.filter() method, with one difference: when
			//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
			//		the callback function with a value of undefined. JavaScript 1.6's filter skips the holes in the sparse array.
			//		For more details, see:
			//		https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
			// example:
			//	| // returns [2, 3, 4]
			//	| array.filter([1, 2, 3, 4], function(item){ return item>1; });

			// TODO: do we need "Ctr" here like in map()?
			var i = 0, l = arr && arr.length || 0, out = [], value;
			if(l && typeof arr == "string") arr = arr.split("");
			if(typeof callback == "string") callback = cache[callback] || buildFn(callback);
			if(thisObject){
				for(; i < l; ++i){
					value = arr[i];
					if(callback.call(thisObject, value, i, arr)){
						out.push(value);
					}
				}
			}else{
				for(; i < l; ++i){
					value = arr[i];
					if(callback(value, i, arr)){
						out.push(value);
					}
				}
			}
			return out; // Array
		},

		clearCache: function(){
			cache = {};
		}
	};


	 1  && lang.mixin(dojo, array);

	return array;
});

},
'dojo/ready':function(){
define(["./_base/kernel", "./has", "require", "./domReady", "./_base/lang"], function(dojo, has, require, domReady, lang){
	// module:
	//		dojo/ready
	// note:
	//		This module should be unnecessary in dojo 2.0

	var
		// truthy if DOMContentLoaded or better (e.g., window.onload fired) has been achieved
		isDomReady = 0,

		// The queue of functions waiting to execute as soon as dojo.ready conditions satisfied
		loadQ = [],

		// prevent recursion in onLoad
		onLoadRecursiveGuard = 0,

		handleDomReady = function(){
			isDomReady = 1;
			dojo._postLoad = dojo.config.afterOnLoad = true;
			onEvent();
		},

		onEvent = function(){
			// Called when some state changes:
			//		- dom ready
			//		- dojo/domReady has finished processing everything in its queue
			//		- task added to loadQ
			//		- require() has finished loading all currently requested modules
			//
			// Run the functions queued with dojo.ready if appropriate.


			//guard against recursions into this function
			if(onLoadRecursiveGuard){
				return;
			}
			onLoadRecursiveGuard = 1;

			// Run tasks in queue if require() is finished loading modules, the dom is ready, and there are no
			// pending tasks registered via domReady().
			// The last step is necessary so that a user defined dojo.ready() callback is delayed until after the
			// domReady() calls inside of dojo.	  Failure can be seen on dijit/tests/robot/Dialog_ally.html on IE8
			// because the dijit/focus.js domReady() callback doesn't execute until after the test starts running.
			while(isDomReady && (!domReady || domReady._Q.length == 0) && (require.idle ? require.idle() : true) && loadQ.length){
				var f = loadQ.shift();
				try{
					f();
				}catch(e){
					// force the dojo.js on("error") handler do display the message
					e.info = e.message;
					if(require.signal){
						require.signal("error", e);
					}else{
						throw e;
					}
				}
			}

			onLoadRecursiveGuard = 0;
		};

	// Check if we should run the next queue operation whenever require() finishes loading modules or domReady
	// finishes processing it's queue.
	require.on && require.on("idle", onEvent);
	if(domReady){
		domReady._onQEmpty = onEvent;
	}

	var ready = dojo.ready = dojo.addOnLoad = function(priority, context, callback){
		// summary:
		//		Add a function to execute on DOM content loaded and all requested modules have arrived and been evaluated.
		//		In most cases, the `domReady` plug-in should suffice and this method should not be needed.
		//
		//		When called in a non-browser environment, just checks that all requested modules have arrived and been
		//		evaluated.
		// priority: Integer?
		//		The order in which to exec this callback relative to other callbacks, defaults to 1000
		// context: Object?|Function
		//		The context in which to run execute callback, or a callback if not using context
		// callback: Function?
		//		The function to execute.
		//
		// example:
		//	Simple DOM and Modules ready syntax
		//	|	require(["dojo/ready"], function(ready){
		//	|		ready(function(){ alert("Dom ready!"); });
		//	|	});
		//
		// example:
		//	Using a priority
		//	|	require(["dojo/ready"], function(ready){
		//	|		ready(2, function(){ alert("low priority ready!"); })
		//	|	});
		//
		// example:
		//	Using context
		//	|	require(["dojo/ready"], function(ready){
		//	|		ready(foo, function(){
		//	|			// in here, this == foo
		//	|		});
		//	|	});
		//
		// example:
		//	Using dojo/hitch style args:
		//	|	require(["dojo/ready"], function(ready){
		//	|		var foo = { dojoReady: function(){  0 && console.warn(this, "dojo dom and modules ready."); } };
		//	|		ready(foo, "dojoReady");
		//	|	});

		var hitchArgs = lang._toArray(arguments);
		if(typeof priority != "number"){
			callback = context;
			context = priority;
			priority = 1000;
		}else{
			hitchArgs.shift();
		}
		callback = callback ?
			lang.hitch.apply(dojo, hitchArgs) :
			function(){
				context();
			};
		callback.priority = priority;
		for(var i = 0; i < loadQ.length && priority >= loadQ[i].priority; i++){}
		loadQ.splice(i, 0, callback);
		onEvent();
	};

	 1 || has.add("dojo-config-addOnLoad", 1);
	if( 1 ){
		var dca = dojo.config.addOnLoad;
		if(dca){
			ready[(lang.isArray(dca) ? "apply" : "call")](dojo, dca);
		}
	}

	if( 1  && dojo.config.parseOnLoad && !dojo.isAsync){
		ready(99, function(){
			if(!dojo.parser){
				dojo.deprecated("Add explicit require(['dojo/parser']);", "", "2.0");
				require(["dojo/parser"]);
			}
		});
	}

	if(domReady){
		domReady(handleDomReady);
	}else{
		handleDomReady();
	}

	return ready;
});

},
'dojo/domReady':function(){
define(['./has'], function(has){
	var global = (function () { return this; })(),
		doc = document,
		readyStates = { 'loaded': 1, 'complete': 1 },
		fixReadyState = typeof doc.readyState != "string",
		ready = !!readyStates[doc.readyState],
		readyQ = [],
		recursiveGuard;

	function domReady(callback){
		// summary:
		//		Plugin to delay require()/define() callback from firing until the DOM has finished loading.
		readyQ.push(callback);
		if(ready){ processQ(); }
	}
	domReady.load = function(id, req, load){
		domReady(load);
	};

	// Export queue so that ready() can check if it's empty or not.
	domReady._Q = readyQ;
	domReady._onQEmpty = function(){
		// summary:
		//		Private method overridden by dojo/ready, to notify when everything in the
		//		domReady queue has been processed.  Do not use directly.
		//		Will be removed in 2.0, along with domReady._Q.
	};

	// For FF <= 3.5
	if(fixReadyState){ doc.readyState = "loading"; }

	function processQ(){
		// Calls all functions in the queue in order, unless processQ() is already running, in which case just return

		if(recursiveGuard){ return; }
		recursiveGuard = true;

		while(readyQ.length){
			try{
				(readyQ.shift())(doc);
			}catch(err){
				 0 && console.error(err, "in domReady callback", err.stack);
			}
		}

		recursiveGuard = false;

		// Notification for dojo/ready.  Remove for 2.0.
		// Note that this could add more tasks to the ready queue.
		domReady._onQEmpty();
	}

	if(!ready){
		var tests = [],
			detectReady = function(evt){
				evt = evt || global.event;
				if(ready || (evt.type == "readystatechange" && !readyStates[doc.readyState])){ return; }

				// For FF <= 3.5
				if(fixReadyState){ doc.readyState = "complete"; }

				ready = 1;
				processQ();
			},
			on = function(node, event){
				node.addEventListener(event, detectReady, false);
				readyQ.push(function(){ node.removeEventListener(event, detectReady, false); });
			};

		if(!has("dom-addeventlistener")){
			on = function(node, event){
				event = "on" + event;
				node.attachEvent(event, detectReady);
				readyQ.push(function(){ node.detachEvent(event, detectReady); });
			};

			var div = doc.createElement("div");
			try{
				if(div.doScroll && global.frameElement === null){
					// the doScroll test is only useful if we're in the top-most frame
					tests.push(function(){
						// Derived with permission from Diego Perini's IEContentLoaded
						// http://javascript.nwbox.com/IEContentLoaded/
						try{
							div.doScroll("left");
							return 1;
						}catch(e){}
					});
				}
			}catch(e){}
		}

		on(doc, "DOMContentLoaded");
		on(global, "load");

		if("onreadystatechange" in doc){
			on(doc, "readystatechange");
		}else if(!fixReadyState){
			// if the ready state property exists and there's
			// no readystatechange event, poll for the state
			// to change
			tests.push(function(){
				return readyStates[doc.readyState];
			});
		}

		if(tests.length){
			var poller = function(){
				if(ready){ return; }
				var i = tests.length;
				while(i--){
					if(tests[i]()){
						detectReady("poller");
						return;
					}
				}
				setTimeout(poller, 30);
			};
			poller();
		}
	}

	return domReady;
});

},
'dojo/_base/declare':function(){
define(["./kernel", "../has", "./lang"], function(dojo, has, lang){
	// module:
	//		dojo/_base/declare

	var mix = lang.mixin, op = Object.prototype, opts = op.toString,
		xtor = new Function, counter = 0, cname = "constructor";

	function err(msg, cls){ throw new Error("declare" + (cls ? " " + cls : "") + ": " + msg); }

	// C3 Method Resolution Order (see http://www.python.org/download/releases/2.3/mro/)
	function c3mro(bases, className){
		var result = [], roots = [{cls: 0, refs: []}], nameMap = {}, clsCount = 1,
			l = bases.length, i = 0, j, lin, base, top, proto, rec, name, refs;

		// build a list of bases naming them if needed
		for(; i < l; ++i){
			base = bases[i];
			if(!base){
				err("mixin #" + i + " is unknown. Did you use dojo.require to pull it in?", className);
			}else if(opts.call(base) != "[object Function]"){
				err("mixin #" + i + " is not a callable constructor.", className);
			}
			lin = base._meta ? base._meta.bases : [base];
			top = 0;
			// add bases to the name map
			for(j = lin.length - 1; j >= 0; --j){
				proto = lin[j].prototype;
				if(!proto.hasOwnProperty("declaredClass")){
					proto.declaredClass = "uniqName_" + (counter++);
				}
				name = proto.declaredClass;
				if(!nameMap.hasOwnProperty(name)){
					nameMap[name] = {count: 0, refs: [], cls: lin[j]};
					++clsCount;
				}
				rec = nameMap[name];
				if(top && top !== rec){
					rec.refs.push(top);
					++top.count;
				}
				top = rec;
			}
			++top.count;
			roots[0].refs.push(top);
		}

		// remove classes without external references recursively
		while(roots.length){
			top = roots.pop();
			result.push(top.cls);
			--clsCount;
			// optimization: follow a single-linked chain
			while(refs = top.refs, refs.length == 1){
				top = refs[0];
				if(!top || --top.count){
					// branch or end of chain => do not end to roots
					top = 0;
					break;
				}
				result.push(top.cls);
				--clsCount;
			}
			if(top){
				// branch
				for(i = 0, l = refs.length; i < l; ++i){
					top = refs[i];
					if(!--top.count){
						roots.push(top);
					}
				}
			}
		}
		if(clsCount){
			err("can't build consistent linearization", className);
		}

		// calculate the superclass offset
		base = bases[0];
		result[0] = base ?
			base._meta && base === result[result.length - base._meta.bases.length] ?
				base._meta.bases.length : 1 : 0;

		return result;
	}

	function inherited(args, a, f){
		var name, chains, bases, caller, meta, base, proto, opf, pos,
			cache = this._inherited = this._inherited || {};

		// crack arguments
		if(typeof args == "string"){
			name = args;
			args = a;
			a = f;
		}
		f = 0;

		caller = args.callee;
		name = name || caller.nom;
		if(!name){
			err("can't deduce a name to call inherited()", this.declaredClass);
		}

		meta = this.constructor._meta;
		bases = meta.bases;

		pos = cache.p;
		if(name != cname){
			// method
			if(cache.c !== caller){
				// cache bust
				pos = 0;
				base = bases[0];
				meta = base._meta;
				if(meta.hidden[name] !== caller){
					// error detection
					chains = meta.chains;
					if(chains && typeof chains[name] == "string"){
						err("calling chained method with inherited: " + name, this.declaredClass);
					}
					// find caller
					do{
						meta = base._meta;
						proto = base.prototype;
						if(meta && (proto[name] === caller && proto.hasOwnProperty(name) || meta.hidden[name] === caller)){
							break;
						}
					}while(base = bases[++pos]); // intentional assignment
					pos = base ? pos : -1;
				}
			}
			// find next
			base = bases[++pos];
			if(base){
				proto = base.prototype;
				if(base._meta && proto.hasOwnProperty(name)){
					f = proto[name];
				}else{
					opf = op[name];
					do{
						proto = base.prototype;
						f = proto[name];
						if(f && (base._meta ? proto.hasOwnProperty(name) : f !== opf)){
							break;
						}
					}while(base = bases[++pos]); // intentional assignment
				}
			}
			f = base && f || op[name];
		}else{
			// constructor
			if(cache.c !== caller){
				// cache bust
				pos = 0;
				meta = bases[0]._meta;
				if(meta && meta.ctor !== caller){
					// error detection
					chains = meta.chains;
					if(!chains || chains.constructor !== "manual"){
						err("calling chained constructor with inherited", this.declaredClass);
					}
					// find caller
					while(base = bases[++pos]){ // intentional assignment
						meta = base._meta;
						if(meta && meta.ctor === caller){
							break;
						}
					}
					pos = base ? pos : -1;
				}
			}
			// find next
			while(base = bases[++pos]){	// intentional assignment
				meta = base._meta;
				f = meta ? meta.ctor : base;
				if(f){
					break;
				}
			}
			f = base && f;
		}

		// cache the found super method
		cache.c = f;
		cache.p = pos;

		// now we have the result
		if(f){
			return a === true ? f : f.apply(this, a || args);
		}
		// intentionally no return if a super method was not found
	}

	function getInherited(name, args){
		if(typeof name == "string"){
			return this.__inherited(name, args, true);
		}
		return this.__inherited(name, true);
	}

	function inherited__debug(args, a1, a2){
		var f = this.getInherited(args, a1);
		if(f){ return f.apply(this, a2 || a1 || args); }
		// intentionally no return if a super method was not found
	}

	var inheritedImpl = dojo.config.isDebug ? inherited__debug : inherited;

	// emulation of "instanceof"
	function isInstanceOf(cls){
		var bases = this.constructor._meta.bases;
		for(var i = 0, l = bases.length; i < l; ++i){
			if(bases[i] === cls){
				return true;
			}
		}
		return this instanceof cls;
	}

	function mixOwn(target, source){
		// add props adding metadata for incoming functions skipping a constructor
		for(var name in source){
			if(name != cname && source.hasOwnProperty(name)){
				target[name] = source[name];
			}
		}
		if(has("bug-for-in-skips-shadowed")){
			for(var extraNames= lang._extraNames, i= extraNames.length; i;){
				name = extraNames[--i];
				if(name != cname && source.hasOwnProperty(name)){
					  target[name] = source[name];
				}
			}
		}
	}

	// implementation of safe mixin function
	function safeMixin(target, source){
		// summary:
		//		Mix in properties skipping a constructor and decorating functions
		//		like it is done by declare().
		// target: Object
		//		Target object to accept new properties.
		// source: Object
		//		Source object for new properties.
		// description:
		//		This function is used to mix in properties like lang.mixin does,
		//		but it skips a constructor property and decorates functions like
		//		declare() does.
		//
		//		It is meant to be used with classes and objects produced with
		//		declare. Functions mixed in with dojo.safeMixin can use
		//		this.inherited() like normal methods.
		//
		//		This function is used to implement extend() method of a constructor
		//		produced with declare().
		//
		// example:
		//	|	var A = declare(null, {
		//	|		m1: function(){
		//	|			 0 && console.log("A.m1");
		//	|		},
		//	|		m2: function(){
		//	|			 0 && console.log("A.m2");
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		m1: function(){
		//	|			this.inherited(arguments);
		//	|			 0 && console.log("B.m1");
		//	|		}
		//	|	});
		//	|	B.extend({
		//	|		m2: function(){
		//	|			this.inherited(arguments);
		//	|			 0 && console.log("B.m2");
		//	|		}
		//	|	});
		//	|	var x = new B();
		//	|	dojo.safeMixin(x, {
		//	|		m1: function(){
		//	|			this.inherited(arguments);
		//	|			 0 && console.log("X.m1");
		//	|		},
		//	|		m2: function(){
		//	|			this.inherited(arguments);
		//	|			 0 && console.log("X.m2");
		//	|		}
		//	|	});
		//	|	x.m2();
		//	|	// prints:
		//	|	// A.m1
		//	|	// B.m1
		//	|	// X.m1

		var name, t;
		// add props adding metadata for incoming functions skipping a constructor
		for(name in source){
			t = source[name];
			if((t !== op[name] || !(name in op)) && name != cname){
				if(opts.call(t) == "[object Function]"){
					// non-trivial function method => attach its name
					t.nom = name;
				}
				target[name] = t;
			}
		}
		if(has("bug-for-in-skips-shadowed") && source){
			for(var extraNames= lang._extraNames, i= extraNames.length; i;){
				name = extraNames[--i];
				t = source[name];
				if((t !== op[name] || !(name in op)) && name != cname){
					if(opts.call(t) == "[object Function]"){
						// non-trivial function method => attach its name
						  t.nom = name;
					}
					target[name] = t;
				}
			}
		}
		return target;
	}

	function extend(source){
		declare.safeMixin(this.prototype, source);
		return this;
	}

    function createSubclass(mixins, props){
        // crack parameters
        if(!(mixins instanceof Array || typeof mixins == 'function')){
            props = mixins;
            mixins = undefined;
        }

        props = props || {};
        mixins = mixins || [];

        return declare([this].concat(mixins), props);
    }

	// chained constructor compatible with the legacy declare()
	function chainedConstructor(bases, ctorSpecial){
		return function(){
			var a = arguments, args = a, a0 = a[0], f, i, m,
				l = bases.length, preArgs;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) call two types of the preamble
			if(ctorSpecial && (a0 && a0.preamble || this.preamble)){
				// full blown ritual
				preArgs = new Array(bases.length);
				// prepare parameters
				preArgs[0] = a;
				for(i = 0;;){
					// process the preamble of the 1st argument
					a0 = a[0];
					if(a0){
						f = a0.preamble;
						if(f){
							a = f.apply(this, a) || a;
						}
					}
					// process the preamble of this class
					f = bases[i].prototype;
					f = f.hasOwnProperty("preamble") && f.preamble;
					if(f){
						a = f.apply(this, a) || a;
					}
					// one peculiarity of the preamble:
					// it is called if it is not needed,
					// e.g., there is no constructor to call
					// let's watch for the last constructor
					// (see ticket #9795)
					if(++i == l){
						break;
					}
					preArgs[i] = a;
				}
			}
			// 2) call all non-trivial constructors using prepared arguments
			for(i = l - 1; i >= 0; --i){
				f = bases[i];
				m = f._meta;
				f = m ? m.ctor : f;
				if(f){
					f.apply(this, preArgs ? preArgs[i] : a);
				}
			}
			// 3) continue the original ritual: call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, args);
			}
		};
	}


	// chained constructor compatible with the legacy declare()
	function singleConstructor(ctor, ctorSpecial){
		return function(){
			var a = arguments, t = a, a0 = a[0], f;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) call two types of the preamble
			if(ctorSpecial){
				// full blown ritual
				if(a0){
					// process the preamble of the 1st argument
					f = a0.preamble;
					if(f){
						t = f.apply(this, t) || t;
					}
				}
				f = this.preamble;
				if(f){
					// process the preamble of this class
					f.apply(this, t);
					// one peculiarity of the preamble:
					// it is called even if it is not needed,
					// e.g., there is no constructor to call
					// let's watch for the last constructor
					// (see ticket #9795)
				}
			}
			// 2) call a constructor
			if(ctor){
				ctor.apply(this, a);
			}
			// 3) continue the original ritual: call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, a);
			}
		};
	}

	// plain vanilla constructor (can use inherited() to call its base constructor)
	function simpleConstructor(bases){
		return function(){
			var a = arguments, i = 0, f, m;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) do not call the preamble
			// 2) call the top constructor (it can use this.inherited())
			for(; f = bases[i]; ++i){ // intentional assignment
				m = f._meta;
				f = m ? m.ctor : f;
				if(f){
					f.apply(this, a);
					break;
				}
			}
			// 3) call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, a);
			}
		};
	}

	function chain(name, bases, reversed){
		return function(){
			var b, m, f, i = 0, step = 1;
			if(reversed){
				i = bases.length - 1;
				step = -1;
			}
			for(; b = bases[i]; i += step){ // intentional assignment
				m = b._meta;
				f = (m ? m.hidden : b.prototype)[name];
				if(f){
					f.apply(this, arguments);
				}
			}
		};
	}

	// forceNew(ctor)
	// return a new object that inherits from ctor.prototype but
	// without actually running ctor on the object.
	function forceNew(ctor){
		// create object with correct prototype using a do-nothing
		// constructor
		xtor.prototype = ctor.prototype;
		var t = new xtor;
		xtor.prototype = null;	// clean up
		return t;
	}

	// applyNew(args)
	// just like 'new ctor()' except that the constructor and its arguments come
	// from args, which must be an array or an arguments object
	function applyNew(args){
		// create an object with ctor's prototype but without
		// calling ctor on it.
		var ctor = args.callee, t = forceNew(ctor);
		// execute the real constructor on the new object
		ctor.apply(t, args);
		return t;
	}

	function declare(className, superclass, props){
		// summary:
		//		Create a feature-rich constructor from compact notation.
		// className: String?
		//		The optional name of the constructor (loosely, a "class")
		//		stored in the "declaredClass" property in the created prototype.
		//		It will be used as a global name for a created constructor.
		// superclass: Function|Function[]
		//		May be null, a Function, or an Array of Functions. This argument
		//		specifies a list of bases (the left-most one is the most deepest
		//		base).
		// props: Object
		//		An object whose properties are copied to the created prototype.
		//		Add an instance-initialization function by making it a property
		//		named "constructor".
		// returns: dojo/_base/declare.__DeclareCreatedObject
		//		New constructor function.
		// description:
		//		Create a constructor using a compact notation for inheritance and
		//		prototype extension.
		//
		//		Mixin ancestors provide a type of multiple inheritance.
		//		Prototypes of mixin ancestors are copied to the new class:
		//		changes to mixin prototypes will not affect classes to which
		//		they have been mixed in.
		//
		//		Ancestors can be compound classes created by this version of
		//		declare(). In complex cases all base classes are going to be
		//		linearized according to C3 MRO algorithm
		//		(see http://www.python.org/download/releases/2.3/mro/ for more
		//		details).
		//
		//		"className" is cached in "declaredClass" property of the new class,
		//		if it was supplied. The immediate super class will be cached in
		//		"superclass" property of the new class.
		//
		//		Methods in "props" will be copied and modified: "nom" property
		//		(the declared name of the method) will be added to all copied
		//		functions to help identify them for the internal machinery. Be
		//		very careful, while reusing methods: if you use the same
		//		function under different names, it can produce errors in some
		//		cases.
		//
		//		It is possible to use constructors created "manually" (without
		//		declare()) as bases. They will be called as usual during the
		//		creation of an instance, their methods will be chained, and even
		//		called by "this.inherited()".
		//
		//		Special property "-chains-" governs how to chain methods. It is
		//		a dictionary, which uses method names as keys, and hint strings
		//		as values. If a hint string is "after", this method will be
		//		called after methods of its base classes. If a hint string is
		//		"before", this method will be called before methods of its base
		//		classes.
		//
		//		If "constructor" is not mentioned in "-chains-" property, it will
		//		be chained using the legacy mode: using "after" chaining,
		//		calling preamble() method before each constructor, if available,
		//		and calling postscript() after all constructors were executed.
		//		If the hint is "after", it is chained as a regular method, but
		//		postscript() will be called after the chain of constructors.
		//		"constructor" cannot be chained "before", but it allows
		//		a special hint string: "manual", which means that constructors
		//		are not going to be chained in any way, and programmer will call
		//		them manually using this.inherited(). In the latter case
		//		postscript() will be called after the construction.
		//
		//		All chaining hints are "inherited" from base classes and
		//		potentially can be overridden. Be very careful when overriding
		//		hints! Make sure that all chained methods can work in a proposed
		//		manner of chaining.
		//
		//		Once a method was chained, it is impossible to unchain it. The
		//		only exception is "constructor". You don't need to define a
		//		method in order to supply a chaining hint.
		//
		//		If a method is chained, it cannot use this.inherited() because
		//		all other methods in the hierarchy will be called automatically.
		//
		//		Usually constructors and initializers of any kind are chained
		//		using "after" and destructors of any kind are chained as
		//		"before". Note that chaining assumes that chained methods do not
		//		return any value: any returned value will be discarded.
		//
		// example:
		//	|	declare("my.classes.bar", my.classes.foo, {
		//	|		// properties to be added to the class prototype
		//	|		someValue: 2,
		//	|		// initialization function
		//	|		constructor: function(){
		//	|			this.myComplicatedObject = new ReallyComplicatedObject();
		//	|		},
		//	|		// other functions
		//	|		someMethod: function(){
		//	|			doStuff();
		//	|		}
		//	|	});
		//
		// example:
		//	|	var MyBase = declare(null, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyClass1 = declare(MyBase, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyClass2 = declare(MyBase, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyDiamond = declare([MyClass1, MyClass2], {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//
		// example:
		//	|	var F = function(){  0 && console.log("raw constructor"); };
		//	|	F.prototype.method = function(){
		//	|		 0 && console.log("raw method");
		//	|	};
		//	|	var A = declare(F, {
		//	|		constructor: function(){
		//	|			 0 && console.log("A.constructor");
		//	|		},
		//	|		method: function(){
		//	|			 0 && console.log("before calling F.method...");
		//	|			this.inherited(arguments);
		//	|			 0 && console.log("...back in A");
		//	|		}
		//	|	});
		//	|	new A().method();
		//	|	// will print:
		//	|	// raw constructor
		//	|	// A.constructor
		//	|	// before calling F.method...
		//	|	// raw method
		//	|	// ...back in A
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			destroy: "before"
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		constructor: function(){
		//	|			 0 && console.log("B.constructor");
		//	|		},
		//	|		destroy: function(){
		//	|			 0 && console.log("B.destroy");
		//	|		}
		//	|	});
		//	|	var C = declare(B, {
		//	|		constructor: function(){
		//	|			 0 && console.log("C.constructor");
		//	|		},
		//	|		destroy: function(){
		//	|			 0 && console.log("C.destroy");
		//	|		}
		//	|	});
		//	|	new C().destroy();
		//	|	// prints:
		//	|	// B.constructor
		//	|	// C.constructor
		//	|	// C.destroy
		//	|	// B.destroy
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			constructor: "manual"
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		constructor: function(){
		//	|			// ...
		//	|			// call the base constructor with new parameters
		//	|			this.inherited(arguments, [1, 2, 3]);
		//	|			// ...
		//	|		}
		//	|	});
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			m1: "before"
		//	|		},
		//	|		m1: function(){
		//	|			 0 && console.log("A.m1");
		//	|		},
		//	|		m2: function(){
		//	|			 0 && console.log("A.m2");
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		"-chains-": {
		//	|			m2: "after"
		//	|		},
		//	|		m1: function(){
		//	|			 0 && console.log("B.m1");
		//	|		},
		//	|		m2: function(){
		//	|			 0 && console.log("B.m2");
		//	|		}
		//	|	});
		//	|	var x = new B();
		//	|	x.m1();
		//	|	// prints:
		//	|	// B.m1
		//	|	// A.m1
		//	|	x.m2();
		//	|	// prints:
		//	|	// A.m2
		//	|	// B.m2

		// crack parameters
		if(typeof className != "string"){
			props = superclass;
			superclass = className;
			className = "";
		}
		props = props || {};

		var proto, i, t, ctor, name, bases, chains, mixins = 1, parents = superclass;

		// build a prototype
		if(opts.call(superclass) == "[object Array]"){
			// C3 MRO
			bases = c3mro(superclass, className);
			t = bases[0];
			mixins = bases.length - t;
			superclass = bases[mixins];
		}else{
			bases = [0];
			if(superclass){
				if(opts.call(superclass) == "[object Function]"){
					t = superclass._meta;
					bases = bases.concat(t ? t.bases : superclass);
				}else{
					err("base class is not a callable constructor.", className);
				}
			}else if(superclass !== null){
				err("unknown base class. Did you use dojo.require to pull it in?", className);
			}
		}
		if(superclass){
			for(i = mixins - 1;; --i){
				proto = forceNew(superclass);
				if(!i){
					// stop if nothing to add (the last base)
					break;
				}
				// mix in properties
				t = bases[i];
				(t._meta ? mixOwn : mix)(proto, t.prototype);
				// chain in new constructor
				ctor = new Function;
				ctor.superclass = superclass;
				ctor.prototype = proto;
				superclass = proto.constructor = ctor;
			}
		}else{
			proto = {};
		}
		// add all properties
		declare.safeMixin(proto, props);
		// add constructor
		t = props.constructor;
		if(t !== op.constructor){
			t.nom = cname;
			proto.constructor = t;
		}

		// collect chains and flags
		for(i = mixins - 1; i; --i){ // intentional assignment
			t = bases[i]._meta;
			if(t && t.chains){
				chains = mix(chains || {}, t.chains);
			}
		}
		if(proto["-chains-"]){
			chains = mix(chains || {}, proto["-chains-"]);
		}

		// build ctor
		t = !chains || !chains.hasOwnProperty(cname);
		bases[0] = ctor = (chains && chains.constructor === "manual") ? simpleConstructor(bases) :
			(bases.length == 1 ? singleConstructor(props.constructor, t) : chainedConstructor(bases, t));

		// add meta information to the constructor
		ctor._meta  = {bases: bases, hidden: props, chains: chains,
			parents: parents, ctor: props.constructor};
		ctor.superclass = superclass && superclass.prototype;
		ctor.extend = extend;
		ctor.createSubclass = createSubclass;
		ctor.prototype = proto;
		proto.constructor = ctor;

		// add "standard" methods to the prototype
		proto.getInherited = getInherited;
		proto.isInstanceOf = isInstanceOf;
		proto.inherited    = inheritedImpl;
		proto.__inherited  = inherited;

		// add name if specified
		if(className){
			proto.declaredClass = className;
			lang.setObject(className, ctor);
		}

		// build chains and add them to the prototype
		if(chains){
			for(name in chains){
				if(proto[name] && typeof chains[name] == "string" && name != cname){
					t = proto[name] = chain(name, bases, chains[name] === "after");
					t.nom = name;
				}
			}
		}
		// chained methods do not return values
		// no need to chain "invisible" functions

		return ctor;	// Function
	}

	/*=====
	declare.__DeclareCreatedObject = {
		// summary:
		//		dojo/_base/declare() returns a constructor `C`.   `new C()` returns an Object with the following
		//		methods, in addition to the methods and properties specified via the arguments passed to declare().

		inherited: function(name, args, newArgs){
			// summary:
			//		Calls a super method.
			// name: String?
			//		The optional method name. Should be the same as the caller's
			//		name. Usually "name" is specified in complex dynamic cases, when
			//		the calling method was dynamically added, undecorated by
			//		declare(), and it cannot be determined.
			// args: Arguments
			//		The caller supply this argument, which should be the original
			//		"arguments".
			// newArgs: Object?
			//		If "true", the found function will be returned without
			//		executing it.
			//		If Array, it will be used to call a super method. Otherwise
			//		"args" will be used.
			// returns:
			//		Whatever is returned by a super method, or a super method itself,
			//		if "true" was specified as newArgs.
			// description:
			//		This method is used inside method of classes produced with
			//		declare() to call a super method (next in the chain). It is
			//		used for manually controlled chaining. Consider using the regular
			//		chaining, because it is faster. Use "this.inherited()" only in
			//		complex cases.
			//
			//		This method cannot me called from automatically chained
			//		constructors including the case of a special (legacy)
			//		constructor chaining. It cannot be called from chained methods.
			//
			//		If "this.inherited()" cannot find the next-in-chain method, it
			//		does nothing and returns "undefined". The last method in chain
			//		can be a default method implemented in Object, which will be
			//		called last.
			//
			//		If "name" is specified, it is assumed that the method that
			//		received "args" is the parent method for this call. It is looked
			//		up in the chain list and if it is found the next-in-chain method
			//		is called. If it is not found, the first-in-chain method is
			//		called.
			//
			//		If "name" is not specified, it will be derived from the calling
			//		method (using a methoid property "nom").
			//
			// example:
			//	|	var B = declare(A, {
			//	|		method1: function(a, b, c){
			//	|			this.inherited(arguments);
			//	|		},
			//	|		method2: function(a, b){
			//	|			return this.inherited(arguments, [a + b]);
			//	|		}
			//	|	});
			//	|	// next method is not in the chain list because it is added
			//	|	// manually after the class was created.
			//	|	B.prototype.method3 = function(){
			//	|		 0 && console.log("This is a dynamically-added method.");
			//	|		this.inherited("method3", arguments);
			//	|	};
			// example:
			//	|	var B = declare(A, {
			//	|		method: function(a, b){
			//	|			var super = this.inherited(arguments, true);
			//	|			// ...
			//	|			if(!super){
			//	|				 0 && console.log("there is no super method");
			//	|				return 0;
			//	|			}
			//	|			return super.apply(this, arguments);
			//	|		}
			//	|	});
			return	{};	// Object
		},

		getInherited: function(name, args){
			// summary:
			//		Returns a super method.
			// name: String?
			//		The optional method name. Should be the same as the caller's
			//		name. Usually "name" is specified in complex dynamic cases, when
			//		the calling method was dynamically added, undecorated by
			//		declare(), and it cannot be determined.
			// args: Arguments
			//		The caller supply this argument, which should be the original
			//		"arguments".
			// returns:
			//		Returns a super method (Function) or "undefined".
			// description:
			//		This method is a convenience method for "this.inherited()".
			//		It uses the same algorithm but instead of executing a super
			//		method, it returns it, or "undefined" if not found.
			//
			// example:
			//	|	var B = declare(A, {
			//	|		method: function(a, b){
			//	|			var super = this.getInherited(arguments);
			//	|			// ...
			//	|			if(!super){
			//	|				 0 && console.log("there is no super method");
			//	|				return 0;
			//	|			}
			//	|			return super.apply(this, arguments);
			//	|		}
			//	|	});
			return	{};	// Object
		},

		isInstanceOf: function(cls){
			// summary:
			//		Checks the inheritance chain to see if it is inherited from this
			//		class.
			// cls: Function
			//		Class constructor.
			// returns:
			//		"true", if this object is inherited from this class, "false"
			//		otherwise.
			// description:
			//		This method is used with instances of classes produced with
			//		declare() to determine of they support a certain interface or
			//		not. It models "instanceof" operator.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var B = declare(null, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var C = declare([A, B], {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var D = declare(A, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|
			//	|	var a = new A(), b = new B(), c = new C(), d = new D();
			//	|
			//	|	 0 && console.log(a.isInstanceOf(A)); // true
			//	|	 0 && console.log(b.isInstanceOf(A)); // false
			//	|	 0 && console.log(c.isInstanceOf(A)); // true
			//	|	 0 && console.log(d.isInstanceOf(A)); // true
			//	|
			//	|	 0 && console.log(a.isInstanceOf(B)); // false
			//	|	 0 && console.log(b.isInstanceOf(B)); // true
			//	|	 0 && console.log(c.isInstanceOf(B)); // true
			//	|	 0 && console.log(d.isInstanceOf(B)); // false
			//	|
			//	|	 0 && console.log(a.isInstanceOf(C)); // false
			//	|	 0 && console.log(b.isInstanceOf(C)); // false
			//	|	 0 && console.log(c.isInstanceOf(C)); // true
			//	|	 0 && console.log(d.isInstanceOf(C)); // false
			//	|
			//	|	 0 && console.log(a.isInstanceOf(D)); // false
			//	|	 0 && console.log(b.isInstanceOf(D)); // false
			//	|	 0 && console.log(c.isInstanceOf(D)); // false
			//	|	 0 && console.log(d.isInstanceOf(D)); // true
			return	{};	// Object
		},

		extend: function(source){
			// summary:
			//		Adds all properties and methods of source to constructor's
			//		prototype, making them available to all instances created with
			//		constructor. This method is specific to constructors created with
			//		declare().
			// source: Object
			//		Source object which properties are going to be copied to the
			//		constructor's prototype.
			// description:
			//		Adds source properties to the constructor's prototype. It can
			//		override existing properties.
			//
			//		This method is similar to dojo.extend function, but it is specific
			//		to constructors produced by declare(). It is implemented
			//		using dojo.safeMixin, and it skips a constructor property,
			//		and properly decorates copied functions.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		m1: function(){},
			//	|		s1: "Popokatepetl"
			//	|	});
			//	|	A.extend({
			//	|		m1: function(){},
			//	|		m2: function(){},
			//	|		f1: true,
			//	|		d1: 42
			//	|	});
		},

		createSubclass: function(mixins, props){
			// summary:
			//		Create a subclass of the declared class from a list of base classes.
			// mixins: Function[]
			//		Specifies a list of bases (the left-most one is the most deepest
			//		base).
			// props: Object?
			//		An optional object whose properties are copied to the created prototype.
			// returns: dojo/_base/declare.__DeclareCreatedObject
			//		New constructor function.
			// description:
			//		Create a constructor using a compact notation for inheritance and
			//		prototype extension.
			//
			//		Mixin ancestors provide a type of multiple inheritance.
			//		Prototypes of mixin ancestors are copied to the new class:
			//		changes to mixin prototypes will not affect classes to which
			//		they have been mixed in.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		m1: function(){},
			//	|		s1: "bar"
			//	|	});
			//	|	var B = declare(null, {
			//	|		m2: function(){},
			//	|		s2: "foo"
			//	|	});
			//	|	var C = declare(null, {
			//	|	});
			//	|	var D1 = A.createSubclass([B, C], {
			//	|		m1: function(){},
			//	|		d1: 42
			//	|	});
			//	|	var d1 = new D1();
			//	|
			//	|	// this is equivalent to:
			//	|	var D2 = declare([A, B, C], {
			//	|		m1: function(){},
			//	|		d1: 42
			//	|	});
			//	|	var d2 = new D2();
		}
	};
	=====*/

	// For back-compat, remove for 2.0
	dojo.safeMixin = declare.safeMixin = safeMixin;
	dojo.declare = declare;

	return declare;
});

},
'dojo/_base/connect':function(){
define(["./kernel", "../on", "../topic", "../aspect", "./event", "../mouse", "./sniff", "./lang", "../keys"], function(dojo, on, hub, aspect, eventModule, mouse, has, lang){
// module:
//		dojo/_base/connect

has.add("events-keypress-typed", function(){ // keypresses should only occur a printable character is hit
	var testKeyEvent = {charCode: 0};
	try{
		testKeyEvent = document.createEvent("KeyboardEvent");
		(testKeyEvent.initKeyboardEvent || testKeyEvent.initKeyEvent).call(testKeyEvent, "keypress", true, true, null, false, false, false, false, 9, 3);
	}catch(e){}
	return testKeyEvent.charCode == 0 && !has("opera");
});

function connect_(obj, event, context, method, dontFix){
	method = lang.hitch(context, method);
	if(!obj || !(obj.addEventListener || obj.attachEvent)){
		// it is a not a DOM node and we are using the dojo.connect style of treating a
		// method like an event, must go right to aspect
		return aspect.after(obj || dojo.global, event, method, true);
	}
	if(typeof event == "string" && event.substring(0, 2) == "on"){
		event = event.substring(2);
	}
	if(!obj){
		obj = dojo.global;
	}
	if(!dontFix){
		switch(event){
			// dojo.connect has special handling for these event types
			case "keypress":
				event = keypress;
				break;
			case "mouseenter":
				event = mouse.enter;
				break;
			case "mouseleave":
				event = mouse.leave;
				break;
		}
	}
	return on(obj, event, method, dontFix);
}

var _punctMap = {
	106:42,
	111:47,
	186:59,
	187:43,
	188:44,
	189:45,
	190:46,
	191:47,
	192:96,
	219:91,
	220:92,
	221:93,
	222:39,
	229:113
};
var evtCopyKey = has("mac") ? "metaKey" : "ctrlKey";


var _synthesizeEvent = function(evt, props){
	var faux = lang.mixin({}, evt, props);
	setKeyChar(faux);
	// FIXME: would prefer to use lang.hitch: lang.hitch(evt, evt.preventDefault);
	// but it throws an error when preventDefault is invoked on Safari
	// does Event.preventDefault not support "apply" on Safari?
	faux.preventDefault = function(){ evt.preventDefault(); };
	faux.stopPropagation = function(){ evt.stopPropagation(); };
	return faux;
};
function setKeyChar(evt){
	evt.keyChar = evt.charCode ? String.fromCharCode(evt.charCode) : '';
	evt.charOrCode = evt.keyChar || evt.keyCode;
}
var keypress;
if(has("events-keypress-typed")){
	// this emulates Firefox's keypress behavior where every keydown can correspond to a keypress
	var _trySetKeyCode = function(e, code){
		try{
			// squelch errors when keyCode is read-only
			// (e.g. if keyCode is ctrl or shift)
			return (e.keyCode = code);
		}catch(e){
			return 0;
		}
	};
	keypress = function(object, listener){
		var keydownSignal = on(object, "keydown", function(evt){
			// munge key/charCode
			var k=evt.keyCode;
			// These are Windows Virtual Key Codes
			// http://msdn.microsoft.com/library/default.asp?url=/library/en-us/winui/WinUI/WindowsUserInterface/UserInput/VirtualKeyCodes.asp
			var unprintable = (k!=13) && k!=32 && (k!=27||!has("ie")) && (k<48||k>90) && (k<96||k>111) && (k<186||k>192) && (k<219||k>222) && k!=229;
			// synthesize keypress for most unprintables and CTRL-keys
			if(unprintable||evt.ctrlKey){
				var c = unprintable ? 0 : k;
				if(evt.ctrlKey){
					if(k==3 || k==13){
						return listener.call(evt.currentTarget, evt); // IE will post CTRL-BREAK, CTRL-ENTER as keypress natively
					}else if(c>95 && c<106){
						c -= 48; // map CTRL-[numpad 0-9] to ASCII
					}else if((!evt.shiftKey)&&(c>=65&&c<=90)){
						c += 32; // map CTRL-[A-Z] to lowercase
					}else{
						c = _punctMap[c] || c; // map other problematic CTRL combinations to ASCII
					}
				}
				// simulate a keypress event
				var faux = _synthesizeEvent(evt, {type: 'keypress', faux: true, charCode: c});
				listener.call(evt.currentTarget, faux);
				if(has("ie")){
					_trySetKeyCode(evt, faux.keyCode);
				}
			}
		});
		var keypressSignal = on(object, "keypress", function(evt){
			var c = evt.charCode;
			c = c>=32 ? c : 0;
			evt = _synthesizeEvent(evt, {charCode: c, faux: true});
			return listener.call(this, evt);
		});
		return {
			remove: function(){
				keydownSignal.remove();
				keypressSignal.remove();
			}
		};
	};
}else{
	if(has("opera")){
		keypress = function(object, listener){
			return on(object, "keypress", function(evt){
				var c = evt.which;
				if(c==3){
					c=99; // Mozilla maps CTRL-BREAK to CTRL-c
				}
				// can't trap some keys at all, like INSERT and DELETE
				// there is no differentiating info between DELETE and ".", or INSERT and "-"
				c = c<32 && !evt.shiftKey ? 0 : c;
				if(evt.ctrlKey && !evt.shiftKey && c>=65 && c<=90){
					// lowercase CTRL-[A-Z] keys
					c += 32;
				}
				return listener.call(this, _synthesizeEvent(evt, { charCode: c }));
			});
		};
	}else{
		keypress = function(object, listener){
			return on(object, "keypress", function(evt){
				setKeyChar(evt);
				return listener.call(this, evt);
			});
		};
	}
}

var connect = {
	// summary:
	//		This module defines the dojo.connect API.
	//		This modules also provides keyboard event handling helpers.
	//		This module exports an extension event for emulating Firefox's keypress handling.
	//		However, this extension event exists primarily for backwards compatibility and
	//		is not recommended. WebKit and IE uses an alternate keypress handling (only
	//		firing for printable characters, to distinguish from keydown events), and most
	//		consider the WebKit/IE behavior more desirable.

	_keypress:keypress,

	connect:function(obj, event, context, method, dontFix){
		// summary:
		//		`dojo.connect` is a deprecated event handling and delegation method in
		//		Dojo. It allows one function to "listen in" on the execution of
		//		any other, triggering the second whenever the first is called. Many
		//		listeners may be attached to a function, and source functions may
		//		be either regular function calls or DOM events.
		//
		// description:
		//		Connects listeners to actions, so that after event fires, a
		//		listener is called with the same arguments passed to the original
		//		function.
		//
		//		Since `dojo.connect` allows the source of events to be either a
		//		"regular" JavaScript function or a DOM event, it provides a uniform
		//		interface for listening to all the types of events that an
		//		application is likely to deal with though a single, unified
		//		interface. DOM programmers may want to think of it as
		//		"addEventListener for everything and anything".
		//
		//		When setting up a connection, the `event` parameter must be a
		//		string that is the name of the method/event to be listened for. If
		//		`obj` is null, `kernel.global` is assumed, meaning that connections
		//		to global methods are supported but also that you may inadvertently
		//		connect to a global by passing an incorrect object name or invalid
		//		reference.
		//
		//		`dojo.connect` generally is forgiving. If you pass the name of a
		//		function or method that does not yet exist on `obj`, connect will
		//		not fail, but will instead set up a stub method. Similarly, null
		//		arguments may simply be omitted such that fewer than 4 arguments
		//		may be required to set up a connection See the examples for details.
		//
		//		The return value is a handle that is needed to
		//		remove this connection with `dojo.disconnect`.
		//
		// obj: Object?
		//		The source object for the event function.
		//		Defaults to `kernel.global` if null.
		//		If obj is a DOM node, the connection is delegated
		//		to the DOM event manager (unless dontFix is true).
		//
		// event: String
		//		String name of the event function in obj.
		//		I.e. identifies a property `obj[event]`.
		//
		// context: Object|null
		//		The object that method will receive as "this".
		//
		//		If context is null and method is a function, then method
		//		inherits the context of event.
		//
		//		If method is a string then context must be the source
		//		object object for method (context[method]). If context is null,
		//		kernel.global is used.
		//
		// method: String|Function
		//		A function reference, or name of a function in context.
		//		The function identified by method fires after event does.
		//		method receives the same arguments as the event.
		//		See context argument comments for information on method's scope.
		//
		// dontFix: Boolean?
		//		If obj is a DOM node, set dontFix to true to prevent delegation
		//		of this connection to the DOM event manager.
		//
		// example:
		//		When obj.onchange(), do ui.update():
		//	|	dojo.connect(obj, "onchange", ui, "update");
		//	|	dojo.connect(obj, "onchange", ui, ui.update); // same
		//
		// example:
		//		Using return value for disconnect:
		//	|	var link = dojo.connect(obj, "onchange", ui, "update");
		//	|	...
		//	|	dojo.disconnect(link);
		//
		// example:
		//		When onglobalevent executes, watcher.handler is invoked:
		//	|	dojo.connect(null, "onglobalevent", watcher, "handler");
		//
		// example:
		//		When ob.onCustomEvent executes, customEventHandler is invoked:
		//	|	dojo.connect(ob, "onCustomEvent", null, "customEventHandler");
		//	|	dojo.connect(ob, "onCustomEvent", "customEventHandler"); // same
		//
		// example:
		//		When ob.onCustomEvent executes, customEventHandler is invoked
		//		with the same scope (this):
		//	|	dojo.connect(ob, "onCustomEvent", null, customEventHandler);
		//	|	dojo.connect(ob, "onCustomEvent", customEventHandler); // same
		//
		// example:
		//		When globalEvent executes, globalHandler is invoked
		//		with the same scope (this):
		//	|	dojo.connect(null, "globalEvent", null, globalHandler);
		//	|	dojo.connect("globalEvent", globalHandler); // same

		// normalize arguments
		var a=arguments, args=[], i=0;
		// if a[0] is a String, obj was omitted
		args.push(typeof a[0] == "string" ? null : a[i++], a[i++]);
		// if the arg-after-next is a String or Function, context was NOT omitted
		var a1 = a[i+1];
		args.push(typeof a1 == "string" || typeof a1 == "function" ? a[i++] : null, a[i++]);
		// absorb any additional arguments
		for(var l=a.length; i<l; i++){	args.push(a[i]); }
		return connect_.apply(this, args);
	},

	disconnect:function(handle){
		// summary:
		//		Remove a link created by dojo.connect.
		// description:
		//		Removes the connection between event and the method referenced by handle.
		// handle: Handle
		//		the return value of the dojo.connect call that created the connection.

		if(handle){
			handle.remove();
		}
	},

	subscribe:function(topic, context, method){
		// summary:
		//		Attach a listener to a named topic. The listener function is invoked whenever the
		//		named topic is published (see: dojo.publish).
		//		Returns a handle which is needed to unsubscribe this listener.
		// topic: String
		//		The topic to which to subscribe.
		// context: Object?
		//		Scope in which method will be invoked, or null for default scope.
		// method: String|Function
		//		The name of a function in context, or a function reference. This is the function that
		//		is invoked when topic is published.
		// example:
		//	|	dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); });
		//	|	dojo.publish("alerts", [ "read this", "hello world" ]);
		return hub.subscribe(topic, lang.hitch(context, method));
	},

	publish:function(topic, args){
		// summary:
		//		Invoke all listener method subscribed to topic.
		// topic: String
		//		The name of the topic to publish.
		// args: Array?
		//		An array of arguments. The arguments will be applied
		//		to each topic subscriber (as first class parameters, via apply).
		// example:
		//	|	dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); };
		//	|	dojo.publish("alerts", [ "read this", "hello world" ]);
		return hub.publish.apply(hub, [topic].concat(args));
	},

	connectPublisher:function(topic, obj, event){
		// summary:
		//		Ensure that every time obj.event() is called, a message is published
		//		on the topic. Returns a handle which can be passed to
		//		dojo.disconnect() to disable subsequent automatic publication on
		//		the topic.
		// topic: String
		//		The name of the topic to publish.
		// obj: Object?
		//		The source object for the event function. Defaults to kernel.global
		//		if null.
		// event: String
		//		The name of the event function in obj.
		//		I.e. identifies a property obj[event].
		// example:
		//	|	dojo.connectPublisher("/ajax/start", dojo, "xhrGet");
		var pf = function(){ connect.publish(topic, arguments); };
		return event ? connect.connect(obj, event, pf) : connect.connect(obj, pf); //Handle
	},

	isCopyKey: function(e){
		// summary:
		//		Checks an event for the copy key (meta on Mac, and ctrl anywhere else)
		// e: Event
		//		Event object to examine
		return e[evtCopyKey];	// Boolean
	}
};

connect.unsubscribe = connect.disconnect;
/*=====
 connect.unsubscribe = function(handle){
	 // summary:
	 //		Remove a topic listener.
	 // handle: Handle
	 //		The handle returned from a call to subscribe.
	 // example:
	 //	|	var alerter = dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); };
	 //	|	...
	 //	|	dojo.unsubscribe(alerter);
 };
 =====*/

 1  && lang.mixin(dojo, connect);
return connect;

});



},
'dojo/on':function(){
define(["./has!dom-addeventlistener?:./aspect", "./_base/kernel", "./sniff"], function(aspect, dojo, has){

	"use strict";
	if( 1 ){ // check to make sure we are in a browser, this module should work anywhere
		var major = window.ScriptEngineMajorVersion;
		has.add("jscript", major && (major() + ScriptEngineMinorVersion() / 10));
		has.add("event-orientationchange", has("touch") && !has("android")); // TODO: how do we detect this?
		has.add("event-stopimmediatepropagation", window.Event && !!window.Event.prototype && !!window.Event.prototype.stopImmediatePropagation);
		has.add("event-focusin", function(global, doc, element){
			return 'onfocusin' in element;
		});
		
		if(has("touch")){
			has.add("touch-can-modify-event-delegate", function(){
				// This feature test checks whether deleting a property of an event delegate works
				// for a touch-enabled device. If it works, event delegation can be used as fallback
				// for browsers such as Safari in older iOS where deleting properties of the original
				// event does not work.
				var EventDelegate = function(){};
				EventDelegate.prototype =
					document.createEvent("MouseEvents"); // original event
				// Attempt to modify a property of an event delegate and check if
				// it succeeds. Depending on browsers and on whether dojo/on's
				// strict mode is stripped in a Dojo build, there are 3 known behaviors:
				// it may either succeed, or raise an error, or fail to set the property
				// without raising an error.
				try{
					var eventDelegate = new EventDelegate;
					eventDelegate.target = null;
					return eventDelegate.target === null;
				}catch(e){
					return false; // cannot use event delegation
				}
			});
		}
	}
	var on = function(target, type, listener, dontFix){
		// summary:
		//		A function that provides core event listening functionality. With this function
		//		you can provide a target, event type, and listener to be notified of
		//		future matching events that are fired.
		// target: Element|Object
		//		This is the target object or DOM element that to receive events from
		// type: String|Function
		//		This is the name of the event to listen for or an extension event type.
		// listener: Function
		//		This is the function that should be called when the event fires.
		// returns: Object
		//		An object with a remove() method that can be used to stop listening for this
		//		event.
		// description:
		//		To listen for "click" events on a button node, we can do:
		//		|	define(["dojo/on"], function(listen){
		//		|		on(button, "click", clickHandler);
		//		|		...
		//		Evented JavaScript objects can also have their own events.
		//		|	var obj = new Evented;
		//		|	on(obj, "foo", fooHandler);
		//		And then we could publish a "foo" event:
		//		|	on.emit(obj, "foo", {key: "value"});
		//		We can use extension events as well. For example, you could listen for a tap gesture:
		//		|	define(["dojo/on", "dojo/gesture/tap", function(listen, tap){
		//		|		on(button, tap, tapHandler);
		//		|		...
		//		which would trigger fooHandler. Note that for a simple object this is equivalent to calling:
		//		|	obj.onfoo({key:"value"});
		//		If you use on.emit on a DOM node, it will use native event dispatching when possible.

		if(typeof target.on == "function" && typeof type != "function" && !target.nodeType){
			// delegate to the target's on() method, so it can handle it's own listening if it wants (unless it 
			// is DOM node and we may be dealing with jQuery or Prototype's incompatible addition to the
			// Element prototype 
			return target.on(type, listener);
		}
		// delegate to main listener code
		return on.parse(target, type, listener, addListener, dontFix, this);
	};
	on.pausable =  function(target, type, listener, dontFix){
		// summary:
		//		This function acts the same as on(), but with pausable functionality. The
		//		returned signal object has pause() and resume() functions. Calling the
		//		pause() method will cause the listener to not be called for future events. Calling the
		//		resume() method will cause the listener to again be called for future events.
		var paused;
		var signal = on(target, type, function(){
			if(!paused){
				return listener.apply(this, arguments);
			}
		}, dontFix);
		signal.pause = function(){
			paused = true;
		};
		signal.resume = function(){
			paused = false;
		};
		return signal;
	};
	on.once = function(target, type, listener, dontFix){
		// summary:
		//		This function acts the same as on(), but will only call the listener once. The 
		//		listener will be called for the first
		//		event that takes place and then listener will automatically be removed.
		var signal = on(target, type, function(){
			// remove this listener
			signal.remove();
			// proceed to call the listener
			return listener.apply(this, arguments);
		});
		return signal;
	};
	on.parse = function(target, type, listener, addListener, dontFix, matchesTarget){
		if(type.call){
			// event handler function
			// on(node, touch.press, touchListener);
			return type.call(matchesTarget, target, listener);
		}

		if(type instanceof Array){
			// allow an array of event names (or event handler functions)
			events = type;
		}else if(type.indexOf(",") > -1){
			// we allow comma delimited event names, so you can register for multiple events at once
			var events = type.split(/\s*,\s*/);
		} 
		if(events){
			var handles = [];
			var i = 0;
			var eventName;
			while(eventName = events[i++]){
				handles.push(on.parse(target, eventName, listener, addListener, dontFix, matchesTarget));
			}
			handles.remove = function(){
				for(var i = 0; i < handles.length; i++){
					handles[i].remove();
				}
			};
			return handles;
		}
		return addListener(target, type, listener, dontFix, matchesTarget);
	};
	var touchEvents = /^touch/;
	function addListener(target, type, listener, dontFix, matchesTarget){
		// event delegation:
		var selector = type.match(/(.*):(.*)/);
		// if we have a selector:event, the last one is interpreted as an event, and we use event delegation
		if(selector){
			type = selector[2];
			selector = selector[1];
			// create the extension event for selectors and directly call it
			return on.selector(selector, type).call(matchesTarget, target, listener);
		}
		// test to see if it a touch event right now, so we don't have to do it every time it fires
		if(has("touch")){
			if(touchEvents.test(type)){
				// touch event, fix it
				listener = fixTouchListener(listener);
			}
			if(!has("event-orientationchange") && (type == "orientationchange")){
				//"orientationchange" not supported <= Android 2.1, 
				//but works through "resize" on window
				type = "resize"; 
				target = window;
				listener = fixTouchListener(listener);
			} 
		}
		if(addStopImmediate){
			// add stopImmediatePropagation if it doesn't exist
			listener = addStopImmediate(listener);
		}
		// normal path, the target is |this|
		if(target.addEventListener){
			// the target has addEventListener, which should be used if available (might or might not be a node, non-nodes can implement this method as well)
			// check for capture conversions
			var capture = type in captures,
				adjustedType = capture ? captures[type] : type;
			target.addEventListener(adjustedType, listener, capture);
			// create and return the signal
			return {
				remove: function(){
					target.removeEventListener(adjustedType, listener, capture);
				}
			};
		}
		type = "on" + type;
		if(fixAttach && target.attachEvent){
			return fixAttach(target, type, listener);
		}
		throw new Error("Target must be an event emitter");
	}
	on.matches = function(node, selector, context, children, matchesTarget) {
		// summary:
		//		Check if a node match the current selector within the constraint of a context
		// node: DOMNode
		//		The node that originate the event
		// selector: String
		//		The selector to check against
		// context: DOMNode
		//		The context to search in.
		// children: Boolean
		//		Indicates if children elements of the selector should be allowed. This defaults to
		//		true
		// matchesTarget: Object|dojo/query?
		//		An object with a property "matches" as a function. Default is dojo/query.
		//		Matching DOMNodes will be done against this function
		//		The function must return a Boolean.
		//		It will have 3 arguments: "node", "selector" and "context"
		//		True is expected if "node" is matching the current "selector" in the passed "context"
		// returns: DOMNode?
		//		The matching node, if any. Else you get false

		// see if we have a valid matchesTarget or default to dojo/query
		matchesTarget = matchesTarget && matchesTarget.matches ? matchesTarget : dojo.query;
		children = children !== false;
		// there is a selector, so make sure it matches
		if(node.nodeType != 1){
			// text node will fail in native match selector
			node = node.parentNode;
		}
		while(!matchesTarget.matches(node, selector, context)){
			if(node == context || children === false || !(node = node.parentNode) || node.nodeType != 1){ // intentional assignment
				return false;
			}
		}
		return node;
	}
	on.selector = function(selector, eventType, children){
		// summary:
		//		Creates a new extension event with event delegation. This is based on
		//		the provided event type (can be extension event) that
		//		only calls the listener when the CSS selector matches the target of the event.
		//
		//		The application must require() an appropriate level of dojo/query to handle the selector.
		// selector:
		//		The CSS selector to use for filter events and determine the |this| of the event listener.
		// eventType:
		//		The event to listen for
		// children:
		//		Indicates if children elements of the selector should be allowed. This defaults to 
		//		true
		// example:
		// |	require(["dojo/on", "dojo/mouse", "dojo/query!css2"], function(listen, mouse){
		// |		on(node, on.selector(".my-class", mouse.enter), handlerForMyHover);
		return function(target, listener){
			// if the selector is function, use it to select the node, otherwise use the matches method
			var matchesTarget = typeof selector == "function" ? {matches: selector} : this,
				bubble = eventType.bubble;
			function select(eventTarget){
				return on.matches(eventTarget, selector, target, children, matchesTarget);
			}
			if(bubble){
				// the event type doesn't naturally bubble, but has a bubbling form, use that, and give it the selector so it can perform the select itself
				return on(target, bubble(select), listener);
			}
			// standard event delegation
			return on(target, eventType, function(event){
				// call select to see if we match
				var eventTarget = select(event.target);
				// if it matches we call the listener
				if (eventTarget) {
					return listener.call(eventTarget, event);
				}
			});
		};
	};

	function syntheticPreventDefault(){
		this.cancelable = false;
		this.defaultPrevented = true;
	}
	function syntheticStopPropagation(){
		this.bubbles = false;
	}
	var slice = [].slice,
		syntheticDispatch = on.emit = function(target, type, event){
		// summary:
		//		Fires an event on the target object.
		// target:
		//		The target object to fire the event on. This can be a DOM element or a plain 
		//		JS object. If the target is a DOM element, native event emitting mechanisms
		//		are used when possible.
		// type:
		//		The event type name. You can emulate standard native events like "click" and 
		//		"mouseover" or create custom events like "open" or "finish".
		// event:
		//		An object that provides the properties for the event. See https://developer.mozilla.org/en/DOM/event.initEvent 
		//		for some of the properties. These properties are copied to the event object.
		//		Of particular importance are the cancelable and bubbles properties. The
		//		cancelable property indicates whether or not the event has a default action
		//		that can be cancelled. The event is cancelled by calling preventDefault() on
		//		the event object. The bubbles property indicates whether or not the
		//		event will bubble up the DOM tree. If bubbles is true, the event will be called
		//		on the target and then each parent successively until the top of the tree
		//		is reached or stopPropagation() is called. Both bubbles and cancelable 
		//		default to false.
		// returns:
		//		If the event is cancelable and the event is not cancelled,
		//		emit will return true. If the event is cancelable and the event is cancelled,
		//		emit will return false.
		// details:
		//		Note that this is designed to emit events for listeners registered through
		//		dojo/on. It should actually work with any event listener except those
		//		added through IE's attachEvent (IE8 and below's non-W3C event emitting
		//		doesn't support custom event types). It should work with all events registered
		//		through dojo/on. Also note that the emit method does do any default
		//		action, it only returns a value to indicate if the default action should take
		//		place. For example, emitting a keypress event would not cause a character
		//		to appear in a textbox.
		// example:
		//		To fire our own click event
		//	|	require(["dojo/on", "dojo/dom"
		//	|	], function(on, dom){
		//	|		on.emit(dom.byId("button"), "click", {
		//	|			cancelable: true,
		//	|			bubbles: true,
		//	|			screenX: 33,
		//	|			screenY: 44
		//	|		});
		//		We can also fire our own custom events:
		//	|		on.emit(dom.byId("slider"), "slide", {
		//	|			cancelable: true,
		//	|			bubbles: true,
		//	|			direction: "left-to-right"
		//	|		});
		//	|	});
		var args = slice.call(arguments, 2);
		var method = "on" + type;
		if("parentNode" in target){
			// node (or node-like), create event controller methods
			var newEvent = args[0] = {};
			for(var i in event){
				newEvent[i] = event[i];
			}
			newEvent.preventDefault = syntheticPreventDefault;
			newEvent.stopPropagation = syntheticStopPropagation;
			newEvent.target = target;
			newEvent.type = type;
			event = newEvent;
		}
		do{
			// call any node which has a handler (note that ideally we would try/catch to simulate normal event propagation but that causes too much pain for debugging)
			target[method] && target[method].apply(target, args);
			// and then continue up the parent node chain if it is still bubbling (if started as bubbles and stopPropagation hasn't been called)
		}while(event && event.bubbles && (target = target.parentNode));
		return event && event.cancelable && event; // if it is still true (was cancelable and was cancelled), return the event to indicate default action should happen
	};
	var captures = has("event-focusin") ? {} : {focusin: "focus", focusout: "blur"};
	if(!has("event-stopimmediatepropagation")){
		var stopImmediatePropagation =function(){
			this.immediatelyStopped = true;
			this.modified = true; // mark it as modified so the event will be cached in IE
		};
		var addStopImmediate = function(listener){
			return function(event){
				if(!event.immediatelyStopped){// check to make sure it hasn't been stopped immediately
					event.stopImmediatePropagation = stopImmediatePropagation;
					return listener.apply(this, arguments);
				}
			};
		}
	} 
	if(has("dom-addeventlistener")){
		// emitter that works with native event handling
		on.emit = function(target, type, event){
			if(target.dispatchEvent && document.createEvent){
				// use the native event emitting mechanism if it is available on the target object
				// create a generic event				
				// we could create branch into the different types of event constructors, but 
				// that would be a lot of extra code, with little benefit that I can see, seems 
				// best to use the generic constructor and copy properties over, making it 
				// easy to have events look like the ones created with specific initializers
				var ownerDocument = target.ownerDocument || document;
				var nativeEvent = ownerDocument.createEvent("HTMLEvents");
				nativeEvent.initEvent(type, !!event.bubbles, !!event.cancelable);
				// and copy all our properties over
				for(var i in event){
					if(!(i in nativeEvent)){
						nativeEvent[i] = event[i];
					}
				}
				return target.dispatchEvent(nativeEvent) && nativeEvent;
			}
			return syntheticDispatch.apply(on, arguments); // emit for a non-node
		};
	}else{
		// no addEventListener, basically old IE event normalization
		on._fixEvent = function(evt, sender){
			// summary:
			//		normalizes properties on the event object including event
			//		bubbling methods, keystroke normalization, and x/y positions
			// evt:
			//		native event object
			// sender:
			//		node to treat as "currentTarget"
			if(!evt){
				var w = sender && (sender.ownerDocument || sender.document || sender).parentWindow || window;
				evt = w.event;
			}
			if(!evt){return evt;}
			try{
				if(lastEvent && evt.type == lastEvent.type  && evt.srcElement == lastEvent.target){
					// should be same event, reuse event object (so it can be augmented);
					// accessing evt.srcElement rather than evt.target since evt.target not set on IE until fixup below
					evt = lastEvent;
				}
			}catch(e){
				// will occur on IE on lastEvent.type reference if lastEvent points to a previous event that already
				// finished bubbling, but the setTimeout() to clear lastEvent hasn't fired yet
			}
			if(!evt.target){ // check to see if it has been fixed yet
				evt.target = evt.srcElement;
				evt.currentTarget = (sender || evt.srcElement);
				if(evt.type == "mouseover"){
					evt.relatedTarget = evt.fromElement;
				}
				if(evt.type == "mouseout"){
					evt.relatedTarget = evt.toElement;
				}
				if(!evt.stopPropagation){
					evt.stopPropagation = stopPropagation;
					evt.preventDefault = preventDefault;
				}
				switch(evt.type){
					case "keypress":
						var c = ("charCode" in evt ? evt.charCode : evt.keyCode);
						if (c==10){
							// CTRL-ENTER is CTRL-ASCII(10) on IE, but CTRL-ENTER on Mozilla
							c=0;
							evt.keyCode = 13;
						}else if(c==13||c==27){
							c=0; // Mozilla considers ENTER and ESC non-printable
						}else if(c==3){
							c=99; // Mozilla maps CTRL-BREAK to CTRL-c
						}
						// Mozilla sets keyCode to 0 when there is a charCode
						// but that stops the event on IE.
						evt.charCode = c;
						_setKeyChar(evt);
						break;
				}
			}
			return evt;
		};
		var lastEvent, IESignal = function(handle){
			this.handle = handle;
		};
		IESignal.prototype.remove = function(){
			delete _dojoIEListeners_[this.handle];
		};
		var fixListener = function(listener){
			// this is a minimal function for closing on the previous listener with as few as variables as possible
			return function(evt){
				evt = on._fixEvent(evt, this);
				var result = listener.call(this, evt);
				if(evt.modified){
					// cache the last event and reuse it if we can
					if(!lastEvent){
						setTimeout(function(){
							lastEvent = null;
						});
					}
					lastEvent = evt;
				}
				return result;
			};
		};
		var fixAttach = function(target, type, listener){
			listener = fixListener(listener);
			if(((target.ownerDocument ? target.ownerDocument.parentWindow : target.parentWindow || target.window || window) != top || 
						has("jscript") < 5.8) && 
					!has("config-_allow_leaks")){
				// IE will leak memory on certain handlers in frames (IE8 and earlier) and in unattached DOM nodes for JScript 5.7 and below.
				// Here we use global redirection to solve the memory leaks
				if(typeof _dojoIEListeners_ == "undefined"){
					_dojoIEListeners_ = [];
				}
				var emitter = target[type];
				if(!emitter || !emitter.listeners){
					var oldListener = emitter;
					emitter = Function('event', 'var callee = arguments.callee; for(var i = 0; i<callee.listeners.length; i++){var listener = _dojoIEListeners_[callee.listeners[i]]; if(listener){listener.call(this,event);}}');
					emitter.listeners = [];
					target[type] = emitter;
					emitter.global = this;
					if(oldListener){
						emitter.listeners.push(_dojoIEListeners_.push(oldListener) - 1);
					}
				}
				var handle;
				emitter.listeners.push(handle = (emitter.global._dojoIEListeners_.push(listener) - 1));
				return new IESignal(handle);
			}
			return aspect.after(target, type, listener, true);
		};

		var _setKeyChar = function(evt){
			evt.keyChar = evt.charCode ? String.fromCharCode(evt.charCode) : '';
			evt.charOrCode = evt.keyChar || evt.keyCode;	// TODO: remove for 2.0
		};
		// Called in Event scope
		var stopPropagation = function(){
			this.cancelBubble = true;
		};
		var preventDefault = on._preventDefault = function(){
			// Setting keyCode to 0 is the only way to prevent certain keypresses (namely
			// ctrl-combinations that correspond to menu accelerator keys).
			// Otoh, it prevents upstream listeners from getting this information
			// Try to split the difference here by clobbering keyCode only for ctrl
			// combinations. If you still need to access the key upstream, bubbledKeyCode is
			// provided as a workaround.
			this.bubbledKeyCode = this.keyCode;
			if(this.ctrlKey){
				try{
					// squelch errors when keyCode is read-only
					// (e.g. if keyCode is ctrl or shift)
					this.keyCode = 0;
				}catch(e){
				}
			}
			this.defaultPrevented = true;
			this.returnValue = false;
			this.modified = true; // mark it as modified  (for defaultPrevented flag) so the event will be cached in IE
		};
	}
	if(has("touch")){ 
		var EventDelegate = function(){};
		var windowOrientation = window.orientation; 
		var fixTouchListener = function(listener){ 
			return function(originalEvent){ 
				//Event normalization(for ontouchxxx and resize): 
				//1.incorrect e.pageX|pageY in iOS 
				//2.there are no "e.rotation", "e.scale" and "onorientationchange" in Android
				//3.More TBD e.g. force | screenX | screenX | clientX | clientY | radiusX | radiusY

				// see if it has already been corrected
				var event = originalEvent.corrected;
				if(!event){
					var type = originalEvent.type;
					try{
						delete originalEvent.type; // on some JS engines (android), deleting properties makes them mutable
					}catch(e){} 
					if(originalEvent.type){
						// Deleting the property of the original event did not work (this is the case of
						// browsers such as older Safari iOS), hence fallback:
						if(has("touch-can-modify-event-delegate")){
							// If deleting properties of delegated event works, use event delegation:
							EventDelegate.prototype = originalEvent;
							event = new EventDelegate;
						}else{
							// Otherwise last fallback: other browsers, such as mobile Firefox, do not like
							// delegated properties, so we have to copy
							event = {};
							for(var name in originalEvent){
								event[name] = originalEvent[name];
							}
						}
						// have to delegate methods to make them work
						event.preventDefault = function(){
							originalEvent.preventDefault();
						};
						event.stopPropagation = function(){
							originalEvent.stopPropagation();
						};
					}else{
						// deletion worked, use property as is
						event = originalEvent;
						event.type = type;
					}
					originalEvent.corrected = event;
					if(type == 'resize'){
						if(windowOrientation == window.orientation){ 
							return null;//double tap causes an unexpected 'resize' in Android
						} 
						windowOrientation = window.orientation;
						event.type = "orientationchange"; 
						return listener.call(this, event);
					}
					// We use the original event and augment, rather than doing an expensive mixin operation
					if(!("rotation" in event)){ // test to see if it has rotation
						event.rotation = 0; 
						event.scale = 1;
					}
					//use event.changedTouches[0].pageX|pageY|screenX|screenY|clientX|clientY|target
					var firstChangeTouch = event.changedTouches[0];
					for(var i in firstChangeTouch){ // use for-in, we don't need to have dependency on dojo/_base/lang here
						delete event[i]; // delete it first to make it mutable
						event[i] = firstChangeTouch[i];
					}
				}
				return listener.call(this, event); 
			}; 
		}; 
	}
	return on;
});

},
'dojo/topic':function(){
define(["./Evented"], function(Evented){

	// module:
	//		dojo/topic

	var hub = new Evented;
	return {
		// summary:
		//		Pubsub hub.
		// example:
		//		| 	topic.subscribe("some/topic", function(event){
		//		|	... do something with event
		//		|	});
		//		|	topic.publish("some/topic", {name:"some event", ...});

		publish: function(topic, event){
			// summary:
			//		Publishes a message to a topic on the pub/sub hub. All arguments after
			//		the first will be passed to the subscribers, so any number of arguments
			//		can be provided (not just event).
			// topic: String
			//		The name of the topic to publish to
			// event: Object
			//		An event to distribute to the topic listeners
			return hub.emit.apply(hub, arguments);
		},

		subscribe: function(topic, listener){
			// summary:
			//		Subscribes to a topic on the pub/sub hub
			// topic: String
			//		The topic to subscribe to
			// listener: Function
			//		A function to call when a message is published to the given topic
			return hub.on.apply(hub, arguments);
		}
	};
});

},
'dojo/Evented':function(){
define(["./aspect", "./on"], function(aspect, on){
	// module:
	//		dojo/Evented

 	"use strict";
 	var after = aspect.after;
	function Evented(){
		// summary:
		//		A class that can be used as a mixin or base class,
		//		to add on() and emit() methods to a class
		//		for listening for events and emitting events:
		// example:
		//		|	define(["dojo/Evented", "dojo/_base/declare", "dojo/Stateful"
		//		|	], function(Evented, declare, Stateful){
		//		|		var EventedStateful = declare([Evented, Stateful], {...});
		//		|		var instance = new EventedStateful();
		//		|		instance.on("open", function(event){
		//		|		... do something with event
		//		|	 });
		//		|
		//		|	instance.emit("open", {name:"some event", ...});
	}
	Evented.prototype = {
		on: function(type, listener){
			return on.parse(this, type, listener, function(target, type){
				return after(target, 'on' + type, listener, true);
			});
		},
		emit: function(type, event){
			var args = [this];
			args.push.apply(args, arguments);
			return on.emit.apply(on, args);
		}
	};
	return Evented;
});

},
'dojo/aspect':function(){
define([], function(){

	// module:
	//		dojo/aspect

	"use strict";
	var undefined, nextId = 0;
	function advise(dispatcher, type, advice, receiveArguments){
		var previous = dispatcher[type];
		var around = type == "around";
		var signal;
		if(around){
			var advised = advice(function(){
				return previous.advice(this, arguments);
			});
			signal = {
				remove: function(){
					if(advised){
						advised = dispatcher = advice = null;
					}
				},
				advice: function(target, args){
					return advised ?
						advised.apply(target, args) :  // called the advised function
						previous.advice(target, args); // cancelled, skip to next one
				}
			};
		}else{
			// create the remove handler
			signal = {
				remove: function(){
					if(signal.advice){
						var previous = signal.previous;
						var next = signal.next;
						if(!next && !previous){
							delete dispatcher[type];
						}else{
							if(previous){
								previous.next = next;
							}else{
								dispatcher[type] = next;
							}
							if(next){
								next.previous = previous;
							}
						}

						// remove the advice to signal that this signal has been removed
						dispatcher = advice = signal.advice = null;
					}
				},
				id: nextId++,
				advice: advice,
				receiveArguments: receiveArguments
			};
		}
		if(previous && !around){
			if(type == "after"){
				// add the listener to the end of the list
				// note that we had to change this loop a little bit to workaround a bizarre IE10 JIT bug
				while(previous.next && (previous = previous.next)){}
				previous.next = signal;
				signal.previous = previous;
			}else if(type == "before"){
				// add to beginning
				dispatcher[type] = signal;
				signal.next = previous;
				previous.previous = signal;
			}
		}else{
			// around or first one just replaces
			dispatcher[type] = signal;
		}
		return signal;
	}
	function aspect(type){
		return function(target, methodName, advice, receiveArguments){
			var existing = target[methodName], dispatcher;
			if(!existing || existing.target != target){
				// no dispatcher in place
				target[methodName] = dispatcher = function(){
					var executionId = nextId;
					// before advice
					var args = arguments;
					var before = dispatcher.before;
					while(before){
						args = before.advice.apply(this, args) || args;
						before = before.next;
					}
					// around advice
					if(dispatcher.around){
						var results = dispatcher.around.advice(this, args);
					}
					// after advice
					var after = dispatcher.after;
					while(after && after.id < executionId){
						if(after.receiveArguments){
							var newResults = after.advice.apply(this, args);
							// change the return value only if a new value was returned
							results = newResults === undefined ? results : newResults;
						}else{
							results = after.advice.call(this, results, args);
						}
						after = after.next;
					}
					return results;
				};
				if(existing){
					dispatcher.around = {advice: function(target, args){
						return existing.apply(target, args);
					}};
				}
				dispatcher.target = target;
			}
			var results = advise((dispatcher || existing), type, advice, receiveArguments);
			advice = null;
			return results;
		};
	}

	// TODOC: after/before/around return object

	var after = aspect("after");
	/*=====
	after = function(target, methodName, advice, receiveArguments){
		// summary:
		//		The "after" export of the aspect module is a function that can be used to attach
		//		"after" advice to a method. This function will be executed after the original method
		//		is executed. By default the function will be called with a single argument, the return
		//		value of the original method, or the the return value of the last executed advice (if a previous one exists).
		//		The fourth (optional) argument can be set to true to so the function receives the original
		//		arguments (from when the original method was called) rather than the return value.
		//		If there are multiple "after" advisors, they are executed in the order they were registered.
		// target: Object
		//		This is the target object
		// methodName: String
		//		This is the name of the method to attach to.
		// advice: Function
		//		This is function to be called after the original method
		// receiveArguments: Boolean?
		//		If this is set to true, the advice function receives the original arguments (from when the original mehtod
		//		was called) rather than the return value of the original/previous method.
		// returns:
		//		A signal object that can be used to cancel the advice. If remove() is called on this signal object, it will
		//		stop the advice function from being executed.
	};
	=====*/

	var before = aspect("before");
	/*=====
	before = function(target, methodName, advice){
		// summary:
		//		The "before" export of the aspect module is a function that can be used to attach
		//		"before" advice to a method. This function will be executed before the original method
		//		is executed. This function will be called with the arguments used to call the method.
		//		This function may optionally return an array as the new arguments to use to call
		//		the original method (or the previous, next-to-execute before advice, if one exists).
		//		If the before method doesn't return anything (returns undefined) the original arguments
		//		will be preserved.
		//		If there are multiple "before" advisors, they are executed in the reverse order they were registered.
		// target: Object
		//		This is the target object
		// methodName: String
		//		This is the name of the method to attach to.
		// advice: Function
		//		This is function to be called before the original method
	};
	=====*/

	var around = aspect("around");
	/*=====
	 around = function(target, methodName, advice){
		// summary:
		//		The "around" export of the aspect module is a function that can be used to attach
		//		"around" advice to a method. The advisor function is immediately executed when
		//		the around() is called, is passed a single argument that is a function that can be
		//		called to continue execution of the original method (or the next around advisor).
		//		The advisor function should return a function, and this function will be called whenever
		//		the method is called. It will be called with the arguments used to call the method.
		//		Whatever this function returns will be returned as the result of the method call (unless after advise changes it).
		// example:
		//		If there are multiple "around" advisors, the most recent one is executed first,
		//		which can then delegate to the next one and so on. For example:
		//		|	around(obj, "foo", function(originalFoo){
		//		|		return function(){
		//		|			var start = new Date().getTime();
		//		|			var results = originalFoo.apply(this, arguments); // call the original
		//		|			var end = new Date().getTime();
		//		|			 0 && console.log("foo execution took " + (end - start) + " ms");
		//		|			return results;
		//		|		};
		//		|	});
		// target: Object
		//		This is the target object
		// methodName: String
		//		This is the name of the method to attach to.
		// advice: Function
		//		This is function to be called around the original method
	};
	=====*/

	return {
		// summary:
		//		provides aspect oriented programming functionality, allowing for
		//		one to add before, around, or after advice on existing methods.
		// example:
		//	|	define(["dojo/aspect"], function(aspect){
		//	|		var signal = aspect.after(targetObject, "methodName", function(someArgument){
		//	|			this will be called when targetObject.methodName() is called, after the original function is called
		//	|		});
		//
		// example:
		//	The returned signal object can be used to cancel the advice.
		//	|	signal.remove(); // this will stop the advice from being executed anymore
		//	|	aspect.before(targetObject, "methodName", function(someArgument){
		//	|		// this will be called when targetObject.methodName() is called, before the original function is called
		//	|	 });

		before: before,
		around: around,
		after: after
	};
});

},
'dojo/_base/event':function(){
define(["./kernel", "../on", "../has", "../dom-geometry"], function(dojo, on, has, dom){
	// module:
	//		dojo/_base/event

	if(on._fixEvent){
		var fixEvent = on._fixEvent;
		on._fixEvent = function(evt, se){
			// add some additional normalization for back-compat, this isn't in on.js because it is somewhat more expensive
			evt = fixEvent(evt, se);
			if(evt){
				dom.normalizeEvent(evt);
			}
			return evt;
		};		
	}
	
	var ret = {
		// summary:
		//		This module defines dojo DOM event API.   Usually you should use dojo/on, and evt.stopPropagation() +
		//		evt.preventDefault(), rather than this module.

		fix: function(/*Event*/ evt, /*DOMNode*/ sender){
			// summary:
			//		normalizes properties on the event object including event
			//		bubbling methods, keystroke normalization, and x/y positions
			// evt: Event
			//		native event object
			// sender: DOMNode
			//		node to treat as "currentTarget"
			if(on._fixEvent){
				return on._fixEvent(evt, sender);
			}
			return evt;	// Event
		},
	
		stop: function(/*Event*/ evt){
			// summary:
			//		prevents propagation and clobbers the default action of the
			//		passed event
			// evt: Event
			//		The event object. If omitted, window.event is used on IE.
			if(has("dom-addeventlistener") || (evt && evt.preventDefault)){
				evt.preventDefault();
				evt.stopPropagation();
			}else{
				evt = evt || window.event;
				evt.cancelBubble = true;
				on._preventDefault.call(evt);
			}
		}
	};

	if( 1 ){
		dojo.fixEvent = ret.fix;
		dojo.stopEvent = ret.stop;
	}

	return ret;
});

},
'dojo/dom-geometry':function(){
define(["./sniff", "./_base/window","./dom", "./dom-style"],
		function(has, win, dom, style){
	// module:
	//		dojo/dom-geometry

	// the result object
	var geom = {
		// summary:
		//		This module defines the core dojo DOM geometry API.
	};

	// Box functions will assume this model.
	// On IE/Opera, BORDER_BOX will be set if the primary document is in quirks mode.
	// Can be set to change behavior of box setters.

	// can be either:
	//	"border-box"
	//	"content-box" (default)
	geom.boxModel = "content-box";

	// We punt per-node box mode testing completely.
	// If anybody cares, we can provide an additional (optional) unit
	// that overrides existing code to include per-node box sensitivity.

	// Opera documentation claims that Opera 9 uses border-box in BackCompat mode.
	// but experiments (Opera 9.10.8679 on Windows Vista) indicate that it actually continues to use content-box.
	// IIRC, earlier versions of Opera did in fact use border-box.
	// Opera guys, this is really confusing. Opera being broken in quirks mode is not our fault.

	if(has("ie") /*|| has("opera")*/){
		// client code may have to adjust if compatMode varies across iframes
		geom.boxModel = document.compatMode == "BackCompat" ? "border-box" : "content-box";
	}

	geom.getPadExtents = function getPadExtents(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		Returns object with special values specifically useful for node
		//		fitting.
		// description:
		//		Returns an object with `w`, `h`, `l`, `t` properties:
		//	|		l/t/r/b = left/top/right/bottom padding (respectively)
		//	|		w = the total of the left and right padding
		//	|		h = the total of the top and bottom padding
		//		If 'node' has position, l/t forms the origin for child nodes.
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), px = style.toPixelValue,
			l = px(node, s.paddingLeft), t = px(node, s.paddingTop), r = px(node, s.paddingRight), b = px(node, s.paddingBottom);
		return {l: l, t: t, r: r, b: b, w: l + r, h: t + b};
	};

	var none = "none";

	geom.getBorderExtents = function getBorderExtents(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		returns an object with properties useful for noting the border
		//		dimensions.
		// description:
		//		- l/t/r/b = the sum of left/top/right/bottom border (respectively)
		//		- w = the sum of the left and right border
		//		- h = the sum of the top and bottom border
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var px = style.toPixelValue, s = computedStyle || style.getComputedStyle(node),
			l = s.borderLeftStyle != none ? px(node, s.borderLeftWidth) : 0,
			t = s.borderTopStyle != none ? px(node, s.borderTopWidth) : 0,
			r = s.borderRightStyle != none ? px(node, s.borderRightWidth) : 0,
			b = s.borderBottomStyle != none ? px(node, s.borderBottomWidth) : 0;
		return {l: l, t: t, r: r, b: b, w: l + r, h: t + b};
	};

	geom.getPadBorderExtents = function getPadBorderExtents(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		Returns object with properties useful for box fitting with
		//		regards to padding.
		// description:
		//		- l/t/r/b = the sum of left/top/right/bottom padding and left/top/right/bottom border (respectively)
		//		- w = the sum of the left and right padding and border
		//		- h = the sum of the top and bottom padding and border
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node),
			p = geom.getPadExtents(node, s),
			b = geom.getBorderExtents(node, s);
		return {
			l: p.l + b.l,
			t: p.t + b.t,
			r: p.r + b.r,
			b: p.b + b.b,
			w: p.w + b.w,
			h: p.h + b.h
		};
	};

	geom.getMarginExtents = function getMarginExtents(node, computedStyle){
		// summary:
		//		returns object with properties useful for box fitting with
		//		regards to box margins (i.e., the outer-box).
		//
		//		- l/t = marginLeft, marginTop, respectively
		//		- w = total width, margin inclusive
		//		- h = total height, margin inclusive
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), px = style.toPixelValue,
			l = px(node, s.marginLeft), t = px(node, s.marginTop), r = px(node, s.marginRight), b = px(node, s.marginBottom);
		return {l: l, t: t, r: r, b: b, w: l + r, h: t + b};
	};

	// Box getters work in any box context because offsetWidth/clientWidth
	// are invariant wrt box context
	//
	// They do *not* work for display: inline objects that have padding styles
	// because the user agent ignores padding (it's bogus styling in any case)
	//
	// Be careful with IMGs because they are inline or block depending on
	// browser and browser mode.

	// Although it would be easier to read, there are not separate versions of
	// _getMarginBox for each browser because:
	// 1. the branching is not expensive
	// 2. factoring the shared code wastes cycles (function call overhead)
	// 3. duplicating the shared code wastes bytes

	geom.getMarginBox = function getMarginBox(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		returns an object that encodes the width, height, left and top
		//		positions of the node's margin box.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), me = geom.getMarginExtents(node, s),
			l = node.offsetLeft - me.l, t = node.offsetTop - me.t, p = node.parentNode, px = style.toPixelValue, pcs;
		if(has("mozilla")){
			// Mozilla:
			// If offsetParent has a computed overflow != visible, the offsetLeft is decreased
			// by the parent's border.
			// We don't want to compute the parent's style, so instead we examine node's
			// computed left/top which is more stable.
			var sl = parseFloat(s.left), st = parseFloat(s.top);
			if(!isNaN(sl) && !isNaN(st)){
				l = sl;
				t = st;
			}else{
				// If child's computed left/top are not parseable as a number (e.g. "auto"), we
				// have no choice but to examine the parent's computed style.
				if(p && p.style){
					pcs = style.getComputedStyle(p);
					if(pcs.overflow != "visible"){
						l += pcs.borderLeftStyle != none ? px(node, pcs.borderLeftWidth) : 0;
						t += pcs.borderTopStyle != none ? px(node, pcs.borderTopWidth) : 0;
					}
				}
			}
		}else if(has("opera") || (has("ie") == 8 && !has("quirks"))){
			// On Opera and IE 8, offsetLeft/Top includes the parent's border
			if(p){
				pcs = style.getComputedStyle(p);
				l -= pcs.borderLeftStyle != none ? px(node, pcs.borderLeftWidth) : 0;
				t -= pcs.borderTopStyle != none ? px(node, pcs.borderTopWidth) : 0;
			}
		}
		return {l: l, t: t, w: node.offsetWidth + me.w, h: node.offsetHeight + me.h};
	};

	geom.getContentBox = function getContentBox(node, computedStyle){
		// summary:
		//		Returns an object that encodes the width, height, left and top
		//		positions of the node's content box, irrespective of the
		//		current box model.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		// clientWidth/Height are important since the automatically account for scrollbars
		// fallback to offsetWidth/Height for special cases (see #3378)
		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), w = node.clientWidth, h,
			pe = geom.getPadExtents(node, s), be = geom.getBorderExtents(node, s);
		if(!w){
			w = node.offsetWidth;
			h = node.offsetHeight;
		}else{
			h = node.clientHeight;
			be.w = be.h = 0;
		}
		// On Opera, offsetLeft includes the parent's border
		if(has("opera")){
			pe.l += be.l;
			pe.t += be.t;
		}
		return {l: pe.l, t: pe.t, w: w - pe.w - be.w, h: h - pe.h - be.h};
	};

	// Box setters depend on box context because interpretation of width/height styles
	// vary wrt box context.
	//
	// The value of boxModel is used to determine box context.
	// boxModel can be set directly to change behavior.
	//
	// Beware of display: inline objects that have padding styles
	// because the user agent ignores padding (it's a bogus setup anyway)
	//
	// Be careful with IMGs because they are inline or block depending on
	// browser and browser mode.
	//
	// Elements other than DIV may have special quirks, like built-in
	// margins or padding, or values not detectable via computedStyle.
	// In particular, margins on TABLE do not seems to appear
	// at all in computedStyle on Mozilla.

	function setBox(/*DomNode*/ node, /*Number?*/ l, /*Number?*/ t, /*Number?*/ w, /*Number?*/ h, /*String?*/ u){
		// summary:
		//		sets width/height/left/top in the current (native) box-model
		//		dimensions. Uses the unit passed in u.
		// node:
		//		DOM Node reference. Id string not supported for performance
		//		reasons.
		// l:
		//		left offset from parent.
		// t:
		//		top offset from parent.
		// w:
		//		width in current box model.
		// h:
		//		width in current box model.
		// u:
		//		unit measure to use for other measures. Defaults to "px".
		u = u || "px";
		var s = node.style;
		if(!isNaN(l)){
			s.left = l + u;
		}
		if(!isNaN(t)){
			s.top = t + u;
		}
		if(w >= 0){
			s.width = w + u;
		}
		if(h >= 0){
			s.height = h + u;
		}
	}

	function isButtonTag(/*DomNode*/ node){
		// summary:
		//		True if the node is BUTTON or INPUT.type="button".
		return node.tagName.toLowerCase() == "button" ||
			node.tagName.toLowerCase() == "input" && (node.getAttribute("type") || "").toLowerCase() == "button"; // boolean
	}

	function usesBorderBox(/*DomNode*/ node){
		// summary:
		//		True if the node uses border-box layout.

		// We could test the computed style of node to see if a particular box
		// has been specified, but there are details and we choose not to bother.

		// TABLE and BUTTON (and INPUT type=button) are always border-box by default.
		// If you have assigned a different box to either one via CSS then
		// box functions will break.

		return geom.boxModel == "border-box" || node.tagName.toLowerCase() == "table" || isButtonTag(node); // boolean
	}

	geom.setContentSize = function setContentSize(/*DomNode*/ node, /*Object*/ box, /*Object*/ computedStyle){
		// summary:
		//		Sets the size of the node's contents, irrespective of margins,
		//		padding, or borders.
		// node: DOMNode
		// box: Object
		//		hash with optional "w", and "h" properties for "width", and "height"
		//		respectively. All specified properties should have numeric values in whole pixels.
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var w = box.w, h = box.h;
		if(usesBorderBox(node)){
			var pb = geom.getPadBorderExtents(node, computedStyle);
			if(w >= 0){
				w += pb.w;
			}
			if(h >= 0){
				h += pb.h;
			}
		}
		setBox(node, NaN, NaN, w, h);
	};

	var nilExtents = {l: 0, t: 0, w: 0, h: 0};

	geom.setMarginBox = function setMarginBox(/*DomNode*/ node, /*Object*/ box, /*Object*/ computedStyle){
		// summary:
		//		sets the size of the node's margin box and placement
		//		(left/top), irrespective of box model. Think of it as a
		//		passthrough to setBox that handles box-model vagaries for
		//		you.
		// node: DOMNode
		// box: Object
		//		hash with optional "l", "t", "w", and "h" properties for "left", "right", "width", and "height"
		//		respectively. All specified properties should have numeric values in whole pixels.
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), w = box.w, h = box.h,
		// Some elements have special padding, margin, and box-model settings.
		// To use box functions you may need to set padding, margin explicitly.
		// Controlling box-model is harder, in a pinch you might set dojo/dom-geometry.boxModel.
			pb = usesBorderBox(node) ? nilExtents : geom.getPadBorderExtents(node, s),
			mb = geom.getMarginExtents(node, s);
		if(has("webkit")){
			// on Safari (3.1.2), button nodes with no explicit size have a default margin
			// setting an explicit size eliminates the margin.
			// We have to swizzle the width to get correct margin reading.
			if(isButtonTag(node)){
				var ns = node.style;
				if(w >= 0 && !ns.width){
					ns.width = "4px";
				}
				if(h >= 0 && !ns.height){
					ns.height = "4px";
				}
			}
		}
		if(w >= 0){
			w = Math.max(w - pb.w - mb.w, 0);
		}
		if(h >= 0){
			h = Math.max(h - pb.h - mb.h, 0);
		}
		setBox(node, box.l, box.t, w, h);
	};

	// =============================
	// Positioning
	// =============================

	geom.isBodyLtr = function isBodyLtr(/*Document?*/ doc){
		// summary:
		//		Returns true if the current language is left-to-right, and false otherwise.
		// doc: Document?
		//		Optional document to query.   If unspecified, use win.doc.
		// returns: Boolean

		doc = doc || win.doc;
		return (win.body(doc).dir || doc.documentElement.dir || "ltr").toLowerCase() == "ltr"; // Boolean
	};

	geom.docScroll = function docScroll(/*Document?*/ doc){
		// summary:
		//		Returns an object with {node, x, y} with corresponding offsets.
		// doc: Document?
		//		Optional document to query.   If unspecified, use win.doc.
		// returns: Object

		doc = doc || win.doc;
		var node = win.doc.parentWindow || win.doc.defaultView;   // use UI window, not dojo.global window.   TODO: use dojo/window::get() except for circular dependency problem
		return "pageXOffset" in node ? {x: node.pageXOffset, y: node.pageYOffset } :
			(node = has("quirks") ? win.body(doc) : doc.documentElement) &&
				{x: geom.fixIeBiDiScrollLeft(node.scrollLeft || 0, doc), y: node.scrollTop || 0 };
	};

	if(has("ie")){
		geom.getIeDocumentElementOffset = function getIeDocumentElementOffset(/*Document?*/ doc){
			// summary:
			//		returns the offset in x and y from the document body to the
			//		visual edge of the page for IE
			// doc: Document?
			//		Optional document to query.   If unspecified, use win.doc.
			// description:
			//		The following values in IE contain an offset:
			//	|		event.clientX
			//	|		event.clientY
			//	|		node.getBoundingClientRect().left
			//	|		node.getBoundingClientRect().top
			//		But other position related values do not contain this offset,
			//		such as node.offsetLeft, node.offsetTop, node.style.left and
			//		node.style.top. The offset is always (2, 2) in LTR direction.
			//		When the body is in RTL direction, the offset counts the width
			//		of left scroll bar's width.  This function computes the actual
			//		offset.

			//NOTE: assumes we're being called in an IE browser

			doc = doc || win.doc;
			var de = doc.documentElement; // only deal with HTML element here, position() handles body/quirks

			if(has("ie") < 8){
				var r = de.getBoundingClientRect(), // works well for IE6+
					l = r.left, t = r.top;
				if(has("ie") < 7){
					l += de.clientLeft;	// scrollbar size in strict/RTL, or,
					t += de.clientTop;	// HTML border size in strict
				}
				return {
					x: l < 0 ? 0 : l, // FRAME element border size can lead to inaccurate negative values
					y: t < 0 ? 0 : t
				};
			}else{
				return {
					x: 0,
					y: 0
				};
			}
		};
	}

	geom.fixIeBiDiScrollLeft = function fixIeBiDiScrollLeft(/*Integer*/ scrollLeft, /*Document?*/ doc){
		// summary:
		//		In RTL direction, scrollLeft should be a negative value, but IE
		//		returns a positive one. All codes using documentElement.scrollLeft
		//		must call this function to fix this error, otherwise the position
		//		will offset to right when there is a horizontal scrollbar.
		// scrollLeft: Number
		// doc: Document?
		//		Optional document to query.   If unspecified, use win.doc.
		// returns: Number

		// In RTL direction, scrollLeft should be a negative value, but IE
		// returns a positive one. All codes using documentElement.scrollLeft
		// must call this function to fix this error, otherwise the position
		// will offset to right when there is a horizontal scrollbar.

		doc = doc || win.doc;
		var ie = has("ie");
		if(ie && !geom.isBodyLtr(doc)){
			var qk = has("quirks"),
				de = qk ? win.body(doc) : doc.documentElement,
				pwin = win.global;	// TODO: use winUtils.get(doc) after resolving circular dependency b/w dom-geometry.js and dojo/window.js
			if(ie == 6 && !qk && pwin.frameElement && de.scrollHeight > de.clientHeight){
				scrollLeft += de.clientLeft; // workaround ie6+strict+rtl+iframe+vertical-scrollbar bug where clientWidth is too small by clientLeft pixels
			}
			return (ie < 8 || qk) ? (scrollLeft + de.clientWidth - de.scrollWidth) : -scrollLeft; // Integer
		}
		return scrollLeft; // Integer
	};

	geom.position = function(/*DomNode*/ node, /*Boolean?*/ includeScroll){
		// summary:
		//		Gets the position and size of the passed element relative to
		//		the viewport (if includeScroll==false), or relative to the
		//		document root (if includeScroll==true).
		//
		// description:
		//		Returns an object of the form:
		//		`{ x: 100, y: 300, w: 20, h: 15 }`.
		//		If includeScroll==true, the x and y values will include any
		//		document offsets that may affect the position relative to the
		//		viewport.
		//		Uses the border-box model (inclusive of border and padding but
		//		not margin).  Does not act as a setter.
		// node: DOMNode|String
		// includeScroll: Boolean?
		// returns: Object

		node = dom.byId(node);
		var	db = win.body(node.ownerDocument),
			ret = node.getBoundingClientRect();
		ret = {x: ret.left, y: ret.top, w: ret.right - ret.left, h: ret.bottom - ret.top};

		if(has("ie") < 9){
			// On IE<9 there's a 2px offset that we need to adjust for, see dojo.getIeDocumentElementOffset()
			var offset = geom.getIeDocumentElementOffset(node.ownerDocument);

			// fixes the position in IE, quirks mode
			ret.x -= offset.x + (has("quirks") ? db.clientLeft + db.offsetLeft : 0);
			ret.y -= offset.y + (has("quirks") ? db.clientTop + db.offsetTop : 0);
		}

		// account for document scrolling
		// if offsetParent is used, ret value already includes scroll position
		// so we may have to actually remove that value if !includeScroll
		if(includeScroll){
			var scroll = geom.docScroll(node.ownerDocument);
			ret.x += scroll.x;
			ret.y += scroll.y;
		}

		return ret; // Object
	};

	// random "private" functions wildly used throughout the toolkit

	geom.getMarginSize = function getMarginSize(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		returns an object that encodes the width and height of
		//		the node's margin box
		// node: DOMNode|String
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var me = geom.getMarginExtents(node, computedStyle || style.getComputedStyle(node));
		var size = node.getBoundingClientRect();
		return {
			w: (size.right - size.left) + me.w,
			h: (size.bottom - size.top) + me.h
		};
	};

	geom.normalizeEvent = function(event){
		// summary:
		//		Normalizes the geometry of a DOM event, normalizing the pageX, pageY,
		//		offsetX, offsetY, layerX, and layerX properties
		// event: Object
		if(!("layerX" in event)){
			event.layerX = event.offsetX;
			event.layerY = event.offsetY;
		}
		if(!has("dom-addeventlistener")){
			// old IE version
			// FIXME: scroll position query is duped from dojo/_base/html to
			// avoid dependency on that entire module. Now that HTML is in
			// Base, we should convert back to something similar there.
			var se = event.target;
			var doc = (se && se.ownerDocument) || document;
			// DO NOT replace the following to use dojo/_base/window.body(), in IE, document.documentElement should be used
			// here rather than document.body
			var docBody = has("quirks") ? doc.body : doc.documentElement;
			var offset = geom.getIeDocumentElementOffset(doc);
			event.pageX = event.clientX + geom.fixIeBiDiScrollLeft(docBody.scrollLeft || 0, doc) - offset.x;
			event.pageY = event.clientY + (docBody.scrollTop || 0) - offset.y;
		}
	};

	// TODO: evaluate separate getters/setters for position and sizes?

	return geom;
});

},
'dojo/_base/window':function(){
define(["./kernel", "./lang", "../sniff"], function(dojo, lang, has){
// module:
//		dojo/_base/window

var ret = {
	// summary:
	//		API to save/set/restore the global/document scope.

	global: dojo.global,
	/*=====
	 global: {
		 // summary:
		 //		Alias for the current window. 'global' can be modified
		 //		for temporary context shifting. See also withGlobal().
		 // description:
		 //		Use this rather than referring to 'window' to ensure your code runs
		 //		correctly in managed contexts.
	 },
	 =====*/

	doc: dojo.global["document"] || null,
	/*=====
	doc: {
		// summary:
		//		Alias for the current document. 'doc' can be modified
		//		for temporary context shifting. See also withDoc().
		// description:
		//		Use this rather than referring to 'window.document' to ensure your code runs
		//		correctly in managed contexts.
		// example:
		//	|	n.appendChild(dojo.doc.createElement('div'));
	},
	=====*/

	body: function(/*Document?*/ doc){
		// summary:
		//		Return the body element of the specified document or of dojo/_base/window::doc.
		// example:
		//	|	win.body().appendChild(dojo.doc.createElement('div'));

		// Note: document.body is not defined for a strict xhtml document
		// Would like to memoize this, but dojo.doc can change vi dojo.withDoc().
		doc = doc || dojo.doc;
		return doc.body || doc.getElementsByTagName("body")[0]; // Node
	},

	setContext: function(/*Object*/ globalObject, /*DocumentElement*/ globalDocument){
		// summary:
		//		changes the behavior of many core Dojo functions that deal with
		//		namespace and DOM lookup, changing them to work in a new global
		//		context (e.g., an iframe). The varibles dojo.global and dojo.doc
		//		are modified as a result of calling this function and the result of
		//		`dojo.body()` likewise differs.
		dojo.global = ret.global = globalObject;
		dojo.doc = ret.doc = globalDocument;
	},

	withGlobal: function(	/*Object*/ globalObject,
							/*Function*/ callback,
							/*Object?*/ thisObject,
							/*Array?*/ cbArguments){
		// summary:
		//		Invoke callback with globalObject as dojo.global and
		//		globalObject.document as dojo.doc.
		// description:
		//		Invoke callback with globalObject as dojo.global and
		//		globalObject.document as dojo.doc. If provided, globalObject
		//		will be executed in the context of object thisObject
		//		When callback() returns or throws an error, the dojo.global
		//		and dojo.doc will be restored to its previous state.

		var oldGlob = dojo.global;
		try{
			dojo.global = ret.global = globalObject;
			return ret.withDoc.call(null, globalObject.document, callback, thisObject, cbArguments);
		}finally{
			dojo.global = ret.global = oldGlob;
		}
	},

	withDoc: function(	/*DocumentElement*/ documentObject,
						/*Function*/ callback,
						/*Object?*/ thisObject,
						/*Array?*/ cbArguments){
		// summary:
		//		Invoke callback with documentObject as dojo/_base/window::doc.
		// description:
		//		Invoke callback with documentObject as dojo/_base/window::doc. If provided,
		//		callback will be executed in the context of object thisObject
		//		When callback() returns or throws an error, the dojo/_base/window::doc will
		//		be restored to its previous state.

		var oldDoc = ret.doc,
			oldQ = has("quirks"),
			oldIE = has("ie"), isIE, mode, pwin;

		try{
			dojo.doc = ret.doc = documentObject;
			// update dojo.isQuirks and the value of the has feature "quirks".
			// remove setting dojo.isQuirks and dojo.isIE for 2.0
			dojo.isQuirks = has.add("quirks", dojo.doc.compatMode == "BackCompat", true, true); // no need to check for QuirksMode which was Opera 7 only

			if(has("ie")){
				if((pwin = documentObject.parentWindow) && pwin.navigator){
					// re-run IE detection logic and update dojo.isIE / has("ie")
					// (the only time parentWindow/navigator wouldn't exist is if we were not
					// passed an actual legitimate document object)
					isIE = parseFloat(pwin.navigator.appVersion.split("MSIE ")[1]) || undefined;
					mode = documentObject.documentMode;
					if(mode && mode != 5 && Math.floor(isIE) != mode){
						isIE = mode;
					}
					dojo.isIE = has.add("ie", isIE, true, true);
				}
			}

			if(thisObject && typeof callback == "string"){
				callback = thisObject[callback];
			}

			return callback.apply(thisObject, cbArguments || []);
		}finally{
			dojo.doc = ret.doc = oldDoc;
			dojo.isQuirks = has.add("quirks", oldQ, true, true);
			dojo.isIE = has.add("ie", oldIE, true, true);
		}
	}
};

 1  && lang.mixin(dojo, ret);

return ret;

});

},
'dojo/dom':function(){
define(["./sniff", "./_base/window"],
		function(has, win){
	// module:
	//		dojo/dom

	// FIXME: need to add unit tests for all the semi-public methods

	if(has("ie") <= 7){
		try{
			document.execCommand("BackgroundImageCache", false, true);
		}catch(e){
			// sane browsers don't have cache "issues"
		}
	}

	// =============================
	// DOM Functions
	// =============================

	// the result object
	var dom = {
		// summary:
		//		This module defines the core dojo DOM API.
	};

	if(has("ie")){
		dom.byId = function(id, doc){
			if(typeof id != "string"){
				return id;
			}
			var _d = doc || win.doc, te = id && _d.getElementById(id);
			// attributes.id.value is better than just id in case the
			// user has a name=id inside a form
			if(te && (te.attributes.id.value == id || te.id == id)){
				return te;
			}else{
				var eles = _d.all[id];
				if(!eles || eles.nodeName){
					eles = [eles];
				}
				// if more than 1, choose first with the correct id
				var i = 0;
				while((te = eles[i++])){
					if((te.attributes && te.attributes.id && te.attributes.id.value == id) || te.id == id){
						return te;
					}
				}
			}
		};
	}else{
		dom.byId = function(id, doc){
			// inline'd type check.
			// be sure to return null per documentation, to match IE branch.
			return ((typeof id == "string") ? (doc || win.doc).getElementById(id) : id) || null; // DOMNode
		};
	}
	/*=====
	 dom.byId = function(id, doc){
		// summary:
		//		Returns DOM node with matching `id` attribute or falsy value (ex: null or undefined)
		//		if not found.  If `id` is a DomNode, this function is a no-op.
		//
		// id: String|DOMNode
		//		A string to match an HTML id attribute or a reference to a DOM Node
		//
		// doc: Document?
		//		Document to work in. Defaults to the current value of
		//		dojo/_base/window.doc.  Can be used to retrieve
		//		node references from other documents.
		//
		// example:
		//		Look up a node by ID:
		//	|	require(["dojo/dom"], function(dom){
		//	|		var n = dom.byId("foo");
		//	|	});
		//
		// example:
		//		Check if a node exists, and use it.
		//	|	require(["dojo/dom"], function(dom){
		//	|		var n = dom.byId("bar");
		//	|		if(n){ doStuff() ... }
		//	|	});
		//
		// example:
		//		Allow string or DomNode references to be passed to a custom function:
		//	|	require(["dojo/dom"], function(dom){
		//	|		var foo = function(nodeOrId){
		//	|			nodeOrId = dom.byId(nodeOrId);
		//	|			// ... more stuff
		//	|		}
		//	|	});
	 };
	 =====*/

	dom.isDescendant = function(/*DOMNode|String*/ node, /*DOMNode|String*/ ancestor){
		// summary:
		//		Returns true if node is a descendant of ancestor
		// node: DOMNode|String
		//		string id or node reference to test
		// ancestor: DOMNode|String
		//		string id or node reference of potential parent to test against
		//
		// example:
		//		Test is node id="bar" is a descendant of node id="foo"
		//	|	require(["dojo/dom"], function(dom){
		//	|		if(dom.isDescendant("bar", "foo")){ ... }
		//	|	});

		try{
			node = dom.byId(node);
			ancestor = dom.byId(ancestor);
			while(node){
				if(node == ancestor){
					return true; // Boolean
				}
				node = node.parentNode;
			}
		}catch(e){ /* squelch, return false */ }
		return false; // Boolean
	};


	// TODO: do we need setSelectable in the base?

	// Add feature test for user-select CSS property
	// (currently known to work in all but IE < 10 and Opera)
	// TODO: The user-select CSS property as of May 2014 is no longer part of
	// any CSS specification. In IE, -ms-user-select does not do the same thing
	// as the unselectable attribute on elements; namely, dijit Editor buttons
	// do not properly prevent the content of the editable content frame from
	// unblurring. As a result, the -ms- prefixed version is omitted here.
	has.add("css-user-select", function(global, doc, element){
		// Avoid exception when dom.js is loaded in non-browser environments
		if(!element){ return false; }
		
		var style = element.style;
		var prefixes = ["Khtml", "O", "Moz", "Webkit"],
			i = prefixes.length,
			name = "userSelect",
			prefix;

		// Iterate prefixes from most to least likely
		do{
			if(typeof style[name] !== "undefined"){
				// Supported; return property name
				return name;
			}
		}while(i-- && (name = prefixes[i] + "UserSelect"));

		// Not supported if we didn't return before now
		return false;
	});

	/*=====
	dom.setSelectable = function(node, selectable){
		// summary:
		//		Enable or disable selection on a node
		// node: DOMNode|String
		//		id or reference to node
		// selectable: Boolean
		//		state to put the node in. false indicates unselectable, true
		//		allows selection.
		// example:
		//		Make the node id="bar" unselectable
		//	|	require(["dojo/dom"], function(dom){
		//	|		dom.setSelectable("bar");
		//	|	});
		// example:
		//		Make the node id="bar" selectable
		//	|	require(["dojo/dom"], function(dom){
		//	|		dom.setSelectable("bar", true);
		//	|	});
	};
	=====*/

	var cssUserSelect = has("css-user-select");
	dom.setSelectable = cssUserSelect ? function(node, selectable){
		// css-user-select returns a (possibly vendor-prefixed) CSS property name
		dom.byId(node).style[cssUserSelect] = selectable ? "" : "none";
	} : function(node, selectable){
		node = dom.byId(node);

		// (IE < 10 / Opera) Fall back to setting/removing the
		// unselectable attribute on the element and all its children
		var nodes = node.getElementsByTagName("*"),
			i = nodes.length;

		if(selectable){
			node.removeAttribute("unselectable");
			while(i--){
				nodes[i].removeAttribute("unselectable");
			}
		}else{
			node.setAttribute("unselectable", "on");
			while(i--){
				nodes[i].setAttribute("unselectable", "on");
			}
		}
	};

	return dom;
});

},
'dojo/dom-style':function(){
define(["./sniff", "./dom"], function(has, dom){
	// module:
	//		dojo/dom-style

	// =============================
	// Style Functions
	// =============================

	// getComputedStyle drives most of the style code.
	// Wherever possible, reuse the returned object.
	//
	// API functions below that need to access computed styles accept an
	// optional computedStyle parameter.
	// If this parameter is omitted, the functions will call getComputedStyle themselves.
	// This way, calling code can access computedStyle once, and then pass the reference to
	// multiple API functions.

	// Although we normally eschew argument validation at this
	// level, here we test argument 'node' for (duck)type,
	// by testing nodeType, ecause 'document' is the 'parentNode' of 'body'
	// it is frequently sent to this function even
	// though it is not Element.
	var getComputedStyle, style = {
		// summary:
		//		This module defines the core dojo DOM style API.
	};
	if(has("webkit")){
		getComputedStyle = function(/*DomNode*/ node){
			var s;
			if(node.nodeType == 1){
				var dv = node.ownerDocument.defaultView;
				s = dv.getComputedStyle(node, null);
				if(!s && node.style){
					node.style.display = "";
					s = dv.getComputedStyle(node, null);
				}
			}
			return s || {};
		};
	}else if(has("ie") && (has("ie") < 9 || has("quirks"))){
		getComputedStyle = function(node){
			// IE (as of 7) doesn't expose Element like sane browsers
			// currentStyle can be null on IE8!
			return node.nodeType == 1 /* ELEMENT_NODE*/ && node.currentStyle ? node.currentStyle : {};
		};
	}else{
		getComputedStyle = function(node){
			return node.nodeType == 1 /* ELEMENT_NODE*/ ?
				node.ownerDocument.defaultView.getComputedStyle(node, null) : {};
		};
	}
	style.getComputedStyle = getComputedStyle;
	/*=====
	style.getComputedStyle = function(node){
		// summary:
		//		Returns a "computed style" object.
		//
		// description:
		//		Gets a "computed style" object which can be used to gather
		//		information about the current state of the rendered node.
		//
		//		Note that this may behave differently on different browsers.
		//		Values may have different formats and value encodings across
		//		browsers.
		//
		//		Note also that this method is expensive.  Wherever possible,
		//		reuse the returned object.
		//
		//		Use the dojo/dom-style.get() method for more consistent (pixelized)
		//		return values.
		//
		// node: DOMNode
		//		A reference to a DOM node. Does NOT support taking an
		//		ID string for speed reasons.
		// example:
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		domStyle.getComputedStyle(dom.byId('foo')).borderWidth;
		//	|	});
		//
		// example:
		//		Reusing the returned object, avoiding multiple lookups:
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		var cs = domStyle.getComputedStyle(dom.byId("someNode"));
		//	|		var w = cs.width, h = cs.height;
		//	|	});
		return; // CSS2Properties
	};
	=====*/

	var toPixel;
	if(!has("ie")){
		toPixel = function(element, value){
			// style values can be floats, client code may want
			// to round for integer pixels.
			return parseFloat(value) || 0;
		};
	}else{
		toPixel = function(element, avalue){
			if(!avalue){ return 0; }
			// on IE7, medium is usually 4 pixels
			if(avalue == "medium"){ return 4; }
			// style values can be floats, client code may
			// want to round this value for integer pixels.
			if(avalue.slice && avalue.slice(-2) == 'px'){ return parseFloat(avalue); }
			var s = element.style, rs = element.runtimeStyle, cs = element.currentStyle,
				sLeft = s.left, rsLeft = rs.left;
			rs.left = cs.left;
			try{
				// 'avalue' may be incompatible with style.left, which can cause IE to throw
				// this has been observed for border widths using "thin", "medium", "thick" constants
				// those particular constants could be trapped by a lookup
				// but perhaps there are more
				s.left = avalue;
				avalue = s.pixelLeft;
			}catch(e){
				avalue = 0;
			}
			s.left = sLeft;
			rs.left = rsLeft;
			return avalue;
		};
	}
	style.toPixelValue = toPixel;
	/*=====
	style.toPixelValue = function(node, value){
		// summary:
		//		converts style value to pixels on IE or return a numeric value.
		// node: DOMNode
		// value: String
		// returns: Number
	};
	=====*/

	// FIXME: there opacity quirks on FF that we haven't ported over. Hrm.

	var astr = "DXImageTransform.Microsoft.Alpha";
	var af = function(n, f){
		try{
			return n.filters.item(astr);
		}catch(e){
			return f ? {} : null;
		}
	};

	var _getOpacity =
		has("ie") < 9 || (has("ie") < 10 && has("quirks")) ? function(node){
			try{
				return af(node).Opacity / 100; // Number
			}catch(e){
				return 1; // Number
			}
		} :
		function(node){
			return getComputedStyle(node).opacity;
		};

	var _setOpacity =
		has("ie") < 9 || (has("ie") < 10 && has("quirks")) ? function(/*DomNode*/ node, /*Number*/ opacity){
			if(opacity === ""){ opacity = 1; }
			var ov = opacity * 100, fullyOpaque = opacity === 1;

			// on IE7 Alpha(Filter opacity=100) makes text look fuzzy so disable it altogether (bug #2661),
			// but still update the opacity value so we can get a correct reading if it is read later:
			// af(node, 1).Enabled = !fullyOpaque;

			if(fullyOpaque){
				node.style.zoom = "";
				if(af(node)){
					node.style.filter = node.style.filter.replace(
						new RegExp("\\s*progid:" + astr + "\\([^\\)]+?\\)", "i"), "");
				}
			}else{
				node.style.zoom = 1;
				if(af(node)){
					af(node, 1).Opacity = ov;
				}else{
					node.style.filter += " progid:" + astr + "(Opacity=" + ov + ")";
				}
				af(node, 1).Enabled = true;
			}

			if(node.tagName.toLowerCase() == "tr"){
				for(var td = node.firstChild; td; td = td.nextSibling){
					if(td.tagName.toLowerCase() == "td"){
						_setOpacity(td, opacity);
					}
				}
			}
			return opacity;
		} :
		function(node, opacity){
			return node.style.opacity = opacity;
		};

	var _pixelNamesCache = {
		left: true, top: true
	};
	var _pixelRegExp = /margin|padding|width|height|max|min|offset/; // |border
	function _toStyleValue(node, type, value){
		//TODO: should we really be doing string case conversion here? Should we cache it? Need to profile!
		type = type.toLowerCase();
		if(has("ie") || has("trident")){
			if(value == "auto"){
				if(type == "height"){ return node.offsetHeight; }
				if(type == "width"){ return node.offsetWidth; }
			}
			if(type == "fontweight"){
				switch(value){
					case 700: return "bold";
					case 400:
					default: return "normal";
				}
			}
		}
		if(!(type in _pixelNamesCache)){
			_pixelNamesCache[type] = _pixelRegExp.test(type);
		}
		return _pixelNamesCache[type] ? toPixel(node, value) : value;
	}

	var _floatAliases = {cssFloat: 1, styleFloat: 1, "float": 1};

	// public API

	style.get = function getStyle(/*DOMNode|String*/ node, /*String?*/ name){
		// summary:
		//		Accesses styles on a node.
		// description:
		//		Getting the style value uses the computed style for the node, so the value
		//		will be a calculated value, not just the immediate node.style value.
		//		Also when getting values, use specific style names,
		//		like "borderBottomWidth" instead of "border" since compound values like
		//		"border" are not necessarily reflected as expected.
		//		If you want to get node dimensions, use `dojo/dom-geometry.getMarginBox()`,
		//		`dojo/dom-geometry.getContentBox()` or `dojo/dom-geometry.getPosition()`.
		// node: DOMNode|String
		//		id or reference to node to get style for
		// name: String?
		//		the style property to get
		// example:
		//		Passing only an ID or node returns the computed style object of
		//		the node:
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		domStyle.get("thinger");
		//	|	});
		// example:
		//		Passing a node and a style property returns the current
		//		normalized, computed value for that property:
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		domStyle.get("thinger", "opacity"); // 1 by default
		//	|	});

		var n = dom.byId(node), l = arguments.length, op = (name == "opacity");
		if(l == 2 && op){
			return _getOpacity(n);
		}
		name = _floatAliases[name] ? "cssFloat" in n.style ? "cssFloat" : "styleFloat" : name;
		var s = style.getComputedStyle(n);
		return (l == 1) ? s : _toStyleValue(n, name, s[name] || n.style[name]); /* CSS2Properties||String||Number */
	};

	style.set = function setStyle(/*DOMNode|String*/ node, /*String|Object*/ name, /*String?*/ value){
		// summary:
		//		Sets styles on a node.
		// node: DOMNode|String
		//		id or reference to node to set style for
		// name: String|Object
		//		the style property to set in DOM-accessor format
		//		("borderWidth", not "border-width") or an object with key/value
		//		pairs suitable for setting each property.
		// value: String?
		//		If passed, sets value on the node for style, handling
		//		cross-browser concerns.  When setting a pixel value,
		//		be sure to include "px" in the value. For instance, top: "200px".
		//		Otherwise, in some cases, some browsers will not apply the style.
		//
		// example:
		//		Passing a node, a style property, and a value changes the
		//		current display of the node and returns the new computed value
		//	|	require(["dojo/dom-style"], function(domStyle){
		//	|		domStyle.set("thinger", "opacity", 0.5); // == 0.5
		//	|	});
		//
		// example:
		//		Passing a node, an object-style style property sets each of the values in turn and returns the computed style object of the node:
		//	|	require(["dojo/dom-style"], function(domStyle){
		//	|		domStyle.set("thinger", {
		//	|			"opacity": 0.5,
		//	|			"border": "3px solid black",
		//	|			"height": "300px"
		//	|		});
		//	|	});
		//
		// example:
		//		When the CSS style property is hyphenated, the JavaScript property is camelCased.
		//		font-size becomes fontSize, and so on.
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		domStyle.set("thinger",{
		//	|			fontSize:"14pt",
		//	|			letterSpacing:"1.2em"
		//	|		});
		//	|	});
		//
		// example:
		//		dojo/NodeList implements .style() using the same syntax, omitting the "node" parameter, calling
		//		dojo/dom-style.get() on every element of the list. See: `dojo/query` and `dojo/NodeList`
		//	|	require(["dojo/dom-style", "dojo/query", "dojo/NodeList-dom"],
		//	|	function(domStyle, query){
		//	|		query(".someClassName").style("visibility","hidden");
		//	|		// or
		//	|		query("#baz > div").style({
		//	|			opacity:0.75,
		//	|			fontSize:"13pt"
		//	|		});
		//	|	});

		var n = dom.byId(node), l = arguments.length, op = (name == "opacity");
		name = _floatAliases[name] ? "cssFloat" in n.style ? "cssFloat" : "styleFloat" : name;
		if(l == 3){
			return op ? _setOpacity(n, value) : n.style[name] = value; // Number
		}
		for(var x in name){
			style.set(node, x, name[x]);
		}
		return style.getComputedStyle(n);
	};

	return style;
});

},
'dojo/mouse':function(){
define(["./_base/kernel", "./on", "./has", "./dom", "./_base/window"], function(dojo, on, has, dom, win){

	// module:
	//		dojo/mouse

    has.add("dom-quirks", win.doc && win.doc.compatMode == "BackCompat");
	has.add("events-mouseenter", win.doc && "onmouseenter" in win.doc.createElement("div"));
	has.add("events-mousewheel", win.doc && 'onmousewheel' in win.doc);

	var mouseButtons;
	if((has("dom-quirks") && has("ie")) || !has("dom-addeventlistener")){
		mouseButtons = {
			LEFT:   1,
			MIDDLE: 4,
			RIGHT:  2,
			// helper functions
			isButton: function(e, button){ return e.button & button; },
			isLeft:   function(e){ return e.button & 1; },
			isMiddle: function(e){ return e.button & 4; },
			isRight:  function(e){ return e.button & 2; }
		};
	}else{
		mouseButtons = {
			LEFT:   0,
			MIDDLE: 1,
			RIGHT:  2,
			// helper functions
			isButton: function(e, button){ return e.button == button; },
			isLeft:   function(e){ return e.button == 0; },
			isMiddle: function(e){ return e.button == 1; },
			isRight:  function(e){ return e.button == 2; }
		};
	}
	dojo.mouseButtons = mouseButtons;

/*=====
	dojo.mouseButtons = {
		// LEFT: Number
		//		Numeric value of the left mouse button for the platform.
		LEFT:   0,
		// MIDDLE: Number
		//		Numeric value of the middle mouse button for the platform.
		MIDDLE: 1,
		// RIGHT: Number
		//		Numeric value of the right mouse button for the platform.
		RIGHT:  2,

		isButton: function(e, button){
			// summary:
			//		Checks an event object for a pressed button
			// e: Event
			//		Event object to examine
			// button: Number
			//		The button value (example: dojo.mouseButton.LEFT)
			return e.button == button; // Boolean
		},
		isLeft: function(e){
			// summary:
			//		Checks an event object for the pressed left button
			// e: Event
			//		Event object to examine
			return e.button == 0; // Boolean
		},
		isMiddle: function(e){
			// summary:
			//		Checks an event object for the pressed middle button
			// e: Event
			//		Event object to examine
			return e.button == 1; // Boolean
		},
		isRight: function(e){
			// summary:
			//		Checks an event object for the pressed right button
			// e: Event
			//		Event object to examine
			return e.button == 2; // Boolean
		}
	};
=====*/

	function eventHandler(type, selectHandler){
		// emulation of mouseenter/leave with mouseover/out using descendant checking
		var handler = function(node, listener){
			return on(node, type, function(evt){
				if(selectHandler){
					return selectHandler(evt, listener);
				}
				if(!dom.isDescendant(evt.relatedTarget, node)){
					return listener.call(this, evt);
				}
			});
		};
		handler.bubble = function(select){
			return eventHandler(type, function(evt, listener){
				// using a selector, use the select function to determine if the mouse moved inside the selector and was previously outside the selector
				var target = select(evt.target);
				var relatedTarget = evt.relatedTarget;
				if(target && (target != (relatedTarget && relatedTarget.nodeType == 1 && select(relatedTarget)))){
					return listener.call(target, evt);
				} 
			});
		};
		return handler;
	}
	var wheel;
	if(has("events-mousewheel")){
		wheel = 'mousewheel';
	}else{ //firefox
		wheel = function(node, listener){
			return on(node, 'DOMMouseScroll', function(evt){
				evt.wheelDelta = -evt.detail;
				listener.call(this, evt);
			});
		};
	}
	return {
		// summary:
		//		This module provide mouse event handling utility functions and exports
		//		mouseenter and mouseleave event emulation.
		// example:
		//		To use these events, you register a mouseenter like this:
		//		|	define(["dojo/on", "dojo/mouse"], function(on, mouse){
		//		|		on(targetNode, mouse.enter, function(event){
		//		|			dojo.addClass(targetNode, "highlighted");
		//		|		});
		//		|		on(targetNode, mouse.leave, function(event){
		//		|			dojo.removeClass(targetNode, "highlighted");
		//		|		});

		_eventHandler: eventHandler,		// for dojo/touch

		// enter: Synthetic Event
		//		This is an extension event for the mouseenter that IE provides, emulating the
		//		behavior on other browsers.
		enter: eventHandler("mouseover"),

		// leave: Synthetic Event
		//		This is an extension event for the mouseleave that IE provides, emulating the
		//		behavior on other browsers.
		leave: eventHandler("mouseout"),

		// wheel: Normalized Mouse Wheel Event
		//		This is an extension event for the mousewheel that non-Mozilla browsers provide,
		//		emulating the behavior on Mozilla based browsers.
		wheel: wheel,

		isLeft: mouseButtons.isLeft,
		/*=====
		isLeft: function(){
			// summary:
			//		Test an event object (from a mousedown event) to see if the left button was pressed.
		},
		=====*/

		isMiddle: mouseButtons.isMiddle,
		/*=====
		 isMiddle: function(){
			 // summary:
			 //		Test an event object (from a mousedown event) to see if the middle button was pressed.
		 },
		 =====*/

		isRight: mouseButtons.isRight
		/*=====
		 , isRight: function(){
			 // summary:
			 //		Test an event object (from a mousedown event) to see if the right button was pressed.
		 }
		 =====*/
	};
});

},
'dojo/_base/sniff':function(){
define(["./kernel", "./lang", "../sniff"], function(dojo, lang, has){
	// module:
	//		dojo/_base/sniff

	/*=====
	return {
		// summary:
		//		Deprecated.   New code should use dojo/sniff.
		//		This module populates the dojo browser version sniffing properties like dojo.isIE.
	};
	=====*/

	if(! 1 ){
		return has;
	}

	// no idea what this is for, or if it's used
	dojo._name = "browser";

	lang.mixin(dojo, {
		// isBrowser: Boolean
		//		True if the client is a web-browser
		isBrowser: true,

		// isFF: Number|undefined
		//		Version as a Number if client is FireFox. undefined otherwise. Corresponds to
		//		major detected FireFox version (1.5, 2, 3, etc.)
		isFF: has("ff"),

		// isIE: Number|undefined
		//		Version as a Number if client is MSIE(PC). undefined otherwise. Corresponds to
		//		major detected IE version (6, 7, 8, etc.)
		isIE: has("ie"),

		// isKhtml: Number|undefined
		//		Version as a Number if client is a KHTML browser. undefined otherwise. Corresponds to major
		//		detected version.
		isKhtml: has("khtml"),

		// isWebKit: Number|undefined
		//		Version as a Number if client is a WebKit-derived browser (Konqueror,
		//		Safari, Chrome, etc.). undefined otherwise.
		isWebKit: has("webkit"),

		// isMozilla: Number|undefined
		//		Version as a Number if client is a Mozilla-based browser (Firefox,
		//		SeaMonkey). undefined otherwise. Corresponds to major detected version.
		isMozilla: has("mozilla"),
		// isMoz: Number|undefined
		//		Version as a Number if client is a Mozilla-based browser (Firefox,
		//		SeaMonkey). undefined otherwise. Corresponds to major detected version.
		isMoz: has("mozilla"),

		// isOpera: Number|undefined
		//		Version as a Number if client is Opera. undefined otherwise. Corresponds to
		//		major detected version.
		isOpera: has("opera"),

		// isSafari: Number|undefined
		//		Version as a Number if client is Safari or iPhone. undefined otherwise.
		isSafari: has("safari"),

		// isChrome: Number|undefined
		//		Version as a Number if client is Chrome browser. undefined otherwise.
		isChrome: has("chrome"),

		// isMac: Boolean
		//		True if the client runs on Mac
		isMac: has("mac"),

		// isIos: Number|undefined
		//		Version as a Number if client is iPhone, iPod, or iPad. undefined otherwise.
		isIos: has("ios"),

		// isAndroid: Number|undefined
		//		Version as a Number if client is android browser. undefined otherwise.
		isAndroid: has("android"),

		// isWii: Boolean
		//		True if client is Wii
		isWii: has("wii"),

		// isQuirks: Boolean
		//		Page is in quirks mode.
		isQuirks: has("quirks"),

		// isAir: Boolean
		//		True if client is Adobe Air
		isAir: has("air")
	});

	return has;
});

},
'dojo/keys':function(){
define(["./_base/kernel", "./sniff"], function(dojo, has){

	// module:
	//		dojo/keys

	return dojo.keys = {
		// summary:
		//		Definitions for common key values.  Client code should test keyCode against these named constants,
		//		as the actual codes can vary by browser.

		BACKSPACE: 8,
		TAB: 9,
		CLEAR: 12,
		ENTER: 13,
		SHIFT: 16,
		CTRL: 17,
		ALT: 18,
		META: has("webkit") ? 91 : 224,		// the apple key on macs
		PAUSE: 19,
		CAPS_LOCK: 20,
		ESCAPE: 27,
		SPACE: 32,
		PAGE_UP: 33,
		PAGE_DOWN: 34,
		END: 35,
		HOME: 36,
		LEFT_ARROW: 37,
		UP_ARROW: 38,
		RIGHT_ARROW: 39,
		DOWN_ARROW: 40,
		INSERT: 45,
		DELETE: 46,
		HELP: 47,
		LEFT_WINDOW: 91,
		RIGHT_WINDOW: 92,
		SELECT: 93,
		NUMPAD_0: 96,
		NUMPAD_1: 97,
		NUMPAD_2: 98,
		NUMPAD_3: 99,
		NUMPAD_4: 100,
		NUMPAD_5: 101,
		NUMPAD_6: 102,
		NUMPAD_7: 103,
		NUMPAD_8: 104,
		NUMPAD_9: 105,
		NUMPAD_MULTIPLY: 106,
		NUMPAD_PLUS: 107,
		NUMPAD_ENTER: 108,
		NUMPAD_MINUS: 109,
		NUMPAD_PERIOD: 110,
		NUMPAD_DIVIDE: 111,
		F1: 112,
		F2: 113,
		F3: 114,
		F4: 115,
		F5: 116,
		F6: 117,
		F7: 118,
		F8: 119,
		F9: 120,
		F10: 121,
		F11: 122,
		F12: 123,
		F13: 124,
		F14: 125,
		F15: 126,
		NUM_LOCK: 144,
		SCROLL_LOCK: 145,
		UP_DPAD: 175,
		DOWN_DPAD: 176,
		LEFT_DPAD: 177,
		RIGHT_DPAD: 178,
		// virtual key mapping
		copyKey: has("mac") && !has("air") ? (has("safari") ? 91 : 224 ) : 17
	};
});

},
'dojo/_base/Deferred':function(){
define([
	"./kernel",
	"../Deferred",
	"../promise/Promise",
	"../errors/CancelError",
	"../has",
	"./lang",
	"../when"
], function(dojo, NewDeferred, Promise, CancelError, has, lang, when){
	// module:
	//		dojo/_base/Deferred

	var mutator = function(){};
	var freeze = Object.freeze || function(){};
	// A deferred provides an API for creating and resolving a promise.
	var Deferred = dojo.Deferred = function(/*Function?*/ canceller){
		// summary:
		//		Deprecated.   This module defines the legacy dojo/_base/Deferred API.
		//		New code should use dojo/Deferred instead.
		// description:
		//		The Deferred API is based on the concept of promises that provide a
		//		generic interface into the eventual completion of an asynchronous action.
		//		The motivation for promises fundamentally is about creating a
		//		separation of concerns that allows one to achieve the same type of
		//		call patterns and logical data flow in asynchronous code as can be
		//		achieved in synchronous code. Promises allows one
		//		to be able to call a function purely with arguments needed for
		//		execution, without conflating the call with concerns of whether it is
		//		sync or async. One shouldn't need to alter a call's arguments if the
		//		implementation switches from sync to async (or vice versa). By having
		//		async functions return promises, the concerns of making the call are
		//		separated from the concerns of asynchronous interaction (which are
		//		handled by the promise).
		//
		//		The Deferred is a type of promise that provides methods for fulfilling the
		//		promise with a successful result or an error. The most important method for
		//		working with Dojo's promises is the then() method, which follows the
		//		CommonJS proposed promise API. An example of using a Dojo promise:
		//
		//		|	var resultingPromise = someAsyncOperation.then(function(result){
		//		|		... handle result ...
		//		|	},
		//		|	function(error){
		//		|		... handle error ...
		//		|	});
		//
		//		The .then() call returns a new promise that represents the result of the
		//		execution of the callback. The callbacks will never affect the original promises value.
		//
		//		The Deferred instances also provide the following functions for backwards compatibility:
		//
		//		- addCallback(handler)
		//		- addErrback(handler)
		//		- callback(result)
		//		- errback(result)
		//
		//		Callbacks are allowed to return promises themselves, so
		//		you can build complicated sequences of events with ease.
		//
		//		The creator of the Deferred may specify a canceller.  The canceller
		//		is a function that will be called if Deferred.cancel is called
		//		before the Deferred fires. You can use this to implement clean
		//		aborting of an XMLHttpRequest, etc. Note that cancel will fire the
		//		deferred with a CancelledError (unless your canceller returns
		//		another kind of error), so the errbacks should be prepared to
		//		handle that error for cancellable Deferreds.
		// example:
		//	|	var deferred = new Deferred();
		//	|	setTimeout(function(){ deferred.callback({success: true}); }, 1000);
		//	|	return deferred;
		// example:
		//		Deferred objects are often used when making code asynchronous. It
		//		may be easiest to write functions in a synchronous manner and then
		//		split code using a deferred to trigger a response to a long-lived
		//		operation. For example, instead of register a callback function to
		//		denote when a rendering operation completes, the function can
		//		simply return a deferred:
		//
		//		|	// callback style:
		//		|	function renderLotsOfData(data, callback){
		//		|		var success = false
		//		|		try{
		//		|			for(var x in data){
		//		|				renderDataitem(data[x]);
		//		|			}
		//		|			success = true;
		//		|		}catch(e){ }
		//		|		if(callback){
		//		|			callback(success);
		//		|		}
		//		|	}
		//
		//		|	// using callback style
		//		|	renderLotsOfData(someDataObj, function(success){
		//		|		// handles success or failure
		//		|		if(!success){
		//		|			promptUserToRecover();
		//		|		}
		//		|	});
		//		|	// NOTE: no way to add another callback here!!
		// example:
		//		Using a Deferred doesn't simplify the sending code any, but it
		//		provides a standard interface for callers and senders alike,
		//		providing both with a simple way to service multiple callbacks for
		//		an operation and freeing both sides from worrying about details
		//		such as "did this get called already?". With Deferreds, new
		//		callbacks can be added at any time.
		//
		//		|	// Deferred style:
		//		|	function renderLotsOfData(data){
		//		|		var d = new Deferred();
		//		|		try{
		//		|			for(var x in data){
		//		|				renderDataitem(data[x]);
		//		|			}
		//		|			d.callback(true);
		//		|		}catch(e){
		//		|			d.errback(new Error("rendering failed"));
		//		|		}
		//		|		return d;
		//		|	}
		//
		//		|	// using Deferred style
		//		|	renderLotsOfData(someDataObj).then(null, function(){
		//		|		promptUserToRecover();
		//		|	});
		//		|	// NOTE: addErrback and addCallback both return the Deferred
		//		|	// again, so we could chain adding callbacks or save the
		//		|	// deferred for later should we need to be notified again.
		// example:
		//		In this example, renderLotsOfData is synchronous and so both
		//		versions are pretty artificial. Putting the data display on a
		//		timeout helps show why Deferreds rock:
		//
		//		|	// Deferred style and async func
		//		|	function renderLotsOfData(data){
		//		|		var d = new Deferred();
		//		|		setTimeout(function(){
		//		|			try{
		//		|				for(var x in data){
		//		|					renderDataitem(data[x]);
		//		|				}
		//		|				d.callback(true);
		//		|			}catch(e){
		//		|				d.errback(new Error("rendering failed"));
		//		|			}
		//		|		}, 100);
		//		|		return d;
		//		|	}
		//
		//		|	// using Deferred style
		//		|	renderLotsOfData(someDataObj).then(null, function(){
		//		|		promptUserToRecover();
		//		|	});
		//
		//		Note that the caller doesn't have to change his code at all to
		//		handle the asynchronous case.

		var result, finished, canceled, fired, isError, head, nextListener;
		var promise = (this.promise = new Promise());

		function complete(value){
			if(finished){
				throw new Error("This deferred has already been resolved");
			}
			result = value;
			finished = true;
			notify();
		}
		function notify(){
			var mutated;
			while(!mutated && nextListener){
				var listener = nextListener;
				nextListener = nextListener.next;
				if((mutated = (listener.progress == mutator))){ // assignment and check
					finished = false;
				}

				var func = (isError ? listener.error : listener.resolved);
				if(has("config-useDeferredInstrumentation")){
					if(isError && NewDeferred.instrumentRejected){
						NewDeferred.instrumentRejected(result, !!func);
					}
				}
				if(func){
					try{
						var newResult = func(result);
						if (newResult && typeof newResult.then === "function"){
							newResult.then(lang.hitch(listener.deferred, "resolve"), lang.hitch(listener.deferred, "reject"), lang.hitch(listener.deferred, "progress"));
							continue;
						}
						var unchanged = mutated && newResult === undefined;
						if(mutated && !unchanged){
							isError = newResult instanceof Error;
						}
						listener.deferred[unchanged && isError ? "reject" : "resolve"](unchanged ? result : newResult);
					}catch(e){
						listener.deferred.reject(e);
					}
				}else{
					if(isError){
						listener.deferred.reject(result);
					}else{
						listener.deferred.resolve(result);
					}
				}
			}
		}

		this.isResolved = promise.isResolved = function(){
			// summary:
			//		Checks whether the deferred has been resolved.
			// returns: Boolean

			return fired == 0;
		};

		this.isRejected = promise.isRejected = function(){
			// summary:
			//		Checks whether the deferred has been rejected.
			// returns: Boolean

			return fired == 1;
		};

		this.isFulfilled = promise.isFulfilled = function(){
			// summary:
			//		Checks whether the deferred has been resolved or rejected.
			// returns: Boolean

			return fired >= 0;
		};

		this.isCanceled = promise.isCanceled = function(){
			// summary:
			//		Checks whether the deferred has been canceled.
			// returns: Boolean

			return canceled;
		};

		// calling resolve will resolve the promise
		this.resolve = this.callback = function(value){
			// summary:
			//		Fulfills the Deferred instance successfully with the provide value
			this.fired = fired = 0;
			this.results = [value, null];
			complete(value);
		};


		// calling error will indicate that the promise failed
		this.reject = this.errback = function(error){
			// summary:
			//		Fulfills the Deferred instance as an error with the provided error
			isError = true;
			this.fired = fired = 1;
			if(has("config-useDeferredInstrumentation")){
				if(NewDeferred.instrumentRejected){
					NewDeferred.instrumentRejected(error, !!nextListener);
				}
			}
			complete(error);
			this.results = [null, error];
		};
		// call progress to provide updates on the progress on the completion of the promise
		this.progress = function(update){
			// summary:
			//		Send progress events to all listeners
			var listener = nextListener;
			while(listener){
				var progress = listener.progress;
				progress && progress(update);
				listener = listener.next;
			}
		};
		this.addCallbacks = function(callback, errback){
			// summary:
			//		Adds callback and error callback for this deferred instance.
			// callback: Function?
			//		The callback attached to this deferred object.
			// errback: Function?
			//		The error callback attached to this deferred object.
			// returns:
			//		Returns this deferred object.
			this.then(callback, errback, mutator);
			return this;	// Deferred
		};
		// provide the implementation of the promise
		promise.then = this.then = function(/*Function?*/resolvedCallback, /*Function?*/errorCallback, /*Function?*/progressCallback){
			// summary:
			//		Adds a fulfilledHandler, errorHandler, and progressHandler to be called for
			//		completion of a promise. The fulfilledHandler is called when the promise
			//		is fulfilled. The errorHandler is called when a promise fails. The
			//		progressHandler is called for progress events. All arguments are optional
			//		and non-function values are ignored. The progressHandler is not only an
			//		optional argument, but progress events are purely optional. Promise
			//		providers are not required to ever create progress events.
			//
			//		This function will return a new promise that is fulfilled when the given
			//		fulfilledHandler or errorHandler callback is finished. This allows promise
			//		operations to be chained together. The value returned from the callback
			//		handler is the fulfillment value for the returned promise. If the callback
			//		throws an error, the returned promise will be moved to failed state.
			//
			// returns:
			//		Returns a new promise that represents the result of the
			//		execution of the callback. The callbacks will never affect the original promises value.
			// example:
			//		An example of using a CommonJS compliant promise:
			//		|	asyncComputeTheAnswerToEverything().
			//		|		then(addTwo).
			//		|		then(printResult, onError);
			//		|	>44
			//
			var returnDeferred = progressCallback == mutator ? this : new Deferred(promise.cancel);
			var listener = {
				resolved: resolvedCallback,
				error: errorCallback,
				progress: progressCallback,
				deferred: returnDeferred
			};
			if(nextListener){
				head = head.next = listener;
			}
			else{
				nextListener = head = listener;
			}
			if(finished){
				notify();
			}
			return returnDeferred.promise; // Promise
		};
		var deferred = this;
		promise.cancel = this.cancel = function(){
			// summary:
			//		Cancels the asynchronous operation
			if(!finished){
				var error = canceller && canceller(deferred);
				if(!finished){
					if (!(error instanceof Error)){
						error = new CancelError(error);
					}
					error.log = false;
					deferred.reject(error);
				}
			}
			canceled = true;
		};
		freeze(promise);
	};
	lang.extend(Deferred, {
		addCallback: function(/*Function*/ callback){
			// summary:
			//		Adds successful callback for this deferred instance.
			// returns:
			//		Returns this deferred object.
			return this.addCallbacks(lang.hitch.apply(dojo, arguments));	// Deferred
		},

		addErrback: function(/*Function*/ errback){
			// summary:
			//		Adds error callback for this deferred instance.
			// returns:
			//		Returns this deferred object.
			return this.addCallbacks(null, lang.hitch.apply(dojo, arguments));	// Deferred
		},

		addBoth: function(/*Function*/ callback){
			// summary:
			//		Add handler as both successful callback and error callback for this deferred instance.
			// returns:
			//		Returns this deferred object.
			var enclosed = lang.hitch.apply(dojo, arguments);
			return this.addCallbacks(enclosed, enclosed);	// Deferred
		},
		fired: -1
	});

	Deferred.when = dojo.when = when;

	return Deferred;
});

},
'dojo/Deferred':function(){
define([
	"./has",
	"./_base/lang",
	"./errors/CancelError",
	"./promise/Promise",
	"./promise/instrumentation"
], function(has, lang, CancelError, Promise, instrumentation){
	"use strict";

	// module:
	//		dojo/Deferred

	var PROGRESS = 0,
			RESOLVED = 1,
			REJECTED = 2;
	var FULFILLED_ERROR_MESSAGE = "This deferred has already been fulfilled.";

	var freezeObject = Object.freeze || function(){};

	var signalWaiting = function(waiting, type, result, rejection, deferred){
		if( 1 ){
			if(type === REJECTED && Deferred.instrumentRejected && waiting.length === 0){
				Deferred.instrumentRejected(result, false, rejection, deferred);
			}
		}

		for(var i = 0; i < waiting.length; i++){
			signalListener(waiting[i], type, result, rejection);
		}
	};

	var signalListener = function(listener, type, result, rejection){
		var func = listener[type];
		var deferred = listener.deferred;
		if(func){
			try{
				var newResult = func(result);
				if(type === PROGRESS){
					if(typeof newResult !== "undefined"){
						signalDeferred(deferred, type, newResult);
					}
				}else{
					if(newResult && typeof newResult.then === "function"){
						listener.cancel = newResult.cancel;
						newResult.then(
								// Only make resolvers if they're actually going to be used
								makeDeferredSignaler(deferred, RESOLVED),
								makeDeferredSignaler(deferred, REJECTED),
								makeDeferredSignaler(deferred, PROGRESS));
						return;
					}
					signalDeferred(deferred, RESOLVED, newResult);
				}
			}catch(error){
				signalDeferred(deferred, REJECTED, error);
			}
		}else{
			signalDeferred(deferred, type, result);
		}

		if( 1 ){
			if(type === REJECTED && Deferred.instrumentRejected){
				Deferred.instrumentRejected(result, !!func, rejection, deferred.promise);
			}
		}
	};

	var makeDeferredSignaler = function(deferred, type){
		return function(value){
			signalDeferred(deferred, type, value);
		};
	};

	var signalDeferred = function(deferred, type, result){
		if(!deferred.isCanceled()){
			switch(type){
				case PROGRESS:
					deferred.progress(result);
					break;
				case RESOLVED:
					deferred.resolve(result);
					break;
				case REJECTED:
					deferred.reject(result);
					break;
			}
		}
	};

	var Deferred = function(canceler){
		// summary:
		//		Creates a new deferred. This API is preferred over
		//		`dojo/_base/Deferred`.
		// description:
		//		Creates a new deferred, as an abstraction over (primarily)
		//		asynchronous operations. The deferred is the private interface
		//		that should not be returned to calling code. That's what the
		//		`promise` is for. See `dojo/promise/Promise`.
		// canceler: Function?
		//		Will be invoked if the deferred is canceled. The canceler
		//		receives the reason the deferred was canceled as its argument.
		//		The deferred is rejected with its return value, or a new
		//		`dojo/errors/CancelError` instance.

		// promise: dojo/promise/Promise
		//		The public promise object that clients can add callbacks to. 
		var promise = this.promise = new Promise();

		var deferred = this;
		var fulfilled, result, rejection;
		var canceled = false;
		var waiting = [];

		if( 1  && Error.captureStackTrace){
			Error.captureStackTrace(deferred, Deferred);
			Error.captureStackTrace(promise, Deferred);
		}

		this.isResolved = promise.isResolved = function(){
			// summary:
			//		Checks whether the deferred has been resolved.
			// returns: Boolean

			return fulfilled === RESOLVED;
		};

		this.isRejected = promise.isRejected = function(){
			// summary:
			//		Checks whether the deferred has been rejected.
			// returns: Boolean

			return fulfilled === REJECTED;
		};

		this.isFulfilled = promise.isFulfilled = function(){
			// summary:
			//		Checks whether the deferred has been resolved or rejected.
			// returns: Boolean

			return !!fulfilled;
		};

		this.isCanceled = promise.isCanceled = function(){
			// summary:
			//		Checks whether the deferred has been canceled.
			// returns: Boolean

			return canceled;
		};

		this.progress = function(update, strict){
			// summary:
			//		Emit a progress update on the deferred.
			// description:
			//		Emit a progress update on the deferred. Progress updates
			//		can be used to communicate updates about the asynchronous
			//		operation before it has finished.
			// update: any
			//		The progress update. Passed to progbacks.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently no progress can be emitted.
			// returns: dojo/promise/Promise
			//		Returns the original promise for the deferred.

			if(!fulfilled){
				signalWaiting(waiting, PROGRESS, update, null, deferred);
				return promise;
			}else if(strict === true){
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}else{
				return promise;
			}
		};

		this.resolve = function(value, strict){
			// summary:
			//		Resolve the deferred.
			// description:
			//		Resolve the deferred, putting it in a success state.
			// value: any
			//		The result of the deferred. Passed to callbacks.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently cannot be resolved.
			// returns: dojo/promise/Promise
			//		Returns the original promise for the deferred.

			if(!fulfilled){
				// Set fulfilled, store value. After signaling waiting listeners unset
				// waiting.
				signalWaiting(waiting, fulfilled = RESOLVED, result = value, null, deferred);
				waiting = null;
				return promise;
			}else if(strict === true){
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}else{
				return promise;
			}
		};

		var reject = this.reject = function(error, strict){
			// summary:
			//		Reject the deferred.
			// description:
			//		Reject the deferred, putting it in an error state.
			// error: any
			//		The error result of the deferred. Passed to errbacks.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently cannot be rejected.
			// returns: dojo/promise/Promise
			//		Returns the original promise for the deferred.

			if(!fulfilled){
				if( 1  && Error.captureStackTrace){
					Error.captureStackTrace(rejection = {}, reject);
				}
				signalWaiting(waiting, fulfilled = REJECTED, result = error, rejection, deferred);
				waiting = null;
				return promise;
			}else if(strict === true){
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}else{
				return promise;
			}
		};

		this.then = promise.then = function(callback, errback, progback){
			// summary:
			//		Add new callbacks to the deferred.
			// description:
			//		Add new callbacks to the deferred. Callbacks can be added
			//		before or after the deferred is fulfilled.
			// callback: Function?
			//		Callback to be invoked when the promise is resolved.
			//		Receives the resolution value.
			// errback: Function?
			//		Callback to be invoked when the promise is rejected.
			//		Receives the rejection error.
			// progback: Function?
			//		Callback to be invoked when the promise emits a progress
			//		update. Receives the progress update.
			// returns: dojo/promise/Promise
			//		Returns a new promise for the result of the callback(s).
			//		This can be used for chaining many asynchronous operations.

			var listener = [progback, callback, errback];
			// Ensure we cancel the promise we're waiting for, or if callback/errback
			// have returned a promise, cancel that one.
			listener.cancel = promise.cancel;
			listener.deferred = new Deferred(function(reason){
				// Check whether cancel is really available, returned promises are not
				// required to expose `cancel`
				return listener.cancel && listener.cancel(reason);
			});
			if(fulfilled && !waiting){
				signalListener(listener, fulfilled, result, rejection);
			}else{
				waiting.push(listener);
			}
			return listener.deferred.promise;
		};

		this.cancel = promise.cancel = function(reason, strict){
			// summary:
			//		Inform the deferred it may cancel its asynchronous operation.
			// description:
			//		Inform the deferred it may cancel its asynchronous operation.
			//		The deferred's (optional) canceler is invoked and the
			//		deferred will be left in a rejected state. Can affect other
			//		promises that originate with the same deferred.
			// reason: any
			//		A message that may be sent to the deferred's canceler,
			//		explaining why it's being canceled.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently cannot be canceled.
			// returns: any
			//		Returns the rejection reason if the deferred was canceled
			//		normally.

			if(!fulfilled){
				// Cancel can be called even after the deferred is fulfilled
				if(canceler){
					var returnedReason = canceler(reason);
					reason = typeof returnedReason === "undefined" ? reason : returnedReason;
				}
				canceled = true;
				if(!fulfilled){
					// Allow canceler to provide its own reason, but fall back to a CancelError
					if(typeof reason === "undefined"){
						reason = new CancelError();
					}
					reject(reason);
					return reason;
				}else if(fulfilled === REJECTED && result === reason){
					return reason;
				}
			}else if(strict === true){
				throw new Error(FULFILLED_ERROR_MESSAGE);
			}
		};

		freezeObject(promise);
	};

	Deferred.prototype.toString = function(){
		// returns: String
		//		Returns `[object Deferred]`.

		return "[object Deferred]";
	};

	if(instrumentation){
		instrumentation(Deferred);
	}

	return Deferred;
});

},
'dojo/errors/CancelError':function(){
define(["./create"], function(create){
	// module:
	//		dojo/errors/CancelError

	/*=====
	return function(){
		// summary:
		//		Default error if a promise is canceled without a reason.
	};
	=====*/

	return create("CancelError", null, null, { dojoType: "cancel" });
});

},
'dojo/errors/create':function(){
define(["../_base/lang"], function(lang){
	return function(name, ctor, base, props){
		base = base || Error;

		var ErrorCtor = function(message){
			if(base === Error){
				if(Error.captureStackTrace){
					Error.captureStackTrace(this, ErrorCtor);
				}

				// Error.call() operates on the returned error
				// object rather than operating on |this|
				var err = Error.call(this, message),
					prop;

				// Copy own properties from err to |this|
				for(prop in err){
					if(err.hasOwnProperty(prop)){
						this[prop] = err[prop];
					}
				}

				// messsage is non-enumerable in ES5
				this.message = message;
				// stack is non-enumerable in at least Firefox
				this.stack = err.stack;
			}else{
				base.apply(this, arguments);
			}
			if(ctor){
				ctor.apply(this, arguments);
			}
		};

		ErrorCtor.prototype = lang.delegate(base.prototype, props);
		ErrorCtor.prototype.name = name;
		ErrorCtor.prototype.constructor = ErrorCtor;

		return ErrorCtor;
	};
});

},
'dojo/promise/Promise':function(){
define([
	"../_base/lang"
], function(lang){
	"use strict";

	// module:
	//		dojo/promise/Promise

	function throwAbstract(){
		throw new TypeError("abstract");
	}

	return lang.extend(function Promise(){
		// summary:
		//		The public interface to a deferred.
		// description:
		//		The public interface to a deferred. All promises in Dojo are
		//		instances of this class.
	}, {
		then: function(callback, errback, progback){
			// summary:
			//		Add new callbacks to the promise.
			// description:
			//		Add new callbacks to the deferred. Callbacks can be added
			//		before or after the deferred is fulfilled.
			// callback: Function?
			//		Callback to be invoked when the promise is resolved.
			//		Receives the resolution value.
			// errback: Function?
			//		Callback to be invoked when the promise is rejected.
			//		Receives the rejection error.
			// progback: Function?
			//		Callback to be invoked when the promise emits a progress
			//		update. Receives the progress update.
			// returns: dojo/promise/Promise
			//		Returns a new promise for the result of the callback(s).
			//		This can be used for chaining many asynchronous operations.

			throwAbstract();
		},

		cancel: function(reason, strict){
			// summary:
			//		Inform the deferred it may cancel its asynchronous operation.
			// description:
			//		Inform the deferred it may cancel its asynchronous operation.
			//		The deferred's (optional) canceler is invoked and the
			//		deferred will be left in a rejected state. Can affect other
			//		promises that originate with the same deferred.
			// reason: any
			//		A message that may be sent to the deferred's canceler,
			//		explaining why it's being canceled.
			// strict: Boolean?
			//		If strict, will throw an error if the deferred has already
			//		been fulfilled and consequently cannot be canceled.
			// returns: any
			//		Returns the rejection reason if the deferred was canceled
			//		normally.

			throwAbstract();
		},

		isResolved: function(){
			// summary:
			//		Checks whether the promise has been resolved.
			// returns: Boolean

			throwAbstract();
		},

		isRejected: function(){
			// summary:
			//		Checks whether the promise has been rejected.
			// returns: Boolean

			throwAbstract();
		},

		isFulfilled: function(){
			// summary:
			//		Checks whether the promise has been resolved or rejected.
			// returns: Boolean

			throwAbstract();
		},

		isCanceled: function(){
			// summary:
			//		Checks whether the promise has been canceled.
			// returns: Boolean

			throwAbstract();
		},

		always: function(callbackOrErrback){
			// summary:
			//		Add a callback to be invoked when the promise is resolved
			//		or rejected.
			// callbackOrErrback: Function?
			//		A function that is used both as a callback and errback.
			// returns: dojo/promise/Promise
			//		Returns a new promise for the result of the callback/errback.

			return this.then(callbackOrErrback, callbackOrErrback);
		},

		otherwise: function(errback){
			// summary:
			//		Add new errbacks to the promise.
			// errback: Function?
			//		Callback to be invoked when the promise is rejected.
			// returns: dojo/promise/Promise
			//		Returns a new promise for the result of the errback.

			return this.then(null, errback);
		},

		trace: function(){
			return this;
		},

		traceRejected: function(){
			return this;
		},

		toString: function(){
			// returns: string
			//		Returns `[object Promise]`.

			return "[object Promise]";
		}
	});
});

},
'dojo/promise/instrumentation':function(){
define([
	"./tracer",
	"../has",
	"../_base/lang",
	"../_base/array"
], function(tracer, has, lang, arrayUtil){
	has.add("config-useDeferredInstrumentation", "report-unhandled-rejections");

	function logError(error, rejection, deferred){
		var stack = "";
		if(error && error.stack){
			stack += error.stack;
		}
		if(rejection && rejection.stack){
			stack += "\n    ----------------------------------------\n    rejected" + rejection.stack.split("\n").slice(1).join("\n").replace(/^\s+/, " ");
		}
		if(deferred && deferred.stack){
			stack += "\n    ----------------------------------------\n" + deferred.stack;
		}
		 0 && console.error(error, stack);
	}

	function reportRejections(error, handled, rejection, deferred){
		if(!handled){
			logError(error, rejection, deferred);
		}
	}

	var errors = [];
	var activeTimeout = false;
	var unhandledWait = 1000;
	function trackUnhandledRejections(error, handled, rejection, deferred){
		// try to find the existing tracking object
		if(!arrayUtil.some(errors, function(obj){
			if(obj.error === error){
				// found the tracking object for this error
				if(handled){
					// if handled, update the state
					obj.handled = true;
				}
				return true;
			}
		})){
			// no tracking object has been setup, create one
			errors.push({
				error: error,
				rejection: rejection,
				handled: handled,
				deferred: deferred,
				timestamp: new Date().getTime()
			});
		}

		if(!activeTimeout){
			activeTimeout = setTimeout(logRejected, unhandledWait);
		}
	}

	function logRejected(){
		var now = new Date().getTime();
		var reportBefore = now - unhandledWait;
		errors = arrayUtil.filter(errors, function(obj){
			// only report the error if we have waited long enough and
			// it hasn't been handled
			if(obj.timestamp < reportBefore){
				if(!obj.handled){
					logError(obj.error, obj.rejection, obj.deferred);
				}
				return false;
			}
			return true;
		});

		if(errors.length){
			activeTimeout = setTimeout(logRejected, errors[0].timestamp + unhandledWait - now);
		}else{
			activeTimeout = false;
		}
	}

	return function(Deferred){
		// summary:
		//		Initialize instrumentation for the Deferred class.
		// description:
		//		Initialize instrumentation for the Deferred class.
		//		Done automatically by `dojo/Deferred` if the
		//		`deferredInstrumentation` and `useDeferredInstrumentation`
		//		config options are set.
		//
		//		Sets up `dojo/promise/tracer` to log to the console.
		//
		//		Sets up instrumentation of rejected deferreds so unhandled
		//		errors are logged to the console.

		var usage = has("config-useDeferredInstrumentation");
		if(usage){
			tracer.on("resolved", lang.hitch(console, "log", "resolved"));
			tracer.on("rejected", lang.hitch(console, "log", "rejected"));
			tracer.on("progress", lang.hitch(console, "log", "progress"));

			var args = [];
			if(typeof usage === "string"){
				args = usage.split(",");
				usage = args.shift();
			}
			if(usage === "report-rejections"){
				Deferred.instrumentRejected = reportRejections;
			}else if(usage === "report-unhandled-rejections" || usage === true || usage === 1){
				Deferred.instrumentRejected = trackUnhandledRejections;
				unhandledWait = parseInt(args[0], 10) || unhandledWait;
			}else{
				throw new Error("Unsupported instrumentation usage <" + usage + ">");
			}
		}
	};
});

},
'dojo/promise/tracer':function(){
define([
	"../_base/lang",
	"./Promise",
	"../Evented"
], function(lang, Promise, Evented){
	"use strict";

	// module:
	//		dojo/promise/tracer

	/*=====
	return {
		// summary:
		//		Trace promise fulfillment.
		// description:
		//		Trace promise fulfillment. Calling `.trace()` or `.traceError()` on a
		//		promise enables tracing. Will emit `resolved`, `rejected` or `progress`
		//		events.

		on: function(type, listener){
			// summary:
			//		Subscribe to traces.
			// description:
			//		See `dojo/Evented#on()`.
			// type: String
			//		`resolved`, `rejected`, or `progress`
			// listener: Function
			//		The listener is passed the traced value and any arguments
			//		that were used with the `.trace()` call.
		}
	};
	=====*/

	var evented = new Evented;
	var emit = evented.emit;
	evented.emit = null;
	// Emit events asynchronously since they should not change the promise state.
	function emitAsync(args){
		setTimeout(function(){
			emit.apply(evented, args);
		}, 0);
	}

	Promise.prototype.trace = function(){
		// summary:
		//		Trace the promise.
		// description:
		//		Tracing allows you to transparently log progress,
		//		resolution and rejection of promises, without affecting the
		//		promise itself. Any arguments passed to `trace()` are
		//		emitted in trace events. See `dojo/promise/tracer` on how
		//		to handle traces.
		// returns: dojo/promise/Promise
		//		The promise instance `trace()` is called on.

		var args = lang._toArray(arguments);
		this.then(
			function(value){ emitAsync(["resolved", value].concat(args)); },
			function(error){ emitAsync(["rejected", error].concat(args)); },
			function(update){ emitAsync(["progress", update].concat(args)); }
		);
		return this;
	};

	Promise.prototype.traceRejected = function(){
		// summary:
		//		Trace rejection of the promise.
		// description:
		//		Tracing allows you to transparently log progress,
		//		resolution and rejection of promises, without affecting the
		//		promise itself. Any arguments passed to `trace()` are
		//		emitted in trace events. See `dojo/promise/tracer` on how
		//		to handle traces.
		// returns: dojo/promise/Promise
		//		The promise instance `traceRejected()` is called on.

		var args = lang._toArray(arguments);
		this.otherwise(function(error){
			emitAsync(["rejected", error].concat(args));
		});
		return this;
	};

	return evented;
});

},
'dojo/when':function(){
define([
	"./Deferred",
	"./promise/Promise"
], function(Deferred, Promise){
	"use strict";

	// module:
	//		dojo/when

	return function when(valueOrPromise, callback, errback, progback){
		// summary:
		//		Transparently applies callbacks to values and/or promises.
		// description:
		//		Accepts promises but also transparently handles non-promises. If no
		//		callbacks are provided returns a promise, regardless of the initial
		//		value. Foreign promises are converted.
		//
		//		If callbacks are provided and the initial value is not a promise,
		//		the callback is executed immediately with no error handling. Returns
		//		a promise if the initial value is a promise, or the result of the
		//		callback otherwise.
		// valueOrPromise:
		//		Either a regular value or an object with a `then()` method that
		//		follows the Promises/A specification.
		// callback: Function?
		//		Callback to be invoked when the promise is resolved, or a non-promise
		//		is received.
		// errback: Function?
		//		Callback to be invoked when the promise is rejected.
		// progback: Function?
		//		Callback to be invoked when the promise emits a progress update.
		// returns: dojo/promise/Promise
		//		Promise, or if a callback is provided, the result of the callback.

		var receivedPromise = valueOrPromise && typeof valueOrPromise.then === "function";
		var nativePromise = receivedPromise && valueOrPromise instanceof Promise;

		if(!receivedPromise){
			if(arguments.length > 1){
				return callback ? callback(valueOrPromise) : valueOrPromise;
			}else{
				return new Deferred().resolve(valueOrPromise);
			}
		}else if(!nativePromise){
			var deferred = new Deferred(valueOrPromise.cancel);
			valueOrPromise.then(deferred.resolve, deferred.reject, deferred.progress);
			valueOrPromise = deferred.promise;
		}

		if(callback || errback || progback){
			return valueOrPromise.then(callback, errback, progback);
		}
		return valueOrPromise;
	};
});

},
'dojo/_base/json':function(){
define(["./kernel", "../json"], function(dojo, json){

// module:
//		dojo/_base/json

/*=====
return {
	// summary:
	//		This module defines the dojo JSON API.
};
=====*/

dojo.fromJson = function(/*String*/ js){
	// summary:
	//		Parses a JavaScript expression and returns a JavaScript value.
	// description:
	//		Throws for invalid JavaScript expressions. It does not use a strict JSON parser. It
	//		always delegates to eval(). The content passed to this method must therefore come
	//		from a trusted source.
	//		It is recommend that you use dojo/json's parse function for an
	//		implementation uses the (faster) native JSON parse when available.
	// js:
	//		a string literal of a JavaScript expression, for instance:
	//		`'{ "foo": [ "bar", 1, { "baz": "thud" } ] }'`

	return eval("(" + js + ")"); // Object
};

/*=====
dojo._escapeString = function(){
	// summary:
	//		Adds escape sequences for non-visual characters, double quote and
	//		backslash and surrounds with double quotes to form a valid string
	//		literal.
};
=====*/
dojo._escapeString = json.stringify; // just delegate to json.stringify

dojo.toJsonIndentStr = "\t";
dojo.toJson = function(/*Object*/ it, /*Boolean?*/ prettyPrint){
	// summary:
	//		Returns a [JSON](http://json.org) serialization of an object.
	// description:
	//		Returns a [JSON](http://json.org) serialization of an object.
	//		Note that this doesn't check for infinite recursion, so don't do that!
	//		It is recommend that you use dojo/json's stringify function for an lighter
	//		and faster implementation that matches the native JSON API and uses the
	//		native JSON serializer when available.
	// it:
	//		an object to be serialized. Objects may define their own
	//		serialization via a special "__json__" or "json" function
	//		property. If a specialized serializer has been defined, it will
	//		be used as a fallback.
	//		Note that in 1.6, toJson would serialize undefined, but this no longer supported
	//		since it is not supported by native JSON serializer.
	// prettyPrint:
	//		if true, we indent objects and arrays to make the output prettier.
	//		The variable `dojo.toJsonIndentStr` is used as the indent string --
	//		to use something other than the default (tab), change that variable
	//		before calling dojo.toJson().
	//		Note that if native JSON support is available, it will be used for serialization,
	//		and native implementations vary on the exact spacing used in pretty printing.
	// returns:
	//		A JSON string serialization of the passed-in object.
	// example:
	//		simple serialization of a trivial object
	//		|	var jsonStr = dojo.toJson({ howdy: "stranger!", isStrange: true });
	//		|	doh.is('{"howdy":"stranger!","isStrange":true}', jsonStr);
	// example:
	//		a custom serializer for an objects of a particular class:
	//		|	dojo.declare("Furby", null, {
	//		|		furbies: "are strange",
	//		|		furbyCount: 10,
	//		|		__json__: function(){
	//		|		},
	//		|	});

	// use dojo/json
	return json.stringify(it, function(key, value){
		if(value){
			var tf = value.__json__||value.json;
			if(typeof tf == "function"){
				return tf.call(value);
			}
		}
		return value;
	}, prettyPrint && dojo.toJsonIndentStr);	// String
};

return dojo;
});

},
'dojo/json':function(){
define(["./has"], function(has){
	"use strict";
	var hasJSON = typeof JSON != "undefined";
	has.add("json-parse", hasJSON); // all the parsers work fine
		// Firefox 3.5/Gecko 1.9 fails to use replacer in stringify properly https://bugzilla.mozilla.org/show_bug.cgi?id=509184
	has.add("json-stringify", hasJSON && JSON.stringify({a:0}, function(k,v){return v||1;}) == '{"a":1}');

	/*=====
	return {
		// summary:
		//		Functions to parse and serialize JSON

		parse: function(str, strict){
			// summary:
			//		Parses a [JSON](http://json.org) string to return a JavaScript object.
			// description:
			//		This function follows [native JSON API](https://developer.mozilla.org/en/JSON)
			//		Throws for invalid JSON strings. This delegates to eval() if native JSON
			//		support is not available. By default this will evaluate any valid JS expression.
			//		With the strict parameter set to true, the parser will ensure that only
			//		valid JSON strings are parsed (otherwise throwing an error). Without the strict
			//		parameter, the content passed to this method must come
			//		from a trusted source.
			// str:
			//		a string literal of a JSON item, for instance:
			//		`'{ "foo": [ "bar", 1, { "baz": "thud" } ] }'`
			// strict:
			//		When set to true, this will ensure that only valid, secure JSON is ever parsed.
			//		Make sure this is set to true for untrusted content. Note that on browsers/engines
			//		without native JSON support, setting this to true will run slower.
		},
		stringify: function(value, replacer, spacer){
			// summary:
			//		Returns a [JSON](http://json.org) serialization of an object.
			// description:
			//		Returns a [JSON](http://json.org) serialization of an object.
			//		This function follows [native JSON API](https://developer.mozilla.org/en/JSON)
			//		Note that this doesn't check for infinite recursion, so don't do that!
			// value:
			//		A value to be serialized.
			// replacer:
			//		A replacer function that is called for each value and can return a replacement
			// spacer:
			//		A spacer string to be used for pretty printing of JSON
			// example:
			//		simple serialization of a trivial object
			//	|	define(["dojo/json"], function(JSON){
			// 	|		var jsonStr = JSON.stringify({ howdy: "stranger!", isStrange: true });
			//	|		doh.is('{"howdy":"stranger!","isStrange":true}', jsonStr);
		}
	};
	=====*/

	if(has("json-stringify")){
		return JSON;
	}else{
		var escapeString = function(/*String*/str){
			// summary:
			//		Adds escape sequences for non-visual characters, double quote and
			//		backslash and surrounds with double quotes to form a valid string
			//		literal.
			return ('"' + str.replace(/(["\\])/g, '\\$1') + '"').
				replace(/[\f]/g, "\\f").replace(/[\b]/g, "\\b").replace(/[\n]/g, "\\n").
				replace(/[\t]/g, "\\t").replace(/[\r]/g, "\\r"); // string
		};
		return {
			parse: has("json-parse") ? JSON.parse : function(str, strict){
				if(strict && !/^([\s\[\{]*(?:"(?:\\.|[^"])*"|-?\d[\d\.]*(?:[Ee][+-]?\d+)?|null|true|false|)[\s\]\}]*(?:,|:|$))+$/.test(str)){
					throw new SyntaxError("Invalid characters in JSON");
				}
				return eval('(' + str + ')');
			},
			stringify: function(value, replacer, spacer){
				var undef;
				if(typeof replacer == "string"){
					spacer = replacer;
					replacer = null;
				}
				function stringify(it, indent, key){
					if(replacer){
						it = replacer(key, it);
					}
					var val, objtype = typeof it;
					if(objtype == "number"){
						return isFinite(it) ? it + "" : "null";
					}
					if(objtype == "boolean"){
						return it + "";
					}
					if(it === null){
						return "null";
					}
					if(typeof it == "string"){
						return escapeString(it);
					}
					if(objtype == "function" || objtype == "undefined"){
						return undef; // undefined
					}
					// short-circuit for objects that support "json" serialization
					// if they return "self" then just pass-through...
					if(typeof it.toJSON == "function"){
						return stringify(it.toJSON(key), indent, key);
					}
					if(it instanceof Date){
						return '"{FullYear}-{Month+}-{Date}T{Hours}:{Minutes}:{Seconds}Z"'.replace(/\{(\w+)(\+)?\}/g, function(t, prop, plus){
							var num = it["getUTC" + prop]() + (plus ? 1 : 0);
							return num < 10 ? "0" + num : num;
						});
					}
					if(it.valueOf() !== it){
						// primitive wrapper, try again unwrapped:
						return stringify(it.valueOf(), indent, key);
					}
					var nextIndent= spacer ? (indent + spacer) : "";
					/* we used to test for DOM nodes and throw, but FF serializes them as {}, so cross-browser consistency is probably not efficiently attainable */ 
				
					var sep = spacer ? " " : "";
					var newLine = spacer ? "\n" : "";
				
					// array
					if(it instanceof Array){
						var itl = it.length, res = [];
						for(key = 0; key < itl; key++){
							var obj = it[key];
							val = stringify(obj, nextIndent, key);
							if(typeof val != "string"){
								val = "null";
							}
							res.push(newLine + nextIndent + val);
						}
						return "[" + res.join(",") + newLine + indent + "]";
					}
					// generic object code path
					var output = [];
					for(key in it){
						var keyStr;
						if(it.hasOwnProperty(key)){
							if(typeof key == "number"){
								keyStr = '"' + key + '"';
							}else if(typeof key == "string"){
								keyStr = escapeString(key);
							}else{
								// skip non-string or number keys
								continue;
							}
							val = stringify(it[key], nextIndent, key);
							if(typeof val != "string"){
								// skip non-serializable values
								continue;
							}
							// At this point, the most non-IE browsers don't get in this branch 
							// (they have native JSON), so push is definitely the way to
							output.push(newLine + nextIndent + keyStr + ":" + sep + val);
						}
					}
					return "{" + output.join(",") + newLine + indent + "}"; // String
				}
				return stringify(value, "", "");
			}
		};
	}
});

},
'dojo/_base/Color':function(){
define(["./kernel", "./lang", "./array", "./config"], function(dojo, lang, ArrayUtil, config){

	var Color = dojo.Color = function(/*Array|String|Object*/ color){
		// summary:
		//		Takes a named string, hex string, array of rgb or rgba values,
		//		an object with r, g, b, and a properties, or another `Color` object
		//		and creates a new Color instance to work from.
		//
		// example:
		//		Work with a Color instance:
		//	|	require(["dojo/_base/color"], function(Color){
		//	|		var c = new Color();
		//	|		c.setColor([0,0,0]); // black
		//	|		var hex = c.toHex(); // #000000
		//	|	});
		//
		// example:
		//		Work with a node's color:
		//	| 
		//	|	require(["dojo/_base/color", "dojo/dom-style"], function(Color, domStyle){
		//	|		var color = domStyle("someNode", "backgroundColor");
		//	|		var n = new Color(color);
		//	|		// adjust the color some
		//	|		n.r *= .5;
		//	|		 0 && console.log(n.toString()); // rgb(128, 255, 255);
		//	|	});
		if(color){ this.setColor(color); }
	};

	// FIXME:
	// there's got to be a more space-efficient way to encode or discover
	// these!! Use hex?
	Color.named = {
		// summary:
		//		Dictionary list of all CSS named colors, by name. Values are 3-item arrays with corresponding RG and B values.
		"black":  [0,0,0],
		"silver": [192,192,192],
		"gray":	  [128,128,128],
		"white":  [255,255,255],
		"maroon": [128,0,0],
		"red":	  [255,0,0],
		"purple": [128,0,128],
		"fuchsia":[255,0,255],
		"green":  [0,128,0],
		"lime":	  [0,255,0],
		"olive":  [128,128,0],
		"yellow": [255,255,0],
		"navy":	  [0,0,128],
		"blue":	  [0,0,255],
		"teal":	  [0,128,128],
		"aqua":	  [0,255,255],
		"transparent": config.transparentColor || [0,0,0,0]
	};

	lang.extend(Color, {
		r: 255, g: 255, b: 255, a: 1,
		_set: function(r, g, b, a){
			var t = this; t.r = r; t.g = g; t.b = b; t.a = a;
		},
		setColor: function(/*Array|String|Object*/ color){
			// summary:
			//		Takes a named string, hex string, array of rgb or rgba values,
			//		an object with r, g, b, and a properties, or another `Color` object
			//		and sets this color instance to that value.
			//
			// example:
			//	|	require(["dojo/_base/color"], function(Color){
			//	|		var c = new Color(); // no color
			//	|		c.setColor("#ededed"); // greyish
			//	|	});
			if(lang.isString(color)){
				Color.fromString(color, this);
			}else if(lang.isArray(color)){
				Color.fromArray(color, this);
			}else{
				this._set(color.r, color.g, color.b, color.a);
				if(!(color instanceof Color)){ this.sanitize(); }
			}
			return this;	// Color
		},
		sanitize: function(){
			// summary:
			//		Ensures the object has correct attributes
			// description:
			//		the default implementation does nothing, include dojo.colors to
			//		augment it with real checks
			return this;	// Color
		},
		toRgb: function(){
			// summary:
			//		Returns 3 component array of rgb values
			// example:
			//	|	require(["dojo/_base/color"], function(Color){
			//	|		var c = new Color("#000000");
			//	|		 0 && console.log(c.toRgb()); // [0,0,0]
			//	|	});
			var t = this;
			return [t.r, t.g, t.b]; // Array
		},
		toRgba: function(){
			// summary:
			//		Returns a 4 component array of rgba values from the color
			//		represented by this object.
			var t = this;
			return [t.r, t.g, t.b, t.a];	// Array
		},
		toHex: function(){
			// summary:
			//		Returns a CSS color string in hexadecimal representation
			// example:
			//	|	require(["dojo/_base/color"], function(Color){
			//	|		 0 && console.log(new Color([0,0,0]).toHex()); // #000000
			//	|	});
			var arr = ArrayUtil.map(["r", "g", "b"], function(x){
				var s = this[x].toString(16);
				return s.length < 2 ? "0" + s : s;
			}, this);
			return "#" + arr.join("");	// String
		},
		toCss: function(/*Boolean?*/ includeAlpha){
			// summary:
			//		Returns a css color string in rgb(a) representation
			// example:
			//	|	require(["dojo/_base/color"], function(Color){
			//	|		var c = new Color("#FFF").toCss();
			//	|		 0 && console.log(c); // rgb('255','255','255')
			//	|	});
			var t = this, rgb = t.r + ", " + t.g + ", " + t.b;
			return (includeAlpha ? "rgba(" + rgb + ", " + t.a : "rgb(" + rgb) + ")";	// String
		},
		toString: function(){
			// summary:
			//		Returns a visual representation of the color
			return this.toCss(true); // String
		}
	});

	Color.blendColors = dojo.blendColors = function(
		/*Color*/ start,
		/*Color*/ end,
		/*Number*/ weight,
		/*Color?*/ obj
	){
		// summary:
		//		Blend colors end and start with weight from 0 to 1, 0.5 being a 50/50 blend,
		//		can reuse a previously allocated Color object for the result
		var t = obj || new Color();
		ArrayUtil.forEach(["r", "g", "b", "a"], function(x){
			t[x] = start[x] + (end[x] - start[x]) * weight;
			if(x != "a"){ t[x] = Math.round(t[x]); }
		});
		return t.sanitize();	// Color
	};

	Color.fromRgb = dojo.colorFromRgb = function(/*String*/ color, /*Color?*/ obj){
		// summary:
		//		Returns a `Color` instance from a string of the form
		//		"rgb(...)" or "rgba(...)". Optionally accepts a `Color`
		//		object to update with the parsed value and return instead of
		//		creating a new object.
		// returns:
		//		A Color object. If obj is passed, it will be the return value.
		var m = color.toLowerCase().match(/^rgba?\(([\s\.,0-9]+)\)/);
		return m && Color.fromArray(m[1].split(/\s*,\s*/), obj);	// Color
	};

	Color.fromHex = dojo.colorFromHex = function(/*String*/ color, /*Color?*/ obj){
		// summary:
		//		Converts a hex string with a '#' prefix to a color object.
		//		Supports 12-bit #rgb shorthand. Optionally accepts a
		//		`Color` object to update with the parsed value.
		//
		// returns:
		//		A Color object. If obj is passed, it will be the return value.
		//
		// example:
		//	|	require(["dojo/_base/color"], function(Color){
		//	|		var thing = new Color().fromHex("#ededed"); // grey, longhand
		//	|		var thing2 = new Color().fromHex("#000"); // black, shorthand
		//	|	});
		var t = obj || new Color(),
			bits = (color.length == 4) ? 4 : 8,
			mask = (1 << bits) - 1;
		color = Number("0x" + color.substr(1));
		if(isNaN(color)){
			return null; // Color
		}
		ArrayUtil.forEach(["b", "g", "r"], function(x){
			var c = color & mask;
			color >>= bits;
			t[x] = bits == 4 ? 17 * c : c;
		});
		t.a = 1;
		return t;	// Color
	};

	Color.fromArray = dojo.colorFromArray = function(/*Array*/ a, /*Color?*/ obj){
		// summary:
		//		Builds a `Color` from a 3 or 4 element array, mapping each
		//		element in sequence to the rgb(a) values of the color.
		// example:
		//		|	require(["dojo/_base/color"], function(Color){
		//		|		var myColor = new Color().fromArray([237,237,237,0.5]); // grey, 50% alpha
		//		|	});
		// returns:
		//		A Color object. If obj is passed, it will be the return value.
		var t = obj || new Color();
		t._set(Number(a[0]), Number(a[1]), Number(a[2]), Number(a[3]));
		if(isNaN(t.a)){ t.a = 1; }
		return t.sanitize();	// Color
	};

	Color.fromString = dojo.colorFromString = function(/*String*/ str, /*Color?*/ obj){
		// summary:
		//		Parses `str` for a color value. Accepts hex, rgb, and rgba
		//		style color values.
		// description:
		//		Acceptable input values for str may include arrays of any form
		//		accepted by dojo.colorFromArray, hex strings such as "#aaaaaa", or
		//		rgb or rgba strings such as "rgb(133, 200, 16)" or "rgba(10, 10,
		//		10, 50)"
		// returns:
		//		A Color object. If obj is passed, it will be the return value.
		var a = Color.named[str];
		return a && Color.fromArray(a, obj) || Color.fromRgb(str, obj) || Color.fromHex(str, obj);	// Color
	};

	return Color;
});

},
'dojo/_base/browser':function(){
if(require.has){
	require.has.add("config-selectorEngine", "acme");
}
define([
	"../ready",
	"./kernel",
	"./connect", // until we decide if connect is going back into non-browser environments
	"./unload",
	"./window",
	"./event",
	"./html",
	"./NodeList",
	"../query",
	"./xhr",
	"./fx"], function(dojo){

	// module:
	//		dojo/_base/browser

	/*=====
	return {
		// summary:
		//		This module causes the browser-only base modules to be loaded.
	};
	=====*/

	return dojo;
});

},
'dojo/_base/unload':function(){
define(["./kernel", "./lang", "../on"], function(dojo, lang, on){

// module:
//		dojo/unload

var win = window;

var unload = {
	// summary:
	//		This module contains the document and window unload detection API.
	//		This module is deprecated.  Use on(window, "unload", func)
	//		and on(window, "beforeunload", func) instead.

	addOnWindowUnload: function(/*Object|Function?*/ obj, /*String|Function?*/ functionName){
		// summary:
		//		Registers a function to be triggered when window.onunload fires.
		//		Deprecated, use on(window, "unload", lang.hitch(obj, functionName)) instead.
		// description:
		//		The first time that addOnWindowUnload is called Dojo
		//		will register a page listener to trigger your unload
		//		handler with. Note that registering these handlers may
		//		destroy "fastback" page caching in browsers that support
		//		it. Be careful trying to modify the DOM or access
		//		JavaScript properties during this phase of page unloading:
		//		they may not always be available. Consider
		//		addOnUnload() if you need to modify the DOM or do
		//		heavy JavaScript work since it fires at the equivalent of
		//		the page's "onbeforeunload" event.
		// example:
		//	|	var afunc = function() { 0 && console.log("global function");};
		//	|	require(["dojo/_base/unload"], function(unload) {
		//	|		var foo = {bar: function(){  0 && console.log("bar unloading...");}, 
		//	|		           data: "mydata"};
		//	|		unload.addOnWindowUnload(afunc);
		//	|		unload.addOnWindowUnload(foo, "bar");
		//	|		unload.addOnWindowUnload(foo, function(){ 0 && console.log("", this.data);});
		//	|	});

		if (!dojo.windowUnloaded){
			on(win, "unload", (dojo.windowUnloaded = function(){
				// summary:
				//		signal fired by impending window destruction. You may use
				//		dojo.addOnWindowUnload() to register a listener for this
				//		event. NOTE: if you wish to dojo.connect() to this method
				//		to perform page/application cleanup, be aware that this
				//		event WILL NOT fire if no handler has been registered with
				//		addOnWindowUnload(). This behavior started in Dojo 1.3.
				//		Previous versions always triggered windowUnloaded(). See
				//		addOnWindowUnload for more info.
			}));
		}
		on(win, "unload", lang.hitch(obj, functionName));
	},

	addOnUnload: function(/*Object?|Function?*/ obj, /*String|Function?*/ functionName){
		// summary:
		//		Registers a function to be triggered when the page unloads.
		//		Deprecated, use on(window, "beforeunload", lang.hitch(obj, functionName)) instead.
		// description:
		//		The first time that addOnUnload is called Dojo will
		//		register a page listener to trigger your unload handler
		//		with.
		//
		//		In a browser environment, the functions will be triggered
		//		during the window.onbeforeunload event. Be careful of doing
		//		too much work in an unload handler. onbeforeunload can be
		//		triggered if a link to download a file is clicked, or if
		//		the link is a javascript: link. In these cases, the
		//		onbeforeunload event fires, but the document is not
		//		actually destroyed. So be careful about doing destructive
		//		operations in a dojo.addOnUnload callback.
		//
		//		Further note that calling dojo.addOnUnload will prevent
		//		browsers from using a "fast back" cache to make page
		//		loading via back button instantaneous.
		// example:
		//	|	var afunc = function() { 0 && console.log("global function");};
		//	|	require(["dojo/_base/unload"], function(unload) {
		//	|		var foo = {bar: function(){  0 && console.log("bar unloading...");}, 
		//	|		           data: "mydata"};
		//	|		unload.addOnUnload(afunc);
		//	|		unload.addOnUnload(foo, "bar");
		//	|		unload.addOnUnload(foo, function(){ 0 && console.log("", this.data);});
		//	|	});

		on(win, "beforeunload", lang.hitch(obj, functionName));
	}
};

dojo.addOnWindowUnload = unload.addOnWindowUnload;
dojo.addOnUnload = unload.addOnUnload;

return unload;

});

},
'dojo/_base/html':function(){
define(["./kernel", "../dom", "../dom-style", "../dom-attr", "../dom-prop", "../dom-class", "../dom-construct", "../dom-geometry"], function(dojo, dom, style, attr, prop, cls, ctr, geom){
	// module:
	//		dojo/dom

	/*=====
	return {
		// summary:
		//		This module is a stub for the core dojo DOM API.
	};
	=====*/

	// mix-in dom
	dojo.byId = dom.byId;
	dojo.isDescendant = dom.isDescendant;
	dojo.setSelectable = dom.setSelectable;

	// mix-in dom-attr
	dojo.getAttr = attr.get;
	dojo.setAttr = attr.set;
	dojo.hasAttr = attr.has;
	dojo.removeAttr = attr.remove;
	dojo.getNodeProp = attr.getNodeProp;

	dojo.attr = function(node, name, value){
		// summary:
		//		Gets or sets an attribute on an HTML element.
		// description:
		//		Handles normalized getting and setting of attributes on DOM
		//		Nodes. If 2 arguments are passed, and a the second argument is a
		//		string, acts as a getter.
		//
		//		If a third argument is passed, or if the second argument is a
		//		map of attributes, acts as a setter.
		//
		//		When passing functions as values, note that they will not be
		//		directly assigned to slots on the node, but rather the default
		//		behavior will be removed and the new behavior will be added
		//		using `dojo.connect()`, meaning that event handler properties
		//		will be normalized and that some caveats with regards to
		//		non-standard behaviors for onsubmit apply. Namely that you
		//		should cancel form submission using `dojo.stopEvent()` on the
		//		passed event object instead of returning a boolean value from
		//		the handler itself.
		// node: DOMNode|String
		//		id or reference to the element to get or set the attribute on
		// name: String|Object
		//		the name of the attribute to get or set.
		// value: String?
		//		The value to set for the attribute
		// returns:
		//		when used as a getter, the value of the requested attribute
		//		or null if that attribute does not have a specified or
		//		default value;
		//
		//		when used as a setter, the DOM node
		//
		// example:
		//	|	// get the current value of the "foo" attribute on a node
		//	|	dojo.attr(dojo.byId("nodeId"), "foo");
		//	|	// or we can just pass the id:
		//	|	dojo.attr("nodeId", "foo");
		//
		// example:
		//	|	// use attr() to set the tab index
		//	|	dojo.attr("nodeId", "tabIndex", 3);
		//	|
		//
		// example:
		//	Set multiple values at once, including event handlers:
		//	|	dojo.attr("formId", {
		//	|		"foo": "bar",
		//	|		"tabIndex": -1,
		//	|		"method": "POST",
		//	|		"onsubmit": function(e){
		//	|			// stop submitting the form. Note that the IE behavior
		//	|			// of returning true or false will have no effect here
		//	|			// since our handler is connect()ed to the built-in
		//	|			// onsubmit behavior and so we need to use
		//	|			// dojo.stopEvent() to ensure that the submission
		//	|			// doesn't proceed.
		//	|			dojo.stopEvent(e);
		//	|
		//	|			// submit the form with Ajax
		//	|			dojo.xhrPost({ form: "formId" });
		//	|		}
		//	|	});
		//
		// example:
		//	Style is s special case: Only set with an object hash of styles
		//	|	dojo.attr("someNode",{
		//	|		id:"bar",
		//	|		style:{
		//	|			width:"200px", height:"100px", color:"#000"
		//	|		}
		//	|	});
		//
		// example:
		//	Again, only set style as an object hash of styles:
		//	|	var obj = { color:"#fff", backgroundColor:"#000" };
		//	|	dojo.attr("someNode", "style", obj);
		//	|
		//	|	// though shorter to use `dojo.style()` in this case:
		//	|	dojo.style("someNode", obj);

		if(arguments.length == 2){
			return attr[typeof name == "string" ? "get" : "set"](node, name);
		}
		return attr.set(node, name, value);
	};

	// mix-in dom-class
	dojo.hasClass = cls.contains;
	dojo.addClass = cls.add;
	dojo.removeClass = cls.remove;
	dojo.toggleClass = cls.toggle;
	dojo.replaceClass = cls.replace;

	// mix-in dom-construct
	dojo._toDom = dojo.toDom = ctr.toDom;
	dojo.place = ctr.place;
	dojo.create = ctr.create;
	dojo.empty = function(node){ ctr.empty(node); };
	dojo._destroyElement = dojo.destroy = function(node){ ctr.destroy(node); };

	// mix-in dom-geometry
	dojo._getPadExtents = dojo.getPadExtents = geom.getPadExtents;
	dojo._getBorderExtents = dojo.getBorderExtents = geom.getBorderExtents;
	dojo._getPadBorderExtents = dojo.getPadBorderExtents = geom.getPadBorderExtents;
	dojo._getMarginExtents = dojo.getMarginExtents = geom.getMarginExtents;
	dojo._getMarginSize = dojo.getMarginSize = geom.getMarginSize;
	dojo._getMarginBox = dojo.getMarginBox = geom.getMarginBox;
	dojo.setMarginBox = geom.setMarginBox;
	dojo._getContentBox = dojo.getContentBox = geom.getContentBox;
	dojo.setContentSize = geom.setContentSize;
	dojo._isBodyLtr = dojo.isBodyLtr = geom.isBodyLtr;
	dojo._docScroll = dojo.docScroll = geom.docScroll;
	dojo._getIeDocumentElementOffset = dojo.getIeDocumentElementOffset = geom.getIeDocumentElementOffset;
	dojo._fixIeBiDiScrollLeft = dojo.fixIeBiDiScrollLeft = geom.fixIeBiDiScrollLeft;
	dojo.position = geom.position;

	dojo.marginBox = function marginBox(/*DomNode|String*/node, /*Object?*/box){
		// summary:
		//		Getter/setter for the margin-box of node.
		// description:
		//		Getter/setter for the margin-box of node.
		//		Returns an object in the expected format of box (regardless
		//		if box is passed). The object might look like:
		//		`{ l: 50, t: 200, w: 300: h: 150 }`
		//		for a node offset from its parent 50px to the left, 200px from
		//		the top with a margin width of 300px and a margin-height of
		//		150px.
		// node:
		//		id or reference to DOM Node to get/set box for
		// box:
		//		If passed, denotes that dojo.marginBox() should
		//		update/set the margin box for node. Box is an object in the
		//		above format. All properties are optional if passed.
		// example:
		//		Retrieve the margin box of a passed node
		//	|	var box = dojo.marginBox("someNodeId");
		//	|	 0 && console.dir(box);
		//
		// example:
		//		Set a node's margin box to the size of another node
		//	|	var box = dojo.marginBox("someNodeId");
		//	|	dojo.marginBox("someOtherNode", box);
		return box ? geom.setMarginBox(node, box) : geom.getMarginBox(node); // Object
	};

	dojo.contentBox = function contentBox(/*DomNode|String*/node, /*Object?*/box){
		// summary:
		//		Getter/setter for the content-box of node.
		// description:
		//		Returns an object in the expected format of box (regardless if box is passed).
		//		The object might look like:
		//		`{ l: 50, t: 200, w: 300: h: 150 }`
		//		for a node offset from its parent 50px to the left, 200px from
		//		the top with a content width of 300px and a content-height of
		//		150px. Note that the content box may have a much larger border
		//		or margin box, depending on the box model currently in use and
		//		CSS values set/inherited for node.
		//		While the getter will return top and left values, the
		//		setter only accepts setting the width and height.
		// node:
		//		id or reference to DOM Node to get/set box for
		// box:
		//		If passed, denotes that dojo.contentBox() should
		//		update/set the content box for node. Box is an object in the
		//		above format, but only w (width) and h (height) are supported.
		//		All properties are optional if passed.
		return box ? geom.setContentSize(node, box) : geom.getContentBox(node); // Object
	};

	dojo.coords = function(/*DomNode|String*/node, /*Boolean?*/includeScroll){
		// summary:
		//		Deprecated: Use position() for border-box x/y/w/h
		//		or marginBox() for margin-box w/h/l/t.
		//
		//		Returns an object that measures margin-box (w)idth/(h)eight
		//		and absolute position x/y of the border-box. Also returned
		//		is computed (l)eft and (t)op values in pixels from the
		//		node's offsetParent as returned from marginBox().
		//		Return value will be in the form:
		//|			{ l: 50, t: 200, w: 300: h: 150, x: 100, y: 300 }
		//		Does not act as a setter. If includeScroll is passed, the x and
		//		y params are affected as one would expect in dojo.position().
		dojo.deprecated("dojo.coords()", "Use dojo.position() or dojo.marginBox().");
		node = dom.byId(node);
		var s = style.getComputedStyle(node), mb = geom.getMarginBox(node, s);
		var abs = geom.position(node, includeScroll);
		mb.x = abs.x;
		mb.y = abs.y;
		return mb;	// Object
	};

	// mix-in dom-prop
	dojo.getProp = prop.get;
	dojo.setProp = prop.set;

	dojo.prop = function(/*DomNode|String*/node, /*String|Object*/name, /*String?*/value){
		// summary:
		//		Gets or sets a property on an HTML element.
		// description:
		//		Handles normalized getting and setting of properties on DOM
		//		Nodes. If 2 arguments are passed, and a the second argument is a
		//		string, acts as a getter.
		//
		//		If a third argument is passed, or if the second argument is a
		//		map of attributes, acts as a setter.
		//
		//		When passing functions as values, note that they will not be
		//		directly assigned to slots on the node, but rather the default
		//		behavior will be removed and the new behavior will be added
		//		using `dojo.connect()`, meaning that event handler properties
		//		will be normalized and that some caveats with regards to
		//		non-standard behaviors for onsubmit apply. Namely that you
		//		should cancel form submission using `dojo.stopEvent()` on the
		//		passed event object instead of returning a boolean value from
		//		the handler itself.
		// node:
		//		id or reference to the element to get or set the property on
		// name:
		//		the name of the property to get or set.
		// value:
		//		The value to set for the property
		// returns:
		//		when used as a getter, the value of the requested property
		//		or null if that attribute does not have a specified or
		//		default value;
		//
		//		when used as a setter, the DOM node
		//
		// example:
		//	|	// get the current value of the "foo" property on a node
		//	|	dojo.prop(dojo.byId("nodeId"), "foo");
		//	|	// or we can just pass the id:
		//	|	dojo.prop("nodeId", "foo");
		//
		// example:
		//	|	// use prop() to set the tab index
		//	|	dojo.prop("nodeId", "tabIndex", 3);
		//	|
		//
		// example:
		//	Set multiple values at once, including event handlers:
		//	|	dojo.prop("formId", {
		//	|		"foo": "bar",
		//	|		"tabIndex": -1,
		//	|		"method": "POST",
		//	|		"onsubmit": function(e){
		//	|			// stop submitting the form. Note that the IE behavior
		//	|			// of returning true or false will have no effect here
		//	|			// since our handler is connect()ed to the built-in
		//	|			// onsubmit behavior and so we need to use
		//	|			// dojo.stopEvent() to ensure that the submission
		//	|			// doesn't proceed.
		//	|			dojo.stopEvent(e);
		//	|
		//	|			// submit the form with Ajax
		//	|			dojo.xhrPost({ form: "formId" });
		//	|		}
		//	|	});
		//
		// example:
		//		Style is s special case: Only set with an object hash of styles
		//	|	dojo.prop("someNode",{
		//	|		id:"bar",
		//	|		style:{
		//	|			width:"200px", height:"100px", color:"#000"
		//	|		}
		//	|	});
		//
		// example:
		//		Again, only set style as an object hash of styles:
		//	|	var obj = { color:"#fff", backgroundColor:"#000" };
		//	|	dojo.prop("someNode", "style", obj);
		//	|
		//	|	// though shorter to use `dojo.style()` in this case:
		//	|	dojo.style("someNode", obj);

		if(arguments.length == 2){
			return prop[typeof name == "string" ? "get" : "set"](node, name);
		}
		// setter
		return prop.set(node, name, value);
	};

	// mix-in dom-style
	dojo.getStyle = style.get;
	dojo.setStyle = style.set;
	dojo.getComputedStyle = style.getComputedStyle;
	dojo.__toPixelValue = dojo.toPixelValue = style.toPixelValue;

	dojo.style = function(node, name, value){
		// summary:
		//		Accesses styles on a node. If 2 arguments are
		//		passed, acts as a getter. If 3 arguments are passed, acts
		//		as a setter.
		// description:
		//		Getting the style value uses the computed style for the node, so the value
		//		will be a calculated value, not just the immediate node.style value.
		//		Also when getting values, use specific style names,
		//		like "borderBottomWidth" instead of "border" since compound values like
		//		"border" are not necessarily reflected as expected.
		//		If you want to get node dimensions, use `dojo.marginBox()`,
		//		`dojo.contentBox()` or `dojo.position()`.
		// node: DOMNode|String
		//		id or reference to node to get/set style for
		// name: String|Object?
		//		the style property to set in DOM-accessor format
		//		("borderWidth", not "border-width") or an object with key/value
		//		pairs suitable for setting each property.
		// value: String?
		//		If passed, sets value on the node for style, handling
		//		cross-browser concerns.  When setting a pixel value,
		//		be sure to include "px" in the value. For instance, top: "200px".
		//		Otherwise, in some cases, some browsers will not apply the style.
		// returns:
		//		when used as a getter, return the computed style of the node if passing in an ID or node,
		//		or return the normalized, computed value for the property when passing in a node and a style property
		// example:
		//		Passing only an ID or node returns the computed style object of
		//		the node:
		//	|	dojo.style("thinger");
		// example:
		//		Passing a node and a style property returns the current
		//		normalized, computed value for that property:
		//	|	dojo.style("thinger", "opacity"); // 1 by default
		//
		// example:
		//		Passing a node, a style property, and a value changes the
		//		current display of the node and returns the new computed value
		//	|	dojo.style("thinger", "opacity", 0.5); // == 0.5
		//
		// example:
		//		Passing a node, an object-style style property sets each of the values in turn and returns the computed style object of the node:
		//	|	dojo.style("thinger", {
		//	|		"opacity": 0.5,
		//	|		"border": "3px solid black",
		//	|		"height": "300px"
		//	|	});
		//
		// example:
		//		When the CSS style property is hyphenated, the JavaScript property is camelCased.
		//		font-size becomes fontSize, and so on.
		//	|	dojo.style("thinger",{
		//	|		fontSize:"14pt",
		//	|		letterSpacing:"1.2em"
		//	|	});
		//
		// example:
		//		dojo/NodeList implements .style() using the same syntax, omitting the "node" parameter, calling
		//		dojo.style() on every element of the list. See: `dojo/query` and `dojo/NodeList`
		//	|	dojo.query(".someClassName").style("visibility","hidden");
		//	|	// or
		//	|	dojo.query("#baz > div").style({
		//	|		opacity:0.75,
		//	|		fontSize:"13pt"
		//	|	});

		switch(arguments.length){
			case 1:
				return style.get(node);
			case 2:
				return style[typeof name == "string" ? "get" : "set"](node, name);
		}
		// setter
		return style.set(node, name, value);
	};

	return dojo;
});

},
'dojo/dom-attr':function(){
define(["exports", "./sniff", "./_base/lang", "./dom", "./dom-style", "./dom-prop"],
		function(exports, has, lang, dom, style, prop){
	// module:
	//		dojo/dom-attr
	// summary:
	//		This module defines the core dojo DOM attributes API.

	// TODOC: summary not showing up in output see https://github.com/csnover/js-doc-parse/issues/42

	// =============================
	// Element attribute Functions
	// =============================

	// This module will be obsolete soon. Use dojo/prop instead.

	// dojo/dom-attr.get() should conform to http://www.w3.org/TR/DOM-Level-2-Core/

	// attribute-related functions (to be obsolete soon)
	var forcePropNames = {
			innerHTML:	1,
			textContent:1,
			className:	1,
			htmlFor:	has("ie"),
			value:		1
		},
		attrNames = {
			// original attribute names
			classname: "class",
			htmlfor: "for",
			// for IE
			tabindex: "tabIndex",
			readonly: "readOnly"
		};

	function _hasAttr(node, name){
		var attr = node.getAttributeNode && node.getAttributeNode(name);
		return !!attr && attr.specified; // Boolean
	}
	
	// There is a difference in the presence of certain properties and their default values
	// between browsers. For example, on IE "disabled" is present on all elements,
	// but it is value is "false"; "tabIndex" of <div> returns 0 by default on IE, yet other browsers
	// can return -1.

	exports.has = function hasAttr(/*DOMNode|String*/ node, /*String*/ name){
		// summary:
		//		Returns true if the requested attribute is specified on the
		//		given element, and false otherwise.
		// node: DOMNode|String
		//		id or reference to the element to check
		// name: String
		//		the name of the attribute
		// returns: Boolean
		//		true if the requested attribute is specified on the
		//		given element, and false otherwise

		var lc = name.toLowerCase();
		return forcePropNames[prop.names[lc] || name] || _hasAttr(dom.byId(node), attrNames[lc] || name);	// Boolean
	};

	exports.get = function getAttr(/*DOMNode|String*/ node, /*String*/ name){
		// summary:
		//		Gets an attribute on an HTML element.
		// description:
		//		Handles normalized getting of attributes on DOM Nodes.
		// node: DOMNode|String
		//		id or reference to the element to get the attribute on
		// name: String
		//		the name of the attribute to get.
		// returns:
		//		the value of the requested attribute or null if that attribute does not have a specified or
		//		default value;
		//
		// example:
		//	|	// get the current value of the "foo" attribute on a node
		//	|	require(["dojo/dom-attr", "dojo/dom"], function(domAttr, dom){
		//	|		domAttr.get(dom.byId("nodeId"), "foo");
		//	|		// or we can just pass the id:
		//	|		domAttr.get("nodeId", "foo");
		//	|	});	
		//	|	

		node = dom.byId(node);
		var lc = name.toLowerCase(),
			propName = prop.names[lc] || name,
			forceProp = forcePropNames[propName],
			value = node[propName];		// should we access this attribute via a property or via getAttribute()?

		if(forceProp && typeof value != "undefined"){
			// node's property
			return value;	// Anything
		}
		
		if(propName == "textContent"){
			return prop.get(node, propName);
		}
		
		if(propName != "href" && (typeof value == "boolean" || lang.isFunction(value))){
			// node's property
			return value;	// Anything
		}
		// node's attribute
		// we need _hasAttr() here to guard against IE returning a default value
		var attrName = attrNames[lc] || name;
		return _hasAttr(node, attrName) ? node.getAttribute(attrName) : null; // Anything
	};

	exports.set = function setAttr(/*DOMNode|String*/ node, /*String|Object*/ name, /*String?*/ value){
		// summary:
		//		Sets an attribute on an HTML element.
		// description:
		//		Handles normalized setting of attributes on DOM Nodes.
		//
		//		When passing functions as values, note that they will not be
		//		directly assigned to slots on the node, but rather the default
		//		behavior will be removed and the new behavior will be added
		//		using `dojo.connect()`, meaning that event handler properties
		//		will be normalized and that some caveats with regards to
		//		non-standard behaviors for onsubmit apply. Namely that you
		//		should cancel form submission using `dojo.stopEvent()` on the
		//		passed event object instead of returning a boolean value from
		//		the handler itself.
		// node: DOMNode|String
		//		id or reference to the element to set the attribute on
		// name: String|Object
		//		the name of the attribute to set, or a hash of key-value pairs to set.
		// value: String?
		//		the value to set for the attribute, if the name is a string.
		// returns:
		//		the DOM node
		//
		// example:
		//	|	// use attr() to set the tab index
		//	|	require(["dojo/dom-attr"], function(domAttr){
		//	|		domAttr.set("nodeId", "tabIndex", 3);
		//	|	});
		//
		// example:
		//	Set multiple values at once, including event handlers:
		//	|	require(["dojo/dom-attr"],
		//	|	function(domAttr){
		//	|		domAttr.set("formId", {
		//	|			"foo": "bar",
		//	|			"tabIndex": -1,
		//	|			"method": "POST"
		//	|		}
		//	|	});

		node = dom.byId(node);
		if(arguments.length == 2){ // inline'd type check
			// the object form of setter: the 2nd argument is a dictionary
			for(var x in name){
				exports.set(node, x, name[x]);
			}
			return node; // DomNode
		}
		var lc = name.toLowerCase(),
			propName = prop.names[lc] || name,
			forceProp = forcePropNames[propName];
		if(propName == "style" && typeof value != "string"){ // inline'd type check
			// special case: setting a style
			style.set(node, value);
			return node; // DomNode
		}
		if(forceProp || typeof value == "boolean" || lang.isFunction(value)){
			return prop.set(node, name, value);
		}
		// node's attribute
		node.setAttribute(attrNames[lc] || name, value);
		return node; // DomNode
	};

	exports.remove = function removeAttr(/*DOMNode|String*/ node, /*String*/ name){
		// summary:
		//		Removes an attribute from an HTML element.
		// node: DOMNode|String
		//		id or reference to the element to remove the attribute from
		// name: String
		//		the name of the attribute to remove

		dom.byId(node).removeAttribute(attrNames[name.toLowerCase()] || name);
	};

	exports.getNodeProp = function getNodeProp(/*DomNode|String*/ node, /*String*/ name){
		// summary:
		//		Returns an effective value of a property or an attribute.
		// node: DOMNode|String
		//		id or reference to the element to remove the attribute from
		// name: String
		//		the name of the attribute
		// returns:
		//		the value of the attribute

		node = dom.byId(node);
		var lc = name.toLowerCase(), propName = prop.names[lc] || name;
		if((propName in node) && propName != "href"){
			// node's property
			return node[propName];	// Anything
		}
		// node's attribute
		var attrName = attrNames[lc] || name;
		return _hasAttr(node, attrName) ? node.getAttribute(attrName) : null; // Anything
	};
});

},
'dojo/dom-prop':function(){
define(["exports", "./_base/kernel", "./sniff", "./_base/lang", "./dom", "./dom-style", "./dom-construct", "./_base/connect"],
		function(exports, dojo, has, lang, dom, style, ctr, conn){
	// module:
	//		dojo/dom-prop
	// summary:
	//		This module defines the core dojo DOM properties API.

	// TODOC: summary not showing up in output, see https://github.com/csnover/js-doc-parse/issues/42

	// =============================
	// Element properties Functions
	// =============================

	// helper to connect events
	var _evtHdlrMap = {}, _ctr = 0, _attrId = dojo._scopeName + "attrid";
	has.add('dom-textContent', function (global, doc, element) { return 'textContent' in element; });

	exports.names = {
		// properties renamed to avoid clashes with reserved words
		"class": "className",
		"for": "htmlFor",
		// properties written as camelCase
		tabindex: "tabIndex",
		readonly: "readOnly",
		colspan: "colSpan",
		frameborder: "frameBorder",
		rowspan: "rowSpan",
		textcontent: "textContent",
		valuetype: "valueType"
	};
	
	function getText(/*DOMNode*/node){
		// summary:
		//		recursion method for get('textContent') to use. Gets text value for a node.
		// description:
		//		Juse uses nodedValue so things like <br/> tags do not end up in
		//		the text as any sort of line return.
		var text = "", ch = node.childNodes;
		for(var i = 0, n; n = ch[i]; i++){
			//Skip comments.
			if(n.nodeType != 8){
				if(n.nodeType == 1){
					text += getText(n);
				}else{
					text += n.nodeValue;
				}
			}
		}
		return text;
	}

	exports.get = function getProp(/*DOMNode|String*/ node, /*String*/ name){
		// summary:
		//		Gets a property on an HTML element.
		// description:
		//		Handles normalized getting of properties on DOM nodes.
		//
		// node: DOMNode|String
		//		id or reference to the element to get the property on
		// name: String
		//		the name of the property to get.
		// returns:
		//		the value of the requested property or its default value
		//
		// example:
		//	|	// get the current value of the "foo" property on a node
		//	|	require(["dojo/dom-prop", "dojo/dom"], function(domProp, dom){
		//	|		domProp.get(dom.byId("nodeId"), "foo");
		//	|		// or we can just pass the id:
		//	|		domProp.get("nodeId", "foo");
		//	|	});

		node = dom.byId(node);
		var lc = name.toLowerCase(), propName = exports.names[lc] || name;
		
		if(propName == "textContent" && !has("dom-textContent")){
			return getText(node);
		}
		
		return node[propName];	// Anything
	};

	exports.set = function setProp(/*DOMNode|String*/ node, /*String|Object*/ name, /*String?*/ value){
		// summary:
		//		Sets a property on an HTML element.
		// description:
		//		Handles normalized setting of properties on DOM nodes.
		//
		//		When passing functions as values, note that they will not be
		//		directly assigned to slots on the node, but rather the default
		//		behavior will be removed and the new behavior will be added
		//		using `dojo.connect()`, meaning that event handler properties
		//		will be normalized and that some caveats with regards to
		//		non-standard behaviors for onsubmit apply. Namely that you
		//		should cancel form submission using `dojo.stopEvent()` on the
		//		passed event object instead of returning a boolean value from
		//		the handler itself.
		// node: DOMNode|String
		//		id or reference to the element to set the property on
		// name: String|Object
		//		the name of the property to set, or a hash object to set
		//		multiple properties at once.
		// value: String?
		//		The value to set for the property
		// returns:
		//		the DOM node
		//
		// example:
		//	|	// use prop() to set the tab index
		//	|	require(["dojo/dom-prop"], function(domProp){
		//	|		domProp.set("nodeId", "tabIndex", 3);
		//	|	});
		//
		// example:
		//	Set multiple values at once, including event handlers:
		//	|	require(["dojo/dom-prop"], function(domProp){
		//	|		domProp.set("formId", {
		//	|			"foo": "bar",
		//	|			"tabIndex": -1,
		//	|			"method": "POST",
		//	|		});
		//	|	});

		node = dom.byId(node);
		var l = arguments.length;
		if(l == 2 && typeof name != "string"){ // inline'd type check
			// the object form of setter: the 2nd argument is a dictionary
			for(var x in name){
				exports.set(node, x, name[x]);
			}
			return node; // DomNode
		}
		var lc = name.toLowerCase(), propName = exports.names[lc] || name;
		if(propName == "style" && typeof value != "string"){ // inline'd type check
			// special case: setting a style
			style.set(node, value);
			return node; // DomNode
		}
		if(propName == "innerHTML"){
			// special case: assigning HTML
			// the hash lists elements with read-only innerHTML on IE
			if(has("ie") && node.tagName.toLowerCase() in {col: 1, colgroup: 1,
						table: 1, tbody: 1, tfoot: 1, thead: 1, tr: 1, title: 1}){
				ctr.empty(node);
				node.appendChild(ctr.toDom(value, node.ownerDocument));
			}else{
				node[propName] = value;
			}
			return node; // DomNode
		}
		if(propName == "textContent" && !has("dom-textContent")) {
			ctr.empty(node);
			node.appendChild(node.ownerDocument.createTextNode(value));
			return node;
		}
		if(lang.isFunction(value)){
			// special case: assigning an event handler
			// clobber if we can
			var attrId = node[_attrId];
			if(!attrId){
				attrId = _ctr++;
				node[_attrId] = attrId;
			}
			if(!_evtHdlrMap[attrId]){
				_evtHdlrMap[attrId] = {};
			}
			var h = _evtHdlrMap[attrId][propName];
			if(h){
				//h.remove();
				conn.disconnect(h);
			}else{
				try{
					delete node[propName];
				}catch(e){}
			}
			// ensure that event objects are normalized, etc.
			if(value){
				//_evtHdlrMap[attrId][propName] = on(node, propName, value);
				_evtHdlrMap[attrId][propName] = conn.connect(node, propName, value);
			}else{
				node[propName] = null;
			}
			return node; // DomNode
		}
		node[propName] = value;
		return node;	// DomNode
	};
});

},
'dojo/dom-construct':function(){
define(["exports", "./_base/kernel", "./sniff", "./_base/window", "./dom", "./dom-attr"],
		function(exports, dojo, has, win, dom, attr){
	// module:
	//		dojo/dom-construct
	// summary:
	//		This module defines the core dojo DOM construction API.

	// TODOC: summary not showing up in output, see https://github.com/csnover/js-doc-parse/issues/42

	// support stuff for toDom()
	var tagWrap = {
			option: ["select"],
			tbody: ["table"],
			thead: ["table"],
			tfoot: ["table"],
			tr: ["table", "tbody"],
			td: ["table", "tbody", "tr"],
			th: ["table", "thead", "tr"],
			legend: ["fieldset"],
			caption: ["table"],
			colgroup: ["table"],
			col: ["table", "colgroup"],
			li: ["ul"]
		},
		reTag = /<\s*([\w\:]+)/,
		masterNode = {}, masterNum = 0,
		masterName = "__" + dojo._scopeName + "ToDomId";

	// generate start/end tag strings to use
	// for the injection for each special tag wrap case.
	for(var param in tagWrap){
		if(tagWrap.hasOwnProperty(param)){
			var tw = tagWrap[param];
			tw.pre = param == "option" ? '<select multiple="multiple">' : "<" + tw.join("><") + ">";
			tw.post = "</" + tw.reverse().join("></") + ">";
			// the last line is destructive: it reverses the array,
			// but we don't care at this point
		}
	}

	var html5domfix;
	if(has("ie") <= 8){
		html5domfix = function(doc){
			doc.__dojo_html5_tested = "yes";
			var div = create('div', {innerHTML: "<nav>a</nav>", style: {visibility: "hidden"}}, doc.body);
			if(div.childNodes.length !== 1){
				('abbr article aside audio canvas details figcaption figure footer header ' +
				'hgroup mark meter nav output progress section summary time video').replace(
					/\b\w+\b/g, function(n){
						doc.createElement(n);
					}
				);
			}
			destroy(div);
		}
	}

	function _insertBefore(/*DomNode*/ node, /*DomNode*/ ref){
		var parent = ref.parentNode;
		if(parent){
			parent.insertBefore(node, ref);
		}
	}

	function _insertAfter(/*DomNode*/ node, /*DomNode*/ ref){
		// summary:
		//		Try to insert node after ref
		var parent = ref.parentNode;
		if(parent){
			if(parent.lastChild == ref){
				parent.appendChild(node);
			}else{
				parent.insertBefore(node, ref.nextSibling);
			}
		}
	}

	exports.toDom = function toDom(frag, doc){
		// summary:
		//		instantiates an HTML fragment returning the corresponding DOM.
		// frag: String
		//		the HTML fragment
		// doc: DocumentNode?
		//		optional document to use when creating DOM nodes, defaults to
		//		dojo/_base/window.doc if not specified.
		// returns:
		//		Document fragment, unless it's a single node in which case it returns the node itself
		// example:
		//		Create a table row:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		var tr = domConstruct.toDom("<tr><td>First!</td></tr>");
		//	|	});

		doc = doc || win.doc;
		var masterId = doc[masterName];
		if(!masterId){
			doc[masterName] = masterId = ++masterNum + "";
			masterNode[masterId] = doc.createElement("div");
		}

		if(has("ie") <= 8){
			if(!doc.__dojo_html5_tested && doc.body){
				html5domfix(doc);
			}
		}

		// make sure the frag is a string.
		frag += "";

		// find the starting tag, and get node wrapper
		var match = frag.match(reTag),
			tag = match ? match[1].toLowerCase() : "",
			master = masterNode[masterId],
			wrap, i, fc, df;
		if(match && tagWrap[tag]){
			wrap = tagWrap[tag];
			master.innerHTML = wrap.pre + frag + wrap.post;
			for(i = wrap.length; i; --i){
				master = master.firstChild;
			}
		}else{
			master.innerHTML = frag;
		}

		// one node shortcut => return the node itself
		if(master.childNodes.length == 1){
			return master.removeChild(master.firstChild); // DOMNode
		}

		// return multiple nodes as a document fragment
		df = doc.createDocumentFragment();
		while((fc = master.firstChild)){ // intentional assignment
			df.appendChild(fc);
		}
		return df; // DocumentFragment
	};

	exports.place = function place(node, refNode, position){
		// summary:
		//		Attempt to insert node into the DOM, choosing from various positioning options.
		//		Returns the first argument resolved to a DOM node.
		// node: DOMNode|DocumentFragment|String
		//		id or node reference, or HTML fragment starting with "<" to place relative to refNode
		// refNode: DOMNode|String
		//		id or node reference to use as basis for placement
		// position: String|Number?
		//		string noting the position of node relative to refNode or a
		//		number indicating the location in the childNodes collection of refNode.
		//		Accepted string values are:
		//
		//		- before
		//		- after
		//		- replace
		//		- only
		//		- first
		//		- last
		//
		//		"first" and "last" indicate positions as children of refNode, "replace" replaces refNode,
		//		"only" replaces all children.  position defaults to "last" if not specified
		// returns: DOMNode
		//		Returned values is the first argument resolved to a DOM node.
		//
		//		.place() is also a method of `dojo/NodeList`, allowing `dojo/query` node lookups.
		// example:
		//		Place a node by string id as the last child of another node by string id:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.place("someNode", "anotherNode");
		//	|	});
		// example:
		//		Place a node by string id before another node by string id
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.place("someNode", "anotherNode", "before");
		//	|	});
		// example:
		//		Create a Node, and place it in the body element (last child):
		//	|	require(["dojo/dom-construct", "dojo/_base/window"
		//	|	], function(domConstruct, win){
		//	|		domConstruct.place("<div></div>", win.body());
		//	|	});
		// example:
		//		Put a new LI as the first child of a list by id:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.place("<li></li>", "someUl", "first");
		//	|	});

		refNode = dom.byId(refNode);
		if(typeof node == "string"){ // inline'd type check
			node = /^\s*</.test(node) ? exports.toDom(node, refNode.ownerDocument) : dom.byId(node);
		}
		if(typeof position == "number"){ // inline'd type check
			var cn = refNode.childNodes;
			if(!cn.length || cn.length <= position){
				refNode.appendChild(node);
			}else{
				_insertBefore(node, cn[position < 0 ? 0 : position]);
			}
		}else{
			switch(position){
				case "before":
					_insertBefore(node, refNode);
					break;
				case "after":
					_insertAfter(node, refNode);
					break;
				case "replace":
					refNode.parentNode.replaceChild(node, refNode);
					break;
				case "only":
					exports.empty(refNode);
					refNode.appendChild(node);
					break;
				case "first":
					if(refNode.firstChild){
						_insertBefore(node, refNode.firstChild);
						break;
					}
					// else fallthrough...
				default: // aka: last
					refNode.appendChild(node);
			}
		}
		return node; // DomNode
	};

	var create = exports.create = function create(/*DOMNode|String*/ tag, /*Object*/ attrs, /*DOMNode|String?*/ refNode, /*String?*/ pos){
		// summary:
		//		Create an element, allowing for optional attribute decoration
		//		and placement.
		// description:
		//		A DOM Element creation function. A shorthand method for creating a node or
		//		a fragment, and allowing for a convenient optional attribute setting step,
		//		as well as an optional DOM placement reference.
		//
		//		Attributes are set by passing the optional object through `dojo/dom-attr.set`.
		//		See `dojo/dom-attr.set` for noted caveats and nuances, and API if applicable.
		//
		//		Placement is done via `dojo/dom-construct.place`, assuming the new node to be
		//		the action node, passing along the optional reference node and position.
		// tag: DOMNode|String
		//		A string of the element to create (eg: "div", "a", "p", "li", "script", "br"),
		//		or an existing DOM node to process.
		// attrs: Object
		//		An object-hash of attributes to set on the newly created node.
		//		Can be null, if you don't want to set any attributes/styles.
		//		See: `dojo/dom-attr.set` for a description of available attributes.
		// refNode: DOMNode|String?
		//		Optional reference node. Used by `dojo/dom-construct.place` to place the newly created
		//		node somewhere in the dom relative to refNode. Can be a DomNode reference
		//		or String ID of a node.
		// pos: String?
		//		Optional positional reference. Defaults to "last" by way of `dojo/domConstruct.place`,
		//		though can be set to "first","after","before","last", "replace" or "only"
		//		to further control the placement of the new node relative to the refNode.
		//		'refNode' is required if a 'pos' is specified.
		// example:
		//		Create a DIV:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		var n = domConstruct.create("div");
		//	|	});
		//
		// example:
		//		Create a DIV with content:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		var n = domConstruct.create("div", { innerHTML:"<p>hi</p>" });
		//	|	});
		//
		// example:
		//		Place a new DIV in the BODY, with no attributes set
		//	|	require(["dojo/dom-construct", "dojo/_base/window"], function(domConstruct, win){
		//	|		var n = domConstruct.create("div", null, win.body());
		//	|	});
		//
		// example:
		//		Create an UL, and populate it with LI's. Place the list as the first-child of a
		//		node with id="someId":
		//	|	require(["dojo/dom-construct", "dojo/_base/array"],
		//	|	function(domConstruct, arrayUtil){
		//	|		var ul = domConstruct.create("ul", null, "someId", "first");
		//	|		var items = ["one", "two", "three", "four"];
		//	|		arrayUtil.forEach(items, function(data){
		//	|			domConstruct.create("li", { innerHTML: data }, ul);
		//	|		});
		//	|	});
		//
		// example:
		//		Create an anchor, with an href. Place in BODY:
		//	|	require(["dojo/dom-construct", "dojo/_base/window"], function(domConstruct, win){
		//	|		domConstruct.create("a", { href:"foo.html", title:"Goto FOO!" }, win.body());
		//	|	});

		var doc = win.doc;
		if(refNode){
			refNode = dom.byId(refNode);
			doc = refNode.ownerDocument;
		}
		if(typeof tag == "string"){ // inline'd type check
			tag = doc.createElement(tag);
		}
		if(attrs){ attr.set(tag, attrs); }
		if(refNode){ exports.place(tag, refNode, pos); }
		return tag; // DomNode
	};

	function _empty(/*DomNode*/ node){
		// TODO: remove this if() block in 2.0 when we no longer have to worry about IE memory leaks,
		// and then uncomment the emptyGrandchildren() test case from html.html.
		// Note that besides fixing #16957, using removeChild() is actually faster than setting node.innerHTML,
		// see http://jsperf.com/clear-dom-node.
		if("innerHTML" in node){
			try{
				// fast path
				node.innerHTML = "";
				return;
			}catch(e){
				// innerHTML is readOnly (e.g. TABLE (sub)elements in quirks mode)
				// Fall through (saves bytes)
			}
		}

		// SVG/strict elements don't support innerHTML
		for(var c; c = node.lastChild;){ // intentional assignment
			node.removeChild(c);
		}
	}

	exports.empty = function empty(/*DOMNode|String*/ node){
		// summary:
		//		safely removes all children of the node.
		// node: DOMNode|String
		//		a reference to a DOM node or an id.
		// example:
		//		Destroy node's children byId:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.empty("someId");
		//	|	});

		_empty(dom.byId(node));
	};


	function _destroy(/*DomNode*/ node, /*DomNode*/ parent){
		// in IE quirks, node.canHaveChildren can be false but firstChild can be non-null (OBJECT/APPLET)
		if(node.firstChild){
			_empty(node);
		}
		if(parent){
			// removeNode(false) doesn't leak in IE 6+, but removeChild() and removeNode(true) are known to leak under IE 8- while 9+ is TBD.
			// In IE quirks mode, PARAM nodes as children of OBJECT/APPLET nodes have a removeNode method that does nothing and
			// the parent node has canHaveChildren=false even though removeChild correctly removes the PARAM children.
			// In IE, SVG/strict nodes don't have a removeNode method nor a canHaveChildren boolean.
			has("ie") && parent.canHaveChildren && "removeNode" in node ? node.removeNode(false) : parent.removeChild(node);
		}
	}
	var destroy = exports.destroy = function destroy(/*DOMNode|String*/ node){
		// summary:
		//		Removes a node from its parent, clobbering it and all of its
		//		children.
		//
		// description:
		//		Removes a node from its parent, clobbering it and all of its
		//		children. Function only works with DomNodes, and returns nothing.
		//
		// node: DOMNode|String
		//		A String ID or DomNode reference of the element to be destroyed
		//
		// example:
		//		Destroy a node byId:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.destroy("someId");
		//	|	});

		node = dom.byId(node);
		if(!node){ return; }
		_destroy(node, node.parentNode);
	};
});

},
'dojo/dom-class':function(){
define(["./_base/lang", "./_base/array", "./dom"], function(lang, array, dom){
	// module:
	//		dojo/dom-class

	var className = "className";

	/* Part I of classList-based implementation is preserved here for posterity
	var classList = "classList";
	has.add("dom-classList", function(){
		return classList in document.createElement("p");
	});
	*/

	// =============================
	// (CSS) Class Functions
	// =============================

	var cls, // exports object
		spaces = /\s+/, a1 = [""];

	function str2array(s){
		if(typeof s == "string" || s instanceof String){
			if(s && !spaces.test(s)){
				a1[0] = s;
				return a1;
			}
			var a = s.split(spaces);
			if(a.length && !a[0]){
				a.shift();
			}
			if(a.length && !a[a.length - 1]){
				a.pop();
			}
			return a;
		}
		// assumed to be an array
		if(!s){
			return [];
		}
		return array.filter(s, function(x){ return x; });
	}

	/* Part II of classList-based implementation is preserved here for posterity
	if(has("dom-classList")){
		// new classList version
		cls = {
			contains: function containsClass(node, classStr){
				var clslst = classStr && dom.byId(node)[classList];
				return clslst && clslst.contains(classStr); // Boolean
			},

			add: function addClass(node, classStr){
				node = dom.byId(node);
				classStr = str2array(classStr);
				for(var i = 0, len = classStr.length; i < len; ++i){
					node[classList].add(classStr[i]);
				}
			},

			remove: function removeClass(node, classStr){
				node = dom.byId(node);
				if(classStr === undefined){
					node[className] = "";
				}else{
					classStr = str2array(classStr);
					for(var i = 0, len = classStr.length; i < len; ++i){
						node[classList].remove(classStr[i]);
					}
				}
			},

			replace: function replaceClass(node, addClassStr, removeClassStr){
				node = dom.byId(node);
				if(removeClassStr === undefined){
					node[className] = "";
				}else{
					removeClassStr = str2array(removeClassStr);
					for(var i = 0, len = removeClassStr.length; i < len; ++i){
						node[classList].remove(removeClassStr[i]);
					}
				}
				addClassStr = str2array(addClassStr);
				for(i = 0, len = addClassStr.length; i < len; ++i){
					node[classList].add(addClassStr[i]);
				}
			},

			toggle: function toggleClass(node, classStr, condition){
				node = dom.byId(node);
				if(condition === undefined){
					classStr = str2array(classStr);
					for(var i = 0, len = classStr.length; i < len; ++i){
						node[classList].toggle(classStr[i]);
					}
				}else{
					cls[condition ? "add" : "remove"](node, classStr);
				}
				return condition;   // Boolean
			}
		}
	}
	*/

	// regular DOM version
	var fakeNode = {};  // for effective replacement
	cls = {
		// summary:
		//		This module defines the core dojo DOM class API.

		contains: function containsClass(/*DomNode|String*/ node, /*String*/ classStr){
			// summary:
			//		Returns whether or not the specified classes are a portion of the
			//		class list currently applied to the node.
			// node: String|DOMNode
			//		String ID or DomNode reference to check the class for.
			// classStr: String
			//		A string class name to look for.
			// example:
			//		Do something if a node with id="someNode" has class="aSillyClassName" present
			//	|	if(dojo.hasClass("someNode","aSillyClassName")){ ... }

			return ((" " + dom.byId(node)[className] + " ").indexOf(" " + classStr + " ") >= 0); // Boolean
		},

		add: function addClass(/*DomNode|String*/ node, /*String|Array*/ classStr){
			// summary:
			//		Adds the specified classes to the end of the class list on the
			//		passed node. Will not re-apply duplicate classes.
			//
			// node: String|DOMNode
			//		String ID or DomNode reference to add a class string too
			//
			// classStr: String|Array
			//		A String class name to add, or several space-separated class names,
			//		or an array of class names.
			//
			// example:
			//		Add a class to some node:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.add("someNode", "anewClass");
			//	|	});
			//
			// example:
			//		Add two classes at once:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.add("someNode", "firstClass secondClass");
			//	|	});
			//
			// example:
			//		Add two classes at once (using array):
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.add("someNode", ["firstClass", "secondClass"]);
			//	|	});
			//
			// example:
			//		Available in `dojo/NodeList` for multiple additions
			//	|	require(["dojo/query"], function(query){
			//	|		query("ul > li").addClass("firstLevel");
			//	|	});

			node = dom.byId(node);
			classStr = str2array(classStr);
			var cls = node[className], oldLen;
			cls = cls ? " " + cls + " " : " ";
			oldLen = cls.length;
			for(var i = 0, len = classStr.length, c; i < len; ++i){
				c = classStr[i];
				if(c && cls.indexOf(" " + c + " ") < 0){
					cls += c + " ";
				}
			}
			if(oldLen < cls.length){
				node[className] = cls.substr(1, cls.length - 2);
			}
		},

		remove: function removeClass(/*DomNode|String*/ node, /*String|Array?*/ classStr){
			// summary:
			//		Removes the specified classes from node. No `contains()`
			//		check is required.
			//
			// node: String|DOMNode
			//		String ID or DomNode reference to remove the class from.
			//
			// classStr: String|Array
			//		An optional String class name to remove, or several space-separated
			//		class names, or an array of class names. If omitted, all class names
			//		will be deleted.
			//
			// example:
			//		Remove a class from some node:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.remove("someNode", "firstClass");
			//	|	});
			//
			// example:
			//		Remove two classes from some node:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.remove("someNode", "firstClass secondClass");
			//	|	});
			//
			// example:
			//		Remove two classes from some node (using array):
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.remove("someNode", ["firstClass", "secondClass"]);
			//	|	});
			//
			// example:
			//		Remove all classes from some node:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.remove("someNode");
			//	|	});
			//
			// example:
			//		Available in `dojo/NodeList` for multiple removal
			//	|	require(["dojo/query"], function(query){
			//	|		query("ul > li").removeClass("foo");
			//	|	});

			node = dom.byId(node);
			var cls;
			if(classStr !== undefined){
				classStr = str2array(classStr);
				cls = " " + node[className] + " ";
				for(var i = 0, len = classStr.length; i < len; ++i){
					cls = cls.replace(" " + classStr[i] + " ", " ");
				}
				cls = lang.trim(cls);
			}else{
				cls = "";
			}
			if(node[className] != cls){ node[className] = cls; }
		},

		replace: function replaceClass(/*DomNode|String*/ node, /*String|Array*/ addClassStr, /*String|Array?*/ removeClassStr){
			// summary:
			//		Replaces one or more classes on a node if not present.
			//		Operates more quickly than calling dojo.removeClass and dojo.addClass
			//
			// node: String|DOMNode
			//		String ID or DomNode reference to remove the class from.
			//
			// addClassStr: String|Array
			//		A String class name to add, or several space-separated class names,
			//		or an array of class names.
			//
			// removeClassStr: String|Array?
			//		A String class name to remove, or several space-separated class names,
			//		or an array of class names.
			//
			// example:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.replace("someNode", "add1 add2", "remove1 remove2");
			//	|	});
			//
			// example:
			//	Replace all classes with addMe
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.replace("someNode", "addMe");
			//	|	});
			//
			// example:
			//	Available in `dojo/NodeList` for multiple toggles
			//	|	require(["dojo/query"], function(query){
			//	|		query(".findMe").replaceClass("addMe", "removeMe");
			//	|	});

			node = dom.byId(node);
			fakeNode[className] = node[className];
			cls.remove(fakeNode, removeClassStr);
			cls.add(fakeNode, addClassStr);
			if(node[className] !== fakeNode[className]){
				node[className] = fakeNode[className];
			}
		},

		toggle: function toggleClass(/*DomNode|String*/ node, /*String|Array*/ classStr, /*Boolean?*/ condition){
			// summary:
			//		Adds a class to node if not present, or removes if present.
			//		Pass a boolean condition if you want to explicitly add or remove.
			//		Returns the condition that was specified directly or indirectly.
			//
			// node: String|DOMNode
			//		String ID or DomNode reference to toggle a class string
			//
			// classStr: String|Array
			//		A String class name to toggle, or several space-separated class names,
			//		or an array of class names.
			//
			// condition:
			//		If passed, true means to add the class, false means to remove.
			//		Otherwise dojo.hasClass(node, classStr) is used to detect the class presence.
			//
			// example:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.toggle("someNode", "hovered");
			//	|	});
			//
			// example:
			//		Forcefully add a class
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.toggle("someNode", "hovered", true);
			//	|	});
			//
			// example:
			//		Available in `dojo/NodeList` for multiple toggles
			//	|	require(["dojo/query"], function(query){
			//	|		query(".toggleMe").toggleClass("toggleMe");
			//	|	});

			node = dom.byId(node);
			if(condition === undefined){
				classStr = str2array(classStr);
				for(var i = 0, len = classStr.length, c; i < len; ++i){
					c = classStr[i];
					cls[cls.contains(node, c) ? "remove" : "add"](node, c);
				}
			}else{
				cls[condition ? "add" : "remove"](node, classStr);
			}
			return condition;   // Boolean
		}
	};

	return cls;
});

},
'dojo/_base/NodeList':function(){
define(["./kernel", "../query", "./array", "./html", "../NodeList-dom"], function(dojo, query, array){
	// module:
	//		dojo/_base/NodeList

	/*=====
	return {
		// summary:
		//		This module extends dojo/NodeList with the legacy connect(), coords(),
		//		blur(), focus(), change(), click(), error(), keydown(), keypress(),
		//		keyup(), load(), mousedown(), mouseenter(), mouseleave(), mousemove(),
		//		mouseout(), mouseover(), mouseup(), and submit() methods.
	};
	=====*/
 
	var NodeList = query.NodeList,
		nlp = NodeList.prototype;

	nlp.connect = NodeList._adaptAsForEach(function(){
		// don't bind early to dojo.connect since we no longer explicitly depend on it
		return dojo.connect.apply(this, arguments);
	});
	/*=====
	nlp.connect = function(methodName, objOrFunc, funcName){
		// summary:
		//		Attach event handlers to every item of the NodeList. Uses dojo.connect()
		//		so event properties are normalized.
		//
		//		Application must manually require() "dojo/_base/connect" before using this method.
		// methodName: String
		//		the name of the method to attach to. For DOM events, this should be
		//		the lower-case name of the event
		// objOrFunc: Object|Function|String
		//		if 2 arguments are passed (methodName, objOrFunc), objOrFunc should
		//		reference a function or be the name of the function in the global
		//		namespace to attach. If 3 arguments are provided
		//		(methodName, objOrFunc, funcName), objOrFunc must be the scope to
		//		locate the bound function in
		// funcName: String?
		//		optional. A string naming the function in objOrFunc to bind to the
		//		event. May also be a function reference.
		// example:
		//		add an onclick handler to every button on the page
		//		|	query("div:nth-child(odd)").connect("onclick", function(e){
		//		|		 0 && console.log("clicked!");
		//		|	});
		// example:
		//		attach foo.bar() to every odd div's onmouseover
		//		|	query("div:nth-child(odd)").connect("onmouseover", foo, "bar");

		return null;	// NodeList
	};
	=====*/

	nlp.coords = NodeList._adaptAsMap(dojo.coords);
	/*=====
	nlp.coords = function(){
		// summary:
		//		Deprecated: Use position() for border-box x/y/w/h
		//		or marginBox() for margin-box w/h/l/t.
		//		Returns the box objects of all elements in a node list as
		//		an Array (*not* a NodeList). Acts like `domGeom.coords`, though assumes
		//		the node passed is each node in this list.

		return []; // Array
	};
	=====*/

	NodeList.events = [
		// summary:
		//		list of all DOM events used in NodeList
		"blur", "focus", "change", "click", "error", "keydown", "keypress",
		"keyup", "load", "mousedown", "mouseenter", "mouseleave", "mousemove",
		"mouseout", "mouseover", "mouseup", "submit"
	];

	// FIXME: pseudo-doc the above automatically generated on-event functions

	// syntactic sugar for DOM events
	array.forEach(NodeList.events, function(evt){
			var _oe = "on" + evt;
			nlp[_oe] = function(a, b){
				return this.connect(_oe, a, b);
			};
				// FIXME: should these events trigger publishes?
				/*
				return (a ? this.connect(_oe, a, b) :
							this.forEach(function(n){
								// FIXME:
								//		listeners get buried by
								//		addEventListener and can't be dug back
								//		out to be triggered externally.
								// see:
								//		http://developer.mozilla.org/en/docs/DOM:element

								 0 && console.log(n, evt, _oe);

								// FIXME: need synthetic event support!
								var _e = { target: n, faux: true, type: evt };
								// dojo._event_listener._synthesizeEvent({}, { target: n, faux: true, type: evt });
								try{ n[evt](_e); }catch(e){  0 && console.log(e); }
								try{ n[_oe](_e); }catch(e){  0 && console.log(e); }
							})
				);
				*/
		}
	);

	dojo.NodeList = NodeList;
	return NodeList;
});

},
'dojo/query':function(){
define(["./_base/kernel", "./has", "./dom", "./on", "./_base/array", "./_base/lang", "./selector/_loader", "./selector/_loader!default"],
	function(dojo, has, dom, on, array, lang, loader, defaultEngine){

	"use strict";

	has.add("array-extensible", function(){
		// test to see if we can extend an array (not supported in old IE)
		return lang.delegate([], {length: 1}).length == 1 && !has("bug-for-in-skips-shadowed");
	});
	
	var ap = Array.prototype, aps = ap.slice, apc = ap.concat, forEach = array.forEach;

	var tnl = function(/*Array*/ a, /*dojo/NodeList?*/ parent, /*Function?*/ NodeListCtor){
		// summary:
		//		decorate an array to make it look like a `dojo/NodeList`.
		// a:
		//		Array of nodes to decorate.
		// parent:
		//		An optional parent NodeList that generated the current
		//		list of nodes. Used to call _stash() so the parent NodeList
		//		can be accessed via end() later.
		// NodeListCtor:
		//		An optional constructor function to use for any
		//		new NodeList calls. This allows a certain chain of
		//		NodeList calls to use a different object than dojo/NodeList.
		var nodeList = new (NodeListCtor || this._NodeListCtor || nl)(a);
		return parent ? nodeList._stash(parent) : nodeList;
	};

	var loopBody = function(f, a, o){
		a = [0].concat(aps.call(a, 0));
		o = o || dojo.global;
		return function(node){
			a[0] = node;
			return f.apply(o, a);
		};
	};

	// adapters

	var adaptAsForEach = function(f, o){
		// summary:
		//		adapts a single node function to be used in the forEach-type
		//		actions. The initial object is returned from the specialized
		//		function.
		// f: Function
		//		a function to adapt
		// o: Object?
		//		an optional context for f
		return function(){
			this.forEach(loopBody(f, arguments, o));
			return this;	// Object
		};
	};

	var adaptAsMap = function(f, o){
		// summary:
		//		adapts a single node function to be used in the map-type
		//		actions. The return is a new array of values, as via `dojo/_base/array.map`
		// f: Function
		//		a function to adapt
		// o: Object?
		//		an optional context for f
		return function(){
			return this.map(loopBody(f, arguments, o));
		};
	};

	var adaptAsFilter = function(f, o){
		// summary:
		//		adapts a single node function to be used in the filter-type actions
		// f: Function
		//		a function to adapt
		// o: Object?
		//		an optional context for f
		return function(){
			return this.filter(loopBody(f, arguments, o));
		};
	};

	var adaptWithCondition = function(f, g, o){
		// summary:
		//		adapts a single node function to be used in the map-type
		//		actions, behaves like forEach() or map() depending on arguments
		// f: Function
		//		a function to adapt
		// g: Function
		//		a condition function, if true runs as map(), otherwise runs as forEach()
		// o: Object?
		//		an optional context for f and g
		return function(){
			var a = arguments, body = loopBody(f, a, o);
			if(g.call(o || dojo.global, a)){
				return this.map(body);	// self
			}
			this.forEach(body);
			return this;	// self
		};
	};

	var NodeList = function(array){
		// summary:
		//		Array-like object which adds syntactic
		//		sugar for chaining, common iteration operations, animation, and
		//		node manipulation. NodeLists are most often returned as the
		//		result of dojo/query() calls.
		// description:
		//		NodeList instances provide many utilities that reflect
		//		core Dojo APIs for Array iteration and manipulation, DOM
		//		manipulation, and event handling. Instead of needing to dig up
		//		functions in the dojo package, NodeLists generally make the
		//		full power of Dojo available for DOM manipulation tasks in a
		//		simple, chainable way.
		// example:
		//		create a node list from a node
		//		|	require(["dojo/query", "dojo/dom"
		//		|	], function(query, dom){
		//		|		query.NodeList(dom.byId("foo"));
		//		|	});
		// example:
		//		get a NodeList from a CSS query and iterate on it
		//		|	require(["dojo/on", "dojo/dom"
		//		|	], function(on, dom){
		//		|		var l = query(".thinger");
		//		|		l.forEach(function(node, index, nodeList){
		//		|			 0 && console.log(index, node.innerHTML);
		//		|		});
		//		|	});
		// example:
		//		use native and Dojo-provided array methods to manipulate a
		//		NodeList without needing to use dojo.* functions explicitly:
		//		|	require(["dojo/query", "dojo/dom-construct", "dojo/dom"
		//		|	], function(query, domConstruct, dom){
		//		|		var l = query(".thinger");
		//		|		// since NodeLists are real arrays, they have a length
		//		|		// property that is both readable and writable and
		//		|		// push/pop/shift/unshift methods
		//		|		 0 && console.log(l.length);
		//		|		l.push(domConstruct.create("span"));
		//		|
		//		|		// dojo's normalized array methods work too:
		//		|		 0 && console.log( l.indexOf(dom.byId("foo")) );
		//		|		// ...including the special "function as string" shorthand
		//		|		 0 && console.log( l.every("item.nodeType == 1") );
		//		|
		//		|		// NodeLists can be [..] indexed, or you can use the at()
		//		|		// function to get specific items wrapped in a new NodeList:
		//		|		var node = l[3]; // the 4th element
		//		|		var newList = l.at(1, 3); // the 2nd and 4th elements
		//		|	});
		// example:
		//		chainability is a key advantage of NodeLists:
		//		|	require(["dojo/query", "dojo/NodeList-dom"
		//		|	], function(query){
		//		|		query(".thinger")
		//		|			.onclick(function(e){ /* ... */ })
		//		|			.at(1, 3, 8) // get a subset
		//		|				.style("padding", "5px")
		//		|				.forEach(console.log);
		//		|	});

		var isNew = this instanceof nl && has("array-extensible");
		if(typeof array == "number"){
			array = Array(array);
		}
		var nodeArray = (array && "length" in array) ? array : arguments;
		if(isNew || !nodeArray.sort){
			// make sure it's a real array before we pass it on to be wrapped 
			var target = isNew ? this : [],
				l = target.length = nodeArray.length;
			for(var i = 0; i < l; i++){
				target[i] = nodeArray[i];
			}
			if(isNew){
				// called with new operator, this means we are going to use this instance and push
				// the nodes on to it. This is usually much faster since the NodeList properties
				//	don't need to be copied (unless the list of nodes is extremely large).
				return target;
			}
			nodeArray = target;
		}
		// called without new operator, use a real array and copy prototype properties,
		// this is slower and exists for back-compat. Should be removed in 2.0.
		lang._mixin(nodeArray, nlp);
		nodeArray._NodeListCtor = function(array){
			// call without new operator to preserve back-compat behavior
			return nl(array);
		};
		return nodeArray;
	};
	
	var nl = NodeList, nlp = nl.prototype = 
		has("array-extensible") ? [] : {};// extend an array if it is extensible

	// expose adapters and the wrapper as private functions

	nl._wrap = nlp._wrap = tnl;
	nl._adaptAsMap = adaptAsMap;
	nl._adaptAsForEach = adaptAsForEach;
	nl._adaptAsFilter  = adaptAsFilter;
	nl._adaptWithCondition = adaptWithCondition;

	// mass assignment

	// add array redirectors
	forEach(["slice", "splice"], function(name){
		var f = ap[name];
		//Use a copy of the this array via this.slice() to allow .end() to work right in the splice case.
		// CANNOT apply ._stash()/end() to splice since it currently modifies
		// the existing this array -- it would break backward compatibility if we copy the array before
		// the splice so that we can use .end(). So only doing the stash option to this._wrap for slice.
		nlp[name] = function(){ return this._wrap(f.apply(this, arguments), name == "slice" ? this : null); };
	});
	// concat should be here but some browsers with native NodeList have problems with it

	// add array.js redirectors
	forEach(["indexOf", "lastIndexOf", "every", "some"], function(name){
		var f = array[name];
		nlp[name] = function(){ return f.apply(dojo, [this].concat(aps.call(arguments, 0))); };
	});

	lang.extend(NodeList, {
		// copy the constructors
		constructor: nl,
		_NodeListCtor: nl,
		toString: function(){
			// Array.prototype.toString can't be applied to objects, so we use join
			return this.join(",");
		},
		_stash: function(parent){
			// summary:
			//		private function to hold to a parent NodeList. end() to return the parent NodeList.
			//
			// example:
			//		How to make a `dojo/NodeList` method that only returns the third node in
			//		the dojo/NodeList but allows access to the original NodeList by using this._stash:
			//	|	require(["dojo/query", "dojo/_base/lang", "dojo/NodeList", "dojo/NodeList-dom"
			//	|	], function(query, lang){
			//	|		lang.extend(NodeList, {
			//	|			third: function(){
			//	|				var newNodeList = NodeList(this[2]);
			//	|				return newNodeList._stash(this);
			//	|			}
			//	|		});
			//	|		// then see how _stash applies a sub-list, to be .end()'ed out of
			//	|		query(".foo")
			//	|			.third()
			//	|				.addClass("thirdFoo")
			//	|			.end()
			//	|			// access to the orig .foo list
			//	|			.removeClass("foo")
			//	|	});
			//
			this._parent = parent;
			return this; // dojo/NodeList
		},

		on: function(eventName, listener){
			// summary:
			//		Listen for events on the nodes in the NodeList. Basic usage is:
			//
			// example:
			//		|	require(["dojo/query"
			//		|	], function(query){
			//		|		query(".my-class").on("click", listener);
			//			This supports event delegation by using selectors as the first argument with the event names as
			//			pseudo selectors. For example:
			//		| 		query("#my-list").on("li:click", listener);
			//			This will listen for click events within `<li>` elements that are inside the `#my-list` element.
			//			Because on supports CSS selector syntax, we can use comma-delimited events as well:
			//		| 		query("#my-list").on("li button:mouseover, li:click", listener);
			//		|	});
			var handles = this.map(function(node){
				return on(node, eventName, listener); // TODO: apply to the NodeList so the same selector engine is used for matches
			});
			handles.remove = function(){
				for(var i = 0; i < handles.length; i++){
					handles[i].remove();
				}
			};
			return handles;
		},

		end: function(){
			// summary:
			//		Ends use of the current `NodeList` by returning the previous NodeList
			//		that generated the current NodeList.
			// description:
			//		Returns the `NodeList` that generated the current `NodeList`. If there
			//		is no parent NodeList, an empty NodeList is returned.
			// example:
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("a")
			//	|			.filter(".disabled")
			//	|				// operate on the anchors that only have a disabled class
			//	|				.style("color", "grey")
			//	|			.end()
			//	|			// jump back to the list of anchors
			//	|			.style(...)
			//	|	});
			//
			if(this._parent){
				return this._parent;
			}else{
				//Just return empty list.
				return new this._NodeListCtor(0);
			}
		},

		// http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array#Methods

		// FIXME: handle return values for #3244
		//		http://trac.dojotoolkit.org/ticket/3244

		// FIXME:
		//		need to wrap or implement:
		//			join (perhaps w/ innerHTML/outerHTML overload for toString() of items?)
		//			reduce
		//			reduceRight

		/*=====
		slice: function(begin, end){
			// summary:
			//		Returns a new NodeList, maintaining this one in place
			// description:
			//		This method behaves exactly like the Array.slice method
			//		with the caveat that it returns a `dojo/NodeList` and not a
			//		raw Array. For more details, see Mozilla's [slice
			//		documentation](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/slice)
			// begin: Integer
			//		Can be a positive or negative integer, with positive
			//		integers noting the offset to begin at, and negative
			//		integers denoting an offset from the end (i.e., to the left
			//		of the end)
			// end: Integer?
			//		Optional parameter to describe what position relative to
			//		the NodeList's zero index to end the slice at. Like begin,
			//		can be positive or negative.
			return this._wrap(a.slice.apply(this, arguments));
		},

		splice: function(index, howmany, item){
			// summary:
			//		Returns a new NodeList, manipulating this NodeList based on
			//		the arguments passed, potentially splicing in new elements
			//		at an offset, optionally deleting elements
			// description:
			//		This method behaves exactly like the Array.splice method
			//		with the caveat that it returns a `dojo/NodeList` and not a
			//		raw Array. For more details, see Mozilla's [splice
			//		documentation](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice)
			//		For backwards compatibility, calling .end() on the spliced NodeList
			//		does not return the original NodeList -- splice alters the NodeList in place.
			// index: Integer
			//		begin can be a positive or negative integer, with positive
			//		integers noting the offset to begin at, and negative
			//		integers denoting an offset from the end (i.e., to the left
			//		of the end)
			// howmany: Integer?
			//		Optional parameter to describe what position relative to
			//		the NodeList's zero index to end the slice at. Like begin,
			//		can be positive or negative.
			// item: Object...?
			//		Any number of optional parameters may be passed in to be
			//		spliced into the NodeList
			return this._wrap(a.splice.apply(this, arguments));	// dojo/NodeList
		},

		indexOf: function(value, fromIndex){
			// summary:
			//		see `dojo/_base/array.indexOf()`. The primary difference is that the acted-on
			//		array is implicitly this NodeList
			// value: Object
			//		The value to search for.
			// fromIndex: Integer?
			//		The location to start searching from. Optional. Defaults to 0.
			// description:
			//		For more details on the behavior of indexOf, see Mozilla's
			//		[indexOf
			//		docs](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf)
			// returns:
			//		Positive Integer or 0 for a match, -1 of not found.
			return d.indexOf(this, value, fromIndex); // Integer
		},

		lastIndexOf: function(value, fromIndex){
			// summary:
			//		see `dojo/_base/array.lastIndexOf()`. The primary difference is that the
			//		acted-on array is implicitly this NodeList
			// description:
			//		For more details on the behavior of lastIndexOf, see
			//		Mozilla's [lastIndexOf
			//		docs](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/lastIndexOf)
			// value: Object
			//		The value to search for.
			// fromIndex: Integer?
			//		The location to start searching from. Optional. Defaults to 0.
			// returns:
			//		Positive Integer or 0 for a match, -1 of not found.
			return d.lastIndexOf(this, value, fromIndex); // Integer
		},

		every: function(callback, thisObject){
			// summary:
			//		see `dojo/_base/array.every()` and the [Array.every
			//		docs](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every).
			//		Takes the same structure of arguments and returns as
			//		dojo/_base/array.every() with the caveat that the passed array is
			//		implicitly this NodeList
			// callback: Function
			//		the callback
			// thisObject: Object?
			//		the context
			return d.every(this, callback, thisObject); // Boolean
		},

		some: function(callback, thisObject){
			// summary:
			//		Takes the same structure of arguments and returns as
			//		`dojo/_base/array.some()` with the caveat that the passed array is
			//		implicitly this NodeList.  See `dojo/_base/array.some()` and Mozilla's
			//		[Array.some
			//		documentation](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some).
			// callback: Function
			//		the callback
			// thisObject: Object?
			//		the context
			return d.some(this, callback, thisObject); // Boolean
		},
		=====*/

		concat: function(item){
			// summary:
			//		Returns a new NodeList comprised of items in this NodeList
			//		as well as items passed in as parameters
			// description:
			//		This method behaves exactly like the Array.concat method
			//		with the caveat that it returns a `NodeList` and not a
			//		raw Array. For more details, see the [Array.concat
			//		docs](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/concat)
			// item: Object?
			//		Any number of optional parameters may be passed in to be
			//		spliced into the NodeList

			//return this._wrap(apc.apply(this, arguments));
			// the line above won't work for the native NodeList, or for Dojo NodeLists either :-(

			// implementation notes:
			// Array.concat() doesn't recognize native NodeLists or Dojo NodeLists
			// as arrays, and so does not inline them into a unioned array, but
			// appends them as single entities. Both the original NodeList and the
			// items passed in as parameters must be converted to raw Arrays
			// and then the concatenation result may be re-_wrap()ed as a Dojo NodeList.

			var t = aps.call(this, 0),
				m = array.map(arguments, function(a){
					return aps.call(a, 0);
				});
			return this._wrap(apc.apply(t, m), this);	// dojo/NodeList
		},

		map: function(/*Function*/ func, /*Function?*/ obj){
			// summary:
			//		see `dojo/_base/array.map()`. The primary difference is that the acted-on
			//		array is implicitly this NodeList and the return is a
			//		NodeList (a subclass of Array)
			return this._wrap(array.map(this, func, obj), this); // dojo/NodeList
		},

		forEach: function(callback, thisObj){
			// summary:
			//		see `dojo/_base/array.forEach()`. The primary difference is that the acted-on
			//		array is implicitly this NodeList. If you want the option to break out
			//		of the forEach loop, use every() or some() instead.
			forEach(this, callback, thisObj);
			// non-standard return to allow easier chaining
			return this; // dojo/NodeList
		},
		filter: function(/*String|Function*/ filter){
			// summary:
			//		"masks" the built-in javascript filter() method (supported
			//		in Dojo via `dojo/_base/array.filter`) to support passing a simple
			//		string filter in addition to supporting filtering function
			//		objects.
			// filter:
			//		If a string, a CSS rule like ".thinger" or "div > span".
			// example:
			//		"regular" JS filter syntax as exposed in `dojo/_base/array.filter`:
			//		|	require(["dojo/query", "dojo/NodeList-dom"
			//		|	], function(query){
			//		|		query("*").filter(function(item){
			//		|			// highlight every paragraph
			//		|			return (item.nodeName == "p");
			//		|		}).style("backgroundColor", "yellow");
			//		|	});
			// example:
			//		the same filtering using a CSS selector
			//		|	require(["dojo/query", "dojo/NodeList-dom"
			//		|	], function(query){
			//		|		query("*").filter("p").styles("backgroundColor", "yellow");
			//		|	});

			var a = arguments, items = this, start = 0;
			if(typeof filter == "string"){ // inline'd type check
				items = query._filterResult(this, a[0]);
				if(a.length == 1){
					// if we only got a string query, pass back the filtered results
					return items._stash(this); // dojo/NodeList
				}
				// if we got a callback, run it over the filtered items
				start = 1;
			}
			return this._wrap(array.filter(items, a[start], a[start + 1]), this);	// dojo/NodeList
		},
		instantiate: function(/*String|Object*/ declaredClass, /*Object?*/ properties){
			// summary:
			//		Create a new instance of a specified class, using the
			//		specified properties and each node in the NodeList as a
			//		srcNodeRef.
			// example:
			//		Grabs all buttons in the page and converts them to dijit/form/Button's.
			//	|	var buttons = query("button").instantiate(Button, {showLabel: true});
			var c = lang.isFunction(declaredClass) ? declaredClass : lang.getObject(declaredClass);
			properties = properties || {};
			return this.forEach(function(node){
				new c(properties, node);
			});	// dojo/NodeList
		},
		at: function(/*===== index =====*/){
			// summary:
			//		Returns a new NodeList comprised of items in this NodeList
			//		at the given index or indices.
			//
			// index: Integer...
			//		One or more 0-based indices of items in the current
			//		NodeList. A negative index will start at the end of the
			//		list and go backwards.
			//
			// example:
			//	Shorten the list to the first, second, and third elements
			//	|	require(["dojo/query"
			//	|	], function(query){
			//	|		query("a").at(0, 1, 2).forEach(fn);
			//	|	});
			//
			// example:
			//	Retrieve the first and last elements of a unordered list:
			//	|	require(["dojo/query"
			//	|	], function(query){
			//	|		query("ul > li").at(0, -1).forEach(cb);
			//	|	});
			//
			// example:
			//	Do something for the first element only, but end() out back to
			//	the original list and continue chaining:
			//	|	require(["dojo/query"
			//	|	], function(query){
			//	|		query("a").at(0).onclick(fn).end().forEach(function(n){
			//	|			 0 && console.log(n); // all anchors on the page.
			//	|	})
			//	|	});

			var t = new this._NodeListCtor(0);
			forEach(arguments, function(i){
				if(i < 0){ i = this.length + i; }
				if(this[i]){ t.push(this[i]); }
			}, this);
			return t._stash(this); // dojo/NodeList
		}
	});

	function queryForEngine(engine, NodeList){
		var query = function(/*String*/ query, /*String|DOMNode?*/ root){
			// summary:
			//		Returns nodes which match the given CSS selector, searching the
			//		entire document by default but optionally taking a node to scope
			//		the search by. Returns an instance of NodeList.
			if(typeof root == "string"){
				root = dom.byId(root);
				if(!root){
					return new NodeList([]);
				}
			}
			var results = typeof query == "string" ? engine(query, root) : query ? (query.end && query.on) ? query : [query] : [];
			if(results.end && results.on){
				// already wrapped
				return results;
			}
			return new NodeList(results);
		};
		query.matches = engine.match || function(node, selector, root){
			// summary:
			//		Test to see if a node matches a selector
			return query.filter([node], selector, root).length > 0;
		};
		// the engine provides a filtering function, use it to for matching
		query.filter = engine.filter || function(nodes, selector, root){
			// summary:
			//		Filters an array of nodes. Note that this does not guarantee to return a NodeList, just an array.
			return query(selector, root).filter(function(node){
				return array.indexOf(nodes, node) > -1;
			});
		};
		if(typeof engine != "function"){
			var search = engine.search;
			engine = function(selector, root){
				// Slick does it backwards (or everyone else does it backwards, probably the latter)
				return search(root || document, selector);
			};
		}
		return query;
	}
	var query = queryForEngine(defaultEngine, NodeList);
	/*=====
	query = function(selector, context){
		// summary:
		//		This modules provides DOM querying functionality. The module export is a function
		//		that can be used to query for DOM nodes by CSS selector and returns a NodeList
		//		representing the matching nodes.
		// selector: String
		//		A CSS selector to search for.
		// context: String|DomNode?
		//		An optional context to limit the searching scope. Only nodes under `context` will be
		//		scanned.
		// example:
		//		add an onclick handler to every submit button in the document
		//		which causes the form to be sent via Ajax instead:
		//	|	require(["dojo/query", "dojo/request", "dojo/dom-form", "dojo/dom-construct", "dojo/dom-style"
		//	|	], function(query, request, domForm, domConstruct, domStyle){
		//	|		query("input[type='submit']").on("click", function(e){
		//	|			e.preventDefault(); // prevent sending the form
		//	|			var btn = e.target;
		//	|			request.post("http://example.com/", {
		//	|				data: domForm.toObject(btn.form)
		//	|			}).then(function(response){
		//	|				// replace the form with the response
		//	|				domConstruct.create(div, {innerHTML: response}, btn.form, "after");
		//	|				domStyle.set(btn.form, "display", "none");
		//	|			});
		//	|		});
		//	|	});
		//
		// description:
		//		dojo/query is responsible for loading the appropriate query engine and wrapping
		//		its results with a `NodeList`. You can use dojo/query with a specific selector engine
		//		by using it as a plugin. For example, if you installed the sizzle package, you could
		//		use it as the selector engine with:
		//		|	require(["dojo/query!sizzle"], function(query){
		//		|		query("div")...
		//
		//		The id after the ! can be a module id of the selector engine or one of the following values:
		//
		//		- acme: This is the default engine used by Dojo base, and will ensure that the full
		//		Acme engine is always loaded.
		//
		//		- css2: If the browser has a native selector engine, this will be used, otherwise a
		//		very minimal lightweight selector engine will be loaded that can do simple CSS2 selectors
		//		(by #id, .class, tag, and [name=value] attributes, with standard child or descendant (>)
		//		operators) and nothing more.
		//
		//		- css2.1: If the browser has a native selector engine, this will be used, otherwise the
		//		full Acme engine will be loaded.
		//
		//		- css3: If the browser has a native selector engine with support for CSS3 pseudo
		//		selectors (most modern browsers except IE8), this will be used, otherwise the
		//		full Acme engine will be loaded.
		//
		//		- Or the module id of a selector engine can be used to explicitly choose the selector engine
		//
		//		For example, if you are using CSS3 pseudo selectors in module, you can specify that
		//		you will need support them with:
		//		|	require(["dojo/query!css3"], function(query){
		//		|		query('#t > h3:nth-child(odd)')...
		//
		//		You can also choose the selector engine/load configuration by setting the query-selector:
		//		For example:
		//		|	<script data-dojo-config="query-selector:'css3'" src="dojo.js"></script>
		//
		return new NodeList(); // dojo/NodeList
	 };
	 =====*/

	// the query that is returned from this module is slightly different than dojo.query,
	// because dojo.query has to maintain backwards compatibility with returning a
	// true array which has performance problems. The query returned from the module
	// does not use true arrays, but rather inherits from Array, making it much faster to
	// instantiate.
	dojo.query = queryForEngine(defaultEngine, function(array){
		// call it without the new operator to invoke the back-compat behavior that returns a true array
		return NodeList(array);	// dojo/NodeList
	});

	query.load = function(id, parentRequire, loaded){
		// summary:
		//		can be used as AMD plugin to conditionally load new query engine
		// example:
		//	|	require(["dojo/query!custom"], function(qsa){
		//	|		// loaded selector/custom.js as engine
		//	|		qsa("#foobar").forEach(...);
		//	|	});
		loader.load(id, parentRequire, function(engine){
			loaded(queryForEngine(engine, NodeList));
		});
	};

	dojo._filterQueryResult = query._filterResult = function(nodes, selector, root){
		return new NodeList(query.filter(nodes, selector, root));
	};
	dojo.NodeList = query.NodeList = NodeList;
	return query;
});

},
'dojo/selector/_loader':function(){
define(["../has", "require"],
		function(has, require){

"use strict";
var testDiv = document.createElement("div");
has.add("dom-qsa2.1", !!testDiv.querySelectorAll);
has.add("dom-qsa3", function(){
			// test to see if we have a reasonable native selector engine available
			try{
				testDiv.innerHTML = "<p class='TEST'></p>"; // test kind of from sizzle
				// Safari can't handle uppercase or unicode characters when
				// in quirks mode, IE8 can't handle pseudos like :empty
				return testDiv.querySelectorAll(".TEST:empty").length == 1;
			}catch(e){}
		});
var fullEngine;
var acme = "./acme", lite = "./lite";
return {
	// summary:
	//		This module handles loading the appropriate selector engine for the given browser

	load: function(id, parentRequire, loaded, config){
		var req = require;
		// here we implement the default logic for choosing a selector engine
		id = id == "default" ? has("config-selectorEngine") || "css3" : id;
		id = id == "css2" || id == "lite" ? lite :
				id == "css2.1" ? has("dom-qsa2.1") ? lite : acme :
				id == "css3" ? has("dom-qsa3") ? lite : acme :
				id == "acme" ? acme : (req = parentRequire) && id;
		if(id.charAt(id.length-1) == '?'){
			id = id.substring(0,id.length - 1);
			var optionalLoad = true;
		}
		// the query engine is optional, only load it if a native one is not available or existing one has not been loaded
		if(optionalLoad && (has("dom-compliant-qsa") || fullEngine)){
			return loaded(fullEngine);
		}
		// load the referenced selector engine
		req([id], function(engine){
			if(id != "./lite"){
				fullEngine = engine;
			}
			loaded(engine);
		});
	}
};
});

},
'dojo/selector/lite':function(){
define(["../has", "../_base/kernel"], function(has, dojo){
"use strict";

var testDiv = document.createElement("div");
var matchesSelector = testDiv.matches || testDiv.webkitMatchesSelector || testDiv.mozMatchesSelector || testDiv.msMatchesSelector || testDiv.oMatchesSelector;
var querySelectorAll = testDiv.querySelectorAll;
var unionSplit = /([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g;
has.add("dom-matches-selector", !!matchesSelector);
has.add("dom-qsa", !!querySelectorAll); 

// this is a simple query engine. It has handles basic selectors, and for simple
// common selectors is extremely fast
var liteEngine = function(selector, root){
	// summary:
	//		A small lightweight query selector engine that implements CSS2.1 selectors
	//		minus pseudo-classes and the sibling combinator, plus CSS3 attribute selectors

	if(combine && selector.indexOf(',') > -1){
		return combine(selector, root);
	}
	// use the root's ownerDocument if provided, otherwise try to use dojo.doc. Note 
	// that we don't use dojo/_base/window's doc to reduce dependencies, and 
	// fallback to plain document if dojo.doc hasn't been defined (by dojo/_base/window).
	// presumably we will have a better way to do this in 2.0 
	var doc = root ? root.ownerDocument || root : dojo.doc || document, 
		match = (querySelectorAll ? 
			/^([\w]*)#([\w\-]+$)|^(\.)([\w\-\*]+$)|^(\w+$)/ : // this one only matches on simple queries where we can beat qSA with specific methods
			/^([\w]*)#([\w\-]+)(?:\s+(.*))?$|(?:^|(>|.+\s+))([\w\-\*]+)(\S*$)/) // this one matches parts of the query that we can use to speed up manual filtering
			.exec(selector);
	root = root || doc;
	if(match){
		var isInsideDomTree = has('ie') === 8 && has('quirks')?
			root.nodeType === doc.nodeType:
			root.parentNode !== null && root.nodeType !== 9 && root.parentNode === doc;

		// fast path regardless of whether or not querySelectorAll exists
		if(match[2] && isInsideDomTree){
			// an #id
			// use dojo.byId if available as it fixes the id retrieval in IE, note that we can't use the dojo namespace in 2.0, but if there is a conditional module use, we will use that
			var found = dojo.byId ? dojo.byId(match[2], doc) : doc.getElementById(match[2]);
			if(!found || (match[1] && match[1] != found.tagName.toLowerCase())){
				// if there is a tag qualifer and it doesn't match, no matches
				return [];
			}
			if(root != doc){
				// there is a root element, make sure we are a child of it
				var parent = found;
				while(parent != root){
					parent = parent.parentNode;
					if(!parent){
						return [];
					}
				}
			}
			return match[3] ?
					liteEngine(match[3], found) 
					: [found];
		}
		if(match[3] && root.getElementsByClassName){
			// a .class
			return root.getElementsByClassName(match[4]);
		}
		var found;
		if(match[5]){
			// a tag
			found = root.getElementsByTagName(match[5]);
			if(match[4] || match[6]){
				selector = (match[4] || "") + match[6];
			}else{
				// that was the entirety of the query, return results
				return found;
			}
		}
	}
	if(querySelectorAll){
		// qSA works strangely on Element-rooted queries
		// We can work around this by specifying an extra ID on the root
		// and working up from there (Thanks to Andrew Dupont for the technique)
		// IE 8 doesn't work on object elements
		if (root.nodeType === 1 && root.nodeName.toLowerCase() !== "object"){				
			return useRoot(root, selector, root.querySelectorAll);
		}else{
			// we can use the native qSA
			return root.querySelectorAll(selector);
		}
	}else if(!found){
		// search all children and then filter
		found = root.getElementsByTagName("*");
	}
	// now we filter the nodes that were found using the matchesSelector
	var results = [];
	for(var i = 0, l = found.length; i < l; i++){
		var node = found[i];
		if(node.nodeType == 1 && jsMatchesSelector(node, selector, root)){
			// keep the nodes that match the selector
			results.push(node);
		}
	}
	return results;
};
var useRoot = function(context, query, method){
	// this function creates a temporary id so we can do rooted qSA queries, this is taken from sizzle
	var oldContext = context,
		old = context.getAttribute("id"),
		nid = old || "__dojo__",
		hasParent = context.parentNode,
		relativeHierarchySelector = /^\s*[+~]/.test(query);

	if(relativeHierarchySelector && !hasParent){
		return [];
	}
	if(!old){
		context.setAttribute("id", nid);
	}else{
		nid = nid.replace(/'/g, "\\$&");
	}
	if(relativeHierarchySelector && hasParent){
		context = context.parentNode;
	}
	var selectors = query.match(unionSplit);
	for(var i = 0; i < selectors.length; i++){
		selectors[i] = "[id='" + nid + "'] " + selectors[i];
	}
	query = selectors.join(",");

	try{
		return method.call(context, query);
	}finally{
		if(!old){
			oldContext.removeAttribute("id");
		}
	}
};

if(!has("dom-matches-selector")){
	var jsMatchesSelector = (function(){
		// a JS implementation of CSS selector matching, first we start with the various handlers
		var caseFix = testDiv.tagName == "div" ? "toLowerCase" : "toUpperCase";
		var selectorTypes = {
			"": function(tagName){
				tagName = tagName[caseFix]();
				return function(node){
					return node.tagName == tagName;
				};
			},
			".": function(className){
				var classNameSpaced = ' ' + className + ' ';
				return function(node){
					return node.className.indexOf(className) > -1 && (' ' + node.className + ' ').indexOf(classNameSpaced) > -1;
				};
			},
			"#": function(id){
				return function(node){
					return node.id == id;
				};
			}
		};
		var attrComparators = {
			"^=": function(attrValue, value){
				return attrValue.indexOf(value) == 0;
			},
			"*=": function(attrValue, value){
				return attrValue.indexOf(value) > -1;
			},
			"$=": function(attrValue, value){
				return attrValue.substring(attrValue.length - value.length, attrValue.length) == value;
			},
			"~=": function(attrValue, value){
				return (' ' + attrValue + ' ').indexOf(' ' + value + ' ') > -1;
			},
			"|=": function(attrValue, value){
				return (attrValue + '-').indexOf(value + '-') == 0;
			},
			"=": function(attrValue, value){
				return attrValue == value;
			},
			"": function(attrValue, value){
				return true;
			}
		};
		function attr(name, value, type){
			var firstChar = value.charAt(0);
			if(firstChar == '"' || firstChar == "'"){
				// it is quoted, remove the quotes
				value = value.slice(1, -1);
			}
			value = value.replace(/\\/g,'');
			var comparator = attrComparators[type || ""];
			return function(node){
				var attrValue = node.getAttribute(name);
				return attrValue && comparator(attrValue, value);
			};
		}
		function ancestor(matcher){
			return function(node, root){
				while((node = node.parentNode) != root){
					if(matcher(node, root)){
						return true;
					}
				}
			};
		}
		function parent(matcher){
			return function(node, root){
				node = node.parentNode;
				return matcher ? 
					node != root && matcher(node, root)
					: node == root;
			};
		}
		var cache = {};
		function and(matcher, next){
			return matcher ?
				function(node, root){
					return next(node) && matcher(node, root);
				}
				: next;
		}
		return function(node, selector, root){
			// this returns true or false based on if the node matches the selector (optionally within the given root)
			var matcher = cache[selector]; // check to see if we have created a matcher function for the given selector
			if(!matcher){
				// create a matcher function for the given selector
				// parse the selectors
				if(selector.replace(/(?:\s*([> ])\s*)|(#|\.)?((?:\\.|[\w-])+)|\[\s*([\w-]+)\s*(.?=)?\s*("(?:\\.|[^"])+"|'(?:\\.|[^'])+'|(?:\\.|[^\]])*)\s*\]/g, function(t, combinator, type, value, attrName, attrType, attrValue){
					if(value){
						matcher = and(matcher, selectorTypes[type || ""](value.replace(/\\/g, '')));
					}
					else if(combinator){
						matcher = (combinator == " " ? ancestor : parent)(matcher);
					}
					else if(attrName){
						matcher = and(matcher, attr(attrName, attrValue, attrType));
					}
					return "";
				})){
					throw new Error("Syntax error in query");
				}
				if(!matcher){
					return true;
				}
				cache[selector] = matcher;
			}
			// now run the matcher function on the node
			return matcher(node, root);
		};
	})();
}
if(!has("dom-qsa")){
	var combine = function(selector, root){
		// combined queries
		var selectors = selector.match(unionSplit);
		var indexed = [];
		// add all results and keep unique ones, this only runs in IE, so we take advantage 
		// of known IE features, particularly sourceIndex which is unique and allows us to 
		// order the results 
		for(var i = 0; i < selectors.length; i++){
			selector = new String(selectors[i].replace(/\s*$/,''));
			selector.indexOf = escape; // keep it from recursively entering combine
			var results = liteEngine(selector, root);
			for(var j = 0, l = results.length; j < l; j++){
				var node = results[j];
				indexed[node.sourceIndex] = node;
			}
		}
		// now convert from a sparse array to a dense array
		var totalResults = [];
		for(i in indexed){
			totalResults.push(indexed[i]);
		}
		return totalResults;
	};
}

liteEngine.match = matchesSelector ? function(node, selector, root){
	if(root && root.nodeType != 9){
		// doesn't support three args, use rooted id trick
		return useRoot(root, selector, function(query){
			return matchesSelector.call(node, query);
		});
	}
	// we have a native matchesSelector, use that
	return matchesSelector.call(node, selector);
} : jsMatchesSelector; // otherwise use the JS matches impl

return liteEngine;
});

},
'dojo/NodeList-dom':function(){
define(["./_base/kernel", "./query", "./_base/array", "./_base/lang", "./dom-class", "./dom-construct", "./dom-geometry", "./dom-attr", "./dom-style"], function(dojo, query, array, lang, domCls, domCtr, domGeom, domAttr, domStyle){

	// module:
	//		dojo/NodeList-dom.js

	/*=====
	 return function(){
		 // summary:
		 //		Adds DOM related methods to NodeList, and returns NodeList constructor.
	 };
	 =====*/

	var magicGuard = function(a){
		// summary:
		//		the guard function for dojo/dom-attr() and dojo/dom-style()
		return a.length == 1 && (typeof a[0] == "string"); // inline'd type check
	};

	var orphan = function(node){
		// summary:
		//		function to orphan nodes
		var p = node.parentNode;
		if(p){
			p.removeChild(node);
		}
	};
	// FIXME: should we move orphan() to dojo/_base/html?

	var NodeList = query.NodeList,
		awc = NodeList._adaptWithCondition,
		aafe = NodeList._adaptAsForEach,
		aam = NodeList._adaptAsMap;

	function getSet(module){
		return function(node, name, value){
			if(arguments.length == 2){
				return module[typeof name == "string" ? "get" : "set"](node, name);
			}
			// setter
			return module.set(node, name, value);
		};
	}

	lang.extend(NodeList, {
		_normalize: function(/*String||Element||Object||NodeList*/content, /*DOMNode?*/refNode){
			// summary:
			//		normalizes data to an array of items to insert.
			// description:
			//		If content is an object, it can have special properties "template" and
			//		"parse". If "template" is defined, then the template value is run through
			//		dojo/string.substitute (if dojo/string.substitute() has been required elsewhere),
			//		or if templateFunc is a function on the content, that function will be used to
			//		transform the template into a final string to be used for for passing to dojo/dom-construct.toDom().
			//		If content.parse is true, then it is remembered for later, for when the content
			//		nodes are inserted into the DOM. At that point, the nodes will be parsed for widgets
			//		(if dojo/parser has been required elsewhere).

			//Wanted to just use a DocumentFragment, but for the array/NodeList
			//case that meant using cloneNode, but we may not want that.
			//Cloning should only happen if the node operations span
			//multiple refNodes. Also, need a real array, not a NodeList from the
			//DOM since the node movements could change those NodeLists.

			var parse = content.parse === true;

			//Do we have an object that needs to be run through a template?
			if(typeof content.template == "string"){
				var templateFunc = content.templateFunc || (dojo.string && dojo.string.substitute);
				content = templateFunc ? templateFunc(content.template, content) : content;
			}

			var type = (typeof content);
			if(type == "string" || type == "number"){
				content = domCtr.toDom(content, (refNode && refNode.ownerDocument));
				if(content.nodeType == 11){
					//DocumentFragment. It cannot handle cloneNode calls, so pull out the children.
					content = lang._toArray(content.childNodes);
				}else{
					content = [content];
				}
			}else if(!lang.isArrayLike(content)){
				content = [content];
			}else if(!lang.isArray(content)){
				//To get to this point, content is array-like, but
				//not an array, which likely means a DOM NodeList. Convert it now.
				content = lang._toArray(content);
			}

			//Pass around the parse info
			if(parse){
				content._runParse = true;
			}
			return content; //Array
		},

		_cloneNode: function(/*DOMNode*/ node){
			// summary:
			//		private utility to clone a node. Not very interesting in the vanilla
			//		dojo/NodeList case, but delegates could do interesting things like
			//		clone event handlers if that is derivable from the node.
			return node.cloneNode(true);
		},

		_place: function(/*Array*/ary, /*DOMNode*/refNode, /*String*/position, /*Boolean*/useClone){
			// summary:
			//		private utility to handle placing an array of nodes relative to another node.
			// description:
			//		Allows for cloning the nodes in the array, and for
			//		optionally parsing widgets, if ary._runParse is true.

			//Avoid a disallowed operation if trying to do an innerHTML on a non-element node.
			if(refNode.nodeType != 1 && position == "only"){
				return;
			}
			var rNode = refNode, tempNode;

			//Always cycle backwards in case the array is really a
			//DOM NodeList and the DOM operations take it out of the live collection.
			var length = ary.length;
			for(var i = length - 1; i >= 0; i--){
				var node = (useClone ? this._cloneNode(ary[i]) : ary[i]);

				//If need widget parsing, use a temp node, instead of waiting after inserting into
				//real DOM because we need to start widget parsing at one node up from current node,
				//which could cause some already parsed widgets to be parsed again.
				if(ary._runParse && dojo.parser && dojo.parser.parse){
					if(!tempNode){
						tempNode = rNode.ownerDocument.createElement("div");
					}
					tempNode.appendChild(node);
					dojo.parser.parse(tempNode);
					node = tempNode.firstChild;
					while(tempNode.firstChild){
						tempNode.removeChild(tempNode.firstChild);
					}
				}

				if(i == length - 1){
					domCtr.place(node, rNode, position);
				}else{
					rNode.parentNode.insertBefore(node, rNode);
				}
				rNode = node;
			}
		},


		position: aam(domGeom.position),
		/*=====
		position: function(){
			// summary:
			//		Returns border-box objects (x/y/w/h) of all elements in a node list
			//		as an Array (*not* a NodeList). Acts like `dojo/dom-geometry-position`, though
			//		assumes the node passed is each node in this list.

			return dojo.map(this, dojo.position); // Array
		},
		=====*/

		attr: awc(getSet(domAttr), magicGuard),
		/*=====
		attr: function(property, value){
			// summary:
			//		gets or sets the DOM attribute for every element in the
			//		NodeList. See also `dojo/dom-attr`
			// property: String
			//		the attribute to get/set
			// value: String?
			//		optional. The value to set the property to
			// returns:
			//		if no value is passed, the result is an array of attribute values
			//		If a value is passed, the return is this NodeList
			// example:
			//		Make all nodes with a particular class focusable:
			//	|	require(["dojo/query", "dojo/NodeList-dom"], function(query){
			//	|		query(".focusable").attr("tabIndex", -1);
			//	|	});
			// example:
			//		Disable a group of buttons:
			//	|	require(["dojo/query", "dojo/NodeList-dom"], function(query){
			//	|		query("button.group").attr("disabled", true);
			//	|	});
			// example:
			//		innerHTML can be assigned or retrieved as well:
			//	|	// get the innerHTML (as an array) for each list item
			//	|	require(["dojo/query", "dojo/NodeList-dom"], function(query){
			//	|		var ih = query("li.replaceable").attr("innerHTML");
			//	|	});
			return; // dojo/NodeList|Array
		},
		=====*/

		style: awc(getSet(domStyle), magicGuard),
		/*=====
		style: function(property, value){
			// summary:
			//		gets or sets the CSS property for every element in the NodeList
			// property: String
			//		the CSS property to get/set, in JavaScript notation
			//		("lineHieght" instead of "line-height")
			// value: String?
			//		optional. The value to set the property to
			// returns:
			//		if no value is passed, the result is an array of strings.
			//		If a value is passed, the return is this NodeList
			return; // dojo/NodeList
			return; // Array
		},
		=====*/

		addClass: aafe(domCls.add),
		/*=====
		addClass: function(className){
			// summary:
			//		adds the specified class to every node in the list
			// className: String|Array
			//		A String class name to add, or several space-separated class names,
			//		or an array of class names.
			return; // dojo/NodeList
		},
		=====*/

		removeClass: aafe(domCls.remove),
		/*=====
		removeClass: function(className){
			// summary:
			//		removes the specified class from every node in the list
			// className: String|Array?
			//		An optional String class name to remove, or several space-separated
			//		class names, or an array of class names. If omitted, all class names
			//		will be deleted.
			// returns:
			//		this list
			return; // dojo/NodeList
		},
		=====*/

		toggleClass: aafe(domCls.toggle),
		/*=====
		toggleClass: function(className, condition){
			// summary:
			//		Adds a class to node if not present, or removes if present.
			//		Pass a boolean condition if you want to explicitly add or remove.
			// condition: Boolean?
			//		If passed, true means to add the class, false means to remove.
			// className: String
			//		the CSS class to add
			return; // dojo/NodeList
		},
		=====*/

		replaceClass: aafe(domCls.replace),
		/*=====
		replaceClass: function(addClassStr, removeClassStr){
			// summary:
			//		Replaces one or more classes on a node if not present.
			//		Operates more quickly than calling `removeClass()` and `addClass()`
			// addClassStr: String|Array
			//		A String class name to add, or several space-separated class names,
			//		or an array of class names.
			// removeClassStr: String|Array?
			//		A String class name to remove, or several space-separated class names,
			//		or an array of class names.
			return; // dojo/NodeList
		 },
		 =====*/

		empty: aafe(domCtr.empty),
		/*=====
		empty: function(){
			// summary:
			//		clears all content from each node in the list. Effectively
			//		equivalent to removing all child nodes from every item in
			//		the list.
			return this.forEach("item.innerHTML='';"); // dojo/NodeList
			// FIXME: should we be checking for and/or disposing of widgets below these nodes?
		},
		=====*/

		removeAttr: aafe(domAttr.remove),
		/*=====
		 removeAttr: function(name){
			// summary:
			//		Removes an attribute from each node in the list.
			// name: String
			//		the name of the attribute to remove
			return;		// dojo/NodeList
		},
		=====*/

		marginBox: aam(domGeom.getMarginBox),
		/*=====
		marginBox: function(){
			// summary:
			//		Returns margin-box size of nodes
		 	return; // dojo/NodeList
		 },
		 =====*/

		// FIXME: connectPublisher()? connectRunOnce()?

		/*
		destroy: function(){
			// summary:
			//		destroys every item in the list.
			this.forEach(d.destroy);
			// FIXME: should we be checking for and/or disposing of widgets below these nodes?
		},
		*/

		place: function(/*String||Node*/ queryOrNode, /*String*/ position){
			// summary:
			//		places elements of this node list relative to the first element matched
			//		by queryOrNode. Returns the original NodeList. See: `dojo/dom-construct.place`
			// queryOrNode:
			//		may be a string representing any valid CSS3 selector or a DOM node.
			//		In the selector case, only the first matching element will be used
			//		for relative positioning.
			// position:
			//		can be one of:
			//
			//		-	"last" (default)
			//		-	"first"
			//		-	"before"
			//		-	"after"
			//		-	"only"
			//		-	"replace"
			//
			//		or an offset in the childNodes property
			var item = query(queryOrNode)[0];
			return this.forEach(function(node){ domCtr.place(node, item, position); }); // dojo/NodeList
		},

		orphan: function(/*String?*/ filter){
			// summary:
			//		removes elements in this list that match the filter
			//		from their parents and returns them as a new NodeList.
			// filter:
			//		CSS selector like ".foo" or "div > span"
			// returns:
			//		NodeList containing the orphaned elements
			return (filter ? query._filterResult(this, filter) : this).forEach(orphan); // dojo/NodeList
		},

		adopt: function(/*String||Array||DomNode*/ queryOrListOrNode, /*String?*/ position){
			// summary:
			//		places any/all elements in queryOrListOrNode at a
			//		position relative to the first element in this list.
			//		Returns a dojo/NodeList of the adopted elements.
			// queryOrListOrNode:
			//		a DOM node or a query string or a query result.
			//		Represents the nodes to be adopted relative to the
			//		first element of this NodeList.
			// position:
			//		can be one of:
			//
			//		-	"last" (default)
			//		-	"first"
			//		-	"before"
			//		-	"after"
			//		-	"only"
			//		-	"replace"
			//
			//		or an offset in the childNodes property
			return query(queryOrListOrNode).place(this[0], position)._stash(this);	// dojo/NodeList
		},

		// FIXME: do we need this?
		query: function(/*String*/ queryStr){
			// summary:
			//		Returns a new list whose members match the passed query,
			//		assuming elements of the current NodeList as the root for
			//		each search.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo">
			//	|		<p>
			//	|			bacon is tasty, <span>dontcha think?</span>
			//	|		</p>
			//	|	</div>
			//	|	<div id="bar">
			//	|		<p>great comedians may not be funny <span>in person</span></p>
			//	|	</div>
			//		If we are presented with the following definition for a NodeList:
			//	|	require(["dojo/dom", "dojo/query", "dojo/NodeList-dom"
			//	|	], function(dom, query){
			//	|		var l = new NodeList(dom.byId("foo"), dom.byId("bar"));
			//		it's possible to find all span elements under paragraphs
			//		contained by these elements with this sub-query:
			//	|		var spans = l.query("p span");
			//	|	});

			// FIXME: probably slow
			if(!queryStr){ return this; }
			var ret = new NodeList;
			this.map(function(node){
				// FIXME: why would we ever get undefined here?
				query(queryStr, node).forEach(function(subNode){
					if(subNode !== undefined){
						ret.push(subNode);
					}
				});
			});
			return ret._stash(this);	// dojo/NodeList
		},

		filter: function(/*String|Function*/ filter){
			// summary:
			//		"masks" the built-in javascript filter() method (supported
			//		in Dojo via `dojo.filter`) to support passing a simple
			//		string filter in addition to supporting filtering function
			//		objects.
			// filter:
			//		If a string, a CSS rule like ".thinger" or "div > span".
			// example:
			//		"regular" JS filter syntax as exposed in dojo.filter:
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("*").filter(function(item){
			//	|			// highlight every paragraph
			//	|			return (item.nodeName == "p");
			//	|		}).style("backgroundColor", "yellow");
			//	|	});
			// example:
			//	the same filtering using a CSS selector
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("*").filter("p").styles("backgroundColor", "yellow");
			//	|	});
			var a = arguments, items = this, start = 0;
			if(typeof filter == "string"){ // inline'd type check
				items = query._filterResult(this, a[0]);
				if(a.length == 1){
					// if we only got a string query, pass back the filtered results
					return items._stash(this); // dojo/NodeList
				}
				// if we got a callback, run it over the filtered items
				start = 1;
			}
			return this._wrap(array.filter(items, a[start], a[start + 1]), this);	// dojo/NodeList
		},

		/*
		// FIXME: should this be "copyTo" and include parenting info?
		clone: function(){
			// summary:
			//		creates node clones of each element of this list
			//		and returns a new list containing the clones
		},
		*/

		addContent: function(/*String||DomNode||Object||dojo/NodeList*/ content, /*String||Integer?*/ position){
			// summary:
			//		add a node, NodeList or some HTML as a string to every item in the
			//		list.  Returns the original list.
			// description:
			//		a copy of the HTML content is added to each item in the
			//		list, with an optional position argument. If no position
			//		argument is provided, the content is appended to the end of
			//		each item.
			// content:
			//		DOM node, HTML in string format, a NodeList or an Object. If a DOM node or
			//		NodeList, the content will be cloned if the current NodeList has more than one
			//		element. Only the DOM nodes are cloned, no event handlers. If it is an Object,
			//		it should be an object with at "template" String property that has the HTML string
			//		to insert. If dojo.string has already been dojo.required, then dojo.string.substitute
			//		will be used on the "template" to generate the final HTML string. Other allowed
			//		properties on the object are: "parse" if the HTML
			//		string should be parsed for widgets (dojo.require("dojo.parser") to get that
			//		option to work), and "templateFunc" if a template function besides dojo.string.substitute
			//		should be used to transform the "template".
			// position:
			//		can be one of:
			//
			//		-	"last"||"end" (default)
			//		-	"first||"start"
			//		-	"before"
			//		-	"after"
			//		-	"replace" (replaces nodes in this NodeList with new content)
			//		-	"only" (removes other children of the nodes so new content is the only child)
			//
			//		or an offset in the childNodes property
			// example:
			//		appends content to the end if the position is omitted
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("h3 > p").addContent("hey there!");
			//	|	});
			// example:
			//		add something to the front of each element that has a
			//		"thinger" property:
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("[thinger]").addContent("...", "first");
			//	|	});
			// example:
			//		adds a header before each element of the list
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query(".note").addContent("<h4>NOTE:</h4>", "before");
			//	|	});
			// example:
			//		add a clone of a DOM node to the end of every element in
			//		the list, removing it from its existing parent.
			//	|	require(["dojo/dom", "dojo/query", "dojo/NodeList-dom"
			//	|	], function(dom, query){
			//	|		query(".note").addContent(dom.byId("foo"));
			//	|	});
			// example:
			//		Append nodes from a templatized string.
			//	|	require(["dojo/string", "dojo/query", "dojo/NodeList-dom"
			//	|	], function(string, query){
			//	|		query(".note").addContent({
			//	|			template: '<b>${id}: </b><span>${name}</span>',
			//	|			id: "user332",
			//	|			name: "Mr. Anderson"
			//	|		});
			//	|	});
			// example:
			//		Append nodes from a templatized string that also has widgets parsed.
			//	|	require(["dojo/string", "dojo/parser", "dojo/query", "dojo/NodeList-dom"
			//	|	], function(string, parser, query){
			//	|		var notes = query(".note").addContent({
			//	|			template: '<button dojoType="dijit/form/Button">${text}</button>',
			//	|			parse: true,
			//	|			text: "Send"
			//	|		});
			//	|	});
			content = this._normalize(content, this[0]);
			for(var i = 0, node; (node = this[i]); i++){
				if(content.length){
					this._place(content, node, position, i > 0);
				}else{
					// if it is an empty array, we empty the target node
					domCtr.empty(node);
				}
			}
			return this; // dojo/NodeList
		}
	});

	return NodeList;
});

},
'dojo/_base/xhr':function(){
define([
	"./kernel",
	"./sniff",
	"require",
	"../io-query",
	/*===== "./declare", =====*/
	"../dom",
	"../dom-form",
	"./Deferred",
	"./config",
	"./json",
	"./lang",
	"./array",
	"../on",
	"../aspect",
	"../request/watch",
	"../request/xhr",
	"../request/util"
], function(dojo, has, require, ioq, /*===== declare, =====*/ dom, domForm, Deferred, config, json, lang, array, on, aspect, watch, _xhr, util){
	// module:
	//		dojo/_base/xhr

	/*=====
	dojo._xhrObj = function(){
		// summary:
		//		does the work of portably generating a new XMLHTTPRequest object.
	};
	=====*/
	dojo._xhrObj = _xhr._create;

	var cfg = dojo.config;

	// mix in io-query and dom-form
	dojo.objectToQuery = ioq.objectToQuery;
	dojo.queryToObject = ioq.queryToObject;
	dojo.fieldToObject = domForm.fieldToObject;
	dojo.formToObject = domForm.toObject;
	dojo.formToQuery = domForm.toQuery;
	dojo.formToJson = domForm.toJson;

	// need to block async callbacks from snatching this thread as the result
	// of an async callback might call another sync XHR, this hangs khtml forever
	// must checked by watchInFlight()

	dojo._blockAsync = false;

	// MOW: remove dojo._contentHandlers alias in 2.0
	var handlers = dojo._contentHandlers = dojo.contentHandlers = {
		// summary:
		//		A map of available XHR transport handle types. Name matches the
		//		`handleAs` attribute passed to XHR calls.
		// description:
		//		A map of available XHR transport handle types. Name matches the
		//		`handleAs` attribute passed to XHR calls. Each contentHandler is
		//		called, passing the xhr object for manipulation. The return value
		//		from the contentHandler will be passed to the `load` or `handle`
		//		functions defined in the original xhr call.
		// example:
		//		Creating a custom content-handler:
		//	|	xhr.contentHandlers.makeCaps = function(xhr){
		//	|		return xhr.responseText.toUpperCase();
		//	|	}
		//	|	// and later:
		//	|	dojo.xhrGet({
		//	|		url:"foo.txt",
		//	|		handleAs:"makeCaps",
		//	|		load: function(data){ /* data is a toUpper version of foo.txt */ }
		//	|	});

		"text": function(xhr){
			// summary:
			//		A contentHandler which simply returns the plaintext response data
			return xhr.responseText;
		},
		"json": function(xhr){
			// summary:
			//		A contentHandler which returns a JavaScript object created from the response data
			return json.fromJson(xhr.responseText || null);
		},
		"json-comment-filtered": function(xhr){
			// summary:
			//		A contentHandler which expects comment-filtered JSON.
			// description:
			//		A contentHandler which expects comment-filtered JSON.
			//		the json-comment-filtered option was implemented to prevent
			//		"JavaScript Hijacking", but it is less secure than standard JSON. Use
			//		standard JSON instead. JSON prefixing can be used to subvert hijacking.
			//
			//		Will throw a notice suggesting to use application/json mimetype, as
			//		json-commenting can introduce security issues. To decrease the chances of hijacking,
			//		use the standard `json` contentHandler, and prefix your "JSON" with: {}&&
			//
			//		use djConfig.useCommentedJson = true to turn off the notice
			if(!config.useCommentedJson){
				 0 && console.warn("Consider using the standard mimetype:application/json."
					+ " json-commenting can introduce security issues. To"
					+ " decrease the chances of hijacking, use the standard the 'json' handler and"
					+ " prefix your json with: {}&&\n"
					+ "Use djConfig.useCommentedJson=true to turn off this message.");
			}

			var value = xhr.responseText;
			var cStartIdx = value.indexOf("\/*");
			var cEndIdx = value.lastIndexOf("*\/");
			if(cStartIdx == -1 || cEndIdx == -1){
				throw new Error("JSON was not comment filtered");
			}
			return json.fromJson(value.substring(cStartIdx+2, cEndIdx));
		},
		"javascript": function(xhr){
			// summary:
			//		A contentHandler which evaluates the response data, expecting it to be valid JavaScript

			// FIXME: try Moz and IE specific eval variants?
			return dojo.eval(xhr.responseText);
		},
		"xml": function(xhr){
			// summary:
			//		A contentHandler returning an XML Document parsed from the response data
			var result = xhr.responseXML;

			if(result && has("dom-qsa2.1") && !result.querySelectorAll && has("dom-parser")){
				// http://bugs.dojotoolkit.org/ticket/15631
				// IE9 supports a CSS3 querySelectorAll implementation, but the DOM implementation 
				// returned by IE9 xhr.responseXML does not. Manually create the XML DOM to gain 
				// the fuller-featured implementation and avoid bugs caused by the inconsistency
				result = new DOMParser().parseFromString(xhr.responseText, "application/xml");
			}

			if(has("ie")){
				if((!result || !result.documentElement)){
					//WARNING: this branch used by the xml handling in dojo.io.iframe,
					//so be sure to test dojo.io.iframe if making changes below.
					var ms = function(n){ return "MSXML" + n + ".DOMDocument"; };
					var dp = ["Microsoft.XMLDOM", ms(6), ms(4), ms(3), ms(2)];
					array.some(dp, function(p){
						try{
							var dom = new ActiveXObject(p);
							dom.async = false;
							dom.loadXML(xhr.responseText);
							result = dom;
						}catch(e){ return false; }
						return true;
					});
				}
			}
			return result; // DOMDocument
		},
		"json-comment-optional": function(xhr){
			// summary:
			//		A contentHandler which checks the presence of comment-filtered JSON and
			//		alternates between the `json` and `json-comment-filtered` contentHandlers.
			if(xhr.responseText && /^[^{\[]*\/\*/.test(xhr.responseText)){
				return handlers["json-comment-filtered"](xhr);
			}else{
				return handlers["json"](xhr);
			}
		}
	};

	/*=====

	// kwargs function parameter definitions.   Assigning to dojo namespace rather than making them local variables
	// because they are used by dojo/io modules too

	dojo.__IoArgs = declare(null, {
		// url: String
		//		URL to server endpoint.
		// content: Object?
		//		Contains properties with string values. These
		//		properties will be serialized as name1=value2 and
		//		passed in the request.
		// timeout: Integer?
		//		Milliseconds to wait for the response. If this time
		//		passes, the then error callbacks are called.
		// form: DOMNode?
		//		DOM node for a form. Used to extract the form values
		//		and send to the server.
		// preventCache: Boolean?
		//		Default is false. If true, then a
		//		"dojo.preventCache" parameter is sent in the request
		//		with a value that changes with each request
		//		(timestamp). Useful only with GET-type requests.
		// handleAs: String?
		//		Acceptable values depend on the type of IO
		//		transport (see specific IO calls for more information).
		// rawBody: String?
		//		Sets the raw body for an HTTP request. If this is used, then the content
		//		property is ignored. This is mostly useful for HTTP methods that have
		//		a body to their requests, like PUT or POST. This property can be used instead
		//		of postData and putData for dojo/_base/xhr.rawXhrPost and dojo/_base/xhr.rawXhrPut respectively.
		// ioPublish: Boolean?
		//		Set this explicitly to false to prevent publishing of topics related to
		//		IO operations. Otherwise, if djConfig.ioPublish is set to true, topics
		//		will be published via dojo/topic.publish() for different phases of an IO operation.
		//		See dojo/main.__IoPublish for a list of topics that are published.

		load: function(response, ioArgs){
			// summary:
			//		This function will be
			//		called on a successful HTTP response code.
	 		// ioArgs: dojo/main.__IoCallbackArgs
			//		Provides additional information about the request.
			// response: Object
			//		The response in the format as defined with handleAs.
		},

		error: function(response, ioArgs){
			// summary:
			//		This function will
			//		be called when the request fails due to a network or server error, the url
			//		is invalid, etc. It will also be called if the load or handle callback throws an
			//		exception, unless djConfig.debugAtAllCosts is true.	 This allows deployed applications
			//		to continue to run even when a logic error happens in the callback, while making
			//		it easier to troubleshoot while in debug mode.
			// ioArgs: dojo/main.__IoCallbackArgs
			//		Provides additional information about the request.
			// response: Object
			//		The response in the format as defined with handleAs.
		},

		handle: function(loadOrError, response, ioArgs){
			// summary:
	 		//		This function will
	 		//		be called at the end of every request, whether or not an error occurs.
			// loadOrError: String
			//		Provides a string that tells you whether this function
			//		was called because of success (load) or failure (error).
			// response: Object
			//		The response in the format as defined with handleAs.
			// ioArgs: dojo/main.__IoCallbackArgs
			//		Provides additional information about the request.
		}
	});

	dojo.__IoCallbackArgs = declare(null, {
		// args: Object
		//		the original object argument to the IO call.
		// xhr: XMLHttpRequest
		//		For XMLHttpRequest calls only, the
		//		XMLHttpRequest object that was used for the
		//		request.
		// url: String
		//		The final URL used for the call. Many times it
		//		will be different than the original args.url
		//		value.
		// query: String
		//		For non-GET requests, the
		//		name1=value1&name2=value2 parameters sent up in
		//		the request.
		// handleAs: String
		//		The final indicator on how the response will be
		//		handled.
		// id: String
		//		For dojo/io/script calls only, the internal
		//		script ID used for the request.
		// canDelete: Boolean
		//		For dojo/io/script calls only, indicates
		//		whether the script tag that represents the
		//		request can be deleted after callbacks have
		//		been called. Used internally to know when
		//		cleanup can happen on JSONP-type requests.
		// json: Object
		//		For dojo/io/script calls only: holds the JSON
		//		response for JSONP-type requests. Used
		//		internally to hold on to the JSON responses.
		//		You should not need to access it directly --
		//		the same object should be passed to the success
		//		callbacks directly.
	});

	dojo.__IoPublish = declare(null, {
		// summary:
		//		This is a list of IO topics that can be published
		//		if djConfig.ioPublish is set to true. IO topics can be
		//		published for any Input/Output, network operation. So,
		//		dojo.xhr, dojo.io.script and dojo.io.iframe can all
		//		trigger these topics to be published.
		// start: String
		//		"/dojo/io/start" is sent when there are no outstanding IO
		//		requests, and a new IO request is started. No arguments
		//		are passed with this topic.
		// send: String
		//		"/dojo/io/send" is sent whenever a new IO request is started.
		//		It passes the dojo.Deferred for the request with the topic.
		// load: String
		//		"/dojo/io/load" is sent whenever an IO request has loaded
		//		successfully. It passes the response and the dojo.Deferred
		//		for the request with the topic.
		// error: String
		//		"/dojo/io/error" is sent whenever an IO request has errored.
		//		It passes the error and the dojo.Deferred
		//		for the request with the topic.
		// done: String
		//		"/dojo/io/done" is sent whenever an IO request has completed,
		//		either by loading or by erroring. It passes the error and
		//		the dojo.Deferred for the request with the topic.
		// stop: String
		//		"/dojo/io/stop" is sent when all outstanding IO requests have
		//		finished. No arguments are passed with this topic.
	});
	=====*/


	dojo._ioSetArgs = function(/*dojo/main.__IoArgs*/args,
			/*Function*/canceller,
			/*Function*/okHandler,
			/*Function*/errHandler){
		// summary:
		//		sets up the Deferred and ioArgs property on the Deferred so it
		//		can be used in an io call.
		// args:
		//		The args object passed into the public io call. Recognized properties on
		//		the args object are:
		// canceller:
		//		The canceller function used for the Deferred object. The function
		//		will receive one argument, the Deferred object that is related to the
		//		canceller.
		// okHandler:
		//		The first OK callback to be registered with Deferred. It has the opportunity
		//		to transform the OK response. It will receive one argument -- the Deferred
		//		object returned from this function.
		// errHandler:
		//		The first error callback to be registered with Deferred. It has the opportunity
		//		to do cleanup on an error. It will receive two arguments: error (the
		//		Error object) and dfd, the Deferred object returned from this function.

		var ioArgs = {args: args, url: args.url};

		//Get values from form if requested.
		var formObject = null;
		if(args.form){
			var form = dom.byId(args.form);
			//IE requires going through getAttributeNode instead of just getAttribute in some form cases,
			//so use it for all. See #2844
			var actnNode = form.getAttributeNode("action");
			ioArgs.url = ioArgs.url || (actnNode ? actnNode.value : null);
			formObject = domForm.toObject(form);
		}

		// set up the query params
		var miArgs = [{}];

		if(formObject){
			// potentially over-ride url-provided params w/ form values
			miArgs.push(formObject);
		}
		if(args.content){
			// stuff in content over-rides what's set by form
			miArgs.push(args.content);
		}
		if(args.preventCache){
			miArgs.push({"dojo.preventCache": new Date().valueOf()});
		}
		ioArgs.query = ioq.objectToQuery(lang.mixin.apply(null, miArgs));

		// .. and the real work of getting the deferred in order, etc.
		ioArgs.handleAs = args.handleAs || "text";
		var d = new Deferred(function(dfd){
			dfd.canceled = true;
			canceller && canceller(dfd);

			var err = dfd.ioArgs.error;
			if(!err){
				err = new Error("request cancelled");
				err.dojoType="cancel";
				dfd.ioArgs.error = err;
			}
			return err;
		});
		d.addCallback(okHandler);

		//Support specifying load, error and handle callback functions from the args.
		//For those callbacks, the "this" object will be the args object.
		//The callbacks will get the deferred result value as the
		//first argument and the ioArgs object as the second argument.
		var ld = args.load;
		if(ld && lang.isFunction(ld)){
			d.addCallback(function(value){
				return ld.call(args, value, ioArgs);
			});
		}
		var err = args.error;
		if(err && lang.isFunction(err)){
			d.addErrback(function(value){
				return err.call(args, value, ioArgs);
			});
		}
		var handle = args.handle;
		if(handle && lang.isFunction(handle)){
			d.addBoth(function(value){
				return handle.call(args, value, ioArgs);
			});
		}

		// Attach error handler last (not including topic publishing)
		// to catch any errors that may have been generated from load
		// or handle functions.
		d.addErrback(function(error){
			return errHandler(error, d);
		});

		//Plug in topic publishing, if dojo.publish is loaded.
		if(cfg.ioPublish && dojo.publish && ioArgs.args.ioPublish !== false){
			d.addCallbacks(
				function(res){
					dojo.publish("/dojo/io/load", [d, res]);
					return res;
				},
				function(res){
					dojo.publish("/dojo/io/error", [d, res]);
					return res;
				}
			);
			d.addBoth(function(res){
				dojo.publish("/dojo/io/done", [d, res]);
				return res;
			});
		}

		d.ioArgs = ioArgs;

		// FIXME: need to wire up the xhr object's abort method to something
		// analogous in the Deferred
		return d;
	};

	var _deferredOk = function(/*Deferred*/dfd){
		// summary:
		//		okHandler function for dojo._ioSetArgs call.

		var ret = handlers[dfd.ioArgs.handleAs](dfd.ioArgs.xhr);
		return ret === undefined ? null : ret;
	};
	var _deferError = function(/*Error*/error, /*Deferred*/dfd){
		// summary:
		//		errHandler function for dojo._ioSetArgs call.

		if(!dfd.ioArgs.args.failOk){
			 0 && console.error(error);
		}
		return error;
	};

	//Use a separate count for knowing if we are starting/stopping io calls.
	var _checkPubCount = function(dfd){
		if(_pubCount <= 0){
			_pubCount = 0;
			if(cfg.ioPublish && dojo.publish && (!dfd || dfd && dfd.ioArgs.args.ioPublish !== false)){
				dojo.publish("/dojo/io/stop");
			}
		}
	};

	var _pubCount = 0;
	aspect.after(watch, "_onAction", function(){
		_pubCount -= 1;
	});
	aspect.after(watch, "_onInFlight", _checkPubCount);

	dojo._ioCancelAll = watch.cancelAll;
	/*=====
	dojo._ioCancelAll = function(){
		// summary:
		//		Cancels all pending IO requests, regardless of IO type
		//		(xhr, script, iframe).
	};
	=====*/

	dojo._ioNotifyStart = function(/*Deferred*/dfd){
		// summary:
		//		If dojo.publish is available, publish topics
		//		about the start of a request queue and/or the
		//		the beginning of request.
		//
		//		Used by IO transports. An IO transport should
		//		call this method before making the network connection.
		if(cfg.ioPublish && dojo.publish && dfd.ioArgs.args.ioPublish !== false){
			if(!_pubCount){
				dojo.publish("/dojo/io/start");
			}
			_pubCount += 1;
			dojo.publish("/dojo/io/send", [dfd]);
		}
	};

	dojo._ioWatch = function(dfd, validCheck, ioCheck, resHandle){
		// summary:
		//		Watches the io request represented by dfd to see if it completes.
		// dfd: Deferred
		//		The Deferred object to watch.
		// validCheck: Function
		//		Function used to check if the IO request is still valid. Gets the dfd
		//		object as its only argument.
		// ioCheck: Function
		//		Function used to check if basic IO call worked. Gets the dfd
		//		object as its only argument.
		// resHandle: Function
		//		Function used to process response. Gets the dfd
		//		object as its only argument.

		var args = dfd.ioArgs.options = dfd.ioArgs.args;
		lang.mixin(dfd, {
			response: dfd.ioArgs,
			isValid: function(response){
				return validCheck(dfd);
			},
			isReady: function(response){
				return ioCheck(dfd);
			},
			handleResponse: function(response){
				return resHandle(dfd);
			}
		});
		watch(dfd);

		_checkPubCount(dfd);
	};

	var _defaultContentType = "application/x-www-form-urlencoded";

	dojo._ioAddQueryToUrl = function(/*dojo.__IoCallbackArgs*/ioArgs){
		// summary:
		//		Adds query params discovered by the io deferred construction to the URL.
		//		Only use this for operations which are fundamentally GET-type operations.
		if(ioArgs.query.length){
			ioArgs.url += (ioArgs.url.indexOf("?") == -1 ? "?" : "&") + ioArgs.query;
			ioArgs.query = null;
		}
	};

	/*=====
	dojo.__XhrArgs = declare(dojo.__IoArgs, {
		// summary:
		//		In addition to the properties listed for the dojo._IoArgs type,
		//		the following properties are allowed for dojo.xhr* methods.
		// handleAs: String?
		//		Acceptable values are: text (default), json, json-comment-optional,
		//		json-comment-filtered, javascript, xml. See `dojo/_base/xhr.contentHandlers`
	 	// sync: Boolean?
		//		false is default. Indicates whether the request should
		//		be a synchronous (blocking) request.
		// headers: Object?
		//		Additional HTTP headers to send in the request.
		// failOk: Boolean?
		//		false is default. Indicates whether a request should be
		//		allowed to fail (and therefore no console error message in
		//		the event of a failure)
		// contentType: String|Boolean
		//		"application/x-www-form-urlencoded" is default. Set to false to
		//		prevent a Content-Type header from being sent, or to a string
		//		to send a different Content-Type.
	 });
	=====*/

	dojo.xhr = function(/*String*/ method, /*dojo.__XhrArgs*/ args, /*Boolean?*/ hasBody){
		// summary:
		//		Deprecated.   Use dojo/request instead.
		// description:
		//		Sends an HTTP request with the given method.
		//		See also dojo.xhrGet(), xhrPost(), xhrPut() and dojo.xhrDelete() for shortcuts
		//		for those HTTP methods. There are also methods for "raw" PUT and POST methods
		//		via dojo.rawXhrPut() and dojo.rawXhrPost() respectively.
		// method:
		//		HTTP method to be used, such as GET, POST, PUT, DELETE. Should be uppercase.
		// hasBody:
		//		If the request has an HTTP body, then pass true for hasBody.

		var rDfd;
		//Make the Deferred object for this xhr request.
		var dfd = dojo._ioSetArgs(args, function(dfd){
			rDfd && rDfd.cancel();
		}, _deferredOk, _deferError);
		var ioArgs = dfd.ioArgs;

		//Allow for specifying the HTTP body completely.
		if("postData" in args){
			ioArgs.query = args.postData;
		}else if("putData" in args){
			ioArgs.query = args.putData;
		}else if("rawBody" in args){
			ioArgs.query = args.rawBody;
		}else if((arguments.length > 2 && !hasBody) || "POST|PUT".indexOf(method.toUpperCase()) === -1){
			//Check for hasBody being passed. If no hasBody,
			//then only append query string if not a POST or PUT request.
			dojo._ioAddQueryToUrl(ioArgs);
		}

		var options = {
			method: method,
			handleAs: "text",
			timeout: args.timeout,
			withCredentials: args.withCredentials,
			ioArgs: ioArgs
		};

		if(typeof args.headers !== 'undefined'){
			options.headers = args.headers;
		}
		if(typeof args.contentType !== 'undefined'){
			if(!options.headers){
				options.headers = {};
			}
			options.headers['Content-Type'] = args.contentType;
		}
		if(typeof ioArgs.query !== 'undefined'){
			options.data = ioArgs.query;
		}
		if(typeof args.sync !== 'undefined'){
			options.sync = args.sync;
		}

		dojo._ioNotifyStart(dfd);
		try{
			rDfd = _xhr(ioArgs.url, options, true);
		}catch(e){
			// If XHR creation fails, dojo/request/xhr throws
			// When this happens, cancel the deferred
			dfd.cancel();
			return dfd;
		}

		// sync ioArgs
		dfd.ioArgs.xhr = rDfd.response.xhr;

		rDfd.then(function(){
			dfd.resolve(dfd);
		}).otherwise(function(error){
			ioArgs.error = error;
			if(error.response){
				error.status = error.response.status;
				error.responseText = error.response.text;
				error.xhr = error.response.xhr;
			}
			dfd.reject(error);
		});
		return dfd; // dojo/_base/Deferred
	};

	dojo.xhrGet = function(/*dojo.__XhrArgs*/ args){
		// summary:
		//		Sends an HTTP GET request to the server.
		return dojo.xhr("GET", args); // dojo/_base/Deferred
	};

	dojo.rawXhrPost = dojo.xhrPost = function(/*dojo.__XhrArgs*/ args){
		// summary:
		//		Sends an HTTP POST request to the server. In addition to the properties
		//		listed for the dojo.__XhrArgs type, the following property is allowed:
		// postData:
		//		String. Send raw data in the body of the POST request.
		return dojo.xhr("POST", args, true); // dojo/_base/Deferred
	};

	dojo.rawXhrPut = dojo.xhrPut = function(/*dojo.__XhrArgs*/ args){
		// summary:
		//		Sends an HTTP PUT request to the server. In addition to the properties
		//		listed for the dojo.__XhrArgs type, the following property is allowed:
		// putData:
		//		String. Send raw data in the body of the PUT request.
		return dojo.xhr("PUT", args, true); // dojo/_base/Deferred
	};

	dojo.xhrDelete = function(/*dojo.__XhrArgs*/ args){
		// summary:
		//		Sends an HTTP DELETE request to the server.
		return dojo.xhr("DELETE", args); // dojo/_base/Deferred
	};

	/*
	dojo.wrapForm = function(formNode){
		// summary:
		//		A replacement for FormBind, but not implemented yet.

		// FIXME: need to think harder about what extensions to this we might
		// want. What should we allow folks to do w/ this? What events to
		// set/send?
		throw new Error("dojo.wrapForm not yet implemented");
	}
	*/

	dojo._isDocumentOk = function(x){
		return util.checkStatus(x.status);
	};

	dojo._getText = function(url){
		var result;
		dojo.xhrGet({url:url, sync:true, load:function(text){
			result = text;
		}});
		return result;
	};

	// Add aliases for static functions to dojo.xhr since dojo.xhr is what's returned from this module
	lang.mixin(dojo.xhr, {
		_xhrObj: dojo._xhrObj,
		fieldToObject: domForm.fieldToObject,
		formToObject: domForm.toObject,
		objectToQuery: ioq.objectToQuery,
		formToQuery: domForm.toQuery,
		formToJson: domForm.toJson,
		queryToObject: ioq.queryToObject,
		contentHandlers: handlers,
		_ioSetArgs: dojo._ioSetArgs,
		_ioCancelAll: dojo._ioCancelAll,
		_ioNotifyStart: dojo._ioNotifyStart,
		_ioWatch: dojo._ioWatch,
		_ioAddQueryToUrl: dojo._ioAddQueryToUrl,
		_isDocumentOk: dojo._isDocumentOk,
		_getText: dojo._getText,
		get: dojo.xhrGet,
		post: dojo.xhrPost,
		put: dojo.xhrPut,
		del: dojo.xhrDelete	// because "delete" is a reserved word
	});

	return dojo.xhr;
});

},
'dojo/io-query':function(){
define(["./_base/lang"], function(lang){

// module:
//		dojo/io-query

var backstop = {};

return {
// summary:
//		This module defines query string processing functions.

	objectToQuery: function objectToQuery(/*Object*/ map){
		// summary:
        //		takes a name/value mapping object and returns a string representing
        //		a URL-encoded version of that object.
        // example:
        //		this object:
        //
        //	|	{
        //	|		blah: "blah",
        //	|		multi: [
        //	|			"thud",
        //	|			"thonk"
        //	|		]
        //	|	};
        //
        //		yields the following query string:
        //
        //	|	"blah=blah&multi=thud&multi=thonk"

        // FIXME: need to implement encodeAscii!!
        var enc = encodeURIComponent, pairs = [];
        for(var name in map){
            var value = map[name];
            if(value != backstop[name]){
                var assign = enc(name) + "=";
                if(lang.isArray(value)){
                    for(var i = 0, l = value.length; i < l; ++i){
                        pairs.push(assign + enc(value[i]));
                    }
                }else{
                    pairs.push(assign + enc(value));
                }
            }
        }
        return pairs.join("&"); // String
    },

	queryToObject: function queryToObject(/*String*/ str){
        // summary:
        //		Create an object representing a de-serialized query section of a
        //		URL. Query keys with multiple values are returned in an array.
        //
        // example:
        //		This string:
        //
        //	|		"foo=bar&foo=baz&thinger=%20spaces%20=blah&zonk=blarg&"
        //
        //		results in this object structure:
        //
        //	|		{
        //	|			foo: [ "bar", "baz" ],
        //	|			thinger: " spaces =blah",
        //	|			zonk: "blarg"
        //	|		}
        //
        //		Note that spaces and other urlencoded entities are correctly
        //		handled.

        // FIXME: should we grab the URL string if we're not passed one?
        var dec = decodeURIComponent, qp = str.split("&"), ret = {}, name, val;
        for(var i = 0, l = qp.length, item; i < l; ++i){
            item = qp[i];
            if(item.length){
                var s = item.indexOf("=");
                if(s < 0){
                    name = dec(item);
                    val = "";
                }else{
                    name = dec(item.slice(0, s));
                    val  = dec(item.slice(s + 1));
                }
                if(typeof ret[name] == "string"){ // inline'd type check
                    ret[name] = [ret[name]];
                }

                if(lang.isArray(ret[name])){
                    ret[name].push(val);
                }else{
                    ret[name] = val;
                }
            }
        }
        return ret; // Object
    }
};
});
},
'dojo/dom-form':function(){
define(["./_base/lang", "./dom", "./io-query", "./json"], function(lang, dom, ioq, json){
	// module:
	//		dojo/dom-form

    function setValue(/*Object*/ obj, /*String*/ name, /*String*/ value){
        // summary:
        //		For the named property in object, set the value. If a value
        //		already exists and it is a string, convert the value to be an
        //		array of values.

        // Skip it if there is no value
        if(value === null){
            return;
        }

        var val = obj[name];
        if(typeof val == "string"){ // inline'd type check
            obj[name] = [val, value];
        }else if(lang.isArray(val)){
            val.push(value);
        }else{
            obj[name] = value;
        }
    }

	var exclude = "file|submit|image|reset|button";

	var form = {
		// summary:
		//		This module defines form-processing functions.

		fieldToObject: function fieldToObject(/*DOMNode|String*/ inputNode){
			// summary:
			//		Serialize a form field to a JavaScript object.
			// description:
			//		Returns the value encoded in a form field as
			//		as a string or an array of strings. Disabled form elements
			//		and unchecked radio and checkboxes are skipped.	Multi-select
			//		elements are returned as an array of string values.
			// inputNode: DOMNode|String
			// returns: Object

			var ret = null;
			inputNode = dom.byId(inputNode);
			if(inputNode){
				var _in = inputNode.name, type = (inputNode.type || "").toLowerCase();
				if(_in && type && !inputNode.disabled){
					if(type == "radio" || type == "checkbox"){
						if(inputNode.checked){
							ret = inputNode.value;
						}
					}else if(inputNode.multiple){
						ret = [];
						var nodes = [inputNode.firstChild];
						while(nodes.length){
							for(var node = nodes.pop(); node; node = node.nextSibling){
								if(node.nodeType == 1 && node.tagName.toLowerCase() == "option"){
									if(node.selected){
										ret.push(node.value);
									}
								}else{
									if(node.nextSibling){
										nodes.push(node.nextSibling);
									}
									if(node.firstChild){
										nodes.push(node.firstChild);
									}
									break;
								}
							}
						}
					}else{
						ret = inputNode.value;
					}
				}
			}
			return ret; // Object
		},

		toObject: function formToObject(/*DOMNode|String*/ formNode){
			// summary:
			//		Serialize a form node to a JavaScript object.
			// description:
			//		Returns the values encoded in an HTML form as
			//		string properties in an object which it then returns. Disabled form
			//		elements, buttons, and other non-value form elements are skipped.
			//		Multi-select elements are returned as an array of string values.
			// formNode: DOMNode|String
			// example:
			//		This form:
			//		|	<form id="test_form">
			//		|		<input type="text" name="blah" value="blah">
			//		|		<input type="text" name="no_value" value="blah" disabled>
			//		|		<input type="button" name="no_value2" value="blah">
			//		|		<select type="select" multiple name="multi" size="5">
			//		|			<option value="blah">blah</option>
			//		|			<option value="thud" selected>thud</option>
			//		|			<option value="thonk" selected>thonk</option>
			//		|		</select>
			//		|	</form>
			//
			//		yields this object structure as the result of a call to
			//		formToObject():
			//
			//		|	{
			//		|		blah: "blah",
			//		|		multi: [
			//		|			"thud",
			//		|			"thonk"
			//		|		]
			//		|	};

			var ret = {}, elems = dom.byId(formNode).elements;
			for(var i = 0, l = elems.length; i < l; ++i){
				var item = elems[i], _in = item.name, type = (item.type || "").toLowerCase();
				if(_in && type && exclude.indexOf(type) < 0 && !item.disabled){
					setValue(ret, _in, form.fieldToObject(item));
					if(type == "image"){
						ret[_in + ".x"] = ret[_in + ".y"] = ret[_in].x = ret[_in].y = 0;
					}
				}
			}
			return ret; // Object
		},

		toQuery: function formToQuery(/*DOMNode|String*/ formNode){
			// summary:
			//		Returns a URL-encoded string representing the form passed as either a
			//		node or string ID identifying the form to serialize
			// formNode: DOMNode|String
			// returns: String

			return ioq.objectToQuery(form.toObject(formNode)); // String
		},

		toJson: function formToJson(/*DOMNode|String*/ formNode, /*Boolean?*/ prettyPrint){
			// summary:
			//		Create a serialized JSON string from a form node or string
			//		ID identifying the form to serialize
			// formNode: DOMNode|String
			// prettyPrint: Boolean?
			// returns: String

			return json.stringify(form.toObject(formNode), null, prettyPrint ? 4 : 0); // String
		}
	};

    return form;
});

},
'dojo/request/watch':function(){
define([
	'./util',
	'../errors/RequestTimeoutError',
	'../errors/CancelError',
	'../_base/array',
	'../_base/window',
	'../has!host-browser?dom-addeventlistener?:../on:'
], function(util, RequestTimeoutError, CancelError, array, win, on){
	// avoid setting a timer per request. It degrades performance on IE
	// something fierece if we don't use unified loops.
	var _inFlightIntvl = null,
		_inFlight = [];

	function watchInFlight(){
		// summary:
		//		internal method that checks each inflight XMLHttpRequest to see
		//		if it has completed or if the timeout situation applies.

		var now = +(new Date);

		// we need manual loop because we often modify _inFlight (and therefore 'i') while iterating
		for(var i = 0, dfd; i < _inFlight.length && (dfd = _inFlight[i]); i++){
			var response = dfd.response,
				options = response.options;
			if((dfd.isCanceled && dfd.isCanceled()) || (dfd.isValid && !dfd.isValid(response))){
				_inFlight.splice(i--, 1);
				watch._onAction && watch._onAction();
			}else if(dfd.isReady && dfd.isReady(response)){
				_inFlight.splice(i--, 1);
				dfd.handleResponse(response);
				watch._onAction && watch._onAction();
			}else if(dfd.startTime){
				// did we timeout?
				if(dfd.startTime + (options.timeout || 0) < now){
					_inFlight.splice(i--, 1);
					// Cancel the request so the io module can do appropriate cleanup.
					dfd.cancel(new RequestTimeoutError('Timeout exceeded', response));
					watch._onAction && watch._onAction();
				}
			}
		}

		watch._onInFlight && watch._onInFlight(dfd);

		if(!_inFlight.length){
			clearInterval(_inFlightIntvl);
			_inFlightIntvl = null;
		}
	}

	function watch(dfd){
		// summary:
		//		Watches the io request represented by dfd to see if it completes.
		// dfd: Deferred
		//		The Deferred object to watch.
		// response: Object
		//		The object used as the value of the request promise.
		// validCheck: Function
		//		Function used to check if the IO request is still valid. Gets the dfd
		//		object as its only argument.
		// ioCheck: Function
		//		Function used to check if basic IO call worked. Gets the dfd
		//		object as its only argument.
		// resHandle: Function
		//		Function used to process response. Gets the dfd
		//		object as its only argument.
		if(dfd.response.options.timeout){
			dfd.startTime = +(new Date);
		}

		if(dfd.isFulfilled()){
			// bail out if the deferred is already fulfilled
			return;
		}

		_inFlight.push(dfd);
		if(!_inFlightIntvl){
			_inFlightIntvl = setInterval(watchInFlight, 50);
		}

		// handle sync requests separately from async:
		// http://bugs.dojotoolkit.org/ticket/8467
		if(dfd.response.options.sync){
			watchInFlight();
		}
	}

	watch.cancelAll = function cancelAll(){
		// summary:
		//		Cancels all pending IO requests, regardless of IO type
		try{
			array.forEach(_inFlight, function(dfd){
				try{
					dfd.cancel(new CancelError('All requests canceled.'));
				}catch(e){}
			});
		}catch(e){}
	};

	if(win && on && win.doc.attachEvent){
		// Automatically call cancel all io calls on unload in IE
		// http://bugs.dojotoolkit.org/ticket/2357
		on(win.global, 'unload', function(){
			watch.cancelAll();
		});
	}

	return watch;
});

},
'dojo/request/util':function(){
define([
	'exports',
	'../errors/RequestError',
	'../errors/CancelError',
	'../Deferred',
	'../io-query',
	'../_base/array',
	'../_base/lang',
	'../promise/Promise'
], function(exports, RequestError, CancelError, Deferred, ioQuery, array, lang, Promise){
	exports.deepCopy = function deepCopy(target, source){
		for(var name in source){
			var tval = target[name],
				sval = source[name];
			if(tval !== sval){
				if(tval && typeof tval === 'object' && sval && typeof sval === 'object'){
					exports.deepCopy(tval, sval);
				}else{
					target[name] = sval;
				}
			}
		}
		return target;
	};

	exports.deepCreate = function deepCreate(source, properties){
		properties = properties || {};
		var target = lang.delegate(source),
			name, value;

		for(name in source){
			value = source[name];

			if(value && typeof value === 'object'){
				target[name] = exports.deepCreate(value, properties[name]);
			}
		}
		return exports.deepCopy(target, properties);
	};

	var freeze = Object.freeze || function(obj){ return obj; };
	function okHandler(response){
		return freeze(response);
	}
	function dataHandler (response) {
		return response.data || response.text;
	}

	exports.deferred = function deferred(response, cancel, isValid, isReady, handleResponse, last){
		var def = new Deferred(function(reason){
			cancel && cancel(def, response);

			if(!reason || !(reason instanceof RequestError) && !(reason instanceof CancelError)){
				return new CancelError('Request canceled', response);
			}
			return reason;
		});

		def.response = response;
		def.isValid = isValid;
		def.isReady = isReady;
		def.handleResponse = handleResponse;

		function errHandler(error){
			error.response = response;
			throw error;
		}
		var responsePromise = def.then(okHandler).otherwise(errHandler);

		if(exports.notify){
			responsePromise.then(
				lang.hitch(exports.notify, 'emit', 'load'),
				lang.hitch(exports.notify, 'emit', 'error')
			);
		}

		var dataPromise = responsePromise.then(dataHandler);

		// http://bugs.dojotoolkit.org/ticket/16794
		// The following works around a leak in IE9 through the
		// prototype using lang.delegate on dataPromise and
		// assigning the result a property with a reference to
		// responsePromise.
		var promise = new Promise();
		for (var prop in dataPromise) {
			if (dataPromise.hasOwnProperty(prop)) {
				promise[prop] = dataPromise[prop];
			}
		}
		promise.response = responsePromise;
		freeze(promise);
		// End leak fix


		if(last){
			def.then(function(response){
				last.call(def, response);
			}, function(error){
				last.call(def, response, error);
			});
		}

		def.promise = promise;
		def.then = promise.then;

		return def;
	};

	exports.addCommonMethods = function addCommonMethods(provider, methods){
		array.forEach(methods||['GET', 'POST', 'PUT', 'DELETE'], function(method){
			provider[(method === 'DELETE' ? 'DEL' : method).toLowerCase()] = function(url, options){
				options = lang.delegate(options||{});
				options.method = method;
				return provider(url, options);
			};
		});
	};

	exports.parseArgs = function parseArgs(url, options, skipData){
		var data = options.data,
			query = options.query;
		
		if(data && !skipData){
			if(typeof data === 'object'){
				options.data = ioQuery.objectToQuery(data);
			}
		}

		if(query){
			if(typeof query === 'object'){
				query = ioQuery.objectToQuery(query);
			}
			if(options.preventCache){
				query += (query ? '&' : '') + 'request.preventCache=' + (+(new Date));
			}
		}else if(options.preventCache){
			query = 'request.preventCache=' + (+(new Date));
		}

		if(url && query){
			url += (~url.indexOf('?') ? '&' : '?') + query;
		}

		return {
			url: url,
			options: options,
			getHeader: function(headerName){ return null; }
		};
	};

	exports.checkStatus = function(stat){
		stat = stat || 0;
		return (stat >= 200 && stat < 300) || // allow any 2XX response code
			stat === 304 ||                 // or, get it out of the cache
			stat === 1223 ||                // or, Internet Explorer mangled the status code
			!stat;                         // or, we're Titanium/browser chrome/chrome extension requesting a local file
	};
});

},
'dojo/errors/RequestError':function(){
define(['./create'], function(create){
	// module:
	//		dojo/errors/RequestError

	/*=====
	 return function(){
		 // summary:
		 //		TODOC
	 };
	 =====*/

	return create("RequestError", function(message, response){
		this.response = response;
	});
});

},
'dojo/errors/RequestTimeoutError':function(){
define(['./create', './RequestError'], function(create, RequestError){
	// module:
	//		dojo/errors/RequestTimeoutError

	/*=====
	 return function(){
		 // summary:
		 //		TODOC
	 };
	 =====*/

	return create("RequestTimeoutError", null, RequestError, {
		dojoType: "timeout"
	});
});

},
'dojo/request/xhr':function(){
define([
	'../errors/RequestError',
	'./watch',
	'./handlers',
	'./util',
	'../has'/*=====,
	'../request',
	'../_base/declare' =====*/
], function(RequestError, watch, handlers, util, has/*=====, request, declare =====*/){
	has.add('native-xhr', function(){
		// if true, the environment has a native XHR implementation
		return typeof XMLHttpRequest !== 'undefined';
	});
	has.add('dojo-force-activex-xhr', function(){
		return has('activex') && !document.addEventListener && window.location.protocol === 'file:';
	});

	has.add('native-xhr2', function(){
		if(!has('native-xhr')){ return; }
		var x = new XMLHttpRequest();
		return typeof x['addEventListener'] !== 'undefined' &&
			(typeof opera === 'undefined' || typeof x['upload'] !== 'undefined');
	});

	has.add('native-formdata', function(){
		// if true, the environment has a native FormData implementation
		return typeof FormData !== 'undefined';
	});

	has.add('native-response-type', function(){
		return has('native-xhr') && typeof new XMLHttpRequest().responseType !== 'undefined';
	});

	has.add('native-xhr2-blob', function(){
		if(!has('native-response-type')){ return; }
		var x = new XMLHttpRequest();
		x.open('GET', '/', true);
		x.responseType = 'blob';
		// will not be set if unsupported
		var responseType = x.responseType;
		x.abort();
		return responseType === 'blob';
	});

	// Google Chrome doesn't support "json" response type
	// up to version 30, so it's intentionally not included here
	var nativeResponseTypes = {
		'blob': has('native-xhr2-blob') ? 'blob' : 'arraybuffer',
		'document': 'document',
		'arraybuffer': 'arraybuffer'
	};

	function handleResponse(response, error){
		var _xhr = response.xhr;
		response.status = response.xhr.status;

		try {
			// Firefox throws an error when trying to access
			// xhr.responseText if response isn't text
			response.text = _xhr.responseText;
		} catch (e) {}

		if(response.options.handleAs === 'xml'){
			response.data = _xhr.responseXML;
		}

		if(!error){
			try{
				handlers(response);
			}catch(e){
				error = e;
			}
		}

		if(error){
			this.reject(error);
		}else if(util.checkStatus(_xhr.status)){
			this.resolve(response);
		}else{
			error = new RequestError('Unable to load ' + response.url + ' status: ' + _xhr.status, response);

			this.reject(error);
		}
	}

	var isValid, isReady, addListeners, cancel;
	if(has('native-xhr2')){
		// Any platform with XHR2 will only use the watch mechanism for timeout.

		isValid = function(response){
			// summary:
			//		Check to see if the request should be taken out of the watch queue
			return !this.isFulfilled();
		};
		cancel = function(dfd, response){
			// summary:
			//		Canceler for deferred
			response.xhr.abort();
		};
		addListeners = function(_xhr, dfd, response){
			// summary:
			//		Adds event listeners to the XMLHttpRequest object
			function onLoad(evt){
				dfd.handleResponse(response);
			}
			function onError(evt){
				var _xhr = evt.target;
				var error = new RequestError('Unable to load ' + response.url + ' status: ' + _xhr.status, response);
				dfd.handleResponse(response, error);
			}

			function onProgress(evt){
				if(evt.lengthComputable){
					response.loaded = evt.loaded;
					response.total = evt.total;
					dfd.progress(response);
				} else if(response.xhr.readyState === 3){
					response.loaded = evt.position;
					dfd.progress(response);
				}
			}

			_xhr.addEventListener('load', onLoad, false);
			_xhr.addEventListener('error', onError, false);
			_xhr.addEventListener('progress', onProgress, false);

			return function(){
				_xhr.removeEventListener('load', onLoad, false);
				_xhr.removeEventListener('error', onError, false);
				_xhr.removeEventListener('progress', onProgress, false);
				_xhr = null;
			};
		};
	}else{
		isValid = function(response){
			return response.xhr.readyState; //boolean
		};
		isReady = function(response){
			return 4 === response.xhr.readyState; //boolean
		};
		cancel = function(dfd, response){
			// summary:
			//		canceller function for util.deferred call.
			var xhr = response.xhr;
			var _at = typeof xhr.abort;
			if(_at === 'function' || _at === 'object' || _at === 'unknown'){
				xhr.abort();
			}
		};
	}

	function getHeader(headerName){
		return this.xhr.getResponseHeader(headerName);
	}

	var undefined,
		defaultOptions = {
			data: null,
			query: null,
			sync: false,
			method: 'GET'
		};
	function xhr(url, options, returnDeferred){
		var isFormData = has('native-formdata') && options && options.data && options.data instanceof FormData;
		var response = util.parseArgs(
			url,
			util.deepCreate(defaultOptions, options),
			isFormData
		);
		url = response.url;
		options = response.options;

		var remover,
			last = function(){
				remover && remover();
			};

		//Make the Deferred object for this xhr request.
		var dfd = util.deferred(
			response,
			cancel,
			isValid,
			isReady,
			handleResponse,
			last
		);
		var _xhr = response.xhr = xhr._create();

		if(!_xhr){
			// If XHR factory somehow returns nothings,
			// cancel the deferred.
			dfd.cancel(new RequestError('XHR was not created'));
			return returnDeferred ? dfd : dfd.promise;
		}

		response.getHeader = getHeader;

		if(addListeners){
			remover = addListeners(_xhr, dfd, response);
		}

		var data = options.data,
			async = !options.sync,
			method = options.method;

		try{
			// IE6 won't let you call apply() on the native function.
			_xhr.open(method, url, async, options.user || undefined, options.password || undefined);

			if(options.withCredentials){
				_xhr.withCredentials = options.withCredentials;
			}

			if(has('native-response-type') && options.handleAs in nativeResponseTypes) {
				_xhr.responseType = nativeResponseTypes[options.handleAs];
			}

			var headers = options.headers,
				contentType = isFormData ? false : 'application/x-www-form-urlencoded';
			if(headers){
				for(var hdr in headers){
					if(hdr.toLowerCase() === 'content-type'){
						contentType = headers[hdr];
					}else if(headers[hdr]){
						//Only add header if it has a value. This allows for instance, skipping
						//insertion of X-Requested-With by specifying empty value.
						_xhr.setRequestHeader(hdr, headers[hdr]);
					}
				}
			}

			if(contentType && contentType !== false){
				_xhr.setRequestHeader('Content-Type', contentType);
			}
			if(!headers || !('X-Requested-With' in headers)){
				_xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
			}

			if(util.notify){
				util.notify.emit('send', response, dfd.promise.cancel);
			}
			_xhr.send(data);
		}catch(e){
			dfd.reject(e);
		}

		watch(dfd);
		_xhr = null;

		return returnDeferred ? dfd : dfd.promise;
	}

	/*=====
	xhr = function(url, options){
		// summary:
		//		Sends a request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__Options?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	xhr.__BaseOptions = declare(request.__BaseOptions, {
		// sync: Boolean?
		//		Whether to make a synchronous request or not. Default
		//		is `false` (asynchronous).
		// data: String|Object|FormData?
		//		Data to transfer. This is ignored for GET and DELETE
		//		requests.
		// headers: Object?
		//		Headers to use for the request.
		// user: String?
		//		Username to use during the request.
		// password: String?
		//		Password to use during the request.
		// withCredentials: Boolean?
		//		For cross-site requests, whether to send credentials
		//		or not.
	});
	xhr.__MethodOptions = declare(null, {
		// method: String?
		//		The HTTP method to use to make the request. Must be
		//		uppercase. Default is `"GET"`.
	});
	xhr.__Options = declare([xhr.__BaseOptions, xhr.__MethodOptions]);

	xhr.get = function(url, options){
		// summary:
		//		Send an HTTP GET request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	xhr.post = function(url, options){
		// summary:
		//		Send an HTTP POST request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	xhr.put = function(url, options){
		// summary:
		//		Send an HTTP PUT request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	xhr.del = function(url, options){
		// summary:
		//		Send an HTTP DELETE request using XMLHttpRequest with the given URL and options.
		// url: String
		//		URL to request
		// options: dojo/request/xhr.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	=====*/
	xhr._create = function(){
		// summary:
		//		does the work of portably generating a new XMLHTTPRequest object.
		throw new Error('XMLHTTP not available');
	};
	if(has('native-xhr') && !has('dojo-force-activex-xhr')){
		xhr._create = function(){
			return new XMLHttpRequest();
		};
	}else if(has('activex')){
		try{
			new ActiveXObject('Msxml2.XMLHTTP');
			xhr._create = function(){
				return new ActiveXObject('Msxml2.XMLHTTP');
			};
		}catch(e){
			try{
				new ActiveXObject('Microsoft.XMLHTTP');
				xhr._create = function(){
					return new ActiveXObject('Microsoft.XMLHTTP');
				};
			}catch(e){}
		}
	}

	util.addCommonMethods(xhr);

	return xhr;
});

},
'dojo/request/handlers':function(){
define([
	'../json',
	'../_base/kernel',
	'../_base/array',
	'../has',
	'../selector/_loader' // only included for has() qsa tests
], function(JSON, kernel, array, has){
	has.add('activex', typeof ActiveXObject !== 'undefined');
	has.add('dom-parser', function(global){
		return 'DOMParser' in global;
	});

	var handleXML;
	if(has('activex')){
		// GUIDs obtained from http://msdn.microsoft.com/en-us/library/ms757837(VS.85).aspx
		var dp = [
			'Msxml2.DOMDocument.6.0',
			'Msxml2.DOMDocument.4.0',
			'MSXML2.DOMDocument.3.0',
			'MSXML.DOMDocument' // 2.0
		];
		var lastParser;

		handleXML = function(response){
			var result = response.data;
			var text = response.text;

			if(result && has('dom-qsa2.1') && !result.querySelectorAll && has('dom-parser')){
				// http://bugs.dojotoolkit.org/ticket/15631
				// IE9 supports a CSS3 querySelectorAll implementation, but the DOM implementation
				// returned by IE9 xhr.responseXML does not. Manually create the XML DOM to gain
				// the fuller-featured implementation and avoid bugs caused by the inconsistency
				result = new DOMParser().parseFromString(text, 'application/xml');
			}

			function createDocument(p) {
					try{
						var dom = new ActiveXObject(p);
						dom.async = false;
						dom.loadXML(text);
						result = dom;
						lastParser = p;
					}catch(e){ return false; }
					return true;
			}

			if(!result || !result.documentElement){
				// The creation of an ActiveX object is expensive, so we cache the
				// parser type to avoid trying all parser types each time we handle a
				// document. There is some concern that some parser types might fail
				// depending on the document being parsed. If parsing using the cached
				// parser type fails, we do the more expensive operation of finding one
				// that works for the given document.
				// https://bugs.dojotoolkit.org/ticket/15246
				if(!lastParser || !createDocument(lastParser)) {
					array.some(dp, createDocument);
				}
			}

			return result;
		};
	}

	var handleNativeResponse = function(response) {
		if(!has('native-xhr2-blob') && response.options.handleAs === 'blob' && typeof Blob !== 'undefined'){
			return new Blob([ response.xhr.response ], { type: response.xhr.getResponseHeader('Content-Type') });
		}

		return response.xhr.response;
	}

	var handlers = {
		'javascript': function(response){
			return kernel.eval(response.text || '');
		},
		'json': function(response){
			return JSON.parse(response.text || null);
		},
		'xml': handleXML,
		'blob': handleNativeResponse,
		'arraybuffer': handleNativeResponse,
		'document': handleNativeResponse
	};

	function handle(response){
		var handler = handlers[response.options.handleAs];

		response.data = handler ? handler(response) : (response.data || response.text);

		return response;
	}

	handle.register = function(name, handler){
		handlers[name] = handler;
	};

	return handle;
});

},
'dojo/_base/fx':function(){
define(["./kernel", "./config", /*===== "./declare", =====*/ "./lang", "../Evented", "./Color", "../aspect", "../sniff", "../dom", "../dom-style"],
	function(dojo, config, /*===== declare, =====*/ lang, Evented, Color, aspect, has, dom, style){
	// module:
	//		dojo/_base/fx
	// notes:
	//		Animation loosely package based on Dan Pupius' work, contributed under CLA; see
	//		http://pupius.co.uk/js/Toolkit.Drawing.js

	var _mixin = lang.mixin;

	// Module export
	var basefx = {
		// summary:
		//		This module defines the base dojo/_base/fx implementation.
	};

	var _Line = basefx._Line = function(/*int*/ start, /*int*/ end){
		// summary:
		//		Object used to generate values from a start value to an end value
		// start: int
		//		Beginning value for range
		// end: int
		//		Ending value for range
		this.start = start;
		this.end = end;
	};

	_Line.prototype.getValue = function(/*float*/ n){
		// summary:
		//		Returns the point on the line
		// n:
		//		a floating point number greater than 0 and less than 1
		return ((this.end - this.start) * n) + this.start; // Decimal
	};

	var Animation = basefx.Animation = function(args){
		// summary:
		//		A generic animation class that fires callbacks into its handlers
		//		object at various states.
		// description:
		//		A generic animation class that fires callbacks into its handlers
		//		object at various states. Nearly all dojo animation functions
		//		return an instance of this method, usually without calling the
		//		.play() method beforehand. Therefore, you will likely need to
		//		call .play() on instances of `Animation` when one is
		//		returned.
		// args: Object
		//		The 'magic argument', mixing all the properties into this
		//		animation instance.

		_mixin(this, args);
		if(lang.isArray(this.curve)){
			this.curve = new _Line(this.curve[0], this.curve[1]);
		}

	};
	Animation.prototype = new Evented();

	lang.extend(Animation, {
		// duration: Integer
		//		The time in milliseconds the animation will take to run
		duration: 350,

	/*=====
		// curve: _Line|Array
		//		A two element array of start and end values, or a `_Line` instance to be
		//		used in the Animation.
		curve: null,

		// easing: Function?
		//		A Function to adjust the acceleration (or deceleration) of the progress
		//		across a _Line
		easing: null,
	=====*/

		// repeat: Integer?
		//		The number of times to loop the animation
		repeat: 0,

		// rate: Integer?
		//		the time in milliseconds to wait before advancing to next frame
		//		(used as a fps timer: 1000/rate = fps)
		rate: 20 /* 50 fps */,

	/*=====
		// delay: Integer?
		//		The time in milliseconds to wait before starting animation after it
		//		has been .play()'ed
		delay: null,

		// beforeBegin: Event?
		//		Synthetic event fired before a Animation begins playing (synchronous)
		beforeBegin: null,

		// onBegin: Event?
		//		Synthetic event fired as a Animation begins playing (useful?)
		onBegin: null,

		// onAnimate: Event?
		//		Synthetic event fired at each interval of the Animation
		onAnimate: null,

		// onEnd: Event?
		//		Synthetic event fired after the final frame of the Animation
		onEnd: null,

		// onPlay: Event?
		//		Synthetic event fired any time the Animation is play()'ed
		onPlay: null,

		// onPause: Event?
		//		Synthetic event fired when the Animation is paused
		onPause: null,

		// onStop: Event
		//		Synthetic event fires when the Animation is stopped
		onStop: null,

	=====*/

		_percent: 0,
		_startRepeatCount: 0,

		_getStep: function(){
			var _p = this._percent,
				_e = this.easing
			;
			return _e ? _e(_p) : _p;
		},
		_fire: function(/*Event*/ evt, /*Array?*/ args){
			// summary:
			//		Convenience function.  Fire event "evt" and pass it the
			//		arguments specified in "args".
			// description:
			//		Convenience function.  Fire event "evt" and pass it the
			//		arguments specified in "args".
			//		Fires the callback in the scope of this Animation
			//		instance.
			// evt:
			//		The event to fire.
			// args:
			//		The arguments to pass to the event.
			var a = args||[];
			if(this[evt]){
				if(config.debugAtAllCosts){
					this[evt].apply(this, a);
				}else{
					try{
						this[evt].apply(this, a);
					}catch(e){
						// squelch and log because we shouldn't allow exceptions in
						// synthetic event handlers to cause the internal timer to run
						// amuck, potentially pegging the CPU. I'm not a fan of this
						// squelch, but hopefully logging will make it clear what's
						// going on
						 0 && console.error("exception in animation handler for:", evt);
						 0 && console.error(e);
					}
				}
			}
			return this; // Animation
		},

		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			// summary:
			//		Start the animation.
			// delay:
			//		How many milliseconds to delay before starting.
			// gotoStart:
			//		If true, starts the animation from the beginning; otherwise,
			//		starts it from its current position.
			// returns: Animation
			//		The instance to allow chaining.

			var _t = this;
			if(_t._delayTimer){ _t._clearTimer(); }
			if(gotoStart){
				_t._stopTimer();
				_t._active = _t._paused = false;
				_t._percent = 0;
			}else if(_t._active && !_t._paused){
				return _t;
			}

			_t._fire("beforeBegin", [_t.node]);

			var de = delay || _t.delay,
				_p = lang.hitch(_t, "_play", gotoStart);

			if(de > 0){
				_t._delayTimer = setTimeout(_p, de);
				return _t;
			}
			_p();
			return _t;	// Animation
		},

		_play: function(gotoStart){
			var _t = this;
			if(_t._delayTimer){ _t._clearTimer(); }
			_t._startTime = new Date().valueOf();
			if(_t._paused){
				_t._startTime -= _t.duration * _t._percent;
			}

			_t._active = true;
			_t._paused = false;
			var value = _t.curve.getValue(_t._getStep());
			if(!_t._percent){
				if(!_t._startRepeatCount){
					_t._startRepeatCount = _t.repeat;
				}
				_t._fire("onBegin", [value]);
			}

			_t._fire("onPlay", [value]);

			_t._cycle();
			return _t; // Animation
		},

		pause: function(){
			// summary:
			//		Pauses a running animation.
			var _t = this;
			if(_t._delayTimer){ _t._clearTimer(); }
			_t._stopTimer();
			if(!_t._active){ return _t; /*Animation*/ }
			_t._paused = true;
			_t._fire("onPause", [_t.curve.getValue(_t._getStep())]);
			return _t; // Animation
		},

		gotoPercent: function(/*Decimal*/ percent, /*Boolean?*/ andPlay){
			// summary:
			//		Sets the progress of the animation.
			// percent:
			//		A percentage in decimal notation (between and including 0.0 and 1.0).
			// andPlay:
			//		If true, play the animation after setting the progress.
			var _t = this;
			_t._stopTimer();
			_t._active = _t._paused = true;
			_t._percent = percent;
			if(andPlay){ _t.play(); }
			return _t; // Animation
		},

		stop: function(/*boolean?*/ gotoEnd){
			// summary:
			//		Stops a running animation.
			// gotoEnd:
			//		If true, the animation will end.
			var _t = this;
			if(_t._delayTimer){ _t._clearTimer(); }
			if(!_t._timer){ return _t; /* Animation */ }
			_t._stopTimer();
			if(gotoEnd){
				_t._percent = 1;
			}
			_t._fire("onStop", [_t.curve.getValue(_t._getStep())]);
			_t._active = _t._paused = false;
			return _t; // Animation
		},

		destroy: function(){
			// summary:
			//		cleanup the animation
			this.stop();
		},

		status: function(){
			// summary:
			//		Returns a string token representation of the status of
			//		the animation, one of: "paused", "playing", "stopped"
			if(this._active){
				return this._paused ? "paused" : "playing"; // String
			}
			return "stopped"; // String
		},

		_cycle: function(){
			var _t = this;
			if(_t._active){
				var curr = new Date().valueOf();
				// Allow durations of 0 (instant) by setting step to 1 - see #13798
				var step = _t.duration === 0 ? 1 : (curr - _t._startTime) / (_t.duration);

				if(step >= 1){
					step = 1;
				}
				_t._percent = step;

				// Perform easing
				if(_t.easing){
					step = _t.easing(step);
				}

				_t._fire("onAnimate", [_t.curve.getValue(step)]);

				if(_t._percent < 1){
					_t._startTimer();
				}else{
					_t._active = false;

					if(_t.repeat > 0){
						_t.repeat--;
						_t.play(null, true);
					}else if(_t.repeat == -1){
						_t.play(null, true);
					}else{
						if(_t._startRepeatCount){
							_t.repeat = _t._startRepeatCount;
							_t._startRepeatCount = 0;
						}
					}
					_t._percent = 0;
					_t._fire("onEnd", [_t.node]);
					!_t.repeat && _t._stopTimer();
				}
			}
			return _t; // Animation
		},

		_clearTimer: function(){
			// summary:
			//		Clear the play delay timer
			clearTimeout(this._delayTimer);
			delete this._delayTimer;
		}

	});

	// the local timer, stubbed into all Animation instances
	var ctr = 0,
		timer = null,
		runner = {
			run: function(){}
		};

	lang.extend(Animation, {

		_startTimer: function(){
			if(!this._timer){
				this._timer = aspect.after(runner, "run", lang.hitch(this, "_cycle"), true);
				ctr++;
			}
			if(!timer){
				timer = setInterval(lang.hitch(runner, "run"), this.rate);
			}
		},

		_stopTimer: function(){
			if(this._timer){
				this._timer.remove();
				this._timer = null;
				ctr--;
			}
			if(ctr <= 0){
				clearInterval(timer);
				timer = null;
				ctr = 0;
			}
		}

	});

	var _makeFadeable =
		has("ie") ? function(node){
			// only set the zoom if the "tickle" value would be the same as the
			// default
			var ns = node.style;
			// don't set the width to auto if it didn't already cascade that way.
			// We don't want to f anyones designs
			if(!ns.width.length && style.get(node, "width") == "auto"){
				ns.width = "auto";
			}
		} :
		function(){};

	basefx._fade = function(/*Object*/ args){
		// summary:
		//		Returns an animation that will fade the node defined by
		//		args.node from the start to end values passed (args.start
		//		args.end) (end is mandatory, start is optional)

		args.node = dom.byId(args.node);
		var fArgs = _mixin({ properties: {} }, args),
			props = (fArgs.properties.opacity = {});

		props.start = !("start" in fArgs) ?
			function(){
				return +style.get(fArgs.node, "opacity")||0;
			} : fArgs.start;
		props.end = fArgs.end;

		var anim = basefx.animateProperty(fArgs);
		aspect.after(anim, "beforeBegin", lang.partial(_makeFadeable, fArgs.node), true);

		return anim; // Animation
	};

	/*=====
	var __FadeArgs = declare(null, {
		// node: DOMNode|String
		//		The node referenced in the animation
		// duration: Integer?
		//		Duration of the animation in milliseconds.
		// easing: Function?
		//		An easing function.
	});
	=====*/

	basefx.fadeIn = function(/*__FadeArgs*/ args){
		// summary:
		//		Returns an animation that will fade node defined in 'args' from
		//		its current opacity to fully opaque.
		return basefx._fade(_mixin({ end: 1 }, args)); // Animation
	};

	basefx.fadeOut = function(/*__FadeArgs*/ args){
		// summary:
		//		Returns an animation that will fade node defined in 'args'
		//		from its current opacity to fully transparent.
		return basefx._fade(_mixin({ end: 0 }, args)); // Animation
	};

	basefx._defaultEasing = function(/*Decimal?*/ n){
		// summary:
		//		The default easing function for Animation(s)
		return 0.5 + ((Math.sin((n + 1.5) * Math.PI)) / 2);	// Decimal
	};

	var PropLine = function(properties){
		// PropLine is an internal class which is used to model the values of
		// an a group of CSS properties across an animation lifecycle. In
		// particular, the "getValue" function handles getting interpolated
		// values between start and end for a particular CSS value.
		this._properties = properties;
		for(var p in properties){
			var prop = properties[p];
			if(prop.start instanceof Color){
				// create a reusable temp color object to keep intermediate results
				prop.tempColor = new Color();
			}
		}
	};

	PropLine.prototype.getValue = function(r){
		var ret = {};
		for(var p in this._properties){
			var prop = this._properties[p],
				start = prop.start;
			if(start instanceof Color){
				ret[p] = Color.blendColors(start, prop.end, r, prop.tempColor).toCss();
			}else if(!lang.isArray(start)){
				ret[p] = ((prop.end - start) * r) + start + (p != "opacity" ? prop.units || "px" : 0);
			}
		}
		return ret;
	};

	/*=====
	var __AnimArgs = declare(__FadeArgs, {
		// properties: Object?
		//		A hash map of style properties to Objects describing the transition,
		//		such as the properties of _Line with an additional 'units' property
		properties: {}

		//TODOC: add event callbacks
	});
	=====*/

	basefx.animateProperty = function(/*__AnimArgs*/ args){
		// summary:
		//		Returns an animation that will transition the properties of
		//		node defined in `args` depending how they are defined in
		//		`args.properties`
		//
		// description:
		//		Foundation of most `dojo/_base/fx`
		//		animations. It takes an object of "properties" corresponding to
		//		style properties, and animates them in parallel over a set
		//		duration.
		//
		// example:
		//		A simple animation that changes the width of the specified node.
		//	|	basefx.animateProperty({
		//	|		node: "nodeId",
		//	|		properties: { width: 400 },
		//	|	}).play();
		//		Dojo figures out the start value for the width and converts the
		//		integer specified for the width to the more expressive but
		//		verbose form `{ width: { end: '400', units: 'px' } }` which you
		//		can also specify directly. Defaults to 'px' if omitted.
		//
		// example:
		//		Animate width, height, and padding over 2 seconds... the
		//		pedantic way:
		//	|	basefx.animateProperty({ node: node, duration:2000,
		//	|		properties: {
		//	|			width: { start: '200', end: '400', units:"px" },
		//	|			height: { start:'200', end: '400', units:"px" },
		//	|			paddingTop: { start:'5', end:'50', units:"px" }
		//	|		}
		//	|	}).play();
		//		Note 'paddingTop' is used over 'padding-top'. Multi-name CSS properties
		//		are written using "mixed case", as the hyphen is illegal as an object key.
		//
		// example:
		//		Plug in a different easing function and register a callback for
		//		when the animation ends. Easing functions accept values between
		//		zero and one and return a value on that basis. In this case, an
		//		exponential-in curve.
		//	|	basefx.animateProperty({
		//	|		node: "nodeId",
		//	|		// dojo figures out the start value
		//	|		properties: { width: { end: 400 } },
		//	|		easing: function(n){
		//	|			return (n==0) ? 0 : Math.pow(2, 10 * (n - 1));
		//	|		},
		//	|		onEnd: function(node){
		//	|			// called when the animation finishes. The animation
		//	|			// target is passed to this function
		//	|		}
		//	|	}).play(500); // delay playing half a second
		//
		// example:
		//		Like all `Animation`s, animateProperty returns a handle to the
		//		Animation instance, which fires the events common to Dojo FX. Use `aspect.after`
		//		to access these events outside of the Animation definition:
		//	|	var anim = basefx.animateProperty({
		//	|		node:"someId",
		//	|		properties:{
		//	|			width:400, height:500
		//	|		}
		//	|	});
		//	|	aspect.after(anim, "onEnd", function(){
		//	|		 0 && console.log("animation ended");
		//	|	}, true);
		//	|	// play the animation now:
		//	|	anim.play();
		//
		// example:
		//		Each property can be a function whose return value is substituted along.
		//		Additionally, each measurement (eg: start, end) can be a function. The node
		//		reference is passed directly to callbacks.
		//	|	basefx.animateProperty({
		//	|		node:"mine",
		//	|		properties:{
		//	|			height:function(node){
		//	|				// shrink this node by 50%
		//	|				return domGeom.position(node).h / 2
		//	|			},
		//	|			width:{
		//	|				start:function(node){ return 100; },
		//	|				end:function(node){ return 200; }
		//	|			}
		//	|		}
		//	|	}).play();
		//

		var n = args.node = dom.byId(args.node);
		if(!args.easing){ args.easing = dojo._defaultEasing; }

		var anim = new Animation(args);
		aspect.after(anim, "beforeBegin", lang.hitch(anim, function(){
			var pm = {};
			for(var p in this.properties){
				// Make shallow copy of properties into pm because we overwrite
				// some values below. In particular if start/end are functions
				// we don't want to overwrite them or the functions won't be
				// called if the animation is reused.
				if(p == "width" || p == "height"){
					this.node.display = "block";
				}
				var prop = this.properties[p];
				if(lang.isFunction(prop)){
					prop = prop(n);
				}
				prop = pm[p] = _mixin({}, (lang.isObject(prop) ? prop: { end: prop }));

				if(lang.isFunction(prop.start)){
					prop.start = prop.start(n);
				}
				if(lang.isFunction(prop.end)){
					prop.end = prop.end(n);
				}
				var isColor = (p.toLowerCase().indexOf("color") >= 0);
				function getStyle(node, p){
					// domStyle.get(node, "height") can return "auto" or "" on IE; this is more reliable:
					var v = { height: node.offsetHeight, width: node.offsetWidth }[p];
					if(v !== undefined){ return v; }
					v = style.get(node, p);
					return (p == "opacity") ? +v : (isColor ? v : parseFloat(v));
				}
				if(!("end" in prop)){
					prop.end = getStyle(n, p);
				}else if(!("start" in prop)){
					prop.start = getStyle(n, p);
				}

				if(isColor){
					prop.start = new Color(prop.start);
					prop.end = new Color(prop.end);
				}else{
					prop.start = (p == "opacity") ? +prop.start : parseFloat(prop.start);
				}
			}
			this.curve = new PropLine(pm);
		}), true);
		aspect.after(anim, "onAnimate", lang.hitch(style, "set", anim.node), true);
		return anim; // Animation
	};

	basefx.anim = function(	/*DOMNode|String*/	node,
							/*Object*/			properties,
							/*Integer?*/		duration,
							/*Function?*/		easing,
							/*Function?*/		onEnd,
							/*Integer?*/		delay){
		// summary:
		//		A simpler interface to `animateProperty()`, also returns
		//		an instance of `Animation` but begins the animation
		//		immediately, unlike nearly every other Dojo animation API.
		// description:
		//		Simpler (but somewhat less powerful) version
		//		of `animateProperty`.  It uses defaults for many basic properties
		//		and allows for positional parameters to be used in place of the
		//		packed "property bag" which is used for other Dojo animation
		//		methods.
		//
		//		The `Animation` object returned will be already playing, so
		//		calling play() on it again is (usually) a no-op.
		// node:
		//		a DOM node or the id of a node to animate CSS properties on
		// duration:
		//		The number of milliseconds over which the animation
		//		should run. Defaults to the global animation default duration
		//		(350ms).
		// easing:
		//		An easing function over which to calculate acceleration
		//		and deceleration of the animation through its duration.
		//		A default easing algorithm is provided, but you may
		//		plug in any you wish. A large selection of easing algorithms
		//		are available in `dojo/fx/easing`.
		// onEnd:
		//		A function to be called when the animation finishes
		//		running.
		// delay:
		//		The number of milliseconds to delay beginning the
		//		animation by. The default is 0.
		// example:
		//		Fade out a node
		//	|	basefx.anim("id", { opacity: 0 });
		// example:
		//		Fade out a node over a full second
		//	|	basefx.anim("id", { opacity: 0 }, 1000);
		return basefx.animateProperty({ // Animation
			node: node,
			duration: duration || Animation.prototype.duration,
			properties: properties,
			easing: easing,
			onEnd: onEnd
		}).play(delay || 0);
	};


	if( 1 ){
		_mixin(dojo, basefx);
		// Alias to drop come 2.0:
		dojo._Animation = Animation;
	}

	return basefx;
});

},
'dojo/_base/loader':function(){
define(["./kernel", "../has", "require", "module", "../json", "./lang", "./array"], function(dojo, has, require, thisModule, json, lang, array) {
	// module:
	//		dojo/_base/loader

	//		This module defines the v1.x synchronous loader API.

	// signal the loader in sync mode...
	//>>pure-amd

	if (! 1 ){
		 0 && console.error("cannot load the Dojo v1.x loader with a foreign loader");
		return 0;
	}

	 1 || has.add("dojo-fast-sync-require", 1);


	var makeErrorToken = function(id){
			return {src:thisModule.id, id:id};
		},

		slashName = function(name){
			return name.replace(/\./g, "/");
		},

		buildDetectRe = /\/\/>>built/,

		dojoRequireCallbacks = [],
		dojoRequireModuleStack = [],

		dojoRequirePlugin = function(mid, require, loaded){
			dojoRequireCallbacks.push(loaded);
			array.forEach(mid.split(","), function(mid){
				var module = getModule(mid, require.module);
				dojoRequireModuleStack.push(module);
				injectModule(module);
			});
			checkDojoRequirePlugin();
		},

		checkDojoRequirePlugin = ( 1  ?
			// This version of checkDojoRequirePlugin makes the observation that all dojoRequireCallbacks can be released
			// when all *non-dojo/require!, dojo/loadInit!* modules are either executed, not requested, or arrived. This is
			// the case since there are no more modules the loader is waiting for, therefore, dojo/require! must have
			// everything it needs on board.
			//
			// The potential weakness of this algorithm is that dojo/require will not execute callbacks until *all* dependency
			// trees are ready. It is possible that some trees may be ready earlier than others, and this extra wait is non-optimal.
			// Still, for big projects, this seems better than the original algorithm below that proved slow in some cases.
			// Note, however, the original algorithm had the potential to execute partial trees,  but that potential was never enabled.
			// There are also other optimization available with the original algorithm that have not been explored.
			function(){
				var module, mid;
				for(mid in modules){
					module = modules[mid];
					if(module.noReqPluginCheck===undefined){
						// tag the module as either a loadInit or require plugin or not for future reference
						module.noReqPluginCheck = /loadInit\!/.test(mid) || /require\!/.test(mid) ? 1 : 0;
					}
					if(!module.executed && !module.noReqPluginCheck && module.injected==requested){
						return;
					}
				}

				guardCheckComplete(function(){
					var oldCallbacks = dojoRequireCallbacks;
					dojoRequireCallbacks = [];
					array.forEach(oldCallbacks, function(cb){cb(1);});
				});
		} : (function(){
			// Note: this is the original checkDojoRequirePlugin that is much slower than the algorithm above. However, we know it
			// works, so we leave it here in case the algorithm above fails in some corner case.
			//
			// checkDojoRequirePlugin inspects all of the modules demanded by a dojo/require!<module-list> dependency
			// to see if they have arrived. The loader does not release *any* of these modules to be instantiated
			// until *all* of these modules are on board, thereby preventing the evaluation of a module with dojo.require's
			// that reference modules that are not available.
			//
			// The algorithm works by traversing the dependency graphs (remember, there can be cycles so they are not trees)
			// of each module in the dojoRequireModuleStack array (which contains the list of modules demanded by dojo/require!).
			// The moment a single module is discovered that is missing, the algorithm gives up and indicates that not all
			// modules are on board. dojo/loadInit! and dojo/require! are ignored because there dependencies are inserted
			// directly in dojoRequireModuleStack. For example, if "your/module" module depends on "dojo/require!my/module", then
			// *both* "dojo/require!my/module" and "my/module" will be in dojoRequireModuleStack. Obviously, if "my/module"
			// is on board, then "dojo/require!my/module" is also satisfied, so the algorithm doesn't check for "dojo/require!my/module".
			//
			// Note: inserting a dojo/require!<some-module-list> dependency in the dojoRequireModuleStack achieves nothing
			// with the current algorithm; however, having such modules present makes it possible to optimize the algorithm
			//
			// Note: prior versions of this algorithm had an optimization that signaled loaded on dojo/require! dependencies
			// individually (rather than waiting for them all to be resolved). The implementation proved problematic with cycles
			// and plugins. However, it is possible to reattach that strategy in the future.

			// a set from module-id to {undefined | 1 | 0}, where...
			//	 undefined => the module has not been inspected
			//	 0 => the module or at least one of its dependencies has not arrived
			//	 1 => the module is a loadInit! or require! plugin resource, or is currently being traversed (therefore, assume
			//		  OK until proven otherwise), or has been completely traversed and all dependencies have arrived

			var touched,
			traverse = function(m){
				touched[m.mid] = 1;
				for(var t, module, deps = m.deps || [], i= 0; i<deps.length; i++){
					module = deps[i];
					if(!(t = touched[module.mid])){
						if(t===0 || !traverse(module)){
							touched[m.mid] = 0;
							return false;
						}
					}
				}
				return true;
			};

			return function(){
				// initialize the touched hash with easy-to-compute values that help short circuit recursive algorithm;
				// recall loadInit/require plugin modules are dependencies of modules in dojoRequireModuleStack...
				// which would cause a circular dependency chain that would never be resolved if checked here
				// notice all dependencies of any particular loadInit/require plugin module will already
				// be checked since those are pushed into dojoRequireModuleStack explicitly by the
				// plugin...so if a particular loadInitPlugin module's dependencies are not really
				// on board, that *will* be detected elsewhere in the traversal.
				var module, mid;
				touched = {};
				for(mid in modules){
					module = modules[mid];
					if(module.executed || module.noReqPluginCheck){
						touched[mid] = 1;
					}else{
						if(module.noReqPluginCheck!==0){
							// tag the module as either a loadInit or require plugin or not for future reference
							module.noReqPluginCheck = /loadInit\!/.test(mid) || /require\!/.test(mid) ? 1 : 0;
						}
						if(module.noReqPluginCheck){
							touched[mid] = 1;
						}else if(module.injected!==arrived){
							// not executed, has not arrived, and is not a loadInit or require plugin resource
							touched[mid] = 0;
						}// else, leave undefined and we'll traverse the dependencies
					}
				}
				for(var t, i = 0, end = dojoRequireModuleStack.length; i<end; i++){
					module = dojoRequireModuleStack[i];
					if(!(t = touched[module.mid])){
						if(t===0 || !traverse(module)){
							return;
						}
					}
				}
				guardCheckComplete(function(){
					var oldCallbacks = dojoRequireCallbacks;
					dojoRequireCallbacks = [];
					array.forEach(oldCallbacks, function(cb){cb(1);});
				});
			};
		})()),

		dojoLoadInitPlugin = function(mid, require, loaded){
			// mid names a module that defines a "dojo load init" bundle, an object with two properties:
			//
			//	 * names: a vector of module ids that give top-level names to define in the lexical scope of def
			//	 * def: a function that contains some some legacy loader API applications
			//
			// The point of def is to possibly cause some modules to be loaded (but not executed) by dojo/require! where the module
			// ids are possibly-determined at runtime. For example, here is dojox.gfx from v1.6 expressed as an AMD module using the dojo/loadInit
			// and dojo/require plugins.
			//
			// // dojox/gfx:
			//
			//	 define("*loadInit_12, {
			//	   names:["dojo", "dijit", "dojox"],
			//	   def: function(){
			//		 dojo.loadInit(function(){
			//		   var gfx = lang.getObject("dojox.gfx", true);
			//
			//		   //
			//		   // code required to set gfx properties ommitted...
			//		   //
			//
			//		   // now use the calculations to include the runtime-dependent module
			//		   dojo.require("dojox.gfx." + gfx.renderer);
			//		 });
			//	   }
			//	 });
			//
			//	 define(["dojo", "dojo/loadInit!" + id].concat("dojo/require!dojox/gfx/matric,dojox/gfx/_base"), function(dojo){
			//	   // when this AMD factory function is executed, the following modules are guaranteed downloaded but not executed:
			//	   //	"dojox.gfx." + gfx.renderer
			//	   //	dojox.gfx.matrix
			//	   //	dojox.gfx._base
			//	   dojo.provide("dojo.gfx");
			//	   dojo.require("dojox.gfx.matrix");
			//	   dojo.require("dojox.gfx._base");
			//	   dojo.require("dojox.gfx." + gfx.renderer);
			//	   return lang.getObject("dojo.gfx");
			//	 });
			//	})();
			//
			// The idea is to run the legacy loader API with global variables shadowed, which allows these variables to
			// be relocated. For example, dojox and dojo could be relocated to different names by giving a map and the code above will
			// execute properly (because the plugin below resolves the load init bundle.names module with respect to the module that demanded
			// the plugin resource).
			//
			// Note that the relocation is specified in the runtime configuration; relocated names need not be set at build-time.
			//
			// Warning: this is not the best way to express dojox.gfx as and AMD module. In fact, the module has been properly converted in
			// v1.7. However, this technique allows the builder to convert legacy modules into AMD modules and guarantee the codepath is the
			// same in the converted AMD module.
			require([mid], function(bundle){
				// notice how names is resolved with respect to the module that demanded the plugin resource
				require(bundle.names, function(){
					// bring the bundle names into scope
					for(var scopeText = "", args= [], i = 0; i<arguments.length; i++){
						scopeText+= "var " + bundle.names[i] + "= arguments[" + i + "]; ";
						args.push(arguments[i]);
					}
					eval(scopeText);

					var callingModule = require.module,
						// the list of modules that need to be downloaded but not executed before the callingModule can be executed
						requireList = [],

						// the list of i18n bundles that are xdomain; undefined if none
						i18nDeps,

						syncLoaderApi = {
							provide:function(moduleName){
								// mark modules that arrive consequent to multiple provides in this module as arrived since they can't be injected
								moduleName = slashName(moduleName);
								var providedModule = getModule(moduleName, callingModule);
								if(providedModule!==callingModule){
									setArrived(providedModule);
								}
							},
							require:function(moduleName, omitModuleCheck){
								moduleName = slashName(moduleName);
								omitModuleCheck && (getModule(moduleName, callingModule).result = nonmodule);
								requireList.push(moduleName);
							},
							requireLocalization:function(moduleName, bundleName, locale){
								// since we're going to need dojo/i8n, add it to i18nDeps if not already there
								if(!i18nDeps){
									// don't have to map since that will occur when the dependency is resolved
									i18nDeps = ["dojo/i18n"];
								}

								// figure out if the bundle is xdomain; if so, add it to the i18nDepsSet
								locale = (locale || dojo.locale).toLowerCase();
								moduleName = slashName(moduleName) + "/nls/" + (/root/i.test(locale) ? "" : locale + "/") + slashName(bundleName);
								if(getModule(moduleName, callingModule).isXd){
									// don't have to map since that will occur when the dependency is resolved
									i18nDeps.push("dojo/i18n!" + moduleName);
								}// else the bundle will be loaded synchronously when the module is evaluated
							},
							loadInit:function(f){
								f();
							}
						},

						hold = {},
						p;

					// hijack the correct dojo and apply bundle.def
					try{
						for(p in syncLoaderApi){
							hold[p] = dojo[p];
							dojo[p] = syncLoaderApi[p];
						}
						bundle.def.apply(null, args);
					}catch(e){
						signal("error", [makeErrorToken("failedDojoLoadInit"), e]);
					}finally{
						for(p in syncLoaderApi){
							dojo[p] = hold[p];
						}
					}

					if(i18nDeps){
						requireList = requireList.concat(i18nDeps);
					}

					if(requireList.length){
						dojoRequirePlugin(requireList.join(","), require, loaded);
					}else{
						loaded();
					}
				});
			});
		},

		extractApplication = function(
			text,			  // the text to search
			startSearch,	  // the position in text to start looking for the closing paren
			startApplication  // the position in text where the function application expression starts
		){
			// find end of the call by finding the matching end paren
			// Warning: as usual, this will fail in the presence of unmatched right parans contained in strings, regexs, or unremoved comments
			var parenRe = /\(|\)/g,
				matchCount = 1,
				match;
			parenRe.lastIndex = startSearch;
			while((match = parenRe.exec(text))){
				if(match[0] == ")"){
					matchCount -= 1;
				}else{
					matchCount += 1;
				}
				if(matchCount == 0){
					break;
				}
			}

			if(matchCount != 0){
				throw "unmatched paren around character " + parenRe.lastIndex + " in: " + text;
			}

			//Put the master matching string in the results.
			return [dojo.trim(text.substring(startApplication, parenRe.lastIndex))+";\n", parenRe.lastIndex];
		},

		// the following regex is taken from 1.6. It is a very poor technique to remove comments and
		// will fail in some cases; for example, consider the code...
		//
		//	  var message = "Category-1 */* Category-2";
		//
		// The regex that follows will see a /* comment and trash the code accordingly. In fact, there are all
		// kinds of cases like this with strings and regexs that will cause this design to fail miserably.
		//
		// Alternative regex designs exist that will result in less-likely failures, but will still fail in many cases.
		// The only solution guaranteed 100% correct is to parse the code and that seems overkill for this
		// backcompat/unbuilt-xdomain layer. In the end, since it's been this way for a while, we won't change it.
		// See the opening paragraphs of Chapter 7 or ECME-262 which describes the lexical abiguity further.
		removeCommentRe = /(\/\*([\s\S]*?)\*\/|\/\/(.*)$)/mg,

		syncLoaderApiRe = /(^|\s)dojo\.(loadInit|require|provide|requireLocalization|requireIf|requireAfterIf|platformRequire)\s*\(/mg,

		amdLoaderApiRe = /(^|\s)(require|define)\s*\(/m,

		extractLegacyApiApplications = function(text, noCommentText){
			// scan the noCommentText for any legacy loader API applications. Copy such applications into result (this is
			// used by the builder). Move dojo.loadInit applications to loadInitApplications string. Copy all other applications
			// to otherApplications string. If no applications were found, return 0, signalling an AMD module. Otherwise, return
			// loadInitApplications + otherApplications. Fixup text by replacing
			//
			//	 dojo.loadInit(// etc...
			//
			// with
			//
			//	 \n 0 && dojo.loadInit(// etc...
			//
			// Which results in the dojo.loadInit from *not* being applied. This design goes a long way towards protecting the
			// code from an over-agressive removeCommentRe. However...
			//
			// WARNING: the removeCommentRe will cause an error if a detected comment removes all or part of a legacy-loader application
			// that is not in a comment.

			var match, startSearch, startApplication, application,
				loadInitApplications = [],
				otherApplications = [],
				allApplications = [];

			// noCommentText may be provided by a build app with comments extracted by a better method than regex (hopefully)
			noCommentText = noCommentText || text.replace(removeCommentRe, function(match){
				// remove iff the detected comment has text that looks like a sync loader API application; this helps by
				// removing as little as possible, minimizing the changes the janky regex will kill the module
				syncLoaderApiRe.lastIndex = amdLoaderApiRe.lastIndex = 0;
				return (syncLoaderApiRe.test(match) || amdLoaderApiRe.test(match)) ? "" : match;
			});

			// find and extract all dojo.loadInit applications
			while((match = syncLoaderApiRe.exec(noCommentText))){
				startSearch = syncLoaderApiRe.lastIndex;
				startApplication = startSearch	- match[0].length;
				application = extractApplication(noCommentText, startSearch, startApplication);
				if(match[2]=="loadInit"){
					loadInitApplications.push(application[0]);
				}else{
					otherApplications.push(application[0]);
				}
				syncLoaderApiRe.lastIndex = application[1];
			}
			allApplications = loadInitApplications.concat(otherApplications);
			if(allApplications.length || !amdLoaderApiRe.test(noCommentText)){
				// either there were some legacy loader API applications or there were no AMD API applications
				return [text.replace(/(^|\s)dojo\.loadInit\s*\(/g, "\n0 && dojo.loadInit("), allApplications.join(""), allApplications];
			}else{
				// legacy loader API *was not* detected and AMD API *was* detected; therefore, assume it's an AMD module
				return 0;
			}
		},

		transformToAmd = function(module, text){
			// This is roughly the equivalent of dojo._xdCreateResource in 1.6-; however, it expresses a v1.6- dojo
			// module in terms of AMD define instead of creating the dojo proprietary xdomain module expression.
			// The module could have originated from several sources:
			//
			//	 * amd require() a module, e.g., require(["my/module"])
			//	 * amd require() a nonmodule, e.g., require(["my/resource.js"')
			//	 * amd define() deps vector (always a module)
			//	 * dojo.require() a module, e.g. dojo.require("my.module")
			//	 * dojo.require() a nonmodule, e.g., dojo.require("my.module", true)
			//	 * dojo.requireIf/requireAfterIf/platformRequire a module
			//
			// The module is scanned for legacy loader API applications; if none are found, then assume the module is an
			// AMD module and return 0. Otherwise, a synthetic dojo/loadInit plugin resource is created and the module text
			// is rewritten as an AMD module with the single dependency of this synthetic resource. When the dojo/loadInit
			// plugin loaded the synthetic resource, it will cause all dojo.loadInit's to be executed, find all dojo.require's
			// (either directly consequent to dojo.require or indirectly consequent to dojo.require[After]If or
			// dojo.platformRequire, and finally cause loading of all dojo.required modules with the dojo/require plugin. Thus,
			// when the dojo/loadInit plugin reports it has been loaded, all modules required by the given module are guaranteed
			// loaded (but not executed). This then allows the module to execute it's code path without interupts, thereby
			// following the synchronous code path.
			//
			// Notice that this function behaves the same whether or not it happens to be in a mapped dojo/loader module.

			var extractResult, id, names = [], namesAsStrings = [];
			if(buildDetectRe.test(text) || !(extractResult = extractLegacyApiApplications(text))){
				// buildDetectRe.test(text) => a built module, always AMD
				// extractResult==0 => no sync API
				return 0;
			}

			// manufacture a synthetic module id that can never be a real mdule id (just like require does)
			id = module.mid + "-*loadInit";

			// construct the dojo/loadInit names vector which causes any relocated names to be defined as lexical variables under their not-relocated name
			// the dojo/loadInit plugin assumes the first name in names is "dojo"

			for(var p in getModule("dojo", module).result.scopeMap){
				names.push(p);
				namesAsStrings.push('"' + p + '"');
			}

			// rewrite the module as a synthetic dojo/loadInit plugin resource + the module expressed as an AMD module that depends on this synthetic resource
			// don't have to map dojo/init since that will occur when the dependency is resolved
			return "// xdomain rewrite of " + module.mid + "\n" +
				"define('" + id + "',{\n" +
				"\tnames:" + json.stringify(names) + ",\n" +
				"\tdef:function(" + names.join(",") + "){" + extractResult[1] + "}" +
				"});\n\n" +
				"define(" + json.stringify(names.concat(["dojo/loadInit!"+id])) + ", function(" + names.join(",") + "){\n" + extractResult[0] + "});";
		},

		loaderVars = require.initSyncLoader(dojoRequirePlugin, checkDojoRequirePlugin, transformToAmd),

		sync =
			loaderVars.sync,

		requested =
			loaderVars.requested,

		arrived =
			loaderVars.arrived,

		nonmodule =
			loaderVars.nonmodule,

		executing =
			loaderVars.executing,

		executed =
			loaderVars.executed,

		syncExecStack =
			loaderVars.syncExecStack,

		modules =
			loaderVars.modules,

		execQ =
			loaderVars.execQ,

		getModule =
			loaderVars.getModule,

		injectModule =
			loaderVars.injectModule,

		setArrived =
			loaderVars.setArrived,

		signal =
			loaderVars.signal,

		finishExec =
			loaderVars.finishExec,

		execModule =
			loaderVars.execModule,

		getLegacyMode =
			loaderVars.getLegacyMode,

		guardCheckComplete =
			loaderVars.guardCheckComplete;

	// there is exactly one dojoRequirePlugin among possibly-many dojo/_base/loader's (owing to mapping)
	dojoRequirePlugin = loaderVars.dojoRequirePlugin;

	dojo.provide = function(mid){
		var executingModule = syncExecStack[0],
			module = lang.mixin(getModule(slashName(mid), require.module), {
				executed:executing,
				result:lang.getObject(mid, true)
			});
		setArrived(module);
		if(executingModule){
			(executingModule.provides || (executingModule.provides = [])).push(function(){
				module.result = lang.getObject(mid);
				delete module.provides;
				module.executed!==executed && finishExec(module);
			});
		}// else dojo.provide called not consequent to loading; therefore, give up trying to publish module value to loader namespace
		return module.result;
	};

	has.add("config-publishRequireResult", 1, 0, 0);

	dojo.require = function(moduleName, omitModuleCheck) {
		// summary:
		//		loads a Javascript module from the appropriate URI
		//
		// moduleName: String
		//		module name to load, using periods for separators,
		//		 e.g. "dojo.date.locale".  Module paths are de-referenced by dojo's
		//		internal mapping of locations to names and are disambiguated by
		//		longest prefix. See `dojo.registerModulePath()` for details on
		//		registering new modules.
		//
		// omitModuleCheck: Boolean?
		//		if `true`, omitModuleCheck skips the step of ensuring that the
		//		loaded file actually defines the symbol it is referenced by.
		//		For example if it called as `dojo.require("a.b.c")` and the
		//		file located at `a/b/c.js` does not define an object `a.b.c`,
		//		and exception will be throws whereas no exception is raised
		//		when called as `dojo.require("a.b.c", true)`
		//
		// description:
		//		Modules are loaded via dojo.require by using one of two loaders: the normal loader
		//		and the xdomain loader. The xdomain loader is used when dojo was built with a
		//		custom build that specified loader=xdomain and the module lives on a modulePath
		//		that is a whole URL, with protocol and a domain. The versions of Dojo that are on
		//		the Google and AOL CDNs use the xdomain loader.
		//
		//		If the module is loaded via the xdomain loader, it is an asynchronous load, since
		//		the module is added via a dynamically created script tag. This
		//		means that dojo.require() can return before the module has loaded. However, this
		//		should only happen in the case where you do dojo.require calls in the top-level
		//		HTML page, or if you purposely avoid the loader checking for dojo.require
		//		dependencies in your module by using a syntax like dojo["require"] to load the module.
		//
		//		Sometimes it is useful to not have the loader detect the dojo.require calls in the
		//		module so that you can dynamically load the modules as a result of an action on the
		//		page, instead of right at module load time.
		//
		//		Also, for script blocks in an HTML page, the loader does not pre-process them, so
		//		it does not know to download the modules before the dojo.require calls occur.
		//
		//		So, in those two cases, when you want on-the-fly module loading or for script blocks
		//		in the HTML page, special care must be taken if the dojo.required code is loaded
		//		asynchronously. To make sure you can execute code that depends on the dojo.required
		//		modules, be sure to add the code that depends on the modules in a dojo.addOnLoad()
		//		callback. dojo.addOnLoad waits for all outstanding modules to finish loading before
		//		executing.
		//
		//		This type of syntax works with both xdomain and normal loaders, so it is good
		//		practice to always use this idiom for on-the-fly code loading and in HTML script
		//		blocks. If at some point you change loaders and where the code is loaded from,
		//		it will all still work.
		//
		//		More on how dojo.require
		//		`dojo.require("A.B")` first checks to see if symbol A.B is
		//		defined. If it is, it is simply returned (nothing to do).
		//
		//		If it is not defined, it will look for `A/B.js` in the script root
		//		directory.
		//
		//		`dojo.require` throws an exception if it cannot find a file
		//		to load, or if the symbol `A.B` is not defined after loading.
		//
		//		It returns the object `A.B`, but note the caveats above about on-the-fly loading and
		//		HTML script blocks when the xdomain loader is loading a module.
		//
		//		`dojo.require()` does nothing about importing symbols into
		//		the current namespace.	It is presumed that the caller will
		//		take care of that.
		//
		// example:
		//		To use dojo.require in conjunction with dojo.ready:
		//
		//		|	dojo.require("foo");
		//		|	dojo.require("bar");
		//		|	dojo.addOnLoad(function(){
		//		|		//you can now safely do something with foo and bar
		//		|	});
		//
		// example:
		//		For example, to import all symbols into a local block, you might write:
		//
		//		|	with (dojo.require("A.B")) {
		//		|		...
		//		|	}
		//
		//		And to import just the leaf symbol to a local variable:
		//
		//		|	var B = dojo.require("A.B");
		//		|	...
		//
		// returns:
		//		the required namespace object
		function doRequire(mid, omitModuleCheck){
			var module = getModule(slashName(mid), require.module);
			if(syncExecStack.length && syncExecStack[0].finish){
				// switched to async loading in the middle of evaluating a legacy module; stop
				// applying dojo.require so the remaining dojo.requires are applied in order
				syncExecStack[0].finish.push(mid);
				return undefined;
			}

			// recall module.executed has values {0, executing, executed}; therefore, truthy indicates executing or executed
			if(module.executed){
				return module.result;
			}
			omitModuleCheck && (module.result = nonmodule);

			// rcg...why here and in two lines??
			var currentMode = getLegacyMode();

			// recall, in sync mode to inject is to *eval* the module text
			// if the module is a legacy module, this is the same as executing
			// but if the module is an AMD module, this means defining, not executing
			injectModule(module);
			// the inject may have changed the mode
			currentMode = getLegacyMode();

			// in sync mode to dojo.require is to execute
			if(module.executed!==executed && module.injected===arrived){
				// the module was already here before injectModule was called probably finishing up a xdomain
				// load, but maybe a module given to the loader directly rather than having the loader retrieve it

				loaderVars.guardCheckComplete(function(){
					execModule(module);
				});
			}
			if(module.executed){
				return module.result;
			}

			if(currentMode==sync){
				// the only way to get here is in sync mode and dojo.required a module that
				//	 * was loaded async in the injectModule application a few lines up
				//	 * was an AMD module that had deps that are being loaded async and therefore couldn't execute
				if(module.cjs){
					// the module was an AMD module; unshift, not push, which causes the current traversal to be reattempted from the top
					execQ.unshift(module);
				}else{
					// the module was a legacy module
					syncExecStack.length && (syncExecStack[0].finish= [mid]);
				}
			}else{
				// the loader wasn't in sync mode on entry; probably async mode; therefore, no expectation of getting
				// the module value synchronously; make sure it gets executed though
				execQ.push(module);
			}

			return undefined;
		}

		var result = doRequire(moduleName, omitModuleCheck);
		if(has("config-publishRequireResult") && !lang.exists(moduleName) && result!==undefined){
			lang.setObject(moduleName, result);
		}
		return result;
	};

	dojo.loadInit = function(f) {
		f();
	};

	dojo.registerModulePath = function(/*String*/moduleName, /*String*/prefix){
		// summary:
		//		Maps a module name to a path
		// description:
		//		An unregistered module is given the default path of ../[module],
		//		relative to Dojo root. For example, module acme is mapped to
		//		../acme.  If you want to use a different module name, use
		//		dojo.registerModulePath.
		// example:
		//		If your dojo.js is located at this location in the web root:
		//	|	/myapp/js/dojo/dojo/dojo.js
		//		and your modules are located at:
		//	|	/myapp/js/foo/bar.js
		//	|	/myapp/js/foo/baz.js
		//	|	/myapp/js/foo/thud/xyzzy.js
		//		Your application can tell Dojo to locate the "foo" namespace by calling:
		//	|	dojo.registerModulePath("foo", "../../foo");
		//		At which point you can then use dojo.require() to load the
		//		modules (assuming they provide() the same things which are
		//		required). The full code might be:
		//	|	<script type="text/javascript"
		//	|		src="/myapp/js/dojo/dojo/dojo.js"></script>
		//	|	<script type="text/javascript">
		//	|		dojo.registerModulePath("foo", "../../foo");
		//	|		dojo.require("foo.bar");
		//	|		dojo.require("foo.baz");
		//	|		dojo.require("foo.thud.xyzzy");
		//	|	</script>

		var paths = {};
		paths[moduleName.replace(/\./g, "/")] = prefix;
		require({paths:paths});
	};

	dojo.platformRequire = function(/*Object*/modMap){
		// summary:
		//		require one or more modules based on which host environment
		//		Dojo is currently operating in
		// description:
		//		This method takes a "map" of arrays which one can use to
		//		optionally load dojo modules. The map is indexed by the
		//		possible dojo.name_ values, with two additional values:
		//		"default" and "common". The items in the "default" array will
		//		be loaded if none of the other items have been chosen based on
		//		dojo.name_, set by your host environment. The items in the
		//		"common" array will *always* be loaded, regardless of which
		//		list is chosen.
		// example:
		//		|	dojo.platformRequire({
		//		|		browser: [
		//		|			"foo.sample", // simple module
		//		|			"foo.test",
		//		|			["foo.bar.baz", true] // skip object check in _loadModule (dojo.require)
		//		|		],
		//		|		default: [ "foo.sample._base" ],
		//		|		common: [ "important.module.common" ]
		//		|	});

		var result = (modMap.common || []).concat(modMap[dojo._name] || modMap["default"] || []),
			temp;
		while(result.length){
			if(lang.isArray(temp = result.shift())){
				dojo.require.apply(dojo, temp);
			}else{
				dojo.require(temp);
			}
		}
	};

	dojo.requireIf = dojo.requireAfterIf = function(/*Boolean*/ condition, /*String*/ moduleName, /*Boolean?*/omitModuleCheck){
		// summary:
		//		If the condition is true then call `dojo.require()` for the specified
		//		resource
		//
		// example:
		//	|	dojo.requireIf(dojo.isBrowser, "my.special.Module");

		if(condition){
			dojo.require(moduleName, omitModuleCheck);
		}
	};

	dojo.requireLocalization = function(/*String*/moduleName, /*String*/bundleName, /*String?*/locale){
		require(["../i18n"], function(i18n){
			i18n.getLocalization(moduleName, bundleName, locale);
		});
	};

	return {
		// summary:
		//		This module defines the v1.x synchronous loader API.

		extractLegacyApiApplications:extractLegacyApiApplications,
		require:dojoRequirePlugin,
		loadInit:dojoLoadInitPlugin
	};
});

}}});
require({cache:{
'p3/layer/globalWSObject':function(){
define([], 1);

},
'p3/GlobalWorkspace':function(){
define(['p3/WorkspaceManager'], function (WS) {
   0 && console.log('Loading Global Workspace Manager: ', WS);
  window.WorkspaceManager = WS;
   0 && console.log('Window: ', window);
});

},
'p3/WorkspaceManager':function(){
define([
  'dojo/request', 'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/_base/Deferred', 'dojo/topic', './jsonrpc', 'dojo/Stateful',
  'dojo/promise/all', 'dijit/Dialog', 'dijit/form/Button', 'dojo/dom-construct'
], function (
  xhr, declare, lang,
  Deferred, Topic, RPC, Stateful,
  All, Dialog, Button, domConstruct
) {

  var WorkspaceManager = (declare([Stateful], {
    userWorkspaces: null,
    currentWorkspace: null,
    currentPath: null,
    token: '',
    apiUrl: '',
    userId: '',

    downloadTypes: ['bam', 'bai', 'bigwig', 'biochemistry', 'contigs', 'csv',
      'de_novo_assembled_transcripts', 'diffexp_experiment', 'diffexp_expression',
      'diffexp_input_data', 'diffexp_input_metadata', 'diffexp_mapping',
      'diffexp_sample', 'doc', 'docx', 'embl', 'fba',
      'feature_dna_fasta', 'feature_protein_fasta',
      'feature_table', 'genbank_file', 'genome', 'genome_annotation_result',
      'genome_comparison_table', 'gff', 'gif', 'html', 'jpg',
      'json', 'mapping', 'media', 'model', 'modelfolder', 'model_edit',
      'modeltemplate', 'nwk', 'pdf', 'png', 'ppt', 'pptx', 'proteomics_experiment',
      'reads', 'rxnprobs', 'string', 'svg', 'tar_gz', 'tbi',
      'transcriptomics_experiment', 'transcripts', 'txt', 'unspecified', 'vcf',
      'vcf_gz', 'wig', 'xls', 'xlsx', 'zip', 'contigset', 'xml'],
    viewableTypes: ['txt', 'html', 'json', 'csv', 'diffexp_experiment',
      'diffexp_expression', 'diffexp_mapping', 'diffexp_sample', 'pdf',
      'diffexp_input_data', 'diffexp_input_metadata', 'svg', 'gif', 'png', 'jpg'],

    getDefaultFolder: function (type) {
      switch (type) {
        case 'genome_group':
          return '/' + [this.userId, 'home', 'Genome Groups'].join('/');
        case 'feature_group':
          return '/' + [this.userId, 'home', 'Feature Groups'].join('/');
        case 'experiment_folder':
          return '/' + [this.userId, 'home', 'Experiments'].join('/');
        case 'experiment_group':
          return '/' + [this.userId, 'home', 'Experiment Groups'].join('/');

        default:
          return '/' + this.userId;
      }
    },
    _userWorkspacesGetter: function () {
      var _self = this;
      if (this.userWorkspaces && this.userWorkspaces.length > 0) {
        return this.userWorkspaces;
      }

      var p = '/' + this.userId + '/';
      this.userWorkspaces = Deferred.when(this.api('Workspace.ls', [{
        paths: [p],
        includeSubDirs: false,
        Recursive: false
      }]), function (results) {
        var res;
        if (!results[0] || !results[0][p]) {
          res = [];
        } else {
          res = results[0][p].map(function (r) {
            return _self.metaListToObj(r);
          });
        }

        if (res.length > 0) {
          _self.set('userWorkspaces', res);
          Topic.publish('/refreshWorkspace', {});
          return res;
        }
        return Deferred.when(_self.createWorkspace('home'), function (hws) {
          _self.set('userWorkspaces', [hws]);
          return [hws];
        }, function (err) {
           0 && console.error("Error Creating User's home workspace: ", err);
          return [];
        });
      });

      return this.userWorkspaces;
    },

    create: function (obj, createUploadNode, overwrite) {
      var self = this;
      if (obj.path.charAt(obj.path.length - 1) != '/') {
        obj.path += '/';
      }

      return Deferred.when(this.api('Workspace.create', [{
        objects: [[(obj.path + obj.name), (obj.type || 'unspecified'), obj.userMeta || {}, (obj.content || '')]],
        createUploadNodes: createUploadNode,
        overwrite: overwrite
      }]), function (results) {
        if (!results[0][0] || !results[0][0]) {
          throw new Error('Error Creating Object');
        } else {
          if (obj.notification) {
            Topic.publish('/Notification', {
              message: 'Group created: ' + obj.name,
              type: 'message'
            });
          }
          var r = results[0][0];
          Topic.publish('/refreshWorkspace', {});
          return self.metaListToObj(r);
        }
      });
    },

    updateObject: function (meta, data) {
      return this.create({
        path: meta.path,
        type: meta.type,
        name: meta.name,
        meta: meta.userMeta || {},
        content: JSON.stringify(data)
      }, false, true);
    },

    addToGroup: function (groupPath, idType, ids) {
      Topic.publish('/Notification', {
        message: '<span class="default">Adding ' + ids.length +
        ' item' + (ids.length > 1 ? 's' : '') + '...</span>'
      });

      var _self = this;
      return Deferred.when(this.getObject(groupPath), function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        if (res && res.data && res.data.id_list) {
          // add logic to remove duplicate from ids
          var idsFiltered = [];
          ids.forEach(function (id) {
            if (idsFiltered.indexOf(id)  == -1) {
              idsFiltered.push(id);
            }
          });
          if (res.data.id_list[idType]) {
            var existing = {};
            res.data.id_list[idType].forEach(function (id) {
              existing[id] = true;
            });

            idsFiltered = idsFiltered.filter(function (id) {
              return !existing[id];
            });

            res.data.id_list[idType] = res.data.id_list[idType].concat(idsFiltered);
          } else {
            res.data.id_list[idType] = idsFiltered;
          }
          return Deferred.when(_self.updateObject(res.metadata, res.data), function (r) {
            Topic.publish('/Notification', {
              message: idsFiltered.length + ' unique item' +
                (!idsFiltered.length || idsFiltered.length > 1 ? 's' : '') + ' added to group ' + groupPath,
              type: 'message'
            });
            return r;
          });
        }
        Topic.publish('/Notification', {
          message: 'Unable to add Items to group.  Invalid group structure',
          type: 'error',
          duration: 0
        });
        return new Error('Unable to append to group.  Group structure incomplete');
      });
    },

    removeFromGroup: function (groupPath, idType, ids) {
      var _self = this;
      return Deferred.when(this.getObject(groupPath), function (res) {
        if (typeof res.data == 'string') {
          res.data = JSON.parse(res.data);
        }
        //  0 && console.log("Data: ", res.data);
        if (res && res.data && res.data.id_list && res.data.id_list[idType]) {
          //  0 && console.log("Group Length Before: ", res.data.id_list[idType].length, res.data.id_list[idType]);
          res.data.id_list[idType] = res.data.id_list[idType].filter(function (id) {
            return (ids.indexOf(id) < 0);
          });
          //  0 && console.log("Group Length After: ", res.data.id_list[idType].length, res.data.id_list[idType]);
          return Deferred.when(_self.updateObject(res.metadata, res.data), function (r) {
            //  0 && console.log("Publish remove from group notification message");
            Topic.publish('/Notification', {
              message: ids.length + ' Item removed from group ' + groupPath,
              type: 'message',
              duration: 0
            });
            return r;
          });
        }

        Topic.publish('/Notification', {
          message: 'Unable to remove items from group.  Invalid group structure',
          type: 'error',
          duration: 0
        });
        return new Error('Unable to remove from group.  Group structure incomplete');
      });
    },

    createGroup: function (name, type, path, idType, ids) {
      var group = {
        name: name,
        id_list: {}
      };
      // add logic to remove duplicate from ids
      var idsFiltered = [];
      ids.forEach(function (id) {
        if (idsFiltered.indexOf(id)  == -1) {
          idsFiltered.push(id);
        }
      });
      group.id_list[idType] = idsFiltered;

      //  0 && console.log("Creating Group: ", group);
      return this.create({
        path: path,
        name: name,
        type: type,
        userMeta: {},
        content: group,
        notification: true
      });

    },

    createFolder: function (paths) {
      var _self = this;
      if (!paths) {
        throw new Error('Invalid Path(s) to create');
      }
      if (!(paths instanceof Array)) {
        paths = [paths];
      }
      var objs = paths.map(function (p) {
        return [p, 'Directory'];
      });

      return Deferred.when(this.api('Workspace.create', [{ objects: objs }]), function (results) {
        var createdPath = results[0][0];

        if (!createdPath) {
          throw new Error('Please try a new name.');
        } else {
          return _self.metaListToObj(createdPath);
        }
      });
    },

    /**
     * accepts object(s) with at least the following:
     * [{
     *    path: /path/to/object,          (required)
     *    userMeta: (userMeta_for_object> (required)
     *    type: <type_of_object>          (optional)
     * }]
     *
     * note: update_metadata will replace userMeta
     */
    updateMetadata: function (objs) {
      var objs = Array.isArray(objs) ? objs : [objs];

      var data = objs.map(function (obj) {
        return [obj.path, obj.userMeta, obj.type || undefined];
      });

      // note: update_metadata will replace userMeta
      return Deferred.when(this.api('Workspace.update_metadata', [{ objects: data }]), function (res) {
        Topic.publish('/refreshWorkspace', {});
        return res[0][0];
      });
    },

    updateAutoMetadata: function (paths) {
      if (!(paths instanceof Array)) {
        paths = [paths];
      }
      return Deferred.when(this.api('Workspace.update_auto_meta', [{ objects: paths }]), function () {
        Topic.publish('/refreshWorkspace', {});
      });
    },

    deleteObjects: function (paths, deleteFolders, force, types) {
      var self = this;
      if (!paths) throw new Error('Invalid Path(s) to delete');

      // ensure is array
      paths = Array.isArray(paths) ? paths : [paths];

      // throw error for any special folder
      self.omitSpecialFolders(paths, 'delete');


      Topic.publish('/Notification', {
        message: "<span class='default'>Deleting " + paths.length + ' items...</span>'
      });

      // delete objects
      var prom = self.api('Workspace.delete', [{
        objects: paths,
        force: force,
        deleteDirectories: deleteFolders
      }]);

      // figure out any potential hidden job folders (Which may or may not be there)
      if (types) {
        var hiddenFolders = [];
        paths.forEach(function (path, i) {
          if (types[i] === 'job_result') hiddenFolders.push(path);
        });

        if (hiddenFolders.length) {
          var jobProms = this.deleteJobData(hiddenFolders);

          Topic.publish('/Notification', {
            message: "<span class='default'>Deleting associated job result data...</span>"
          });
        }
      }

      return Deferred.when(All(prom, jobProms), function () {
        Topic.publish('/Notification', {
          message: paths.length + (paths.length > 1 ? ' items' : ' item') + ' deleted',
          type: 'message'
        });
        Topic.publish('/refreshWorkspace', {});
      }, function (err) {
        var btn = self.errorDetailsBtn();

        var msg = domConstruct.toDom('<span>' + paths.length + ' items could not be deleted');
        domConstruct.place(btn.domNode, msg, 'last');

        Topic.publish('/Notification', {
          message: msg,
          type: 'error'
        });
      });
    },

    createWorkspace: function (name) {
      var path = '/' + this.userId + '/' + name + '/';

      return Deferred.when(this.createFolder(path), lang.hitch(this, function (workspace) {
        if (name == 'home') {
          return Deferred.when(this.createFolder([
            workspace.path + '/Genome Groups',
            workspace.path + '/Feature Groups',
            workspace.path + '/Experiments',
            workspace.path + '/Experiment Groups'
          ]), function () {
            Topic.publish('/Notification', {
              message: "New workspace '" + name + "' created",
              type: 'message'
            });

            return workspace;
          });
        }

        return workspace;
      }));
    },

    getObjectsByType: function (types, showHidden, specialPath) {
      types = (types instanceof Array) ? types : [types];
      //  0 && console.log("Get ObjectsByType: ", types);

      return Deferred.when(this.get('currentWorkspace'), lang.hitch(this, function (current) {
        var _self = this;

        var path = specialPath || current.path;
        return Deferred.when(this.api('Workspace.ls', [{
          paths: [path],
          excludeDirectories: false,
          excludeObjects: false,
          query: { type: types },
          recursive: true
        }]), function (results) {
          if (!results[0] || !results[0][path]) {
            return [];
          }
          var res = results[0][path];

          res = res.map(function (r) {
            return _self.metaListToObj(r);
          }).filter(function (r) {
            if (r.type == 'folder') {
              if (r.path.split('/').some(function (p) {
                return p.charAt(0) == '.';
              })) {
                return false;
              }
            }
            return (types.indexOf(r.type) >= 0);
          });
          /* .filter(function(r){
            if (!showHidden && r.name.charAt(0)=="."){ return false };
            return true;
          }) */

          //  0 && console.log("Final getObjectsByType()", res)
          return res;
        });
      }));
    },
    getDownloadUrls: function (paths) {
      paths = paths instanceof Array ? paths : [paths];
      return Deferred.when(this.api('Workspace.get_download_url', [{ objects: paths }]), function (urls) {
        return urls[0];
      });
    },

    downloadFile: function (path) {
      return Deferred.when(this.api('Workspace.get_download_url', [{ objects: [path] }]), function (urls) {
        //  0 && console.log("download Urls: ", urls);
        // window.open(urls[0]); // window.open can be blocked by pop-up blockers
        window.location.assign(urls[0]);
      });
    },

    getObject: function (path, metadataOnly) {
      if (!path) {
        throw new Error('Invalid Path(s) to retrieve');
      }
      path = decodeURIComponent(path);

      return Deferred.when(this.api('Workspace.get', [{
        objects: [path],
        metadata_only: metadataOnly
      }]), function (results) {
        if (!results || !results[0] || !results[0][0] || !results[0][0][0] || !results[0][0][0][4]) {
          throw new Error('Object not found: ');
        }

        var meta = {
          name: results[0][0][0][0],
          type: results[0][0][0][1],
          path: results[0][0][0][2],
          creation_time: results[0][0][0][3],
          id: results[0][0][0][4],
          owner_id: results[0][0][0][5],
          size: results[0][0][0][6],
          userMeta: results[0][0][0][7],
          autoMeta: results[0][0][0][8],
          user_permissions: results[0][0][0][9],
          global_permission: results[0][0][0][10],
          link_reference: results[0][0][0][11]
        };
        if (metadataOnly) {
          return meta;
        }

        var res = {
          metadata: meta,
          data: results[0][0][1]
        };

        if (meta.link_reference) {
          var headers = {
            'X-Requested-With': null
          };
          if (window.App.authorizationToken) {
            headers.Authorization = 'OAuth ' + window.App.authorizationToken;
          }

          var d = xhr.get(meta.link_reference + '?download', {
            headers: headers
          });

          return Deferred.when(d, function (data) {
            return {
              metadata: meta,
              data: data
            };
          }, function (err) {
             0 && console.error('Error Retrieving data object from shock :', err, meta.link_reference);
          });
        }

        //  0 && console.log("getObjects() res", res);
        return res;
      });

    },

    copy: function (paths, dest, types /* optional */) {
      var self = this;

      // copy contents into folders of same name, but whatever parent path is choosen
      var srcDestPaths = paths.map(function (path) {
        return [path, dest + '/' + path.slice(path.lastIndexOf('/') + 1)];
      });

      // if copying to workspace level, need to create the folders first
      // see latter of: https://github.com/PATRIC3/Workspace/issues/53
      if (dest.split('/').length < 3) {
        var newWSPaths = paths.map(function (path) {
          return [dest + '/' + path.slice(path.lastIndexOf('/') + 1) + '/', 'Directory'];
        });

        var initProm = this.api('Workspace.create', [{ objects: newWSPaths }]);
      }

      Topic.publish('/Notification', {
        message: "<span class='default'>Copying " + paths.length + ' items...</span>'
      });


      // figure out any potential hidden job folders (Which may or may not be there)
      if (types) {
        var hiddenFolders = [];
        paths.forEach(function (path, i) {
          if (types[i] === 'job_result') hiddenFolders.push(path);
        });

        if (hiddenFolders.length) {
          var jobProms = this.moveJobData(hiddenFolders, dest, false /* just copy */);

          Topic.publish('/Notification', {
            message: "<span class='default'>Copying associated job result data...</span>"
          });
        }
      }

      return Deferred.when(initProm, function (res) {
        var copyProm = self.api('Workspace.copy', [{
          objects: srcDestPaths,
          recursive: true,
          move: false
        }]);

        return Deferred.when(All(copyProm, jobProms), function (res) {
          Topic.publish('/refreshWorkspace', {});
          Topic.publish('/Notification', {
            message: 'Copied contents of ' + paths.length + (paths.length > 1 ? ' items' : 'item'),
            type: 'message'
          });
          return res;
        });
      });
    },

    move: function (paths, dest, types /* optional */) {
      var self = this;

      self.omitSpecialFolders(paths, 'move');

      var srcDestPaths = paths.map(function (path) {
        return [path, dest + '/' + path.slice(path.lastIndexOf('/') + 1)];
      });

      // if moving to workspace level, need to create the folders first
      // see latter of: https://github.com/PATRIC3/Workspace/issues/53
      if (dest.split('/').length < 3) {
        var newWSPaths = paths.map(function (path) {
          return [dest + '/' + path.slice(path.lastIndexOf('/') + 1) + '/', 'Directory'];
        });

        var initProm = this.api('Workspace.create', [{ objects: newWSPaths }]);
      }

      Topic.publish('/Notification', {
        message: "<span class='default'>Moving " + paths.length + ' items...</span>'
      });

      // figure out any potential hidden job folders (Which may or may not be there)
      if (types) {
        var hiddenFolders = [];
        paths.forEach(function (path, i) {
          if (types[i] === 'job_result') hiddenFolders.push(path);
        });

        if (hiddenFolders.length) {
          this.moveJobData(hiddenFolders, dest, true /* should move */);

          Topic.publish('/Notification', {
            message: "<span class='default'>Moving associated job result data...</span>"
          });
        }
      }

      return Deferred.when(initProm, function (res) {
        return Deferred.when(
          self.api('Workspace.copy', [{
            objects: srcDestPaths,
            recursive: true,
            move: true
          }]),
          function (res) {
            Topic.publish('/refreshWorkspace', {});
            Topic.publish('/Notification', {
              message: 'Moved contents of ' + paths.length + (paths.length > 1 ? ' items' : ' item'),
              type: 'message'
            });
            return res;
          }
        );
      });
    },

    rename: function (path, newName, isJob) {
      var self = this;

      self.omitSpecialFolders([path], 'rename');

      if (path.split('/').length <= 3) {
        return self.renameWorkspace(path, newName);
      }

      var newPath = path.slice(0, path.lastIndexOf('/')) + '/' + newName;

      // ensure path doesn't already exist
       0 && console.log('Checking for "', newPath, '" before rename...' );
      return Deferred.when(
        this.getObjects(newPath, true),
        function (response) {
          throw Error('The name <i>' + newName + '</i> already exists!  Please pick a unique name.');
        }, function (err) {

          var prom = self.api('Workspace.copy', [{
            objects: [[path, newPath]],
            recursive: true,
            move: true
          }]);

          if (isJob) {
            // if job, also need to rename hiden folder
            var jobProm = self.renameJobData(path, newName);
            prom = All(prom, jobProm);
          }

          return Deferred.when(prom);
        }
      );
    },

    renameWorkspace: function (path, newName) {
      var self = this;

      self.omitSpecialFolders([path], 'rename');

      var newPath = path.slice(0, path.lastIndexOf('/')) + '/' + newName;

      if (path == newPath) {
        throw Error('The name <i>' + newName + '</i> already exists!  Please pick a unique name.');
      }

      return Deferred.when(this.api('Workspace.create', [{ objects: [[newPath, 'Directory']] }]), function (response) {
        return Deferred.when(self.api(
          'Workspace.copy', [{
            objects: [[path, newPath]],
            recursive: true,
            move: true
          }],
          function (res) {
            Topic.publish('/refreshWorkspace', {});
            Topic.publish('/Notification', { message: 'File renamed', type: 'message' });
            return res;
          }
        ));
      });
    },

    // hack to deal with job result data (dot folders)
    moveJobData: function (paths, dest, shouldMove) {
      var self = this;
      var paths = Array.isArray(paths) ? paths : [paths];

      // log what is happening so that console error is expected
       0 && console.log('Attempting to copy job data with move=' + shouldMove + '...');
      var proms = paths.map(function (path) {
        var parts = path.split('/'),
          jobName = parts.pop(),
          dotPath = parts.join('/') + '/.' + jobName;

        return self.api('Workspace.copy', [{
          objects: [[dotPath, dest + '/.' + jobName]],
          recursive: true,
          move: shouldMove
        }]);
      });

      return proms;
    },

    renameJobData: function (path, newName) {
      var self = this;

      var parts = path.split('/'),
        jobName = parts.pop(),
        dotPath = parts.join('/') + '/.' + jobName;

      var newPath = path.slice(0, path.lastIndexOf('/')) + '/.' + newName;

      // log what is happening so that console error is expected
       0 && console.log('Checking for job data "', newPath, '" before rename...' );
      return Deferred.when(
        this.getObjects(newPath, true),
        function (response) {
          throw Error('The name <i>' + newName + '</i> already exists!  Please pick a unique name.');
        }, function (err) {
          self.api('Workspace.copy', [{
            objects: [[dotPath, newPath]],
            recursive: true,
            move: true
          }]);
        }
      );
    },

    deleteJobData: function (paths) {
      var self = this;
      var paths = Array.isArray(paths) ? paths : [paths];

      // log what is happening so that console error is expected
       0 && console.log('Attempting to delete job data: ', paths);
      var proms = paths.map(function (path) {
        var parts = path.split('/'),
          jobName = parts.pop(),
          dotPath = parts.join('/') + '/.' + jobName;

        return self.api('Workspace.delete', [{
          objects: [dotPath],
          force: true,
          deleteDirectories: true
        }]);
      });

      return proms;
    },

    getObjects: function (paths, metadataOnly) {
      if (!paths) {
        throw new Error('Invalid Path(s) to delete');
      }
      if (!(paths instanceof Array)) {
        paths = [paths];
      }
      paths = paths.map(function (p) {
        return decodeURIComponent(p);
      });
      return Deferred.when(this.api('Workspace.get', [{
        objects: paths,
        metadata_only: metadataOnly
      }]), function (results) {
        //  0 && console.log("results[0]", results[0]);
        var objs = results[0];
        var fin = [];
        var defs = objs.map(function (obj) {
          //  0 && console.log("obj: ", obj);
          var meta = {
            name: obj[0][0],
            type: obj[0][1],
            path: obj[0][2],
            creation_time: obj[0][3],
            id: obj[0][4],
            owner_id: obj[0][5],
            size: obj[0][6],
            userMeta: obj[0][7],
            autoMeta: obj[0][8],
            user_permissions: obj[0][9],
            global_permission: obj[0][10],
            link_reference: obj[0][11]
          };
          if (metadataOnly) {
            fin.push(meta);
            return true;
          }

          if (!meta.link_reference) {
            var res = {
              metadata: meta,
              data: obj[1]
            };
            fin.push(res);
            return true;
          }

          var headers = {
            'X-Requested-With': null
          };
          if (window.App.authorizationToken) {
            headers.Authorization = 'OAuth ' + window.App.authorizationToken;
          }

          var d = xhr.get(meta.link_reference + '?download', {
            headers: headers
          });

          return Deferred.when(d, function (data) {
            fin.push({
              metadata: meta,
              data: data
            });
            return true;
          }, function (err) {
             0 && console.error('Error Retrieving data object from shock :', err, meta.link_reference);
          });

        });

        return Deferred.when(All(defs), function () {
          return fin;
        });
      });

    },

    getFolderContents: function (path, showHidden, recursive, filterPublic) {
      path = decodeURIComponent(path);

      var _self = this;
      return Deferred.when(
        this.api('Workspace.ls', [{
          paths: [path],
          includeSubDirs: false,
          recursive: !!recursive
        }]), function (results) {
          if (!results[0] || !results[0][path]) {
            return [];
          }
          var res = results[0][path];

          res = res.map(function (r) {
            return _self.metaListToObj(r);
          }).filter(function (r) {
            if (!showHidden && r.name.charAt(0) == '.') {
              return false;
            }

            return true;
          });

          // if getting "public" workspaces, filter out writeable and owner workspaces
          if (filterPublic) {
            res = res.filter(function (r) {
              if (r.global_permission == 'w') return false;
              else if (r.global_permission == 'n') return false;
              return true;
            });
          }

          return res;
        },

        function (err) {
        //  0 && console.log("Error Loading Workspace:", err);
          _self.showError(err);
        }
      );
    },

    listSharedWithUser: function (path) {
      var _self = this;
      return Deferred.when(
        this.api('Workspace.ls', [{
          paths: ['/']
        }]), function (results) {
          var allWS = results[0]['/'];

          // transform to human friendly
          allWS = allWS.map(function (r) { return _self.metaListToObj(r); });

          // filter out public and owner's folders (silly, I know)
          var sharedWithUser = allWS.filter(function (r) {
            if (r.global_permission !== 'n') return false;
            else if (r.user_permission == 'o' && r.global_permission == 'n') return false;
            return true;
          });


          return sharedWithUser;
        },

        function (err) {
          _self.showError(err);
        }
      );
    },

    /**
     * takes path string and list of permission objects of form
     * [{user: 'user@patricbrc.org', permission: <'r'|'w'|'n'|'a'|>}, ... ]
     */
    setPermissions: function (path, permissions) {
      var _self = this;

      // map list of objs to list of lists
      var permissions = permissions.map(function (p) {
        return [p.user, p.permission];
      });

      return Deferred.when(
        this.api('Workspace.set_permissions', [{
          path: path,
          permissions: permissions
        }]), function (res) {
          return res;
        },

        function (err) {
          _self.showError(err);
        }
      );
    },

    setPublicPermission: function (path, permission) {
      var _self = this;
      return Deferred.when(
        this.api('Workspace.set_permissions', [{
          path: path,
          new_global_permission: permission
        }]), function (res) {
          return res;
        },

        function (err) {
          _self.showError(err);
        }
      );
    },


    /**
     * Lists permissions, given paths(s)
     *
     * returns lists of lists (if single path given)
     *  or
     * returns hash of paths with list of lists values (if multiple paths given)
     *
     * Todo: to be deprecated?
     */
    listPermissions: function (paths) {
      var _self = this;
      return Deferred.when(
        this.api('Workspace.list_permissions', [{
          objects: Array.isArray(paths) ? paths : [paths]
        }]), function (res) {
          return Array.isArray(paths) ? res[0] : res[0][paths];
        },

        function (err) {
          _self.showError(err);
        }
      );
    },

    /**
     * Lists permissions, given paths(s)
     *
     * returns lists of objects (if single path given)
     *  or
     * returns hash of paths with list of objects as values (if multiple paths given)
     *
     */
    listPerms: function (path, includeGlobal) {
      var self = this;
      var paths = Array.isArray(path) ? path : [path];

      return Deferred.when(
        this.api('Workspace.list_permissions', [{
          objects: paths
        }]), function (res) {
          var pathHash = res[0];
          Object.keys(pathHash).forEach(function (path) {
          // server sometimes returns 'none' permissions, ignore them.
            var permObjs = pathHash[path].filter(function (p) {
              return p[1] != 'n' || (includeGlobal && p[0] == 'global_permission');
            }).map(function (p) {
              return {
                'user': p[0],
                'perm': self.permissionMap(p[1])
              };
            });

            pathHash[path] = permObjs;
          });

          return Object.keys(pathHash).length > 1 ? pathHash : pathHash[path];
        },

        function (err) {
          self.showError(err);
        }
      );
    },

    permissionMap: function (perm) {
      var mapping = {
        'n': 'No access',
        'r': 'Can view',
        'w': 'Can edit',
        'a': 'Admin'
      };
      return mapping[perm];
    },

    metaListToObj: function (list) {
      return {
        id: list[4],
        path: list[2] + list[0],
        name: list[0],
        type: list[1],
        creation_time: list[3],
        link_reference: list[11],
        owner_id: list[5],
        size: list[6],
        userMeta: list[7],
        autoMeta: list[8],
        user_permission: list[9],
        global_permission: list[10],
        timestamp: Date.parse(list[3])
      };
    },

    errorDetailsBtn: function () {
      var btn = new Button({
        label: 'Details',
        // disabled: true,
        onClick: function () {
          var dlg = new Dialog({
            title: 'Group Comparison',
            style: 'width: 1250px !important; height: 750px !important;',
            onHide: function () {
              dlg.destroy();
            }
          }).startup();
          dlg.show();
        }
      });

      return btn;
    },

    omitSpecialFolders: function (paths, operation) {
      paths = Array.isArray(paths) ? paths : [paths];

      //  regect home workspaces (must check for anybody's home)
      var isHome = paths.filter(function (p) {
        var parts = p.split('/');
        return parts.length == 3 && parts[2] == 'home';
      }).length;

      if (isHome) {
        throw new Error('Your <i>home</i> workspace is a special workspace which cannot be ' + operation + 'd.');
      }

      // also reject these home folders
      var unacceptedFolders = [
        'Genome Groups',
        'Feature Groups',
        'Experiments',
        'Experiment Groups'
      ];

      var unacceptedPaths = paths.filter(function (p) {
        var parts = p.split('/');
        if (parts.length == 4 && parts[2] == 'home' && unacceptedFolders.indexOf(parts[3]) != -1) return true;
      });

      if (unacceptedPaths.length) {
        throw new Error('You cannot ' + operation + ' any of the following special folders:<br><br>' +
          '<i>' + unacceptedFolders.join('<br>') + '</i>');
      }
    },

    _userWorkspacesSetter: function (val) {
      Topic.publish('/userWorkspaces', val);
      this.userWorkspaces = val;
    },

    _currentWorkspaceGetter: function () {
      if (!this.currentWorkspace) {
        this.currentWorkspace = Deferred.when(this.get('userWorkspaces'), lang.hitch(this, function (cws) {
          if (!cws || cws.length < 1) {
            throw Error('No User Workspaces found when attempting to get the Current Workspace for user.');
          }
          this.currentWorkspace = cws[0];
          return cws[0];
        }));
      }
      // return this.currentWorkspace;

      // just return user's home
      return { path: '/' + this.userId + '/home/' };
    },
    _currentWorkspaceSetter: function (val) {
      this.currentWorkspace = val;
    },

    _currentPathGetter: function () {
      if (!this.currentPath) {
        this.currentPath = Deferred.when(this.get('currentWorkspace'), lang.hitch(this, function (cws) {
          this.currentPath = cws.path;
          return cws.path;
        }));

      }

      return this.currentPath;
    },
    _currentPathSetter: function (val) {
      this.currentPath = val;
    },

    // Todo(nc): generic error
    showError: function (e) {

    },

    init: function (apiUrl, token, userId) {
      if (!apiUrl || !token || !userId) {
         0 && console.log('Unable to initialize workspace manager. Args: ', arguments);
        return;
      }

      this.token = token;
      this.apiUrl = apiUrl;
      this.api = RPC(apiUrl, token);
      this.userId = userId;
      if (userId && token) {
        Deferred.when(this.get('currentPath'), function (cwsp) {
          //  0 && console.log("Current Workspace Path: ", cwsp)
        });
      } else {
        this.currentPath = '/';
        this.currentWorkspace = '/NOWORKSPACE';
      }

    }
  }))();

  return WorkspaceManager;
});

},
'dojo/request':function(){
define([
	'./request/default!'/*=====,
	'./_base/declare',
	'./promise/Promise' =====*/
], function(request/*=====, declare, Promise =====*/){
	/*=====
	request = function(url, options){
		// summary:
		//		Send a request using the default transport for the current platform.
		// url: String
		//		The URL to request.
		// options: dojo/request.__Options?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	request.__Promise = declare(Promise, {
		// response: dojo/promise/Promise
		//		A promise resolving to an object representing
		//		the response from the server.
	});
	request.__BaseOptions = declare(null, {
		// query: String|Object?
		//		Query parameters to append to the URL.
		// data: String|Object?
		//		Data to transfer.  This is ignored for GET and DELETE
		//		requests.
		// preventCache: Boolean?
		//		Whether to append a cache-busting parameter to the URL.
		// timeout: Integer?
		//		Milliseconds to wait for the response.  If this time
		//		passes, the then the promise is rejected.
		// handleAs: String?
		//		How to handle the response from the server.  Default is
		//		'text'.  Other values are 'json', 'javascript', and 'xml'.
	});
	request.__MethodOptions = declare(null, {
		// method: String?
		//		The HTTP method to use to make the request.  Must be
		//		uppercase.
	});
	request.__Options = declare([request.__BaseOptions, request.__MethodOptions]);

	request.get = function(url, options){
		// summary:
		//		Send an HTTP GET request using the default transport for the current platform.
		// url: String
		//		URL to request
		// options: dojo/request.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	request.post = function(url, options){
		// summary:
		//		Send an HTTP POST request using the default transport for the current platform.
		// url: String
		//		URL to request
		// options: dojo/request.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	request.put = function(url, options){
		// summary:
		//		Send an HTTP POST request using the default transport for the current platform.
		// url: String
		//		URL to request
		// options: dojo/request.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	request.del = function(url, options){
		// summary:
		//		Send an HTTP DELETE request using the default transport for the current platform.
		// url: String
		//		URL to request
		// options: dojo/request.__BaseOptions?
		//		Options for the request.
		// returns: dojo/request.__Promise
	};
	=====*/
	return request;
});

},
'dojo/request/default':function(){
define([
	'exports',
	'require',
	'../has'
], function(exports, require, has){
	var defId = has('config-requestProvider'),
		platformId;

	if( 1  || has('host-webworker')){
		platformId = './xhr';
	}else if( 0 ){
		platformId = './node';
	/* TODO:
	}else if( 0 ){
		platformId = './rhino';
   */
	}

	if(!defId){
		defId = platformId;
	}

	exports.getPlatformDefaultId = function(){
		return platformId;
	};

	exports.load = function(id, parentRequire, loaded, config){
		require([id == 'platform' ? platformId : defId], function(provider){
			loaded(provider);
		});
	};
});

},
'p3/jsonrpc':function(){
define(['dojo/request', 'dojo/_base/Deferred'
], function (xhr, defer) {
  var idx = 1;
  return function (url, token) {

    return function (method, params, options) {
      var def = new defer();
      defer.when(xhr.post(url, {
        headers: {
          'content-type': 'application/jsonrpc+json',
          Authorization: token,
          'X-Requested-With': false
        },
        handleAs: 'json',
        timeout: 1200000,
        data: JSON.stringify({
          id: idx++, method: method, params: params, jsonrpc: '2.0'
        })
      }), function (response) {
        //  0 && console.log("JSON RPC RESPONSE: ", response);
        if (response.error) {
          return def.reject(response.error);
        }

        if (response.result) {
          def.resolve(response.result);

        }
      }, function (err) {
        try {
          var message = err.response.data.error.message;
          message = message.split('\n\n\n')[0];
          def.reject(message || err.message);
        } catch (e) {
          def.reject(err.response);
        }
      });

      return def.promise;
    };
  };
});

},
'dojo/Stateful':function(){
define(["./_base/declare", "./_base/lang", "./_base/array", "./when"], function(declare, lang, array, when){
	// module:
	//		dojo/Stateful

return declare("dojo.Stateful", null, {
	// summary:
	//		Base class for objects that provide named properties with optional getter/setter
	//		control and the ability to watch for property changes
	//
	//		The class also provides the functionality to auto-magically manage getters
	//		and setters for object attributes/properties.
	//		
	//		Getters and Setters should follow the format of _xxxGetter or _xxxSetter where 
	//		the xxx is a name of the attribute to handle.  So an attribute of "foo" 
	//		would have a custom getter of _fooGetter and a custom setter of _fooSetter.
	//
	// example:
	//	|	require(["dojo/Stateful", function(Stateful) {
	//	|		var obj = new Stateful();
	//	|		obj.watch("foo", function(){
	//	|			 0 && console.log("foo changed to " + this.get("foo"));
	//	|		});
	//	|		obj.set("foo","bar");
	//	|	});

	// _attrPairNames: Hash
	//		Used across all instances a hash to cache attribute names and their getter 
	//		and setter names.
	_attrPairNames: {},

	_getAttrNames: function(name){
		// summary:
		//		Helper function for get() and set().
		//		Caches attribute name values so we don't do the string ops every time.
		// tags:
		//		private

		var apn = this._attrPairNames;
		if(apn[name]){ return apn[name]; }
		return (apn[name] = {
			s: "_" + name + "Setter",
			g: "_" + name + "Getter"
		});
	},

	postscript: function(/*Object?*/ params){
		// Automatic setting of params during construction
		if (params){ this.set(params); }
	},

	_get: function(name, names){
		// summary:
		//		Private function that does a get based off a hash of names
		// names:
		//		Hash of names of custom attributes
		return typeof this[names.g] === "function" ? this[names.g]() : this[name];
	},
	get: function(/*String*/name){
		// summary:
		//		Get a property on a Stateful instance.
		// name:
		//		The property to get.
		// returns:
		//		The property value on this Stateful instance.
		// description:
		//		Get a named property on a Stateful object. The property may
		//		potentially be retrieved via a getter method in subclasses. In the base class
		//		this just retrieves the object's property.
		// example:
		//	|	require(["dojo/Stateful", function(Stateful) {
		//	|		var stateful = new Stateful({foo: 3});
		//	|		stateful.get("foo") // returns 3
		//	|		stateful.foo // returns 3
		//	|	});

		return this._get(name, this._getAttrNames(name)); //Any
	},
	set: function(/*String*/name, /*Object*/value){
		// summary:
		//		Set a property on a Stateful instance
		// name:
		//		The property to set.
		// value:
		//		The value to set in the property.
		// returns:
		//		The function returns this dojo.Stateful instance.
		// description:
		//		Sets named properties on a stateful object and notifies any watchers of
		//		the property. A programmatic setter may be defined in subclasses.
		// example:
		//	|	require(["dojo/Stateful", function(Stateful) {
		//	|		var stateful = new Stateful();
		//	|		stateful.watch(function(name, oldValue, value){
		//	|			// this will be called on the set below
		//	|		}
		//	|		stateful.set(foo, 5);
		//	set() may also be called with a hash of name/value pairs, ex:
		//	|		stateful.set({
		//	|			foo: "Howdy",
		//	|			bar: 3
		//	|		});
		//	|	});
		//	This is equivalent to calling set(foo, "Howdy") and set(bar, 3)

		// If an object is used, iterate through object
		if(typeof name === "object"){
			for(var x in name){
				if(name.hasOwnProperty(x) && x !="_watchCallbacks"){
					this.set(x, name[x]);
				}
			}
			return this;
		}

		var names = this._getAttrNames(name),
			oldValue = this._get(name, names),
			setter = this[names.s],
			result;
		if(typeof setter === "function"){
			// use the explicit setter
			result = setter.apply(this, Array.prototype.slice.call(arguments, 1));
		}else{
			// no setter so set attribute directly
			this[name] = value;
		}
		if(this._watchCallbacks){
			var self = this;
			// If setter returned a promise, wait for it to complete, otherwise call watches immediately
			when(result, function(){
				self._watchCallbacks(name, oldValue, value);
			});
		}
		return this; // dojo/Stateful
	},
	_changeAttrValue: function(name, value){
		// summary:
		//		Internal helper for directly changing an attribute value.
		//
		// name: String
		//		The property to set.
		// value: Mixed
		//		The value to set in the property.
		//
		// description:
		//		Directly change the value of an attribute on an object, bypassing any 
		//		accessor setter.  Also handles the calling of watch and emitting events. 
		//		It is designed to be used by descendant class when there are two values 
		//		of attributes that are linked, but calling .set() is not appropriate.

		var oldValue = this.get(name);
		this[name] = value;
		if(this._watchCallbacks){
			this._watchCallbacks(name, oldValue, value);
		}
		return this; // dojo/Stateful
	},
	watch: function(/*String?*/name, /*Function*/callback){
		// summary:
		//		Watches a property for changes
		// name:
		//		Indicates the property to watch. This is optional (the callback may be the
		//		only parameter), and if omitted, all the properties will be watched
		// returns:
		//		An object handle for the watch. The unwatch method of this object
		//		can be used to discontinue watching this property:
		//		|	var watchHandle = obj.watch("foo", callback);
		//		|	watchHandle.unwatch(); // callback won't be called now
		// callback:
		//		The function to execute when the property changes. This will be called after
		//		the property has been changed. The callback will be called with the |this|
		//		set to the instance, the first argument as the name of the property, the
		//		second argument as the old value and the third argument as the new value.

		var callbacks = this._watchCallbacks;
		if(!callbacks){
			var self = this;
			callbacks = this._watchCallbacks = function(name, oldValue, value, ignoreCatchall){
				var notify = function(propertyCallbacks){
					if(propertyCallbacks){
						propertyCallbacks = propertyCallbacks.slice();
						for(var i = 0, l = propertyCallbacks.length; i < l; i++){
							propertyCallbacks[i].call(self, name, oldValue, value);
						}
					}
				};
				notify(callbacks['_' + name]);
				if(!ignoreCatchall){
					notify(callbacks["*"]); // the catch-all
				}
			}; // we use a function instead of an object so it will be ignored by JSON conversion
		}
		if(!callback && typeof name === "function"){
			callback = name;
			name = "*";
		}else{
			// prepend with dash to prevent name conflicts with function (like "name" property)
			name = '_' + name;
		}
		var propertyCallbacks = callbacks[name];
		if(typeof propertyCallbacks !== "object"){
			propertyCallbacks = callbacks[name] = [];
		}
		propertyCallbacks.push(callback);

		// TODO: Remove unwatch in 2.0
		var handle = {};
		handle.unwatch = handle.remove = function(){
			var index = array.indexOf(propertyCallbacks, callback);
			if(index > -1){
				propertyCallbacks.splice(index, 1);
			}
		};
		return handle; //Object
	}

});

});

},
'dojo/promise/all':function(){
define([
	"../_base/array",
	"../Deferred",
	"../when"
], function(array, Deferred, when){
	"use strict";

	// module:
	//		dojo/promise/all

	var some = array.some;

	return function all(objectOrArray){
		// summary:
		//		Takes multiple promises and returns a new promise that is fulfilled
		//		when all promises have been resolved or one has been rejected.
		// description:
		//		Takes multiple promises and returns a new promise that is fulfilled
		//		when all promises have been resolved or one has been rejected. If one of
		//		the promises is rejected, the returned promise is also rejected. Canceling
		//		the returned promise will *not* cancel any passed promises.
		// objectOrArray: Object|Array?
		//		The promise will be fulfilled with a list of results if invoked with an
		//		array, or an object of results when passed an object (using the same
		//		keys). If passed neither an object or array it is resolved with an
		//		undefined value.
		// returns: dojo/promise/Promise

		var object, array;
		if(objectOrArray instanceof Array){
			array = objectOrArray;
		}else if(objectOrArray && typeof objectOrArray === "object"){
			object = objectOrArray;
		}

		var results;
		var keyLookup = [];
		if(object){
			array = [];
			for(var key in object){
				if(Object.hasOwnProperty.call(object, key)){
					keyLookup.push(key);
					array.push(object[key]);
				}
			}
			results = {};
		}else if(array){
			results = [];
		}

		if(!array || !array.length){
			return new Deferred().resolve(results);
		}

		var deferred = new Deferred();
		deferred.promise.always(function(){
			results = keyLookup = null;
		});
		var waiting = array.length;
		some(array, function(valueOrPromise, index){
			if(!object){
				keyLookup.push(index);
			}
			when(valueOrPromise, function(value){
				if(!deferred.isFulfilled()){
					results[keyLookup[index]] = value;
					if(--waiting === 0){
						deferred.resolve(results);
					}
				}
			}, deferred.reject);
			return deferred.isFulfilled();
		});
		return deferred.promise;	// dojo/promise/Promise
	};
});

},
'dijit/Dialog':function(){
define([
	"require",
	"dojo/_base/array", // array.forEach array.indexOf array.map
	"dojo/aspect",
	"dojo/_base/declare", // declare
	"dojo/Deferred", // Deferred
	"dojo/dom", // dom.isDescendant
	"dojo/dom-class", // domClass.add domClass.contains
	"dojo/dom-geometry", // domGeometry.position
	"dojo/dom-style", // domStyle.set
	"dojo/_base/fx", // fx.fadeIn fx.fadeOut
	"dojo/i18n", // i18n.getLocalization
	"dojo/keys",
	"dojo/_base/lang", // lang.mixin lang.hitch
	"dojo/on",
	"dojo/ready",
	"dojo/sniff", // has("ie") has("opera") has("dijit-legacy-requires")
	"dojo/window", // winUtils.getBox, winUtils.get
	"dojo/dnd/Moveable", // Moveable
	"dojo/dnd/TimedMoveable", // TimedMoveable
	"./focus",
	"./_base/manager", // manager.defaultDuration
	"./_Widget",
	"./_TemplatedMixin",
	"./_CssStateMixin",
	"./form/_FormMixin",
	"./_DialogMixin",
	"./DialogUnderlay",
	"./layout/ContentPane",
	"./layout/utils",
	"dojo/text!./templates/Dialog.html",
	"./a11yclick",	// template uses ondijitclick
	"dojo/i18n!./nls/common"
], function(require, array, aspect, declare, Deferred,
			dom, domClass, domGeometry, domStyle, fx, i18n, keys, lang, on, ready, has, winUtils,
			Moveable, TimedMoveable, focus, manager, _Widget, _TemplatedMixin, _CssStateMixin, _FormMixin, _DialogMixin,
			DialogUnderlay, ContentPane, utils, template){

	// module:
	//		dijit/Dialog

	var resolvedDeferred = new Deferred();
	resolvedDeferred.resolve(true);

	var _DialogBase = declare("dijit._DialogBase" + (has("dojo-bidi") ? "_NoBidi" : ""), [_TemplatedMixin, _FormMixin, _DialogMixin, _CssStateMixin], {
		templateString: template,

		baseClass: "dijitDialog",

		cssStateNodes: {
			closeButtonNode: "dijitDialogCloseIcon"
		},

		// Map widget attributes to DOMNode attributes.
		_setTitleAttr: { node: "titleNode", type: "innerHTML" },

		// open: [readonly] Boolean
		//		True if Dialog is currently displayed on screen.
		open: false,

		// duration: Integer
		//		The time in milliseconds it takes the dialog to fade in and out
		duration: manager.defaultDuration,

		// refocus: Boolean
		//		A Toggle to modify the default focus behavior of a Dialog, which
		//		is to re-focus the element which had focus before being opened.
		//		False will disable refocusing. Default: true
		refocus: true,

		// autofocus: Boolean
		//		A Toggle to modify the default focus behavior of a Dialog, which
		//		is to focus on the first dialog element after opening the dialog.
		//		False will disable autofocusing. Default: true
		autofocus: true,

		// _firstFocusItem: [private readonly] DomNode
		//		The pointer to the first focusable node in the dialog.
		//		Set by `dijit/_DialogMixin._getFocusItems()`.
		_firstFocusItem: null,

		// _lastFocusItem: [private readonly] DomNode
		//		The pointer to which node has focus prior to our dialog.
		//		Set by `dijit/_DialogMixin._getFocusItems()`.
		_lastFocusItem: null,

		// draggable: Boolean
		//		Toggles the movable aspect of the Dialog. If true, Dialog
		//		can be dragged by it's title. If false it will remain centered
		//		in the viewport.
		draggable: true,
		_setDraggableAttr: function(/*Boolean*/ val){
			// Avoid _WidgetBase behavior of copying draggable attribute to this.domNode,
			// as that prevents text select on modern browsers (#14452)
			this._set("draggable", val);
		},

		// maxRatio: Number
		//		Maximum size to allow the dialog to expand to, relative to viewport size
		maxRatio: 0.9,

		// closable: Boolean
		//		Dialog show [x] icon to close itself, and ESC key will close the dialog.
		closable: true,
		_setClosableAttr: function(val){
			this.closeButtonNode.style.display = val ? "" : "none";
			this._set("closable", val);
		},

		postMixInProperties: function(){
			var _nlsResources = i18n.getLocalization("dijit", "common");
			lang.mixin(this, _nlsResources);
			this.inherited(arguments);
		},

		postCreate: function(){
			domStyle.set(this.domNode, {
				display: "none",
				position: "absolute"
			});
			this.ownerDocumentBody.appendChild(this.domNode);

			this.inherited(arguments);

			aspect.after(this, "onExecute", lang.hitch(this, "hide"), true);
			aspect.after(this, "onCancel", lang.hitch(this, "hide"), true);

			this._modalconnects = [];
		},

		onLoad: function(){
			// summary:
			//		Called when data has been loaded from an href.
			//		Unlike most other callbacks, this function can be connected to (via `dojo.connect`)
			//		but should *not* be overridden.
			// tags:
			//		callback

			// when href is specified we need to reposition the dialog after the data is loaded
			// and find the focusable elements
			this.resize();
			this._position();

			if(this.autofocus && DialogLevelManager.isTop(this)){
				this._getFocusItems();
				focus.focus(this._firstFocusItem);
			}

			this.inherited(arguments);
		},

		focus: function(){
			this._getFocusItems();
			focus.focus(this._firstFocusItem);
		},

		_endDrag: function(){
			// summary:
			//		Called after dragging the Dialog. Saves the position of the dialog in the viewport,
			//		and also adjust position to be fully within the viewport, so user doesn't lose access to handle
			var nodePosition = domGeometry.position(this.domNode),
				viewport = winUtils.getBox(this.ownerDocument);
			nodePosition.y = Math.min(Math.max(nodePosition.y, 0), (viewport.h - nodePosition.h));
			nodePosition.x = Math.min(Math.max(nodePosition.x, 0), (viewport.w - nodePosition.w));
			this._relativePosition = nodePosition;
			this._position();
		},

		_setup: function(){
			// summary:
			//		Stuff we need to do before showing the Dialog for the first
			//		time (but we defer it until right beforehand, for
			//		performance reasons).
			// tags:
			//		private

			var node = this.domNode;

			if(this.titleBar && this.draggable){
				this._moveable = new ((has("ie") == 6) ? TimedMoveable // prevent overload, see #5285
					: Moveable)(node, { handle: this.titleBar });
				aspect.after(this._moveable, "onMoveStop", lang.hitch(this, "_endDrag"), true);
			}else{
				domClass.add(node, "dijitDialogFixed");
			}

			this.underlayAttrs = {
				dialogId: this.id,
				"class": array.map(this["class"].split(/\s/),function(s){
					return s + "_underlay";
				}).join(" "),
				_onKeyDown: lang.hitch(this, "_onKey"),
				ownerDocument: this.ownerDocument
			};
		},

		_size: function(){
			// TODO: remove for 2.0
			this.resize();
		},

		_position: function(){
			// summary:
			//		Position the dialog in the viewport.  If no relative offset
			//		in the viewport has been determined (by dragging, for instance),
			//		center the dialog.  Otherwise, use the Dialog's stored relative offset,
			//		adjusted by the viewport's scroll.
			if(!domClass.contains(this.ownerDocumentBody, "dojoMove")){    // don't do anything if called during auto-scroll
				var node = this.domNode,
					viewport = winUtils.getBox(this.ownerDocument),
					p = this._relativePosition,
					bb = p ? null : domGeometry.position(node),
					l = Math.floor(viewport.l + (p ? p.x : (viewport.w - bb.w) / 2)),
					t = Math.floor(viewport.t + (p ? p.y : (viewport.h - bb.h) / 2))
					;
				domStyle.set(node, {
					left: l + "px",
					top: t + "px"
				});
			}
		},

		_onKey: function(/*Event*/ evt){
			// summary:
			//		Handles the keyboard events for accessibility reasons
			// tags:
			//		private

			if(evt.keyCode == keys.TAB){
				this._getFocusItems();
				var node = evt.target;
				if(this._firstFocusItem == this._lastFocusItem){
					// don't move focus anywhere, but don't allow browser to move focus off of dialog either
					evt.stopPropagation();
					evt.preventDefault();
				}else if(node == this._firstFocusItem && evt.shiftKey){
					// if we are shift-tabbing from first focusable item in dialog, send focus to last item
					focus.focus(this._lastFocusItem);
					evt.stopPropagation();
					evt.preventDefault();
				}else if(node == this._lastFocusItem && !evt.shiftKey){
					// if we are tabbing from last focusable item in dialog, send focus to first item
					focus.focus(this._firstFocusItem);
					evt.stopPropagation();
					evt.preventDefault();
				}
			}else if(this.closable && evt.keyCode == keys.ESCAPE){
				this.onCancel();
				evt.stopPropagation();
				evt.preventDefault();
			}
		},

		show: function(){
			// summary:
			//		Display the dialog
			// returns: dojo/promise/Promise
			//		Promise object that resolves when the display animation is complete

			if(this.open){
				return resolvedDeferred.promise;
			}

			if(!this._started){
				this.startup();
			}

			// first time we show the dialog, there's some initialization stuff to do
			if(!this._alreadyInitialized){
				this._setup();
				this._alreadyInitialized = true;
			}

			if(this._fadeOutDeferred){
				// There's a hide() operation in progress, so cancel it, but still call DialogLevelManager.hide()
				// as though the hide() completed, in preparation for the DialogLevelManager.show() call below.
				this._fadeOutDeferred.cancel();
				DialogLevelManager.hide(this);
			}

			// Recenter Dialog if user scrolls browser.  Connecting to document doesn't work on IE, need to use window.
			// Be sure that event object doesn't get passed to resize() method, because it's expecting an optional
			// {w: ..., h:...} arg.
			var win = winUtils.get(this.ownerDocument);
			this._modalconnects.push(on(win, "scroll", lang.hitch(this, "resize", null)));

			this._modalconnects.push(on(this.domNode, "keydown", lang.hitch(this, "_onKey")));

			domStyle.set(this.domNode, {
				opacity: 0,
				display: ""
			});

			this._set("open", true);
			this._onShow(); // lazy load trigger

			this.resize();
			this._position();

			// fade-in Animation object, setup below
			var fadeIn;

			this._fadeInDeferred = new Deferred(lang.hitch(this, function(){
				fadeIn.stop();
				delete this._fadeInDeferred;
			}));

			// If delay is 0, code below will delete this._fadeInDeferred instantly, so grab promise while we can.
			var promise = this._fadeInDeferred.promise;

			fadeIn = fx.fadeIn({
				node: this.domNode,
				duration: this.duration,
				beforeBegin: lang.hitch(this, function(){
					DialogLevelManager.show(this, this.underlayAttrs);
				}),
				onEnd: lang.hitch(this, function(){
					if(this.autofocus && DialogLevelManager.isTop(this)){
						// find focusable items each time dialog is shown since if dialog contains a widget the
						// first focusable items can change
						this._getFocusItems();
						focus.focus(this._firstFocusItem);
					}
					this._fadeInDeferred.resolve(true);
					delete this._fadeInDeferred;
				})
			}).play();

			return promise;
		},

		hide: function(){
			// summary:
			//		Hide the dialog
			// returns: dojo/promise/Promise
			//		Promise object that resolves when the display animation is complete

			// If we haven't been initialized yet then we aren't showing and we can just return.
			// Likewise if we are already hidden, or are currently fading out.
			if(!this._alreadyInitialized || !this.open){
				return resolvedDeferred.promise;
			}
			if(this._fadeInDeferred){
				this._fadeInDeferred.cancel();
			}

			// fade-in Animation object, setup below
			var fadeOut;

			this._fadeOutDeferred = new Deferred(lang.hitch(this, function(){
				fadeOut.stop();
				delete this._fadeOutDeferred;
			}));

			// fire onHide when the promise resolves.
			this._fadeOutDeferred.then(lang.hitch(this, 'onHide'));

			// If delay is 0, code below will delete this._fadeOutDeferred instantly, so grab promise while we can.
			var promise = this._fadeOutDeferred.promise;

			fadeOut = fx.fadeOut({
				node: this.domNode,
				duration: this.duration,
				onEnd: lang.hitch(this, function(){
					this.domNode.style.display = "none";
					DialogLevelManager.hide(this);
					this._fadeOutDeferred.resolve(true);
					delete this._fadeOutDeferred;
				})
			}).play();

			if(this._scrollConnected){
				this._scrollConnected = false;
			}
			var h;
			while(h = this._modalconnects.pop()){
				h.remove();
			}

			if(this._relativePosition){
				delete this._relativePosition;
			}
			this._set("open", false);

			return promise;
		},

		resize: function(dim){
			// summary:
			//		Called with no argument when viewport scrolled or viewport size changed.  Adjusts Dialog as
			//		necessary to keep it visible.
			//
			//		Can also be called with an argument (by dojox/layout/ResizeHandle etc.) to explicitly set the
			//		size of the dialog.
			// dim: Object?
			//		Optional dimension object like {w: 200, h: 300}

			if(this.domNode.style.display != "none"){

				this._checkIfSingleChild();

				if(!dim){
					if(this._shrunk){
						// If we earlier shrunk the dialog to fit in the viewport, reset it to its natural size
						if(this._singleChild){
							if(typeof this._singleChildOriginalStyle != "undefined"){
								this._singleChild.domNode.style.cssText = this._singleChildOriginalStyle;
								delete this._singleChildOriginalStyle;
							}
						}
						array.forEach([this.domNode, this.containerNode, this.titleBar], function(node){
							domStyle.set(node, {
								position: "static",
								width: "auto",
								height: "auto"
							});
						});
						this.domNode.style.position = "absolute";
					}

					// If necessary, shrink Dialog to fit in viewport and have some space around it
					// to indicate that it's a popup.  This will also compensate for possible scrollbars on viewport.
					var viewport = winUtils.getBox(this.ownerDocument);
					viewport.w *= this.maxRatio;
					viewport.h *= this.maxRatio;

					var bb = domGeometry.position(this.domNode);
					if(bb.w >= viewport.w || bb.h >= viewport.h){
						dim = {
							w: Math.min(bb.w, viewport.w),
							h: Math.min(bb.h, viewport.h)
						};
						this._shrunk = true;
					}else{
						this._shrunk = false;
					}
				}

				// Code to run if user has requested an explicit size, or the shrinking code above set an implicit size
				if(dim){
					// Set this.domNode to specified size
					domGeometry.setMarginBox(this.domNode, dim);

					// And then size this.containerNode
					var contentDim = utils.marginBox2contentBox(this.domNode, dim),
						centerSize = {domNode: this.containerNode, region: "center"};
					utils.layoutChildren(this.domNode, contentDim,
						[ {domNode: this.titleBar, region: "top"}, centerSize ]);

					// And then if this.containerNode has a single layout widget child, size it too.
					// Otherwise, make this.containerNode show a scrollbar if it's overflowing.
					if(this._singleChild){
						var cb = utils.marginBox2contentBox(this.containerNode, centerSize);
						// note: if containerNode has padding singleChildSize will have l and t set,
						// but don't pass them to resize() or it will doubly-offset the child
						this._singleChild.resize({w: cb.w, h: cb.h});
						// TODO: save original size for restoring it on another show()?
					}else{
						this.containerNode.style.overflow = "auto";
						this._layoutChildren();		// send resize() event to all child widgets
					}
				}else{
					this._layoutChildren();		// send resize() event to all child widgets
				}

				if(!has("touch") && !dim){
					// If the user has scrolled the viewport then reposition the Dialog.  But don't do it for touch
					// devices, because it will counteract when a keyboard pops up and then the browser auto-scrolls
					// the focused node into view.
					this._position();
				}
			}
		},

		_layoutChildren: function(){
			// Override _ContentPaneResizeMixin._layoutChildren because even when there's just a single layout child
			// widget, sometimes we don't want to size it explicitly (i.e. to pass a dim argument to resize())

			array.forEach(this.getChildren(), function(widget){
				if(widget.resize){
					widget.resize();
				}
			});
		},

		destroy: function(){
			if(this._fadeInDeferred){
				this._fadeInDeferred.cancel();
			}
			if(this._fadeOutDeferred){
				this._fadeOutDeferred.cancel();
			}
			if(this._moveable){
				this._moveable.destroy();
			}
			var h;
			while(h = this._modalconnects.pop()){
				h.remove();
			}

			DialogLevelManager.hide(this);

			this.inherited(arguments);
		}
	});

	if(has("dojo-bidi")){
		_DialogBase = declare("dijit._DialogBase", _DialogBase, {
			_setTitleAttr: function(/*String*/ title){
				this._set("title", title);
				this.titleNode.innerHTML = title;
				this.applyTextDir(this.titleNode);
			},

			_setTextDirAttr: function(textDir){
				if(this._created && this.textDir != textDir){
					this._set("textDir", textDir);
					this.set("title", this.title);
				}
			}
		});
	}

	var Dialog = declare("dijit.Dialog", [ContentPane, _DialogBase], {
		// summary:
		//		A modal dialog Widget.
		// description:
		//		Pops up a modal dialog window, blocking access to the screen
		//		and also graying out the screen Dialog is extended from
		//		ContentPane so it supports all the same parameters (href, etc.).
		// example:
		// |	<div data-dojo-type="dijit/Dialog" data-dojo-props="href: 'test.html'"></div>
		// example:
		// |	var foo = new Dialog({ title: "test dialog", content: "test content" });
		// |	foo.placeAt(win.body());
		// |	foo.startup();
	});
	Dialog._DialogBase = _DialogBase;	// for monkey patching and dojox/widget/DialogSimple

	var DialogLevelManager = Dialog._DialogLevelManager = {
		// summary:
		//		Controls the various active "levels" on the page, starting with the
		//		stuff initially visible on the page (at z-index 0), and then having an entry for
		//		each Dialog shown.

		_beginZIndex: 950,

		show: function(/*dijit/_WidgetBase*/ dialog, /*Object*/ underlayAttrs){
			// summary:
			//		Call right before fade-in animation for new dialog.
			//		Saves current focus, displays/adjusts underlay for new dialog,
			//		and sets the z-index of the dialog itself.
			//
			//		New dialog will be displayed on top of all currently displayed dialogs.
			//
			//		Caller is responsible for setting focus in new dialog after the fade-in
			//		animation completes.

			// Save current focus
			ds[ds.length - 1].focus = focus.curNode;

			// Set z-index a bit above previous dialog
			var zIndex = ds[ds.length - 1].dialog ? ds[ds.length - 1].zIndex + 2 : Dialog._DialogLevelManager._beginZIndex;
			domStyle.set(dialog.domNode, 'zIndex', zIndex);

			// Display the underlay, or if already displayed then adjust for this new dialog
			DialogUnderlay.show(underlayAttrs, zIndex - 1);

			ds.push({dialog: dialog, underlayAttrs: underlayAttrs, zIndex: zIndex});
		},

		hide: function(/*dijit/_WidgetBase*/ dialog){
			// summary:
			//		Called when the specified dialog is hidden/destroyed, after the fade-out
			//		animation ends, in order to reset page focus, fix the underlay, etc.
			//		If the specified dialog isn't open then does nothing.
			//
			//		Caller is responsible for either setting display:none on the dialog domNode,
			//		or calling dijit/popup.hide(), or removing it from the page DOM.

			if(ds[ds.length - 1].dialog == dialog){
				// Removing the top (or only) dialog in the stack, return focus
				// to previous dialog

				ds.pop();

				var pd = ds[ds.length - 1];	// the new active dialog (or the base page itself)

				// Adjust underlay
				if(ds.length == 1){
					// Returning to original page.  Hide the underlay.
					DialogUnderlay.hide();
				}else{
					// Popping back to previous dialog, adjust underlay.
					DialogUnderlay.show(pd.underlayAttrs, pd.zIndex - 1);
				}

				// Adjust focus.
				// TODO: regardless of setting of dialog.refocus, if the exeucte() method set focus somewhere,
				// don't shift focus back to button.  Note that execute() runs at the start of the fade-out but
				// this code runs later, at the end of the fade-out.  Menu has code like this.
				if(dialog.refocus){
					// If we are returning control to a previous dialog but for some reason
					// that dialog didn't have a focused field, set focus to first focusable item.
					// This situation could happen if two dialogs appeared at nearly the same time,
					// since a dialog doesn't set it's focus until the fade-in is finished.
					var focus = pd.focus;
					if(pd.dialog && (!focus || !dom.isDescendant(focus, pd.dialog.domNode))){
						pd.dialog._getFocusItems();
						focus = pd.dialog._firstFocusItem;
					}

					if(focus){
						// Refocus the button that spawned the Dialog.   This will fail in corner cases including
						// page unload on IE, because the dijit/form/Button that launched the Dialog may get destroyed
						// before this code runs.  (#15058)
						try{
							focus.focus();
						}catch(e){
						}
					}
				}
			}else{
				// Removing a dialog out of order (#9944, #10705).
				// Don't need to mess with underlay or z-index or anything.
				var idx = array.indexOf(array.map(ds, function(elem){
					return elem.dialog;
				}), dialog);
				if(idx != -1){
					ds.splice(idx, 1);
				}
			}
		},

		isTop: function(/*dijit/_WidgetBase*/ dialog){
			// summary:
			//		Returns true if specified Dialog is the top in the task
			return ds[ds.length - 1].dialog == dialog;
		}
	};

	// Stack representing the various active "levels" on the page, starting with the
	// stuff initially visible on the page (at z-index 0), and then having an entry for
	// each Dialog shown.
	// Each element in stack has form {
	//		dialog: dialogWidget,
	//		focus: returnFromGetFocus(),
	//		underlayAttrs: attributes to set on underlay (when this widget is active)
	// }
	var ds = Dialog._dialogStack = [
		{dialog: null, focus: null, underlayAttrs: null}    // entry for stuff at z-index: 0
	];

	// If focus was accidentally removed from the dialog, such as if the user clicked a blank
	// area of the screen, or clicked the browser's address bar and then tabbed into the page,
	// then refocus.   Won't do anything if focus was removed because the Dialog was closed, or
	// because a new Dialog popped up on top of the old one, or when focus moves to popups
	focus.watch("curNode", function(attr, oldNode, node){
 		// Note: if no dialogs, ds.length==1 but ds[ds.length-1].dialog is null
		var topDialog = ds[ds.length - 1].dialog;

		// If a node was focused, and there's a Dialog currently showing, and not in the process of fading out...
		// Ignore focus events on other document though because it's likely an Editor inside of the Dialog.
		if(node && topDialog && !topDialog._fadeOutDeferred && node.ownerDocument == topDialog.ownerDocument){
			// If the node that was focused is inside the dialog or in a popup, even a context menu that isn't
			// technically a descendant of the the dialog, don't do anything.
			do{
				if(node == topDialog.domNode || domClass.contains(node, "dijitPopup")){ return; }
			}while(node = node.parentNode);

			// Otherwise, return focus to the dialog.  Use a delay to avoid confusing dijit/focus code's
			// own tracking of focus.
			topDialog.focus();
		}
	});

	// Back compat w/1.6, remove for 2.0
	if(has("dijit-legacy-requires")){
		ready(0, function(){
			var requires = ["dijit/TooltipDialog"];
			require(requires);	// use indirection so modules not rolled into a build
		});
	}

	return Dialog;
});

},
'dojo/i18n':function(){
define(["./_base/kernel", "require", "./has", "./_base/array", "./_base/config", "./_base/lang", "./_base/xhr", "./json", "module"],
	function(dojo, require, has, array, config, lang, xhr, json, module){

	// module:
	//		dojo/i18n

	has.add("dojo-preload-i18n-Api",
		// if true, define the preload localizations machinery
		1
	);

	 1 || has.add("dojo-v1x-i18n-Api",
		// if true, define the v1.x i18n functions
		1
	);

	var
		thisModule = dojo.i18n =
			{
				// summary:
				//		This module implements the dojo/i18n! plugin and the v1.6- i18n API
				// description:
				//		We choose to include our own plugin to leverage functionality already contained in dojo
				//		and thereby reduce the size of the plugin compared to various loader implementations. Also, this
				//		allows foreign AMD loaders to be used without their plugins.
			},

		nlsRe =
			// regexp for reconstructing the master bundle name from parts of the regexp match
			// nlsRe.exec("foo/bar/baz/nls/en-ca/foo") gives:
			// ["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "/", "/", "en-ca", "foo"]
			// nlsRe.exec("foo/bar/baz/nls/foo") gives:
			// ["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "/", "/", "foo", ""]
			// so, if match[5] is blank, it means this is the top bundle definition.
			// courtesy of http://requirejs.org
			/(^.*(^|\/)nls)(\/|$)([^\/]*)\/?([^\/]*)/,

		getAvailableLocales = function(
			root,
			locale,
			bundlePath,
			bundleName
		){
			// summary:
			//		return a vector of module ids containing all available locales with respect to the target locale
			//		For example, assuming:
			//
			//		- the root bundle indicates specific bundles for "fr" and "fr-ca",
			//		-  bundlePath is "myPackage/nls"
			//		- bundleName is "myBundle"
			//
			//		Then a locale argument of "fr-ca" would return
			//
			//			["myPackage/nls/myBundle", "myPackage/nls/fr/myBundle", "myPackage/nls/fr-ca/myBundle"]
			//
			//		Notice that bundles are returned least-specific to most-specific, starting with the root.
			//
			//		If root===false indicates we're working with a pre-AMD i18n bundle that doesn't tell about the available locales;
			//		therefore, assume everything is available and get 404 errors that indicate a particular localization is not available

			for(var result = [bundlePath + bundleName], localeParts = locale.split("-"), current = "", i = 0; i<localeParts.length; i++){
				current += (current ? "-" : "") + localeParts[i];
				if(!root || root[current]){
					result.push(bundlePath + current + "/" + bundleName);
					result.specificity = current;
				}
			}
			return result;
		},

		cache = {},

		getBundleName = function(moduleName, bundleName, locale){
			locale = locale ? locale.toLowerCase() : dojo.locale;
			moduleName = moduleName.replace(/\./g, "/");
			bundleName = bundleName.replace(/\./g, "/");
			return (/root/i.test(locale)) ?
				(moduleName + "/nls/" + bundleName) :
				(moduleName + "/nls/" + locale + "/" + bundleName);
		},

		getL10nName = dojo.getL10nName = function(moduleName, bundleName, locale){
			return moduleName = module.id + "!" + getBundleName(moduleName, bundleName, locale);
		},

		doLoad = function(require, bundlePathAndName, bundlePath, bundleName, locale, load){
			// summary:
			//		get the root bundle which instructs which other bundles are required to construct the localized bundle
			require([bundlePathAndName], function(root){
				var current = lang.clone(root.root || root.ROOT),// 1.6 built bundle defined ROOT
					availableLocales = getAvailableLocales(!root._v1x && root, locale, bundlePath, bundleName);
				require(availableLocales, function(){
					for (var i = 1; i<availableLocales.length; i++){
						current = lang.mixin(lang.clone(current), arguments[i]);
					}
					// target may not have been resolve (e.g., maybe only "fr" exists when "fr-ca" was requested)
					var target = bundlePathAndName + "/" + locale;
					cache[target] = current;
					current.$locale = availableLocales.specificity;
					load();
				});
			});
		},

		normalize = function(id, toAbsMid){
			// summary:
			//		id may be relative.
			//		preload has form `*preload*<path>/nls/<module>*<flattened locales>` and
			//		therefore never looks like a relative
			return /^\./.test(id) ? toAbsMid(id) : id;
		},

		getLocalesToLoad = function(targetLocale){
			var list = config.extraLocale || [];
			list = lang.isArray(list) ? list : [list];
			list.push(targetLocale);
			return list;
		},

		load = function(id, require, load){
			// summary:
			//		id is in one of the following formats
			//
			//		1. <path>/nls/<bundle>
			//			=> load the bundle, localized to config.locale; load all bundles localized to
			//			config.extraLocale (if any); return the loaded bundle localized to config.locale.
			//
			//		2. <path>/nls/<locale>/<bundle>
			//			=> load then return the bundle localized to <locale>
			//
			//		3. *preload*<path>/nls/<module>*<JSON array of available locales>
			//			=> for config.locale and all config.extraLocale, load all bundles found
			//			in the best-matching bundle rollup. A value of 1 is returned, which
			//			is meaningless other than to say the plugin is executing the requested
			//			preloads
			//
			//		In cases 1 and 2, <path> is always normalized to an absolute module id upon entry; see
			//		normalize. In case 3, it <path> is assumed to be absolute; this is arranged by the builder.
			//
			//		To load a bundle means to insert the bundle into the plugin's cache and publish the bundle
			//		value to the loader. Given <path>, <bundle>, and a particular <locale>, the cache key
			//
			//			<path>/nls/<bundle>/<locale>
			//
			//		will hold the value. Similarly, then plugin will publish this value to the loader by
			//
			//			define("<path>/nls/<bundle>/<locale>", <bundle-value>);
			//
			//		Given this algorithm, other machinery can provide fast load paths be preplacing
			//		values in the plugin's cache, which is public. When a load is demanded the
			//		cache is inspected before starting any loading. Explicitly placing values in the plugin
			//		cache is an advanced/experimental feature that should not be needed; use at your own risk.
			//
			//		For the normal AMD algorithm, the root bundle is loaded first, which instructs the
			//		plugin what additional localized bundles are required for a particular locale. These
			//		additional locales are loaded and a mix of the root and each progressively-specific
			//		locale is returned. For example:
			//
			//		1. The client demands "dojo/i18n!some/path/nls/someBundle
			//
			//		2. The loader demands load(some/path/nls/someBundle)
			//
			//		3. This plugin require's "some/path/nls/someBundle", which is the root bundle.
			//
			//		4. Assuming config.locale is "ab-cd-ef" and the root bundle indicates that localizations
			//		are available for "ab" and "ab-cd-ef" (note the missing "ab-cd", then the plugin
			//		requires "some/path/nls/ab/someBundle" and "some/path/nls/ab-cd-ef/someBundle"
			//
			//		5. Upon receiving all required bundles, the plugin constructs the value of the bundle
			//		ab-cd-ef as...
			//
			//				mixin(mixin(mixin({}, require("some/path/nls/someBundle"),
			//		  			require("some/path/nls/ab/someBundle")),
			//					require("some/path/nls/ab-cd-ef/someBundle"));
			//
			//		This value is inserted into the cache and published to the loader at the
			//		key/module-id some/path/nls/someBundle/ab-cd-ef.
			//
			//		The special preload signature (case 3) instructs the plugin to stop servicing all normal requests
			//		(further preload requests will be serviced) until all ongoing preloading has completed.
			//
			//		The preload signature instructs the plugin that a special rollup module is available that contains
			//		one or more flattened, localized bundles. The JSON array of available locales indicates which locales
			//		are available. Here is an example:
			//
			//			*preload*some/path/nls/someModule*["root", "ab", "ab-cd-ef"]
			//
			//		This indicates the following rollup modules are available:
			//
			//			some/path/nls/someModule_ROOT
			//			some/path/nls/someModule_ab
			//			some/path/nls/someModule_ab-cd-ef
			//
			//		Each of these modules is a normal AMD module that contains one or more flattened bundles in a hash.
			//		For example, assume someModule contained the bundles some/bundle/path/someBundle and
			//		some/bundle/path/someOtherBundle, then some/path/nls/someModule_ab would be expressed as follows:
			//
			//			define({
			//				some/bundle/path/someBundle:<value of someBundle, flattened with respect to locale ab>,
			//				some/bundle/path/someOtherBundle:<value of someOtherBundle, flattened with respect to locale ab>,
			//			});
			//
			//		E.g., given this design, preloading for locale=="ab" can execute the following algorithm:
			//
			//			require(["some/path/nls/someModule_ab"], function(rollup){
			//				for(var p in rollup){
			//					var id = p + "/ab",
			//					cache[id] = rollup[p];
			//					define(id, rollup[p]);
			//				}
			//			});
			//
			//		Similarly, if "ab-cd" is requested, the algorithm can determine that "ab" is the best available and
			//		load accordingly.
			//
			//		The builder will write such rollups for every layer if a non-empty localeList  profile property is
			//		provided. Further, the builder will include the following cache entry in the cache associated with
			//		any layer.
			//
			//			"*now":function(r){r(['dojo/i18n!*preload*<path>/nls/<module>*<JSON array of available locales>']);}
			//
			//		The *now special cache module instructs the loader to apply the provided function to context-require
			//		with respect to the particular layer being defined. This causes the plugin to hold all normal service
			//		requests until all preloading is complete.
			//
			//		Notice that this algorithm is rarely better than the standard AMD load algorithm. Consider the normal case
			//		where the target locale has a single segment and a layer depends on a single bundle:
			//
			//		Without Preloads:
			//
			//		1. Layer loads root bundle.
			//		2. bundle is demanded; plugin loads single localized bundle.
			//
			//		With Preloads:
			//
			//		1. Layer causes preloading of target bundle.
			//		2. bundle is demanded; service is delayed until preloading complete; bundle is returned.
			//
			//		In each case a single transaction is required to load the target bundle. In cases where multiple bundles
			//		are required and/or the locale has multiple segments, preloads still requires a single transaction whereas
			//		the normal path requires an additional transaction for each additional bundle/locale-segment. However all
			//		of these additional transactions can be done concurrently. Owing to this analysis, the entire preloading
			//		algorithm can be discard during a build by setting the has feature dojo-preload-i18n-Api to false.

			if(has("dojo-preload-i18n-Api")){
				var split = id.split("*"),
					preloadDemand = split[1] == "preload";
				if(preloadDemand){
					if(!cache[id]){
						// use cache[id] to prevent multiple preloads of the same preload; this shouldn't happen, but
						// who knows what over-aggressive human optimizers may attempt
						cache[id] = 1;
						preloadL10n(split[2], json.parse(split[3]), 1, require);
					}
					// don't stall the loader!
					load(1);
				}
				if(preloadDemand || waitForPreloads(id, require, load)){
					return;
				}
			}

			var match = nlsRe.exec(id),
				bundlePath = match[1] + "/",
				bundleName = match[5] || match[4],
				bundlePathAndName = bundlePath + bundleName,
				localeSpecified = (match[5] && match[4]),
				targetLocale =	localeSpecified || dojo.locale || "",
				loadTarget = bundlePathAndName + "/" + targetLocale,
				loadList = localeSpecified ? [targetLocale] : getLocalesToLoad(targetLocale),
				remaining = loadList.length,
				finish = function(){
					if(!--remaining){
						load(lang.delegate(cache[loadTarget]));
					}
				};
			array.forEach(loadList, function(locale){
				var target = bundlePathAndName + "/" + locale;
				if(has("dojo-preload-i18n-Api")){
					checkForLegacyModules(target);
				}
				if(!cache[target]){
					doLoad(require, bundlePathAndName, bundlePath, bundleName, locale, finish);
				}else{
					finish();
				}
			});
		};

	if(has("dojo-unit-tests")){
		var unitTests = thisModule.unitTests = [];
	}

	if(has("dojo-preload-i18n-Api") ||  1 ){
		var normalizeLocale = thisModule.normalizeLocale = function(locale){
				var result = locale ? locale.toLowerCase() : dojo.locale;
				return result == "root" ? "ROOT" : result;
			},

			isXd = function(mid, contextRequire){
				return ( 1  &&  1 ) ?
					contextRequire.isXdUrl(require.toUrl(mid + ".js")) :
					true;
			},

			preloading = 0,

			preloadWaitQueue = [],

			preloadL10n = thisModule._preloadLocalizations = function(/*String*/bundlePrefix, /*Array*/localesGenerated, /*boolean?*/ guaranteedAmdFormat, /*function?*/ contextRequire){
				// summary:
				//		Load available flattened resource bundles associated with a particular module for dojo/locale and all dojo/config.extraLocale (if any)
				// description:
				//		Only called by built layer files. The entire locale hierarchy is loaded. For example,
				//		if locale=="ab-cd", then ROOT, "ab", and "ab-cd" are loaded. This is different than v1.6-
				//		in that the v1.6- would only load ab-cd...which was *always* flattened.
				//
				//		If guaranteedAmdFormat is true, then the module can be loaded with require thereby circumventing the detection algorithm
				//		and the extra possible extra transaction.

				// If this function is called from legacy code, then guaranteedAmdFormat and contextRequire will be undefined. Since the function
				// needs a require in order to resolve module ids, fall back to the context-require associated with this dojo/i18n module, which
				// itself may have been mapped.
				contextRequire = contextRequire || require;

				function doRequire(mid, callback){
					if(isXd(mid, contextRequire) || guaranteedAmdFormat){
						contextRequire([mid], callback);
					}else{
						syncRequire([mid], callback, contextRequire);
					}
				}

				function forEachLocale(locale, func){
					// given locale= "ab-cd-ef", calls func on "ab-cd-ef", "ab-cd", "ab", "ROOT"; stops calling the first time func returns truthy
					var parts = locale.split("-");
					while(parts.length){
						if(func(parts.join("-"))){
							return;
						}
						parts.pop();
					}
					func("ROOT");
				}

					function preloadingAddLock(){
						preloading++;
					}

					function preloadingRelLock(){
						--preloading;
						while(!preloading && preloadWaitQueue.length){
							load.apply(null, preloadWaitQueue.shift());
						}
					}

					function cacheId(path, name, loc, require){
						// path is assumed to have a trailing "/"
						return require.toAbsMid(path + name + "/" + loc)
					}

					function preload(locale){
						locale = normalizeLocale(locale);
						forEachLocale(locale, function(loc){
							if(array.indexOf(localesGenerated, loc) >= 0){
								var mid = bundlePrefix.replace(/\./g, "/") + "_" + loc;
								preloadingAddLock();
								doRequire(mid, function(rollup){
									for(var p in rollup){
										var bundle = rollup[p],
											match = p.match(/(.+)\/([^\/]+)$/),
											bundleName, bundlePath;
											
											// If there is no match, the bundle is not a regular bundle from an AMD layer.
											if (!match){continue;}

											bundleName = match[2];
											bundlePath = match[1] + "/";

										// backcompat
										bundle._localized = bundle._localized || {};

										var localized;
										if(loc === "ROOT"){
											var root = localized = bundle._localized;
											delete bundle._localized;
											root.root = bundle;
											cache[require.toAbsMid(p)] = root;
										}else{
											localized = bundle._localized;
											cache[cacheId(bundlePath, bundleName, loc, require)] = bundle;
										}

										if(loc !== locale){
											// capture some locale variables
											function improveBundle(bundlePath, bundleName, bundle, localized){
												// locale was not flattened and we've fallen back to a less-specific locale that was flattened
												// for example, we had a flattened 'fr', a 'fr-ca' is available for at least this bundle, and
												// locale==='fr-ca'; therefore, we must improve the bundle as retrieved from the rollup by
												// manually loading the fr-ca version of the bundle and mixing this into the already-retrieved 'fr'
												// version of the bundle.
												//
												// Remember, different bundles may have different sets of locales available.
												//
												// we are really falling back on the regular algorithm here, but--hopefully--starting with most
												// of the required bundles already on board as given by the rollup and we need to "manually" load
												// only one locale from a few bundles...or even better...we won't find anything better to load.
												// This algorithm ensures there is nothing better to load even when we can only load a less-specific rollup.
												//
												// note: this feature is only available in async mode

												// inspect the loaded bundle that came from the rollup to see if something better is available
												// for any bundle in a rollup, more-specific available locales are given at localized.
												var requiredBundles = [],
													cacheIds = [];
												forEachLocale(locale, function(loc){
													if(localized[loc]){
														requiredBundles.push(require.toAbsMid(bundlePath + loc + "/" + bundleName));
														cacheIds.push(cacheId(bundlePath, bundleName, loc, require));
													}
												});

												if(requiredBundles.length){
													preloadingAddLock();
													contextRequire(requiredBundles, function(){
														for(var i = 0; i < requiredBundles.length; i++){
															bundle = lang.mixin(lang.clone(bundle), arguments[i]);
															cache[cacheIds[i]] = bundle;
														}
														// this is the best possible (maybe a perfect match, maybe not), accept it
														cache[cacheId(bundlePath, bundleName, locale, require)] = lang.clone(bundle);
														preloadingRelLock();
													});
												}else{
													// this is the best possible (definitely not a perfect match), accept it
													cache[cacheId(bundlePath, bundleName, locale, require)] = bundle;
												}
											}
											improveBundle(bundlePath, bundleName, bundle, localized);
										}
									}
									preloadingRelLock();
								});
								return true;
							}
							return false;
						});
					}

				preload();
				array.forEach(dojo.config.extraLocale, preload);
			},

			waitForPreloads = function(id, require, load){
				if(preloading){
					preloadWaitQueue.push([id, require, load]);
				}
				return preloading;
			},

			checkForLegacyModules = function()
				{};
	}

	if( 1 ){
		// this code path assumes the dojo loader and won't work with a standard AMD loader
		var amdValue = {},
			evalBundle =
				// use the function ctor to keep the minifiers away (also come close to global scope, but this is secondary)
				new Function(
					"__bundle",				   // the bundle to evalutate
					"__checkForLegacyModules", // a function that checks if __bundle defined __mid in the global space
					"__mid",				   // the mid that __bundle is intended to define
					"__amdValue",

					// returns one of:
					//		1 => the bundle was an AMD bundle
					//		a legacy bundle object that is the value of __mid
					//		instance of Error => could not figure out how to evaluate bundle

					  // used to detect when __bundle calls define
					  "var define = function(mid, factory){define.called = 1; __amdValue.result = factory || mid;},"
					+ "	   require = function(){define.called = 1;};"

					+ "try{"
					+		"define.called = 0;"
					+		"eval(__bundle);"
					+		"if(define.called==1)"
								// bundle called define; therefore signal it's an AMD bundle
					+			"return __amdValue;"

					+		"if((__checkForLegacyModules = __checkForLegacyModules(__mid)))"
								// bundle was probably a v1.6- built NLS flattened NLS bundle that defined __mid in the global space
					+			"return __checkForLegacyModules;"

					+ "}catch(e){}"
					// evaulating the bundle was *neither* an AMD *nor* a legacy flattened bundle
					// either way, re-eval *after* surrounding with parentheses

					+ "try{"
					+		"return eval('('+__bundle+')');"
					+ "}catch(e){"
					+		"return e;"
					+ "}"
				),

			syncRequire = function(deps, callback, require){
				var results = [];
				array.forEach(deps, function(mid){
					var url = require.toUrl(mid + ".js");

					function load(text){
						var result = evalBundle(text, checkForLegacyModules, mid, amdValue);
						if(result===amdValue){
							// the bundle was an AMD module; re-inject it through the normal AMD path
							// we gotta do this since it could be an anonymous module and simply evaluating
							// the text here won't provide the loader with the context to know what
							// module is being defined()'d. With browser caching, this should be free; further
							// this entire code path can be circumvented by using the AMD format to begin with
							results.push(cache[url] = amdValue.result);
						}else{
							if(result instanceof Error){
								 0 && console.error("failed to evaluate i18n bundle; url=" + url, result);
								result = {};
							}
							// nls/<locale>/<bundle-name> indicates not the root.
							results.push(cache[url] = (/nls\/[^\/]+\/[^\/]+$/.test(url) ? result : {root:result, _v1x:1}));
						}
					}

					if(cache[url]){
						results.push(cache[url]);
					}else{
						var bundle = require.syncLoadNls(mid);
						// don't need to check for legacy since syncLoadNls returns a module if the module
						// (1) was already loaded, or (2) was in the cache. In case 1, if syncRequire is called
						// from getLocalization --> load, then load will have called checkForLegacyModules() before
						// calling syncRequire; if syncRequire is called from preloadLocalizations, then we
						// don't care about checkForLegacyModules() because that will be done when a particular
						// bundle is actually demanded. In case 2, checkForLegacyModules() is never relevant
						// because cached modules are always v1.7+ built modules.
						if(bundle){
							results.push(bundle);
						}else{
							if(!xhr){
								try{
									require.getText(url, true, load);
								}catch(e){
									results.push(cache[url] = {});
								}
							}else{
								xhr.get({
									url:url,
									sync:true,
									load:load,
									error:function(){
										results.push(cache[url] = {});
									}
								});
							}
						}
					}
				});
				callback && callback.apply(null, results);
			};

		checkForLegacyModules = function(target){
			// legacy code may have already loaded [e.g] the raw bundle x/y/z at x.y.z; when true, push into the cache
			for(var result, names = target.split("/"), object = dojo.global[names[0]], i = 1; object && i<names.length-1; object = object[names[i++]]){}
			if(object){
				result = object[names[i]];
				if(!result){
					// fallback for incorrect bundle build of 1.6
					result = object[names[i].replace(/-/g,"_")];
				}
				if(result){
					cache[target] = result;
				}
			}
			return result;
		};

		thisModule.getLocalization = function(moduleName, bundleName, locale){
			var result,
				l10nName = getBundleName(moduleName, bundleName, locale);
			load(
				l10nName,

				// isXd() and syncRequire() need a context-require in order to resolve the mid with respect to a reference module.
				// Since this legacy function does not have the concept of a reference module, resolve with respect to this
				// dojo/i18n module, which, itself may have been mapped.
				(!isXd(l10nName, require) ? function(deps, callback){ syncRequire(deps, callback, require); } : require),

				function(result_){ result = result_; }
			);
			return result;
		};

		if(has("dojo-unit-tests")){
			unitTests.push(function(doh){
				doh.register("tests.i18n.unit", function(t){
					var check;

					check = evalBundle("{prop:1}", checkForLegacyModules, "nonsense", amdValue);
					t.is({prop:1}, check); t.is(undefined, check[1]);

					check = evalBundle("({prop:1})", checkForLegacyModules, "nonsense", amdValue);
					t.is({prop:1}, check); t.is(undefined, check[1]);

					check = evalBundle("{'prop-x':1}", checkForLegacyModules, "nonsense", amdValue);
					t.is({'prop-x':1}, check); t.is(undefined, check[1]);

					check = evalBundle("({'prop-x':1})", checkForLegacyModules, "nonsense", amdValue);
					t.is({'prop-x':1}, check); t.is(undefined, check[1]);

					check = evalBundle("define({'prop-x':1})", checkForLegacyModules, "nonsense", amdValue);
					t.is(amdValue, check); t.is({'prop-x':1}, amdValue.result);

					check = evalBundle("define('some/module', {'prop-x':1})", checkForLegacyModules, "nonsense", amdValue);
					t.is(amdValue, check); t.is({'prop-x':1}, amdValue.result);

					check = evalBundle("this is total nonsense and should throw an error", checkForLegacyModules, "nonsense", amdValue);
					t.is(check instanceof Error, true);
				});
			});
		}
	}

	return lang.mixin(thisModule, {
		dynamic:true,
		normalize:normalize,
		load:load,
		cache:cache,
		getL10nName: getL10nName
	});
});

},
'dojo/window':function(){
define(["./_base/lang", "./sniff", "./_base/window", "./dom", "./dom-geometry", "./dom-style", "./dom-construct"],
	function(lang, has, baseWindow, dom, geom, style, domConstruct){

	// feature detection
	/* not needed but included here for future reference
	has.add("rtl-innerVerticalScrollBar-on-left", function(win, doc){
		var	body = baseWindow.body(doc),
			scrollable = domConstruct.create('div', {
				style: {overflow:'scroll', overflowX:'hidden', direction:'rtl', visibility:'hidden', position:'absolute', left:'0', width:'64px', height:'64px'}
			}, body, "last"),
			center = domConstruct.create('center', {
				style: {overflow:'hidden', direction:'ltr'}
			}, scrollable, "last"),
			inner = domConstruct.create('div', {
				style: {overflow:'visible', display:'inline' }
			}, center, "last");
		inner.innerHTML="&nbsp;";
		var midPoint = Math.max(inner.offsetLeft, geom.position(inner).x);
		var ret = midPoint >= 32;
		center.removeChild(inner);
		scrollable.removeChild(center);
		body.removeChild(scrollable);
		return ret;
	});
	*/
	has.add("rtl-adjust-position-for-verticalScrollBar", function(win, doc){
		var	body = baseWindow.body(doc),
			scrollable = domConstruct.create('div', {
				style: {overflow:'scroll', overflowX:'visible', direction:'rtl', visibility:'hidden', position:'absolute', left:'0', top:'0', width:'64px', height:'64px'}
			}, body, "last"),
			div = domConstruct.create('div', {
				style: {overflow:'hidden', direction:'ltr'}
			}, scrollable, "last"),
			ret = geom.position(div).x != 0;
		scrollable.removeChild(div);
		body.removeChild(scrollable);
		return ret;
	});

	has.add("position-fixed-support", function(win, doc){
		// IE6, IE7+quirks, and some older mobile browsers don't support position:fixed
		var	body = baseWindow.body(doc),
			outer = domConstruct.create('span', {
				style: {visibility:'hidden', position:'fixed', left:'1px', top:'1px'}
			}, body, "last"),
			inner = domConstruct.create('span', {
				style: {position:'fixed', left:'0', top:'0'}
			}, outer, "last"),
			ret = geom.position(inner).x != geom.position(outer).x;
		outer.removeChild(inner);
		body.removeChild(outer);
		return ret;
	});

	// module:
	//		dojo/window

	var window = {
		// summary:
		//		TODOC

		getBox: function(/*Document?*/ doc){
			// summary:
			//		Returns the dimensions and scroll position of the viewable area of a browser window

			doc = doc || baseWindow.doc;

			var
				scrollRoot = (doc.compatMode == 'BackCompat') ? baseWindow.body(doc) : doc.documentElement,
				// get scroll position
				scroll = geom.docScroll(doc), // scrollRoot.scrollTop/Left should work
				w, h;

			if(has("touch")){ // if(scrollbars not supported)
				var uiWindow = window.get(doc);   // use UI window, not dojo.global window
				// on mobile, scrollRoot.clientHeight <= uiWindow.innerHeight <= scrollRoot.offsetHeight, return uiWindow.innerHeight
				w = uiWindow.innerWidth || scrollRoot.clientWidth; // || scrollRoot.clientXXX probably never evaluated
				h = uiWindow.innerHeight || scrollRoot.clientHeight;
			}else{
				// on desktops, scrollRoot.clientHeight <= scrollRoot.offsetHeight <= uiWindow.innerHeight, return scrollRoot.clientHeight
				// uiWindow.innerWidth/Height includes the scrollbar and cannot be used
				w = scrollRoot.clientWidth;
				h = scrollRoot.clientHeight;
			}
			return {
				l: scroll.x,
				t: scroll.y,
				w: w,
				h: h
			};
		},

		get: function(/*Document*/ doc){
			// summary:
			//		Get window object associated with document doc.
			// doc:
			//		The document to get the associated window for.

			// In some IE versions (at least 6.0), document.parentWindow does not return a
			// reference to the real window object (maybe a copy), so we must fix it as well
			// We use IE specific execScript to attach the real window reference to
			// document._parentWindow for later use
			if(has("ie") && window !== document.parentWindow){
				/*
				In IE 6, only the variable "window" can be used to connect events (others
				may be only copies).
				*/
				doc.parentWindow.execScript("document._parentWindow = window;", "Javascript");
				//to prevent memory leak, unset it after use
				//another possibility is to add an onUnload handler which seems overkill to me (liucougar)
				var win = doc._parentWindow;
				doc._parentWindow = null;
				return win;	//	Window
			}

			return doc.parentWindow || doc.defaultView;	//	Window
		},

		scrollIntoView: function(/*DomNode*/ node, /*Object?*/ pos){
			// summary:
			//		Scroll the passed node into view using minimal movement, if it is not already.

			// Don't rely on node.scrollIntoView working just because the function is there since
			// it forces the node to the page's bottom or top (and left or right in IE) without consideration for the minimal movement.
			// WebKit's node.scrollIntoViewIfNeeded doesn't work either for inner scrollbars in right-to-left mode
			// and when there's a fixed position scrollable element

			try{ // catch unexpected/unrecreatable errors (#7808) since we can recover using a semi-acceptable native method
				node = dom.byId(node);
				var	doc = node.ownerDocument || baseWindow.doc,	// TODO: why baseWindow.doc?  Isn't node.ownerDocument always defined?
					body = baseWindow.body(doc),
					html = doc.documentElement || body.parentNode,
					isIE = has("ie"),
					isWK = has("webkit");
				// if an untested browser, then use the native method
				if(node == body || node == html){ return; }
				if(!(has("mozilla") || isIE || isWK || has("opera") || has("trident")) && ("scrollIntoView" in node)){
					node.scrollIntoView(false); // short-circuit to native if possible
					return;
				}
				var	backCompat = doc.compatMode == 'BackCompat',
					rootWidth = Math.min(body.clientWidth || html.clientWidth, html.clientWidth || body.clientWidth),
					rootHeight = Math.min(body.clientHeight || html.clientHeight, html.clientHeight || body.clientHeight),
					scrollRoot = (isWK || backCompat) ? body : html,
					nodePos = pos || geom.position(node),
					el = node.parentNode,
					isFixed = function(el){
						return (isIE <= 6 || (isIE == 7 && backCompat))
							? false
							: (has("position-fixed-support") && (style.get(el, 'position').toLowerCase() == "fixed"));
					},
					self = this,
					scrollElementBy = function(el, x, y){
						if(el.tagName == "BODY" || el.tagName == "HTML"){
							self.get(el.ownerDocument).scrollBy(x, y);
						}else{
							x && (el.scrollLeft += x);
							y && (el.scrollTop += y);
						}
					};
				if(isFixed(node)){ return; } // nothing to do
				while(el){
					if(el == body){ el = scrollRoot; }
					var	elPos = geom.position(el),
						fixedPos = isFixed(el),
						rtl = style.getComputedStyle(el).direction.toLowerCase() == "rtl";

					if(el == scrollRoot){
						elPos.w = rootWidth; elPos.h = rootHeight;
						if(scrollRoot == html && (isIE || has("trident")) && rtl){ elPos.x += scrollRoot.offsetWidth-elPos.w; } // IE workaround where scrollbar causes negative x
						if(elPos.x < 0 || !isIE || isIE >= 9 || has("trident")){ elPos.x = 0; } // older IE can have values > 0
						if(elPos.y < 0 || !isIE || isIE >= 9 || has("trident")){ elPos.y = 0; }
					}else{
						var pb = geom.getPadBorderExtents(el);
						elPos.w -= pb.w; elPos.h -= pb.h; elPos.x += pb.l; elPos.y += pb.t;
						var clientSize = el.clientWidth,
							scrollBarSize = elPos.w - clientSize;
						if(clientSize > 0 && scrollBarSize > 0){
							if(rtl && has("rtl-adjust-position-for-verticalScrollBar")){
								elPos.x += scrollBarSize;
							}
							elPos.w = clientSize;
						}
						clientSize = el.clientHeight;
						scrollBarSize = elPos.h - clientSize;
						if(clientSize > 0 && scrollBarSize > 0){
							elPos.h = clientSize;
						}
					}
					if(fixedPos){ // bounded by viewport, not parents
						if(elPos.y < 0){
							elPos.h += elPos.y; elPos.y = 0;
						}
						if(elPos.x < 0){
							elPos.w += elPos.x; elPos.x = 0;
						}
						if(elPos.y + elPos.h > rootHeight){
							elPos.h = rootHeight - elPos.y;
						}
						if(elPos.x + elPos.w > rootWidth){
							elPos.w = rootWidth - elPos.x;
						}
					}
					// calculate overflow in all 4 directions
					var	l = nodePos.x - elPos.x, // beyond left: < 0
//						t = nodePos.y - Math.max(elPos.y, 0), // beyond top: < 0
						t = nodePos.y - elPos.y, // beyond top: < 0
						r = l + nodePos.w - elPos.w, // beyond right: > 0
						bot = t + nodePos.h - elPos.h; // beyond bottom: > 0
					var s, old;
					if(r * l > 0 && (!!el.scrollLeft || el == scrollRoot || el.scrollWidth > el.offsetHeight)){
						s = Math[l < 0? "max" : "min"](l, r);
						if(rtl && ((isIE == 8 && !backCompat) || isIE >= 9 || has("trident"))){ s = -s; }
						old = el.scrollLeft;
						scrollElementBy(el, s, 0);
						s = el.scrollLeft - old;
						nodePos.x -= s;
					}
					if(bot * t > 0 && (!!el.scrollTop || el == scrollRoot || el.scrollHeight > el.offsetHeight)){
						s = Math.ceil(Math[t < 0? "max" : "min"](t, bot));
						old = el.scrollTop;
						scrollElementBy(el, 0, s);
						s = el.scrollTop - old;
						nodePos.y -= s;
					}
					el = (el != scrollRoot) && !fixedPos && el.parentNode;
				}
			}catch(error){
				 0 && console.error('scrollIntoView: ' + error);
				node.scrollIntoView(false);
			}
		}
	};

	 1  && lang.setObject("dojo.window", window);

	return window;
});

},
'dojo/dnd/Moveable':function(){
define([
	"../_base/array", "../_base/declare", "../_base/lang",
	"../dom", "../dom-class", "../Evented", "../on", "../topic", "../touch", "./common", "./Mover", "../_base/window"
], function(array, declare, lang, dom, domClass, Evented, on, topic, touch, dnd, Mover, win){

// module:
//		dojo/dnd/Moveable


var Moveable = declare("dojo.dnd.Moveable", [Evented], {
	// summary:
	//		an object, which makes a node movable

	// object attributes (for markup)
	handle: "",
	delay: 0,
	skip: false,

	constructor: function(node, params){
		// node: Node
		//		a node (or node's id) to be moved
		// params: Moveable.__MoveableArgs?
		//		optional parameters
		this.node = dom.byId(node);
		if(!params){ params = {}; }
		this.handle = params.handle ? dom.byId(params.handle) : null;
		if(!this.handle){ this.handle = this.node; }
		this.delay = params.delay > 0 ? params.delay : 0;
		this.skip  = params.skip;
		this.mover = params.mover ? params.mover : Mover;
		this.events = [
			on(this.handle, touch.press, lang.hitch(this, "onMouseDown")),
			// cancel text selection and text dragging
			on(this.handle, "dragstart",   lang.hitch(this, "onSelectStart")),
			on(this.handle, "selectstart",   lang.hitch(this, "onSelectStart"))
		];
	},

	// markup methods
	markupFactory: function(params, node, Ctor){
		return new Ctor(node, params);
	},

	// methods
	destroy: function(){
		// summary:
		//		stops watching for possible move, deletes all references, so the object can be garbage-collected
		array.forEach(this.events, function(handle){ handle.remove(); });
		this.events = this.node = this.handle = null;
	},

	// mouse event processors
	onMouseDown: function(e){
		// summary:
		//		event processor for onmousedown/ontouchstart, creates a Mover for the node
		// e: Event
		//		mouse/touch event
		if(this.skip && dnd.isFormElement(e)){ return; }
		if(this.delay){
			this.events.push(
				on(this.handle, touch.move, lang.hitch(this, "onMouseMove")),
				on(this.handle, touch.release, lang.hitch(this, "onMouseUp"))
			);
			this._lastX = e.pageX;
			this._lastY = e.pageY;
		}else{
			this.onDragDetected(e);
		}
		e.stopPropagation();
		e.preventDefault();
	},
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove/ontouchmove, used only for delayed drags
		// e: Event
		//		mouse/touch event
		if(Math.abs(e.pageX - this._lastX) > this.delay || Math.abs(e.pageY - this._lastY) > this.delay){
			this.onMouseUp(e);
			this.onDragDetected(e);
		}
		e.stopPropagation();
		e.preventDefault();
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup, used only for delayed drags
		// e: Event
		//		mouse event
		for(var i = 0; i < 2; ++i){
			this.events.pop().remove();
		}
		e.stopPropagation();
		e.preventDefault();
	},
	onSelectStart: function(e){
		// summary:
		//		event processor for onselectevent and ondragevent
		// e: Event
		//		mouse event
		if(!this.skip || !dnd.isFormElement(e)){
			e.stopPropagation();
			e.preventDefault();
		}
	},

	// local events
	onDragDetected: function(/*Event*/ e){
		// summary:
		//		called when the drag is detected;
		//		responsible for creation of the mover
		new this.mover(this.node, e, this);
	},
	onMoveStart: function(/*Mover*/ mover){
		// summary:
		//		called before every move operation
		topic.publish("/dnd/move/start", mover);
		domClass.add(win.body(), "dojoMove");
		domClass.add(this.node, "dojoMoveItem");
	},
	onMoveStop: function(/*Mover*/ mover){
		// summary:
		//		called after every move operation
		topic.publish("/dnd/move/stop", mover);
		domClass.remove(win.body(), "dojoMove");
		domClass.remove(this.node, "dojoMoveItem");
	},
	onFirstMove: function(/*===== mover, e =====*/){
		// summary:
		//		called during the very first move notification;
		//		can be used to initialize coordinates, can be overwritten.
		// mover: Mover
		// e: Event

		// default implementation does nothing
	},
	onMove: function(mover, leftTop /*=====, e =====*/){
		// summary:
		//		called during every move notification;
		//		should actually move the node; can be overwritten.
		// mover: Mover
		// leftTop: Object
		// e: Event
		this.onMoving(mover, leftTop);
		var s = mover.node.style;
		s.left = leftTop.l + "px";
		s.top  = leftTop.t + "px";
		this.onMoved(mover, leftTop);
	},
	onMoving: function(/*===== mover, leftTop =====*/){
		// summary:
		//		called before every incremental move; can be overwritten.
		// mover: Mover
		// leftTop: Object

		// default implementation does nothing
	},
	onMoved: function(/*===== mover, leftTop =====*/){
		// summary:
		//		called after every incremental move; can be overwritten.
		// mover: Mover
		// leftTop: Object

		// default implementation does nothing
	}
});

/*=====
Moveable.__MoveableArgs = declare([], {
	// handle: Node||String
	//		A node (or node's id), which is used as a mouse handle.
	//		If omitted, the node itself is used as a handle.
	handle: null,

	// delay: Number
	//		delay move by this number of pixels
	delay: 0,

	// skip: Boolean
	//		skip move of form elements
	skip: false,

	// mover: Object
	//		a constructor of custom Mover
	mover: dnd.Mover
});
=====*/

return Moveable;
});

},
'dojo/touch':function(){
define(["./_base/kernel", "./aspect", "./dom", "./dom-class", "./_base/lang", "./on", "./has", "./mouse", "./domReady", "./_base/window"],
function(dojo, aspect, dom, domClass, lang, on, has, mouse, domReady, win){

	// module:
	//		dojo/touch

	var ios4 = has("ios") < 5;

	// Detect if platform supports Pointer Events, and if so, the names of the events (pointerdown vs. MSPointerDown).
	var hasPointer = has("pointer-events") || has("MSPointer"),
		pointer = (function () {
			var pointer = {};
			for (var type in { down: 1, move: 1, up: 1, cancel: 1, over: 1, out: 1 }) {
				pointer[type] = has("MSPointer") ?
					"MSPointer" + type.charAt(0).toUpperCase() + type.slice(1) :
					"pointer" + type;
			}
			return pointer;
		})();

	// Detect if platform supports the webkit touchstart/touchend/... events
	var hasTouch = has("touch-events");

	// Click generation variables
	var clicksInited, clickTracker, useTarget = false, clickTarget, clickX, clickY, clickDx, clickDy, clickTime;

	// Time of most recent touchstart, touchmove, or touchend event
	var lastTouch;

	function dualEvent(mouseType, touchType, pointerType){
		// Returns synthetic event that listens for both the specified mouse event and specified touch event.
		// But ignore fake mouse events that were generated due to the user touching the screen.
		if(hasPointer && pointerType){
			// IE10+: MSPointer* events are designed to handle both mouse and touch in a uniform way,
			// so just use that regardless of hasTouch.
			return function(node, listener){
				return on(node, pointerType, listener);
			}
		}else if(hasTouch){
			return function(node, listener){
				var handle1 = on(node, touchType, function(evt){
						listener.call(this, evt);

						// On slow mobile browsers (see https://bugs.dojotoolkit.org/ticket/17634),
						// a handler for a touch event may take >1s to run.  That time shouldn't
						// be included in the calculation for lastTouch.
						lastTouch = (new Date()).getTime();
					}),
					handle2 = on(node, mouseType, function(evt){
						if(!lastTouch || (new Date()).getTime() > lastTouch + 1000){
							listener.call(this, evt);
						}
					});
				return {
					remove: function(){
						handle1.remove();
						handle2.remove();
					}
				};
			};
		}else{
			// Avoid creating listeners for touch events on performance sensitive older browsers like IE6
			return function(node, listener){
				return on(node, mouseType, listener);
			}
		}
	}

	function marked(/*DOMNode*/ node){
		// Search for node ancestor has been marked with the dojoClick property to indicate special processing.
		// Returns marked ancestor.
		do{
			if(node.dojoClick !== undefined){ return node; }
		}while(node = node.parentNode);
	}
	
	function doClicks(e, moveType, endType){
		// summary:
		//		Setup touch listeners to generate synthetic clicks immediately (rather than waiting for the browser
		//		to generate clicks after the double-tap delay) and consistently (regardless of whether event.preventDefault()
		//		was called in an event listener. Synthetic clicks are generated only if a node or one of its ancestors has
		//		its dojoClick property set to truthy. If a node receives synthetic clicks because one of its ancestors has its
		//      dojoClick property set to truthy, you can disable synthetic clicks on this node by setting its own dojoClick property
		//      to falsy.
		
		var markedNode = marked(e.target);
		clickTracker  = !e.target.disabled && markedNode && markedNode.dojoClick; // click threshold = true, number, x/y object, or "useTarget"
		if(clickTracker){
			useTarget = (clickTracker == "useTarget");
			clickTarget = (useTarget?markedNode:e.target);
			if(useTarget){
				// We expect a click, so prevent any other 
				// default action on "touchpress"
				e.preventDefault();
			}
			clickX = e.changedTouches ? e.changedTouches[0].pageX - win.global.pageXOffset : e.clientX;
			clickY = e.changedTouches ? e.changedTouches[0].pageY - win.global.pageYOffset : e.clientY;
			clickDx = (typeof clickTracker == "object" ? clickTracker.x : (typeof clickTracker == "number" ? clickTracker : 0)) || 4;
			clickDy = (typeof clickTracker == "object" ? clickTracker.y : (typeof clickTracker == "number" ? clickTracker : 0)) || 4;

			// add move/end handlers only the first time a node with dojoClick is seen,
			// so we don't add too much overhead when dojoClick is never set.
			if(!clicksInited){
				clicksInited = true;

				function updateClickTracker(e){
					if(useTarget){
						clickTracker = dom.isDescendant(
							win.doc.elementFromPoint(
								(e.changedTouches ? e.changedTouches[0].pageX - win.global.pageXOffset : e.clientX),
								(e.changedTouches ? e.changedTouches[0].pageY - win.global.pageYOffset : e.clientY)),
							clickTarget);
					}else{
						clickTracker = clickTracker &&
							(e.changedTouches ? e.changedTouches[0].target : e.target) == clickTarget &&
							Math.abs((e.changedTouches ? e.changedTouches[0].pageX - win.global.pageXOffset : e.clientX) - clickX) <= clickDx &&
							Math.abs((e.changedTouches ? e.changedTouches[0].pageY - win.global.pageYOffset : e.clientY) - clickY) <= clickDy;
					}
				}

				win.doc.addEventListener(moveType, function(e){
					updateClickTracker(e);
					if(useTarget){
						// prevent native scroll event and ensure touchend is
						// fire after touch moves between press and release.
						e.preventDefault();
					}
				}, true);

				win.doc.addEventListener(endType, function(e){
					updateClickTracker(e);
					if(clickTracker){
						clickTime = (new Date()).getTime();
						var target = (useTarget?clickTarget:e.target);
						if(target.tagName === "LABEL"){
							// when clicking on a label, forward click to its associated input if any
							target = dom.byId(target.getAttribute("for")) || target;
						}
						//some attributes can be on the Touch object, not on the Event:
						//http://www.w3.org/TR/touch-events/#touch-interface
						var src = (e.changedTouches) ? e.changedTouches[0] : e;
						//create the synthetic event.
						//http://www.w3.org/TR/DOM-Level-3-Events/#widl-MouseEvent-initMouseEvent
						var clickEvt = document.createEvent("MouseEvents");
						clickEvt._dojo_click = true;
						clickEvt.initMouseEvent("click",
							true, //bubbles
							true, //cancelable
							e.view,
							e.detail,
							src.screenX,
							src.screenY,
							src.clientX,
							src.clientY,
							e.ctrlKey,
							e.altKey,
							e.shiftKey,
							e.metaKey,
							0, //button
							null //related target
						);
						setTimeout(function(){
							on.emit(target, "click", clickEvt);

							// refresh clickTime in case app-defined click handler took a long time to run
							clickTime = (new Date()).getTime();
						}, 0);
					}
				}, true);

				function stopNativeEvents(type){
					win.doc.addEventListener(type, function(e){
						// Stop native events when we emitted our own click event.  Note that the native click may occur
						// on a different node than the synthetic click event was generated on.  For example,
						// click on a menu item, causing the menu to disappear, and then (~300ms later) the browser
						// sends a click event to the node that was *underneath* the menu.  So stop all native events
						// sent shortly after ours, similar to what is done in dualEvent.
						// The INPUT.dijitOffScreen test is for offscreen inputs used in dijit/form/Button, on which
						// we call click() explicitly, we don't want to stop this event.
							if(!e._dojo_click &&
								(new Date()).getTime() <= clickTime + 1000 &&
								!(e.target.tagName == "INPUT" && domClass.contains(e.target, "dijitOffScreen"))){
							e.stopPropagation();
							e.stopImmediatePropagation && e.stopImmediatePropagation();
							if(type == "click" && (e.target.tagName != "INPUT" || e.target.type == "radio" || e.target.type == "checkbox")
								&& e.target.tagName != "TEXTAREA" && e.target.tagName != "AUDIO" && e.target.tagName != "VIDEO"){
								 // preventDefault() breaks textual <input>s on android, keyboard doesn't popup,
								 // but it is still needed for checkboxes and radio buttons, otherwise in some cases
								 // the checked state becomes inconsistent with the widget's state
								e.preventDefault();
							}
						}
					}, true);
				}

				stopNativeEvents("click");

				// We also stop mousedown/up since these would be sent well after with our "fast" click (300ms),
				// which can confuse some dijit widgets.
				stopNativeEvents("mousedown");
				stopNativeEvents("mouseup");
			}
		}
	}

	var hoveredNode;

	if(hasPointer){
		 // MSPointer (IE10+) already has support for over and out, so we just need to init click support
		domReady(function(){
			win.doc.addEventListener(pointer.down, function(evt){
				doClicks(evt, pointer.move, pointer.up);
			}, true);
		});
	}else if(hasTouch){
		domReady(function(){
			// Keep track of currently hovered node
			hoveredNode = win.body();	// currently hovered node

			win.doc.addEventListener("touchstart", function(evt){
					lastTouch = (new Date()).getTime();

				// Precede touchstart event with touch.over event.  DnD depends on this.
				// Use addEventListener(cb, true) to run cb before any touchstart handlers on node run,
				// and to ensure this code runs even if the listener on the node does event.stop().
				var oldNode = hoveredNode;
				hoveredNode = evt.target;
				on.emit(oldNode, "dojotouchout", {
					relatedTarget: hoveredNode,
					bubbles: true
				});
				on.emit(hoveredNode, "dojotouchover", {
					relatedTarget: oldNode,
					bubbles: true
				});

				doClicks(evt, "touchmove", "touchend"); // init click generation
			}, true);

			function copyEventProps(evt){
				// Make copy of event object and also set bubbles:true.  Used when calling on.emit().
				var props = lang.delegate(evt, {
					bubbles: true
				});

				if(has("ios") >= 6){
					// On iOS6 "touches" became a non-enumerable property, which
					// is not hit by for...in.  Ditto for the other properties below.
					props.touches = evt.touches;
					props.altKey = evt.altKey;
					props.changedTouches = evt.changedTouches;
					props.ctrlKey = evt.ctrlKey;
					props.metaKey = evt.metaKey;
					props.shiftKey = evt.shiftKey;
					props.targetTouches = evt.targetTouches;
				}

				return props;
			}

			on(win.doc, "touchmove", function(evt){
				lastTouch = (new Date()).getTime();

				var newNode = win.doc.elementFromPoint(
					evt.pageX - (ios4 ? 0 : win.global.pageXOffset), // iOS 4 expects page coords
					evt.pageY - (ios4 ? 0 : win.global.pageYOffset)
				);

				if(newNode){
					// Fire synthetic touchover and touchout events on nodes since the browser won't do it natively.
					if(hoveredNode !== newNode){
						// touch out on the old node
						on.emit(hoveredNode, "dojotouchout", {
							relatedTarget: newNode,
							bubbles: true
						});

						// touchover on the new node
						on.emit(newNode, "dojotouchover", {
							relatedTarget: hoveredNode,
							bubbles: true
						});

						hoveredNode = newNode;
					}

					// Unlike a listener on "touchmove", on(node, "dojotouchmove", listener) fires when the finger
					// drags over the specified node, regardless of which node the touch started on.
					if(!on.emit(newNode, "dojotouchmove", copyEventProps(evt))){
						// emit returns false when synthetic event "dojotouchmove" is cancelled, so we prevent the
						// default behavior of the underlying native event "touchmove".
						evt.preventDefault();
					}
				}
			});

			// Fire a dojotouchend event on the node where the finger was before it was removed from the screen.
			// This is different than the native touchend, which fires on the node where the drag started.
			on(win.doc, "touchend", function(evt){
					lastTouch = (new Date()).getTime();
				var node = win.doc.elementFromPoint(
					evt.pageX - (ios4 ? 0 : win.global.pageXOffset), // iOS 4 expects page coords
					evt.pageY - (ios4 ? 0 : win.global.pageYOffset)
				) || win.body(); // if out of the screen

				on.emit(node, "dojotouchend", copyEventProps(evt));
			});
		});
	}

	//device neutral events - touch.press|move|release|cancel/over/out
	var touch = {
		press: dualEvent("mousedown", "touchstart", pointer.down),
		move: dualEvent("mousemove", "dojotouchmove", pointer.move),
		release: dualEvent("mouseup", "dojotouchend", pointer.up),
		cancel: dualEvent(mouse.leave, "touchcancel", hasPointer ? pointer.cancel : null),
		over: dualEvent("mouseover", "dojotouchover", pointer.over),
		out: dualEvent("mouseout", "dojotouchout", pointer.out),
		enter: mouse._eventHandler(dualEvent("mouseover","dojotouchover", pointer.over)),
		leave: mouse._eventHandler(dualEvent("mouseout", "dojotouchout", pointer.out))
	};

	/*=====
	touch = {
		// summary:
		//		This module provides unified touch event handlers by exporting
		//		press, move, release and cancel which can also run well on desktop.
		//		Based on http://dvcs.w3.org/hg/webevents/raw-file/tip/touchevents.html
		//      Also, if the dojoClick property is set to truthy on a DOM node, dojo/touch generates
		//      click events immediately for this node and its descendants (except for descendants that
		//      have a dojoClick property set to falsy), to avoid the delay before native browser click events,
		//      and regardless of whether evt.preventDefault() was called in a touch.press event listener.
		//
		// example:
		//		Used with dojo/on
		//		|	define(["dojo/on", "dojo/touch"], function(on, touch){
		//		|		on(node, touch.press, function(e){});
		//		|		on(node, touch.move, function(e){});
		//		|		on(node, touch.release, function(e){});
		//		|		on(node, touch.cancel, function(e){});
		// example:
		//		Used with touch.* directly
		//		|	touch.press(node, function(e){});
		//		|	touch.move(node, function(e){});
		//		|	touch.release(node, function(e){});
		//		|	touch.cancel(node, function(e){});
		// example:
		//		Have dojo/touch generate clicks without delay, with a default move threshold of 4 pixels
		//		|	node.dojoClick = true;
		// example:
		//		Have dojo/touch generate clicks without delay, with a move threshold of 10 pixels horizontally and vertically
		//		|	node.dojoClick = 10;
		// example:
		//		Have dojo/touch generate clicks without delay, with a move threshold of 50 pixels horizontally and 10 pixels vertically
		//		|	node.dojoClick = {x:50, y:5};
		// example:
		//		Disable clicks without delay generated by dojo/touch on a node that has an ancestor with property dojoClick set to truthy
		//		|  node.dojoClick = false;

		press: function(node, listener){
			// summary:
			//		Register a listener to 'touchstart'|'mousedown' for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		move: function(node, listener){
			// summary:
			//		Register a listener that fires when the mouse cursor or a finger is dragged over the given node.
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		release: function(node, listener){
			// summary:
			//		Register a listener to releasing the mouse button while the cursor is over the given node
			//		(i.e. "mouseup") or for removing the finger from the screen while touching the given node.
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		cancel: function(node, listener){
			// summary:
			//		Register a listener to 'touchcancel'|'mouseleave' for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		over: function(node, listener){
			// summary:
			//		Register a listener to 'mouseover' or touch equivalent for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		out: function(node, listener){
			// summary:
			//		Register a listener to 'mouseout' or touch equivalent for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		enter: function(node, listener){
			// summary:
			//		Register a listener to mouse.enter or touch equivalent for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		leave: function(node, listener){
			// summary:
			//		Register a listener to mouse.leave or touch equivalent for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		}
	};
	=====*/

	 1  && (dojo.touch = touch);

	return touch;
});

},
'dojo/dnd/common':function(){
define(["../sniff", "../_base/kernel", "../_base/lang", "../dom"],
	function(has, kernel, lang, dom){

// module:
//		dojo/dnd/common

var exports = lang.getObject("dojo.dnd", true);
/*=====
// TODO: for 2.0, replace line above with this code.
var exports = {
	// summary:
	//		TODOC
};
=====*/

exports.getCopyKeyState = function(evt){
	return evt[has("mac") ? "metaKey" : "ctrlKey"]
};

exports._uniqueId = 0;
exports.getUniqueId = function(){
	// summary:
	//		returns a unique string for use with any DOM element
	var id;
	do{
		id = kernel._scopeName + "Unique" + (++exports._uniqueId);
	}while(dom.byId(id));
	return id;
};

exports._empty = {};

exports.isFormElement = function(/*Event*/ e){
	// summary:
	//		returns true if user clicked on a form element
	var t = e.target;
	if(t.nodeType == 3 /*TEXT_NODE*/){
		t = t.parentNode;
	}
	return " a button textarea input select option ".indexOf(" " + t.tagName.toLowerCase() + " ") >= 0;	// Boolean
};

return exports;
});

},
'dojo/dnd/Mover':function(){
define([
	"../_base/array", "../_base/declare", "../_base/lang", "../sniff", "../_base/window",
	"../dom", "../dom-geometry", "../dom-style", "../Evented", "../on", "../touch", "./common", "./autoscroll"
], function(array, declare, lang, has, win, dom, domGeom, domStyle, Evented, on, touch, dnd, autoscroll){

// module:
//		dojo/dnd/Mover

return declare("dojo.dnd.Mover", [Evented], {
	// summary:
	//		an object which makes a node follow the mouse, or touch-drag on touch devices.
	//		Used as a default mover, and as a base class for custom movers.

	constructor: function(node, e, host){
		// node: Node
		//		a node (or node's id) to be moved
		// e: Event
		//		a mouse event, which started the move;
		//		only pageX and pageY properties are used
		// host: Object?
		//		object which implements the functionality of the move,
		//	 	and defines proper events (onMoveStart and onMoveStop)
		this.node = dom.byId(node);
		this.marginBox = {l: e.pageX, t: e.pageY};
		this.mouseButton = e.button;
		var h = (this.host = host), d = node.ownerDocument;

		function stopEvent(e){
			e.preventDefault();
			e.stopPropagation();
		}

		this.events = [
			// At the start of a drag, onFirstMove is called, and then the following
			// listener is disconnected.
			on(d, touch.move, lang.hitch(this, "onFirstMove")),

			// These are called continually during the drag
			on(d, touch.move, lang.hitch(this, "onMouseMove")),

			// And these are called at the end of the drag
			on(d, touch.release,  lang.hitch(this, "onMouseUp")),

			// cancel text selection and text dragging
			on(d, "dragstart",   stopEvent),
			on(d.body, "selectstart", stopEvent)
		];

		// Tell autoscroll that a drag is starting
		autoscroll.autoScrollStart(d);

		// notify that the move has started
		if(h && h.onMoveStart){
			h.onMoveStart(this);
		}
	},
	// mouse event processors
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove/ontouchmove
		// e: Event
		//		mouse/touch event
		autoscroll.autoScroll(e);
		var m = this.marginBox;
		this.host.onMove(this, {l: m.l + e.pageX, t: m.t + e.pageY}, e);
		e.preventDefault();
		e.stopPropagation();
	},
	onMouseUp: function(e){
		if(has("webkit") && has("mac") && this.mouseButton == 2 ?
				e.button == 0 : this.mouseButton == e.button){ // TODO Should condition be met for touch devices, too?
			this.destroy();
		}
		e.preventDefault();
		e.stopPropagation();
	},
	// utilities
	onFirstMove: function(e){
		// summary:
		//		makes the node absolute; it is meant to be called only once.
		//		relative and absolutely positioned nodes are assumed to use pixel units
		var s = this.node.style, l, t, h = this.host;
		switch(s.position){
			case "relative":
			case "absolute":
				// assume that left and top values are in pixels already
				l = Math.round(parseFloat(s.left)) || 0;
				t = Math.round(parseFloat(s.top)) || 0;
				break;
			default:
				s.position = "absolute";	// enforcing the absolute mode
				var m = domGeom.getMarginBox(this.node);
				// event.pageX/pageY (which we used to generate the initial
				// margin box) includes padding and margin set on the body.
				// However, setting the node's position to absolute and then
				// doing domGeom.marginBox on it *doesn't* take that additional
				// space into account - so we need to subtract the combined
				// padding and margin.  We use getComputedStyle and
				// _getMarginBox/_getContentBox to avoid the extra lookup of
				// the computed style.
				var b = win.doc.body;
				var bs = domStyle.getComputedStyle(b);
				var bm = domGeom.getMarginBox(b, bs);
				var bc = domGeom.getContentBox(b, bs);
				l = m.l - (bc.l - bm.l);
				t = m.t - (bc.t - bm.t);
				break;
		}
		this.marginBox.l = l - this.marginBox.l;
		this.marginBox.t = t - this.marginBox.t;
		if(h && h.onFirstMove){
			h.onFirstMove(this, e);
		}

		// Disconnect touch.move that call this function
		this.events.shift().remove();
	},
	destroy: function(){
		// summary:
		//		stops the move, deletes all references, so the object can be garbage-collected
		array.forEach(this.events, function(handle){ handle.remove(); });
		// undo global settings
		var h = this.host;
		if(h && h.onMoveStop){
			h.onMoveStop(this);
		}
		// destroy objects
		this.events = this.node = this.host = null;
	}
});

});

},
'dojo/dnd/autoscroll':function(){
define(["../_base/lang", "../sniff", "../_base/window", "../dom-geometry", "../dom-style", "../window"],
	function(lang, has, win, domGeom, domStyle, winUtils){

// module:
//		dojo/dnd/autoscroll

var exports = {
	// summary:
	//		Used by dojo/dnd/Manager to scroll document or internal node when the user
	//		drags near the edge of the viewport or a scrollable node
};
lang.setObject("dojo.dnd.autoscroll", exports);

exports.getViewport = winUtils.getBox;

exports.V_TRIGGER_AUTOSCROLL = 32;
exports.H_TRIGGER_AUTOSCROLL = 32;

exports.V_AUTOSCROLL_VALUE = 16;
exports.H_AUTOSCROLL_VALUE = 16;

// These are set by autoScrollStart().
// Set to default values in case autoScrollStart() isn't called. (back-compat, remove for 2.0)
var viewport,
	doc = win.doc,
	maxScrollTop = Infinity,
	maxScrollLeft = Infinity;

exports.autoScrollStart = function(d){
	// summary:
	//		Called at the start of a drag.
	// d: Document
	//		The document of the node being dragged.

	doc = d;
	viewport = winUtils.getBox(doc);

	// Save height/width of document at start of drag, before it gets distorted by a user dragging an avatar past
	// the document's edge
	var html = win.body(doc).parentNode;
	maxScrollTop = Math.max(html.scrollHeight - viewport.h, 0);
	maxScrollLeft = Math.max(html.scrollWidth - viewport.w, 0);	// usually 0
};

exports.autoScroll = function(e){
	// summary:
	//		a handler for mousemove and touchmove events, which scrolls the window, if
	//		necessary
	// e: Event
	//		mousemove/touchmove event

	// FIXME: needs more docs!
	var v = viewport || winUtils.getBox(doc), // getBox() call for back-compat, in case autoScrollStart() wasn't called
		html = win.body(doc).parentNode,
		dx = 0, dy = 0;
	if(e.clientX < exports.H_TRIGGER_AUTOSCROLL){
		dx = -exports.H_AUTOSCROLL_VALUE;
	}else if(e.clientX > v.w - exports.H_TRIGGER_AUTOSCROLL){
		dx = Math.min(exports.H_AUTOSCROLL_VALUE, maxScrollLeft - html.scrollLeft);	// don't scroll past edge of doc
	}
	if(e.clientY < exports.V_TRIGGER_AUTOSCROLL){
		dy = -exports.V_AUTOSCROLL_VALUE;
	}else if(e.clientY > v.h - exports.V_TRIGGER_AUTOSCROLL){
		dy = Math.min(exports.V_AUTOSCROLL_VALUE, maxScrollTop - html.scrollTop);	// don't scroll past edge of doc
	}
	window.scrollBy(dx, dy);
};

exports._validNodes = {"div": 1, "p": 1, "td": 1};
exports._validOverflow = {"auto": 1, "scroll": 1};

exports.autoScrollNodes = function(e){
	// summary:
	//		a handler for mousemove and touchmove events, which scrolls the first available
	//		Dom element, it falls back to exports.autoScroll()
	// e: Event
	//		mousemove/touchmove event

	// FIXME: needs more docs!

	var b, t, w, h, rx, ry, dx = 0, dy = 0, oldLeft, oldTop;

	for(var n = e.target; n;){
		if(n.nodeType == 1 && (n.tagName.toLowerCase() in exports._validNodes)){
			var s = domStyle.getComputedStyle(n),
				overflow = (s.overflow.toLowerCase() in exports._validOverflow),
				overflowX = (s.overflowX.toLowerCase() in exports._validOverflow),
				overflowY = (s.overflowY.toLowerCase() in exports._validOverflow);
			if(overflow || overflowX || overflowY){
				b = domGeom.getContentBox(n, s);
				t = domGeom.position(n, true);
			}
			// overflow-x
			if(overflow || overflowX){
				w = Math.min(exports.H_TRIGGER_AUTOSCROLL, b.w / 2);
				rx = e.pageX - t.x;
				if(has("webkit") || has("opera")){
					// FIXME: this code should not be here, it should be taken into account
					// either by the event fixing code, or the domGeom.position()
					// FIXME: this code doesn't work on Opera 9.5 Beta
					rx += win.body().scrollLeft;
				}
				dx = 0;
				if(rx > 0 && rx < b.w){
					if(rx < w){
						dx = -w;
					}else if(rx > b.w - w){
						dx = w;
					}
					oldLeft = n.scrollLeft;
					n.scrollLeft = n.scrollLeft + dx;
				}
			}
			// overflow-y
			if(overflow || overflowY){
				// 0 && console.log(b.l, b.t, t.x, t.y, n.scrollLeft, n.scrollTop);
				h = Math.min(exports.V_TRIGGER_AUTOSCROLL, b.h / 2);
				ry = e.pageY - t.y;
				if(has("webkit") || has("opera")){
					// FIXME: this code should not be here, it should be taken into account
					// either by the event fixing code, or the domGeom.position()
					// FIXME: this code doesn't work on Opera 9.5 Beta
					ry += win.body().scrollTop;
				}
				dy = 0;
				if(ry > 0 && ry < b.h){
					if(ry < h){
						dy = -h;
					}else if(ry > b.h - h){
						dy = h;
					}
					oldTop = n.scrollTop;
					n.scrollTop  = n.scrollTop  + dy;
				}
			}
			if(dx || dy){ return; }
		}
		try{
			n = n.parentNode;
		}catch(x){
			n = null;
		}
	}
	exports.autoScroll(e);
};

return exports;

});

},
'dojo/dnd/TimedMoveable':function(){
define(["../_base/declare", "./Moveable" /*=====, "./Mover" =====*/], function(declare, Moveable /*=====, Mover =====*/){
	// module:
	//		dojo/dnd/TimedMoveable

	/*=====
	var __TimedMoveableArgs = declare([Moveable.__MoveableArgs], {
		// timeout: Number
		//		delay move by this number of ms,
		//		accumulating position changes during the timeout
		timeout: 0
	});
	=====*/

	// precalculate long expressions
	var oldOnMove = Moveable.prototype.onMove;

	return declare("dojo.dnd.TimedMoveable", Moveable, {
		// summary:
		//		A specialized version of Moveable to support an FPS throttling.
		//		This class puts an upper restriction on FPS, which may reduce
		//		the CPU load. The additional parameter "timeout" regulates
		//		the delay before actually moving the moveable object.

		// object attributes (for markup)
		timeout: 40,	// in ms, 40ms corresponds to 25 fps

		constructor: function(node, params){
			// summary:
			//		an object that makes a node moveable with a timer
			// node: Node||String
			//		a node (or node's id) to be moved
			// params: __TimedMoveableArgs
			//		object with additional parameters.

			// sanitize parameters
			if(!params){ params = {}; }
			if(params.timeout && typeof params.timeout == "number" && params.timeout >= 0){
				this.timeout = params.timeout;
			}
		},

		onMoveStop: function(/*Mover*/ mover){
			if(mover._timer){
				// stop timer
				clearTimeout(mover._timer);
				// reflect the last received position
				oldOnMove.call(this, mover, mover._leftTop);
			}
			Moveable.prototype.onMoveStop.apply(this, arguments);
		},
		onMove: function(/*Mover*/ mover, /*Object*/ leftTop){
			mover._leftTop = leftTop;
			if(!mover._timer){
				var _t = this;	// to avoid using dojo.hitch()
				mover._timer = setTimeout(function(){
					// we don't have any pending requests
					mover._timer = null;
					// reflect the last received position
					oldOnMove.call(_t, mover, mover._leftTop);
				}, this.timeout);
			}
		}
	});
});

},
'dijit/focus':function(){
define([
	"dojo/aspect",
	"dojo/_base/declare", // declare
	"dojo/dom", // domAttr.get dom.isDescendant
	"dojo/dom-attr", // domAttr.get dom.isDescendant
	"dojo/dom-class",
	"dojo/dom-construct", // connect to domConstruct.empty, domConstruct.destroy
	"dojo/Evented",
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"dojo/domReady",
	"dojo/sniff", // has("ie")
	"dojo/Stateful",
	"dojo/_base/window", // win.body
	"dojo/window", // winUtils.get
	"./a11y",	// a11y.isTabNavigable
	"./registry",	// registry.byId
	"./main"		// to set dijit.focus
], function(aspect, declare, dom, domAttr, domClass, domConstruct, Evented, lang, on, domReady, has, Stateful, win, winUtils,
			a11y, registry, dijit){

	// module:
	//		dijit/focus

	// Time of the last focusin event
	var lastFocusin;

	// Time of the last touch/mousedown or focusin event
	var lastTouchOrFocusin;

	var FocusManager = declare([Stateful, Evented], {
		// summary:
		//		Tracks the currently focused node, and which widgets are currently "active".
		//		Access via require(["dijit/focus"], function(focus){ ... }).
		//
		//		A widget is considered active if it or a descendant widget has focus,
		//		or if a non-focusable node of this widget or a descendant was recently clicked.
		//
		//		Call focus.watch("curNode", callback) to track the current focused DOMNode,
		//		or focus.watch("activeStack", callback) to track the currently focused stack of widgets.
		//
		//		Call focus.on("widget-blur", func) or focus.on("widget-focus", ...) to monitor when
		//		when widgets become active/inactive
		//
		//		Finally, focus(node) will focus a node, suppressing errors if the node doesn't exist.

		// curNode: DomNode
		//		Currently focused item on screen
		curNode: null,

		// activeStack: dijit/_WidgetBase[]
		//		List of currently active widgets (focused widget and it's ancestors)
		activeStack: [],

		constructor: function(){
			// Don't leave curNode/prevNode pointing to bogus elements
			var check = lang.hitch(this, function(node){
				if(dom.isDescendant(this.curNode, node)){
					this.set("curNode", null);
				}
				if(dom.isDescendant(this.prevNode, node)){
					this.set("prevNode", null);
				}
			});
			aspect.before(domConstruct, "empty", check);
			aspect.before(domConstruct, "destroy", check);
		},

		registerIframe: function(/*DomNode*/ iframe){
			// summary:
			//		Registers listeners on the specified iframe so that any click
			//		or focus event on that iframe (or anything in it) is reported
			//		as a focus/click event on the `<iframe>` itself.
			// description:
			//		Currently only used by editor.
			// returns:
			//		Handle with remove() method to deregister.
			return this.registerWin(iframe.contentWindow, iframe);
		},

		registerWin: function(/*Window?*/targetWindow, /*DomNode?*/ effectiveNode){
			// summary:
			//		Registers listeners on the specified window (either the main
			//		window or an iframe's window) to detect when the user has clicked somewhere
			//		or focused somewhere.
			// description:
			//		Users should call registerIframe() instead of this method.
			// targetWindow:
			//		If specified this is the window associated with the iframe,
			//		i.e. iframe.contentWindow.
			// effectiveNode:
			//		If specified, report any focus events inside targetWindow as
			//		an event on effectiveNode, rather than on evt.target.
			// returns:
			//		Handle with remove() method to deregister.

			// TODO: make this function private in 2.0; Editor/users should call registerIframe(),

			// Listen for blur and focus events on targetWindow's document.
			var _this = this,
				body = targetWindow.document && targetWindow.document.body;

			if(body){
				// Listen for touches or mousedowns... could also use dojo/touch.press here.
				var event = has("pointer-events") ? "pointerdown" : has("MSPointer") ? "MSPointerDown" :
					has("touch-events") ? "mousedown, touchstart" : "mousedown";
				var mdh = on(targetWindow.document, event, function(evt){
					// workaround weird IE bug where the click is on an orphaned node
					// (first time clicking a Select/DropDownButton inside a TooltipDialog).
					// actually, strangely this is happening on latest chrome too.
					if(evt && evt.target && evt.target.parentNode == null){
						return;
					}

					_this._onTouchNode(effectiveNode || evt.target, "mouse");
				});

				var fih = on(body, 'focusin', function(evt){
					// When you refocus the browser window, IE gives an event with an empty srcElement
					if(!evt.target.tagName) { return; }

					// IE reports that nodes like <body> have gotten focus, even though they have tabIndex=-1,
					// ignore those events
					var tag = evt.target.tagName.toLowerCase();
					if(tag == "#document" || tag == "body"){ return; }

					if(a11y.isFocusable(evt.target)){
						_this._onFocusNode(effectiveNode || evt.target);
					}else{
						// Previous code called _onTouchNode() for any activate event on a non-focusable node.   Can
						// probably just ignore such an event as it will be handled by onmousedown handler above, but
						// leaving the code for now.
						_this._onTouchNode(effectiveNode || evt.target);
					}
				});

				var foh = on(body, 'focusout', function(evt){
					_this._onBlurNode(effectiveNode || evt.target);
				});

				return {
					remove: function(){
						mdh.remove();
						fih.remove();
						foh.remove();
						mdh = fih = foh = null;
						body = null;	// prevent memory leak (apparent circular reference via closure)
					}
				};
			}
		},

		_onBlurNode: function(/*DomNode*/ node){
			// summary:
			//		Called when focus leaves a node.
			//		Usually ignored, _unless_ it *isn't* followed by touching another node,
			//		which indicates that we tabbed off the last field on the page,
			//		in which case every widget is marked inactive

			var now = (new Date()).getTime();

			// IE9+ and chrome have a problem where focusout events come after the corresponding focusin event.
			// For chrome problem see https://bugs.dojotoolkit.org/ticket/17668.
			// IE problem happens when moving focus from the Editor's <iframe> to a normal DOMNode.
			if(now < lastFocusin + 100){
				return;
			}

			// If the blur event isn't followed by a focus event, it means the user clicked on something unfocusable,
			// so clear focus.
			if(this._clearFocusTimer){
				clearTimeout(this._clearFocusTimer);
			}
			this._clearFocusTimer = setTimeout(lang.hitch(this, function(){
				this.set("prevNode", this.curNode);
				this.set("curNode", null);
			}), 0);

			// Unset timer to zero-out widget stack; we'll reset it below if appropriate.
			if(this._clearActiveWidgetsTimer){
				clearTimeout(this._clearActiveWidgetsTimer);
			}

			if(now < lastTouchOrFocusin + 100){
				// This blur event is coming late (after the call to _onTouchNode() rather than before.
				// So let _onTouchNode() handle setting the widget stack.
				// See https://bugs.dojotoolkit.org/ticket/17668
				return;
			}

			// If the blur event isn't followed (or preceded) by a focus or touch event then mark all widgets as inactive.
			this._clearActiveWidgetsTimer = setTimeout(lang.hitch(this, function(){
				delete this._clearActiveWidgetsTimer;
				this._setStack([]);
			}), 0);
		},

		_onTouchNode: function(/*DomNode*/ node, /*String*/ by){
			// summary:
			//		Callback when node is focused or touched.
			//		Note that _onFocusNode() calls _onTouchNode().
			// node:
			//		The node that was touched.
			// by:
			//		"mouse" if the focus/touch was caused by a mouse down event

			// Keep track of time of last focusin or touch event.
			lastTouchOrFocusin = (new Date()).getTime();

			if(this._clearActiveWidgetsTimer){
				// forget the recent blur event
				clearTimeout(this._clearActiveWidgetsTimer);
				delete this._clearActiveWidgetsTimer;
			}

			// if the click occurred on the scrollbar of a dropdown, treat it as a click on the dropdown,
			// even though the scrollbar is technically on the popup wrapper (see #10631)
			if(domClass.contains(node, "dijitPopup")){
				node = node.firstChild;
			}

			// compute stack of active widgets (ex: ComboButton --> Menu --> MenuItem)
			var newStack=[];
			try{
				while(node){
					var popupParent = domAttr.get(node, "dijitPopupParent");
					if(popupParent){
						node=registry.byId(popupParent).domNode;
					}else if(node.tagName && node.tagName.toLowerCase() == "body"){
						// is this the root of the document or just the root of an iframe?
						if(node === win.body()){
							// node is the root of the main document
							break;
						}
						// otherwise, find the iframe this node refers to (can't access it via parentNode,
						// need to do this trick instead). window.frameElement is supported in IE/FF/Webkit
						node=winUtils.get(node.ownerDocument).frameElement;
					}else{
						// if this node is the root node of a widget, then add widget id to stack,
						// except ignore clicks on disabled widgets (actually focusing a disabled widget still works,
						// to support MenuItem)
						var id = node.getAttribute && node.getAttribute("widgetId"),
							widget = id && registry.byId(id);
						if(widget && !(by == "mouse" && widget.get("disabled"))){
							newStack.unshift(id);
						}
						node=node.parentNode;
					}
				}
			}catch(e){ /* squelch */ }

			this._setStack(newStack, by);
		},

		_onFocusNode: function(/*DomNode*/ node){
			// summary:
			//		Callback when node is focused

			if(!node){
				return;
			}

			if(node.nodeType == 9){
				// Ignore focus events on the document itself.  This is here so that
				// (for example) clicking the up/down arrows of a spinner
				// (which don't get focus) won't cause that widget to blur. (FF issue)
				return;
			}

			// Keep track of time of last focusin event.
			lastFocusin = (new Date()).getTime();

			// There was probably a blur event right before this event, but since we have a new focus,
			// forget about the blur
			if(this._clearFocusTimer){
				clearTimeout(this._clearFocusTimer);
				delete this._clearFocusTimer;
			}

			this._onTouchNode(node);

			if(node == this.curNode){ return; }
			this.set("prevNode", this.curNode);
			this.set("curNode", node);
		},

		_setStack: function(/*String[]*/ newStack, /*String*/ by){
			// summary:
			//		The stack of active widgets has changed.  Send out appropriate events and records new stack.
			// newStack:
			//		array of widget id's, starting from the top (outermost) widget
			// by:
			//		"mouse" if the focus/touch was caused by a mouse down event

			var oldStack = this.activeStack, lastOldIdx = oldStack.length - 1, lastNewIdx = newStack.length - 1;

			if(newStack[lastNewIdx] == oldStack[lastOldIdx]){
				// no changes, return now to avoid spurious notifications about changes to activeStack
				return;
			}

			this.set("activeStack", newStack);

			var widget, i;

			// for all elements that have gone out of focus, set focused=false
			for(i = lastOldIdx; i >= 0 && oldStack[i] != newStack[i]; i--){
				widget = registry.byId(oldStack[i]);
				if(widget){
					widget._hasBeenBlurred = true;		// TODO: used by form widgets, should be moved there
					widget.set("focused", false);
					if(widget._focusManager == this){
						widget._onBlur(by);
					}
					this.emit("widget-blur", widget, by);
				}
			}

			// for all element that have come into focus, set focused=true
			for(i++; i <= lastNewIdx; i++){
				widget = registry.byId(newStack[i]);
				if(widget){
					widget.set("focused", true);
					if(widget._focusManager == this){
						widget._onFocus(by);
					}
					this.emit("widget-focus", widget, by);
				}
			}
		},

		focus: function(node){
			// summary:
			//		Focus the specified node, suppressing errors if they occur
			if(node){
				try{ node.focus(); }catch(e){/*quiet*/}
			}
		}
	});

	var singleton = new FocusManager();

	// register top window and all the iframes it contains
	domReady(function(){
		var handle = singleton.registerWin(winUtils.get(document));
		if(has("ie")){
			on(window, "unload", function(){
				if(handle){	// because this gets called twice when doh.robot is running
					handle.remove();
					handle = null;
				}
			});
		}
	});

	// Setup dijit.focus as a pointer to the singleton but also (for backwards compatibility)
	// as a function to set focus.   Remove for 2.0.
	dijit.focus = function(node){
		singleton.focus(node);	// indirection here allows dijit/_base/focus.js to override behavior
	};
	for(var attr in singleton){
		if(!/^_/.test(attr)){
			dijit.focus[attr] = typeof singleton[attr] == "function" ? lang.hitch(singleton, attr) : singleton[attr];
		}
	}
	singleton.watch(function(attr, oldVal, newVal){
		dijit.focus[attr] = newVal;
	});

	return singleton;
});

},
'dijit/a11y':function(){
define([
	"dojo/_base/array", // array.forEach array.map
	"dojo/dom",			// dom.byId
	"dojo/dom-attr", // domAttr.attr domAttr.has
	"dojo/dom-style", // domStyle.style
	"dojo/_base/lang", // lang.mixin()
	"dojo/sniff", // has("ie")  1 
	"./main"	// for exporting methods to dijit namespace
], function(array, dom, domAttr, domStyle, lang, has, dijit){

	// module:
	//		dijit/a11y

	var undefined;

	var a11y = {
		// summary:
		//		Accessibility utility functions (keyboard, tab stops, etc.)

		_isElementShown: function(/*Element*/ elem){
			var s = domStyle.get(elem);
			return (s.visibility != "hidden")
				&& (s.visibility != "collapsed")
				&& (s.display != "none")
				&& (domAttr.get(elem, "type") != "hidden");
		},

		hasDefaultTabStop: function(/*Element*/ elem){
			// summary:
			//		Tests if element is tab-navigable even without an explicit tabIndex setting

			// No explicit tabIndex setting, need to investigate node type
			switch(elem.nodeName.toLowerCase()){
				case "a":
					// An <a> w/out a tabindex is only navigable if it has an href
					return domAttr.has(elem, "href");
				case "area":
				case "button":
				case "input":
				case "object":
				case "select":
				case "textarea":
					// These are navigable by default
					return true;
				case "iframe":
					// If it's an editor <iframe> then it's tab navigable.
					var body;
					try{
						// non-IE
						var contentDocument = elem.contentDocument;
						if("designMode" in contentDocument && contentDocument.designMode == "on"){
							return true;
						}
						body = contentDocument.body;
					}catch(e1){
						// contentWindow.document isn't accessible within IE7/8
						// if the iframe.src points to a foreign url and this
						// page contains an element, that could get focus
						try{
							body = elem.contentWindow.document.body;
						}catch(e2){
							return false;
						}
					}
					return body && (body.contentEditable == 'true' ||
						(body.firstChild && body.firstChild.contentEditable == 'true'));
				default:
					return elem.contentEditable == 'true';
			}
		},

		effectiveTabIndex: function(/*Element*/ elem){
			// summary:
			//		Returns effective tabIndex of an element, either a number, or undefined if element isn't focusable.

			if(domAttr.get(elem, "disabled")){
				return undefined;
			}else if(domAttr.has(elem, "tabIndex")){
				// Explicit tab index setting
				return +domAttr.get(elem, "tabIndex");// + to convert string --> number
			}else{
				// No explicit tabIndex setting, so depends on node type
				return a11y.hasDefaultTabStop(elem) ? 0 : undefined;
			}
		},

		isTabNavigable: function(/*Element*/ elem){
			// summary:
			//		Tests if an element is tab-navigable

			return a11y.effectiveTabIndex(elem) >= 0;
		},

		isFocusable: function(/*Element*/ elem){
			// summary:
			//		Tests if an element is focusable by tabbing to it, or clicking it with the mouse.

			return a11y.effectiveTabIndex(elem) >= -1;
		},

		_getTabNavigable: function(/*DOMNode*/ root){
			// summary:
			//		Finds descendants of the specified root node.
			// description:
			//		Finds the following descendants of the specified root node:
			//
			//		- the first tab-navigable element in document order
			//		  without a tabIndex or with tabIndex="0"
			//		- the last tab-navigable element in document order
			//		  without a tabIndex or with tabIndex="0"
			//		- the first element in document order with the lowest
			//		  positive tabIndex value
			//		- the last element in document order with the highest
			//		  positive tabIndex value
			var first, last, lowest, lowestTabindex, highest, highestTabindex, radioSelected = {};

			function radioName(node){
				// If this element is part of a radio button group, return the name for that group.
				return node && node.tagName.toLowerCase() == "input" &&
					node.type && node.type.toLowerCase() == "radio" &&
					node.name && node.name.toLowerCase();
			}

			var shown = a11y._isElementShown, effectiveTabIndex = a11y.effectiveTabIndex;
			var walkTree = function(/*DOMNode*/ parent){
				for(var child = parent.firstChild; child; child = child.nextSibling){
					// Skip text elements, hidden elements, and also non-HTML elements (those in custom namespaces) in IE,
					// since show() invokes getAttribute("type"), which crash on VML nodes in IE.
					if(child.nodeType != 1 || (has("ie") <= 9 && child.scopeName !== "HTML") || !shown(child)){
						continue;
					}

					var tabindex = effectiveTabIndex(child);
					if(tabindex >= 0){
						if(tabindex == 0){
							if(!first){
								first = child;
							}
							last = child;
						}else if(tabindex > 0){
							if(!lowest || tabindex < lowestTabindex){
								lowestTabindex = tabindex;
								lowest = child;
							}
							if(!highest || tabindex >= highestTabindex){
								highestTabindex = tabindex;
								highest = child;
							}
						}
						var rn = radioName(child);
						if(domAttr.get(child, "checked") && rn){
							radioSelected[rn] = child;
						}
					}
					if(child.nodeName.toUpperCase() != 'SELECT'){
						walkTree(child);
					}
				}
			};
			if(shown(root)){
				walkTree(root);
			}
			function rs(node){
				// substitute checked radio button for unchecked one, if there is a checked one with the same name.
				return radioSelected[radioName(node)] || node;
			}

			return { first: rs(first), last: rs(last), lowest: rs(lowest), highest: rs(highest) };
		},

		getFirstInTabbingOrder: function(/*String|DOMNode*/ root, /*Document?*/ doc){
			// summary:
			//		Finds the descendant of the specified root node
			//		that is first in the tabbing order
			var elems = a11y._getTabNavigable(dom.byId(root, doc));
			return elems.lowest ? elems.lowest : elems.first; // DomNode
		},

		getLastInTabbingOrder: function(/*String|DOMNode*/ root, /*Document?*/ doc){
			// summary:
			//		Finds the descendant of the specified root node
			//		that is last in the tabbing order
			var elems = a11y._getTabNavigable(dom.byId(root, doc));
			return elems.last ? elems.last : elems.highest; // DomNode
		}
	};

	 1  && lang.mixin(dijit, a11y);

	return a11y;
});

},
'dijit/main':function(){
define([
	"dojo/_base/kernel"
], function(dojo){
	// module:
	//		dijit/main

/*=====
return {
	// summary:
	//		The dijit package main module.
	//		Deprecated.   Users should access individual modules (ex: dijit/registry) directly.
};
=====*/

	return dojo.dijit;
});

},
'dijit/registry':function(){
define([
	"dojo/_base/array", // array.forEach array.map
	"dojo/_base/window", // win.body
	"./main"	// dijit._scopeName
], function(array, win, dijit){

	// module:
	//		dijit/registry

	var _widgetTypeCtr = {}, hash = {};

	var registry =  {
		// summary:
		//		Registry of existing widget on page, plus some utility methods.

		// length: Number
		//		Number of registered widgets
		length: 0,

		add: function(widget){
			// summary:
			//		Add a widget to the registry. If a duplicate ID is detected, a error is thrown.
			// widget: dijit/_WidgetBase
			//		Any dijit/_WidgetBase subclass.
			if(hash[widget.id]){
				throw new Error("Tried to register widget with id==" + widget.id + " but that id is already registered");
			}
			hash[widget.id] = widget;
			this.length++;
		},

		remove: function(/*String*/ id){
			// summary:
			//		Remove a widget from the registry. Does not destroy the widget; simply
			//		removes the reference.
			if(hash[id]){
				delete hash[id];
				this.length--;
			}
		},

		byId: function(/*String|Widget*/ id){
			// summary:
			//		Find a widget by it's id.
			//		If passed a widget then just returns the widget.
			return typeof id == "string" ? hash[id] : id;	// dijit/_WidgetBase
		},

		byNode: function(/*DOMNode*/ node){
			// summary:
			//		Returns the widget corresponding to the given DOMNode
			return hash[node.getAttribute("widgetId")]; // dijit/_WidgetBase
		},

		toArray: function(){
			// summary:
			//		Convert registry into a true Array
			//
			// example:
			//		Work with the widget .domNodes in a real Array
			//		|	array.map(registry.toArray(), function(w){ return w.domNode; });

			var ar = [];
			for(var id in hash){
				ar.push(hash[id]);
			}
			return ar;	// dijit/_WidgetBase[]
		},

		getUniqueId: function(/*String*/widgetType){
			// summary:
			//		Generates a unique id for a given widgetType

			var id;
			do{
				id = widgetType + "_" +
					(widgetType in _widgetTypeCtr ?
						++_widgetTypeCtr[widgetType] : _widgetTypeCtr[widgetType] = 0);
			}while(hash[id]);
			return dijit._scopeName == "dijit" ? id : dijit._scopeName + "_" + id; // String
		},

		findWidgets: function(root, skipNode){
			// summary:
			//		Search subtree under root returning widgets found.
			//		Doesn't search for nested widgets (ie, widgets inside other widgets).
			// root: DOMNode
			//		Node to search under.
			// skipNode: DOMNode
			//		If specified, don't search beneath this node (usually containerNode).

			var outAry = [];

			function getChildrenHelper(root){
				for(var node = root.firstChild; node; node = node.nextSibling){
					if(node.nodeType == 1){
						var widgetId = node.getAttribute("widgetId");
						if(widgetId){
							var widget = hash[widgetId];
							if(widget){	// may be null on page w/multiple dojo's loaded
								outAry.push(widget);
							}
						}else if(node !== skipNode){
							getChildrenHelper(node);
						}
					}
				}
			}

			getChildrenHelper(root);
			return outAry;
		},

		_destroyAll: function(){
			// summary:
			//		Code to destroy all widgets and do other cleanup on page unload

			// Clean up focus manager lingering references to widgets and nodes
			dijit._curFocus = null;
			dijit._prevFocus = null;
			dijit._activeStack = [];

			// Destroy all the widgets, top down
			array.forEach(registry.findWidgets(win.body()), function(widget){
				// Avoid double destroy of widgets like Menu that are attached to <body>
				// even though they are logically children of other widgets.
				if(!widget._destroyed){
					if(widget.destroyRecursive){
						widget.destroyRecursive();
					}else if(widget.destroy){
						widget.destroy();
					}
				}
			});
		},

		getEnclosingWidget: function(/*DOMNode*/ node){
			// summary:
			//		Returns the widget whose DOM tree contains the specified DOMNode, or null if
			//		the node is not contained within the DOM tree of any widget
			while(node){
				var id = node.nodeType == 1 && node.getAttribute("widgetId");
				if(id){
					return hash[id];
				}
				node = node.parentNode;
			}
			return null;
		},

		// In case someone needs to access hash.
		// Actually, this is accessed from WidgetSet back-compatibility code
		_hash: hash
	};

	dijit.registry = registry;

	return registry;
});

},
'dijit/_base/manager':function(){
define([
	"dojo/_base/array",
	"dojo/_base/config", // defaultDuration
	"dojo/_base/lang",
	"../registry",
	"../main"	// for setting exports to dijit namespace
], function(array, config, lang, registry, dijit){

	// module:
	//		dijit/_base/manager

	var exports = {
		// summary:
		//		Deprecated.  Shim to methods on registry, plus a few other declarations.
		//		New code should access dijit/registry directly when possible.
	};

	array.forEach(["byId", "getUniqueId", "findWidgets", "_destroyAll", "byNode", "getEnclosingWidget"], function(name){
		exports[name] = registry[name];
	});

	 lang.mixin(exports, {
		 // defaultDuration: Integer
		 //		The default fx.animation speed (in ms) to use for all Dijit
		 //		transitional fx.animations, unless otherwise specified
		 //		on a per-instance basis. Defaults to 200, overrided by
		 //		`djConfig.defaultDuration`
		 defaultDuration: config["defaultDuration"] || 200
	 });

	lang.mixin(dijit, exports);

	/*===== return exports; =====*/
	return dijit;	// for back compat :-(
});

},
'dijit/_Widget':function(){
define([
	"dojo/aspect",	// aspect.around
	"dojo/_base/config",	// config.isDebug
	"dojo/_base/connect",	// connect.connect
	"dojo/_base/declare", // declare
	"dojo/has",
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.hitch
	"dojo/query",
	"dojo/ready",
	"./registry",	// registry.byNode
	"./_WidgetBase",
	"./_OnDijitClickMixin",
	"./_FocusMixin",
	"dojo/uacss",		// browser sniffing (included for back-compat; subclasses may be using)
	"./hccss"		// high contrast mode sniffing (included to set CSS classes on <body>, module ret value unused)
], function(aspect, config, connect, declare, has, kernel, lang, query, ready,
			registry, _WidgetBase, _OnDijitClickMixin, _FocusMixin){


// module:
//		dijit/_Widget


function connectToDomNode(){
	// summary:
	//		If user connects to a widget method === this function, then they will
	//		instead actually be connecting the equivalent event on this.domNode
}

// Trap dojo.connect() calls to connectToDomNode methods, and redirect to _Widget.on()
function aroundAdvice(originalConnect){
	return function(obj, event, scope, method){
		if(obj && typeof event == "string" && obj[event] == connectToDomNode){
			return obj.on(event.substring(2).toLowerCase(), lang.hitch(scope, method));
		}
		return originalConnect.apply(connect, arguments);
	};
}
aspect.around(connect, "connect", aroundAdvice);
if(kernel.connect){
	aspect.around(kernel, "connect", aroundAdvice);
}

var _Widget = declare("dijit._Widget", [_WidgetBase, _OnDijitClickMixin, _FocusMixin], {
	// summary:
	//		Old base class for widgets.   New widgets should extend `dijit/_WidgetBase` instead
	// description:
	//		Old Base class for Dijit widgets.
	//
	//		Extends _WidgetBase, adding support for:
	//
	//		- declaratively/programatically specifying widget initialization parameters like
	//			onMouseMove="foo" that call foo when this.domNode gets a mousemove event
	//		- ondijitclick:
	//			Support new data-dojo-attach-event="ondijitclick: ..." that is triggered by a mouse click or a SPACE/ENTER keypress
	//		- focus related functions:
	//			In particular, the onFocus()/onBlur() callbacks.   Driven internally by
	//			dijit/_base/focus.js.
	//		- deprecated methods
	//		- onShow(), onHide(), onClose()
	//
	//		Also, by loading code in dijit/_base, turns on:
	//
	//		- browser sniffing (putting browser class like `dj_ie` on `<html>` node)
	//		- high contrast mode sniffing (add `dijit_a11y` class to `<body>` if machine is in high contrast mode)


	////////////////// DEFERRED CONNECTS ///////////////////

	onClick: connectToDomNode,
	/*=====
	onClick: function(event){
		// summary:
		//		Connect to this function to receive notifications of mouse click events.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onDblClick: connectToDomNode,
	/*=====
	onDblClick: function(event){
		// summary:
		//		Connect to this function to receive notifications of mouse double click events.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onKeyDown: connectToDomNode,
	/*=====
	onKeyDown: function(event){
		// summary:
		//		Connect to this function to receive notifications of keys being pressed down.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onKeyPress: connectToDomNode,
	/*=====
	onKeyPress: function(event){
		// summary:
		//		Connect to this function to receive notifications of printable keys being typed.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onKeyUp: connectToDomNode,
	/*=====
	onKeyUp: function(event){
		// summary:
		//		Connect to this function to receive notifications of keys being released.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onMouseDown: connectToDomNode,
	/*=====
	onMouseDown: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse button is pressed down.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseMove: connectToDomNode,
	/*=====
	onMouseMove: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves over nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseOut: connectToDomNode,
	/*=====
	onMouseOut: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves off of nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseOver: connectToDomNode,
	/*=====
	onMouseOver: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves onto nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseLeave: connectToDomNode,
	/*=====
	onMouseLeave: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves off of this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseEnter: connectToDomNode,
	/*=====
	onMouseEnter: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves onto this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseUp: connectToDomNode,
	/*=====
	onMouseUp: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse button is released.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/

	constructor: function(params /*===== ,srcNodeRef =====*/){
		// summary:
		//		Create the widget.
		// params: Object|null
		//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
		//		and functions, typically callbacks like onClick.
		//		The hash can contain any of the widget's properties, excluding read-only properties.
		// srcNodeRef: DOMNode|String?
		//		If a srcNodeRef (DOM node) is specified:
		//
		//		- use srcNodeRef.innerHTML as my contents
		//		- if this is a behavioral widget then apply behavior to that srcNodeRef
		//		- otherwise, replace srcNodeRef with my generated DOM tree

		// extract parameters like onMouseMove that should connect directly to this.domNode
		this._toConnect = {};
		for(var name in params){
			if(this[name] === connectToDomNode){
				this._toConnect[name.replace(/^on/, "").toLowerCase()] = params[name];
				delete params[name];
			}
		}
	},

	postCreate: function(){
		this.inherited(arguments);

		// perform connection from this.domNode to user specified handlers (ex: onMouseMove)
		for(var name in this._toConnect){
			this.on(name, this._toConnect[name]);
		}
		delete this._toConnect;
	},

	on: function(/*String|Function*/ type, /*Function*/ func){
		if(this[this._onMap(type)] === connectToDomNode){
			// Use connect.connect() rather than on() to get handling for "onmouseenter" on non-IE,
			// normalization of onkeypress/onkeydown to behave like firefox, etc.
			// Also, need to specify context as "this" rather than the default context of the DOMNode
			// Remove in 2.0.
			return connect.connect(this.domNode, type.toLowerCase(), this, func);
		}
		return this.inherited(arguments);
	},

	_setFocusedAttr: function(val){
		// Remove this method in 2.0 (or sooner), just here to set _focused == focused, for back compat
		// (but since it's a private variable we aren't required to keep supporting it).
		this._focused = val;
		this._set("focused", val);
	},

	////////////////// DEPRECATED METHODS ///////////////////

	setAttribute: function(/*String*/ attr, /*anything*/ value){
		// summary:
		//		Deprecated.  Use set() instead.
		// tags:
		//		deprecated
		kernel.deprecated(this.declaredClass+"::setAttribute(attr, value) is deprecated. Use set() instead.", "", "2.0");
		this.set(attr, value);
	},

	attr: function(/*String|Object*/name, /*Object?*/value){
		// summary:
		//		This method is deprecated, use get() or set() directly.
		// name:
		//		The property to get or set. If an object is passed here and not
		//		a string, its keys are used as names of attributes to be set
		//		and the value of the object as values to set in the widget.
		// value:
		//		Optional. If provided, attr() operates as a setter. If omitted,
		//		the current value of the named property is returned.
		// tags:
		//		deprecated

		var args = arguments.length;
		if(args >= 2 || typeof name === "object"){ // setter
			return this.set.apply(this, arguments);
		}else{ // getter
			return this.get(name);
		}
	},

	getDescendants: function(){
		// summary:
		//		Returns all the widgets contained by this, i.e., all widgets underneath this.containerNode.
		//		This method should generally be avoided as it returns widgets declared in templates, which are
		//		supposed to be internal/hidden, but it's left here for back-compat reasons.

		kernel.deprecated(this.declaredClass+"::getDescendants() is deprecated. Use getChildren() instead.", "", "2.0");
		return this.containerNode ? query('[widgetId]', this.containerNode).map(registry.byNode) : []; // dijit/_WidgetBase[]
	},

	////////////////// MISCELLANEOUS METHODS ///////////////////

	_onShow: function(){
		// summary:
		//		Internal method called when this widget is made visible.
		//		See `onShow` for details.
		this.onShow();
	},

	onShow: function(){
		// summary:
		//		Called when this widget becomes the selected pane in a
		//		`dijit/layout/TabContainer`, `dijit/layout/StackContainer`,
		//		`dijit/layout/AccordionContainer`, etc.
		//
		//		Also called to indicate display of a `dijit.Dialog`, `dijit.TooltipDialog`, or `dijit.TitlePane`.
		// tags:
		//		callback
	},

	onHide: function(){
		// summary:
		//		Called when another widget becomes the selected pane in a
		//		`dijit/layout/TabContainer`, `dijit/layout/StackContainer`,
		//		`dijit/layout/AccordionContainer`, etc.
		//
		//		Also called to indicate hide of a `dijit.Dialog`, `dijit.TooltipDialog`, or `dijit.TitlePane`.
		// tags:
		//		callback
	},

	onClose: function(){
		// summary:
		//		Called when this widget is being displayed as a popup (ex: a Calendar popped
		//		up from a DateTextBox), and it is hidden.
		//		This is called from the dijit.popup code, and should not be called directly.
		//
		//		Also used as a parameter for children of `dijit/layout/StackContainer` or subclasses.
		//		Callback if a user tries to close the child.   Child will be closed if this function returns true.
		// tags:
		//		extension

		return true;		// Boolean
	}
});

// For back-compat, remove in 2.0.
if(has("dijit-legacy-requires")){
	ready(0, function(){
		var requires = ["dijit/_base"];
		require(requires);	// use indirection so modules not rolled into a build
	});
}
return _Widget;
});

},
'dijit/_WidgetBase':function(){
define([
	"require", // require.toUrl
	"dojo/_base/array", // array.forEach array.map
	"dojo/aspect",
	"dojo/_base/config", // config.blankGif
	"dojo/_base/connect", // connect.connect
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.byId
	"dojo/dom-attr", // domAttr.set domAttr.remove
	"dojo/dom-class", // domClass.add domClass.replace
	"dojo/dom-construct", // domConstruct.destroy domConstruct.place
	"dojo/dom-geometry", // isBodyLtr
	"dojo/dom-style", // domStyle.set, domStyle.get
	"dojo/has",
	"dojo/_base/kernel",
	"dojo/_base/lang", // mixin(), isArray(), etc.
	"dojo/on",
	"dojo/ready",
	"dojo/Stateful", // Stateful
	"dojo/topic",
	"dojo/_base/window", // win.body()
	"./Destroyable",
	"dojo/has!dojo-bidi?./_BidiMixin",
	"./registry"    // registry.getUniqueId(), registry.findWidgets()
], function(require, array, aspect, config, connect, declare,
			dom, domAttr, domClass, domConstruct, domGeometry, domStyle, has, kernel,
			lang, on, ready, Stateful, topic, win, Destroyable, _BidiMixin, registry){

	// module:
	//		dijit/_WidgetBase

	// Flag to make dijit load modules the app didn't explicitly request, for backwards compatibility
	has.add("dijit-legacy-requires", !kernel.isAsync);

	// Flag to enable support for textdir attribute
	has.add("dojo-bidi", false);


	// For back-compat, remove in 2.0.
	if(has("dijit-legacy-requires")){
		ready(0, function(){
			var requires = ["dijit/_base/manager"];
			require(requires);	// use indirection so modules not rolled into a build
		});
	}

	// Nested hash listing attributes for each tag, all strings in lowercase.
	// ex: {"div": {"style": true, "tabindex" true}, "form": { ...
	var tagAttrs = {};

	function getAttrs(obj){
		var ret = {};
		for(var attr in obj){
			ret[attr.toLowerCase()] = true;
		}
		return ret;
	}

	function nonEmptyAttrToDom(attr){
		// summary:
		//		Returns a setter function that copies the attribute to this.domNode,
		//		or removes the attribute from this.domNode, depending on whether the
		//		value is defined or not.
		return function(val){
			domAttr[val ? "set" : "remove"](this.domNode, attr, val);
			this._set(attr, val);
		};
	}

	function isEqual(a, b){
		//	summary:
		//		Function that determines whether two values are identical,
		//		taking into account that NaN is not normally equal to itself
		//		in JS.

		return a === b || (/* a is NaN */ a !== a && /* b is NaN */ b !== b);
	}

	var _WidgetBase = declare("dijit._WidgetBase", [Stateful, Destroyable], {
		// summary:
		//		Future base class for all Dijit widgets.
		// description:
		//		Future base class for all Dijit widgets.
		//		_Widget extends this class adding support for various features needed by desktop.
		//
		//		Provides stubs for widget lifecycle methods for subclasses to extend, like postMixInProperties(), buildRendering(),
		//		postCreate(), startup(), and destroy(), and also public API methods like set(), get(), and watch().
		//
		//		Widgets can provide custom setters/getters for widget attributes, which are called automatically by set(name, value).
		//		For an attribute XXX, define methods _setXXXAttr() and/or _getXXXAttr().
		//
		//		_setXXXAttr can also be a string/hash/array mapping from a widget attribute XXX to the widget's DOMNodes:
		//
		//		- DOM node attribute
		// |		_setFocusAttr: {node: "focusNode", type: "attribute"}
		// |		_setFocusAttr: "focusNode"	(shorthand)
		// |		_setFocusAttr: ""		(shorthand, maps to this.domNode)
		//		Maps this.focus to this.focusNode.focus, or (last example) this.domNode.focus
		//
		//		- DOM node innerHTML
		//	|		_setTitleAttr: { node: "titleNode", type: "innerHTML" }
		//		Maps this.title to this.titleNode.innerHTML
		//
		//		- DOM node innerText
		//	|		_setTitleAttr: { node: "titleNode", type: "innerText" }
		//		Maps this.title to this.titleNode.innerText
		//
		//		- DOM node CSS class
		// |		_setMyClassAttr: { node: "domNode", type: "class" }
		//		Maps this.myClass to this.domNode.className
		//
		//		If the value of _setXXXAttr is an array, then each element in the array matches one of the
		//		formats of the above list.
		//
		//		If the custom setter is null, no action is performed other than saving the new value
		//		in the widget (in this).
		//
		//		If no custom setter is defined for an attribute, then it will be copied
		//		to this.focusNode (if the widget defines a focusNode), or this.domNode otherwise.
		//		That's only done though for attributes that match DOMNode attributes (title,
		//		alt, aria-labelledby, etc.)

		// id: [const] String
		//		A unique, opaque ID string that can be assigned by users or by the
		//		system. If the developer passes an ID which is known not to be
		//		unique, the specified ID is ignored and the system-generated ID is
		//		used instead.
		id: "",
		_setIdAttr: "domNode", // to copy to this.domNode even for auto-generated id's

		// lang: [const] String
		//		Rarely used.  Overrides the default Dojo locale used to render this widget,
		//		as defined by the [HTML LANG](http://www.w3.org/TR/html401/struct/dirlang.html#adef-lang) attribute.
		//		Value must be among the list of locales specified during by the Dojo bootstrap,
		//		formatted according to [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt) (like en-us).
		lang: "",
		// set on domNode even when there's a focus node.	but don't set lang="", since that's invalid.
		_setLangAttr: nonEmptyAttrToDom("lang"),

		// dir: [const] String
		//		Bi-directional support, as defined by the [HTML DIR](http://www.w3.org/TR/html401/struct/dirlang.html#adef-dir)
		//		attribute. Either left-to-right "ltr" or right-to-left "rtl".  If undefined, widgets renders in page's
		//		default direction.
		dir: "",
		// set on domNode even when there's a focus node.	but don't set dir="", since that's invalid.
		_setDirAttr: nonEmptyAttrToDom("dir"), // to set on domNode even when there's a focus node

		// class: String
		//		HTML class attribute
		"class": "",
		_setClassAttr: { node: "domNode", type: "class" },

		// Override automatic assigning type --> focusNode, it causes exception on IE6-8.
		// Instead, type must be specified as ${type} in the template, as part of the original DOM.
		_setTypeAttr: null,

		// style: String||Object
		//		HTML style attributes as cssText string or name/value hash
		style: "",

		// title: String
		//		HTML title attribute.
		//
		//		For form widgets this specifies a tooltip to display when hovering over
		//		the widget (just like the native HTML title attribute).
		//
		//		For TitlePane or for when this widget is a child of a TabContainer, AccordionContainer,
		//		etc., it's used to specify the tab label, accordion pane title, etc.  In this case it's
		//		interpreted as HTML.
		title: "",

		// tooltip: String
		//		When this widget's title attribute is used to for a tab label, accordion pane title, etc.,
		//		this specifies the tooltip to appear when the mouse is hovered over that text.
		tooltip: "",

		// baseClass: [protected] String
		//		Root CSS class of the widget (ex: dijitTextBox), used to construct CSS classes to indicate
		//		widget state.
		baseClass: "",

		// srcNodeRef: [readonly] DomNode
		//		pointer to original DOM node
		srcNodeRef: null,

		// domNode: [readonly] DomNode
		//		This is our visible representation of the widget! Other DOM
		//		Nodes may by assigned to other properties, usually through the
		//		template system's data-dojo-attach-point syntax, but the domNode
		//		property is the canonical "top level" node in widget UI.
		domNode: null,

		// containerNode: [readonly] DomNode
		//		Designates where children of the source DOM node will be placed.
		//		"Children" in this case refers to both DOM nodes and widgets.
		//		For example, for myWidget:
		//
		//		|	<div data-dojo-type=myWidget>
		//		|		<b> here's a plain DOM node
		//		|		<span data-dojo-type=subWidget>and a widget</span>
		//		|		<i> and another plain DOM node </i>
		//		|	</div>
		//
		//		containerNode would point to:
		//
		//		|		<b> here's a plain DOM node
		//		|		<span data-dojo-type=subWidget>and a widget</span>
		//		|		<i> and another plain DOM node </i>
		//
		//		In templated widgets, "containerNode" is set via a
		//		data-dojo-attach-point assignment.
		//
		//		containerNode must be defined for any widget that accepts innerHTML
		//		(like ContentPane or BorderContainer or even Button), and conversely
		//		is null for widgets that don't, like TextBox.
		containerNode: null,

		// ownerDocument: [const] Document?
		//		The document this widget belongs to.  If not specified to constructor, will default to
		//		srcNodeRef.ownerDocument, or if no sourceRef specified, then to the document global
		ownerDocument: null,
		_setOwnerDocumentAttr: function(val){
			// this setter is merely to avoid automatically trying to set this.domNode.ownerDocument
			this._set("ownerDocument", val);
		},

		/*=====
		// _started: [readonly] Boolean
		//		startup() has completed.
		_started: false,
		=====*/

		// attributeMap: [protected] Object
		//		Deprecated.	Instead of attributeMap, widget should have a _setXXXAttr attribute
		//		for each XXX attribute to be mapped to the DOM.
		//
		//		attributeMap sets up a "binding" between attributes (aka properties)
		//		of the widget and the widget's DOM.
		//		Changes to widget attributes listed in attributeMap will be
		//		reflected into the DOM.
		//
		//		For example, calling set('title', 'hello')
		//		on a TitlePane will automatically cause the TitlePane's DOM to update
		//		with the new title.
		//
		//		attributeMap is a hash where the key is an attribute of the widget,
		//		and the value reflects a binding to a:
		//
		//		- DOM node attribute
		// |		focus: {node: "focusNode", type: "attribute"}
		//		Maps this.focus to this.focusNode.focus
		//
		//		- DOM node innerHTML
		//	|		title: { node: "titleNode", type: "innerHTML" }
		//		Maps this.title to this.titleNode.innerHTML
		//
		//		- DOM node innerText
		//	|		title: { node: "titleNode", type: "innerText" }
		//		Maps this.title to this.titleNode.innerText
		//
		//		- DOM node CSS class
		// |		myClass: { node: "domNode", type: "class" }
		//		Maps this.myClass to this.domNode.className
		//
		//		If the value is an array, then each element in the array matches one of the
		//		formats of the above list.
		//
		//		There are also some shorthands for backwards compatibility:
		//
		//		- string --> { node: string, type: "attribute" }, for example:
		//
		//	|	"focusNode" ---> { node: "focusNode", type: "attribute" }
		//
		//		- "" --> { node: "domNode", type: "attribute" }
		attributeMap: {},

		// _blankGif: [protected] String
		//		Path to a blank 1x1 image.
		//		Used by `<img>` nodes in templates that really get their image via CSS background-image.
		_blankGif: config.blankGif || require.toUrl("dojo/resources/blank.gif"),

		//////////// INITIALIZATION METHODS ///////////////////////////////////////

		/*=====
		constructor: function(params, srcNodeRef){
			// summary:
			//		Create the widget.
			// params: Object|null
			//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
			//		and functions, typically callbacks like onClick.
			//		The hash can contain any of the widget's properties, excluding read-only properties.
			// srcNodeRef: DOMNode|String?
			//		If a srcNodeRef (DOM node) is specified:
			//
			//		- use srcNodeRef.innerHTML as my contents
			//		- if this is a behavioral widget then apply behavior to that srcNodeRef
			//		- otherwise, replace srcNodeRef with my generated DOM tree
		},
		=====*/

		_introspect: function(){
			// summary:
			//		Collect metadata about this widget (only once per class, not once per instance):
			//
			//			- list of attributes with custom setters, storing in this.constructor._setterAttrs
			//			- generate this.constructor._onMap, mapping names like "mousedown" to functions like onMouseDown

			var ctor = this.constructor;
			if(!ctor._setterAttrs){
				var proto = ctor.prototype,
					attrs = ctor._setterAttrs = [], // attributes with custom setters
					onMap = (ctor._onMap = {});

				// Items in this.attributeMap are like custom setters.  For back-compat, remove for 2.0.
				for(var name in proto.attributeMap){
					attrs.push(name);
				}

				// Loop over widget properties, collecting properties with custom setters and filling in ctor._onMap.
				for(name in proto){
					if(/^on/.test(name)){
						onMap[name.substring(2).toLowerCase()] = name;
					}

					if(/^_set[A-Z](.*)Attr$/.test(name)){
						name = name.charAt(4).toLowerCase() + name.substr(5, name.length - 9);
						if(!proto.attributeMap || !(name in proto.attributeMap)){
							attrs.push(name);
						}
					}
				}

				// Note: this isn't picking up info on properties like aria-label and role, that don't have custom setters
				// but that set() maps to attributes on this.domNode or this.focusNode
			}
		},

		postscript: function(/*Object?*/params, /*DomNode|String*/srcNodeRef){
			// summary:
			//		Kicks off widget instantiation.  See create() for details.
			// tags:
			//		private

			// Note that we skip calling this.inherited(), i.e. dojo/Stateful::postscript(), because 1.x widgets don't
			// expect their custom setters to get called until after buildRendering().  Consider changing for 2.0.

			this.create(params, srcNodeRef);
		},

		create: function(params, srcNodeRef){
			// summary:
			//		Kick off the life-cycle of a widget
			// description:
			//		Create calls a number of widget methods (postMixInProperties, buildRendering, postCreate,
			//		etc.), some of which of you'll want to override. See http://dojotoolkit.org/reference-guide/dijit/_WidgetBase.html
			//		for a discussion of the widget creation lifecycle.
			//
			//		Of course, adventurous developers could override create entirely, but this should
			//		only be done as a last resort.
			// params: Object|null
			//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
			//		and functions, typically callbacks like onClick.
			//		The hash can contain any of the widget's properties, excluding read-only properties.
			// srcNodeRef: DOMNode|String?
			//		If a srcNodeRef (DOM node) is specified:
			//
			//		- use srcNodeRef.innerHTML as my contents
			//		- if this is a behavioral widget then apply behavior to that srcNodeRef
			//		- otherwise, replace srcNodeRef with my generated DOM tree
			// tags:
			//		private

			// First time widget is instantiated, scan prototype to figure out info about custom setters etc.
			this._introspect();

			// store pointer to original DOM tree
			this.srcNodeRef = dom.byId(srcNodeRef);

			// No longer used, remove for 2.0.
			this._connects = [];
			this._supportingWidgets = [];

			// this is here for back-compat, remove in 2.0 (but check NodeList-instantiate.html test)
			if(this.srcNodeRef && (typeof this.srcNodeRef.id == "string")){
				this.id = this.srcNodeRef.id;
			}

			// mix in our passed parameters
			if(params){
				this.params = params;
				lang.mixin(this, params);
			}
			this.postMixInProperties();

			// Generate an id for the widget if one wasn't specified, or it was specified as id: undefined.
			// Do this before buildRendering() because it might expect the id to be there.
			if(!this.id){
				this.id = registry.getUniqueId(this.declaredClass.replace(/\./g, "_"));
				if(this.params){
					// if params contains {id: undefined}, prevent _applyAttributes() from processing it
					delete this.params.id;
				}
			}

			// The document and <body> node this widget is associated with
			this.ownerDocument = this.ownerDocument || (this.srcNodeRef ? this.srcNodeRef.ownerDocument : document);
			this.ownerDocumentBody = win.body(this.ownerDocument);

			registry.add(this);

			this.buildRendering();

			var deleteSrcNodeRef;

			if(this.domNode){
				// Copy attributes listed in attributeMap into the [newly created] DOM for the widget.
				// Also calls custom setters for all attributes with custom setters.
				this._applyAttributes();

				// If srcNodeRef was specified, then swap out original srcNode for this widget's DOM tree.
				// For 2.0, move this after postCreate().  postCreate() shouldn't depend on the
				// widget being attached to the DOM since it isn't when a widget is created programmatically like
				// new MyWidget({}).	See #11635.
				var source = this.srcNodeRef;
				if(source && source.parentNode && this.domNode !== source){
					source.parentNode.replaceChild(this.domNode, source);
					deleteSrcNodeRef = true;
				}

				// Note: for 2.0 may want to rename widgetId to dojo._scopeName + "_widgetId",
				// assuming that dojo._scopeName even exists in 2.0
				this.domNode.setAttribute("widgetId", this.id);
			}
			this.postCreate();

			// If srcNodeRef has been processed and removed from the DOM (e.g. TemplatedWidget) then delete it to allow GC.
			// I think for back-compatibility it isn't deleting srcNodeRef until after postCreate() has run.
			if(deleteSrcNodeRef){
				delete this.srcNodeRef;
			}

			this._created = true;
		},

		_applyAttributes: function(){
			// summary:
			//		Step during widget creation to copy  widget attributes to the
			//		DOM according to attributeMap and _setXXXAttr objects, and also to call
			//		custom _setXXXAttr() methods.
			//
			//		Skips over blank/false attribute values, unless they were explicitly specified
			//		as parameters to the widget, since those are the default anyway,
			//		and setting tabIndex="" is different than not setting tabIndex at all.
			//
			//		For backwards-compatibility reasons attributeMap overrides _setXXXAttr when
			//		_setXXXAttr is a hash/string/array, but _setXXXAttr as a functions override attributeMap.
			// tags:
			//		private

			// Call this.set() for each property that was either specified as parameter to constructor,
			// or is in the list found above.	For correlated properties like value and displayedValue, the one
			// specified as a parameter should take precedence.
			// Particularly important for new DateTextBox({displayedValue: ...}) since DateTextBox's default value is
			// NaN and thus is not ignored like a default value of "".

			// Step 1: Save the current values of the widget properties that were specified as parameters to the constructor.
			// Generally this.foo == this.params.foo, except if postMixInProperties() changed the value of this.foo.
			var params = {};
			for(var key in this.params || {}){
				params[key] = this._get(key);
			}

			// Step 2: Call set() for each property with a non-falsy value that wasn't passed as a parameter to the constructor
			array.forEach(this.constructor._setterAttrs, function(key){
				if(!(key in params)){
					var val = this._get(key);
					if(val){
						this.set(key, val);
					}
				}
			}, this);

			// Step 3: Call set() for each property that was specified as parameter to constructor.
			// Use params hash created above to ignore side effects from step #2 above.
			for(key in params){
				this.set(key, params[key]);
			}
		},

		postMixInProperties: function(){
			// summary:
			//		Called after the parameters to the widget have been read-in,
			//		but before the widget template is instantiated. Especially
			//		useful to set properties that are referenced in the widget
			//		template.
			// tags:
			//		protected
		},

		buildRendering: function(){
			// summary:
			//		Construct the UI for this widget, setting this.domNode.
			//		Most widgets will mixin `dijit._TemplatedMixin`, which implements this method.
			// tags:
			//		protected

			if(!this.domNode){
				// Create root node if it wasn't created by _TemplatedMixin
				this.domNode = this.srcNodeRef || this.ownerDocument.createElement("div");
			}

			// baseClass is a single class name or occasionally a space-separated list of names.
			// Add those classes to the DOMNode.  If RTL mode then also add with Rtl suffix.
			// TODO: make baseClass custom setter
			if(this.baseClass){
				var classes = this.baseClass.split(" ");
				if(!this.isLeftToRight()){
					classes = classes.concat(array.map(classes, function(name){
						return name + "Rtl";
					}));
				}
				domClass.add(this.domNode, classes);
			}
		},

		postCreate: function(){
			// summary:
			//		Processing after the DOM fragment is created
			// description:
			//		Called after the DOM fragment has been created, but not necessarily
			//		added to the document.  Do not include any operations which rely on
			//		node dimensions or placement.
			// tags:
			//		protected
		},

		startup: function(){
			// summary:
			//		Processing after the DOM fragment is added to the document
			// description:
			//		Called after a widget and its children have been created and added to the page,
			//		and all related widgets have finished their create() cycle, up through postCreate().
			//
			//		Note that startup() may be called while the widget is still hidden, for example if the widget is
			//		inside a hidden dijit/Dialog or an unselected tab of a dijit/layout/TabContainer.
			//		For widgets that need to do layout, it's best to put that layout code inside resize(), and then
			//		extend dijit/layout/_LayoutWidget so that resize() is called when the widget is visible.
			if(this._started){
				return;
			}
			this._started = true;
			array.forEach(this.getChildren(), function(obj){
				if(!obj._started && !obj._destroyed && lang.isFunction(obj.startup)){
					obj.startup();
					obj._started = true;
				}
			});
		},

		//////////// DESTROY FUNCTIONS ////////////////////////////////

		destroyRecursive: function(/*Boolean?*/ preserveDom){
			// summary:
			//		Destroy this widget and its descendants
			// description:
			//		This is the generic "destructor" function that all widget users
			//		should call to cleanly discard with a widget. Once a widget is
			//		destroyed, it is removed from the manager object.
			// preserveDom:
			//		If true, this method will leave the original DOM structure
			//		alone of descendant Widgets. Note: This will NOT work with
			//		dijit._TemplatedMixin widgets.

			this._beingDestroyed = true;
			this.destroyDescendants(preserveDom);
			this.destroy(preserveDom);
		},

		destroy: function(/*Boolean*/ preserveDom){
			// summary:
			//		Destroy this widget, but not its descendants.  Descendants means widgets inside of
			//		this.containerNode.   Will also destroy any resources (including widgets) registered via this.own().
			//
			//		This method will also destroy internal widgets such as those created from a template,
			//		assuming those widgets exist inside of this.domNode but outside of this.containerNode.
			//
			//		For 2.0 it's planned that this method will also destroy descendant widgets, so apps should not
			//		depend on the current ability to destroy a widget without destroying its descendants.   Generally
			//		they should use destroyRecursive() for widgets with children.
			// preserveDom: Boolean
			//		If true, this method will leave the original DOM structure alone.
			//		Note: This will not yet work with _TemplatedMixin widgets

			this._beingDestroyed = true;
			this.uninitialize();

			function destroy(w){
				if(w.destroyRecursive){
					w.destroyRecursive(preserveDom);
				}else if(w.destroy){
					w.destroy(preserveDom);
				}
			}

			// Back-compat, remove for 2.0
			array.forEach(this._connects, lang.hitch(this, "disconnect"));
			array.forEach(this._supportingWidgets, destroy);

			// Destroy supporting widgets, but not child widgets under this.containerNode (for 2.0, destroy child widgets
			// here too).   if() statement is to guard against exception if destroy() called multiple times (see #15815).
			if(this.domNode){
				array.forEach(registry.findWidgets(this.domNode, this.containerNode), destroy);
			}

			this.destroyRendering(preserveDom);
			registry.remove(this.id);
			this._destroyed = true;
		},

		destroyRendering: function(/*Boolean?*/ preserveDom){
			// summary:
			//		Destroys the DOM nodes associated with this widget.
			// preserveDom:
			//		If true, this method will leave the original DOM structure alone
			//		during tear-down. Note: this will not work with _Templated
			//		widgets yet.
			// tags:
			//		protected

			if(this.bgIframe){
				this.bgIframe.destroy(preserveDom);
				delete this.bgIframe;
			}

			if(this.domNode){
				if(preserveDom){
					domAttr.remove(this.domNode, "widgetId");
				}else{
					domConstruct.destroy(this.domNode);
				}
				delete this.domNode;
			}

			if(this.srcNodeRef){
				if(!preserveDom){
					domConstruct.destroy(this.srcNodeRef);
				}
				delete this.srcNodeRef;
			}
		},

		destroyDescendants: function(/*Boolean?*/ preserveDom){
			// summary:
			//		Recursively destroy the children of this widget and their
			//		descendants.
			// preserveDom:
			//		If true, the preserveDom attribute is passed to all descendant
			//		widget's .destroy() method. Not for use with _Templated
			//		widgets.

			// get all direct descendants and destroy them recursively
			array.forEach(this.getChildren(), function(widget){
				if(widget.destroyRecursive){
					widget.destroyRecursive(preserveDom);
				}
			});
		},

		uninitialize: function(){
			// summary:
			//		Deprecated. Override destroy() instead to implement custom widget tear-down
			//		behavior.
			// tags:
			//		protected
			return false;
		},

		////////////////// GET/SET, CUSTOM SETTERS, ETC. ///////////////////

		_setStyleAttr: function(/*String||Object*/ value){
			// summary:
			//		Sets the style attribute of the widget according to value,
			//		which is either a hash like {height: "5px", width: "3px"}
			//		or a plain string
			// description:
			//		Determines which node to set the style on based on style setting
			//		in attributeMap.
			// tags:
			//		protected

			var mapNode = this.domNode;

			// Note: technically we should revert any style setting made in a previous call
			// to his method, but that's difficult to keep track of.

			if(lang.isObject(value)){
				domStyle.set(mapNode, value);
			}else{
				if(mapNode.style.cssText){
					mapNode.style.cssText += "; " + value;
				}else{
					mapNode.style.cssText = value;
				}
			}

			this._set("style", value);
		},

		_attrToDom: function(/*String*/ attr, /*String*/ value, /*Object?*/ commands){
			// summary:
			//		Reflect a widget attribute (title, tabIndex, duration etc.) to
			//		the widget DOM, as specified by commands parameter.
			//		If commands isn't specified then it's looked up from attributeMap.
			//		Note some attributes like "type"
			//		cannot be processed this way as they are not mutable.
			// attr:
			//		Name of member variable (ex: "focusNode" maps to this.focusNode) pointing
			//		to DOMNode inside the widget, or alternately pointing to a subwidget
			// tags:
			//		private

			commands = arguments.length >= 3 ? commands : this.attributeMap[attr];

			array.forEach(lang.isArray(commands) ? commands : [commands], function(command){

				// Get target node and what we are doing to that node
				var mapNode = this[command.node || command || "domNode"];	// DOM node
				var type = command.type || "attribute";	// class, innerHTML, innerText, or attribute

				switch(type){
					case "attribute":
						if(lang.isFunction(value)){ // functions execute in the context of the widget
							value = lang.hitch(this, value);
						}

						// Get the name of the DOM node attribute; usually it's the same
						// as the name of the attribute in the widget (attr), but can be overridden.
						// Also maps handler names to lowercase, like onSubmit --> onsubmit
						var attrName = command.attribute ? command.attribute :
							(/^on[A-Z][a-zA-Z]*$/.test(attr) ? attr.toLowerCase() : attr);

						if(mapNode.tagName){
							// Normal case, mapping to a DOMNode.  Note that modern browsers will have a mapNode.set()
							// method, but for consistency we still call domAttr
							domAttr.set(mapNode, attrName, value);
						}else{
							// mapping to a sub-widget
							mapNode.set(attrName, value);
						}
						break;
					case "innerText":
						mapNode.innerHTML = "";
						mapNode.appendChild(this.ownerDocument.createTextNode(value));
						break;
					case "innerHTML":
						mapNode.innerHTML = value;
						break;
					case "class":
						domClass.replace(mapNode, value, this[attr]);
						break;
				}
			}, this);
		},

		get: function(name){
			// summary:
			//		Get a property from a widget.
			// name:
			//		The property to get.
			// description:
			//		Get a named property from a widget. The property may
			//		potentially be retrieved via a getter method. If no getter is defined, this
			//		just retrieves the object's property.
			//
			//		For example, if the widget has properties `foo` and `bar`
			//		and a method named `_getFooAttr()`, calling:
			//		`myWidget.get("foo")` would be equivalent to calling
			//		`widget._getFooAttr()` and `myWidget.get("bar")`
			//		would be equivalent to the expression
			//		`widget.bar2`
			var names = this._getAttrNames(name);
			return this[names.g] ? this[names.g]() : this._get(name);
		},

		set: function(name, value){
			// summary:
			//		Set a property on a widget
			// name:
			//		The property to set.
			// value:
			//		The value to set in the property.
			// description:
			//		Sets named properties on a widget which may potentially be handled by a
			//		setter in the widget.
			//
			//		For example, if the widget has properties `foo` and `bar`
			//		and a method named `_setFooAttr()`, calling
			//		`myWidget.set("foo", "Howdy!")` would be equivalent to calling
			//		`widget._setFooAttr("Howdy!")` and `myWidget.set("bar", 3)`
			//		would be equivalent to the statement `widget.bar = 3;`
			//
			//		set() may also be called with a hash of name/value pairs, ex:
			//
			//	|	myWidget.set({
			//	|		foo: "Howdy",
			//	|		bar: 3
			//	|	});
			//
			//	This is equivalent to calling `set(foo, "Howdy")` and `set(bar, 3)`

			if(typeof name === "object"){
				for(var x in name){
					this.set(x, name[x]);
				}
				return this;
			}
			var names = this._getAttrNames(name),
				setter = this[names.s];
			if(lang.isFunction(setter)){
				// use the explicit setter
				var result = setter.apply(this, Array.prototype.slice.call(arguments, 1));
			}else{
				// Mapping from widget attribute to DOMNode/subwidget attribute/value/etc.
				// Map according to:
				//		1. attributeMap setting, if one exists (TODO: attributeMap deprecated, remove in 2.0)
				//		2. _setFooAttr: {...} type attribute in the widget (if one exists)
				//		3. apply to focusNode or domNode if standard attribute name, excluding funcs like onClick.
				// Checks if an attribute is a "standard attribute" by whether the DOMNode JS object has a similar
				// attribute name (ex: accept-charset attribute matches jsObject.acceptCharset).
				// Note also that Tree.focusNode() is a function not a DOMNode, so test for that.
				var defaultNode = this.focusNode && !lang.isFunction(this.focusNode) ? "focusNode" : "domNode",
					tag = this[defaultNode] && this[defaultNode].tagName,
					attrsForTag = tag && (tagAttrs[tag] || (tagAttrs[tag] = getAttrs(this[defaultNode]))),
					map = name in this.attributeMap ? this.attributeMap[name] :
						names.s in this ? this[names.s] :
							((attrsForTag && names.l in attrsForTag && typeof value != "function") ||
								/^aria-|^data-|^role$/.test(name)) ? defaultNode : null;
				if(map != null){
					this._attrToDom(name, value, map);
				}
				this._set(name, value);
			}
			return result || this;
		},

		_attrPairNames: {}, // shared between all widgets
		_getAttrNames: function(name){
			// summary:
			//		Helper function for get() and set().
			//		Caches attribute name values so we don't do the string ops every time.
			// tags:
			//		private

			var apn = this._attrPairNames;
			if(apn[name]){
				return apn[name];
			}
			var uc = name.replace(/^[a-z]|-[a-zA-Z]/g, function(c){
				return c.charAt(c.length - 1).toUpperCase();
			});
			return (apn[name] = {
				n: name + "Node",
				s: "_set" + uc + "Attr", // converts dashes to camel case, ex: accept-charset --> _setAcceptCharsetAttr
				g: "_get" + uc + "Attr",
				l: uc.toLowerCase()        // lowercase name w/out dashes, ex: acceptcharset
			});
		},

		_set: function(/*String*/ name, /*anything*/ value){
			// summary:
			//		Helper function to set new value for specified property, and call handlers
			//		registered with watch() if the value has changed.
			var oldValue = this[name];
			this[name] = value;
			if(this._created && !isEqual(oldValue, value)){
				if(this._watchCallbacks){
					this._watchCallbacks(name, oldValue, value);
				}
				this.emit("attrmodified-" + name, {
					detail: {
						prevValue: oldValue,
						newValue: value
					}
				});
			}
		},

		_get: function(/*String*/ name){
			// summary:
			//		Helper function to get value for specified property stored by this._set(),
			//		i.e. for properties with custom setters.  Used mainly by custom getters.
			//
			//		For example, CheckBox._getValueAttr() calls this._get("value").

			// future: return name in this.props ? this.props[name] : this[name];
			return this[name];
		},

		emit: function(/*String*/ type, /*Object?*/ eventObj, /*Array?*/ callbackArgs){
			// summary:
			//		Used by widgets to signal that a synthetic event occurred, ex:
			//	|	myWidget.emit("attrmodified-selectedChildWidget", {}).
			//
			//		Emits an event on this.domNode named type.toLowerCase(), based on eventObj.
			//		Also calls onType() method, if present, and returns value from that method.
			//		By default passes eventObj to callback, but will pass callbackArgs instead, if specified.
			//		Modifies eventObj by adding missing parameters (bubbles, cancelable, widget).
			// tags:
			//		protected

			// Specify fallback values for bubbles, cancelable in case they are not set in eventObj.
			// Also set pointer to widget, although since we can't add a pointer to the widget for native events
			// (see #14729), maybe we shouldn't do it here?
			eventObj = eventObj || {};
			if(eventObj.bubbles === undefined){
				eventObj.bubbles = true;
			}
			if(eventObj.cancelable === undefined){
				eventObj.cancelable = true;
			}
			if(!eventObj.detail){
				eventObj.detail = {};
			}
			eventObj.detail.widget = this;

			var ret, callback = this["on" + type];
			if(callback){
				ret = callback.apply(this, callbackArgs ? callbackArgs : [eventObj]);
			}

			// Emit event, but avoid spurious emit()'s as parent sets properties on child during startup/destroy
			if(this._started && !this._beingDestroyed){
				on.emit(this.domNode, type.toLowerCase(), eventObj);
			}

			return ret;
		},

		on: function(/*String|Function*/ type, /*Function*/ func){
			// summary:
			//		Call specified function when event occurs, ex: myWidget.on("click", function(){ ... }).
			// type:
			//		Name of event (ex: "click") or extension event like touch.press.
			// description:
			//		Call specified function when event `type` occurs, ex: `myWidget.on("click", function(){ ... })`.
			//		Note that the function is not run in any particular scope, so if (for example) you want it to run in the
			//		widget's scope you must do `myWidget.on("click", lang.hitch(myWidget, func))`.

			// For backwards compatibility, if there's an onType() method in the widget then connect to that.
			// Remove in 2.0.
			var widgetMethod = this._onMap(type);
			if(widgetMethod){
				return aspect.after(this, widgetMethod, func, true);
			}

			// Otherwise, just listen for the event on this.domNode.
			return this.own(on(this.domNode, type, func))[0];
		},

		_onMap: function(/*String|Function*/ type){
			// summary:
			//		Maps on() type parameter (ex: "mousemove") to method name (ex: "onMouseMove").
			//		If type is a synthetic event like touch.press then returns undefined.
			var ctor = this.constructor, map = ctor._onMap;
			if(!map){
				map = (ctor._onMap = {});
				for(var attr in ctor.prototype){
					if(/^on/.test(attr)){
						map[attr.replace(/^on/, "").toLowerCase()] = attr;
					}
				}
			}
			return map[typeof type == "string" && type.toLowerCase()];	// String
		},

		toString: function(){
			// summary:
			//		Returns a string that represents the widget.
			// description:
			//		When a widget is cast to a string, this method will be used to generate the
			//		output. Currently, it does not implement any sort of reversible
			//		serialization.
			return '[Widget ' + this.declaredClass + ', ' + (this.id || 'NO ID') + ']'; // String
		},

		getChildren: function(){
			// summary:
			//		Returns all direct children of this widget, i.e. all widgets underneath this.containerNode whose parent
			//		is this widget.   Note that it does not return all descendants, but rather just direct children.
			//		Analogous to [Node.childNodes](https://developer.mozilla.org/en-US/docs/DOM/Node.childNodes),
			//		except containing widgets rather than DOMNodes.
			//
			//		The result intentionally excludes internally created widgets (a.k.a. supporting widgets)
			//		outside of this.containerNode.
			//
			//		Note that the array returned is a simple array.  Application code should not assume
			//		existence of methods like forEach().

			return this.containerNode ? registry.findWidgets(this.containerNode) : []; // dijit/_WidgetBase[]
		},

		getParent: function(){
			// summary:
			//		Returns the parent widget of this widget.

			return registry.getEnclosingWidget(this.domNode.parentNode);
		},

		connect: function(/*Object|null*/ obj, /*String|Function*/ event, /*String|Function*/ method){
			// summary:
			//		Deprecated, will be removed in 2.0, use this.own(on(...)) or this.own(aspect.after(...)) instead.
			//
			//		Connects specified obj/event to specified method of this object
			//		and registers for disconnect() on widget destroy.
			//
			//		Provide widget-specific analog to dojo.connect, except with the
			//		implicit use of this widget as the target object.
			//		Events connected with `this.connect` are disconnected upon
			//		destruction.
			// returns:
			//		A handle that can be passed to `disconnect` in order to disconnect before
			//		the widget is destroyed.
			// example:
			//	|	var btn = new Button();
			//	|	// when foo.bar() is called, call the listener we're going to
			//	|	// provide in the scope of btn
			//	|	btn.connect(foo, "bar", function(){
			//	|		 0 && console.debug(this.toString());
			//	|	});
			// tags:
			//		protected

			return this.own(connect.connect(obj, event, this, method))[0];	// handle
		},

		disconnect: function(handle){
			// summary:
			//		Deprecated, will be removed in 2.0, use handle.remove() instead.
			//
			//		Disconnects handle created by `connect`.
			// tags:
			//		protected

			handle.remove();
		},

		subscribe: function(t, method){
			// summary:
			//		Deprecated, will be removed in 2.0, use this.own(topic.subscribe()) instead.
			//
			//		Subscribes to the specified topic and calls the specified method
			//		of this object and registers for unsubscribe() on widget destroy.
			//
			//		Provide widget-specific analog to dojo.subscribe, except with the
			//		implicit use of this widget as the target object.
			// t: String
			//		The topic
			// method: Function
			//		The callback
			// example:
			//	|	var btn = new Button();
			//	|	// when /my/topic is published, this button changes its label to
			//	|	// be the parameter of the topic.
			//	|	btn.subscribe("/my/topic", function(v){
			//	|		this.set("label", v);
			//	|	});
			// tags:
			//		protected
			return this.own(topic.subscribe(t, lang.hitch(this, method)))[0];	// handle
		},

		unsubscribe: function(/*Object*/ handle){
			// summary:
			//		Deprecated, will be removed in 2.0, use handle.remove() instead.
			//
			//		Unsubscribes handle created by this.subscribe.
			//		Also removes handle from this widget's list of subscriptions
			// tags:
			//		protected

			handle.remove();
		},

		isLeftToRight: function(){
			// summary:
			//		Return this widget's explicit or implicit orientation (true for LTR, false for RTL)
			// tags:
			//		protected
			return this.dir ? (this.dir.toLowerCase() == "ltr") : domGeometry.isBodyLtr(this.ownerDocument); //Boolean
		},

		isFocusable: function(){
			// summary:
			//		Return true if this widget can currently be focused
			//		and false if not
			return this.focus && (domStyle.get(this.domNode, "display") != "none");
		},

		placeAt: function(/*String|DomNode|DocumentFragment|dijit/_WidgetBase*/ reference, /*String|Int?*/ position){
			// summary:
			//		Place this widget somewhere in the DOM based
			//		on standard domConstruct.place() conventions.
			// description:
			//		A convenience function provided in all _Widgets, providing a simple
			//		shorthand mechanism to put an existing (or newly created) Widget
			//		somewhere in the dom, and allow chaining.
			// reference:
			//		Widget, DOMNode, DocumentFragment, or id of widget or DOMNode
			// position:
			//		If reference is a widget (or id of widget), and that widget has an ".addChild" method,
			//		it will be called passing this widget instance into that method, supplying the optional
			//		position index passed.  In this case position (if specified) should be an integer.
			//
			//		If reference is a DOMNode (or id matching a DOMNode but not a widget),
			//		the position argument can be a numeric index or a string
			//		"first", "last", "before", or "after", same as dojo/dom-construct::place().
			// returns: dijit/_WidgetBase
			//		Provides a useful return of the newly created dijit._Widget instance so you
			//		can "chain" this function by instantiating, placing, then saving the return value
			//		to a variable.
			// example:
			//	|	// create a Button with no srcNodeRef, and place it in the body:
			//	|	var button = new Button({ label:"click" }).placeAt(win.body());
			//	|	// now, 'button' is still the widget reference to the newly created button
			//	|	button.on("click", function(e){  0 && console.log('click'); }));
			// example:
			//	|	// create a button out of a node with id="src" and append it to id="wrapper":
			//	|	var button = new Button({},"src").placeAt("wrapper");
			// example:
			//	|	// place a new button as the first element of some div
			//	|	var button = new Button({ label:"click" }).placeAt("wrapper","first");
			// example:
			//	|	// create a contentpane and add it to a TabContainer
			//	|	var tc = dijit.byId("myTabs");
			//	|	new ContentPane({ href:"foo.html", title:"Wow!" }).placeAt(tc)

			var refWidget = !reference.tagName && registry.byId(reference);
			if(refWidget && refWidget.addChild && (!position || typeof position === "number")){
				// Adding this to refWidget and can use refWidget.addChild() to handle everything.
				refWidget.addChild(this, position);
			}else{
				// "reference" is a plain DOMNode, or we can't use refWidget.addChild().   Use domConstruct.place() and
				// target refWidget.containerNode for nested placement (position==number, "first", "last", "only"), and
				// refWidget.domNode otherwise ("after"/"before"/"replace").  (But not supported officially, see #14946.)
				var ref = refWidget && ("domNode" in refWidget) ?
					(refWidget.containerNode && !/after|before|replace/.test(position || "") ?
						refWidget.containerNode : refWidget.domNode) : dom.byId(reference, this.ownerDocument);
				domConstruct.place(this.domNode, ref, position);

				// Start this iff it has a parent widget that's already started.
				// TODO: for 2.0 maybe it should also start the widget when this.getParent() returns null??
				if(!this._started && (this.getParent() || {})._started){
					this.startup();
				}
			}
			return this;
		},

		defer: function(fcn, delay){
			// summary:
			//		Wrapper to setTimeout to avoid deferred functions executing
			//		after the originating widget has been destroyed.
			//		Returns an object handle with a remove method (that returns null) (replaces clearTimeout).
			// fcn: Function
			//		Function reference.
			// delay: Number?
			//		Delay, defaults to 0.
			// tags:
			//		protected

			var timer = setTimeout(lang.hitch(this,
				function(){
					if(!timer){
						return;
					}
					timer = null;
					if(!this._destroyed){
						lang.hitch(this, fcn)();
					}
				}),
				delay || 0
			);
			return {
				remove: function(){
					if(timer){
						clearTimeout(timer);
						timer = null;
					}
					return null; // so this works well: handle = handle.remove();
				}
			};
		}
	});

	if(has("dojo-bidi")){
		_WidgetBase.extend(_BidiMixin);
	}

	return _WidgetBase;
});

},
'dijit/Destroyable':function(){
define([
	"dojo/_base/array", // array.forEach array.map
	"dojo/aspect",
	"dojo/_base/declare"
], function(array, aspect, declare){

	// module:
	//		dijit/Destroyable

	return declare("dijit.Destroyable", null, {
		// summary:
		//		Mixin to track handles and release them when instance is destroyed.
		// description:
		//		Call this.own(...) on list of handles (returned from dojo/aspect, dojo/on,
		//		dojo/Stateful::watch, or any class (including widgets) with a destroyRecursive() or destroy() method.
		//		Then call destroy() later to destroy this instance and release the resources.

		destroy: function(/*Boolean*/ preserveDom){
			// summary:
			//		Destroy this class, releasing any resources registered via own().
			this._destroyed = true;
		},

		own: function(){
			// summary:
			//		Track specified handles and remove/destroy them when this instance is destroyed, unless they were
			//		already removed/destroyed manually.
			// tags:
			//		protected
			// returns:
			//		The array of specified handles, so you can do for example:
			//	|		var handle = this.own(on(...))[0];

			var cleanupMethods = [
				"destroyRecursive",
				"destroy",
				"remove"
			];

			array.forEach(arguments, function(handle){
				// When this.destroy() is called, destroy handle.  Since I'm using aspect.before(),
				// the handle will be destroyed before a subclass's destroy() method starts running, before it calls
				// this.inherited() or even if it doesn't call this.inherited() at all.  If that's an issue, make an
				// onDestroy() method and connect to that instead.
				var destroyMethodName;
				var odh = aspect.before(this, "destroy", function (preserveDom){
					handle[destroyMethodName](preserveDom);
				});

				// Callback for when handle is manually destroyed.
				var hdhs = [];
				function onManualDestroy(){
					odh.remove();
					array.forEach(hdhs, function(hdh){
						hdh.remove();
					});
				}

				// Setup listeners for manual destroy of handle.
				// Also computes destroyMethodName, used in listener above.
				if(handle.then){
					// Special path for Promises.  Detect when Promise is resolved, rejected, or
					// canceled (nb: cancelling a Promise causes it to be rejected).
					destroyMethodName = "cancel";
					handle.then(onManualDestroy, onManualDestroy);
				}else{
					// Path for other handles.  Just use AOP to detect when handle is manually destroyed.
					array.forEach(cleanupMethods, function(cleanupMethod){
						if(typeof handle[cleanupMethod] === "function"){
							if(!destroyMethodName){
								// Use first matching method name in above listener (prefer destroyRecursive() to destroy())
								destroyMethodName = cleanupMethod;
							}
							hdhs.push(aspect.after(handle, cleanupMethod, onManualDestroy, true));
						}
					});
				}
			}, this);

			return arguments;		// handle
		}
	});
});

},
'dijit/_OnDijitClickMixin':function(){
define([
	"dojo/on",
	"dojo/_base/array", // array.forEach
	"dojo/keys", // keys.ENTER keys.SPACE
	"dojo/_base/declare", // declare
	"dojo/has", // has("dom-addeventlistener")
	"./a11yclick"
], function(on, array, keys, declare, has, a11yclick){

	// module:
	//		dijit/_OnDijitClickMixin

	var ret = declare("dijit._OnDijitClickMixin", null, {
		// summary:
		//		Deprecated.   New code should access the dijit/a11yclick event directly, ex:
		//		|	this.own(on(node, a11yclick, function(){ ... }));
		//
		//		Mixing in this class will make _WidgetBase.connect(node, "ondijitclick", ...) work.
		//		It also used to be necessary to make templates with ondijitclick work, but now you can just require
		//		dijit/a11yclick.

		connect: function(obj, event, method){
			// override _WidgetBase.connect() to make this.connect(node, "ondijitclick", ...) work
			return this.inherited(arguments, [obj, event == "ondijitclick" ? a11yclick : event, method]);
		}
	});

	ret.a11yclick = a11yclick;	// back compat

	return ret;
});

},
'dijit/a11yclick':function(){
define([
	"dojo/keys", // keys.ENTER keys.SPACE
	"dojo/mouse",
	"dojo/on",
	"dojo/touch" // touch support for click is now there
], function(keys, mouse, on, touch){

	// module:
	//		dijit/a11yclick

	/*=====
	return {
		// summary:
		//		Custom press, release, and click synthetic events
		//		which trigger on a left mouse click, touch, or space/enter keyup.

		click: function(node, listener){
			// summary:
			//		Logical click operation for mouse, touch, or keyboard (space/enter key)
		},
		press: function(node, listener){
			// summary:
			//		Mousedown (left button), touchstart, or keydown (space or enter) corresponding to logical click operation.
		},
		release: function(node, listener){
			// summary:
			//		Mouseup (left button), touchend, or keyup (space or enter) corresponding to logical click operation.
		},
		move: function(node, listener){
			// summary:
			//		Mouse cursor or a finger is dragged over the given node.
		}
	};
	=====*/

	function clickKey(/*Event*/ e){
		// Test if this keyboard event should be tracked as the start (if keydown) or end (if keyup) of a click event.
		// Only track for nodes marked to be tracked, and not for buttons or inputs,
		// since buttons handle keyboard click natively, and text inputs should not
		// prevent typing spaces or newlines.
		if((e.keyCode === keys.ENTER || e.keyCode === keys.SPACE) && !/input|button|textarea/i.test(e.target.nodeName)){

			// Test if a node or its ancestor has been marked with the dojoClick property to indicate special processing
			for(var node = e.target; node; node = node.parentNode){
				if(node.dojoClick){ return true; }
			}
		}
	}

	var lastKeyDownNode;

	on(document, "keydown", function(e){
		// 0 && console.log("a11yclick: onkeydown, e.target = ", e.target, ", lastKeyDownNode was ", lastKeyDownNode, ", equality is ", (e.target === lastKeyDownNode));
		if(clickKey(e)){
			// needed on IE for when focus changes between keydown and keyup - otherwise dropdown menus do not work
			lastKeyDownNode = e.target;

			// Prevent viewport scrolling on space key in IE<9.
			// (Reproducible on test_Button.html on any of the first dijit/form/Button examples)
			e.preventDefault();
		}else{
			lastKeyDownNode = null;
		}
	});

	on(document, "keyup", function(e){
		// 0 && console.log("a11yclick: onkeyup, e.target = ", e.target, ", lastKeyDownNode was ", lastKeyDownNode, ", equality is ", (e.target === lastKeyDownNode));
		if(clickKey(e) && e.target == lastKeyDownNode){	// === breaks greasemonkey
			//need reset here or have problems in FF when focus returns to trigger element after closing popup/alert
			lastKeyDownNode = null;

			on.emit(e.target, "click", {
				cancelable: true,
				bubbles: true,
				ctrlKey: e.ctrlKey,
				shiftKey: e.shiftKey,
				metaKey: e.metaKey,
				altKey: e.altKey,
				_origType: e.type
			});
		}
	});

	// I want to return a hash of the synthetic events, but for backwards compatibility the main return value
	// needs to be the click event.   Change for 2.0.

	var click = function(node, listener){
		// Set flag on node so that keydown/keyup above emits click event.
		// Also enables fast click processing from dojo/touch.
		node.dojoClick = true;

		return on(node, "click", listener);
	};
	click.click = click;	// forward compatibility with 2.0

	click.press =  function(node, listener){
		var touchListener = on(node, touch.press, function(evt){
			if(evt.type == "mousedown" && !mouse.isLeft(evt)){
				// Ignore right click
				return;
			}
			listener(evt);
		}), keyListener = on(node, "keydown", function(evt){
			if(evt.keyCode === keys.ENTER || evt.keyCode === keys.SPACE){
				listener(evt);
			}
		});
		return {
			remove: function(){
				touchListener.remove();
				keyListener.remove();
			}
		};
	};

	click.release =  function(node, listener){
		var touchListener = on(node, touch.release, function(evt){
			if(evt.type == "mouseup" && !mouse.isLeft(evt)){
				// Ignore right click
				return;
			}
			listener(evt);
		}), keyListener = on(node, "keyup", function(evt){
			if(evt.keyCode === keys.ENTER || evt.keyCode === keys.SPACE){
				listener(evt);
			}
		});
		return {
			remove: function(){
				touchListener.remove();
				keyListener.remove();
			}
		};
	};

	click.move = touch.move;	// just for convenience

	return click;
});

},
'dijit/_FocusMixin':function(){
define([
	"./focus",
	"./_WidgetBase",
	"dojo/_base/declare", // declare
	"dojo/_base/lang" // lang.extend
], function(focus, _WidgetBase, declare, lang){

	// module:
	//		dijit/_FocusMixin

	// We don't know where _FocusMixin will occur in the inheritance chain, but we need the _onFocus()/_onBlur() below
	// to be last in the inheritance chain, so mixin to _WidgetBase.
	lang.extend(_WidgetBase, {
		// focused: [readonly] Boolean
		//		This widget or a widget it contains has focus, or is "active" because
		//		it was recently clicked.
		focused: false,

		onFocus: function(){
			// summary:
			//		Called when the widget becomes "active" because
			//		it or a widget inside of it either has focus, or has recently
			//		been clicked.
			// tags:
			//		callback
		},

		onBlur: function(){
			// summary:
			//		Called when the widget stops being "active" because
			//		focus moved to something outside of it, or the user
			//		clicked somewhere outside of it, or the widget was
			//		hidden.
			// tags:
			//		callback
		},

		_onFocus: function(){
			// summary:
			//		This is where widgets do processing for when they are active,
			//		such as changing CSS classes.  See onFocus() for more details.
			// tags:
			//		protected
			this.onFocus();
		},

		_onBlur: function(){
			// summary:
			//		This is where widgets do processing for when they stop being active,
			//		such as changing CSS classes.  See onBlur() for more details.
			// tags:
			//		protected
			this.onBlur();
		}
	});

	return declare("dijit._FocusMixin", null, {
		// summary:
		//		Mixin to widget to provide _onFocus() and _onBlur() methods that
		//		fire when a widget or its descendants get/lose focus

		// flag that I want _onFocus()/_onBlur() notifications from focus manager
		_focusManager: focus
	});

});

},
'dojo/uacss':function(){
define(["./dom-geometry", "./_base/lang", "./domReady", "./sniff", "./_base/window"],
	function(geometry, lang, domReady, has, baseWindow){

	// module:
	//		dojo/uacss

	/*=====
	return {
		// summary:
		//		Applies pre-set CSS classes to the top-level HTML node, based on:
		//
		//		- browser (ex: dj_ie)
		//		- browser version (ex: dj_ie6)
		//		- box model (ex: dj_contentBox)
		//		- text direction (ex: dijitRtl)
		//
		//		In addition, browser, browser version, and box model are
		//		combined with an RTL flag when browser text is RTL. ex: dj_ie-rtl.
		//
		//		Returns the has() method.
	};
	=====*/

	var
		html = baseWindow.doc.documentElement,
		ie = has("ie"),
		opera = has("opera"),
		maj = Math.floor,
		ff = has("ff"),
		boxModel = geometry.boxModel.replace(/-/,''),

		classes = {
			"dj_quirks": has("quirks"),

			// NOTE: Opera not supported by dijit
			"dj_opera": opera,

			"dj_khtml": has("khtml"),

			"dj_webkit": has("webkit"),
			"dj_safari": has("safari"),
			"dj_chrome": has("chrome"),

			"dj_gecko": has("mozilla"),

			"dj_ios": has("ios"),
			"dj_android": has("android")
		}; // no dojo unsupported browsers

	if(ie){
		classes["dj_ie"] = true;
		classes["dj_ie" + maj(ie)] = true;
		classes["dj_iequirks"] = has("quirks");
	}
	if(ff){
		classes["dj_ff" + maj(ff)] = true;
	}

	classes["dj_" + boxModel] = true;

	// apply browser, browser version, and box model class names
	var classStr = "";
	for(var clz in classes){
		if(classes[clz]){
			classStr += clz + " ";
		}
	}
	html.className = lang.trim(html.className + " " + classStr);

	// If RTL mode, then add dj_rtl flag plus repeat existing classes with -rtl extension.
	// We can't run the code below until the <body> tag has loaded (so we can check for dir=rtl).
	domReady(function(){
		if(!geometry.isBodyLtr()){
			var rtlClassStr = "dj_rtl dijitRtl " + classStr.replace(/ /g, "-rtl ");
			html.className = lang.trim(html.className + " " + rtlClassStr + "dj_rtl dijitRtl " + classStr.replace(/ /g, "-rtl "));
		}
	});
	return has;
});

},
'dijit/hccss':function(){
define(["dojo/dom-class", "dojo/hccss", "dojo/domReady", "dojo/_base/window"], function(domClass, has, domReady, win){

	// module:
	//		dijit/hccss

	/*=====
	return function(){
		// summary:
		//		Test if computer is in high contrast mode, and sets `dijit_a11y` flag on `<body>` if it is.
		//		Deprecated, use ``dojo/hccss`` instead.
	};
	=====*/

	domReady(function(){
		if(has("highcontrast")){
			domClass.add(win.body(), "dijit_a11y");
		}
	});

	return has;
});

},
'dojo/hccss':function(){
define([
	"require",			// require, require.toUrl
	"./_base/config", // config.blankGif
	"./dom-class", // domClass.add
	"./dom-style", // domStyle.getComputedStyle
	"./has",
	"./domReady",
	"./_base/window" // win.body
], function(require, config, domClass, domStyle, has, domReady, win){

	// module:
	//		dojo/hccss

	/*=====
	return function(){
		// summary:
		//		Test if computer is in high contrast mode (i.e. if browser is not displaying background images).
		//		Defines `has("highcontrast")` and sets `dj_a11y` CSS class on `<body>` if machine is in high contrast mode.
		//		Returns `has()` method;
	};
	=====*/

	// Has() test for when background images aren't displayed.  Don't call has("highcontrast") before dojo/domReady!.
	has.add("highcontrast", function(){
		// note: if multiple documents, doesn't matter which one we use
		var div = win.doc.createElement("div");
		try{
			div.style.cssText = "border: 1px solid; border-color:red green; position: absolute; height: 5px; top: -999px;" +
				"background-image: url(\"" + (config.blankGif || require.toUrl("./resources/blank.gif")) + "\");";
			win.body().appendChild(div);

			var cs = domStyle.getComputedStyle(div),
				bkImg = cs.backgroundImage;
			return cs.borderTopColor == cs.borderRightColor ||
				(bkImg && (bkImg == "none" || bkImg == "url(invalid-url:)" ));
		}catch(e){
			 0 && console.warn("hccss: exception detecting high-contrast mode, document is likely hidden: " + e.toString());
			return false;
		}finally{
			if(has("ie") <= 8){
				div.outerHTML = "";		// prevent mixed-content warning, see http://support.microsoft.com/kb/925014
			}else{
				win.body().removeChild(div);
			}
		}
	});

	domReady(function(){
		if(has("highcontrast")){
			domClass.add(win.body(), "dj_a11y");
		}
	});

	return has;
});

},
'dijit/_TemplatedMixin':function(){
define([
	"dojo/cache",	// dojo.cache
	"dojo/_base/declare", // declare
	"dojo/dom-construct", // domConstruct.destroy, domConstruct.toDom
	"dojo/_base/lang", // lang.getObject
	"dojo/on",
	"dojo/sniff", // has("ie")
	"dojo/string", // string.substitute string.trim
	"./_AttachMixin"
], function(cache, declare, domConstruct, lang, on, has, string, _AttachMixin){

	// module:
	//		dijit/_TemplatedMixin

	var _TemplatedMixin = declare("dijit._TemplatedMixin", _AttachMixin, {
		// summary:
		//		Mixin for widgets that are instantiated from a template

		// templateString: [protected] String
		//		A string that represents the widget template.
		//		Use in conjunction with dojo.cache() to load from a file.
		templateString: null,

		// templatePath: [protected deprecated] String
		//		Path to template (HTML file) for this widget relative to dojo.baseUrl.
		//		Deprecated: use templateString with require([... "dojo/text!..."], ...) instead
		templatePath: null,

		// skipNodeCache: [protected] Boolean
		//		If using a cached widget template nodes poses issues for a
		//		particular widget class, it can set this property to ensure
		//		that its template is always re-built from a string
		_skipNodeCache: false,

/*=====
		// _rendered: Boolean
		//		Not normally use, but this flag can be set by the app if the server has already rendered the template,
		//		i.e. already inlining the template for the widget into the main page.   Reduces _TemplatedMixin to
		//		just function like _AttachMixin.
		_rendered: false,
=====*/

		// Set _AttachMixin.searchContainerNode to true for back-compat for widgets that have data-dojo-attach-point's
		// and events inside this.containerNode.   Remove for 2.0.
		searchContainerNode: true,

		_stringRepl: function(tmpl){
			// summary:
			//		Does substitution of ${foo} type properties in template string
			// tags:
			//		private
			var className = this.declaredClass, _this = this;
			// Cache contains a string because we need to do property replacement
			// do the property replacement
			return string.substitute(tmpl, this, function(value, key){
				if(key.charAt(0) == '!'){ value = lang.getObject(key.substr(1), false, _this); }
				if(typeof value == "undefined"){ throw new Error(className+" template:"+key); } // a debugging aide
				if(value == null){ return ""; }

				// Substitution keys beginning with ! will skip the transform step,
				// in case a user wishes to insert unescaped markup, e.g. ${!foo}
				return key.charAt(0) == "!" ? value : this._escapeValue("" + value);
			}, this);
		},

		_escapeValue: function(/*String*/ val){
			// summary:
			//		Escape a value to be inserted into the template, either into an attribute value
			//		(ex: foo="${bar}") or as inner text of an element (ex: <span>${foo}</span>)

			// Safer substitution, see heading "Attribute values" in
			// http://www.w3.org/TR/REC-html40/appendix/notes.html#h-B.3.2
			// and also https://www.owasp.org/index.php/XSS_%28Cross_Site_Scripting%29_Prevention_Cheat_Sheet#RULE_.231_-_HTML_Escape_Before_Inserting_Untrusted_Data_into_HTML_Element_Content
			return val.replace(/["'<>&]/g, function(val){
				return {
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					"\"": "&quot;",
					"'": "&#x27;"
				}[val];
			});
		},

		buildRendering: function(){
			// summary:
			//		Construct the UI for this widget from a template, setting this.domNode.
			// tags:
			//		protected

			if(!this._rendered){
				if(!this.templateString){
					this.templateString = cache(this.templatePath, {sanitize: true});
				}

				// Lookup cached version of template, and download to cache if it
				// isn't there already.  Returns either a DomNode or a string, depending on
				// whether or not the template contains ${foo} replacement parameters.
				var cached = _TemplatedMixin.getCachedTemplate(this.templateString, this._skipNodeCache, this.ownerDocument);

				var node;
				if(lang.isString(cached)){
					node = domConstruct.toDom(this._stringRepl(cached), this.ownerDocument);
					if(node.nodeType != 1){
						// Flag common problems such as templates with multiple top level nodes (nodeType == 11)
						throw new Error("Invalid template: " + cached);
					}
				}else{
					// if it's a node, all we have to do is clone it
					node = cached.cloneNode(true);
				}

				this.domNode = node;
			}

			// Call down to _WidgetBase.buildRendering() to get base classes assigned
			// TODO: change the baseClass assignment to _setBaseClassAttr
			this.inherited(arguments);

			if(!this._rendered){
				this._fillContent(this.srcNodeRef);
			}

			this._rendered = true;
		},

		_fillContent: function(/*DomNode*/ source){
			// summary:
			//		Relocate source contents to templated container node.
			//		this.containerNode must be able to receive children, or exceptions will be thrown.
			// tags:
			//		protected
			var dest = this.containerNode;
			if(source && dest){
				while(source.hasChildNodes()){
					dest.appendChild(source.firstChild);
				}
			}
		}

	});

	// key is templateString; object is either string or DOM tree
	_TemplatedMixin._templateCache = {};

	_TemplatedMixin.getCachedTemplate = function(templateString, alwaysUseString, doc){
		// summary:
		//		Static method to get a template based on the templatePath or
		//		templateString key
		// templateString: String
		//		The template
		// alwaysUseString: Boolean
		//		Don't cache the DOM tree for this template, even if it doesn't have any variables
		// doc: Document?
		//		The target document.   Defaults to document global if unspecified.
		// returns: Mixed
		//		Either string (if there are ${} variables that need to be replaced) or just
		//		a DOM tree (if the node can be cloned directly)

		// is it already cached?
		var tmplts = _TemplatedMixin._templateCache;
		var key = templateString;
		var cached = tmplts[key];
		if(cached){
			try{
				// if the cached value is an innerHTML string (no ownerDocument) or a DOM tree created within the
				// current document, then use the current cached value
				if(!cached.ownerDocument || cached.ownerDocument == (doc || document)){
					// string or node of the same document
					return cached;
				}
			}catch(e){ /* squelch */ } // IE can throw an exception if cached.ownerDocument was reloaded
			domConstruct.destroy(cached);
		}

		templateString = string.trim(templateString);

		if(alwaysUseString || templateString.match(/\$\{([^\}]+)\}/g)){
			// there are variables in the template so all we can do is cache the string
			return (tmplts[key] = templateString); //String
		}else{
			// there are no variables in the template so we can cache the DOM tree
			var node = domConstruct.toDom(templateString, doc);
			if(node.nodeType != 1){
				throw new Error("Invalid template: " + templateString);
			}
			return (tmplts[key] = node); //Node
		}
	};

	if(has("ie")){
		on(window, "unload", function(){
			var cache = _TemplatedMixin._templateCache;
			for(var key in cache){
				var value = cache[key];
				if(typeof value == "object"){ // value is either a string or a DOM node template
					domConstruct.destroy(value);
				}
				delete cache[key];
			}
		});
	}

	return _TemplatedMixin;
});

},
'dojo/cache':function(){
define(["./_base/kernel", "./text"], function(dojo){
	// module:
	//		dojo/cache

	// dojo.cache is defined in dojo/text
	return dojo.cache;
});

},
'dojo/text':function(){
define(["./_base/kernel", "require", "./has", "./request"], function(dojo, require, has, request){
	// module:
	//		dojo/text

	var getText;
	if( 1 ){
		getText= function(url, sync, load){
			request(url, {sync:!!sync, headers: { 'X-Requested-With': null } }).then(load);
		};
	}else{
		// Path for node.js and rhino, to load from local file system.
		// TODO: use node.js native methods rather than depending on a require.getText() method to exist.
		if(require.getText){
			getText= require.getText;
		}else{
			 0 && console.error("dojo/text plugin failed to load because loader does not support getText");
		}
	}

	var
		theCache = {},

		strip= function(text){
			//Strips <?xml ...?> declarations so that external SVG and XML
			//documents can be added to a document without worry. Also, if the string
			//is an HTML document, only the part inside the body tag is returned.
			if(text){
				text= text.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im, "");
				var matches= text.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
				if(matches){
					text= matches[1];
				}
			}else{
				text = "";
			}
			return text;
		},

		notFound = {},

		pending = {};

	dojo.cache = function(/*String||Object*/module, /*String*/url, /*String||Object?*/value){
		// summary:
		//		A getter and setter for storing the string content associated with the
		//		module and url arguments.
		// description:
		//		If module is a string that contains slashes, then it is interpretted as a fully
		//		resolved path (typically a result returned by require.toUrl), and url should not be
		//		provided. This is the preferred signature. If module is a string that does not
		//		contain slashes, then url must also be provided and module and url are used to
		//		call `dojo.moduleUrl()` to generate a module URL. This signature is deprecated.
		//		If value is specified, the cache value for the moduleUrl will be set to
		//		that value. Otherwise, dojo.cache will fetch the moduleUrl and store it
		//		in its internal cache and return that cached value for the URL. To clear
		//		a cache value pass null for value. Since XMLHttpRequest (XHR) is used to fetch the
		//		the URL contents, only modules on the same domain of the page can use this capability.
		//		The build system can inline the cache values though, to allow for xdomain hosting.
		// module: String||Object
		//		If a String with slashes, a fully resolved path; if a String without slashes, the
		//		module name to use for the base part of the URL, similar to module argument
		//		to `dojo.moduleUrl`. If an Object, something that has a .toString() method that
		//		generates a valid path for the cache item. For example, a dojo._Url object.
		// url: String
		//		The rest of the path to append to the path derived from the module argument. If
		//		module is an object, then this second argument should be the "value" argument instead.
		// value: String||Object?
		//		If a String, the value to use in the cache for the module/url combination.
		//		If an Object, it can have two properties: value and sanitize. The value property
		//		should be the value to use in the cache, and sanitize can be set to true or false,
		//		to indicate if XML declarations should be removed from the value and if the HTML
		//		inside a body tag in the value should be extracted as the real value. The value argument
		//		or the value property on the value argument are usually only used by the build system
		//		as it inlines cache content.
		// example:
		//		To ask dojo.cache to fetch content and store it in the cache (the dojo["cache"] style
		//		of call is used to avoid an issue with the build system erroneously trying to intern
		//		this example. To get the build system to intern your dojo.cache calls, use the
		//		"dojo.cache" style of call):
		//		| //If template.html contains "<h1>Hello</h1>" that will be
		//		| //the value for the text variable.
		//		| //Note: This is pre-AMD, deprecated syntax
		//		| var text = dojo["cache"]("my.module", "template.html");
		// example:
		//		To ask dojo.cache to fetch content and store it in the cache, and sanitize the input
		//		 (the dojo["cache"] style of call is used to avoid an issue with the build system
		//		erroneously trying to intern this example. To get the build system to intern your
		//		dojo.cache calls, use the "dojo.cache" style of call):
		//		| //If template.html contains "<html><body><h1>Hello</h1></body></html>", the
		//		| //text variable will contain just "<h1>Hello</h1>".
		//		| //Note: This is pre-AMD, deprecated syntax
		//		| var text = dojo["cache"]("my.module", "template.html", {sanitize: true});
		// example:
		//		Same example as previous, but demonstrates how an object can be passed in as
		//		the first argument, then the value argument can then be the second argument.
		//		| //If template.html contains "<html><body><h1>Hello</h1></body></html>", the
		//		| //text variable will contain just "<h1>Hello</h1>".
		//		| //Note: This is pre-AMD, deprecated syntax
		//		| var text = dojo["cache"](new dojo._Url("my/module/template.html"), {sanitize: true});

		//	 * (string string [value]) => (module, url, value)
		//	 * (object [value])        => (module, value), url defaults to ""
		//
		//	 * if module is an object, then it must be convertable to a string
		//	 * (module, url) module + (url ? ("/" + url) : "") must be a legal argument to require.toUrl
		//	 * value may be a string or an object; if an object then may have the properties "value" and/or "sanitize"
		var key;
		if(typeof module=="string"){
			if(/\//.test(module)){
				// module is a version 1.7+ resolved path
				key = module;
				value = url;
			}else{
				// module is a version 1.6- argument to dojo.moduleUrl
				key = require.toUrl(module.replace(/\./g, "/") + (url ? ("/" + url) : ""));
			}
		}else{
			key = module + "";
			value = url;
		}
		var
			val = (value != undefined && typeof value != "string") ? value.value : value,
			sanitize = value && value.sanitize;

		if(typeof val == "string"){
			//We have a string, set cache value
			theCache[key] = val;
			return sanitize ? strip(val) : val;
		}else if(val === null){
			//Remove cached value
			delete theCache[key];
			return null;
		}else{
			//Allow cache values to be empty strings. If key property does
			//not exist, fetch it.
			if(!(key in theCache)){
				getText(key, true, function(text){
					theCache[key]= text;
				});
			}
			return sanitize ? strip(theCache[key]) : theCache[key];
		}
	};

	return {
		// summary:
		//		This module implements the dojo/text! plugin and the dojo.cache API.
		// description:
		//		We choose to include our own plugin to leverage functionality already contained in dojo
		//		and thereby reduce the size of the plugin compared to various foreign loader implementations.
		//		Also, this allows foreign AMD loaders to be used without their plugins.
		//
		//		CAUTION: this module is designed to optionally function synchronously to support the dojo v1.x synchronous
		//		loader. This feature is outside the scope of the CommonJS plugins specification.

		// the dojo/text caches it's own resources because of dojo.cache
		dynamic: true,

		normalize: function(id, toAbsMid){
			// id is something like (path may be relative):
			//
			//	 "path/to/text.html"
			//	 "path/to/text.html!strip"
			var parts= id.split("!"),
				url= parts[0];
			return (/^\./.test(url) ? toAbsMid(url) : url) + (parts[1] ? "!" + parts[1] : "");
		},

		load: function(id, require, load){
			// id: String
			//		Path to the resource.
			// require: Function
			//		Object that include the function toUrl with given id returns a valid URL from which to load the text.
			// load: Function
			//		Callback function which will be called, when the loading finished.

			// id is something like (path is always absolute):
			//
			//	 "path/to/text.html"
			//	 "path/to/text.html!strip"
			var
				parts= id.split("!"),
				stripFlag= parts.length>1,
				absMid= parts[0],
				url = require.toUrl(parts[0]),
				requireCacheUrl = "url:" + url,
				text = notFound,
				finish = function(text){
					load(stripFlag ? strip(text) : text);
				};
			if(absMid in theCache){
				text = theCache[absMid];
			}else if(require.cache && requireCacheUrl in require.cache){
				text = require.cache[requireCacheUrl];
			}else if(url in theCache){
				text = theCache[url];
			}
			if(text===notFound){
				if(pending[url]){
					pending[url].push(finish);
				}else{
					var pendingList = pending[url] = [finish];
					getText(url, !require.async, function(text){
						theCache[absMid]= theCache[url]= text;
						for(var i = 0; i<pendingList.length;){
							pendingList[i++](text);
						}
						delete pending[url];
					});
				}
			}else{
				finish(text);
			}
		}
	};

});


},
'dojo/string':function(){
define([
	"./_base/kernel",	// kernel.global
	"./_base/lang"
], function(kernel, lang){

// module:
//		dojo/string
var ESCAPE_REGEXP = /[&<>'"\/]/g;
var ESCAPE_MAP = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#x27;',
	'/': '&#x2F;'
};
var string = {
	// summary:
	//		String utilities for Dojo
};
lang.setObject("dojo.string", string);

string.escape = function(/*String*/str){
	// summary:
	//		Efficiently escape a string for insertion into HTML (innerHTML or attributes), replacing &, <, >, ", ', and / characters.
	// str:
	//		the string to escape
	if(!str){ return ""; }
	return str.replace(ESCAPE_REGEXP, function(c) {
		return ESCAPE_MAP[c];
	});
};

string.rep = function(/*String*/str, /*Integer*/num){
	// summary:
	//		Efficiently replicate a string `n` times.
	// str:
	//		the string to replicate
	// num:
	//		number of times to replicate the string

	if(num <= 0 || !str){ return ""; }

	var buf = [];
	for(;;){
		if(num & 1){
			buf.push(str);
		}
		if(!(num >>= 1)){ break; }
		str += str;
	}
	return buf.join("");	// String
};

string.pad = function(/*String*/text, /*Integer*/size, /*String?*/ch, /*Boolean?*/end){
	// summary:
	//		Pad a string to guarantee that it is at least `size` length by
	//		filling with the character `ch` at either the start or end of the
	//		string. Pads at the start, by default.
	// text:
	//		the string to pad
	// size:
	//		length to provide padding
	// ch:
	//		character to pad, defaults to '0'
	// end:
	//		adds padding at the end if true, otherwise pads at start
	// example:
	//	|	// Fill the string to length 10 with "+" characters on the right.  Yields "Dojo++++++".
	//	|	string.pad("Dojo", 10, "+", true);

	if(!ch){
		ch = '0';
	}
	var out = String(text),
		pad = string.rep(ch, Math.ceil((size - out.length) / ch.length));
	return end ? out + pad : pad + out;	// String
};

string.substitute = function(	/*String*/		template,
									/*Object|Array*/map,
									/*Function?*/	transform,
									/*Object?*/		thisObject){
	// summary:
	//		Performs parameterized substitutions on a string. Throws an
	//		exception if any parameter is unmatched.
	// template:
	//		a string with expressions in the form `${key}` to be replaced or
	//		`${key:format}` which specifies a format function. keys are case-sensitive.
	// map:
	//		hash to search for substitutions
	// transform:
	//		a function to process all parameters before substitution takes
	//		place, e.g. mylib.encodeXML
	// thisObject:
	//		where to look for optional format function; default to the global
	//		namespace
	// example:
	//		Substitutes two expressions in a string from an Array or Object
	//	|	// returns "File 'foo.html' is not found in directory '/temp'."
	//	|	// by providing substitution data in an Array
	//	|	string.substitute(
	//	|		"File '${0}' is not found in directory '${1}'.",
	//	|		["foo.html","/temp"]
	//	|	);
	//	|
	//	|	// also returns "File 'foo.html' is not found in directory '/temp'."
	//	|	// but provides substitution data in an Object structure.  Dotted
	//	|	// notation may be used to traverse the structure.
	//	|	string.substitute(
	//	|		"File '${name}' is not found in directory '${info.dir}'.",
	//	|		{ name: "foo.html", info: { dir: "/temp" } }
	//	|	);
	// example:
	//		Use a transform function to modify the values:
	//	|	// returns "file 'foo.html' is not found in directory '/temp'."
	//	|	string.substitute(
	//	|		"${0} is not found in ${1}.",
	//	|		["foo.html","/temp"],
	//	|		function(str){
	//	|			// try to figure out the type
	//	|			var prefix = (str.charAt(0) == "/") ? "directory": "file";
	//	|			return prefix + " '" + str + "'";
	//	|		}
	//	|	);
	// example:
	//		Use a formatter
	//	|	// returns "thinger -- howdy"
	//	|	string.substitute(
	//	|		"${0:postfix}", ["thinger"], null, {
	//	|			postfix: function(value, key){
	//	|				return value + " -- howdy";
	//	|			}
	//	|		}
	//	|	);

	thisObject = thisObject || kernel.global;
	transform = transform ?
		lang.hitch(thisObject, transform) : function(v){ return v; };

	return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,
		function(match, key, format){
			var value = lang.getObject(key, false, map);
			if(format){
				value = lang.getObject(format, false, thisObject).call(thisObject, value, key);
			}
			return transform(value, key).toString();
		}); // String
};

string.trim = String.prototype.trim ?
	lang.trim : // aliasing to the native function
	function(str){
		str = str.replace(/^\s+/, '');
		for(var i = str.length - 1; i >= 0; i--){
			if(/\S/.test(str.charAt(i))){
				str = str.substring(0, i + 1);
				break;
			}
		}
		return str;
	};

/*=====
 string.trim = function(str){
	 // summary:
	 //		Trims whitespace from both sides of the string
	 // str: String
	 //		String to be trimmed
	 // returns: String
	 //		Returns the trimmed string
	 // description:
	 //		This version of trim() was taken from [Steven Levithan's blog](http://blog.stevenlevithan.com/archives/faster-trim-javascript).
	 //		The short yet performant version of this function is dojo/_base/lang.trim(),
	 //		which is part of Dojo base.  Uses String.prototype.trim instead, if available.
	 return "";	// String
 };
 =====*/

	return string;
});

},
'dijit/_AttachMixin':function(){
define([
	"require",
	"dojo/_base/array", // array.forEach
	"dojo/_base/connect",	// remove for 2.0
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.getObject
	"dojo/mouse",
	"dojo/on",
	"dojo/touch",
	"./_WidgetBase"
], function(require, array, connect, declare, lang, mouse, on, touch, _WidgetBase){

	// module:
	//		dijit/_AttachMixin

	// Map from string name like "mouseenter" to synthetic event like mouse.enter
	var synthEvents = lang.delegate(touch, {
		"mouseenter": mouse.enter,
		"mouseleave": mouse.leave,
		"keypress": connect._keypress	// remove for 2.0
	});

	// To be lightweight, _AttachMixin doesn't require() dijit/a11yclick.
	// If the subclass has a template using "ondijitclick", it must load dijit/a11yclick itself.
	// In that case, the a11yclick variable below will get set to point to that synthetic event.
	var a11yclick;

	var _AttachMixin = declare("dijit._AttachMixin", null, {
		// summary:
		//		Mixin for widgets to attach to dom nodes and setup events via
		//		convenient data-dojo-attach-point and data-dojo-attach-event DOM attributes.
		//
		//		Superclass of _TemplatedMixin, and can also be used standalone when templates are pre-rendered on the
		//		server.
		//
		//		Does not [yet] handle widgets like ContentPane with this.containerNode set.   It should skip
		//		scanning for data-dojo-attach-point and data-dojo-attach-event inside this.containerNode, but it
		//		doesn't.

/*=====
		// _attachPoints: [private] String[]
		//		List of widget attribute names associated with data-dojo-attach-point=... in the
		//		template, ex: ["containerNode", "labelNode"]
		_attachPoints: [],

		// _attachEvents: [private] Handle[]
		//		List of connections associated with data-dojo-attach-event=... in the
		//		template
		_attachEvents: [],

		// attachScope: [public] Object
		//		Object to which attach points and events will be scoped.  Defaults
		//		to 'this'.
		attachScope: undefined,

		// searchContainerNode: [protected] Boolean
		//		Search descendants of this.containerNode for data-dojo-attach-point and data-dojo-attach-event.
		//		Should generally be left false (the default value) both for performance and to avoid failures when
		//		this.containerNode holds other _AttachMixin instances with their own attach points and events.
 		searchContainerNode: false,
 =====*/

		constructor: function(/*===== params, srcNodeRef =====*/){
			// summary:
			//		Create the widget.
			// params: Object|null
			//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
			//		and functions, typically callbacks like onClick.
			//		The hash can contain any of the widget's properties, excluding read-only properties.
			// srcNodeRef: DOMNode|String?
			//		If a srcNodeRef (DOM node) is specified, replace srcNodeRef with my generated DOM tree.

			this._attachPoints = [];
			this._attachEvents = [];
		},


		buildRendering: function(){
			// summary:
			//		Attach to DOM nodes marked with special attributes.
			// tags:
			//		protected

			this.inherited(arguments);

			// recurse through the node, looking for, and attaching to, our
			// attachment points and events, which should be defined on the template node.
			this._attachTemplateNodes(this.domNode);

			this._beforeFillContent();		// hook for _WidgetsInTemplateMixin
		},

		_beforeFillContent: function(){
		},

		_attachTemplateNodes: function(rootNode){
			// summary:
			//		Iterate through the dom nodes and attach functions and nodes accordingly.
			// description:
			//		Map widget properties and functions to the handlers specified in
			//		the dom node and it's descendants. This function iterates over all
			//		nodes and looks for these properties:
			//
			//		- dojoAttachPoint/data-dojo-attach-point
			//		- dojoAttachEvent/data-dojo-attach-event
			// rootNode: DomNode
			//		The node to search for properties. All descendants will be searched.
			// tags:
			//		private

			// DFS to process all nodes except those inside of this.containerNode
			var node = rootNode;
			while(true){
				if(node.nodeType == 1 && (this._processTemplateNode(node, function(n,p){ return n.getAttribute(p); },
						this._attach) || this.searchContainerNode) && node.firstChild){
					node = node.firstChild;
				}else{
					if(node == rootNode){ return; }
					while(!node.nextSibling){
						node = node.parentNode;
						if(node == rootNode){ return; }
					}
					node = node.nextSibling;
				}
			}
		},

		_processTemplateNode: function(/*DOMNode|Widget*/ baseNode, getAttrFunc, attachFunc){
			// summary:
			//		Process data-dojo-attach-point and data-dojo-attach-event for given node or widget.
			//		Returns true if caller should process baseNode's children too.

			var ret = true;

			// Process data-dojo-attach-point
			var _attachScope = this.attachScope || this,
				attachPoint = getAttrFunc(baseNode, "dojoAttachPoint") || getAttrFunc(baseNode, "data-dojo-attach-point");
			if(attachPoint){
				var point, points = attachPoint.split(/\s*,\s*/);
				while((point = points.shift())){
					if(lang.isArray(_attachScope[point])){
						_attachScope[point].push(baseNode);
					}else{
						_attachScope[point] = baseNode;
					}
					ret = (point != "containerNode");
					this._attachPoints.push(point);
				}
			}

			// Process data-dojo-attach-event
			var attachEvent = getAttrFunc(baseNode, "dojoAttachEvent") || getAttrFunc(baseNode, "data-dojo-attach-event");
			if(attachEvent){
				// NOTE: we want to support attributes that have the form
				// "domEvent: nativeEvent; ..."
				var event, events = attachEvent.split(/\s*,\s*/);
				var trim = lang.trim;
				while((event = events.shift())){
					if(event){
						var thisFunc = null;
						if(event.indexOf(":") != -1){
							// oh, if only JS had tuple assignment
							var funcNameArr = event.split(":");
							event = trim(funcNameArr[0]);
							thisFunc = trim(funcNameArr[1]);
						}else{
							event = trim(event);
						}
						if(!thisFunc){
							thisFunc = event;
						}

						this._attachEvents.push(attachFunc(baseNode, event, lang.hitch(_attachScope, thisFunc)));
					}
				}
			}

			return ret;
		},

		_attach: function(node, type, func){
			// summary:
			//		Roughly corresponding to dojo/on, this is the default function for processing a
			//		data-dojo-attach-event.  Meant to attach to DOMNodes, not to widgets.
			// node: DOMNode
			//		The node to setup a listener on.
			// type: String
			//		Event name like "click".
			// getAttrFunc: Function
			//		Function to get the specified property for a given DomNode/Widget.
			// attachFunc: Function?
			//		Attaches an event handler from the specified node/widget to specified function.

			// Map special type names like "mouseenter" to synthetic events.
			// Subclasses are responsible to require() dijit/a11yclick if they want to use it.
			type = type.replace(/^on/, "").toLowerCase();
			if(type == "dijitclick"){
				type = a11yclick || (a11yclick = require("./a11yclick"));
			}else{
				type = synthEvents[type] || type;
			}

			return on(node, type, func);
		},

		_detachTemplateNodes: function() {
			// summary:
			//		Detach and clean up the attachments made in _attachtempalteNodes.

			// Delete all attach points to prevent IE6 memory leaks.
			var _attachScope = this.attachScope || this;
			array.forEach(this._attachPoints, function(point){
				delete _attachScope[point];
			});
			this._attachPoints = [];

			// And same for event handlers
			array.forEach(this._attachEvents, function(handle){ handle.remove(); });
			this._attachEvents = [];
		},

		destroyRendering: function(){
			this._detachTemplateNodes();
			this.inherited(arguments);
		}
	});

	// These arguments can be specified for widgets which are used in templates.
	// Since any widget can be specified as sub widgets in template, mix it
	// into the base widget class.  (This is a hack, but it's effective.).
	// Remove for 2.0.   Also, hide from API doc parser.
	lang.extend(_WidgetBase, /*===== {} || =====*/ {
		dojoAttachEvent: "",
		dojoAttachPoint: ""
	});
	
	return _AttachMixin;
});

},
'dijit/_CssStateMixin':function(){
define([
	"dojo/_base/array", // array.forEach array.map
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.isDescendant()
	"dojo/dom-class", // domClass.toggle
	"dojo/has",
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"dojo/domReady",
	"dojo/touch",
	"dojo/_base/window", // win.body
	"./a11yclick",
	"./registry"
], function(array, declare, dom, domClass, has, lang, on, domReady, touch, win, a11yclick, registry){

	// module:
	//		dijit/_CssStateMixin

	var CssStateMixin = declare("dijit._CssStateMixin", [], {
		// summary:
		//		Mixin for widgets to set CSS classes on the widget DOM nodes depending on hover/mouse press/focus
		//		state changes, and also higher-level state changes such becoming disabled or selected.
		//
		// description:
		//		By mixing this class into your widget, and setting the this.baseClass attribute, it will automatically
		//		maintain CSS classes on the widget root node (this.domNode) depending on hover,
		//		active, focus, etc. state.   Ex: with a baseClass of dijitButton, it will apply the classes
		//		dijitButtonHovered and dijitButtonActive, as the user moves the mouse over the widget and clicks it.
		//
		//		It also sets CSS like dijitButtonDisabled based on widget semantic state.
		//
		//		By setting the cssStateNodes attribute, a widget can also track events on subnodes (like buttons
		//		within the widget).

		/*=====
		 // cssStateNodes: [protected] Object
		 //		Subclasses may define a cssStateNodes property that lists sub-nodes within the widget that
		 //		need CSS classes applied on mouse hover/press and focus.
		 //
		 //		Each entry in this optional hash is a an attach-point name (like "upArrowButton") mapped to a CSS class name
		 //		(like "dijitUpArrowButton"). Example:
		 //	|		{
		 //	|			"upArrowButton": "dijitUpArrowButton",
		 //	|			"downArrowButton": "dijitDownArrowButton"
		 //	|		}
		 //		The above will set the CSS class dijitUpArrowButton to the this.upArrowButton DOMNode when it
		 //		is hovered, etc.
		 cssStateNodes: {},
		 =====*/

		// hovering: [readonly] Boolean
		//		True if cursor is over this widget
		hovering: false,

		// active: [readonly] Boolean
		//		True if mouse was pressed while over this widget, and hasn't been released yet
		active: false,

		_applyAttributes: function(){
			// This code would typically be in postCreate(), but putting in _applyAttributes() for
			// performance: so the class changes happen before DOM is inserted into the document.
			// Change back to postCreate() in 2.0.  See #11635.

			this.inherited(arguments);

			// Monitoring changes to disabled, readonly, etc. state, and update CSS class of root node
			array.forEach(["disabled", "readOnly", "checked", "selected", "focused", "state", "hovering", "active", "_opened"], function(attr){
				this.watch(attr, lang.hitch(this, "_setStateClass"));
			}, this);

			// Track hover and active mouse events on widget root node, plus possibly on subnodes
			for(var ap in this.cssStateNodes || {}){
				this._trackMouseState(this[ap], this.cssStateNodes[ap]);
			}
			this._trackMouseState(this.domNode, this.baseClass);

			// Set state initially; there's probably no hover/active/focus state but widget might be
			// disabled/readonly/checked/selected so we want to set CSS classes for those conditions.
			this._setStateClass();
		},

		_cssMouseEvent: function(/*Event*/ event){
			// summary:
			//		Handler for CSS event on this.domNode. Sets hovering and active properties depending on mouse state,
			//		which triggers _setStateClass() to set appropriate CSS classes for this.domNode.

			if(!this.disabled){
				switch(event.type){
					case "mouseover":
					case "MSPointerOver":
					case "pointerover":
						this._set("hovering", true);
						this._set("active", this._mouseDown);
						break;
					case "mouseout":
					case "MSPointerOut":
					case "pointerout":
						this._set("hovering", false);
						this._set("active", false);
						break;
					case "mousedown":
					case "touchstart":
					case "MSPointerDown":
					case "pointerdown":
					case "keydown":
						this._set("active", true);
						break;
					case "mouseup":
					case "dojotouchend":
					case "MSPointerUp":
					case "pointerup":
					case "keyup":
						this._set("active", false);
						break;
				}
			}
		},

		_setStateClass: function(){
			// summary:
			//		Update the visual state of the widget by setting the css classes on this.domNode
			//		(or this.stateNode if defined) by combining this.baseClass with
			//		various suffixes that represent the current widget state(s).
			//
			// description:
			//		In the case where a widget has multiple
			//		states, it sets the class based on all possible
			//		combinations.  For example, an invalid form widget that is being hovered
			//		will be "dijitInput dijitInputInvalid dijitInputHover dijitInputInvalidHover".
			//
			//		The widget may have one or more of the following states, determined
			//		by this.state, this.checked, this.valid, and this.selected:
			//
			//		- Error - ValidationTextBox sets this.state to "Error" if the current input value is invalid
			//		- Incomplete - ValidationTextBox sets this.state to "Incomplete" if the current input value is not finished yet
			//		- Checked - ex: a checkmark or a ToggleButton in a checked state, will have this.checked==true
			//		- Selected - ex: currently selected tab will have this.selected==true
			//
			//		In addition, it may have one or more of the following states,
			//		based on this.disabled and flags set in _onMouse (this.active, this.hovering) and from focus manager (this.focused):
			//
			//		- Disabled	- if the widget is disabled
			//		- Active		- if the mouse (or space/enter key?) is being pressed down
			//		- Focused		- if the widget has focus
			//		- Hover		- if the mouse is over the widget

			// Compute new set of classes
			var newStateClasses = this.baseClass.split(" ");

			function multiply(modifier){
				newStateClasses = newStateClasses.concat(array.map(newStateClasses, function(c){
					return c + modifier;
				}), "dijit" + modifier);
			}

			if(!this.isLeftToRight()){
				// For RTL mode we need to set an addition class like dijitTextBoxRtl.
				multiply("Rtl");
			}

			var checkedState = this.checked == "mixed" ? "Mixed" : (this.checked ? "Checked" : "");
			if(this.checked){
				multiply(checkedState);
			}
			if(this.state){
				multiply(this.state);
			}
			if(this.selected){
				multiply("Selected");
			}
			if(this._opened){
				multiply("Opened");
			}

			if(this.disabled){
				multiply("Disabled");
			}else if(this.readOnly){
				multiply("ReadOnly");
			}else{
				if(this.active){
					multiply("Active");
				}else if(this.hovering){
					multiply("Hover");
				}
			}

			if(this.focused){
				multiply("Focused");
			}

			// Remove old state classes and add new ones.
			// For performance concerns we only write into domNode.className once.
			var tn = this.stateNode || this.domNode,
				classHash = {};	// set of all classes (state and otherwise) for node

			array.forEach(tn.className.split(" "), function(c){
				classHash[c] = true;
			});

			if("_stateClasses" in this){
				array.forEach(this._stateClasses, function(c){
					delete classHash[c];
				});
			}

			array.forEach(newStateClasses, function(c){
				classHash[c] = true;
			});

			var newClasses = [];
			for(var c in classHash){
				newClasses.push(c);
			}
			tn.className = newClasses.join(" ");

			this._stateClasses = newStateClasses;
		},

		_subnodeCssMouseEvent: function(node, clazz, evt){
			// summary:
			//		Handler for hover/active mouse event on widget's subnode
			if(this.disabled || this.readOnly){
				return;
			}

			function hover(isHovering){
				domClass.toggle(node, clazz + "Hover", isHovering);
			}

			function active(isActive){
				domClass.toggle(node, clazz + "Active", isActive);
			}

			function focused(isFocused){
				domClass.toggle(node, clazz + "Focused", isFocused);
			}

			switch(evt.type){
				case "mouseover":
				case "MSPointerOver":
				case "pointerover":
					hover(true);
					break;
				case "mouseout":
				case "MSPointerOut":
				case "pointerout":
					hover(false);
					active(false);
					break;
				case "mousedown":
				case "touchstart":
				case "MSPointerDown":
				case "pointerdown":
				case "keydown":
					active(true);
					break;
				case "mouseup":
				case "MSPointerUp":
				case "pointerup":
				case "dojotouchend":
				case "keyup":
					active(false);
					break;
				case "focus":
				case "focusin":
					focused(true);
					break;
				case "blur":
				case "focusout":
					focused(false);
					break;
			}
		},

		_trackMouseState: function(/*DomNode*/ node, /*String*/ clazz){
			// summary:
			//		Track mouse/focus events on specified node and set CSS class on that node to indicate
			//		current state.   Usually not called directly, but via cssStateNodes attribute.
			// description:
			//		Given class=foo, will set the following CSS class on the node
			//
			//		- fooActive: if the user is currently pressing down the mouse button while over the node
			//		- fooHover: if the user is hovering the mouse over the node, but not pressing down a button
			//		- fooFocus: if the node is focused
			//
			//		Note that it won't set any classes if the widget is disabled.
			// node: DomNode
			//		Should be a sub-node of the widget, not the top node (this.domNode), since the top node
			//		is handled specially and automatically just by mixing in this class.
			// clazz: String
			//		CSS class name (ex: dijitSliderUpArrow)

			// Flag for listener code below to call this._cssMouseEvent() or this._subnodeCssMouseEvent()
			// when node is hovered/active
			node._cssState = clazz;
		}
	});

	domReady(function(){
		// Document level listener to catch hover etc. events on widget root nodes and subnodes.
		// Note that when the mouse is moved quickly, a single onmouseenter event could signal that multiple widgets
		// have been hovered or unhovered (try test_Accordion.html)

		function pointerHandler(evt, target, relatedTarget){
			// Handler for mouseover, mouseout, a11yclick.press and a11click.release events

			// Poor man's event propagation.  Don't propagate event to ancestors of evt.relatedTarget,
			// to avoid processing mouseout events moving from a widget's domNode to a descendant node;
			// such events shouldn't be interpreted as a mouseleave on the widget.
			if(relatedTarget && dom.isDescendant(relatedTarget, target)){
				return;
			}

			for(var node = target; node && node != relatedTarget; node = node.parentNode){
				// Process any nodes with _cssState property.   They are generally widget root nodes,
				// but could also be sub-nodes within a widget
				if(node._cssState){
					var widget = registry.getEnclosingWidget(node);
					if(widget){
						if(node == widget.domNode){
							// event on the widget's root node
							widget._cssMouseEvent(evt);
						}else{
							// event on widget's sub-node
							widget._subnodeCssMouseEvent(node, node._cssState, evt);
						}
					}
				}
			}
		}

		var body = win.body(), activeNode;

		// Handle pointer related events (i.e. mouse or touch)
		on(body, touch.over, function(evt){
			// Using touch.over rather than mouseover mainly to ignore phantom mouse events on iOS.
			pointerHandler(evt, evt.target, evt.relatedTarget);
		});
		on(body, touch.out, function(evt){
			// Using touch.out rather than mouseout mainly to ignore phantom mouse events on iOS.
			pointerHandler(evt, evt.target, evt.relatedTarget);
		});
		on(body, a11yclick.press, function(evt){
			// Save the a11yclick.press target to reference when the a11yclick.release comes.
			activeNode = evt.target;
			pointerHandler(evt, activeNode)
		});
		on(body, a11yclick.release, function(evt){
			// The release event could come on a separate node than the press event, if for example user slid finger.
			// Reference activeNode to reset the state of the node that got state set in the a11yclick.press handler.
			pointerHandler(evt, activeNode);
			activeNode = null;
		});

		// Track focus events on widget sub-nodes that have been registered via _trackMouseState().
		// However, don't track focus events on the widget root nodes, because focus is tracked via the
		// focus manager (and it's not really tracking focus, but rather tracking that focus is on one of the widget's
		// nodes or a subwidget's node or a popup node, etc.)
		// Remove for 2.0 (if focus CSS needed, just use :focus pseudo-selector).
		on(body, "focusin, focusout", function(evt){
			var node = evt.target;
			if(node._cssState && !node.getAttribute("widgetId")){
				var widget = registry.getEnclosingWidget(node);
				if(widget){
					widget._subnodeCssMouseEvent(node, node._cssState, evt);
				}
			}
		});
	});

	return CssStateMixin;
});

},
'dijit/form/_FormMixin':function(){
define([
	"dojo/_base/array", // array.every array.filter array.forEach array.indexOf array.map
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.hitch lang.isArray
	"dojo/on",
	"dojo/window" // winUtils.scrollIntoView
], function(array, declare, kernel, lang, on, winUtils){

	// module:
	//		dijit/form/_FormMixin

	return declare("dijit.form._FormMixin", null, {
		// summary:
		//		Mixin for containers of form widgets (i.e. widgets that represent a single value
		//		and can be children of a `<form>` node or `dijit/form/Form` widget)
		// description:
		//		Can extract all the form widgets
		//		values and combine them into a single javascript object, or alternately
		//		take such an object and set the values for all the contained
		//		form widgets

	/*=====
		// value: Object
		//		Name/value hash for each child widget with a name and value.
		//		Child widgets without names are not part of the hash.
		//
		//		If there are multiple child widgets w/the same name, value is an array,
		//		unless they are radio buttons in which case value is a scalar (since only
		//		one radio button can be checked at a time).
		//
		//		If a child widget's name is a dot separated list (like a.b.c.d), it's a nested structure.
		//
		//		Example:
		//	|	{ name: "John Smith", interests: ["sports", "movies"] }
	=====*/

		// state: [readonly] String
		//		Will be "Error" if one or more of the child widgets has an invalid value,
		//		"Incomplete" if not all of the required child widgets are filled in.  Otherwise, "",
		//		which indicates that the form is ready to be submitted.
		state: "",

		// TODO:
		//	* Repeater
		//	* better handling for arrays.  Often form elements have names with [] like
		//	* people[3].sex (for a list of people [{name: Bill, sex: M}, ...])


		_getDescendantFormWidgets: function(/*dijit/_WidgetBase[]?*/ children){
			// summary:
			//		Returns all form widget descendants, searching through non-form child widgets like BorderContainer
			var res = [];
			array.forEach(children || this.getChildren(), function(child){
				if("value" in child){
					res.push(child);
				}else{
					res = res.concat(this._getDescendantFormWidgets(child.getChildren()));
				}
			}, this);
			return res;
		},

		reset: function(){
			array.forEach(this._getDescendantFormWidgets(), function(widget){
				if(widget.reset){
					widget.reset();
				}
			});
		},

		validate: function(){
			// summary:
			//		returns if the form is valid - same as isValid - but
			//		provides a few additional (ui-specific) features:
			//
			//		1. it will highlight any sub-widgets that are not valid
			//		2. it will call focus() on the first invalid sub-widget
			var didFocus = false;
			return array.every(array.map(this._getDescendantFormWidgets(), function(widget){
				// Need to set this so that "required" widgets get their
				// state set.
				widget._hasBeenBlurred = true;
				var valid = widget.disabled || !widget.validate || widget.validate();
				if(!valid && !didFocus){
					// Set focus of the first non-valid widget
					winUtils.scrollIntoView(widget.containerNode || widget.domNode);
					widget.focus();
					didFocus = true;
				}
				return valid;
			}), function(item){ return item; });
		},

		setValues: function(val){
			kernel.deprecated(this.declaredClass+"::setValues() is deprecated. Use set('value', val) instead.", "", "2.0");
			return this.set('value', val);
		},
		_setValueAttr: function(/*Object*/ obj){
			// summary:
			//		Fill in form values from according to an Object (in the format returned by get('value'))

			// generate map from name --> [list of widgets with that name]
			var map = { };
			array.forEach(this._getDescendantFormWidgets(), function(widget){
				if(!widget.name){ return; }
				var entry = map[widget.name] || (map[widget.name] = [] );
				entry.push(widget);
			});

			for(var name in map){
				if(!map.hasOwnProperty(name)){
					continue;
				}
				var widgets = map[name],						// array of widgets w/this name
					values = lang.getObject(name, false, obj);	// list of values for those widgets

				if(values === undefined){
					continue;
				}
				values = [].concat(values);
				if(typeof widgets[0].checked == 'boolean'){
					// for checkbox/radio, values is a list of which widgets should be checked
					array.forEach(widgets, function(w){
						w.set('value', array.indexOf(values, w._get('value')) != -1);
					});
				}else if(widgets[0].multiple){
					// it takes an array (e.g. multi-select)
					widgets[0].set('value', values);
				}else{
					// otherwise, values is a list of values to be assigned sequentially to each widget
					array.forEach(widgets, function(w, i){
						w.set('value', values[i]);
					});
				}
			}

			/***
			 *	TODO: code for plain input boxes (this shouldn't run for inputs that are part of widgets)

			array.forEach(this.containerNode.elements, function(element){
				if(element.name == ''){return};	// like "continue"
				var namePath = element.name.split(".");
				var myObj=obj;
				var name=namePath[namePath.length-1];
				for(var j=1,len2=namePath.length;j<len2;++j){
					var p=namePath[j - 1];
					// repeater support block
					var nameA=p.split("[");
					if(nameA.length > 1){
						if(typeof(myObj[nameA[0]]) == "undefined"){
							myObj[nameA[0]]=[ ];
						} // if

						nameIndex=parseInt(nameA[1]);
						if(typeof(myObj[nameA[0]][nameIndex]) == "undefined"){
							myObj[nameA[0]][nameIndex] = { };
						}
						myObj=myObj[nameA[0]][nameIndex];
						continue;
					} // repeater support ends

					if(typeof(myObj[p]) == "undefined"){
						myObj=undefined;
						break;
					};
					myObj=myObj[p];
				}

				if(typeof(myObj) == "undefined"){
					return;		// like "continue"
				}
				if(typeof(myObj[name]) == "undefined" && this.ignoreNullValues){
					return;		// like "continue"
				}

				// TODO: widget values (just call set('value', ...) on the widget)

				// TODO: maybe should call dojo.getNodeProp() instead
				switch(element.type){
					case "checkbox":
						element.checked = (name in myObj) &&
							array.some(myObj[name], function(val){ return val == element.value; });
						break;
					case "radio":
						element.checked = (name in myObj) && myObj[name] == element.value;
						break;
					case "select-multiple":
						element.selectedIndex=-1;
						array.forEach(element.options, function(option){
							option.selected = array.some(myObj[name], function(val){ return option.value == val; });
						});
						break;
					case "select-one":
						element.selectedIndex="0";
						array.forEach(element.options, function(option){
							option.selected = option.value == myObj[name];
						});
						break;
					case "hidden":
					case "text":
					case "textarea":
					case "password":
						element.value = myObj[name] || "";
						break;
				}
			});
			*/

			// Note: no need to call this._set("value", ...) as the child updates will trigger onChange events
			// which I am monitoring.
		},

		getValues: function(){
			kernel.deprecated(this.declaredClass+"::getValues() is deprecated. Use get('value') instead.", "", "2.0");
			return this.get('value');
		},
		_getValueAttr: function(){
			// summary:
			//		Returns Object representing form values.   See description of `value` for details.
			// description:

			// The value is updated into this.value every time a child has an onChange event,
			// so in the common case this function could just return this.value.   However,
			// that wouldn't work when:
			//
			// 1. User presses return key to submit a form.  That doesn't fire an onchange event,
			// and even if it did it would come too late due to the defer(...) in _handleOnChange()
			//
			// 2. app for some reason calls this.get("value") while the user is typing into a
			// form field.   Not sure if that case needs to be supported or not.

			// get widget values
			var obj = { };
			array.forEach(this._getDescendantFormWidgets(), function(widget){
				var name = widget.name;
				if(!name || widget.disabled){ return; }

				// Single value widget (checkbox, radio, or plain <input> type widget)
				var value = widget.get('value');

				// Store widget's value(s) as a scalar, except for checkboxes which are automatically arrays
				if(typeof widget.checked == 'boolean'){
					if(/Radio/.test(widget.declaredClass)){
						// radio button
						if(value !== false){
							lang.setObject(name, value, obj);
						}else{
							// give radio widgets a default of null
							value = lang.getObject(name, false, obj);
							if(value === undefined){
								lang.setObject(name, null, obj);
							}
						}
					}else{
						// checkbox/toggle button
						var ary=lang.getObject(name, false, obj);
						if(!ary){
							ary=[];
							lang.setObject(name, ary, obj);
						}
						if(value !== false){
							ary.push(value);
						}
					}
				}else{
					var prev=lang.getObject(name, false, obj);
					if(typeof prev != "undefined"){
						if(lang.isArray(prev)){
							prev.push(value);
						}else{
							lang.setObject(name, [prev, value], obj);
						}
					}else{
						// unique name
						lang.setObject(name, value, obj);
					}
				}
			});

			/***
			 * code for plain input boxes (see also domForm.formToObject, can we use that instead of this code?
			 * but it doesn't understand [] notation, presumably)
			var obj = { };
			array.forEach(this.containerNode.elements, function(elm){
				if(!elm.name)	{
					return;		// like "continue"
				}
				var namePath = elm.name.split(".");
				var myObj=obj;
				var name=namePath[namePath.length-1];
				for(var j=1,len2=namePath.length;j<len2;++j){
					var nameIndex = null;
					var p=namePath[j - 1];
					var nameA=p.split("[");
					if(nameA.length > 1){
						if(typeof(myObj[nameA[0]]) == "undefined"){
							myObj[nameA[0]]=[ ];
						} // if
						nameIndex=parseInt(nameA[1]);
						if(typeof(myObj[nameA[0]][nameIndex]) == "undefined"){
							myObj[nameA[0]][nameIndex] = { };
						}
					}else if(typeof(myObj[nameA[0]]) == "undefined"){
						myObj[nameA[0]] = { }
					} // if

					if(nameA.length == 1){
						myObj=myObj[nameA[0]];
					}else{
						myObj=myObj[nameA[0]][nameIndex];
					} // if
				} // for

				if((elm.type != "select-multiple" && elm.type != "checkbox" && elm.type != "radio") || (elm.type == "radio" && elm.checked)){
					if(name == name.split("[")[0]){
						myObj[name]=elm.value;
					}else{
						// can not set value when there is no name
					}
				}else if(elm.type == "checkbox" && elm.checked){
					if(typeof(myObj[name]) == 'undefined'){
						myObj[name]=[ ];
					}
					myObj[name].push(elm.value);
				}else if(elm.type == "select-multiple"){
					if(typeof(myObj[name]) == 'undefined'){
						myObj[name]=[ ];
					}
					for(var jdx=0,len3=elm.options.length; jdx<len3; ++jdx){
						if(elm.options[jdx].selected){
							myObj[name].push(elm.options[jdx].value);
						}
					}
				} // if
				name=undefined;
			}); // forEach
			***/
			return obj;
		},

		isValid: function(){
			// summary:
			//		Returns true if all of the widgets are valid.
			//		Deprecated, will be removed in 2.0.  Use get("state") instead.

			return this.state == "";
		},

		onValidStateChange: function(/*Boolean*/ /*===== isValid =====*/){
			// summary:
			//		Stub function to connect to if you want to do something
			//		(like disable/enable a submit button) when the valid
			//		state changes on the form as a whole.
			//
			//		Deprecated.  Will be removed in 2.0.  Use watch("state", ...) instead.
		},

		_getState: function(){
			// summary:
			//		Compute what this.state should be based on state of children
			var states = array.map(this._descendants, function(w){
				return w.get("state") || "";
			});

			return array.indexOf(states, "Error") >= 0 ? "Error" :
				array.indexOf(states, "Incomplete") >= 0 ? "Incomplete" : "";
		},

		disconnectChildren: function(){
			// summary:
			//		Deprecated method.   Applications no longer need to call this.   Remove for 2.0.
		},

		connectChildren: function(/*Boolean*/ inStartup){
			// summary:
			//		You can call this function directly, ex. in the event that you
			//		programmatically add a widget to the form *after* the form has been
			//		initialized.

			// TODO: rename for 2.0

			this._descendants = this._getDescendantFormWidgets();

			// To get notifications from children they need to be started.   Children didn't used to need to be started,
			// so for back-compat, start them here
			array.forEach(this._descendants, function(child){
				if(!child._started){ child.startup(); }
			});

			if(!inStartup){
				this._onChildChange();
			}
		},

		_onChildChange: function(/*String*/ attr){
			// summary:
			//		Called when child's value or disabled state changes

			// The unit tests expect state update to be synchronous, so update it immediately.
			if(!attr || attr == "state" || attr == "disabled"){
				this._set("state", this._getState());
			}

			// Use defer() to collapse value changes in multiple children into a single
			// update to my value.   Multiple updates will occur on:
			//	1. Form.set()
			//	2. Form.reset()
			//	3. user selecting a radio button (which will de-select another radio button,
			//		 causing two onChange events)
			if(!attr || attr == "value" || attr == "disabled" || attr == "checked"){
				if(this._onChangeDelayTimer){
					this._onChangeDelayTimer.remove();
				}
				this._onChangeDelayTimer = this.defer(function(){
					delete this._onChangeDelayTimer;
					this._set("value", this.get("value"));
				}, 10);
			}
		},

		startup: function(){
			this.inherited(arguments);

			// Set initial this.value and this.state.   Don't emit watch() notifications.
			this._descendants = this._getDescendantFormWidgets();
			this.value = this.get("value");
			this.state = this._getState();

			// Initialize value and valid/invalid state tracking.
			var self = this;
			this.own(
				on(
					this.containerNode,
					"attrmodified-state, attrmodified-disabled, attrmodified-value, attrmodified-checked",
					function(evt){
						if(evt.target == self.domNode){
							return;	// ignore events that I fire on myself because my children changed
						}
						self._onChildChange(evt.type.replace("attrmodified-", ""));
					}
				)
			);

			// Make state change call onValidStateChange(), will be removed in 2.0
			this.watch("state", function(attr, oldVal, newVal){ this.onValidStateChange(newVal == ""); });
		},

		destroy: function(){
			this.inherited(arguments);
		}

	});
});

},
'dijit/_DialogMixin':function(){
define([
	"dojo/_base/declare", // declare
	"./a11y"	// _getTabNavigable
], function(declare, a11y){

	// module:
	//		dijit/_DialogMixin

	return declare("dijit._DialogMixin", null, {
		// summary:
		//		This provides functions useful to Dialog and TooltipDialog

		// actionBarTemplate: String
		//		HTML snippet to show the action bar (gray bar with OK/cancel buttons).
		//		Blank by default, but used by ConfirmDialog/ConfirmTooltipDialog subclasses.
		actionBarTemplate: "",

		execute: function(/*Object*/ /*===== formContents =====*/){
			// summary:
			//		Callback when the user hits the submit button.
			//		Override this method to handle Dialog execution.
			// description:
			//		After the user has pressed the submit button, the Dialog
			//		first calls onExecute() to notify the container to hide the
			//		dialog and restore focus to wherever it used to be.
			//
			//		*Then* this method is called.
			// type:
			//		callback
		},

		onCancel: function(){
			// summary:
			//		Called when user has pressed the Dialog's cancel button, to notify container.
			// description:
			//		Developer shouldn't override or connect to this method;
			//		it's a private communication device between the TooltipDialog
			//		and the thing that opened it (ex: `dijit/form/DropDownButton`)
			// type:
			//		protected
		},

		onExecute: function(){
			// summary:
			//		Called when user has pressed the dialog's OK button, to notify container.
			// description:
			//		Developer shouldn't override or connect to this method;
			//		it's a private communication device between the TooltipDialog
			//		and the thing that opened it (ex: `dijit/form/DropDownButton`)
			// type:
			//		protected
		},

		_onSubmit: function(){
			// summary:
			//		Callback when user hits submit button
			// type:
			//		protected
			this.onExecute();	// notify container that we are about to execute
			this.execute(this.get('value'));
		},

		_getFocusItems: function(){
			// summary:
			//		Finds focusable items in dialog,
			//		and sets this._firstFocusItem and this._lastFocusItem
			// tags:
			//		protected

			var elems = a11y._getTabNavigable(this.domNode);
			this._firstFocusItem = elems.lowest || elems.first || this.closeButtonNode || this.domNode;
			this._lastFocusItem = elems.last || elems.highest || this._firstFocusItem;
		}
	});
});

},
'dijit/DialogUnderlay':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.hitch
	"dojo/aspect", // aspect.after
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/on",
	"dojo/window", // winUtils.getBox, winUtils.get
	"./_Widget",
	"./_TemplatedMixin",
	"./BackgroundIframe",
	"./Viewport",
	"./main" // for back-compat, exporting dijit._underlay (remove in 2.0)
], function(declare, lang, aspect, domAttr, domStyle, on,
			winUtils, _Widget, _TemplatedMixin, BackgroundIframe, Viewport, dijit){

	// module:
	//		dijit/DialogUnderlay

	var DialogUnderlay = declare("dijit.DialogUnderlay", [_Widget, _TemplatedMixin], {
		// summary:
		//		A component used to block input behind a `dijit/Dialog`.
		//
		//		Normally this class should not be instantiated directly, but rather shown and hidden via
		//		DialogUnderlay.show() and DialogUnderlay.hide().  And usually the module is not accessed directly
		//		at all, since the underlay is shown and hidden by Dialog.DialogLevelManager.
		//
		//		The underlay itself can be styled based on and id:
		//	|	#myDialog_underlay { background-color:red; }
		//
		//		In the case of `dijit.Dialog`, this id is based on the id of the Dialog,
		//		suffixed with _underlay.

		// Template has two divs; outer div is used for fade-in/fade-out, and also to hold background iframe.
		// Inner div has opacity specified in CSS file.
		templateString: "<div class='dijitDialogUnderlayWrapper'><div class='dijitDialogUnderlay' tabIndex='-1' data-dojo-attach-point='node'></div></div>",

		// Parameters on creation or updatable later

		// dialogId: String
		//		Id of the dialog.... DialogUnderlay's id is based on this id
		dialogId: "",

		// class: String
		//		This class name is used on the DialogUnderlay node, in addition to dijitDialogUnderlay
		"class": "",

		// This will get overwritten as soon as show() is call, but leave an empty array in case hide() or destroy()
		// is called first.   The array is shared between instances but that's OK because we never write into it.
		_modalConnects: [],

		_setDialogIdAttr: function(id){
			domAttr.set(this.node, "id", id + "_underlay");
			this._set("dialogId", id);
		},

		_setClassAttr: function(clazz){
			this.node.className = "dijitDialogUnderlay " + clazz;
			this._set("class", clazz);
		},

		postCreate: function(){
			// Append the underlay to the body
			this.ownerDocumentBody.appendChild(this.domNode);

			this.own(on(this.domNode, "keydown", lang.hitch(this, "_onKeyDown")));

			this.inherited(arguments);
		},

		layout: function(){
			// summary:
			//		Sets the background to the size of the viewport
			//
			// description:
			//		Sets the background to the size of the viewport (rather than the size
			//		of the document) since we need to cover the whole browser window, even
			//		if the document is only a few lines long.
			// tags:
			//		private

			var is = this.node.style,
				os = this.domNode.style;

			// hide the background temporarily, so that the background itself isn't
			// causing scrollbars to appear (might happen when user shrinks browser
			// window and then we are called to resize)
			os.display = "none";

			// then resize and show
			var viewport = winUtils.getBox(this.ownerDocument);
			os.top = viewport.t + "px";
			os.left = viewport.l + "px";
			is.width = viewport.w + "px";
			is.height = viewport.h + "px";
			os.display = "block";
		},

		show: function(){
			// summary:
			//		Show the dialog underlay
			this.domNode.style.display = "block";
			this.open = true;
			this.layout();
			this.bgIframe = new BackgroundIframe(this.domNode);

			var win = winUtils.get(this.ownerDocument);
			this._modalConnects = [
				Viewport.on("resize", lang.hitch(this, "layout")),
				on(win, "scroll", lang.hitch(this, "layout"))
			];

		},

		hide: function(){
			// summary:
			//		Hides the dialog underlay

			this.bgIframe.destroy();
			delete this.bgIframe;
			this.domNode.style.display = "none";
			while(this._modalConnects.length){ (this._modalConnects.pop()).remove(); }
			this.open = false;
		},

		destroy: function(){
			while(this._modalConnects.length){ (this._modalConnects.pop()).remove(); }
			this.inherited(arguments);
		},

		_onKeyDown: function(){
			// summary:
			//		Extension point so Dialog can monitor keyboard events on the underlay.
		}
	});

	DialogUnderlay.show = function(/*Object*/ attrs, /*Number*/ zIndex){
		// summary:
		//		Display the underlay with the given attributes set.  If the underlay is already displayed,
		//		then adjust it's attributes as specified.
		// attrs:
		//		The parameters to create DialogUnderlay with.
		// zIndex:
		//		zIndex of the underlay

		var underlay = DialogUnderlay._singleton;
		if(!underlay || underlay._destroyed){
			underlay = dijit._underlay = DialogUnderlay._singleton = new DialogUnderlay(attrs);
		}else{
			if(attrs){ underlay.set(attrs); }
		}
		domStyle.set(underlay.domNode, 'zIndex', zIndex);
		if(!underlay.open){
			underlay.show();
		}
	};

	DialogUnderlay.hide = function(){
		// summary:
		//		Hide the underlay.

		// Guard code in case the underlay widget has already been destroyed
		// because we are being called during page unload (when all widgets are destroyed)
		var underlay = DialogUnderlay._singleton;
		if(underlay && !underlay._destroyed){
			underlay.hide();
		}
	};

	return DialogUnderlay;
});

},
'dijit/BackgroundIframe':function(){
define([
	"require",			// require.toUrl
	"./main",	// to export dijit.BackgroundIframe
	"dojo/_base/config",
	"dojo/dom-construct", // domConstruct.create
	"dojo/dom-style", // domStyle.set
	"dojo/_base/lang", // lang.extend lang.hitch
	"dojo/on",
	"dojo/sniff" // has("ie"), has("trident"), has("quirks")
], function(require, dijit, config, domConstruct, domStyle, lang, on, has){

	// module:
	//		dijit/BackgroundIFrame

	// Flag for whether to create background iframe behind popups like Menus and Dialog.
	// A background iframe is useful to prevent problems with popups appearing behind applets/pdf files,
	// and is also useful on older versions of IE (IE6 and IE7) to prevent the "bleed through select" problem.
	// By default, it's enabled for IE6-10, excluding Windows Phone 8,
	// and it's also enabled for IE11 on Windows 7 and Windows 2008 Server.
	// TODO: For 2.0, make this false by default.  Also, possibly move definition to has.js so that this module can be
	// conditionally required via  dojo/has!bgIfame?dijit/BackgroundIframe
	has.add("config-bgIframe",
		(has("ie") && !/IEMobile\/10\.0/.test(navigator.userAgent)) || // No iframe on WP8, to match 1.9 behavior
		(has("trident") && /Windows NT 6.[01]/.test(navigator.userAgent)));

	var _frames = new function(){
		// summary:
		//		cache of iframes

		var queue = [];

		this.pop = function(){
			var iframe;
			if(queue.length){
				iframe = queue.pop();
				iframe.style.display="";
			}else{
				// transparency needed for DialogUnderlay and for tooltips on IE (to see screen near connector)
				if(has("ie") < 9){
					var burl = config["dojoBlankHtmlUrl"] || require.toUrl("dojo/resources/blank.html") || "javascript:\"\"";
					var html="<iframe src='" + burl + "' role='presentation'"
						+ " style='position: absolute; left: 0px; top: 0px;"
						+ "z-index: -1; filter:Alpha(Opacity=\"0\");'>";
					iframe = document.createElement(html);
				}else{
					iframe = domConstruct.create("iframe");
					iframe.src = 'javascript:""';
					iframe.className = "dijitBackgroundIframe";
					iframe.setAttribute("role", "presentation");
					domStyle.set(iframe, "opacity", 0.1);
				}
				iframe.tabIndex = -1; // Magic to prevent iframe from getting focus on tab keypress - as style didn't work.
			}
			return iframe;
		};

		this.push = function(iframe){
			iframe.style.display="none";
			queue.push(iframe);
		}
	}();


	dijit.BackgroundIframe = function(/*DomNode*/ node){
		// summary:
		//		For IE/FF z-index shenanigans. id attribute is required.
		//
		// description:
		//		new dijit.BackgroundIframe(node).
		//
		//		Makes a background iframe as a child of node, that fills
		//		area (and position) of node

		if(!node.id){ throw new Error("no id"); }
		if(has("config-bgIframe")){
			var iframe = (this.iframe = _frames.pop());
			node.appendChild(iframe);
			if(has("ie")<7 || has("quirks")){
				this.resize(node);
				this._conn = on(node, 'resize', lang.hitch(this, "resize", node));
			}else{
				domStyle.set(iframe, {
					width: '100%',
					height: '100%'
				});
			}
		}
	};

	lang.extend(dijit.BackgroundIframe, {
		resize: function(node){
			// summary:
			//		Resize the iframe so it's the same size as node.
			//		Needed on IE6 and IE/quirks because height:100% doesn't work right.
			if(this.iframe){
				domStyle.set(this.iframe, {
					width: node.offsetWidth + 'px',
					height: node.offsetHeight + 'px'
				});
			}
		},
		destroy: function(){
			// summary:
			//		destroy the iframe
			if(this._conn){
				this._conn.remove();
				this._conn = null;
			}
			if(this.iframe){
				this.iframe.parentNode.removeChild(this.iframe);
				_frames.push(this.iframe);
				delete this.iframe;
			}
		}
	});

	return dijit.BackgroundIframe;
});

},
'dijit/Viewport':function(){
define([
	"dojo/Evented",
	"dojo/on",
	"dojo/domReady",
	"dojo/sniff",	// has("ie"), has("ios")
	"dojo/window" // getBox()
], function(Evented, on, domReady, has, winUtils){

	// module:
	//		dijit/Viewport

	/*=====
	return {
		// summary:
		//		Utility singleton to watch for viewport resizes, avoiding duplicate notifications
		//		which can lead to infinite loops.
		// description:
		//		Usage: Viewport.on("resize", myCallback).
		//
		//		myCallback() is called without arguments in case it's _WidgetBase.resize(),
		//		which would interpret the argument as the size to make the widget.
	};
	=====*/

	var Viewport = new Evented();

	var focusedNode;

	domReady(function(){
		var oldBox = winUtils.getBox();
		Viewport._rlh = on(window, "resize", function(){
			var newBox = winUtils.getBox();
			if(oldBox.h == newBox.h && oldBox.w == newBox.w){ return; }
			oldBox = newBox;
			Viewport.emit("resize");
		});

		// Also catch zoom changes on IE8, since they don't naturally generate resize events
		if(has("ie") == 8){
			var deviceXDPI = screen.deviceXDPI;
			setInterval(function(){
				if(screen.deviceXDPI != deviceXDPI){
					deviceXDPI = screen.deviceXDPI;
					Viewport.emit("resize");
				}
			}, 500);
		}

		// On iOS, keep track of the focused node so we can guess when the keyboard is/isn't being displayed.
		if(has("ios")){
			on(document, "focusin", function(evt){
				focusedNode = evt.target;
			});
			on(document, "focusout", function(evt){
				focusedNode = null;
			});
		}
	});

	Viewport.getEffectiveBox = function(/*Document*/ doc){
		// summary:
		//		Get the size of the viewport, or on mobile devices, the part of the viewport not obscured by the
		//		virtual keyboard.

		var box = winUtils.getBox(doc);

		// Account for iOS virtual keyboard, if it's being shown.  Unfortunately no direct way to check or measure.
		var tag = focusedNode && focusedNode.tagName && focusedNode.tagName.toLowerCase();
		if(has("ios") && focusedNode && !focusedNode.readOnly && (tag == "textarea" || (tag == "input" &&
			/^(color|email|number|password|search|tel|text|url)$/.test(focusedNode.type)))){

			// Box represents the size of the viewport.  Some of the viewport is likely covered by the keyboard.
			// Estimate height of visible viewport assuming viewport goes to bottom of screen, but is covered by keyboard.
			box.h *= (orientation == 0 || orientation == 180 ? 0.66 : 0.40);

			// Above measurement will be inaccurate if viewport was scrolled up so far that it ends before the bottom
			// of the screen.   In this case, keyboard isn't covering as much of the viewport as we thought.
			// We know the visible size is at least the distance from the top of the viewport to the focused node.
			var rect = focusedNode.getBoundingClientRect();
			box.h = Math.max(box.h, rect.top + rect.height);
		}

		return box;
	};

	return Viewport;
});

},
'dijit/layout/ContentPane':function(){
define([
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.mixin lang.delegate lang.hitch lang.isFunction lang.isObject
	"../_Widget",
	"../_Container",
	"./_ContentPaneResizeMixin",
	"dojo/string", // string.substitute
	"dojo/html", // html._ContentSetter
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/_base/Deferred", // Deferred
	"dojo/dom", // dom.byId
	"dojo/dom-attr", // domAttr.attr
	"dojo/dom-construct", // empty()
	"dojo/_base/xhr", // xhr.get
	"dojo/i18n", // i18n.getLocalization
	"dojo/when",
	"dojo/i18n!../nls/loading"
], function(kernel, lang, _Widget, _Container, _ContentPaneResizeMixin, string, html, array, declare,
			Deferred, dom, domAttr, domConstruct, xhr, i18n, when){

	// module:
	//		dijit/layout/ContentPane

	return declare("dijit.layout.ContentPane", [_Widget, _Container, _ContentPaneResizeMixin], {
		// summary:
		//		A widget containing an HTML fragment, specified inline
		//		or by uri.  Fragment may include widgets.
		//
		// description:
		//		This widget embeds a document fragment in the page, specified
		//		either by uri, javascript generated markup or DOM reference.
		//		Any widgets within this content are instantiated and managed,
		//		but laid out according to the HTML structure.  Unlike IFRAME,
		//		ContentPane embeds a document fragment as would be found
		//		inside the BODY tag of a full HTML document.  It should not
		//		contain the HTML, HEAD, or BODY tags.
		//		For more advanced functionality with scripts and
		//		stylesheets, see dojox/layout/ContentPane.  This widget may be
		//		used stand alone or as a base class for other widgets.
		//		ContentPane is useful as a child of other layout containers
		//		such as BorderContainer or TabContainer, but note that those
		//		widgets can contain any widget as a child.
		//
		// example:
		//		Some quick samples:
		//		To change the innerHTML:
		// |		cp.set('content', '<b>new content</b>')`
		//		Or you can send it a NodeList:
		// |		cp.set('content', dojo.query('div [class=selected]', userSelection))
		//		To do an ajax update:
		// |		cp.set('href', url)

		// href: String
		//		The href of the content that displays now.
		//		Set this at construction if you want to load data externally when the
		//		pane is shown.  (Set preload=true to load it immediately.)
		//		Changing href after creation doesn't have any effect; Use set('href', ...);
		href: "",

		// content: String|DomNode|NodeList|dijit/_Widget
		//		The innerHTML of the ContentPane.
		//		Note that the initialization parameter / argument to set("content", ...)
		//		can be a String, DomNode, Nodelist, or _Widget.
		content: "",

		// extractContent: Boolean
		//		Extract visible content from inside of `<body> .... </body>`.
		//		I.e., strip `<html>` and `<head>` (and it's contents) from the href
		extractContent: false,

		// parseOnLoad: Boolean
		//		Parse content and create the widgets, if any.
		parseOnLoad: true,

		// parserScope: String
		//		Flag passed to parser.  Root for attribute names to search for.   If scopeName is dojo,
		//		will search for data-dojo-type (or dojoType).  For backwards compatibility
		//		reasons defaults to dojo._scopeName (which is "dojo" except when
		//		multi-version support is used, when it will be something like dojo16, dojo20, etc.)
		parserScope: kernel._scopeName,

		// preventCache: Boolean
		//		Prevent caching of data from href's by appending a timestamp to the href.
		preventCache: false,

		// preload: Boolean
		//		Force load of data on initialization even if pane is hidden.
		preload: false,

		// refreshOnShow: Boolean
		//		Refresh (re-download) content when pane goes from hidden to shown
		refreshOnShow: false,

		// loadingMessage: String
		//		Message that shows while downloading
		loadingMessage: "<span class='dijitContentPaneLoading'><span class='dijitInline dijitIconLoading'></span>${loadingState}</span>",

		// errorMessage: String
		//		Message that shows if an error occurs
		errorMessage: "<span class='dijitContentPaneError'><span class='dijitInline dijitIconError'></span>${errorState}</span>",

		// isLoaded: [readonly] Boolean
		//		True if the ContentPane has data in it, either specified
		//		during initialization (via href or inline content), or set
		//		via set('content', ...) / set('href', ...)
		//
		//		False if it doesn't have any content, or if ContentPane is
		//		still in the process of downloading href.
		isLoaded: false,

		baseClass: "dijitContentPane",

		/*======
		 // ioMethod: dojo/_base/xhr.get|dojo._base/xhr.post
		 //		Function that should grab the content specified via href.
		 ioMethod: dojo.xhrGet,
		 ======*/

		// ioArgs: Object
		//		Parameters to pass to xhrGet() request, for example:
		// |	<div data-dojo-type="dijit/layout/ContentPane" data-dojo-props="href: './bar', ioArgs: {timeout: 500}">
		ioArgs: {},

		// onLoadDeferred: [readonly] dojo.Deferred
		//		This is the `dojo.Deferred` returned by set('href', ...) and refresh().
		//		Calling onLoadDeferred.then() registers your
		//		callback to be called only once, when the prior set('href', ...) call or
		//		the initial href parameter to the constructor finishes loading.
		//
		//		This is different than an onLoad() handler which gets called any time any href
		//		or content is loaded.
		onLoadDeferred: null,

		// Cancel _WidgetBase's _setTitleAttr because we don't want the title attribute (used to specify
		// tab labels) to be copied to ContentPane.domNode... otherwise a tooltip shows up over the
		// entire pane.
		_setTitleAttr: null,

		// Flag to parser that I'll parse my contents, so it shouldn't.
		stopParser: true,

		// template: [private] Boolean
		//		Flag from the parser that this ContentPane is inside a template
		//		so the contents are pre-parsed.
		// TODO: this declaration can be commented out in 2.0
		template: false,

		markupFactory: function(params, node, ctor){
			var self = new ctor(params, node);

			// If a parse has started but is waiting for modules to load, then return a Promise for when the parser
			// finishes.  Don't return a promise though for the case when content hasn't started loading because the
			// ContentPane is hidden and it has an href (ex: hidden pane of a TabContainer).   In that case we consider
			// that initialization has already finished.
			return !self.href && self._contentSetter && self._contentSetter.parseDeferred && !self._contentSetter.parseDeferred.isFulfilled() ?
				self._contentSetter.parseDeferred.then(function(){
					return self;
				}) : self;
		},

		create: function(params, srcNodeRef){
			// Convert a srcNodeRef argument into a content parameter, so that the original contents are
			// processed in the same way as contents set via set("content", ...), calling the parser etc.
			// Avoid modifying original params object since that breaks NodeList instantiation, see #11906.
			if((!params || !params.template) && srcNodeRef && !("href" in params) && !("content" in params)){
				srcNodeRef = dom.byId(srcNodeRef);
				var df = srcNodeRef.ownerDocument.createDocumentFragment();
				while(srcNodeRef.firstChild){
					df.appendChild(srcNodeRef.firstChild);
				}
				params = lang.delegate(params, {content: df});
			}
			this.inherited(arguments, [params, srcNodeRef]);
		},

		postMixInProperties: function(){
			this.inherited(arguments);
			var messages = i18n.getLocalization("dijit", "loading", this.lang);
			this.loadingMessage = string.substitute(this.loadingMessage, messages);
			this.errorMessage = string.substitute(this.errorMessage, messages);
		},

		buildRendering: function(){
			this.inherited(arguments);

			// Since we have no template we need to set this.containerNode ourselves, to make getChildren() work.
			// For subclasses of ContentPane that do have a template, does nothing.
			if(!this.containerNode){
				this.containerNode = this.domNode;
			}

			// remove the title attribute so it doesn't show up when hovering
			// over a node  (TODO: remove in 2.0, no longer needed after #11490)
			this.domNode.removeAttribute("title");
		},

		startup: function(){
			// summary:
			//		Call startup() on all children including non _Widget ones like dojo/dnd/Source objects

			// This starts all the widgets
			this.inherited(arguments);

			// And this catches stuff like dojo/dnd/Source
			if(this._contentSetter){
				array.forEach(this._contentSetter.parseResults, function(obj){
					if(!obj._started && !obj._destroyed && lang.isFunction(obj.startup)){
						obj.startup();
						obj._started = true;
					}
				}, this);
			}
		},

		_startChildren: function(){
			// summary:
			//		Called when content is loaded.   Calls startup on each child widget.   Similar to ContentPane.startup()
			//		itself, but avoids marking the ContentPane itself as "restarted" (see #15581).

			// This starts all the widgets
			array.forEach(this.getChildren(), function(obj){
				if(!obj._started && !obj._destroyed && lang.isFunction(obj.startup)){
					obj.startup();
					obj._started = true;
				}
			});

			// And this catches stuff like dojo/dnd/Source
			if(this._contentSetter){
				array.forEach(this._contentSetter.parseResults, function(obj){
					if(!obj._started && !obj._destroyed && lang.isFunction(obj.startup)){
						obj.startup();
						obj._started = true;
					}
				}, this);
			}
		},

		setHref: function(/*String|Uri*/ href){
			// summary:
			//		Deprecated.   Use set('href', ...) instead.
			kernel.deprecated("dijit.layout.ContentPane.setHref() is deprecated. Use set('href', ...) instead.", "", "2.0");
			return this.set("href", href);
		},
		_setHrefAttr: function(/*String|Uri*/ href){
			// summary:
			//		Hook so set("href", ...) works.
			// description:
			//		Reset the (external defined) content of this pane and replace with new url
			//		Note: It delays the download until widget is shown if preload is false.
			// href:
			//		url to the page you want to get, must be within the same domain as your mainpage

			// Cancel any in-flight requests (a set('href', ...) will cancel any in-flight set('href', ...))
			this.cancel();

			this.onLoadDeferred = new Deferred(lang.hitch(this, "cancel"));
			this.onLoadDeferred.then(lang.hitch(this, "onLoad"));

			this._set("href", href);

			// _setHrefAttr() is called during creation and by the user, after creation.
			// Assuming preload == false, only in the second case do we actually load the URL;
			// otherwise it's done in startup(), and only if this widget is shown.
			if(this.preload || (this._created && this._isShown())){
				this._load();
			}else{
				// Set flag to indicate that href needs to be loaded the next time the
				// ContentPane is made visible
				this._hrefChanged = true;
			}

			return this.onLoadDeferred;		// Deferred
		},

		setContent: function(/*String|DomNode|Nodelist*/data){
			// summary:
			//		Deprecated.   Use set('content', ...) instead.
			kernel.deprecated("dijit.layout.ContentPane.setContent() is deprecated.  Use set('content', ...) instead.", "", "2.0");
			this.set("content", data);
		},
		_setContentAttr: function(/*String|DomNode|Nodelist*/data){
			// summary:
			//		Hook to make set("content", ...) work.
			//		Replaces old content with data content, include style classes from old content
			// data:
			//		the new Content may be String, DomNode or NodeList
			//
			//		if data is a NodeList (or an array of nodes) nodes are copied
			//		so you can import nodes from another document implicitly

			// clear href so we can't run refresh and clear content
			// refresh should only work if we downloaded the content
			this._set("href", "");

			// Cancel any in-flight requests (a set('content', ...) will cancel any in-flight set('href', ...))
			this.cancel();

			// Even though user is just setting content directly, still need to define an onLoadDeferred
			// because the _onLoadHandler() handler is still getting called from setContent()
			this.onLoadDeferred = new Deferred(lang.hitch(this, "cancel"));
			if(this._created){
				// For back-compat reasons, call onLoad() for set('content', ...)
				// calls but not for content specified in srcNodeRef (ie: <div data-dojo-type=ContentPane>...</div>)
				// or as initialization parameter (ie: new ContentPane({content: ...})
				this.onLoadDeferred.then(lang.hitch(this, "onLoad"));
			}

			this._setContent(data || "");

			this._isDownloaded = false; // mark that content is from a set('content') not a set('href')

			return this.onLoadDeferred;	// Deferred
		},
		_getContentAttr: function(){
			// summary:
			//		Hook to make get("content") work
			return this.containerNode.innerHTML;
		},

		cancel: function(){
			// summary:
			//		Cancels an in-flight download of content
			if(this._xhrDfd && (this._xhrDfd.fired == -1)){
				this._xhrDfd.cancel();
			}
			delete this._xhrDfd; // garbage collect

			this.onLoadDeferred = null;
		},

		destroy: function(){
			this.cancel();
			this.inherited(arguments);
		},

		destroyRecursive: function(/*Boolean*/ preserveDom){
			// summary:
			//		Destroy the ContentPane and its contents

			// if we have multiple controllers destroying us, bail after the first
			if(this._beingDestroyed){
				return;
			}
			this.inherited(arguments);
		},

		_onShow: function(){
			// summary:
			//		Called when the ContentPane is made visible
			// description:
			//		For a plain ContentPane, this is called on initialization, from startup().
			//		If the ContentPane is a hidden pane of a TabContainer etc., then it's
			//		called whenever the pane is made visible.
			//
			//		Does necessary processing, including href download and layout/resize of
			//		child widget(s)

			this.inherited(arguments);

			if(this.href){
				if(!this._xhrDfd && // if there's an href that isn't already being loaded
					(!this.isLoaded || this._hrefChanged || this.refreshOnShow)
					){
					return this.refresh();	// If child has an href, promise that fires when the load is complete
				}
			}
		},

		refresh: function(){
			// summary:
			//		[Re]download contents of href and display
			// description:
			//		1. cancels any currently in-flight requests
			//		2. posts "loading..." message
			//		3. sends XHR to download new data

			// Cancel possible prior in-flight request
			this.cancel();

			this.onLoadDeferred = new Deferred(lang.hitch(this, "cancel"));
			this.onLoadDeferred.then(lang.hitch(this, "onLoad"));
			this._load();
			return this.onLoadDeferred;		// If child has an href, promise that fires when refresh is complete
		},

		_load: function(){
			// summary:
			//		Load/reload the href specified in this.href

			// display loading message
			this._setContent(this.onDownloadStart(), true);

			var self = this;
			var getArgs = {
				preventCache: (this.preventCache || this.refreshOnShow),
				url: this.href,
				handleAs: "text"
			};
			if(lang.isObject(this.ioArgs)){
				lang.mixin(getArgs, this.ioArgs);
			}

			var hand = (this._xhrDfd = (this.ioMethod || xhr.get)(getArgs)),
				returnedHtml;

			hand.then(
				function(html){
					returnedHtml = html;
					try{
						self._isDownloaded = true;
						return self._setContent(html, false);
					}catch(err){
						self._onError('Content', err); // onContentError
					}
				},
				function(err){
					if(!hand.canceled){
						// show error message in the pane
						self._onError('Download', err); // onDownloadError
					}
					delete self._xhrDfd;
					return err;
				}
			).then(function(){
					self.onDownloadEnd();
					delete self._xhrDfd;
					return returnedHtml;
				});

			// Remove flag saying that a load is needed
			delete this._hrefChanged;
		},

		_onLoadHandler: function(data){
			// summary:
			//		This is called whenever new content is being loaded
			this._set("isLoaded", true);
			try{
				this.onLoadDeferred.resolve(data);
			}catch(e){
				 0 && console.error('Error ' + this.widgetId + ' running custom onLoad code: ' + e.message);
			}
		},

		_onUnloadHandler: function(){
			// summary:
			//		This is called whenever the content is being unloaded
			this._set("isLoaded", false);
			try{
				this.onUnload();
			}catch(e){
				 0 && console.error('Error ' + this.widgetId + ' running custom onUnload code: ' + e.message);
			}
		},

		destroyDescendants: function(/*Boolean*/ preserveDom){
			// summary:
			//		Destroy all the widgets inside the ContentPane and empty containerNode

			// Make sure we call onUnload (but only when the ContentPane has real content)
			if(this.isLoaded){
				this._onUnloadHandler();
			}

			// Even if this.isLoaded == false there might still be a "Loading..." message
			// to erase, so continue...

			// For historical reasons we need to delete all widgets under this.containerNode,
			// even ones that the user has created manually.
			var setter = this._contentSetter;
			array.forEach(this.getChildren(), function(widget){
				if(widget.destroyRecursive){
					// All widgets will hit this branch
					widget.destroyRecursive(preserveDom);
				}else if(widget.destroy){
					// Things like dojo/dnd/Source have destroy(), not destroyRecursive()
					widget.destroy(preserveDom);
				}
				widget._destroyed = true;
			});
			if(setter){
				// Most of the widgets in setter.parseResults have already been destroyed, but
				// things like Menu that have been moved to <body> haven't yet
				array.forEach(setter.parseResults, function(widget){
					if(!widget._destroyed){
						if(widget.destroyRecursive){
							// All widgets will hit this branch
							widget.destroyRecursive(preserveDom);
						}else if(widget.destroy){
							// Things like dojo/dnd/Source have destroy(), not destroyRecursive()
							widget.destroy(preserveDom);
						}
						widget._destroyed = true;
					}
				});
				delete setter.parseResults;
			}

			// And then clear away all the DOM nodes
			if(!preserveDom){
				domConstruct.empty(this.containerNode);
			}

			// Delete any state information we have about current contents
			delete this._singleChild;
		},

		_setContent: function(/*String|DocumentFragment*/ cont, /*Boolean*/ isFakeContent){
			// summary:
			//		Insert the content into the container node
			// returns:
			//		Returns a Deferred promise that is resolved when the content is parsed.

			// first get rid of child widgets
			this.destroyDescendants();

			// html.set will take care of the rest of the details
			// we provide an override for the error handling to ensure the widget gets the errors
			// configure the setter instance with only the relevant widget instance properties
			// NOTE: unless we hook into attr, or provide property setters for each property,
			// we need to re-configure the ContentSetter with each use
			var setter = this._contentSetter;
			if(!(setter && setter instanceof html._ContentSetter)){
				setter = this._contentSetter = new html._ContentSetter({
					node: this.containerNode,
					_onError: lang.hitch(this, this._onError),
					onContentError: lang.hitch(this, function(e){
						// fires if a domfault occurs when we are appending this.errorMessage
						// like for instance if domNode is a UL and we try append a DIV
						var errMess = this.onContentError(e);
						try{
							this.containerNode.innerHTML = errMess;
						}catch(e){
							 0 && console.error('Fatal ' + this.id + ' could not change content due to ' + e.message, e);
						}
					})/*,
					 _onError */
				});
			}

			var setterParams = lang.mixin({
				cleanContent: this.cleanContent,
				extractContent: this.extractContent,
				parseContent: !cont.domNode && this.parseOnLoad,
				parserScope: this.parserScope,
				startup: false,
				dir: this.dir,
				lang: this.lang,
				textDir: this.textDir
			}, this._contentSetterParams || {});

			var p = setter.set((lang.isObject(cont) && cont.domNode) ? cont.domNode : cont, setterParams);

			// dojox/layout/html/_base::_ContentSetter.set() returns a Promise that indicates when everything is completed.
			// dojo/html::_ContentSetter.set() currently returns the DOMNode, but that will be changed for 2.0.
			// So, if set() returns a promise then use it, otherwise fallback to waiting on setter.parseDeferred
			var self = this;
			return when(p && p.then ? p : setter.parseDeferred, function(){
				// setter params must be pulled afresh from the ContentPane each time
				delete self._contentSetterParams;

				if(!isFakeContent){
					if(self._started){
						// Startup each top level child widget (and they will start their children, recursively)
						self._startChildren();

						// Call resize() on each of my child layout widgets,
						// or resize() on my single child layout widget...
						// either now (if I'm currently visible) or when I become visible
						self._scheduleLayout();
					}
					self._onLoadHandler(cont);
				}
			});
		},

		_onError: function(type, err, consoleText){
			this.onLoadDeferred.reject(err);

			// shows user the string that is returned by on[type]Error
			// override on[type]Error and return your own string to customize
			var errText = this['on' + type + 'Error'].call(this, err);
			if(consoleText){
				 0 && console.error(consoleText, err);
			}else if(errText){// a empty string won't change current content
				this._setContent(errText, true);
			}
		},

		// EVENT's, should be overide-able
		onLoad: function(/*===== data =====*/){
			// summary:
			//		Event hook, is called after everything is loaded and widgetified
			// tags:
			//		callback
		},

		onUnload: function(){
			// summary:
			//		Event hook, is called before old content is cleared
			// tags:
			//		callback
		},

		onDownloadStart: function(){
			// summary:
			//		Called before download starts.
			// description:
			//		The string returned by this function will be the html
			//		that tells the user we are loading something.
			//		Override with your own function if you want to change text.
			// tags:
			//		extension
			return this.loadingMessage;
		},

		onContentError: function(/*Error*/ /*===== error =====*/){
			// summary:
			//		Called on DOM faults, require faults etc. in content.
			//
			//		In order to display an error message in the pane, return
			//		the error message from this method, as an HTML string.
			//
			//		By default (if this method is not overriden), it returns
			//		nothing, so the error message is just printed to the console.
			// tags:
			//		extension
		},

		onDownloadError: function(/*Error*/ /*===== error =====*/){
			// summary:
			//		Called when download error occurs.
			//
			//		In order to display an error message in the pane, return
			//		the error message from this method, as an HTML string.
			//
			//		Default behavior (if this method is not overriden) is to display
			//		the error message inside the pane.
			// tags:
			//		extension
			return this.errorMessage;
		},

		onDownloadEnd: function(){
			// summary:
			//		Called when download is finished.
			// tags:
			//		callback
		}
	});
});

},
'dijit/_Container':function(){
define([
	"dojo/_base/array", // array.forEach array.indexOf
	"dojo/_base/declare", // declare
	"dojo/dom-construct", // domConstruct.place
	"dojo/_base/kernel" // kernel.deprecated
], function(array, declare, domConstruct, kernel){

	// module:
	//		dijit/_Container

	return declare("dijit._Container", null, {
		// summary:
		//		Mixin for widgets that contain HTML and/or a set of widget children.

		buildRendering: function(){
			this.inherited(arguments);
			if(!this.containerNode){
				// All widgets with descendants must set containerNode.
				// NB: this code doesn't quite work right because for TabContainer it runs before
				// _TemplatedMixin::buildRendering(), and thus
				// sets this.containerNode to this.domNode, later to be overridden by the assignment in the template.
				this.containerNode = this.domNode;
			}
		},

		addChild: function(/*dijit/_WidgetBase*/ widget, /*int?*/ insertIndex){
			// summary:
			//		Makes the given widget a child of this widget.
			// description:
			//		Inserts specified child widget's dom node as a child of this widget's
			//		container node, and possibly does other processing (such as layout).

			// I want to just call domConstruct.place(widget.domNode, this.containerNode, insertIndex), but the counting
			// is thrown off by text nodes and comment nodes that show up when constructed by markup.
			// In the future consider stripping those nodes on construction, either in the parser or this widget code.
			var refNode = this.containerNode;
			if(insertIndex > 0){
				// Old-school way to get nth child; dojo.query would be easier but _Container was weened from dojo.query
				// in #10087 to minimize download size.   Not sure if that's still and issue with new smaller dojo/query.
				refNode = refNode.firstChild;
				while(insertIndex > 0){
					if(refNode.nodeType == 1){ insertIndex--; }
					refNode = refNode.nextSibling;
				}
				if(refNode){
					insertIndex = "before";
				}else{
					// to support addChild(child, n-1) where there are n children (should add child at end)
					refNode = this.containerNode;
					insertIndex = "last";
				}
			}

			domConstruct.place(widget.domNode, refNode, insertIndex);

			// If I've been started but the child widget hasn't been started,
			// start it now.  Make sure to do this after widget has been
			// inserted into the DOM tree, so it can see that it's being controlled by me,
			// so it doesn't try to size itself.
			if(this._started && !widget._started){
				widget.startup();
			}
		},

		removeChild: function(/*Widget|int*/ widget){
			// summary:
			//		Removes the passed widget instance from this widget but does
			//		not destroy it.  You can also pass in an integer indicating
			//		the index within the container to remove (ie, removeChild(5) removes the sixth widget).

			if(typeof widget == "number"){
				widget = this.getChildren()[widget];
			}

			if(widget){
				var node = widget.domNode;
				if(node && node.parentNode){
					node.parentNode.removeChild(node); // detach but don't destroy
				}
			}
		},

		hasChildren: function(){
			// summary:
			//		Returns true if widget has child widgets, i.e. if this.containerNode contains widgets.
			return this.getChildren().length > 0;	// Boolean
		},

		_getSiblingOfChild: function(/*dijit/_WidgetBase*/ child, /*int*/ dir){
			// summary:
			//		Get the next or previous widget sibling of child
			// dir:
			//		if 1, get the next sibling
			//		if -1, get the previous sibling
			// tags:
			//		private
			kernel.deprecated(this.declaredClass+"::_getSiblingOfChild() is deprecated. Use _KeyNavMixin::_getNext() instead.", "", "2.0");
			var children = this.getChildren(),
				idx = array.indexOf(children, child);	// int
			return children[idx + dir];
		},

		getIndexOfChild: function(/*dijit/_WidgetBase*/ child){
			// summary:
			//		Gets the index of the child in this container or -1 if not found
			return array.indexOf(this.getChildren(), child);	// int
		}
	});
});

},
'dijit/layout/_ContentPaneResizeMixin':function(){
define([
	"dojo/_base/array", // array.filter array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.contains domClass.toggle
	"dojo/dom-geometry", // domGeometry.contentBox domGeometry.marginBox
	"dojo/dom-style",
	"dojo/_base/lang", // lang.mixin
	"dojo/query", // query
	"../registry", // registry.byId
	"../Viewport",
	"./utils" // marginBox2contextBox
], function(array, declare, domClass, domGeometry, domStyle, lang, query,
			registry, Viewport, layoutUtils){

	// module:
	//		dijit/layout/_ContentPaneResizeMixin

	return declare("dijit.layout._ContentPaneResizeMixin", null, {
		// summary:
		//		Resize() functionality of ContentPane.   If there's a single layout widget
		//		child then it will call resize() with the same dimensions as the ContentPane.
		//		Otherwise just calls resize on each child.
		//
		//		Also implements basic startup() functionality, where starting the parent
		//		will start the children

		// doLayout: Boolean
		//		- false - don't adjust size of children
		//		- true - if there is a single visible child widget, set it's size to however big the ContentPane is
		doLayout: true,

		// isLayoutContainer: [protected] Boolean
		//		Indicates that this widget will call resize() on it's child widgets
		//		when they become visible.
		isLayoutContainer: true,

		startup: function(){
			// summary:
			//		See `dijit/layout/_LayoutWidget.startup()` for description.
			//		Although ContentPane doesn't extend _LayoutWidget, it does implement
			//		the same API.

			if(this._started){
				return;
			}

			var parent = this.getParent();
			this._childOfLayoutWidget = parent && parent.isLayoutContainer;

			// I need to call resize() on my child/children (when I become visible), unless
			// I'm the child of a layout widget in which case my parent will call resize() on me and I'll do it then.
			this._needLayout = !this._childOfLayoutWidget;

			this.inherited(arguments);

			if(this._isShown()){
				this._onShow();
			}

			if(!this._childOfLayoutWidget){
				// Since my parent isn't a layout container, and my style *may be* width=height=100%
				// or something similar (either set directly or via a CSS class),
				// monitor when viewport size changes so that I can re-layout.
				// This is more for subclasses of ContentPane than ContentPane itself, although it
				// could be useful for a ContentPane if it has a single child widget inheriting ContentPane's size.
				this.own(Viewport.on("resize", lang.hitch(this, "resize")));
			}
		},

		_checkIfSingleChild: function(){
			// summary:
			//		Test if we have exactly one visible widget as a child,
			//		and if so assume that we are a container for that widget,
			//		and should propagate startup() and resize() calls to it.
			//		Skips over things like data stores since they aren't visible.

			if(!this.doLayout){ return; }

			var candidateWidgets = [],
				otherVisibleNodes = false;

			query("> *", this.containerNode).some(function(node){
				var widget = registry.byNode(node);
				if(widget && widget.resize){
					candidateWidgets.push(widget);
				}else if(!/script|link|style/i.test(node.nodeName) && node.offsetHeight){
					otherVisibleNodes = true;
				}
			});

			this._singleChild = candidateWidgets.length == 1 && !otherVisibleNodes ?
				candidateWidgets[0] : null;

			// So we can set overflow: hidden to avoid a safari bug w/scrollbars showing up (#9449)
			domClass.toggle(this.containerNode, this.baseClass + "SingleChild", !!this._singleChild);
		},

		resize: function(changeSize, resultSize){
			// summary:
			//		See `dijit/layout/_LayoutWidget.resize()` for description.
			//		Although ContentPane doesn't extend _LayoutWidget, it does implement
			//		the same API.

			this._resizeCalled = true;

			this._scheduleLayout(changeSize, resultSize);
		},

		_scheduleLayout: function(changeSize, resultSize){
			// summary:
			//		Resize myself, and call resize() on each of my child layout widgets, either now
			//		(if I'm currently visible) or when I become visible
			if(this._isShown()){
				this._layout(changeSize, resultSize);
			}else{
				this._needLayout = true;
				this._changeSize = changeSize;
				this._resultSize = resultSize;
			}
		},

		_layout: function(changeSize, resultSize){
			// summary:
			//		Resize myself according to optional changeSize/resultSize parameters, like a layout widget.
			//		Also, since I am an isLayoutContainer widget, each of my children expects me to
			//		call resize() or layout() on it.
			//
			//		Should be called on initialization and also whenever we get new content
			//		(from an href, or from set('content', ...))... but deferred until
			//		the ContentPane is visible

			delete this._needLayout;

			// For the TabContainer --> BorderContainer --> ContentPane case, _onShow() is
			// never called directly, so resize() is our trigger to do the initial href download (see [20099]).
			// However, don't load href for closed TitlePanes.
			if(!this._wasShown && this.open !== false){
				this._onShow();
			}

			// Set margin box size, unless it wasn't specified, in which case use current size.
			if(changeSize){
				domGeometry.setMarginBox(this.domNode, changeSize);
			}

			// Compute content box size of containerNode in case we [later] need to size our single child.
			var cn = this.containerNode;
			if(cn === this.domNode){
				// If changeSize or resultSize was passed to this method and this.containerNode ==
				// this.domNode then we can compute the content-box size without querying the node,
				// which is more reliable (similar to LayoutWidget.resize) (see for example #9449).
				var mb = resultSize || {};
				lang.mixin(mb, changeSize || {}); // changeSize overrides resultSize
				if(!("h" in mb) || !("w" in mb)){
					mb = lang.mixin(domGeometry.getMarginBox(cn), mb); // just use domGeometry.setMarginBox() to fill in missing values
				}
				this._contentBox = layoutUtils.marginBox2contentBox(cn, mb);
			}else{
				this._contentBox = domGeometry.getContentBox(cn);
			}

			this._layoutChildren();
		},

		_layoutChildren: function(){
			// Call _checkIfSingleChild() again in case app has manually mucked w/the content
			// of the ContentPane (rather than changing it through the set("content", ...) API.
			this._checkIfSingleChild();

			if(this._singleChild && this._singleChild.resize){
				var cb = this._contentBox || domGeometry.getContentBox(this.containerNode);

				// note: if widget has padding this._contentBox will have l and t set,
				// but don't pass them to resize() or it will doubly-offset the child
				this._singleChild.resize({w: cb.w, h: cb.h});
			}else{
				// All my child widgets are independently sized (rather than matching my size),
				// but I still need to call resize() on each child to make it layout.
				var children = this.getChildren(),
					widget,
					i = 0;
				while(widget = children[i++]){
					if(widget.resize){
						widget.resize();
					}
				}
			}
		},

		_isShown: function(){
			// summary:
			//		Returns true if the content is currently shown.
			// description:
			//		If I am a child of a layout widget then it actually returns true if I've ever been visible,
			//		not whether I'm currently visible, since that's much faster than tracing up the DOM/widget
			//		tree every call, and at least solves the performance problem on page load by deferring loading
			//		hidden ContentPanes until they are first shown

			if(this._childOfLayoutWidget){
				// If we are TitlePane, etc - we return that only *IF* we've been resized
				if(this._resizeCalled && "open" in this){
					return this.open;
				}
				return this._resizeCalled;
			}else if("open" in this){
				return this.open;		// for TitlePane, etc.
			}else{
				var node = this.domNode, parent = this.domNode.parentNode;
				return (node.style.display != 'none') && (node.style.visibility != 'hidden') && !domClass.contains(node, "dijitHidden") &&
					parent && parent.style && (parent.style.display != 'none');
			}
		},

		_onShow: function(){
			// summary:
			//		Called when the ContentPane is made visible
			// description:
			//		For a plain ContentPane, this is called on initialization, from startup().
			//		If the ContentPane is a hidden pane of a TabContainer etc., then it's
			//		called whenever the pane is made visible.
			//
			//		Does layout/resize of child widget(s)

			// Need to keep track of whether ContentPane has been shown (which is different than
			// whether or not it's currently visible).
			this._wasShown = true;

			if(this._needLayout){
				// If a layout has been scheduled for when we become visible, do it now
				this._layout(this._changeSize, this._resultSize);
			}

			this.inherited(arguments);
		}
	});
});

},
'dijit/layout/utils':function(){
define([
	"dojo/_base/array", // array.filter array.forEach
	"dojo/dom-class", // domClass.add domClass.remove
	"dojo/dom-geometry", // domGeometry.marginBox
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/_base/lang" // lang.mixin, lang.setObject
], function(array, domClass, domGeometry, domStyle, lang){

	// module:
	//		dijit/layout/utils

	function capitalize(word){
		return word.substring(0,1).toUpperCase() + word.substring(1);
	}

	function size(widget, dim){
		// size the child
		var newSize = widget.resize ? widget.resize(dim) : domGeometry.setMarginBox(widget.domNode, dim);

		// record child's size
		if(newSize){
			// if the child returned it's new size then use that
			lang.mixin(widget, newSize);
		}else{
			// otherwise, call getMarginBox(), but favor our own numbers when we have them.
			// the browser lies sometimes
			lang.mixin(widget, domGeometry.getMarginBox(widget.domNode));
			lang.mixin(widget, dim);
		}
	}

	var utils = {
		// summary:
		//		Utility functions for doing layout

		marginBox2contentBox: function(/*DomNode*/ node, /*Object*/ mb){
			// summary:
			//		Given the margin-box size of a node, return its content box size.
			//		Functions like domGeometry.contentBox() but is more reliable since it doesn't have
			//		to wait for the browser to compute sizes.
			var cs = domStyle.getComputedStyle(node);
			var me = domGeometry.getMarginExtents(node, cs);
			var pb = domGeometry.getPadBorderExtents(node, cs);
			return {
				l: domStyle.toPixelValue(node, cs.paddingLeft),
				t: domStyle.toPixelValue(node, cs.paddingTop),
				w: mb.w - (me.w + pb.w),
				h: mb.h - (me.h + pb.h)
			};
		},


		layoutChildren: function(/*DomNode*/ container, /*Object*/ dim, /*Widget[]*/ children,
				/*String?*/ changedRegionId, /*Number?*/ changedRegionSize){
			// summary:
			//		Layout a bunch of child dom nodes within a parent dom node
			// container:
			//		parent node
			// dim:
			//		{l, t, w, h} object specifying dimensions of container into which to place children
			// children:
			//		An array of Widgets or at least objects containing:
			//
			//		- domNode: pointer to DOM node to position
			//		- region or layoutAlign: position to place DOM node
			//		- resize(): (optional) method to set size of node
			//		- id: (optional) Id of widgets, referenced from resize object, below.
			//
			//		The widgets in this array should be ordered according to how they should be laid out
			//		(each element will be processed in order, and take up as much remaining space as needed),
			//		with the center widget last.
			// changedRegionId:
			//		If specified, the slider for the region with the specified id has been dragged, and thus
			//		the region's height or width should be adjusted according to changedRegionSize
			// changedRegionSize:
			//		See changedRegionId.

			// copy dim because we are going to modify it
			dim = lang.mixin({}, dim);

			domClass.add(container, "dijitLayoutContainer");

			// Move "client" elements to the end of the array for layout.  a11y dictates that the author
			// needs to be able to put them in the document in tab-order, but this algorithm requires that
			// client be last.    TODO: remove for 2.0, all dijit client code already sends children as last item.
			children = array.filter(children, function(item){ return item.region != "center" && item.layoutAlign != "client"; })
				.concat(array.filter(children, function(item){ return item.region == "center" || item.layoutAlign == "client"; }));

			// set positions/sizes
			array.forEach(children, function(child){
				var elm = child.domNode,
					pos = (child.region || child.layoutAlign);
				if(!pos){
					throw new Error("No region setting for " + child.id)
				}

				// set elem to upper left corner of unused space; may move it later
				var elmStyle = elm.style;
				elmStyle.left = dim.l+"px";
				elmStyle.top = dim.t+"px";
				elmStyle.position = "absolute";

				domClass.add(elm, "dijitAlign" + capitalize(pos));

				// Size adjustments to make to this child widget
				var sizeSetting = {};

				// Check for optional size adjustment due to splitter drag (height adjustment for top/bottom align
				// panes and width adjustment for left/right align panes.
				if(changedRegionId && changedRegionId == child.id){
					sizeSetting[child.region == "top" || child.region == "bottom" ? "h" : "w"] = changedRegionSize;
				}

				if(pos == "leading"){
					pos = child.isLeftToRight() ? "left" : "right";
				}
				if(pos == "trailing"){
					pos = child.isLeftToRight() ? "right" : "left";
				}

				// set size && adjust record of remaining space.
				// note that setting the width of a <div> may affect its height.
				if(pos == "top" || pos == "bottom"){
					sizeSetting.w = dim.w;
					size(child, sizeSetting);
					dim.h -= child.h;
					if(pos == "top"){
						dim.t += child.h;
					}else{
						elmStyle.top = dim.t + dim.h + "px";
					}
				}else if(pos == "left" || pos == "right"){
					sizeSetting.h = dim.h;
					size(child, sizeSetting);
					dim.w -= child.w;
					if(pos == "left"){
						dim.l += child.w;
					}else{
						elmStyle.left = dim.l + dim.w + "px";
					}
				}else if(pos == "client" || pos == "center"){
					size(child, dim);
				}
			});
		}
	};

	lang.setObject("dijit.layout.utils", utils);	// remove for 2.0

	return utils;
});

},
'dojo/html':function(){
define(["./_base/kernel", "./_base/lang", "./_base/array", "./_base/declare", "./dom", "./dom-construct", "./parser"],
	function(kernel, lang, darray, declare, dom, domConstruct, parser){
	// module:
	//		dojo/html

	// the parser might be needed..

	// idCounter is incremented with each instantiation to allow assignment of a unique id for tracking, logging purposes
	var idCounter = 0;

	var html = {
		// summary:
		//		TODOC

		_secureForInnerHtml: function(/*String*/ cont){
			// summary:
			//		removes !DOCTYPE and title elements from the html string.
			//
			//		khtml is picky about dom faults, you can't attach a style or `<title>` node as child of body
			//		must go into head, so we need to cut out those tags
			// cont:
			//		An html string for insertion into the dom
			//
			return cont.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig, ""); // String
		},

		// Deprecated, should use dojo/dom-constuct.empty() directly, remove in 2.0.
		_emptyNode: domConstruct.empty,

		_setNodeContent: function(/*DomNode*/ node, /*String|DomNode|NodeList*/ cont){
			// summary:
			//		inserts the given content into the given node
			// node:
			//		the parent element
			// content:
			//		the content to be set on the parent element.
			//		This can be an html string, a node reference or a NodeList, dojo/NodeList, Array or other enumerable list of nodes

			// always empty
			domConstruct.empty(node);

			if(cont){
				if(typeof cont == "string"){
					cont = domConstruct.toDom(cont, node.ownerDocument);
				}
				if(!cont.nodeType && lang.isArrayLike(cont)){
					// handle as enumerable, but it may shrink as we enumerate it
					for(var startlen=cont.length, i=0; i<cont.length; i=startlen==cont.length ? i+1 : 0){
						domConstruct.place( cont[i], node, "last");
					}
				}else{
					// pass nodes, documentFragments and unknowns through to dojo.place
					domConstruct.place(cont, node, "last");
				}
			}

			// return DomNode
			return node;
		},

		// we wrap up the content-setting operation in a object
		_ContentSetter: declare("dojo.html._ContentSetter", null, {
			// node: DomNode|String
			//		An node which will be the parent element that we set content into
			node: "",

			// content: String|DomNode|DomNode[]
			//		The content to be placed in the node. Can be an HTML string, a node reference, or a enumerable list of nodes
			content: "",

			// id: String?
			//		Usually only used internally, and auto-generated with each instance
			id: "",

			// cleanContent: Boolean
			//		Should the content be treated as a full html document,
			//		and the real content stripped of <html>, <body> wrapper before injection
			cleanContent: false,

			// extractContent: Boolean
			//		Should the content be treated as a full html document,
			//		and the real content stripped of `<html> <body>` wrapper before injection
			extractContent: false,

			// parseContent: Boolean
			//		Should the node by passed to the parser after the new content is set
			parseContent: false,

			// parserScope: String
			//		Flag passed to parser.	Root for attribute names to search for.	  If scopeName is dojo,
			//		will search for data-dojo-type (or dojoType).  For backwards compatibility
			//		reasons defaults to dojo._scopeName (which is "dojo" except when
			//		multi-version support is used, when it will be something like dojo16, dojo20, etc.)
			parserScope: kernel._scopeName,

			// startup: Boolean
			//		Start the child widgets after parsing them.	  Only obeyed if parseContent is true.
			startup: true,

			// lifecycle methods
			constructor: function(/*Object*/ params, /*String|DomNode*/ node){
				// summary:
				//		Provides a configurable, extensible object to wrap the setting on content on a node
				//		call the set() method to actually set the content..

				// the original params are mixed directly into the instance "this"
				lang.mixin(this, params || {});

				// give precedence to params.node vs. the node argument
				// and ensure its a node, not an id string
				node = this.node = dom.byId( this.node || node );

				if(!this.id){
					this.id = [
						"Setter",
						(node) ? node.id || node.tagName : "",
						idCounter++
					].join("_");
				}
			},
			set: function(/* String|DomNode|NodeList? */ cont, /*Object?*/ params){
				// summary:
				//		front-end to the set-content sequence
				// cont:
				//		An html string, node or enumerable list of nodes for insertion into the dom
				//		If not provided, the object's content property will be used
				if(undefined !== cont){
					this.content = cont;
				}
				// in the re-use scenario, set needs to be able to mixin new configuration
				if(params){
					this._mixin(params);
				}

				this.onBegin();
				this.setContent();

				var ret = this.onEnd();

				if(ret && ret.then){
					// Make dojox/html/_ContentSetter.set() return a Promise that resolves when load and parse complete.
					return ret;
				}else{
					// Vanilla dojo/html._ContentSetter.set() returns a DOMNode for back compat.   For 2.0, switch it to
					// return a Deferred like above.
					return this.node;
				}
			},

			setContent: function(){
				// summary:
				//		sets the content on the node

				var node = this.node;
				if(!node){
					// can't proceed
					throw new Error(this.declaredClass + ": setContent given no node");
				}
				try{
					node = html._setNodeContent(node, this.content);
				}catch(e){
					// check if a domfault occurs when we are appending this.errorMessage
					// like for instance if domNode is a UL and we try append a DIV

					// FIXME: need to allow the user to provide a content error message string
					var errMess = this.onContentError(e);
					try{
						node.innerHTML = errMess;
					}catch(e){
						 0 && console.error('Fatal ' + this.declaredClass + '.setContent could not change content due to '+e.message, e);
					}
				}
				// always put back the node for the next method
				this.node = node; // DomNode
			},

			empty: function(){
				// summary:
				//		cleanly empty out existing content

				// If there is a parse in progress, cancel it.
				if(this.parseDeferred){
					if(!this.parseDeferred.isResolved()){
						this.parseDeferred.cancel();
					}
					delete this.parseDeferred;
				}

				// destroy any widgets from a previous run
				// NOTE: if you don't want this you'll need to empty
				// the parseResults array property yourself to avoid bad things happening
				if(this.parseResults && this.parseResults.length){
					darray.forEach(this.parseResults, function(w){
						if(w.destroy){
							w.destroy();
						}
					});
					delete this.parseResults;
				}
				// this is fast, but if you know its already empty or safe, you could
				// override empty to skip this step
				domConstruct.empty(this.node);
			},

			onBegin: function(){
				// summary:
				//		Called after instantiation, but before set();
				//		It allows modification of any of the object properties -
				//		including the node and content provided - before the set operation actually takes place
				//		This default implementation checks for cleanContent and extractContent flags to
				//		optionally pre-process html string content
				var cont = this.content;

				if(lang.isString(cont)){
					if(this.cleanContent){
						cont = html._secureForInnerHtml(cont);
					}

					if(this.extractContent){
						var match = cont.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
						if(match){ cont = match[1]; }
					}
				}

				// clean out the node and any cruft associated with it - like widgets
				this.empty();

				this.content = cont;
				return this.node; // DomNode
			},

			onEnd: function(){
				// summary:
				//		Called after set(), when the new content has been pushed into the node
				//		It provides an opportunity for post-processing before handing back the node to the caller
				//		This default implementation checks a parseContent flag to optionally run the dojo parser over the new content
				if(this.parseContent){
					// populates this.parseResults and this.parseDeferred if you need those..
					this._parse();
				}
				return this.node; // DomNode
				// TODO: for 2.0 return a Promise indicating that the parse completed.
			},

			tearDown: function(){
				// summary:
				//		manually reset the Setter instance if its being re-used for example for another set()
				// description:
				//		tearDown() is not called automatically.
				//		In normal use, the Setter instance properties are simply allowed to fall out of scope
				//		but the tearDown method can be called to explicitly reset this instance.
				delete this.parseResults;
				delete this.parseDeferred;
				delete this.node;
				delete this.content;
			},

			onContentError: function(err){
				return "Error occurred setting content: " + err;
			},

			onExecError: function(err){
				return "Error occurred executing scripts: " + err;
			},

			_mixin: function(params){
				// mix properties/methods into the instance
				// TODO: the intention with tearDown is to put the Setter's state
				// back to that of the original constructor (vs. deleting/resetting everything regardless of ctor params)
				// so we could do something here to move the original properties aside for later restoration
				var empty = {}, key;
				for(key in params){
					if(key in empty){ continue; }
					// TODO: here's our opportunity to mask the properties we don't consider configurable/overridable
					// .. but history shows we'll almost always guess wrong
					this[key] = params[key];
				}
			},
			_parse: function(){
				// summary:
				//		runs the dojo parser over the node contents, storing any results in this.parseResults
				//		and the parse promise in this.parseDeferred
				//		Any errors resulting from parsing are passed to _onError for handling

				var rootNode = this.node;
				try{
					// store the results (widgets, whatever) for potential retrieval
					var inherited = {};
					darray.forEach(["dir", "lang", "textDir"], function(name){
						if(this[name]){
							inherited[name] = this[name];
						}
					}, this);
					var self = this;
					this.parseDeferred = parser.parse({
						rootNode: rootNode,
						noStart: !this.startup,
						inherited: inherited,
						scope: this.parserScope
					}).then(function(results){
							return self.parseResults = results;
						}, function(e){
							self._onError('Content', e, "Error parsing in _ContentSetter#" + this.id);
						});
				}catch(e){
					this._onError('Content', e, "Error parsing in _ContentSetter#" + this.id);
				}
			},

			_onError: function(type, err, consoleText){
				// summary:
				//		shows user the string that is returned by on[type]Error
				//		override/implement on[type]Error and return your own string to customize
				var errText = this['on' + type + 'Error'].call(this, err);
				if(consoleText){
					 0 && console.error(consoleText, err);
				}else if(errText){ // a empty string won't change current content
					html._setNodeContent(this.node, errText, true);
				}
			}
		}), // end declare()

		set: function(/*DomNode*/ node, /*String|DomNode|NodeList*/ cont, /*Object?*/ params){
			// summary:
			//		inserts (replaces) the given content into the given node. dojo/dom-construct.place(cont, node, "only")
			//		may be a better choice for simple HTML insertion.
			// description:
			//		Unless you need to use the params capabilities of this method, you should use
			//		dojo/dom-construct.place(cont, node, "only"). dojo/dom-construct..place() has more robust support for injecting
			//		an HTML string into the DOM, but it only handles inserting an HTML string as DOM
			//		elements, or inserting a DOM node. dojo/dom-construct..place does not handle NodeList insertions
			//		dojo/dom-construct.place(cont, node, "only"). dojo/dom-construct.place() has more robust support for injecting
			//		an HTML string into the DOM, but it only handles inserting an HTML string as DOM
			//		elements, or inserting a DOM node. dojo/dom-construct.place does not handle NodeList insertions
			//		or the other capabilities as defined by the params object for this method.
			// node:
			//		the parent element that will receive the content
			// cont:
			//		the content to be set on the parent element.
			//		This can be an html string, a node reference or a NodeList, dojo/NodeList, Array or other enumerable list of nodes
			// params:
			//		Optional flags/properties to configure the content-setting. See dojo/html/_ContentSetter
			// example:
			//		A safe string/node/nodelist content replacement/injection with hooks for extension
			//		Example Usage:
			//	|	html.set(node, "some string");
			//	|	html.set(node, contentNode, {options});
			//	|	html.set(node, myNode.childNodes, {options});
			if(undefined == cont){
				 0 && console.warn("dojo.html.set: no cont argument provided, using empty string");
				cont = "";
			}
			if(!params){
				// simple and fast
				return html._setNodeContent(node, cont, true);
			}else{
				// more options but slower
				// note the arguments are reversed in order, to match the convention for instantiation via the parser
				var op = new html._ContentSetter(lang.mixin(
					params,
					{ content: cont, node: node }
				));
				return op.set();
			}
		}
	};
	lang.setObject("dojo.html", html);

	return html;
});

},
'dojo/parser':function(){
define([
	"require", "./_base/kernel", "./_base/lang", "./_base/array", "./_base/config", "./dom", "./_base/window",
		"./_base/url", "./aspect", "./promise/all", "./date/stamp", "./Deferred", "./has", "./query", "./on", "./ready"
], function(require, dojo, dlang, darray, config, dom, dwindow, _Url, aspect, all, dates, Deferred, has, query, don, ready){

	// module:
	//		dojo/parser

	new Date("X"); // workaround for #11279, new Date("") == NaN

	// data-dojo-props etc. is not restricted to JSON, it can be any javascript
	function myEval(text){
		return eval("(" + text + ")");
	}

	// Widgets like BorderContainer add properties to _Widget via dojo.extend().
	// If BorderContainer is loaded after _Widget's parameter list has been cached,
	// we need to refresh that parameter list (for _Widget and all widgets that extend _Widget).
	var extendCnt = 0;
	aspect.after(dlang, "extend", function(){
		extendCnt++;
	}, true);

	function getNameMap(ctor){
		// summary:
		//		Returns map from lowercase name to attribute name in class, ex: {onclick: "onClick"}
		var map = ctor._nameCaseMap, proto = ctor.prototype;

		// Create the map if it's undefined.
		// Refresh the map if a superclass was possibly extended with new methods since the map was created.
		if(!map || map._extendCnt < extendCnt){
			map = ctor._nameCaseMap = {};
			for(var name in proto){
				if(name.charAt(0) === "_"){
					continue;
				}	// skip internal properties
				map[name.toLowerCase()] = name;
			}
			map._extendCnt = extendCnt;
		}
		return map;
	}

	// Map from widget name or list of widget names(ex: "dijit/form/Button,acme/MyMixin") to a constructor.
	var _ctorMap = {};

	function getCtor(/*String[]*/ types, /*Function?*/ contextRequire){
		// summary:
		//		Retrieves a constructor.  If the types array contains more than one class/MID then the
		//		subsequent classes will be mixed into the first class and a unique constructor will be
		//		returned for that array.

		var ts = types.join();
		if(!_ctorMap[ts]){
			var mixins = [];
			for(var i = 0, l = types.length; i < l; i++){
				var t = types[i];
				// TODO: Consider swapping getObject and require in the future
				mixins[mixins.length] = (_ctorMap[t] = _ctorMap[t] || (dlang.getObject(t) || (~t.indexOf('/') &&
					(contextRequire ? contextRequire(t) : require(t)))));
			}
			var ctor = mixins.shift();
			_ctorMap[ts] = mixins.length ? (ctor.createSubclass ? ctor.createSubclass(mixins) : ctor.extend.apply(ctor, mixins)) : ctor;
		}

		return _ctorMap[ts];
	}

	var parser = {
		// summary:
		//		The Dom/Widget parsing package

		_clearCache: function(){
			// summary:
			//		Clear cached data.   Used mainly for benchmarking.
			extendCnt++;
			_ctorMap = {};
		},

		_functionFromScript: function(script, attrData){
			// summary:
			//		Convert a `<script type="dojo/method" args="a, b, c"> ... </script>`
			//		into a function
			// script: DOMNode
			//		The `<script>` DOMNode
			// attrData: String
			//		For HTML5 compliance, searches for attrData + "args" (typically
			//		"data-dojo-args") instead of "args"
			var preamble = "",
				suffix = "",
				argsStr = (script.getAttribute(attrData + "args") || script.getAttribute("args")),
				withStr = script.getAttribute("with");

			// Convert any arguments supplied in script tag into an array to be passed to the
			var fnArgs = (argsStr || "").split(/\s*,\s*/);

			if(withStr && withStr.length){
				darray.forEach(withStr.split(/\s*,\s*/), function(part){
					preamble += "with(" + part + "){";
					suffix += "}";
				});
			}

			return new Function(fnArgs, preamble + script.innerHTML + suffix);
		},

		instantiate: function(nodes, mixin, options){
			// summary:
			//		Takes array of nodes, and turns them into class instances and
			//		potentially calls a startup method to allow them to connect with
			//		any children.
			// nodes: Array
			//		Array of DOM nodes
			// mixin: Object?
			//		An object that will be mixed in with each node in the array.
			//		Values in the mixin will override values in the node, if they
			//		exist.
			// options: Object?
			//		An object used to hold kwArgs for instantiation.
			//		See parse.options argument for details.
			// returns:
			//		Array of instances.

			mixin = mixin || {};
			options = options || {};

			var dojoType = (options.scope || dojo._scopeName) + "Type", // typically "dojoType"
				attrData = "data-" + (options.scope || dojo._scopeName) + "-", // typically "data-dojo-"
				dataDojoType = attrData + "type", // typically "data-dojo-type"
				dataDojoMixins = attrData + "mixins";					// typically "data-dojo-mixins"

			var list = [];
			darray.forEach(nodes, function(node){
				var type = dojoType in mixin ? mixin[dojoType] : node.getAttribute(dataDojoType) || node.getAttribute(dojoType);
				if(type){
					var mixinsValue = node.getAttribute(dataDojoMixins),
						types = mixinsValue ? [type].concat(mixinsValue.split(/\s*,\s*/)) : [type];

					list.push({
						node: node,
						types: types
					});
				}
			});

			// Instantiate the nodes and return the list of instances.
			return this._instantiate(list, mixin, options);
		},

		_instantiate: function(nodes, mixin, options, returnPromise){
			// summary:
			//		Takes array of objects representing nodes, and turns them into class instances and
			//		potentially calls a startup method to allow them to connect with
			//		any children.
			// nodes: Array
			//		Array of objects like
			//	|		{
			//	|			ctor: Function (may be null)
			//	|			types: ["dijit/form/Button", "acme/MyMixin"] (used if ctor not specified)
			//	|			node: DOMNode,
			//	|			scripts: [ ... ],	// array of <script type="dojo/..."> children of node
			//	|			inherited: { ... }	// settings inherited from ancestors like dir, theme, etc.
			//	|		}
			// mixin: Object
			//		An object that will be mixed in with each node in the array.
			//		Values in the mixin will override values in the node, if they
			//		exist.
			// options: Object
			//		An options object used to hold kwArgs for instantiation.
			//		See parse.options argument for details.
			// returnPromise: Boolean
			//		Return a Promise rather than the instance; supports asynchronous widget creation.
			// returns:
			//		Array of instances, or if returnPromise is true, a promise for array of instances
			//		that resolves when instances have finished initializing.

			// Call widget constructors.   Some may be asynchronous and return promises.
			var thelist = darray.map(nodes, function(obj){
				var ctor = obj.ctor || getCtor(obj.types, options.contextRequire);
				// If we still haven't resolved a ctor, it is fatal now
				if(!ctor){
					throw new Error("Unable to resolve constructor for: '" + obj.types.join() + "'");
				}
				return this.construct(ctor, obj.node, mixin, options, obj.scripts, obj.inherited);
			}, this);

			// After all widget construction finishes, call startup on each top level instance if it makes sense (as for
			// widgets).  Parent widgets will recursively call startup on their (non-top level) children
			function onConstruct(thelist){
				if(!mixin._started && !options.noStart){
					darray.forEach(thelist, function(instance){
						if(typeof instance.startup === "function" && !instance._started){
							instance.startup();
						}
					});
				}

				return thelist;
			}

			if(returnPromise){
				return all(thelist).then(onConstruct);
			}else{
				// Back-compat path, remove for 2.0
				return onConstruct(thelist);
			}
		},

		construct: function(ctor, node, mixin, options, scripts, inherited){
			// summary:
			//		Calls new ctor(params, node), where params is the hash of parameters specified on the node,
			//		excluding data-dojo-type and data-dojo-mixins.   Does not call startup().
			// ctor: Function
			//		Widget constructor.
			// node: DOMNode
			//		This node will be replaced/attached to by the widget.  It also specifies the arguments to pass to ctor.
			// mixin: Object?
			//		Attributes in this object will be passed as parameters to ctor,
			//		overriding attributes specified on the node.
			// options: Object?
			//		An options object used to hold kwArgs for instantiation.   See parse.options argument for details.
			// scripts: DomNode[]?
			//		Array of `<script type="dojo/*">` DOMNodes.  If not specified, will search for `<script>` tags inside node.
			// inherited: Object?
			//		Settings from dir=rtl or lang=... on a node above this node.   Overrides options.inherited.
			// returns:
			//		Instance or Promise for the instance, if markupFactory() itself returned a promise

			var proto = ctor && ctor.prototype;
			options = options || {};

			// Setup hash to hold parameter settings for this widget.	Start with the parameter
			// settings inherited from ancestors ("dir" and "lang").
			// Inherited setting may later be overridden by explicit settings on node itself.
			var params = {};

			if(options.defaults){
				// settings for the document itself (or whatever subtree is being parsed)
				dlang.mixin(params, options.defaults);
			}
			if(inherited){
				// settings from dir=rtl or lang=... on a node above this node
				dlang.mixin(params, inherited);
			}

			// Get list of attributes explicitly listed in the markup
			var attributes;
			if(has("dom-attributes-explicit")){
				// Standard path to get list of user specified attributes
				attributes = node.attributes;
			}else if(has("dom-attributes-specified-flag")){
				// Special processing needed for IE8, to skip a few faux values in attributes[]
				attributes = darray.filter(node.attributes, function(a){
					return a.specified;
				});
			}else{
				// Special path for IE6-7, avoid (sometimes >100) bogus entries in node.attributes
				var clone = /^input$|^img$/i.test(node.nodeName) ? node : node.cloneNode(false),
					attrs = clone.outerHTML.replace(/=[^\s"']+|="[^"]*"|='[^']*'/g, "").replace(/^\s*<[a-zA-Z0-9]*\s*/, "").replace(/\s*>.*$/, "");

				attributes = darray.map(attrs.split(/\s+/), function(name){
					var lcName = name.toLowerCase();
					return {
						name: name,
						// getAttribute() doesn't work for button.value, returns innerHTML of button.
						// but getAttributeNode().value doesn't work for the form.encType or li.value
						value: (node.nodeName == "LI" && name == "value") || lcName == "enctype" ?
							node.getAttribute(lcName) : node.getAttributeNode(lcName).value
					};
				});
			}

			// Hash to convert scoped attribute name (ex: data-dojo17-params) to something friendly (ex: data-dojo-params)
			// TODO: remove scope for 2.0
			var scope = options.scope || dojo._scopeName,
				attrData = "data-" + scope + "-", // typically "data-dojo-"
				hash = {};
			if(scope !== "dojo"){
				hash[attrData + "props"] = "data-dojo-props";
				hash[attrData + "type"] = "data-dojo-type";
				hash[attrData + "mixins"] = "data-dojo-mixins";
				hash[scope + "type"] = "dojoType";
				hash[attrData + "id"] = "data-dojo-id";
			}

			// Read in attributes and process them, including data-dojo-props, data-dojo-type,
			// dojoAttachPoint, etc., as well as normal foo=bar attributes.
			var i = 0, item, funcAttrs = [], jsname, extra;
			while(item = attributes[i++]){
				var name = item.name,
					lcName = name.toLowerCase(),
					value = item.value;

				switch(hash[lcName] || lcName){
				// Already processed, just ignore
				case "data-dojo-type":
				case "dojotype":
				case "data-dojo-mixins":
					break;

				// Data-dojo-props.   Save for later to make sure it overrides direct foo=bar settings
				case "data-dojo-props":
					extra = value;
					break;

				// data-dojo-id or jsId. TODO: drop jsId in 2.0
				case "data-dojo-id":
				case "jsid":
					jsname = value;
					break;

				// For the benefit of _Templated
				case "data-dojo-attach-point":
				case "dojoattachpoint":
					params.dojoAttachPoint = value;
					break;
				case "data-dojo-attach-event":
				case "dojoattachevent":
					params.dojoAttachEvent = value;
					break;

				// Special parameter handling needed for IE
				case "class":
					params["class"] = node.className;
					break;
				case "style":
					params["style"] = node.style && node.style.cssText;
					break;
				default:
					// Normal attribute, ex: value="123"

					// Find attribute in widget corresponding to specified name.
					// May involve case conversion, ex: onclick --> onClick
					if(!(name in proto)){
						var map = getNameMap(ctor);
						name = map[lcName] || name;
					}

					// Set params[name] to value, doing type conversion
					if(name in proto){
						switch(typeof proto[name]){
						case "string":
							params[name] = value;
							break;
						case "number":
							params[name] = value.length ? Number(value) : NaN;
							break;
						case "boolean":
							// for checked/disabled value might be "" or "checked".	 interpret as true.
							params[name] = value.toLowerCase() != "false";
							break;
						case "function":
							if(value === "" || value.search(/[^\w\.]+/i) != -1){
								// The user has specified some text for a function like "return x+5"
								params[name] = new Function(value);
							}else{
								// The user has specified the name of a global function like "myOnClick"
								// or a single word function "return"
								params[name] = dlang.getObject(value, false) || new Function(value);
							}
							funcAttrs.push(name);	// prevent "double connect", see #15026
							break;
						default:
							var pVal = proto[name];
							params[name] =
								(pVal && "length" in pVal) ? (value ? value.split(/\s*,\s*/) : []) :	// array
									(pVal instanceof Date) ?
										(value == "" ? new Date("") :	// the NaN of dates
										value == "now" ? new Date() :	// current date
										dates.fromISOString(value)) :
								(pVal instanceof _Url) ? (dojo.baseUrl + value) :
								myEval(value);
						}
					}else{
						params[name] = value;
					}
				}
			}

			// Remove function attributes from DOMNode to prevent "double connect" problem, see #15026.
			// Do this as a separate loop since attributes[] is often a live collection (depends on the browser though).
			for(var j = 0; j < funcAttrs.length; j++){
				var lcfname = funcAttrs[j].toLowerCase();
				node.removeAttribute(lcfname);
				node[lcfname] = null;
			}

			// Mix things found in data-dojo-props into the params, overriding any direct settings
			if(extra){
				try{
					extra = myEval.call(options.propsThis, "{" + extra + "}");
					dlang.mixin(params, extra);
				}catch(e){
					// give the user a pointer to their invalid parameters. FIXME: can we kill this in production?
					throw new Error(e.toString() + " in data-dojo-props='" + extra + "'");
				}
			}

			// Any parameters specified in "mixin" override everything else.
			dlang.mixin(params, mixin);

			// Get <script> nodes associated with this widget, if they weren't specified explicitly
			if(!scripts){
				scripts = (ctor && (ctor._noScript || proto._noScript) ? [] : query("> script[type^='dojo/']", node));
			}

			// Process <script type="dojo/*"> script tags
			// <script type="dojo/method" data-dojo-event="foo"> tags are added to params, and passed to
			// the widget on instantiation.
			// <script type="dojo/method"> tags (with no event) are executed after instantiation
			// <script type="dojo/connect" data-dojo-event="foo"> tags are dojo.connected after instantiation,
			// and likewise with <script type="dojo/aspect" data-dojo-method="foo">
			// <script type="dojo/watch" data-dojo-prop="foo"> tags are dojo.watch after instantiation
			// <script type="dojo/on" data-dojo-event="foo"> tags are dojo.on after instantiation
			// note: dojo/* script tags cannot exist in self closing widgets, like <input />
			var aspects = [],	// aspects to connect after instantiation
				calls = [],		// functions to call after instantiation
				watches = [],  // functions to watch after instantiation
				ons = []; // functions to on after instantiation

			if(scripts){
				for(i = 0; i < scripts.length; i++){
					var script = scripts[i];
					node.removeChild(script);
					// FIXME: drop event="" support in 2.0. use data-dojo-event="" instead
					var event = (script.getAttribute(attrData + "event") || script.getAttribute("event")),
						prop = script.getAttribute(attrData + "prop"),
						method = script.getAttribute(attrData + "method"),
						advice = script.getAttribute(attrData + "advice"),
						scriptType = script.getAttribute("type"),
						nf = this._functionFromScript(script, attrData);
					if(event){
						if(scriptType == "dojo/connect"){
							aspects.push({ method: event, func: nf });
						}else if(scriptType == "dojo/on"){
							ons.push({ event: event, func: nf });
						}else{
							// <script type="dojo/method" data-dojo-event="foo">
							// TODO for 2.0: use data-dojo-method="foo" instead (also affects dijit/Declaration)
							params[event] = nf;
						}
					}else if(scriptType == "dojo/aspect"){
						aspects.push({ method: method, advice: advice, func: nf });
					}else if(scriptType == "dojo/watch"){
						watches.push({ prop: prop, func: nf });
					}else{
						calls.push(nf);
					}
				}
			}

			// create the instance
			var markupFactory = ctor.markupFactory || proto.markupFactory;
			var instance = markupFactory ? markupFactory(params, node, ctor) : new ctor(params, node);

			function onInstantiate(instance){
				// map it to the JS namespace if that makes sense
				if(jsname){
					dlang.setObject(jsname, instance);
				}

				// process connections and startup functions
				for(i = 0; i < aspects.length; i++){
					aspect[aspects[i].advice || "after"](instance, aspects[i].method, dlang.hitch(instance, aspects[i].func), true);
				}
				for(i = 0; i < calls.length; i++){
					calls[i].call(instance);
				}
				for(i = 0; i < watches.length; i++){
					instance.watch(watches[i].prop, watches[i].func);
				}
				for(i = 0; i < ons.length; i++){
					don(instance, ons[i].event, ons[i].func);
				}

				return instance;
			}

			if(instance.then){
				return instance.then(onInstantiate);
			}else{
				return onInstantiate(instance);
			}
		},

		scan: function(root, options){
			// summary:
			//		Scan a DOM tree and return an array of objects representing the DOMNodes
			//		that need to be turned into widgets.
			// description:
			//		Search specified node (or document root node) recursively for class instances
			//		and return an array of objects that represent potential widgets to be
			//		instantiated. Searches for either data-dojo-type="MID" or dojoType="MID" where
			//		"MID" is a module ID like "dijit/form/Button" or a fully qualified Class name
			//		like "dijit/form/Button".  If the MID is not currently available, scan will
			//		attempt to require() in the module.
			//
			//		See parser.parse() for details of markup.
			// root: DomNode?
			//		A default starting root node from which to start the parsing. Can be
			//		omitted, defaulting to the entire document. If omitted, the `options`
			//		object can be passed in this place. If the `options` object has a
			//		`rootNode` member, that is used.
			// options: Object
			//		a kwArgs options object, see parse() for details
			//
			// returns: Promise
			//		A promise that is resolved with the nodes that have been parsed.

			var list = [], // Output List
				mids = [], // An array of modules that are not yet loaded
				midsHash = {}; // Used to keep the mids array unique

			var dojoType = (options.scope || dojo._scopeName) + "Type", // typically "dojoType"
				attrData = "data-" + (options.scope || dojo._scopeName) + "-", // typically "data-dojo-"
				dataDojoType = attrData + "type", // typically "data-dojo-type"
				dataDojoTextDir = attrData + "textdir", // typically "data-dojo-textdir"
				dataDojoMixins = attrData + "mixins";					// typically "data-dojo-mixins"

			// Info on DOMNode currently being processed
			var node = root.firstChild;

			// Info on parent of DOMNode currently being processed
			//	- inherited: dir, lang, and textDir setting of parent, or inherited by parent
			//	- parent: pointer to identical structure for my parent (or null if no parent)
			//	- scripts: if specified, collects <script type="dojo/..."> type nodes from children
			var inherited = options.inherited;
			if(!inherited){
				function findAncestorAttr(node, attr){
					return (node.getAttribute && node.getAttribute(attr)) ||
						(node.parentNode && findAncestorAttr(node.parentNode, attr));
				}

				inherited = {
					dir: findAncestorAttr(root, "dir"),
					lang: findAncestorAttr(root, "lang"),
					textDir: findAncestorAttr(root, dataDojoTextDir)
				};
				for(var key in inherited){
					if(!inherited[key]){
						delete inherited[key];
					}
				}
			}

			// Metadata about parent node
			var parent = {
				inherited: inherited
			};

			// For collecting <script type="dojo/..."> type nodes (when null, we don't need to collect)
			var scripts;

			// when true, only look for <script type="dojo/..."> tags, and don't recurse to children
			var scriptsOnly;

			function getEffective(parent){
				// summary:
				//		Get effective dir, lang, textDir settings for specified obj
				//		(matching "parent" object structure above), and do caching.
				//		Take care not to return null entries.
				if(!parent.inherited){
					parent.inherited = {};
					var node = parent.node,
						grandparent = getEffective(parent.parent);
					var inherited = {
						dir: node.getAttribute("dir") || grandparent.dir,
						lang: node.getAttribute("lang") || grandparent.lang,
						textDir: node.getAttribute(dataDojoTextDir) || grandparent.textDir
					};
					for(var key in inherited){
						if(inherited[key]){
							parent.inherited[key] = inherited[key];
						}
					}
				}
				return parent.inherited;
			}

			// DFS on DOM tree, collecting nodes with data-dojo-type specified.
			while(true){
				if(!node){
					// Finished this level, continue to parent's next sibling
					if(!parent || !parent.node){
						break;
					}
					node = parent.node.nextSibling;
					scriptsOnly = false;
					parent = parent.parent;
					scripts = parent.scripts;
					continue;
				}

				if(node.nodeType != 1){
					// Text or comment node, skip to next sibling
					node = node.nextSibling;
					continue;
				}

				if(scripts && node.nodeName.toLowerCase() == "script"){
					// Save <script type="dojo/..."> for parent, then continue to next sibling
					type = node.getAttribute("type");
					if(type && /^dojo\/\w/i.test(type)){
						scripts.push(node);
					}
					node = node.nextSibling;
					continue;
				}
				if(scriptsOnly){
					// scriptsOnly flag is set, we have already collected scripts if the parent wants them, so now we shouldn't
					// continue further analysis of the node and will continue to the next sibling
					node = node.nextSibling;
					continue;
				}

				// Check for data-dojo-type attribute, fallback to backward compatible dojoType
				// TODO: Remove dojoType in 2.0
				var type = node.getAttribute(dataDojoType) || node.getAttribute(dojoType);

				// Short circuit for leaf nodes containing nothing [but text]
				var firstChild = node.firstChild;
				if(!type && (!firstChild || (firstChild.nodeType == 3 && !firstChild.nextSibling))){
					node = node.nextSibling;
					continue;
				}

				// Meta data about current node
				var current;

				var ctor = null;
				if(type){
					// If dojoType/data-dojo-type specified, add to output array of nodes to instantiate.
					var mixinsValue = node.getAttribute(dataDojoMixins),
						types = mixinsValue ? [type].concat(mixinsValue.split(/\s*,\s*/)) : [type];

					// Note: won't find classes declared via dojo/Declaration or any modules that haven't been
					// loaded yet so use try/catch to avoid throw from require()
					try{
						ctor = getCtor(types, options.contextRequire);
					}catch(e){}

					// If the constructor was not found, check to see if it has modules that can be loaded
					if(!ctor){
						darray.forEach(types, function(t){
							if(~t.indexOf('/') && !midsHash[t]){
								// If the type looks like a MID and it currently isn't in the array of MIDs to load, add it.
								midsHash[t] = true;
								mids[mids.length] = t;
							}
						});
					}

					var childScripts = ctor && !ctor.prototype._noScript ? [] : null; // <script> nodes that are parent's children

					// Setup meta data about this widget node, and save it to list of nodes to instantiate
					current = {
						types: types,
						ctor: ctor,
						parent: parent,
						node: node,
						scripts: childScripts
					};
					current.inherited = getEffective(current); // dir & lang settings for current node, explicit or inherited
					list.push(current);
				}else{
					// Meta data about this non-widget node
					current = {
						node: node,
						scripts: scripts,
						parent: parent
					};
				}

				// Recurse, collecting <script type="dojo/..."> children, and also looking for
				// descendant nodes with dojoType specified (unless the widget has the stopParser flag).
				// When finished with children, go to my next sibling.
				scripts = childScripts;
				scriptsOnly = node.stopParser || (ctor && ctor.prototype.stopParser && !(options.template));
				parent = current;
				node = firstChild;
			}

			var d = new Deferred();

			// If there are modules to load then require them in
			if(mids.length){
				// Warn that there are modules being auto-required
				if( true ){
					 0 && console.warn("WARNING: Modules being Auto-Required: " + mids.join(", "));
				}
				var r = options.contextRequire || require;
				r(mids, function(){
					// Go through list of widget nodes, filling in missing constructors, and filtering out nodes that shouldn't
					// be instantiated due to a stopParser flag on an ancestor that we belatedly learned about due to
					// auto-require of a module like ContentPane.   Assumes list is in DFS order.
					d.resolve(darray.filter(list, function(widget){
						if(!widget.ctor){
							// Attempt to find the constructor again.   Still won't find classes defined via
							// dijit/Declaration so need to try/catch.
							try{
								widget.ctor = getCtor(widget.types, options.contextRequire);
							}catch(e){}
						}

						// Get the parent widget
						var parent = widget.parent;
						while(parent && !parent.types){
							parent = parent.parent;
						}

						// Return false if this node should be skipped due to stopParser on an ancestor.
						// Since list[] is in DFS order, this loop will always set parent.instantiateChildren before
						// trying to compute widget.instantiate.
						var proto = widget.ctor && widget.ctor.prototype;
						widget.instantiateChildren = !(proto && proto.stopParser && !(options.template));
						widget.instantiate = !parent || (parent.instantiate && parent.instantiateChildren);
						return widget.instantiate;
					}));
				});
			}else{
				// There were no modules to load, so just resolve with the parsed nodes.   This separate code path is for
				// efficiency, to avoid running the require() and the callback code above.
				d.resolve(list);
			}

			// Return the promise
			return d.promise;
		},

		_require: function(/*DOMNode*/ script, /*Object?*/ options){
			// summary:
			//		Helper for _scanAMD().  Takes a `<script type=dojo/require>bar: "acme/bar", ...</script>` node,
			//		calls require() to load the specified modules and (asynchronously) assign them to the specified global
			//		variables, and returns a Promise for when that operation completes.
			//
			//		In the example above, it is effectively doing a require(["acme/bar", ...], function(a){ bar = a; }).

			var hash = myEval("{" + script.innerHTML + "}"), // can't use dojo/json::parse() because maybe no quotes
				vars = [],
				mids = [],
				d = new Deferred();

			var contextRequire = (options && options.contextRequire) || require;

			for(var name in hash){
				vars.push(name);
				mids.push(hash[name]);
			}

			contextRequire(mids, function(){
				for(var i = 0; i < vars.length; i++){
					dlang.setObject(vars[i], arguments[i]);
				}
				d.resolve(arguments);
			});

			return d.promise;
		},

		_scanAmd: function(root, options){
			// summary:
			//		Scans the DOM for any declarative requires and returns their values.
			// description:
			//		Looks for `<script type=dojo/require>bar: "acme/bar", ...</script>` node, calls require() to load the
			//		specified modules and (asynchronously) assign them to the specified global variables,
			//		and returns a Promise for when those operations complete.
			// root: DomNode
			//		The node to base the scan from.
			// options: Object?
			//		a kwArgs options object, see parse() for details

			// Promise that resolves when all the <script type=dojo/require> nodes have finished loading.
			var deferred = new Deferred(),
				promise = deferred.promise;
			deferred.resolve(true);

			var self = this;
			query("script[type='dojo/require']", root).forEach(function(node){
				// Fire off require() call for specified modules.  Chain this require to fire after
				// any previous requires complete, so that layers can be loaded before individual module require()'s fire.
				promise = promise.then(function(){
					return self._require(node, options);
				});

				// Remove from DOM so it isn't seen again
				node.parentNode.removeChild(node);
			});

			return promise;
		},

		parse: function(rootNode, options){
			// summary:
			//		Scan the DOM for class instances, and instantiate them.
			// description:
			//		Search specified node (or root node) recursively for class instances,
			//		and instantiate them. Searches for either data-dojo-type="Class" or
			//		dojoType="Class" where "Class" is a a fully qualified class name,
			//		like `dijit/form/Button`
			//
			//		Using `data-dojo-type`:
			//		Attributes using can be mixed into the parameters used to instantiate the
			//		Class by using a `data-dojo-props` attribute on the node being converted.
			//		`data-dojo-props` should be a string attribute to be converted from JSON.
			//
			//		Using `dojoType`:
			//		Attributes are read from the original domNode and converted to appropriate
			//		types by looking up the Class prototype values. This is the default behavior
			//		from Dojo 1.0 to Dojo 1.5. `dojoType` support is deprecated, and will
			//		go away in Dojo 2.0.
			// rootNode: DomNode?
			//		A default starting root node from which to start the parsing. Can be
			//		omitted, defaulting to the entire document. If omitted, the `options`
			//		object can be passed in this place. If the `options` object has a
			//		`rootNode` member, that is used.
			// options: Object?
			//		A hash of options.
			//
			//		- noStart: Boolean?:
			//			when set will prevent the parser from calling .startup()
			//			when locating the nodes.
			//		- rootNode: DomNode?:
			//			identical to the function's `rootNode` argument, though
			//			allowed to be passed in via this `options object.
			//		- template: Boolean:
			//			If true, ignores ContentPane's stopParser flag and parses contents inside of
			//			a ContentPane inside of a template.   This allows dojoAttachPoint on widgets/nodes
			//			nested inside the ContentPane to work.
			//		- inherited: Object:
			//			Hash possibly containing dir and lang settings to be applied to
			//			parsed widgets, unless there's another setting on a sub-node that overrides
			//		- scope: String:
			//			Root for attribute names to search for.   If scopeName is dojo,
			//			will search for data-dojo-type (or dojoType).   For backwards compatibility
			//			reasons defaults to dojo._scopeName (which is "dojo" except when
			//			multi-version support is used, when it will be something like dojo16, dojo20, etc.)
			//		- propsThis: Object:
			//			If specified, "this" referenced from data-dojo-props will refer to propsThis.
			//			Intended for use from the widgets-in-template feature of `dijit._WidgetsInTemplateMixin`
			//		- contextRequire: Function:
			//			If specified, this require is utilised for looking resolving modules instead of the
			//			`dojo/parser` context `require()`.  Intended for use from the widgets-in-template feature of
			//			`dijit._WidgetsInTemplateMixin`.
			// returns: Mixed
			//		Returns a blended object that is an array of the instantiated objects, but also can include
			//		a promise that is resolved with the instantiated objects.  This is done for backwards
			//		compatibility.  If the parser auto-requires modules, it will always behave in a promise
			//		fashion and `parser.parse().then(function(instances){...})` should be used.
			// example:
			//		Parse all widgets on a page:
			//	|		parser.parse();
			// example:
			//		Parse all classes within the node with id="foo"
			//	|		parser.parse(dojo.byId('foo'));
			// example:
			//		Parse all classes in a page, but do not call .startup() on any
			//		child
			//	|		parser.parse({ noStart: true })
			// example:
			//		Parse all classes in a node, but do not call .startup()
			//	|		parser.parse(someNode, { noStart:true });
			//	|		// or
			//	|		parser.parse({ noStart:true, rootNode: someNode });

			// determine the root node and options based on the passed arguments.
			var root;
			if(!options && rootNode && rootNode.rootNode){
				options = rootNode;
				root = options.rootNode;
			}else if(rootNode && dlang.isObject(rootNode) && !("nodeType" in rootNode)){
				options = rootNode;
			}else{
				root = rootNode;
			}
			root = root ? dom.byId(root) : dwindow.body();

			options = options || {};

			var mixin = options.template ? { template: true } : {},
				instances = [],
				self = this;

			// First scan for any <script type=dojo/require> nodes, and execute.
			// Then scan for all nodes with data-dojo-type, and load any unloaded modules.
			// Then build the object instances.  Add instances to already existing (but empty) instances[] array,
			// which may already have been returned to caller.  Also, use otherwise to collect and throw any errors
			// that occur during the parse().
			var p =
				this._scanAmd(root, options).then(function(){
					return self.scan(root, options);
				}).then(function(parsedNodes){
					return self._instantiate(parsedNodes, mixin, options, true);
				}).then(function(_instances){
					// Copy the instances into the instances[] array we declared above, and are accessing as
					// our return value.
					return instances = instances.concat(_instances);
				}).otherwise(function(e){
					// TODO Modify to follow better pattern for promise error management when available
					 0 && console.error("dojo/parser::parse() error", e);
					throw e;
				});

			// Blend the array with the promise
			dlang.mixin(instances, p);
			return instances;
		}
	};

	if( 1 ){
		dojo.parser = parser;
	}

	// Register the parser callback. It should be the first callback
	// after the a11y test.
	if(config.parseOnLoad){
		ready(100, parser, "parse");
	}

	return parser;
});

},
'dojo/_base/url':function(){
define(["./kernel"], function(dojo){
	// module:
	//		dojo/url

	var
		ore = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),
		ire = new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$"),
		_Url = function(){
			var n = null,
				_a = arguments,
				uri = [_a[0]];
			// resolve uri components relative to each other
			for(var i = 1; i<_a.length; i++){
				if(!_a[i]){ continue; }

				// Safari doesn't support this.constructor so we have to be explicit
				// FIXME: Tracked (and fixed) in Webkit bug 3537.
				//		http://bugs.webkit.org/show_bug.cgi?id=3537
				var relobj = new _Url(_a[i]+""),
					uriobj = new _Url(uri[0]+"");

				if(
					relobj.path == "" &&
					!relobj.scheme &&
					!relobj.authority &&
					!relobj.query
				){
					if(relobj.fragment != n){
						uriobj.fragment = relobj.fragment;
					}
					relobj = uriobj;
				}else if(!relobj.scheme){
					relobj.scheme = uriobj.scheme;

					if(!relobj.authority){
						relobj.authority = uriobj.authority;

						if(relobj.path.charAt(0) != "/"){
							var path = uriobj.path.substring(0,
								uriobj.path.lastIndexOf("/") + 1) + relobj.path;

							var segs = path.split("/");
							for(var j = 0; j < segs.length; j++){
								if(segs[j] == "."){
									// flatten "./" references
									if(j == segs.length - 1){
										segs[j] = "";
									}else{
										segs.splice(j, 1);
										j--;
									}
								}else if(j > 0 && !(j == 1 && segs[0] == "") &&
									segs[j] == ".." && segs[j-1] != ".."){
									// flatten "../" references
									if(j == (segs.length - 1)){
										segs.splice(j, 1);
										segs[j - 1] = "";
									}else{
										segs.splice(j - 1, 2);
										j -= 2;
									}
								}
							}
							relobj.path = segs.join("/");
						}
					}
				}

				uri = [];
				if(relobj.scheme){
					uri.push(relobj.scheme, ":");
				}
				if(relobj.authority){
					uri.push("//", relobj.authority);
				}
				uri.push(relobj.path);
				if(relobj.query){
					uri.push("?", relobj.query);
				}
				if(relobj.fragment){
					uri.push("#", relobj.fragment);
				}
			}

			this.uri = uri.join("");

			// break the uri into its main components
			var r = this.uri.match(ore);

			this.scheme = r[2] || (r[1] ? "" : n);
			this.authority = r[4] || (r[3] ? "" : n);
			this.path = r[5]; // can never be undefined
			this.query = r[7] || (r[6] ? "" : n);
			this.fragment	 = r[9] || (r[8] ? "" : n);

			if(this.authority != n){
				// server based naming authority
				r = this.authority.match(ire);

				this.user = r[3] || n;
				this.password = r[4] || n;
				this.host = r[6] || r[7]; // ipv6 || ipv4
				this.port = r[9] || n;
			}
		};
	_Url.prototype.toString = function(){ return this.uri; };

	return dojo._Url = _Url;
});

},
'dojo/date/stamp':function(){
define(["../_base/lang", "../_base/array"], function(lang, array){

// module:
//		dojo/date/stamp

var stamp = {
	// summary:
	//		TODOC
};
lang.setObject("dojo.date.stamp", stamp);

// Methods to convert dates to or from a wire (string) format using well-known conventions

stamp.fromISOString = function(/*String*/ formattedString, /*Number?*/ defaultTime){
	// summary:
	//		Returns a Date object given a string formatted according to a subset of the ISO-8601 standard.
	//
	// description:
	//		Accepts a string formatted according to a profile of ISO8601 as defined by
	//		[RFC3339](http://www.ietf.org/rfc/rfc3339.txt), except that partial input is allowed.
	//		Can also process dates as specified [by the W3C](http://www.w3.org/TR/NOTE-datetime)
	//		The following combinations are valid:
	//
	//		- dates only
	//			- yyyy
	//			- yyyy-MM
	//			- yyyy-MM-dd
	//		- times only, with an optional time zone appended
	//			- THH:mm
	//			- THH:mm:ss
	//			- THH:mm:ss.SSS
	//		- and "datetimes" which could be any combination of the above
	//
	//		timezones may be specified as Z (for UTC) or +/- followed by a time expression HH:mm
	//		Assumes the local time zone if not specified.  Does not validate.  Improperly formatted
	//		input may return null.  Arguments which are out of bounds will be handled
	//		by the Date constructor (e.g. January 32nd typically gets resolved to February 1st)
	//		Only years between 100 and 9999 are supported.
  	// formattedString:
	//		A string such as 2005-06-30T08:05:00-07:00 or 2005-06-30 or T08:05:00
	// defaultTime:
	//		Used for defaults for fields omitted in the formattedString.
	//		Uses 1970-01-01T00:00:00.0Z by default.

	if(!stamp._isoRegExp){
		stamp._isoRegExp =
//TODO: could be more restrictive and check for 00-59, etc.
			/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;
	}

	var match = stamp._isoRegExp.exec(formattedString),
		result = null;

	if(match){
		match.shift();
		if(match[1]){match[1]--;} // Javascript Date months are 0-based
		if(match[6]){match[6] *= 1000;} // Javascript Date expects fractional seconds as milliseconds

		if(defaultTime){
			// mix in defaultTime.  Relatively expensive, so use || operators for the fast path of defaultTime === 0
			defaultTime = new Date(defaultTime);
			array.forEach(array.map(["FullYear", "Month", "Date", "Hours", "Minutes", "Seconds", "Milliseconds"], function(prop){
				return defaultTime["get" + prop]();
			}), function(value, index){
				match[index] = match[index] || value;
			});
		}
		result = new Date(match[0]||1970, match[1]||0, match[2]||1, match[3]||0, match[4]||0, match[5]||0, match[6]||0); //TODO: UTC defaults
		if(match[0] < 100){
			result.setFullYear(match[0] || 1970);
		}

		var offset = 0,
			zoneSign = match[7] && match[7].charAt(0);
		if(zoneSign != 'Z'){
			offset = ((match[8] || 0) * 60) + (Number(match[9]) || 0);
			if(zoneSign != '-'){ offset *= -1; }
		}
		if(zoneSign){
			offset -= result.getTimezoneOffset();
		}
		if(offset){
			result.setTime(result.getTime() + offset * 60000);
		}
	}

	return result; // Date or null
};

/*=====
var __Options = {
	// selector: String
	//		"date" or "time" for partial formatting of the Date object.
	//		Both date and time will be formatted by default.
	// zulu: Boolean
	//		if true, UTC/GMT is used for a timezone
	// milliseconds: Boolean
	//		if true, output milliseconds
};
=====*/

stamp.toISOString = function(/*Date*/ dateObject, /*__Options?*/ options){
	// summary:
	//		Format a Date object as a string according a subset of the ISO-8601 standard
	//
	// description:
	//		When options.selector is omitted, output follows [RFC3339](http://www.ietf.org/rfc/rfc3339.txt)
	//		The local time zone is included as an offset from GMT, except when selector=='time' (time without a date)
	//		Does not check bounds.  Only years between 100 and 9999 are supported.
	//
	// dateObject:
	//		A Date object

	var _ = function(n){ return (n < 10) ? "0" + n : n; };
	options = options || {};
	var formattedDate = [],
		getter = options.zulu ? "getUTC" : "get",
		date = "";
	if(options.selector != "time"){
		var year = dateObject[getter+"FullYear"]();
		date = ["0000".substr((year+"").length)+year, _(dateObject[getter+"Month"]()+1), _(dateObject[getter+"Date"]())].join('-');
	}
	formattedDate.push(date);
	if(options.selector != "date"){
		var time = [_(dateObject[getter+"Hours"]()), _(dateObject[getter+"Minutes"]()), _(dateObject[getter+"Seconds"]())].join(':');
		var millis = dateObject[getter+"Milliseconds"]();
		if(options.milliseconds){
			time += "."+ (millis < 100 ? "0" : "") + _(millis);
		}
		if(options.zulu){
			time += "Z";
		}else if(options.selector != "time"){
			var timezoneOffset = dateObject.getTimezoneOffset();
			var absOffset = Math.abs(timezoneOffset);
			time += (timezoneOffset > 0 ? "-" : "+") +
				_(Math.floor(absOffset/60)) + ":" + _(absOffset%60);
		}
		formattedDate.push(time);
	}
	return formattedDate.join('T'); // String
};

return stamp;
});

},
'dijit/form/Button':function(){
define([
	"require",
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.toggle
	"dojo/has", // has("dijit-legacy-requires")
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.trim
	"dojo/ready",
	"./_FormWidget",
	"./_ButtonMixin",
	"dojo/text!./templates/Button.html",
	"../a11yclick"	// template uses ondijitclick
], function(require, declare, domClass, has, kernel, lang, ready, _FormWidget, _ButtonMixin, template){

	// module:
	//		dijit/form/Button

	// Back compat w/1.6, remove for 2.0
	if(has("dijit-legacy-requires")){
		ready(0, function(){
			var requires = ["dijit/form/DropDownButton", "dijit/form/ComboButton", "dijit/form/ToggleButton"];
			require(requires);	// use indirection so modules not rolled into a build
		});
	}

	var Button = declare("dijit.form.Button" + (has("dojo-bidi") ? "_NoBidi" : ""), [_FormWidget, _ButtonMixin], {
		// summary:
		//		Basically the same thing as a normal HTML button, but with special styling.
		// description:
		//		Buttons can display a label, an icon, or both.
		//		A label should always be specified (through innerHTML) or the label
		//		attribute.  It can be hidden via showLabel=false.
		// example:
		// |	<button data-dojo-type="dijit/form/Button" onClick="...">Hello world</button>
		//
		// example:
		// |	var button1 = new Button({label: "hello world", onClick: foo});
		// |	dojo.body().appendChild(button1.domNode);

		// showLabel: Boolean
		//		Set this to true to hide the label text and display only the icon.
		//		(If showLabel=false then iconClass must be specified.)
		//		Especially useful for toolbars.
		//		If showLabel=true, the label will become the title (a.k.a. tooltip/hint) of the icon.
		//
		//		The exception case is for computers in high-contrast mode, where the label
		//		will still be displayed, since the icon doesn't appear.
		showLabel: true,

		// iconClass: String
		//		Class to apply to DOMNode in button to make it display an icon
		iconClass: "dijitNoIcon",
		_setIconClassAttr: { node: "iconNode", type: "class" },

		baseClass: "dijitButton",

		templateString: template,

		// Map widget attributes to DOMNode attributes.
		_setValueAttr: "valueNode",
		_setNameAttr: function(name){
			// avoid breaking existing subclasses where valueNode undefined.  Perhaps in 2.0 require it to be defined?
			if(this.valueNode){
				this.valueNode.setAttribute("name", name);
			}
		},

		_fillContent: function(/*DomNode*/ source){
			// Overrides _Templated._fillContent().
			// If button label is specified as srcNodeRef.innerHTML rather than
			// this.params.label, handle it here.
			// TODO: remove the method in 2.0, parser will do it all for me
			if(source && (!this.params || !("label" in this.params))){
				var sourceLabel = lang.trim(source.innerHTML);
				if(sourceLabel){
					this.label = sourceLabel; // _applyAttributes will be called after buildRendering completes to update the DOM
				}
			}
		},

		_setShowLabelAttr: function(val){
			if(this.containerNode){
				domClass.toggle(this.containerNode, "dijitDisplayNone", !val);
			}
			this._set("showLabel", val);
		},

		setLabel: function(/*String*/ content){
			// summary:
			//		Deprecated.  Use set('label', ...) instead.
			kernel.deprecated("dijit.form.Button.setLabel() is deprecated.  Use set('label', ...) instead.", "", "2.0");
			this.set("label", content);
		},

		_setLabelAttr: function(/*String*/ content){
			// summary:
			//		Hook for set('label', ...) to work.
			// description:
			//		Set the label (text) of the button; takes an HTML string.
			//		If the label is hidden (showLabel=false) then and no title has
			//		been specified, then label is also set as title attribute of icon.
			this.inherited(arguments);
			if(!this.showLabel && !("title" in this.params)){
				this.titleNode.title = lang.trim(this.containerNode.innerText || this.containerNode.textContent || '');
			}
		}
	});

	if(has("dojo-bidi")){
		Button = declare("dijit.form.Button", Button, {
			_setLabelAttr: function(/*String*/ content){
				this.inherited(arguments);
				if(this.titleNode.title){
					this.applyTextDir(this.titleNode, this.titleNode.title);
				}
			},

			_setTextDirAttr: function(/*String*/ textDir){
				if(this._created && this.textDir != textDir){
					this._set("textDir", textDir);
					this._setLabelAttr(this.label); // call applyTextDir on both focusNode and titleNode
				}
			}
		});
	}

	return Button;
});

},
'dijit/form/_FormWidget':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/sniff", // has("dijit-legacy-requires"), has("msapp")
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/ready",
	"../_Widget",
	"../_CssStateMixin",
	"../_TemplatedMixin",
	"./_FormWidgetMixin"
], function(declare, has, kernel, ready, _Widget, _CssStateMixin, _TemplatedMixin, _FormWidgetMixin){

	// module:
	//		dijit/form/_FormWidget

	// Back compat w/1.6, remove for 2.0
	if(has("dijit-legacy-requires")){
		ready(0, function(){
			var requires = ["dijit/form/_FormValueWidget"];
			require(requires);	// use indirection so modules not rolled into a build
		});
	}

	return declare("dijit.form._FormWidget", [_Widget, _TemplatedMixin, _CssStateMixin, _FormWidgetMixin], {
		// summary:
		//		Base class for widgets corresponding to native HTML elements such as `<checkbox>` or `<button>`,
		//		which can be children of a `<form>` node or a `dijit/form/Form` widget.
		//
		// description:
		//		Represents a single HTML element.
		//		All these widgets should have these attributes just like native HTML input elements.
		//		You can set them during widget construction or afterwards, via `dijit/_WidgetBase.set()`.
		//
		//		They also share some common methods.

		setDisabled: function(/*Boolean*/ disabled){
			// summary:
			//		Deprecated.  Use set('disabled', ...) instead.
			kernel.deprecated("setDisabled(" + disabled + ") is deprecated. Use set('disabled'," + disabled + ") instead.", "", "2.0");
			this.set('disabled', disabled);
		},

		setValue: function(/*String*/ value){
			// summary:
			//		Deprecated.  Use set('value', ...) instead.
			kernel.deprecated("dijit.form._FormWidget:setValue(" + value + ") is deprecated.  Use set('value'," + value + ") instead.", "", "2.0");
			this.set('value', value);
		},

		getValue: function(){
			// summary:
			//		Deprecated.  Use get('value') instead.
			kernel.deprecated(this.declaredClass + "::getValue() is deprecated. Use get('value') instead.", "", "2.0");
			return this.get('value');
		},

		postMixInProperties: function(){
			// Setup name=foo string to be referenced from the template (but only if a name has been specified).
			// Unfortunately we can't use _setNameAttr to set the name in IE due to IE limitations, see #8484, #8660.
			// But when IE6 and IE7 are desupported, then we probably don't need this anymore, so should remove it in 2.0.
			// Also, don't do this for Windows 8 Store Apps because it causes a security exception (see #16452).
			// Regarding escaping, see heading "Attribute values" in
			// http://www.w3.org/TR/REC-html40/appendix/notes.html#h-B.3.2
			this.nameAttrSetting = (this.name && !has("msapp")) ? ('name="' + this.name.replace(/"/g, "&quot;") + '"') : '';
			this.inherited(arguments);
		}
	});
});

},
'dijit/form/_FormWidgetMixin':function(){
define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-style", // domStyle.get
	"dojo/_base/lang", // lang.hitch lang.isArray
	"dojo/mouse", // mouse.isLeft
	"dojo/on",
	"dojo/sniff", // has("webkit")
	"dojo/window", // winUtils.scrollIntoView
	"../a11y"    // a11y.hasDefaultTabStop
], function(array, declare, domAttr, domStyle, lang, mouse, on, has, winUtils, a11y){

	// module:
	//		dijit/form/_FormWidgetMixin

	return declare("dijit.form._FormWidgetMixin", null, {
		// summary:
		//		Mixin for widgets corresponding to native HTML elements such as `<checkbox>` or `<button>`,
		//		which can be children of a `<form>` node or a `dijit/form/Form` widget.
		//
		// description:
		//		Represents a single HTML element.
		//		All these widgets should have these attributes just like native HTML input elements.
		//		You can set them during widget construction or afterwards, via `dijit/_WidgetBase.set()`.
		//
		//		They also share some common methods.

		// name: [const] String
		//		Name used when submitting form; same as "name" attribute or plain HTML elements
		name: "",

		// alt: String
		//		Corresponds to the native HTML `<input>` element's attribute.
		alt: "",

		// value: String
		//		Corresponds to the native HTML `<input>` element's attribute.
		value: "",

		// type: [const] String
		//		Corresponds to the native HTML `<input>` element's attribute.
		type: "text",

		// type: String
		//		Apply aria-label in markup to the widget's focusNode
		"aria-label": "focusNode",

		// tabIndex: String
		//		Order fields are traversed when user hits the tab key
		tabIndex: "0",
		_setTabIndexAttr: "focusNode", // force copy even when tabIndex default value, needed since Button is <span>

		// disabled: Boolean
		//		Should this widget respond to user input?
		//		In markup, this is specified as "disabled='disabled'", or just "disabled".
		disabled: false,

		// intermediateChanges: Boolean
		//		Fires onChange for each value change or only on demand
		intermediateChanges: false,

		// scrollOnFocus: Boolean
		//		On focus, should this widget scroll into view?
		scrollOnFocus: true,

		// Override _WidgetBase mapping id to this.domNode, needs to be on focusNode so <label> etc.
		// works with screen reader
		_setIdAttr: "focusNode",

		_setDisabledAttr: function(/*Boolean*/ value){
			this._set("disabled", value);
			domAttr.set(this.focusNode, 'disabled', value);
			if(this.valueNode){
				domAttr.set(this.valueNode, 'disabled', value);
			}
			this.focusNode.setAttribute("aria-disabled", value ? "true" : "false");

			if(value){
				// reset these, because after the domNode is disabled, we can no longer receive
				// mouse related events, see #4200
				this._set("hovering", false);
				this._set("active", false);

				// clear tab stop(s) on this widget's focusable node(s)  (ComboBox has two focusable nodes)
				var attachPointNames = "tabIndex" in this.attributeMap ? this.attributeMap.tabIndex :
					("_setTabIndexAttr" in this) ? this._setTabIndexAttr : "focusNode";
				array.forEach(lang.isArray(attachPointNames) ? attachPointNames : [attachPointNames], function(attachPointName){
					var node = this[attachPointName];
					// complex code because tabIndex=-1 on a <div> doesn't work on FF
					if(has("webkit") || a11y.hasDefaultTabStop(node)){    // see #11064 about webkit bug
						node.setAttribute('tabIndex', "-1");
					}else{
						node.removeAttribute('tabIndex');
					}
				}, this);
			}else{
				if(this.tabIndex != ""){
					this.set('tabIndex', this.tabIndex);
				}
			}
		},

		_onFocus: function(/*String*/ by){
			// If user clicks on the widget, even if the mouse is released outside of it,
			// this widget's focusNode should get focus (to mimic native browser behavior).
			// Browsers often need help to make sure the focus via mouse actually gets to the focusNode.
			// TODO: consider removing all of this for 2.0 or sooner, see #16622 etc.
			if(by == "mouse" && this.isFocusable()){
				// IE exhibits strange scrolling behavior when refocusing a node so only do it when !focused.
				var focusHandle = this.own(on(this.focusNode, "focus", function(){
					mouseUpHandle.remove();
					focusHandle.remove();
				}))[0];
				// Set a global event to handle mouseup, so it fires properly
				// even if the cursor leaves this.domNode before the mouse up event.
				var event = has("pointer-events") ? "pointerup" : has("MSPointer") ? "MSPointerUp" :
					has("touch-events") ? "touchend, mouseup" :		// seems like overkill but see #16622, #16725
					"mouseup";
				var mouseUpHandle = this.own(on(this.ownerDocumentBody, event, lang.hitch(this, function(evt){
					mouseUpHandle.remove();
					focusHandle.remove();
					// if here, then the mousedown did not focus the focusNode as the default action
					if(this.focused){
						if(evt.type == "touchend"){
							this.defer("focus"); // native focus hasn't occurred yet
						}else{
							this.focus(); // native focus already occurred on mousedown
						}
					}
				})))[0];
			}
			if(this.scrollOnFocus){
				this.defer(function(){
					winUtils.scrollIntoView(this.domNode);
				}); // without defer, the input caret position can change on mouse click
			}
			this.inherited(arguments);
		},

		isFocusable: function(){
			// summary:
			//		Tells if this widget is focusable or not.  Used internally by dijit.
			// tags:
			//		protected
			return !this.disabled && this.focusNode && (domStyle.get(this.domNode, "display") != "none");
		},

		focus: function(){
			// summary:
			//		Put focus on this widget
			if(!this.disabled && this.focusNode.focus){
				try{
					this.focusNode.focus();
				}catch(e){
				}
				/*squelch errors from hidden nodes*/
			}
		},

		compare: function(/*anything*/ val1, /*anything*/ val2){
			// summary:
			//		Compare 2 values (as returned by get('value') for this widget).
			// tags:
			//		protected
			if(typeof val1 == "number" && typeof val2 == "number"){
				return (isNaN(val1) && isNaN(val2)) ? 0 : val1 - val2;
			}else if(val1 > val2){
				return 1;
			}else if(val1 < val2){
				return -1;
			}else{
				return 0;
			}
		},

		onChange: function(/*===== newValue =====*/){
			// summary:
			//		Callback when this widget's value is changed.
			// tags:
			//		callback
		},

		// _onChangeActive: [private] Boolean
		//		Indicates that changes to the value should call onChange() callback.
		//		This is false during widget initialization, to avoid calling onChange()
		//		when the initial value is set.
		_onChangeActive: false,

		_handleOnChange: function(/*anything*/ newValue, /*Boolean?*/ priorityChange){
			// summary:
			//		Called when the value of the widget is set.  Calls onChange() if appropriate
			// newValue:
			//		the new value
			// priorityChange:
			//		For a slider, for example, dragging the slider is priorityChange==false,
			//		but on mouse up, it's priorityChange==true.  If intermediateChanges==false,
			//		onChange is only called form priorityChange=true events.
			// tags:
			//		private
			if(this._lastValueReported == undefined && (priorityChange === null || !this._onChangeActive)){
				// this block executes not for a change, but during initialization,
				// and is used to store away the original value (or for ToggleButton, the original checked state)
				this._resetValue = this._lastValueReported = newValue;
			}
			this._pendingOnChange = this._pendingOnChange
				|| (typeof newValue != typeof this._lastValueReported)
				|| (this.compare(newValue, this._lastValueReported) != 0);
			if((this.intermediateChanges || priorityChange || priorityChange === undefined) && this._pendingOnChange){
				this._lastValueReported = newValue;
				this._pendingOnChange = false;
				if(this._onChangeActive){
					if(this._onChangeHandle){
						this._onChangeHandle.remove();
					}
					// defer allows hidden value processing to run and
					// also the onChange handler can safely adjust focus, etc
					this._onChangeHandle = this.defer(
						function(){
							this._onChangeHandle = null;
							this.onChange(newValue);
						}); // try to collapse multiple onChange's fired faster than can be processed
				}
			}
		},

		create: function(){
			// Overrides _Widget.create()
			this.inherited(arguments);
			this._onChangeActive = true;
		},

		destroy: function(){
			if(this._onChangeHandle){ // destroy called before last onChange has fired
				this._onChangeHandle.remove();
				this.onChange(this._lastValueReported);
			}
			this.inherited(arguments);
		}
	});
});

},
'dijit/form/_ButtonMixin':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.setSelectable
	"dojo/has",
	"../registry"        // registry.byNode
], function(declare, dom, has, registry){

	// module:
	//		dijit/form/_ButtonMixin

	var ButtonMixin = declare("dijit.form._ButtonMixin" + (has("dojo-bidi") ? "_NoBidi" : ""), null, {
		// summary:
		//		A mixin to add a thin standard API wrapper to a normal HTML button
		// description:
		//		A label should always be specified (through innerHTML) or the label attribute.
		//
		//		Attach points:
		//
		//		- focusNode (required): this node receives focus
		//		- valueNode (optional): this node's value gets submitted with FORM elements
		//		- containerNode (optional): this node gets the innerHTML assignment for label
		// example:
		// |	<button data-dojo-type="dijit/form/Button" onClick="...">Hello world</button>
		// example:
		// |	var button1 = new Button({label: "hello world", onClick: foo});
		// |	dojo.body().appendChild(button1.domNode);

		// label: HTML String
		//		Content to display in button.
		label: "",

		// type: [const] String
		//		Type of button (submit, reset, button, checkbox, radio)
		type: "button",

		__onClick: function(/*Event*/ e){
			// summary:
			//		Internal function to divert the real click onto the hidden INPUT that has a native default action associated with it
			// type:
			//		private
			e.stopPropagation();
			e.preventDefault();
			if(!this.disabled){
				// cannot use on.emit since button default actions won't occur
				this.valueNode.click(e);
			}
			return false;
		},

		_onClick: function(/*Event*/ e){
			// summary:
			//		Internal function to handle click actions
			if(this.disabled){
				e.stopPropagation();
				e.preventDefault();
				return false;
			}
			if(this.onClick(e) === false){
				e.preventDefault();
			}
			var cancelled = e.defaultPrevented;

			// Signal Form/Dialog to submit/close.  For 2.0, consider removing this code and instead making the Form/Dialog
			// listen for bubbled click events where evt.target.type == "submit" && !evt.defaultPrevented.
			if(!cancelled && this.type == "submit" && !(this.valueNode || this.focusNode).form){
				for(var node = this.domNode; node.parentNode; node = node.parentNode){
					var widget = registry.byNode(node);
					if(widget && typeof widget._onSubmit == "function"){
						widget._onSubmit(e);
						e.preventDefault(); // action has already occurred
						cancelled = true;
						break;
					}
				}
			}

			return !cancelled;
		},

		postCreate: function(){
			this.inherited(arguments);
			dom.setSelectable(this.focusNode, false);
		},

		onClick: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		Callback for when button is clicked.
			//		If type="submit", return true to perform submit, or false to cancel it.
			// type:
			//		callback
			return true;		// Boolean
		},

		_setLabelAttr: function(/*String*/ content){
			// summary:
			//		Hook for set('label', ...) to work.
			// description:
			//		Set the label (text) of the button; takes an HTML string.
			this._set("label", content);
			var labelNode = this.containerNode || this.focusNode;
			labelNode.innerHTML = content;
		}
	});

	if(has("dojo-bidi")){
		ButtonMixin = declare("dijit.form._ButtonMixin", ButtonMixin, {
			_setLabelAttr: function(){
				this.inherited(arguments);
				var labelNode = this.containerNode || this.focusNode;
				this.applyTextDir(labelNode);
			}
		});
	}

	return ButtonMixin;
});

},
'url:dijit/templates/Dialog.html':"<div class=\"dijitDialog\" role=\"dialog\" aria-labelledby=\"${id}_title\">\n\t<div data-dojo-attach-point=\"titleBar\" class=\"dijitDialogTitleBar\">\n\t\t<span data-dojo-attach-point=\"titleNode\" class=\"dijitDialogTitle\" id=\"${id}_title\"\n\t\t\t\trole=\"heading\" level=\"1\"></span>\n\t\t<span data-dojo-attach-point=\"closeButtonNode\" class=\"dijitDialogCloseIcon\" data-dojo-attach-event=\"ondijitclick: onCancel\" title=\"${buttonCancel}\" role=\"button\" tabindex=\"-1\">\n\t\t\t<span data-dojo-attach-point=\"closeText\" class=\"closeText\" title=\"${buttonCancel}\">x</span>\n\t\t</span>\n\t</div>\n\t<div data-dojo-attach-point=\"containerNode\" class=\"dijitDialogPaneContent\"></div>\n\t${!actionBarTemplate}\n</div>\n\n",
'url:dijit/form/templates/Button.html':"<span class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><span class=\"dijitReset dijitInline dijitButtonNode\"\n\t\tdata-dojo-attach-event=\"ondijitclick:__onClick\" role=\"presentation\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"titleNode,focusNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\"></span\n\t\t\t><span class=\"dijitReset dijitToggleButtonIconChar\">&#x25CF;</span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t\tdata-dojo-attach-point=\"containerNode\"\n\t\t\t></span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\"\n\t\tdata-dojo-attach-event=\"onclick:_onClick\"\n\t\ttabIndex=\"-1\" role=\"presentation\" aria-hidden=\"true\" data-dojo-attach-point=\"valueNode\"\n/></span>\n",
'*now':function(r){r(['dojo/i18n!*preload*p3/layer/nls/globalWSObject*["ar","ca","cs","da","de","el","en-gb","en-us","es-es","fi-fi","fr-fr","he-il","hu","it-it","ja-jp","ko-kr","nl-nl","nb","pl","pt-br","pt-pt","ru","sk","sl","sv","th","tr","zh-tw","zh-cn","ROOT"]']);}
}});
(function(){
	// must use this.require to make this work in node.js
	var require = this.require;
	// consume the cached dojo layer
	require({cache:{}});
	!require.async && require(["dojo"]);
	require.boot && require.apply(null, require.boot);
})();
