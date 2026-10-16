/**
 * retryRequest: retry a request on HTTP 429/503 per the Data API's client
 * contract (BV-BRC-API/Docs/CLIENT-429.md).
 *
 * The rule that matters is not "retry on 429" -- it is "back off by the amount
 * the server asked for, and give up rather than hammer." A client that retries
 * a shed request badly makes the overload it is reacting to worse, at exactly
 * the moment the system has least capacity to absorb it.
 *
 *   - honour Retry-After; never substitute a shorter delay
 *   - jitter every wait, so simultaneously-shed clients do not all return at
 *     the same instant and reproduce the burst
 *   - interactive callers give up after maxRetries and tell the user;
 *     unattended callers cap the *delay* instead and keep going (spec 3a)
 *   - retry 429 and 503 only. 504 means the query was too expensive and
 *     retrying repeats the cost; 400 is a permanent refusal of that query.
 *
 * Publishes /throttle/active, /throttle/resolved and /throttle/failed so a
 * banner can show a truthful busy state. Every /throttle/active is matched by
 * exactly one resolved-or-failed, including on cancel, so the banner's counter
 * cannot drift and pin itself on screen.
 */
define([
  'dojo/Deferred', 'dojo/topic'
], function (Deferred, Topic) {

  var RETRIABLE = { 429: true, 503: true };

  // Spec 3a escalation: honour Retry-After for the first few attempts, then
  // climb to a ceiling and hold there. Index is the zero-based attempt number.
  var UNATTENDED_FLOOR = [0, 0, 0, 30, 30, 30, 60, 60, 60, 60];
  var DEFAULTS = {
    mode: 'interactive',
    maxRetries: 3,
    ceilingSeconds: 300,
    maxTotalWaitMs: Infinity,
    label: ''
  };

  var BUSY_MESSAGE = 'The server is currently busy. Please try again in a few minutes.';

  // Never wait less than this, whatever the server said. The API floors
  // Retry-After at 1s precisely because `Retry-After: 0` invites a tight retry
  // loop, but a client must not depend on the server getting that right.
  var MIN_DELAY_SECONDS = 1;

  /**
   * Pull the HTTP status off whatever the transport rejected with. Dojo's
   * dojo/_base/xhr copies status onto the error (xhr.js:631); dojo/request
   * rejects with a RequestError carrying .response.status; fetch callers hand
   * us a response object directly.
   */
  function statusOf(err) {
    if (!err) { return undefined; }
    if (typeof err.status === 'number') { return err.status; }
    if (err.response && typeof err.response.status === 'number') {
      return err.response.status;
    }
    return undefined;
  }

  /**
   * Retry-After, in seconds, or undefined. The header lives in a different
   * place for each transport, so look in all of them rather than making every
   * call site pass an adapter.
   */
  function retryAfterSeconds(err) {
    var raw;
    var xhr = err && (err.xhr || (err.response && err.response.xhr));

    if (xhr && typeof xhr.getResponseHeader === 'function') {
      raw = xhr.getResponseHeader('Retry-After');
    }
    if (raw == null && err && err.response && err.response.getHeader) {
      raw = err.response.getHeader('Retry-After');
    }
    if (raw == null && err && err.headers && typeof err.headers.get === 'function') {
      raw = err.headers.get('Retry-After');
    }

    var n = parseInt(raw, 10);
    return (isFinite(n) && n >= 0) ? n : undefined;
  }

  /**
   * Base delay in seconds, before jitter.
   *
   * interactive: the server's figure, or exponential backoff from 2s when it
   * did not give one.
   *
   * unattended: the server's figure is a *floor*, not a target. Once we have
   * been shed repeatedly, our own history says the condition is persistent and
   * the server's per-request estimate is too optimistic, so escalate past it.
   */
  function baseDelaySeconds(attempt, serverSeconds, opts) {
    var fallback = 2 * (2 ** attempt);
    var base = serverSeconds !== undefined ? serverSeconds : fallback;

    if (opts.mode !== 'unattended') {
      return Math.max(base, MIN_DELAY_SECONDS);
    }

    var floor = attempt < UNATTENDED_FLOOR.length
      ? UNATTENDED_FLOOR[attempt]
      : opts.ceilingSeconds;

    return Math.min(
      Math.max(base, floor, MIN_DELAY_SECONDS),
      opts.ceilingSeconds
    );
  }

  function jitter(seconds) {
    return seconds * 1000 * (1 + Math.random() * 0.3);
  }

  function throttleError(lastError) {
    var err = new Error(BUSY_MESSAGE);
    err.isThrottled = true;
    err.status = statusOf(lastError);
    err.cause = lastError;
    return err;
  }

  /**
   * @param requestFn  function(attempt) -> promise. Called once per attempt;
   *                   must issue a *fresh* request each time.
   * @param options    see DEFAULTS. mode 'interactive' (default) stops after
   *                   maxRetries; 'unattended' holds at ceilingSeconds until
   *                   maxTotalWaitMs.
   * @returns promise, cancellable. Cancelling clears any pending retry timer
   *          and aborts the in-flight request.
   */
  return function retryRequest(requestFn, options) {
    var opts = {};
    var k;
    for (k in DEFAULTS) { opts[k] = DEFAULTS[k]; }
    for (k in (options || {})) { opts[k] = options[k]; }

    var cancelled = false;
    var timer = null;
    var inFlight = null;
    // Set once we publish /throttle/active, so we publish exactly one
    // balancing resolved/failed no matter how we exit.
    var announced = false;
    var totalWaited = 0;

    function settleThrottleState(topic) {
      if (announced) {
        announced = false;
        Topic.publish(topic);
      }
    }

    var deferred = new Deferred(function () {
      cancelled = true;
      if (timer) { clearTimeout(timer); timer = null; }
      // Do not escalate load on the way out: kill the in-flight attempt too.
      if (inFlight && typeof inFlight.cancel === 'function') {
        try { inFlight.cancel(); } catch (e) { /* already settled */ }
      }
      settleThrottleState('/throttle/resolved');
    });

    function attemptRequest(attempt) {
      if (cancelled) { return; }

      var promise;
      try {
        promise = requestFn(attempt);
      } catch (e) {
        deferred.reject(e);
        settleThrottleState('/throttle/resolved');
        return;
      }
      inFlight = promise;

      Promise.resolve(promise).then(function (result) {
        if (cancelled) { return; }
        inFlight = null;
        settleThrottleState('/throttle/resolved');
        deferred.resolve(result);
      }, function (err) {
        if (cancelled) { return; }
        inFlight = null;

        var status = statusOf(err);
        if (!RETRIABLE[status]) {
          // Not a shed request -- a real error. Surface it unchanged.
          settleThrottleState('/throttle/resolved');
          deferred.reject(err);
          return;
        }

        var interactive = opts.mode !== 'unattended';
        if (interactive && attempt >= opts.maxRetries) {
          settleThrottleState('/throttle/failed');
          deferred.reject(throttleError(err));
          return;
        }

        var waitMs = jitter(baseDelaySeconds(attempt, retryAfterSeconds(err), opts));

        if (!interactive && totalWaited + waitMs > opts.maxTotalWaitMs) {
          settleThrottleState('/throttle/failed');
          deferred.reject(throttleError(err));
          return;
        }
        totalWaited += waitMs;

        if (!announced) {
          announced = true;
          Topic.publish('/throttle/active', { label: opts.label });
        }
        Topic.publish('/throttle/retrying', {
          waitMs: waitMs,
          attempt: attempt + 1,
          label: opts.label
        });

        timer = setTimeout(function () {
          timer = null;
          attemptRequest(attempt + 1);
        }, waitMs);
      });
    }

    attemptRequest(0);
    return deferred.promise;
  };
});
