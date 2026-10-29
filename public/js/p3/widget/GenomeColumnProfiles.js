'use strict';

define(['rql/parser', 'dojo/request', 'dojo/promise/all', '../util/PathJoin'], function (RQLParser, request, all, PathJoin) {
  // Family ancestry covers all Orthomyxoviridae descendants without a species list. Lineage remains an independent influenza B default.
  var profiles = [
    {
      name: 'orthomyxoviridae',
      taxonIds: ['11308'],
      visibility: { segment: true, cds: false }
    },
    {
      name: 'influenza-b',
      taxonIds: ['11520', '2955465'],
      visibility: { lineage: true }
    }
  ];

  var ancestry = Object.create(null);
  var pending = Object.create(null);

  function matches(id, profile, apiServer) {
    var ids = [String(id)].concat(ancestry[apiServer + ':' + id] || []);
    return profile.taxonIds.some(function (root) { return ids.indexOf(root) !== -1; });
  }

  function parseState(state) {
    var filter = state.hashParams && state.hashParams.filter;
    try {
      return RQLParser.parse([state.search, filter === 'false' ? '' : filter].filter(Boolean).join('&'));
    } catch (err) {
      // Incomplete search input should not prevent the table from loading.
      return null;
    }
  }

  function scopedToProfile(term, profile, apiServer) {
    if (!term || !term.args) return false;
    if (term.name === 'or') {
      return term.args.length > 0 && term.args.every(function (child) {
        return scopedToProfile(child, profile, apiServer);
      });
    }
    if (!term.name || term.name === 'and' || term.name === 'genome') {
      return term.args.some(function (child) { return scopedToProfile(child, profile, apiServer); });
    }
    if (term.args[0] !== 'taxon_lineage_ids' && term.args[0] !== 'taxon_id') return false;
    if (term.name === 'eq') return matches(term.args[1], profile, apiServer);
    if (term.name === 'in' && Array.isArray(term.args[1])) {
      return term.args[1].length > 0 && term.args[1].every(function (id) {
        return matches(id, profile, apiServer);
      });
    }
    return false;
  }

  function applyVisibility(state) {
    var profiles = columnProfiles.resolve(state, this.apiServer);
    var key = profiles.map(function (profile) { return profile.name; }).join(',');
    if (this._virusColumnProfileKey === key) return;

    var columns = this.grid._columns;
    if (!this._virusColumnBaseVisibility) {
      this._virusColumnBaseVisibility = {};
      columnProfiles.profiles.forEach(function (profile) {
        Object.keys(profile.visibility).forEach(function (name) {
          if (columns[name]) this._virusColumnBaseVisibility[name] = !!columns[name].hidden;
        }, this);
      }, this);
    }

    // Restore only columns managed by the previous profile when reusing a grid.
    (this._virusColumnProfiles || []).forEach(function (profile) {
      Object.keys(profile.visibility).forEach(function (name) {
        if (columns[name]) this.grid.toggleColumnHiddenState(name, this._virusColumnBaseVisibility[name]);
      }, this);
    }, this);
    profiles.forEach(function (profile) {
      Object.keys(profile.visibility).forEach(function (name) {
        if (columns[name]) this.grid.toggleColumnHiddenState(name, !profile.visibility[name]);
      }, this);
    }, this);
    this._virusColumnProfiles = profiles;
    this._virusColumnProfileKey = key;
    return true;
  }

  var columnProfiles = {
    profiles: profiles,
    resolve: function (state, apiServer) {
      state = state || {};
      var taxonomy = state.taxonomy || {};
      var ids = (taxonomy.lineage_ids || []).map(String);
      ids = ids.concat(((state.genome || {}).taxon_lineage_ids || []).map(String));
      if (state.taxon_id) ids.push(String(state.taxon_id));
      if (state.genome && state.genome.taxon_id) ids.push(String(state.genome.taxon_id));
      var parsed = parseState(state);
      return profiles.filter(function (profile) {
        return ids.some(function (id) { return matches(id, profile, apiServer); })
          || scopedToProfile(parsed, profile, apiServer);
      });
    },

    load: function (state, apiServer) {
      if (!apiServer) return null;
      var ids = [];
      function add(id) {
        id = String(id);
        if (/^\d+$/.test(id) && ids.indexOf(id) === -1) ids.push(id);
      }
      if (state.taxon_id) {
        add(state.taxon_id);
        if (state.taxonomy && state.taxonomy.lineage_ids) {
          ancestry[apiServer + ':' + state.taxon_id] = state.taxonomy.lineage_ids.map(String);
        }
      }
      function collect(term) {
        if (!term || !term.args) return;
        if (!term.name || ['and', 'or', 'genome'].indexOf(term.name) !== -1) term.args.forEach(collect);
        else if (term.args[0] === 'taxon_lineage_ids' || term.args[0] === 'taxon_id') {
          if (term.name === 'eq') add(term.args[1]);
          else if (term.name === 'in' && Array.isArray(term.args[1])) term.args[1].forEach(add);
        }
      }
      if (state.genome && state.genome.taxon_id) {
        add(state.genome.taxon_id);
        if (state.genome.taxon_lineage_ids) {
          ancestry[apiServer + ':' + state.genome.taxon_id] = state.genome.taxon_lineage_ids.map(String);
        }
      }
      collect(parseState(state));
      var lookups = [];
      ids.forEach(function (id) {
        var key = apiServer + ':' + id;
        if (ancestry[key]) return;
        if (!pending[key]) {
          pending[key] = request.get(PathJoin(apiServer, 'taxonomy') + '/?eq(taxon_id,' + id + ')'
            + '&select(taxon_id,lineage_ids)&limit(1)', {
            handleAs: 'json',
            headers: { accept: 'application/json', Authorization: window.App.authorizationToken || '' }
          }).then(function (rows) {
            ancestry[key] = rows.length ? (rows[0].lineage_ids || []).map(String) : [];
            delete pending[key];
          }, function (error) {
            delete pending[key];
            throw error;
          });
        }
        lookups.push(pending[key]);
      });
      return lookups.length ? all(lookups) : null;
    },

    applyDefaults: function (state) {
      if (!this.grid || !state) return;
      var container = this;
      var grid = this.grid;
      var revision = this._virusColumnRevision = (this._virusColumnRevision || 0) + 1;
      applyVisibility.call(this, state);
      var lookup = columnProfiles.load(state, this.apiServer);
      if (lookup) {
        lookup.then(function () {
          // A taxonomy lookup must not alter a newer search or a replaced grid.
          if (container._destroyed || container.grid !== grid || container._virusColumnRevision !== revision) return;
          var changed = applyVisibility.call(container, state);
          // Explicit search columns take precedence over taxonomy defaults.
          if (changed && container._prepareSearchColumns) {
            container._searchColumnContext = null;
            container._prepareSearchColumns(state);
          }
        }, function () {
          // Keep the results usable if taxonomy metadata is unavailable.
        });
      }
    }
  };
  return columnProfiles;
});
