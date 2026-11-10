/**
 * throttledRequest: a dojo/request transport that retries Data API 429/503
 * responses per BV-BRC-API/Docs/CLIENT-429.md.
 *
 * Registered as `requestProvider: 'p3/util/throttledRequest'` in the dojoConfig
 * in views/javascript.ejs. dojo/request loads './request/default!', and
 * request/default.js honours has('config-requestProvider') -- so this module
 * becomes what every `dojo/request` import resolves to. That is ~200 call
 * sites across p3/ covered by one registration, with no call site edits.
 *
 * Two transports deliberately bypass this and are wrapped separately:
 *   - P3JsonRest, which uses dojo.rawXhrPost from legacy dojo/_base/xhr
 *   - BVBRCClient, which uses fetch
 *
 * Only Data API URLs are retried. Workspace RPC, the app service, Shock and
 * the user service pass through untouched: they do not speak 429, and silently
 * retrying a workspace write is a different and worse problem than retrying a
 * read.
 */
define([
  'dojo/request/registry', 'dojo/request/xhr', './retryRequest'
], function (registry, xhr, retryRequest) {

  function dataApiBase() {
    var app = (typeof window !== 'undefined' && window.App) || {};
    return app.dataAPI || app.dataServiceURL || '';
  }

  /**
   * The base is read per-call rather than cached: this module is loaded during
   * dojo boot, before window.App exists.
   */
  function isDataApi(url) {
    var base = dataApiBase();
    return !!base && String(url).indexOf(base) === 0;
  }

  /** Feature flag; see retryRequest.js. Also read per call. */
  function enabled() {
    return !!(typeof window !== 'undefined' && window.App && window.App.enableThrottleRetry);
  }

  // Data API URLs: retry them, when the feature is on. Everything else falls
  // through to the registry's own fallback provider (./xhr), unwrapped.
  //
  // The flag is part of the match, not a branch inside the handler: a
  // non-matching URL never enters this function at all, so with the feature
  // off every request takes the stock ./xhr path and gets dojo's own promise
  // rather than the rebuilt one below. Off means absent, not inert.
  registry.register(function (url) {
    return enabled() && isDataApi(url);
  }, function (url, options) {
    // dojo/request's contract is a *dual* promise: the data promise plus a
    // .response sub-promise (request/util.js:146). Delegating preserved that
    // for free; wrapping in retryRequest does not, so rebuild it from the
    // winning attempt. Dropping it breaks consumers inside dojo/dgrid even
    // though no p3 call site reads it directly.
    var winning;
    var dataPromise = retryRequest(function () {
      winning = xhr(url, options);
      return winning;
    }, { label: String(url) });

    // dojo/Deferred freezes its promise (Deferred.js:305), so `.response = `
    // on it is a silent no-op. Copy onto a plain wrapper the way
    // request/util.js:140 does, keeping cancel() wired to the real chain.
    var promise = {};
    ['then', 'otherwise', 'always', 'catch', 'cancel', 'isResolved',
      'isRejected', 'isFulfilled', 'isCanceled'].forEach(function (m) {
      if (typeof dataPromise[m] === 'function') {
        promise[m] = dataPromise[m].bind(dataPromise);
      }
    });

    promise.response = dataPromise.then(function (data) {
      return winning.response ? winning.response : { data: data };
    });
    // The caller may handle only one of the two; an ignored sibling must not
    // surface as an unhandled rejection.
    if (promise.response.otherwise) { promise.response.otherwise(function () {}); }

    return promise;
  });

  function provider(url, options) {
    return registry.apply(null, arguments);
  }

  // The .get/.post/.put/.del surface callers rely on, built the way
  // dojo/request/xhr.js builds its own (see request/util.js addCommonMethods).
  ['GET', 'POST', 'PUT', 'DELETE'].forEach(function (method) {
    var name = (method === 'DELETE' ? 'DEL' : method).toLowerCase();
    provider[name] = function (url, options) {
      var opts = {};
      var k;
      for (k in (options || {})) { opts[k] = options[k]; }
      opts.method = method;
      return provider(url, opts);
    };
  });

  return provider;
});
