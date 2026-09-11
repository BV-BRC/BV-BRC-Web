define([
  'dojo/_base/declare', './GridContainer',
  './TaxonomyTreeGrid', 'dijit/popup',
  'dijit/TooltipDialog', 'dojo/on', 'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct', 'dojo/request',
  'dojo/topic', '../util/PathJoin'
], function (
  declare, GridContainer,
  Grid, popup,
  TooltipDialog, on, domClass, ContentPane, domConstruct, request,
  Topic, PathJoin
) {

  var dfc = '<div>Download Table As...</div><div class="wsActionTooltip" rel="text/tsv">Text</div><div class="wsActionTooltip" rel="text/csv">CSV</div><div class="wsActionTooltip" rel="application/vnd.openxmlformats">Excel</div>';
  var downloadTT = new TooltipDialog({
    content: dfc,
    onMouseLeave: function () {
      popup.close(downloadTT);
    }
  });

  on(downloadTT.domNode, 'div:click', function (evt) {
    var rel = evt.target.attributes.rel.value;
    // console.log("REL: ", rel);
    // var selection = self.actionPanel.get('selection');
    var dataType = (self.actionPanel.currentContainerWidget.containerType == 'genome_group') ? 'genome' : 'genome_feature';
    var currentQuery = self.actionPanel.currentContainerWidget.get('query');
    // console.log("selection: ", selection);
    // console.log("DownloadQuery: ", dataType, currentQuery );
    window.open('/api/' + dataType + '/' + currentQuery + '&http_authorization=' + encodeURIComponent(window.App.authorizationToken) + '&http_accept=' + rel + '&http_download');
    popup.close(downloadTT);
  });

  return declare([GridContainer], {
    'class': 'GridContainer TaxonTreeGrid no-phylo-col',
    facetFields: [],
    enableFilterPanel: false,
    dataModel: 'taxonomy',
    containerType: 'taxonomy_data',
    tutorialLink: 'quick_references/organisms_taxon/taxonomy.html',
    tooltip: 'The "Taxonomy" tab provides taxonomy subtree for the current taxon level.',
    _treeFilterActive: false,
    _baseQuery: '',
    _searchTerm: '',
    _searchTimer: null,
    _searchMode: false,
    _originalGridStore: null,

    onSetState: function (attr, oldState, state) {
      // console.log("GridContainer onSetState: ", state, " oldState:", oldState);
      if (!state) {
        // console.log("!state in grid container; return;")
        return;
      }

      this._baseQuery = (state && state.search) ? state.search : '';
      this._searchTerm = '';
      this._restoreOriginalStore(false);
      if (this._searchNoResults) {
        this._searchNoResults.style.display = 'none';
      }
      if (this._searchInput) {
        this._searchInput.value = '';
        if (this._searchClearBtn) {
          this._searchClearBtn.style.display = 'none';
        }
      }
      this.set('query', this._baseQuery);
    },

    _applySearch: function (term) {
      this._searchTerm = term;
      var _self = this;

      if (!term) {
        this._restoreOriginalStore(true);
        if (this._searchNoResults) {
          this._searchNoResults.style.display = 'none';
        }
        if (this._searchSpinner) {
          this._searchSpinner.style.display = 'none';
        }
        return;
      }

      if (this._searchSpinner) {
        this._searchSpinner.style.display = 'inline';
      }
      if (this._searchNoResults) {
        this._searchNoResults.style.display = 'none';
      }

      // Tokenise on whitespace AND forward-slash so influenza strain names like
      // "A/mallard/Alberta/243/2006" are split into meaningful tokens rather
      // than treated as one opaque string that the keyword index can't match.
      // - Multi-char tokens: trailing wildcard for prefix matching ("influen*")
      // - Single-char tokens: exact match ("A") — "A*" would match almost every
      //   taxon name; exact "A" combined with other tokens still narrows correctly.
      // Leading wildcards are intentionally avoided — they force SOLR to scan
      // the full term index and fail for common words like "virus".
      var rawWords = term.trim().split(/[\s/]+/).filter(function (w) {
        return w.length > 0;
      });
      // Deduplicate while preserving order (e.g. "A/A/influenza" → ["A","influenza"])
      var seen = {};
      var words = rawWords.filter(function (w) {
        var lc = w.toLowerCase();
        if (seen[lc]) { return false; }
        seen[lc] = true;
        return true;
      });
      var kwParts = words.map(function (w) {
        return w.length === 1
          ? 'keyword(' + encodeURIComponent(w) + ')'
          : 'keyword(' + encodeURIComponent(w) + '*)';
      });

      var match = this._baseQuery && this._baseQuery.match(/eq\(taxon_id,(\d+)\)/);
      var rootId = match ? match[1] : null;

      // Use gt(genomes,0) (≥ 1 genome) rather than gt(genomes,1) (≥ 2 genomes)
      // so that specific strain-level taxa with a single genome are included.
      var filterParts = rootId
        ? ['eq(lineage_ids,' + rootId + ')', 'gt(genomes,0)'].concat(kwParts)
        : ['gt(genomes,0)'].concat(kwParts);
      var url = PathJoin(window.App.dataServiceURL, 'taxonomy') + '/?' + filterParts.join('&') +
        '&select(taxon_id,taxon_name,taxon_rank,genomes,lineage_ids,lineage_names,lineage_ranks)&sort(-genomes)&limit(200)';

      request(url, {
        handleAs: 'json',
        headers: {
          accept: 'application/json',
          Authorization: (window.App && window.App.authorizationToken) ? window.App.authorizationToken : ''
        }
      }).then(function (results) {
        if (term !== _self._searchTerm) {
          return;
        } // stale — user typed again
        if (_self._searchSpinner) {
          _self._searchSpinner.style.display = 'none';
        }
        _self._applySearchToGrid(results, rootId);
      }, function (err) {
        console.error('[TaxonomySearch] request failed:', err);
        if (term === _self._searchTerm && _self._searchSpinner) {
          _self._searchSpinner.style.display = 'none';
        }
      });
    },

    // Restore the grid's original store and expansion state after search mode
    _restoreOriginalStore: function (doRefresh) {
      if (!this._searchMode) {
        return;
      }
      this._searchMode = false;
      this.grid._searchExpandAll = false;
      // Clear dgrid's expansion memory so the restored tree starts with only first level expanded
      if (this.grid._expanded) {
        this.grid._expanded = {};
      }
      if (this._originalGridStore) {
        this.grid.set('store', this._originalGridStore);
        this._originalGridStore = null;
        if (doRefresh) {
          this.set('query', this._baseQuery);
        }
      }
    },

    // Build a lightweight in-memory store from flat search results.
    // Uses lineage_ids/names/ranks to reconstruct the ancestor chain so the
    // existing dgrid Tree rendering just works — no extra API calls needed.
    _buildSearchStore: function (results, rootId) {
      var nodes = {};       // taxon_id → item object
      var childrenMap = {}; // taxon_id → [child item, ...]
      var childSets = {};   // taxon_id → Set of already-linked child ids (O(1) dedup)
      var rootIdStr = rootId ? String(rootId) : null;

      function ensureNode(id, name, rank) {
        var key = String(id);
        if (!nodes[key]) {
          nodes[key] = {
            taxon_id: key, taxon_name: name || key,
            taxon_rank: rank || '',
            genomes: null, // null → blank in grid for non-hit ancestors
            _isSearchHit: false
          };
          childrenMap[key] = [];
          childSets[key] = {};
        }
        return nodes[key];
      }

      results.forEach(function (r) {
        var ids = r.lineage_ids || [];
        var names = r.lineage_names || [];
        var ranks = r.lineage_ranks || [];

        // Walk from just-below rootId down to the hit, creating nodes + links.
        var startIdx = 0;
        if (rootIdStr) {
          for(var i = 0; i < ids.length; i++) {
            if (String(ids[i]) === rootIdStr) {
              startIdx = i + 1;
              break;
            }
          }
        }

        for(var j = startIdx; j < ids.length; j++) {
          ensureNode(ids[j], names[j], ranks[j]);
          if (j > startIdx) {
            var parentKey = String(ids[j - 1]);
            var childKey = String(ids[j]);
            if (!childSets[parentKey][childKey]) {
              childSets[parentKey][childKey] = true;
              childrenMap[parentKey].push(nodes[childKey]);
            }
          }
        }

        // Mark hit + store genome count on the node
        var hitKey = String(r.taxon_id);
        ensureNode(hitKey, r.taxon_name, r.taxon_rank);
        nodes[hitKey]._isSearchHit = true;
        if ((r.genomes || 0) > (nodes[hitKey].genomes || 0)) {
          nodes[hitKey].genomes = r.genomes;
        }
      });

      // Sort children by genome count descending at every level.
      function sortChildren(key) {
        var kids = childrenMap[key] || [];
        kids.sort(function (a, b) {
          return b.genomes - a.genomes;
        });
        kids.forEach(function (c) {
          sortChildren(c.taxon_id);
        });
      }

      // Determine top-level nodes (direct children of rootId, or orphan roots).
      var topNodes;
      if (rootIdStr && childrenMap[rootIdStr]) {
        topNodes = childrenMap[rootIdStr];
        sortChildren(rootIdStr);
      } else {
        var isChild = {};
        Object.keys(childrenMap).forEach(function (k) {
          childrenMap[k].forEach(function (c) {
            isChild[c.taxon_id] = true;
          });
        });
        topNodes = Object.keys(nodes)
          .filter(function (k) {
            return !isChild[k];
          })
          .map(function (k) {
            return nodes[k];
          });
        topNodes.sort(function (a, b) {
          return b.genomes - a.genomes;
        });
      }

      // Return a minimal dojo-store-compatible object that dgrid Tree can use.
      return {
        idProperty: 'taxon_id',
        get: function (id) {
          return nodes[String(id)];
        },
        getIdentity: function (item) {
          return item.taxon_id;
        },
        // dgrid OnDemandGrid calls query() for the initial root rows —
        // we ignore whatever RQL string it passes and just return our top nodes.
        query: function () {
          return topNodes;
        },
        getChildren: function (item) {
          return childrenMap[String(item.taxon_id)] || [];
        },
        mayHaveChildren: function (item) {
          return (childrenMap[String(item.taxon_id)] || []).length > 0;
        }
      };
    },

    // Swap the grid's store with the search-result store and expand everything.
    _applySearchToGrid: function (results, rootId) {
      if (!results || !results.length) {
        if (this._searchNoResults) {
          this._searchNoResults.style.display = 'inline';
        }
        // Replace the grid with an empty store so stale results don't linger.
        if (!this._searchMode) {
          this._originalGridStore = this.grid.store;
          this._searchMode = true;
        }
        this.grid._searchExpandAll = false;
        this.grid.set('store', this._buildSearchStore([], rootId));
        return;
      }
      if (this._searchNoResults) {
        this._searchNoResults.style.display = 'none';
      }

      // Save original store the first time (in case the user keeps typing).
      if (!this._searchMode) {
        this._originalGridStore = this.grid.store;
        this._searchMode = true;
      }

      // Tell the Tree column's shouldExpand to expand everything.
      this.grid._searchExpandAll = true;
      this.grid.set('store', this._buildSearchStore(results, rootId));
    },

    getFilterPanel: function (opts) {
    },
    containerActions: GridContainer.prototype.containerActions.concat([
      [
        'ToggleFilters',
        'fa icon-filter fa-2x',
        {
          label: 'FILTERS',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Toggle Filters',
          tooltipDialog: downloadTT
        },
        function (selection) {
          on.emit(this.domNode, 'ToggleFilters', {});
        },
        true
      ],
      [
        'DownloadTable',
        'fa icon-download fa-2x',
        {
          label: 'DOWNLOAD',
          multiple: false,
          validTypes: ['*'],
          tooltip: 'Download Table',
          tooltipDialog: downloadTT
        },
        function (selection) {
          popup.open({
            popup: this.containerActionBar._actions.DownloadTable.options.tooltipDialog,
            around: this.containerActionBar._actions.DownloadTable.button,
            orient: ['below']
          });
        },
        true
      ]
    ]),
    selectionActions: GridContainer.prototype.selectionActions.concat([
      [
        'ShowWithTrees',
        'fa icon-tree2 fa-2x',
        {
          label: 'HIGHLIGHT',
          persistent: true,
          validTypes: ['*'],
          tooltip: 'Highlight rows with phylogenetic trees'
        },
        function (selection, container, button) {
          this._treeFilterActive = !this._treeFilterActive;
          domClass.toggle(this.domNode, 'trees-only-mode', this._treeFilterActive);
          var iconNode = button.querySelector('.ActionButton');
          if (iconNode) {
            domClass.toggle(iconNode, 'ActiveActionButton', this._treeFilterActive);
          }
          var labelNode = button.querySelector('.ActionButtonText');
          if (labelNode) {
            labelNode.textContent = this._treeFilterActive ? 'RESET' : 'HIGHLIGHT';
          }
        },
        true // visibility is controlled by CSS (.no-phylo-col hides it)
      ]
    ]),

    gridCtor: Grid,

    setVirusContext: function (isVirus) {
      domClass.toggle(this.domNode, 'no-phylo-col', !isVirus);
      // Reset highlight filter when leaving virus context
      if (!isVirus && this._treeFilterActive) {
        this._treeFilterActive = false;
        domClass.remove(this.domNode, 'trees-only-mode');
        var btn = this.selectionActionBar &&
          this.selectionActionBar._actions.ShowWithTrees &&
          this.selectionActionBar._actions.ShowWithTrees.button;
        if (btn) {
          var iconNode = btn.querySelector('.ActionButton');
          if (iconNode) {
            domClass.remove(iconNode, 'ActiveActionButton');
          }
          var labelNode = btn.querySelector('.ActionButtonText');
          if (labelNode) {
            labelNode.textContent = 'HIGHLIGHT';
          }
        }
      }
    },

    setPhyloManifest: function (manifest) {
      this._pendingPhyloManifest = manifest;
      if (this.grid) {
        this.grid.set('phyloManifest', manifest);
      }
    },

    setPhyloManifestData: function (data) {
      this._pendingPhyloManifestData = data;
      if (this.grid) {
        this.grid.set('phyloManifestData', data);
      }
    },

    destroy: function () {
      if (this._searchTimer) {
        clearTimeout(this._searchTimer);
        this._searchTimer = null;
      }
      this.inherited(arguments);
    },

    onFirstView: function () {
      this.inherited(arguments);

      var _self = this;

      // ── Search bar
      var searchPane = new ContentPane({
        region: 'top',
        layoutPriority: 5,
        style: 'height:40px; padding:0; overflow:visible; border-bottom:1px solid #ddd;',
        splitter: false
      });
      this.addChild(searchPane);

      var wrapper = domConstruct.create('div', { className: 'TaxonSearchBar' }, searchPane.domNode);

      domConstruct.create('span', { className: 'fa icon-search TaxonSearchIcon' }, wrapper);

      var input = domConstruct.create('input', {
        type: 'text',
        placeholder: 'Search by taxonomy name…',
        className: 'TaxonSearchInput'
      }, wrapper);
      this._searchInput = input;

      var clearBtn = domConstruct.create('span', {
        className: 'TaxonSearchClear',
        innerHTML: '&times;',
        title: 'Clear search'
      }, wrapper);
      this._searchClearBtn = clearBtn;

      var spinner = domConstruct.create('span', {
        className: 'fa icon-spinner fa-spin TaxonSearchSpinner'
      }, wrapper);
      this._searchSpinner = spinner;

      var noResults = domConstruct.create('span', {
        className: 'TaxonNoResults',
        textContent: 'No taxonomy found'
      }, wrapper);
      this._searchNoResults = noResults;

      // ── Input handlers ─────────────────────────────────────────────────

      on(input, 'input', function () {
        var term = input.value;
        clearBtn.style.display = term ? 'inline' : 'none';
        if (_self._searchTimer) {
          clearTimeout(_self._searchTimer);
        }
        _self._searchTimer = setTimeout(function () {
          _self._applySearch(term.trim());
        }, 300);
      });

      on(clearBtn, 'click', function () {
        input.value = '';
        clearBtn.style.display = 'none';
        _self._applySearch('');
      });
      if (this._pendingPhyloManifest) {
        this.grid.set('phyloManifest', this._pendingPhyloManifest);
      }
      if (this._pendingPhyloManifestData) {
        this.grid.set('phyloManifestData', this._pendingPhyloManifestData);
      }
    }

  });
});
