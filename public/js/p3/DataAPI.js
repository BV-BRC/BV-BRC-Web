/**
 * Primarily only used for genome persmisions right now.
 * See P3JsonRest.js for query related requests
 *
 * Author(s):
 *  nconrad
 */
define([
  'dojo/request', 'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/_base/Deferred', 'dojo/topic', './jsonrpc', 'dojo/Stateful',
  'dojo/promise/all', 'dojo/_base/Deferred'
], function (
  xhr, declare, lang,
  Deferred, Topic, RPC, Stateful,
  All, Deferred
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
