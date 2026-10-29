/**
 * joinTooBroad: recognise the Data API's `join_too_broad` rejection and turn it into
 * something a user can act on.
 *
 * Contract: `p3_api/Docs/CLIENT-join-too-broad.md`. When a `genome(...)` filter matches
 * more genomes than the server will join, the request is refused **before** Solr sees it:
 *
 *   HTTP 400  { status, error: "join_too_broad", message, genomeCount, limit, taxonId? }
 *
 * Without this, a shed query renders as `1 - 1 of 0 results` — indistinguishable from a
 * legitimate empty result, so the user concludes their data is missing. That is the same
 * failure the 429 work had to fix (see util/retryRequest.js); this is the 400 analogue.
 *
 * Three different things fail a broad-taxon request and they want different UI:
 *
 *   | too broad   | 400 | < 2 s  | error: "join_too_broad"            |
 *   | cold join   | 500 | ~120 s | message has "timed out after …ms"  |
 *   | admission   | 429 | < 1 s  | Retry-After header -> retryRequest |
 *
 * Only the first means "narrow your filter". Telling a user to narrow a query that merely
 * timed out sends them to fix something that is not wrong.
 */
define([], function () {

  // Matches the API's own wording. Used ONLY as a fallback for deployments predating the
  // structured fields — branch on `error` whenever it is present.
  var PROSE_RE = /too many to process|matches [\d,]+ genomes/i;
  var TIMEOUT_RE = /timed out after \d+\s*ms/i;

  /** Pull the JSON body out of whatever the transport rejected with. */
  function bodyOf(err) {
    if (!err) { return null; }
    // dojo/request rejects with a RequestError carrying .response
    var r = err.response;
    if (r) {
      if (r.data && typeof r.data === 'object') { return r.data; }
      if (typeof r.text === 'string') {
        try { return JSON.parse(r.text); } catch (e) { /* not JSON */ }
      }
    }
    // dojo/_base/xhr copies the body onto the error as responseText (xhr.js:630)
    if (typeof err.responseText === 'string') {
      try { return JSON.parse(err.responseText); } catch (e) { /* not JSON */ }
    }
    if (err.data && typeof err.data === 'object') { return err.data; }
    return null;
  }

  function statusOf(err) {
    if (!err) { return undefined; }
    if (typeof err.status === 'number') { return err.status; }
    if (err.response && typeof err.response.status === 'number') { return err.response.status; }
    return undefined;
  }

  /**
   * @returns {object|null} `{ genomeCount, limit, taxonId, message, overshoot }` when the
   *   error is a join_too_broad rejection, else null. Numeric fields may be undefined on
   *   deployments that predate the structured error body — callers must tolerate that and
   *   fall back to `message`.
   */
  function parse(err) {
    if (statusOf(err) !== 400) { return null; }

    var body = bodyOf(err);
    if (!body) { return null; }

    // Prefer the structured code. The prose check exists only because the fields were
    // added after the message was already in production (the contract notes the message
    // is unchanged, so prose-only deployments still work).
    var isJoinTooBroad = body.error === 'join_too_broad'
      || (body.error === undefined && typeof body.message === 'string' && PROSE_RE.test(body.message));
    if (!isJoinTooBroad) { return null; }

    var count = typeof body.genomeCount === 'number' ? body.genomeCount : undefined;
    // Read the limit from the response; it is server config and is hot-reloaded, so a
    // hardcoded copy would drift silently.
    var limit = typeof body.limit === 'number' ? body.limit : undefined;

    return {
      genomeCount: count,
      limit: limit,
      // Optional: absent when the filter was not purely taxonomic (e.g. genome_status).
      taxonId: body.taxonId !== undefined && body.taxonId !== null ? String(body.taxonId) : undefined,
      message: body.message,
      overshoot: (count && limit) ? (count / limit) : undefined
    };
  }

  function isJoinTooBroad(err) {
    return parse(err) !== null;
  }

  /**
   * True for the 500-at-120s cold-join failure, which looks similar to a user but is a
   * different defect — narrowing is not the fix, retrying is.
   */
  function isJoinTimeout(err) {
    if (statusOf(err) !== 500) { return false; }
    var body = bodyOf(err);
    var msg = (body && body.message) || (err && err.message) || '';
    return TIMEOUT_RE.test(String(msg));
  }

  function formatCount(n) {
    if (typeof n !== 'number' || !isFinite(n)) { return ''; }
    return n.toLocaleString ? n.toLocaleString('en-US') : String(n);
  }

  /**
   * Headline scaled to the overshoot. At 1.1x "narrow slightly" is apt; at 100x the honest
   * advice is "pick a species" — telling someone to narrow Viruses *slightly* wastes their
   * next three attempts.
   */
  function describe(info) {
    if (!info) { return ''; }
    if (info.genomeCount === undefined || info.limit === undefined) {
      // Pre-structured-fields deployment: the server's own sentence is all we have, and
      // the contract says it is safe to display verbatim.
      return info.message || 'This query matches too many genomes to summarise here.';
    }

    var count = formatCount(info.genomeCount);
    var over = info.overshoot;
    var advice;
    if (over > 20) {
      advice = 'Choose a specific species or genus to see results here.';
    } else if (over > 3) {
      advice = 'Narrow the filter substantially — try a genus or species.';
    } else {
      advice = 'Narrow the filter a little and this view will work.';
    }
    return 'This query matches ' + count + ' genomes, more than this view can summarise (limit '
      + formatCount(info.limit) + '). ' + advice;
  }

  return {
    parse: parse,
    isJoinTooBroad: isJoinTooBroad,
    isJoinTimeout: isJoinTimeout,
    describe: describe,
    formatCount: formatCount
  };
});
