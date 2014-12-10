var profile = (function(){
	var testResourceRe = /^catmh\/tests\//,

		copyOnly = function(filename, mid){
			var list = {
				"dojo/dojo.profile":1,
				"dojo/package.json":1
			};
			return (mid in list) ||
				/^dojo\/_base\/config\w+$/.test(mid) ||
				(/^dojo\/resources\//.test(mid) && !/\.css$/.test(filename)) ||
				/(png|jpg|jpeg|gif|tiff)$/.test(filename) ||
				/built\-i18n\-test\/152\-build/.test(mid);
		};

	return {
		resourceTags:{
			test: function(filename, mid){
				return testResourceRe.test(mid) || mid=="dojo/tests" || mid=="dojo/robot" || mid=="dojo/robotx";
			},

			copyOnly: function(filename, mid){
				return copyOnly(filename, mid);
			},

			amd: function(filename, mid){
				return !testResourceRe.test(mid) && !copyOnly(filename, mid) && /\.js$/.test(filename);
			}
		}
	};
})();
