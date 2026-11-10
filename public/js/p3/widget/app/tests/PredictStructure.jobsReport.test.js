/* eslint-env jest */
//
// Jobs page REPORT action for PredictStructure: when it shows and where it points.
//
// Loads the real helper (public/js/p3/util/predictStructureReport.js, a UMD module so
// it needs no Dojo) and the real encodePath through a minimal AMD define shim.
//
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
