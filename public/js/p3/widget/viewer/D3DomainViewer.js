define([
  'dojo/_base/declare', 'dojo/_base/lang',
  'dojo/dom', 'dojo/dom-class', 'dojo/dom-construct', 'dojo/dom-style', 'dojo/topic',
  'd3/d3',
  './DomainColorScheme'
], function (
  declare, lang,
  dom, domClass, domConstruct, domStyle, Topic,
  d3,
  DomainColorScheme
) {

  return declare([], {
    // Configuration
    trackHeight: 24,
    trackPadding: 4,
    backboneHeight: 10,
    headerHeight: 30,
    legendHeight: 25,
    minDomainWidth: 3,
    maxTracks: 8,
    overlapPadding: 5,

    // State
    domains: null,
    proteinLength: 0,
    selectedIds: null,
    hoveredId: null,

    constructor: function (args) {
      lang.mixin(this, args || {});
      this.selectedIds = {};
    },

    /**
     * Initialize the viewer with a target DOM node
     * @param {DOMNode|string} target - Container element or ID
     */
    init: function (target) {
      this.containerNode = typeof target === 'string' ? dom.byId(target) : target;
      this.node = domConstruct.place('<div class="domain-viewer-chart"></div>', this.containerNode, 'only');

      this.nodeWidth = parseInt(domStyle.get(this.node, 'width')) || 800;

      this.canvas = d3.select(this.node)
        .append('svg')
        .attr('class', 'domain-viewer-svg')
        .attr('preserveAspectRatio', 'xMidYMid meet');

      // Create or reuse tooltip
      if (d3.select('div.domain-tooltip')[0][0]) {
        this.tooltipLayer = d3.select('div.domain-tooltip');
      } else {
        this.tooltipLayer = d3.select('body').append('div')
          .attr('class', 'domain-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('pointer-events', 'none');
      }

      // Subscribe to grid events for synchronization
      this._subscribeToGridEvents();
    },

    /**
     * Subscribe to grid selection/hover events
     */
    _subscribeToGridEvents: function () {
      var self = this;

      Topic.subscribe('/domainGrid/select', function (data) {
        if (data && data.ids) {
          self.setSelection(data.ids);
        }
      });

      Topic.subscribe('/domainGrid/hover', function (data) {
        if (data && data.id) {
          self.setHover(data.id);
        } else {
          self.clearHover();
        }
      });
    },

    /**
     * Set the data and render the visualization
     * @param {Array} domains - Array of domain objects
     * @param {number} proteinLength - Length of the protein sequence
     */
    setData: function (domains, proteinLength) {
      this.domains = domains || [];
      this.proteinLength = proteinLength || this._estimateProteinLength(domains);
      this.selectedIds = {};
      this.hoveredId = null;

      if (this.domains.length > 0) {
        this.render();
      } else {
        this._renderEmptyState();
      }
    },

    /**
     * Estimate protein length from domain data when not provided
     */
    _estimateProteinLength: function (domains) {
      if (!domains || domains.length === 0) {
        return 100;
      }
      var maxEnd = 0;
      domains.forEach(function (d) {
        if (d.end && d.end > maxEnd) {
          maxEnd = d.end;
        }
      });
      // Add 5% padding
      return Math.ceil(maxEnd * 1.05);
    },

    /**
     * Render empty state message
     */
    _renderEmptyState: function () {
      this.canvas.selectAll('*').remove();

      var height = 60;
      this.canvas
        .attr('viewBox', '0 0 ' + this.nodeWidth + ' ' + height)
        .attr('width', '100%')
        .attr('height', height);

      this.canvas.append('text')
        .attr('x', this.nodeWidth / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'domain-viewer-empty')
        .text('No domains to display');
    },

    /**
     * Main render function
     */
    render: function () {
      var self = this;
      this.canvas.selectAll('*').remove();

      // Update node width in case of resize
      this.nodeWidth = parseInt(domStyle.get(this.node, 'width')) || 800;

      // Assign domains to tracks to handle overlaps
      var tracks = this._assignTracks(this.domains);
      var numTracks = Math.min(tracks.length, this.maxTracks);

      // Calculate canvas dimensions
      var canvasWidth = this.nodeWidth - 20; // padding
      var canvasHeight = this.headerHeight +
        this.backboneHeight +
        (numTracks * (this.trackHeight + this.trackPadding)) +
        this.legendHeight + 20;

      // Set up viewBox for responsive sizing
      this.canvas
        .attr('viewBox', '-10 0 ' + (this.nodeWidth + 10) + ' ' + canvasHeight)
        .attr('width', '100%')
        .attr('height', canvasHeight);

      // Create scale for mapping protein positions to pixels
      this.xScale = d3.scale.linear()
        .range([0, canvasWidth])
        .domain([0, this.proteinLength]);

      // Render components
      this._renderBackbone(canvasWidth);
      this._renderDomains(tracks, canvasWidth);
      this._renderLegend(canvasWidth, canvasHeight);
    },

    /**
     * Assign domains to tracks using greedy algorithm to avoid overlaps
     */
    _assignTracks: function (domains) {
      var self = this;
      var tracks = [];

      // Sort domains by start position
      var sortedDomains = domains.slice().sort(function (a, b) {
        return (a.start || 0) - (b.start || 0);
      });

      tracks.push({ domains: [], maxEnd: 0 });

      sortedDomains.forEach(function (domain) {
        var start = domain.start || 0;
        var end = domain.end || start;
        var placed = false;

        // Try to find a track where this domain fits
        for (var i = 0; i < tracks.length; i++) {
          var track = tracks[i];
          if (start > track.maxEnd + self.overlapPadding) {
            // Domain fits in this track
            track.domains.push(domain);
            track.maxEnd = end;
            domain._track = i;
            placed = true;
            break;
          }
        }

        // If no track found, create a new one (up to max)
        if (!placed) {
          if (tracks.length < self.maxTracks) {
            var newTrack = { domains: [domain], maxEnd: end };
            domain._track = tracks.length;
            tracks.push(newTrack);
          } else {
            // Place in lowest track anyway (will overlap)
            tracks[self.maxTracks - 1].domains.push(domain);
            domain._track = self.maxTracks - 1;
            tracks[self.maxTracks - 1].maxEnd = Math.max(tracks[self.maxTracks - 1].maxEnd, end);
          }
        }
      });

      return tracks;
    },

    /**
     * Determine if a hex color is dark (for text contrast)
     * Uses relative luminance calculation
     * @param {string} hexColor - Hex color code (e.g., '#1e3cbe')
     * @returns {boolean} True if the color is dark
     */
    _isColorDark: function (hexColor) {
      var hex = hexColor.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16);
      var g = parseInt(hex.substring(2, 4), 16);
      var b = parseInt(hex.substring(4, 6), 16);
      // Calculate relative luminance (ITU-R BT.709)
      var luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
    },

    /**
     * Render the protein backbone (horizontal bar)
     */
    _renderBackbone: function (canvasWidth) {
      var self = this;
      var backboneY = this.headerHeight;

      // Create backbone group
      var backbone = this.canvas.append('g')
        .attr('class', 'domain-viewer-backbone')
        .attr('transform', 'translate(0, ' + backboneY + ')');

      // Draw the backbone line with end caps
      backbone.append('polyline')
        .attr('points', lang.replace('0 -{0} 0 {0} 0 0 {1} 0 {1} {0} {1} -{0}',
          [this.backboneHeight / 2, canvasWidth]))
        .attr('fill', 'none')
        .attr('stroke', '#333')
        .attr('stroke-width', 1.5);

      // Add position labels
      backbone.append('text')
        .attr('x', 0)
        .attr('y', -this.backboneHeight - 2)
        .attr('class', 'domain-viewer-position-label')
        .text('1');

      backbone.append('text')
        .attr('x', canvasWidth)
        .attr('y', -this.backboneHeight - 2)
        .attr('text-anchor', 'end')
        .attr('class', 'domain-viewer-position-label')
        .text(this.proteinLength + ' aa');

      // Add center label (protein accession if available)
      backbone.append('text')
        .attr('x', canvasWidth / 2)
        .attr('y', -this.backboneHeight - 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'domain-viewer-title-label')
        .text('Protein Sequence');
    },

    /**
     * Render domain rectangles
     */
    _renderDomains: function (tracks, canvasWidth) {
      var self = this;
      var domainStartY = this.headerHeight + this.backboneHeight + 5;

      tracks.forEach(function (track, trackIndex) {
        var trackY = domainStartY + trackIndex * (self.trackHeight + self.trackPadding);

        var trackGroup = self.canvas.append('g')
          .attr('class', 'domain-viewer-track')
          .attr('transform', 'translate(0, ' + trackY + ')');

        track.domains.forEach(function (domain) {
          self._renderDomain(trackGroup, domain);
        });
      });
    },

    /**
     * Render a single domain rectangle
     */
    _renderDomain: function (trackGroup, domain) {
      var self = this;
      var start = domain.start || 0;
      var end = domain.end || start;

      var x = this.xScale(start);
      var width = Math.max(this.xScale(end) - x, this.minDomainWidth);
      var color = DomainColorScheme.getSourceColor(domain.source);
      var id = domain.id || (domain.source + '_' + domain.source_id + '_' + start);

      var domainGroup = trackGroup.append('g')
        .attr('class', 'domain-viewer-domain')
        .attr('data-domain-id', id)
        .attr('transform', 'translate(' + x + ', 0)');

      // Main rectangle
      var rect = domainGroup.append('rect')
        .attr('width', width)
        .attr('height', this.trackHeight)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('fill', color)
        .attr('stroke', DomainColorScheme.getDarkerShade(color, 20))
        .attr('stroke-width', 1)
        .attr('class', 'domain-rect');

      // Add label if there's enough space
      if (width > 40) {
        var label = domain.source_id || domain.source || '';
        if (label.length > Math.floor(width / 7)) {
          label = label.substring(0, Math.floor(width / 7) - 2) + '...';
        }

        // Determine text color based on background brightness
        var textColor = this._isColorDark(color) ? '#ffffff' : '#333333';

        domainGroup.append('text')
          .attr('x', width / 2)
          .attr('y', this.trackHeight / 2 + 4)
          .attr('text-anchor', 'middle')
          .attr('class', 'domain-viewer-domain-label')
          .attr('fill', textColor)
          .text(label);
      }

      // Event handlers
      domainGroup
        .on('mouseover', function () {
          self._onDomainMouseOver(domain, this);
        })
        .on('mouseout', function () {
          self._onDomainMouseOut(domain, this);
        })
        .on('click', function () {
          self._onDomainClick(domain);
        });

      // Store reference for selection updates
      domain._element = domainGroup;
    },

    /**
     * Handle domain mouseover
     */
    _onDomainMouseOver: function (domain, element) {
      var self = this;

      // Highlight the domain
      d3.select(element).select('rect')
        .attr('stroke-width', 2);

      // Build tooltip content
      var content = [];
      if (domain.description) {
        content.push('<strong>' + domain.description + '</strong>');
      }
      if (domain.source && domain.source_id) {
        content.push('<span class="domain-tooltip-source">' + domain.source + ': ' + domain.source_id + '</span>');
      }
      content.push('<span class="domain-tooltip-position">Position: ' + (domain.start || '?') + ' - ' + (domain.end || '?') + '</span>');
      if (domain.length) {
        content.push('<span class="domain-tooltip-length">Length: ' + domain.length + ' aa</span>');
      }
      if (domain.e_value !== undefined && domain.e_value !== null) {
        content.push('<span class="domain-tooltip-evalue">E-value: ' + domain.e_value + '</span>');
      }

      var externalUrl = DomainColorScheme.getExternalUrl(domain.source, domain.source_id);
      if (externalUrl) {
        content.push('<span class="domain-tooltip-link">Click to view in ' + domain.source + '</span>');
      }

      // Show tooltip
      this.tooltipLayer
        .html(content.join('<br>'))
        .style('left', (d3.event.pageX + 10) + 'px')
        .style('top', (d3.event.pageY - 10) + 'px')
        .transition()
        .duration(200)
        .style('opacity', 0.95);

      // Publish hover event for grid sync
      Topic.publish('/domainViewer/hover', { id: domain.id, domain: domain });
    },

    /**
     * Handle domain mouseout
     */
    _onDomainMouseOut: function (domain, element) {
      // Remove highlight unless selected
      var id = domain.id || (domain.source + '_' + domain.source_id + '_' + domain.start);
      if (!this.selectedIds[id]) {
        d3.select(element).select('rect')
          .attr('stroke-width', 1);
      }

      // Hide tooltip
      this.tooltipLayer
        .transition()
        .duration(500)
        .style('opacity', 0);

      // Publish hover clear event
      Topic.publish('/domainViewer/hover', { id: null });
    },

    /**
     * Handle domain click
     */
    _onDomainClick: function (domain) {
      // Try to open external URL
      var externalUrl = DomainColorScheme.getExternalUrl(domain.source, domain.source_id);
      if (externalUrl) {
        window.open(externalUrl, '_blank');
      }

      // Also publish selection event for grid sync
      Topic.publish('/domainViewer/select', { ids: [domain.id], domain: domain });
    },

    /**
     * Render color legend
     */
    _renderLegend: function (canvasWidth, canvasHeight) {
      var self = this;
      var sources = DomainColorScheme.getSourcesFromDomains(this.domains);

      if (sources.length === 0) {
        return;
      }

      var legendY = canvasHeight - this.legendHeight;
      var legend = this.canvas.append('g')
        .attr('class', 'domain-viewer-legend')
        .attr('transform', 'translate(0, ' + legendY + ')');

      var itemWidth = 100;
      var maxItems = Math.floor(canvasWidth / itemWidth);
      var displaySources = sources.slice(0, maxItems);

      displaySources.forEach(function (source, i) {
        var itemX = i * itemWidth;

        var item = legend.append('g')
          .attr('transform', 'translate(' + itemX + ', 0)');

        item.append('rect')
          .attr('width', 14)
          .attr('height', 14)
          .attr('rx', 2)
          .attr('ry', 2)
          .attr('fill', source.color);

        item.append('text')
          .attr('x', 18)
          .attr('y', 11)
          .attr('class', 'domain-viewer-legend-text')
          .text(source.source);
      });
    },

    /**
     * Set selected domain IDs
     * @param {Array|Object} ids - Array of IDs or object with ID keys
     */
    setSelection: function (ids) {
      var self = this;

      // Clear previous selection
      this.canvas.selectAll('.domain-viewer-domain rect')
        .attr('stroke-width', 1);

      // Convert to object if array
      if (Array.isArray(ids)) {
        this.selectedIds = {};
        ids.forEach(function (id) {
          self.selectedIds[id] = true;
        });
      } else {
        this.selectedIds = ids || {};
      }

      // Apply selection highlighting
      this.canvas.selectAll('.domain-viewer-domain').each(function () {
        var el = d3.select(this);
        var id = el.attr('data-domain-id');
        if (self.selectedIds[id]) {
          el.select('rect').attr('stroke-width', 3);
        }
      });
    },

    /**
     * Set hovered domain ID
     */
    setHover: function (id) {
      this.hoveredId = id;
      var self = this;

      this.canvas.selectAll('.domain-viewer-domain').each(function () {
        var el = d3.select(this);
        var domainId = el.attr('data-domain-id');
        if (domainId === id) {
          el.select('rect').attr('stroke-width', 2);
        } else if (!self.selectedIds[domainId]) {
          el.select('rect').attr('stroke-width', 1);
        }
      });
    },

    /**
     * Clear hover state
     */
    clearHover: function () {
      var self = this;
      this.hoveredId = null;

      this.canvas.selectAll('.domain-viewer-domain').each(function () {
        var el = d3.select(this);
        var domainId = el.attr('data-domain-id');
        if (!self.selectedIds[domainId]) {
          el.select('rect').attr('stroke-width', 1);
        }
      });
    },

    /**
     * Resize the viewer
     */
    resize: function () {
      if (this.domains && this.domains.length > 0) {
        this.render();
      }
    },

    /**
     * Destroy the viewer and clean up
     */
    destroy: function () {
      if (this.canvas) {
        this.canvas.selectAll('*').remove();
      }
      if (this.tooltipLayer) {
        this.tooltipLayer.remove();
      }
    }
  });
});
