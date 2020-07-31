require({cache:{
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

	function getCtor(/*String[]*/ types, /*Function?*/ contextRequire){
		// summary:
		//		Retrieves a constructor.  If the types array contains more than one class/MID then the
		//		subsequent classes will be mixed into the first class and a unique constructor will be
		//		returned for that array.

		if(!contextRequire){
			contextRequire = require;
		}

		// Map from widget name or list of widget names(ex: "dijit/form/Button,acme/MyMixin") to a constructor.
		// Keep separate map for each requireContext to avoid false matches (ex: "./Foo" can mean different things
		// depending on context.)
		var ctorMap = contextRequire._dojoParserCtorMap || (contextRequire._dojoParserCtorMap = {});

		var ts = types.join();
		if(!ctorMap[ts]){
			var mixins = [];
			for(var i = 0, l = types.length; i < l; i++){
				var t = types[i];
				// TODO: Consider swapping getObject and require in the future
				mixins[mixins.length] = (ctorMap[t] = ctorMap[t] || (dlang.getObject(t) || (~t.indexOf('/') &&
					contextRequire(t))));
			}
			var ctor = mixins.shift();
			ctorMap[ts] = mixins.length ? (ctor.createSubclass ? ctor.createSubclass(mixins) : ctor.extend.apply(ctor, mixins)) : ctor;
		}

		return ctorMap[ts];
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
				hash[scope + "type"] = "dojotype";
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
			if(rootNode && typeof rootNode != "string" && !("nodeType" in rootNode)){
				// If called as parse(options) rather than parse(), parse(rootNode), or parse(rootNode, options)...
				options = rootNode;
				rootNode = options.rootNode;
			}
			var root = rootNode ? dom.byId(rootNode) : dwindow.body();
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
'dojo/promise/all':function(){
define([
	"../_base/array",
	"../_base/lang",
	"../Deferred",
	"../when"
], function(array, lang, Deferred, when){
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
		if(lang.isArray(objectOrArray)){
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
'dijit/form/Form':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/sniff", // has("ie")
	"../_Widget",
	"../_TemplatedMixin",
	"./_FormMixin",
	"../layout/_ContentPaneResizeMixin"
], function(declare, domAttr, kernel, has, _Widget, _TemplatedMixin, _FormMixin, _ContentPaneResizeMixin){

	// module:
	//		dijit/form/Form


	return declare("dijit.form.Form", [_Widget, _TemplatedMixin, _FormMixin, _ContentPaneResizeMixin], {
		// summary:
		//		Widget corresponding to HTML form tag, for validation and serialization
		//
		// example:
		//	|	<form data-dojo-type="dijit/form/Form" id="myForm">
		//	|		Name: <input type="text" name="name" />
		//	|	</form>
		//	|	// Example assumes you have required dijit/registry
		//	|	myObj = {name: "John Doe"};
		//	|	registry.byId('myForm').set('value', myObj);
		//	|
		//	|	myObj=registry.byId('myForm').get('value');

		// HTML <FORM> attributes

		// name: String?
		//		Name of form for scripting.
		name: "",

		// action: String?
		//		Server-side form handler.
		action: "",

		// method: String?
		//		HTTP method used to submit the form, either "GET" or "POST".
		method: "",

		// encType: String?
		//		Encoding type for the form, ex: application/x-www-form-urlencoded.
		encType: "",

		// accept-charset: String?
		//		List of supported charsets.
		"accept-charset": "",

		// accept: String?
		//		List of MIME types for file upload.
		accept: "",

		// target: String?
		//		Target frame for the document to be opened in.
		target: "",

		templateString: "<form data-dojo-attach-point='containerNode' data-dojo-attach-event='onreset:_onReset,onsubmit:_onSubmit' ${!nameAttrSetting}></form>",

		postMixInProperties: function(){
			// Setup name=foo string to be referenced from the template (but only if a name has been specified)
			// Unfortunately we can't use _setNameAttr to set the name due to IE limitations, see #8660
			this.nameAttrSetting = this.name ? ("name='" + this.name + "'") : "";
			this.inherited(arguments);
		},

		execute: function(/*Object*/ /*===== formContents =====*/){
			// summary:
			//		Deprecated: use submit()
			// tags:
			//		deprecated
		},

		onExecute: function(){
			// summary:
			//		Deprecated: use onSubmit()
			// tags:
			//		deprecated
		},

		_setEncTypeAttr: function(/*String*/ value){
			domAttr.set(this.domNode, "encType", value);
			if(has("ie")){
				this.domNode.encoding = value;
			}
			this._set("encType", value);
		},

		reset: function(/*Event?*/ e){
			// summary:
			//		restores all widget values back to their init values,
			//		calls onReset() which can cancel the reset by returning false

			// create fake event so we can know if preventDefault() is called
			var faux = {
				returnValue: true, // the IE way
				preventDefault: function(){ // not IE
					this.returnValue = false;
				},
				stopPropagation: function(){
				},
				currentTarget: e ? e.target : this.domNode,
				target: e ? e.target : this.domNode
			};
			// if return value is not exactly false, and haven't called preventDefault(), then reset
			if(!(this.onReset(faux) === false) && faux.returnValue){
				this.inherited(arguments, []);
			}
		},

		onReset: function(/*Event?*/ /*===== e =====*/){
			// summary:
			//		Callback when user resets the form. This method is intended
			//		to be over-ridden. When the `reset` method is called
			//		programmatically, the return value from `onReset` is used
			//		to compute whether or not resetting should proceed
			// tags:
			//		callback
			return true; // Boolean
		},

		_onReset: function(e){
			this.reset(e);
			e.stopPropagation();
			e.preventDefault();
			return false;
		},

		_onSubmit: function(e){
			var fp = this.constructor.prototype;
			// TODO: remove this if statement beginning with 2.0
			if(this.execute != fp.execute || this.onExecute != fp.onExecute){
				kernel.deprecated("dijit.form.Form:execute()/onExecute() are deprecated. Use onSubmit() instead.", "", "2.0");
				this.onExecute();
				this.execute(this.getValues());
			}
			if(this.onSubmit(e) === false){ // only exactly false stops submit
				e.stopPropagation();
				e.preventDefault();
			}
		},

		onSubmit: function(/*Event?*/ /*===== e =====*/){
			// summary:
			//		Callback when user submits the form.
			// description:
			//		This method is intended to be over-ridden, but by default it checks and
			//		returns the validity of form elements. When the `submit`
			//		method is called programmatically, the return value from
			//		`onSubmit` is used to compute whether or not submission
			//		should proceed
			// tags:
			//		extension

			return this.isValid(); // Boolean
		},

		submit: function(){
			// summary:
			//		programmatically submit form if and only if the `onSubmit` returns true
			if(!(this.onSubmit() === false)){
				this.containerNode.submit();
			}
		}
	});
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
		//		- Toggle DOM node CSS class
		// |		_setMyClassAttr: { node: "domNode", type: "toggleClass" }
		//		Toggles myClass on this.domNode by this.myClass
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

		// textDir: String
		//		Bi-directional support,	the main variable which is responsible for the direction of the text.
		//		The text direction can be different than the GUI direction by using this parameter in creation
		//		of a widget.
		//
		//		This property is only effective when `has("dojo-bidi")` is defined to be true.
		//
		//		Allowed values:
		//
		//		1. "" - default value; text is same direction as widget
		//		2. "ltr"
		//		3. "rtl"
		//		4. "auto" - contextual the direction of a text defined by first strong letter.
		textDir: "",

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
			if(this.srcNodeRef && this.srcNodeRef.id  && (typeof this.srcNodeRef.id == "string")){
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
						// Deprecated, use "textContent" instead.
						mapNode.innerHTML = "";
						mapNode.appendChild(this.ownerDocument.createTextNode(value));
						break;
					case "textContent":
						mapNode.textContent = value;
						break;
					case "innerHTML":
						mapNode.innerHTML = value;
						break;
					case "class":
						domClass.replace(mapNode, value, this[attr]);
						break;
					case "toggleClass":
						domClass.toggle(mapNode, command.className || attr, value);
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
			};
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
			};
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

		if(mouse.isRight(e)){
			return;		// avoid spurious dojoclick event on IE10+; right click is just for context menu
		}

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
					if(mouse.isRight(e)){
						return;		// avoid spurious dojoclick event on IE10+; right click is just for context menu
					}
					updateClickTracker(e);
					if(useTarget){
						// prevent native scroll event and ensure touchend is
						// fire after touch moves between press and release.
						e.preventDefault();
					}
				}, true);

				win.doc.addEventListener(endType, function(e){
					if(mouse.isRight(e)){
						return;		// avoid spurious dojoclick event on IE10+; right click is just for context menu
					}
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
						function createMouseEvent(type){
							//create the synthetic event.
							//http://www.w3.org/TR/DOM-Level-3-Events/#widl-MouseEvent-initMouseEvent
							var evt = document.createEvent("MouseEvents");
							evt._dojo_click = true;
							evt.initMouseEvent(type,
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
							return evt;
						}
						var mouseDownEvt = createMouseEvent("mousedown");
						var mouseUpEvt = createMouseEvent("mouseup");
						var clickEvt = createMouseEvent("click");

						setTimeout(function(){
							on.emit(target, "mousedown", mouseDownEvt);
							on.emit(target, "mouseup", mouseUpEvt);
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
						var target = e.target;
						if(clickTracker && !e._dojo_click &&
								(new Date()).getTime() <= clickTime + 1000 &&
								!(target.tagName == "INPUT" && domClass.contains(target, "dijitOffScreen"))){
							e.stopPropagation();
							e.stopImmediatePropagation && e.stopImmediatePropagation();
							if(type == "click" &&
								(target.tagName != "INPUT" ||
								(target.type == "radio" &&
									// #18352 Do not preventDefault for radios that are not dijit or
									// dojox/mobile widgets.
									// (The CSS class dijitCheckBoxInput holds for both checkboxes and radio buttons.)
									(domClass.contains(target, "dijitCheckBoxInput") ||
										domClass.contains(target, "mblRadioButton"))) ||
								(target.type == "checkbox" &&
									// #18352 Do not preventDefault for checkboxes that are not dijit or
									// dojox/mobile widgets.
									(domClass.contains(target, "dijitCheckBoxInput") ||
										domClass.contains(target, "mblCheckBox")))) &&
								target.tagName != "TEXTAREA" && target.tagName != "AUDIO" && target.tagName != "VIDEO"){
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

	if(has("touch")){
		if(hasPointer){
			// MSPointer (IE10+) already has support for over and out, so we just need to init click support
			domReady(function(){
				win.doc.addEventListener(pointer.down, function(evt){
					doClicks(evt, pointer.move, pointer.up);
				}, true);
			});
		}else{
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
					isIE = has("ie") || has("trident"),
					isWK = has("webkit");
				// if an untested browser, then use the native method
				if(node == body || node == html){ return; }
				if(!(has("mozilla") || isIE || isWK || has("opera") || has("trident") || has("edge"))
						&& ("scrollIntoView" in node)){
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
						if(scrollRoot == html && (isIE || has("trident")) && rtl){
							elPos.x += scrollRoot.offsetWidth-elPos.w;// IE workaround where scrollbar causes negative x
						}
						elPos.x = 0;
						elPos.y = 0;
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
						if(rtl && ((isIE == 8 && !backCompat) || has("trident") >= 5)){ s = -s; }
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
		trident = has("trident"),
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
			"dj_edge": has("edge"),

			"dj_gecko": has("mozilla"),

			"dj_ios": has("ios"),
			"dj_android": has("android")
		}; // no dojo unsupported browsers

	if(ie){
		classes["dj_ie"] = true;
		classes["dj_ie" + maj(ie)] = true;
		classes["dj_iequirks"] = has("quirks");
	}
	if(trident){
		classes["dj_trident"] = true;
		classes["dj_trident" + maj(trident)] = true;
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
	//		The special sequence `${}` can be used escape `$`.
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

	return template.replace(/\$\{([^\s\:\}]*)(?:\:([^\s\:\}]+))?\}/g,
		function(match, key, format){
			if (key == ''){
				return '$';
			}
			var value = lang.getObject(key, false, map);
			if(format){
				value = lang.getObject(format, false, thisObject).call(thisObject, value, key);
			}
			var result = transform(value, key);

			if (typeof result === 'undefined') {
				throw new Error('string.substitute could not find key "' + key + '" in template');
			}

			return result.toString();
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
				// "domEvent: nativeEvent, ..."
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
'dijit/form/TextBox':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/dom-construct", // domConstruct.create
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"dojo/sniff", // has("ie") has("mozilla")
	"./_FormValueWidget",
	"./_TextBoxMixin",
	"dojo/text!./templates/TextBox.html",
	"../main"	// to export dijit._setSelectionRange, remove in 2.0
], function(declare, domConstruct, domStyle, kernel, lang, on, has,
			_FormValueWidget, _TextBoxMixin, template, dijit){

	// module:
	//		dijit/form/TextBox

	var TextBox = declare("dijit.form.TextBox" + (has("dojo-bidi") ? "_NoBidi" : ""), [_FormValueWidget, _TextBoxMixin], {
		// summary:
		//		A base class for textbox form inputs

		templateString: template,
		_singleNodeTemplate: '<input class="dijit dijitReset dijitLeft dijitInputField" data-dojo-attach-point="textbox,focusNode" autocomplete="off" type="${type}" ${!nameAttrSetting} />',

		_buttonInputDisabled: has("ie") ? "disabled" : "", // allows IE to disallow focus, but Firefox cannot be disabled for mousedown events

		baseClass: "dijitTextBox",

		postMixInProperties: function(){
			var type = this.type.toLowerCase();
			if(this.templateString && this.templateString.toLowerCase() == "input" || ((type == "hidden" || type == "file") && this.templateString == this.constructor.prototype.templateString)){
				this.templateString = this._singleNodeTemplate;
			}
			this.inherited(arguments);
		},

		postCreate: function(){
			this.inherited(arguments);

			if(has("ie") < 9){
				// IE INPUT tag fontFamily has to be set directly using STYLE
				// the defer gives IE a chance to render the TextBox and to deal with font inheritance
				this.defer(function(){
					try{
						var s = domStyle.getComputedStyle(this.domNode); // can throw an exception if widget is immediately destroyed
						if(s){
							var ff = s.fontFamily;
							if(ff){
								var inputs = this.domNode.getElementsByTagName("INPUT");
								if(inputs){
									for(var i=0; i < inputs.length; i++){
										inputs[i].style.fontFamily = ff;
									}
								}
							}
						}
					}catch(e){/*when used in a Dialog, and this is called before the dialog is
					 shown, s.fontFamily would trigger "Invalid Argument" error.*/}
				});
			}
		},

		_setPlaceHolderAttr: function(v){
			this._set("placeHolder", v);
			if(!this._phspan){
				this._attachPoints.push('_phspan');
				this._phspan = domConstruct.create('span', {
					// dijitInputField class gives placeHolder same padding as the input field
					// parent node already has dijitInputField class but it doesn't affect this <span>
					// since it's position: absolute.
					className: 'dijitPlaceHolder dijitInputField'
				}, this.textbox, 'after');
				this.own(
					on(this._phspan, "mousedown", function(evt){ evt.preventDefault(); }),
					on(this._phspan, "touchend, pointerup, MSPointerUp", lang.hitch(this, function(){
						// If the user clicks placeholder rather than the <input>, need programmatic focus.  Normally this
						// is done in _FormWidgetMixin._onFocus() but after [30663] it's done on a delay, which is ineffective.
						this.focus();
					}))
				);
			}
			this._phspan.innerHTML="";
			this._phspan.appendChild(this._phspan.ownerDocument.createTextNode(v));
			this._updatePlaceHolder();
		},

		_onInput: function(/*Event*/ evt){
			// summary:
			//		Called AFTER the input event has happened
			//		See if the placeHolder text should be removed or added while editing.
			this.inherited(arguments);
			this._updatePlaceHolder();
		},

		_updatePlaceHolder: function(){
			if(this._phspan){
				this._phspan.style.display = (this.placeHolder && !this.textbox.value) ? "" : "none";
			}
		},

		_setValueAttr: function(value, /*Boolean?*/ priorityChange, /*String?*/ formattedValue){
			this.inherited(arguments);
			this._updatePlaceHolder();
		},

		getDisplayedValue: function(){
			// summary:
			//		Deprecated.  Use get('displayedValue') instead.
			// tags:
			//		deprecated
			kernel.deprecated(this.declaredClass+"::getDisplayedValue() is deprecated. Use get('displayedValue') instead.", "", "2.0");
			return this.get('displayedValue');
		},

		setDisplayedValue: function(/*String*/ value){
			// summary:
			//		Deprecated.  Use set('displayedValue', ...) instead.
			// tags:
			//		deprecated
			kernel.deprecated(this.declaredClass+"::setDisplayedValue() is deprecated. Use set('displayedValue', ...) instead.", "", "2.0");
			this.set('displayedValue', value);
		},

		_onBlur: function(e){
			if(this.disabled){ return; }
			this.inherited(arguments);
			this._updatePlaceHolder();

			if(has("mozilla")){
				if(this.selectOnClick){
					// clear selection so that the next mouse click doesn't reselect
					this.textbox.selectionStart = this.textbox.selectionEnd = undefined;
				}
			}
		},

		_onFocus: function(/*String*/ by){
			if(this.disabled || this.readOnly){ return; }
			this.inherited(arguments);
			this._updatePlaceHolder();
		}
	});

	if(has("ie") < 9){
		TextBox.prototype._isTextSelected = function(){
			var range = this.ownerDocument.selection.createRange();
			var parent = range.parentElement();
			return parent == this.textbox && range.text.length > 0;
		};

		// Overrides definition of _setSelectionRange from _TextBoxMixin (TODO: move to _TextBoxMixin.js?)
		dijit._setSelectionRange = _TextBoxMixin._setSelectionRange = function(/*DomNode*/ element, /*Number?*/ start, /*Number?*/ stop){
			if(element.createTextRange){
				var r = element.createTextRange();
				r.collapse(true);
				r.moveStart("character", -99999); // move to 0
				r.moveStart("character", start); // delta from 0 is the correct position
				r.moveEnd("character", stop-start);
				r.select();
			}
		}
	}

	if(has("dojo-bidi")){
		TextBox = declare("dijit.form.TextBox", TextBox, {
			_setPlaceHolderAttr: function(v){
				this.inherited(arguments);
				this.applyTextDir(this._phspan);
			}
		});
	}

	return TextBox;
});

},
'dijit/form/_FormValueWidget':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/sniff", // has("ie")
	"./_FormWidget",
	"./_FormValueMixin"
], function(declare, has, _FormWidget, _FormValueMixin){

	// module:
	//		dijit/form/_FormValueWidget

	return declare("dijit.form._FormValueWidget", [_FormWidget, _FormValueMixin], {
		// summary:
		//		Base class for widgets corresponding to native HTML elements such as `<input>` or `<select>`
		//		that have user changeable values.
		// description:
		//		Each _FormValueWidget represents a single input value, and has a (possibly hidden) `<input>` element,
		//		to which it serializes it's input value, so that form submission (either normal submission or via FormBind?)
		//		works as expected.

		// Don't attempt to mixin the 'type', 'name' attributes here programatically -- they must be declared
		// directly in the template as read by the parser in order to function. IE is known to specifically
		// require the 'name' attribute at element creation time.  See #8484, #8660.

		_layoutHackIE7: function(){
			// summary:
			//		Work around table sizing bugs on IE7 by forcing redraw

			if(has("ie") == 7){ // fix IE7 layout bug when the widget is scrolled out of sight
				var domNode = this.domNode;
				var parent = domNode.parentNode;
				var pingNode = domNode.firstChild || domNode; // target node most unlikely to have a custom filter
				var origFilter = pingNode.style.filter; // save custom filter, most likely nothing
				var _this = this;
				while(parent && parent.clientHeight == 0){ // search for parents that haven't rendered yet
					(function ping(){
						var disconnectHandle = _this.connect(parent, "onscroll",
							function(){
								_this.disconnect(disconnectHandle); // only call once
								pingNode.style.filter = (new Date()).getMilliseconds(); // set to anything that's unique
								_this.defer(function(){
									pingNode.style.filter = origFilter;
								}); // restore custom filter, if any
							}
						);
					})();
					parent = parent.parentNode;
				}
			}
		}
	});
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

			// Set disabled property if focusNode is an <input>, but aria-disabled attribute if focusNode is a <span>.
			// Can't use "disabled" in this.focusNode as a test because on IE, that's true for all nodes.
			if(/^(button|input|select|textarea|optgroup|option|fieldset)$/i.test(this.focusNode.tagName)){
				domAttr.set(this.focusNode, 'disabled', value);
				// IE has a Caret Browsing mode (hit F7 to activate) where disabled textboxes can be modified
				// textboxes marked readonly if disabled to avoid this issue.
				if (has('trident') && 'readOnly' in this) {
					domAttr.set(this.focusNode, 'readonly', value || this.readOnly);
				}
			}else{
				this.focusNode.setAttribute("aria-disabled", value ? "true" : "false");
			}

			// And also set disabled on the hidden <input> node
			if(this.valueNode){
				domAttr.set(this.valueNode, 'disabled', value);
			}

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
'dijit/form/_FormValueMixin':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/keys", // keys.ESCAPE
	"dojo/_base/lang",
	"dojo/on",
	"dojo/sniff", // has("webkit")
	"./_FormWidgetMixin"
], function(declare, domAttr, keys, lang, on, has, _FormWidgetMixin){

	// module:
	//		dijit/form/_FormValueMixin

	return declare("dijit.form._FormValueMixin", _FormWidgetMixin, {
		// summary:
		//		Mixin for widgets corresponding to native HTML elements such as `<input>` or `<select>`
		//		that have user changeable values.
		// description:
		//		Each _FormValueMixin represents a single input value, and has a (possibly hidden) `<input>` element,
		//		to which it serializes it's input value, so that form submission (either normal submission or via FormBind?)
		//		works as expected.

		// readOnly: Boolean
		//		Should this widget respond to user input?
		//		In markup, this is specified as "readOnly".
		//		Similar to disabled except readOnly form values are submitted.
		readOnly: false,

		_setReadOnlyAttr: function(/*Boolean*/ value){
			// IE has a Caret Browsing mode (hit F7 to activate) where disabled textboxes can be modified
			// focusNode enforced readonly if currently disabled to avoid this issue.
			if (has('trident') && 'disabled' in this) {
				domAttr.set(this.focusNode, 'readOnly', value || this.disabled);
			} else {
				domAttr.set(this.focusNode, 'readOnly', value);
			}
			this._set("readOnly", value);
		},

		postCreate: function(){
			this.inherited(arguments);

			// Update our reset value if it hasn't yet been set (because this.set()
			// is only called when there *is* a value)
			if(this._resetValue === undefined){
				this._lastValueReported = this._resetValue = this.value;
			}
		},

		_setValueAttr: function(/*anything*/ newValue, /*Boolean?*/ priorityChange){
			// summary:
			//		Hook so set('value', value) works.
			// description:
			//		Sets the value of the widget.
			//		If the value has changed, then fire onChange event, unless priorityChange
			//		is specified as null (or false?)
			this._handleOnChange(newValue, priorityChange);
		},

		_handleOnChange: function(/*anything*/ newValue, /*Boolean?*/ priorityChange){
			// summary:
			//		Called when the value of the widget has changed.  Saves the new value in this.value,
			//		and calls onChange() if appropriate.   See _FormWidget._handleOnChange() for details.
			this._set("value", newValue);
			this.inherited(arguments);
		},

		undo: function(){
			// summary:
			//		Restore the value to the last value passed to onChange
			this._setValueAttr(this._lastValueReported, false);
		},

		reset: function(){
			// summary:
			//		Reset the widget's value to what it was at initialization time
			this._hasBeenBlurred = false;
			this._setValueAttr(this._resetValue, true);
		}
	});
});

},
'dijit/form/_TextBoxMixin':function(){
define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.byId
	"dojo/sniff",	// has("ie"), has("dojo-bidi")
	"dojo/keys", // keys.ALT keys.CAPS_LOCK keys.CTRL keys.META keys.SHIFT
	"dojo/_base/lang", // lang.mixin
	"dojo/on", // on
	"../main"    // for exporting dijit._setSelectionRange, dijit.selectInputText
], function(array, declare, dom, has, keys, lang, on, dijit){

	// module:
	//		dijit/form/_TextBoxMixin

	var _TextBoxMixin = declare("dijit.form._TextBoxMixin" + (has("dojo-bidi") ? "_NoBidi" : ""), null, {
		// summary:
		//		A mixin for textbox form input widgets

		// trim: Boolean
		//		Removes leading and trailing whitespace if true.  Default is false.
		trim: false,

		// uppercase: Boolean
		//		Converts all characters to uppercase if true.  Default is false.
		uppercase: false,

		// lowercase: Boolean
		//		Converts all characters to lowercase if true.  Default is false.
		lowercase: false,

		// propercase: Boolean
		//		Converts the first character of each word to uppercase if true.
		propercase: false,

		// maxLength: String
		//		HTML INPUT tag maxLength declaration.
		maxLength: "",

		// selectOnClick: [const] Boolean
		//		If true, all text will be selected when focused with mouse
		selectOnClick: false,

		// placeHolder: String
		//		Defines a hint to help users fill out the input field (as defined in HTML 5).
		//		This should only contain plain text (no html markup).
		placeHolder: "",

		_getValueAttr: function(){
			// summary:
			//		Hook so get('value') works as we like.
			// description:
			//		For `dijit/form/TextBox` this basically returns the value of the `<input>`.
			//
			//		For `dijit/form/MappedTextBox` subclasses, which have both
			//		a "displayed value" and a separate "submit value",
			//		This treats the "displayed value" as the master value, computing the
			//		submit value from it via this.parse().
			return this.parse(this.get('displayedValue'), this.constraints);
		},

		_setValueAttr: function(value, /*Boolean?*/ priorityChange, /*String?*/ formattedValue){
			// summary:
			//		Hook so set('value', ...) works.
			//
			// description:
			//		Sets the value of the widget to "value" which can be of
			//		any type as determined by the widget.
			//
			// value:
			//		The visual element value is also set to a corresponding,
			//		but not necessarily the same, value.
			//
			// formattedValue:
			//		If specified, used to set the visual element value,
			//		otherwise a computed visual value is used.
			//
			// priorityChange:
			//		If true, an onChange event is fired immediately instead of
			//		waiting for the next blur event.

			var filteredValue;
			if(value !== undefined){
				// TODO: this is calling filter() on both the display value and the actual value.
				// I added a comment to the filter() definition about this, but it should be changed.
				filteredValue = this.filter(value);
				if(typeof formattedValue != "string"){
					if(filteredValue !== null && ((typeof filteredValue != "number") || !isNaN(filteredValue))){
						formattedValue = this.filter(this.format(filteredValue, this.constraints));
					}else{
						formattedValue = '';
					}
					// Ensure the filtered value does not change after being formatted. See track #17955.
					//
					// This check is only applied when the formatted value is not specified by the caller in order to allow the 
					// behavior to be overriden. This is needed whenever value synonyms cannot be determined using parse/compare. For
					// example, dijit/form/FilteringSelect determines the formatted value asynchronously and applies it using a 
					// callback to this method.
					//
					// TODO: Should developers be warned that they broke the round trip on format?
					if (this.compare(filteredValue, this.filter(this.parse(formattedValue, this.constraints))) != 0){
						formattedValue = null;
					}
				}
			}
			if(formattedValue != null /* and !undefined */ && ((typeof formattedValue) != "number" || !isNaN(formattedValue)) && this.textbox.value != formattedValue){
				this.textbox.value = formattedValue;
				this._set("displayedValue", this.get("displayedValue"));
			}

			this.inherited(arguments, [filteredValue, priorityChange]);
		},

		// displayedValue: String
		//		For subclasses like ComboBox where the displayed value
		//		(ex: Kentucky) and the serialized value (ex: KY) are different,
		//		this represents the displayed value.
		//
		//		Setting 'displayedValue' through set('displayedValue', ...)
		//		updates 'value', and vice-versa.  Otherwise 'value' is updated
		//		from 'displayedValue' periodically, like onBlur etc.
		//
		//		TODO: move declaration to MappedTextBox?
		//		Problem is that ComboBox references displayedValue,
		//		for benefit of FilteringSelect.
		displayedValue: "",

		_getDisplayedValueAttr: function(){
			// summary:
			//		Hook so get('displayedValue') works.
			// description:
			//		Returns the displayed value (what the user sees on the screen),
			//		after filtering (ie, trimming spaces etc.).
			//
			//		For some subclasses of TextBox (like ComboBox), the displayed value
			//		is different from the serialized value that's actually
			//		sent to the server (see `dijit/form/ValidationTextBox.serialize()`)

			// TODO: maybe we should update this.displayedValue on every keystroke so that we don't need
			// this method
			// TODO: this isn't really the displayed value when the user is typing
			return this.filter(this.textbox.value);
		},

		_setDisplayedValueAttr: function(/*String*/ value){
			// summary:
			//		Hook so set('displayedValue', ...) works.
			// description:
			//		Sets the value of the visual element to the string "value".
			//		The widget value is also set to a corresponding,
			//		but not necessarily the same, value.

			if(value == null /* or undefined */){
				value = ''
			}
			else if(typeof value != "string"){
				value = String(value)
			}

			this.textbox.value = value;

			// sets the serialized value to something corresponding to specified displayedValue
			// (if possible), and also updates the textbox.value, for example converting "123"
			// to "123.00"
			this._setValueAttr(this.get('value'), undefined);

			this._set("displayedValue", this.get('displayedValue'));
		},

		format: function(value /*=====, constraints =====*/){
			// summary:
			//		Replaceable function to convert a value to a properly formatted string.
			// value: String
			// constraints: Object
			// tags:
			//		protected extension
			return value == null /* or undefined */ ? "" : (value.toString ? value.toString() : value);
		},

		parse: function(value /*=====, constraints =====*/){
			// summary:
			//		Replaceable function to convert a formatted string to a value
			// value: String
			// constraints: Object
			// tags:
			//		protected extension

			return value;	// String
		},

		_refreshState: function(){
			// summary:
			//		After the user types some characters, etc., this method is
			//		called to check the field for validity etc.  The base method
			//		in `dijit/form/TextBox` does nothing, but subclasses override.
			// tags:
			//		protected
		},

		 onInput: function(/*Event*/ /*===== evt =====*/){
			 // summary:
			 //		Connect to this function to receive notifications of various user data-input events.
			 //		Return false to cancel the event and prevent it from being processed.
			 //		Note that although for historical reasons this method is called `onInput()`, it doesn't
			 //		correspond to the standard DOM "input" event, because it occurs before the input has been processed.
			 // event:
			 //		keydown | keypress | cut | paste | compositionend
			 // tags:
			 //		callback
		 },

		_onInput: function(/*Event*/ evt){
			// summary:
			//		Called AFTER the input event has happened and this.textbox.value has new value.

			this._lastInputEventValue = this.textbox.value;

			// For Combobox, this needs to be called w/the keydown/keypress event that was passed to onInput().
			// As a backup, use the "input" event itself.
			this._processInput(this._lastInputProducingEvent || evt);
			delete this._lastInputProducingEvent;

			if(this.intermediateChanges){
				this._handleOnChange(this.get('value'), false);
			}
		},

		_processInput: function(/*Event*/ /*===== evt =====*/){
			// summary:
			//		Default action handler for user input events.
			//		Called after the "input" event (i.e. after this.textbox.value has been updated),
			//		but `evt` is the keydown/keypress/etc. event that triggered the "input" event.
			// tags:
			//		protected

			this._refreshState();

			// In case someone is watch()'ing for changes to displayedValue
			this._set("displayedValue", this.get("displayedValue"));
		},

		postCreate: function(){
			// setting the value here is needed since value="" in the template causes "undefined"
			// and setting in the DOM (instead of the JS object) helps with form reset actions
			this.textbox.setAttribute("value", this.textbox.value); // DOM and JS values should be the same

			this.inherited(arguments);

			// normalize input events to reduce spurious event processing
			//	keydown: do not forward modifier keys
			//		       set charOrCode to numeric keycode
			//	keypress: do not forward numeric charOrCode keys (already sent through onkeydown)
			//	paste, cut, compositionend: set charOrCode to 229 (IME)
			function handleEvent(e){
				var charOrCode;

				// Filter out keydown events that will be followed by keypress events.  Note that chrome/android
				// w/word suggestion has keydown/229 events on typing with no corresponding keypress events.
				if(e.type == "keydown" && e.keyCode != 229){
					charOrCode = e.keyCode;
					switch(charOrCode){ // ignore state keys
						case keys.SHIFT:
						case keys.ALT:
						case keys.CTRL:
						case keys.META:
						case keys.CAPS_LOCK:
						case keys.NUM_LOCK:
						case keys.SCROLL_LOCK:
							return;
					}
					if(!e.ctrlKey && !e.metaKey && !e.altKey){ // no modifiers
						switch(charOrCode){ // ignore location keys
							case keys.NUMPAD_0:
							case keys.NUMPAD_1:
							case keys.NUMPAD_2:
							case keys.NUMPAD_3:
							case keys.NUMPAD_4:
							case keys.NUMPAD_5:
							case keys.NUMPAD_6:
							case keys.NUMPAD_7:
							case keys.NUMPAD_8:
							case keys.NUMPAD_9:
							case keys.NUMPAD_MULTIPLY:
							case keys.NUMPAD_PLUS:
							case keys.NUMPAD_ENTER:
							case keys.NUMPAD_MINUS:
							case keys.NUMPAD_PERIOD:
							case keys.NUMPAD_DIVIDE:
								return;
						}
						if((charOrCode >= 65 && charOrCode <= 90) || (charOrCode >= 48 && charOrCode <= 57) || charOrCode == keys.SPACE){
							return; // keypress will handle simple non-modified printable keys
						}
						var named = false;
						for(var i in keys){
							if(keys[i] === e.keyCode){
								named = true;
								break;
							}
						}
						if(!named){
							return;
						} // only allow named ones through
					}
				}

				charOrCode = e.charCode >= 32 ? String.fromCharCode(e.charCode) : e.charCode;
				if(!charOrCode){
					charOrCode = (e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 48 && e.keyCode <= 57) || e.keyCode == keys.SPACE ? String.fromCharCode(e.keyCode) : e.keyCode;
				}
				if(!charOrCode){
					charOrCode = 229; // IME
				}
				if(e.type == "keypress"){
					if(typeof charOrCode != "string"){
						return;
					}
					if((charOrCode >= 'a' && charOrCode <= 'z') || (charOrCode >= 'A' && charOrCode <= 'Z') || (charOrCode >= '0' && charOrCode <= '9') || (charOrCode === ' ')){
						if(e.ctrlKey || e.metaKey || e.altKey){
							return;
						} // can only be stopped reliably in keydown
					}
				}

				// create fake event to set charOrCode and to know if preventDefault() was called
				var faux = { faux: true }, attr;
				for(attr in e){
					if(!/^(layer[XY]|returnValue|keyLocation)$/.test(attr)){ // prevent WebKit warnings
						var v = e[attr];
						if(typeof v != "function" && typeof v != "undefined"){
							faux[attr] = v;
						}
					}
				}
				lang.mixin(faux, {
					charOrCode: charOrCode,
					_wasConsumed: false,
					preventDefault: function(){
						faux._wasConsumed = true;
						e.preventDefault();
					},
					stopPropagation: function(){
						e.stopPropagation();
					}
				});

				this._lastInputProducingEvent = faux;

				// Give web page author a chance to consume the event.  Note that onInput() may be called multiple times
				// for same keystroke: once for keypress event and once for input event.
				// 0 && console.log(faux.type + ', charOrCode = (' + (typeof charOrCode) + ') ' + charOrCode + ', ctrl ' + !!faux.ctrlKey + ', alt ' + !!faux.altKey + ', meta ' + !!faux.metaKey + ', shift ' + !!faux.shiftKey);
				if(this.onInput(faux) === false){ // return false means stop
					faux.preventDefault();
					faux.stopPropagation();
				}
				if(faux._wasConsumed){
					return;
				} // if preventDefault was called

				// IE8 doesn't emit the "input" event at all, and IE9 doesn't emit it for backspace, delete, cut, etc.
				// Since the code below (and perhaps user code) depends on that event, emit it synthetically.
				// See http://benalpert.com/2013/06/18/a-near-perfect-oninput-shim-for-ie-8-and-9.html.
				if(has("ie") <= 9){
					switch(e.keyCode){
					case keys.TAB:
					case keys.ESCAPE:
					case keys.DOWN_ARROW:
					case keys.UP_ARROW:
					case keys.LEFT_ARROW:
					case keys.RIGHT_ARROW:
						// These keys may alter the <input>'s value indirectly, but we don't want to emit an "input"
						// event.  For example, the up/down arrows in TimeTextBox or ComboBox will cause the next
						// dropdown item's value to be copied to the <input>.
						break;
					default:
						if(e.keyCode == keys.ENTER && this.textbox.tagName.toLowerCase() != "textarea"){
							break;
						}
						this.defer(function(){
							if(this.textbox.value !== this._lastInputEventValue){
								on.emit(this.textbox, "input", {bubbles: true});
							}
						});
					}
				}
			}
			this.own(
				on(this.textbox, "keydown, keypress, paste, cut, compositionend", lang.hitch(this, handleEvent)),
				on(this.textbox, "input", lang.hitch(this, "_onInput")),

				// Allow keypress to bubble to this.domNode, so that TextBox.on("keypress", ...) works,
				// but prevent it from further propagating, so that typing into a TextBox inside a Toolbar doesn't
				// trigger the Toolbar's letter key navigation.
				on(this.domNode, "keypress", function(e){ e.stopPropagation(); })
			);
		},

		_blankValue: '', // if the textbox is blank, what value should be reported
		filter: function(val){
			// summary:
			//		Auto-corrections (such as trimming) that are applied to textbox
			//		value on blur or form submit.
			// description:
			//		For MappedTextBox subclasses, this is called twice
			//
			//		- once with the display value
			//		- once the value as set/returned by set('value', ...)
			//
			//		and get('value'), ex: a Number for NumberTextBox.
			//
			//		In the latter case it does corrections like converting null to NaN.  In
			//		the former case the NumberTextBox.filter() method calls this.inherited()
			//		to execute standard trimming code in TextBox.filter().
			//
			//		TODO: break this into two methods in 2.0
			//
			// tags:
			//		protected extension
			if(val === null){
				return this._blankValue;
			}
			if(typeof val != "string"){
				return val;
			}
			if(this.trim){
				val = lang.trim(val);
			}
			if(this.uppercase){
				val = val.toUpperCase();
			}
			if(this.lowercase){
				val = val.toLowerCase();
			}
			if(this.propercase){
				val = val.replace(/[^\s]+/g, function(word){
					return word.substring(0, 1).toUpperCase() + word.substring(1);
				});
			}
			return val;
		},

		_setBlurValue: function(){
			// Format the displayed value, for example (for NumberTextBox) convert 1.4 to 1.400,
			// or (for CurrencyTextBox) 2.50 to $2.50

			this._setValueAttr(this.get('value'), true);
		},

		_onBlur: function(e){
			if(this.disabled){
				return;
			}
			this._setBlurValue();
			this.inherited(arguments);
		},

		_isTextSelected: function(){
			return this.textbox.selectionStart != this.textbox.selectionEnd;
		},

		_onFocus: function(/*String*/ by){
			if(this.disabled || this.readOnly){
				return;
			}

			// Select all text on focus via click if nothing already selected.
			// Since mouse-up will clear the selection, need to defer selection until after mouse-up.
			// Don't do anything on focus by tabbing into the widget since there's no associated mouse-up event.
			if(this.selectOnClick && by == "mouse"){
				// Use on.once() to only select all text on first click only; otherwise users would have no way to clear
				// the selection.
				this._selectOnClickHandle = on.once(this.domNode, "mouseup, touchend", lang.hitch(this, function(evt){
					// Check if the user selected some text manually (mouse-down, mouse-move, mouse-up)
					// and if not, then select all the text
					if(!this._isTextSelected()){
						_TextBoxMixin.selectInputText(this.textbox);
					}
				}));
				this.own(this._selectOnClickHandle);

				// in case the mouseup never comes
				this.defer(function(){
					if(this._selectOnClickHandle){
						this._selectOnClickHandle.remove();
						this._selectOnClickHandle = null;
					}
				}, 500); // if mouseup not received soon, then treat it as some gesture
			}
			// call this.inherited() before refreshState(), since this.inherited() will possibly scroll the viewport
			// (to scroll the TextBox into view), which will affect how _refreshState() positions the tooltip
			this.inherited(arguments);

			this._refreshState();
		},

		reset: function(){
			// Overrides `dijit/_FormWidget/reset()`.
			// Additionally resets the displayed textbox value to ''
			this.textbox.value = '';
			this.inherited(arguments);
		}
	});

	if(has("dojo-bidi")){
		_TextBoxMixin = declare("dijit.form._TextBoxMixin", _TextBoxMixin, {
			_setValueAttr: function(){
				this.inherited(arguments);
				this.applyTextDir(this.focusNode);
			},
			_setDisplayedValueAttr: function(){
				this.inherited(arguments);
				this.applyTextDir(this.focusNode);
			},
			_onInput: function(){
				this.applyTextDir(this.focusNode);
				this.inherited(arguments);
			}
		});
	}

	_TextBoxMixin._setSelectionRange = dijit._setSelectionRange = function(/*DomNode*/ element, /*Number?*/ start, /*Number?*/ stop){
		if(element.setSelectionRange){
			element.setSelectionRange(start, stop);
		}
	};

	_TextBoxMixin.selectInputText = dijit.selectInputText = function(/*DomNode*/ element, /*Number?*/ start, /*Number?*/ stop){
		// summary:
		//		Select text in the input element argument, from start (default 0), to stop (default end).

		// TODO: use functions in _editor/selection.js?
		element = dom.byId(element);
		if(isNaN(start)){
			start = 0;
		}
		if(isNaN(stop)){
			stop = element.value ? element.value.length : 0;
		}
		try{
			element.focus();
			_TextBoxMixin._setSelectionRange(element, start, stop);
		}catch(e){ /* squelch random errors (esp. on IE) from unexpected focus changes or DOM nodes being hidden */
		}
	};

	return _TextBoxMixin;
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

		postCreate: function(){
			this.inherited(arguments);
			this._setLabelFromContainer();
		},

		_setLabelFromContainer: function(){
			if(this.containerNode && !this.label){
				// When markup was set as srcNodeRef.innerHTML, copy it to this.label, in case someone tries to
				// reference that variable.  Alternately, could have a _getLabelAttr() method to return
				// this.containerNode.innerHTML.
				this.label = lang.trim(this.containerNode.innerHTML);
				this.onLabelSet();		// set this.titleNode.title etc. according to label
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

		onLabelSet: function(){
			this.inherited(arguments);
			if(!this.showLabel && !("title" in this.params)){
				this.titleNode.title = lang.trim(this.containerNode.innerText || this.containerNode.textContent || '');
			}
		}
	});

	if(has("dojo-bidi")){
		Button = declare("dijit.form.Button", Button, {
			onLabelSet: function(){
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
			this.onLabelSet();
		},

		onLabelSet: function(){
		}
	});

	if(has("dojo-bidi")){
		ButtonMixin = declare("dijit.form._ButtonMixin", ButtonMixin, {
			onLabelSet: function(){
				this.inherited(arguments);
				var labelNode = this.containerNode || this.focusNode;
				this.applyTextDir(labelNode);
			}
		});
	}

	return ButtonMixin;
});

},
'dojox/validate/web':function(){
define(["./_base", "./regexp"], function(validate, xregexp){

validate.isIpAddress = function(value, flags) {
	// summary:
	//		Validates an IP address
	// description:
	//		Supports 5 formats for IPv4: dotted decimal, dotted hex, dotted octal, decimal and hexadecimal.
	//		Supports 2 formats for Ipv6.
	// value: String
	// flags: Object?
	//		All flags are boolean with default = true.
	//
	//		- flags.allowDottedDecimal  Example, 207.142.131.235.  No zero padding.
	//		- flags.allowDottedHex  Example, 0x18.0x11.0x9b.0x28.  Case insensitive.  Zero padding allowed.
	//		- flags.allowDottedOctal  Example, 0030.0021.0233.0050.  Zero padding allowed.
	//		- flags.allowDecimal  Example, 3482223595.  A decimal number between 0-4294967295.
	//		- flags.allowHex  Example, 0xCF8E83EB.  Hexadecimal number between 0x0-0xFFFFFFFF.
	//		  Case insensitive.  Zero padding allowed.
	//		- flags.allowIPv6   IPv6 address written as eight groups of four hexadecimal digits.
	//		- flags.allowHybrid   IPv6 address written as six groups of four hexadecimal digits
	//		  followed by the usual 4 dotted decimal digit notation of IPv4. x:x:x:x:x:x:d.d.d.d

	var re = new RegExp("^" + xregexp.ipAddress(flags) + "$", "i");
	return re.test(value); // Boolean
};


validate.isUrl = function(value, flags) {
	// summary:
	//		Checks if a string could be a valid URL
	// value: String
	// flags: Object?
	//		- flags.scheme  Can be true, false, or [true, false].
	//		  This means: required, not allowed, or either.
	//		- flags in regexp.host can be applied.
	//		- flags in regexp.ipAddress can be applied.
	//		- flags in regexp.tld can be applied.

	var re = new RegExp("^" + xregexp.url(flags) + "$", "i");
	return re.test(value); // Boolean
};

validate.isEmailAddress = function(value, flags) {
	// summary:
	//		Checks if a string could be a valid email address
	// value: String
	// flags: Object?
	//		- flags.allowCruft  Allow address like `<mailto:foo@yahoo.com>`.  Default is false.
	//		- flags in regexp.host can be applied.
	//		- flags in regexp.ipAddress can be applied.
	//		- flags in regexp.tld can be applied.

	var re = new RegExp("^" + xregexp.emailAddress(flags) + "$", "i");
	return re.test(value); // Boolean
};

validate.isEmailAddressList = function(value, flags) {
	// summary:
	//		Checks if a string could be a valid email address list.
	// value: String
	// flags: Object?
	//		- flags.listSeparator  The character used to separate email addresses.  Default is ";", ",", "\n" or " ".
	//		- flags in regexp.emailAddress can be applied.
	//		- flags in regexp.host can be applied.
	//		- flags in regexp.ipAddress can be applied.
	//		- flags in regexp.tld can be applied.

	var re = new RegExp("^" + xregexp.emailAddressList(flags) + "$", "i");
	return re.test(value); // Boolean
};

validate.getEmailAddressList = function(value, flags) {
	// summary:
	//		Check if value is an email address list. If an empty list
	//		is returned, the value didn't pass the test or it was empty.
	// value: String
	// flags: Object?
	//		An object (same as dojo.validate.isEmailAddressList)

	if(!flags) { flags = {}; }
	if(!flags.listSeparator) { flags.listSeparator = "\\s;,"; }

	if ( validate.isEmailAddressList(value, flags) ) {
		return value.split(new RegExp("\\s*[" + flags.listSeparator + "]\\s*")); // Array
	}
	return []; // Array
};

return validate;
});

},
'dojox/validate/_base':function(){
define([
	"dojo/_base/lang",
	"dojo/regexp", // dojo core expressions
	"dojo/number", // dojo number expressions
	"./regexp" // additional expressions
], function(lang, regexp, number, xregexp) {

var validate = lang.getObject("dojox.validate", true);

validate.isText = function(value, flags){
	// summary:
	//		Checks if a string has non whitespace characters.
	//		Parameters allow you to constrain the length.
	// value: String
	// flags: Object?
	//		{length: Number, minlength: Number, maxlength: Number}
	//
	//		- flags.length  If set, checks if there are exactly flags.length number of characters.
	//		- flags.minlength  If set, checks if there are at least flags.minlength number of characters.
	//		- flags.maxlength  If set, checks if there are at most flags.maxlength number of characters.
	
	flags = (typeof flags == "object") ? flags : {};
	
	// test for text
	if(/^\s*$/.test(value)){ return false; } // Boolean
	
	// length tests
	if(typeof flags.length == "number" && flags.length != value.length){ return false; } // Boolean
	if(typeof flags.minlength == "number" && flags.minlength > value.length){ return false; } // Boolean
	if(typeof flags.maxlength == "number" && flags.maxlength < value.length){ return false; } // Boolean
	
	return true; // Boolean

};

validate._isInRangeCache = {};
validate.isInRange = function(value, flags){
	// summary:
	//		Validates whether a string denoting a number
	//		is between a max and min.
	// value: String
	// flags: Object?
	//		{max:Number, min:Number, decimal:String}
	//
	//		- flags.max  A number, which the value must be less than or equal to for the validation to be true.
	//		- flags.min  A number, which the value must be greater than or equal to for the validation to be true.
	//		- flags.decimal  The character used for the decimal point.  Default is ".".
	
	value = number.parse(value, flags);
	if(isNaN(value)){
		return false; // Boolean
	}
    
	// assign default values to missing parameters
	flags = (typeof flags == "object") ? flags : {};
	var max = (typeof flags.max == "number") ? flags.max : Infinity,
		min = (typeof flags.min == "number") ? flags.min : -Infinity,
		dec = (typeof flags.decimal == "string") ? flags.decimal : ".",
	
		cache = validate._isInRangeCache,
		cacheIdx = value + "max" + max + "min" + min + "dec" + dec
	;
	if(typeof cache[cacheIdx] != "undefined"){
		return cache[cacheIdx];
	}

	cache[cacheIdx] = !(value < min || value > max);
	return cache[cacheIdx]; // Boolean

};

validate.isNumberFormat = function(value, flags){
	// summary:
	//		Validates any sort of number based format
	// description:
	//		Validates any sort of number based format. Use it for phone numbers,
	//		social security numbers, zip-codes, etc. The value can be validated
	//		against one format or one of multiple formats.
	//
	//		Format Definition
	//		|   #        Stands for a digit, 0-9.
	//		|   ?        Stands for an optional digit, 0-9 or nothing.
	//		All other characters must appear literally in the expression.
	// example:
	// |  "(###) ###-####"       ->   (510) 542-9742
	// |  "(###) ###-#### x#???" ->   (510) 542-9742 x153
	// |  "###-##-####"          ->   506-82-1089       i.e. social security number
	// |  "#####-####"           ->   98225-1649        i.e. zip code
	// value: String
	// flags: Object?
	//		- flags.format  A string or an Array of strings for multiple formats.
	// example:
	// |	require(["dojox/validate/_base"], function(validate){
	// |		// returns true:
	// |		validate.isNumberFormat("123-45", { format:"###-##" });
	// |	});		
	// example:
	//		Check Multiple formats:
	// |	require(["dojox/validate/_base"], function(validate){
	// |		validate.isNumberFormat("123-45", {
	// |			format:["### ##","###-##","## ###"]
	// |	});
	//

	var re = new RegExp("^" + xregexp.numberFormat(flags) + "$", "i");
	return re.test(value); // Boolean
};

validate.isValidLuhn = function(/* String */value){
	// summary:
	//		Validate a String value against the Luhn algorithm.
	// description:
	//		Validate a String value against the Luhn algorithm to verify
	//		its integrity.
	
	var sum = 0, parity, curDigit;
	if(!lang.isString(value)){
		value = String(value);
	}
	value = value.replace(/[- ]/g,''); //ignore dashes and whitespaces
	parity = value.length % 2;

	for(var i = 0; i < value.length; i++){
		curDigit = parseInt(value.charAt(i));
		if(i % 2 == parity){
			curDigit *= 2;
		}
		if(curDigit > 9){
			curDigit -= 9;
		}
		sum += curDigit;
	}
	return !(sum % 10); // Boolean
};

return validate;

});

},
'dojo/regexp':function(){
define(["./_base/kernel", "./_base/lang"], function(dojo, lang){

// module:
//		dojo/regexp

var regexp = {
	// summary:
	//		Regular expressions and Builder resources
};
lang.setObject("dojo.regexp", regexp);

regexp.escapeString = function(/*String*/str, /*String?*/except){
	// summary:
	//		Adds escape sequences for special characters in regular expressions
	// except:
	//		a String with special characters to be left unescaped

	return str.replace(/([\.$?*|{}\(\)\[\]\\\/\+\-^])/g, function(ch){
		if(except && except.indexOf(ch) != -1){
			return ch;
		}
		return "\\" + ch;
	}); // String
};

regexp.buildGroupRE = function(/*Object|Array*/arr, /*Function*/re, /*Boolean?*/nonCapture){
	// summary:
	//		Builds a regular expression that groups subexpressions
	// description:
	//		A utility function used by some of the RE generators. The
	//		subexpressions are constructed by the function, re, in the second
	//		parameter.  re builds one subexpression for each elem in the array
	//		a, in the first parameter. Returns a string for a regular
	//		expression that groups all the subexpressions.
	// arr:
	//		A single value or an array of values.
	// re:
	//		A function. Takes one parameter and converts it to a regular
	//		expression.
	// nonCapture:
	//		If true, uses non-capturing match, otherwise matches are retained
	//		by regular expression. Defaults to false

	// case 1: a is a single value.
	if(!(arr instanceof Array)){
		return re(arr); // String
	}

	// case 2: a is an array
	var b = [];
	for(var i = 0; i < arr.length; i++){
		// convert each elem to a RE
		b.push(re(arr[i]));
	}

	 // join the REs as alternatives in a RE group.
	return regexp.group(b.join("|"), nonCapture); // String
};

regexp.group = function(/*String*/expression, /*Boolean?*/nonCapture){
	// summary:
	//		adds group match to expression
	// nonCapture:
	//		If true, uses non-capturing match, otherwise matches are retained
	//		by regular expression.
	return "(" + (nonCapture ? "?:":"") + expression + ")"; // String
};

return regexp;
});

},
'dojo/number':function(){
define([/*===== "./_base/declare", =====*/ "./_base/lang", "./i18n", "./i18n!./cldr/nls/number", "./string", "./regexp"],
	function(/*===== declare, =====*/ lang, i18n, nlsNumber, dstring, dregexp){

// module:
//		dojo/number

var number = {
	// summary:
	//		localized formatting and parsing routines for Number
};
lang.setObject("dojo.number", number);

/*=====
number.__FormatOptions = declare(null, {
	// pattern: String?
	//		override [formatting pattern](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	//		with this string.  Default value is based on locale.  Overriding this property will defeat
	//		localization.  Literal characters in patterns are not supported.
	// type: String?
	//		choose a format type based on the locale from the following:
	//		decimal, scientific (not yet supported), percent, currency. decimal by default.
	// places: Number?
	//		fixed number of decimal places to show.  This overrides any
	//		information in the provided pattern.
	// round: Number?
	//		5 rounds to nearest .5; 0 rounds to nearest whole (default). -1
	//		means do not round.
	// locale: String?
	//		override the locale used to determine formatting rules
	// fractional: Boolean?
	//		If false, show no decimal places, overriding places and pattern settings.
});
=====*/

number.format = function(/*Number*/ value, /*number.__FormatOptions?*/ options){
	// summary:
	//		Format a Number as a String, using locale-specific settings
	// description:
	//		Create a string from a Number using a known localized pattern.
	//		Formatting patterns appropriate to the locale are chosen from the
	//		[Common Locale Data Repository](http://unicode.org/cldr) as well as the appropriate symbols and
	//		delimiters.
	//		If value is Infinity, -Infinity, or is not a valid JavaScript number, return null.
	// value:
	//		the number to be formatted

	options = lang.mixin({}, options || {});
	var locale = i18n.normalizeLocale(options.locale),
		bundle = i18n.getLocalization("dojo.cldr", "number", locale);
	options.customs = bundle;
	var pattern = options.pattern || bundle[(options.type || "decimal") + "Format"];
	if(isNaN(value) || Math.abs(value) == Infinity){ return null; } // null
	return number._applyPattern(value, pattern, options); // String
};

//number._numberPatternRE = /(?:[#0]*,?)*[#0](?:\.0*#*)?/; // not precise, but good enough
number._numberPatternRE = /[#0,]*[#0](?:\.0*#*)?/; // not precise, but good enough

number._applyPattern = function(/*Number*/ value, /*String*/ pattern, /*number.__FormatOptions?*/ options){
	// summary:
	//		Apply pattern to format value as a string using options. Gives no
	//		consideration to local customs.
	// value:
	//		the number to be formatted.
	// pattern:
	//		a pattern string as described by
	//		[unicode.org TR35](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	// options: number.__FormatOptions?
	//		_applyPattern is usually called via `dojo/number.format()` which
	//		populates an extra property in the options parameter, "customs".
	//		The customs object specifies group and decimal parameters if set.

	//TODO: support escapes
	options = options || {};
	var group = options.customs.group,
		decimal = options.customs.decimal,
		patternList = pattern.split(';'),
		positivePattern = patternList[0];
	pattern = patternList[(value < 0) ? 1 : 0] || ("-" + positivePattern);

	//TODO: only test against unescaped
	if(pattern.indexOf('%') != -1){
		value *= 100;
	}else if(pattern.indexOf('\u2030') != -1){
		value *= 1000; // per mille
	}else if(pattern.indexOf('\u00a4') != -1){
		group = options.customs.currencyGroup || group;//mixins instead?
		decimal = options.customs.currencyDecimal || decimal;// Should these be mixins instead?
		pattern = pattern.replace(/([\s\xa0]*)(\u00a4{1,3})([\s\xa0]*)/, function(match, before, target, after){
			var prop = ["symbol", "currency", "displayName"][target.length-1],
				symbol = options[prop] || options.currency || "";
			// if there is no symbol, also remove surrounding whitespaces
			if(!symbol){
				return "";
			}
			return before+symbol+after;
		});
	}else if(pattern.indexOf('E') != -1){
		throw new Error("exponential notation not supported");
	}

	//TODO: support @ sig figs?
	var numberPatternRE = number._numberPatternRE;
	var numberPattern = positivePattern.match(numberPatternRE);
	if(!numberPattern){
		throw new Error("unable to find a number expression in pattern: "+pattern);
	}
	if(options.fractional === false){ options.places = 0; }
	return pattern.replace(numberPatternRE,
		number._formatAbsolute(value, numberPattern[0], {decimal: decimal, group: group, places: options.places, round: options.round}));
};

number.round = function(/*Number*/ value, /*Number?*/ places, /*Number?*/ increment){
	// summary:
	//		Rounds to the nearest value with the given number of decimal places, away from zero
	// description:
	//		Rounds to the nearest value with the given number of decimal places, away from zero if equal.
	//		Similar to Number.toFixed(), but compensates for browser quirks. Rounding can be done by
	//		fractional increments also, such as the nearest quarter.
	//		NOTE: Subject to floating point errors.  See dojox/math/round for experimental workaround.
	// value:
	//		The number to round
	// places:
	//		The number of decimal places where rounding takes place.  Defaults to 0 for whole rounding.
	//		Must be non-negative.
	// increment:
	//		Rounds next place to nearest value of increment/10.  10 by default.
	// example:
	// |	>>> number.round(-0.5)
	// |	-1
	// |	>>> number.round(162.295, 2)
	// |	162.29  // note floating point error.  Should be 162.3
	// |	>>> number.round(10.71, 0, 2.5)
	// |	10.75
	var factor = 10 / (increment || 10);
	return (factor * +value).toFixed(places) / factor; // Number
};

if((0.9).toFixed() == 0){
	// (isIE) toFixed() bug workaround: Rounding fails on IE when most significant digit
	// is just after the rounding place and is >=5
	var round = number.round;
	number.round = function(v, p, m){
		var d = Math.pow(10, -p || 0), a = Math.abs(v);
		if(!v || a >= d){
			d = 0;
		}else{
			a /= d;
			if(a < 0.5 || a >= 0.95){
				d = 0;
			}
		}
		return round(v, p, m) + (v > 0 ? d : -d);
	};

	// Use "doc hint" so the doc parser ignores this new definition of round(), and uses the one above.
	/*===== number.round = round; =====*/
}

/*=====
number.__FormatAbsoluteOptions = declare(null, {
	// decimal: String?
	//		the decimal separator
	// group: String?
	//		the group separator
	// places: Number|String?
	//		number of decimal places.  the range "n,m" will format to m places.
	// round: Number?
	//		5 rounds to nearest .5; 0 rounds to nearest whole (default). -1
	//		means don't round.
});
=====*/

number._formatAbsolute = function(/*Number*/ value, /*String*/ pattern, /*number.__FormatAbsoluteOptions?*/ options){
	// summary:
	//		Apply numeric pattern to absolute value using options. Gives no
	//		consideration to local customs.
	// value:
	//		the number to be formatted, ignores sign
	// pattern:
	//		the number portion of a pattern (e.g. `#,##0.00`)
	options = options || {};
	if(options.places === true){options.places=0;}
	if(options.places === Infinity){options.places=6;} // avoid a loop; pick a limit

	var patternParts = pattern.split("."),
		comma = typeof options.places == "string" && options.places.indexOf(","),
		maxPlaces = options.places;
	if(comma){
		maxPlaces = options.places.substring(comma + 1);
	}else if(!(maxPlaces >= 0)){
		maxPlaces = (patternParts[1] || []).length;
	}
	if(!(options.round < 0)){
		value = number.round(value, maxPlaces, options.round);
	}

	var valueParts = String(Math.abs(value)).split("."),
		fractional = valueParts[1] || "";
	if(patternParts[1] || options.places){
		if(comma){
			options.places = options.places.substring(0, comma);
		}
		// Pad fractional with trailing zeros
		var pad = options.places !== undefined ? options.places : (patternParts[1] && patternParts[1].lastIndexOf("0") + 1);
		if(pad > fractional.length){
			valueParts[1] = dstring.pad(fractional, pad, '0', true);
		}

		// Truncate fractional
		if(maxPlaces < fractional.length){
			valueParts[1] = fractional.substr(0, maxPlaces);
		}
	}else{
		if(valueParts[1]){ valueParts.pop(); }
	}

	// Pad whole with leading zeros
	var patternDigits = patternParts[0].replace(',', '');
	pad = patternDigits.indexOf("0");
	if(pad != -1){
		pad = patternDigits.length - pad;
		if(pad > valueParts[0].length){
			valueParts[0] = dstring.pad(valueParts[0], pad);
		}

		// Truncate whole
		if(patternDigits.indexOf("#") == -1){
			valueParts[0] = valueParts[0].substr(valueParts[0].length - pad);
		}
	}

	// Add group separators
	var index = patternParts[0].lastIndexOf(','),
		groupSize, groupSize2;
	if(index != -1){
		groupSize = patternParts[0].length - index - 1;
		var remainder = patternParts[0].substr(0, index);
		index = remainder.lastIndexOf(',');
		if(index != -1){
			groupSize2 = remainder.length - index - 1;
		}
	}
	var pieces = [];
	for(var whole = valueParts[0]; whole;){
		var off = whole.length - groupSize;
		pieces.push((off > 0) ? whole.substr(off) : whole);
		whole = (off > 0) ? whole.slice(0, off) : "";
		if(groupSize2){
			groupSize = groupSize2;
			groupSize2 = undefined;
		}
	}
	valueParts[0] = pieces.reverse().join(options.group || ",");

	return valueParts.join(options.decimal || ".");
};

/*=====
number.__RegexpOptions = declare(null, {
	// pattern: String?
	//		override [formatting pattern](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	//		with this string.  Default value is based on locale.  Overriding this property will defeat
	//		localization.
	// type: String?
	//		choose a format type based on the locale from the following:
	//		decimal, scientific (not yet supported), percent, currency. decimal by default.
	// locale: String?
	//		override the locale used to determine formatting rules
	// strict: Boolean?
	//		strict parsing, false by default.  Strict parsing requires input as produced by the format() method.
	//		Non-strict is more permissive, e.g. flexible on white space, omitting thousands separators
	// places: Number|String?
	//		number of decimal places to accept: Infinity, a positive number, or
	//		a range "n,m".  Defined by pattern or Infinity if pattern not provided.
});
=====*/
number.regexp = function(/*number.__RegexpOptions?*/ options){
	// summary:
	//		Builds the regular needed to parse a number
	// description:
	//		Returns regular expression with positive and negative match, group
	//		and decimal separators
	return number._parseInfo(options).regexp; // String
};

number._parseInfo = function(/*Object?*/ options){
	options = options || {};
	var locale = i18n.normalizeLocale(options.locale),
		bundle = i18n.getLocalization("dojo.cldr", "number", locale),
		pattern = options.pattern || bundle[(options.type || "decimal") + "Format"],
//TODO: memoize?
		group = bundle.group,
		decimal = bundle.decimal,
		factor = 1;

	if(pattern.indexOf('%') != -1){
		factor /= 100;
	}else if(pattern.indexOf('\u2030') != -1){
		factor /= 1000; // per mille
	}else{
		var isCurrency = pattern.indexOf('\u00a4') != -1;
		if(isCurrency){
			group = bundle.currencyGroup || group;
			decimal = bundle.currencyDecimal || decimal;
		}
	}

	//TODO: handle quoted escapes
	var patternList = pattern.split(';');
	if(patternList.length == 1){
		patternList.push("-" + patternList[0]);
	}

	var re = dregexp.buildGroupRE(patternList, function(pattern){
		pattern = "(?:"+dregexp.escapeString(pattern, '.')+")";
		return pattern.replace(number._numberPatternRE, function(format){
			var flags = {
				signed: false,
				separator: options.strict ? group : [group,""],
				fractional: options.fractional,
				decimal: decimal,
				exponent: false
				},

				parts = format.split('.'),
				places = options.places;

			// special condition for percent (factor != 1)
			// allow decimal places even if not specified in pattern
			if(parts.length == 1 && factor != 1){
			    parts[1] = "###";
			}
			if(parts.length == 1 || places === 0){
				flags.fractional = false;
			}else{
				if(places === undefined){ places = options.pattern ? parts[1].lastIndexOf('0') + 1 : Infinity; }
				if(places && options.fractional == undefined){flags.fractional = true;} // required fractional, unless otherwise specified
				if(!options.places && (places < parts[1].length)){ places += "," + parts[1].length; }
				flags.places = places;
			}
			var groups = parts[0].split(',');
			if(groups.length > 1){
				flags.groupSize = groups.pop().length;
				if(groups.length > 1){
					flags.groupSize2 = groups.pop().length;
				}
			}
			return "("+number._realNumberRegexp(flags)+")";
		});
	}, true);

	if(isCurrency){
		// substitute the currency symbol for the placeholder in the pattern
		re = re.replace(/([\s\xa0]*)(\u00a4{1,3})([\s\xa0]*)/g, function(match, before, target, after){
			var prop = ["symbol", "currency", "displayName"][target.length-1],
				symbol = dregexp.escapeString(options[prop] || options.currency || "");

			// if there is no symbol there is no need to take white-spaces into account.
			if(!symbol){
				return "";
			}

			before = before ? "[\\s\\xa0]" : "";
			after = after ? "[\\s\\xa0]" : "";
			if(!options.strict){
				if(before){before += "*";}
				if(after){after += "*";}
				return "(?:"+before+symbol+after+")?";
			}
			return before+symbol+after;
		});
	}

//TODO: substitute localized sign/percent/permille/etc.?

	// normalize whitespace and return
	return {regexp: re.replace(/[\xa0 ]/g, "[\\s\\xa0]"), group: group, decimal: decimal, factor: factor}; // Object
};

/*=====
number.__ParseOptions = declare(null, {
	// pattern: String?
	//		override [formatting pattern](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
	//		with this string.  Default value is based on locale.  Overriding this property will defeat
	//		localization.  Literal characters in patterns are not supported.
	// type: String?
	//		choose a format type based on the locale from the following:
	//		decimal, scientific (not yet supported), percent, currency. decimal by default.
	// locale: String?
	//		override the locale used to determine formatting rules
	// strict: Boolean?
	//		strict parsing, false by default.  Strict parsing requires input as produced by the format() method.
	//		Non-strict is more permissive, e.g. flexible on white space, omitting thousands separators
	// fractional: Boolean|Array?
	//		Whether to include the fractional portion, where the number of decimal places are implied by pattern
	//		or explicit 'places' parameter.  The value [true,false] makes the fractional portion optional.
});
=====*/
number.parse = function(/*String*/ expression, /*number.__ParseOptions?*/ options){
	// summary:
	//		Convert a properly formatted string to a primitive Number, using
	//		locale-specific settings.
	// description:
	//		Create a Number from a string using a known localized pattern.
	//		Formatting patterns are chosen appropriate to the locale
	//		and follow the syntax described by
	//		[unicode.org TR35](http://www.unicode.org/reports/tr35/#Number_Format_Patterns)
    	//		Note that literal characters in patterns are not supported.
	// expression:
	//		A string representation of a Number
	var info = number._parseInfo(options),
		results = (new RegExp("^"+info.regexp+"$")).exec(expression);
	if(!results){
		return NaN; //NaN
	}
	var absoluteMatch = results[1]; // match for the positive expression
	if(!results[1]){
		if(!results[2]){
			return NaN; //NaN
		}
		// matched the negative pattern
		absoluteMatch =results[2];
		info.factor *= -1;
	}

	// Transform it to something Javascript can parse as a number.  Normalize
	// decimal point and strip out group separators or alternate forms of whitespace
	absoluteMatch = absoluteMatch.
		replace(new RegExp("["+info.group + "\\s\\xa0"+"]", "g"), "").
		replace(info.decimal, ".");
	// Adjust for negative sign, percent, etc. as necessary
	return absoluteMatch * info.factor; //Number
};

/*=====
number.__RealNumberRegexpFlags = declare(null, {
	// places: Number?
	//		The integer number of decimal places or a range given as "n,m".  If
	//		not given, the decimal part is optional and the number of places is
	//		unlimited.
	// decimal: String?
	//		A string for the character used as the decimal point.  Default
	//		is ".".
	// fractional: Boolean|Array?
	//		Whether decimal places are used.  Can be true, false, or [true,
	//		false].  Default is [true, false] which means optional.
	// exponent: Boolean|Array?
	//		Express in exponential notation.  Can be true, false, or [true,
	//		false]. Default is [true, false], (i.e. will match if the
	//		exponential part is present are not).
	// eSigned: Boolean|Array?
	//		The leading plus-or-minus sign on the exponent.  Can be true,
	//		false, or [true, false].  Default is [true, false], (i.e. will
	//		match if it is signed or unsigned).  flags in regexp.integer can be
	//		applied.
});
=====*/

number._realNumberRegexp = function(/*__RealNumberRegexpFlags?*/ flags){
	// summary:
	//		Builds a regular expression to match a real number in exponential
	//		notation

	// assign default values to missing parameters
	flags = flags || {};
	//TODO: use mixin instead?
	if(!("places" in flags)){ flags.places = Infinity; }
	if(typeof flags.decimal != "string"){ flags.decimal = "."; }
	if(!("fractional" in flags) || /^0/.test(flags.places)){ flags.fractional = [true, false]; }
	if(!("exponent" in flags)){ flags.exponent = [true, false]; }
	if(!("eSigned" in flags)){ flags.eSigned = [true, false]; }

	var integerRE = number._integerRegexp(flags),
		decimalRE = dregexp.buildGroupRE(flags.fractional,
		function(q){
			var re = "";
			if(q && (flags.places!==0)){
				re = "\\" + flags.decimal;
				if(flags.places == Infinity){
					re = "(?:" + re + "\\d+)?";
				}else{
					re += "\\d{" + flags.places + "}";
				}
			}
			return re;
		},
		true
	);

	var exponentRE = dregexp.buildGroupRE(flags.exponent,
		function(q){
			if(q){ return "([eE]" + number._integerRegexp({ signed: flags.eSigned}) + ")"; }
			return "";
		}
	);

	var realRE = integerRE + decimalRE;
	// allow for decimals without integers, e.g. .25
	if(decimalRE){realRE = "(?:(?:"+ realRE + ")|(?:" + decimalRE + "))";}
	return realRE + exponentRE; // String
};

/*=====
number.__IntegerRegexpFlags = declare(null, {
	// signed: Boolean?
	//		The leading plus-or-minus sign. Can be true, false, or `[true,false]`.
	//		Default is `[true, false]`, (i.e. will match if it is signed
	//		or unsigned).
	// separator: String?
	//		The character used as the thousands separator. Default is no
	//		separator. For more than one symbol use an array, e.g. `[",", ""]`,
	//		makes ',' optional.
	// groupSize: Number?
	//		group size between separators
	// groupSize2: Number?
	//		second grouping, where separators 2..n have a different interval than the first separator (for India)
});
=====*/

number._integerRegexp = function(/*number.__IntegerRegexpFlags?*/ flags){
	// summary:
	//		Builds a regular expression that matches an integer

	// assign default values to missing parameters
	flags = flags || {};
	if(!("signed" in flags)){ flags.signed = [true, false]; }
	if(!("separator" in flags)){
		flags.separator = "";
	}else if(!("groupSize" in flags)){
		flags.groupSize = 3;
	}

	var signRE = dregexp.buildGroupRE(flags.signed,
		function(q){ return q ? "[-+]" : ""; },
		true
	);

	var numberRE = dregexp.buildGroupRE(flags.separator,
		function(sep){
			if(!sep){
				return "(?:\\d+)";
			}

			sep = dregexp.escapeString(sep);
			if(sep == " "){ sep = "\\s"; }
			else if(sep == "\xa0"){ sep = "\\s\\xa0"; }

			var grp = flags.groupSize, grp2 = flags.groupSize2;
			//TODO: should we continue to enforce that numbers with separators begin with 1-9?  See #6933
			if(grp2){
				var grp2RE = "(?:0|[1-9]\\d{0," + (grp2-1) + "}(?:[" + sep + "]\\d{" + grp2 + "})*[" + sep + "]\\d{" + grp + "})";
				return ((grp-grp2) > 0) ? "(?:" + grp2RE + "|(?:0|[1-9]\\d{0," + (grp-1) + "}))" : grp2RE;
			}
			return "(?:0|[1-9]\\d{0," + (grp-1) + "}(?:[" + sep + "]\\d{" + grp + "})*)";
		},
		true
	);

	return signRE + numberRE; // String
};

return number;
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
				},
				split = id.split("*"),
				preloadDemand = split[1] == "preload";

			if(has("dojo-preload-i18n-Api")){
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
				if(preloadDemand || (waitForPreloads(id, require, load) && !cache[loadTarget])){
					return;
				}
			}
			else if (preloadDemand) {
				// If a build is created with nls resources and 'dojo-preload-i18n-Api' has not been set to false,
				// the built file will include a preload in the cache (which looks about like so:)
				// '*now':function(r){r(['dojo/i18n!*preload*dojo/nls/dojo*["ar","ca","cs","da","de","el","en-gb","en-us","es-es","fi-fi","fr-fr","he-il","hu","it-it","ja-jp","ko-kr","nl-nl","nb","pl","pt-br","pt-pt","ru","sk","sl","sv","th","tr","zh-tw","zh-cn","ROOT"]']);}
				// If the consumer of the build sets 'dojo-preload-i18n-Api' to false in the Dojo config, the cached
				// preload will not be parsed and will result in an attempt to call 'require' passing it the unparsed
				// preload, which is not a valid module id.
				// In this case we should skip this request.
				load(1);

				return;
			}

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
										if(!bundle._localized){continue;}

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
														// requiredBundles was constructed by forEachLocale so it contains locales from
														// less specific to most specific.
														// the loop starts with the most specific locale, the last one.
														for(var i = requiredBundles.length - 1; i >= 0 ; i--){
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
			l10nCache = {},
			evalBundle,

			syncRequire = function(deps, callback, require){
				var results = [];
				array.forEach(deps, function(mid){
					var url = require.toUrl(mid + ".js");

					function load(text){
						if (!evalBundle) {
							// use the function ctor to keep the minifiers away (also come close to global scope, but this is secondary)
							evalBundle = new Function(
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
							);
						}
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
						// need to check for legacy module here because there might be a legacy module for a
						// less specific locale (which was not looked up during the first checkForLegacyModules
						// call in load()).
						// Also need to reverse the locale and the module name in the mid because syncRequire
						// deps parameters uses the AMD style package/nls/locale/module while legacy code uses
						// package/nls/module/locale.
						if(!bundle){
							bundle = checkForLegacyModules(mid.replace(/nls\/([^\/]*)\/([^\/]*)$/, "nls/$2/$1"));
						}
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

			if (l10nCache[l10nName]) {
				return l10nCache[l10nName];
			}

			load(
				l10nName,

				// isXd() and syncRequire() need a context-require in order to resolve the mid with respect to a reference module.
				// Since this legacy function does not have the concept of a reference module, resolve with respect to this
				// dojo/i18n module, which, itself may have been mapped.
				(!isXd(l10nName, require) ? function(deps, callback){ syncRequire(deps, callback, require); } : require),

				function(result_){
					l10nCache[l10nName] = result_;
					result = result_;
				}
			);
			return result;
		};
	}
	else {
		thisModule.getLocalization = function(moduleName, bundleName, locale){
			var key = moduleName.replace(/\./g, '/') + '/nls/' + bundleName + '/' + (locale || config.locale);
			return this.cache[key];
		};
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
'dojox/validate/regexp':function(){
define(["dojo/_base/lang", "dojo/regexp", "dojox/main"], 
  function(lang, regexp, dojox){

var dxregexp = lang.getObject("validate.regexp", true, dojox);
dxregexp = dojox.validate.regexp = {
	
	ipAddress: function(flags){
		// summary:
		//		Builds a RE that matches an IP Address
		// description:
		//		Supports 5 formats for IPv4: dotted decimal, dotted hex, dotted octal, decimal and hexadecimal.
		//		Supports 2 formats for Ipv6.
		// flags: Object?
		//		All flags are boolean with default = true.
		//
		//		- flags.allowDottedDecimal  Example, 207.142.131.235.  No zero padding.
		//		- flags.allowDottedHex  Example, 0x18.0x11.0x9b.0x28.  Case insensitive.  Zero padding allowed.
		//		- flags.allowDottedOctal  Example, 0030.0021.0233.0050.  Zero padding allowed.
		//		- flags.allowDecimal  Example, 3482223595.  A decimal number between 0-4294967295.
		//		- flags.allowHex  Example, 0xCF8E83EB.  Hexadecimal number between 0x0-0xFFFFFFFF.
		//		  Case insensitive.  Zero padding allowed.
		//		- flags.allowIPv6   IPv6 address written as eight groups of four hexadecimal digits.
		
		//	FIXME: ipv6 can be written multiple ways IIRC
		//		- flags.allowHybrid   IPv6 address written as six groups of four hexadecimal digits
		//		-   followed by the usual 4 dotted decimal digit notation of IPv4. x:x:x:x:x:x:d.d.d.d

		// assign default values to missing parameters
		flags = (typeof flags == "object") ? flags : {};
		if(typeof flags.allowDottedDecimal != "boolean"){ flags.allowDottedDecimal = true; }
		if(typeof flags.allowDottedHex != "boolean"){ flags.allowDottedHex = true; }
		if(typeof flags.allowDottedOctal != "boolean"){ flags.allowDottedOctal = true; }
		if(typeof flags.allowDecimal != "boolean"){ flags.allowDecimal = true; }
		if(typeof flags.allowHex != "boolean"){ flags.allowHex = true; }
		if(typeof flags.allowIPv6 != "boolean"){ flags.allowIPv6 = true; }
		if(typeof flags.allowHybrid != "boolean"){ flags.allowHybrid = true; }

		// decimal-dotted IP address RE.
		var dottedDecimalRE =
			// Each number is between 0-255.  Zero padding is not allowed.
			"((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])";

		// dotted hex IP address RE.  Each number is between 0x0-0xff.  Zero padding is allowed, e.g. 0x00.
		var dottedHexRE = "(0[xX]0*[\\da-fA-F]?[\\da-fA-F]\\.){3}0[xX]0*[\\da-fA-F]?[\\da-fA-F]";

		// dotted octal IP address RE.  Each number is between 0000-0377.
		// Zero padding is allowed, but each number must have at least 4 characters.
		var dottedOctalRE = "(0+[0-3][0-7][0-7]\\.){3}0+[0-3][0-7][0-7]";

		// decimal IP address RE.  A decimal number between 0-4294967295.
		var decimalRE =  "(0|[1-9]\\d{0,8}|[1-3]\\d{9}|4[01]\\d{8}|42[0-8]\\d{7}|429[0-3]\\d{6}|" +
			"4294[0-8]\\d{5}|42949[0-5]\\d{4}|429496[0-6]\\d{3}|4294967[01]\\d{2}|42949672[0-8]\\d|429496729[0-5])";

		// hexadecimal IP address RE.
		// A hexadecimal number between 0x0-0xFFFFFFFF. Case insensitive.  Zero padding is allowed.
		var hexRE = "0[xX]0*[\\da-fA-F]{1,8}";

		// IPv6 address RE.
		// The format is written as eight groups of four hexadecimal digits, x:x:x:x:x:x:x:x,
		// where x is between 0000-ffff. Zero padding is optional. Case insensitive.
		var ipv6RE = "([\\da-fA-F]{1,4}\\:){7}[\\da-fA-F]{1,4}";

		// IPv6/IPv4 Hybrid address RE.
		// The format is written as six groups of four hexadecimal digits,
		// followed by the 4 dotted decimal IPv4 format. x:x:x:x:x:x:d.d.d.d
		var hybridRE = "([\\da-fA-F]{1,4}\\:){6}" +
			"((\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])\\.){3}(\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])";

		// Build IP Address RE
		var a = [];
		if(flags.allowDottedDecimal){ a.push(dottedDecimalRE); }
		if(flags.allowDottedHex){ a.push(dottedHexRE); }
		if(flags.allowDottedOctal){ a.push(dottedOctalRE); }
		if(flags.allowDecimal){ a.push(decimalRE); }
		if(flags.allowHex){ a.push(hexRE); }
		if(flags.allowIPv6){ a.push(ipv6RE); }
		if(flags.allowHybrid){ a.push(hybridRE); }

		var ipAddressRE = "";
		if(a.length > 0){
			ipAddressRE = "(" + a.join("|") + ")";
		}
		return ipAddressRE; // String
	},

	host: function(flags){
		// summary:
		//		Builds a RE that matches a host
		// description:
		//		A host is a named host (A-z0-9_- but not starting with -), a domain name or an IP address, possibly followed by a port number.
		// flags: Object?
		//		- flags.allowNamed Allow a named host for local networks. Default is false.
		//		- flags.allowIP  Allow an IP address for hostname.  Default is true.
		//		- flags.allowLocal  Allow the host to be "localhost".  Default is false.
		//		- flags.allowPort  Allow a port number to be present.  Default is true.
		//		- flags in regexp.ipAddress can be applied.

		// assign default values to missing parameters
		flags = (typeof flags == "object") ? flags : {};

		if(typeof flags.allowIP != "boolean"){ flags.allowIP = true; }
		if(typeof flags.allowLocal != "boolean"){ flags.allowLocal = false; }
		if(typeof flags.allowPort != "boolean"){ flags.allowPort = true; }
		if(typeof flags.allowNamed != "boolean"){ flags.allowNamed = false; }

		//TODO: support unicode hostnames?
		// Domain name labels can not end with a dash.
		var domainLabelRE = "(?:[\\da-zA-Z](?:[-\\da-zA-Z]{0,61}[\\da-zA-Z])?)";
		var domainNameRE = "(?:[a-zA-Z](?:[-\\da-zA-Z]{0,61}[\\da-zA-Z])?)"; // restricted version to allow backwards compatibility with allowLocal, allowIP

		// port number RE
		var portRE = flags.allowPort ? "(\\:\\d+)?" : "";

		// build host RE
		var hostNameRE = "((?:" + domainLabelRE + "\\.)+" + domainNameRE + "\\.?)";
		if(flags.allowIP){ hostNameRE += "|" +  dxregexp.ipAddress(flags); }
		if(flags.allowLocal){ hostNameRE += "|localhost"; }
		if(flags.allowNamed){ hostNameRE += "|^[^-][a-zA-Z0-9_-]*"; }
		return "(" + hostNameRE + ")" + portRE; // String

	},

	url: function(flags){
		// summary:
		//		Builds a regular expression that matches a URL
		// flags: Object?
		//		- flags.scheme  Can be true, false, or [true, false].
		//		-   This means: required, not allowed, or match either one.
		//		- flags in regexp.host can be applied.
		//		- flags in regexp.ipAddress can be applied.

		// assign default values to missing parameters
		flags = (typeof flags == "object") ? flags : {};
		if(!("scheme" in flags)){ flags.scheme = [true, false]; }

		// Scheme RE
		var protocolRE = regexp.buildGroupRE(flags.scheme,
			function(q){ if(q){ return "(https?|ftps?)\\://"; } return ""; }
		);

		// Path and query and anchor RE
		var pathRE = "(/(?:[^?#\\s/]+/)*(?:[^?#\\s/]+(?:\\?[^?#\\s/]*)?(?:#[A-Za-z][\\w.:-]*)?)?)?";

		return protocolRE + dxregexp.host(flags) + pathRE;
	},

	emailAddress: function(flags){
		// summary:
		//		Builds a regular expression that matches an email address
		// flags: Object?
		//		- flags.allowCruft  Allow address like `<mailto:foo@yahoo.com>`.  Default is false.
		//		- flags in regexp.host can be applied.
		//		- flags in regexp.ipAddress can be applied.

		// assign default values to missing parameters
		flags = (typeof flags == "object") ? flags : {};
		if (typeof flags.allowCruft != "boolean") { flags.allowCruft = false; }
		flags.allowPort = false; // invalid in email addresses

		// user name RE per rfc5322
		var usernameRE = "([!#-'*+\\-\\/-9=?A-Z^-~]+[.])*[!#-'*+\\-\\/-9=?A-Z^-~]+";

		// build emailAddress RE
		var emailAddressRE = usernameRE + "@" + dxregexp.host(flags);

		// Allow email addresses with cruft
		if ( flags.allowCruft ) {
			emailAddressRE = "<?(mailto\\:)?" + emailAddressRE + ">?";
		}

		return emailAddressRE; // String
	},

	emailAddressList: function(flags){
		// summary:
		//		Builds a regular expression that matches a list of email addresses.
		// flags: Object?
		//		- flags.listSeparator  The character used to separate email addresses.  Default is ";", ",", "\n" or " ".
		//		- flags in regexp.emailAddress can be applied.
		//		- flags in regexp.host can be applied.
		//		- flags in regexp.ipAddress can be applied.

		// assign default values to missing parameters
		flags = (typeof flags == "object") ? flags : {};
		if(typeof flags.listSeparator != "string"){ flags.listSeparator = "\\s;,"; }

		// build a RE for an Email Address List
		var emailAddressRE = dxregexp.emailAddress(flags);
		var emailAddressListRE = "(" + emailAddressRE + "\\s*[" + flags.listSeparator + "]\\s*)*" +
			emailAddressRE + "\\s*[" + flags.listSeparator + "]?\\s*";

		return emailAddressListRE; // String
	},
	
	numberFormat: function(flags){
		// summary:
		//		Builds a regular expression to match any sort of number based format
		// description:
		//		Use this method for phone numbers, social security numbers, zip-codes, etc.
		//		The RE can match one format or one of multiple formats.
		//
		//		Format:
		//
		//		- #        Stands for a digit, 0-9.
		//		- ?        Stands for an optional digit, 0-9 or nothing.
		//		- All other characters must appear literally in the expression.
		//
		// example:
		//		- "(###) ###-####"		-    ->   (510) 542-9742
		//		- "(###) ###-#### x#???" ->   (510) 542-9742 x153
		//		- "###-##-####"		- 		-   ->   506-82-1089		-    i.e. social security number
		//		- "#####-####"		- 		-    ->   98225-1649		- 		- i.e. zip code
		//
		// flags:  Object?
		//		- flags.format  A string or an Array of strings for multiple formats.

		// assign default values to missing parameters
		flags = (typeof flags == "object") ? flags : {};
		if(typeof flags.format == "undefined"){ flags.format = "###-###-####"; }

		// Converts a number format to RE.
		var digitRE = function(format){
			// escape all special characters, except '?'
			return regexp.escapeString(format, "?")
				// Now replace '?' with Regular Expression
				.replace(/\?/g, "\\d?")
				// replace # with Regular Expression
				.replace(/#/g, "\\d")
			;
		};

		// build RE for multiple number formats
		return regexp.buildGroupRE(flags.format, digitRE); //String
	},
	
	ca: {

		postalCode: function(){
			// summary:
			//		String regular Express to match Canadain Postal Codes
			return "([A-Z][0-9][A-Z] [0-9][A-Z][0-9])";
		},

		province: function(){
			// summary:
			//		a regular expression to match Canadian Province Abbreviations
			return "(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)";
		}

	},
	
	us:{
		state: function(flags){
			// summary:
			//		A regular expression to match US state and territory abbreviations
			// flags: Object?
			//		- flags.allowTerritories  Allow Guam, Puerto Rico, etc.  Default is true.
			//		- flags.allowMilitary  Allow military 'states', e.g. Armed Forces Europe (AE).  Default is true.

			// assign default values to missing parameters
			flags = (typeof flags == "object") ? flags : {};
			if(typeof flags.allowTerritories != "boolean"){ flags.allowTerritories = true; }
			if(typeof flags.allowMilitary != "boolean"){ flags.allowMilitary = true; }

			// state RE
			var statesRE =
				"AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|" +
				"NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY";

			// territories RE
			var territoriesRE = "AS|FM|GU|MH|MP|PW|PR|VI";

			// military states RE
			var militaryRE = "AA|AE|AP";

			// Build states and territories RE
			if(flags.allowTerritories){ statesRE += "|" + territoriesRE; }
			if(flags.allowMilitary){ statesRE += "|" + militaryRE; }

			return "(" + statesRE + ")"; // String
		}

	}
	
};

return dxregexp;

});

},
'dojox/main':function(){
define(["dojo/_base/kernel"], function(dojo) {
	// module:
	//		dojox/main

	/*=====
	return {
		// summary:
		//		The dojox package main module; dojox package is somewhat unusual in that the main module currently just provides an empty object.
		//		Apps should require modules from the dojox packages directly, rather than loading this module.
	};
	=====*/

	return dojo.dojox;
});
},
'dijit/form/DropDownButton':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/_base/kernel",
	"dojo/_base/lang", // hitch
	"dojo/query", // query
	"../registry", // registry.byNode
	"../popup", // dijit.popup2.hide
	"./Button",
	"../_Container",
	"../_HasDropDown",
	"dojo/text!./templates/DropDownButton.html",
	"../a11yclick"	// template uses ondijitclick
], function(declare, kernel, lang, query, registry, popup, Button, _Container, _HasDropDown, template){

	// module:
	//		dijit/form/DropDownButton

	return declare("dijit.form.DropDownButton", [Button, _Container, _HasDropDown], {
		// summary:
		//		A button with a drop down
		//
		// example:
		// |	<button data-dojo-type="dijit/form/DropDownButton">
		// |		Hello world
		// |		<div data-dojo-type="dijit/Menu">...</div>
		// |	</button>
		//
		// example:
		// |	var button1 = new DropDownButton({ label: "hi", dropDown: new dijit.Menu(...) });
		// |	win.body().appendChild(button1);
		//

		baseClass: "dijitDropDownButton",

		templateString: template,

		_fillContent: function(){
			// Overrides _TemplatedMixin#_fillContent().
			// My inner HTML possibly contains both the button label and/or a drop down widget, like
			// <DropDownButton>  <span>push me</span>  <Menu> ... </Menu> </DropDownButton>

			var source = this.srcNodeRef;
			var dest = this.containerNode;
			if(source && dest){
				while(source.hasChildNodes()){
					var child = source.firstChild;
					if(child.hasAttribute && (child.hasAttribute("data-dojo-type") || child.hasAttribute("dojoType") ||
							child.hasAttribute("data-" + kernel._scopeName + "-type") ||
							child.hasAttribute(kernel._scopeName + "Type"))){
						// The parser hasn't gotten to this node yet, so save it in a wrapper <div>
						// and then grab the instantiated widget in startup().
						this.dropDownContainer = this.ownerDocument.createElement("div");
						this.dropDownContainer.appendChild(child);
					}else{
						dest.appendChild(child);
					}
				}
			}
		},

		startup: function(){
			if(this._started){
				return;
			}

			// the child widget from srcNodeRef is the dropdown widget.  Insert it in the page DOM,
			// make it invisible, and store a reference to pass to the popup code.
			if(!this.dropDown && this.dropDownContainer){
				this.dropDown = registry.byNode(this.dropDownContainer.firstChild);
				delete this.dropDownContainer;
			}
			if(this.dropDown){
				popup.hide(this.dropDown);
			}

			this.inherited(arguments);
		},

		isLoaded: function(){
			// Returns whether or not we are loaded - if our dropdown has an href,
			// then we want to check that.
			var dropDown = this.dropDown;
			return (!!dropDown && (!dropDown.href || dropDown.isLoaded));
		},

		loadDropDown: function(/*Function*/ callback){
			// Default implementation assumes that drop down already exists,
			// but hasn't loaded it's data (ex: ContentPane w/href).
			// App must override if the drop down is lazy-created.
			var dropDown = this.dropDown;
			var handler = dropDown.on("load", lang.hitch(this, function(){
				handler.remove();
				callback();
			}));
			dropDown.refresh();		// tell it to load
		},

		isFocusable: function(){
			// Overridden so that focus is handled by the _HasDropDown mixin, not by
			// the _FormWidget mixin.
			return this.inherited(arguments) && !this._mouseDown;
		}
	});
});

},
'dijit/popup':function(){
define([
	"dojo/_base/array", // array.forEach array.some
	"dojo/aspect",
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.isDescendant
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-construct", // domConstruct.create domConstruct.destroy
	"dojo/dom-geometry", // domGeometry.isBodyLtr
	"dojo/dom-style", // domStyle.set
	"dojo/has", // has("config-bgIframe")
	"dojo/keys",
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"./place",
	"./BackgroundIframe",
	"./Viewport",
	"./main",    // dijit (defining dijit.popup to match API doc)
	"dojo/touch"		// use of dojoClick
], function(array, aspect, declare, dom, domAttr, domConstruct, domGeometry, domStyle, has, keys, lang, on,
			place, BackgroundIframe, Viewport, dijit){

	// module:
	//		dijit/popup

	/*=====
	 var __OpenArgs = {
		 // popup: Widget
		 //		widget to display
		 // parent: Widget
		 //		the button etc. that is displaying this popup
		 // around: DomNode
		 //		DOM node (typically a button); place popup relative to this node.  (Specify this *or* "x" and "y" parameters.)
		 // x: Integer
		 //		Absolute horizontal position (in pixels) to place node at.  (Specify this *or* "around" parameter.)
		 // y: Integer
		 //		Absolute vertical position (in pixels) to place node at.  (Specify this *or* "around" parameter.)
		 // orient: Object|String
		 //		When the around parameter is specified, orient should be a list of positions to try, ex:
		 //	|	[ "below", "above" ]
		 //		For backwards compatibility it can also be an (ordered) hash of tuples of the form
		 //		(around-node-corner, popup-node-corner), ex:
		 //	|	{ "BL": "TL", "TL": "BL" }
		 //		where BL means "bottom left" and "TL" means "top left", etc.
		 //
		 //		dijit/popup.open() tries to position the popup according to each specified position, in order,
		 //		until the popup appears fully within the viewport.
		 //
		 //		The default value is ["below", "above"]
		 //
		 //		When an (x,y) position is specified rather than an around node, orient is either
		 //		"R" or "L".  R (for right) means that it tries to put the popup to the right of the mouse,
		 //		specifically positioning the popup's top-right corner at the mouse position, and if that doesn't
		 //		fit in the viewport, then it tries, in order, the bottom-right corner, the top left corner,
		 //		and the top-right corner.
		 // onCancel: Function
		 //		callback when user has canceled the popup by:
		 //
		 //		1. hitting ESC or
		 //		2. by using the popup widget's proprietary cancel mechanism (like a cancel button in a dialog);
		 //		   i.e. whenever popupWidget.onCancel() is called, args.onCancel is called
		 // onClose: Function
		 //		callback whenever this popup is closed
		 // onExecute: Function
		 //		callback when user "executed" on the popup/sub-popup by selecting a menu choice, etc. (top menu only)
		 // padding: place.__Position
		 //		adding a buffer around the opening position. This is only useful when around is not set.
		 // maxHeight: Integer
		 //		The max height for the popup.  Any popup taller than this will have scrollbars.
		 //		Set to Infinity for no max height.  Default is to limit height to available space in viewport,
		 //		above or below the aroundNode or specified x/y position.
	 };
	 =====*/

	function destroyWrapper(){
		// summary:
		//		Function to destroy wrapper when popup widget is destroyed.
		//		Left in this scope to avoid memory leak on IE8 on refresh page, see #15206.
		if(this._popupWrapper){
			domConstruct.destroy(this._popupWrapper);
			delete this._popupWrapper;
		}
	}

	var PopupManager = declare(null, {
		// summary:
		//		Used to show drop downs (ex: the select list of a ComboBox)
		//		or popups (ex: right-click context menus).

		// _stack: dijit/_WidgetBase[]
		//		Stack of currently popped up widgets.
		//		(someone opened _stack[0], and then it opened _stack[1], etc.)
		_stack: [],

		// _beginZIndex: Number
		//		Z-index of the first popup.   (If first popup opens other
		//		popups they get a higher z-index.)
		_beginZIndex: 1000,

		_idGen: 1,

		_repositionAll: function(){
			// summary:
			//		If screen has been scrolled, reposition all the popups in the stack.
			//		Then set timer to check again later.

			if(this._firstAroundNode){	// guard for when clearTimeout() on IE doesn't work
				var oldPos = this._firstAroundPosition,
					newPos = domGeometry.position(this._firstAroundNode, true),
					dx = newPos.x - oldPos.x,
					dy = newPos.y - oldPos.y;

				if(dx || dy){
					this._firstAroundPosition = newPos;
					for(var i = 0; i < this._stack.length; i++){
						var style = this._stack[i].wrapper.style;
						style.top = (parseFloat(style.top) + dy) + "px";
						if(style.right == "auto"){
							style.left = (parseFloat(style.left) + dx) + "px";
						}else{
							style.right = (parseFloat(style.right) - dx) + "px";
						}
					}
				}

				this._aroundMoveListener = setTimeout(lang.hitch(this, "_repositionAll"), dx || dy ? 10 : 50);
			}
		},

		_createWrapper: function(/*Widget*/ widget){
			// summary:
			//		Initialization for widgets that will be used as popups.
			//		Puts widget inside a wrapper DIV (if not already in one),
			//		and returns pointer to that wrapper DIV.

			var wrapper = widget._popupWrapper,
				node = widget.domNode;

			if(!wrapper){
				// Create wrapper <div> for when this widget [in the future] will be used as a popup.
				// This is done early because of IE bugs where creating/moving DOM nodes causes focus
				// to go wonky, see tests/robot/Toolbar.html to reproduce
				wrapper = domConstruct.create("div", {
					"class": "dijitPopup",
					style: { display: "none"},
					role: "region",
					"aria-label": widget["aria-label"] || widget.label || widget.name || widget.id
				}, widget.ownerDocumentBody);
				wrapper.appendChild(node);

				var s = node.style;
				s.display = "";
				s.visibility = "";
				s.position = "";
				s.top = "0px";

				widget._popupWrapper = wrapper;
				aspect.after(widget, "destroy", destroyWrapper, true);

				// Workaround iOS problem where clicking a Menu can focus an <input> (or click a button) behind it.
				// Need to be careful though that you can still focus <input>'s and click <button>'s in a TooltipDialog.
				// Also, be careful not to break (native) scrolling of dropdown like ComboBox's options list.
				if("ontouchend" in document) {
					on(wrapper, "touchend", function (evt){
						if(!/^(input|button|textarea)$/i.test(evt.target.tagName)) {
							evt.preventDefault();
						}
					});
				}

				// Calling evt.preventDefault() suppresses the native click event on most browsers.  However, it doesn't
				// suppress the synthetic click event emitted by dojo/touch.  In order for clicks in popups to work
				// consistently, always use dojo/touch in popups.  See #18150.
				wrapper.dojoClick = true;
			}

			return wrapper;
		},

		moveOffScreen: function(/*Widget*/ widget){
			// summary:
			//		Moves the popup widget off-screen.
			//		Do not use this method to hide popups when not in use, because
			//		that will create an accessibility issue: the offscreen popup is
			//		still in the tabbing order.

			// Create wrapper if not already there
			var wrapper = this._createWrapper(widget);

			// Besides setting visibility:hidden, move it out of the viewport, see #5776, #10111, #13604
			var ltr = domGeometry.isBodyLtr(widget.ownerDocument),
				style = {
					visibility: "hidden",
					top: "-9999px",
					display: ""
				};
			style[ltr ? "left" : "right"] = "-9999px";
			style[ltr ? "right" : "left"] = "auto";
			domStyle.set(wrapper, style);

			return wrapper;
		},

		hide: function(/*Widget*/ widget){
			// summary:
			//		Hide this popup widget (until it is ready to be shown).
			//		Initialization for widgets that will be used as popups
			//
			//		Also puts widget inside a wrapper DIV (if not already in one)
			//
			//		If popup widget needs to layout it should
			//		do so when it is made visible, and popup._onShow() is called.

			// Create wrapper if not already there
			var wrapper = this._createWrapper(widget);

			domStyle.set(wrapper, {
				display: "none",
				height: "auto",			// Open() may have limited the height to fit in the viewport,
				overflowY: "visible",	// and set overflowY to "auto".
				border: ""				// Open() may have moved border from popup to wrapper.
			});

			// Open() may have moved border from popup to wrapper.  Move it back.
			var node = widget.domNode;
			if("_originalStyle" in node){
				node.style.cssText = node._originalStyle;
			}
		},

		getTopPopup: function(){
			// summary:
			//		Compute the closest ancestor popup that's *not* a child of another popup.
			//		Ex: For a TooltipDialog with a button that spawns a tree of menus, find the popup of the button.
			var stack = this._stack;
			for(var pi = stack.length - 1; pi > 0 && stack[pi].parent === stack[pi - 1].widget; pi--){
				/* do nothing, just trying to get right value for pi */
			}
			return stack[pi];
		},

		open: function(/*__OpenArgs*/ args){
			// summary:
			//		Popup the widget at the specified position
			//
			// example:
			//		opening at the mouse position
			//		|		popup.open({popup: menuWidget, x: evt.pageX, y: evt.pageY});
			//
			// example:
			//		opening the widget as a dropdown
			//		|		popup.open({parent: this, popup: menuWidget, around: this.domNode, onClose: function(){...}});
			//
			//		Note that whatever widget called dijit/popup.open() should also listen to its own _onBlur callback
			//		(fired from _base/focus.js) to know that focus has moved somewhere else and thus the popup should be closed.

			var stack = this._stack,
				widget = args.popup,
				node = widget.domNode,
				orient = args.orient || ["below", "below-alt", "above", "above-alt"],
				ltr = args.parent ? args.parent.isLeftToRight() : domGeometry.isBodyLtr(widget.ownerDocument),
				around = args.around,
				id = (args.around && args.around.id) ? (args.around.id + "_dropdown") : ("popup_" + this._idGen++);

			// If we are opening a new popup that isn't a child of a currently opened popup, then
			// close currently opened popup(s).   This should happen automatically when the old popups
			// gets the _onBlur() event, except that the _onBlur() event isn't reliable on IE, see [22198].
			while(stack.length && (!args.parent || !dom.isDescendant(args.parent.domNode, stack[stack.length - 1].widget.domNode))){
				this.close(stack[stack.length - 1].widget);
			}

			// Get pointer to popup wrapper, and create wrapper if it doesn't exist.  Remove display:none (but keep
			// off screen) so we can do sizing calculations.
			var wrapper = this.moveOffScreen(widget);

			if(widget.startup && !widget._started){
				widget.startup(); // this has to be done after being added to the DOM
			}

			// Limit height to space available in viewport either above or below aroundNode (whichever side has more
			// room), adding scrollbar if necessary. Can't add scrollbar to widget because it may be a <table> (ex:
			// dijit/Menu), so add to wrapper, and then move popup's border to wrapper so scroll bar inside border.
			var maxHeight, popupSize = domGeometry.position(node);
			if("maxHeight" in args && args.maxHeight != -1){
				maxHeight = args.maxHeight || Infinity;	// map 0 --> infinity for back-compat of _HasDropDown.maxHeight
			}else{
				var viewport = Viewport.getEffectiveBox(this.ownerDocument),
					aroundPos = around ? domGeometry.position(around, false) : {y: args.y - (args.padding||0), h: (args.padding||0) * 2};
				maxHeight = Math.floor(Math.max(aroundPos.y, viewport.h - (aroundPos.y + aroundPos.h)));
			}
			if(popupSize.h > maxHeight){
				// Get style of popup's border.  Unfortunately domStyle.get(node, "border") doesn't work on FF or IE,
				// and domStyle.get(node, "borderColor") etc. doesn't work on FF, so need to use fully qualified names.
				var cs = domStyle.getComputedStyle(node),
					borderStyle = cs.borderLeftWidth + " " + cs.borderLeftStyle + " " + cs.borderLeftColor;
				domStyle.set(wrapper, {
					overflowY: "scroll",
					height: maxHeight + "px",
					border: borderStyle	// so scrollbar is inside border
				});
				node._originalStyle = node.style.cssText;
				node.style.border = "none";
			}

			domAttr.set(wrapper, {
				id: id,
				style: {
					zIndex: this._beginZIndex + stack.length
				},
				"class": "dijitPopup " + (widget.baseClass || widget["class"] || "").split(" ")[0] + "Popup",
				dijitPopupParent: args.parent ? args.parent.id : ""
			});

			if(stack.length == 0 && around){
				// First element on stack. Save position of aroundNode and setup listener for changes to that position.
				this._firstAroundNode = around;
				this._firstAroundPosition = domGeometry.position(around, true);
				this._aroundMoveListener = setTimeout(lang.hitch(this, "_repositionAll"), 50);
			}

			if(has("config-bgIframe") && !widget.bgIframe){
				// setting widget.bgIframe triggers cleanup in _WidgetBase.destroyRendering()
				widget.bgIframe = new BackgroundIframe(wrapper);
			}

			// position the wrapper node and make it visible
			var layoutFunc = widget.orient ? lang.hitch(widget, "orient") : null,
				best = around ?
					place.around(wrapper, around, orient, ltr, layoutFunc) :
					place.at(wrapper, args, orient == 'R' ? ['TR', 'BR', 'TL', 'BL'] : ['TL', 'BL', 'TR', 'BR'], args.padding,
						layoutFunc);

			wrapper.style.visibility = "visible";
			node.style.visibility = "visible";	// counteract effects from _HasDropDown

			var handlers = [];

			// provide default escape and tab key handling
			// (this will work for any widget, not just menu)
			handlers.push(on(wrapper, "keydown", lang.hitch(this, function(evt){
				if(evt.keyCode == keys.ESCAPE && args.onCancel){
					evt.stopPropagation();
					evt.preventDefault();
					args.onCancel();
				}else if(evt.keyCode == keys.TAB){
					evt.stopPropagation();
					evt.preventDefault();
					var topPopup = this.getTopPopup();
					if(topPopup && topPopup.onCancel){
						topPopup.onCancel();
					}
				}
			})));

			// watch for cancel/execute events on the popup and notify the caller
			// (for a menu, "execute" means clicking an item)
			if(widget.onCancel && args.onCancel){
				handlers.push(widget.on("cancel", args.onCancel));
			}

			handlers.push(widget.on(widget.onExecute ? "execute" : "change", lang.hitch(this, function(){
				var topPopup = this.getTopPopup();
				if(topPopup && topPopup.onExecute){
					topPopup.onExecute();
				}
			})));

			stack.push({
				widget: widget,
				wrapper: wrapper,
				parent: args.parent,
				onExecute: args.onExecute,
				onCancel: args.onCancel,
				onClose: args.onClose,
				handlers: handlers
			});

			if(widget.onOpen){
				// TODO: in 2.0 standardize onShow() (used by StackContainer) and onOpen() (used here)
				widget.onOpen(best);
			}

			return best;
		},

		close: function(/*Widget?*/ popup){
			// summary:
			//		Close specified popup and any popups that it parented.
			//		If no popup is specified, closes all popups.

			var stack = this._stack;

			// Basically work backwards from the top of the stack closing popups
			// until we hit the specified popup, but IIRC there was some issue where closing
			// a popup would cause others to close too.  Thus if we are trying to close B in [A,B,C]
			// closing C might close B indirectly and then the while() condition will run where stack==[A]...
			// so the while condition is constructed defensively.
			while((popup && array.some(stack, function(elem){
				return elem.widget == popup;
			})) ||
				(!popup && stack.length)){
				var top = stack.pop(),
					widget = top.widget,
					onClose = top.onClose;

				if (widget.bgIframe) {
					// push the iframe back onto the stack.
					widget.bgIframe.destroy();
					delete widget.bgIframe;
				}

				if(widget.onClose){
					// TODO: in 2.0 standardize onHide() (used by StackContainer) and onClose() (used here).
					// Actually, StackContainer also calls onClose(), but to mean that the pane is being deleted
					// (i.e. that the TabContainer's tab's [x] icon was clicked)
					widget.onClose();
				}

				var h;
				while(h = top.handlers.pop()){
					h.remove();
				}

				// Hide the widget and it's wrapper unless it has already been destroyed in above onClose() etc.
				if(widget && widget.domNode){
					this.hide(widget);
				}

				if(onClose){
					onClose();
				}
			}

			if(stack.length == 0 && this._aroundMoveListener){
				clearTimeout(this._aroundMoveListener);
				this._firstAroundNode = this._firstAroundPosition = this._aroundMoveListener = null;
			}
		}
	});

	return (dijit.popup = new PopupManager());
});

},
'dijit/place':function(){
define([
	"dojo/_base/array", // array.forEach array.map array.some
	"dojo/dom-geometry", // domGeometry.position
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/window", // win.body
	"./Viewport", // getEffectiveBox
	"./main"	// dijit (defining dijit.place to match API doc)
], function(array, domGeometry, domStyle, kernel, win, Viewport, dijit){

	// module:
	//		dijit/place


	function _place(/*DomNode*/ node, choices, layoutNode, aroundNodeCoords){
		// summary:
		//		Given a list of spots to put node, put it at the first spot where it fits,
		//		of if it doesn't fit anywhere then the place with the least overflow
		// choices: Array
		//		Array of elements like: {corner: 'TL', pos: {x: 10, y: 20} }
		//		Above example says to put the top-left corner of the node at (10,20)
		// layoutNode: Function(node, aroundNodeCorner, nodeCorner, size)
		//		for things like tooltip, they are displayed differently (and have different dimensions)
		//		based on their orientation relative to the parent.	 This adjusts the popup based on orientation.
		//		It also passes in the available size for the popup, which is useful for tooltips to
		//		tell them that their width is limited to a certain amount.	 layoutNode() may return a value expressing
		//		how much the popup had to be modified to fit into the available space.	 This is used to determine
		//		what the best placement is.
		// aroundNodeCoords: Object
		//		Size of aroundNode, ex: {w: 200, h: 50}

		// get {x: 10, y: 10, w: 100, h:100} type obj representing position of
		// viewport over document
		var view = Viewport.getEffectiveBox(node.ownerDocument);

		// This won't work if the node is inside a <div style="position: relative">,
		// so reattach it to <body>.	 (Otherwise, the positioning will be wrong
		// and also it might get cutoff.)
		if(!node.parentNode || String(node.parentNode.tagName).toLowerCase() != "body"){
			win.body(node.ownerDocument).appendChild(node);
		}

		var best = null;
		array.some(choices, function(choice){
			var corner = choice.corner;
			var pos = choice.pos;
			var overflow = 0;

			// calculate amount of space available given specified position of node
			var spaceAvailable = {
				w: {
					'L': view.l + view.w - pos.x,
					'R': pos.x - view.l,
					'M': view.w
				}[corner.charAt(1)],
				h: {
					'T': view.t + view.h - pos.y,
					'B': pos.y - view.t,
					'M': view.h
				}[corner.charAt(0)]
			};

			// Clear left/right position settings set earlier so they don't interfere with calculations,
			// specifically when layoutNode() (a.k.a. Tooltip.orient()) measures natural width of Tooltip
			var s = node.style;
			s.left = s.right = "auto";

			// configure node to be displayed in given position relative to button
			// (need to do this in order to get an accurate size for the node, because
			// a tooltip's size changes based on position, due to triangle)
			if(layoutNode){
				var res = layoutNode(node, choice.aroundCorner, corner, spaceAvailable, aroundNodeCoords);
				overflow = typeof res == "undefined" ? 0 : res;
			}

			// get node's size
			var style = node.style;
			var oldDisplay = style.display;
			var oldVis = style.visibility;
			if(style.display == "none"){
				style.visibility = "hidden";
				style.display = "";
			}
			var bb = domGeometry.position(node);
			style.display = oldDisplay;
			style.visibility = oldVis;

			// coordinates and size of node with specified corner placed at pos,
			// and clipped by viewport
			var
				startXpos = {
					'L': pos.x,
					'R': pos.x - bb.w,
					'M': Math.max(view.l, Math.min(view.l + view.w, pos.x + (bb.w >> 1)) - bb.w) // M orientation is more flexible
				}[corner.charAt(1)],
				startYpos = {
					'T': pos.y,
					'B': pos.y - bb.h,
					'M': Math.max(view.t, Math.min(view.t + view.h, pos.y + (bb.h >> 1)) - bb.h)
				}[corner.charAt(0)],
				startX = Math.max(view.l, startXpos),
				startY = Math.max(view.t, startYpos),
				endX = Math.min(view.l + view.w, startXpos + bb.w),
				endY = Math.min(view.t + view.h, startYpos + bb.h),
				width = endX - startX,
				height = endY - startY;

			overflow += (bb.w - width) + (bb.h - height);

			if(best == null || overflow < best.overflow){
				best = {
					corner: corner,
					aroundCorner: choice.aroundCorner,
					x: startX,
					y: startY,
					w: width,
					h: height,
					overflow: overflow,
					spaceAvailable: spaceAvailable
				};
			}

			return !overflow;
		});

		// In case the best position is not the last one we checked, need to call
		// layoutNode() again.
		if(best.overflow && layoutNode){
			layoutNode(node, best.aroundCorner, best.corner, best.spaceAvailable, aroundNodeCoords);
		}

		// And then position the node.  Do this last, after the layoutNode() above
		// has sized the node, due to browser quirks when the viewport is scrolled
		// (specifically that a Tooltip will shrink to fit as though the window was
		// scrolled to the left).

		var top = best.y,
			side = best.x,
			body = win.body(node.ownerDocument);

		if(/relative|absolute/.test(domStyle.get(body, "position"))){
			// compensate for margin on <body>, see #16148
			top -= domStyle.get(body, "marginTop");
			side -= domStyle.get(body, "marginLeft");
		}

		var s = node.style;
		s.top = top + "px";
		s.left = side + "px";
		s.right = "auto";	// needed for FF or else tooltip goes to far left

		return best;
	}

	var reverse = {
		// Map from corner to kitty-corner
		"TL": "BR",
		"TR": "BL",
		"BL": "TR",
		"BR": "TL"
	};

	var place = {
		// summary:
		//		Code to place a DOMNode relative to another DOMNode.
		//		Load using require(["dijit/place"], function(place){ ... }).

		at: function(node, pos, corners, padding, layoutNode){
			// summary:
			//		Positions node kitty-corner to the rectangle centered at (pos.x, pos.y) with width and height of
			//		padding.x * 2 and padding.y * 2, or zero if padding not specified.  Picks first corner in corners[]
			//		where node is fully visible, or the corner where it's most visible.
			//
			//		Node is assumed to be absolutely or relatively positioned.
			// node: DOMNode
			//		The node to position
			// pos: dijit/place.__Position
			//		Object like {x: 10, y: 20}
			// corners: String[]
			//		Array of Strings representing order to try corners of the node in, like ["TR", "BL"].
			//		Possible values are:
			//
			//		- "BL" - bottom left
			//		- "BR" - bottom right
			//		- "TL" - top left
			//		- "TR" - top right
			// padding: dijit/place.__Position?
			//		Optional param to set padding, to put some buffer around the element you want to position.
			//		Defaults to zero.
			// layoutNode: Function(node, aroundNodeCorner, nodeCorner)
			//		For things like tooltip, they are displayed differently (and have different dimensions)
			//		based on their orientation relative to the parent.  This adjusts the popup based on orientation.
			// example:
			//		Try to place node's top right corner at (10,20).
			//		If that makes node go (partially) off screen, then try placing
			//		bottom left corner at (10,20).
			//	|	place(node, {x: 10, y: 20}, ["TR", "BL"])
			var choices = array.map(corners, function(corner){
				var c = {
					corner: corner,
					aroundCorner: reverse[corner],	// so TooltipDialog.orient() gets aroundCorner argument set
					pos: {x: pos.x,y: pos.y}
				};
				if(padding){
					c.pos.x += corner.charAt(1) == 'L' ? padding.x : -padding.x;
					c.pos.y += corner.charAt(0) == 'T' ? padding.y : -padding.y;
				}
				return c;
			});

			return _place(node, choices, layoutNode);
		},

		around: function(
			/*DomNode*/		node,
			/*DomNode|dijit/place.__Rectangle*/ anchor,
			/*String[]*/	positions,
			/*Boolean*/		leftToRight,
			/*Function?*/	layoutNode){

			// summary:
			//		Position node adjacent or kitty-corner to anchor
			//		such that it's fully visible in viewport.
			// description:
			//		Place node such that corner of node touches a corner of
			//		aroundNode, and that node is fully visible.
			// anchor:
			//		Either a DOMNode or a rectangle (object with x, y, width, height).
			// positions:
			//		Ordered list of positions to try matching up.
			//
			//		- before: places drop down to the left of the anchor node/widget, or to the right in the case
			//			of RTL scripts like Hebrew and Arabic; aligns either the top of the drop down
			//			with the top of the anchor, or the bottom of the drop down with bottom of the anchor.
			//		- after: places drop down to the right of the anchor node/widget, or to the left in the case
			//			of RTL scripts like Hebrew and Arabic; aligns either the top of the drop down
			//			with the top of the anchor, or the bottom of the drop down with bottom of the anchor.
			//		- before-centered: centers drop down to the left of the anchor node/widget, or to the right
			//			in the case of RTL scripts like Hebrew and Arabic
			//		- after-centered: centers drop down to the right of the anchor node/widget, or to the left
			//			in the case of RTL scripts like Hebrew and Arabic
			//		- above-centered: drop down is centered above anchor node
			//		- above: drop down goes above anchor node, left sides aligned
			//		- above-alt: drop down goes above anchor node, right sides aligned
			//		- below-centered: drop down is centered above anchor node
			//		- below: drop down goes below anchor node
			//		- below-alt: drop down goes below anchor node, right sides aligned
			// layoutNode: Function(node, aroundNodeCorner, nodeCorner)
			//		For things like tooltip, they are displayed differently (and have different dimensions)
			//		based on their orientation relative to the parent.	 This adjusts the popup based on orientation.
			// leftToRight:
			//		True if widget is LTR, false if widget is RTL.   Affects the behavior of "above" and "below"
			//		positions slightly.
			// example:
			//	|	placeAroundNode(node, aroundNode, ['below', 'above-alt']);
			//		This will try to position node such that node's top-left corner is at the same position
			//		as the bottom left corner of the aroundNode (ie, put node below
			//		aroundNode, with left edges aligned).	If that fails it will try to put
			//		the bottom-right corner of node where the top right corner of aroundNode is
			//		(ie, put node above aroundNode, with right edges aligned)
			//

			// If around is a DOMNode (or DOMNode id), convert to coordinates.
			var aroundNodePos;
			if(typeof anchor == "string" || "offsetWidth" in anchor || "ownerSVGElement" in anchor){
				aroundNodePos = domGeometry.position(anchor, true);

				// For above and below dropdowns, subtract width of border so that popup and aroundNode borders
				// overlap, preventing a double-border effect.  Unfortunately, difficult to measure the border
				// width of either anchor or popup because in both cases the border may be on an inner node.
				if(/^(above|below)/.test(positions[0])){
					var anchorBorder = domGeometry.getBorderExtents(anchor),
						anchorChildBorder = anchor.firstChild ? domGeometry.getBorderExtents(anchor.firstChild) : {t:0,l:0,b:0,r:0},
						nodeBorder =  domGeometry.getBorderExtents(node),
						nodeChildBorder = node.firstChild ? domGeometry.getBorderExtents(node.firstChild) : {t:0,l:0,b:0,r:0};
					aroundNodePos.y += Math.min(anchorBorder.t + anchorChildBorder.t, nodeBorder.t + nodeChildBorder.t);
					aroundNodePos.h -=  Math.min(anchorBorder.t + anchorChildBorder.t, nodeBorder.t+ nodeChildBorder.t) +
						Math.min(anchorBorder.b + anchorChildBorder.b, nodeBorder.b + nodeChildBorder.b);
				}
			}else{
				aroundNodePos = anchor;
			}

			// Compute position and size of visible part of anchor (it may be partially hidden by ancestor nodes w/scrollbars)
			if(anchor.parentNode){
				// ignore nodes between position:relative and position:absolute
				var sawPosAbsolute = domStyle.getComputedStyle(anchor).position == "absolute";
				var parent = anchor.parentNode;
				while(parent && parent.nodeType == 1 && parent.nodeName != "BODY"){  //ignoring the body will help performance
					var parentPos = domGeometry.position(parent, true),
						pcs = domStyle.getComputedStyle(parent);
					if(/relative|absolute/.test(pcs.position)){
						sawPosAbsolute = false;
					}
					if(!sawPosAbsolute && /hidden|auto|scroll/.test(pcs.overflow)){
						var bottomYCoord = Math.min(aroundNodePos.y + aroundNodePos.h, parentPos.y + parentPos.h);
						var rightXCoord = Math.min(aroundNodePos.x + aroundNodePos.w, parentPos.x + parentPos.w);
						aroundNodePos.x = Math.max(aroundNodePos.x, parentPos.x);
						aroundNodePos.y = Math.max(aroundNodePos.y, parentPos.y);
						aroundNodePos.h = bottomYCoord - aroundNodePos.y;
						aroundNodePos.w = rightXCoord - aroundNodePos.x;
					}
					if(pcs.position == "absolute"){
						sawPosAbsolute = true;
					}
					parent = parent.parentNode;
				}
			}

			var x = aroundNodePos.x,
				y = aroundNodePos.y,
				width = "w" in aroundNodePos ? aroundNodePos.w : (aroundNodePos.w = aroundNodePos.width),
				height = "h" in aroundNodePos ? aroundNodePos.h : (kernel.deprecated("place.around: dijit/place.__Rectangle: { x:"+x+", y:"+y+", height:"+aroundNodePos.height+", width:"+width+" } has been deprecated.  Please use { x:"+x+", y:"+y+", h:"+aroundNodePos.height+", w:"+width+" }", "", "2.0"), aroundNodePos.h = aroundNodePos.height);

			// Convert positions arguments into choices argument for _place()
			var choices = [];
			function push(aroundCorner, corner){
				choices.push({
					aroundCorner: aroundCorner,
					corner: corner,
					pos: {
						x: {
							'L': x,
							'R': x + width,
							'M': x + (width >> 1)
						}[aroundCorner.charAt(1)],
						y: {
							'T': y,
							'B': y + height,
							'M': y + (height >> 1)
						}[aroundCorner.charAt(0)]
					}
				})
			}
			array.forEach(positions, function(pos){
				var ltr =  leftToRight;
				switch(pos){
					case "above-centered":
						push("TM", "BM");
						break;
					case "below-centered":
						push("BM", "TM");
						break;
					case "after-centered":
						ltr = !ltr;
						// fall through
					case "before-centered":
						push(ltr ? "ML" : "MR", ltr ? "MR" : "ML");
						break;
					case "after":
						ltr = !ltr;
						// fall through
					case "before":
						push(ltr ? "TL" : "TR", ltr ? "TR" : "TL");
						push(ltr ? "BL" : "BR", ltr ? "BR" : "BL");
						break;
					case "below-alt":
						ltr = !ltr;
						// fall through
					case "below":
						// first try to align left borders, next try to align right borders (or reverse for RTL mode)
						push(ltr ? "BL" : "BR", ltr ? "TL" : "TR");
						push(ltr ? "BR" : "BL", ltr ? "TR" : "TL");
						break;
					case "above-alt":
						ltr = !ltr;
						// fall through
					case "above":
						// first try to align left borders, next try to align right borders (or reverse for RTL mode)
						push(ltr ? "TL" : "TR", ltr ? "BL" : "BR");
						push(ltr ? "TR" : "TL", ltr ? "BR" : "BL");
						break;
					default:
						// To assist dijit/_base/place, accept arguments of type {aroundCorner: "BL", corner: "TL"}.
						// Not meant to be used directly.  Remove for 2.0.
						push(pos.aroundCorner, pos.corner);
				}
			});

			var position = _place(node, choices, layoutNode, {w: width, h: height});
			position.aroundNodePos = aroundNodePos;

			return position;
		}
	};

	/*=====
	place.__Position = {
		// x: Integer
		//		horizontal coordinate in pixels, relative to document body
		// y: Integer
		//		vertical coordinate in pixels, relative to document body
	};
	place.__Rectangle = {
		// x: Integer
		//		horizontal offset in pixels, relative to document body
		// y: Integer
		//		vertical offset in pixels, relative to document body
		// w: Integer
		//		width in pixels.   Can also be specified as "width" for backwards-compatibility.
		// h: Integer
		//		height in pixels.   Can also be specified as "height" for backwards-compatibility.
	};
	=====*/

	return dijit.place = place;	// setting dijit.place for back-compat, remove for 2.0
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
	// By default, it's enabled for IE6-11, excluding Windows Phone 8.
	// TODO: For 2.0, make this false by default.  Also, possibly move definition to has.js so that this module can be
	// conditionally required via  dojo/has!bgIfame?dijit/BackgroundIframe
	has.add("config-bgIframe",
    	(has("ie") || has("trident")) && !/IEMobile\/10\.0/.test(navigator.userAgent)); // No iframe on WP8, to match 1.9 behavior

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
'dijit/_HasDropDown':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/_base/Deferred",
	"dojo/dom", // dom.isDescendant
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-class", // domClass.add domClass.contains domClass.remove
	"dojo/dom-geometry", // domGeometry.marginBox domGeometry.position
	"dojo/dom-style", // domStyle.set
	"dojo/has", // has("touch")
	"dojo/keys", // keys.DOWN_ARROW keys.ENTER keys.ESCAPE
	"dojo/_base/lang", // lang.hitch lang.isFunction
	"dojo/on",
	"dojo/touch",
	"./registry", // registry.byNode()
	"./focus",
	"./popup",
	"./_FocusMixin"
], function(declare, Deferred, dom, domAttr, domClass, domGeometry, domStyle, has, keys, lang, on, touch,
			registry, focus, popup, _FocusMixin){


	// module:
	//		dijit/_HasDropDown

	return declare("dijit._HasDropDown", _FocusMixin, {
		// summary:
		//		Mixin for widgets that need drop down ability.

		// _buttonNode: [protected] DomNode
		//		The button/icon/node to click to display the drop down.
		//		Can be set via a data-dojo-attach-point assignment.
		//		If missing, then either focusNode or domNode (if focusNode is also missing) will be used.
		_buttonNode: null,

		// _arrowWrapperNode: [protected] DomNode
		//		Will set CSS class dijitUpArrow, dijitDownArrow, dijitRightArrow etc. on this node depending
		//		on where the drop down is set to be positioned.
		//		Can be set via a data-dojo-attach-point assignment.
		//		If missing, then _buttonNode will be used.
		_arrowWrapperNode: null,

		// _popupStateNode: [protected] DomNode
		//		The node to set the aria-expanded class on.
		//		Also sets popupActive class but that will be removed in 2.0.
		//		Can be set via a data-dojo-attach-point assignment.
		//		If missing, then focusNode or _buttonNode (if focusNode is missing) will be used.
		_popupStateNode: null,

		// _aroundNode: [protected] DomNode
		//		The node to display the popup around.
		//		Can be set via a data-dojo-attach-point assignment.
		//		If missing, then domNode will be used.
		_aroundNode: null,

		// dropDown: [protected] Widget
		//		The widget to display as a popup.  This widget *must* be
		//		defined before the startup function is called.
		dropDown: null,

		// autoWidth: [protected] Boolean
		//		Set to true to make the drop down at least as wide as this
		//		widget.  Set to false if the drop down should just be its
		//		default width.
		autoWidth: true,

		// forceWidth: [protected] Boolean
		//		Set to true to make the drop down exactly as wide as this
		//		widget.  Overrides autoWidth.
		forceWidth: false,

		// maxHeight: [protected] Integer
		//		The max height for our dropdown.
		//		Any dropdown taller than this will have scrollbars.
		//		Set to 0 for no max height, or -1 to limit height to available space in viewport
		maxHeight: -1,

		// dropDownPosition: [const] String[]
		//		This variable controls the position of the drop down.
		//		It's an array of strings with the following values:
		//
		//		- before: places drop down to the left of the target node/widget, or to the right in
		//		  the case of RTL scripts like Hebrew and Arabic
		//		- after: places drop down to the right of the target node/widget, or to the left in
		//		  the case of RTL scripts like Hebrew and Arabic
		//		- above: drop down goes above target node
		//		- below: drop down goes below target node
		//
		//		The list is positions is tried, in order, until a position is found where the drop down fits
		//		within the viewport.
		//
		dropDownPosition: ["below", "above"],

		// _stopClickEvents: Boolean
		//		When set to false, the click events will not be stopped, in
		//		case you want to use them in your subclass
		_stopClickEvents: true,

		_onDropDownMouseDown: function(/*Event*/ e){
			// summary:
			//		Callback when the user mousedown/touchstart on the arrow icon.

			if(this.disabled || this.readOnly){
				return;
			}

			// Prevent default to stop things like text selection, but don't stop propagation, so that:
			//		1. TimeTextBox etc. can focus the <input> on mousedown
			//		2. dropDownButtonActive class applied by _CssStateMixin (on button depress)
			//		3. user defined onMouseDown handler fires
			//
			// Also, don't call preventDefault() on MSPointerDown event (on IE10) because that prevents the button
			// from getting focus, and then the focus manager doesn't know what's going on (#17262)
			if(e.type != "MSPointerDown"){
				e.preventDefault();
			}

			this.own(on.once(this.ownerDocument, touch.release, lang.hitch(this, "_onDropDownMouseUp")));

			this.toggleDropDown();
		},

		_onDropDownMouseUp: function(/*Event?*/ e){
			// summary:
			//		Callback on mouseup/touchend after mousedown/touchstart on the arrow icon.
			//		Note that this function is called regardless of what node the event occurred on (but only after
			//		a mousedown/touchstart on the arrow).
			//
			//		If the drop down is a simple menu and the cursor is over the menu, we execute it, otherwise, we focus our
			//		drop down widget.  If the event is missing, then we are not
			//		a mouseup event.
			//
			//		This is useful for the common mouse movement pattern
			//		with native browser `<select>` nodes:
			//
			//		1. mouse down on the select node (probably on the arrow)
			//		2. move mouse to a menu item while holding down the mouse button
			//		3. mouse up.  this selects the menu item as though the user had clicked it.

			var dropDown = this.dropDown, overMenu = false;

			if(e && this._opened){
				// This code deals with the corner-case when the drop down covers the original widget,
				// because it's so large.  In that case mouse-up shouldn't select a value from the menu.
				// Find out if our target is somewhere in our dropdown widget,
				// but not over our _buttonNode (the clickable node)
				var c = domGeometry.position(this._buttonNode, true);
				if(!(e.pageX >= c.x && e.pageX <= c.x + c.w) || !(e.pageY >= c.y && e.pageY <= c.y + c.h)){
					var t = e.target;
					while(t && !overMenu){
						if(domClass.contains(t, "dijitPopup")){
							overMenu = true;
						}else{
							t = t.parentNode;
						}
					}
					if(overMenu){
						t = e.target;
						if(dropDown.onItemClick){
							var menuItem;
							while(t && !(menuItem = registry.byNode(t))){
								t = t.parentNode;
							}
							if(menuItem && menuItem.onClick && menuItem.getParent){
								menuItem.getParent().onItemClick(menuItem, e);
							}
						}
						return;
					}
				}
			}
			if(this._opened){
				// Focus the dropdown widget unless it's a menu (in which case autoFocus is set to false).
				// Even if it's a menu, we need to focus it if this is a fake mouse event caused by the user typing
				// SPACE/ENTER while using JAWS.  Jaws converts the SPACE/ENTER key into mousedown/mouseup events.
				// If this.hovering is false then it's presumably actually a keyboard event.
				if(dropDown.focus && (dropDown.autoFocus !== false || (e.type == "mouseup" && !this.hovering))){
					// Do it on a delay so that we don't steal back focus from the dropdown.
					this._focusDropDownTimer = this.defer(function(){
						dropDown.focus();
						delete this._focusDropDownTimer;
					});
				}
			}else{
				// The drop down arrow icon probably can't receive focus, but widget itself should get focus.
				// defer() needed to make it work on IE (test DateTextBox)
				if(this.focus){
					this.defer("focus");
				}
			}
		},

		_onDropDownClick: function(/*Event*/ e){
			// The drop down was already opened on mousedown/keydown; just need to stop the event
			if(this._stopClickEvents){
				e.stopPropagation();
				e.preventDefault();
			}
		},

		buildRendering: function(){
			this.inherited(arguments);

			this._buttonNode = this._buttonNode || this.focusNode || this.domNode;
			this._popupStateNode = this._popupStateNode || this.focusNode || this._buttonNode;

			// Add a class to the "dijitDownArrowButton" type class to _buttonNode so theme can set direction of arrow
			// based on where drop down will normally appear
			var defaultPos = {
				"after": this.isLeftToRight() ? "Right" : "Left",
				"before": this.isLeftToRight() ? "Left" : "Right",
				"above": "Up",
				"below": "Down",
				"left": "Left",
				"right": "Right"
			}[this.dropDownPosition[0]] || this.dropDownPosition[0] || "Down";
			domClass.add(this._arrowWrapperNode || this._buttonNode, "dijit" + defaultPos + "ArrowButton");
		},

		postCreate: function(){
			// summary:
			//		set up nodes and connect our mouse and keyboard events

			this.inherited(arguments);

			var keyboardEventNode = this.focusNode || this.domNode;
			this.own(
				on(this._buttonNode, touch.press, lang.hitch(this, "_onDropDownMouseDown")),
				on(this._buttonNode, "click", lang.hitch(this, "_onDropDownClick")),
				on(keyboardEventNode, "keydown", lang.hitch(this, "_onKey")),
				on(keyboardEventNode, "keyup", lang.hitch(this, "_onKeyUp"))
			);
		},

		destroy: function(){
			// If dropdown is open, close it, to avoid leaving dijit/focus in a strange state.
			// Put focus back on me to avoid the focused node getting destroyed, which flummoxes IE.
			if(this._opened){
				this.closeDropDown(true);
			}

			if(this.dropDown){
				// Destroy the drop down, unless it's already been destroyed.  This can happen because
				// the drop down is a direct child of <body> even though it's logically my child.
				if(!this.dropDown._destroyed){
					this.dropDown.destroyRecursive();
				}
				delete this.dropDown;
			}
			this.inherited(arguments);
		},

		_onKey: function(/*Event*/ e){
			// summary:
			//		Callback when the user presses a key while focused on the button node

			if(this.disabled || this.readOnly){
				return;
			}
			var d = this.dropDown, target = e.target;
			if(d && this._opened && d.handleKey){
				if(d.handleKey(e) === false){
					/* false return code means that the drop down handled the key */
					e.stopPropagation();
					e.preventDefault();
					return;
				}
			}
			if(d && this._opened && e.keyCode == keys.ESCAPE){
				this.closeDropDown();
				e.stopPropagation();
				e.preventDefault();
			}else if(!this._opened &&
				(e.keyCode == keys.DOWN_ARROW ||
					// ignore unmodified SPACE if _KeyNavMixin has active searching in progress
					( (e.keyCode == keys.ENTER || (e.keyCode == keys.SPACE && (!this._searchTimer || (e.ctrlKey || e.altKey || e.metaKey)))) &&
						//ignore enter and space if the event is for a text input
						((target.tagName || "").toLowerCase() !== 'input' ||
							(target.type && target.type.toLowerCase() !== 'text'))))){
				// Toggle the drop down, but wait until keyup so that the drop down doesn't
				// get a stray keyup event, or in the case of key-repeat (because user held
				// down key for too long), stray keydown events
				this._toggleOnKeyUp = true;
				e.stopPropagation();
				e.preventDefault();
			}
		},

		_onKeyUp: function(){
			if(this._toggleOnKeyUp){
				delete this._toggleOnKeyUp;
				this.toggleDropDown();
				var d = this.dropDown;	// drop down may not exist until toggleDropDown() call
				if(d && d.focus){
					this.defer(lang.hitch(d, "focus"), 1);
				}
			}
		},

		_onBlur: function(){
			// summary:
			//		Called magically when focus has shifted away from this widget and it's dropdown

			// Close dropdown but don't focus my <input>.  User may have focused somewhere else (ex: clicked another
			// input), and even if they just clicked a blank area of the screen, focusing my <input> will unwantedly
			// popup the keyboard on mobile.
			this.closeDropDown(false);

			this.inherited(arguments);
		},

		isLoaded: function(){
			// summary:
			//		Returns true if the dropdown exists and it's data is loaded.  This can
			//		be overridden in order to force a call to loadDropDown().
			// tags:
			//		protected

			return true;
		},

		loadDropDown: function(/*Function*/ loadCallback){
			// summary:
			//		Creates the drop down if it doesn't exist, loads the data
			//		if there's an href and it hasn't been loaded yet, and then calls
			//		the given callback.
			// tags:
			//		protected

			// TODO: for 2.0, change API to return a Deferred, instead of calling loadCallback?
			loadCallback();
		},

		loadAndOpenDropDown: function(){
			// summary:
			//		Creates the drop down if it doesn't exist, loads the data
			//		if there's an href and it hasn't been loaded yet, and
			//		then opens the drop down.  This is basically a callback when the
			//		user presses the down arrow button to open the drop down.
			// returns: Deferred
			//		Deferred for the drop down widget that
			//		fires when drop down is created and loaded
			// tags:
			//		protected
			var d = new Deferred(),
				afterLoad = lang.hitch(this, function(){
					this.openDropDown();
					d.resolve(this.dropDown);
				});
			if(!this.isLoaded()){
				this.loadDropDown(afterLoad);
			}else{
				afterLoad();
			}
			return d;
		},

		toggleDropDown: function(){
			// summary:
			//		Callback when the user presses the down arrow button or presses
			//		the down arrow key to open/close the drop down.
			//		Toggle the drop-down widget; if it is up, close it, if not, open it
			// tags:
			//		protected

			if(this.disabled || this.readOnly){
				return;
			}
			if(!this._opened){
				this.loadAndOpenDropDown();
			}else{
				this.closeDropDown(true);	// refocus button to avoid hiding node w/focus
			}
		},

		openDropDown: function(){
			// summary:
			//		Opens the dropdown for this widget.   To be called only when this.dropDown
			//		has been created and is ready to display (ie, it's data is loaded).
			// returns:
			//		return value of dijit/popup.open()
			// tags:
			//		protected

			var dropDown = this.dropDown,
				ddNode = dropDown.domNode,
				aroundNode = this._aroundNode || this.domNode,
				self = this;

			var retVal = popup.open({
				parent: this,
				popup: dropDown,
				around: aroundNode,
				orient: this.dropDownPosition,
				maxHeight: this.maxHeight,
				onExecute: function(){
					self.closeDropDown(true);
				},
				onCancel: function(){
					self.closeDropDown(true);
				},
				onClose: function(){
					domAttr.set(self._popupStateNode, "popupActive", false);
					domClass.remove(self._popupStateNode, "dijitHasDropDownOpen");
					self._set("_opened", false);	// use set() because _CssStateMixin is watching
				}
			});

			// Set width of drop down if necessary, so that dropdown width + width of scrollbar (from popup wrapper)
			// matches width of aroundNode
			if(this.forceWidth || (this.autoWidth && aroundNode.offsetWidth > dropDown._popupWrapper.offsetWidth)){
				var widthAdjust = aroundNode.offsetWidth - dropDown._popupWrapper.offsetWidth;
				var resizeArgs = {
					w: dropDown.domNode.offsetWidth + widthAdjust
				};
				this._origStyle = ddNode.style.cssText;
				if(lang.isFunction(dropDown.resize)){
					dropDown.resize(resizeArgs);
				}else{
					domGeometry.setMarginBox(ddNode, resizeArgs);
				}

				// If dropdown is right-aligned then compensate for width change by changing horizontal position
				if(retVal.corner[1] == "R"){
					dropDown._popupWrapper.style.left =
						(dropDown._popupWrapper.style.left.replace("px", "") - widthAdjust) + "px";
				}
			}

			domAttr.set(this._popupStateNode, "popupActive", "true");
			domClass.add(this._popupStateNode, "dijitHasDropDownOpen");
			this._set("_opened", true);	// use set() because _CssStateMixin is watching

			this._popupStateNode.setAttribute("aria-expanded", "true");
			this._popupStateNode.setAttribute("aria-owns", dropDown.id);

			// Set aria-labelledby on dropdown if it's not already set to something more meaningful
			if(ddNode.getAttribute("role") !== "presentation" && !ddNode.getAttribute("aria-labelledby")){
				ddNode.setAttribute("aria-labelledby", this.id);
			}

			return retVal;
		},

		closeDropDown: function(/*Boolean*/ focus){
			// summary:
			//		Closes the drop down on this widget
			// focus:
			//		If true, refocuses the button widget
			// tags:
			//		protected

			if(this._focusDropDownTimer){
				this._focusDropDownTimer.remove();
				delete this._focusDropDownTimer;
			}

			if(this._opened){
				this._popupStateNode.setAttribute("aria-expanded", "false");
				if(focus && this.focus){
					this.focus();
				}
				popup.close(this.dropDown);
				this._opened = false;
			}

			if(this._origStyle){
				this.dropDown.domNode.style.cssText = this._origStyle;
				delete this._origStyle;
			}
		}
	});
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
'dijit/_base':function(){
define([
	"./main",
	"./a11y",	// used to be in dijit/_base/manager
	"./WidgetSet",	// used to be in dijit/_base/manager
	"./_base/focus",
	"./_base/manager",
	"./_base/place",
	"./_base/popup",
	"./_base/scroll",
	"./_base/sniff",
	"./_base/typematic",
	"./_base/wai",
	"./_base/window"
], function(dijit){

	// module:
	//		dijit/_base

	/*=====
	return {
		// summary:
		//		Includes all the modules in dijit/_base
	};
	=====*/

	return dijit._base;
});

},
'dijit/WidgetSet':function(){
define([
	"dojo/_base/array", // array.forEach array.map
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.global
	"./registry"	// to add functions to dijit.registry
], function(array, declare, kernel, registry){

	// module:
	//		dijit/WidgetSet

	var WidgetSet = declare("dijit.WidgetSet", null, {
		// summary:
		//		A set of widgets indexed by id.
		//		Deprecated, will be removed in 2.0.
		//
		// example:
		//		Create a small list of widgets:
		//		|	require(["dijit/WidgetSet", "dijit/registry"],
		//		|		function(WidgetSet, registry){
		//		|		var ws = new WidgetSet();
		//		|		ws.add(registry.byId("one"));
		//		|		ws.add(registry.byId("two"));
		//		|		// destroy both:
		//		|		ws.forEach(function(w){ w.destroy(); });
		//		|	});

		constructor: function(){
			this._hash = {};
			this.length = 0;
		},

		add: function(/*dijit/_WidgetBase*/ widget){
			// summary:
			//		Add a widget to this list. If a duplicate ID is detected, a error is thrown.
			//
			// widget: dijit/_WidgetBase
			//		Any dijit/_WidgetBase subclass.
			if(this._hash[widget.id]){
				throw new Error("Tried to register widget with id==" + widget.id + " but that id is already registered");
			}
			this._hash[widget.id] = widget;
			this.length++;
		},

		remove: function(/*String*/ id){
			// summary:
			//		Remove a widget from this WidgetSet. Does not destroy the widget; simply
			//		removes the reference.
			if(this._hash[id]){
				delete this._hash[id];
				this.length--;
			}
		},

		forEach: function(/*Function*/ func, /* Object? */thisObj){
			// summary:
			//		Call specified function for each widget in this set.
			//
			// func:
			//		A callback function to run for each item. Is passed the widget, the index
			//		in the iteration, and the full hash, similar to `array.forEach`.
			//
			// thisObj:
			//		An optional scope parameter
			//
			// example:
			//		Using the default `dijit.registry` instance:
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		registry.forEach(function(widget){
			//		|			 0 && console.log(widget.declaredClass);
			//		|		});
			//		|	});
			//
			// returns:
			//		Returns self, in order to allow for further chaining.

			thisObj = thisObj || kernel.global;
			var i = 0, id;
			for(id in this._hash){
				func.call(thisObj, this._hash[id], i++, this._hash);
			}
			return this;	// dijit/WidgetSet
		},

		filter: function(/*Function*/ filter, /* Object? */thisObj){
			// summary:
			//		Filter down this WidgetSet to a smaller new WidgetSet
			//		Works the same as `array.filter` and `NodeList.filter`
			//
			// filter:
			//		Callback function to test truthiness. Is passed the widget
			//		reference and the pseudo-index in the object.
			//
			// thisObj: Object?
			//		Option scope to use for the filter function.
			//
			// example:
			//		Arbitrary: select the odd widgets in this list
			//		|	
			//		|		
			//		|	
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		registry.filter(function(w, i){
			//		|			return i % 2 == 0;
			//		|		}).forEach(function(w){ /* odd ones */ });
			//		|	});

			thisObj = thisObj || kernel.global;
			var res = new WidgetSet(), i = 0, id;
			for(id in this._hash){
				var w = this._hash[id];
				if(filter.call(thisObj, w, i++, this._hash)){
					res.add(w);
				}
			}
			return res; // dijit/WidgetSet
		},

		byId: function(/*String*/ id){
			// summary:
			//		Find a widget in this list by it's id.
			// example:
			//		Test if an id is in a particular WidgetSet
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		var ws = new WidgetSet();
			//		|		ws.add(registry.byId("bar"));
			//		|		var t = ws.byId("bar") // returns a widget
			//		|		var x = ws.byId("foo"); // returns undefined
			//		|	});

			return this._hash[id];	// dijit/_WidgetBase
		},

		byClass: function(/*String*/ cls){
			// summary:
			//		Reduce this widgetset to a new WidgetSet of a particular `declaredClass`
			//
			// cls: String
			//		The Class to scan for. Full dot-notated string.
			//
			// example:
			//		Find all `dijit.TitlePane`s in a page:
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		registry.byClass("dijit.TitlePane").forEach(function(tp){ tp.close(); });
			//		|	});

			var res = new WidgetSet(), id, widget;
			for(id in this._hash){
				widget = this._hash[id];
				if(widget.declaredClass == cls){
					res.add(widget);
				}
			 }
			 return res; // dijit/WidgetSet
		},

		toArray: function(){
			// summary:
			//		Convert this WidgetSet into a true Array
			//
			// example:
			//		Work with the widget .domNodes in a real Array
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		array.map(registry.toArray(), function(w){ return w.domNode; });
			//		|	});


			var ar = [];
			for(var id in this._hash){
				ar.push(this._hash[id]);
			}
			return ar;	// dijit/_WidgetBase[]
		},

		map: function(/* Function */func, /* Object? */thisObj){
			// summary:
			//		Create a new Array from this WidgetSet, following the same rules as `array.map`
			// example:
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		var nodes = registry.map(function(w){ return w.domNode; });
			//		|	});
			//
			// returns:
			//		A new array of the returned values.
			return array.map(this.toArray(), func, thisObj); // Array
		},

		every: function(func, thisObj){
			// summary:
			//		A synthetic clone of `array.every` acting explicitly on this WidgetSet
			//
			// func: Function
			//		A callback function run for every widget in this list. Exits loop
			//		when the first false return is encountered.
			//
			// thisObj: Object?
			//		Optional scope parameter to use for the callback

			thisObj = thisObj || kernel.global;
			var x = 0, i;
			for(i in this._hash){
				if(!func.call(thisObj, this._hash[i], x++, this._hash)){
					return false; // Boolean
				}
			}
			return true; // Boolean
		},

		some: function(func, thisObj){
			// summary:
			//		A synthetic clone of `array.some` acting explicitly on this WidgetSet
			//
			// func: Function
			//		A callback function run for every widget in this list. Exits loop
			//		when the first true return is encountered.
			//
			// thisObj: Object?
			//		Optional scope parameter to use for the callback

			thisObj = thisObj || kernel.global;
			var x = 0, i;
			for(i in this._hash){
				if(func.call(thisObj, this._hash[i], x++, this._hash)){
					return true; // Boolean
				}
			}
			return false; // Boolean
		}

	});

	// Add in 1.x compatibility methods to dijit/registry.
	// These functions won't show up in the API doc but since they are deprecated anyway,
	// that's probably for the best.
	array.forEach(["forEach", "filter", "byClass", "map", "every", "some"], function(func){
		registry[func] = WidgetSet.prototype[func];
	});


	return WidgetSet;
});

},
'dijit/_base/focus':function(){
define([
	"dojo/_base/array", // array.forEach
	"dojo/dom", // dom.isDescendant
	"dojo/_base/lang", // lang.isArray
	"dojo/topic", // publish
	"dojo/_base/window", // win.doc win.doc.selection win.global win.global.getSelection win.withGlobal
	"../focus",
	"../selection",
	"../main"	// for exporting symbols to dijit
], function(array, dom, lang, topic, win, focus, selection, dijit){

	// module:
	//		dijit/_base/focus

	var exports = {
		// summary:
		//		Deprecated module to monitor currently focused node and stack of currently focused widgets.
		//		New code should access dijit/focus directly.

		// _curFocus: DomNode
		//		Currently focused item on screen
		_curFocus: null,

		// _prevFocus: DomNode
		//		Previously focused item on screen
		_prevFocus: null,

		isCollapsed: function(){
			// summary:
			//		Returns true if there is no text selected
			return dijit.getBookmark().isCollapsed;
		},

		getBookmark: function(){
			// summary:
			//		Retrieves a bookmark that can be used with moveToBookmark to return to the same range
			var sel = win.global == window ? selection : new selection.SelectionManager(win.global);
			return sel.getBookmark();
		},

		moveToBookmark: function(/*Object*/ bookmark){
			// summary:
			//		Moves current selection to a bookmark
			// bookmark:
			//		This should be a returned object from dijit.getBookmark()

			var sel = win.global == window ? selection : new selection.SelectionManager(win.global);
			return sel.moveToBookmark(bookmark);
		},

		getFocus: function(/*Widget?*/ menu, /*Window?*/ openedForWindow){
			// summary:
			//		Called as getFocus(), this returns an Object showing the current focus
			//		and selected text.
			//
			//		Called as getFocus(widget), where widget is a (widget representing) a button
			//		that was just pressed, it returns where focus was before that button
			//		was pressed.   (Pressing the button may have either shifted focus to the button,
			//		or removed focus altogether.)   In this case the selected text is not returned,
			//		since it can't be accurately determined.
			//
			// menu: dijit/_WidgetBase|{domNode: DomNode} structure
			//		The button that was just pressed.  If focus has disappeared or moved
			//		to this button, returns the previous focus.  In this case the bookmark
			//		information is already lost, and null is returned.
			//
			// openedForWindow:
			//		iframe in which menu was opened
			//
			// returns:
			//		A handle to restore focus/selection, to be passed to `dijit.focus`
			var node = !focus.curNode || (menu && dom.isDescendant(focus.curNode, menu.domNode)) ? dijit._prevFocus : focus.curNode;
			return {
				node: node,
				bookmark: node && (node == focus.curNode) && win.withGlobal(openedForWindow || win.global, dijit.getBookmark),
				openedForWindow: openedForWindow
			}; // Object
		},

		// _activeStack: dijit/_WidgetBase[]
		//		List of currently active widgets (focused widget and it's ancestors)
		_activeStack: [],

		registerIframe: function(/*DomNode*/ iframe){
			// summary:
			//		Registers listeners on the specified iframe so that any click
			//		or focus event on that iframe (or anything in it) is reported
			//		as a focus/click event on the `<iframe>` itself.
			// description:
			//		Currently only used by editor.
			// returns:
			//		Handle to pass to unregisterIframe()
			return focus.registerIframe(iframe);
		},

		unregisterIframe: function(/*Object*/ handle){
			// summary:
			//		Unregisters listeners on the specified iframe created by registerIframe.
			//		After calling be sure to delete or null out the handle itself.
			// handle:
			//		Handle returned by registerIframe()

			handle && handle.remove();
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
			//		Handle to pass to unregisterWin()

			return focus.registerWin(targetWindow, effectiveNode);
		},

		unregisterWin: function(/*Handle*/ handle){
			// summary:
			//		Unregisters listeners on the specified window (either the main
			//		window or an iframe's window) according to handle returned from registerWin().
			//		After calling be sure to delete or null out the handle itself.

			handle && handle.remove();
		}
	};

	// Override focus singleton's focus function so that dijit.focus()
	// has backwards compatible behavior of restoring selection (although
	// probably no one is using that).
	focus.focus = function(/*Object|DomNode */ handle){
		// summary:
		//		Sets the focused node and the selection according to argument.
		//		To set focus to an iframe's content, pass in the iframe itself.
		// handle:
		//		object returned by get(), or a DomNode

		if(!handle){ return; }

		var node = "node" in handle ? handle.node : handle,		// because handle is either DomNode or a composite object
			bookmark = handle.bookmark,
			openedForWindow = handle.openedForWindow,
			collapsed = bookmark ? bookmark.isCollapsed : false;

		// Set the focus
		// Note that for iframe's we need to use the <iframe> to follow the parentNode chain,
		// but we need to set focus to iframe.contentWindow
		if(node){
			var focusNode = (node.tagName.toLowerCase() == "iframe") ? node.contentWindow : node;
			if(focusNode && focusNode.focus){
				try{
					// Gecko throws sometimes if setting focus is impossible,
					// node not displayed or something like that
					focusNode.focus();
				}catch(e){/*quiet*/}
			}
			focus._onFocusNode(node);
		}

		// set the selection
		// do not need to restore if current selection is not empty
		// (use keyboard to select a menu item) or if previous selection was collapsed
		// as it may cause focus shift (Esp in IE).
		if(bookmark && win.withGlobal(openedForWindow || win.global, dijit.isCollapsed) && !collapsed){
			if(openedForWindow){
				openedForWindow.focus();
			}
			try{
				win.withGlobal(openedForWindow || win.global, dijit.moveToBookmark, null, [bookmark]);
			}catch(e2){
				/*squelch IE internal error, see http://trac.dojotoolkit.org/ticket/1984 */
			}
		}
	};

	// For back compatibility, monitor changes to focused node and active widget stack,
	// publishing events and copying changes from focus manager variables into dijit (top level) variables
	focus.watch("curNode", function(name, oldVal, newVal){
		dijit._curFocus = newVal;
		dijit._prevFocus = oldVal;
		if(newVal){
			topic.publish("focusNode", newVal);	// publish
		}
	});
	focus.watch("activeStack", function(name, oldVal, newVal){
		dijit._activeStack = newVal;
	});

	focus.on("widget-blur", function(widget, by){
		topic.publish("widgetBlur", widget, by);	// publish
	});
	focus.on("widget-focus", function(widget, by){
		topic.publish("widgetFocus", widget, by);	// publish
	});

	lang.mixin(dijit, exports);

	/*===== return exports; =====*/
	return dijit;	// for back compat :-(
});

},
'dijit/selection':function(){
define([
	"dojo/_base/array",
	"dojo/dom", // dom.byId
	"dojo/_base/lang",
	"dojo/sniff", // has("ie") has("opera")
	"dojo/_base/window",
	"dijit/focus"
], function(array, dom, lang, has, baseWindow, focus){

	// module:
	//		dijit/selection

	// Note that this class is using feature detection, but doesn't use has() because sometimes on IE the outer window
	// may be running in standards mode (ie, IE9 mode) but an iframe may be in compatibility mode.   So the code path
	// used will vary based on the window.

	var SelectionManager = function(win){
		// summary:
		//		Class for monitoring / changing the selection (typically highlighted text) in a given window
		// win: Window
		//		The window to monitor/adjust the selection on.

		var doc = win.document;

		this.getType = function(){
			// summary:
			//		Get the selection type (like doc.select.type in IE).
			if(doc.getSelection){
				// W3C path
				var stype = "text";

				// Check if the actual selection is a CONTROL (IMG, TABLE, HR, etc...).
				var oSel;
				try{
					oSel = win.getSelection();
				}catch(e){ /*squelch*/ }

				if(oSel && oSel.rangeCount == 1){
					var oRange = oSel.getRangeAt(0);
					if(	(oRange.startContainer == oRange.endContainer) &&
						((oRange.endOffset - oRange.startOffset) == 1) &&
						(oRange.startContainer.nodeType != 3 /* text node*/)
						){
						stype = "control";
					}
				}
				return stype; //String
			}else{
				// IE6-8
				return doc.selection.type.toLowerCase();
			}
		};

		this.getSelectedText = function(){
			// summary:
			//		Return the text (no html tags) included in the current selection or null if no text is selected
			if(doc.getSelection){
				// W3C path
				var selection = win.getSelection();
				return selection ? selection.toString() : ""; //String
			}else{
				// IE6-8
				if(this.getType() == 'control'){
					return null;
				}
				return doc.selection.createRange().text;
			}
		};

		this.getSelectedHtml = function(){
			// summary:
			//		Return the html text of the current selection or null if unavailable
			if(doc.getSelection){
				// W3C path
				var selection = win.getSelection();
				if(selection && selection.rangeCount){
					var i;
					var html = "";
					for(i = 0; i < selection.rangeCount; i++){
						//Handle selections spanning ranges, such as Opera
						var frag = selection.getRangeAt(i).cloneContents();
						var div = doc.createElement("div");
						div.appendChild(frag);
						html += div.innerHTML;
					}
					return html; //String
				}
				return null;
			}else{
				// IE6-8
				if(this.getType() == 'control'){
					return null;
				}
				return doc.selection.createRange().htmlText;
			}
		};

		this.getSelectedElement = function(){
			// summary:
			//		Retrieves the selected element (if any), just in the case that
			//		a single element (object like and image or a table) is
			//		selected.
			if(this.getType() == "control"){
				if(doc.getSelection){
					// W3C path
					var selection = win.getSelection();
					return selection.anchorNode.childNodes[ selection.anchorOffset ];
				}else{
					// IE6-8
					var range = doc.selection.createRange();
					if(range && range.item){
						return doc.selection.createRange().item(0);
					}
				}
			}
			return null;
		};

		this.getParentElement = function(){
			// summary:
			//		Get the parent element of the current selection
			if(this.getType() == "control"){
				var p = this.getSelectedElement();
				if(p){ return p.parentNode; }
			}else{
				if(doc.getSelection){
					var selection = doc.getSelection();
					if(selection){
						var node = selection.anchorNode;
						while(node && (node.nodeType != 1)){ // not an element
							node = node.parentNode;
						}
						return node;
					}
				}else{
					var r = doc.selection.createRange();
					r.collapse(true);
					return r.parentElement();
				}
			}
			return null;
		};

		this.hasAncestorElement = function(/*String*/ tagName /* ... */){
			// summary:
			//		Check whether current selection has a  parent element which is
			//		of type tagName (or one of the other specified tagName)
			// tagName: String
			//		The tag name to determine if it has an ancestor of.
			return this.getAncestorElement.apply(this, arguments) != null; //Boolean
		};

		this.getAncestorElement = function(/*String*/ tagName /* ... */){
			// summary:
			//		Return the parent element of the current selection which is of
			//		type tagName (or one of the other specified tagName)
			// tagName: String
			//		The tag name to determine if it has an ancestor of.
			var node = this.getSelectedElement() || this.getParentElement();
			return this.getParentOfType(node, arguments); //DOMNode
		};

		this.isTag = function(/*DomNode*/ node, /*String[]*/ tags){
			// summary:
			//		Function to determine if a node is one of an array of tags.
			// node:
			//		The node to inspect.
			// tags:
			//		An array of tag name strings to check to see if the node matches.
			if(node && node.tagName){
				var _nlc = node.tagName.toLowerCase();
				for(var i=0; i<tags.length; i++){
					var _tlc = String(tags[i]).toLowerCase();
					if(_nlc == _tlc){
						return _tlc; // String
					}
				}
			}
			return "";
		};

		this.getParentOfType = function(/*DomNode*/ node, /*String[]*/ tags){
			// summary:
			//		Function to locate a parent node that matches one of a set of tags
			// node:
			//		The node to inspect.
			// tags:
			//		An array of tag name strings to check to see if the node matches.
			while(node){
				if(this.isTag(node, tags).length){
					return node; // DOMNode
				}
				node = node.parentNode;
			}
			return null;
		};

		this.collapse = function(/*Boolean*/ beginning){
			// summary:
			//		Function to collapse (clear), the current selection
			// beginning: Boolean
			//		Indicates whether to collapse the cursor to the beginning of the selection or end.
			if(doc.getSelection){
				// W3C path
				var selection = win.getSelection();
				if(selection.removeAllRanges){ // Mozilla
					if(beginning){
						selection.collapseToStart();
					}else{
						selection.collapseToEnd();
					}
				}else{ // Safari
					// pulled from WebCore/ecma/kjs_window.cpp, line 2536
					selection.collapse(beginning);
				}
			}else{
				// IE6-8
				var range = doc.selection.createRange();
				range.collapse(beginning);
				range.select();
			}
		};

		this.remove = function(){
			// summary:
			//		Function to delete the currently selected content from the document.
			var sel = doc.selection;
			if(doc.getSelection){
				// W3C path
				sel = win.getSelection();
				sel.deleteFromDocument();
				return sel; //Selection
			}else{
				// IE6-8
				if(sel.type.toLowerCase() != "none"){
					sel.clear();
				}
				return sel; //Selection
			}
		};

		this.selectElementChildren = function(/*DomNode*/ element, /*Boolean?*/ nochangefocus){
			// summary:
			//		clear previous selection and select the content of the node
			//		(excluding the node itself)
			// element: DOMNode
			//		The element you wish to select the children content of.
			// nochangefocus: Boolean
			//		Indicates if the focus should change or not.

			var range;
			element = dom.byId(element);
			if(doc.getSelection){
				// W3C
				var selection = win.getSelection();
				if(has("opera")){
					//Opera's selectAllChildren doesn't seem to work right
					//against <body> nodes and possibly others ... so
					//we use the W3C range API
					if(selection.rangeCount){
						range = selection.getRangeAt(0);
					}else{
						range = doc.createRange();
					}
					range.setStart(element, 0);
					range.setEnd(element,(element.nodeType == 3) ? element.length : element.childNodes.length);
					selection.addRange(range);
				}else{
					selection.selectAllChildren(element);
				}
			}else{
				// IE6-8
				range = element.ownerDocument.body.createTextRange();
				range.moveToElementText(element);
				if(!nochangefocus){
					try{
						range.select(); // IE throws an exception here if the widget is hidden.  See #5439
					}catch(e){ /* squelch */}
				}
			}
		};

		this.selectElement = function(/*DomNode*/ element, /*Boolean?*/ nochangefocus){
			// summary:
			//		clear previous selection and select element (including all its children)
			// element: DOMNode
			//		The element to select.
			// nochangefocus: Boolean
			//		Boolean indicating if the focus should be changed.  IE only.
			var range;
			element = dom.byId(element);	// TODO: remove for 2.0 or sooner, spec listed above doesn't allow for string
			if(doc.getSelection){
				// W3C path
				var selection = doc.getSelection();
				range = doc.createRange();
				if(selection.removeAllRanges){ // Mozilla
					// FIXME: does this work on Safari?
					if(has("opera")){
						//Opera works if you use the current range on
						//the selection if present.
						if(selection.getRangeAt(0)){
							range = selection.getRangeAt(0);
						}
					}
					range.selectNode(element);
					selection.removeAllRanges();
					selection.addRange(range);
				}
			}else{
				// IE6-8
				try{
					var tg = element.tagName ? element.tagName.toLowerCase() : "";
					if(tg === "img" || tg === "table"){
						range = baseWindow.body(doc).createControlRange();
					}else{
						range = baseWindow.body(doc).createRange();
					}
					range.addElement(element);
					if(!nochangefocus){
						range.select();
					}
				}catch(e){
					this.selectElementChildren(element, nochangefocus);
				}
			}
		};

		this.inSelection = function(node){
			// summary:
			//		This function determines if 'node' is
			//		in the current selection.
			// tags:
			//		public
			if(node){
				var newRange;
				var range;

				if(doc.getSelection){
					// WC3
					var sel = win.getSelection();
					if(sel && sel.rangeCount > 0){
						range = sel.getRangeAt(0);
					}
					if(range && range.compareBoundaryPoints && doc.createRange){
						try{
							newRange = doc.createRange();
							newRange.setStart(node, 0);
							if(range.compareBoundaryPoints(range.START_TO_END, newRange) === 1){
								return true;
							}
						}catch(e){ /* squelch */}
					}
				}else{
					// IE6-8, so we can't use the range object as the pseudo
					// range doesn't implement the boundary checking, we have to
					// use IE specific crud.
					range = doc.selection.createRange();
					try{
						newRange = node.ownerDocument.body.createTextRange();
						newRange.moveToElementText(node);
					}catch(e2){/* squelch */}
					if(range && newRange){
						// We can finally compare similar to W3C
						if(range.compareEndPoints("EndToStart", newRange) === 1){
							return true;
						}
					}
				}
			}
			return false; // Boolean
		};

		this.getBookmark = function(){
			// summary:
			//		Retrieves a bookmark that can be used with moveToBookmark to reselect the currently selected range.

			// TODO: merge additional code from Editor._getBookmark into this method

			var bm, rg, tg, sel = doc.selection, cf = focus.curNode;

			if(doc.getSelection){
				// W3C Range API for selections.
				sel = win.getSelection();
				if(sel){
					if(sel.isCollapsed){
						tg = cf? cf.tagName : "";
						if(tg){
							// Create a fake rangelike item to restore selections.
							tg = tg.toLowerCase();
							if(tg == "textarea" ||
								(tg == "input" && (!cf.type || cf.type.toLowerCase() == "text"))){
								sel = {
									start: cf.selectionStart,
									end: cf.selectionEnd,
									node: cf,
									pRange: true
								};
								return {isCollapsed: (sel.end <= sel.start), mark: sel}; //Object.
							}
						}
						bm = {isCollapsed:true};
						if(sel.rangeCount){
							bm.mark = sel.getRangeAt(0).cloneRange();
						}
					}else{
						rg = sel.getRangeAt(0);
						bm = {isCollapsed: false, mark: rg.cloneRange()};
					}
				}
			}else if(sel){
				// If the current focus was a input of some sort and no selection, don't bother saving
				// a native bookmark.  This is because it causes issues with dialog/page selection restore.
				// So, we need to create pseudo bookmarks to work with.
				tg = cf ? cf.tagName : "";
				tg = tg.toLowerCase();
				if(cf && tg && (tg == "button" || tg == "textarea" || tg == "input")){
					if(sel.type && sel.type.toLowerCase() == "none"){
						return {
							isCollapsed: true,
							mark: null
						}
					}else{
						rg = sel.createRange();
						return {
							isCollapsed: rg.text && rg.text.length?false:true,
							mark: {
								range: rg,
								pRange: true
							}
						};
					}
				}
				bm = {};

				//'IE' way for selections.
				try{
					// createRange() throws exception when dojo in iframe
					// and nothing selected, see #9632
					rg = sel.createRange();
					bm.isCollapsed = !(sel.type == 'Text' ? rg.htmlText.length : rg.length);
				}catch(e){
					bm.isCollapsed = true;
					return bm;
				}
				if(sel.type.toUpperCase() == 'CONTROL'){
					if(rg.length){
						bm.mark=[];
						var i=0,len=rg.length;
						while(i<len){
							bm.mark.push(rg.item(i++));
						}
					}else{
						bm.isCollapsed = true;
						bm.mark = null;
					}
				}else{
					bm.mark = rg.getBookmark();
				}
			}else{
				 0 && console.warn("No idea how to store the current selection for this browser!");
			}
			return bm; // Object
		};

		this.moveToBookmark = function(/*Object*/ bookmark){
			// summary:
			//		Moves current selection to a bookmark.
			// bookmark:
			//		This should be a returned object from getBookmark().

			// TODO: merge additional code from Editor._moveToBookmark into this method

			var mark = bookmark.mark;
			if(mark){
				if(doc.getSelection){
					// W3C Range API (FF, WebKit, Opera, etc)
					var sel = win.getSelection();
					if(sel && sel.removeAllRanges){
						if(mark.pRange){
							var n = mark.node;
							n.selectionStart = mark.start;
							n.selectionEnd = mark.end;
						}else{
							sel.removeAllRanges();
							sel.addRange(mark);
						}
					}else{
						 0 && console.warn("No idea how to restore selection for this browser!");
					}
				}else if(doc.selection && mark){
					//'IE' way.
					var rg;
					if(mark.pRange){
						rg = mark.range;
					}else if(lang.isArray(mark)){
						rg = doc.body.createControlRange();
						//rg.addElement does not have call/apply method, so can not call it directly
						//rg is not available in "range.addElement(item)", so can't use that either
						array.forEach(mark, function(n){
							rg.addElement(n);
						});
					}else{
						rg = doc.body.createTextRange();
						rg.moveToBookmark(mark);
					}
					rg.select();
				}
			}
		};

		this.isCollapsed = function(){
			// summary:
			//		Returns true if there is no text selected
			return this.getBookmark().isCollapsed;
		};
	};

	// singleton on the main window
	var selection = new SelectionManager(window);

	// hook for editor to use class
	selection.SelectionManager = SelectionManager;

	return selection;
});

},
'dijit/_base/place':function(){
define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/lang", // lang.isArray, lang.mixin
	"dojo/window", // windowUtils.getBox
	"../place",
	"../main"	// export to dijit namespace
], function(array, lang, windowUtils, place, dijit){

	// module:
	//		dijit/_base/place


	var exports = {
		// summary:
		//		Deprecated back compatibility module, new code should use dijit/place directly instead of using this module.
	};

	exports.getViewport = function(){
		// summary:
		//		Deprecated method to return the dimensions and scroll position of the viewable area of a browser window.
		//		New code should use windowUtils.getBox()

		return windowUtils.getBox();
	};

	exports.placeOnScreen = place.at;

	exports.placeOnScreenAroundElement = function(node, aroundNode, aroundCorners, layoutNode){
		// summary:
		//		Like dijit.placeOnScreenAroundNode(), except it accepts an arbitrary object
		//		for the "around" argument and finds a proper processor to place a node.
		//		Deprecated, new code should use dijit/place.around() instead.

		// Convert old style {"BL": "TL", "BR": "TR"} type argument
		// to style needed by dijit.place code:
		//		[
		//			{aroundCorner: "BL", corner: "TL" },
		//			{aroundCorner: "BR", corner: "TR" }
		//		]
		var positions;
		if(lang.isArray(aroundCorners)){
			positions = aroundCorners;
		}else{
			positions = [];
			for(var key in aroundCorners){
				positions.push({aroundCorner: key, corner: aroundCorners[key]});
			}
		}

		return place.around(node, aroundNode, positions, true, layoutNode);
	};

	exports.placeOnScreenAroundNode = exports.placeOnScreenAroundElement;
	/*=====
	exports.placeOnScreenAroundNode = function(node, aroundNode, aroundCorners, layoutNode){
		// summary:
		//		Position node adjacent or kitty-corner to aroundNode
		//		such that it's fully visible in viewport.
		//		Deprecated, new code should use dijit/place.around() instead.
	};
	=====*/

	exports.placeOnScreenAroundRectangle = exports.placeOnScreenAroundElement;
	/*=====
	exports.placeOnScreenAroundRectangle = function(node, aroundRect, aroundCorners, layoutNode){
		// summary:
		//		Like dijit.placeOnScreenAroundNode(), except that the "around"
		//		parameter is an arbitrary rectangle on the screen (x, y, width, height)
		//		instead of a dom node.
		//		Deprecated, new code should use dijit/place.around() instead.
	};
	=====*/

	exports.getPopupAroundAlignment = function(/*Array*/ position, /*Boolean*/ leftToRight){
		// summary:
		//		Deprecated method, unneeded when using dijit/place directly.
		//		Transforms the passed array of preferred positions into a format suitable for
		//		passing as the aroundCorners argument to dijit/place.placeOnScreenAroundElement.
		// position: String[]
		//		This variable controls the position of the drop down.
		//		It's an array of strings with the following values:
		//
		//		- before: places drop down to the left of the target node/widget, or to the right in
		//		  the case of RTL scripts like Hebrew and Arabic
		//		- after: places drop down to the right of the target node/widget, or to the left in
		//		  the case of RTL scripts like Hebrew and Arabic
		//		- above: drop down goes above target node
		//		- below: drop down goes below target node
		//
		//		The list is positions is tried, in order, until a position is found where the drop down fits
		//		within the viewport.
		// leftToRight: Boolean
		//		Whether the popup will be displaying in leftToRight mode.

		var align = {};
		array.forEach(position, function(pos){
			var ltr = leftToRight;
			switch(pos){
				case "after":
					align[leftToRight ? "BR" : "BL"] = leftToRight ? "BL" : "BR";
					break;
				case "before":
					align[leftToRight ? "BL" : "BR"] = leftToRight ? "BR" : "BL";
					break;
				case "below-alt":
					ltr = !ltr;
					// fall through
				case "below":
					// first try to align left borders, next try to align right borders (or reverse for RTL mode)
					align[ltr ? "BL" : "BR"] = ltr ? "TL" : "TR";
					align[ltr ? "BR" : "BL"] = ltr ? "TR" : "TL";
					break;
				case "above-alt":
					ltr = !ltr;
					// fall through
				case "above":
				default:
					// first try to align left borders, next try to align right borders (or reverse for RTL mode)
					align[ltr ? "TL" : "TR"] = ltr ? "BL" : "BR";
					align[ltr ? "TR" : "TL"] = ltr ? "BR" : "BL";
					break;
			}
		});
		return align;
	};

	lang.mixin(dijit, exports);

	/*===== return exports; =====*/
	return dijit;	// for back compat :-(
});

},
'dijit/_base/popup':function(){
define([
	"dojo/dom-class", // domClass.contains
	"dojo/_base/window",
	"../popup",
	"../BackgroundIframe"	// just loading for back-compat, in case client code is referencing it
], function(domClass, win, popup){

// module:
//		dijit/_base/popup

/*=====
return {
	// summary:
	//		Deprecated.   Old module for popups, new code should use dijit/popup directly.
};
=====*/


// Hack support for old API passing in node instead of a widget (to various methods)
var origCreateWrapper = popup._createWrapper;
popup._createWrapper = function(widget){
	if(!widget.declaredClass){
		// make fake widget to pass to new API
		widget = {
			_popupWrapper: (widget.parentNode && domClass.contains(widget.parentNode, "dijitPopup")) ?
				widget.parentNode : null,
			domNode: widget,
			destroy: function(){},
			ownerDocument: widget.ownerDocument,
			ownerDocumentBody: win.body(widget.ownerDocument)
		};
	}
	return origCreateWrapper.call(this, widget);
};

// Support old format of orient parameter
var origOpen = popup.open;
popup.open = function(/*__OpenArgs*/ args){
	// Convert old hash structure (ex: {"BL": "TL", ...}) of orient to format compatible w/new popup.open() API.
	// Don't do conversion for:
	//		- null parameter (that means to use the default positioning)
	//		- "R" or "L" strings used to indicate positioning for context menus (when there is no around node)
	//		- new format, ex: ["below", "above"]
	//		- return value from deprecated dijit.getPopupAroundAlignment() method,
	//			ex: ["below", "above"]
	if(args.orient && typeof args.orient != "string" && !("length" in args.orient)){
		var ary = [];
		for(var key in args.orient){
			ary.push({aroundCorner: key, corner: args.orient[key]});
		}
		args.orient = ary;
	}

	return origOpen.call(this, args);
};

return popup;
});

},
'dijit/_base/scroll':function(){
define([
	"dojo/window", // windowUtils.scrollIntoView
	"../main"	// export symbol to dijit
], function(windowUtils, dijit){
	// module:
	//		dijit/_base/scroll

	/*=====
	return {
		// summary:
		//		Back compatibility module, new code should use windowUtils directly instead of using this module.
	};
	=====*/

	dijit.scrollIntoView = function(/*DomNode*/ node, /*Object?*/ pos){
		// summary:
		//		Scroll the passed node into view, if it is not already.
		//		Deprecated, use `windowUtils.scrollIntoView` instead.

		windowUtils.scrollIntoView(node, pos);
	};
});

},
'dijit/_base/sniff':function(){
define([ "dojo/uacss" ], function(){

	// module:
	//		dijit/_base/sniff

	/*=====
	return {
		// summary:
		//		Deprecated, back compatibility module, new code should require dojo/uacss directly instead of this module.
	};
	=====*/
});

},
'dijit/_base/typematic':function(){
define(["../typematic"], function(){

	/*=====
	return {
		// summary:
		//		Deprecated, for back-compat, just loads top level module
	};
	=====*/

});

},
'dijit/typematic':function(){
define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/connect", // connect._keyPress
	"dojo/_base/lang", // lang.mixin, lang.hitch
	"dojo/on",
	"dojo/sniff", // has("ie")
	"./main"        // setting dijit.typematic global
], function(array, connect, lang, on, has, dijit){

	// module:
	//		dijit/typematic

	var typematic = (dijit.typematic = {
		// summary:
		//		These functions are used to repetitively call a user specified callback
		//		method when a specific key or mouse click over a specific DOM node is
		//		held down for a specific amount of time.
		//		Only 1 such event is allowed to occur on the browser page at 1 time.

		_fireEventAndReload: function(){
			this._timer = null;
			this._callback(++this._count, this._node, this._evt);

			// Schedule next event, timer is at most minDelay (default 10ms) to avoid
			// browser overload (particularly avoiding starving DOH robot so it never gets to send a mouseup)
			this._currentTimeout = Math.max(
				this._currentTimeout < 0 ? this._initialDelay :
					(this._subsequentDelay > 1 ? this._subsequentDelay : Math.round(this._currentTimeout * this._subsequentDelay)),
				this._minDelay);
			this._timer = setTimeout(lang.hitch(this, "_fireEventAndReload"), this._currentTimeout);
		},

		trigger: function(/*Event*/ evt, /*Object*/ _this, /*DOMNode*/ node, /*Function*/ callback, /*Object*/ obj, /*Number?*/ subsequentDelay, /*Number?*/ initialDelay, /*Number?*/ minDelay){
			// summary:
			//		Start a timed, repeating callback sequence.
			//		If already started, the function call is ignored.
			//		This method is not normally called by the user but can be
			//		when the normal listener code is insufficient.
			// evt:
			//		key or mouse event object to pass to the user callback
			// _this:
			//		pointer to the user's widget space.
			// node:
			//		the DOM node object to pass the the callback function
			// callback:
			//		function to call until the sequence is stopped called with 3 parameters:
			// count:
			//		integer representing number of repeated calls (0..n) with -1 indicating the iteration has stopped
			// node:
			//		the DOM node object passed in
			// evt:
			//		key or mouse event object
			// obj:
			//		user space object used to uniquely identify each typematic sequence
			// subsequentDelay:
			//		if > 1, the number of milliseconds until the 3->n events occur
			//		or else the fractional time multiplier for the next event's delay, default=0.9
			// initialDelay:
			//		the number of milliseconds until the 2nd event occurs, default=500ms
			// minDelay:
			//		the maximum delay in milliseconds for event to fire, default=10ms
			if(obj != this._obj){
				this.stop();
				this._initialDelay = initialDelay || 500;
				this._subsequentDelay = subsequentDelay || 0.90;
				this._minDelay = minDelay || 10;
				this._obj = obj;
				this._node = node;
				this._currentTimeout = -1;
				this._count = -1;
				this._callback = lang.hitch(_this, callback);
				this._evt = { faux: true };
				for(var attr in evt){
					if(attr != "layerX" && attr != "layerY"){ // prevent WebKit warnings
						var v = evt[attr];
						if(typeof v != "function" && typeof v != "undefined"){
							this._evt[attr] = v
						}
					}
				}
				this._fireEventAndReload();
			}
		},

		stop: function(){
			// summary:
			//		Stop an ongoing timed, repeating callback sequence.
			if(this._timer){
				clearTimeout(this._timer);
				this._timer = null;
			}
			if(this._obj){
				this._callback(-1, this._node, this._evt);
				this._obj = null;
			}
		},

		addKeyListener: function(/*DOMNode*/ node, /*Object*/ keyObject, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
			// summary:
			//		Start listening for a specific typematic key.
			//		See also the trigger method for other parameters.
			// keyObject:
			//		an object defining the key to listen for:
			//
			//		- keyCode: the keyCode (number) to listen for, used for non-printable keys
			//		- charCode: the charCode (number) to listen for, used for printable keys
			//		- charOrCode: deprecated, use keyCode or charCode
			//		- ctrlKey: desired ctrl key state to initiate the callback sequence:
			//			- pressed (true)
			//			- released (false)
			//			- either (unspecified)
			//		- altKey: same as ctrlKey but for the alt key
			//		- shiftKey: same as ctrlKey but for the shift key
			// returns:
			//		a connection handle

			// Setup keydown or keypress listener depending on whether keyCode or charCode was specified.
			// If charOrCode is specified use deprecated connect._keypress synthetic event (remove for 2.0)
			var type = "keyCode" in keyObject ? "keydown" : "charCode" in keyObject ? "keypress" : connect._keypress,
				attr = "keyCode" in keyObject ? "keyCode" : "charCode" in keyObject ? "charCode" : "charOrCode";

			var handles = [
				on(node, type, lang.hitch(this, function(evt){
					if(evt[attr] == keyObject[attr] &&
						(keyObject.ctrlKey === undefined || keyObject.ctrlKey == evt.ctrlKey) &&
						(keyObject.altKey === undefined || keyObject.altKey == evt.altKey) &&
						(keyObject.metaKey === undefined || keyObject.metaKey == (evt.metaKey || false)) && // IE doesn't even set metaKey
						(keyObject.shiftKey === undefined || keyObject.shiftKey == evt.shiftKey)){
						evt.stopPropagation();
						evt.preventDefault();
						typematic.trigger(evt, _this, node, callback, keyObject, subsequentDelay, initialDelay, minDelay);
					}else if(typematic._obj == keyObject){
						typematic.stop();
					}
				})),
				on(node, "keyup", lang.hitch(this, function(){
					if(typematic._obj == keyObject){
						typematic.stop();
					}
				}))
			];
			return { remove: function(){
				array.forEach(handles, function(h){
					h.remove();
				});
			} };
		},

		addMouseListener: function(/*DOMNode*/ node, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
			// summary:
			//		Start listening for a typematic mouse click.
			//		See the trigger method for other parameters.
			// returns:
			//		a connection handle
			var handles = [
				on(node, "mousedown", lang.hitch(this, function(evt){
					evt.preventDefault();
					typematic.trigger(evt, _this, node, callback, node, subsequentDelay, initialDelay, minDelay);
				})),
				on(node, "mouseup", lang.hitch(this, function(evt){
					if(this._obj){
						evt.preventDefault();
					}
					typematic.stop();
				})),
				on(node, "mouseout", lang.hitch(this, function(evt){
					if(this._obj){
						evt.preventDefault();
					}
					typematic.stop();
				})),
				on(node, "dblclick", lang.hitch(this, function(evt){
					evt.preventDefault();
					if(has("ie") < 9){
						typematic.trigger(evt, _this, node, callback, node, subsequentDelay, initialDelay, minDelay);
						setTimeout(lang.hitch(this, typematic.stop), 50);
					}
				}))
			];
			return { remove: function(){
				array.forEach(handles, function(h){
					h.remove();
				});
			} };
		},

		addListener: function(/*Node*/ mouseNode, /*Node*/ keyNode, /*Object*/ keyObject, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
			// summary:
			//		Start listening for a specific typematic key and mouseclick.
			//		This is a thin wrapper to addKeyListener and addMouseListener.
			//		See the addMouseListener and addKeyListener methods for other parameters.
			// mouseNode:
			//		the DOM node object to listen on for mouse events.
			// keyNode:
			//		the DOM node object to listen on for key events.
			// returns:
			//		a connection handle
			var handles = [
				this.addKeyListener(keyNode, keyObject, _this, callback, subsequentDelay, initialDelay, minDelay),
				this.addMouseListener(mouseNode, _this, callback, subsequentDelay, initialDelay, minDelay)
			];
			return { remove: function(){
				array.forEach(handles, function(h){
					h.remove();
				});
			} };
		}
	});

	return typematic;
});

},
'dijit/_base/wai':function(){
define([
	"dojo/dom-attr", // domAttr.attr
	"dojo/_base/lang", // lang.mixin
	"../main",	// export symbols to dijit
	"../hccss"			// not using this module directly, but loading it sets CSS flag on <html>
], function(domAttr, lang, dijit){

	// module:
	//		dijit/_base/wai

	var exports = {
		// summary:
		//		Deprecated methods for setting/getting wai roles and states.
		//		New code should call setAttribute()/getAttribute() directly.
		//
		//		Also loads hccss to apply dj_a11y class to root node if machine is in high-contrast mode.

		hasWaiRole: function(/*Element*/ elem, /*String?*/ role){
			// summary:
			//		Determines if an element has a particular role.
			// returns:
			//		True if elem has the specific role attribute and false if not.
			//		For backwards compatibility if role parameter not provided,
			//		returns true if has a role
			var waiRole = this.getWaiRole(elem);
			return role ? (waiRole.indexOf(role) > -1) : (waiRole.length > 0);
		},

		getWaiRole: function(/*Element*/ elem){
			// summary:
			//		Gets the role for an element (which should be a wai role).
			// returns:
			//		The role of elem or an empty string if elem
			//		does not have a role.
			 return lang.trim((domAttr.get(elem, "role") || "").replace("wairole:",""));
		},

		setWaiRole: function(/*Element*/ elem, /*String*/ role){
			// summary:
			//		Sets the role on an element.
			// description:
			//		Replace existing role attribute with new role.

			domAttr.set(elem, "role", role);
		},

		removeWaiRole: function(/*Element*/ elem, /*String*/ role){
			// summary:
			//		Removes the specified role from an element.
			//		Removes role attribute if no specific role provided (for backwards compat.)

			var roleValue = domAttr.get(elem, "role");
			if(!roleValue){ return; }
			if(role){
				var t = lang.trim((" " + roleValue + " ").replace(" " + role + " ", " "));
				domAttr.set(elem, "role", t);
			}else{
				elem.removeAttribute("role");
			}
		},

		hasWaiState: function(/*Element*/ elem, /*String*/ state){
			// summary:
			//		Determines if an element has a given state.
			// description:
			//		Checks for an attribute called "aria-"+state.
			// returns:
			//		true if elem has a value for the given state and
			//		false if it does not.

			return elem.hasAttribute ? elem.hasAttribute("aria-"+state) : !!elem.getAttribute("aria-"+state);
		},

		getWaiState: function(/*Element*/ elem, /*String*/ state){
			// summary:
			//		Gets the value of a state on an element.
			// description:
			//		Checks for an attribute called "aria-"+state.
			// returns:
			//		The value of the requested state on elem
			//		or an empty string if elem has no value for state.

			return elem.getAttribute("aria-"+state) || "";
		},

		setWaiState: function(/*Element*/ elem, /*String*/ state, /*String*/ value){
			// summary:
			//		Sets a state on an element.
			// description:
			//		Sets an attribute called "aria-"+state.

			elem.setAttribute("aria-"+state, value);
		},

		removeWaiState: function(/*Element*/ elem, /*String*/ state){
			// summary:
			//		Removes a state from an element.
			// description:
			//		Sets an attribute called "aria-"+state.

			elem.removeAttribute("aria-"+state);
		}
	};

	lang.mixin(dijit, exports);

	/*===== return exports; =====*/
	return dijit;	// for back compat :-(
});

},
'dijit/_base/window':function(){
define([
	"dojo/window", // windowUtils.get
	"../main"	// export symbol to dijit
], function(windowUtils, dijit){
	// module:
	//		dijit/_base/window

	/*=====
	return {
		// summary:
		//		Back compatibility module, new code should use windowUtils directly instead of using this module.
	};
	=====*/

	dijit.getDocumentWindow = function(doc){
		return windowUtils.get(doc);
	};
});

},
'dijit/form/ComboButton':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/keys", // keys
	"../focus", // focus.focus()
	"./DropDownButton",
	"dojo/text!./templates/ComboButton.html",
	"../a11yclick"	// template uses ondijitclick
], function(declare, keys, focus, DropDownButton, template){

	// module:
	//		dijit/form/ComboButton

	return declare("dijit.form.ComboButton", DropDownButton, {
		// summary:
		//		A combination button and drop-down button.
		//		Users can click one side to "press" the button, or click an arrow
		//		icon to display the drop down.
		//
		// example:
		// |	<button data-dojo-type="dijit/form/ComboButton" onClick="...">
		// |		<span>Hello world</span>
		// |		<div data-dojo-type="dijit/Menu">...</div>
		// |	</button>
		//
		// example:
		// |	var button1 = new ComboButton({label: "hello world", onClick: foo, dropDown: "myMenu"});
		// |	dojo.body().appendChild(button1.domNode);
		//

		templateString: template,

		// Map widget attributes to DOMNode attributes.
		_setIdAttr: "", // override _FormWidgetMixin which puts id on the focusNode
		_setTabIndexAttr: ["focusNode", "titleNode"],
		_setTitleAttr: "titleNode",

		// optionsTitle: String
		//		Text that describes the options menu (accessibility)
		optionsTitle: "",

		baseClass: "dijitComboButton",

		// Set classes like dijitButtonContentsHover or dijitArrowButtonActive depending on
		// mouse action over specified node
		cssStateNodes: {
			"buttonNode": "dijitButtonNode",
			"titleNode": "dijitButtonContents",
			"_popupStateNode": "dijitDownArrowButton"
		},

		_focusedNode: null,

		_onButtonKeyDown: function(/*Event*/ evt){
			// summary:
			//		Handler for right arrow key when focus is on left part of button
			if(evt.keyCode == keys[this.isLeftToRight() ? "RIGHT_ARROW" : "LEFT_ARROW"]){
				focus.focus(this._popupStateNode);
				evt.stopPropagation();
				evt.preventDefault();
			}
		},

		_onArrowKeyDown: function(/*Event*/ evt){
			// summary:
			//		Handler for left arrow key when focus is on right part of button
			if(evt.keyCode == keys[this.isLeftToRight() ? "LEFT_ARROW" : "RIGHT_ARROW"]){
				focus.focus(this.titleNode);
				evt.stopPropagation();
				evt.preventDefault();
			}
		},

		focus: function(/*String*/ position){
			// summary:
			//		Focuses this widget to according to position, if specified,
			//		otherwise on arrow node
			// position:
			//		"start" or "end"
			if(!this.disabled){
				focus.focus(position == "start" ? this.titleNode : this._popupStateNode);
			}
		}
	});
});

},
'dijit/form/ToggleButton':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.deprecated
	"./Button",
	"./_ToggleButtonMixin"
], function(declare, kernel, Button, _ToggleButtonMixin){

	// module:
	//		dijit/form/ToggleButton


	return declare("dijit.form.ToggleButton", [Button, _ToggleButtonMixin], {
		// summary:
		//		A templated button widget that can be in two states (checked or not).
		//		Can be base class for things like tabs or checkbox or radio buttons.

		baseClass: "dijitToggleButton",

		setChecked: function(/*Boolean*/ checked){
			// summary:
			//		Deprecated.  Use set('checked', true/false) instead.
			kernel.deprecated("setChecked("+checked+") is deprecated. Use set('checked',"+checked+") instead.", "", "2.0");
			this.set('checked', checked);
		}
	});
});

},
'dijit/form/_ToggleButtonMixin':function(){
define([
	"dojo/_base/declare", // declare
	"dojo/dom-attr" // domAttr.set
], function(declare, domAttr){

	// module:
	//		dijit/form/_ToggleButtonMixin

	return declare("dijit.form._ToggleButtonMixin", null, {
		// summary:
		//		A mixin to provide functionality to allow a button that can be in two states (checked or not).

		// checked: Boolean
		//		Corresponds to the native HTML `<input>` element's attribute.
		//		In markup, specified as "checked='checked'" or just "checked".
		//		True if the button is depressed, or the checkbox is checked,
		//		or the radio button is selected, etc.
		checked: false,

		// aria-pressed for toggle buttons, and aria-checked for checkboxes
		_aria_attr: "aria-pressed",

		_onClick: function(/*Event*/ evt){
			var original = this.checked;
			this._set('checked', !original); // partially set the toggled value, assuming the toggle will work, so it can be overridden in the onclick handler
			var ret = this.inherited(arguments); // the user could reset the value here
			this.set('checked', ret ? this.checked : original); // officially set the toggled or user value, or reset it back
			return ret;
		},

		_setCheckedAttr: function(/*Boolean*/ value, /*Boolean?*/ priorityChange){
			this._set("checked", value);
			var node = this.focusNode || this.domNode;
			if(this._created){ // IE is not ready to handle checked attribute (affects tab order)
				// needlessly setting "checked" upsets IE's tab order
				if(domAttr.get(node, "checked") != !!value){
					domAttr.set(node, "checked", !!value); // "mixed" -> true
				}
			}
			node.setAttribute(this._aria_attr, String(value)); // aria values should be strings
			this._handleOnChange(value, priorityChange);
		},

		postCreate: function(){ // use postCreate instead of startup so users forgetting to call startup are OK
			this.inherited(arguments);
			var node = this.focusNode || this.domNode;
			if(this.checked){
				// need this here instead of on the template so IE8 tab order works
				node.setAttribute('checked', 'checked');
			}

			// Update our reset value if it hasn't yet been set (because this.set()
			// is only called when there *is* a value)
			if(this._resetValue === undefined){
				this._lastValueReported = this._resetValue = this.checked;
			}
		},

		reset: function(){
			// summary:
			//		Reset the widget's value to what it was at initialization time

			this._hasBeenBlurred = false;

			// set checked state to original setting
			this.set('checked', this.params.checked || false);
		}
	});
});

},
'url:dijit/form/templates/TextBox.html':"<div class=\"dijit dijitReset dijitInline dijitLeft\" id=\"widget_${id}\" role=\"presentation\"\n\t><div class=\"dijitReset dijitInputField dijitInputContainer\"\n\t\t><input class=\"dijitReset dijitInputInner\" data-dojo-attach-point='textbox,focusNode' autocomplete=\"off\"\n\t\t\t${!nameAttrSetting} type='${type}'\n\t/></div\n></div>\n",
'url:dijit/form/templates/Button.html':"<span class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><span class=\"dijitReset dijitInline dijitButtonNode\"\n\t\tdata-dojo-attach-event=\"ondijitclick:__onClick\" role=\"presentation\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"titleNode,focusNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\"></span\n\t\t\t><span class=\"dijitReset dijitToggleButtonIconChar\">&#x25CF;</span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t\tdata-dojo-attach-point=\"containerNode\"\n\t\t\t></span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\"\n\t\tdata-dojo-attach-event=\"onclick:_onClick\"\n\t\ttabIndex=\"-1\" aria-hidden=\"true\" data-dojo-attach-point=\"valueNode\"\n/></span>\n",
'url:dijit/form/templates/DropDownButton.html':"<span class=\"dijit dijitReset dijitInline\"\n\t><span class='dijitReset dijitInline dijitButtonNode'\n\t\tdata-dojo-attach-event=\"ondijitclick:__onClick\" data-dojo-attach-point=\"_buttonNode\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"focusNode,titleNode,_arrowWrapperNode,_popupStateNode\"\n\t\t\trole=\"button\" aria-haspopup=\"true\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\"\n\t\t\t\tdata-dojo-attach-point=\"iconNode\"\n\t\t\t></span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tdata-dojo-attach-point=\"containerNode\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t></span\n\t\t\t><span class=\"dijitReset dijitInline dijitArrowButtonInner\"></span\n\t\t\t><span class=\"dijitReset dijitInline dijitArrowButtonChar\">&#9660;</span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\" tabIndex=\"-1\"\n\t\tdata-dojo-attach-event=\"onclick:_onClick\" data-dojo-attach-point=\"valueNode\" aria-hidden=\"true\"\n/></span>\n",
'url:dijit/form/templates/ComboButton.html':"<table class=\"dijit dijitReset dijitInline dijitLeft\"\n\tcellspacing='0' cellpadding='0' role=\"presentation\"\n\t><tbody role=\"presentation\"><tr role=\"presentation\"\n\t\t><td class=\"dijitReset dijitStretch dijitButtonNode\" data-dojo-attach-point=\"buttonNode\" data-dojo-attach-event=\"ondijitclick:__onClick,onkeydown:_onButtonKeyDown\"\n\t\t><div id=\"${id}_button\" class=\"dijitReset dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"titleNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><div class=\"dijitReset dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\" role=\"presentation\"></div\n\t\t\t><div class=\"dijitReset dijitInline dijitButtonText\" id=\"${id}_label\" data-dojo-attach-point=\"containerNode\" role=\"presentation\"></div\n\t\t></div\n\t\t></td\n\t\t><td id=\"${id}_arrow\" class='dijitReset dijitRight dijitButtonNode dijitArrowButton'\n\t\t\tdata-dojo-attach-point=\"_popupStateNode,focusNode,_buttonNode\"\n\t\t\tdata-dojo-attach-event=\"onkeydown:_onArrowKeyDown\"\n\t\t\ttitle=\"${optionsTitle}\"\n\t\t\trole=\"button\" aria-haspopup=\"true\"\n\t\t\t><div class=\"dijitReset dijitArrowButtonInner\" role=\"presentation\"></div\n\t\t\t><div class=\"dijitReset dijitArrowButtonChar\" role=\"presentation\">&#9660;</div\n\t\t></td\n\t\t><td style=\"display:none !important;\"\n\t\t\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" data-dojo-attach-point=\"valueNode\"\n\t\t\t\tclass=\"dijitOffScreen\" aria-hidden=\"true\" data-dojo-attach-event=\"onclick:_onClick\"\n\t\t/></td></tr></tbody\n></table>\n",
'*now':function(r){r(['dojo/i18n!*preload*p3/layer/nls/p3user*["ar","ca","cs","da","de","el","en-gb","en-us","es-es","fi-fi","fr-fr","he-il","hu","it-it","ja-jp","ko-kr","nl-nl","nb","pl","pt-br","pt-pt","ru","sk","sl","sv","th","tr","zh-tw","zh-cn","ROOT"]']);}
}});
define("p3/layer/p3user", [], 1);
