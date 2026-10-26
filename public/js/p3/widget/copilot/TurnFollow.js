/**
 * TurnFollow: keep the chat scrolled to the "working on it" progress while a
 * turn runs.
 *
 * Clark, 2026-10-26: after sending a message the progress card grew below the
 * visible area and users had to scroll down every time. CopilotDisplay
 * re-renders the whole list on every progress update and deliberately does
 * not follow new output (a long answer must not drag its first lines off
 * screen), so the turn itself switches following on:
 *
 *   - on ChatSession:TurnStarted the display scrolls to the bottom and
 *     follows every re-render;
 *   - it stops when the answer starts (answerStarted: the view is then on the
 *     answer's first lines, and stays there while it streams), when the user
 *     scrolls up on purpose (isScrollUpIntent + leaving the bottom), or when
 *     the turn ends.
 *
 * Pure functions, so they can be tested without a DOM.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function () { return factory(); });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CopilotTurnFollow = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {

  var USER_ROLES = { user: true, user_clarification: true };

  /**
   * True once the turn has produced something to read after the latest user
   * message: assistant text or a card (plan, questions, job question), as
   * opposed to the progress card (role "status").
   */
  function answerStarted(messages) {
    if (!Array.isArray(messages)) return false;
    var lastUser = -1;
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i] && USER_ROLES[messages[i].role]) { lastUser = i; break; }
    }
    for (var j = lastUser + 1; j < messages.length; j++) {
      var m = messages[j];
      if (!m || m.role !== 'assistant') continue;
      if ((m.content && String(m.content).trim()) || m.card || m.plan) return true;
    }
    return false;
  }

  var UP_KEYS = { ArrowUp: true, PageUp: true, Home: true };

  /**
   * True for input that means "I want to look further up": a wheel turned
   * up, an up / Page Up / Home key, Shift+Space, a touch (the swipe direction
   * is only known from the scroll that follows), or a press on the scrollbar.
   * The caller still checks that the view actually left the bottom.
   */
  function isScrollUpIntent(evt) {
    if (!evt || !evt.type) return false;
    switch (evt.type) {
      case 'wheel':
        return evt.deltaY < 0;
      case 'keydown':
        return !!UP_KEYS[evt.key] || (evt.key === ' ' && !!evt.shiftKey);
      case 'touchstart':
      case 'touchmove':
      case 'mousedown':
        return true;
      default:
        return false;
    }
  }

  return {
    answerStarted: answerStarted,
    isScrollUpIntent: isScrollUpIntent
  };
}));
