define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_OnDijitClickMixin', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom', 'dojo/dom-class', 'dijit/_TemplatedMixin', 'dojox/dtl/_Templated', 'dojo/dom-construct', 'dojo/dom-style',  'dojo/mouse',
  'dojo/text!./templates/SurveillanceDataMap.html', './mapsInfoWindows/LocationInfoWindowSingle',
  './mapsInfoWindows/LocationInfoWindowShortList', './mapsInfoWindows/LocationInfoWindowSummary',
  'dojo/json', 'dojo/text!/public/js/p3/resources/surveillancemap/flyaways.json', 'dijit/form/CheckBox', 'dijit/ColorPalette',
  '../util/PathJoin', 'dojo/request', 'dojo/_base/lang',
  'https://maps.googleapis.com/maps/api/js?key=AIzaSyAo6Eq83tcpiWufvVpw_uuqdoRfWbFXfQ8&sensor=false&libraries=drawing'
], function (
  declare, WidgetBase, on, OnDijitClickMixin, _WidgetsInTemplateMixin,
  dom, domClass, Templated, DtlTemplated, domConstruct, domStyle, mouse,
  Template, LocationInfoWindowSingle,
  LocationInfoWindowShortList, LocationInfoWindowSummary,
  JSON, flyawaysData, CheckBox, ColorPalette,
  PathJoin, xhr, lang
) {

  return declare([WidgetBase, Templated, _WidgetsInTemplateMixin], {
    baseClass: 'MapsCanvas',
    disabled: false,
    templateString: Template,
    apiServiceUrl: window.App.dataAPI,
    index: 0,
    state: null,
    map: null,
    infoWindows: [],
    markers: [],
    prevalenceData: [],
    overlays: {},
    canvasId: 'surveillanceMapCanvas',
    /* Page level variables to hold the map state */
    initialCenter: null, // Store the center location for future reset
    initialZoomLevel: -1, // Default to -1 to make sure it has been set later
    defaultMarkerColor: '#FE7569',
    defaultMapOptions: {
      backgroundColor: '#E7F1FA',
      mapTypeId: google.maps.MapTypeId.TERRAIN,
      scaleControl: true
    },
    flywayJSON: [],

    _setStateAttr: function (state) {
      this._set('state', state);

      if (state.mapData) {
        this.set('mapData', state.mapData);
      }
    },

    getTestedCountByLocation: function (items) {
      let count = 0;
      if (items) {
        for (let item of items) {
          if (item.pathogen_test_result &&
              item.pathogen_test_result.length > 0 &&
              item.pathogen_test_result[0].localeCompare('Not Tested', undefined, { sensitivity: 'accent' })) { // Note: localeCompare returns 0 if matches
            count += 1;
          }
        }
      }
      return count;
    },

    getPositiveTestedCountByLocation: function (items) {
      let count = 0;
      if (items) {
        for (let item of items) {
          if (item.pathogen_test_result &&
              item.pathogen_test_result.length > 0 &&
              !item.pathogen_test_result[0].localeCompare('positive', undefined, { sensitivity: 'accent' })) { // Note: localeCompare returns 0 if matches
            count += 1;
          }
        }
      }
      return count;
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

    partitionByYear: function () {
      console.log('Partition by year', this.partitionDateRange.value);
      let hostIds = [];
      for (let location of this.mapData.locations) {
        for (let item of location.items) {
          if (item.host_identifier && item.host_identifier.indexOf(' ') < 0 && item.host_identifier.indexOf('/') < 0) {
            hostIds.push(item.host_identifier);
          }
        }
      }

      xhr.post(PathJoin(this.apiServiceUrl, 'surveillance'), {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
          'X-Requested-With': null,
          Authorization: (window.App.authorizationToken || '')
        },
        handleAs: 'json',
        'Content-Type': 'application/rqlquery+x-www-form-urlencoded',
        data: `in(host_identifier,(${hostIds.join(',')})),sort(+collection_date)&limit(1000)`
      }).then(lang.hitch(this, function (data) {
        // create date -> count object
        const collectionDateMap = data.reduce((p, d) => {
          if (d.collection_date) {
            if (!p.hasOwnProperty(d.collection_date)) {
              p[d.collection_date] = {
                count: 0,
                items: []
              };
            }
            p[d.collection_date].count += 1;
            p[d.collection_date].items.push(d);
          }
          return p;
        }, {});

        const collectionDates = Object.keys(collectionDateMap);
        const totalCount = collectionDates.length;
        let firstDate = new Date(collectionDates[0]);
        firstDate.setMonth(0, 1); // Set date to the first day of related year

        let lastDate = new Date(collectionDates[totalCount - 1]);
        lastDate.setMonth(lastDate.getMonth() + 1, 0); // Set date to the last day of related month

        const monthRange = this.partitionDateRange.value * 12;
        const numberOfMonths = lastDate.getMonth() - firstDate.getMonth() + 1 +
            (12 * (lastDate.getFullYear() - firstDate.getFullYear()));
        const iterations = (numberOfMonths / monthRange) + 1;

        // Split dates into selected partition time range
        let dates = [];
        for (let i = 1; i < iterations; ++i) {
          lastDate = new Date(firstDate);
          lastDate.setMonth(lastDate.getMonth() + (monthRange - 1));
          dates.push({
            startDate: firstDate,
            endDate: new Date(lastDate.setMonth(lastDate.getMonth() + 1, 0)),
            count: 0,
            items: []
          });
          firstDate = new Date(lastDate);
          firstDate.setDate(firstDate.getDate() + 1);
        }

        // Calculate data count for each date range
        for (const [key, value] of Object.entries(collectionDateMap)) {
          const collectionDate = new Date(key);
          for (let date of dates) {
            if ((collectionDate.getTime() <= date.endDate.getTime()) && (collectionDate.getTime() >= date.startDate.getTime())) {
              date.count += value.count;
              date.items = date.items.concat(value.items);
            }
          }
        }

        const dateFormat = [{ month: 'short' }, { day: 'numeric' }, { year: 'numeric' }];

        // Clear existing data
        this.clearPartition();

        let i = 0;
        for (let date of dates) {
          if (date.count > 0) {
            const id = i++;

            const dateText = this.formatDate(date.startDate, dateFormat, '/') + ' - ' + this.formatDate(date.endDate, dateFormat, '/');

            // Create partition item div to have checkbox and label for the time interval inside
            const partitionItemDiv = domConstruct.create('div',
              {
                'class': 'partition-item',
                'id': `partition-item-${id}`,
              });

            domConstruct.create('input',
              {
                'type': 'checkbox',
                'id': `pb-checkbox-${id}`
              }, partitionItemDiv);

            domConstruct.create('label',
              {
                'for': `pb-checkbox-${id}`,
                'style': 'margin-left: 2px;',
                'innerHTML': `${dateText} (${date.count})`
              }, partitionItemDiv);

            dojo.place(partitionItemDiv, dojo.byId('partitionDataDiv'));

            // Toggle modal
            on(dom.byId(`pb-checkbox-${id}`), 'click', function (evt) {
              $(`#partition-modal-${id}`).toggle();

              // Calculate position of the checbox for placing modal
              const $checkboxLabel = $('#pb-checkbox-' + id).next();
              const offset = $checkboxLabel.offset();
              let topPosition = (offset.top - $(window).scrollTop() - $('.dijitTabPaneWrapper').offset().top) + 'px';
              const leftPosition = offset.left + $checkboxLabel.width() + 10 + 'px';

              dojo.query(`#partition-modal-${id}`).style({ 'top': topPosition, 'left': leftPosition });
            });

            // Create partition modal to display species
            let fluPositiveText = '';
            const testedCount = this.getTestedCountByLocation(date.items);
            if (testedCount > 0) {
              const positiveCount = this.getPositiveTestedCountByLocation(date.items);
              const prevalence = (positiveCount / testedCount * 100).toFixed(2);

              fluPositiveText = `${prevalence}% | ${positiveCount} / ${testedCount}`;
            }

            const partitionModalDiv = domConstruct.create('div',
              {
                'class': 'partition-modal',
                'id': `partition-modal-${id}`
              });

            const partitionModalInnerDiv = domConstruct.create('div', null, partitionModalDiv);

            // Create button for closing modal
            const closeModalBtn = domConstruct.create('button',
              {
                'type': 'button',
                'class': 'gm-ui-hover-effect partition-modal-close-btn',
                'onclick': `$('#partition-modal-${id}').hide();$('#pb-checkbox-${id}').prop('checked', false);`,
                'draggable': 'false',
                'aria-label': 'Close',
                'title': 'Close',
              }, partitionModalInnerDiv);
            domConstruct.create('img',
              {
                'src': 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M19%206.41L17.59%205%2012%2010.59%206.41%205%205%206.41%2010.59%2012%205%2017.59%206.41%2019%2012%2013.41%2017.59%2019%2019%2017.59%2013.41%2012z%22/%3E%3Cpath%20d%3D%22M0%200h24v24H0z%22%20fill%3D%22none%22/%3E%3C/svg%3E'
              }, closeModalBtn);

            // Create top table to display Collection Date Range and Flu Positive
            const topTable = domConstruct.create('table', null, partitionModalInnerDiv);
            const dateRangeTR = domConstruct.create('tr', {}, topTable);
            domConstruct.create('td', {
              innerHTML: `Collection Date Range: ${dateText}`
            }, dateRangeTR);
            const fluPositiveTR = domConstruct.create('tr', {}, topTable);
            domConstruct.create('td', {
              innerHTML: `Flu Positive: ${fluPositiveText}`
            }, fluPositiveTR);

            // Create bottom table to display Species info
            const bottomTable = domConstruct.create('table', null, partitionModalInnerDiv);
            const headTR = domConstruct.create('tr', {}, bottomTable);
            domConstruct.create('th', {
              innerHTML: 'Species'
            }, headTR);
            domConstruct.create('th', {
              innerHTML: 'Species Count'
            }, headTR);

            const speciesMap = this.generateSpeciesCount(date.items);
            for (const [species, count] of Object.entries(speciesMap)) {
              const speciesTR = domConstruct.create('tr', {}, bottomTable);
              domConstruct.create('td', {
                innerHTML: species
              }, speciesTR);
              domConstruct.create('td', {
                innerHTML: count
              }, speciesTR);
            }

            dojo.place(partitionModalDiv, dojo.byId('partition-section'));

            // Overlap selected modal over others
            on(dom.byId(`partition-modal-${id}`), 'click', function (evt) {
              dojo.query('.partition-modal').style('z-index', '1');
              dojo.query(`#partition-modal-${id}`).style('z-index', '2');
            });
          }
        }
      })).catch(err => console.log('error', err));
    },

    generateSpeciesCount: function (items) {
      let speciesMap = {};
      for (let item of items) {
        const species = item.host_species;
        if (speciesMap[species]) {
          speciesMap[species] += 1;
        } else {
          speciesMap[species] = 1;
        }
      }
      return speciesMap;
    },

    // Clear existing partition info
    clearPartition: function () {
      dojo.empty('partitionDataDiv');
      dojo.query('.partition-modal').forEach(dojo.destroy);
    },

    formatDate: function (t, a, s) {
      function format(m) {
        let f = new Intl.DateTimeFormat('en', m);
        return f.format(t);
      }
      return a.map(format).join(s);
    },

    updateColorPalette: function (colorPaletteId, colorDisplayId, selectedColor) {
      document.getElementById(colorDisplayId).style.backgroundColor = selectedColor;
      document.getElementById(colorPaletteId).style.display = 'none';
    },

    handleFlywayHighlightChange: function (parent, region, colorDisplayId, isChecked) {
      if (isChecked) {
        const colorDisplay = document.getElementById(colorDisplayId);
        const colorDisplayStyle = window.getComputedStyle(colorDisplay);
        const color = colorDisplayStyle.getPropertyValue('background-color');
        // Get points for given region
        const points = parent.flywayJSON.find(f => {
          return f.name === region;
        }).points;

        // Convert locations into LatLng object
        const mapPoints = points.map(p => new google.maps.LatLng(p.latitude, p.longitude));

        const overlay = new google.maps.Polygon({
          paths: mapPoints,
          strokeColor: color,
          strokeOpacity: 0.5,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.5
        });

        // Add to the map
        overlay.setMap(parent.map);
        parent.overlays[region] = overlay;
      } else {
        parent.overlays[region].setMap(null);
        delete parent.overlays[region];
      }
    },

    // Changes the icon color based on percentage number for positive tests
    showHidePercent: function () {
      const isChecked = this.percentageCheckBox.checked;
      if (isChecked) {
        // Show percentage/color gradient
        // domStyle.set("fluPercents", 'display', "block");

        for (let { marker, prevalence } of this.markers) {
          let icon = marker.getIcon();
          const percentage = prevalence === null ? 0 : parseFloat(prevalence);
          icon.fillColor = percentage > 50 ? '#FF0000' :
            percentage > 25 ? '#E86500' :
              percentage > 15 ? '#DC950D' :
                percentage > 7 ? '#FFFF00' :
                  percentage > 0 ? '#869832' :
                    '#00FF00';
          marker.setIcon(icon);
          google.maps.event.addListener(marker, 'mouseout', function () {
            marker.setIcon(icon);
          });
        }
      } else {
        // Hide percentage/color gradient
        // domStyle.set("fluPercents", 'display', "none");

        // Reset marker colors back to default
        for (let { marker } of this.markers) {
          let icon = marker.getIcon();
          icon.fillColor = this.defaultMarkerColor;
          marker.setIcon(icon);
          google.maps.event.addListener(marker, 'mouseout', function () {
            marker.setIcon(icon);
          });
        }
      }
    },

    // Create a marker icon with a size fit to the count and selected color
    createMarkerIcon: function (count, color = this.defaultMarkerColor) {
      const scale = count < 10 ? 1 : count < 100 ? 1.5 : count < 1000 ? 2 : 2.5;

      return {
        path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#000',
        strokeWeight: 1,
        scale: scale,
        labelOrigin: new google.maps.Point(0, -28)
      };
    },

    createInfoWindowContent: function (items) {
      let content;
      let prevalence = null;

      let contentValues = { map: this.map, index: this.index++ };

      // Calculate prevalence if there is any tested data
      const testedCount = this.getTestedCountByLocation(items);
      if (testedCount > 0) {
        const positiveCount = this.getPositiveTestedCountByLocation(items);
        prevalence = (positiveCount / testedCount * 100).toFixed(2);

        contentValues = Object.assign({}, contentValues, {
          positiveCount,
          testedCount,
          prevalence
        });
      }

      if (items.length === 1) {
        // Send the surveillance object to single info template
        content = new LocationInfoWindowSingle(Object.assign({}, contentValues, { item: items[0] }));
      } else {
        contentValues = Object.assign({}, contentValues, {
          collectionState: items[0].collection_state_province,
          collectionCountry: items[0].collection_country,
          locationLat: items[0].collection_latitude,
          locationLng: items[0].collection_longitude
        });

        if (items.length <= 20) {
          content = new LocationInfoWindowShortList(Object.assign({}, contentValues, { items: items }));
        } else {
          // Create species map object to display if surveillance data is more than 20
          let speciesMap = this.generateSpeciesCount(items);

          content = new LocationInfoWindowSummary(Object.assign({}, contentValues, speciesMap));
        }
      }

      return { infoContent: content.domNode.innerHTML, prevalence };
    },

    addMarkerToMap: function (location, showCount) {
      const latitude = location.latitude.toFixed(5);
      const longitude = location.longitude.toFixed(5);
      const count = location.items.length;

      const latLng = new google.maps.LatLng(latitude, longitude);
      const icon = this.createMarkerIcon(count);
      const markerLabel = showCount ? count.toString() : '';
      const anchorPoint = count < 10 ? -7 : count < 100 ? -3 : count < 10000 ? -6 : -7;
      const { infoContent, prevalence } = this.createInfoWindowContent(location.items);

      const marker = new google.maps.Marker({
        position: latLng,
        labelAnchor: new google.maps.Point(anchorPoint, 33),
        label: markerLabel,
        icon: icon,
        map: this.map
      });
      this.markers.push({ marker, prevalence });

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

      const mapData = this.mapData;

      if (mapData && mapData.locations) {
        let minLatLong = new google.maps.LatLng(mapData.minimumLatitude, mapData.minimumLongitude);
        let maxLatLong = new google.maps.LatLng(mapData.maximumLatitude, mapData.maximumLongitude);

        const bounds = new google.maps.LatLngBounds(minLatLong, maxLatLong);
        this.initialCenter = bounds.getCenter();

        let options = this.defaultMapOptions;
        options.center = this.initialCenter;

        this.map = new google.maps.Map(document.getElementById(this.canvasId), options);
        this.map.fitBounds(bounds);

        google.maps.event.addListenerOnce(this.map, 'bounds_changed', lang.hitch(this, function () {
          const initialZoomLevel = this.map.getZoom();
          this.initialZoomLevel = initialZoomLevel;
          this.map.setZoom(initialZoomLevel);
        }));

        this.flywayJSON = JSON.parse(flyawaysData);
        const palettes = ['white', 'lime', 'green', 'blue', 'silver', 'yellow', 'fuchsia', 'navy', 'gray', 'red', 'purple', 'black'];
        let divGroupId;
        for (let i = 0; i < this.flywayJSON.length; ++i) {
          const region = this.flywayJSON[i].name;
          const trimmedCheckboxId = region.replaceAll(' ', '_');
          const checkboxId = trimmedCheckboxId + 'Checkbox';
          const colorDisplayId = 'colorDisplay' + i;
          const colorPaletteId = 'colorPalette' + i;
          const divId = trimmedCheckboxId + 'Div';

          // Display 3 fly away option per row
          if (i % 3 === 0) {
            divGroupId = 'flyawayGroup' + i;
            dojo.create('div', { id: divGroupId, style: 'display: flex;' }, 'flyawayDiv');

            // Align color display to the end for last items
            if (i !== 0) {
              domStyle.set(dom.byId('colorDisplay' + (i - 1)), 'margin-right', '0');
            }
          }

          // Create main div for flyaway options
          dojo.create('div', { id: divId, style: 'flex: 1; display: flex; position: relative;' }, divGroupId);

          const checkbox = new CheckBox({
            name: checkboxId,
            id: checkboxId,
            value: region,
            checked: false,
            style: 'align-self: center;',
            onChange: this.handleFlywayHighlightChange.bind(null, this, region, colorDisplayId)
          });
          const label = domConstruct.create('label', { 'for': checkboxId, 'innerHTML': region, 'style': 'align-self: center;' });

          const colorPalette = new ColorPalette({
            id: colorPaletteId,
            onChange: this.updateColorPalette.bind(null, colorPaletteId, colorDisplayId),
            palette: '3x4',
            style: 'display: none; position: absolute; z-index: 1; top: 0; right: 0;'
          });

          const colorDisplay = domConstruct.create('div', {
            id: colorDisplayId,
            style: 'background-color: ' + palettes[i + 1] + '; width: 14px; height: 14px; display: inline-block; float: right; margin-right: 10px; align-self: center; margin-left: auto;',
          });

          checkbox.placeAt(divId);
          dojo.place(label, dojo.byId(divId));
          dojo.place(colorDisplay, dojo.byId(divId));
          colorPalette.placeAt(divId);

          on(dom.byId(colorDisplayId), mouse.enter, function (evt) {
            domStyle.set(dom.byId(colorPaletteId), 'display', 'inline');
          });
          on(dom.byId(colorPaletteId), mouse.leave, function (evt) {
            domStyle.set(dom.byId(colorPaletteId), 'display', 'none');
          });

          // Align color display to the end for last item
          if (i === (this.flywayJSON.length - 1)) {
            domStyle.set(dom.byId(colorDisplayId), 'margin-right', '0');
          }
        }

        // Add marker and info windows for each location
        for (let location of mapData.locations) {
          this.addMarkerToMap(location, mapData.showCount);
        }
      }
    }
  });
});
