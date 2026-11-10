/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * joinTooBroad.js is an AMD module with no dependencies; evaluate it with a `define`
 * shim, following p3/auth/tests/authHeaders.test.js.
 */
function loadJoinTooBroad() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'joinTooBroad.js'), 'utf8');
  let exported;
  const define = function (deps, factory) { exported = factory(); };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

const jtb = loadJoinTooBroad();

/** The structured body, as the contract specifies it. */
const FULL_BODY = {
  status: 400,
  error: 'join_too_broad',
  message: 'This query matches 14,940,584 genomes, which is too many to process (limit 150,000). Please narrow the filter — for example, choose a more specific taxon.',
  genomeCount: 14940584,
  limit: 150000,
  taxonId: '10239'
};

/** What alpha actually returns today — structured fields NOT yet deployed. */
const PROSE_ONLY_BODY = {
  status: 400,
  message: FULL_BODY.message
};

/** dojo/request rejection: RequestError with .response.{status,text,data} */
function requestError(status, body) {
  const err = new Error('Unable to load /api/genome_sequence/ status: ' + status);
  err.name = 'RequestError';
  err.response = { status: status, text: JSON.stringify(body), data: body };
  return err;
}

/** dojo/_base/xhr rejection: status + responseText copied onto the error (xhr.js:630) */
function legacyXhrError(status, body) {
  const err = new Error('error');
  err.status = status;
  err.responseText = JSON.stringify(body);
  return err;
}

describe('joinTooBroad.parse', () => {
  test('recognises the structured error and reads its fields', () => {
    const info = jtb.parse(requestError(400, FULL_BODY));
    expect(info).not.toBeNull();
    expect(info.genomeCount).toBe(14940584);
    expect(info.limit).toBe(150000);
    expect(info.taxonId).toBe('10239');
  });

  test('works off the legacy xhr shape (responseText), which P3JsonRest produces', () => {
    const info = jtb.parse(legacyXhrError(400, FULL_BODY));
    expect(info).not.toBeNull();
    expect(info.genomeCount).toBe(14940584);
  });

  test('falls back to prose when the structured fields are not deployed yet', () => {
    // This is the case on alpha today: only {status, message}.
    const info = jtb.parse(requestError(400, PROSE_ONLY_BODY));
    expect(info).not.toBeNull();
    expect(info.genomeCount).toBeUndefined();
    expect(info.limit).toBeUndefined();
    expect(info.message).toBe(PROSE_ONLY_BODY.message);
  });

  test('prefers the error code over the prose when both are present', () => {
    const body = Object.assign({}, FULL_BODY, { message: 'completely different wording' });
    expect(jtb.parse(requestError(400, body))).not.toBeNull();
  });

  test('tolerates a missing taxonId (non-taxonomic filter)', () => {
    const body = Object.assign({}, FULL_BODY);
    delete body.taxonId;
    const info = jtb.parse(requestError(400, body));
    expect(info.taxonId).toBeUndefined();
    expect(info.genomeCount).toBe(14940584);
  });

  test('does NOT hardcode the limit — it reads whatever the server sent', () => {
    const body = Object.assign({}, FULL_BODY, { limit: 42 });
    expect(jtb.parse(requestError(400, body)).limit).toBe(42);
  });

  test('returns null for an ordinary 400 that is not a join rejection', () => {
    const body = { status: 400, message: 'undefined field genome_status' };
    expect(jtb.parse(requestError(400, body))).toBeNull();
  });

  test.each([200, 429, 500, 504])('returns null for HTTP %i', (status) => {
    expect(jtb.parse(requestError(status, FULL_BODY))).toBeNull();
  });

  test('returns null for a non-JSON body', () => {
    const err = new Error('boom');
    err.status = 400;
    err.responseText = '<html>gateway</html>';
    expect(jtb.parse(err)).toBeNull();
  });

  test('returns null for null/undefined', () => {
    expect(jtb.parse(null)).toBeNull();
    expect(jtb.parse(undefined)).toBeNull();
  });
});

