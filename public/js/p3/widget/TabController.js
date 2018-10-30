define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/layout/TabController',
  'dijit/focus',
  'dijit/registry',
  'dojo/topic',
  'dojo/on'
], function (
  declare, WidgetBase, TabController,
  focus,
  registry,
  Topic,
  on
) {
  return declare([TabController], {
    hashProperty: 'view_tab',
    constructor: function () {
      this._prevState = {};
    },
    onSelectChild: function (/* dijit/_WidgetBase */ page) {
      // summary:
      //              Called when a page has been selected in the StackContainer, either by me or by another StackController
      // tags:
      //              private

      if (!page) {
        return;
      }

      // console.log("Select Page ID: ", page.id, page)

      if (this._currentChild) {
        var oldButton = this.pane2button(this._currentChild.id);
        oldButton.set('checked', false);
        oldButton.focusNode.setAttribute('tabIndex', '-1');
      }

      var newButton = this.pane2button(page.id);
      //   console.log("Button: ", newButton);
      if (newButton) {
        newButton.set('checked', true);
        newButton.focusNode.setAttribute('tabIndex', '0');
      }
      this._currentChild = page;

    },

    onButtonClick: function (/* dijit/_WidgetBase */ page) {
      // summary:
      //              Called whenever one of my child buttons is pressed in an attempt to select a page
      // tags:
      //              private
      // console.log("Button Click: ", page.id);

      var button = this.pane2button(page.id);

      // For TabContainer where the tabs are <span>, need to set focus explicitly when left/right arrow
      focus.focus(button.focusNode);

      if (this._currentChild && this._currentChild.id === page.id) {
        // In case the user clicked the checked button, keep it in the checked state because it remains to be the selected stack page.
        button.set('checked', true);
      } else if (this._currentChild) {
        // console.log("_setPrevState[" + this._currentChild.id + "] ", this._currentChild.state);
        this._prevState[this._currentChild.id] = { view_tab: this._currentChild.id.replace(this.containerId + '_', '') };
        if (this._currentChild.state && this._currentChild.state.hashParams) {
          Object.keys(this._currentChild.state.hashParams).filter(function (x) {
            // console.log(" Filter Key: ", x);
            var preserve = ['view_tab', 'filter'];
            // console.log("  found: ", preserve.indexOf(x) >= 0)
            return (preserve.indexOf(x) >= 0);
          }, this).forEach(function (x) {
            // console.log("Set ", x, " on ", this._prevState[this._currentChild.id]);
            this._prevState[this._currentChild.id][x] = this._currentChild.state.hashParams[x];
          }, this);
        }
        // console.log("Updated Prev State: ", this._prevState[this._currentChild.id]);

      }
      // var container = registry.byId(this.containerId);

      var pageId = page.id.replace(this.containerId + '_', '');

      // console.log("Select Child - pageId: ", pageId, " page.id: ", page.id, " ContainerId: ", this.containerId, " Page State: ", page.state);

      // console.log("Nav to: ", window.location.pathname + window.location.search + "#view_tab=" + page.id.replace(this.containerId + "_", ""));
      var evt = {
        bubbles: true,
        cancelable: true
      };
      // evt.hashProperty = this.hashProperty;
      // evt.value = page.id.replace(this.containerId + "_", "");

      // console.log("Previous State: ", this._prevState, "page.id: ", page.id)

      if (this._prevState[page.id]) {
        evt.hashParams = this._prevState[page.id];
      } else {
        evt.hashParams = { view_tab: pageId };
      }

      on.emit(this.domNode, 'UpdateHash', evt);
      //          var location = window.location.pathname + window.location.search + "#view_tab=" + page.id.replace(this.containerId + "_","");
      //          Topic.publish("/navigate", {href: location});
      //                        container.selectChild(page);
    }

  });
});
