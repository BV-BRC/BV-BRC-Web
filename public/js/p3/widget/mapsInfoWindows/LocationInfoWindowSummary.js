define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_OnDijitClickMixin', 'dijit/_WidgetsInTemplateMixin', 'dojo/_base/lang',
  'dijit/_TemplatedMixin', 'dojox/dtl/_Templated', 'dojo/text!../templates/SurveillanceDataMapInfoWindowSummary.html'
], function (
  declare, WidgetBase, on, OnDijitClickMixin, _WidgetsInTemplateMixin, lang,
  Templated, DtlTemplated, Template
) {

  return declare([WidgetBase, OnDijitClickMixin, Templated, DtlTemplated, _WidgetsInTemplateMixin], {
    templateString: Template,
    locationLat: null,
    locationLng: null,
    collectionState: null,
    collectionCountry: null,
    speciesMap: {},
    positiveCount: null,
    testedCount: null,
    prevalence: null,
    state: null,
    map: null,

    postCreate: function () {
      this.inherited(arguments);

      on(document, `#sd-zoom-${this.index}:click`, lang.hitch(this, function () {
        // Zoom to level 12 unless it is already zoomed in further than 12
        let zoomLevel = 12;
        if (this.map.getZoom() > 12) {
          zoomLevel = this.map.getZoom();
        }
        this.map.setCenter(new google.maps.LatLng(this.locationLat, this.locationLng));
        this.map.setZoom(zoomLevel);
      }));
    }
  });
});