describe('joinTooBroad.isJoinTimeout', () => {
  test('recognises the 500-at-120s cold join, which is a DIFFERENT failure', () => {
    const body = { status: 500, message: 'Solr request timed out after 120000ms' };
    expect(jtb.isJoinTimeout(requestError(500, body))).toBe(true);
    // Crucially it must not be mistaken for too-broad: telling a user to narrow a query
    // that merely timed out sends them to fix something that is not wrong.
    expect(jtb.isJoinTooBroad(requestError(500, body))).toBe(false);
  });

  test('a too-broad 400 is not a timeout', () => {
    expect(jtb.isJoinTimeout(requestError(400, FULL_BODY))).toBe(false);
  });

  test('a 500 without the timeout wording is not a join timeout', () => {
    expect(jtb.isJoinTimeout(requestError(500, { status: 500, message: 'internal error' }))).toBe(false);
  });
});

describe('joinTooBroad.describe', () => {
  test('scales the advice to the overshoot — 100x says pick a species', () => {
    const info = jtb.parse(requestError(400, FULL_BODY)); // ~100x over
    const text = jtb.describe(info);
    expect(text).toMatch(/14,940,584/);
    expect(text).toMatch(/specific species or genus/i);
  });

  test('a slight overshoot says narrow a little, not "pick a species"', () => {
    const body = Object.assign({}, FULL_BODY, { genomeCount: 165000, limit: 150000 });
    const text = jtb.describe(jtb.parse(requestError(400, body)));
    expect(text).toMatch(/a little/i);
    expect(text).not.toMatch(/specific species/i);
  });

  test('a mid overshoot asks for a genus or species', () => {
    const body = Object.assign({}, FULL_BODY, { genomeCount: 750000, limit: 150000 });
    expect(jtb.describe(jtb.parse(requestError(400, body)))).toMatch(/substantially/i);
  });

  test('falls back to the server message when counts are absent', () => {
    const info = jtb.parse(requestError(400, PROSE_ONLY_BODY));
    expect(jtb.describe(info)).toBe(PROSE_ONLY_BODY.message);
  });

  test('reports the server-supplied limit, not a hardcoded 150,000', () => {
    const body = Object.assign({}, FULL_BODY, { genomeCount: 900, limit: 500 });
    expect(jtb.describe(jtb.parse(requestError(400, body)))).toMatch(/limit 500/);
  });
});

describe('joinTooBroad.formatCount', () => {
  test('groups digits', () => {
    expect(jtb.formatCount(14940584)).toBe('14,940,584');
  });
  test('tolerates junk', () => {
    expect(jtb.formatCount(undefined)).toBe('');
    expect(jtb.formatCount(NaN)).toBe('');
  });
});

describe('the Riboviria trap', () => {
  // The contract's central warning: a child can be LARGER than its parent's reported
  // count, so "offer the children" without checking is a one-click path to the same 400.
  test('a child over the limit is distinguishable from one under it', () => {
    const info = jtb.parse(requestError(400, FULL_BODY));
    const children = [
      { taxon_name: 'Riboviria', genomes: 14985310 },
      { taxon_name: 'Monodnaviria', genomes: 275728 },
      { taxon_name: 'Varidnaviria', genomes: 104992 }
    ];
    const usable = children.filter((c) => c.genomes <= info.limit);
    const tooBig = children.filter((c) => c.genomes > info.limit);

    expect(usable.map((c) => c.taxon_name)).toEqual(['Varidnaviria']);
    expect(tooBig.map((c) => c.taxon_name)).toEqual(['Riboviria', 'Monodnaviria']);
    // Riboviria exceeds even the parent's own count — the assumption that children are
    // smaller is simply false here.
    expect(children[0].genomes).toBeGreaterThan(info.genomeCount);
  });
});
