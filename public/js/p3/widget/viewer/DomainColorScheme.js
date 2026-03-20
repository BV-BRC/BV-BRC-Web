define([], function () {
  /**
   * DomainColorScheme - Colorblind-accessible color palette for domain sources
   * and utility functions for color manipulation and external URL generation.
   */

  // Colorblind-accessible palette for domain sources
  var sourceColors = {
    'CDD': '#66c2a5',        // Teal
    'InterPro': '#fc8d62',   // Orange
    'Pfam': '#8da0cb',       // Blue-purple
    'TIGRFAM': '#e78ac3',    // Pink
    'SMART': '#a6d854',      // Yellow-green
    'HAMAP': '#ffd92f',      // Yellow
    'ProSiteProfiles': '#e5c494',  // Tan
    'ProSitePatterns': '#b3b3b3',  // Light gray
    'PRINTS': '#80b1d3',     // Sky blue
    'PANTHER': '#fb8072',    // Salmon
    'Gene3D': '#bebada',     // Lavender
    'PIRSF': '#8dd3c7',      // Mint
    'SUPERFAMILY': '#bc80bd', // Purple
    'NCBIfam': '#ccebc5',    // Pale green
    'default': '#999999'     // Gray
  };

  // External database URL patterns
  var externalUrls = {
    'CDD': 'https://www.ncbi.nlm.nih.gov/Structure/cdd/{id}',
    'InterPro': 'https://www.ebi.ac.uk/interpro/entry/InterPro/{id}',
    'Pfam': 'https://www.ebi.ac.uk/interpro/entry/pfam/{id}',
    'SMART': 'http://smart.embl-heidelberg.de/smart/do_annotation.pl?ACC={id}',
    'TIGRFAM': 'https://www.ncbi.nlm.nih.gov/genome/annotation_prok/evidence/{id}',
    'HAMAP': 'https://hamap.expasy.org/rule/{id}',
    'ProSiteProfiles': 'https://prosite.expasy.org/{id}',
    'ProSitePatterns': 'https://prosite.expasy.org/{id}',
    'PRINTS': 'http://www.bioinf.manchester.ac.uk/cgi-bin/dbbrowser/sprint/searchprintss.cgi?prints_accn={id}',
    'PANTHER': 'http://www.pantherdb.org/panther/family.do?clsAccession={id}',
    'Gene3D': 'http://www.cathdb.info/superfamily/{id}',
    'PIRSF': 'https://proteininformationresource.org/cgi-bin/ipcSF?id={id}',
    'SUPERFAMILY': 'https://supfam.org/SUPERFAMILY/cgi-bin/scop.cgi?ipid={id}',
    'NCBIfam': 'https://www.ncbi.nlm.nih.gov/genome/annotation_prok/evidence/{id}'
  };

  return {
    /**
     * Get the color for a given domain source
     * @param {string} source - The domain source name (e.g., 'CDD', 'InterPro')
     * @returns {string} Hex color code
     */
    getSourceColor: function (source) {
      if (!source) {
        return sourceColors['default'];
      }
      // Try exact match first
      if (sourceColors[source]) {
        return sourceColors[source];
      }
      // Try case-insensitive match
      var lowerSource = source.toLowerCase();
      for (var key in sourceColors) {
        if (key.toLowerCase() === lowerSource) {
          return sourceColors[key];
        }
      }
      return sourceColors['default'];
    },

    /**
     * Get a darker shade of a hex color (for hover/selection states)
     * @param {string} hexColor - Hex color code (e.g., '#66c2a5')
     * @param {number} percent - Percentage to darken (0-100)
     * @returns {string} Darker hex color code
     */
    getDarkerShade: function (hexColor, percent) {
      percent = percent || 20;
      var hex = hexColor.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);

      r = Math.max(0, Math.floor(r * (100 - percent) / 100));
      g = Math.max(0, Math.floor(g * (100 - percent) / 100));
      b = Math.max(0, Math.floor(b * (100 - percent) / 100));

      return '#' +
        ('0' + r.toString(16)).slice(-2) +
        ('0' + g.toString(16)).slice(-2) +
        ('0' + b.toString(16)).slice(-2);
    },

    /**
     * Get a lighter shade of a hex color (for backgrounds)
     * @param {string} hexColor - Hex color code (e.g., '#66c2a5')
     * @param {number} percent - Percentage to lighten (0-100)
     * @returns {string} Lighter hex color code
     */
    getLighterShade: function (hexColor, percent) {
      percent = percent || 30;
      var hex = hexColor.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);

      r = Math.min(255, Math.floor(r + (255 - r) * percent / 100));
      g = Math.min(255, Math.floor(g + (255 - g) * percent / 100));
      b = Math.min(255, Math.floor(b + (255 - b) * percent / 100));

      return '#' +
        ('0' + r.toString(16)).slice(-2) +
        ('0' + g.toString(16)).slice(-2) +
        ('0' + b.toString(16)).slice(-2);
    },

    /**
     * Get the external database URL for a domain
     * @param {string} source - The domain source name
     * @param {string} sourceId - The source-specific ID
     * @returns {string|null} External URL or null if not available
     */
    getExternalUrl: function (source, sourceId) {
      if (!source || !sourceId) {
        return null;
      }
      var urlPattern = externalUrls[source];
      if (!urlPattern) {
        // Try case-insensitive match
        var lowerSource = source.toLowerCase();
        for (var key in externalUrls) {
          if (key.toLowerCase() === lowerSource) {
            urlPattern = externalUrls[key];
            break;
          }
        }
      }
      if (urlPattern) {
        return urlPattern.replace('{id}', encodeURIComponent(sourceId));
      }
      return null;
    },

    /**
     * Get all available source colors for legend display
     * @returns {Object} Map of source names to colors (excluding 'default')
     */
    getAllSourceColors: function () {
      var colors = {};
      for (var key in sourceColors) {
        if (key !== 'default') {
          colors[key] = sourceColors[key];
        }
      }
      return colors;
    },

    /**
     * Get unique sources from a list of domains with their colors
     * @param {Array} domains - Array of domain objects with 'source' property
     * @returns {Array} Array of {source, color} objects for domains that have data
     */
    getSourcesFromDomains: function (domains) {
      var seen = {};
      var sources = [];
      var self = this;

      if (!domains || !domains.length) {
        return sources;
      }

      domains.forEach(function (domain) {
        var source = domain.source;
        if (source && !seen[source]) {
          seen[source] = true;
          sources.push({
            source: source,
            color: self.getSourceColor(source)
          });
        }
      });

      // Sort alphabetically by source name
      sources.sort(function (a, b) {
        return a.source.localeCompare(b.source);
      });

      return sources;
    }
  };
});
