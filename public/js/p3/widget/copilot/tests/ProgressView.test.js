/* eslint-env jest */
// ProgressView: the pure parts (merge, rows per variant, summary, preference).
// Rendering needs a DOM and is checked in the browser.
const path = require('path');

const PV = require(path.join(__dirname, '..', 'ProgressView.js'));

const running = { step_id: 't1', phase: 'tool', status: 'running', label: 'Searching genome', detail: 'genus: Vibrio', ts_ms: 1200, agent_label: 'Searching BV-BRC data' };
const done = { step_id: 't1', status: 'done', result: '4,321 found', took_ms: 900, ts_ms: 2100 };
const think = { step_id: 'm1', phase: 'thinking', status: 'done', label: 'Reading the results', took_ms: 8000, ts_ms: 1100 };
const note = { step_id: 'n1', phase: 'note', status: 'done', label: 'Done.', transient: true, ts_ms: 2200 };

describe('mergeStep', () => {
  test('a later report with the same step_id updates in place', () => {
    const steps = PV.mergeStep(PV.mergeStep([], running), done);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ phase: 'tool', status: 'done', label: 'Searching genome', detail: 'genus: Vibrio', result: '4,321 found', took_ms: 900 });
  });
  test('ignores junk and never mutates the input', () => {
    const a = [running];
    expect(PV.mergeStep(a, null)).toBe(a);
    expect(PV.mergeStep(a, { label: 'no id' })).toBe(a);
    const b = PV.mergeStep(a, done);
    expect(a[0].status).toBe('running');
    expect(b[0].status).toBe('done');
  });
});

describe('liveStep and rowsFor', () => {
  const steps = [think, running, note];
  test('the live step is the latest running one, else the latest', () => {
    expect(PV.liveStep(steps).step_id).toBe('t1');
    expect(PV.liveStep([think, note]).step_id).toBe('n1');
    expect(PV.liveStep([])).toBeNull();
  });
  test('list and collapsed hide finished model calls and transient notes', () => {
    expect(PV.rowsFor(steps, 'list').map(s => s.step_id)).toEqual(['t1']);
    expect(PV.rowsFor(steps, 'collapsed').map(s => s.step_id)).toEqual(['t1']);
    const runningThink = { ...think, status: 'running' };
    expect(PV.rowsFor([runningThink], 'list').map(s => s.step_id)).toEqual(['m1']);
  });
  test('timeline keeps model calls, still no transient notes', () => {
    expect(PV.rowsFor(steps, 'timeline').map(s => s.step_id)).toEqual(['m1', 't1']);
  });
});

describe('summarize and formatDuration', () => {
  test('counts lookups and errors, times from the last step', () => {
    const steps = [think, { ...running, ...done }, { step_id: 't2', phase: 'tool', status: 'error', label: 'Reading x', ts_ms: 3000, took_ms: 200 }, note];
    const s = PV.summarize(steps);
    expect(s).toMatchObject({ lookups: 2, errors: 1, steps: 3, elapsed_ms: 3200 });
    expect(s.text).toBe('2 lookups · 3 s · 1 error');
    expect(PV.summarize([think], 65000).text).toBe('1 step · 1 min 5 s');
  });
  test('durations', () => {
    expect(PV.formatDuration(400)).toBe('<1 s');
    expect(PV.formatDuration(12400)).toBe('12 s');
    expect(PV.formatDuration(125000)).toBe('2 min 5 s');
    expect(PV.formatDuration(null)).toBe('');
  });
});

describe('preference', () => {
  test('defaults to collapsed without storage, accepts only known variants, notifies listeners', () => {
    expect(PV.getVariant()).toBe('collapsed');
    expect(PV.VARIANTS.map(v => v.id)).toEqual(['line', 'list', 'collapsed', 'timeline']);
    const seen = [];
    const off = PV.onChange(v => seen.push(v));
    expect(PV.setVariant('timeline')).toBe('timeline');
    expect(PV.setVariant('nope')).toBe('collapsed');  // unchanged (no storage here)
    off();
    PV.setVariant('line');
    expect(seen).toEqual(['timeline']);
  });
});

test('escapeHtml', () => {
  expect(PV.escapeHtml('<b>"x" & \'y\'</b>')).toBe('&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
});
