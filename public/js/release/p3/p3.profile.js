var profile = (function () {
  var testResourceRe = /^p3\/tests\//;

  copyOnly = function (filename, mid) {
    var list = {
      'p3/p3.profile': 1,
      'p3/package.json': 1
    };
    return (mid in list) || (/^p3\/resources\//.test(mid) && !/\.css$/.test(filename)) || /(png|jpg|jpeg|gif|tiff)$/.test(filename);
  };

  return {
    resourceTags: {
      test: function (filename, mid) {
        return testResourceRe.test(mid) || mid == 'p3/tests' || mid == 'dojo/robot' || mid == 'dojo/robotx';
      },

      copyOnly: function (filename, mid) {
        return copyOnly(filename, mid);
      },

      amd: function (filename, mid) {
        return !testResourceRe.test(mid) && !copyOnly(filename, mid) && /\.js$/.test(filename);
      }
    }
  };
}());
