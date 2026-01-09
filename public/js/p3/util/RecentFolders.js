define([], function () {
  var STORAGE_KEY = 'bvbrc-recent-folders';
  var MAX_ITEMS = 10;

  return {
    /**
     * Get recent folders from localStorage
     * @returns {Array} Array of {path, name, timestamp} objects
     */
    get: function () {
      try {
        var stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.warn('Unable to read recent folders from localStorage', e);
        return [];
      }
    },

    /**
     * Add a folder to recent list
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

        localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
      } catch (e) {
        console.warn('Unable to save recent folder to localStorage', e);
      }
    },

    /**
     * Clear all recent folders
     */
    clear: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Unable to clear recent folders', e);
      }
    }
  };
});
