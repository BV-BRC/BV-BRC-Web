/**
 * Primarily only used for genome persmisions right now.
 * See P3JsonRest.js for query related requests
 *
 * Author(s):
 *  nconrad
 */
define("p3/DataAPI", [
  'dojo/request', 'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/_base/Deferred', 'dojo/topic', './jsonrpc', 'dojo/Stateful',
  'dojo/promise/all'
], function (
  xhr, declare, lang,
  Deferred, Topic, RPC, Stateful,
  All
) {

  var DataAPI = (declare([Stateful], {
    token: null,
    apiUrl: null,
    postOpts: {
      headers: {
        'content-type': 'application/json',
        'X-Requested-With': null,
        'Authorization': ''
      }
    },

    setGenomePermissions: function (ids, perms) {
      var self = this;

      if (!ids || !perms) {
        throw new Error('setGenomePermission expects id and permissions');
      }

      var data = perms.map(function (p) {
        return {
          user: p.user,
          permission: self.permMapping(p.permission)
        };
      });

      var ids = Array.isArray(ids) ? ids : [ids];

      return this.post(ids, data);
    },

    permMapping: function (perm) {
      var mapping = {
        'Can view': 'read',
        'Can edit': 'write',
        'Varies': 'unchanged',
        'r': 'read',
        'w': 'write'
      };

      return mapping[perm];
    },

    checkPermParams: function (id, user, perm) {
      // implement
    },

    post: function (ids, data) {
      var params = Object.assign({ data: JSON.stringify(data) }, this.postOpts),
        url = this.apiUrl + 'permissions/genome/' + ids.join(',');

      return xhr.post(url, params);
    },

    get: function (data) {
      // implement if needed
    },


    solrPermsToObjs: function (selection) {
      var permSets = [];
      var allPermissions = {};

      selection.forEach(function (sel) {
        var id = sel.genome_id;

        var readList = sel.user_read || [],
          writeList = sel.user_write || [];

        var writeObjs = writeList.map(function (user) {
          var obj = {
            user: user,
            perm: 'Can edit'
          };

          return obj;
        });

        var readObjs = readList.filter(function (user) {
          // if user has write permission, only list that
          return writeList.indexOf(user) == -1;
        }).map(function (user) {
          var obj =  {
            user: user,
            perm: 'Can view'
          };

          return obj;
        });

        var permObjs = readObjs.concat(writeObjs);
        permSets.push(permObjs);
      });

      var permissions = permSets.reduce(
        function (a, b) { return a.concat(b); },
        []
      );

      return permissions;
    },

    init: function (apiUrl, token) {
      if (!apiUrl || !token) {
        console.log('Unable to initialize data api. Args: ', arguments);
        return;
      }

      this.postOpts.headers.Authorization = token;
      this.apiUrl = apiUrl;
    }
  }))();

  return DataAPI;
});
