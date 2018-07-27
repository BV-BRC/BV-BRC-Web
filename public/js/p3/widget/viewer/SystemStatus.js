define([
  'dojo/_base/declare', './Base', 'dijit/layout/ContentPane', 'dojo/html', 'dojo/query',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/_base/Deferred',
  '../../util/getTime', '../../jsonrpc', 'dojo/request/xhr', 'dojo/promise/all'
], function (
  declare, ViewerBase, ContentPane, html, query,
  domClass, domConstruct, Deferred,
  getTime, RPC, xhr, all
) {

  return declare([ViewerBase], {
    timeout: 5000,    // ammount of time between set of requests
    successIcon: '<i class="fa-2x success icon-check-circle"></i>',
    failIcon: '<i class="fa-2x fail icon-exclamation-circle"></i>',
    services: [
      {
        name: 'Auth',
        configKey: 'userServiceURL'
      }, {
        name: 'Data API',
        configKey: 'dataAPI',
        link: 'https://github.com/PATRIC3/p3_api'
      }, {
        name: 'Workspace',
        configKey: 'workspaceServiceURL',
        link: 'https://github.com/PATRIC3/Workspace'
      }, {
        name: 'App Service',
        configKey: 'serviceAPI',
        link: 'https://github.com/TheSEED/app_service'
      }, {
        name: 'Shock',
        configKey: 'shockServiceURL',
        link: 'https://github.com/MG-RAST/Shock'
      }, {
        name: 'ProbModelSEED',
        configKey: 'probModelSeedServiceURL',
        link: 'https://github.com/ModelSEED/ProbModelSEED'
      },
      // need ping endpoint
      // {
      //   name: 'Compare Region Service',
      //   configKey: 'compareregionServiceURL'
      // }
      {
        name: 'MinHash Service',
        configKey: 'genomedistanceServiceURL'
      }, {
        name: 'Homology Service',
        configKey: 'homologyServiceURL'
      }
      // should not be needed for PATRIC
      // {
      //   name: 'ModelSEED Support Service',
      //   endpoint: 'http://modelseed.org/services/ms_fba'
      // }
    ],

    render: function (items) {
      var node = this.viewer.domNode;

      dojo.place('<h3>PATRIC System Status</h3>', node);
      dojo.place('<b>Last updated:</b> <span class="lastUpdated"></span><br>', node);
      dojo.place('<b>Version:</b> ' + window.App.appVersion + '<br><br>', node);

      var table = this.table = domConstruct.toDom(
        '<table class="p3basic striped" style="margin-bottom: 10px;">' +
          '<thead>' +
            '<tr>' +
              '<th>Service' +
              '<th>Endpoint' +
              '<th style="width: 1px;">Status' +
          '<tbody>'
      );

      this.services.forEach(function (s) {
        var name = s.name,
          link = s.link,
          endpoint = s.endpoint;

        // adding rows of user, perm selector, and trash button
        var row = domConstruct.toDom(
          '<tr>' +
            '<td>' + (link ? '<a href="' + link + '" >' + name + ' <i class="icon-external-link"></i></a> ' : name) +
            '<td>' + endpoint +
            '<td style="text-align:center; white-space:nowrap;" data-name="' + name + '">loading...</i>'
        );

        domConstruct.place(row, query('tbody', table)[0]);
      });

      domConstruct.place(table, node);
    },

    startup: function () {
      domClass.add(this.domNode, 'SystemStatus');

      // get endpoints from config where available
      this.services.forEach(function (s) {
        if (!s.configKey) return;
        s.endpoint = window.App[s.configKey];
      });

      // render init dom
      this.render();

      this.token = window.App.authorizationToken;
      this.headers =  {
        headers: {
          'Authorization': 'OAuth ' + this.token,
          'X-Requested-With': false       // for shock
        }
      };

      this.msAPI = RPC(this.getUrl('ProbModelSEED'), this.token);

      if (this.noPolling()) return;
      this.pollStatus();
    },

    pollStatus: function () {
      var self = this;


      var p1 = xhr(this.getUrl('Auth'))
        .then(function () {
          self.setDomStatus('Auth', 'success');
        }, function () {
          self.setDomStatus('Auth', 'fail');
        });

      var p2 = xhr(this.getUrl('Data API') + 'genome/?http_accept=application/solr+json')
        .then(function (res) {
          // verify basic structure
          try {
            var res = JSON.parse(res);
            if (res.response.docs.length !== 25) {
              self.setDomStatus('Data API', 'fail');
              return;
            }
          } catch (e) {
            console.log('Error with Data API: ', e);
            self.setDomStatus('Data API', 'fail');
            return;
          }

          self.setDomStatus('Data API', 'success');
        }, function () {
          self.setDomStatus('Data API', 'fail');
        });

      var p3 = xhr(this.getUrl('Workspace') + '/ping')
        .then(function () {
          self.setDomStatus('Workspace', 'success');
        }, function () {
          self.setDomStatus('Workspace', 'fail');
        });

      var p4 = xhr(this.getUrl('App Service') + '/ping')
        .then(function () {
          self.setDomStatus('App Service', 'success');
        }, function () {
          self.setDomStatus('App Service', 'fail');
        });

      if (this.token) {
        var p5 = xhr(this.getUrl('Shock') + '/node', this.headers)
          .then(function () {
            self.setDomStatus('Shock', 'success');
          }, function () {
            self.setDomStatus('Shock', 'fail');
          });
      } else {
        html.set(query('[data-name="Shock"]', this.table)[0], 'login required');
      }

      if (this.token) {
        var path = '/' + window.App.user.id;
        var p6 = Deferred.when(this.msAPI('ProbModelSEED.list_models', [{ path: path }]),
          function (res) {
            self.setDomStatus('ProbModelSEED', 'success');
          }, function () {
            self.setDomStatus('ProbModelSEED', 'fail');
          });
      } else {
        html.set(query('[data-name="ProbModelSEED"]', this.table)[0], 'login required');
      }

      var p7 = null;
      // need ping endpoint
      //  xhr(this.getUrl('Compare Region Service') + '/ping')
      //  .then(function () {
      //    self.setDomStatus('Compare Region Service', 'success');
      //  }, function () {
      //    self.setDomStatus('Compare Region Service', 'fail');
      //  });
      //

      var p8 = xhr(this.getUrl('MinHash Service') + '/ping')
        .then(function () {
          self.setDomStatus('MinHash Service', 'success');
        }, function () {
          self.setDomStatus('MinHash Service', 'fail');
        });


      var p9 = xhr(this.getUrl('Homology Service') + '/ping')
        .then(function () {
          self.setDomStatus('Homology Service', 'success');
        }, function () {
          self.setDomStatus('Homology Service', 'fail');
        });

      // this shouldn't be needed for PATRIC
      // var p10 = xhr(this.getUrl('ModelSEED Support Service'))
      //  .then(function () {
      //    self.setDomStatus('ModelSEED Support Service', 'success');
      //  }, function () {
      //    self.setDomStatus('ModelSEED Support Service', 'fail');
      //  });
      //


      var proms = [p1, p2, p3, p4, p5, p6, p7, p8, p9];
      return all(proms).then(function (results) {
        console.log('polling complete.');
        if (self.noPolling()) {
          console.log('polling stopped.');
          return;
        }

        // results will be an Array
        self.updateTime();
        setTimeout(function () {
          self.pollStatus();
        }, self.timeout);
      });
    },

    getUrl: function (name) {
      return this.services.filter(function (s) { return s.name === name; })[0].endpoint;
    },

    setDomStatus: function (name, status) {
      var icon = status === 'fail' ? this.failIcon : this.successIcon;
      html.set(query('[data-name="' + name + '"]', this.table)[0], icon);
    },

    updateTime: function () {
      html.set(query('.lastUpdated', this.domNode)[0], getTime());
    },

    postCreate: function () {
      this.inherited(arguments);

      this.viewer = new ContentPane({
        region: 'center',
        style: 'padding: 0',
        content: ''
      });

      this.addChild(this.viewer);
    },

    noPolling: function () {
      return window.location.pathname !== '/status';
    }
  });
});
