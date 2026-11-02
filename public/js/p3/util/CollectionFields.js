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

  /**
   * Field groups, in display order.
   *
   * A genome_feature download offers 77 fields. Sorted flat they are
   * unnavigable in a short scrolling box -- `subtype` landed at position 75
   * of 77, roughly sixteen screens down, which read as "the viral typing
   * fields are missing". Grouping puts the typing fields in a section of
   * their own rather than at the bottom of an alphabetical run.
   *
   * `match` is checked in order, so the first group that claims a field
   * wins; anything unclaimed falls through to the collection's own group.
   */
  var VIRAL_TYPING = {
    subtype: true,
    lineage: true,
    clade: true,
    h5_clade: true,
    h3_clade: true,
    h1_clade_global: true,
    h1_clade_us: true,
    subclade: true,
    ph1n1_like: true,
    segment: true,
    segments: true,
    species: true,
    strain: true,
    genbank_accessions: true
  };

  var HOST = {
    host_name: true,
    host_common_name: true,
    host_scientific_name: true,
    host_group: true,
    host_gender: true,
    host_age: true,
    host_health: true,
    lab_host: true,
    passage: true,
    other_clinical: true,
    disease: true
  };

  var GEOGRAPHY = {
    isolation_country: true,
    isolation_source: true,
    isolation_comments: true,
    geographic_group: true,
    geographic_location: true,
    state_province: true,
    county: true,
    city: true,
    other_environmental: true,
    collection_date: true,
    collection_year: true,
    season: true
  };

  var GROUPS = [
    {
      key: 'typing',
      label: 'Virus typing',
      match: function (f) { return VIRAL_TYPING[f.field]; }
    },
    {
      key: 'host',
      label: 'Host and sample',
      match: function (f) { return HOST[f.field]; }
    },
    {
      key: 'geo',
      label: 'Collection and geography',
      match: function (f) { return GEOGRAPHY[f.field]; }
    },
    {
      // Everything else that came from the genome join: phenotype, growth
      // conditions, assembly status.
      key: 'genome',
      label: 'Genome metadata',
      match: function (f) { return f.source === 'enriched'; }
    }
  ];

  var _cache = {};
  var _pending = {};

  /**
   * The Data API base, without a trailing slash.
   *
   * Callers join this with '/' + collection, so a configured base that
   * already ends in one produced `/proxyapi//genome/fields` -- which the
   * API 404s. That was the request failure behind the field picker falling
   * back to its built-in list; the cache fix stopped one such failure
   * sticking for the session, this stops it happening.
   */
  function apiBase() {
    var app = (typeof window !== 'undefined' && window.App) || {};
    var base = app.dataAPI || app.dataServiceURL || '';
    return String(base).replace(/\/+$/, '');
  }

  function labelFor(field) {
    return LABEL_OVERRIDES[field.name] || field.label || field.name;
  }

  /**
   * The group a field belongs to. Native fields that no group claims are
   * the collection's own, which is the default and sorts first.
   */
  var DEFAULT_GROUP = 'collection';

  function groupFor(entry) {
    for (var i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].match(entry)) return GROUPS[i].key;
    }
    return DEFAULT_GROUP;
  }

  function groupIndex(key) {
    if (key === DEFAULT_GROUP) return -1;
    for (var i = 0; i < GROUPS.length; i++) {
      if (GROUPS[i].key === key) return i;
    }
    return GROUPS.length;
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

      /** A real answer: worth caching. */
      var succeed = function (value) {
        _cache[collection] = value;
        _pending[collection] = null;
        def.resolve(value);
      };

      /**
       * No answer: hand back the caller's list but DO NOT cache it.
       *
       * Caching a fallback poisons the collection for the rest of the
       * session -- one transient failure and every later call returns the
       * short built-in list without retrying, which presents as "the fields
       * are missing" with nothing in the console. Leaving the cache empty
       * means the next dialog tries again.
       *
       * Warn, too. The silence here is what made this hard to see: a 404 on
       * production is expected, but a failure anywhere else should leave a
       * trace rather than quietly degrading the picker.
       */
      var fallBack = function (reason) {
        console.warn('CollectionFields: could not load ' + collection
          + '/fields (' + reason + '); using the built-in field list. '
          + 'The picker will show fewer fields than the collection offers.');
        _pending[collection] = null;
        def.resolve(fb);
      };

      var req;
      try {
        req = request.get(base + '/' + collection + '/fields', {
          handleAs: 'json',
          headers: { Accept: 'application/json' }
        });
      } catch (e) {
        // A transport that throws rather than rejecting.
        fallBack('transport error: ' + (e && e.message));
        return def.promise;
      }

      when(req,
        function (data) {
          var parsed = self.parse(data);
          if (parsed.length) {
            succeed(parsed);
          } else {
            // The shape was not what we expect; prefer a known-good
            // fallback over an empty picker, and do not cache the guess.
            fallBack('response had no usable fields');
          }
        },
        function (err) {
          var status = err && err.response && err.response.status;
          fallBack(status ? 'HTTP ' + status : 'request failed');
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
          var entry = {
            field: f.name,
            label: labelFor(f),
            source: f.source || 'native'
          };
          entry.group = groupFor(entry);
          return entry;
        })
        .sort(function (a, b) {
          // Group order first, then alphabetical inside a group. Sorting
          // native-before-enriched instead put every joined field after all
          // 46 native ones, which is what buried the virus typing fields.
          if (a.group !== b.group) return groupIndex(a.group) - groupIndex(b.group);
          return a.label.localeCompare(b.label);
        });
    },

    /**
     * Group definitions in display order, for a caller rendering headings.
     * The collection's own fields lead, under a caller-supplied label since
     * only the caller knows what collection it is showing.
     */
    groups: function (ownLabel) {
      return [{ key: DEFAULT_GROUP, label: ownLabel || 'Fields' }].concat(
        GROUPS.map(function (g) { return { key: g.key, label: g.label }; })
      );
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
