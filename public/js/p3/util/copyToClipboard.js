define([
  'dojo/Deferred',
  'dojo/dom-construct'
], function (Deferred, domConstruct) {

  /**
   * Copy text to the clipboard, reporting whether it actually worked.
   *
   * Two things make this less trivial than it looks, and both were got
   * wrong by hand-rolled copies in the download wizard and the
   * saved-search browser before this module existed:
   *
   * 1. navigator.clipboard.writeText REJECTS in plenty of ordinary
   *    situations -- an insecure context, a denied permission, a window
   *    that is not focused, Safari outside a user gesture. Swallowing
   *    that rejection and reporting success is how a Copy button comes to
   *    claim it copied while the clipboard still holds whatever was there
   *    before.
   *
   * 2. The async API cannot be awaited and then fallen back on in Safari:
   *    document.execCommand('copy') only works inside the user gesture
   *    that triggered it, and awaiting a promise ends that gesture. So
   *    the synchronous fallback has to run FIRST, with the async API as
   *    the upgrade -- not the other way round.
   *
   * Hence: try execCommand synchronously; if it works, done. Only if it
   * fails reach for navigator.clipboard, whose rejection is then
   * genuinely a failure and reported as one.
   *
   * @param {string} text
   * @returns {Promise<boolean>} resolves true when the text is on the
   *   clipboard, false when it is not. Never rejects -- callers show a
   *   message either way.
   */
  /**
   * Where to put the scratch textarea.
   *
   * A dijit modal Dialog contains focus: focus landing on a node outside
   * the dialog is yanked straight back. A textarea appended to
   * document.body is outside it, so .select() silently fails to focus and
   * execCommand('copy') then returns TRUE having copied an empty
   * selection -- a false success, which is the whole failure mode this
   * module exists to avoid. So host the textarea inside the open dialog
   * when there is one.
   */
  function copyHost() {
    var active = document.activeElement;
    var dlg = active && active.closest
      ? active.closest('.dijitDialog')
      : null;
    if (!dlg) {
      // No focus inside a dialog; fall back to the topmost open one.
      var open = document.querySelectorAll('.dijitDialog');
      if (open.length) { dlg = open[open.length - 1]; }
    }
    return dlg || document.body;
  }

  function execCommandCopy(text) {
    var ta;
    var previous = document.activeElement;
    try {
      ta = domConstruct.create('textarea', {
        value: text,
        readonly: 'readonly',
        // Off-screen rather than display:none -- a hidden element cannot
        // be selected, and iOS scrolls to a visible one.
        style: 'position:fixed;top:0;left:-9999px;opacity:0'
      }, copyHost());

      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);

      // execCommand reports success even when nothing was selected, so
      // confirm the textarea actually holds the selection first.
      var selected = document.activeElement === ta
        && ta.selectionEnd - ta.selectionStart === text.length;

      var ok = selected && document.execCommand('copy');
      domConstruct.destroy(ta);

      if (previous && previous.focus) { previous.focus(); }
      return !!ok;
    } catch (e) {
      if (ta) {
        try { domConstruct.destroy(ta); } catch (e2) { /* already gone */ }
      }
      return false;
    }
  }

  return function copyToClipboard(text) {
    var def = new Deferred();

    if (text === null || text === undefined || text === '') {
      def.resolve(false);
      return def.promise;
    }

    // Synchronous first, so the user gesture is still live.
    if (execCommandCopy(text)) {
      def.resolve(true);
      return def.promise;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { def.resolve(true); },
        function (err) {
          // A real failure: say so rather than claiming success.
          console.warn('copyToClipboard: clipboard write failed', err);
          def.resolve(false);
        }
      );
      return def.promise;
    }

    def.resolve(false);
    return def.promise;
  };
});
