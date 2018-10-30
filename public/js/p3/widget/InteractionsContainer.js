define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  './ActionBar', './ContainerActionBar', 'dijit/layout/TabContainer',
  'dijit/layout/ContentPane'
], function (
  declare, BorderContainer, on,
  ActionBar, ContainerActionBar, TabContainer,
  ContentPane
) {

  return declare([BorderContainer], {
    gutters: false,
    design: 'sidebar',
    style: 'padding-left: 4px;',
    query: null,
    _setQueryAttr: function (query) {
      this.query = query;
      if (this.grid) {
        this.grid.set('query', query);
      }
    },
    startup: function () {
      if (this._started) {
        return;
      }
      this.containerActionBar = new ContainerActionBar({
        region: 'top',
        splitter: false,
        className: 'BrowserHeader'
      });
      this.selectionActionBar = new ActionBar({
        region: 'right',
        layoutPriority: 2,
        style: 'width:48px;text-align:center;',
        splitter: false
      });
      this.tabContainer = new TabContainer({ region: 'center' });
      this.ppiPanel = new ContentPane({ title: 'Protein-Protein Interactions (PPI)', content: 'PPI Graph' });
      this.ttiPanel = new ContentPane({ title: 'Taxon-Taxon Interactions (TTI)', content: 'TTI Graph' });
      this.tabContainer.addChild(this.ppiPanel);
      this.tabContainer.addChild(this.ttiPanel);

      this.interactionsGrid = new ContentPane({
        title: 'Taxon-Taxon Interactions (TTI)',
        content: 'Interactions Grid',
        region: 'bottom',
        style: 'height:150px',
        splitter: true
      });
      this.addChild(this.containerActionBar);
      this.addChild(this.tabContainer);
      this.addChild(this.selectionActionBar);
      this.addChild(this.interactionsGrid);

      this.inherited(arguments);
    }
  });
});

