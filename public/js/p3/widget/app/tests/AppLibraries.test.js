/* eslint-env jest */
//
// Library lists in the read-based app forms (RNA-Seq, Fastq Utilities, Variation).
//
// - doSubmit() must clear the library list after the job is accepted, so the next job
//   set up in the same tab does not silently resubmit it.
// - checkBaseParameters() must not push onto AppBase's prototype-level lib arrays,
//   which every app widget shares.
// - AppBase.loadLibrary() (Rerun) must not add SRA runs twice when a service's
//   formatRerunJson() aliases sra_libs to the srr_libs array.
//
// Loads the REAL methods out of the source files rather than reimplementing them.
//
const fs = require('fs');
const path = require('path');

/** Extract a named method's parameter list and body from a source file. */
function grab(file, name) {
  const src = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  const i = src.indexOf('\n    ' + name + ': function');
  if (i < 0) { throw new Error('method not found: ' + file + ' ' + name); }
  const sig = src.indexOf('function', i);
  const paren = src.indexOf('(', sig);
  const parenEnd = src.indexOf(')', paren);
  const params = src.slice(paren, parenEnd + 1);
  let j = src.indexOf('{', parenEnd), d = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') { d++; } else if (src[k] === '}') { d--; if (d === 0) { break; } }
  }
  return { params: params, body: src.slice(j, k + 1) };
}

const lang = {
  hitch: function (scope, fn) { return function () { return fn.apply(scope, arguments); }; }
};

function load(file, name) {
  const m = grab(file, name);
  // eslint-disable-next-line no-new-func
  return new Function('lang', 'return function ' + m.params + ' ' + m.body)(lang);
}

const APPS = ['Rnaseq.js', 'FastqUtil.js', 'Variation.js'];

describe.each(APPS)('%s doSubmit', function (file) {
  const doSubmit = load(file, 'doSubmit');

  function makeForm(inheritedResult) {
    return {
      cleared: 0,
      clearLibraries: function () { this.cleared += 1; },
      inherited: function () { return inheritedResult; },
      doSubmit: doSubmit
    };
  }

  test('clears the library list after the job is accepted and passes results through', function () {
    const form = makeForm(Promise.resolve([{ id: '1' }]));
    return form.doSubmit({}, {}).then(function (results) {
      expect(results).toEqual([{ id: '1' }]);
      expect(form.cleared).toBe(1);
    });
  });

  test('keeps the library list when submission fails', function () {
    const form = makeForm(Promise.reject(new Error('rejected')));
    return form.doSubmit({}, {}).then(
      function () { throw new Error('expected rejection'); },
      function (err) {
        expect(err.message).toBe('rejected');
        expect(form.cleared).toBe(0);
      }
    );
  });

  test('does nothing when AppBase returns no promise (developer no-submit mode)', function () {
    const form = makeForm(undefined);
    expect(form.doSubmit({}, {})).toBeUndefined();
    expect(form.cleared).toBe(0);
  });
});

describe.each(['FastqUtil.js', 'Variation.js'])('%s checkBaseParameters', function (file) {
  const checkBaseParameters = load(file, 'checkBaseParameters');

  test('does not write to the shared prototype lib arrays', function () {
    const proto = { paired_end_libs: [], single_end_libs: [], sra_libs: [] };
    const form = Object.create(proto);
    const libs = [
      {
        type: 'paired', _type: 'paired', read1: 'a_R1.fq', read2: 'a_R2.fq'
      },
      { type: 'single', _type: 'single', read: 'b.fq' },
      { type: 'srr_accession', _type: 'srr_accession', srr_accession: 'SRR1' }
    ];
    form.libraryStore = {
      query: function (q) {
        const key = Object.keys(q)[0];
        return libs.filter(function (l) { return l[key] === q[key]; });
      }
    };
    try {
      checkBaseParameters.call(form, {}, {});
    } catch (e) {
      // Later parts of checkBaseParameters touch form widgets that are not mocked here;
      // the only thing under test is that the shared arrays were never written to.
    }
    expect(proto.paired_end_libs).toEqual([]);
    expect(proto.single_end_libs).toEqual([]);
    expect(proto.sra_libs).toEqual([]);
  });
});

describe('AppBase loadLibrary (Rerun)', function () {
  const loadLibrary = load('AppBase.js', 'loadLibrary');

  function makeForm() {
    const rows = [];
    return {
      rows: rows,
      setupLibraryData: function (lrec, data) { Object.keys(data).forEach(function (k) { lrec[k] = data[k]; }); },
      makeLibraryIDFormFill: function (id) { return id; },
      addLibraryRowFormFill: function (lrec) { rows.push(lrec.srr_accession || lrec.title || lrec.read || lrec.read1); },
      loadLibrary: loadLibrary
    };
  }

  test('adds each SRA run once when sra_libs is the same array as srr_libs', function () {
    const srr = [{ srr_accession: 'SRR1' }, { srr_accession: 'SRR2' }];
    const form = makeForm();
    form.loadLibrary({
      paired_end_libs: [], single_end_libs: [], srr_libs: srr, sra_libs: srr
    }, {});
    expect(form.rows).toEqual(['SRR1', 'SRR2']);
  });

  test('still loads both lists when they are different arrays', function () {
    const form = makeForm();
    form.loadLibrary({
      paired_end_libs: [],
      single_end_libs: [],
      sra_libs: [{ srr_accession: 'SRR1' }],
      srr_libs: [{ srr_accession: 'SRR2' }]
    }, {});
    expect(form.rows).toEqual(['SRR1', 'SRR2']);
  });
});
