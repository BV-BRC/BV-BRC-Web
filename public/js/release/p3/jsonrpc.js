define("p3/jsonrpc", ["dojo/request","dojo/_base/Deferred"], function(xhr,defer){
	var idx=1;
	return function(url,token){

		return function(method, params, options){
			var def = new defer();
			defer.when(xhr.post(url, {
				headers: {
//					accept: "application/json",
//					"content-type": "application/json",
					"Authorization": token,
					"X-Requested-With": false
				},
				handleAs: "json",
				data: JSON.stringify({id:idx++, method:method, params:params, jsonrpc: "2.0"})
			}),function(response){
				if (response.error){
					return def.reject(response.error);
				}

				if (response.result) { def.resolve(response.result); return; }
			}, function(err){
				var message = err.response.data.error.message;
				var message = message.split("\n\n\n")[0]
				def.reject(message||err.message);
			});

			return def.promise;
		}

	}

})
