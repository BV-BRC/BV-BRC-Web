/**
 * WorkspacePathUtils: find BV-BRC workspace paths in chat text and build
 * their workspace browser links.
 *
 * Paths are account-rooted (/user@domain/...) or under the shared roots
 * /home, /workspace, /scratch. Folder names may contain spaces, which plain
 * text cannot delimit, so (2026-10-27, current_plans/workspace_path_chips.md):
 *
 *   - a path inside "...", `...` or <...> is one path, spaces and all, when
 *     the delimited text is exactly a path (the workspace path button inserts
 *     paths in double quotes);
 *   - an unquoted path continues across a space only when the next word is
 *     followed by "/" (spaces between folders); a space in the last folder
 *     name still ends it.
 *
 * Each match has start/end (the path) and outerStart/outerEnd (the path plus
 * its delimiters; equal to start/end when unquoted).
 *
 * Pure functions, so they can be tested without a DOM.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function () { return factory(); });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CopilotWorkspacePathUtils = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  var ROOT = '\\/(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+|home|workspace|scratch)';
  var SEG = '[A-Za-z0-9._~:@%+,\\-=]+';

  // Unquoted: a segment may hold spaces only when another "/" follows it.
  var WORKSPACE_PATH_REGEX = new RegExp(
    ROOT + '(?:\\/' + SEG + '(?:(?: ' + SEG + ')+(?=\\/))?)+', 'g'
  );
  // Delimited: any characters but "/" and line breaks inside a segment.
  var WHOLE_PATH_REGEX = new RegExp('^' + ROOT + '(?:\\/[^\\/\\n]+)+\\/?$');
  var DELIMITED_REGEX = /"([^"\n]+)"|`([^`\n]+)`|<([^<>\n]+)>/g;
  var TRAILING_PUNCTUATION_REGEX = /[.,;:!?)]$/;

  function trimTrailingPunctuation(token) {
    var text = token || '';
    while (text && TRAILING_PUNCTUATION_REGEX.test(text)) {
      text = text.slice(0, -1);
    }
    return text;
  }

  /**
   * The path when the whole text is one workspace path (no surrounding
   * words, no leading or trailing space), else null. A trailing "/" is
   * dropped.
   */
  function wholePath(text) {
    if (typeof text !== 'string' || !text.length || text !== text.trim()) {
      return null;
    }
    if (!WHOLE_PATH_REGEX.test(text)) {
      return null;
    }
    return text.replace(/\/$/, '');
  }

  function findDelimitedMatches(text) {
    var matches = [];
    DELIMITED_REGEX.lastIndex = 0;
    var result;
    while ((result = DELIMITED_REGEX.exec(text)) !== null) {
      var inner = result[1] || result[2] || result[3];
      var path = wholePath(inner);
      if (!path) {
        // Not a path: let the closing delimiter open the next candidate.
        DELIMITED_REGEX.lastIndex = result.index + 1;
        continue;
      }
      var start = result.index + 1;
      matches.push({
        path: path,
        start: start,
        end: start + path.length,
        outerStart: result.index,
        outerEnd: result.index + result[0].length
      });
    }
    return matches;
  }

  function findPathMatches(text) {
    if (typeof text !== 'string' || !text.length) {
      return [];
    }

    var matches = findDelimitedMatches(text);
    var delimited = matches.slice();

    WORKSPACE_PATH_REGEX.lastIndex = 0;
    var result;
    while ((result = WORKSPACE_PATH_REGEX.exec(text)) !== null) {
      var normalized = trimTrailingPunctuation(result[0]);
      if (!normalized) {
        continue;
      }
      var start = result.index;
      var end = start + normalized.length;
      var inside = delimited.some(function (m) {
        return start < m.outerEnd && end > m.outerStart;
      });
      if (inside) {
        continue;
      }
      matches.push({
        path: normalized,
        start: start,
        end: end,
        outerStart: start,
        outerEnd: end
      });
    }
    matches.sort(function (a, b) { return a.outerStart - b.outerStart; });
    return matches;
  }

  /**
   * Encode each folder and file name for a URL, leaving "/" and the user
   * segment (and the owner after /public) as they are. Same rule as
   * p3/util/encodePath.js (an AMD module, so not loadable here); the
   * workspace browser decodes each segment again (JIRA-4420: a raw "#"
   * cuts the URL).
   */
  function encodeWorkspacePath(path) {
    var parts = path.split('/');
    var isPublic = parts[1] === 'public';
    return parts.map(function (part, i) {
      if (i === 1) return part;
      if (isPublic && i === 2) return part;
      return encodeURIComponent(part);
    }).join('/');
  }

  function toWorkspaceBrowserUrl(path) {
    if (!path || typeof path !== 'string') {
      return null;
    }
    var normalizedPath = path.charAt(0) === '/' ? path : '/' + path;
    return '/workspace' + encodeWorkspacePath(normalizedPath);
  }

  return {
    findPathMatches: findPathMatches,
    wholePath: wholePath,
    encodeWorkspacePath: encodeWorkspacePath,
    toWorkspaceBrowserUrl: toWorkspaceBrowserUrl
  };
}));
