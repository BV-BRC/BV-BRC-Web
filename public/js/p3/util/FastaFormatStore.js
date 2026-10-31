define([
  'dojo/_base/Deferred',
  'dojo/when',
  '../WorkspaceManager',
  '../jsonrpc'
], function (Deferred, when, WorkspaceManager, RPC) {

  /**
   * FastaFormatStore — named FASTA header formats, from two sources.
   *
   * 1. PRESETS: read-only, from the workspace folder named by the
   *    `fastaFormatPresetsPath` config option. One JSON file per preset, so a
   *    curator can add a format without a release. Readable without a token
   *    for a public path, so these are available to signed-out users.
   *
   * 2. USER FORMATS: read/write, from
   *    /<user>/home/.preferences/fasta-formats.json — the single-file shape
   *    used by util/FavoriteFolders.js, whose ensure-dir and mod-time merge
   *    logic is deliberately mirrored here.
   *
   * Both sources yield the same record shape, so one apply-path serves both:
   *
   *   { name, description?, dataType, mode: 'zones'|'template',
   *     template?, idFields?, idDelimiter?,
   *     descriptionFields?, descriptionDelimiter?,
   *     isPreset?, sourcePath? }
   *
   * `isPreset` and `sourcePath` are attached on load, never persisted.
   */

  var USER_FILE = 'fasta-formats.json';

  // Presets change rarely and this sits behind a dialog that must feel
  // instant, so fetch them once per page load.
  var _presetCache = null;
  var _presetPending = null;

  // User formats are cached per user and invalidated on every write.
  var _userCache = null;
  var _userCacheId = null;
  var _userModTime = null;

  function currentUserId() {
    return (window.App && window.App.user && window.App.user.id) || null;
  }

  function presetsPath() {
    var p = window.App && window.App.fastaFormatPresetsPath;
    if (!p) return null;
    return String(p).replace(/\/+$/, '');
  }

  /**
   * A workspace RPC client that works when signed out.
   *
   * WorkspaceManager.api is assigned only inside init(), which returns early
   * without a token — so for an anonymous visitor it is undefined. Presets
   * must load for exactly that visitor, so build a client directly against
   * window.App.workspaceAPI. Verified on alpha that Workspace.ls reads a
   * public path with no Authorization header.
   *
   * Authenticated calls still go through WorkspaceManager, which owns the
   * token and the rest of the workspace surface.
   */
  var _anonClient = null;

  function readOnlyClient() {
    if (_anonClient) return _anonClient;
    var url = window.App && window.App.workspaceAPI;
    if (!url) return null;
    _anonClient = RPC(url, null);
    return _anonClient;
  }

  /** Resolve a Deferred with `value` — convenience for the many early exits. */
  function resolved(value) {
    var d = new Deferred();
    d.resolve(value);
    return d.promise;
  }

  /**
   * Is this a usable format record? Guards against a hand-edited preset
   * file: a malformed entry should be skipped, not break the whole list.
   */
  function isValidFormat(f) {
    if (!f || typeof f !== 'object') return false;
    if (!f.name || typeof f.name !== 'string') return false;
    if (f.mode === 'template') return typeof f.template === 'string' && f.template !== '';
    // Anything else is treated as zone mode, which needs at least an ID field.
    return !!(f.idFields && f.idFields.length) || !!f.sequenceIdField;
  }

  return {

    // ---------------------------------------------------------------- presets

    /**
     * Load the shipped presets.
     *
     * Resolves to [] — never rejects — when the option is unset, the folder
     * is missing, or the service errors. A deployment that has not created
     * the folder should see the feature degrade to user formats only, not a
     * broken dialog.
     *
     * A missing path is INVISIBLE at the service level: Workspace.ls on a
     * nonexistent path returns an empty result rather than an error (a
     * permission failure, by contrast, does error). So warn when a path is
     * configured but yields nothing — otherwise a typo in the config
     * presents as "the presets disappeared" with no clue why.
     */
    loadPresets: function () {
      var path = presetsPath();
      if (!path) return resolved([]);
      if (_presetCache) return resolved(_presetCache);
      if (_presetPending) return _presetPending;

      var client = readOnlyClient();
      if (!client) return resolved([]);

      var def = new Deferred();
      _presetPending = def.promise;

      // Presets are decoration: nothing here may take the dialog down with
      // it. The try/catch covers a client that throws synchronously rather
      // than returning a rejected promise.
      var listing;
      try {
        listing = client('Workspace.ls', [{
          paths: [path], includeSubDirs: false, recursive: false
        }]);
      } catch (e) {
        console.warn('FastaFormatStore: could not list presets at ' + path, e);
        _presetCache = [];
        _presetPending = null;
        return resolved([]);
      }

      when(
        listing,
        function (results) {
          var listing = (results && results[0] && results[0][path]) || [];
          var files = listing.filter(function (entry) {
            // entry[0] is the name, entry[1] the type; skip folders and
            // anything that is not a .json file.
            return entry && entry[1] !== 'folder' && /\.json$/i.test(entry[0]);
          });

          if (files.length === 0) {
            console.warn('FastaFormatStore: fastaFormatPresetsPath is set to "' + path
              + '" but no .json presets were found there. Note that the workspace '
              + 'returns an empty result for a nonexistent path, so check the path exists.');
            _presetCache = [];
            _presetPending = null;
            def.resolve([]);
            return;
          }

          var pending = files.length;
          var loaded = [];

          files.forEach(function (entry) {
            var filePath = path + '/' + entry[0];
            var fetched;
            try {
              // Workspace.get, not WorkspaceManager.getObject, for the same
              // reason as the ls above: the manager's client does not exist
              // for a signed-out visitor.
              fetched = client('Workspace.get', [{ objects: [filePath], metadata_only: 0 }]);
            } catch (e) {
              console.warn('FastaFormatStore: could not read preset ' + filePath, e);
              if (--pending === 0) finish();
              return;
            }
            when(
              fetched,
              function (results) {
                try {
                  // Workspace.get returns [[ [meta...], data ]] per object.
                  var raw = results && results[0] && results[0][0] && results[0][0][1];
                  var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                  // Accept either a bare record or a { formats: [...] } file,
                  // so a curator can group related presets if they prefer.
                  var records = parsed && parsed.formats ? parsed.formats : [parsed];
                  records.filter(isValidFormat).forEach(function (f) {
                    f.isPreset = true;
                    f.sourcePath = filePath;
                    loaded.push(f);
                  });
                } catch (e) {
                  console.warn('FastaFormatStore: skipping unparseable preset '
                    + filePath + ': ' + e.message);
                }
                if (--pending === 0) finish();
              },
              function (err) {
                console.warn('FastaFormatStore: could not read preset ' + filePath, err);
                if (--pending === 0) finish();
              }
            );
          });

          function finish() {
            loaded.sort(function (a, b) { return a.name.localeCompare(b.name); });
            _presetCache = loaded;
            _presetPending = null;
            def.resolve(loaded);
          }
        },
        function (err) {
          // Permission denied, service down, bad path shape. Not fatal.
          console.warn('FastaFormatStore: could not list presets at ' + path, err);
          _presetCache = [];
          _presetPending = null;
          def.resolve([]);
        }
      );

      return def.promise;
    },

    // ----------------------------------------------------------- user formats

    _userFilePath: function () {
      var id = currentUserId();
      return id ? '/' + id + '/home/.preferences/' + USER_FILE : null;
    },

    _userDirPath: function () {
      var id = currentUserId();
      return id ? '/' + id + '/home/.preferences' : null;
    },

    /** Create .preferences if it is not there yet. */
    _ensureDir: function () {
      var def = new Deferred();
      var dir = this._userDirPath();

      if (!dir) {
        def.reject('Not authenticated');
        return def.promise;
      }

      when(
        WorkspaceManager.getObject(dir, true),
        function () { def.resolve(); },
        function () {
          when(
            WorkspaceManager.createFolder([dir]),
            function () { def.resolve(); },
            function (err) { def.reject(err); }
          );
        }
      );

      return def.promise;
    },

    /**
     * Read the user's formats straight from the workspace, bypassing cache.
     * Resolves to { formats, modTime } — an absent file is an empty list,
     * not an error, since not having saved anything yet is the normal case.
     */
    _fetchUser: function () {
      var def = new Deferred();
      var path = this._userFilePath();

      if (!path) {
        def.resolve({ formats: [], modTime: null });
        return def.promise;
      }

      when(
        WorkspaceManager.getObject(path),
        function (result) {
          var formats = [];
          try {
            var data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
            formats = (data && data.formats ? data.formats : []).filter(isValidFormat);
          } catch (e) {
            console.warn('FastaFormatStore: could not parse ' + path + ': ' + e.message);
          }
          def.resolve({
            formats: formats,
            modTime: result.metadata ? result.metadata.creation_time : null
          });
        },
        function () {
          // No file yet.
          def.resolve({ formats: [], modTime: null });
        }
      );

      return def.promise;
    },

    /** The user's saved formats. Resolves to [] when signed out. */
    loadUserFormats: function () {
      var id = currentUserId();

      if (!id) return resolved([]);
      if (_userCache && _userCacheId === id) return resolved(_userCache);

      var def = new Deferred();
      when(this._fetchUser(), function (result) {
        _userCache = result.formats;
        _userCacheId = id;
        _userModTime = result.modTime;
        def.resolve(result.formats);
      });
      return def.promise;
    },

    /**
     * Presets first, then the user's own. Both sources, one list.
     *
     * @param {string} [dataType] when given, keep only formats for that
     *   collection — a template referencing {product} is meaningless on
     *   genome_sequence.
     */
    list: function (dataType) {
      var def = new Deferred();
      var self = this;

      when(this.loadPresets(), function (presets) {
        when(self.loadUserFormats(), function (user) {
          var all = presets.concat(user);
          if (dataType) {
            all = all.filter(function (f) {
              return !f.dataType || f.dataType === dataType;
            });
          }
          def.resolve(all);
        });
      });

      return def.promise;
    },

    /**
     * Save a format under the user's own list, replacing any with the same
     * name. Rejects when signed out — presets are read-only and a format
     * needs somewhere to live.
     *
     * Re-reads before writing and merges on a changed mod time, so a save
     * from a second tab is not silently clobbered (the FavoriteFolders
     * approach).
     */
    save: function (format) {
      var self = this;
      var def = new Deferred();
      var path = this._userFilePath();

      if (!path) {
        def.reject(new Error('Sign in to save a format.'));
        return def.promise;
      }
      if (!isValidFormat(format)) {
        def.reject(new Error('That format is incomplete.'));
        return def.promise;
      }

      var record = {};
      Object.keys(format).forEach(function (k) {
        // Never persist the load-time annotations; a saved copy of a preset
        // is the user's own format, not a preset.
        if (k !== 'isPreset' && k !== 'sourcePath') record[k] = format[k];
      });
      record.saved = new Date().toISOString();

      when(this._fetchUser(), function (remote) {
        var formats = remote.formats;

        // Someone else wrote since we last read: keep their entries and
        // layer ours on top rather than overwriting the file wholesale.
        if (_userModTime && remote.modTime && _userModTime !== remote.modTime) {
          console.warn('FastaFormatStore: formats changed elsewhere; merging.');
        }

        formats = formats.filter(function (f) { return f.name !== record.name; });
        formats.push(record);

        when(self._ensureDir(), function () {
          when(
            WorkspaceManager.saveFile(path, JSON.stringify({ formats: formats }, null, 2), 'json'),
            function (result) {
              _userCache = formats;
              _userCacheId = currentUserId();
              _userModTime = result && result.creation_time ? result.creation_time : null;
              def.resolve(record);
            },
            function (err) { def.reject(err); }
          );
        }, function (err) { def.reject(err); });
      });

      return def.promise;
    },

    /** Remove one of the user's formats by name. Presets are untouchable. */
    remove: function (name) {
      var self = this;
      var def = new Deferred();
      var path = this._userFilePath();

      if (!path) {
        def.reject(new Error('Sign in to delete a format.'));
        return def.promise;
      }

      when(this._fetchUser(), function (remote) {
        var formats = remote.formats.filter(function (f) { return f.name !== name; });

        when(self._ensureDir(), function () {
          when(
            WorkspaceManager.saveFile(path, JSON.stringify({ formats: formats }, null, 2), 'json'),
            function (result) {
              _userCache = formats;
              _userCacheId = currentUserId();
              _userModTime = result && result.creation_time ? result.creation_time : null;
              def.resolve(formats);
            },
            function (err) { def.reject(err); }
          );
        }, function (err) { def.reject(err); });
      });

      return def.promise;
    },

    /** Can the signed-in user save? Drives whether the Save UI is shown. */
    canSave: function () {
      return !!currentUserId();
    },

    /** Drop cached state — for tests, and on sign-out. */
    _reset: function () {
      _presetCache = null;
      _presetPending = null;
      _userCache = null;
      _userCacheId = null;
      _userModTime = null;
    }
  };
});
