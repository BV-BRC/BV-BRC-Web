define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/dom-construct',
  'dojo/text!./templates/ProteinStructureEffect.html',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dijit/layout/ContentPane',
], function (
  declare,
  lang,
  domConstruct,
  templateString,
  Templated,
  WidgetsInTemplateMixin,
  ContentPane
) {
  return declare([ContentPane, Templated, WidgetsInTemplateMixin],
    {
      id:'proteinStructureEffect',
      templateString: templateString,
      postCreate: function () {
        console.log('calling ' + this.id + '.postCreate');
        this.spinButton.on('change', lang.hitch(this, function () {
          var checked = this.spinButton.get('checked');
          if (checked) {
            if (this.rockButton.get('checked')) {
              this.rockButton.set('checked', false);
            }
            console.log('would add spin');
          } else {
            console.log('would remove spin');
          }
        }));
        this.rockButton.on('change', lang.hitch(this, function () {
          var checked = this.rockButton.get('checked');
          if (checked) {
            if (this.spinButton.get('checked')) {
              this.spinButton.set('checked', false);
            }
            console.log('would add rock');
          } else {
            console.log('would remove rock');
          }
        }));
      }
    });
});
