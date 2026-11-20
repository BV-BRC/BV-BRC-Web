/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * copyToClipboard.js is an AMD module. The suite runs in the "node" jest
 * environment (jest.config.json) with no jsdom, so rather than add a
 * dependency for one file we inject a small fake DOM: the module only
 * touches `document`, `navigator` and the dom-construct stub below.
 *
 * The bug these tests exist for is a FALSE SUCCESS -- a copy helper that
 * reports it copied when nothing reached the clipboard. That shipped twice
 * in two different shapes, so both are pinned here.
 */

/** Minimal element good enough for the module's textarea dance. */
function makeElement(tag) {
  return {
    tagName: String(tag).toUpperCase(),
    value: '',
    style: { cssText: '' },
    parentNode: null,
    children: [],
    selectionStart: 0,
    selectionEnd: 0,
    _focused: false,
    appendChild: function (c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild: function (c) {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
      c.parentNode = null;
      return c;
    },
    contains: function (n) {
      for (let p = n; p; p = p.parentNode) { if (p === this) return true; }
      return false;
    },
    closest: function (sel) {
      const want = sel.replace(/^\./, '');
      for (let p = this; p; p = p.parentNode) {
        if (p.className && String(p.className).split(/\s+/).indexOf(want) >= 0) return p;
      }
      return null;
    },
    focus: function () { this._doc.activeElement = this; },
    select: function () {
      this._doc.activeElement = this;
      this.selectionStart = 0;
      this.selectionEnd = String(this.value).length;
    },
    setSelectionRange: function (s, e) { this.selectionStart = s; this.selectionEnd = e; }
  };
}

function makeDom() {
  const doc = {};
  const body = makeElement('body');
  body._doc = doc;
  doc.body = body;
  doc.activeElement = body;
  doc._dialogs = [];
  doc.querySelectorAll = function (sel) {
    return sel === '.dijitDialog' ? doc._dialogs.slice() : [];
  };
  doc.createElement = function (tag) {
    const el = makeElement(tag);
    el._doc = doc;
    return el;
  };
  // Default: a browser where copying genuinely works.
  doc.execCommand = jest.fn(function () {
    const a = doc.activeElement;
    return !!(a && a.tagName === 'TEXTAREA' && a.selectionEnd - a.selectionStart > 0);
  });
  return doc;
}

function loadCopyToClipboard(doc, nav) {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'copyToClipboard.js'), 'utf8');
  let exported;
  const stubs = {
    'dojo/Deferred': function Deferred() {
      this.promise = new Promise((resolve) => { this._resolve = resolve; });
      this.resolve = (v) => this._resolve(v);
    },
    'dojo/dom-construct': {
      create: (tag, attrs, parent) => {
        const el = doc.createElement(tag);
        Object.keys(attrs || {}).forEach((k) => {
          if (k === 'style') { el.style.cssText = attrs[k]; } else { el[k] = attrs[k]; }
        });
        (parent || doc.body).appendChild(el);
        return el;
      },
      destroy: (el) => { if (el && el.parentNode) el.parentNode.removeChild(el); }
    }
  };
  const define = function (deps, factory) {
    exported = factory.apply(null, deps.map((d) => stubs[d]));
  };
  // eslint-disable-next-line no-new-func
  new Function('define', 'document', 'navigator', src)(define, doc, nav);
  return exported;
}

/** Collect every textarea still parented anywhere in the tree. */
function countTextareas(node) {
  let n = node.tagName === 'TEXTAREA' ? 1 : 0;
  node.children.forEach((c) => { n += countTextareas(c); });
  return n;
}

