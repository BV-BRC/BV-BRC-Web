define([], function () {

  return function (/* path segments */) {
    // console.log("JOIN PATH PARTS: ", arguments);
    // Split the inputs into a list of path commands.
    var parts = [];
    // var hasRoot = false;
    // var root;
    for (var i = 0, l = arguments.length; i < l; i++) {
      // console.log("arguments[i]",i, arguments[i]);

      if (arguments[i]) {
        if (typeof arguments[i] != 'string') {
          arguments[i] = arguments[i].toString();
        }
        if (arguments[i].charAt(0) == '/') {
          arguments[i] = arguments[i].substr(1);
        }
        if (arguments[i].charAt(arguments[i].length - 1) == '/') {
          arguments[i] = arguments[i].substr(0, arguments[i].length - 1);
        }
        parts.push(arguments[i]);
      }
    }
    var out = parts.join('/');
    // console.log("OUT: ", out);

    if (out.match('^(http|https)://')) {
      return out;
    }
    return '/' + out;
  };
});
