const fetch = require('node-fetch');

/**
 * Retry 429/503 responses from the Data API per its client contract,
 * BV-BRC-API Docs/CLIENT-429.md.
 *
 * The rule is not "retry on 429" -- it is back off by the amount the server
 * asked for, and give up rather than hammer. A client that retries a shed
 * request badly makes the overload worse at the moment the system has least
 * capacity to absorb it.
 *
 * This mirrors p3/util/retryRequest.js in BV-BRC-Web, deliberately duplicated
 * rather than imported: this package is standalone and has no AMD loader. Keep
 * the two in step -- honour Retry-After, jitter every wait, cap at 3 retries,
 * 429/503 only, floor at 1s.
 */

const RETRIABLE = { 429: true, 503: true };
const BUSY_MESSAGE =
  'The server is currently busy. Please try again in a few minutes.';

// The API floors Retry-After at 1s precisely because `Retry-After: 0` invites a
// tight retry loop, but a client must not depend on the server getting it right.
const MIN_DELAY_SECONDS = 1;

/**
 * Feature flag, matching BV-BRC-Web's `enableThrottleRetry` config. Read from
 * window.App when running in the browser, which is the only context where the
 * flag exists; outside a browser (tests, node consumers) retry is on, since
 * there is no deployment switch to consult.
 */
function enabled () {
  if (typeof window === 'undefined' || !window.App) { return true; }
  return !!window.App.enableThrottleRetry;
}

function retryAfterSeconds (response) {
  const raw = response.headers && typeof response.headers.get === 'function'
    ? response.headers.get('Retry-After')
    : null;
  const n = parseInt(raw, 10);
  return (Number.isFinite(n) && n >= 0) ? n : undefined;
}

function delayFor (attempt, response) {
  const server = retryAfterSeconds(response);
  // Exponential fallback from 2s when the server gave no usable figure.
  const base = server !== undefined ? server : 2 * (2 ** attempt);
  const seconds = Math.max(base, MIN_DELAY_SECONDS);
  // Jitter, so simultaneously-shed clients do not all return at the same
  // instant and reproduce the burst that caused the shedding.
  return seconds * 1000 * (1 + Math.random() * 0.3);
}

/**
 * Publish the same topics BV-BRC-Web's ThrottleBanner listens on, when running
 * inside that app. No-op anywhere else, so this package stays standalone.
 *
 * Without this the user sees a multi-second stall with no explanation, and on
 * exhaustion an empty panel -- the outcome the spec calls worst, because a user
 * who sees no data believes it is missing rather than deferred.
 */
function publish (topic, data) {
  try {
    if (typeof window !== 'undefined' && typeof window.require === 'function') {
      const topicModule = window.require('dojo/topic');
      if (topicModule && typeof topicModule.publish === 'function') {
        topicModule.publish(topic, data);
      }
    }
  } catch (e) {
    // dojo absent or not yet loaded; the retry itself still works.
  }
}

/**
 * fetch(), retrying 429 and 503 with backoff.
 *
 * 504 and 400 are deliberately not retried: a 504 means the query was too
 * expensive and retrying repeats the cost, and a 400 is a permanent refusal of
 * that query.
 *
 * @param {string} url
 * @param {object} options      passed through to fetch
 * @param {number} maxRetries   default 3, per the spec's interactive cap
 * @returns {Promise<Response>} the first non-shed response
 * @throws  {Error} with isThrottled=true and status, once retries are exhausted
 */
async function fetchWithBackoff (url, options, maxRetries = 3) {
  let attempt = 0;
  let announced = false;

  try {
    for (;;) {
      const response = await fetch(url, options);

      if (!RETRIABLE[response.status] || !enabled()) {
        return response;
      }

      if (attempt >= maxRetries) {
        const err = new Error(BUSY_MESSAGE);
        err.isThrottled = true;
        err.status = response.status;
        publish('/throttle/failed');
        announced = false;
        throw err;
      }

      const waitMs = delayFor(attempt, response);
      if (!announced) {
        announced = true;
        publish('/throttle/active', { label: String(url) });
      }
      publish('/throttle/retrying', { waitMs, attempt: attempt + 1, label: String(url) });

      attempt++;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  } finally {
    // Balance the banner's counter on every exit path -- success, a
    // non-retriable error, or a throw from fetch itself. An unbalanced counter
    // leaves the banner pinned open for the rest of the session.
    if (announced) { publish('/throttle/resolved'); }
  }
}

/**
 * Build an Error that preserves the HTTP status.
 *
 * The client previously threw `Error(response.statusText)`, discarding the
 * code. That is why 429 handling could not be bolted on from outside the
 * client: a caller saw only the string "Too Many Requests" with no status and
 * no Retry-After, so it could neither classify the failure nor honour the
 * server's backoff.
 */
function httpError (response) {
  const err = new Error(`${response.status} ${response.statusText}`);
  err.status = response.status;
  err.statusText = response.statusText;
  return err;
}

module.exports = { fetchWithBackoff, httpError };
