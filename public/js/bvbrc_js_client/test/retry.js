/* eslint-env mocha */
const assert = require('chai').assert;
const path = require('path');

const RETRY_PATH = path.join(__dirname, '..', 'src', 'retry.js');

/**
 * fetchWithBackoff closes over the module-level `fetch` from node-fetch, so
 * stub it in require.cache and reload the module under test.
 */
function loadRetry (fetchStub) {
  delete require.cache[require.resolve(RETRY_PATH)];
  delete require.cache[require.resolve('node-fetch')];
  require.cache[require.resolve('node-fetch')] = {
    id: require.resolve('node-fetch'),
    filename: require.resolve('node-fetch'),
    loaded: true,
    exports: fetchStub
  };
  return require(RETRY_PATH);
}

function response (status, { retryAfter, ok } = {}) {
  return {
    status,
    statusText: status === 429 ? 'Too Many Requests' : 'Error',
    ok: ok !== undefined ? ok : (status >= 200 && status < 300),
    headers: {
      get: (n) => (n === 'Retry-After' && retryAfter !== undefined
        ? String(retryAfter) : null)
    }
  };
}

/** Replace setTimeout so backoffs resolve instantly, recording the delays. */
function captureDelays () {
  const real = global.setTimeout;
  const delays = [];
  global.setTimeout = (fn, ms) => { delays.push(ms); return real(fn, 0); };
  return { delays, restore: () => { global.setTimeout = real; } };
}

describe('fetchWithBackoff', function () {
  let timers;

  beforeEach(function () { timers = captureDelays(); });
  afterEach(function () {
    timers.restore();
    delete global.window;
  });

  it('passes a success straight through without retrying', async function () {
    let calls = 0;
    const { fetchWithBackoff } = loadRetry(async () => { calls++; return response(200); });

    const res = await fetchWithBackoff('http://x/', {});
    assert.equal(res.status, 200);
    assert.equal(calls, 1);
    assert.lengthOf(timers.delays, 0);
  });

  it('retries a 429 and returns the eventual success', async function () {
    let calls = 0;
    const { fetchWithBackoff } = loadRetry(async () => {
      calls++;
      return calls === 1 ? response(429, { retryAfter: 2 }) : response(200);
    });

    const res = await fetchWithBackoff('http://x/', {});
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
  });

  it('honours Retry-After rather than substituting a shorter delay', async function () {
    const { fetchWithBackoff } = loadRetry(async () => response(429, { retryAfter: 10 }));

    try { await fetchWithBackoff('http://x/', {}); } catch (e) { /* expected */ }

    // 10s plus up to 30% jitter, and never less than the server's figure.
    timers.delays.forEach((d) => {
      assert.isAtLeast(d, 10000);
      assert.isAtMost(d, 13000);
    });
  });

  it('jitters, so shed clients do not all return at the same instant', async function () {
    const { fetchWithBackoff } = loadRetry(async () => response(429, { retryAfter: 5 }));

    for (let i = 0; i < 4; i++) {
      try { await fetchWithBackoff('http://x/', {}); } catch (e) { /* expected */ }
    }
    const unique = new Set(timers.delays);
    assert.isAbove(unique.size, 1, 'all delays identical -- jitter missing');
  });

  it('caps at 3 retries (4 attempts) then throws a busy error', async function () {
    let calls = 0;
    const { fetchWithBackoff } = loadRetry(async () => { calls++; return response(429, { retryAfter: 1 }); });

    try {
      await fetchWithBackoff('http://x/', {});
      assert.fail('should have thrown');
    } catch (e) {
      assert.match(e.message, /server is currently busy/i);
      assert.isTrue(e.isThrottled);
      assert.equal(e.status, 429);
    }
    assert.equal(calls, 4);
  });

  it('treats 503 identically to 429', async function () {
    let calls = 0;
    const { fetchWithBackoff } = loadRetry(async () => {
      calls++;
      return calls === 1 ? response(503, { retryAfter: 1 }) : response(200);
    });

    const res = await fetchWithBackoff('http://x/', {});
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
  });

  [504, 400, 401, 500].forEach(function (status) {
    it(`does not retry ${status}`, async function () {
      let calls = 0;
      const { fetchWithBackoff } = loadRetry(async () => { calls++; return response(status); });

      const res = await fetchWithBackoff('http://x/', {});
      assert.equal(res.status, status);
      assert.equal(calls, 1, 'retrying this status wastes a round trip');
      assert.lengthOf(timers.delays, 0);
    });
  });

  it('falls back to exponential backoff when Retry-After is absent', async function () {
    const { fetchWithBackoff } = loadRetry(async () => response(429));

    try { await fetchWithBackoff('http://x/', {}); } catch (e) { /* expected */ }

    // 2s, 4s, 8s before jitter.
    assert.isAtLeast(timers.delays[0], 2000);
    assert.isAtLeast(timers.delays[1], 4000);
    assert.isAtLeast(timers.delays[2], 8000);
  });

  it('never retries without a delay, even on Retry-After: 0', async function () {
    const { fetchWithBackoff } = loadRetry(async () => response(429, { retryAfter: 0 }));

    try { await fetchWithBackoff('http://x/', {}); } catch (e) { /* expected */ }

    timers.delays.forEach((d) => assert.isAtLeast(d, 1000,
      'Retry-After: 0 must not produce a tight loop'));
  });

  it('does not retry when window.App.enableThrottleRetry is false', async function () {
    global.window = { App: { enableThrottleRetry: false } };
    let calls = 0;
    const { fetchWithBackoff } = loadRetry(async () => { calls++; return response(429, { retryAfter: 1 }); });

    const res = await fetchWithBackoff('http://x/', {});
    assert.equal(res.status, 429, 'should hand back the shed response unretried');
    assert.equal(calls, 1);
  });

  it('retries when the flag is on', async function () {
    global.window = { App: { enableThrottleRetry: true } };
    let calls = 0;
    const { fetchWithBackoff } = loadRetry(async () => {
      calls++;
      return calls === 1 ? response(429, { retryAfter: 1 }) : response(200);
    });

    const res = await fetchWithBackoff('http://x/', {});
    assert.equal(res.status, 200);
    assert.equal(calls, 2);
  });
});

describe('httpError', function () {
  it('preserves the status, which the old throw discarded', function () {
    const { httpError } = require(RETRY_PATH);
    const err = httpError(response(429));

    assert.equal(err.status, 429);
    assert.equal(err.statusText, 'Too Many Requests');
    assert.include(err.message, '429');
  });
});