describe('copyToClipboard', () => {
  test('reports true when the synchronous copy succeeds', async () => {
    const doc = makeDom();
    const copy = loadCopyToClipboard(doc, {});
    await expect(copy('hello')).resolves.toBe(true);
    expect(doc.execCommand).toHaveBeenCalledWith('copy');
  });

  test('THE BUG: a rejected async write must report FAILURE, not success', async () => {
    // The original helper fired writeText, swallowed the rejection with an
    // empty handler and returned true regardless -- so the button said
    // "copied" while the clipboard still held the previous contents.
    const doc = makeDom();
    doc.execCommand = jest.fn(() => false);
    const nav = {
      clipboard: {
        writeText: () => Promise.reject(
          new Error('NotAllowedError: Write permission denied.'))
      }
    };
    const copy = loadCopyToClipboard(doc, nav);
    await expect(copy('never lands')).resolves.toBe(false);
  });

  test('falls back to the async API when execCommand fails', async () => {
    const doc = makeDom();
    doc.execCommand = jest.fn(() => false);
    const writeText = jest.fn(() => Promise.resolve());
    const copy = loadCopyToClipboard(doc, { clipboard: { writeText } });
    await expect(copy('rescued')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('rescued');
  });

  test('the synchronous path runs FIRST, keeping the user gesture alive', async () => {
    // Safari only honours execCommand inside the gesture, and awaiting the
    // async API ends it -- so writeText must not be reached when the
    // synchronous copy already worked.
    const doc = makeDom();
    const writeText = jest.fn(() => Promise.resolve());
    const copy = loadCopyToClipboard(doc, { clipboard: { writeText } });
    await expect(copy('sync wins')).resolves.toBe(true);
    expect(writeText).not.toHaveBeenCalled();
  });

  test('execCommand throwing is a failure, not an exception', async () => {
    const doc = makeDom();
    doc.execCommand = jest.fn(() => { throw new Error('boom'); });
    const nav = { clipboard: { writeText: () => Promise.reject(new Error('no')) } };
    const copy = loadCopyToClipboard(doc, nav);
    await expect(copy('x')).resolves.toBe(false);
  });

  test('empty input reports false and copies nothing', async () => {
    const doc = makeDom();
    const writeText = jest.fn(() => Promise.resolve());
    const copy = loadCopyToClipboard(doc, { clipboard: { writeText } });
    await expect(copy('')).resolves.toBe(false);
    expect(doc.execCommand).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  test('no clipboard support at all reports false', async () => {
    const doc = makeDom();
    doc.execCommand = jest.fn(() => false);
    const copy = loadCopyToClipboard(doc, {});
    await expect(copy('x')).resolves.toBe(false);
  });

  test('execCommand claiming success with no selection is not believed', async () => {
    // Observed in Chrome: when focus never reaches the textarea,
    // execCommand('copy') still returns TRUE having copied an empty
    // selection. Trusting that return value is how the button reported
    // success with the clipboard untouched, so the selection is checked
    // independently.
    const doc = makeDom();
    doc.execCommand = jest.fn(() => true);          // the lie
    const writeText = jest.fn(() => Promise.reject(new Error('denied')));
    const copy = loadCopyToClipboard(doc, { clipboard: { writeText } });

    // Something else holds focus and will not give it up.
    const thief = doc.createElement('select');
    doc.body.appendChild(thief);
    doc.createElement = function (tag) {
      const el = makeElement(tag);
      el._doc = doc;
      if (String(tag).toLowerCase() === 'textarea') {
        el.focus = function () { /* focus refused */ };
        el.select = function () { /* selection refused */ };
      }
      return el;
    };
    doc.activeElement = thief;

    await expect(copy('should not be trusted')).resolves.toBe(false);
  });

  test('the scratch textarea is cleaned up on success and on failure', async () => {
    const okDoc = makeDom();
    await loadCopyToClipboard(okDoc, {})('fine');
    expect(countTextareas(okDoc.body)).toBe(0);

    const badDoc = makeDom();
    badDoc.execCommand = jest.fn(() => { throw new Error('boom'); });
    await loadCopyToClipboard(badDoc, {})('fails');
    expect(countTextareas(badDoc.body)).toBe(0);
  });

  /**
   * A dijit modal Dialog contains focus: a textarea appended to
   * document.body sits outside it and has focus pulled straight back, so
   * .select() leaves activeElement on the dialog. execCommand then returns
   * TRUE having copied an empty selection -- the wizard's Copy curl button
   * reported success and copied nothing. Hosting the textarea inside the
   * dialog is the fix.
   */
  describe('inside a dijit modal dialog', () => {
    function domWithDialog() {
      const doc = makeDom();
      const dlg = doc.createElement('div');
      dlg.className = 'dijitDialog';
      doc.body.appendChild(dlg);
      doc._dialogs.push(dlg);

      const sel = doc.createElement('select');
      dlg.appendChild(sel);
      doc.activeElement = sel;

      // Model dijit focus containment.
      doc.execCommand = jest.fn(function () {
        const a = doc.activeElement;
        return !!(a && a.tagName === 'TEXTAREA' && dlg.contains(a)
          && a.selectionEnd - a.selectionStart > 0);
      });
      return { doc, dlg };
    }

    test('hosts the textarea in the dialog, so the copy really happens', async () => {
      const { doc, dlg } = domWithDialog();
      let created = null;
      const origCreate = doc.createElement;
      doc.createElement = function (tag) {
        const el = origCreate.call(doc, tag);
        if (String(tag).toLowerCase() === 'textarea') created = el;
        return el;
      };

      // Record where it was parented before cleanup detaches it.
      let hostedInDialog = null;
      const origExec = doc.execCommand;
      doc.execCommand = jest.fn(function (cmd) {
        hostedInDialog = created ? dlg.contains(created) : false;
        return origExec.call(doc, cmd);
      });

      const copy = loadCopyToClipboard(doc, {});
      const ok = await copy('curl ...');

      expect(created).not.toBeNull();
      expect(hostedInDialog).toBe(true);
      expect(ok).toBe(true);
      expect(doc.execCommand).toHaveBeenCalledWith('copy');
    });

    test('restores focus to whatever had it before', async () => {
      const doc = domWithDialog().doc;
      const before = doc.activeElement;
      await loadCopyToClipboard(doc, {})('curl ...');
      expect(doc.activeElement).toBe(before);
    });
  });
});
