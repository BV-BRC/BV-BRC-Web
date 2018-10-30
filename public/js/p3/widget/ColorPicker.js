define([
  'dojo/_base/declare', 'dojox/widget/ColorPicker', 'dijit/_Widget', 'dojo/dom-style',
  'dijit/popup', 'dojo/on', 'dijit/ColorPalette', 'dojo/_base/lang', 'dojo/dom-construct',
  'dojo/dom-attr', 'dijit/TooltipDialog'
], function (
  declare, ColorPicker, WidgetBase, domStyle,
  Popup, on, ColorPalette, lang, domConstruct,
  domAttr, TooltipDialog
) {
  return declare([WidgetBase], {
    backgroundColor: '#ff0000',
    foregroundColor: '#0000ff',
    enableForegroundSelector: true,
    enableBackgroundSelector: true,
    size: 14,
    postCreate: function () {
      this.inherited(arguments);
      // domStyle.set(this.domNode,"postition", "absolute");
      this.backgroundButton = domConstruct.create('div', {
        rel: 'backgroundColor',
        'class': 'BackgroundSelector' + (this.enableBackgroundSelector ? '' : ' dijitHidden'),
        style: {
          'border-radius': '3px',
          border: '1px solid #333',
          display: 'inline-block',
          'float': 'left',
          width: this.size + 'px',
          height: this.size + 'px',
          background: this.backgroundColor
        }
      }, this.domNode);
      this.foregroundButton = domConstruct.create('div', {
        rel: 'foregroundColor',
        'class': 'ForegroundSelector' + (this.enableForegroundSelector ? '' : ' dijitHidden'),
        style: {
          'border-radius': '3px',
          border: '1px solid #333',
          display: 'inline-block',
          margin: '0px',
          'margin-left': '-7px',
          'margin-top': '7px',
          width: this.size + 'px',
          height: this.size + 'px',
          background: this.foregroundColor
        }
      }, this.domNode);
      // this.backgroundButton = domConstruct.create("div", {rel: "backgroundColor",  style: {"border-radius":"3px", "border":"1px solid #333", "display": "inline-block", "float":"left", width: this.size+"px", height: this.size+"px", background: this.backgroundColor}},this.domNode)
      // this.foregroundButton = domConstruct.create("div", {rel: "foregroundColor",  style: {"border-radius":"3px", "border":"1px solid #333", display: "inline-block","margin":"0px", "margin-left": "-7px", "margin-top": "7px",width: this.size+"px", height: this.size+"px", background: this.foregroundColor}},this.domNode)

      on(this.domNode, 'click', lang.hitch(this, function (evt) {
        var _self = this;
        var cp = new ColorPalette({
          onChange: function () {
            console.log('Changed: ');
            var rel = domAttr.get(evt.target, 'rel');
            var val = cp.get('value');
            console.log('set: ', rel, ' to ', val);
            _self.set(rel, val);
            // Popup.close(_self._dropdown)
          }
        });
        var dd = new TooltipDialog({
          content: cp,
          onMouseLeave: function () {
            Popup.close(_self._dropdown);
          }
        });

        this.watch('backgroundColor', lang.hitch(this, function (attr, oldVal, c) {
          domStyle.set(this.backgroundButton, 'background', c);
        }));
        this.watch('foregroundColor', lang.hitch(this, function (attr, oldVal, c) {
          domStyle.set(this.foregroundButton, 'background', c);
        }));
        Popup.moveOffScreen(dd);
        // if (this._dropdown.startup && !this._dropdown._started) { this._dropdown.startup() }

        Popup.open({
          // parent: this,
          popup: dd,
          around: this.domNode
        });
      }));
    }
  });
});
