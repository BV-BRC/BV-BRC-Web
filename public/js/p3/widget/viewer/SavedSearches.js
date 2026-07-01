define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dijit/layout/BorderContainer',
  'dijit/layout/ContentPane',
  '../download/SavedSearchBrowser'
], function (
  declare,
  lang,
  domConstruct,
  BorderContainer,
  ContentPane,
  SavedSearchBrowser
) {
  /**
   * SavedSearches Viewer - Standalone page for browsing saved searches
   *
   * Accessible at: /view/SavedSearches
   */

  return declare([BorderContainer], {
    gutters: false,
    design: 'headline',
    'class': 'SavedSearchesViewer',

    postCreate: function () {
      this.inherited(arguments);

      // Header
      var headerPane = new ContentPane({
        region: 'top',
        content: '<div class="savedSearchesHeader">' +
                 '<h2><i class="fa fa-bookmark"></i> Saved Searches</h2>' +
                 '<p>Browse, run, and manage your saved searches. Save searches from any data grid using the <strong>SAVE</strong> button.</p>' +
                 '</div>',
        style: 'padding: 20px; background: #f9f9f9; border-bottom: 1px solid #ddd;'
      });
      this.addChild(headerPane);

      // Main content - SavedSearchBrowser
      var browserPane = new ContentPane({
        region: 'center',
        style: 'padding: 0;'
      });
      this.addChild(browserPane);

      // Create the browser widget
      this.browser = new SavedSearchBrowser({
        onSearchRun: lang.hitch(this, function (search) {
          // Navigation is handled by the browser widget
        }),
        onSearchDownload: lang.hitch(this, function (search) {
          // Download wizard is opened by the browser widget
        })
      });

      browserPane.set('content', this.browser);
      this.browser.startup();
    },

    startup: function () {
      if (this._started) return;
      this.inherited(arguments);
    },

    destroy: function () {
      if (this.browser) {
        this.browser.destroy();
      }
      this.inherited(arguments);
    }
  });
});
