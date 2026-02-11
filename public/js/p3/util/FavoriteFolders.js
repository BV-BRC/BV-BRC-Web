define([
  'dojo/_base/Deferred',
  'dojo/_base/lang',
  'dojo/topic',
  '../WorkspaceManager'
], function (Deferred, lang, Topic, WorkspaceManager) {

  var _cache = null;           // In-memory cache of favorites
  var _cacheUserId = null;     // User ID associated with cache
  var _pendingLoad = null;     // Deferred for in-flight load
  var _lastModTime = null;     // Last known modification time of the file
  var _refreshInterval = null; // Interval handle for periodic refresh
  var REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

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
     * Fetch favorites from workspace (bypasses cache)
     * @returns {Deferred} Resolves to {folders: Array, modTime: string}
     */
    _fetchFromWorkspace: function () {
      var def = new Deferred();
      var filePath = this._getFilePath();

      if (!filePath) {
        def.resolve({ folders: [], modTime: null });
        return def.promise;
      }

      WorkspaceManager.getObject(filePath).then(
        function (result) {
          try {
            var data = JSON.parse(result.data);
            var modTime = result.metadata ? result.metadata.creation_time : null;
            def.resolve({
              folders: data.folders || [],
              modTime: modTime
            });
          } catch (e) {
            def.resolve({ folders: [], modTime: null });
          }
        },
        function (err) {
          // File doesn't exist yet
          def.resolve({ folders: [], modTime: null });
        }
      );

      return def.promise;
    },

    /**
     * Check if the workspace file has changed and refresh cache if needed
     * @returns {Deferred} Resolves to boolean (true if cache was updated)
     */
    _checkAndRefresh: function () {
      var def = new Deferred();
      var _self = this;
      var userId = window.App && window.App.user && window.App.user.id;

      if (!userId) {
        def.resolve(false);
        return def.promise;
      }

      var filePath = this._getFilePath();

      // Get file metadata to check modification time
      WorkspaceManager.getObject(filePath, true).then(
        function (metadata) {
          var remoteModTime = metadata.creation_time;

          // If modification time changed, refresh the cache
          if (_lastModTime !== remoteModTime) {
            _self._fetchFromWorkspace().then(function (result) {
              var oldCache = _cache ? _cache.slice() : [];
              _cache = result.folders;
              _cacheUserId = userId;
              _lastModTime = result.modTime;

              // Check if cache actually changed
              var changed = JSON.stringify(oldCache.sort()) !== JSON.stringify(_cache.slice().sort());
              if (changed) {
                Topic.publish('/FavoriteFolders/changed', {});
              }
              def.resolve(changed);
            });
          } else {
            def.resolve(false);
          }
        },
        function (err) {
          // File doesn't exist - if we had cache, clear it
          if (_cache && _cache.length > 0) {
            _cache = [];
            _cacheUserId = userId;
            _lastModTime = null;
            Topic.publish('/FavoriteFolders/changed', {});
            def.resolve(true);
          } else {
            def.resolve(false);
          }
        }
      );

      return def.promise;
    },

    /**
     * Start periodic refresh interval
     */
    _startPeriodicRefresh: function () {
      var _self = this;

      // Clear any existing interval
      if (_refreshInterval) {
        clearInterval(_refreshInterval);
      }

      // Set up periodic refresh
      _refreshInterval = setInterval(function () {
        var userId = window.App && window.App.user && window.App.user.id;
        if (userId) {
          _self._checkAndRefresh();
        }
      }, REFRESH_INTERVAL_MS);
    },

    /**
     * Stop periodic refresh interval
     */
    _stopPeriodicRefresh: function () {
      if (_refreshInterval) {
        clearInterval(_refreshInterval);
        _refreshInterval = null;
      }
    },

    /**
     * Validate that favorite folders still exist in the workspace
     * @param {Array} folders - Array of folder paths to validate
     * @returns {Deferred} Resolves to array of folders that still exist
     */
    _validateFolders: function (folders) {
      var def = new Deferred();

      if (!folders || folders.length === 0) {
        def.resolve([]);
        return def.promise;
      }

      WorkspaceManager.objectsExist(folders).then(
        function (existsMap) {
          var validFolders = folders.filter(function (path) {
            return existsMap[path] && existsMap[path].exists;
          });
          def.resolve(validFolders);
        },
        function (err) {
          // On error, return original list to avoid data loss
          console.warn('FavoriteFolders: Failed to validate folders:', err);
          def.resolve(folders);
        }
      );

      return def.promise;
    },

    /**
     * Load favorites from workspace (with caching)
     * @param {boolean} forceRefresh - If true, bypass cache and fetch from workspace
     * @returns {Deferred} Resolves to array of favorite folder paths
     */
    load: function (forceRefresh) {
      var def = new Deferred();
      var userId = window.App && window.App.user && window.App.user.id;
      var _self = this;

      if (!userId) {
        def.resolve([]);
        return def.promise;
      }

      // Return pending load if in progress
      if (_pendingLoad) {
        return _pendingLoad;
      }

      // If we have a valid cache, validate it against workspace
      if (!forceRefresh && _cache !== null && _cacheUserId === userId) {
        _pendingLoad = def.promise;

        // Validate cached favorites still exist
        this._validateFolders(_cache).then(function (validFolders) {
          var removedCount = _cache.length - validFolders.length;
          _pendingLoad = null;

          if (removedCount > 0) {
            // Some favorites were deleted - update cache and save
            _cache = validFolders;
            console.log('FavoriteFolders: Removed ' + removedCount + ' stale favorite(s)');
            _self.save(validFolders).then(
              function () {
                Topic.publish('/FavoriteFolders/changed', {});
              }
            );
          }

          def.resolve(validFolders);
        });

        return def.promise;
      }

      _pendingLoad = def.promise;

      this._fetchFromWorkspace().then(function (result) {
        var folders = result.folders;

        // Validate that favorite folders still exist
        _self._validateFolders(folders).then(function (validFolders) {
          var removedCount = folders.length - validFolders.length;

          _cache = validFolders;
          _cacheUserId = userId;
          _lastModTime = result.modTime;
          _pendingLoad = null;

          // Start periodic refresh on first load
          _self._startPeriodicRefresh();

          // If stale favorites were removed, save the cleaned list
          if (removedCount > 0) {
            console.log('FavoriteFolders: Removed ' + removedCount + ' stale favorite(s)');
            _self.save(validFolders).then(
              function () {
                Topic.publish('/FavoriteFolders/changed', {});
              }
            );
          }

          def.resolve(_cache);
        });
      });

      return def.promise;
    },

    /**
     * Merge local changes with remote changes
     * @param {Array} localFolders - Local folders list
     * @param {Array} remoteFolders - Remote folders list
     * @param {string} path - Path being toggled (null if not toggling)
     * @param {boolean} isAdding - True if adding path, false if removing
     * @returns {Array} Merged folders list
     */
    _mergeFolders: function (localFolders, remoteFolders, path, isAdding) {
      // Create a set of all folders from both sources
      var merged = {};

      remoteFolders.forEach(function (f) {
        merged[f] = true;
      });

      localFolders.forEach(function (f) {
        merged[f] = true;
      });

      // Apply the current toggle operation
      if (path) {
        if (isAdding) {
          merged[path] = true;
        } else {
          delete merged[path];
        }
      }

      return Object.keys(merged);
    },

    /**
     * Save favorites to workspace with check-before-write merge
     * @param {Array} folders - Array of folder paths
     * @param {string} togglePath - Path being toggled (for merge logic)
     * @param {boolean} isAdding - True if adding, false if removing
     * @returns {Deferred}
     */
    save: function (folders, togglePath, isAdding) {
      var def = new Deferred();
      var filePath = this._getFilePath();
      var userId = window.App && window.App.user && window.App.user.id;
      var _self = this;

      if (!filePath || !userId) {
        def.reject('Not authenticated');
        return def.promise;
      }

      // Check for remote changes before writing
      this._fetchFromWorkspace().then(
        function (result) {
          var remoteFolders = result.folders;
          var remoteModTime = result.modTime;
          var foldersToSave = folders;

          // If remote file has changed, merge the changes
          if (_lastModTime && remoteModTime && _lastModTime !== remoteModTime) {
            foldersToSave = _self._mergeFolders(folders, remoteFolders, togglePath, isAdding);
          }

          var content = JSON.stringify({ folders: foldersToSave }, null, 2);

          // Ensure .preferences directory exists, then save
          _self._ensurePreferencesDir().then(
            function () {
              WorkspaceManager.saveFile(filePath, content, 'json').then(
                function (result) {
                  _cache = foldersToSave;
                  _cacheUserId = userId;
                  // Update mod time from the result
                  _lastModTime = result.creation_time || null;
                  def.resolve(foldersToSave);
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
        },
        function (err) {
          // If fetch fails, just try to save anyway
          var content = JSON.stringify({ folders: folders }, null, 2);

          _self._ensurePreferencesDir().then(
            function () {
              WorkspaceManager.saveFile(filePath, content, 'json').then(
                function (result) {
                  _cache = folders;
                  _cacheUserId = userId;
                  _lastModTime = result.creation_time || null;
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

        // Pass toggle info for merge logic
        _self.save(newFolders, path, isFav).then(
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
     * Force refresh from workspace (use when you know remote may have changed)
     * @returns {Deferred} Resolves to array of favorite folder paths
     */
    refresh: function () {
      return this.load(true);
    },

    /**
     * Clear cache (call on logout)
     */
    clearCache: function () {
      _cache = null;
      _cacheUserId = null;
      _pendingLoad = null;
      _lastModTime = null;
      this._stopPeriodicRefresh();
    }
  };
});
