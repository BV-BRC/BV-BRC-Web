define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dojo/on', 'dijit/_WidgetsInTemplateMixin',
  'dojo/dom', 'dijit/_TemplatedMixin', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/mouse',
  'dojo/text!./templates/SurveillanceDataMap.html', './mapsInfoWindows/LocationInfoWindowSingle',
  './mapsInfoWindows/LocationInfoWindowShortList', './mapsInfoWindows/LocationInfoWindowSummary',
  'dojo/json', 'dojo/text!/public/js/p3/resources/surveillancemap/flyaways.json', 'dijit/form/CheckBox', 'dijit/ColorPalette',
  '../util/PathJoin', 'dojo/request', 'dojo/_base/lang',
  '../util/LeafletSupport'
], function (
  declare, WidgetBase, on, _WidgetsInTemplateMixin,
  dom, Templated, domConstruct, domStyle, mouse,
  Template, LocationInfoWindowSingle,
  LocationInfoWindowShortList, LocationInfoWindowSummary,
  JSON, flyawaysData, CheckBox, ColorPalette,
  PathJoin, xhr, lang,
  LeafletSupport
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
    overlays: {},
    canvasId: 'surveillanceMapCanvas',
    /* Page level variables to hold the map state */
    initialCenter: null, // Store the center location for future reset
    initialZoomLevel: -1, // Default to -1 to make sure it has been set later
    defaultMarkerColor: '#FE7569',
    defaultMapOptions: {
      backgroundColor: '#E7F1FA',
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

    _toggleInfoPopover: function () {
      if (!this.infoPopoverNode) return;
      const isHidden = this.infoPopoverNode.hasAttribute('hidden');
      if (isHidden) {
        this.infoPopoverNode.removeAttribute('hidden');
        if (this.infoToggleNode) this.infoToggleNode.classList.add('is-active');
      } else {
        this.infoPopoverNode.setAttribute('hidden', '');
        if (this.infoToggleNode) this.infoToggleNode.classList.remove('is-active');
      }
    },

    _toggleSidebar: function () {
      if (!this.sidebarNode) return;
      const collapsed = this.sidebarNode.classList.toggle('sdm-collapsed');

      if (this.expandStripNode) {
        this.expandStripNode.classList.toggle('is-visible', collapsed);
      }
      if (this.sidebarToggleNode) {
        const title = collapsed ? 'Show panel' : 'Hide panel';
        this.sidebarToggleNode.title = title;
        this.sidebarToggleNode.setAttribute('aria-label', title);
      }

      // Let the CSS transition run, then tell Leaflet to recompute its size.
      if (this.map) {
        const map = this.map;
        setTimeout(function () {
          map.invalidateSize();
        }, 220);
      }
    },

    resetMapToDefault: function () {
      if (!this.map) return;
      if (this.initialBounds && this.initialBounds.isValid && this.initialBounds.isValid()) {
        this.map.fitBounds(this.initialBounds);
      } else {
        this.map.setView(this.initialCenter, this.initialZoomLevel);
      }
      if (this.tileLayers && this.tileLayers.standard) {
        for (let key of Object.keys(this.tileLayers)) {
          if (this.map.hasLayer(this.tileLayers[key])) {
            this.map.removeLayer(this.tileLayers[key]);
          }
        }
        this.tileLayers.standard.addTo(this.map);
      }

      this.map.closePopup();
      if (this.clusterGroup && typeof this.clusterGroup.unspiderfy === 'function') {
        this.clusterGroup.unspiderfy();
      }
      if (this._activeEntry) {
        this._setMarkerSelected(this._activeEntry, false);
        this._activeEntry = null;
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

        // Count how many partitions actually have data, for the status banner
        const partitionsWithData = dates.filter(d => d.count > 0).length;
        const totalRecords = dates.reduce((sum, d) => sum + d.count, 0);

        // Render a summary banner above the list so users see immediate feedback
        const dataDiv = dojo.byId('partitionDataDiv');
        if (dataDiv) {
          const banner = domConstruct.create('div', {
            'class': 'sdm-partition-banner',
            'innerHTML':
              '<div class="sdm-partition-banner-title">' + partitionsWithData +
              ' time interval' + (partitionsWithData === 1 ? '' : 's') +
              ' with data</div>' +
              '<div class="sdm-partition-banner-helper">' + totalRecords +
              ' record' + (totalRecords === 1 ? '' : 's') +
              ' across the selected hosts &middot; click an interval to inspect</div>'
          });
          dojo.place(banner, dataDiv);
        }

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

            // Toggle modal — position relative to the viewport so it can escape
            // the sidebar's overflow-clipped scroll container.
            on(dom.byId(`pb-checkbox-${id}`), 'click', function (evt) {
              const modal = document.getElementById(`partition-modal-${id}`);
              if (!modal) return;
              const checkboxEl = document.getElementById(`pb-checkbox-${id}`);
              const labelEl = checkboxEl ? checkboxEl.nextElementSibling : null;
              const anchorRect = (labelEl || checkboxEl).getBoundingClientRect();

              const isHidden = modal.style.display === 'none' || !modal.style.display;
              if (isHidden) {
                modal.style.display = 'block';
                // Place modal to the right of the checkbox label; if it would
                // go off-screen, fall back to placing it to the left.
                const modalWidth = 360;
                let left = anchorRect.right + 10;
                if (left + modalWidth > window.innerWidth - 8) {
                  left = Math.max(8, anchorRect.left - modalWidth - 10);
                }
                let top = anchorRect.top;
                const modalHeight = modal.offsetHeight || 220;
                if (top + modalHeight > window.innerHeight - 8) {
                  top = Math.max(8, window.innerHeight - modalHeight - 8);
                }
                modal.style.top = top + 'px';
                modal.style.left = left + 'px';
              } else {
                modal.style.display = 'none';
              }
            });

            // Compute test stats — color the chip with the same legend buckets
            const testedCount = this.getTestedCountByLocation(date.items);
            let chipHtml = '';
            if (testedCount > 0) {
              const positiveCount = this.getPositiveTestedCountByLocation(date.items);
              const prevalence = (positiveCount / testedCount * 100).toFixed(1);
              const chipClass = this._prevalenceBucketClass(prevalence);
              chipHtml = `<span class="sdm-pop-chip ${chipClass}">${prevalence}% positive · ${positiveCount}/${testedCount}</span>`;
            } else {
              chipHtml = '<span class="sdm-pop-chip is-na">No test data</span>';
            }

            const partitionModalDiv = domConstruct.create('div',
              {
                'class': 'partition-modal',
                'id': `partition-modal-${id}`
              });

            const partitionModalInnerDiv = domConstruct.create('div', null, partitionModalDiv);

            // Create button for closing modal
            domConstruct.create('button',
              {
                'type': 'button',
                'class': 'partition-modal-close-btn',
                'onclick': `document.getElementById('partition-modal-${id}').style.display='none';document.getElementById('pb-checkbox-${id}').checked=false;`,
                'draggable': 'false',
                'aria-label': 'Close',
                'title': 'Close',
                'innerHTML': '&times;'
              }, partitionModalInnerDiv);

            // Hero header
            domConstruct.create('div',
              {
                'class': 'partition-modal-header',
                'innerHTML':
                  '<div class="partition-modal-eyebrow">Time interval</div>' +
                  '<div class="partition-modal-range">' + dateText + '</div>' +
                  '<div class="partition-modal-stats">' +
                  '<span class="sdm-pop-chip">' + date.count + ' record' + (date.count === 1 ? '' : 's') + '</span>' +
                  chipHtml +
                  '</div>'
              }, partitionModalInnerDiv);

            // Species table
            const speciesMap = this.generateSpeciesCount(date.items);
            const speciesEntries = Object.entries(speciesMap).sort((a, b) => b[1] - a[1]);

            const tableWrap = domConstruct.create('div', { 'class': 'partition-modal-table-wrap' }, partitionModalInnerDiv);
            domConstruct.create('div',
              {
                'class': 'sdm-pop-section-title',
                'innerHTML': 'Species breakdown'
              }, tableWrap);
            const bottomTable = domConstruct.create('table', { 'class': 'sdm-pop-table' }, tableWrap);
            const thead = domConstruct.create('thead', {}, bottomTable);
            const headTR = domConstruct.create('tr', {}, thead);
            domConstruct.create('th', { innerHTML: 'Species' }, headTR);
            domConstruct.create('th', { 'class': 'sdm-pop-num', innerHTML: 'Count' }, headTR);

            const tbody = domConstruct.create('tbody', {}, bottomTable);
            for (const [species, count] of speciesEntries) {
              const speciesTR = domConstruct.create('tr', {}, tbody);
              domConstruct.create('td', { innerHTML: species || '<em style="color:#9ca3af;">Unknown</em>' }, speciesTR);
              domConstruct.create('td', { 'class': 'sdm-pop-num', innerHTML: count }, speciesTR);
            }

            // Attach modal to body so it can render above the sidebar
            // overflow:auto container without being clipped.
            document.body.appendChild(partitionModalDiv);

            // Overlap selected modal over others
            on(dom.byId(`partition-modal-${id}`), 'click', function (evt) {
              dojo.query('.partition-modal').style('z-index', '1');
              dojo.query(`#partition-modal-${id}`).style('z-index', '2');
            });
          }
        }

        // Scroll the partition results into view inside the sidebar so users
        // see them immediately instead of having to scroll the sidebar.
        const banner = dojo.byId('partitionDataDiv')
          ? dojo.byId('partitionDataDiv').querySelector('.sdm-partition-banner')
          : null;
        if (banner && typeof banner.scrollIntoView === 'function') {
          setTimeout(function () {
            banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
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

        // Convert locations into [lat, lng] tuples for Leaflet
        const mapPoints = points.map(p => [p.latitude, p.longitude]);

        const overlay = L.polygon(mapPoints, {
          color: color,
          opacity: 0.5,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.5
        });

        // Add to the map
        overlay.addTo(parent.map);
        parent.overlays[region] = overlay;
      } else {
        parent.overlays[region].remove();
        delete parent.overlays[region];
      }
    },

    // Refresh marker icons after color/percentage changes
    _refreshMarkerIcons: function (usePercentage) {
      for (let entry of this.markers) {
        let color;
        if (usePercentage) {
          const percentage = entry.prevalence === null ? 0 : parseFloat(entry.prevalence);
          color = percentage > 50 ? '#FF0000' :
            percentage > 25 ? '#E86500' :
              percentage > 15 ? '#DC950D' :
                percentage > 7 ? '#FFFF00' :
                  percentage > 0 ? '#869832' :
                    '#00FF00';
        } else {
          color = this.defaultMarkerColor;
        }
        entry.color = color;
        entry.marker.setIcon(this.createMarkerIcon(entry.count, color, entry.label));
      }
    },

    // Changes the icon color based on percentage number for positive tests
    showHidePercent: function () {
      const isChecked = this.percentageCheckBox.checked;
      this._refreshMarkerIcons(isChecked);
    },

    // Create a Leaflet divIcon with an SVG teardrop shape sized to the count and selected color
    createMarkerIcon: function (count, color, label) {
      color = color || this.defaultMarkerColor;
      const scale = count < 10 ? 1 : count < 100 ? 1.4 : count < 1000 ? 1.8 : 2.2;
      const labelText = (label === undefined || label === null) ? '' : String(label);

      // Path bounds: x in [-10, 10], y in [-40, 0]. Anchor (tip) is at (0, 0) — bottom-center.
      // ViewBox uses 1px padding for the stroke.
      const baseW = 22;
      const baseH = 42;
      const w = baseW * scale;
      const h = baseH * scale;

      // Bulb circle (radius 10) is centered at SVG (0, -30). In screen coords, that's at
      // y = (-30 - (-41)) / 42 * h = 11/42 * h, with diameter 20/42 * h.
      const bulbTopPct = ((-30 - 10) - (-41)) / baseH * 100; // 0
      const bulbHeightPct = 20 / baseH * 100;                 // ~47.6%
      const fontSize = Math.max(10, Math.round(11 * Math.min(scale, 1.6)));

      const labelHtml = labelText
        ? `<div style="position:absolute;left:0;top:${bulbTopPct}%;width:100%;height:${bulbHeightPct}%;` +
        `display:flex;align-items:center;justify-content:center;` +
        `color:#fff;font-size:${fontSize}px;font-weight:700;` +
        `text-shadow:0 0 2px rgba(0,0,0,0.55);pointer-events:none;line-height:1;">${labelText}</div>`
        : '';

      const html =
        `<div style="position:relative;width:${w}px;height:${h}px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.35));">` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-11 -41 22 42" style="display:block;overflow:visible;">` +
        `<path d="M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z" ` +
        `fill="${color}" fill-opacity="0.95" stroke="#222" stroke-width="1.2" stroke-linejoin="round"/>` +
        `</svg>` +
        labelHtml +
        `</div>`;

      return L.divIcon({
        className: 'mapscanvas-marker',
        html: html,
        iconSize: [w, h],
        iconAnchor: [w / 2, h],
        popupAnchor: [0, -h * 0.85]
      });
    },

    // Map a prevalence percent (0–100) to a class matching the sidebar
    // Flu-Positive Samples legend buckets, so popup chips share the same
    // color language as the legend.
    _prevalenceBucketClass: function (prevalence) {
      if (prevalence === null || prevalence === undefined || isNaN(prevalence)) return 'is-na';
      const p = parseFloat(prevalence);
      if (p > 50) return 'is-prev-veryhigh';
      if (p > 25) return 'is-prev-high';
      if (p > 15) return 'is-prev-medhigh';
      if (p > 7) return 'is-prev-med';
      if (p > 0) return 'is-prev-low';
      return 'is-prev-zero';
    },

    // Pick a chip class for a single-record test result. "Positive" maps to
    // the high-prevalence color and "Negative" to the zero-prevalence color
    // so the chip language matches the legend even for binary results.
    _testResultClass: function (testResult) {
      if (!testResult) return 'is-na';
      const t = ('' + testResult).toLowerCase().trim();
      if (t === 'positive') return 'is-prev-veryhigh';
      if (t === 'negative') return 'is-prev-zero';
      return 'is-na';
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
          prevalence,
          prevalenceClass: this._prevalenceBucketClass(prevalence)
        });
      }

      if (items.length === 1) {
        // Send the surveillance object to single info template
        content = new LocationInfoWindowSingle(Object.assign({}, contentValues, {
          item: items[0],
          testResultClass: this._testResultClass(items[0].pathogen_test_result)
        }));
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

    _setMarkerSelected: function (entry, isSelected) {
      const el = entry.marker.getElement();
      if (!el) return;
      if (isSelected) {
        el.classList.add('is-selected');
      } else {
        el.classList.remove('is-selected');
      }
    },

    addMarkerToMap: function (location, showCount) {
      const latitude = parseFloat(location.latitude.toFixed(5));
      const longitude = parseFloat(location.longitude.toFixed(5));
      const count = location.items.length;
      const markerLabel = showCount ? count.toString() : '';
      const { infoContent, prevalence } = this.createInfoWindowContent(location.items);

      const icon = this.createMarkerIcon(count, this.defaultMarkerColor, markerLabel);
      const marker = L.marker([latitude, longitude], { icon: icon, mapscanvasCount: count });
      marker.bindPopup(infoContent, { autoClose: true, closeOnClick: true, maxWidth: 380 });

      const entry = {
        marker: marker,
        prevalence: prevalence,
        count: count,
        label: markerLabel,
        color: this.defaultMarkerColor
      };

      marker.on('popupopen', lang.hitch(this, function () {
        if (this._activeEntry && this._activeEntry !== entry) {
          this._setMarkerSelected(this._activeEntry, false);
        }
        this._activeEntry = entry;
        this._setMarkerSelected(entry, true);
      }));
      marker.on('popupclose', lang.hitch(this, function () {
        this._setMarkerSelected(entry, false);
        if (this._activeEntry === entry) this._activeEntry = null;
      }));

      if (this.clusterGroup) {
        this.clusterGroup.addLayer(marker);
      } else {
        marker.addTo(this.map);
      }

      this.markers.push(entry);
      this.infoWindows.push(marker);
    },

    startup: function () {
      if (this._started) {
        return;
      }
      this.inherited(arguments);

      const mapData = this.mapData;

      if (mapData && mapData.locations) {
        this._renderMap(mapData);
      }
    },

    _addAllMarkers: function (mapData) {
      for (let location of mapData.locations) {
        this.addMarkerToMap(location, mapData.showCount);
      }
    },

    _renderMap: function (mapData) {
      if (mapData && mapData.locations) {
        const bounds = L.latLngBounds(
          [mapData.minimumLatitude, mapData.minimumLongitude],
          [mapData.maximumLatitude, mapData.maximumLongitude]
        );
        this.initialBounds = bounds;
        this.initialCenter = bounds.getCenter();

        const canvas = document.getElementById(this.canvasId);
        canvas.style.backgroundColor = this.defaultMapOptions.backgroundColor;

        this.map = L.map(this.canvasId, {
          center: this.initialCenter,
          zoom: 2,
          scrollWheelZoom: true,
          worldCopyJump: true
        });

        // CartoDB Voyager (default) + Positron (light) base layers.
        this.tileLayers = LeafletSupport.createBaseTileLayers();
        this.tileLayers.standard.addTo(this.map);
        L.control.layers({
          'Standard': this.tileLayers.standard,
          'Light': this.tileLayers.light
        }, null, { position: 'topright' }).addTo(this.map);
        L.control.scale().addTo(this.map);

        // Fit map to data bounds, then capture the resulting zoom as the reset target
        if (bounds.isValid() && mapData.minimumLatitude !== mapData.maximumLatitude) {
          this.map.fitBounds(bounds);
        } else {
          this.map.setView(this.initialCenter, 4);
        }
        this.initialZoomLevel = this.map.getZoom();

        this.flywayJSON = JSON.parse(flyawaysData);
        const palettes = ['lime', 'green', 'blue', 'silver', 'yellow', 'fuchsia', 'navy', 'gray', 'red', 'purple', 'black'];
        for (let i = 0; i < this.flywayJSON.length; ++i) {
          const region = this.flywayJSON[i].name;
          const trimmedCheckboxId = region.replaceAll(' ', '_');
          const checkboxId = trimmedCheckboxId + 'Checkbox';
          const colorDisplayId = 'colorDisplay' + i;
          const colorPaletteId = 'colorPalette' + i;
          const divId = trimmedCheckboxId + 'Div';

          // One full-width row per flyway region
          dojo.create('div', { id: divId, 'class': 'sdm-flyway-row' }, 'flyawayDiv');

          const checkbox = new CheckBox({
            name: checkboxId,
            id: checkboxId,
            value: region,
            checked: false,
            onChange: this.handleFlywayHighlightChange.bind(null, this, region, colorDisplayId)
          });
          const label = domConstruct.create('label', { 'for': checkboxId, 'innerHTML': region });

          const colorPalette = new ColorPalette({
            id: colorPaletteId,
            onChange: this.updateColorPalette.bind(null, colorPaletteId, colorDisplayId),
            palette: '3x4',
            style: 'display: none; position: absolute; z-index: 10; top: 28px; right: 8px;'
          });

          const colorDisplay = domConstruct.create('div', {
            id: colorDisplayId,
            'class': 'sdm-flyway-swatch',
            style: 'background-color: ' + palettes[i % palettes.length] + ';',
            title: 'Click to change color'
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
        }

        // Try to upgrade to a marker cluster group; if the plugin loads we
        // add the cluster layer and route subsequent addMarkerToMap calls
        // through it. If it fails we silently fall back to plain markers.
        const self = this;
        LeafletSupport.loadMarkerCluster()
          .then(function () {
            if (typeof L.markerClusterGroup === 'function' && self.map && !self.clusterGroup) {
              self.clusterGroup = L.markerClusterGroup({
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                disableClusteringAtZoom: 8,
                maxClusterRadius: 50,
                iconCreateFunction: function (cluster) {
                  const total = cluster.getAllChildMarkers()
                    .reduce(function (sum, m) {
                      return sum + ((m.options && m.options.mapscanvasCount) || 1);
                    }, 0);
                  const sizeClass = total < 10 ? 'sm' : total < 100 ? 'md' : 'lg';
                  return L.divIcon({
                    html: '<div><span>' + total + '</span></div>',
                    className: 'marker-cluster-mapscanvas marker-cluster-mapscanvas-' + sizeClass,
                    iconSize: L.point(40, 40)
                  });
                }
              }).addTo(self.map);
              // Move any markers already on the map into the cluster group
              for (const entry of self.markers) {
                if (self.map.hasLayer(entry.marker)) {
                  self.map.removeLayer(entry.marker);
                }
                self.clusterGroup.addLayer(entry.marker);
              }
            }
          })
          .catch(function () { /* clustering optional */
          });

        // Add marker and info windows for each location (these go directly on
        // the map; if the cluster plugin loads later they are migrated above)
        this._addAllMarkers(mapData);
      }
    }
  });
});
