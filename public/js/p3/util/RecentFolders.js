define([], function () {
  var STORAGE_KEY_PREFIX = 'bvbrc-recent-folders';
  var MAX_ITEMS = 10;

  /**
   * Get the storage key for the current user
   * @returns {string} Storage key with user ID suffix, or base key if no user
   */
  function getStorageKey() {
    var userId = localStorage.getItem('userid');
    return userId ? STORAGE_KEY_PREFIX + '-' + userId : STORAGE_KEY_PREFIX;
  }

  return {
    /**
     * Get recent folders from localStorage for the current user
     * @returns {Array} Array of {path, name, timestamp} objects
     */
    get: function () {
      try {
        var stored = localStorage.getItem(getStorageKey());
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.warn('Unable to read recent folders from localStorage', e);
        return [];
      }
    },

    /**
     * Add a folder to recent list for the current user
     * @param {string} path - Full workspace path
     * @param {string} name - Display name of folder
     */
    add: function (path, name) {
      if (!path || path === '/' || path === '/public') return;

      try {
        var folders = this.get();

        // Remove if already exists (will re-add at top)
        folders = folders.filter(function (f) { return f.path !== path; });

        // Add to beginning
        folders.unshift({
          path: path,
          name: name || path.split('/').pop(),
          timestamp: Date.now()
        });

        // Trim to max items
        if (folders.length > MAX_ITEMS) {
          folders = folders.slice(0, MAX_ITEMS);
        }

        localStorage.setItem(getStorageKey(), JSON.stringify(folders));
      } catch (e) {
        console.warn('Unable to save recent folder to localStorage', e);
      }
    },

    /**
     * Clear recent folders for the current user
     */
    clear: function () {
      try {
        localStorage.removeItem(getStorageKey());
      } catch (e) {
        console.warn('Unable to clear recent folders', e);
      }
    }
  };
});
