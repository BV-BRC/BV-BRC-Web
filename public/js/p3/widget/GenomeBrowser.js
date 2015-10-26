define([
	"dojo/_base/declare", "dijit/_WidgetBase","JBrowse/Browser",
	"dojo/dom-construct", "dojo/_base/lang","dojo/dom-geometry",
	"dojo/dom-style","dojo/dom-construct",'dojo/_base/array',
	"dojo/_base/Deferred","dojo/DeferredList","lazyload",
	"dojo/request",
    'dijit/form/ComboBox',
	'dijit/form/Button',
	'dijit/form/Select',
	'dijit/form/ToggleButton',
	'dijit/form/DropDownButton',
	'dijit/DropDownMenu',
	'dijit/MenuItem',
	'dojox/form/TriStateCheckBox',
	"JBrowse/Util"
], function(
	declare, WidgetBase, JBrowser,
	domConstruct, lang, domGeometry, 
	domStyle, domConstruct,array,
	Deferred,DeferredList,lazyLoad,
	request,
	dijitComboBox,
    dijitButton,
    dijitSelectBox,
    dijitToggleButton,
    dijitDropDownButton,
    dijitDropDownMenu,
    dijitMenuItem,
    dojoxTriStateCheckBox,
    Util
){


	var Browser = declare([JBrowser],{
		makeFullViewLink: function(){
				return domConstruct.create("span",{});
		},

		createNavBox: function( parent ) {
    var thisB = this;
    var navbox = dojo.create( 'div', {"class": "navbox" , style: { 'text-align': 'center', "position": "relative" } }, parent );

    // container adds a white backdrop to the locationTrap.
    var locationTrapContainer = dojo.create('div', {className: 'locationTrapContainer'}, navbox );

    this.locationTrap = dojo.create('div', {className: 'locationTrap'}, locationTrapContainer );

    var four_nbsp = String.fromCharCode(160); four_nbsp = four_nbsp + four_nbsp + four_nbsp + four_nbsp;
    navbox.appendChild(document.createTextNode( four_nbsp ));

    // var moveLeft = document.createElement("i");
    //moveLeft.type = "image";
    // moveLeft.src = this.resolveUrl( "img/Empty.png" );
    // moveLeft.id = "moveLeft";
    // moveLeft.className = "fa icon-filter fa-2x"; //"icon nav";
    // navbox.appendChild(moveLeft);
    var moveLeft = domConstruct.create("I", {"class": "fa icon-arrow-left2 fa-2x"}, navbox);
    dojo.connect( moveLeft, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.slide(0.9);
                  });

    var moveRight = document.createElement("i");
    //moveRight.type = "image";
    // moveRight.src = this.resolveUrl( "img/Empty.png" );
    // moveRight.id="moveRight";
    moveRight.className = "fa icon-arrow-right2 fa-2x"; //"icon nav";
    navbox.appendChild(moveRight);
    dojo.connect( moveRight, "click", this,
                 function(event) {
                      dojo.stopEvent(event);
                      this.view.slide(-0.9);
                  });

    

    var bigZoomOut = domConstruct.create("I", {"class": "fa icon-search-minus",style: {"font-size":"2.5em"}}, navbox);
    dojo.connect( bigZoomOut, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomOut(undefined, undefined, 2);
                  });


    var zoomOut = domConstruct.create("I", {"class": "fa icon-search-minus fa-2x"}, navbox);
    dojo.connect( zoomOut, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomOut();
                  });

    var zoomIn = domConstruct.create("I", {"class": "fa icon-search-plus fa-2x"}, navbox);
    dojo.connect( zoomIn, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomIn();
                  });
  
    var bigZoomIn = domConstruct.create("I", {"class": "fa icon-search-plus", style: {"font-size":"2.5em"}}, navbox);
    dojo.connect( bigZoomIn, "click", this,
                  function(event) {
                      dojo.stopEvent(event);
                      this.view.zoomIn(undefined, undefined, 2);
                  });


    // if we have fewer than 30 ref seqs, or `refSeqDropdown: true` is
    // set in the config, then put in a dropdown box for selecting
    // reference sequences
    var refSeqSelectBoxPlaceHolder = dojo.create('div', {style: "display:inline-block;"}, navbox );

    // make the location box
    this.locationBox = new dijitComboBox(
        {
            id: "location",
            name: "location",
            style: { width: '75px' },
            maxLength: 400,
            searchAttr: "name"
        },
        dojo.create('input', {}, navbox) );
    this.afterMilestone( 'loadNames', dojo.hitch(this, function() {
        if( this.nameStore )
            this.locationBox.set( 'store', this.nameStore );
    }));

    this.locationBox.focusNode.spellcheck = false;
    dojo.query('div.dijitArrowButton', this.locationBox.domNode ).orphan();
    dojo.connect( this.locationBox.focusNode, "keydown", this, function(event) {
                      if( event.keyCode == keys.ESCAPE ) {
                          this.locationBox.set('value','');
                      }
                      else if (event.keyCode == keys.ENTER) {
                          this.locationBox.closeDropDown(false);
                          this.navigateTo( this.locationBox.get('value') );
                          this.goButton.set('disabled',true);
                          dojo.stopEvent(event);
                      } else {
                          this.goButton.set('disabled', false);
                      }
                  });
    dojo.connect( navbox, 'onselectstart', function(evt) { evt.stopPropagation(); return true; });
    // monkey-patch the combobox code to make a few modifications
    (function(){

         // add a moreMatches class to our hacked-in "more options" option
         var dropDownProto = eval(this.locationBox.dropDownClass).prototype;
         var oldCreateOption = dropDownProto._createOption;
         dropDownProto._createOption = function( item ) {
             var option = oldCreateOption.apply( this, arguments );
             if( item.hitLimit )
                 dojo.addClass( option, 'moreMatches');
             return option;
         };

         // prevent the "more matches" option from being clicked
         var oldOnClick = dropDownProto.onClick;
         dropDownProto.onClick = function( node ) {
             if( dojo.hasClass(node, 'moreMatches' ) )
                 return null;
             return oldOnClick.apply( this, arguments );
         };
    }).call(this);

    // make the 'Go' button'
    this.goButton = new dijitButton(
        {
            label: 'Go',
            onClick: dojo.hitch( this, function(event) {
                this.navigateTo(this.locationBox.get('value'));
                this.goButton.set('disabled',true);
                dojo.stopEvent(event);
            })
        }, dojo.create('button',{},navbox));
    this.highlightButtonPreviousState = false;
    this.highlightButton = new dojoxTriStateCheckBox({
        //label: 'Highlight',
        title: 'highlight a region',
        states:[false, true, "mixed"],
        onChange: function() {
            if( this.get('checked')==true ) {
                thisB.view._rubberStop();
                thisB.view.behaviorManager.swapBehaviors('normalMouse','highlightingMouse');
            } else if( this.get('checked')==false) {
                var h = thisB.getHighlight();
                if( h ) {
                    thisB.clearHighlight();
                    thisB.view.redrawRegion( h ); 
                }
            }
            else { // mixed
                // Uncheck since user is cycling three-state instead
                // of programmatically landing in mixed state
                if( thisB.highlightButtonPreviousState != true ) {
                    thisB.highlightButton.set('checked', false);
                }
                else {
                    thisB.highlightButtonPreviousState = false;
                }
                thisB.view._rubberStop();
                thisB.view.behaviorManager.swapBehaviors('highlightingMouse','normalMouse');
            }
        }
    }, dojo.create('button',{},navbox));

    this.subscribe('/jbrowse/v1/n/globalHighlightChanged',
                   function() { thisB.highlightButton.set('checked',false); });


    this.afterMilestone('loadRefSeqs', dojo.hitch( this, function() {

        // make the refseq selection dropdown
        if( this.refSeqOrder && this.refSeqOrder.length ) {
            var max = this.config.refSeqSelectorMaxSize || 30;
            var numrefs = Math.min( max, this.refSeqOrder.length);
            var options = [];
            for ( var i = 0; i < numrefs; i++ ) {
                options.push( { label: this.refSeqOrder[i], value: this.refSeqOrder[i] } );
            }
            var tooManyMessage = '(first '+numrefs+' ref seqs)';
            if( this.refSeqOrder.length > max ) {
                options.push( { label: tooManyMessage , value: tooManyMessage, disabled: true } );
            }
            this.refSeqSelectBox = new dijitSelectBox({
                name: 'refseq',
                value: this.refSeq ? this.refSeq.name : null,
                options: options,
                onChange: dojo.hitch(this, function( newRefName ) {
                    // don't trigger nav if it's the too-many message
                    if( newRefName == tooManyMessage ) {
                        this.refSeqSelectBox.set('value', this.refSeq.name );
                        return;
                    }

                    // only trigger navigation if actually switching sequences
                    if( newRefName != this.refSeq.name ) {
                        this.navigateToLocation({ ref: newRefName });
                    }
                })
            }).placeAt( refSeqSelectBoxPlaceHolder );
        }

        // calculate how big to make the location box:  make it big enough to hold the
        var locLength = this.config.locationBoxLength || function() {

            // if we have no refseqs, just use 20 chars
            if( ! this.refSeqOrder.length )
                return 20;

            // if there are not tons of refseqs, pick the longest-named
            // one.  otherwise just pick the last one
            var ref = this.refSeqOrder.length < 1000
                && function() {
                       var longestNamedRef;
                       array.forEach( this.refSeqOrder, function(name) {
                                          var ref = this.allRefs[name];
                                          if( ! ref.length )
                                              ref.length = ref.end - ref.start + 1;
                                          if( ! longestNamedRef || longestNamedRef.length < ref.length )
                                              longestNamedRef = ref;
                                      }, this );
                       return longestNamedRef;
                   }.call(this)
                || this.refSeqOrder.length && this.allRefs[ this.refSeqOrder[ this.refSeqOrder.length - 1 ] ]
                || 20;

            var locstring = Util.assembleLocStringWithLength({ ref: ref.name, start: ref.end-1, end: ref.end, length: ref.length });
            //console.log( locstring, locstring.length );
            return locstring.length;
        }.call(this) || 20;


        this.locationBox.domNode.style.width = locLength+'ex';
    }));

    return navbox;
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
		                       console.log("After Add RefSeqs fromJson")
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
		            console.log("Resolve CSS");
		            deferred.resolve(true);
		        }
		        // otherwise, it must be a URL
		        else {
		            css = { url: css };
		        }
		    }
		    if( typeof css == 'object' ) {
		        LazyLoad.css( css.url, function() { console.log("LazyLoad.css callback"); deferred.resolve(true); } );
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

		        console.log("Call Require: ", plugins)
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
		                 	console.log("callback forEach: ", this, arguments)
		                     array.forEach( arguments, function( pluginClass, i ) {
		                     		console.log("pluginClass: ", pluginClass, " i: ", i);
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
			console.log("GenomeBrowser onSetState: ", state, state.genome_id, state.genome_ids)
			var jbrowseConfig = {
				containerID: this.id + "_browserContainer",
	//			dataRoot: (state && state.hashParams && state.hashParams.data)?state.hashParams.data:'sample_data/json/volvox',
				dataRoot: window.App.dataServiceURL + "/jbrowse/genome/" + (state.genome_id||state.genome_ids[0]),
				// dataRoot: "sample_data/json/volvox",
				browserRoot: "/public/js/jbrowse.repo/",
				baseUrl: "/public/js/jbrowse.repo/",
				refSeqs: "{dataRoot}/refseqs",
				queryParams: (state && state.hashParams)?state.hashParams:{},
				location: (state && state.hashParams)?state.hashParams.loc:undefined,
				forceTracks: ["DNA", "PATRICGenes", "RefSeqGenes"].join(","),
				initialHighlight: (state && state.hashParams)?state.hashParams.highlight:undefined,
				show_nav: (state && state.hashParams && (typeof state.hashParams.show_nav != 'undefined'))?state.hashParams.show_nav:true,
				show_tracklist: (state && state.hashParams && (typeof state.hashParams.show_tracklist != 'undefined'))?state.hashParams.show_tracklist:true,
				show_overview: (state && state.hashParams && (typeof state.hashParams.show_overview != 'undefined'))?state.hashParams.show_overview:true,
				show_menu: (state && state.hashParams && (typeof state.hashParams.show_menu != 'undefined'))?state.hashParams.show_menu:false,
				stores: { url: { type: "JBrowse/Store/SeqFeature/FromConfig", features: [] } },
				updateBrowserURL: false,
				  "trackSelector": {
      "type": "Faceted",
      "displayColumns": [
          "key"
      ],
	  }
			}

			console.log("JBrowse CONFIG: ",jbrowseConfig);
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

			console.log("jbrowseConfig", jbrowseConfig);

			this.set("jbrowseConfig", jbrowseConfig)

		},

		onSetJBrowseConfig: function(attr,oldVal,config){
			if (!config){ return; }
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
			this.containerNode = domConstruct.create("div",{id: this.id + "_browserContainer",style: {padding: "0px", margin: "0px", border: "0px"}},this.domNode);
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
