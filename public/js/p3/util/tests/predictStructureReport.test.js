/* eslint-env jest */
//
// Jobs page REPORT action for PredictStructure: when it shows and where it points.
//
// Loads the real helper (public/js/p3/util/predictStructureReport.js, a UMD module so
// it needs no Dojo) and the real encodePath through a minimal AMD define shim.
//
const fs = require('fs');
const path = require('path');

const R = require(path.resolve(__dirname, '..', 'predictStructureReport.js'));

let encodePath;
global.define = (deps, factory) => { encodePath = factory(); };
require(path.resolve(__dirname, '..', 'encodePath.js'));
delete global.define;

const job = (over) => Object.assign({
  app: 'PredictStructure',
  status: 'completed',
  parameters: { output_path: '/user@patricbrc.org/home/Structures', output_file: 'my fold' }
}, over);

describe('shouldShow', () => {
  test('completed PredictStructure job', () => {
    expect(R.shouldShow([job()])).toBe(true);
  });

  test.each(['failed', 'queued', 'in-progress', 'deleted'])('status %s', (status) => {
    expect(R.shouldShow([job({ status })])).toBe(false);
  });

  test('other app', () => {
    expect(R.shouldShow([job({ app: 'GenomeAssembly2' })])).toBe(false);
  });

  test('multi-select and empty selection', () => {
    expect(R.shouldShow([job(), job()])).toBe(false);
    expect(R.shouldShow([])).toBe(false);
    expect(R.shouldShow(undefined)).toBe(false);
  });

  // ActionBar calls every action's shouldShow; a throw here breaks all buttons.
  test('undefined row and null selection do not throw', () => {
    expect(R.shouldShow([undefined])).toBe(false);
    expect(R.shouldShow(null)).toBe(false);
  });
});

describe('reportPath', () => {
  test('hidden result folder under output_path', () => {
    expect(R.reportPath(job())).toBe('/user@patricbrc.org/home/Structures/.my fold/report.html');
  });

  test('trailing slash on output_path is not doubled', () => {
    const j = job({ parameters: { output_path: '/user@patricbrc.org/home/Structures/', output_file: 'x' } });
    expect(R.reportPath(j)).toBe('/user@patricbrc.org/home/Structures/.x/report.html');
  });

  test('encoded the way the workspace links are (username left decoded)', () => {
    expect('/workspace' + encodePath(R.reportPath(job())))
      .toBe('/workspace/user@patricbrc.org/home/Structures/.my%20fold/report.html');
  });

  test('null when output params are missing', () => {
    expect(R.reportPath(job({ parameters: {} }))).toBeNull();
    expect(R.reportPath(job({ parameters: undefined }))).toBeNull();
    expect(R.reportPath(undefined)).toBeNull();
  });
});

// Wiring in JobManager.js, read as text (as widget/app/tests/PredictStructure.entityRows.test.js
// does for PredictStructure.js): the helper tests above prove nothing if the action entry
// stops calling the helper.
describe('JobManager ViewPredictStructureReport wiring', () => {
  const jmSrc = fs.readFileSync(path.resolve(__dirname, '..', '..', 'widget', 'JobManager.js'), 'utf8');
  const start = jmSrc.search(/['"]ViewPredictStructureReport['"]/);
  const rest = start < 0 ? '' : jmSrc.slice(start);
  const end = rest.search(/\n\s*\]\s*,\s*\[\s*\n/);
  const block = end < 0 ? rest : rest.slice(0, end);

  const m = block.match(/(?:var|let|const)\s+(\w+)\s*=\s*predictStructureReport\s*\.\s*reportPath\s*\(/);
  const v = m ? m[1] : '__no_reportPath_var__';

  const openRe = 'window\\s*\\.\\s*open\\s*\\(\\s*[\'"]/workspace[\'"]\\s*\\+\\s*encodePath\\s*\\(\\s*'
    + v + '\\s*\\)\\s*,\\s*[\'"]_blank[\'"]\\s*\\)';
  const probeRe = 'when\\s*\\(\\s*WorkspaceManager\\s*\\.\\s*getObject\\s*\\(\\s*' + v + '\\s*,\\s*true\\s*\\)\\s*,'
    + '\\s*function\\s*\\(\\s*\\)\\s*\\{\\s*' + openRe + '\\s*;?\\s*\\}\\s*,';
  const notifyRe = '\\s*function\\s*\\(\\s*\\)\\s*\\{\\s*Topic\\s*\\.\\s*publish\\s*\\(\\s*[\'"]/Notification[\'"]\\s*,'
    + '\\s*\\{[^}]*type\\s*:\\s*[\'"]error[\'"]';

  test('entry exists', () => {
    expect(start).toBeGreaterThanOrEqual(0);
    expect(block).toMatch(/function\s*\(\s*selection\s*\)/);
  });

  test('visibility is delegated to the helper', () => {
    expect(block).toMatch(/shouldShow\s*:\s*predictStructureReport\s*\.\s*shouldShow\b/);
  });

  test('handler computes the path from the selected job', () => {
    expect(block).toMatch(/predictStructureReport\s*\.\s*reportPath\s*\(\s*selection\s*\[\s*0\s*\]\s*\)/);
  });

  test('handler checks the path is truthy before calling encodePath', () => {
    expect(m).not.toBeNull();
    const guard = block.search(new RegExp('if\\s*\\(\\s*' + v + '\\s*\\)\\s*\\{'));
    const enc = block.search(new RegExp('encodePath\\s*\\(\\s*' + v + '\\s*\\)'));
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(enc).toBeGreaterThan(guard);
  });

  test('handler probes the report, then opens /workspace + encodePath(path) in a new tab', () => {
    expect(m).not.toBeNull();
    expect(block).toMatch(new RegExp(probeRe));
  });

  test('handler notifies an error when the report is missing', () => {
    expect(m).not.toBeNull();
    expect(block).toMatch(new RegExp(probeRe + notifyRe));
  });

  test('handler does more than console.log', () => {
    const withoutLogs = block.replace(/console\s*\.\s*log\s*\([^)]*\)\s*;?/g, '');
    expect(withoutLogs).toMatch(/window\s*\.\s*open\s*\(/);
    expect(withoutLogs).toMatch(/reportPath\s*\(/);
  });

  test('when, WorkspaceManager, Topic, encodePath and the helper are imported under those names', () => {
    const hdr = jmSrc.match(/^define\(\[([\s\S]*?)\],\s*function\s*\(([\s\S]*?)\)\s*\{/);
    expect(hdr).not.toBeNull();
    const deps = hdr[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
    const params = hdr[2].split(',').map((s) => s.trim());
    expect(params.length).toBe(deps.length);
    expect(params[deps.indexOf('dojo/when')]).toBe('when');
    expect(params[deps.indexOf('../WorkspaceManager')]).toBe('WorkspaceManager');
    expect(params[deps.indexOf('dojo/topic')]).toBe('Topic');
    expect(params[deps.indexOf('../util/encodePath')]).toBe('encodePath');
    expect(params[deps.indexOf('../util/predictStructureReport')]).toBe('predictStructureReport');
  });
});
