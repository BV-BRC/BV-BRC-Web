define(["dojo/request","dojo/_base/Deferred"], function(xhr,defer){
	var idx=1;
	return function(url,token){

		return function(method, params, options){
			var def = new defer();
			defer.when(xhr.post(url, {
				headers: {
					accept: "application/json",
					"content-type": "application/json",
					"Authorization": token
				},
				handleAs: "json",
				data: JSON.stringify({id:idx++, method:method, params:params, jsonrpc: "2.0"})
			}),function(response){
				console.log("response: ", response)
				
				if (response.error){
					return def.reject(response.error);
				}

				if (response.result) { def.resolve(response.result); return; }
			}, function(err){
				console.log("Handle Error", err)
				var message = err.response.data.error.data;
				var message = message.split("_ERROR_")[1]
				console.log("   Error: ", message||err.message);
				def.reject(message||err.message);
			});

			return def.promise;
		}

	}

})