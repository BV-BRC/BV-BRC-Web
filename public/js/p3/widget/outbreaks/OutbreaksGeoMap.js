define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_OnDijitClickMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom', 'dojo/dom-class', 'dijit/_TemplatedMixin', 'dojox/dtl/_Templated', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/mouse',
  'dojo/text!./OutbreaksGeoMap.html', 'dijit/ColorPalette', '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang',
  'https://maps.googleapis.com/maps/api/js?key=AIzaSyAo6Eq83tcpiWufvVpw_uuqdoRfWbFXfQ8&sensor=false&libraries=drawing'
], function (
  declare, WidgetBase, on, OnDijitClickMixin, _WidgetsInTemplateMixin,
  dom, domClass, Templated, DtlTemplated, domConstruct, domStyle, mouse,
  Template, ColorPalette, PathJoin, xhr, lang
) {

  return declare([WidgetBase, Templated], {
    baseClass: 'OutbreaksGeoMap',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    data: null,
    index: 0,
    state: null,
    map: null,
    infoWindows: [],
    markers: [],
    canvasId: 'outbreaksGeoMapCanvas',
    /* Page level variables to hold the map state */
    initialCenter: null, // Store the center location for future reset
    initialZoomLevel: -1, // Default to -1 to make sure it has been set later
    defaultMarkerColor: '#FE7569',
    defaultMapOptions: {
      backgroundColor: '#E7F1FA',
      //mapTypeId: google.maps.MapTypeId.TERRAIN,
      scaleControl: true
    },
    coordinatesUSA: {
      maximumLatitude: 47.7510741,
      maximumLongitude: -76.64127119999999,
      minimumLatitude: 31.9685988,
      minimumLongitude: -120.7401386
    },
    usaBounds: null,
    focusOnUS: true,
    initialBounds: null,
    createInfoWindowContent: null,
    createMarker: null,
    headerInfo: null,
    footerInfo: null,

    _setStateAttr: function (state) {
      this._set('state', state);

      this.watch('data', lang.hitch(this, 'onSetData'));
    },

    onMapTypeChange: function (val) {
      if (this.us_map.checked == true) {
        this.map.setCenter(this.usaBounds.getCenter());
        this.map.fitBounds(this.usaBounds);
      } else {
        this.map.setCenter(this.initialBounds.getCenter());
        this.map.fitBounds(this.initialBounds);
      }
    },

    resetMapToDefault: function () {
      this.map.setCenter(this.initialCenter);
      this.map.setZoom(this.initialZoomLevel);
      this.map.setMapTypeId(this.defaultMapOptions.mapTypeId);

      // Close all the info  windows
      for (let infoWindow of this.infoWindows) {
        infoWindow.close();
      }
    },

    addMarkerToMap: function (item) {
      const marker = this.createMarker(item);
      this.markers.push(marker);

      if (this.createInfoWindowContent) {
        const infoContent = this.createInfoWindowContent(item);
        const infoWindow = new google.maps.InfoWindow({
          content: infoContent
        });
        this.infoWindows.push(infoWindow);

        marker.addListener('click', () => {
          infoWindow.open({
            anchor: marker,
            map: this.map,
            shouldFocus: false
          });
        });
      }
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      // Get the center bounds of USA
      let minLatLong = new google.maps.LatLng(this.coordinatesUSA.minimumLatitude, this.coordinatesUSA.minimumLongitude);
      let maxLatLong = new google.maps.LatLng(this.coordinatesUSA.maximumLatitude, this.coordinatesUSA.maximumLongitude);

      this.usaBounds = new google.maps.LatLngBounds(minLatLong, maxLatLong);
    },

    postCreate: function () {
      if (this.headerInfo) {
        this.headerInfoNode.innerHTML = this.headerInfo;
      }
      if (this.footerInfo) {
        this.footerInfoNode.innerHTML = this.footerInfo;
      }
    },

    onSetData: async function () {
      if (this.data) {
        const geocoder = new google.maps.Geocoder();
        let items = [];
        let minimumLatitude;
        let maximumLatitude;
        let minimumLongitude;
        let maximumLongitude;

        for (const [location, info] of Object.entries(this.data)) {
          try {
            let latitude, longitude;

            if (location.toLowerCase() === 'usa') {
              // Set the latitude and longitude for USA specifically
              latitude = 39.8283;
              longitude = -101.3;
            } else {
              // Geocode other locations
              let geocodeAddress = await this.geocodeAddress(geocoder, location);
              latitude = geocodeAddress.lat();
              longitude = geocodeAddress.lng();
            }

            const item = {
              latitude: latitude,
              longitude: longitude,
              isCountryLevel: !location.includes(','),
              metadata: {...info, location}
            };
            items.push(item);

            // Determine min&max latitude and longitude values
            if (!minimumLatitude || latitude < minimumLatitude) {
              minimumLatitude = latitude;
            }

            if (!maximumLatitude || latitude > maximumLatitude) {
              maximumLatitude = latitude;
            }

            if (!minimumLongitude || longitude < minimumLongitude) {
              minimumLongitude = longitude;
            }

            if (!maximumLongitude || longitude > maximumLongitude) {
              maximumLongitude = longitude;
            }

          } catch (error) {
            console.error('Geocode failed for', location, 'with reason:', error);
          }
        }

        let mapData = {
          items: items,
          minimumLatitude: minimumLatitude || -90.0,
          maximumLatitude: maximumLatitude || 90.0,
          minimumLongitude: minimumLongitude || -180.0,
          maximumLongitude: maximumLongitude || 180.0
        };

        if (mapData && mapData.items) {
          let minLatLong = new google.maps.LatLng(mapData.minimumLatitude, mapData.minimumLongitude);
          let maxLatLong = new google.maps.LatLng(mapData.maximumLatitude, mapData.maximumLongitude);

          const bounds = new google.maps.LatLngBounds(minLatLong, maxLatLong);
          this.initialBounds = bounds;

          let options = this.defaultMapOptions;
          if (this.focusOnUS) {
            options.center = this.usaBounds.getCenter();
          } else {
            options.center = bounds.getCenter();
          }
          options.streetViewControl = false;
          options.disableDefaultUI = true;
          options.zoomControl = true;

          // Add styles to hide highways
          options.styles = [
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{ visibility: 'off' }]
            }
          ];

          this.map = new google.maps.Map(document.getElementById(this.canvasId), options);
          if (this.focusOnUS) {
            this.map.fitBounds(this.usaBounds);
          } else {
            this.map.fitBounds(bounds);
          }

          google.maps.event.addListenerOnce(this.map, 'bounds_changed', lang.hitch(this, function () {
            if (!this.focusOnUS) {
              let map = dom.byId('global_map');
              map.checked = true;
            }
          }));

          // Add marker and info windows for each location
          for (let item of mapData.items) {
            this.addMarkerToMap(item);
          }
        }
      } else {
        console.log('Provide location data to render google maps.');
      }
    },

    geocodeAddress: function (geocoder, location) {
      return new Promise((resolve, reject) => {
        geocoder.geocode({'address': location}, function (results, status) {
          if (status === google.maps.GeocoderStatus.OK) {
            resolve(results[0].geometry.location);
          } else {
            reject(status);
          }
        });
      });
    }
  });
});
