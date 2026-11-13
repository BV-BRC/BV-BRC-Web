/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * UnifiedDownloadWizard: capturing the on-screen step before building a spec.
 *
 * `stepData` is only written when a step is left (Next) or when Download is
 * pressed, so the step the user is looking at holds edits `stepData` has not
 * seen. Copy curl built its spec straight from `stepData` and therefore
 * emitted the *previous* configuration -- for a tabular download that meant
 * no `select()` clause at all, so the copied command silently fetched every
 * column instead of the chosen ones.
 *
 * `_captureCurrentStep()` is the fix, and both buttons call it. These tests
 * run the real implementation, lifted out of the source, so the methods
 * cannot drift from what is asserted here.
 */

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'UnifiedDownloadWizard.js'), 'utf8'
);

/**
 * Extract a method body from the declare({...}) literal and turn it into a
 * callable. Keeps the test bound to the shipped code rather than a copy.
 */
function extractMethod(name) {
  const start = SRC.indexOf('\n    ' + name + ': function (');
  if (start < 0) throw new Error('method not found in source: ' + name);

  const openParen = SRC.indexOf('(', start);
  const argsEnd = SRC.indexOf(')', openParen);
  const args = SRC.slice(openParen + 1, argsEnd).trim();

  const bodyStart = SRC.indexOf('{', argsEnd) + 1;
  let depth = 1;
  let i = bodyStart;
  while (i < SRC.length && depth > 0) {
    const c = SRC.charAt(i);
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  const body = SRC.slice(bodyStart, i - 1);

  // eslint-disable-next-line no-new-func
  return new Function(args, body);
}

const captureCurrentStep = extractMethod('_captureCurrentStep');

/** A wizard stand-in with just the state _captureCurrentStep touches. */
function makeWizard(steps, currentStepIndex, stepData) {
  return {
    steps: steps,
    currentStepIndex: currentStepIndex === undefined ? 0 : currentStepIndex,
    stepData: stepData || {},
    _captureCurrentStep: captureCurrentStep
  };
}

function tableStep(columns) {
  return {
    stepId: 'options',
    // Live state, exactly as TableConfiguratorStep holds it.
    selectedColumns: columns.map((f) => ({ field: f, label: f })),
    getData: function () {
      return { columns: this.selectedColumns.map(function (c) { return c.field; }) };
    }
  };
}

describe('_captureCurrentStep', () => {
  test('THE BUG: an edited step reaches stepData before a spec is built', () => {
    const step = tableStep(['genome_name', 'accession', 'product']);
    const wiz = makeWizard([{ stepId: 'dataType' }, { stepId: 'records' }, step], 2);

    // The user narrows the selection; nothing has written stepData yet.
    step.selectedColumns = step.selectedColumns.slice(0, 2);
    expect(wiz.stepData.options).toBeUndefined();

    wiz._captureCurrentStep();

    expect(wiz.stepData.options.columns).toEqual(['genome_name', 'accession']);
  });

  test('a later edit overwrites an earlier capture', () => {
    const step = tableStep(['a', 'b', 'c']);
    const wiz = makeWizard([step], 0);

    wiz._captureCurrentStep();
    expect(wiz.stepData.options.columns).toEqual(['a', 'b', 'c']);

    step.selectedColumns = [{ field: 'z', label: 'z' }];
    wiz._captureCurrentStep();
    expect(wiz.stepData.options.columns).toEqual(['z']);
  });

  test('captures under the step id, leaving other steps alone', () => {
    const step = tableStep(['a']);
    const wiz = makeWizard([step], 0, {
      dataType: { format: 'tsv' },
      records: { scope: 'all' }
    });

    wiz._captureCurrentStep();

    expect(wiz.stepData.dataType).toEqual({ format: 'tsv' });
    expect(wiz.stepData.records).toEqual({ scope: 'all' });
    expect(wiz.stepData.options.columns).toEqual(['a']);
  });

  test('a step without getData is skipped rather than throwing', () => {
    const wiz = makeWizard([{ stepId: 'options' }], 0);
    expect(function () { wiz._captureCurrentStep(); }).not.toThrow();
    expect(wiz.stepData.options).toBeUndefined();
  });

  test('no steps at all is not an error', () => {
    expect(function () { makeWizard([], 0)._captureCurrentStep(); }).not.toThrow();
    expect(function () { makeWizard(null, 0)._captureCurrentStep(); }).not.toThrow();
  });

  test('an out-of-range index is not an error', () => {
    const wiz = makeWizard([tableStep(['a'])], 7);
    expect(function () { wiz._captureCurrentStep(); }).not.toThrow();
  });
});

describe('both spec-building entry points capture first', () => {
  /**
   * The guarantee is that Copy curl and Download describe the same request.
   * That only holds if both capture the live step, so pin it in the source:
   * every _buildDownloadSpec() call must be preceded by a capture.
   */
  test('onCopyCurl captures before _buildDownloadSpec', () => {
    const body = SRC.slice(SRC.indexOf('onCopyCurl: function ('));
    const capture = body.indexOf('_captureCurrentStep()');
    const build = body.indexOf('_buildDownloadSpec()');
    expect(capture).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(-1);
    expect(capture).toBeLessThan(build);
  });

  test('onDownload captures before _buildDownloadSpec', () => {
    const body = SRC.slice(SRC.indexOf('onDownload: function ('));
    const capture = body.indexOf('_captureCurrentStep()');
    const build = body.indexOf('_buildDownloadSpec()');
    expect(capture).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(-1);
    expect(capture).toBeLessThan(build);
  });

  test('onDownload no longer hand-rolls the capture', () => {
    // Bound to onDownload's own body: _captureCurrentStep is declared
    // after it, and onNext (which legitimately still inlines the
    // assignment) sits before it.
    const start = SRC.indexOf('onDownload: function (');
    const body = SRC.slice(start, SRC.indexOf('_captureCurrentStep: function ('));
    // The inlined form this replaced; two copies is how they drifted.
    expect(body).not.toContain('this.stepData[currentStep.stepId] = currentStep.getData()');
    expect(body).toContain('this._captureCurrentStep()');
  });
});
