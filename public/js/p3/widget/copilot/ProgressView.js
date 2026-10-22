/**
 * ProgressView: renders a turn's progress steps in one of several shapes.
 *
 * Testing session 2026-10-16, #5: users wanted a better idea of what is
 * actually happening during a 1–3 minute turn.  The orchestrator now sends
 * structured steps (`progress` SSE events with step_id / phase / status /
 * label / detail / result / took_ms; bvbrc-agents shared/progress.py) and
 * the gateway stores them on the assistant message as agent_metadata.steps.
 * This module turns that one list into the chosen view, so the variants
 * can be compared and switched without touching the data path:
 *
 *   line       one replaced line (the old shape, with the new text)
 *   list       completed steps stay as rows; the current step is live at the bottom
 *   collapsed  one live line with a chevron that opens the rows
 *   timeline   list plus seconds per step, with model-call rows kept
 *
 * Everyone gets `collapsed` (Clark, 2026-10-22, after comparing the four).
 * The other variants stay in code: a per-browser override in localStorage
 * (`copilot-progress-style` = line | list | timeline) picks one, with no UI
 * for it; adding the option back is a dropdown that calls setVariant.
 *
 * UMD so the pure functions (mergeStep, rowsFor, summarize) run under jest.
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function() { return factory(root); });
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.CopilotProgressView = factory(root);
  }
}(typeof window !== 'undefined' ? window : this, function(root) {
  var STORAGE_KEY = 'copilot-progress-style';
  var DEFAULT_VARIANT = 'collapsed';
  var VARIANTS = [
    { id: 'line', label: 'Line', title: 'One line that changes as work proceeds' },
    { id: 'list', label: 'List', title: 'Finished steps stay visible; the current step is at the bottom' },
    { id: 'collapsed', label: 'Collapsed', title: 'One line; open the chevron to see the steps' },
    { id: 'timeline', label: 'Timeline', title: 'All steps with the seconds each one took' }
  ];
  var VARIANT_IDS = VARIANTS.map(function(v) { return v.id; });

  var listeners = [];
  var expanded = {};   // message_id -> true (collapsed variant / summary opened)
  var timers = {};     // node id -> interval for the live elapsed clock
  var timerSeq = 0;

  // ---------------------------------------------------------------------
  // Preference
  // ---------------------------------------------------------------------

  function getVariant() {
    try {
      var v = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (v && VARIANT_IDS.indexOf(v) >= 0) return v;
    } catch (e) { /* storage blocked */ }
    return DEFAULT_VARIANT;
  }

  function setVariant(v) {
    if (VARIANT_IDS.indexOf(v) < 0) return getVariant();
    try {
      if (root.localStorage) root.localStorage.setItem(STORAGE_KEY, v);
    } catch (e) { /* storage blocked */ }
    listeners.forEach(function(fn) {
      try { fn(v); } catch (err) { /* a listener must not break the others */ }
    });
    return v;
  }

  function onChange(fn) {
    listeners.push(fn);
    return function() { listeners = listeners.filter(function(f) { return f !== fn; }); };
  }

  // ---------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------

  /** Merge one step report into `steps` (same step_id updates in place). */
  function mergeStep(steps, step) {
    if (!step || typeof step !== 'object' || !step.step_id) return steps;
    var out = steps.slice();
    for (var i = 0; i < out.length; i++) {
      if (out[i].step_id === step.step_id) {
        out[i] = assign({}, out[i], step);
        return out;
      }
    }
    out.push(assign({}, step));
    return out;
  }

  /** The step to show as "now": the latest running one, else the latest. */
  function liveStep(steps) {
    if (!steps || !steps.length) return null;
    for (var i = steps.length - 1; i >= 0; i--) {
      if (steps[i].status === 'running') return steps[i];
    }
    return steps[steps.length - 1];
  }

  /** The rows a variant shows, in order. Transient notes are never rows. */
  function rowsFor(steps, variant) {
    var rows = (steps || []).filter(function(s) { return s && !s.transient && s.step_id; });
    if (variant === 'timeline') return rows;
    // list / collapsed: a finished model call is not a row (the tool rows
    // it led to say what it decided); the running one is the live row.
    return rows.filter(function(s) { return !(s.phase === 'thinking' && s.status !== 'running'); });
  }

  function summarize(steps, elapsedMs) {
    var rows = (steps || []).filter(function(s) { return s && !s.transient; });
    var tools = rows.filter(function(s) { return s.phase === 'tool'; });
    var errors = tools.filter(function(s) { return s.status === 'error'; }).length;
    var last = rows.length ? rows[rows.length - 1] : null;
    var ms = elapsedMs;
    if (ms == null && last) ms = (last.ts_ms || 0) + (last.took_ms || 0);
    return {
      lookups: tools.length,
      errors: errors,
      steps: rows.length,
      elapsed_ms: ms || 0,
      text: (tools.length ? plural(tools.length, 'lookup') : plural(rows.length, 'step')) +
            (ms ? ' · ' + formatDuration(ms) : '') +
            (errors ? ' · ' + plural(errors, 'error') : '')
    };
  }

  function formatDuration(ms) {
    if (ms == null || isNaN(ms)) return '';
    var s = Math.round(ms / 1000);
    if (s < 1) return '<1 s';
    if (s < 60) return s + ' s';
    var m = Math.floor(s / 60);
    return m + ' min ' + (s % 60) + ' s';
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
      }
    }
    return target;
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------------
  // Rendering (browser only)
  // ---------------------------------------------------------------------

  function el(tag, cls, html) {
    var node = root.document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function stepIcon(step) {
    if (step.status === 'running') return '<span class="pv-spinner" aria-hidden="true"></span>';
    if (step.status === 'error') return '<span class="pv-icon pv-icon-error" aria-label="error">!</span>';
    if (step.phase === 'note') return '<span class="pv-icon pv-icon-note" aria-hidden="true">·</span>';
    if (step.phase === 'thinking') return '<span class="pv-icon pv-icon-thinking" aria-hidden="true">◌</span>';
    return '<span class="pv-icon pv-icon-done" aria-label="done">✓</span>';
  }

  function rowHtml(step, withTiming) {
    var html = '<span class="pv-row-icon">' + stepIcon(step) + '</span>';
    html += '<span class="pv-row-text"><span class="pv-label">' + escapeHtml(step.label) + '</span>';
    if (step.result) {
      html += '<span class="pv-result"> — ' + escapeHtml(step.result) + '</span>';
    }
    if (step.detail) {
      html += '<span class="pv-detail">' + escapeHtml(step.detail) + '</span>';
    }
    html += '</span>';
    if (withTiming) {
      var t = step.status === 'running' ? '' : formatDuration(step.took_ms || 0);
      html += '<span class="pv-row-time">' + escapeHtml(t) + '</span>';
    }
    return html;
  }

  function renderRows(container, rows, withTiming) {
    var list = el('div', 'pv-rows');
    rows.forEach(function(step) {
      var row = el('div', 'pv-row pv-row-' + step.phase + ' pv-row-' + step.status, rowHtml(step, withTiming));
      list.appendChild(row);
    });
    container.appendChild(list);
    return list;
  }

  function renderLiveLine(container, step, fallbackText, agentLabel) {
    var line = el('div', 'pv-live');
    if (step) {
      line.innerHTML = '<span class="pv-row-icon">' + stepIcon(step) + '</span>' +
        '<span class="pv-row-text">' +
        (agentLabel ? '<span class="pv-agent">' + escapeHtml(agentLabel) + ' · </span>' : '') +
        '<span class="pv-label">' + escapeHtml(step.label) + '</span>' +
        (step.result ? '<span class="pv-result"> — ' + escapeHtml(step.result) + '</span>' : '') +
        (step.detail ? '<span class="pv-detail">' + escapeHtml(step.detail) + '</span>' : '') +
        '</span>';
    } else {
      line.innerHTML = '<span class="pv-row-icon"><span class="pv-spinner" aria-hidden="true"></span></span>' +
        '<span class="pv-row-text"><span class="pv-label">' + escapeHtml(fallbackText || 'Working…') + '</span></span>';
    }
    container.appendChild(line);
    return line;
  }

  function startClock(node, startedAt) {
    if (!startedAt || !root.setInterval) return;
    var id = 'pv' + (++timerSeq);
    node.setAttribute('data-pv-clock', id);
    function tick() {
      if (!node.isConnected) { clearInterval(timers[id]); delete timers[id]; return; }
      var clock = node.querySelector('.pv-clock');
      if (clock) clock.textContent = formatDuration(Date.now() - startedAt);
    }
    timers[id] = setInterval(tick, 1000);
  }

  /**
   * Render a live status card.
   * opts: { steps, variant, messageId, startedAt, fallbackText, live }
   */
  function render(node, opts) {
    opts = opts || {};
    var variant = opts.variant || getVariant();
    var steps = opts.steps || [];
    var messageId = opts.messageId || 'live';
    var live = liveStep(steps);
    var agentLabel = live && live.agent_label;
    var rows = rowsFor(steps, variant);
    var summary = summarize(steps, opts.startedAt ? Date.now() - opts.startedAt : null);

    node.innerHTML = '';
    var card = el('div', 'pv pv-' + variant + ' pv-live-card');

    var header = el('div', 'pv-header');
    header.appendChild(el('span', 'pv-title', 'Working on it'));
    header.appendChild(el('span', 'pv-clock', escapeHtml(formatDuration(summary.elapsed_ms))));
    card.appendChild(header);

    if (variant === 'line') {
      renderLiveLine(card, live, opts.fallbackText, agentLabel);
    } else if (variant === 'collapsed') {
      var open = !!expanded[messageId];
      var lineWrap = el('div', 'pv-collapsed-line');
      var chevron = el('button', 'pv-chevron' + (open ? ' pv-open' : ''), open ? '▾' : '▸');
      chevron.type = 'button';
      chevron.title = open ? 'Hide the steps' : 'Show the steps';
      chevron.setAttribute('aria-expanded', open ? 'true' : 'false');
      chevron.onclick = function() {
        expanded[messageId] = !expanded[messageId];
        render(node, opts);
      };
      lineWrap.appendChild(chevron);
      renderLiveLine(lineWrap, live, opts.fallbackText, agentLabel);
      lineWrap.appendChild(el('span', 'pv-count', escapeHtml(summary.text)));
      card.appendChild(lineWrap);
      if (open) renderRows(card, rows, false);
    } else {
      // list / timeline
      if (agentLabel) card.appendChild(el('div', 'pv-agent-line', escapeHtml(agentLabel)));
      if (rows.length) {
        renderRows(card, rows, variant === 'timeline');
      } else {
        renderLiveLine(card, live, opts.fallbackText, null);
      }
      if (variant === 'timeline' && live && live.status === 'running') {
        card.appendChild(el('div', 'pv-bar', '<span class="pv-bar-fill"></span>'));
      }
    }

    node.appendChild(card);
    startClock(node, opts.startedAt);
    return card;
  }

  /**
   * The "What I did" section under a finished assistant message, closed by
   * default.  opts: { steps, messageId, elapsedMs }
   */
  function renderSummary(node, opts) {
    opts = opts || {};
    var steps = (opts.steps || []).filter(function(s) { return s && !s.transient; });
    if (!steps.length) return null;
    var messageId = opts.messageId || 'summary';
    var open = !!expanded['summary:' + messageId];
    var summary = summarize(steps, opts.elapsedMs);

    node.innerHTML = '';
    var box = el('div', 'pv pv-summary' + (open ? ' pv-open' : ''));
    var head = el('button', 'pv-summary-head', '');
    head.type = 'button';
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    head.innerHTML = '<span class="pv-chevron">' + (open ? '▾' : '▸') + '</span>' +
      '<span class="pv-summary-title">What I did</span>' +
      '<span class="pv-count">' + escapeHtml(summary.text) + '</span>';
    head.onclick = function() {
      expanded['summary:' + messageId] = !expanded['summary:' + messageId];
      renderSummary(node, opts);
    };
    box.appendChild(head);
    if (open) renderRows(box, rowsFor(steps, 'timeline'), true);
    node.appendChild(box);
    return box;
  }

  return {
    VARIANTS: VARIANTS,
    STORAGE_KEY: STORAGE_KEY,
    DEFAULT_VARIANT: DEFAULT_VARIANT,
    getVariant: getVariant,
    setVariant: setVariant,
    onChange: onChange,
    mergeStep: mergeStep,
    liveStep: liveStep,
    rowsFor: rowsFor,
    summarize: summarize,
    formatDuration: formatDuration,
    escapeHtml: escapeHtml,
    render: render,
    renderSummary: renderSummary
  };
}));
