/**
 * ThrottleBanner: a truthful busy state while Data API requests are being
 * retried after a 429/503.
 *
 * The API's client contract (BV-BRC-API/Docs/CLIENT-429.md) is explicit that a
 * shed request must not be reported as a failed query, a network error, or an
 * empty result set -- "the last of these is the worst outcome: a user who sees
 * zero rows will believe their data is missing." A grid whose query was shed
 * renders exactly that way (observed: "1 - 1 of 0 results"), so something has
 * to say otherwise, and it cannot be the grid alone.
 *
 * Driven entirely by the /throttle/* topics retryRequest publishes, so it has
 * no coupling to any store, grid or transport. retryRequest guarantees one
 * closing event per opening one on every exit path, including cancel, which is
 * what keeps the counter from drifting and pinning the banner open.
 */
define([
  'dojo/topic', 'dojo/dom-construct', 'dojo/dom-class'
], function (Topic, domConstruct, domClass) {

  var RESOLVED_LINGER_MS = 2500;

  var node = null;
  var textNode = null;
  var active = 0;       // requests currently backing off
  var failed = 0;       // requests that exhausted their retries
  var countdownTimer = null;
  var hideTimer = null;
  var secondsLeft = 0;

  function ensureNode() {
    if (node) { return node; }
    node = domConstruct.create('div', {
      className: 'ThrottleBanner',
      role: 'status',
      'aria-live': 'polite'
    });
    textNode = domConstruct.create('span', { className: 'ThrottleBannerText' }, node);
    domConstruct.place(node, document.body);
    return node;
  }

  function render(message, isFailure) {
    ensureNode();
    textNode.innerHTML = '';
    textNode.appendChild(document.createTextNode(message));
    domClass.toggle(node, 'ThrottleBannerFailed', !!isFailure);
    domClass.add(node, 'ThrottleBannerVisible');
  }

  function hide() {
    if (node) { domClass.remove(node, 'ThrottleBannerVisible'); }
  }

  function clearTimers() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  function activeMessage() {
    if (secondsLeft > 0) {
      return 'The server is busy. Retrying in ' + secondsLeft
        + (secondsLeft === 1 ? ' second' : ' seconds') + '…';
    }
    return 'The server is busy. Retrying…';
  }

  function update() {
    if (active > 0) {
      render(activeMessage(), false);
      return;
    }
    if (failed > 0) {
      // Stays until the next activity: unlike the retrying state, this one is
      // a thing the user has to act on.
      render('The server is currently busy. Please try again in a few minutes.', true);
      return;
    }
    // Everything recovered. Linger briefly so a fast recovery is still legible
    // rather than a flash.
    hideTimer = setTimeout(hide, RESOLVED_LINGER_MS);
  }

  /**
   * A silent pause reads as a hang, so count down rather than just asserting
   * that something is happening. Tracks the longest outstanding wait.
   */
  function startCountdown(waitMs) {
    var candidate = Math.ceil(waitMs / 1000);
    if (candidate > secondsLeft) { secondsLeft = candidate; }

    if (countdownTimer) { return; }
    countdownTimer = setInterval(function () {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        secondsLeft = 0;
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      if (active > 0) { render(activeMessage(), false); }
    }, 1000);
  }

  return {
    /** Idempotent: safe to call more than once during app startup. */
    start: function () {
      if (this._started) { return; }
      this._started = true;

      Topic.subscribe('/throttle/active', function () {
        active++;
        failed = 0;          // new activity supersedes a stale failure notice
        clearTimers();
        update();
      });

      Topic.subscribe('/throttle/retrying', function (data) {
        if (data && data.waitMs) { startCountdown(data.waitMs); }
        if (active > 0) { render(activeMessage(), false); }
      });

      Topic.subscribe('/throttle/resolved', function () {
        active = Math.max(0, active - 1);
        if (active === 0) { secondsLeft = 0; }
        clearTimers();
        update();
      });

      Topic.subscribe('/throttle/failed', function () {
        active = Math.max(0, active - 1);
        failed++;
        if (active === 0) { secondsLeft = 0; }
        clearTimers();
        update();
      });
    },

    // For tests.
    _state: function () {
      return { active: active, failed: failed, secondsLeft: secondsLeft };
    }
  };
});
