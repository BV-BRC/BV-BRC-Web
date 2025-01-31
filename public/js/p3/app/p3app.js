define([
  'dojo/_base/declare',
  'dojo/topic', 'dojo/on', 'dojo/dom', 'dojo/dom-class', 'dojo/dom-attr', 'dojo/dom-construct', 'dojo/query',
  'dijit/registry', 'dojo/_base/lang',
  'dojo/_base/Deferred',
  'dojo/store/JsonRest', 'dojox/widget/Toaster',
  'dojo/ready', './app', '../router',
  'dojo/window', '../widget/Drawer', 'dijit/layout/ContentPane',
  '../jsonrpc', '../panels', '../WorkspaceManager', '../DataAPI', 'dojo/keys',
  'dijit/ConfirmDialog', '../util/PathJoin', 'dojo/request', '../widget/WorkspaceController'
], function (
  declare,
  Topic, on, dom, domClass, domAttr, domConstruct, domQuery,
  Registry, lang,
  Deferred,
  JsonRest, Toaster,
  Ready, App,
  Router, Window,
  Drawer, ContentPane,
  RPC, Panels, WorkspaceManager, DataAPI, Keys,
  ConfirmDialog, PathJoin, xhr, WorkspaceController
) {
  return declare([App], {
    panels: Panels,
    activeWorkspace: null,
    activeWorkspacePath: '/',
    uploadInProgress: false,
    activeMouse: true,
    alreadyLoggedIn: false,
    authorizationToken: null,
    user: '',
    startup: function () {
      var _self = this;
      this.checkLogin();
      if (window.App.alreadyLoggedIn) {
        this.refreshUser().then(function (u) {
          if (!u) {
            return
          }
          if (u.email_verified) {
            domClass.remove(document.body, 'unverified_email')
          } else {
            domClass.add(document.body, 'unverified_email')
          }
        })
      }

      on(document, 'keydown', function (evt) {
        // only act if ctrl-shift-d
        if (!(evt.ctrlKey && evt.shiftKey && evt.keyCode === 68)) {
          return;
        }

        if (!this._devDlg) {
          this._devDlg = new ConfirmDialog({
            title: 'Debugging Panel',
            style: { width: '350px' },
            content: '<div data-dojo-type="p3/widget/DeveloperPanel" style="height: 125px"></div>'
          });
          this._devDlg.cancelButton.domNode.style.display = 'none';
        }

        if (!this._devDlg.open) {
          this._devDlg.show();
        }
      });
      /* istanbul ignore next */
      var onDocumentTitleChanged = function () {
        // var meta = document.getElementsByTagName("meta[name='Keyword']");
        var meta = domQuery("meta[name='Keywords']")[0];
        if (meta) {
          meta.content = 'BRC,' + (document.title).replace('::', ',');
        }
        if (window.gtag) {
          // console.log("document title changed to", document.title);
          var pagePath = window.location.pathname + window.location.hash;
          gtag('config', window.App.gaID, { 'page_path': pagePath });
        }
      };

      // listening document.title change event
      var titleEl = document.getElementsByTagName('title')[0];
      var docEl = document.documentElement;
      /* istanbul ignore next */
      if (docEl && docEl.addEventListener) {
        docEl.addEventListener('DOMSubtreeModified', function (evt) {
          var t = evt.target;
          if (t === titleEl || (t.parentNode && t.parentNode === titleEl)) {
            onDocumentTitleChanged();
          }
        }, false);
      } else {
        document.onpropertychange = function () {
          if (window.event.propertyName === 'title') {
            onDocumentTitleChanged();
          }
        };
      }

      function getState(params, path) {
        var parser = document.createElement('a');
        parser.href = path;
        /* istanbul ignore next */
        var newState = params.state || {};

        newState.href = path;
        newState.prev = params.oldPath;
        // console.log("parser getState: ", parser);
        /* istanbul ignore next */
        if (newState.search) {
          // pass
        } else if (parser.search) {
          newState.search = (parser.search.charAt(0) === '?') ? parser.search.substr(1) : parser.search;
        } else {
          newState.search = '';
        }

        // console.log("New State Search: ", newState.search);
        newState.hash = parser.hash;
        newState.pathname = parser.pathname;
        /* istanbul ignore next */
        if (newState.hash) {
          newState.hash = (newState.hash.charAt(0) === '#') ? newState.hash.substr(1) : newState.hash;
          // console.log("PARSE HASH: ", newState.hash)
          newState.hashParams = newState.hashParams || {};

          var hps = newState.hash.split('&');
          hps.forEach(function (t) {
            var tup = t.split('=');
            if (tup[0] && tup[1]) {
              newState.hashParams[tup[0]] = tup[1];
            }
          });
          // console.log("newState.hashParams: ", newState.hashParams)
        }
        return newState;
      }

      function populateState(params) {
        var newState = { href: params.newPath };
        for (var prop in params.state) {
          // guard-for-in
          if (Object.prototype.hasOwnProperty.call(params.state, prop)) {
            newState[prop] = params.state[prop];
          }
        }
        return newState;
      }

      Router.register('/$', function (params, oldPath, newPath, state) {
        var homeNode = dom.byId('bv-brc-home');
        if (homeNode) {
          return;
        }
        window.location.reload();
      });

      Router.register('/remote', function (params, oldPath, newPath, state) {
        console.log('REMOTE WINDOW, WAIT FOR /navigate message');
        window.postMessage('RemoteReady', '*');
      });

      Router.register('/verify_refresh', function (params, oldPath, newPath, state) {
        console.log('verify refresh')

        // console.log("Upload URL Callback", params.newPath);
        var newState = populateState(params);

        /* istanbul ignore next */
        // var path = params.params[0] || '/'; // JSP: not used.
        newState.widgetClass = 'p3/widget/VerifyEmailRefresh';
        newState.style = 'padding:0';
        newState.requireAuth = false;
        newState.pageTitle = 'Thank You';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      })

      Router.register('/login', function (params, oldPath, newPath, state) {
        // console.log("Workspace URL Callback", params.newPath);
        var newState = populateState(params);

        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'p3/widget/LoginForm';
        newState.value = path;
        newState.set = 'path';
        newState.requireAuth = false;
        newState.pageTitle = 'Login | BV-BRC';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('/register(.*)', function (params, oldPath, newPath, state) {
        // console.log("Workspace URL Callback", params.newPath);
        var newState = populateState(params);
        // console.log("newState /register", params)
        /* istanbul ignore next */
        // var path = params.params[0] || '/';
        newState.widgetClass = 'p3/widget/UserProfileForm';
        newState.value = '/register'
        newState.set = 'path';
        newState.requireAuth = false;
        newState.pageTitle = 'Registration | BV-BRC';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('/job(/.*)', function (params, oldPath, newPath, state) {
        // console.log("Workspace URL Callback", params.newPath);
        var newState = populateState(params);

        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'p3/widget/JobManager';
        newState.value = path;
        newState.set = 'path';
        newState.requireAuth = true;
        newState.pageTitle = 'Jobs Status | BV-BRC';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('/search/(.*)', function (params, oldPath, newPath, state) {
        // console.log("Search Route: ", arguments);
        var newState = getState(params, oldPath);
        newState.widgetClass = 'p3/widget/AdvancedSearch';
        newState.requireAuth = false;
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('/uploads(/.*)', function (params, oldPath, newPath, state) {
        // console.log("Upload URL Callback", params.newPath);
        var newState = populateState(params);

        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'p3/widget/UploadManager';
        newState.value = path;
        newState.set = 'path';
        newState.requireAuth = true;
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('/content(/.*)', function (params, oldPath, newPath, state) {
        // console.log("Upload URL Callback", params.newPath);
        var newState = populateState(params);

        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'dijit/layout/ContentPane';
        newState.style = 'padding:0';
        newState.value = PathJoin(_self.dataAPI, 'content', path);
        newState.set = 'href';
        newState.requireAuth = false;
        newState.pageTitle = 'BV-BRC';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('/webpage(/.*)', function (params, oldPath, newPath, state) {
        // console.log("webpage", params);
        /* istanbul ignore next */
        var path = params.params[0] || '/';
        var newState = getState(params, oldPath);
        newState.widgetClass = 'p3/widget/WebPagePane';
        newState.widgetExtraClass = 'webpage';
        newState.value = PathJoin(_self.docsServiceURL, path);
        newState.set = 'href';
        newState.requireAuth = false;

        _self.navigate(newState);
      });

      Router.register('/user(/.*)', function (params, oldPath, newPath, state) {
        // console.log('user', params);
        /* istanbul ignore next */
        var path = params.params[0] || '/';
        var newState = getState(params, oldPath);
        newState.widgetClass = 'p3/widget/UserDetails';
        newState.widgetExtraClass = 'user';
        newState.value = PathJoin(_self.docsServiceURL, path);
        newState.set = 'href';
        newState.requireAuth = true;
        _self.navigate(newState);
      });

      Router.register('/sulogin', function (params, oldPath, newPath, state) {
        // console.log('sulogin', params);
        /* istanbul ignore next */
        var path = params.params[0] || '/';
        var newState = getState(params, oldPath);
        newState.widgetClass = 'p3/widget/SuLogin';
        newState.widgetExtraClass = 'sulogin';
        newState.value = PathJoin(_self.docsServiceURL, path);
        newState.set = 'href';
        newState.requireAuth = true;
        _self.navigate(newState);
      });

      Router.register('/help(/.*)', function (params, oldPath, newPath, state) {
        // console.log("Upload URL Callback", params.newPath);
        var newState = populateState(params);

        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'dijit/layout/ContentPane';
        newState.style = 'padding:0';
        newState.value = /* _self.dataAPI +*/ '/public/help/' + path;
        newState.set = 'href';
        newState.requireAuth = false;
        newState.pageTitle = 'BV-BRC';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });


      Router.register('/workspace(/.*)', function (params, oldPath, newPath, state) {
        // console.log("Workspace URL Callback", params.newPath);
        var newState = populateState(params);

        /* istanbul ignore next */
        var path = params.params[0] || ('/' + _self.user.id); //  + "/home/")
        var parts = path.split('/');
        /* istanbul ignore next */
        if (path.replace(/\/+/g, '') === 'public') {
          path = '/public/';
        } else if (parts.length < 3) {
          path = ('/' + _self.user.id);  // + "/home/"
        }

        newState.widgetClass = 'p3/widget/WorkspaceManager';
        newState.value = path;
        newState.set = 'path';
        newState.requireAuth = false;
        newState.pageTitle = 'Workspaces | BV-BRC';
        _self.navigate(newState);
      });

      Router.register('/view(/.*)', function (params, path) {
        var newState = getState(params, path);
        var parts = newState.pathname.split('/');
        parts.shift();
        var type = parts.shift();

        newState.widgetClass = 'p3/widget/viewer/' + type;

        _self.navigate(newState);
      });

      Router.register('/outbreaks(/.*)', function (params, path) {
        var newState = getState(params, path);
        var parts = newState.pathname.split('/');
        parts.shift();
        var type = parts.shift();

        newState.widgetClass = 'p3/widget/outbreaks/' + type + '/index';
        newState.requireAuth = false;

        _self.navigate(newState);
      });

      Router.register('/status', function (params, path) {
        var newState = populateState(params);

        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'p3/widget/viewer/SystemStatus';
        newState.value = path;
        newState.set = 'path';
        newState.requireAuth = false;
        newState.pageTitle = 'System Status | BV-BRC';

        _self.navigate(newState);
      });

      Router.register('/searches(/.*)', function (params, path) {
        let newState = getState(params, path);
        let parts = newState.pathname.split('/');
        parts.shift();
        const type = parts.shift();

        newState.widgetClass = 'p3/widget/search/' + type;
        newState.requireAuth = false;

        if (newState.search) {
          newState.search.split('&').map(s => {
            const [key, value] = s.split('=');
            newState[key] = decodeURIComponent(value);
          });
        }

        _self.navigate(newState);
      });

      Router.register('/app(/.*)', function (params, path) {
        // console.log("view URL Callback", arguments);

        var parts = path.split('/');
        parts.shift();
        var type = parts.shift();
        // for rerun functionality
        var type_parts = type.split('?');
        var type = type_parts[0];
        // var rerun_key = type_parts[1]; // JSP: not used
        var viewerParams;
        /* istanbul ignore if */
        if (parts.length > 0) {
          viewerParams = parts.join('/');
        } else {
          viewerParams = '';
        }
        // console.log("Parts:", parts, type, viewerParams)

        var newState = populateState(params);

        // console.log("Parts:", parts, type, path)
        newState.widgetClass = 'p3/widget/app/' + type;
        newState.value = viewerParams;
        newState.set = 'params';
        // move requireAuth check to AppBase and its derieved class
        newState.requireAuth = false;

        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });
      /* istanbul ignore else */
      if (!this.api) {
        this.api = {};
      }
      /* istanbul ignore else */
      if (this.workspaceAPI) {
        /* istanbul ignore next */
        WorkspaceManager.init(this.workspaceAPI, this.authorizationToken || '', this.user ? this.user.id : '');
        this.api.workspace = RPC(this.workspaceAPI, this.authorizationToken || '');
      }
      /* istanbul ignore else */
      if (this.serviceAPI) {
        // console.log("Setup API Service @ ", this.serviceAPI);
        this.api.service = RPC(this.serviceAPI, this.authorizationToken || '');
      }
      /* istanbul ignore else */
      if (this.dataAPI) {
        /* istanbul ignore else */
        if (this.dataAPI.charAt(-1) !== '/') {
          this.dataAPI = this.dataAPI + '/';
        }
        DataAPI.init(this.dataAPI, this.authorizationToken || '');
        this.api.client = DataAPI;
        this.api.data = RPC(this.dataAPI, this.authorizationToken);
      }

      this.toaster = new Toaster({ positionDirection: 'bl-up', messageTopic: '/Notification', duration: 3000 });

      /* istanbul ignore else */
      if (this.user && this.user.id) {
        console.log('this.user: ', this.user)
        domAttr.set('YourWorkspaceLink', 'href', '/workspace/' + this.user.id);
        var n = dom.byId('signedInAs');
        /* istanbul ignore else */
        if (n) {
          n.innerHTML = this.user.id.replace('@' + localStorage.getItem('realm'), '');
        }

        if (!this.user.email_verified) {
          domClass.add(document.body, 'unverified_email')
        } else {
          domClass.remove(document.body, 'unverified_email')
        }
      }

      Topic.subscribe('/userWorkspaces', lang.hitch(this, 'updateUserWorkspaceList'));
      Topic.subscribe('/userWorkspaces', lang.hitch(this, 'updateMyDataSection'));

      // update "My Data" > "Completed Jobs" count on homepage
      if (this.user && this.user.id) {
        this.api.service('AppService.query_task_summary', []).then(function (status) {
          var node = dom.byId('MyDataJobs');
          if (node) {
            node.innerHTML = status[0].completed + ' Completed Jobs';
          }
        });
      }

      this.inherited(arguments);
      this.timeout();
    },

    timeout: function () {
      setTimeout(function () {
        // check if logged out and another tab is open
        if (!localStorage.getItem('tokenstring')) {
          if (document.getElementsByClassName('Authenticated').length > 0) {
            document.body.className = document.body.className.replace('Authenticated', '');
            // console.log("Redirect");
            window.location.assign('/');
          }
        } else {
          // check if token has expired
          window.App.checkLogin();
        }
        window.App.timeout();
      }, window.App.localStorageCheckInterval);
    },
    checkLogin: function () {
      // console.log(window.App.uploadInProgress);
      // console.log('checking for login');
      if (localStorage.getItem('tokenstring')) {
        var auth = localStorage.getItem('auth');
        // console.log('Auth: ', auth);
        var validToken = false;
        if (auth) {
          // console.log('Parse auth json', auth);
          auth = JSON.parse(auth);
          // console.log('Auth: ', auth);
          // console.log('CheckExpToken', auth.expiry);
          if (auth && auth.expiry) {
            validToken = this.checkExpToken(auth.expiry);
            // console.log('this is a valid token: ' + validToken );
            if (validToken && window.App.alreadyLoggedIn) {
              if (window.location.pathname == '/login' || window.location.pathname == '/register') {
                window.location.pathname = '/'
              }
              return true;
            }
          } else {
            validToken = false;
          }
        }

        console.log('Valid Token: ', validToken);
        if (validToken) { // && !window.App.alreadyLoggedIn) {
          if (!document.body.className.includes('Authenticated')) {
            document.body.className += 'Authenticated';
            // console.log('add to body class');
            // console.log(document.body.className);
          }
          // var docbody = document.getElementsByClassName('patric')[0];
          // console.log(docbody);
          window.App.user = JSON.parse(localStorage.getItem('userProfile'));
          window.App.authorizationToken = localStorage.getItem('tokenstring');
          addEventListener('storage', function (evt) {
            console.log('p3App Storage Listener: ', evt)
            if (evt.key === 'userProfile') {
              var rawu = localStorage.getItem('userProfile')
              var u = JSON.parse(rawu)
              if (!u) {
                console.log('Missing User: ', rawu)
                return
              }
              if (u.email_verified) {
                domClass.remove(document.body, 'unverified_email')
              } else {
                domClass.add(document.body, 'unverified_email')
              }
            }
          }, false)
          // show the upload and jobs widget
          window.App.uploadJobsWidget('show');
          window.App.checkSU();
          window.App.alreadyLoggedIn = true;
        } else {
          // if mouse has moved in past x minutes then refresh the token
          // or if upload is in progress then refresh the token
          // console.log('I am uploading a file');
          console.log(window.App.uploadInProgress);
          // console.log('The mouse has been active');
          console.log(window.App.activeMouse);
          if (window.App.activeMouse || window.App.uploadInProgress) {
            console.log('going to refresh the token now');
            var userServiceURL = window.App.userServiceURL;
            userServiceURL.replace(/\/+$/, '');
            xhr.get(userServiceURL + '/authenticate/refresh/', {
              headers: {
                'Accept': 'application/json',
                'Authorization': window.App.authorizationToken
              }
            })
              .then(
                function (data) {
                  // console.log('storing new token');
                  console.log(data);
                  localStorage.setItem('tokenstring', data);
                  window.App.authorizationToken = data;
                  var dataArr = data.split('|');
                  var keyValueArr = [];
                  var dataobj = {};
                  for (var i = 0; i < dataArr.length; i++) {
                    keyValueArr = dataArr[i].split('=');
                    dataobj[keyValueArr[0]] = keyValueArr[1];
                  }
                  localStorage.setItem('auth', JSON.stringify(dataobj));
                  window.App.checkLogin();
                },
                /* istanbul ignore next */
                function (err) {
                  console.log(err);
                }
              );
          } else {
            console.log('logging you out now, sorry');
            window.App.logout();
          }
        }
      }
    },
    checkSU: function () {
      var suLink = document.getElementsByClassName('sulogin');
      var sbLink = document.getElementsByClassName('suSwitchBack');
      var auth = localStorage.getItem('auth');
      var Aauth = localStorage.getItem('Aauth');
      auth = JSON.parse(auth);
      Aauth = JSON.parse(Aauth);
      if (auth && auth.roles) {
        if (auth.roles.includes('admin')) {
          suLink[0].style.display = 'block';
        } else {
          suLink[0].style.display = 'none';
        }
      } else {
        suLink[0].style.display = 'none';
      }
      // condition for suSwitchBack button
      if (Aauth && Aauth.roles) {
        if (Aauth.roles.includes('admin')) {
          sbLink[0].style.display = 'block';
          var loginBtn = document.querySelector('.login-btn');
          loginBtn.classList.remove('icon-user');
          loginBtn.classList.add('icon-superpowers', 'warning');
        } else {
          sbLink[0].style.display = 'none';
        }
      } else {
        sbLink[0].style.display = 'none';
      }
    },
    suSwitchBack: function () {
      console.log('I clicked the switch back button');
      localStorage.setItem('auth', localStorage.getItem('Aauth'));
      localStorage.setItem('tokenstring', localStorage.getItem('Atokenstring'));
      localStorage.setItem('userProfile', localStorage.getItem('AuserProfile'));
      localStorage.setItem('userid', localStorage.getItem('Auserid'));
      localStorage.setItem('realm', localStorage.getItem('Arealm'));
      localStorage.removeItem('Aauth');
      localStorage.removeItem('Atokenstring');
      localStorage.removeItem('AuserProfile');
      localStorage.removeItem('Auserid');
      window.App.authorizationToken = localStorage.getItem('tokenstring');
      window.App.user = JSON.parse(localStorage.getItem('userProfile'));
      window.location.href = '/';
    },
    checkExpToken: function (date) {
      var d = new Date();
      var checkd = d.valueOf() / 1000;

      if (checkd > date) {
        console.log('expired');
        return false;
      }
      return true;
    },
    login: function (data, token) {
      /* istanbul ignore else */
      if (data !== undefined) {
        localStorage.setItem('auth', JSON.stringify(data));
        localStorage.setItem('tokenstring', token);
        // localStorage.setItem('tokenid', data.tokenid);
        var parts = data.un.split('@')
        var userid = data.un.replace('@' + parts[1], '');
        localStorage.setItem('userid', userid);
        localStorage.setItem('realm', parts[1])
        var userServiceURL = window.App.userServiceURL;
        userServiceURL.replace(/\/+$/, '');
        xhr.get(userServiceURL + '/user/' + userid, {
          headers: {
            'Accept': 'application/json',
            'Authorization': token
          }
        })
          .then(
            function (user) {
              var userObj = JSON.parse(user);
              userObj.id += '@' + localStorage.getItem('realm');
              user = JSON.stringify(userObj);
              // Is this removal necessary?
              // localStorage.removeItem('userProfile');
              localStorage.setItem('userProfile', user);
              console.log('window.location.path: ', window.location.pathname)
              if (window.location.pathname === '/login' || window.location.pathname == '/register') {
                window.location = '/'
              } else {
                window.location.reload();
              }
            },
            /* istanbul ignore next */
            function (err) {
              console.log(err);
            }
          );
      } else {
        console.log('i am not logged in yet');
      }
    },
    WithVipr: function (data, token) {
      if (data !== undefined) {
        localStorage.setItem('auth', JSON.stringify(data));
        localStorage.setItem('tokenstring', token);
        var userid = data.client_id.replace('@viprbrc.org', '');
        localStorage.setItem('userid', userid);

        // for vipr, we only have the userid for now.
        localStorage.removeItem('userProfile');
        localStorage.setItem('userProfile', JSON.stringify({
          id: userid + '@viprbrc.org',
          altLogin: 'vipr'
        }));

        window.location.reload();
      } else {
        console.log('loginWithVipr: not logged in yet (?)');
      }
    },
    uploadJobsWidget: function (action) {
      if (action === 'show') {
        // console.log('I want to see the upload and jobs widget');
        var wsc = new WorkspaceController({ region: 'bottom' });
        var ac = this.getApplicationContainer();
        // console.log(ac);
        var uploadBar = ac.domNode.getElementsByClassName('WorkspaceController');
        if (uploadBar.length === 0) {
          ac.addChild(wsc);
        }
      } else {
        console.log('I should not see the upload and jobs widget');
      }
    },
    refreshUser: function () {
      return xhr.get(this.userServiceURL + '/user/' + window.localStorage.userid, {
        headers: {
          'Accept': 'application/json',
          'Authorization': window.App.authorizationToken
        }
      })
        .then(
          function (user) {
            var userObj = JSON.parse(user);
            // console.log(userObj);
            userObj.id += '@' + localStorage.getItem('realm');
            console.log(userObj);
            user = JSON.stringify(userObj);
            localStorage.removeItem('userProfile');
            localStorage.setItem('userProfile', user);
            return userObj
            // document.body.className += 'Authenticated';
            // window.location.reload();
          },
          /* istanbul ignore next */
          function (err) {
            console.log(err);
          }
        );
    },
    logout: function () {
      if (!window.App.uploadInProgress) {
        localStorage.removeItem('tokenstring');
        localStorage.removeItem('userProfile');
        localStorage.removeItem('auth');
        localStorage.removeItem('userid');
        localStorage.removeItem('Aauth');
        localStorage.removeItem('Atokenstring');
        localStorage.removeItem('AuserProfile');
        localStorage.removeItem('Auserid');
        window.location.assign('/');
        // remove the upload and jobs widget
        window.App.uploadJobsWidget('hide');
      } else {
        alert('upload is in progress, try Logout again later');
      }
    },
    updateMyDataSection: function (data) {
      var node = dom.byId('YourWorkspaceLink2');
      if (!node) {
        return;
      }
      // console.warn(data)
      domAttr.set('YourWorkspaceLink2', 'href', '/workspace/' + this.user.id);
      data.filter(function (ws) {
        return ws.name === 'home';
      }).forEach(function (ws) {
        // console.log(ws)
        var wsGGNode = dom.byId('MyDataGenomeGroup');
        var wsFGNode = dom.byId('MyDataFeatureGroup');
        var wsEGNode = dom.byId('MyDataExperimentGroup');

        // update links
        wsGGNode.href = '/workspace' + ws.path + '/Genome%20Groups';
        wsFGNode.href = '/workspace' + ws.path + '/Feature%20Groups';
        wsEGNode.href = '/workspace' + ws.path + '/Experiment%20Groups';

        // update counts for workspace groups
        WorkspaceManager.getFolderContents(ws.path + '/Genome Groups')
          .then(function (items) {
            wsGGNode.innerHTML = items.length + ' Genome Groups';
          });
        WorkspaceManager.getFolderContents(ws.path + '/Feature Groups')
          .then(function (items) {
            wsFGNode.innerHTML = items.length + ' Feature Groups';
          });
        WorkspaceManager.getFolderContents(ws.path + '/Experiment Groups')
          .then(function (items) {
            wsEGNode.innerHTML = items.length + ' Experiment Groups';
          });

        // update counts for private genomes
        xhr.get(window.App.dataServiceURL + '/genome/?eq(public,false)', {
          headers: {
            'Accept': 'application/solr+json',
            'Content-Type': 'application/rqlquery+x-www-urlencoded',
            'Authorization': window.App.authorizationToken
          },
          handleAs: 'json'
        }).then(function (data) {
          // console.warn(data.response)
          var node = dom.byId('MyDataGenomes');
          node.innerHTML = data.response.numFound + ' Private Genomes';
        });
      });
    },
    updateUserWorkspaceList: function (data) {
      var wsNode = dom.byId('YourWorkspaces');
      domConstruct.empty('YourWorkspaces');

      let wsMobileNode = dom.byId('YourWorkspaces-mobile');
      domConstruct.empty('YourWorkspaces-mobile');

      const ws = data.find(d => d.name === 'home');
      if (ws) {
        var d = domConstruct.create('div', {style: {'padding-left': '12px'}}, wsNode);
        domConstruct.create('i', {
          'class': 'fa icon-caret-down fa-1x noHoverIcon',
          style: {'margin-right': '4px'}
        }, d);
        domConstruct.create('a', {
          'class': 'navigationLink',
          href: '/workspace' + ws.path,
          innerHTML: ws.name
        }, d);
        domConstruct.create('a', {
          href: '/workspace' + ws.path,
          innerHTML: ws.name
        }, wsMobileNode);
        domConstruct.create('br', {}, d);
        domConstruct.create('a', {
          'class': 'navigationLink',
          'style': {'padding-left': '16px'},
          href: '/workspace' + ws.path + '/Genome%20Groups',
          innerHTML: 'Genome Groups'
        }, d);
        domConstruct.create('a', {
          'style': {'padding-left': '16px'},
          href: '/workspace' + ws.path + '/Genome%20Groups',
          innerHTML: 'Genome Groups'
        }, wsMobileNode);
        domConstruct.create('br', {}, d);
        domConstruct.create('a', {
          'class': 'navigationLink',
          'style': {'padding-left': '16px'},
          href: '/workspace' + ws.path + '/Feature%20Groups',
          innerHTML: 'Feature Groups'
        }, d);
        domConstruct.create('a', {
          'style': {'padding-left': '16px'},
          href: '/workspace' + ws.path + '/Feature%20Groups',
          innerHTML: 'Feature Groups'
        }, wsMobileNode);
        domConstruct.create('br', {}, d);
        domConstruct.create('a', {
          'class': 'navigationLink',
          'style': {'padding-left': '16px'},
          href: '/workspace' + ws.path + '/Experiment%20Groups',
          innerHTML: 'Experiment Groups'
        }, d);
        domConstruct.create('a', {
          'style': {'padding-left': '16px'},
          href: '/workspace' + ws.path + '/Experiment%20Groups',
          innerHTML: 'Experiment Groups'
        }, wsMobileNode);
      }
    }
  });
});
