define([
  'dojo/_base/declare', './TabViewerBase', 'dojo/on',
  'dojo/dom-class', 'dojo/dom-construct',
  '../PageGrid', '../formatter', '../../util/PathJoin', 'dojo/request', 'dojo/_base/lang',
  '../MapsCanvas'
], function (
  declare, TabViewerBase, on,
  domClass, domConstruct,
  Grid, formatter, PathJoin, xhr, lang,
  GoogleMapsCanvas
) {
  return declare([TabViewerBase], {
    baseClass: 'Surveillance',
    disabled: false,
    containerType: 'surveillance_data',
    query: null,
    mapData: {
      mapHeight: 600,
      showCount: false
    },
    apiServiceUrl: window.App.dataAPI,
    perspectiveLabel: 'Surveillance Data Map View',
    perspectiveIconClass: 'icon-map',
    defaultTab: 'Map',

    _setStateAttr: function (state) {
      this.state = this.state || {};

      if (!this.query) {
        this.set('query', state.search);
      } else {
        if (this.query !== state.search && state.search !== '') {
          this.set('query', state.search);
        }
      }

      if (state.mapData) {
        this.set('mapData', state.mapData);
      }
      this._set('state', state);
    },

    onSetState: function (attr, oldVal, state) {
      if (!state) {
        return;
      }

      this.setActivePanelState();
    },

    setSubTitle: function (locations) {
      if (locations) {
        if (locations.length === 1 && locations[0].items.length === 1) {
          const item = locations[0].items[0];
          this.queryNode.innerHTML = `${item.sample_identifier} | ${item.host_common_name} | ${item.collection_country}`;
        } else {
          let totalCount = 0;
          for (let location of locations) {
            totalCount += location.items.length;
          }
          this.totalCountNode.innerHTML = `( ${totalCount} Surveillance Data )`;
        }
      }
    },

    createMapPanel: function () {
      return new GoogleMapsCanvas({
        title: 'Map',
        id: this.viewer.id + '_map',
        state: this.state
      });
    },

    postCreate: function () {
      if (!this.state) {
        this.state = {};
      }

      this.inherited(arguments);

      this.totalCountNode.innerHTML = '';

      xhr.post(PathJoin(this.apiServiceUrl, 'surveillance'), {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
        data: this.query
      }).then(lang.hitch(this, function (surveillanceList) {
        /*
          {
            latitude: double,
            longitude: double,
            items: array of surveillance data
          }
         */
        let locations = [];
        let minimumLatitude;
        let maximumLatitude;
        let minimumLongitude;
        let maximumLongitude;

        for (let surveillance of surveillanceList) {
          if (surveillance.collection_latitude && surveillance.collection_longitude) {
            // Check if location already exists
            let location = locations.find(
              l => l.latitude === surveillance.collection_latitude && l.longitude === surveillance.collection_longitude
            );

            // Push new location to the existing one or create a new location object
            if (location) {
              location.items.push(surveillance);
            } else {
              const location = {
                latitude: surveillance.collection_latitude,
                longitude: surveillance.collection_longitude,
                items: [surveillance]
              };
              locations.push(location);
            }

            // Determine min&max latitude and longitude values
            if (!minimumLatitude || surveillance.collection_latitude < minimumLatitude) {
              minimumLatitude = surveillance.collection_latitude;
            }

            if (!maximumLatitude || surveillance.collection_latitude > maximumLatitude) {
              maximumLatitude = surveillance.collection_latitude;
            }

            if (!minimumLongitude || surveillance.collection_longitude < minimumLongitude) {
              minimumLongitude = surveillance.collection_longitude;
            }

            if (!maximumLongitude || surveillance.collection_longitude > maximumLongitude) {
              maximumLongitude = surveillance.collection_longitude;
            }
          }
        }

        this.setSubTitle(locations);

        this.mapData.locations = locations;
        this.mapData.minimumLatitude = minimumLatitude || -90.0;
        this.mapData.maximumLatitude = maximumLatitude || 90.0;
        this.mapData.minimumLongitude = minimumLongitude || -180.0;
        this.mapData.maximumLongitude = maximumLongitude || 180.0;

        for (let location of locations) {
          if (location.items.length > 1) {
            this.mapData.showCount = true;
            break;
          }
        }

        this.set('mapData', this.mapData);
        this.state.mapData = this.mapData;
        this.set('locations', locations);
        this.state.locations = locations;

        this.map = this.createMapPanel();
        this.viewer.addChild(this.map);
      })).catch(err => console.log('error', err));
    }
  });
});
