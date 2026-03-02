define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/Deferred',
  'dojo/store/Memory',
  'dgrid/selector',
  '../WorkspaceExplorerView',
  '../../WorkspaceManager'
], function (
  declare, lang, Deferred, Memory, selector, WorkspaceExplorerView, WorkspaceManager
) {
  /**
   * @class WorkspaceExplorerAdapter
   * @description Adapter widget that wraps WorkspaceExplorerView to work with MCP workspace data
   * Instead of fetching data from WorkspaceManager, it uses pre-fetched data from MCP responses
   */
  return declare([WorkspaceExplorerView], {
    _copilotSelectionColumnKey: '__copilotRowSelect',

    /** @property {Array} mcpItems - The MCP workspace items data */
    mcpItems: null,

    /** @property {string} mcpPath - The path from the MCP response */
    mcpPath: null,
    _pendingSelectedItems: null,

    /**
     * Normalizes a workspace path to the format expected by WorkspaceManager
     * Handles formats like "user@domain.com/home" -> "/user@domain.com/home"
     *
     * @param {string} path - Path to normalize
     * @returns {string} Normalized path
     */
    normalizePath: function (path) {
      if (!path) {
        return '/';
      }

      // Remove trailing slash (except for root)
      if (path.length > 1 && path.charAt(path.length - 1) === '/') {
        path = path.substring(0, path.length - 1);
      }

      // Ensure path starts with /
      if (path.charAt(0) !== '/') {
        path = '/' + path;
      }

      return path;
    },

    /**
     * Converts MCP item format to WorkspaceManager format
     * MCP format can be either:
     * - Array format: [name, type, path, creation_time, id, owner_id, size, userMeta, autoMeta, user_permission, global_permission, link_reference]
     * - Object format: { name, type, id, ... }
     * WorkspaceManager format: { name, type, path, id, creation_time, owner_id, size, ... }
     *
     * @param {Array|Object} mcpItem - Item from MCP response (array or object)
     * @param {string} basePath - Base path for constructing full paths
     * @returns {Object} WorkspaceManager format object
     */
    convertMcpItemToWorkspaceFormat: function (mcpItem, basePath) {
      // Handle array format (same as WorkspaceManager.metaListToObj)
      if (Array.isArray(mcpItem)) {
        // Array format: [name, type, path, creation_time, id, owner_id, size, userMeta, autoMeta, user_permission, global_permission, link_reference]
        return {
          id: mcpItem[4] || mcpItem[0], // Use UUID if available, fallback to name
          path: (mcpItem[2] || basePath || '') + (mcpItem[0] || ''), // path + name
          name: mcpItem[0] || 'Unnamed',
          type: mcpItem[1] || 'unspecified',
          creation_time: mcpItem[3] || new Date().toISOString(),
          link_reference: mcpItem[11] || '',
          owner_id: mcpItem[5] || (window.App && window.App.user ? window.App.user.id : ''),
          size: mcpItem[6] || 0,
          userMeta: mcpItem[7] || {},
          autoMeta: mcpItem[8] || {},
          user_permission: mcpItem[9] || 'o',
          global_permission: mcpItem[10] || 'n',
          timestamp: mcpItem[3] ? Date.parse(mcpItem[3]) : Date.now(),
          permissions: [] // Will be populated later
        };
      }

      // Handle object format (backward compatibility)
      var fullPath;
      if (mcpItem.path) {
        fullPath = this.normalizePath(mcpItem.path);
      } else {
        // Otherwise, construct path from basePath + name
        basePath = this.normalizePath(basePath);
        if (basePath !== '/' && basePath.charAt(basePath.length - 1) !== '/') {
          basePath = basePath + '/';
        }
        fullPath = basePath + (mcpItem.name || '');
      }

      // Determine type - MCP uses 'folder' or file extensions
      var itemType = mcpItem.type || (mcpItem.is_folder ? 'folder' : 'unspecified');

      // Convert to WorkspaceManager format
      var workspaceObj = {
        id: mcpItem.id || mcpItem.name, // Use UUID if available, fallback to name
        path: fullPath,
        name: mcpItem.name || 'Unnamed',
        type: itemType,
        creation_time: mcpItem.creation_time || mcpItem.timestamp || new Date().toISOString(),
        owner_id: mcpItem.owner_id || (window.App && window.App.user ? window.App.user.id : ''),
        size: mcpItem.size || (itemType === 'folder' ? 0 : undefined),
        userMeta: mcpItem.userMeta || {},
        autoMeta: mcpItem.autoMeta || {},
        user_permission: mcpItem.user_permission || 'o', // Default to owner
        global_permission: mcpItem.global_permission || 'n', // Default to none
        timestamp: mcpItem.timestamp || (mcpItem.creation_time ? Date.parse(mcpItem.creation_time) : Date.now()),
        permissions: mcpItem.permissions || [] // Will be populated if available
      };

      return workspaceObj;
    },

    /**
     * Override listWorkspaceContents to use MCP data instead of fetching
     * @param {string} ws - Workspace path (may be ignored if mcpItems is set)
     * @returns {Promise} Promise that resolves with workspace items
     */
    listWorkspaceContents: function (ws) {
      var _self = this;

      // If we have MCP data, use it instead of fetching
      if (this.mcpItems && Array.isArray(this.mcpItems) && this.mcpItems.length >= 0) {
        console.log('[WorkspaceExplorerAdapter] Using MCP data instead of fetching');
        console.log('[WorkspaceExplorerAdapter] mcpItems length:', this.mcpItems.length);
        console.log('[WorkspaceExplorerAdapter] First item:', this.mcpItems[0]);
        console.log('[WorkspaceExplorerAdapter] First item is array?', Array.isArray(this.mcpItems[0]));

        // Use the path from MCP response, or fall back to ws parameter
        // Normalize the path to ensure it's in the correct format
        var basePath = this.normalizePath(this.mcpPath || ws || '/');
        console.log('[WorkspaceExplorerAdapter] basePath:', basePath);

        // Convert MCP items to WorkspaceManager format
        var convertedItems = this.mcpItems.map(function (item) {
          var converted = _self.convertMcpItemToWorkspaceFormat(item, basePath);
          console.log('[WorkspaceExplorerAdapter] Converted item:', converted);
          return converted;
        });

        console.log('[WorkspaceExplorerAdapter] Converted items count:', convertedItems.length);

        // Get permissions for the items if needed
        var paths = convertedItems.map(function (obj) { return obj.path; });

        return Deferred.when(
          WorkspaceManager.listPermissions(paths),
          function (permHash) {
            // Join permissions to each obj
            convertedItems.forEach(function (obj) {
              obj.permissions = permHash[obj.path] || obj.permissions || [];
            });

            // Apply filters if set
            var objs = convertedItems;

            // Filter by onlyWritable if set
            if (_self.onlyWritable) {
              var userID = window.App.user.id;
              objs = objs.filter(function (o) {
                for (var i = 0; i < o.permissions.length; i++) {
                  var user = o.permissions[i][0],
                    perm = o.permissions[i][1];

                  if (o.user_permission == 'o' ||
                      (user == userID && (perm == 'w' || perm == 'a'))) {
                    return true;
                  }
                }
                return false;
              });
            }

            // Filter by types if set
            if (_self.types) {
              objs = objs.filter(function (r) {
                return (r && r.type && (_self.types.indexOf(r.type) >= 0));
              });
            }

            // Apply sorting
            var sort = _self.get('sort');
            if (!sort || sort.length == 0) {
              sort = _self.queryOptions.sort;
            }

            objs.sort(function (a, b) {
              var s = sort[0];
              if (s.descending) {
                return (a[s.attribute] < b[s.attribute]) ? 1 : -1;
              }
              return (a[s.attribute] > b[s.attribute]) ? 1 : -1;
            });

            _self.renderCount(objs.length);

            return objs;
          },
          function (err) {
            console.warn('[WorkspaceExplorerAdapter] Error fetching permissions, using items without permissions:', err);
            // Return items even if permissions fetch failed
            _self.renderCount(convertedItems.length);
            return convertedItems;
          }
        );
      }

      // Fall back to parent implementation if no MCP data
      console.log('[WorkspaceExplorerAdapter] No MCP data, falling back to parent listWorkspaceContents');
      return this.inherited(arguments);
    },

    /**
     * Sets the MCP workspace data
     * @param {Object} data - Object with path and items properties
     * @param {string} data.path - The workspace path
     * @param {Array} data.items - Array of MCP workspace items (may be nested in path-keyed objects)
     */
    setMcpData: function (data) {
      if (data && data.path !== undefined) {
        this.mcpPath = data.path;
      }

      var items = null;
      if (data && data.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (Array.isArray(data)) {
        // If data is directly an array, treat it as items
        items = data;
      }

      // Handle nested structure: items may be [{ "/path": [actual items] }]
      if (items && items.length > 0) {
        // Check if first item is an object with path keys (nested structure)
        var firstItem = items[0];
        if (typeof firstItem === 'object' && !Array.isArray(firstItem) && firstItem !== null) {
          // Extract path and items from the nested structure
          var allItems = [];
          var extractedPath = null;

          for (var i = 0; i < items.length; i++) {
            var pathObj = items[i];
            // pathObj is like { "/path": [array of items] }
            for (var path in pathObj) {
              if (pathObj.hasOwnProperty(path)) {
                if (!extractedPath) {
                  extractedPath = path; // Use first path found
                }
                var pathItems = pathObj[path];
                if (Array.isArray(pathItems)) {
                  // Add all items from this path
                  allItems = allItems.concat(pathItems);
                }
              }
            }
          }

          console.log('[WorkspaceExplorerAdapter] Extracted', allItems.length, 'items from nested structure');
          console.log('[WorkspaceExplorerAdapter] Extracted path:', extractedPath);

          this.mcpItems = allItems;
          // Update path if we extracted one and didn't have one
          if (extractedPath && !this.mcpPath) {
            this.mcpPath = extractedPath;
          }
        } else {
          // Items are already in the correct format (array of items)
          this.mcpItems = items;
        }
      } else {
        this.mcpItems = null;
      }

      // Refresh if already started
      if (this._started) {
        this.refreshWorkspace();
      }
    },

    _ensureCheckboxSelectionColumn: function() {
      if (this.columns && this.columns[this._copilotSelectionColumnKey]) {
        return;
      }

      this.selectionMode = 'none';
      this.allowSelectAll = false;

      var nextColumns = {};
      nextColumns[this._copilotSelectionColumnKey] = selector({
        selectorType: 'checkbox',
        label: '',
        sortable: false,
        unhidable: true
      });

      var existingColumns = this.columns || {};
      for (var key in existingColumns) {
        if (existingColumns.hasOwnProperty(key)) {
          nextColumns[key] = existingColumns[key];
        }
      }

      this.columns = nextColumns;
      this.set('columns', nextColumns);
    },

    _itemIdentity: function(item) {
      if (item && item.id) {
        return 'id:' + item.id;
      }
      var path = item && item.path ? item.path : '';
      var name = item && item.name ? item.name : '';
      var type = item && item.type ? item.type : '';
      return 'fallback:' + path + '|' + name + '|' + type;
    },

    getSelectedWorkspaceItems: function() {
      var selected = [];
      var selectionMap = this.selection || {};
      for (var rowId in selectionMap) {
        if (!selectionMap.hasOwnProperty(rowId) || !selectionMap[rowId]) {
          continue;
        }
        var row = this.row(rowId);
        if (row && row.data && row.data.type !== 'parentfolder') {
          selected.push(row.data);
        }
      }
      return selected;
    },

    _applyWorkspaceSelection: function(selectedItems) {
      var identityMap = {};
      selectedItems.forEach(lang.hitch(this, function(item) {
        identityMap[this._itemIdentity(item)] = true;
      }));

      if (typeof this.clearSelection === 'function') {
        this.clearSelection();
      }

      var currentItems = Array.isArray(this._items) ? this._items : [];
      currentItems.forEach(lang.hitch(this, function(item) {
        if (item && item.type !== 'parentfolder' && identityMap[this._itemIdentity(item)]) {
          this.select(item.id);
        }
      }));
    },

    setSelectedWorkspaceItems: function(items) {
      var selectedItems = Array.isArray(items) ? items : [];
      this._pendingSelectedItems = selectedItems.slice();
      if (!this._items || !this._items.length) {
        return;
      }
      this._applyWorkspaceSelection(selectedItems);
    },

    /**
     * Override startup to handle MCP data initialization
     */
    startup: function () {
      if (this._started) {
        return;
      }

      // Initialize a Memory store for the grid so selector can track row identity
      if (!this.store) {
        this.set('store', new Memory({
          idProperty: 'id',
          data: []
        }));
      }

      // Set path from MCP data if available
      if (this.mcpPath && !this.path) {
        this.path = this.mcpPath;
      }

      this._ensureCheckboxSelectionColumn();
      this.inherited(arguments);
    },

    render: function(val, items) {
      // Update the store with new data before rendering
      if (this.store && Array.isArray(items)) {
        this.store.setData(items);
      }

      this.inherited(arguments);

      if (Array.isArray(this._pendingSelectedItems) && this._pendingSelectedItems.length > 0) {
        this._applyWorkspaceSelection(this._pendingSelectedItems);
      }
    }
  });
});

