/**
 * Shared Leaflet bootstrap for the map widgets (MapsCanvas / OutbreaksGeoMap).
 *
 * Centralizes what both maps need: the window.L bridge, one-time CSS injection,
 * the ref-counted AMD shield for loading UMD plugins via <script>, the
 * Leaflet.markercluster loader, and the CartoDB base tile layers. Keeping the
 * pinned Leaflet/markercluster versions and the AMD shield in one place avoids
 * version drift and double-maintenance across the two widgets.
 */
define([
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
], function (LeafletExports) {

  var LEAFLET_VERSION = '1.9.4';
  var MARKERCLUSTER_VERSION = '1.5.3';
  var LEAFLET_CSS = 'https://unpkg.com/leaflet@' + LEAFLET_VERSION + '/dist/leaflet.css';
  var MC_JS = 'https://unpkg.com/leaflet.markercluster@' + MARKERCLUSTER_VERSION + '/dist/leaflet.markercluster.js';
  var MC_CSS = 'https://unpkg.com/leaflet.markercluster@' + MARKERCLUSTER_VERSION + '/dist/MarkerCluster.css';
  var MC_DEFAULT_CSS = 'https://unpkg.com/leaflet.markercluster@' + MARKERCLUSTER_VERSION + '/dist/MarkerCluster.Default.css';

  // CartoDB raster tiles built from OpenStreetMap data. Labels render in
  // Latin/English where OSM has `name:en`, avoiding local-script labels.
  var CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Leaflet's UMD does not assign window.L when loaded via AMD, but plugins
  // (e.g. Leaflet.markercluster) extend the global L. Bridge it here so any
  // widget depending on this module can use the global L.
  if (typeof window !== 'undefined' && !window.L && LeafletExports && LeafletExports.map) {
    window.L = LeafletExports;
  }

  function ensureCss(href) {
    if (!document.querySelector('link[data-mapscanvas="' + href + '"]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.setAttribute('data-mapscanvas', href);
      document.head.appendChild(link);
    }
  }
  ensureCss(LEAFLET_CSS);
  ensureCss(MC_CSS);
  ensureCss(MC_DEFAULT_CSS);

  // Hide AMD from UMD libraries while they load via plain <script> tags.
  // Without this, their anonymous define() calls land in Dojo's pending queue
  // and get mis-attributed to the next module Dojo loads on navigation,
  // causing a multipleDefine error. Ref-counted so concurrent loads don't
  // restore AMD prematurely while another script is still executing.
  var _amdHideCount = 0;
  var _savedAmd;

  function hideAmd() {
    if (_amdHideCount === 0 && typeof window.define === 'function' && window.define.amd) {
      _savedAmd = window.define.amd;
      window.define.amd = undefined;
    }
    _amdHideCount++;
  }

  function unhideAmd() {
    if (_amdHideCount > 0) {
      _amdHideCount--;
    }
    if (_amdHideCount === 0 && _savedAmd !== undefined && typeof window.define === 'function') {
      window.define.amd = _savedAmd;
      _savedAmd = undefined;
    }
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-mapscanvas="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === '1') return resolve();
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', reject);
        return;
      }
      hideAmd();
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.setAttribute('data-mapscanvas', src);
      s.addEventListener('load', function () { unhideAmd(); s.dataset.loaded = '1'; resolve(); });
      s.addEventListener('error', function (e) { unhideAmd(); reject(e); });
      document.head.appendChild(s);
    });
  }

  // Lazy-load Leaflet.markercluster (extends global L). Memoized so repeated
  // calls share one load; callers should not gate map render on it.
  var _clusterLoadPromise;
  function loadMarkerCluster() {
    if (!_clusterLoadPromise) {
      _clusterLoadPromise = loadScript(MC_JS);
    }
    return _clusterLoadPromise;
  }

  // Build the { standard, light } CartoDB base layers used by both maps.
  function createBaseTileLayers() {
    return {
      standard: window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, subdomains: 'abcd', attribution: CARTO_ATTRIBUTION
      }),
      light: window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19, subdomains: 'abcd', attribution: CARTO_ATTRIBUTION
      })
    };
  }

  return {
    L: LeafletExports,
    loadMarkerCluster: loadMarkerCluster,
    createBaseTileLayers: createBaseTileLayers,
    CARTO_ATTRIBUTION: CARTO_ATTRIBUTION
  };
});
