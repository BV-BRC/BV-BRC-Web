define([
	"dojo/request","dojo/_base/Deferred"
], 
function(
	xhr,Deferred
){

    var root = this;
    var SHOCK = root.SHOCK = {};

    SHOCK.url = null;
    SHOCK.auth_header = {};
    SHOCK.currentChunk = 0;
    
    SHOCK.init = function (params) {
	if (params.url !== null) {
	    SHOCK.url = params.url;
	}

	if (params.token !== null) {
	    SHOCK.set_auth(params.token);
	}
    };

    SHOCK.set_auth = function (token) {
	if (token != null) {
	    SHOCK.auth_header = {'Authorization': 'OAuth '+token, "x-requested-with": null}; //, "Access-Control-Request-Headers": "authorization,content-type"};
	} else {
	    console.log("error: no token passed to set_auth method");
	}
    };

    SHOCK.get_node = function (node, ret) {
	var url = SHOCK.url+'/node/'+node
	return Deferred.when(xhr.get(url, {headers: SHOCK.auth_header,handleAs: "json",withCredentials:true}), function(results){
		if (!results){
			console.log("Error: invalid return structure from SHOCK server");
			return null;
		}
		return results;
	});
    };

    SHOCK.get_all_nodes = function (ret) {
	var url = SHOCK.url+'/node';
	return Deferred.when(xhr.get(url, {headers: SHOCK.auth_header,handleAs: "json",withCredentials:true}), function(results){
		if (!results){
			console.log("Error: invalid return structure from SHOCK server");
			return null;
		}
		return results;
	});
    };

    SHOCK.delete_node = function (id) {
	return xhr.delete(url + "/" + id, {headers: SHOCK.auth_header, withCredentials: true});
    };

    SHOCK.create_node = function (input, attr, ret) {
	return SHOCK.upload(input, null, attr, ret);
    };

    SHOCK.update_node = function (node, attr, ret) {
	return SHOCK.upload(null, node, attr, ret);
    };
    
    SHOCK.upload = function( input,node, attr, ret) {
	var url = SHOCK.url;
	var promise = new Deferred();

	// check if a file is uploaded
	if (input != null) {
	    if (typeof input == "string") {
		input = document.getElementById(input);
		if (input == null) {
		    console.log("error: file element not found in DOM");
		    return;
		}
	    }
		var files;	
	    if ((typeof input != "object") || (! input.files)) {
		files=[input];
	    }else{
	    	files = input.files;
	    }
	    if (files.length > 1) {
		console.log("error: you can only submit one file at a time");
		return;
	    }
	    if (files.length == 0) {
		console.log("error: no file selected");
		return;
	    }
	    
	    // upload the file
	    var chunkSize = 2097152;
	    var file = files[0];

	    var chunks = Math.ceil(file.size / chunkSize);
	    
	    // if this is a chunked upload, check if it needs to be resumed
	    var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
	    Deferred.when(xhr.get(url+"?query&incomplete=1", {headers: SHOCK.auth_header,handleAs: "json", withCredentials:true}),
		function(results){
			incompleteShocks(results);
		},
		function(error){
			promise.resolve(error)
		}
           );
    
	    var incompleteShocks = function (data) {
		var incomplete = null;
		for (i=0;i<data.data.length;i++) {
		    if ((file.size == data.data[i]["attributes"]["incomplete_size"]) && (file.name == data.data[i]["attributes"]["incomplete_name"])) {
			incomplete = data.data[i];
		    }
		}
		
		SHOCK.currentChunk = 0;
		var frOnload = function(e) {
		    var fd = new FormData();
		    var oMyBlob = new Blob([e.target.result], { "type" : file.type });
		    fd.append(SHOCK.currentChunk+1, oMyBlob);

		    xhr.put(url, {
			data: fd,
			headers: SHOCK.auth_header,
			withCredentials: true,
		    }).then(
			function(data) {
			    SHOCK.currentChunk++;
			    if ((SHOCK.currentChunk * chunkSize) > file.size) {
				if (typeof ret == "function") {
				    ret(data.data);
				} else {
				    ret = data.data;
				}
				
				if (attr == null) {
				    promise.resolve();
				}
			    } else {
				loadNext();
			    }
			},
			function(error){
			    if (typeof ret == "function") {
				ret(null);
			    } else {
				ret = null;
			    }
			    console.log( "error: unable inquire SHOCK server" );
			    console.log(error);

			    promise.resolve();
			}
		    );
		};
		
		var frOnerror = function () {
		    console.warn("error during upload at chunk "+SHOCK.currentChunk+".");

		    promise.resolve();
		};
		
		function loadNext() {
		    var fileReader = new FileReader();
		    fileReader.onload = frOnload;
		    fileReader.onerror = frOnerror;
		    
		    var start = SHOCK.currentChunk * chunkSize,
		    end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
		    
		    fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
		};
		
		var incomplete_attr = {};
		if (incomplete != null) {
		    url += "/" + incomplete.id;
		    SHOCK.currentChunk = incomplete.attributes.incomplete_chunks || 0;
		    loadNext();
		} else {
		    incomplete_attr = { "incomplete": "1", "incomplete_size": file.size, "incomplete_name": file.name };
		    var aFileParts = [ JSON.stringify(incomplete_attr) ];
		    var oMyBlob = new Blob(aFileParts, { "type" : "text\/json" });
		    var fd = new FormData();
		    fd.append('attributes', oMyBlob);
		    fd.append('parts', chunks);
		    xhr.post(url, {
			contentType: false,
			processData: false,
			data: fd,
			headers: SHOCK.auth_header,
			type: "POST",
			withCredentials: true
		    }).then(
			function(data) {
			    url += "/" + data.data.id;
			    loadNext();
			},
			function(error){
			    if (typeof ret == "function") {
				ret(null);
			    } else {
				ret = null;
			    }
			    console.log( "error: unable inquire SHOCK server" );
			    console.log(error);

			    promise.resolve();
			}
		    );
		}
	    }
	}

	// update the attributes
	if ((attr != null) && (node != null)) {
	    var aFileParts = [ JSON.stringify(attr) ];
	    var oMyBlob = new Blob(aFileParts, { "type" : "text\/json" });
	    var fd = new FormData();
	    fd.append('attributes', oMyBlob);
	    xhr.put(url +  "/" + node, {
		contentType: false,
		processData: false,
		data: fd,
		headers: SHOCK.auth_header,
		withCredentials: true,	
	    }).then(
		function(data){
		    if (typeof ret == "function") {
			ret(data.data);
		    } else {
			ret = data.data;
		    }
		    
		    promise.resolve();
		},
		function(error){
		    if (typeof ret == "function") {
			ret(null);
		    } else {
			ret = null;
		    }
		    console.log( "error: unable to submit to SHOCK server" );
		    console.log(error);

		    promise.resolve();
		}
	    );
    	}

	return promise;
    }
    
	console.log("Shock in module: ", SHOCK);
	return SHOCK;

});
