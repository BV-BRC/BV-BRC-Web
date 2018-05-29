define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on',
  'dojo/dom-class', 'dojo/_base/event'
], function (
  declare, WidgetBase, on,
  domClass, Event
) {
  return declare([WidgetBase], {
    baseClass: 'MultiButton',
    disabled: false,
    toggleButton: false,
    toggled: false,
    _setDisabledAttr: function (val) {
      val = !!val;
      this.disabled = val;
      if (this.domNode) {
        if (val) {
          domClass.add(this.domNode, 'disabled');
        } else {
          domClass.remove(this.domNode, 'disabled');
        }
      }
    },

    buildRendering: function () {
      this.inherited(arguments);
      if (this.text) {
        this.domNode.innerHTML = this.text;
      }
    },

    text: '',

    postCreate: function () {
      if (this.disabled) {
        domClass.add(this.domNode, 'disabled');
      } else {
        domClass.remove(this.domNode, 'disabled');
      }

      var _self = this;
      on(this.domNode, 'mousedown', function (evt) {
        console.log('_self.disabled: ', _self.disabled);
        if (_self.disabled) {
          console.log('evt: ', evt);
          Event.stop(evt);
          return;
        }
        domClass.add(_self.domNode, 'depressed');

        var signal = on(window, 'mouseup', function () {
          domClass.remove(_self.domNode, 'depressed');
          signal.remove();
        });
      });

      if (this.toggleButton) {
        on(this.domNode, 'click', function (evt) {
          console.log('_self.disabled: ', _self.disabled);
          if (_self.disabled) {
            Event.stop(evt);
            return;
          }
          _self.toggle();
        });
      } else {
        on(this.domNode, 'click', function (evt) {
          console.log('_self.disabled: ', _self.disabled);
          if (_self.disabled) {
            console.log('evt: ', evt);
            Event.stop(evt);

          }
        });
      }
    },

    toggle: function () {
      if (this.toggled) {
        this.set('toggled', false);
      } else {
        this.set('toggled', true);
      }
    },

    _setToggledAttr: function (val) {
      this.toggled = val;
      if (val) {
        domClass.add(this.domNode, 'toggled');
      } else {
        domClass.remove(this.domNode, 'toggled');
      }
    }
  });
});
