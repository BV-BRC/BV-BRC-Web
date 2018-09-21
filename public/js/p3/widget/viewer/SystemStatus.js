define([
  'dojo/_base/declare', './Base', 'dijit/layout/ContentPane', 'dojo/html', 'dojo/query',
  'dojo/dom-class', 'dojo/dom-construct',
  '../../util/getTime', 'dojo/request/xhr', 'dojo/promise/all', 'dojo/topic'
], function (
  declare, ViewerBase, ContentPane, html, query,
  domClass, domConstruct,
  getTime, xhr, all, Topic
) {

  return declare([ViewerBase], {
    timeout: 5000,    // ammount of time between set of requests
    successIcon: '<i class="fa-2x success icon-check-circle"></i>',
    failIcon: '<i class="fa-2x fail icon-exclamation-circle"></i>',
    services: [
      {
        name: 'Auth',
        description: 'User registration and login',
        configKey: 'userServiceURL'
      }, {
        name: 'Data API',
        description: 'All services; Search; PATRIC public and private data',
        configKey: 'dataAPI'
      }, {
        name: 'Workspace',
        description: 'All services; public and private Workspace data (files)',
        configKey: 'workspaceServiceURL'
      }, {
        name: 'Shock',
        description: 'All services; storage and retrieval of Workspace data (files)',
        configKey: 'shockServiceURL'
      }, {
        name: 'App Service',
        description: 'PATRIC job submissions (Services)',
        configKey: 'serviceAPI'
      },
      // not currently part of model reconstruction
      // {
      //   name: 'ProbModelSEED',
      //   description: 'TBD',
      //   configKey: 'probModelSeedServiceURL'
      // },
      // need ping endpoint
      // {
      //   name: 'Compare Region Service',
      //   configKey: 'compareregionServiceURL'
      // }
      {
        name: 'MinHash Service',
        description: 'Similar genome finder',
        configKey: 'genomedistanceServiceURL'
      }, {
        name: 'Homology Service',
        description: 'BLAST queries',
        configKey: 'homologyServiceURL'
      }
    ],

    render: function (items) {

      var node = this.viewer.containerNode;

      dojo.place('<h3>PATRIC System Status</h3>', node);

      dojo.place('<p>Below shows the current system status of PATRIC servers/services.  ' +
        'If you are experiencing an issue related to a service with red status, you may wish to check back later.  ' +
        'If you are experiencing an issue not listed here, please use "Help" > "Provide Feedback" from the toolbar above.</p>'
        , node);

      dojo.place('<br><b>Last updated:</b> <span class="lastUpdated"></span>', node);
      dojo.place('<br><b>Version:</b> ' + window.App.appVersion + '<br><br>', node);

      var table = this.table = domConstruct.toDom(
        '<table class="p3basic striped" style="margin-bottom: 10px;">' +
          '<thead>' +
            '<tr>' +
              '<th>Service' +
              '<th>Supports' +
              '<th style="width: 1px;">Status' +
          '<tbody>'
      );

      this.services.forEach(function (s) {
        var name = s.name,
          description = s.description;

        // adding rows of user, perm selector, and trash button
        var row = domConstruct.toDom(
          '<tr>' +
            '<td>' + name +
            '<td>' + description +
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

      var p5 = xhr(this.getUrl('Shock') + '/node', {
        headers: {
          'X-Requested-With': false
        }
      }).then(function () {
        self.setDomStatus('Shock', 'success');
      }, function () {
        self.setDomStatus('Shock', 'fail');
      });

      var p6 = null;
      // need ping endpoint
      //  xhr(this.getUrl('Compare Region Service') + '/ping')
      //  .then(function () {
      //    self.setDomStatus('Compare Region Service', 'success');
      //  }, function () {
      //    self.setDomStatus('Compare Region Service', 'fail');
      //  });
      //

      var p7 = xhr(this.getUrl('MinHash Service') + '/ping')
        .then(function () {
          self.setDomStatus('MinHash Service', 'success');
        }, function () {
          self.setDomStatus('MinHash Service', 'fail');
        });


      var p8 = xhr(this.getUrl('Homology Service') + '/ping')
        .then(function () {
          self.setDomStatus('Homology Service', 'success');
        }, function () {
          self.setDomStatus('Homology Service', 'fail');
        });

      var proms = [p1, p2, p3, p4, p5, p6, p7, p8];
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
      this.viewer = new ContentPane({
        region: 'center',
        style: 'padding: 0',
        content: ''
      });

      this.addChild(this.viewer);

      this.inherited(arguments);
    },

    noPolling: function () {
      return window.location.pathname !== '/status';
    }
  });
});
