/* eslint-env jest */
//
// RNA-Seq form: libraries from an earlier job must never be submitted with a later one.
//
// Two ways this used to happen:
//
// 1. AppBase declares paired_end_libs / single_end_libs / sra_libs on the PROTOTYPE, so
//    they are shared by every app widget. checkBaseParameters() pushed onto them and only
//    reassigned per-instance arrays at the end, so the first submit from any form left its
//    libraries on the shared prototype array, and the next form opened in the tab started
//    with them already in the list.
// 2. After a successful submit, the library store was never cleared, so the next job set
//    up in the same tab resubmitted everything still in the store.
//
// This loads the REAL methods out of Rnaseq.js rather than reimplementing them.
// doSubmit (clearing after submit) is covered for all read-based apps in AppLibraries.test.js.
//
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'Rnaseq.js');
const src = fs.readFileSync(SRC, 'utf8');

/** Extract a named method's parameter list and body from the source. */
function grab(name) {
  const i = src.indexOf('\n    ' + name + ': function');
  if (i < 0) { throw new Error('method not found: ' + name); }
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

function load(name) {
  const m = grab(name);
  // eslint-disable-next-line no-new-func
  return new Function('lang', 'return function ' + m.params + ' ' + m.body)(lang);
}

const checkBaseParameters = load('checkBaseParameters');

function lib(type, file) {
  if (type === 'paired') {
    return {
      type: 'paired', read1: file + '_R1.fq', read2: file + '_R2.fq', sample_id: file
    };
  }
  if (type === 'single') {
    return { type: 'single', read: file + '.fq', sample_id: file };
  }
  return { type: 'srr_accession', srr_accession: file };
}

// Mimics a dojo declare() class: the lib arrays live on the shared prototype, as in AppBase.
function makeProto() {
  return {
    paired_end_libs: [], single_end_libs: [], sra_libs: [], checkBaseParameters: checkBaseParameters
  };
}

function makeForm(proto, libs) {
  const form = Object.create(proto);
  form.libraryStore = {
    query: function (q) { return libs.filter(function (l) { return l.type === q.type; }); }
  };
  form.conditionStore = { data: [] };
  form.contrastStore = { data: [] };
  form.exp_design = { checked: false };
  return form;
}

const VALUES = {
  recipe: 'HTSeq-DESeq', genome_name: '1.1', output_path: '/u/home', output_file: 'job'
};

function submittedFiles(params) {
  return []
    .concat((params.paired_end_libs || []).map(function (l) { return l.read1; }))
    .concat((params.single_end_libs || []).map(function (l) { return l.read; }))
    .concat((params.srr_libs || []).map(function (l) { return l.srr_accession; }));
}

describe('Rnaseq checkBaseParameters', function () {
  test('a second form in the same tab does not inherit the first form\'s libraries', function () {
    const proto = makeProto();
    const first = makeForm(proto, [lib('paired', 'R20291_a'), lib('single', 'R20291_b'), lib('srr', 'SRR1')]);
    checkBaseParameters.call(first, VALUES, {});

    const second = makeForm(proto, [lib('paired', '2015_a')]);
    const params = checkBaseParameters.call(second, VALUES, {});

    expect(submittedFiles(params)).toEqual(['2015_a_R1.fq']);
  });

  test('the shared prototype arrays are never written to', function () {
    const proto = makeProto();
    checkBaseParameters.call(makeForm(proto, [lib('paired', 'x'), lib('single', 'y'), lib('srr', 'SRR2')]), VALUES, {});

    expect(proto.paired_end_libs).toEqual([]);
    expect(proto.single_end_libs).toEqual([]);
    expect(proto.sra_libs).toEqual([]);
  });

  test('calling it twice on one form does not duplicate libraries', function () {
    const form = makeForm(makeProto(), [lib('paired', 'a'), lib('single', 'b')]);
    checkBaseParameters.call(form, VALUES, {});
    const params = checkBaseParameters.call(form, VALUES, {});

    expect(submittedFiles(params)).toEqual(['a_R1.fq', 'b.fq']);
  });
});
