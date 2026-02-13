define(['dojo/request', 'dojo/_base/Deferred'
], function (xhr, defer) {
  var idx = 1;
  return function (url, token) {

    return function (method, params, options) {
      var def = new defer();
      var xhrPromise = xhr.post(url, {
        headers: {
          'content-type': 'application/jsonrpc+json',
          Authorization: token,
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
