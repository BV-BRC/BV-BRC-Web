define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/on', 'dojo/topic',
  'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style',
  'dijit/layout/ContentPane',
  './D3DomainViewer'
], function (
  declare, lang,
  on, Topic,
  domClass, domConstruct, domStyle,
  ContentPane,
  D3DomainViewer
) {

  /**
   * DomainVisualizationPanel - A collapsible panel container for the D3DomainViewer
   * Extends ContentPane to work properly within BorderContainer layouts.
   */
  return declare([ContentPane], {
    // Configuration
    title: 'Domain Map',
    collapsed: false,
    domainCount: 0,

    // Region for BorderContainer - must be 'top' to appear above the grid
    region: 'top',

    // Panel sizing - set explicit height for BorderContainer, allow vertical scrolling
    style: 'height: 250px; overflow-y: auto; overflow-x: hidden; padding: 0;',

    // DOM nodes for our content
    headerNode: null,
    titleNode: null,
    countNode: null,
    toggleButton: null,
    viewerContainer: null,

    // Internal state
    viewer: null,
    domains: null,
    proteinLength: 0,

    constructor: function (args) {
      lang.mixin(this, args || {});
    },

    postCreate: function () {
      this.inherited(arguments);

      // Add our CSS class
      domClass.add(this.domNode, 'domain-visualization-panel');

      // Create the panel content
      this._createContent();
    },

    startup: function () {
      this.inherited(arguments);

      // Initialize the D3 viewer after DOM is ready
      if (!this.viewer) {
        this.viewer = new D3DomainViewer();
        this.viewer.init(this.viewerContainer);
      }

      // Set up event handlers
      this._setupEventHandlers();

      // Subscribe to data events
      this._subscribeToDataEvents();
    },

    /**
     * Create the content structure for the panel
     */
    _createContent: function () {
      // Header
      this.headerNode = domConstruct.create('div', {
        'class': 'domain-visualization-header'
      }, this.containerNode || this.domNode);

      // Title
      this.titleNode = domConstruct.create('span', {
        'class': 'domain-visualization-title',
        innerHTML: this.title
      }, this.headerNode);

      // Count
      this.countNode = domConstruct.create('span', {
        'class': 'domain-visualization-count'
      }, this.headerNode);

      // Toggle button
      this.toggleButton = domConstruct.create('button', {
        'class': 'domain-visualization-toggle',
        title: 'Toggle domain map',
        innerHTML: '<i class="fa fa-chevron-up"></i>'
      }, this.headerNode);

      // Viewer container
      this.viewerContainer = domConstruct.create('div', {
        'class': 'domain-visualization-viewer'
      }, this.containerNode || this.domNode);
    },

    /**
     * Set up UI event handlers
     */
    _setupEventHandlers: function () {
      var self = this;

      // Toggle button click
      if (this.toggleButton) {
        on(this.toggleButton, 'click', function () {
          self.toggle();
        });
      }

      // Window resize
      on(window, 'resize', lang.hitch(this, function () {
        if (!this.collapsed && this.viewer) {
          this.viewer.resize();
        }
      }));
    },

    /**
     * Subscribe to data update events
     */
    _subscribeToDataEvents: function () {
      var self = this;

      // Listen for domain data updates from grid
      Topic.subscribe('/domainGrid/dataLoaded', function (data) {
        if (data && data.domains) {
          self.setData(data.domains, data.proteinLength);
        }
      });

      // Listen for grid filter changes
      Topic.subscribe('/domainGrid/filtered', function (data) {
        if (data && data.domains) {
          self.setData(data.domains, data.proteinLength);
        }
      });
    },

    /**
     * Set domain data and render
     * @param {Array} domains - Array of domain objects
     * @param {number} proteinLength - Length of the protein sequence
     */
    setData: function (domains, proteinLength) {
      this.domains = domains || [];
      this.proteinLength = proteinLength || 0;
      this.domainCount = this.domains.length;

      // Update count display
      this._updateCountDisplay();

      // Render visualization if not collapsed
      if (!this.collapsed && this.viewer) {
        this.viewer.setData(this.domains, this.proteinLength);
      }
    },

    /**
     * Update the domain count display
     */
    _updateCountDisplay: function () {
      if (this.countNode) {
        this.countNode.textContent = '(' + this.domainCount + ' domain' + (this.domainCount !== 1 ? 's' : '') + ')';
      }
    },

    /**
     * Toggle panel collapsed/expanded state
     */
    toggle: function () {
      this.collapsed = !this.collapsed;

      if (this.collapsed) {
        domClass.add(this.domNode, 'collapsed');
        domStyle.set(this.viewerContainer, 'display', 'none');
        domStyle.set(this.domNode, 'height', '36px'); // Just header height
        if (this.toggleButton) {
          this.toggleButton.innerHTML = '<i class="fa fa-chevron-down"></i>';
        }
      } else {
        domClass.remove(this.domNode, 'collapsed');
        domStyle.set(this.viewerContainer, 'display', 'block');
        domStyle.set(this.domNode, 'height', '250px'); // Expanded height
        if (this.toggleButton) {
          this.toggleButton.innerHTML = '<i class="fa fa-chevron-up"></i>';
        }
        // Re-render on expand
        if (this.viewer && this.domains) {
          this.viewer.setData(this.domains, this.proteinLength);
        }
      }

      // Trigger layout recalculation in parent BorderContainer
      if (this.getParent && this.getParent() && this.getParent().resize) {
        this.getParent().resize();
      }
    },

    /**
     * Expand the panel
     */
    expand: function () {
      if (this.collapsed) {
        this.toggle();
      }
    },

    /**
     * Collapse the panel
     */
    collapse: function () {
      if (!this.collapsed) {
        this.toggle();
      }
    },

    /**
     * Set selection from external source (e.g., grid)
     * @param {Array} ids - Array of selected domain IDs
     */
    setSelection: function (ids) {
      if (this.viewer) {
        this.viewer.setSelection(ids);
      }
    },

    /**
     * Resize the viewer
     */
    resize: function () {
      this.inherited(arguments);
      if (!this.collapsed && this.viewer) {
        this.viewer.resize();
      }
    }
  });
});
