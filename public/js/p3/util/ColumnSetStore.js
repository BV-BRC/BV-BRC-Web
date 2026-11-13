define([
  'dojo/_base/Deferred',
  'dojo/when',
  '../WorkspaceManager'
], function (Deferred, when, WorkspaceManager) {

  /**
   * ColumnSetStore — named column selections for tabular downloads.
   *
   * The sibling of util/FastaFormatStore: same storage shape, same
   * preferences directory, same mod-time merge. Kept as a separate module
   * rather than parameterising that one because the two differ in what
   * makes a record valid, and a shared "validate somehow" hook would be
   * more indirection than the duplication saves.
   *
   * Records are per data type, since a column set naming genome_feature
   * fields is meaningless on a genome download:
   *
   *   { name, dataType, columns: ['patric_id', 'product', ...], saved }
   *
   * Stored at /<user>/home/.preferences/column-sets.json. There is no
   * preset equivalent yet -- unlike FASTA header formats, nobody has asked
   * for curated column sets, and adding the workspace-folder machinery for
   * a feature nobody has requested would be speculative.
   */

  var USER_FILE = 'column-sets.json';

  var _cache = null;
  var _cacheUserId = null;
  var _modTime = null;

  function currentUserId() {
    return (window.App && window.App.user && window.App.user.id) || null;
  }

  function resolved(value) {
    var d = new Deferred();
    d.resolve(value);
    return d.promise;
  }

  /**
   * A usable record needs a name and at least one column. Guards against a
   * hand-edited file: a malformed entry is skipped, not fatal.
   */
  function isValidSet(s) {
    if (!s || typeof s !== 'object') return false;
    if (!s.name || typeof s.name !== 'string') return false;
    return !!(s.columns && s.columns.length);
  }

  return {

    _filePath: function () {
      var id = currentUserId();
      return id ? '/' + id + '/home/.preferences/' + USER_FILE : null;
    },

    _dirPath: function () {
      var id = currentUserId();
      return id ? '/' + id + '/home/.preferences' : null;
    },

    _ensureDir: function () {
      var def = new Deferred();
      var dir = this._dirPath();

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
     * Read straight from the workspace, bypassing cache. An absent file is
     * an empty list, not an error -- not having saved anything yet is the
     * normal case.
     */
    _fetch: function () {
      var def = new Deferred();
      var path = this._filePath();

      if (!path) {
        def.resolve({ sets: [], modTime: null });
        return def.promise;
      }

      when(
        WorkspaceManager.getObject(path),
        function (result) {
          var sets = [];
          try {
            var data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
            sets = (data && data.columnSets ? data.columnSets : []).filter(isValidSet);
          } catch (e) {
            console.warn('ColumnSetStore: could not parse ' + path + ': ' + e.message);
          }
          def.resolve({
            sets: sets,
            modTime: result.metadata ? result.metadata.creation_time : null
          });
        },
        function () {
          def.resolve({ sets: [], modTime: null });
        }
      );

      return def.promise;
    },

    /**
     * Saved column sets, optionally filtered to one data type.
     * Resolves to [] when signed out.
     */
    list: function (dataType) {
      var id = currentUserId();
      if (!id) return resolved([]);

      var filter = function (sets) {
        if (!dataType) return sets;
        return sets.filter(function (s) {
          return !s.dataType || s.dataType === dataType;
        });
      };

      if (_cache && _cacheUserId === id) return resolved(filter(_cache));

      var def = new Deferred();
      when(this._fetch(), function (result) {
        _cache = result.sets;
        _cacheUserId = id;
        _modTime = result.modTime;
        def.resolve(filter(result.sets));
      });
      return def.promise;
    },

    /**
     * Save a set, replacing any with the same name. Re-reads before writing
     * and notes a changed mod time, so a save from a second tab is not
     * silently clobbered (the FavoriteFolders approach).
     */
    save: function (set) {
      var self = this;
      var def = new Deferred();
      var path = this._filePath();

      if (!path) {
        def.reject(new Error('Sign in to save a column set.'));
        return def.promise;
      }
      if (!isValidSet(set)) {
        def.reject(new Error('Give the column set a name and at least one column.'));
        return def.promise;
      }

      var record = {
        name: set.name,
        dataType: set.dataType,
        columns: set.columns.slice(),
        saved: new Date().toISOString()
      };

      when(this._fetch(), function (remote) {
        if (_modTime && remote.modTime && _modTime !== remote.modTime) {
          console.warn('ColumnSetStore: column sets changed elsewhere; merging.');
        }

        var sets = remote.sets.filter(function (s) {
          // Same name within the same data type is a replacement; the same
          // name for a different collection is a different set.
          return !(s.name === record.name && s.dataType === record.dataType);
        });
        sets.push(record);

        when(self._ensureDir(), function () {
          when(
            WorkspaceManager.saveFile(path, JSON.stringify({ columnSets: sets }, null, 2), 'json'),
            function (result) {
              _cache = sets;
              _cacheUserId = currentUserId();
              _modTime = result && result.creation_time ? result.creation_time : null;
              def.resolve(record);
            },
            function (err) { def.reject(err); }
          );
        }, function (err) { def.reject(err); });
      });

      return def.promise;
    },

    /** Remove a set by name within a data type. */
    remove: function (name, dataType) {
      var self = this;
      var def = new Deferred();
      var path = this._filePath();

      if (!path) {
        def.reject(new Error('Sign in to delete a column set.'));
        return def.promise;
      }

      when(this._fetch(), function (remote) {
        var sets = remote.sets.filter(function (s) {
          return !(s.name === name && s.dataType === dataType);
        });

        when(self._ensureDir(), function () {
          when(
            WorkspaceManager.saveFile(path, JSON.stringify({ columnSets: sets }, null, 2), 'json'),
            function (result) {
              _cache = sets;
              _cacheUserId = currentUserId();
              _modTime = result && result.creation_time ? result.creation_time : null;
              def.resolve(sets);
            },
            function (err) { def.reject(err); }
          );
        }, function (err) { def.reject(err); });
      });

      return def.promise;
    },

    /** Can the signed-in user save? Drives whether the save UI is shown. */
    canSave: function () {
      return !!currentUserId();
    },

    /** Drop cached state — for tests, and on sign-out. */
    _reset: function () {
      _cache = null;
      _cacheUserId = null;
      _modTime = null;
    }
  };
});
