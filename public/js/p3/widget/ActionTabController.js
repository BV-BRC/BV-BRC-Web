define(['dojo/_base/declare', 'dijit/layout/StackController',
  'dojo/dom-construct', 'dojo/text!dijit/layout/templates/_TabButton.html',
  'dojo/dom', // dom.setSelectable
  'dojo/dom-attr', // domAttr.attr
  'dojo/dom-class', // domClass.toggle
  'dojo/has',
  'dojo/i18n',
  'dojo/_base/lang',
  'dijit/registry',
  'dojo/on',
  'dijit/form/TextBox',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/form/RadioButton'

], function (
  declare, StackController,
  domConstruct, template,
  dom,
  domAttr,
  domClass,
  has,
  i18n,
  lang,
  registry,
  on,
  TextBox,
  WidgetsInTemplate,
  RadioButton
) {

  var TabButton = declare([StackController.StackButton], {
    // summary:
    //   A tab (the thing you click to select a pane).
    // description:
    //   Contains the title of the pane, and optionally a close-button to destroy the pane.
    //   This is an internal widget and should not be instantiated directly.
    // tags:
    //   private

    // baseClass: String
    //   The CSS class applied to the domNode.
    baseClass: 'dijitTab',

    // Apply dijitTabCloseButtonHover when close button is hovered
    cssStateNodes: {
      closeNode: 'dijitTabCloseButton'
    },

    templateString: template,

    // Button superclass maps name to a this.valueNode, but we don't have a this.valueNode attach point
    _setNameAttr: 'focusNode',

    // Override _FormWidget.scrollOnFocus.
    // Don't scroll the whole tab container into view when the button is focused.
    scrollOnFocus: false,

    buildRendering: function () {
      this.inherited(arguments);

      dom.setSelectable(this.containerNode, false);
    },

    startup: function () {
      this.inherited(arguments);
      var n = this.domNode;

      // Required to give IE6 a kick, as it initially hides the
      // tabs until they are focused on.
      this.defer(function () {
        n.className = n.className;
      }, 1);
    },

    _setCloseButtonAttr: function (/* Boolean */ disp) {
      // summary:
      //   Hide/show close button
      this._set('closeButton', disp);
      domClass.toggle(this.domNode, 'dijitClosable', disp);
      this.closeNode.style.display = disp ? '' : 'none';
      if (disp) {
        var _nlsResources = i18n.getLocalization('dijit', 'common');
        if (this.closeNode) {
          domAttr.set(this.closeNode, 'title', _nlsResources.itemClose);
        }
      }
    },

    _setDisabledAttr: function (/* Boolean */ disabled) {
      // summary:
      //   Make tab selected/unselectable

      this.inherited(arguments);

      // Don't show tooltip for close button when tab is disabled
      if (this.closeNode) {
        if (disabled) {
          domAttr.remove(this.closeNode, 'title');
        } else {
          var _nlsResources = i18n.getLocalization('dijit', 'common');
          domAttr.set(this.closeNode, 'title', _nlsResources.itemClose);
        }
      }
    },

    _setLabelAttr: function (/* String */ content) {
      // summary:
      //   Hook for set('label', ...) to work.
      // description:
      //   takes an HTML string.
      //   Inherited ToggleButton implementation will Set the label (text) of the button;
      //   Need to set the alt attribute of icon on tab buttons if no label displayed
      this.inherited(arguments);
      if (!this.showLabel && !this.params.title) {
        this.iconNode.alt = lang.trim(this.containerNode.innerText || this.containerNode.textContent || '');
      }
    }
  });

  return declare([StackController, WidgetsInTemplate], {
    templateString: "<div role='tablist' data-dojo-attach-event='onkeydown'><span data-dojo-attach-point='containerNode'></span><div data-dojo-attach-point='menuNode' class='actionMenuNode' style='display:inline-block;width:75px;float:right;vertical-align:middle;'>Icon Here</div><div class='FacetHeaderBox' data-dojo-attach-point='headerBox' style='font-size:.75em;padding:4px;'><div><label>Assigment Mode: </label><input type='radio' id='docAssign' data-dojo-type='dijit/form/RadioButton' name='assignmentMode' value='document'/> <label for='docAssign'>Document</label><input type='radio' id='famAssign' data-dojo-type='dijit/form/RadioButton' name='assignmentMode' checked='true' value='Family'/><label for='famAssign'>Family</label></div></div></div></div>",
    buttonWidget: TabButton,

    // buttonWidgetCloseClass: String
    //   Class of [x] close icon, used by event delegation code to tell when close button was clicked
    buttonWidgetCloseClass: 'dijitTabCloseButton',

    startup: function () {
      console.log('FacetTabContainer Startup');
      if (this._started) {
        return;
      }
      this.inherited(arguments);
      var self = this;
      on(this.menuNode, 'click', function (evt) {
        if (domClass.contains(evt.target, 'headerBoxToggler')) {
          domClass.toggle(self.headerBox, 'ToggleOpen');
          on.emit(self.domNode, 'ToggleHeader', {
            bubbles: true,
            open: domClass.contains(self.headerBox, 'ToggleOpen')
          });
        }
      });
    },

    onSelectChild: function (/* dijit/_WidgetBase */ page) {
      console.log('onSelectChild: ', page);
      if (!page) {
        return;
      }

      console.log('onSelectChild() page.filtered: ', page.filtered, page.filterKey);
      if (page.filtered) {
        domClass.add(this.domNode, 'filtered');
      } else {
        domClass.remove(this.domNode, 'filtered');
      }

      this.inherited(arguments);

      if (page.getMenuButtons) {
        console.log('page: ', page);
        this.renderButtons(page.getMenuButtons());
      } else {
        this.renderButtons();
      }
    },
    renderButtons: function (buttons) {
      console.log('render buttons: ', buttons);
      this.menuNode.innerHTML = '';
      if (!buttons) {
        return;
      }
      buttons.forEach(function (button) {
        domConstruct.place(button, this.menuNode);
      }, this);
    }

  });
});
