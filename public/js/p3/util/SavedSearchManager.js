define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/topic',
  'dojo/Deferred',
  'dojo/when',
  './QueryDescriptor'
], function (
  declare,
  lang,
  Topic,
  Deferred,
  when,
  QueryDescriptor
) {
  /**
   * SavedSearchManager - Manages saved searches with LocalStorage and Workspace backends
   *
   * Features:
   * - LocalStorage for quick access and recent searches
   * - Workspace export/import for persistence and sharing
   * - Event publishing for UI updates
   * - Auto-cleanup of old searches
   */

  var STORAGE_PREFIX = 'bvbrc_saved_searches_';
  var INDEX_KEY = 'bvbrc_saved_searches_index';
  var MAX_LOCAL_SEARCHES = 50; // Maximum searches to keep in LocalStorage
  var WORKSPACE_FILE_TYPE = 'search'; // File type for workspace files

  /**
   * Check if LocalStorage is available
   */
  function isLocalStorageAvailable() {
    try {
      var test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get the search index from LocalStorage
   */
  function getIndex() {
    if (!isLocalStorageAvailable()) return [];
    try {
      var index = localStorage.getItem(INDEX_KEY);
      return index ? JSON.parse(index) : [];
    } catch (e) {
      console.error('SavedSearchManager: Failed to read index:', e);
      return [];
    }
  }

  /**
   * Save the search index to LocalStorage
   */
  function saveIndex(index) {
    if (!isLocalStorageAvailable()) return false;
    try {
      localStorage.setItem(INDEX_KEY, JSON.stringify(index));
      return true;
    } catch (e) {
      console.error('SavedSearchManager: Failed to save index:', e);
      return false;
    }
  }

  return {
    /**
     * Save a search to LocalStorage
     * @param {Object} descriptor - QueryDescriptor to save
     * @returns {Object} The saved descriptor
     */
    save: function (descriptor) {
      if (!QueryDescriptor.validate(descriptor)) {
        throw new Error('SavedSearchManager.save: Invalid descriptor');
      }

      if (!isLocalStorageAvailable()) {
        console.warn('SavedSearchManager: LocalStorage not available');
        return descriptor;
      }

      try {
        // Update lastUsed timestamp
        descriptor.lastUsed = Date.now();

        // Save the descriptor
        var key = STORAGE_PREFIX + descriptor.id;
        localStorage.setItem(key, QueryDescriptor.serialize(descriptor));

        // Update index
        var index = getIndex();
        var existingIdx = index.indexOf(descriptor.id);
        if (existingIdx >= 0) {
          index.splice(existingIdx, 1);
        }
        index.unshift(descriptor.id); // Add to front (most recent)

        // Trim old entries if needed
        while (index.length > MAX_LOCAL_SEARCHES) {
          var oldId = index.pop();
          localStorage.removeItem(STORAGE_PREFIX + oldId);
        }

        saveIndex(index);

        // Publish event
        Topic.publish('/SavedSearch/changed', {
          action: 'save',
          descriptor: descriptor
        });

        return descriptor;
      } catch (e) {
        console.error('SavedSearchManager.save failed:', e);
        throw e;
      }
    },

    /**
     * Get a saved search by ID
     * @param {string} id - Search ID
     * @returns {Object|null} The QueryDescriptor or null if not found
     */
    get: function (id) {
      if (!isLocalStorageAvailable()) return null;

      try {
        var key = STORAGE_PREFIX + id;
        var json = localStorage.getItem(key);
        if (!json) return null;
        return QueryDescriptor.deserialize(json);
      } catch (e) {
        console.error('SavedSearchManager.get failed:', e);
        return null;
      }
    },

    /**
     * List all saved searches
     * @param {Object} [options] - Filter options
     * @param {string} [options.dataType] - Filter by data type
     * @param {number} [options.limit] - Maximum number to return
     * @param {string} [options.sortBy] - Sort field ('lastUsed', 'created', 'name')
     * @returns {Array} Array of QueryDescriptors
     */
    list: function (options) {
      options = options || {};

      if (!isLocalStorageAvailable()) return [];

      var index = getIndex();
      var searches = [];

      for (var i = 0; i < index.length; i++) {
        var descriptor = this.get(index[i]);
        if (descriptor) {
          // Apply dataType filter
          if (options.dataType && descriptor.dataType !== options.dataType) {
            continue;
          }
          searches.push(descriptor);
        }
      }

      // Sort
      var sortBy = options.sortBy || 'lastUsed';
      searches.sort(function (a, b) {
        if (sortBy === 'name') {
          return (a.name || '').localeCompare(b.name || '');
        } else if (sortBy === 'created') {
          return (b.created || 0) - (a.created || 0);
        } else {
          // Default: lastUsed (most recent first)
          return (b.lastUsed || 0) - (a.lastUsed || 0);
        }
      });

      // Apply limit
      if (options.limit && options.limit > 0) {
        searches = searches.slice(0, options.limit);
      }

      return searches;
    },

    /**
     * Delete a saved search
     * @param {string} id - Search ID
     * @returns {boolean} True if deleted
     */
    delete: function (id) {
      if (!isLocalStorageAvailable()) return false;

      try {
        var key = STORAGE_PREFIX + id;
        localStorage.removeItem(key);

        // Update index
        var index = getIndex();
        var idx = index.indexOf(id);
        if (idx >= 0) {
          index.splice(idx, 1);
          saveIndex(index);
        }

        // Publish event
        Topic.publish('/SavedSearch/changed', {
          action: 'delete',
          id: id
        });

        return true;
      } catch (e) {
        console.error('SavedSearchManager.delete failed:', e);
        return false;
      }
    },

    /**
     * Update a saved search
     * @param {string} id - Search ID
     * @param {Object} updates - Fields to update
     * @returns {Object|null} The updated descriptor or null
     */
    update: function (id, updates) {
      var descriptor = this.get(id);
      if (!descriptor) return null;

      // Apply updates (only allowed fields)
      if (updates.name !== undefined) descriptor.name = updates.name;
      if (updates.description !== undefined) descriptor.description = updates.description;
      if (updates.downloadConfig !== undefined) {
        descriptor.downloadConfig = lang.mixin({}, descriptor.downloadConfig, updates.downloadConfig);
      }

      return this.save(descriptor);
    },

    /**
     * Clear all saved searches from LocalStorage
     */
    clearAll: function () {
      if (!isLocalStorageAvailable()) return;

      var index = getIndex();
      for (var i = 0; i < index.length; i++) {
        localStorage.removeItem(STORAGE_PREFIX + index[i]);
      }
      localStorage.removeItem(INDEX_KEY);

      Topic.publish('/SavedSearch/changed', {
        action: 'clearAll'
      });
    },

    /**
     * Export a search to a workspace file
     * @param {string} id - Search ID
     * @param {string} workspacePath - Workspace folder path
     * @param {string} [fileName] - Optional file name (defaults to search name)
     * @returns {Deferred} Resolves to the created file metadata
     */
    exportToWorkspace: function (id, workspacePath, fileName) {
      var self = this;
      var deferred = new Deferred();

      var descriptor = this.get(id);
      if (!descriptor) {
        deferred.reject(new Error('Search not found: ' + id));
        return deferred;
      }

      // Get WorkspaceManager
      require(['../WorkspaceManager'], function (WorkspaceManager) {
        // Determine file name
        var name = fileName || descriptor.name.replace(/[^a-zA-Z0-9_\-\s]/g, '_');
        if (!name.endsWith('.search')) {
          name += '.search';
        }

        // Ensure path ends with /
        if (workspacePath.charAt(workspacePath.length - 1) !== '/') {
          workspacePath += '/';
        }

        // Create the file
        var content = QueryDescriptor.serialize(descriptor);

        when(
          WorkspaceManager.saveFile(workspacePath + name, content, WORKSPACE_FILE_TYPE),
          function (result) {
            Topic.publish('/SavedSearch/exported', {
              descriptor: descriptor,
              path: workspacePath + name
            });
            deferred.resolve(result);
          },
          function (err) {
            console.error('SavedSearchManager.exportToWorkspace failed:', err);
            deferred.reject(err);
          }
        );
      });

      return deferred;
    },

    /**
     * Import a search from a workspace file
     * @param {string} workspacePath - Full path to the .search file
     * @returns {Deferred} Resolves to the imported QueryDescriptor
     */
    importFromWorkspace: function (workspacePath) {
      var self = this;
      var deferred = new Deferred();

      require(['../WorkspaceManager'], function (WorkspaceManager) {
        when(
          WorkspaceManager.getObject(workspacePath),
          function (result) {
            if (!result || !result.data) {
              deferred.reject(new Error('Empty or invalid search file'));
              return;
            }

            var content = result.data;
            if (typeof content === 'string') {
              try {
                content = JSON.parse(content);
              } catch (e) {
                deferred.reject(new Error('Invalid JSON in search file'));
                return;
              }
            }

            // Create a new descriptor from the imported data
            // Give it a new ID to avoid conflicts
            var descriptor = QueryDescriptor.create({
              dataType: content.dataType,
              rqlQuery: content.rqlQuery,
              name: content.name,
              description: content.description,
              baseQuery: content.baseQuery,
              source: 'workspace_import',
              downloadConfig: content.downloadConfig
            });

            // Save to LocalStorage
            self.save(descriptor);

            Topic.publish('/SavedSearch/imported', {
              descriptor: descriptor,
              sourcePath: workspacePath
            });

            deferred.resolve(descriptor);
          },
          function (err) {
            console.error('SavedSearchManager.importFromWorkspace failed:', err);
            deferred.reject(err);
          }
        );
      });

      return deferred;
    },

    /**
     * Record usage of a search (updates lastUsed)
     * @param {string} id - Search ID
     * @returns {Object|null} The updated descriptor
     */
    recordUsage: function (id) {
      var descriptor = this.get(id);
      if (!descriptor) return null;

      descriptor.lastUsed = Date.now();
      return this.save(descriptor);
    },

    /**
     * Get recent searches
     * @param {number} [limit=10] - Maximum number to return
     * @returns {Array} Array of recent QueryDescriptors
     */
    getRecent: function (limit) {
      return this.list({
        limit: limit || 10,
        sortBy: 'lastUsed'
      });
    },

    /**
     * Search saved searches by name
     * @param {string} query - Search query
     * @returns {Array} Matching QueryDescriptors
     */
    search: function (query) {
      if (!query) return this.list();

      var lowerQuery = query.toLowerCase();
      return this.list().filter(function (descriptor) {
        return (
          (descriptor.name && descriptor.name.toLowerCase().indexOf(lowerQuery) >= 0) ||
          (descriptor.description && descriptor.description.toLowerCase().indexOf(lowerQuery) >= 0) ||
          (descriptor.displayQuery && descriptor.displayQuery.toLowerCase().indexOf(lowerQuery) >= 0)
        );
      });
    },

    /**
     * Check if LocalStorage is available
     */
    isAvailable: isLocalStorageAvailable,

    /**
     * Get storage statistics
     */
    getStats: function () {
      var searches = this.list();
      var byType = {};

      searches.forEach(function (s) {
        byType[s.dataType] = (byType[s.dataType] || 0) + 1;
      });

      return {
        total: searches.length,
        byDataType: byType,
        maxAllowed: MAX_LOCAL_SEARCHES,
        storageAvailable: isLocalStorageAvailable()
      };
    }
  };
});
