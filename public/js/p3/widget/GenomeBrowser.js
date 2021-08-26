define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'JBrowse/Browser',
  'dojo/dom-construct', 'dojo/_base/lang', 'dojo/dom-geometry',
  'dojo/dom-style', 'dojo/_base/array',
  'dojo/_base/Deferred', 'dojo/DeferredList', 'lazyload',
  'dojo/request', 'dojo/on',
  'dijit/form/ComboBox',
  'dijit/form/Button',
  'dijit/form/Select',
  'dijit/form/ToggleButton',
  'dijit/form/DropDownButton',
  'dijit/DropDownMenu',
  'dijit/MenuItem',
  'dojox/form/TriStateCheckBox',
  'dijit/layout/ContentPane',
  'dijit/layout/BorderContainer',
  'JBrowse/Util',
  'JBrowse/View/InfoDialog',
  'JBrowse/View/FileDialog',
  'JBrowse/GenomeView',
  './DataItemFormatter',
  'dijit/Dialog',
  'dojo/keys'
], function (
  declare, WidgetBase, JBrowser,
  domConstruct, lang, domGeometry,
  domStyle, array,
  Deferred, DeferredList, lazyLoad,
  request, on,
  dijitComboBox,
  dijitButton,
  dijitSelectBox,
  dijitToggleButton,
  dijitDropDownButton,
  dijitDropDownMenu,
  dijitMenuItem,
  dojoxTriStateCheckBox,
  dijitContentPane,
  dijitBorderContainer,
  Util,
  InfoDialog,
  FileDialog,
  GenomeView, DataItemFormatter,
  Dialog, keys
) {
  window.featureDialogContent = function (feature) {
    var content = DataItemFormatter(feature.data, 'feature_data', { linkTitle: true });
    if (!window.featureDialog) {
      window.featureDialog = new Dialog({ title: 'Feature Summary' });
    }

    window.featureDialog.set('content', content);
    window.featureDialog.show();

  };
  var Browser = declare([JBrowser], {
    tooltip: 'The "Browser" tab shows genome sequence and genomic features using linear genome browser',
    makeFullViewLink: function () {
      return domConstruct.create('span', {});
    },

    createNavBox: function (parent) {
      var thisB = this;
      var navbox = dojo.create('div', {
        'class': 'navbox',
        id: 'navbox',
        style: { 'text-align': 'center', position: 'relative' }
      }, parent);

      // container adds a white backdrop to the locationTrap.
      var locationTrapContainer = dojo.create('div', { className: 'locationTrapContainer' }, navbox);

      this.locationTrap = dojo.create('div', { className: 'locationTrap' }, locationTrapContainer);

      var four_nbsp = String.fromCharCode(160);
      four_nbsp = four_nbsp + four_nbsp + four_nbsp + four_nbsp;
      navbox.appendChild(document.createTextNode(four_nbsp));

      // var moveLeft = document.createElement("i");
      // moveLeft.type = "image";
      // moveLeft.src = this.resolveUrl( "img/Empty.png" );
      // moveLeft.id = "moveLeft";
      // moveLeft.className = "fa icon-filter fa-2x"; //"icon nav";
      // navbox.appendChild(moveLeft);
      var moveLeft = domConstruct.create('I', { 'class': 'fa icon-arrow-left fa-2x' }, navbox);
      dojo.connect(
        moveLeft, 'click', this,
        function (event) {
          dojo.stopEvent(event);
          this.view.slide(0.9);
        }
      );

      var moveRight = document.createElement('i');
      // moveRight.type = "image";
      // moveRight.src = this.resolveUrl( "img/Empty.png" );
      // moveRight.id="moveRight";
      moveRight.className = 'fa icon-arrow-right fa-2x'; // "icon nav";
      navbox.appendChild(moveRight);
      dojo.connect(
        moveRight, 'click', this,
        function (event) {
          dojo.stopEvent(event);
          this.view.slide(-0.9);
        }
      );

      var bigZoomOut = domConstruct.create('I', {
        'class': 'fa icon-search-minus',
        style: { 'font-size': '2.5em' }
      }, navbox);
      dojo.connect(
        bigZoomOut, 'click', this,
        function (event) {
          dojo.stopEvent(event);
          this.view.zoomOut(undefined, undefined, 2);
        }
      );

      var zoomOut = domConstruct.create('I', { 'class': 'fa icon-search-minus fa-2x' }, navbox);
      dojo.connect(
        zoomOut, 'click', this,
        function (event) {
          dojo.stopEvent(event);
          this.view.zoomOut();
        }
      );

      var zoomIn = domConstruct.create('I', { 'class': 'fa icon-search-plus fa-2x' }, navbox);
      dojo.connect(
        zoomIn, 'click', this,
        function (event) {
          dojo.stopEvent(event);
          this.view.zoomIn();
        }
      );

      var bigZoomIn = domConstruct.create('I', {
        'class': 'fa icon-search-plus',
        style: { 'font-size': '2.5em' }
      }, navbox);
      dojo.connect(
        bigZoomIn, 'click', this,
        function (event) {
          dojo.stopEvent(event);
          this.view.zoomIn(undefined, undefined, 2);
        }
      );

      // if we have fewer than 30 ref seqs, or `refSeqDropdown: true` is
      // set in the config, then put in a dropdown box for selecting
      // reference sequences
      var refSeqSelectBoxPlaceHolder = dojo.create('div', { style: 'display:inline-block;' }, navbox);

      // make the location box
      this.locationBox = new dijitComboBox(
        {
          name: 'location',
          style: { width: '75px' },
          maxLength: 400,
          searchAttr: 'name'
        },
        dojo.create('input', {}, navbox)
      );
      this.afterMilestone('loadNames', dojo.hitch(this, function () {
        if (this.nameStore)
        { this.locationBox.set('store', this.nameStore); }
      }));

      this.locationBox.focusNode.spellcheck = false;
      dojo.query('div.dijitArrowButton', this.locationBox.domNode).orphan();
      dojo.connect(this.locationBox.focusNode, 'keydown', this, function (event) {
        if (event.keyCode == keys.ESCAPE) {
          this.locationBox.set('value', '');
        }
        else if (event.keyCode == keys.ENTER) {
          this.locationBox.closeDropDown(false);
          this.navigateTo(this.locationBox.get('value'));
          this.goButton.set('disabled', true);
          dojo.stopEvent(event);
        } else {
          this.goButton.set('disabled', false);
        }
      });
      dojo.connect(navbox, 'onselectstart', function (evt) {
        evt.stopPropagation();
        return true;
      });
      // monkey-patch the combobox code to make a few modifications
      (function () {

        // add a moreMatches class to our hacked-in "more options" option
        var dropDownProto = eval(this.locationBox.dropDownClass).prototype;
        var oldCreateOption = dropDownProto._createOption;
        dropDownProto._createOption = function (item) {
          var option = oldCreateOption.apply(this, arguments);
          if (item.hitLimit)
          { dojo.addClass(option, 'moreMatches'); }
          return option;
        };

        // prevent the "more matches" option from being clicked
        var oldOnClick = dropDownProto.onClick;
        dropDownProto.onClick = function (node) {
          if (dojo.hasClass(node, 'moreMatches'))
          { return null; }
          return oldOnClick.apply(this, arguments);
        };
      }).call(this);

      // make the 'Go' button'
      this.goButton = new dijitButton({
        label: 'Go',
        onClick: dojo.hitch(this, function (event) {
          this.navigateTo(this.locationBox.get('value'));
          this.goButton.set('disabled', true);
          dojo.stopEvent(event);
        })
      }, dojo.create('button', {}, navbox));
      this.highlightButtonPreviousState = false;
      this.highlightButton = new dojoxTriStateCheckBox({
        // label: 'Highlight',
        title: 'highlight a region',
        states: [false, true, 'mixed'],
        onChange: function () {
          if (this.get('checked') == true) {
            thisB.view._rubberStop();
            thisB.view.behaviorManager.swapBehaviors('normalMouse', 'highlightingMouse');
          } else if (this.get('checked') == false) {
            var h = thisB.getHighlight();
            if (h) {
              thisB.clearHighlight();
              thisB.view.redrawRegion(h);
            }
          }
          else { // mixed
            // Uncheck since user is cycling three-state instead
            // of programmatically landing in mixed state
            if (thisB.highlightButtonPreviousState != true) {
              thisB.highlightButton.set('checked', false);
            }
            else {
              thisB.highlightButtonPreviousState = false;
            }
            thisB.view._rubberStop();
            thisB.view.behaviorManager.swapBehaviors('highlightingMouse', 'normalMouse');
          }
        }
      }, dojo.create('button', {}, navbox));

      this.subscribe(
        '/jbrowse/v1/n/globalHighlightChanged',
        function () {
          thisB.highlightButton.set('checked', false);
        }
      );

      this.afterMilestone('loadRefSeqs', dojo.hitch(this, function () {

        // make the refseq selection dropdown
        if (this.refSeqOrder && this.refSeqOrder.length) {
          var max = this.config.refSeqSelectorMaxSize || 30;
          var numrefs = Math.min(max, this.refSeqOrder.length);
          var options = [];
          for (var i = 0; i < numrefs; i++) {
            options.push({ label: this.refSeqOrder[i], value: this.refSeqOrder[i] });
          }
          var tooManyMessage = '(first ' + numrefs + ' ref seqs)';
          if (this.refSeqOrder.length > max) {
            options.push({ label: tooManyMessage, value: tooManyMessage, disabled: true });
          }
          this.refSeqSelectBox = new dijitSelectBox({
            name: 'refseq',
            value: this.refSeq ? this.refSeq.name : null,
            options: options,
            onChange: dojo.hitch(this, function (newRefName) {
              // don't trigger nav if it's the too-many message
              if (newRefName == tooManyMessage) {
                this.refSeqSelectBox.set('value', this.refSeq.name);
                return;
              }

              // only trigger navigation if actually switching sequences
              if (newRefName != this.refSeq.name) {
                this.navigateToLocation({ ref: newRefName });
              }
            })
          }).placeAt(refSeqSelectBoxPlaceHolder);
        }

        // calculate how big to make the location box:  make it big enough to hold the
        var locLength = this.config.locationBoxLength || function () {

          // if we have no refseqs, just use 20 chars
          if (!this.refSeqOrder || !this.refSeqOrder.length)
          { return 20; }

          // if there are not tons of refseqs, pick the longest-named
          // one.  otherwise just pick the last one
          var ref = this.refSeqOrder.length < 1000
            && function () {
              var longestNamedRef;
              array.forEach(this.refSeqOrder, function (name) {
                var ref = this.allRefs[name];
                if (!ref.length) {
                  ref.length = ref.end - ref.start + 1;
                }
                if (!longestNamedRef || longestNamedRef.length < ref.length) {
                  longestNamedRef = ref;
                }
              }, this);
              return longestNamedRef;
            }.call(this)
            || this.refSeqOrder.length && this.allRefs[this.refSeqOrder[this.refSeqOrder.length - 1]]
            || 20;

          var locstring = Util.assembleLocStringWithLength({
            ref: ref.name,
            start: ref.end - 1,
            end: ref.end,
            length: ref.length
          });
          // console.log( locstring, locstring.length );
          return locstring.length;
        }.call(this) || 20;

        this.locationBox.domNode.style.width = locLength + 'ex';
      }));

      return navbox;
    },

    regularizeReferenceName: function (refname) {

      if (this.config.exactReferenceSequenceNames)
      { return refname; }

      refname = refname.toLowerCase()
        .replace(/^chro?m?(osome)?/, 'chr')
        .replace(/^co?n?ti?g/, 'ctg')
        .replace(/^scaff?o?l?d?/, 'scaffold')
        .replace(/^(\d+)$/, 'chr$1')
        .replace(/^accn\|/, '')
        .replace(/^sid\|\d+\|accn\|/, '') // handle legacy PATRIC format
        .replace(/^.+\|accn\|/, '') // handle crazy rockhopper id requirements
        .replace(/\|$/g, ''); // handle crazy rockhopper id requirements
      // not sure what this was for but it was causing problems when loweringCase with ID like "JEZL01000001" turning to jezl1000001
      //              .replace(/^([a-z]*)0+/, '$1')

      return refname;
    },

    /**
        * Return a string URL that encodes the complete viewing state of the
        * browser.  Currently just data dir, visible tracks, and visible
        * region.
        * @param {Object} overrides optional key-value object containing
        *                           components of the query string to override
        */
    makeCurrentViewURL: function ( overrides ) {
      var t = typeof this.config.shareURL;

      if ( t == 'function' ) {
        return this.config.shareURL.call( this, this );
      }
      else if ( t == 'string' ) {
        return this.config.shareURL;
      }

      return ''.concat(
        window.location.protocol,
        '//',
        window.location.host,
        window.location.pathname,
        '#',
        dojo.objectToQuery(dojo.mixin(
          dojo.mixin( {}, (this.config.queryParams || {}) ),
          dojo.mixin(
            {
              loc: this.view.visibleRegionLocString(),
              tracks: this.view.visibleTrackNames().join(','),
              highlight: (this.getHighlight() || '').toString()
            },
            overrides || {}
          )
        ))
      );
    },
    initView: function () {
      var thisObj = this;
      return this._milestoneFunction('initView', function (deferred) {

        // set up top nav/overview pane and main GenomeView pane
        dojo.addClass(this.container, 'jbrowse'); // browser container has an overall .jbrowse class
        dojo.addClass(document.body, this.config.theme || 'tundra'); // < tundra dijit theme

        var topPane = dojo.create('div', { style: { overflow: 'hidden' } }, this.container);

        var about = this.browserMeta();
        var aboutDialog = new InfoDialog({
          title: 'About ' + about.title,
          content: about.description,
          className: 'about-dialog'
        });

        // make our top menu bar
        var menuBar = dojo.create(
          'div',
          {
            className: this.config.show_nav ? 'menuBar' : 'topLink'
          }
        );
        thisObj.menuBar = menuBar;
        if (this.config.show_menu) {
          ( this.config.show_nav ? topPane : this.container ).appendChild(menuBar);
        }

        var overview = dojo.create('div', { className: 'overview', id: 'overview' }, topPane);
        this.overviewDiv = overview;
        // overview=0 hides the overview, but we still need it to exist
        if (!this.config.show_overview)
        { overview.style.cssText = 'display: none'; }

        if (this.config.show_nav) {
          this.navbox = this.createNavBox(topPane);

          if (this.config.datasets && !this.config.dataset_id) {
            console.warn('In JBrowse configuration, datasets specified, but dataset_id not set.  Dataset selector will not be shown.');
          }
          if (this.config.datasets && this.config.dataset_id) {
            this.renderDatasetSelect(menuBar);
          } else {

            this.poweredByLink = dojo.create('a', {
              className: 'powered_by',
              innerHTML: this.browserMeta().title,
              title: 'powered by JBrowse'
            }, menuBar);
            thisObj.poweredBy_clickHandle = dojo.connect(this.poweredByLink, 'onclick', dojo.hitch(aboutDialog, 'show'));
          }

          // make the file menu
          this.addGlobalMenuItem(
            'file',
            new dijitMenuItem({
              // id: 'menubar_fileopen',
              label: 'Open',
              iconClass: 'dijitIconFolderOpen',
              onClick: dojo.hitch(this, 'openFileDialog')
            })
          );

          this.fileDialog = new FileDialog({ browser: this });

          this.addGlobalMenuItem('file', new dijitMenuItem({
            // id: 'menubar_combotrack',
            label: 'Add combination track',
            iconClass: 'dijitIconSample',
            onClick: dojo.hitch(this, 'createCombinationTrack')
          }));

          this.renderGlobalMenu('file', { text: 'File' }, menuBar);

          // make the view menu
          this.addGlobalMenuItem('view', new dijitMenuItem({
            // id: 'menubar_sethighlight',
            label: 'Set highlight',
            iconClass: 'dijitIconFilter',
            onClick: function () {
              new SetHighlightDialog({
                browser: thisObj,
                setCallback: dojo.hitch(thisObj, 'setHighlightAndRedraw')
              }).show();
            }
          }));
          // make the menu item for clearing the current highlight
          this._highlightClearButton = new dijitMenuItem({
            // id: 'menubar_clearhighlight',
            label: 'Clear highlight',
            iconClass: 'dijitIconFilter',
            onClick: dojo.hitch(this, function () {
              var h = this.getHighlight();
              if (h) {
                this.clearHighlight();
                this.view.redrawRegion(h);
              }
            })
          });
          this._updateHighlightClearButton();  // < sets the label and disabled status
          // update it every time the highlight changes
          this.subscribe(
            '/jbrowse/v1/n/globalHighlightChanged',
            dojo.hitch(this, '_updateHighlightClearButton')
          );

          this.addGlobalMenuItem('view', this._highlightClearButton);

          // add a global menu item for resizing all visible quantitative tracks
          this.addGlobalMenuItem('view', new dijitMenuItem({
            label: 'Resize quant. tracks',
            // id: 'menubar_settrackheight',
            title: 'Set all visible quantitative tracks to a new height',
            iconClass: 'jbrowseIconVerticalResize',
            onClick: function () {
              new SetTrackHeightDialog({
                setCallback: function (height) {
                  var tracks = thisObj.view.visibleTracks();
                  array.forEach(tracks, function (track) {
                    // operate only on XYPlot or Density tracks
                    if (!/\b(XYPlot|Density)/.test(track.config.type))
                    { return; }

                    track.trackHeightChanged = true;
                    track.updateUserStyles({ height: height });
                  });
                }
              }).show();
            }
          }));

          this.renderGlobalMenu('view', { text: 'View' }, menuBar);

          // make the options menu
          this.renderGlobalMenu('options', { text: 'Options', title: 'configure JBrowse' }, menuBar);
        }

        if (this.config.show_nav) {
          // make the help menu
          this.addGlobalMenuItem(
            'help',
            new dijitMenuItem({
              // id: 'menubar_about',
              label: 'About',
              // iconClass: 'dijitIconFolderOpen',
              onClick: dojo.hitch(aboutDialog, 'show')
            })
          );

          // function showHelp() {
          //   new HelpDialog(lang.mixin(thisObj.config.quickHelp || {}, { browser: thisObj })).show();
          // }

          // this.setGlobalKeyboardShortcut('?', showHelp);
          // this.addGlobalMenuItem(
          //   'help',
          //   new dijitMenuItem({
          //     // id: 'menubar_generalhelp',
          //     label: 'General',
          //     iconClass: 'jbrowseIconHelp',
          //     onClick: showHelp
          //   })
          // );

          this.renderGlobalMenu('help', {}, menuBar);
        }

        if (this.config.show_nav && this.config.show_tracklist && this.config.show_overview) {
          var shareLink = this.makeShareLink();
          if (shareLink) {
            menuBar.appendChild(shareLink);
          }
        }
        else
        { menuBar.appendChild(this.makeFullViewLink()); }

        this.viewElem = document.createElement('div');
        this.viewElem.className = 'dragWindow';
        this.container.appendChild(this.viewElem);

        this.containerWidget = new dijitBorderContainer({
          liveSplitters: false,
          design: 'sidebar',
          gutters: false
        }, this.container);
        var contentWidget =
          new dijitContentPane({ region: 'top' }, topPane);

        // hook up GenomeView
        this.view = this.viewElem.view =
          new GenomeView({
            browser: this,
            elem: this.viewElem,
            config: this.config.view,
            stripeWidth: 1000,
            refSeq: this.refSeq,
            zoomLevel: 1 / 200
          });

        dojo.connect(this.view, 'onFineMove', this, 'onFineMove');
        dojo.connect(this.view, 'onCoarseMove', this, 'onCoarseMove');

        this.browserWidget =
          new dijitContentPane({ region: 'center' }, this.viewElem);
        dojo.connect(this.browserWidget, 'resize', this, 'onResize');
        dojo.connect(this.browserWidget, 'resize', this.view, 'onResize');

        // connect events to update the URL in the location bar
        function updateLocationBar() {
          var shareURL = thisObj.makeCurrentViewURL();
          if (thisObj.config.updateBrowserURL && window.history && window.history.replaceState)
          { window.history.replaceState({}, '', shareURL); }
          // document.title = thisObj.browserMeta().title + ' ' + thisObj.view.visibleRegionLocString();
        }
        dojo.connect(this, 'onCoarseMove', updateLocationBar);
        this.subscribe('/jbrowse/v1/n/tracks/visibleChanged', updateLocationBar);
        this.subscribe('/jbrowse/v1/n/globalHighlightChanged', updateLocationBar);

        // set initial location
        this.afterMilestone('loadRefSeqs', dojo.hitch(this, function () {
          this.afterMilestone('initTrackMetadata', dojo.hitch(this, function () {
            this.createTrackList().then(dojo.hitch(this, function () {

              this.containerWidget.startup();
              this.onResize();

              // make our global keyboard shortcut handler
              on(document.body, 'keypress', dojo.hitch(this, 'globalKeyHandler'));

              // configure our event routing
              this._initEventRouting();

              // done with initView
              deferred.resolve({ success: true });
            }));
          }));
        }));
      });
    },

    _initialLocation: function () {
      var oldLocMap = dojo.fromJson(this.cookie('location')) || {};
      if (this.config.location) {
        return this.config.location;
      } else if (this.refSeq && this.refSeq.name && oldLocMap[this.refSeq.name]) {
        return oldLocMap[this.refSeq.name].l || oldLocMap[this.refSeq.name];
      } else if (this.config.defaultLocation) {
        return this.config.defaultLocation;
      } else if (this.refSeq) {
        return Util.assembleLocString({
          ref: this.refSeq.name,
          start: 0.4 * ( this.refSeq.start + this.refSeq.end ),
          end: 0.6 * ( this.refSeq.start + this.refSeq.end )
        });
      }
      console.error('Problem Establishing JBrowse _initialLocation');

    },
    makeGlobalMenu: function (menuName) {
      var items = ( this._globalMenuItems || {} )[menuName] || [];
      if (!items.length)
      { return null; }

      var menu = new dijitDropDownMenu({ leftClickToOpen: true });
      dojo.forEach(items, function (item) {
        menu.addChild(item);
      });
      dojo.addClass(menu.domNode, 'globalMenu');
      dojo.addClass(menu.domNode, menuName);
      menu.startup();
      return menu;
    },
    createTrackList: function () {
      return this._milestoneFunction('createTrack', function (deferred) {
        // find the tracklist class to use
        var tl_class = !this.config.show_tracklist ? 'Null' :
          (this.config.trackSelector || {}).type ? this.config.trackSelector.type :
            'Hierarchical';
        // if( ! /\//.test( tl_class ) )
        //     tl_class = 'JBrowse/View/TrackList/'+tl_class;
        var tl_class = 'p3/widget/HierarchicalTrackList';

        // load all the classes we need
        require(
          [tl_class],
          dojo.hitch(this, function (trackListClass) {
            // instantiate the tracklist and the track metadata object
            this.trackListView = new trackListClass(dojo.mixin(
              dojo.clone(this.config.trackSelector) || {},
              {
                trackConfigs: this.config.tracks,
                browser: this,
                trackMetaData: this.trackMetaDataStore
              }
            ));

            // bind the 't' key as a global keyboard shortcut
            this.setGlobalKeyboardShortcut('t', this.trackListView, 'toggle');

            // listen for track-visibility-changing messages from
            // views and update our tracks cookie
            this.subscribe('/jbrowse/v1/n/tracks/visibleChanged', dojo.hitch(this, function () {
              this.cookie(
                'tracks',
                this.view.visibleTrackNames().join(','),
                { expires: 60 }
              );
            }));

            deferred.resolve({ success: true });
          })
        );
      });
    },

    loadRefSeqs: function () {
      return this._milestoneFunction('loadRefSeqs', function (deferred) {
        // load our ref seqs
        if (typeof this.config.refSeqs == 'string')
        { this.config.refSeqs = { url: this.resolveUrl(this.config.refSeqs) }; }
        var thisB = this;

        console.log('refSeqs url: ', this.config.refSeqs.url);
        request(this.config.refSeqs.url, { handleAs: 'text' })
          .then(
            lang.hitch(this, function (o) {
              var refseqConfig = dojo.fromJson(o);
              if (refseqConfig.length > 0 && !('defaultLocation' in this.config)) {
                var initSize = Math.min(100000, refseqConfig[0].length);
                this.config.defaultLocation = refseqConfig[0].accn + ':1..' + initSize.toString();
              }
              else if (refseqConfig.length == 0) {
                deferred.reject('missing sequences or contigs')
                return
              }

              refseqConfig.forEach(function (seq) {
                if (seq.seqChunkSize > 20000) {
                  seq.seqChunkSize = 20000;
                }
              });

              console.log(' call addREfseqs fromJson: ', o);
              if (refseqConfig && refseqConfig.length > 0) {
                console.log(' call addREfseqs fromJson: ', o);
                thisB.addRefseqs(refseqConfig);
                // thisB.addRefseqs(dojo.fromJson(o));
                console.log('After Add RefSeqs fromJson');
              }


              Object.keys(this.config.stores).forEach(dojo.hitch(this, function (storeName) {
                if (this.config.stores[storeName].label == 'refseqs') {
                  this.config.stores.refseqs = this.config.stores[storeName];
                }
              }));
              deferred.resolve({ success: true });
            }),
            function (e) {
              deferred.reject('Could not load reference sequence definitions. ' + e);
            }
          );
      });
    },
    _loadCSS: function (css) {
      var deferred = new Deferred();
      if (typeof css == 'string') {
        // if it has '{' in it, it probably is not a URL, but is a string of CSS statements
        if (css.indexOf('{') > -1) {
          dojo.create('style', {
            'data-from': 'JBrowse Config',
            type: 'text/css',
            innerHTML: css
          }, document.head);
          console.log('Resolve CSS');
          deferred.resolve(true);
        }
        // otherwise, it must be a URL
        else {
          css = { url: css };
        }
      }
      if (typeof css == 'object') {
        LazyLoad.css(css.url, function () {
          console.log('LazyLoad.css callback');
          deferred.resolve(true);
        });
      }
      return deferred;
    },
    initPlugins: function () {
      return this._milestoneFunction('initPlugins', function (deferred) {
        this.plugins = {};

        var plugins = this.config.plugins || this.config.Plugins || {};

        // coerce plugins to array of objects
        if (!lang.isArray(plugins) && !plugins.name) {
          // plugins like  { Foo: {...}, Bar: {...} }
          plugins = function () {
            var newplugins = [];
            for (var pname in plugins) {
              if (!( 'name' in plugins[pname] )) {
                plugins[pname].name = pname;
              }
              newplugins.push(plugins[pname]);
            }
            return newplugins;
          }.call(this);
        }
        if (!lang.isArray(plugins))
        { plugins = [plugins]; }

        plugins.unshift.apply(plugins, this._corePlugins());

        // coerce string plugin names to {name: 'Name'}
        plugins = array.map(plugins, function (p) {
          return typeof p == 'object' ? p : { name: p };
        });

        if (!plugins) {
          deferred.resolve({ success: true });
          return;
        }

        // set default locations for each plugin
        array.forEach(plugins, function (p) {
          if (!( 'location' in p ))
          { p.location = 'plugins/' + p.name; }

          var resolved = this.resolveUrl(p.location);

          // figure out js path
          if (!( 'js' in p ))
          { p.js = resolved + '/js'; } // URL resolution for this is taken care of by the JS loader
          if (p.js.charAt(0) != '/' && !/^https?:/i.test(p.js))
          { p.js = '../' + p.js; }

          // figure out css path
          if (!( 'css' in p ))
          { p.css = resolved + '/css'; }

          console.log('P: ', p);
        }, this);

        var pluginDeferreds = array.map(plugins, function (p) {
          return new Deferred();
        });

        // fire the "all plugins done" deferred when all of the plugins are done loading
        (new DeferredList(pluginDeferreds))
          .then(function () {
            deferred.resolve({ success: true });
          });

        require(
          {
            packages: array.map(plugins, function (p) {
              return {
                name: p.name,
                location: p.js
              };
            }, this)
          },
          array.map(plugins, function (p) {
            return p.name;
          }),
          dojo.hitch(this, function () {
            array.forEach(arguments, function (pluginClass, i) {
              var plugin = plugins[i];
              var thisPluginDone = pluginDeferreds[i];

              if (typeof pluginClass == 'string') {
                console.error('could not load plugin ' + plugin.name + ': ' + pluginClass);
              } else {
              // make the plugin's arguments out of
              // its little obj in 'plugins', and
              // also anything in the top-level
              // conf under its plugin name
                var args = dojo.mixin(
                  dojo.clone(plugins[i]),
                  { config: this.config[plugin.name] || {} }
                );
                args.browser = this;
                args = dojo.mixin(args, { browser: this });

                // load its css

                var cssLoaded = this._loadCSS({ url: plugin.css + '/main.css' });
                cssLoaded.then(function () {
                  thisPluginDone.resolve({ success: true });
                });

                // give the plugin access to the CSS
                // promise so it can know when its
                // CSS is ready
                args.cssLoaded = cssLoaded;

                // instantiate the plugin
                this.plugins[plugin.name] = new pluginClass(args);
              }
            }, this);
          })
        );
      });
    },
    fatalError: function (error) {

      function formatError(error) {
        if ( error ) {
          console.error( error.stack || '' + error );
          error += '';
          if ( !/\.$/.exec(error) )
          { error += '.'; }
        }
        return error;
      }

      if ( !this.renderedFatalErrors ) {
        // if the error is just that there are no ref seqs defined,
        // and there are datasets defined in the conf file, then just
        // show a little HTML list of available datasets
        if ( /^Could not load reference sequence/.test( error )
              && this.config.datasets
              && !this.config.datasets._DEFAULT_EXAMPLES
        ) {
          // new StandaloneDatasetList({ datasets: this.config.datasets })
          //   .placeAt( this.container );
        } else {
          var container = this.container || document.body;
          // var thisB = this;

          dojo.addClass( document.body, this.config.theme || 'tundra'); // < tundra dijit theme

          if ( !Util.isElectron() ) {
            require([
              'dojo/text!p3/widget/templates/GenomeBrowserError.html'
            ], function (Welcome_old) {
              container.innerHTML = Welcome_old;
              if ( error ) {
                var errors_div = dojo.byId('fatal_error_list');
                dojo.create('div', { className: 'error', innerHTML: formatError(error) + '' }, errors_div );
              }
              // request( 'sample_data/json/volvox/successfully_run' ).then( function() {
              //        try {
              //            dojo.byId('volvox_data_placeholder').innerHTML = 'However, it appears you have successfully run <code>./setup.sh</code>, so you can see the <a href="?data=sample_data/json/volvox">Volvox test data here</a>.';
              //        } catch(e) {}
              //    });

            });
          }
          else {
            this.welcomeScreen( container, formatError(error) );
          }

          this.renderedFatalErrors = true;
        }
      } else {
        var errors_div = dojo.byId('fatal_error_list') || document.body;
        dojo.create('div', { className: 'error', innerHTML: formatError(error) + '' }, errors_div );
      }
    }
  });

  return declare([WidgetBase], {
    state: null,
    jbrowseConfig: null,
    style: 'border: 1px solid #ddd;',
    onSetState: function (attr, oldVal, state) {
      console.log('GenomeBrowser onSetState: ', state, state.genome_id, state.genome_ids);

      // hack for now
      if (state && state.hashParams) {
        Object.keys(state.hashParams).forEach(function (attr) {
          state.hashParams[attr] = decodeURIComponent(state.hashParams[attr]);
        });
      }

      if (!state) {
        return;
      }

      var location;
      if (state.feature) {
        state.hashParams.loc = state.feature.accession + ':' + Math.max(0, parseInt(state.feature.start) - 3000) + '..' + (parseInt(state.feature.end) + 3000);
        state.hashParams.highlight = state.feature.accession + ':' + state.feature.start + '..' + state.feature.end;
      }

      var dataRoot;

      if (state.feature && state.feature.genome_id) {
        dataRoot = window.App.dataServiceURL + '/jbrowse/genome/' + state.feature.genome_id;
      } else if (state.genome_id) {
        dataRoot = window.App.dataServiceURL + '/jbrowse/genome/' + state.genome_id;
      } else if (state.genome_ids && state.genome_ids[0]) {
        dataRoot = window.App.dataServiceURL + '/jbrowse/genome/' + state.genome_ids[0];
      } else {
        console.log('No genome ID Supplied for Genome Browser');
        return;
      }

      // console.log("JBROWSE LOC: ", state.hashParams.loc);

      var jbrowseConfig = {
        containerID: this.id + '_browserContainer',
        // dataRoot: (state && state.hashParams && state.hashParams.data)?state.hashParams.data:'sample_data/json/volvox',
        dataRoot: dataRoot,
        // dataRoot: "sample_data/json/volvox",
        browserRoot: '/public/js/jbrowse.repo/',
        baseUrl: '/public/js/jbrowse.repo/',
        // plugins: ["HideTrackLabels"],
        refSeqs: '{dataRoot}/refseqs' + ((window.App.authorizationToken) ? ('?http_authorization=' + encodeURIComponent(window.App.authorizationToken)) : ''),
        queryParams: (state && state.hashParams) ? state.hashParams : {},
        location: (state && state.hashParams) ? state.hashParams.loc : undefined,
        // defaultTracks: ["SequenceTrack"].join(","),
        forceTracks: (state && state.hashParams && (typeof state.hashParams.tracks != 'undefined')) ? state.hashParams.tracks instanceof Array ? state.hashParams.tracks.join(',') : state.hashParams.tracks : ['refseqs', 'PATRICGenes', 'RefSeqGenes'].join(','),
        highResoutionMode: 'auto',
        // alwaysOnTracks: [,"PATRICGenes"].join(","),
        initialHighlight: (state && state.hashParams) ? state.hashParams.highlight : undefined,
        plugins: ['HideTrackLabels', 'MultiBigWig'],
        show_nav: (state && state.hashParams && (typeof state.hashParams.show_nav != 'undefined')) ? state.hashParams.show_nav : true,
        show_tracklist: (state && state.hashParams && (typeof state.hashParams.show_tracklist != 'undefined')) ? state.hashParams.show_tracklist : true,
        show_overview: (state && state.hashParams && (typeof state.hashParams.show_overview != 'undefined')) ? state.hashParams.show_overview : true,
        show_menu: (state && state.hashParams && (typeof state.hashParams.show_menu != 'undefined')) ? state.hashParams.show_menu : true,
        stores: { url: { type: 'JBrowse/Store/SeqFeature/FromConfig', features: [] } },
        updateBrowserURL: true,
        trackSelector: { type: 'p3/widget/HierarchicalTrackList' },
        suppressUsageStatistics: true,
        refSeqSelectorMaxSize: 2000
        // "trackSelector": {
        //  "type": "Faceted",
        //  "displayColumns": [
        //    "key"
        //  ]
        // }
      };

      // console.log("JBrowse CONFIG: ", jbrowseConfig);
      if (state && state.hashParams && state.hashParams.addFeatures) {
        jbrowseConfig.stores.url.features = JSON.parse(state.hashParams.addFeatures);
      }

      if (state && state.hashParams && state.hashParams.addTracks) {
        jbrowseConfig.tracks = JSON.parse(state.hashParams.addTracks);
      }
      // if there is ?addStores in the query params, add
      // those store configurations to our initial
      // configuration
      if (state && state.hashParams && state.hashParams.addStores) {
        jbrowseConfig.stores = JSON.parse(state.hashParams.addStores);
      }

      // console.log("jbrowseConfig", jbrowseConfig);

      this.set('jbrowseConfig', jbrowseConfig);

    },

    onSetJBrowseConfig: function (attr, oldVal, config) {
      if (!config) {
        return;
      }
      if (!this.visible) {
        return;
      }

      if (!this._browser) {
        console.log('Browser config: ', config);

        this._browser = new Browser(config);
      } else {

        console.log('Browser Already Exists');
      }
    },
    postCreate: function () {
      this.inherited(arguments);
      this.containerNode = domConstruct.create('div', {
        id: this.id + '_browserContainer',
        style: { padding: '0px', margin: '0px', border: '0px' }
      }, this.domNode);
      this.watch('state', lang.hitch(this, 'onSetState'));
      this.watch('jbrowseConfig', lang.hitch(this, 'onSetJBrowseConfig'));
    },

    visible: false,
    _setVisibleAttr: function (visible) {
      // console.log("GridContainer setVisible: ", visible)
      this.visible = visible;
      if (this.visible && !this._firstView) {
        // console.log("Trigger First View: ", this.id)
        this.onFirstView();
      }
    },

    onFirstView: function () {
      // console.log("GenomeBrowser onFirstView()")
      // if (this._firstView) {

      // }
      // console.log("GenomeBrowser onFirstView()")

      // if(!this._browser){
      //  console.log("Create GenomeBrowser: ", this.jbrowseConfig);
      //  this._browser = new Browser(this.jbrowseConfig)
      // }
    },

    resize: function (changeSize, resultSize) {
      var node = this.domNode;

      // set margin box size, unless it wasn't specified, in which case use current size
      if (changeSize) {

        domGeometry.setMarginBox(node, changeSize);
      }

      // If either height or width wasn't specified by the user, then query node for it.
      // But note that setting the margin box and then immediately querying dimensions may return
      // inaccurate results, so try not to depend on it.

      var mb = resultSize || {};
      lang.mixin(mb, changeSize || {});       // changeSize overrides resultSize
      if (!('h' in mb) || !('w' in mb)) {

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

      domGeometry.setMarginBox(this.containerNode, this._contentBox);
      // this._browser.resize();
    }
  });
});
