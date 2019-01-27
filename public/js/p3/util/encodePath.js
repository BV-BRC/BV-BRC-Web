/**
 * encodePath: simple helper to return workspace paths with encoded
 * directories and filenames (leaving "/" chars and usernames decoded)
 */

define([], function () {

  return function (path) {
    var parts = path.split('/'),
      isPublic = parts[1] === 'public';

    var encodedParts = parts.map(function (part, i) {

      // leave username decoded for pretty urls (or for Workspace API)
      if (i === 1) return part;
      if (isPublic && i === 2) return part;

      return encodeURIComponent(part);
    });

    return encodedParts.join('/');
  };
});
