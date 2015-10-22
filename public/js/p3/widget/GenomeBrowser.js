define([
	"dojo/_base/declare", "dijit/_WidgetBase","JBrowse/Browser",
	"dojo/dom-construct", "dojo/_base/lang","dojo/dom-geometry",
	"dojo/dom-style","dojo/dom-construct",'dojo/_base/array',
	"dojo/_base/Deferred","dojo/DeferredList","lazyload",
	"dojo/request"
], function(
	declare, WidgetBase, JBrowser,
	domConstruct, lang, domGeometry, 
	domStyle, domConstruct,array,
	Deferred,DeferredList,lazyLoad,
	request
){


	var Browser = declare([JBrowser],{
		makeFullViewLink: function(){
				return domConstruct.create("span",{});
		},
		loadRefSeqs: function() {
		    return this._milestoneFunction( 'loadRefSeqs', function( deferred ) {
		        // load our ref seqs
		        if( typeof this.config.refSeqs == 'string' )
		            this.config.refSeqs = { url: this.resolveUrl(this.config.refSeqs) };
		        var thisB = this;
		        console.log("refSeqs url: ", this.config.refSeqs.url)
		        request(this.config.refSeqs.url, { handleAs: 'text' } )
		            .then( function(o) {
					console.log(" call addREfseqs fromJson: ", o);
		                       thisB.addRefseqs( dojo.fromJson(o) );
		                       deferred.resolve({success:true});
		                   },
		                   function( e ) {
		                       deferred.reject( 'Could not load reference sequence definitions. '+e );
		                   }
		                 );
		    });
		},
		_loadCSS: function( css ) {
		    var deferred = new Deferred();
		    if( typeof css == 'string' ) {
		        // if it has '{' in it, it probably is not a URL, but is a string of CSS statements
		        if( css.indexOf('{') > -1 ) {
		            dojo.create('style', { "data-from": 'JBrowse Config', type: 'text/css', innerHTML: css }, document.head );
		            deferred.resolve(true);
		        }
		        // otherwise, it must be a URL
		        else {
		            css = { url: css };
		        }
		    }
		    if( typeof css == 'object' ) {
		        LazyLoad.css( css.url, function() { deferred.resolve(true); } );
		    }
		    return deferred;
		},
		initPlugins: function() {
		    return this._milestoneFunction( 'initPlugins', function( deferred ) {
		        this.plugins = {};

		        var plugins = this.config.plugins || this.config.Plugins || {};

		        // coerce plugins to array of objects
		        if( ! lang.isArray(plugins) && ! plugins.name ) {
		            // plugins like  { Foo: {...}, Bar: {...} }
		            plugins = function() {
		                var newplugins = [];
		                for( var pname in plugins ) {
		                    if( !( 'name' in plugins[pname] ) ) {
		                        plugins[pname].name = pname;
		                    }
		                    newplugins.push( plugins[pname] );
		                }
		                return newplugins;
		            }.call(this);
		        }
		        if( ! lang.isArray( plugins ) )
		            plugins = [ plugins ];

		        plugins.unshift.apply( plugins, this._corePlugins() );

		        // coerce string plugin names to {name: 'Name'}
		        plugins = array.map( plugins, function( p ) {
		            return typeof p == 'object' ? p : { 'name': p };
		        });

		        if( ! plugins ) {
		            deferred.resolve({success: true});
		            return;
		        }

		        // set default locations for each plugin
		        array.forEach( plugins, function(p) {
		            if( !( 'location' in p ))
		                p.location = 'plugins/'+p.name;

		            var resolved = this.resolveUrl( p.location );
		            console.log("RESOLVED: ", resolved)
		            // figure out js path
		            if( !( 'js' in p ))
		                p.js = resolved+"/js"; //URL resolution for this is taken care of by the JS loader
		            if( p.js.charAt(0) != '/' && ! /^https?:/i.test( p.js ) )
		                p.js = '../'+p.js;

		            // figure out css path
		            if( !( 'css' in p ))
		                p.css = resolved+"/css";

		            console.log("P: ", p)
		        },this);

		        var pluginDeferreds = array.map( plugins, function(p) {
		            return new Deferred();
		        });

		        // fire the "all plugins done" deferred when all of the plugins are done loading
		        (new DeferredList( pluginDeferreds ))
		            .then( function() { deferred.resolve({success: true}); });

		        require( {
		                     packages: array.map( plugins, function(p) {
		                                              return {
		                                                  name: p.name,
		                                                  location: p.js
		                                              };
		                                          }, this )
		                 },
		                 array.map( plugins, function(p) { return p.name; } ),
		                 dojo.hitch( this, function() {
		                     array.forEach( arguments, function( pluginClass, i ) {
		                             var plugin = plugins[i];
		                             var thisPluginDone = pluginDeferreds[i];
		                             if( typeof pluginClass == 'string' ) {
		                                 console.error("could not load plugin "+plugin.name+": "+pluginClass);
		                             } else {
		                                 // make the plugin's arguments out of
		                                 // its little obj in 'plugins', and
		                                 // also anything in the top-level
		                                 // conf under its plugin name
		                                 var args = dojo.mixin(
		                                     dojo.clone( plugins[i] ),
		                                     { config: this.config[ plugin.name ]||{} });
		                                 args.browser = this;
		                                 args = dojo.mixin( args, { browser: this } );

		                                 // load its css

		                                 var cssLoaded = this._loadCSS(
		                                     { url: plugin.css+'/main.css' }
		                                 );
		                                 cssLoaded.then( function() {
		                                     thisPluginDone.resolve({success:true});
		                                 });

		                                 // give the plugin access to the CSS
		                                 // promise so it can know when its
		                                 // CSS is ready
		                                 args.cssLoaded = cssLoaded;

		                                 // instantiate the plugin
		                                 this.plugins[ plugin.name ] = new pluginClass( args );
		                             }
		                         }, this );
		                  }));
		    });
		}
	});

	return declare([WidgetBase], {
		state: null,
		jbrowseConfig: null,

		onSetState: function(attr,oldVal,state){
			var jbrowseConfig = {
				containerID: this.id + "_browserContainer",
				dataRoot: "sample_data/json/volvox",
				browserRoot: "/public/js/jbrowse.repo/",
				queryParams: (state && state.hashParams)?state.hashParams:{},
				location: (state && state.hashParams)?state.hashParams.loc:undefined,
				forceTracks: (state && state.hashParams)?state.hashParams.tracks:undefined,
                initialHighlight: (state && state.hashParams)?state.hashParams.highlight:undefined,
				show_nav: (state && state.hashParams)?state.hashParams.nav:undefined,
				show_tracklist: (state && state.hashParams)?state.hashParams.tracklist:undefined,
				show_overview: (state && state.hashParams)?state.hashParams.overview:undefined,
				show_menu: (state && state.hashParams)?state.hashParams.menu:undefined,
				stores: { url: { type: "JBrowse/Store/SeqFeature/FromConfig", features: [] } },
				style: "border: 2px solid green;",
				show_nav: true,
				show_tracklist: true
			}

			if (state && state.hashParams && state.hashParams.addFeatures){
				jbrowseConfig.stores.url.features = JSON.parse(state.hashParams.addFeatures)
			}

            if(state && state.hashParams && state.hashParams.addTracks ) {
                jbrowseConfig.tracks = JSON.parse( state.hashParams.addTracks );
            }
			// if there is ?addStores in the query params, add
			// those store configurations to our initial
			// configuration
			if( state && state.hashParams && state.hashParams.addStores ) {
			   jbrowseConfig.stores = JSON.parse( state.hashParams.addStores );
			}

			this.set("jbrowseConfig", jbrowseConfig)

		},

		onSetJBrowseConfig: function(attr,oldVal,config){
			if (!this.visible){ return; }

			if (!this._browser){
				console.log("Browser config: ", config);

				this._browser = new Browser( config )
			}else{
				console.log("Browser Already Exists");
			}
		},
		postCreate: function(){
			this.inherited(arguments);
			this.containerNode = domConstruct.create("div",{id: this.id + "_browserContainer",style: {padding: "0px", margin: "4px", border: "1px solid #333"}},this.domNode);
			this.watch("state", lang.hitch(this, "onSetState"));
			this.watch("jbrowseConfig", lang.hitch(this, "onSetJBrowseConfig"));
		},

		visible: false,
		_setVisibleAttr: function(visible) {
			// console.log("GridContainer setVisible: ", visible)
			this.visible = visible;
			if (this.visible && !this._firstView) {
				// console.log("Trigger First View: ", this.id)
				this.onFirstView();
			}
		},


		onFirstView: function(){
			if (this._firstView) {
				return;
			}
			if (!this._browser){
				this._browser = new Browser( this.jbrowseConfig )
			}
		},

		resize: function(changeSize, resultSize){
		    var node = this.domNode;

		    // set margin box size, unless it wasn't specified, in which case use current size
		    if(changeSize){

		            domGeometry.setMarginBox(node, changeSize);
		    }

		    // If either height or width wasn't specified by the user, then query node for it.
		    // But note that setting the margin box and then immediately querying dimensions may return
		    // inaccurate results, so try not to depend on it.

		    var mb = resultSize || {};
		    lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
		    if( !("h" in mb) || !("w" in mb) ){

		            mb = lang.mixin(domGeometry.getMarginBox(node), mb);    // just use domGeometry.marginBox() to fill in missing values
		    }

		    // Compute and save the size of my border box and content box
		    // (w/out calling domGeometry.getContentBox() since that may fail if size was recently set)
		    var cs = domStyle.getComputedStyle(node);
		    var me = domGeometry.getMarginExtents(node, cs);
		    var be = domGeometry.getBorderExtents(node, cs);
		    var bb = (this._borderBox = {
		            w: mb.w - (me.w + be.w),
		            h: mb.h - (me.h + be.h)
		    });
		    var pe = domGeometry.getPadExtents(node, cs);
		    this._contentBox = {
		            l: domStyle.toPixelValue(node, cs.paddingLeft),
		            t: domStyle.toPixelValue(node, cs.paddingTop),
		            w: bb.w - pe.w,
		            h: bb.h - pe.h
		    };

  			domGeometry.setMarginBox(this.containerNode,this._contentBox)
		    // this._browser.resize();
		}
	});
});
