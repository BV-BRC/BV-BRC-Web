define([
  'dojo/_base/Deferred',
  'dojo/_base/lang',
  'dojo/topic',
  '../WorkspaceManager'
], function (Deferred, lang, Topic, WorkspaceManager) {

  var _cache = null;           // In-memory cache of favorites
  var _cacheUserId = null;     // User ID associated with cache
  var _pendingLoad = null;     // Deferred for in-flight load

  return {
    /**
     * Get the preferences file path for current user
     */
    _getFilePath: function () {
      var userId = window.App && window.App.user && window.App.user.id;
      if (!userId) return null;
      return '/' + userId + '/home/.preferences/favorites.json';
    },

    /**
     * Get the preferences directory path for current user
     */
    _getDirPath: function () {
      var userId = window.App && window.App.user && window.App.user.id;
      if (!userId) return null;
      return '/' + userId + '/home/.preferences';
    },

    /**
     * Ensure .preferences directory exists
     * @returns {Deferred}
     */
    _ensurePreferencesDir: function () {
      var def = new Deferred();
      var dirPath = this._getDirPath();

      if (!dirPath) {
        def.reject('Not authenticated');
        return def.promise;
      }

      // Check if directory exists
      WorkspaceManager.getObject(dirPath, true).then(
        function () { def.resolve(); },
        function () {
          // Create directory
          WorkspaceManager.createFolder([dirPath]).then(
            function () { def.resolve(); },
            function (err) { def.reject(err); }
          );
        }
      );

      return def.promise;
    },

    /**
     * Load favorites from workspace (with caching)
     * @returns {Deferred} Resolves to array of favorite folder paths
     */
    load: function () {
      var def = new Deferred();
      var userId = window.App && window.App.user && window.App.user.id;

      if (!userId) {
        def.resolve([]);
        return def.promise;
      }

      // Return cached data if valid
      if (_cache !== null && _cacheUserId === userId) {
        def.resolve(_cache);
        return def.promise;
      }

      // Return pending load if in progress
      if (_pendingLoad) {
        return _pendingLoad;
      }

      var filePath = this._getFilePath();
      var _self = this;

      _pendingLoad = def.promise;

      WorkspaceManager.getObject(filePath).then(
        function (result) {
          try {
            var data = JSON.parse(result.data);
            _cache = data.folders || [];
            _cacheUserId = userId;
          } catch (e) {
            _cache = [];
            _cacheUserId = userId;
          }
          _pendingLoad = null;
          def.resolve(_cache);
        },
        function (err) {
          // File doesn't exist yet - return empty array
          _cache = [];
          _cacheUserId = userId;
          _pendingLoad = null;
          def.resolve(_cache);
        }
      );

      return def.promise;
    },

    /**
     * Save favorites to workspace
     * @param {Array} folders - Array of folder paths
     * @returns {Deferred}
     */
    save: function (folders) {
      var def = new Deferred();
      var filePath = this._getFilePath();
      var userId = window.App && window.App.user && window.App.user.id;

      if (!filePath || !userId) {
        def.reject('Not authenticated');
        return def.promise;
      }

      var content = JSON.stringify({ folders: folders }, null, 2);
      var _self = this;

      // Ensure .preferences directory exists, then save
      this._ensurePreferencesDir().then(
        function () {
          // Use WorkspaceManager to create/update the file
          WorkspaceManager.saveFile(filePath, content, 'json').then(
            function (result) {
              _cache = folders;
              _cacheUserId = userId;
              def.resolve(folders);
            },
            function (err) {
              def.reject(err);
            }
          );
        },
        function (err) {
          def.reject(err);
        }
      );

      return def.promise;
    },

    /**
     * Check if a folder is a favorite
     * @param {string} path - Folder path
     * @returns {Deferred} Resolves to boolean
     */
    isFavorite: function (path) {
      var def = new Deferred();
      this.load().then(function (folders) {
        def.resolve(folders.indexOf(path) !== -1);
      });
      return def.promise;
    },

    /**
     * Toggle favorite status of a folder
     * @param {string} path - Folder path
     * @returns {Deferred} Resolves to new favorite status (boolean)
     */
    toggle: function (path) {
      var def = new Deferred();
      var _self = this;

      this.load().then(function (folders) {
        var idx = folders.indexOf(path);
        var newFolders;
        var isFav;

        if (idx !== -1) {
          // Remove from favorites
          newFolders = folders.filter(function (f) { return f !== path; });
          isFav = false;
        } else {
          // Add to favorites
          newFolders = folders.concat([path]);
          isFav = true;
        }

        _self.save(newFolders).then(
          function () {
            Topic.publish('/FavoriteFolders/changed', {});
            def.resolve(isFav);
          },
          function (err) { def.reject(err); }
        );
      });

      return def.promise;
    },

    /**
     * Clear cache (call on logout)
     */
    clearCache: function () {
      _cache = null;
      _cacheUserId = null;
      _pendingLoad = null;
    }
  };
});
