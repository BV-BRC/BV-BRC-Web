/* eslint-env jest */
//
// Jobs page REPORT action for PredictStructure: when it shows and where it points.
//
// Loads the real helper (public/js/p3/util/predictStructureReport.js, a UMD module so
// it needs no Dojo) and the real encodePath through a minimal AMD define shim.
//
const fs = require('fs');
const path = require('path');

const R = require(path.resolve(__dirname, '..', '..', '..', 'util', 'predictStructureReport.js'));

let encodePath;
global.define = (deps, factory) => { encodePath = factory(); };
require(path.resolve(__dirname, '..', '..', '..', 'util', 'encodePath.js'));
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

// Wiring in JobManager.js, read as text (as PredictStructure.entityRows.test.js does
// for PredictStructure.js): the helper tests above prove nothing if the action entry
// stops calling the helper.
describe('JobManager ViewPredictStructureReport wiring', () => {
  const jmSrc = fs.readFileSync(path.resolve(__dirname, '..', '..', 'JobManager.js'), 'utf8');
  const start = jmSrc.search(/['"]ViewPredictStructureReport['"]/);
  const rest = start < 0 ? '' : jmSrc.slice(start);
  const end = rest.search(/\n\s*\]\s*,\s*\[\s*\n/);
  const block = end < 0 ? rest : rest.slice(0, end);

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

  test('handler opens /workspace + encodePath(reportPath) in a new tab', () => {
    const m = block.match(/(?:var|let|const)\s+(\w+)\s*=\s*predictStructureReport\s*\.\s*reportPath\s*\(/);
    expect(m).not.toBeNull();
    const re = new RegExp('window\\s*\\.\\s*open\\s*\\(\\s*[\'"]/workspace[\'"]\\s*\\+\\s*encodePath\\s*\\(\\s*' +
      m[1] + '\\s*\\)\\s*,\\s*[\'"]_blank[\'"]\\s*\\)');
    expect(block).toMatch(re);
  });

  test('handler does more than console.log', () => {
    const withoutLogs = block.replace(/console\s*\.\s*log\s*\([^)]*\)\s*;?/g, '');
    expect(withoutLogs).toMatch(/window\s*\.\s*open\s*\(/);
    expect(withoutLogs).toMatch(/reportPath\s*\(/);
  });
});
