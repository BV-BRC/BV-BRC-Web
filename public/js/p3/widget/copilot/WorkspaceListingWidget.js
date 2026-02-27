define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dojo/_base/lang'
], function(
  declare, domConstruct, lang
) {
  /**
   * @class WorkspaceListingWidget
   * @description Widget that displays workspace listing results in a clean, organized format
   */
  return declare(null, {
    /** @property {Object} workspaceData - The parsed workspace listing data */
    workspaceData: null,

    /** @property {HTMLElement} domNode - The main DOM node for this widget */
    domNode: null,

    /**
     * @constructor
     * @param {Object} args - Constructor arguments
     * @param {Object} args.workspaceData - Workspace listing data to display
     */
    constructor: function(args) {
      this.workspaceData = args.workspaceData || null;
      this.domNode = domConstruct.create('div', {
        class: 'workspace-listing-container'
      });
      this.render();
    },

    /**
     * Renders the workspace listing
     */
    render: function() {
      if (!this.workspaceData) {
        this.renderEmpty();
        return;
      }

      try {
        // Handle the data structure: array of objects with path keys
        var data = this.workspaceData;

        // If data is a string, try to parse it
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }

        // Check if data is valid
        if (!Array.isArray(data) || data.length === 0) {
          this.renderEmpty();
          return;
        }

        // Process each path in the data
        for (var i = 0; i < data.length; i++) {
          var pathObj = data[i];
          for (var path in pathObj) {
            if (pathObj.hasOwnProperty(path)) {
              this.renderPath(path, pathObj[path]);
            }
          }
        }
      } catch (e) {
        console.error('[WorkspaceListingWidget] Error rendering workspace data:', e);
        this.renderError(e.message);
      }
    },

    /**
     * Renders a single path with its contents
     * @param {string} path - The workspace path
     * @param {Array} items - Array of items in the path
     */
    renderPath: function(path, items) {
      // Create header for the path
      var header = domConstruct.create('div', {
        class: 'workspace-path-header',
        innerHTML: '<div class="workspace-path-title">' + this.escapeHtml(path) + '</div>'
      }, this.domNode);

      if (!Array.isArray(items) || items.length === 0) {
        domConstruct.create('div', {
          class: 'workspace-empty-folder',
          innerHTML: 'Empty folder'
        }, this.domNode);
        return;
      }

      // Create container for items
      var itemsContainer = domConstruct.create('div', {
        class: 'workspace-items-container'
      }, this.domNode);

      // Separate folders and files
      var folders = [];
      var files = [];

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item[1] === 'folder') {
          folders.push(item);
        } else {
          files.push(item);
        }
      }

      // Render folders first
      if (folders.length > 0) {
        this.renderItemsGroup(itemsContainer, 'Folders', folders, 'folder');
      }

      // Then render files
      if (files.length > 0) {
        this.renderItemsGroup(itemsContainer, 'Files', files, 'file');
      }
    },

    /**
     * Renders a group of items (folders or files)
     * @param {HTMLElement} container - Container to render into
     * @param {string} title - Group title
     * @param {Array} items - Items to render
     * @param {string} type - Type of items ('folder' or 'file')
     */
    renderItemsGroup: function(container, title, items, type) {
      var groupContainer = domConstruct.create('div', {
        class: 'workspace-items-group'
      }, container);

      var groupTitle = domConstruct.create('div', {
        class: 'workspace-group-title',
        innerHTML: title + ' (' + items.length + ')'
      }, groupContainer);

      var itemsList = domConstruct.create('div', {
        class: 'workspace-items-list'
      }, groupContainer);

      for (var i = 0; i < items.length; i++) {
        this.renderItem(itemsList, items[i], type);
      }
    },

    /**
     * Renders a single workspace item
     * @param {HTMLElement} container - Container to render into
     * @param {Array} item - Item data array
     * @param {string} type - Type of item ('folder' or 'file')
     */
    renderItem: function(container, item, type) {
      var name = item[0] || 'Unnamed';
      var itemType = item[1] || 'unknown';
      var path = item[2] || '';
      var timestamp = item[3] || '';
      var owner = item[5] || '';
      var size = item[6] || 0;

      var itemCard = domConstruct.create('div', {
        class: 'workspace-item-card workspace-item-' + type
      }, container);

      // Icon and name
      var itemHeader = domConstruct.create('div', {
        class: 'workspace-item-header'
      }, itemCard);

      var itemIcon = domConstruct.create('div', {
        class: 'workspace-item-icon workspace-icon-' + type
      }, itemHeader);

      var itemName = domConstruct.create('div', {
        class: 'workspace-item-name',
        innerHTML: this.escapeHtml(name),
        title: name
      }, itemHeader);

      // Metadata
      var itemMeta = domConstruct.create('div', {
        class: 'workspace-item-meta'
      }, itemCard);

      if (timestamp) {
        var date = this.formatDate(timestamp);
        domConstruct.create('div', {
          class: 'workspace-item-meta-item',
          innerHTML: '<span class="workspace-meta-label">Modified:</span> ' + date
        }, itemMeta);
      }

      if (type === 'file' && size !== undefined) {
        domConstruct.create('div', {
          class: 'workspace-item-meta-item',
          innerHTML: '<span class="workspace-meta-label">Size:</span> ' + this.formatSize(size)
        }, itemMeta);
      }

      if (itemType && itemType !== 'folder') {
        domConstruct.create('div', {
          class: 'workspace-item-meta-item',
          innerHTML: '<span class="workspace-meta-label">Type:</span> ' + this.escapeHtml(itemType)
        }, itemMeta);
      }
    },

    /**
     * Formats a date string
     * @param {string} dateStr - ISO date string
     * @returns {string} Formatted date
     */
    formatDate: function(dateStr) {
      try {
        var date = new Date(dateStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      } catch (e) {
        return dateStr;
      }
    },

    /**
     * Formats a file size in bytes to human-readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatSize: function(bytes) {
      if (bytes === 0) return '0 B';
      var k = 1024;
      var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      var i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Escapes HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml: function(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Renders an empty state
     */
    renderEmpty: function() {
      domConstruct.create('div', {
        class: 'workspace-empty',
        innerHTML: 'No workspace data available'
      }, this.domNode);
    },

    /**
     * Renders an error state
     * @param {string} message - Error message
     */
    renderError: function(message) {
      domConstruct.create('div', {
        class: 'workspace-error',
        innerHTML: 'Error displaying workspace data: ' + this.escapeHtml(message)
      }, this.domNode);
    },

    /**
     * Destroys the widget and cleans up resources
     */
    destroy: function() {
      if (this.domNode) {
        domConstruct.destroy(this.domNode);
        this.domNode = null;
      }
    }
  });
});

