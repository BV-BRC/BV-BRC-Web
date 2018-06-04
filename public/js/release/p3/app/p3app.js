define("p3/app/p3app", [
  'dojo/_base/declare',
  'dojo/topic', 'dojo/on', 'dojo/dom', 'dojo/dom-class', 'dojo/dom-attr', 'dojo/dom-construct', 'dojo/query',
  'dijit/registry', 'dojo/_base/lang',
  'dojo/_base/Deferred',
  'dojo/store/JsonRest', 'dojox/widget/Toaster',
  'dojo/ready', './app', '../router',
  'dojo/window', '../widget/Drawer', 'dijit/layout/ContentPane',
  '../jsonrpc', '../panels', '../WorkspaceManager', '../DataAPI', 'dojo/keys',
  'dijit/Dialog', '../util/PathJoin', 'dojo/request', '../widget/WorkspaceController'
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
  Dialog, PathJoin, xhr, WorkspaceController
) {
  return declare([App], {
    panels: Panels,
    activeWorkspace: null,
    activeWorkspacePath: '/',
    publicApps: ['BLAST', 'ProteinFamily', 'ComparativePathway', 'GenomeDistance'],
    uploadInProgress: false,
    activeMouse: true,
    alreadyLoggedIn: false,
    authorizationToken: null,
    user: '',
    startup: function () {
      var _self = this;
      this.checkLogin();
      //this.upploadInProgress = false;
      on(document.body, 'keypress', function (evt) {
        var charOrCode = evt.charCode || evt.keyCode;
        // console.log("keypress: ", charOrCode, evt.ctrlKey, evt.shiftKey);
        /* istanbul ignore next */
        if ((charOrCode === 4) && evt.ctrlKey && evt.shiftKey) {
          if (!this._devDlg) {
            this._devDlg = new Dialog({
              title: 'Debugging Panel',
              content: '<div data-dojo-type="p3/widget/DeveloperPanel" style="width:250px;height:450px"></div>'
            });
          }
          // console.log("Dialog: ", this._devDlg);
          if (this._devDlg.open) {
            this._devDlg.hide();
          } else {
            this._devDlg.show();
          }
        }
      });

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
        /* istanbul ignore next */
        var onDocumentTitleChanged = function () {
          // var meta = document.getElementsByTagName("meta[name='Keyword']");
          var meta = domQuery("meta[name='Keywords']")[0];
          if (meta) {
            meta.content = 'PATRIC,' + (document.title).replace('::', ',');
          }
          if (window.gtag) {
            // console.log("document title changed to", document.title);
            var pagePath = window.location.pathname + window.location.hash;
            gtag('config', window.App.gaID, { 'page_path': pagePath });
          }
        };

        /*
        Router.register("\/$", function(params, oldPath, newPath, state){
        console.log("HOME route", params.newPath);
        var newState = {href: params.newPath}
        for (var prop in params.state){
        newState[prop]=params.state[prop]
      }

      newState.widgetClass="dijit/layout/ContentPane";
      newState.requireAuth=false;
      console.log("Navigate to ", newState);
      _self.navigate(newState);
    });
    */

      Router.register('/remote', function (params, oldPath, newPath, state) {
        console.log('REMOTE WINDOW, WAIT FOR /navigate message');
        window.postMessage('RemoteReady', '*');
      });

      Router.register('\/job(\/.*)', function (params, oldPath, newPath, state) {
        // console.log("Workspace URL Callback", params.newPath);
        var newState = { href: params.newPath };
        for (var prop in params.state) {
          newState[prop] = params.state[prop];
        }
        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'p3/widget/JobManager';
        newState.value = path;
        newState.set = 'path';
        newState.requireAuth = true;
        newState.pageTitle = 'PATRIC Jobs';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('\/search/(.*)', function (params, oldPath, newPath, state) {
        // console.log("Search Route: ", arguments);
        var newState = getState(params, oldPath);
        newState.widgetClass = 'p3/widget/AdvancedSearch';
        newState.requireAuth = false;
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('\/uploads(\/.*)', function (params, oldPath, newPath, state) {
        // console.log("Upload URL Callback", params.newPath);
        var newState = { href: params.newPath };
        for (var prop in params.state) {
          newState[prop] = params.state[prop];
        }
        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'p3/widget/UploadManager';
        newState.value = path;
        newState.set = 'path';
        newState.requireAuth = true;
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('\/content(\/.*)', function (params, oldPath, newPath, state) {
        // console.log("Upload URL Callback", params.newPath);
        var newState = { href: params.newPath };
        for (var prop in params.state) {
          newState[prop] = params.state[prop];
        }
        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'dijit/layout/ContentPane';
        newState.style = 'padding:0';
        newState.value = PathJoin(_self.dataAPI, 'content', path);
        newState.set = 'href';
        newState.requireAuth = false;
        newState.pageTitle = 'PATRIC';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

      Router.register('\/webpage(\/.*)', function (params, oldPath, newPath, state) {
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

      Router.register('\/user(\/.*)', function (params, oldPath, newPath, state) {
        //console.log('user', params);
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

      Router.register('\/sulogin', function (params, oldPath, newPath, state) {
        //console.log('sulogin', params);
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

      Router.register('\/help(\/.*)', function (params, oldPath, newPath, state) {
        // console.log("Upload URL Callback", params.newPath);
        var newState = { href: params.newPath };
        for (var prop in params.state) {
          newState[prop] = params.state[prop];
        }
        /* istanbul ignore next */
        var path = params.params[0] || '/';
        newState.widgetClass = 'dijit/layout/ContentPane';
        newState.style = 'padding:0';
        newState.value = /* _self.dataAPI +*/ '/public/help/' + path;
        newState.set = 'href';
        newState.requireAuth = false;
        newState.pageTitle = 'PATRIC';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });


      Router.register('\/workspace(\/.*)', function (params, oldPath, newPath, state) {
        // console.log("Workspace URL Callback", params.newPath);
        var newState = { href: params.newPath };
        for (var prop in params.state) {
          newState[prop] = params.state[prop];
        }
        /* istanbul ignore next */
        var path = params.params[0] || ('/' + _self.user.id ); //  + "/home/")
        var parts = path.split('/');
        /* istanbul ignore next */
        if (path.replace(/\/+/g, '') === 'public') {
          path = '/public/';
        } else if (parts.length < 3) {
          path = ('/' + _self.user.id );  // + "/home/"
        }

        newState.widgetClass = 'p3/widget/WorkspaceManager';
        newState.value = path;
        newState.set = 'path';
        newState.requireAuth = false;
        newState.pageTitle = 'PATRIC Workspace';
        // console.log("Navigate to ", newState);
        _self.navigate(newState);
      });

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

      Router.register('\/view(\/.*)', function (params, path) {
        // console.log("'/view/' Route Handler.  Params: ", params, " \n PATH: ", path, arguments);
        var newState = getState(params, path);

        // console.log("newState from getState in /view/: ", JSON.stringify(newState,null,4));

        var parts = newState.pathname.split('/');
        parts.shift();
        var type = parts.shift();

        newState.widgetClass = 'p3/widget/viewer/' + type;
        // console.log("'/view/' New Navigation State: ", JSON.stringify(newState,null,4));
        _self.navigate(newState);
      });

      Router.register('\/app(\/.*)', function (params, path) {
        // console.log("view URL Callback", arguments);

        var parts = path.split('/');
        parts.shift();
        var type = parts.shift();
        /* istanbul ignore if */
        if (parts.length > 0) {
          viewerParams = parts.join('/');
        } else {
          viewerParams = '';
        }
        // console.log("Parts:", parts, type, viewerParams)

        var newState = { href: params.newPath };
        for (var prop in params.state) {
          newState[prop] = params.state[prop];
        }

        // console.log("Parts:", parts, type, path)
        newState.widgetClass = 'p3/widget/app/' + type;
        newState.value = viewerParams;
        newState.set = 'params';
        newState.requireAuth = true;
        /* istanbul ignore if */
        if (_self.publicApps.indexOf(type) >= 0) {
          newState.requireAuth = false;
        }

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
        DataAPI.init(this.dataAPI, this.authorizationToken || '')
        this.api.data = RPC(this.dataAPI, this.authorizationToken);
      }
      /*
      Topic.subscribe("/ActiveWorkspace", function(as){
      console.log("SET App.activeWorkspace",as)
      _self.activeWorkspace=as.workspace;
      _self.activeWorkspacePath=as.path;
    });
    */
    // console.log("go()")
    // setTimeout(function(){
    // 	Router.go("/workspace/dmachi/foo/bar");

    // },2000);

      this.toaster = new Toaster({ positionDirection: 'bl-up', messageTopic: '/Notification', duration: 3000 });
      // this.leftDrawer = new Drawer({title: '', handleContent: '<i  class="fa fa-3x icon-filter">', topic: "/overlay/left"}).placeAt(document.body);
      // this.leftDrawer.startup();

      // this.rightDrawer = new Drawer({topic: "/overlay/right", "class":"RightDrawer"}).placeAt(document.body);
      // this.rightDrawer.startup();
      // setTimeout(function(){
      // 	Topic.publish("/overlay/right", {action: "set", panel: ContentPane});
      // }, 1000);
      /* istanbul ignore else */
      if (this.user && this.user.id) {
        domAttr.set('YourWorkspaceLink', 'href', '/workspace/' + this.user.id);
        var n = dom.byId('signedInAs');
        /* istanbul ignore else */
        if (n) {
          n.innerHTML = this.user.id.replace('@patricbrc.org', '');
        }
      }
      Topic.subscribe('/userWorkspaces', lang.hitch(this, 'updateUserWorkspaceList'));
      Topic.subscribe('/userWorkspaces', lang.hitch(this, 'updateMyDataSection'));
      Topic.subscribe('/JobStatus', function (status) {
        // console.warn(status)
        var node = dom.byId('MyDataJobs')
        node.innerHTML = status.completed + ' Completed Jobs'
      })

      this.inherited(arguments);
      this.timeout();
    },
    timeout: function () {
      setTimeout(function () {
        //check if logged out and another tab is open
        if (localStorage.getItem('tokenstring') === null) {
          if (document.getElementsByClassName('Authenticated').length > 0) {
            //console.log(document.body.className);
            document.body.className = document.body.className.replace('Authenticated', '');
            //console.log(document.body.className);
            window.location.assign('/');
            console.log('you are logged out now');
          }
        } else {
          //check if token has expired
          window.App.checkLogin();
        }
        window.App.timeout();
      }, window.App.localStorageCheckInterval);
    },
    checkLogin: function () {
      //console.log(window.App.uploadInProgress);
      // console.log('checking for login');
      if (localStorage.getItem('tokenstring') !== null) {
        var auth = localStorage.getItem('auth');
        auth = JSON.parse(auth);
        var validToken = this.checkExpToken(auth.expiry);
        console.log('this is a valid token: '+ validToken );
        if(validToken && window.App.alreadyLoggedIn){
          return;
        }
        //console.log(validToken);
        if (validToken && !window.App.alreadyLoggedIn) {
          if (!document.body.className.includes('Authenticated')) {
            document.body.className += 'Authenticated';
            // console.log('add to body class');
            // console.log(document.body.className);
          }
          //var docbody = document.getElementsByClassName('patric')[0];
          //console.log(docbody);
          window.App.user = JSON.parse(localStorage.getItem('userProfile'));
          window.App.authorizationToken = localStorage.getItem('tokenstring');
          //show the upload and jobs widget
          window.App.uploadJobsWidget('show');
          window.App.checkSU();
          window.App.alreadyLoggedIn = true;
        } else {
          //if mouse has moved in past x minutes then refresh the token
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
            .then(function(data) {
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
            function(err) {
              console.log(err);
            });
          } else {
            console.log('logging you out now, sorry');
            window.App.logout();
          }
        }
      }
    },
    checkSU: function(){
      var suLink = document.getElementsByClassName('sulogin');
      var sbLink = document.getElementsByClassName('suSwitchBack');
      var auth = localStorage.getItem('auth');
      var Aauth = localStorage.getItem('Aauth');
      auth = JSON.parse(auth);
      Aauth = JSON.parse(Aauth);
      if (auth.roles !== null && auth.roles !== undefined){
        if(auth.roles.includes('admin')){
          suLink[0].style.display = 'block';
        } else {
          suLink[0].style.display = 'none';
        }
      } else {
        suLink[0].style.display = 'none';
      }
      if(Aauth !== undefined && Aauth !== null){
        if (Aauth.roles !== null && Aauth.roles !== undefined){
          if(Aauth.roles.includes('admin')){
            sbLink[0].style.display = 'block';
          } else {
            sbLink[0].style.display = 'none';
          }
        } else {
          sbLink[0].style.display = 'none';
        }
      }
    },
    suSwitchBack: function(){
      console.log('I clicked the switch back button');
      localStorage.setItem('auth', localStorage.getItem('Aauth'));
      localStorage.setItem('tokenstring', localStorage.getItem('Atokenstring'));
      localStorage.setItem('userProfile', localStorage.getItem('AuserProfile'));
      localStorage.setItem('userid', localStorage.getItem('Auserid'));
      localStorage.removeItem('Aauth');
      localStorage.removeItem('Atokenstring');
      localStorage.removeItem('AuserProfile');
      localStorage.removeItem('Auserid');
      window.App.authorizationToken = localStorage.getItem('tokenstring');
      window.App.user = JSON.parse(localStorage.getItem('userProfile'));
      window.location.href = '/';
    },
    checkExpToken: function(date) {
      var d = new Date();
      var checkd = d.valueOf() / 1000;
      //console.log(checkd);
      if (checkd > date) {
        //console.log('expired');
        return false;
      } return true;
    },
    login: function(data, token) {
      //console.log(data);
      /* istanbul ignore else */
      if (data !== undefined) {
        localStorage.setItem('auth', JSON.stringify(data));
        localStorage.setItem('tokenstring', token);
        //localStorage.setItem('tokenid', data.tokenid);
        var userid = data.un.replace('@patricbrc.org', '');
        localStorage.setItem('userid', userid);
        var userServiceURL = window.App.userServiceURL;
        userServiceURL.replace(/\/+$/, '');
        xhr.get(userServiceURL + '/user/' + userid, {
          headers: {
            'Accept': 'application/json',
            'Authorization': token
          }
        })
        .then(function(user) {
          //console.log(user);
          var userObj = JSON.parse(user);
          //console.log(userObj);
          userObj.id = userObj.id + '@patricbrc.org';
          //console.log(userObj);
          user = JSON.stringify(userObj);
          localStorage.removeItem('userProfile');
          localStorage.setItem('userProfile', user);
          //document.body.className += 'Authenticated';
          window.location.reload();
        },
        /* istanbul ignore next */
        function(err) {
          console.log(err);
        });
      } else {
        console.log('i am not logged in yet');
      }
    },
    uploadJobsWidget: function(action){
      if(action === 'show'){
        // console.log('I want to see the upload and jobs widget');
        var wsc = new WorkspaceController({region: 'bottom'});
        var ac = this.getApplicationContainer();
          // console.log(ac);
          var uploadBar = ac.domNode.getElementsByClassName('WorkspaceController');
          // console.log('this is the upload bar:');
          // console.log(uploadBar);
          if(uploadBar.length === 0) {
            //console.log(ac.domNode.getElementsByClassName('WorkspaceController'));
            //if(ac.domNode)
            ac.addChild(wsc);
          }
      } else {
        console.log('I should not see the upload and jobs widget');
      }
    },
    refreshUser: function() {
      xhr.get(this.userServiceURL + '/user/' + window.localStorage.userid, {
        headers: {
          'Accept': 'application/json',
          'Authorization': window.App.authorizationToken
        }
      })
      .then(function(user) {
        var userObj = JSON.parse(user);
        //console.log(userObj);
        userObj.id = userObj.id + '@patricbrc.org';
        //console.log(userObj);
        user = JSON.stringify(userObj);
        localStorage.removeItem('userProfile');
        localStorage.setItem('userProfile', user);
        //document.body.className += 'Authenticated';
        window.location.reload();
      },
      /* istanbul ignore next */
      function(err) {
        console.log(err);
      });
    },
    logout:function() {
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
        //remove the upload and jobs widget
        window.App.uploadJobsWidget('hide');
      } else {
        alert('upload is in progress, try Logout again later');
      }
    },
    updateMyDataSection: function (data) {
      // console.warn(data)
      domAttr.set('YourWorkspaceLink2', 'href', '/workspace/' + this.user.id);
      data.filter(function(ws) {
        return ws.name === 'home'
      }).forEach(function(ws) {
        // console.log(ws)
        var wsGGNode = dom.byId('MyDataGenomeGroup')
        var wsFGNode = dom.byId('MyDataFeatureGroup')
        var wsEGNode = dom.byId('MyDataExperimentGroup')

        // update links
        wsGGNode.href = '/workspace' + ws.path + '/Genome%20Groups'
        wsFGNode.href = '/workspace' + ws.path + '/Feature%20Groups'
        wsEGNode.href = '/workspace' + ws.path + '/Experiment%20Groups'

        // update counts for workspace groups
        WorkspaceManager.getFolderContents(ws.path + '/Genome Groups')
        .then(function (items) {
          wsGGNode.innerHTML = items.length + ' Genome Groups'
        });
        WorkspaceManager.getFolderContents(ws.path + '/Feature Groups')
        .then(function (items) {
          wsFGNode.innerHTML = items.length + ' Feature Groups'
        });
        WorkspaceManager.getFolderContents(ws.path + '/Experiment Groups')
        .then(function (items) {
          wsEGNode.innerHTML = items.length + ' Experiment Groups'
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
          var node = dom.byId('MyDataGenomes')
          node.innerHTML = data.response.numFound + ' Private Genomes'
        })
      })
    },
    updateUserWorkspaceList: function (data) {
      var wsNode = dom.byId('YourWorkspaces');
      domConstruct.empty('YourWorkspaces');

      data.forEach(function (ws) {
        /* istanbul ignore if */
        if (ws.name !== 'home') return;
        var d = domConstruct.create('div', { style: { 'padding-left': '12px' } }, wsNode);
        domConstruct.create('i', {
          'class': 'fa icon-caret-down fa-1x noHoverIcon',
          style: { 'margin-right': '4px' }
        }, d);
        domConstruct.create('a', {
          'class': 'navigationLink',
          href: '/workspace' + ws.path,
          innerHTML: ws.name
        }, d);
        domConstruct.create('br', {}, d);
        domConstruct.create('a', {
          'class': 'navigationLink',
          'style': { 'padding-left': '16px' },
          href: '/workspace' + ws.path + '/Genome%20Groups',
          innerHTML: 'Genome Groups'
        }, d);
        domConstruct.create('br', {}, d);
        domConstruct.create('a', {
          'class': 'navigationLink',
          'style': { 'padding-left': '16px' },
          href: '/workspace' + ws.path + '/Feature%20Groups',
          innerHTML: 'Feature Groups'
        }, d);
        domConstruct.create('br', {}, d);
        domConstruct.create('a', {
          'class': 'navigationLink',
          'style': { 'padding-left': '16px' },
          href: '/workspace' + ws.path + '/Experiment%20Groups',
          innerHTML: 'Experiment Groups'
        }, d);
      });
    }
  });
});
