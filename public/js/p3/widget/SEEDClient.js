define([
  'dojo/request/xhr',
  'dojo/_base/declare'
], function (xhr, declare) {

  return declare(null, {

    url: null,
    auth: null,
    auth_cb: null,
    id: Math.round(Math.random() * 100000),

    constructor: function (url, auth, auth_cb) {

      this.url = url;

      this.auth = auth || { token: '', user_id: '' };
      this.auth_cb = auth_cb;

    },

    compare_regions: function (compare_opts, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.compare_regions',
        [compare_opts], 1, _callback, _errorCallback
      );
    },

    compare_regions_for_peg: function (peg, width, n_genomes, coloring_method, genome_filter, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.compare_regions_for_peg',
        [peg, width, n_genomes, coloring_method, genome_filter], 1, _callback, _errorCallback
      );
    },

    compare_regions_for_peg2: function (peg, width, n_genomes, coloring_method, genome_filter, options, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.compare_regions_for_peg2',
        [peg, width, n_genomes, coloring_method, genome_filter, options], 1, _callback, _errorCallback
      );
    },

    get_ncbi_cdd_url: function (feature, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.get_ncbi_cdd_url',
        [feature], 1, _callback, _errorCallback
      );
    },

    compute_cdd_for_row: function (pegs, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.compute_cdd_for_row',
        [pegs], 1, _callback, _errorCallback
      );
    },

    compute_cdd_for_feature: function (feature, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.compute_cdd_for_feature',
        [feature], 1, _callback, _errorCallback
      );
    },

    get_palette: function (palette_name, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.get_palette',
        [palette_name], 1, _callback, _errorCallback
      );
    },

    get_function: function (fids, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.get_function',
        [fids], 1, _callback, _errorCallback
      );
    },

    assign_function: function (functions, user, token, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.assign_function',
        [functions, user, token], 1, _callback, _errorCallback
      );
    },

    get_location: function (fids, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.get_location',
        [fids], 1, _callback, _errorCallback
      );
    },

    get_translation: function (fids, _callback, _errorCallback, _syncFlag) {
      return this.json_call_ajax(
        'SEED.get_translation',
        [fids], 1, _callback, _errorCallback, _syncFlag
      );
    },

    get_dna_seq: function (fids, _callback, _errorCallback, _syncFlag) {
      return this.json_call_ajax(
        'SEED.get_dna_seq',
        [fids], 1, _callback, _errorCallback, _syncFlag
      );
    },

    is_real_feature: function (fids, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.is_real_feature',
        [fids], 1, _callback, _errorCallback
      );
    },

    get_genome_features: function (genomes, type, _callback, _errorCallback) {
      return this.json_call_ajax(
        'SEED.get_genome_features',
        [genomes, type], 1, _callback, _errorCallback
      );
    },

    json_call_ajax: function (method, params, numRets, callback, errorCallback, syncFlag) {

      var rpc = {
        params: params,
        method: method,
        version: '1.1',
        id: this.id++
      };

      // var beforeSend = null;

      var headers = {};

      var token = (this.auth_cb && typeof this.auth_cb === 'function') ? this.auth_cb()
        : (this.auth.token ? this.auth.token : null);

      if (token != null) {
        headers.Authorization = token;
      }

      var promise = xhr.post(this.url, {
        data: JSON.stringify(rpc),
        headers: headers,
        sync: syncFlag
      });

      promise.then(
        function (data) {
          if (typeof callback === 'function') {
            var resp = JSON.parse(data);
            callback.apply(null, resp.result);
          }
        },
        function (data) {
          window.console.log('Error invoking ' + method + ': ' + data.message);
          if (typeof errorCallback === 'function')
          { errorCallback.call(null, data); }
        }
      );
      return promise;
    }
  });
});

