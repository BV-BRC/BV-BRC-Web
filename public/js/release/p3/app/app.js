define("p3/app/app", [
  'dojo/_base/declare', 'dojo/parser',
  'dojo/topic', 'dojo/on', 'dojo/dom', 'dojo/dom-class', 'dojo/dom-attr', 'dojo/dom-style',
  'dijit/registry', 'dojo/request', 'dijit/layout/ContentPane', 'dojo/_base/fx',
  'dojo/_base/Deferred', 'dojo/query', 'dojo/NodeList-dom',
  'dojo/ready', 'dojo/parser', 'rql/query', 'dojo/_base/lang',
  'p3/router', 'dijit/Dialog', 'dojo/dom-construct', 'dojo/window'
], function (
  declare, parser,
  Topic, on, dom, domClass, domAttr, domStyle,
  Registry, xhr, ContentPane, fx,
  Deferred, query, nodeListDom,
  Ready, Parser, rql, lang,
  Router, Dialog, domConstruct, winUtils
) {

  var NMDialog = declare([Dialog], {
    show: function () {
      // summary:
      //              Display the dialog
      // returns: dojo/promise/Promise
      //              Promise object that resolves when the display animation is complete

      if (this.open) {
        return Deferred.promise;
      }

      if (!this._started) {
        this.startup();
      }

      // first time we show the dialog, there's some initialization stuff to do
      if (!this._alreadyInitialized) {
        this._setup();
        this._alreadyInitialized = true;
      }

      if (this._fadeOutDeferred) {
        // There's a hide() operation in progress, so cancel it, but still call DialogLevelManager.hide()
        // as though the hide() completed, in preparation for the DialogLevelManager.show() call below.
        this._fadeOutDeferred.cancel();

      }

      // Recenter Dialog if user scrolls browser.  Connecting to document doesn't work on IE, need to use window.
      // Be sure that event object doesn't get passed to resize() method, because it's expecting an optional
      // {w: ..., h:...} arg.
      var win = winUtils.get(this.ownerDocument);
      this._modalconnects.push(on(win, 'scroll', lang.hitch(this, 'resize', null)));

      this._modalconnects.push(on(this.domNode, 'keydown', lang.hitch(this, '_onKey')));

      domStyle.set(this.domNode, {
        opacity: 0,
        display: ''
      });

      this._set('open', true);
      this._onShow(); // lazy load trigger

      this.resize();
      this._position();

      // fade-in Animation object, setup below
      var fadeIn;
      /* istanbul ignore next */
      this._fadeInDeferred = new Deferred(lang.hitch(this, function () {
        fadeIn.stop();
        delete this._fadeInDeferred;
      }));

      // If delay is 0, code below will delete this._fadeInDeferred instantly, so grab promise while we can.
      var promise = this._fadeInDeferred.promise;
      /* istanbul ignore next */
      fadeIn = fx.fadeIn({
        node: this.domNode,
        duration: this.duration,
        onEnd: lang.hitch(this, function () {
          this._fadeInDeferred.resolve(true);
          delete this._fadeInDeferred;
        })
      }).play();

      return promise;
    }
  });

  return declare(null, {
    panels: {},
    constructor: function (opts) {
      /* istanbul ignore next */
      if (opts) {
        for (var prop in opts) {
          // guard-for-in
          if (Object.prototype.hasOwnProperty.call(opts, prop)) {
            this[prop] = opts[prop];
          }
        }
      }

      var _self = this;
      this._containers = {};
      // console.log("Launching Application...");

      /* these two on()s enable the p2 header mouse overs */
      on(document.body, '.has-sub:mouseover', function (evt) {
        // console.log("has sub");
        var target = evt.target;
        while (!domClass.contains(target, 'has-sub') && target.parentNode) {
          target = target.parentNode;
        }
        domClass.add(target, 'hover');
      });
      on(document.body, '.has-sub:mouseout', function (evt) {
        var target = evt.target;
        while (!domClass.contains(target, 'has-sub') && target.parentNode) {
          target = target.parentNode;
        }
        domClass.remove(target, 'hover');
      });

      on(window, 'message', function (evt) {
        var msg = evt.data;
        // console.log("window.message: ", msg);
        /* istanbul ignore else */
        if (!msg || !msg.type) {
          return;
        }

        /* istanbul ignore next */
        Topic.publish('/' + msg.type, msg);
      });

      Ready(this, function () {
        // console.log("Instantiate App Widgets");
        query('.showOnLoad').removeClass('dijitHidden');
        Parser.parse().then(function () {
          // console.log("ApplicationContainer: ", _self.getApplicationContainer());
          _self.startup();
        });
      });
    },
    startup: function () {
      // var _self = this;
      Router.startup();
      this.listen();
    },

    listen: function () {
      var _self = this;

      on(document, '.DialogButton:click', function (evt) {
        // console.log("DialogButton Click", evt);
        evt.preventDefault();
        evt.stopPropagation();
        var params = {};

        var rel = evt.target.attributes.rel.value;
        var parts = rel.split(':');

        var type = parts[0];
        params = parts.slice(1).join(':');
        /* istanbul ignore if */
        if (params.charAt(0) === '{') {
          params = JSON.parse(params);
        }

        var panel = _self.panels[type];
        /* istanbul ignore if */
        if (!panel) {
          throw Error('Ivalid Panel: ' + type);

        }
        /* istanbul ignore next */
        if (panel.requireAuth && (!_self.user || !_self.user.id)) {
          Topic.publish('/login');
          return;
        }

        var w = _self.loadPanel(type, params);
        Deferred.when(w, function (w) {
          /* istanbul ignore else */
          if (!_self.dialog) {
            _self.dialog = new Dialog({ parseOnLoad: false, title: w.title });
          } else {
            _self.dialog.set('title', w.title);
          }
          _self.dialog.set('content', '');
          domConstruct.place(w.domNode, _self.dialog.containerNode);
          /* istanbul ignore next */
          w.on('ContentReady', function () {
            _self.dialog.resize();
            _self.dialog._position();
          });
          w.startup();
          _self.dialog.show();
        });

        // console.log("Open Dialog", type);
      });

      on(document, '.NonmodalDialogButton:click', function (evt) {
        // console.log("DialogButton Click", evt);
        evt.preventDefault();
        evt.stopPropagation();
        var params = {};

        var rel = evt.target.attributes.rel.value;
        var parts = rel.split(':');

        var type = parts[0];
        params = parts.slice(1).join(':');
        /* istanbul ignore if */
        if (params.charAt(0) === '{') {
          params = JSON.parse(params);
        }

        var panel = _self.panels[type];
        /* istanbul ignore if */
        if (!panel) {
          throw Error('Ivalid Panel: ' + type);

        }
        /* istanbul ignore next */
        if (panel.requireAuth && (!_self.user || !_self.user.id)) {
          Topic.publish('/login');
          return;
        }

        var w = _self.loadPanel(type, params);
        /* istanbul ignore next */
        if (_self.nmDialog && _self.nmDialog.open === true) {
          // console.log("in destroy", _self.nmDialog);
          _self.nmDialog.open = false;
          _self.nmDialog.destroy();
        } else {
          Deferred.when(w, function (w) {
            // console.log("create new NMDialog");
            _self.nmDialog = new NMDialog({ parseOnLoad: false, title: w.title });
            _self.nmDialog.set('content', '');
            domConstruct.place(w.domNode, _self.nmDialog.containerNode);
            /* istanbul ignore next */
            w.on('ContentReady', function () {
              _self.nmDialog.resize();
              _self.nmDialog._position();
            });
            w.startup();
            _self.nmDialog.show();
          });
        }
        // console.log("Open Dialog", type);
      });

      on(document, 'dialogAction', function (evt) {
        // console.log("dialogAction", evt)
        /* istanbul ignore next */
        if (_self.dialog && evt.action === 'close') {
          _self.dialog.hide();
        }

      });
      /* istanbul ignore next */
      Topic.subscribe('/openDialog', function (msg) {
        var type = msg.type;
        var params = msg.params || {};
        var w = _self.loadPanel(type, params);
        Deferred.when(w, function (w) {
          if (!_self.dialog) {
            _self.dialog = new Dialog({ parseOnLoad: false, title: w.title });
          } else {
            _self.dialog.set('title', w.title);
          }
          _self.dialog.set('content', '');
          domConstruct.place(w.domNode, _self.dialog.containerNode);
          _self.dialog.show();
          w.startup();
        });

        // console.log("Open Dialog", type);
      });
      /* istanbul ignore next */
      on(window, 'message', function (msg) {
        // console.log('onMessage: ', msg);
        if (msg && msg.data === 'RemoteReady') {
          return;
        }
        msg = JSON.parse(msg.data);
        // console.log('Message From Remote: ', msg);
        if (msg && msg.topic) {
          Topic.publish(msg.topic, msg.payload);
        }
      }, '*');

      /* istanbul ignore next */
      Topic.subscribe('/navigate', function (msg) {
        // console.log("app.js handle /navigate msg");
        // console.log("msg.href length: ", msg.href.length)
        if (!msg || !msg.href ) {
          console.error('Missing navigation message');
          return;
        }

        if (msg.target && msg.target === 'blank') {
          var child = window.open('/remote', '_blank');
          var handle = on(child, 'message', function (cmsg) {
            if (cmsg && cmsg.data && cmsg.data === 'RemoteReady') {
              child.postMessage(JSON.stringify({
                'topic': '/navigate',
                'payload': { 'href': msg.href }
              }), '*');
              handle.remove();
            }
          });
          return;
        }
        Router.go(msg.href);
      });

      var showAuthDlg = function (evt) {
        /* istanbul ignore else */
        if (evt) {
          evt.preventDefault();
          evt.stopPropagation();
        }
        var dlg = new Dialog({
          title: 'Login',
          content: "<div class=\"LoginForm\" data-dojo-type=\"p3/widget/LoginForm\" style=\"width:300px; margin-left:auto;margin-right:auto;font-size:1.1em;margin-bottom:20px;margin-top:10px;padding:10px;\" data-dojo-props='callbackURL: \"<%- callbackURL %>\"'></div>"
        });
        dlg.show();
      };

      var showUserProfile = function (evt) {
        /* istanbul ignore else */
        if (evt) {
          evt.preventDefault();
          evt.stopPropagation();
        }
        // console.log(evt);
        var dlg = new Dialog({
          title: 'User Profile',
          content: "<div class=\"UserProfileForm\" data-dojo-type=\"p3/widget/UserProfileForm\" style=\"width:600px; margin-left:auto;margin-right:auto;font-size:1.1em;margin-bottom:10px;margin-top:10px;padding:10px;\" data-dojo-props='callbackURL: \"<%- callbackURL %>\"'></div>"
        });
        dlg.show();
      };

      var showSuLogin = function (evt) {
        /* istanbul ignore else */
        if (evt) {
          evt.preventDefault();
          evt.stopPropagation();
        }
        // console.log(evt);
        var dlg = new Dialog({
          title: 'SU Login',
          content: "<div class=\"SuLogin\" data-dojo-type=\"p3/widget/SuLogin\" style=\"width:600px; margin-left:auto;margin-right:auto;font-size:1.1em;margin-bottom:10px;margin-top:10px;padding:10px;\" data-dojo-props='callbackURL: \"<%- callbackURL %>\"'></div>"
        });
        dlg.show();
      };

      var showNewUser = function (evt) {
        /* istanbul ignore else */
        if (evt) {
          evt.preventDefault();
          evt.stopPropagation();
        }
        // console.log(evt);
        var dlg = new Dialog({
          title: 'Register User',
          content: "<div class=\"UserProfileForm\" data-dojo-type=\"p3/widget/UserProfileForm\" style=\"width:600px; margin-left:auto;margin-right:auto;font-size:1.1em;margin-bottom:10px;margin-top:10px;padding:10px;\" data-dojo-props='callbackURL: \"<%- callbackURL %>\"'></div>"
        });
        dlg.show();
      };

      // var timer;
      on(document, '.HomeServiceLink:click', function (evt) {
        var target = evt.target;
        var rel;
        // console.log('TARGET: ', target);
        /* istanbul ignore else */
        if (target.attributes.rel && target.attributes.rel.value) {
          rel = target.attributes.rel.value;
        } else {
          target = target.parentNode;
          rel = target.attributes.rel.value;
        }

        Registry.byId('p3carousel').selectChild(Registry.byId(rel));
        query('.HomeServiceLink').removeClass('selected');
        domClass.add(target, 'selected');
      });

      on(document, '.loginLink:click', showAuthDlg);
      on(document, '.userProfile:click', showUserProfile);
      on(document, '.sulogin:click', showSuLogin);
      on(document, '.registrationLink:click', showNewUser);
      on(document, '.showRegWidget:click', showNewUser);
      on(document, '.showLoginWidget:click', showAuthDlg);

      Topic.subscribe('/login', showAuthDlg);

      on(document, '.navigationLink:click', function (evt) {
        // console.log("NavigationLink Click", evt);
        evt.preventDefault();
        // evt.stopPropagation();
        // console.log("APP Link Target: ", evt.target.pathname, evt.target.href, evt.target);
        var parts = evt.target.href.split(evt.target.pathname);
        // console.log("navigationLink:click - " + evt.target.pathname + (parts[1]||"") )
        /* istanbul ignore next */
        Router.go(evt.target.pathname + (parts[1] || ''));
      });

      on(document, '.navigationLinkOut:click', function (evt) {
        // console.log(evt);
        evt.preventDefault();
        var target = evt.srcElement || evt.target;
        window.open(target.href);
      });

    },
    loadPanel: function (id, params, callback) {
      var def = new Deferred();
      // console.log('Load Panel!', id, params);
      var p = this.panels[id];
      if (!p.params) {
        p.params = {};
      }

      p.params.title = p.params.title || p.title;
      p.params.closable = true;
      /* istanbul ignore next */
      if (p.ctor && typeof p.ctor === 'function') {
        var w = new p.ctor(p.params);
        def.resolve(w);
      } else if (p.ctor && typeof p.ctor === 'string') {
        var reqs = [];
        if (window.App && window.App.production && p.layer) {
          reqs.push(p.layer);
        }

        reqs.push(p.ctor);
        require(reqs, function () {
          var prop;
          var ctor = arguments[arguments.length - 1];
          var w = new ctor(p.params);

          if (typeof params === 'object') {
            for (prop in params) {
              // guard-for-in
              if (Object.prototype.hasOwnProperty.call(params, prop)) {
                w.set(prop, params[prop]);
              }
            }
          } else if (params && p.dataParam) {
            w.set(p.dataParam, params);
          }
          if (p.wrap) {
            var cp = new ContentPane({ title: p.params.title || p.title, closable: true });
            cp.containerNode.appendChild(w.domNode);
            w.startup();
            def.resolve(cp);
          } else {
            def.resolve(w);
          }
        });
      }
      return def.promise;
    },
    applicationContainer: null,

    getApplicationContainer: function () {
      /* istanbul ignore if */
      if (this.applicationContainer) {
        // console.log("Already existing AppContainer");
        return this.applicationContainer;
      }
      this.applicationContainer = Registry.byId('ApplicationContainer');
      // console.log("Application Container from registry: ", this.applicationContainer);
      return this.applicationContainer;
    },
    getCurrentContainer: function () {
      var ac = this.getApplicationContainer();

      var ch = ac.getChildren().filter(function (child) {
        return child.region === 'center';
      });
      /* istanbul ignore next */
      if (!ch || ch.length < 1) {
        // console.warn('Unable to find current container');
        return false;
      }
      /* istanbul ignore next */
      return ch[0];
    },

    getConstructor: function (cls) {
      var def = new Deferred();
      require([cls], function (ctor) {
        def.resolve(ctor);
      });
      return def.promise;
    },

    _doNavigation: function (newNavState) {
      var _self = this;
      if (!newNavState) {
        return;
      }

      // console.log("Do Navigation to href: ", newNavState);

      var appContainer = this.getApplicationContainer();
      var ctor;

      /*  istanbul ignore else */
      if (newNavState.widgetClass) {
        ctor = this.getConstructor(newNavState.widgetClass);
      } else {
        ctor = ContentPane;
      }

      // console.log("newNavState.requireAuth: ", newNavState.requireAuth, window.App);
      if (newNavState.requireAuth && (window.App.authorizationToken === null || window.App.authorizationToken === undefined)) {
        // console.log(window.App.authorizationToken);
        var cur = _self.getCurrentContainer();
        /* istanbul ignore else */
        if (cur) {
          appContainer.removeChild(cur, true);
        }

        var lp = new ContentPane({
          region: 'center',
          content: '<div style="text-align: center;width:100%;"><h3>PATRIC Login</h3><p>This service requires authentication. Please <a class="showLoginWidget">login</a> or <a class="showRegWidget">register as a new user.</a></p>' +
            '<div class="LoginForm" data-dojo-type="p3/widget/LoginForm" style="width:300px; margin-left:auto;margin-right:auto;font-size:1.1em;margin-bottom:20px;margin-top:10px;padding:10px;"></div>'
        });
        appContainer.addChild(lp);
        return;
      }

      Deferred.when(ctor, function (ctor) {
        /*  istanbul ignore if */
        if (!ctor) {
          console.error('Unable to load CTOR');
          return;
        }
        // var acceptType = newNavState.widgetClass ? 'application/json' : 'text/html';
        var instance;
        var cur = _self.getCurrentContainer();
        /*  istanbul ignore else */
        if (cur instanceof ctor) {
          instance = cur;
          // console.log("newNavState: ", newNavState);
          /*  istanbul ignore if */
          if (newNavState.widgetExtraClass) {
            instance.domNode.classList.add(newNavState.widgetExtraClass);
          }

          instance.set('state', newNavState);
          /*  istanbul ignore if */
          if (newNavState.set) {
            instance.set(newNavState.set, newNavState.value);
          }
          /*  istanbul ignore if */
          if (instance.resize) {
            instance.resize();
          }

          return;
        }
        /*  istanbul ignore next */
        var opts = { region: 'center', apiServer: _self.apiServer, state: newNavState };
        /*  istanbul ignore next */
        if (newNavState.set) {
          opts[newNavState.set] = newNavState.value;
        }

        /*  istanbul ignore next */
        instance = new ctor(opts);

        /*  istanbul ignore next */
        if (cur) {
          appContainer.removeChild(cur, true);
        }

        /*  istanbul ignore next */
        appContainer.addChild(instance);
      });
    },
    getNavigationContent: function (href, acceptType) {
      href = this.apiServer + href;
      var headers = {
        'Accept': acceptType,
        'X-Requested-With': null
      };

      // console.log("getNavigationContent: ", href, acceptType);
      return xhr.get(href, {
        headers: headers,
        handleAs: (acceptType === 'application/json') ? 'json' : '',
        query: (acceptType === 'text/html') ? { 'http_templateStyle': 'embedded' } : '',
        withCredentials: true
      });

    },
    navigate: function (msg) {

      /*  istanbul ignore else */
      if (!msg.href) {
        /*  istanbul ignore else */
        if (msg.id) {
          msg.href = msg.id;
        }
      }
      /*  istanbul ignore else */
      if (msg.pageTitle) {
        window.document.title = msg.pageTitle;
      }

      this._doNavigation(msg);
    }

  });
});
