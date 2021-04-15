define([
  'dojo/_base/declare',
  'dojo/dom-construct',
  'dojo/dom-style',
  'dijit/layout/ContentPane',
  'dijit/Tooltip',
  'dijit/form/Select',
  'dojo/data/ObjectStore',
  'dojo/_base/lang',
  'dojo/request',
  'dojo/text!./templates/ProteinStructureDisplayControls.html',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
], function (
  declare,
  domConstruct,
  domStyle,
  ContentPane,
  ToolTip,
  Select,
  ObjectStore,
  lang,
  request,
  templateString,
  Templated,
  WidgetsInTemplateMixin,
) {
  return declare( [ContentPane, Templated, WidgetsInTemplateMixin], {
    baseClass: 'ProteinStructureDisplayControl',
    displayType: '',
    displayTypeInfo: {},
    zoomLevel: 100,
    effect: {},
    templateString: templateString,
    displayTypeStore: null,
    buildRendering: function () {
      this.inherited(arguments);
    },
    postCreate: function () {
      this.inherited(arguments);

      console.log(this.id + '.postCreate displayTypeInfo is ' + JSON.stringify(this.get('displayTypeInfo')));

      this.select = new Select({
        id: this.id + '_displayTypeSelect',
        name: 'displaytype',
        store: this.displayTypeStore,
        style: 'width: 95%',
        maxHeight: -1,
        title: 'Change Display Type',
        value: this.get('displayType')
      });
      domConstruct.place(this.select.domNode, this.displayTypeSelector);

      this.displayTypeDescription = new ToolTip({
        id: this.id + '_typeDescription',
        connectId: [this.displayTypeIcon],
        label: 'Hi, this is a tooltip',
      });

      if (this.get('displayType') && this.get('displayTypeInfo')) {
        let displayTypeInfo = this.get('displayTypeInfo');
        console.log('DisplayControl setting displayType to ' + displayTypeInfo.id);
        this.select.set('value', displayTypeInfo.id);
        this.updateDisplayTypeInfo(this.get('displayTypeInfo'));
      }
      this.watch('displayTypeInfo', lang.hitch(this, this.onDisplayTypeChange));

      this.select.on('change', lang.hitch(this, function () {
        var displayTypeId = this.select.get('value');
        console.log('DisplayControl displayType is now ' + displayTypeId);
        this.set('displayType', displayTypeId);
      }));

      // check if zoomLevel is in normal options, otherwise change to custom and set custom value
      var zoomOptions = this.displayZoom.options.filter(o => o.value == this.zoomLevel);
      if (zoomOptions.length == 1) {
        this.displayZoom.set('value', this.zoomLevel);
      } else {
        this.displayZoom.set('value', 'custom');
        domStyle.set(this.displayZoomCustomContainer, 'visibility', 'visible');
        this.displayZoomCustom.set('value', this.zoomLevel);
      }

      this.displayZoom.on('change', lang.hitch(this, function () {
        var zoomLevel = this.displayZoom.get('value') || 100;
        console.log('DisplayControl zoom level is ' + zoomLevel);
        if ( zoomLevel == 'custom' ) {
          domStyle.set(this.displayZoomCustomContainer, 'visibility', 'visible');
        } else {
          domStyle.set(this.displayZoomCustomContainer, 'visibility', 'hidden');
          this.set('zoomLevel', zoomLevel);
        }
      }));

      this.displayZoomCustom.on('change', lang.hitch(this, function () {
        var zoomLevel = this.displayZoomCustom.get('value');
        console.log('DisplayControl custom zoom level is ' + zoomLevel);
        this.set('zoomLevel', zoomLevel);
      }));

      this.displayEffect.watch('effect', lang.hitch(this, function (attr, oldValue, newValue) {
        console.log('DisplayControl effect has changed to: ' + newValue);
        this.set('effect', newValue);
      }));
    },
    onDisplayTypeChange: function (attr, oldValue, newValue) {
      console.log(this.id + '.displayType went from ' + JSON.stringify(oldValue) + ' to ' + JSON.stringify(newValue));
      this.updateDisplayTypeInfo(newValue);
    },
    updateDisplayTypeInfo: function (displayType) {
      if (displayType) {
        this.set('displayType', displayType.id);
        // update display select if it's changed
        if (this.select.get('value') != displayType.id) {
          this.select.set('value', displayType.id);
        }
        // console.log('DisplayControl updated to ' + JSON.stringify(displayType));
        domConstruct.empty(this.displayTypeIcon);
        if (displayType.icon) {
          console.log('creating icon ' + displayType.icon);
          domConstruct.create('img',
            {
              src: '/public/js/p3/resources/jsmol/' + displayType.icon,
              style: 'width:25px;height:25px',
            }, this.displayTypeIcon, 'last');
        }
        if (!(displayType.description == null || displayType.description == '')) {
          var helpURL = '/public/js/p3/resources/jsmol/' + displayType.description;
          console.log('updating description to ' + helpURL);
          request.get(helpURL).then(lang.hitch(this, function (data) {
            console.log('setting displayType description text');
            this.displayTypeDescription.set('label', '<div style="max-width: 500px;">' + data + '</div>');
          }));
        }
      }
    }
  });
});
