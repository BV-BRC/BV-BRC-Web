define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_WidgetsInTemplateMixin',
  'dijit/_TemplatedMixin', 'dojo/text!./OutbreaksGeoMap.html', 'dojo/_base/lang',
  '../../util/LeafletSupport'
], function (
  declare, WidgetBase, _WidgetsInTemplateMixin,
  Templated, Template, lang,
  LeafletSupport
) {

  var loadMarkerCluster = LeafletSupport.loadMarkerCluster;

  // Session-level geocoding cache, shared across all OutbreaksGeoMap instances.
  // Maps "location string" → { lat, lng } | null (null = failed lookup).
  var _geocodeCache = Object.create(null);
  var _geocodeQueue = Promise.resolve();
  var GEOCODE_MIN_INTERVAL_MS = 1100; // Nominatim TOU: <= 1 req/sec

  // Country centroids — cover ~all common outbreak source countries so the
  // map can render synchronously without hitting Nominatim.
  var COUNTRY_CENTROIDS = {
    'usa': { lat: 39.8283, lng: -101.3 }, 'united states': { lat: 39.8283, lng: -101.3 },
    'united states of america': { lat: 39.8283, lng: -101.3 }, 'us': { lat: 39.8283, lng: -101.3 },
    'china': { lat: 35.8617, lng: 104.1954 }, 'india': { lat: 20.5937, lng: 78.9629 },
    'brazil': { lat: -14.235, lng: -51.9253 }, 'russia': { lat: 61.524, lng: 105.3188 },
    'germany': { lat: 51.1657, lng: 10.4515 }, 'france': { lat: 46.6034, lng: 1.8883 },
    'united kingdom': { lat: 55.3781, lng: -3.436 }, 'uk': { lat: 55.3781, lng: -3.436 },
    'england': { lat: 52.3555, lng: -1.1743 }, 'scotland': { lat: 56.4907, lng: -4.2026 },
    'wales': { lat: 52.1307, lng: -3.7837 }, 'northern ireland': { lat: 54.7877, lng: -6.4923 },
    'ireland': { lat: 53.4129, lng: -8.2439 }, 'canada': { lat: 56.1304, lng: -106.3468 },
    'mexico': { lat: 23.6345, lng: -102.5528 }, 'japan': { lat: 36.2048, lng: 138.2529 },
    'south korea': { lat: 35.9078, lng: 127.7669 }, 'north korea': { lat: 40.3399, lng: 127.5101 },
    'south africa': { lat: -30.5595, lng: 22.9375 }, 'australia': { lat: -25.2744, lng: 133.7751 },
    'new zealand': { lat: -40.9006, lng: 174.886 }, 'argentina': { lat: -38.4161, lng: -63.6167 },
    'chile': { lat: -35.6751, lng: -71.543 }, 'peru': { lat: -9.19, lng: -75.0152 },
    'colombia': { lat: 4.5709, lng: -74.2973 }, 'venezuela': { lat: 6.4238, lng: -66.5897 },
    'ecuador': { lat: -1.8312, lng: -78.1834 }, 'bolivia': { lat: -16.2902, lng: -63.5887 },
    'paraguay': { lat: -23.4425, lng: -58.4438 }, 'uruguay': { lat: -32.5228, lng: -55.7658 },
    'spain': { lat: 40.4637, lng: -3.7492 }, 'portugal': { lat: 39.3999, lng: -8.2245 },
    'italy': { lat: 41.8719, lng: 12.5674 }, 'greece': { lat: 39.0742, lng: 21.8243 },
    'turkey': { lat: 38.9637, lng: 35.2433 }, 'iran': { lat: 32.4279, lng: 53.688 },
    'iraq': { lat: 33.2232, lng: 43.6793 }, 'saudi arabia': { lat: 23.8859, lng: 45.0792 },
    'israel': { lat: 31.0461, lng: 34.8516 }, 'jordan': { lat: 30.5852, lng: 36.2384 },
    'lebanon': { lat: 33.8547, lng: 35.8623 }, 'syria': { lat: 34.8021, lng: 38.9968 },
    'yemen': { lat: 15.5527, lng: 48.5164 }, 'oman': { lat: 21.4735, lng: 55.9754 },
    'united arab emirates': { lat: 23.4241, lng: 53.8478 }, 'uae': { lat: 23.4241, lng: 53.8478 },
    'qatar': { lat: 25.3548, lng: 51.1839 }, 'kuwait': { lat: 29.3117, lng: 47.4818 },
    'afghanistan': { lat: 33.9391, lng: 67.71 }, 'pakistan': { lat: 30.3753, lng: 69.3451 },
    'bangladesh': { lat: 23.685, lng: 90.3563 }, 'sri lanka': { lat: 7.8731, lng: 80.7718 },
    'nepal': { lat: 28.3949, lng: 84.124 }, 'bhutan': { lat: 27.5142, lng: 90.4336 },
    'myanmar': { lat: 21.9162, lng: 95.956 }, 'burma': { lat: 21.9162, lng: 95.956 },
    'kazakhstan': { lat: 48.0196, lng: 66.9237 }, 'uzbekistan': { lat: 41.3775, lng: 64.5853 },
    'turkmenistan': { lat: 38.9697, lng: 59.5563 }, 'kyrgyzstan': { lat: 41.2044, lng: 74.7661 },
    'tajikistan': { lat: 38.861, lng: 71.2761 }, 'mongolia': { lat: 46.8625, lng: 103.8467 },
    'vietnam': { lat: 14.0583, lng: 108.2772 }, 'laos': { lat: 19.8563, lng: 102.4955 },
    'cambodia': { lat: 12.5657, lng: 104.991 }, 'thailand': { lat: 15.87, lng: 100.9925 },
    'malaysia': { lat: 4.2105, lng: 101.9758 }, 'singapore': { lat: 1.3521, lng: 103.8198 },
    'indonesia': { lat: -0.7893, lng: 113.9213 }, 'philippines': { lat: 12.8797, lng: 121.774 },
    'taiwan': { lat: 23.6978, lng: 120.9605 }, 'hong kong': { lat: 22.3193, lng: 114.1694 },
    'egypt': { lat: 26.8206, lng: 30.8025 }, 'libya': { lat: 26.3351, lng: 17.2283 },
    'tunisia': { lat: 33.8869, lng: 9.5375 }, 'algeria': { lat: 28.0339, lng: 1.6596 },
    'morocco': { lat: 31.7917, lng: -7.0926 }, 'sudan': { lat: 12.8628, lng: 30.2176 },
    'south sudan': { lat: 6.877, lng: 31.307 }, 'ethiopia': { lat: 9.145, lng: 40.4897 },
    'eritrea': { lat: 15.1794, lng: 39.7823 }, 'somalia': { lat: 5.1521, lng: 46.1996 },
    'kenya': { lat: -0.0236, lng: 37.9062 }, 'uganda': { lat: 1.3733, lng: 32.2903 },
    'tanzania': { lat: -6.369, lng: 34.8888 }, 'rwanda': { lat: -1.9403, lng: 29.8739 },
    'burundi': { lat: -3.3731, lng: 29.9189 }, 'nigeria': { lat: 9.082, lng: 8.6753 },
    'ghana': { lat: 7.9465, lng: -1.0232 }, 'cote d\'ivoire': { lat: 7.54, lng: -5.5471 },
    'senegal': { lat: 14.4974, lng: -14.4524 }, 'mali': { lat: 17.5707, lng: -3.9962 },
    'cameroon': { lat: 7.3697, lng: 12.3547 }, 'angola': { lat: -11.2027, lng: 17.8739 },
    'mozambique': { lat: -18.6657, lng: 35.5296 }, 'zambia': { lat: -13.1339, lng: 27.8493 },
    'zimbabwe': { lat: -19.0154, lng: 29.1549 }, 'madagascar': { lat: -18.7669, lng: 46.8691 },
    'democratic republic of the congo': { lat: -4.0383, lng: 21.7587 },
    'congo': { lat: -0.228, lng: 15.8277 }, 'central african republic': { lat: 6.6111, lng: 20.9394 },
    'gabon': { lat: -0.8037, lng: 11.6094 }, 'chad': { lat: 15.4542, lng: 18.7322 },
    'niger': { lat: 17.6078, lng: 8.0817 }, 'burkina faso': { lat: 12.2383, lng: -1.5616 },
    'liberia': { lat: 6.4281, lng: -9.4295 }, 'sierra leone': { lat: 8.4606, lng: -11.7799 },
    'guinea': { lat: 9.9456, lng: -9.6966 }, 'mauritania': { lat: 21.0079, lng: -10.9408 },
    'belgium': { lat: 50.5039, lng: 4.4699 }, 'netherlands': { lat: 52.1326, lng: 5.2913 },
    'luxembourg': { lat: 49.8153, lng: 6.1296 }, 'switzerland': { lat: 46.8182, lng: 8.2275 },
    'austria': { lat: 47.5162, lng: 14.5501 }, 'czechia': { lat: 49.8175, lng: 15.473 },
    'czech republic': { lat: 49.8175, lng: 15.473 }, 'slovakia': { lat: 48.669, lng: 19.699 },
    'hungary': { lat: 47.1625, lng: 19.5033 }, 'poland': { lat: 51.9194, lng: 19.1451 },
    'denmark': { lat: 56.2639, lng: 9.5018 }, 'sweden': { lat: 60.1282, lng: 18.6435 },
    'norway': { lat: 60.472, lng: 8.4689 }, 'finland': { lat: 61.9241, lng: 25.7482 },
    'iceland': { lat: 64.9631, lng: -19.0208 }, 'estonia': { lat: 58.5953, lng: 25.0136 },
    'latvia': { lat: 56.8796, lng: 24.6032 }, 'lithuania': { lat: 55.1694, lng: 23.8813 },
    'belarus': { lat: 53.7098, lng: 27.9534 }, 'ukraine': { lat: 48.3794, lng: 31.1656 },
    'moldova': { lat: 47.4116, lng: 28.3699 }, 'romania': { lat: 45.9432, lng: 24.9668 },
    'bulgaria': { lat: 42.7339, lng: 25.4858 }, 'serbia': { lat: 44.0165, lng: 21.0059 },
    'croatia': { lat: 45.1, lng: 15.2 }, 'slovenia': { lat: 46.1512, lng: 14.9955 },
    'bosnia and herzegovina': { lat: 43.9159, lng: 17.6791 }, 'montenegro': { lat: 42.7087, lng: 19.3744 },
    'north macedonia': { lat: 41.6086, lng: 21.7453 }, 'albania': { lat: 41.1533, lng: 20.1683 },
    'kosovo': { lat: 42.6026, lng: 20.903 }, 'cyprus': { lat: 35.1264, lng: 33.4299 },
    'malta': { lat: 35.9375, lng: 14.3754 }, 'cuba': { lat: 21.5218, lng: -77.7812 },
    'haiti': { lat: 18.9712, lng: -72.2852 }, 'dominican republic': { lat: 18.7357, lng: -70.1627 },
    'jamaica': { lat: 18.1096, lng: -77.2975 }, 'puerto rico': { lat: 18.2208, lng: -66.5901 },
    'panama': { lat: 8.538, lng: -80.7821 }, 'costa rica': { lat: 9.7489, lng: -83.7534 },
    'nicaragua': { lat: 12.8654, lng: -85.2072 }, 'honduras': { lat: 15.2, lng: -86.2419 },
    'el salvador': { lat: 13.7942, lng: -88.8965 }, 'guatemala': { lat: 15.7835, lng: -90.2308 },
    'belize': { lat: 17.1899, lng: -88.4976 }
  };

  // US state centroids — outbreak data is heavy on "State, USA" so resolve
  // those without ever hitting Nominatim.
  var US_STATES = {
    'alabama': { lat: 32.7794, lng: -86.8287 }, 'alaska': { lat: 64.0685, lng: -152.2782 },
    'arizona': { lat: 34.2744, lng: -111.6602 }, 'arkansas': { lat: 34.8938, lng: -92.4426 },
    'california': { lat: 37.1841, lng: -119.4696 }, 'colorado': { lat: 38.9972, lng: -105.5478 },
    'connecticut': { lat: 41.6219, lng: -72.7273 }, 'delaware': { lat: 38.9896, lng: -75.505 },
    'district of columbia': { lat: 38.9101, lng: -77.0147 }, 'florida': { lat: 28.6305, lng: -82.4497 },
    'georgia': { lat: 32.6415, lng: -83.4426 }, 'hawaii': { lat: 20.2927, lng: -156.3737 },
    'idaho': { lat: 44.3509, lng: -114.613 }, 'illinois': { lat: 40.0417, lng: -89.1965 },
    'indiana': { lat: 39.8942, lng: -86.2816 }, 'iowa': { lat: 42.0751, lng: -93.496 },
    'kansas': { lat: 38.4937, lng: -98.3804 }, 'kentucky': { lat: 37.5347, lng: -85.3021 },
    'louisiana': { lat: 31.0689, lng: -91.9968 }, 'maine': { lat: 45.3695, lng: -69.2428 },
    'maryland': { lat: 39.055, lng: -76.7909 }, 'massachusetts': { lat: 42.2596, lng: -71.8083 },
    'michigan': { lat: 44.3467, lng: -85.4102 }, 'minnesota': { lat: 46.2807, lng: -94.3053 },
    'mississippi': { lat: 32.7364, lng: -89.6678 }, 'missouri': { lat: 38.3566, lng: -92.458 },
    'montana': { lat: 47.0527, lng: -109.6333 }, 'nebraska': { lat: 41.5378, lng: -99.7951 },
    'nevada': { lat: 39.3289, lng: -116.6312 }, 'new hampshire': { lat: 43.6805, lng: -71.5811 },
    'new jersey': { lat: 40.1907, lng: -74.6728 }, 'new mexico': { lat: 34.4071, lng: -106.1126 },
    'new york': { lat: 42.9538, lng: -75.5268 }, 'north carolina': { lat: 35.5557, lng: -79.3877 },
    'north dakota': { lat: 47.4501, lng: -100.4659 }, 'ohio': { lat: 40.2862, lng: -82.7937 },
    'oklahoma': { lat: 35.5889, lng: -97.4943 }, 'oregon': { lat: 43.9336, lng: -120.5583 },
    'pennsylvania': { lat: 40.8781, lng: -77.7996 }, 'rhode island': { lat: 41.6762, lng: -71.5562 },
    'south carolina': { lat: 33.9169, lng: -80.8964 }, 'south dakota': { lat: 44.4443, lng: -100.2263 },
    'tennessee': { lat: 35.858, lng: -86.3505 }, 'texas': { lat: 31.4757, lng: -99.3312 },
    'utah': { lat: 39.3055, lng: -111.6703 }, 'vermont': { lat: 44.0687, lng: -72.6658 },
    'virginia': { lat: 37.5215, lng: -78.8537 }, 'washington': { lat: 47.3826, lng: -120.4472 },
    'west virginia': { lat: 38.6409, lng: -80.6227 }, 'wisconsin': { lat: 44.6243, lng: -89.9941 },
    'wyoming': { lat: 42.9957, lng: -107.5512 }
  };
  // 2-letter postal abbrev → state name for fast lookup
  var US_STATE_ABBREV = {
    AL: 'alabama', AK: 'alaska', AZ: 'arizona', AR: 'arkansas', CA: 'california',
    CO: 'colorado', CT: 'connecticut', DE: 'delaware', DC: 'district of columbia',
    FL: 'florida', GA: 'georgia', HI: 'hawaii', ID: 'idaho', IL: 'illinois', IN: 'indiana',
    IA: 'iowa', KS: 'kansas', KY: 'kentucky', LA: 'louisiana', ME: 'maine', MD: 'maryland',
    MA: 'massachusetts', MI: 'michigan', MN: 'minnesota', MS: 'mississippi', MO: 'missouri',
    MT: 'montana', NE: 'nebraska', NV: 'nevada', NH: 'new hampshire', NJ: 'new jersey',
    NM: 'new mexico', NY: 'new york', NC: 'north carolina', ND: 'north dakota', OH: 'ohio',
    OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', RI: 'rhode island', SC: 'south carolina',
    SD: 'south dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VT: 'vermont', VA: 'virginia',
    WA: 'washington', WV: 'west virginia', WI: 'wisconsin', WY: 'wyoming'
  };

  // Try to resolve a "Region, Country" string against the static gazetteer.
  // Returns coords or null (caller falls through to Nominatim).
  function lookupStatic(raw) {
    var key = ('' + raw).toLowerCase().trim();
    if (COUNTRY_CENTROIDS[key]) return COUNTRY_CENTROIDS[key];
    if (US_STATES[key]) return US_STATES[key];

    var parts = key.split(',').map(function (p) {
      return p.trim();
    });
    if (parts.length === 2) {
      var region = parts[0];
      var country = parts[1];
      // "Texas, USA" / "TX, USA"
      if (country === 'usa' || country === 'us' || country === 'united states'
        || country === 'united states of america') {
        if (US_STATES[region]) return US_STATES[region];
        var abbrev = region.toUpperCase();
        if (US_STATE_ABBREV[abbrev]) return US_STATES[US_STATE_ABBREV[abbrev]];
      }
      // Generic "Region, Country" — fall back to the country centroid
      if (COUNTRY_CENTROIDS[country]) return COUNTRY_CENTROIDS[country];
    }
    return null;
  }

  function geocodeViaNominatim(address) {
    return new Promise(function (resolve) {
      // Chain serially to honor Nominatim rate limit.
      _geocodeQueue = _geocodeQueue.then(function () {
        return fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
          encodeURIComponent(address), {
          headers: { 'Accept': 'application/json' }
        }).then(function (r) {
          return r.ok ? r.json() : [];
        }).then(function (results) {
          if (results && results.length) {
            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
          } else {
            resolve(null);
          }
        }).catch(function () {
          resolve(null);
        });
      }).then(function () {
        // Always wait the throttle window after each request, success or fail.
        return new Promise(function (r) {
          setTimeout(r, GEOCODE_MIN_INTERVAL_MS);
        });
      });
    });
  }

  // Sync-only resolver — returns coords or null without touching the network.
  // Used to render the bulk of markers immediately on the first pass.
  function geocodeSync(address) {
    var key = ('' + address).toLowerCase().trim();
    if (Object.prototype.hasOwnProperty.call(_geocodeCache, key)) {
      return _geocodeCache[key];
    }
    var hit = lookupStatic(address);
    if (hit) {
      _geocodeCache[key] = hit;
      return hit;
    }
    return null;
  }

  function geocode(address) {
    var sync = geocodeSync(address);
    if (sync !== null) return Promise.resolve(sync);
    var key = ('' + address).toLowerCase().trim();
    return geocodeViaNominatim(address).then(function (coords) {
      _geocodeCache[key] = coords; // may be null; cache the miss too
      return coords;
    });
  }

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'OutbreaksGeoMap',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    data: null,
    index: 0,
    state: null,
    map: null,
    markers: [],
    canvasId: 'outbreaksGeoMapCanvas',
    initialCenter: null,
    initialZoomLevel: -1,
    defaultMarkerColor: '#FE7569',
    coordinatesUSA: {
      maximumLatitude: 49.5,
      maximumLongitude: -66.0,
      minimumLatitude: 24.5,
      minimumLongitude: -125.0
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

      // Watch data only
      if (!this._dataWatchHandle) {
        this._dataWatchHandle = this.watch('data', lang.hitch(this, 'onSetData'));
      }
    },

    onMapTypeChange: function (val) {
      this._syncToggleVisual();
      if (!this.map) return;
      this._applyLevelFilter();
      this._fitTo(this.us_map.checked ? this.usaBounds : this.initialBounds);
    },

    // Toggle is driven by label click, not dijit RadioButton onChange (which
    // doesn't reliably fire for the group's unchecked sibling).
    _selectUsMap: function () {
      this._selectMapType('us_map');
    },
    _selectGlobalMap: function () {
      this._selectMapType('global_map');
    },

    _selectMapType: function (which) {
      this._setRadio(which);
      if (!this.map) return;
      this._applyLevelFilter();
      this._fitTo(which === 'us_map' ? this.usaBounds : this.initialBounds);
    },

    // Fit to `target` bounds. invalidateSize first so a stale (hidden/unsized)
    // container doesn't mis-compute the zoom; skip if not laid out yet.
    _fitTo: function (target) {
      if (!this.map) return;
      this.map.invalidateSize({ animate: false });
      const canvas = document.getElementById(this.canvasId);
      if (canvas && (canvas.clientWidth === 0 || canvas.clientHeight === 0)) return;
      if (target && target.isValid && target.isValid()) {
        this.map.fitBounds(target, { animate: false });
      } else if (this.initialCenter) {
        this.map.setView(this.initialCenter, this.initialZoomLevel, { animate: false });
      }
    },

    _syncToggleVisual: function () {
      if (this.us_map_btn) {
        this.us_map_btn.classList.toggle('is-active', !!(this.us_map && this.us_map.checked));
      }
      if (this.global_map_btn) {
        this.global_map_btn.classList.toggle('is-active', !!(this.global_map && this.global_map.checked));
      }
    },

    resetMapToDefault: function () {
      if (!this.map) return;
      this._fitTo(this.focusOnUS ? this.usaBounds : this.initialBounds);
      this.map.closePopup();
      this._setRadio(this.focusOnUS ? 'us_map' : 'global_map');
      this._applyLevelFilter();
    },

    // Add one marker to the live layer (cluster group or bare map).
    _showMarker: function (marker) {
      if (this.clusterGroup) {
        this.clusterGroup.addLayer(marker);
      } else if (this.map) {
        marker.addTo(this.map);
      }
    },

    // Show only the active level's markers: Global => country, US => state.
    _applyLevelFilter: function () {
      this._currentLevel = (this.us_map && this.us_map.checked) ? 'state' : 'country';
      const active = this._currentLevel === 'country' ? this._countryMarkers : this._stateMarkers;
      if (!active) return;
      if (this.clusterGroup) {
        this.clusterGroup.clearLayers();
        if (typeof this.clusterGroup.addLayers === 'function') {
          this.clusterGroup.addLayers(active);
        } else {
          active.forEach(lang.hitch(this, function (m) {
            this.clusterGroup.addLayer(m);
          }));
        }
      } else if (this.map) {
        this.markers.forEach(lang.hitch(this, function (m) {
          if (this.map.hasLayer(m)) this.map.removeLayer(m);
        }));
        active.forEach(lang.hitch(this, function (m) {
          m.addTo(this.map);
        }));
      }
    },

    addMarkerToMap: function (item) {
      const marker = this.createMarker(item);
      if (!marker) return;
      marker._ogmLevel = item.isCountryLevel ? 'country' : 'state';
      this.markers.push(marker);
      (item.isCountryLevel ? this._countryMarkers : this._stateMarkers).push(marker);

      // Show now only if it matches the active level; otherwise it waits in its
      // bucket for the toggle.
      if (marker._ogmLevel === this._currentLevel) {
        this._showMarker(marker);
      }

      // The US country marker drills into the US state view instead of opening a popup
      const loc = ((item.metadata && item.metadata.location) || '').toLowerCase().trim();
      const isUsCountry = item.isCountryLevel &&
        (loc === 'usa' || loc === 'us' || loc === 'united states'
          || loc === 'united states of america');

      if (isUsCountry) {
        marker.on('click', lang.hitch(this, function () {
          this._selectMapType('us_map');
        }));
      } else if (this.createInfoWindowContent) {
        // Build popup content lazily
        const self = this;
        marker.bindPopup(function () {
          return self.createInfoWindowContent(item);
        }, {
          maxWidth: 380,
          autoClose: true,
          closeOnClick: true
        });
      }
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      this.usaBounds = L.latLngBounds(
        [this.coordinatesUSA.minimumLatitude, this.coordinatesUSA.minimumLongitude],
        [this.coordinatesUSA.maximumLatitude, this.coordinatesUSA.maximumLongitude]
      );
    },

    postCreate: function () {
      // headerInfo goes into the ⓘ popover; footerInfo becomes the map legend.
      if (this.headerInfo && this.infoPopoverContentNode) {
        this.infoPopoverContentNode.innerHTML = this.headerInfo;
      }
    },

    _onShow: function () {
      this.inherited(arguments);
      if (!this.map) return;
      const self = this;
      const needsFit = !this._didInitialShow;
      this._didInitialShow = true;
      setTimeout(function () {
        if (!self.map) return;
        if (needsFit) {
          self._fitTo((self.us_map && self.us_map.checked) ? self.usaBounds : self.initialBounds);
        } else {
          self.map.invalidateSize({ animate: false });
        }
      }, 0);
    },

    _toggleInfoPopover: function () {
      if (!this.infoPopoverNode) return;
      const hidden = this.infoPopoverNode.hasAttribute('hidden');
      if (hidden) {
        this.infoPopoverNode.removeAttribute('hidden');
        if (this.infoToggleNode) this.infoToggleNode.classList.add('is-active');
      } else {
        this.infoPopoverNode.setAttribute('hidden', '');
        if (this.infoToggleNode) this.infoToggleNode.classList.remove('is-active');
      }
    },

    // Render the footerInfo HTML
    _renderLegend: function () {
      if (!this.map || this._legendControl) return;
      const html = this.legendHtml || this.footerInfo;
      if (!html) return;
      const ctl = L.control({ position: 'bottomleft' });
      ctl.onAdd = function () {
        const div = L.DomUtil.create('div', 'leaflet-control ogm-legend');
        div.innerHTML = html;
        // Stop map drag interactions when interacting with the legend
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
      };
      ctl.addTo(this.map);
      this._legendControl = ctl;
    },

    // Compute summary stats from this.data and render the chip row.
    _renderStats: function () {
      if (!this.statsNode || !this.data) return;
      let countries = 0, states = 0, isolates = 0;
      for(const [location, info] of Object.entries(this.data)) {
        // "Region, Country" => state/region, "Country" => country.
        if (location.includes(',')) {
          states += 1;
        } else {
          countries += 1;
        }
        const namesArr = info && (info.genomeNames || info.genomes || []);
        isolates += (namesArr && namesArr.length) || 0;
      }
      const chips = [];
      if (countries) {
        chips.push(this._chipHtml(countries, countries === 1 ? 'country' : 'countries'));
      }
      if (states) {
        chips.push(this._chipHtml(states, states === 1 ? 'state / region' : 'states / regions'));
      }
      if (isolates) {
        chips.push(this._chipHtml(isolates, isolates === 1 ? 'isolate' : 'isolates'));
      }
      this.statsNode.innerHTML = chips.join('');
    },

    _chipHtml: function (num, label) {
      return '<span class="ogm-stat-chip">' +
        '<span class="ogm-stat-chip-num">' + num.toLocaleString() + '</span>' +
        '<span class="ogm-stat-chip-label">' + label + '</span>' +
        '</span>';
    },

    // Toggle badges mirror each view: Global = countries, US = states/regions.
    _renderToggleCounts: function () {
      if (!this.data) return;
      let stateCount = 0, countryCount = 0;
      for(const location of Object.keys(this.data)) {
        if (location.includes(',')) {
          stateCount += 1;
        } else {
          countryCount += 1;
        }
      }
      if (this.us_map_count) {
        this.us_map_count.textContent = stateCount;
        this.us_map_count.hidden = stateCount === 0;
      }
      if (this.global_map_count) {
        this.global_map_count.textContent = countryCount;
        this.global_map_count.hidden = countryCount === 0;
      }
    },

    _setRadio: function (which) {
      const us = this.us_map;
      const gl = this.global_map;
      if (!us || !gl) return;
      const setQuiet = (w, val) => {
        const prev = w.onChange;
        w.onChange = function () {
        };
        if (typeof w.set === 'function') w.set('checked', val);
        else w.checked = val;
        w.onChange = prev;
      };
      setQuiet(us, which === 'us_map');
      setQuiet(gl, which === 'global_map');
      this._syncToggleVisual();
    },

    _ensureMap: function () {
      if (this.map) return;
      const bounds = L.latLngBounds([-25.274398, -120.7401386], [51.165691, 138.252924]);
      this.initialBounds = bounds;
      this.initialCenter = this.focusOnUS ? this.usaBounds.getCenter() : bounds.getCenter();

      const canvas = document.getElementById(this.canvasId);
      if (!canvas) return;
      canvas.style.backgroundColor = '#E7F1FA';

      this.map = L.map(this.canvasId, {
        center: this.initialCenter,
        zoom: 3,
        zoomControl: true,
        scrollWheelZoom: true,
        worldCopyJump: true
      });

      // CartoDB Voyager (default) + Positron (light)
      this.tileLayers = LeafletSupport.createBaseTileLayers();
      this.tileLayers.standard.addTo(this.map);
      L.control.layers(
        { 'Standard': this.tileLayers.standard, 'Light': this.tileLayers.light },
        null,
        { position: 'topright' }
      ).addTo(this.map);
      L.control.scale().addTo(this.map);

      // Start in the page's default view (US or Global).
      if (this.focusOnUS) {
        this.map.fitBounds(this.usaBounds);
        this._setRadio('us_map');
      } else {
        this.map.fitBounds(bounds);
        this._setRadio('global_map');
      }
      this._currentLevel = this.focusOnUS ? 'state' : 'country';
      this.initialZoomLevel = this.map.getZoom();

      // Render the per-page legend as a Leaflet control inside the map.
      this._renderLegend();

      // Upgrade to a marker cluster group if the plugin loads (optional).
      const self = this;
      loadMarkerCluster().then(function () {
        if (typeof L.markerClusterGroup !== 'function' || !self.map || self.clusterGroup) {
          return;
        }
        self.clusterGroup = L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          disableClusteringAtZoom: 4,
          maxClusterRadius: 36,
          iconCreateFunction: function (cluster) {
            const total = cluster.getChildCount();
            const sizeClass = total < 10 ? 'sm' : total < 50 ? 'md' : 'lg';
            return L.divIcon({
              html: '<div>' + total + '</div>',
              className: 'marker-cluster-outbreaks marker-cluster-outbreaks-' + sizeClass,
              iconSize: L.point(40, 40)
            });
          }
        }).addTo(self.map);
        // Migrate markers already on the map into the cluster via the filter.
        for(const m of self.markers) {
          if (self.map.hasLayer(m)) self.map.removeLayer(m);
        }
        self._applyLevelFilter();
      }).catch(function () { /* clustering is optional */
      });
    },

    onSetData: function () {
      if (!this.data) return;

      // Render the map now so it's not blank while geocoding finishes.
      this._ensureMap();

      // Clear any prior render so re-setting data replaces markers, not appends.
      if (this.markers && this.markers.length) {
        if (this.clusterGroup) {
          this.clusterGroup.clearLayers();
        }
        for(const m of this.markers) {
          if (this.map && this.map.hasLayer(m)) {
            this.map.removeLayer(m);
          }
        }
      }
      this.markers = [];
      this._countryMarkers = [];
      this._stateMarkers = [];

      // Update the summary chips + per-toggle counts from the raw data.
      this._renderStats();
      this._renderToggleCounts();

      // First pass: place everything resolvable from the static gazetteer
      // synchronously; defer the rest to Nominatim.
      const deferred = [];
      for(const [location, info] of Object.entries(this.data)) {
        const coords = geocodeSync(location);
        if (coords) {
          this.addMarkerToMap({
            latitude: coords.lat,
            longitude: coords.lng,
            isCountryLevel: !location.includes(','),
            metadata: { ...info, location }
          });
        } else {
          deferred.push([location, info]);
        }
      }

      if (!deferred.length) return;

      // Second pass: throttled Nominatim lookups; markers stream in as resolved.
      const self = this;
      deferred.forEach(function (entry) {
        const location = entry[0];
        const info = entry[1];
        geocode(location).then(function (coords) {
          if (!coords) {
            console.warn('Geocode failed (no result) for:', location);
            return;
          }
          if (!self.map) return;
          self.addMarkerToMap({
            latitude: coords.lat,
            longitude: coords.lng,
            isCountryLevel: !location.includes(','),
            metadata: { ...info, location }
          });
        }).catch(function (err) {
          console.error('Geocode failed for', location, 'with reason:', err);
        });
      });
    }
  });
});
