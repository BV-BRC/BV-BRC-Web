define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_OnDijitClickMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom', 'dojo/dom-class', 'dijit/_TemplatedMixin', 'dojox/dtl/_Templated', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/mouse',
  './OutbreaksGeoMapInfo', 'dojo/text!./OutbreaksGeoMap.html',
  'dijit/ColorPalette', '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang',
  'https://maps.googleapis.com/maps/api/js?key=AIzaSyAo6Eq83tcpiWufvVpw_uuqdoRfWbFXfQ8&sensor=false&libraries=drawing'
], function (
  declare, WidgetBase, on, OnDijitClickMixin, _WidgetsInTemplateMixin,
  dom, domClass, Templated, DtlTemplated, domConstruct, domStyle, mouse,
  OutbreaksGeoMapInfo, Template,
  ColorPalette, PathJoin, xhr, lang
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
    cattleMarkerColor: '#028c81',
    cattleAndHumanMarkerColor: '#035999',
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
    initialBounds: null,

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

    // Create a marker icon with a size fit to the count and selected color
    createMarkerIcon: function (label, isCountryLevel, color = this.defaultMarkerColor) {
      const length = label.length;
      const scale = length === 1 ? 1 : 1.5 + (length - 2) * 0.2;

      return {
        path: isCountryLevel ? 'M 0,0 L 11,-15 L 0,-30 L -11,-15 Z' : 'M 0,0 C -2,-10 -10,-10 -10,-20 A 10,10 0 1,1 10,-20 C 10,-10 2,-10 0,0 Z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 0.5,
        scale: scale,
        labelOrigin: isCountryLevel ? new google.maps.Point(0, -15) : new google.maps.Point(0, -18)
      };
    },

    createInfoWindowContent: function (item) {
      let contentValues = {map: this.map, index: this.index++};

      //Sort host common names TODO: move this to index to make this func generic
      let hostCommonNames = item.metadata.hostCommonNames;
      const sortedKeys = Object.keys(hostCommonNames).sort();
      const sortedHostCommonNames = {};
      sortedKeys.forEach(key => {
        sortedHostCommonNames[key] = hostCommonNames[key];
      });
      item.metadata.hostCommonNames = sortedHostCommonNames;
      // ,eq(state_province,"{{ metadata.stateProvince }}"
      const location = item.metadata.location;
      const stateCountry = location.split(',');
      let locationFilter = ''
      if (stateCountry.length === 1) {
        locationFilter = `,eq(isolation_country,"${stateCountry[0].trim()}")`;
      } else {
        locationFilter = `,eq(state_province,"${stateCountry[0].trim()}"),eq(isolation_country,"${stateCountry[1].trim()}")`;
      }

      let content = new OutbreaksGeoMapInfo(Object.assign({}, contentValues, {
        metadata: item.metadata,
        locationFilter: locationFilter,
        longitude: item.longitude,
        latitude: item.latitude
      }));

      return content.domNode.innerHTML;
    },

    addMarkerToMap: function (item) {
      const latitude = item.latitude.toFixed(5);
      const longitude = item.longitude.toFixed(5);
      const count = item.metadata.genomeNames.length;

      const latLng = new google.maps.LatLng(latitude, longitude);
      let markerColor, markerLabel;
      if (item.metadata.hostCommonNames.hasOwnProperty('Human')) {
        markerColor = this.cattleAndHumanMarkerColor;
        const humanCount = item.metadata.hostCommonNames['Human'];
        markerLabel = humanCount + ' / ' + (count - humanCount);
      } else {
        markerColor = this.cattleMarkerColor;
        markerLabel = count.toString();
      }
      const icon = this.createMarkerIcon(markerLabel, item.isCountryLevel, markerColor);
      const anchorPoint = count === 1 ? 1 : 1.5 + (count - 2) * 0.2;
      const infoContent = this.createInfoWindowContent(item);

      const marker = new google.maps.Marker({
        position: latLng,
        labelAnchor: new google.maps.Point(anchorPoint, 33),
        label: {text: markerLabel, color: '#fff'},
        icon: icon,
        map: this.map
      });
      this.markers.push(marker);

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
            let geocodeAddress = await this.geocodeAddress(geocoder, location);
            const latitude = geocodeAddress.lat();
            const longtitude = geocodeAddress.lng();

            const item = {
              latitude: latitude,
              longitude: longtitude,
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

            if (!minimumLongitude || longtitude < minimumLongitude) {
              minimumLongitude = longtitude;
            }

            if (!maximumLongitude || longtitude > maximumLongitude) {
              maximumLongitude = longtitude;
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
          options.center = this.usaBounds.getCenter();
          options.streetViewControl = false;
          options.disableDefaultUI = true

          // Add styles to hide highways
          options.styles = [
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{ visibility: 'off' }]
            }
          ];

          this.map = new google.maps.Map(document.getElementById(this.canvasId), options);
          this.map.fitBounds(this.usaBounds);

          /*google.maps.event.addListenerOnce(this.map, 'bounds_changed', lang.hitch(this, function () {
            const initialZoomLevel = this.map.getZoom();
            this.initialZoomLevel = initialZoomLevel;
            this.map.setZoom(initialZoomLevel);
          }));*/

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
