define([
  'dojo/_base/declare', 'dijit/_WidgetBase', 'dijit/_TemplatedMixin', 'dojo/_base/lang',
  'dojo/dom-construct', 'dojo/dom-class', 'dojo/on', 'dojo/text!./templates/PhylogenyTreeCards.html'
], function (
  declare, _WidgetBase, _TemplatedMixin, lang,
  domConstruct, domClass, on, template
) {

  // ── Utilities ──────────────────────────────────────────────────────────────

  function _safeArr(val) {
    return Array.isArray(val) ? val : [];
  }

  function _allItems(g) {
    return _safeArr(g && g.archaeopteryx).concat(_safeArr(g && g.nextstrain));
  }

  // ── Segment helpers ────────────────────────────────────────────────────────

  var SEGMENT_RE = /\(([^)]+)\)/;

  function _parseSegment(name) {
    if (!name) return null;
    if (/all\s+concat/i.test(name)) return 'All';
    var m = SEGMENT_RE.exec(name);
    if (m) return m[1].split(/[,\s]+/)[0].trim();
    return null;
  }

  var SEGMENT_ORDER = ['All', 'PB2', 'PB1', 'PA', 'HA', 'NP', 'NA', 'M1', 'NS1'];

  function _segmentSortKey(seg) {
    var idx = SEGMENT_ORDER.indexOf(seg);
    return idx === -1 ? 99 : idx;
  }

  // ── Filtering helper ─────────────────────────────────────────────────────

  /**
   * Returns the filtered items from a group given viewer + segment filters.
   * Returns { arc: [], nxt: [] }
   */
  function _filterGroupItems(g, activeViewer, selectedSegs) {
    var arc = _safeArr(g && g.archaeopteryx);
    var nxt = _safeArr(g && g.nextstrain);

    if (activeViewer === 'archaeopteryx') nxt = [];
    else if (activeViewer === 'nextstrain') arc = [];

    if (selectedSegs && selectedSegs.size > 0) {
      var matchSeg = function (it) {
        return selectedSegs.has(_parseSegment(it && it.name ? String(it.name) : ''));
      };
      arc = arc.filter(matchSeg);
      nxt = nxt.filter(matchSeg);
    }

    return { arc: arc, nxt: nxt };
  }

  // ── Widget ─────────────────────────────────────────────────────────────────

  return declare([_WidgetBase, _TemplatedMixin], {
    templateString: template,

    _baseUrl: 'https://www.bv-brc.org',
    onSelectTree: null,

    _allGroups: [],
    _activeStrain: null,
    _selectedSegs: null,
    _activeViewer: null,  // null = all, 'archaeopteryx', 'nextstrain'

    // Collapse state
    _panelOpen: true,       // whole left panel
    _strainOpen: true,      // strain section body
    _viewerOpen: true,      // viewer section body
    _segmentOpen: true,     // segment section body

    postCreate: function () {
      this.inherited(arguments);
      this._selectedSegs = new Set();
      this._bindCollapseHandlers();
    },

    // ── Collapse wiring ────────────────────────────────────────────────────

    _bindCollapseHandlers: function () {
      // Main panel toggle button (chevron pill on right edge)
      this.own(on(this.toggleBtnNode, 'click', lang.hitch(this, this._togglePanel)));

      // Slim expand strip (shown when panel is collapsed)
      this.own(on(this.expandStripNode, 'click', lang.hitch(this, this._togglePanel)));

      // Strain section header
      this.own(on(this.strainHeaderNode, 'click', lang.hitch(this, function () {
        this._strainOpen = !this._strainOpen;
        this._applySectionState(this.strainBodyNode, this.strainChevronNode, this._strainOpen);
      })));

      // Viewer section header
      this.own(on(this.viewerHeaderNode, 'click', lang.hitch(this, function () {
        this._viewerOpen = !this._viewerOpen;
        this._applySectionState(this.viewerBodyNode, this.viewerChevronNode, this._viewerOpen);
      })));

      // Segment section header
      this.own(on(this.segmentHeaderNode, 'click', lang.hitch(this, function () {
        this._segmentOpen = !this._segmentOpen;
        this._applySectionState(this.segmentBodyNode, this.segmentChevronNode, this._segmentOpen);
      })));
    },

    _togglePanel: function () {
      this._panelOpen = !this._panelOpen;

      if (this._panelOpen) {
        // Expand
        domClass.remove(this.filterPanelNode, 'ptc-collapsed');
        this.expandStripNode.style.display = 'none';
        this.toggleBtnNode.innerHTML = '&#9664;';  // ◀
        this.toggleBtnNode.title = 'Collapse filters';
      } else {
        // Collapse
        domClass.add(this.filterPanelNode, 'ptc-collapsed');
        this.expandStripNode.style.display = 'flex';
        this.toggleBtnNode.innerHTML = '&#9654;';  // ▶
        this.toggleBtnNode.title = 'Expand filters';
      }
    },

    _applySectionState: function (bodyNode, chevronNode, isOpen) {
      domClass.toggle(bodyNode, 'ptc-section-hidden', !isOpen);
      domClass.toggle(chevronNode, 'ptc-section-collapsed', !isOpen);
    },

    // ── Data ───────────────────────────────────────────────────────────────

    setTreeData: function (taxonBlock) {
      domConstruct.empty(this.strainListNode);
      domConstruct.empty(this.segmentListNode);
      domConstruct.empty(this.contentNode);
      this._allGroups = [];
      this._activeStrain = null;
      this._selectedSegs = new Set();
      this._activeViewer = null;

      if (!taxonBlock) return;

      var order = _safeArr(taxonBlock.order).map(String);
      var groupsArr = _safeArr(taxonBlock.groups);

      var byKey = {};
      groupsArr.forEach(function (g) {
        if (g && g.key != null) byKey[String(g.key)] = g;
      });

      var used = {}, display = [];
      order.forEach(function (k) {
        var g = byKey[k];
        if (g) {
          display.push(g);
          used[k] = true;
        }
      });
      groupsArr.forEach(function (g) {
        var k = g && g.key != null ? String(g.key) : '';
        if (!k || used[k]) return;
        display.push(g);
      });

      this._allGroups = display.filter(function (g) {
        return _allItems(g).length > 0;
      });

      this._refreshAllPanels();
    },

    // ══════════════════════════════════════════════════════════════════════
    // ── Faceted counting ─────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Compute counts for each filter panel, considering all OTHER active
     * filters. This is the core of the faceted approach:
     *
     *   strainCounts  – counted with viewer + segment filters applied (but NOT strain)
     *   viewerCounts  – counted with strain + segment filters applied (but NOT viewer)
     *   segmentCounts – counted with strain + viewer filters applied  (but NOT segment)
     */
    _computeFacets: function () {
      var allGroups = this._allGroups;
      var activeStrain = this._activeStrain;
      var activeViewer = this._activeViewer;
      var selectedSegs = this._selectedSegs;

      // ── Strain facet: apply viewer + segment, ignore strain ──────────
      var strainCounts = {};   // key -> count
      var strainTotal = 0;
      allGroups.forEach(function (g) {
        var key = g.key != null ? String(g.key) : '';
        var f = _filterGroupItems(g, activeViewer, selectedSegs);
        var cnt = f.arc.length + f.nxt.length;
        strainCounts[key] = cnt;
        strainTotal += cnt;
      });

      // ── Viewer facet: apply strain + segment, ignore viewer ─────────
      var strainGroups = activeStrain === null
        ? allGroups
        : allGroups.filter(function (g) {
          return String(g.key) === activeStrain;
        });

      var arcTotal = 0;
      var nxtTotal = 0;
      strainGroups.forEach(function (g) {
        // Apply segment filter only (not viewer)
        var arc = _safeArr(g.archaeopteryx);
        var nxt = _safeArr(g.nextstrain);
        if (selectedSegs.size > 0) {
          var matchSeg = function (it) {
            return selectedSegs.has(_parseSegment(it && it.name ? String(it.name) : ''));
          };
          arc = arc.filter(matchSeg);
          nxt = nxt.filter(matchSeg);
        }
        arcTotal += arc.length;
        nxtTotal += nxt.length;
      });

      // ── Segment facet: apply strain + viewer, ignore segment ────────
      var segCounts = {};
      strainGroups.forEach(function (g) {
        // Apply viewer filter only (not segment)
        var arc = _safeArr(g.archaeopteryx);
        var nxt = _safeArr(g.nextstrain);
        if (activeViewer === 'archaeopteryx') nxt = [];
        else if (activeViewer === 'nextstrain') arc = [];

        arc.concat(nxt).forEach(function (it) {
          var seg = _parseSegment(it && it.name ? String(it.name) : '');
          if (!seg) return;
          segCounts[seg] = (segCounts[seg] || 0) + 1;
        });
      });

      return {
        strainCounts: strainCounts,
        strainTotal: strainTotal,
        arcTotal: arcTotal,
        nxtTotal: nxtTotal,
        segCounts: segCounts
      };
    },

    // ══════════════════════════════════════════════════════════════════════
    // ── Single refresh entry point ───────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════

    _refreshAllPanels: function () {
      // Prune stale selections before computing
      this._pruneSelections();

      var facets = this._computeFacets();

      this._buildStrainPanel(facets);
      this._buildViewerPanel(facets);
      this._buildSegmentPanel(facets);
      this._renderCards();
    },

    /**
     * Remove any selected segment that no longer has items
     * and reset viewer if its type has 0 items.
     */
    _pruneSelections: function () {
      var activeStrain = this._activeStrain;
      var activeViewer = this._activeViewer;

      // Check if current strain still has items
      if (activeStrain !== null) {
        var found = false;
        this._allGroups.forEach(function (g) {
          if (String(g.key) === activeStrain && _allItems(g).length > 0) found = true;
        });
        if (!found) this._activeStrain = null;
      }

      // Check if current viewer type still has items
      var strainGroups = this._activeStrain === null
        ? this._allGroups
        : this._allGroups.filter(lang.hitch(this, function (g) {
          return String(g.key) === this._activeStrain;
        }));

      if (activeViewer) {
        var viewerHasItems = false;
        strainGroups.forEach(function (g) {
          var arr = activeViewer === 'archaeopteryx'
            ? _safeArr(g.archaeopteryx) : _safeArr(g.nextstrain);
          if (arr.length > 0) viewerHasItems = true;
        });
        if (!viewerHasItems) this._activeViewer = null;
      }

      // Prune segments that no longer exist
      if (this._selectedSegs.size > 0) {
        var validSegs = {};
        var av = this._activeViewer;
        strainGroups.forEach(function (g) {
          var arc = _safeArr(g.archaeopteryx);
          var nxt = _safeArr(g.nextstrain);
          if (av === 'archaeopteryx') nxt = [];
          else if (av === 'nextstrain') arc = [];
          arc.concat(nxt).forEach(function (it) {
            var seg = _parseSegment(it && it.name ? String(it.name) : '');
            if (seg) validSegs[seg] = true;
          });
        });
        var self = this;
        this._selectedSegs.forEach(function (seg) {
          if (!validSegs[seg]) self._selectedSegs.delete(seg);
        });
      }
    },

    // ── Strain filter ──────────────────────────────────────────────────────

    _buildStrainPanel: function (facets) {
      domConstruct.empty(this.strainListNode);

      this._addStrainItem(null, 'All strains', facets.strainTotal);

      this._allGroups.forEach(lang.hitch(this, function (g) {
        var key = g.key != null ? String(g.key) : '';
        var label = g.title || key || '(untitled)';
        var count = facets.strainCounts[key] || 0;
        this._addStrainItem(key, label, count);
      }));

      this._applySectionState(this.strainBodyNode, this.strainChevronNode, this._strainOpen);
    },

    _addStrainItem: function (key, label, count) {
      var isActive = this._activeStrain === key;
      var item = domConstruct.create('div', {
        className: 'ptc-filter-item' + (isActive ? ' ptc-filter-active' : '')
      }, this.strainListNode);

      domConstruct.create('span', { className: 'ptc-filter-label', textContent: label }, item);
      if (count != null) {
        domConstruct.create('span', { className: 'ptc-filter-badge', textContent: count }, item);
      }

      this.own(on(item, 'click', lang.hitch(this, function () {
        this._activeStrain = key;
        this._selectedSegs = new Set();
        this._refreshAllPanels();
      })));
    },


    // ── Viewer filter (single-select: All / Nextstrain / Archaeopteryx) ──

    _buildViewerPanel: function (facets) {
      domConstruct.empty(this.viewerListNode);

      var showPanel = facets.arcTotal > 0 && facets.nxtTotal > 0;
      this.viewerPanelNode.style.display = showPanel ? '' : 'none';

      if (!showPanel) {
        this._activeViewer = null;
        return;
      }

      this._addViewerItem(null, 'All viewers', facets.arcTotal + facets.nxtTotal);
      this._addViewerItem('archaeopteryx', 'Archaeopteryx', facets.arcTotal);
      this._addViewerItem('nextstrain', 'Nextstrain', facets.nxtTotal);

      this._applySectionState(this.viewerBodyNode, this.viewerChevronNode, this._viewerOpen);
    },

    _addViewerItem: function (key, label, count) {
      var isActive = this._activeViewer === key;
      var item = domConstruct.create('div', {
        className: 'ptc-filter-item' + (isActive ? ' ptc-filter-active' : '')
      }, this.viewerListNode);

      domConstruct.create('span', { className: 'ptc-filter-label', textContent: label }, item);
      if (count != null) {
        domConstruct.create('span', { className: 'ptc-filter-badge', textContent: count }, item);
      }

      this.own(on(item, 'click', lang.hitch(this, function () {
        this._activeViewer = key;
        this._selectedSegs = new Set();
        this._refreshAllPanels();
      })));
    },

    // ── Segment filter (multi-select) ──────────────────────────────────────

    _buildSegmentPanel: function (facets) {
      domConstruct.empty(this.segmentListNode);

      var segCounts = facets.segCounts;
      var segments = Object.keys(segCounts).sort(function (a, b) {
        return _segmentSortKey(a) - _segmentSortKey(b);
      });

      var showPanel = segments.length > 1;
      this.segmentPanelNode.style.display = showPanel ? '' : 'none';

      if (!showPanel) {
        this._selectedSegs = new Set();
        return;
      }

      var totalVisible = segments.reduce(function (s, k) {
        return s + segCounts[k];
      }, 0);
      this._addSegmentControl(totalVisible);

      segments.forEach(lang.hitch(this, function (seg) {
        this._addSegmentItem(seg, segCounts[seg]);
      }));

      this._applySectionState(this.segmentBodyNode, this.segmentChevronNode, this._segmentOpen);
    },

    _addSegmentControl: function (totalVisible) {
      var noneSelected = this._selectedSegs.size === 0;
      var item = domConstruct.create('div', {
        className: 'ptc-filter-item' + (noneSelected ? ' ptc-filter-active' : '')
      }, this.segmentListNode);

      domConstruct.create('span', { className: 'ptc-filter-label', textContent: 'All segments' }, item);
      domConstruct.create('span', { className: 'ptc-filter-badge', textContent: totalVisible }, item);

      this.own(on(item, 'click', lang.hitch(this, function () {
        this._selectedSegs = new Set();
        this._refreshAllPanels();
      })));
    },

    _addSegmentItem: function (seg, count) {
      var isSelected = this._selectedSegs.has(seg);
      var item = domConstruct.create('div', {
        className: 'ptc-filter-item ptc-seg-item' + (isSelected ? ' ptc-filter-active' : '')
      }, this.segmentListNode);

      domConstruct.create('span', {
        className: 'ptc-seg-check',
        innerHTML: isSelected ? '&#10003;' : ''
      }, item);
      domConstruct.create('span', { className: 'ptc-filter-label', textContent: seg }, item);
      domConstruct.create('span', { className: 'ptc-filter-badge', textContent: count }, item);

      this.own(on(item, 'click', lang.hitch(this, function () {
        if (this._selectedSegs.has(seg)) {
          this._selectedSegs.delete(seg);
        } else {
          this._selectedSegs.add(seg);
        }
        this._refreshAllPanels();
      })));
    },

    // ── Card rendering ─────────────────────────────────────────────────────

    _renderCards: function () {
      domConstruct.empty(this.contentNode);

      var groups = this._activeStrain === null
        ? this._allGroups
        : this._allGroups.filter(lang.hitch(this, function (g) {
          return String(g.key) === this._activeStrain;
        }));

      var selectedSegs = this._selectedSegs;
      var activeViewer = this._activeViewer;

      var filtered = groups.map(function (g) {
        var f = _filterGroupItems(g, activeViewer, selectedSegs);
        return lang.mixin({}, g, { archaeopteryx: f.arc, nextstrain: f.nxt });
      }).filter(function (g) {
        return (g.archaeopteryx.length + g.nextstrain.length) > 0;
      });

      if (filtered.length === 0) {
        domConstruct.create('div', {
          className: 'ptc-empty',
          textContent: 'No trees found for the selected filters.'
        }, this.contentNode);
        return;
      }

      var grid = domConstruct.create('div', { className: 'cardGrid' }, this.contentNode);
      filtered.forEach(lang.hitch(this, function (g) {
        this._renderCard(grid, g.title || g.key || '(untitled)',
          g.archaeopteryx, g.nextstrain);
      }));
    },

    // ── Existing card rendering (unchanged) ───────────────────────────────

    _renderCard: function (parent, title, phyItems, nxtItems) {
      var card = domConstruct.create('div', { className: 'treeGroup' }, parent);
      domConstruct.create('div', { className: 'cardTitleText', textContent: title }, card);
      if (_safeArr(phyItems).length) this._renderSection(card, 'Archaeopteryx', phyItems, title);
      if (_safeArr(nxtItems).length) this._renderSection(card, 'Nextstrain', nxtItems, title);
    },

    _renderSection: function (parent, label, items, groupTitle) {
      var section = domConstruct.create('div', { className: 'innerSection' }, parent);
      domConstruct.create('div', { className: 'innerLabel', textContent: label }, section);
      var list = domConstruct.create('div', { className: 'treeList' }, section);
      _safeArr(items).forEach(lang.hitch(this, function (it) {
        this._renderItem(list, it, groupTitle, label);
      }));
    },

    _renderItem: function (parent, it, groupTitle, sectionLabel) {
      var name = it && it.name ? String(it.name) : '(unnamed)';
      var def = it && it.definition ? String(it.definition) : '';
      var url = this._resolvePath(it && it.path ? String(it.path) : '');
      var regionRaw = it && it.region ? String(it.region) : '';
      var region = regionRaw.toLowerCase();
      var imgUrl = region === 'usa'
        ? (this._baseUrl + '/api/content/images/trees/usa.png')
        : (this._baseUrl + '/api/content/images/trees/global.png');

      var a = domConstruct.create('a', {
        className: 'treeCard',
        href: url || '#',
        title: name
      }, parent);

      domConstruct.create('div', { className: 'treeCardHeader', textContent: name }, a);
      domConstruct.create('img', {
        className: 'treeCardImg',
        src: imgUrl,
        alt: region.includes('usa') ? 'USA tree preview' : 'Global tree preview',
        loading: 'lazy'
      }, a);

      this.own(on(a, 'click', lang.hitch(this, function (e) {
        if (!url) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        if (typeof this.onSelectTree === 'function') {
          this.onSelectTree({
            url: url, name: name, definition: def,
            groupTitle: groupTitle || '', section: sectionLabel || ''
          });
        }
      })));
    },

    // ── Utilities ──────────────────────────────────────────────────────────

    _resolvePath: function (path) {
      if (!path) return '';
      return path.charAt(0) === '/' ? (this._baseUrl + path) : path;
    }
  });
});