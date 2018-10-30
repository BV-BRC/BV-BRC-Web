define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/layout/TabContainer',
  './TabController', 'dojo/when', 'dojo/topic', 'dijit/registry'
], function (
  declare, WidgetBase, TabContainer,
  TabController, when, topic, registry
) {
  return declare([TabContainer], {
    controllerWidget: TabController,
    selectChild: function (page, animate) {
      // summary:
      //              Show the given widget (which must be one of my children)
      // page:
      //              Reference to child widget or id of child widget

      var d;

      page = registry.byId(page);

      if (this.selectedChildWidget != page) {
        if (this.selectedChildWidget) {
          this.selectedChildWidget.set('visible', false);
        }
        // Deselect old page and select new one
        d = this._transition(page, this.selectedChildWidget, animate);

        this._set('selectedChildWidget', page);
        topic.publish(this.id + '-selectChild', page); // publish

        if (this.persist) {
          cookie(this.id + '_selectedChild', this.selectedChildWidget.id);
        }
      }
      page.set('visible', true);

      // d may be null, or a scalar like true.  Return a promise in all cases
      return when(d || true); // Promise

    }
  });
});
