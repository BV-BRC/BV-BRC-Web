define([
  'dojo/_base/Deferred',
  'dojo/when',
  'dojo/request'
], function (Deferred, when, request) {

  /**
   * CollectionFields — the fields a collection actually exposes, from the
   * Data API's /<collection>/fields endpoint.
   *
   * Replaces hardcoded field lists, which drifted from the server twice:
   * once offering `genome_metadata.*` names that a format string cannot
   * resolve, and once offering assembly_accession / bioproject_accession /
   * biosample_accession, which are not joinable at all and so always came
   * back empty. The endpoint reports `source: native|enriched` plus a label,
   * which is everything a picker needs.
   *
   * THE ENDPOINT IS NOT EVERYWHERE. It 404s on production as of 2026-10-31
   * while serving on alpha, so every caller must supply a fallback list and
   * must not break when the fetch fails. `load()` never rejects.
   */

  // Real fields that have no business in a FASTA header or a column list.
  // Checked against alpha's genome_feature: sequence hashes, ownership and
  // permission columns, internal ids, and index bookkeeping.
  var EXCLUDED = {
    _version_: true,
    text: true,
    owner: true,
    public: true,
    user_read: true,
    user_write: true,
    date_inserted: true,
    date_modified: true,
    aa_sequence_md5: true,
    na_sequence_md5: true,
    sequence_md5: true,
    p2_feature_id: true,
    p2_sequence_id: true,
    classifier_round: true,
    classifier_score: true
  };

  /**
   * Labels the endpoint derives from the field name, where a better one
   * exists. It titlecases mechanically, so `go` becomes "Go" and `na_length`
   * becomes "Na Length". Only the genuinely wrong ones are listed.
   */
  var LABEL_OVERRIDES = {
    go: 'GO Terms',
    ec: 'EC Number',
    na_length: 'NA Length',
    aa_length: 'AA Length',
    patric_id: 'BV-BRC ID',
    brc_id: 'BRC ID',
    pdb_accession: 'PDB Accession',
    sog_id: 'SOG ID',
    og_id: 'OG ID',
    gene_id: 'Gene ID',
    genome_status: 'Genome Status',
    segments: 'Segments (coordinates)'
  };

  var _cache = {};
  var _pending = {};

  function apiBase() {
    var app = (typeof window !== 'undefined' && window.App) || {};
    return app.dataAPI || app.dataServiceURL || '';
  }

  function labelFor(field) {
    return LABEL_OVERRIDES[field.name] || field.label || field.name;
  }

  return {

    /**
     * Fields for a collection, as `{ field, label, source }`.
     *
     * Resolves to `fallback` — never rejects — when the endpoint is absent,
     * errors, or returns something unexpected. A download dialog must open
     * whether or not this works.
     *
     * @param {string} collection e.g. 'genome_feature'
     * @param {Array} fallback used verbatim when the endpoint is unavailable
     * @returns {Promise<Array>}
     */
    load: function (collection, fallback) {
      var fb = fallback || [];

      if (!collection) return this._resolved(fb);
      if (_cache[collection]) return this._resolved(_cache[collection]);
      if (_pending[collection]) return _pending[collection];

      var base = apiBase();
      if (!base) return this._resolved(fb);

      var self = this;
      var def = new Deferred();
      _pending[collection] = def.promise;

      var settle = function (value) {
        _cache[collection] = value;
        _pending[collection] = null;
        def.resolve(value);
      };

      var req;
      try {
        req = request.get(base + '/' + collection + '/fields', {
          handleAs: 'json',
          headers: { Accept: 'application/json' }
        });
      } catch (e) {
        // A transport that throws rather than rejecting.
        settle(fb);
        return def.promise;
      }

      when(req,
        function (data) {
          var parsed = self.parse(data);
          // An empty parse means the shape was not what we expect; prefer a
          // known-good fallback over an empty picker.
          settle(parsed.length ? parsed : fb);
        },
        function () {
          // 404 on production is the expected case here, not an incident.
          settle(fb);
        }
      );

      return def.promise;
    },

    /**
     * Turn a /fields payload into picker entries. Separated from load() so
     * the filtering rules are testable without a transport.
     */
    parse: function (data) {
      if (!data || !data.fields || !data.fields.length) return [];

      return data.fields
        .filter(function (f) {
          return f && f.name && !EXCLUDED[f.name];
        })
        .map(function (f) {
          return {
            field: f.name,
            label: labelFor(f),
            source: f.source || 'native'
          };
        })
        .sort(function (a, b) {
          // Native fields first — they are the ones specific to this
          // collection, and the enriched set is the same 42 everywhere.
          if (a.source !== b.source) return a.source === 'native' ? -1 : 1;
          return a.label.localeCompare(b.label);
        });
    },

    /** Drop cached responses. For tests, and after a config change. */
    _reset: function () {
      _cache = {};
      _pending = {};
    },

    _resolved: function (value) {
      var d = new Deferred();
      d.resolve(value);
      return d.promise;
    },

    EXCLUDED: EXCLUDED,
    LABEL_OVERRIDES: LABEL_OVERRIDES
  };
});
