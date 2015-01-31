define("p3/UploadManager", ["dojo/request", "dojo/_base/declare","dojo/_base/lang", "dojo/_base/Deferred","dojo/topic"],function(xhr,declare,lang,Deferred,Topic){

	var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
	var UploadManager = (declare([], {
		constructor: function(){
			this.activeCount=0;
			this.completeCount=0;
			this.completedUploads=[]
			this.errorCount=0;
			this.inProgress={};

			window.addEventListener("beforeunload", lang.hitch(this,function( event ) {
				if (this.listenUnload){
					var msg = "You are currently uploading files.  Leaving this page will cancel the uploads ."; 
					(event || window.event).returnValue = msg;
					return msg;
				}
				return;		
			}));
			
		},
		token: null,
		upload: function(files, token){
			if (token) {
				this.token=token;
				this.headers = {
					Authorization: "OAuth " + token
				}
			}
			var _self=this;
			if (files instanceof Array){
				files.forEach(function(obj){
					_self._uploadFile(obj.file, obj.url);
				});
			}else if (files && files.file){
				_self._uploadFile(files.file, files.url);
			}
		},
		getUploadSummary: function(){
			var def = new Deferred();
			var _self=this;
			var summary = {
				inProgress: _self.activeCount,
				complete: _self.completeCount,
				errors: _self.errorCount,
				completedFiles: _self.completedUploads,
				progress: 0
			}
			var totalSize=0;
			var loadedSize=0;

			Object.keys(this.inProgress).forEach(function(fname){
				totalSize+=this.inProgress[fname].total;
				loadedSize+=this.inProgress[fname].loaded;
			},this)

			if (totalSize>0) {
				summary.progress = parseInt((loadedSize/totalSize)*100);
			}else{
				summary.progress=0;
			}
			console.log("Summary.progress: ", summary, summary.progress, loadedSize, totalSize);

			var msg ={
				type: "UploadStatSummary", 
				summary:summary
			};

			console.log("Summary message: ", msg)
			def.resolve(msg);
                        return def.promise;
		},


		listenUnload: false,
		unloadPageListener: function(){
			this.listenUnload=false;
		},

		loadPageListener: function(){
			this.listenUnload=true;
		},	

		_uploadFile: function(file, url) {	
			var def = new Deferred();
			var fd = new FormData();
			fd.append("upload", file);
			this.inProgress[file.name] = {name: file.name, size: file.size}
			var _self=this;	
			req = new XMLHttpRequest();
			req.upload.addEventListener("progress", function(evt){
				console.log("evt: ", evt);
				console.log("progress: ", (evt.loaded / evt.total)*100);
				_self.inProgress[file.name].loaded = evt.loaded;
				_self.inProgress[file.name].total = evt.total;
				Topic.publish("/upload", {type: "UploadProgress", filename: file.name, event: evt, progress: parseInt((evt.loaded/evt.total)*100), url:url})
			});

			req.upload.addEventListener("load", lang.hitch(this,function(data){
				_self.activeCount--;
				_self.completeCount++
				_self.completedUploads.push(file.name);

				Topic.publish("/upload", {type: "UploadComplete", filename: file.name, url: url})

				if (_self.activeCount < 1){
					_self.unloadPageListener();
				}
				def.resolve(data);
			}));
	
			req.upload.addEventListener("error", function(error){
				console.log("Error Uploading File: ", error);
				_self.activeCount--;
				_self.errorCount++;
				def.reject(error);
			});

			req.open("PUT", url, true);

			for (var prop in this.headers){
				console.log("Set Request Header: ", prop, this.headers[prop]);
				req.setRequestHeader(prop, this.headers[prop]);
			}

			Topic.publish("/upload", {type: "UploadStart", filename: file.name, url: url})
			this.activeCount++;

			this.loadPageListener();
			req.send(fd);
			return def.promise;

			/*
			this.headers['X-Requested-With']=null;
			return xhr.put(url, {
				headers: this.headers,
				data:fd
			}).then(function(data){
				console.log("after put data : ", data);
				return data;
			}, function(err){
				console.log("Error Uploading File: ", err);
			}, function(evt){
				console.log("Percent = ", (evt.loaded / evt.total)*100);
			});
			*/
		}

	}))()

	return UploadManager;
});

