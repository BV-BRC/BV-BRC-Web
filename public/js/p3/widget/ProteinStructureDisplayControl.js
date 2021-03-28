define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dijit/layout/ContentPane',
  'dijit/Tooltip',
  'dijit/form/Select',
  'dojo/data/ItemFileReadStore',
  'dojo/_base/lang',
  'dojo/request',
  'dojo/text!./templates/ProteinStructureDisplayControls.html',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
], function (
  declare,
  domConstruct,
  ContentPane,
  ToolTip,
  Select,
  ItemFileReadStore,
  lang,
  request,
  templateString,
  Templated,
  WidgetsInTemplateMixin,
) {
  return declare( [ContentPane, Templated, WidgetsInTemplateMixin], {
    baseClass: 'ProteinStructureDisplayControl',
    displayType: null,
    displayTypeStore: null,
    templateString: templateString,
    buildRendering: function () {
      this.inherited(arguments);
    },
    postCreate: function () {
      this.inherited(arguments);
      console.log(this.id + '.postCreate displayType is ' + this.displayType);
      //domConstruct.place(this.displayType.domNode, this.displayTypeSelector);
      //domConstruct.place(this.displayZoom.domNode, this.displayZoomSlider);
      this.select = new Select({
        id: this.id + '_displayTypeSelect',
        name:'displaytype',
        store:this.displayTypeStore,
        style: 'width: 95%',
        maxHeight: -1,
        title: 'Change Display Type',
      });
      domConstruct.place(this.select.domNode, this.displayTypeSelector);

      this.displayTypeDescription = new ToolTip({
        id: this.id + '_typeDescription',
        connectId: [this.displayTypeIcon],
        label: 'Hi, this is a tooltip',
      });


      if (this.displayType) {
        this.select.set('value', this.displayType);
      }

      this.select.on('change', lang.hitch(this, function () {
        var value = this.select.get('value');
        console.log('displayType is now ' + value);
        this.set('displayType', value);
      }));

      if (this.displayType) {
        this.set('displayType', this.displayType);
        this.updateDisplayTypeInfo(this.displayType);
      }

      this.watch('displayType', lang.hitch(this, this.onDisplayTypeChange));
      console.log('displayType is ' + this.displayType);
      console.log('selected is ' + this.select.get('value'));
    },
    onDisplayTypeChange: function (attr, oldValue, newValue) {
      console.log(this.id + '.displayType went from ' + oldValue + ' to ' + newValue);
      if (oldValue != newValue) {
        this.updateDisplayTypeInfo(newValue);
      }
    },
    updateDisplayTypeInfo: function (displayType) {
      this.displayTypeStore.get(displayType).then(record => {
        domConstruct.empty(this.displayTypeIcon);
        domConstruct.create('img',
          {
            src: '/public/js/p3/resources/jsmol/' + record.icon,
            style: 'width:25px;height:25px',
          }, this.displayTypeIcon, 'last');
        if (!(record.description == null || record.description == '')) {
          var helpURL = '/public/js/p3/resources/jsmol/' + record.description;
          console.log('updating description to ' + helpURL);
          request.get(helpURL).then(lang.hitch(this, function (data) {
            this.displayTypeDescription.set('label', '<div style="max-width: 500px;">' + data + '</div>');
          }));
        }
      });
    }
  });
});
