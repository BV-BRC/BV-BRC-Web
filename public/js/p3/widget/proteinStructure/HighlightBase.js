define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dojo/text!../templates/proteinStructure/ProteinStructureHighlight.html',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/layout/ContentPane',
], function (
  declare,
  lang,
  domConstruct,
  domStyle,
  templateString,
  Templated,
  WidgetsInTemplateMixin,
  ContentPane
) {
  return declare([ContentPane, Templated, WidgetsInTemplateMixin], {
    /**
     * Title of what's being highlighted
     */
    title: '',
    /**
     * Highlighting color
     */
    color: '',
    /**
     * Highlight positions as string to color
     */
    positions: new Map(),
    templateString: templateString,
    postCreate: function () {
      this.inherited(arguments);
      // console.log('color is ' + this.color);
      if (this.color) {
        domStyle.set(this.highlightColor, 'background-color', this.color);
      }

      this.highlightColorPalette.on('change', lang.hitch(this, function (color) {
        // console.log('new color is ' + color);
        // console.log('domNode is ' + this.highlightColor);
        domStyle.set(this.highlightColor, 'background-color', color);
        this.set('color', color);
      }));
    }
  });
});
