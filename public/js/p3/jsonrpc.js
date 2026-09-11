define(['dojo/request', 'dojo/_base/Deferred', './auth/authHeaders'
], function (xhr, defer, authHeader) {
  var idx = 1;
  return function (url, token) {

    return function (method, params, options) {
      var def = new defer();
      var xhrPromise = xhr.post(url, {
        headers: {
          'content-type': 'application/jsonrpc+json',
          // Workspace and app service JSON-RPC: bare token, never a scheme
          // prefix. forToken, not authHeader: the token is fixed at
          // construction and must not fall back to the ambient one.
          Authorization: authHeader.forToken('api', token),
          'X-Requested-With': false
        },
        handleAs: 'json',
        timeout: 1200000,
        data: JSON.stringify({
          id: idx++, method: method, params: params, jsonrpc: '2.0'
        })
      });

      defer.when(xhrPromise, function (response) {
        // console.log("JSON RPC RESPONSE: ", response);
        if (response.error) {
          return def.reject(response.error);
        }

        if (response.result) {
          def.resolve(response.result);

        }
      }, function (err) {
        try {
          var message = err.response.data.error.message;
          message = message.split('\n\n\n')[0];
          def.reject(message || err.message);
        } catch (e) {
          def.reject(err.response);
        }
      });

      // Attach cancel method to allow aborting the XHR request
      def.promise.cancel = function () {
        if (xhrPromise && xhrPromise.cancel) {
          xhrPromise.cancel();
        }
      };

      return def.promise;
    };
  };
});
