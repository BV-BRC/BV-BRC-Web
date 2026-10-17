/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * retryRequest.js is an AMD module and this repo has no AMD loader under Jest,
 * so evaluate it with a `define` shim that resolves its two dependencies by
 * name. Follows the pattern in p3/auth/tests/authHeaders.test.js.
 */
function loadRetryRequest(stubs) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'retryRequest.js'), 'utf8');
  let exported;
  const define = function (deps, factory) {
    exported = factory.apply(null, deps.map((d) => stubs[d]));
  };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

/** Minimal dojo/Deferred: enough of the contract retryRequest actually uses. */
function makeDeferredCtor() {
  return function Deferred(canceller) {
    let settle;
    let fail;
    const promise = new Promise((res, rej) => { settle = res; fail = rej; });
    promise.cancel = function (reason) { if (canceller) canceller(reason); };
    this.promise = promise;
    this.resolve = settle;
    this.reject = fail;
  };
}

function setup() {
  const published = [];
  const Topic = { publish: (topic, data) => published.push({ topic, data }) };
  const retryRequest = loadRetryRequest({
    'dojo/Deferred': makeDeferredCtor(),
    'dojo/topic': Topic
  });
  return { retryRequest, published, topics: () => published.map((p) => p.topic) };
}

/** An error shaped like a dojo/_base/xhr rejection (xhr.js:631). */
function shedError(status, retryAfter) {
  const err = new Error('shed');
  err.status = status;
  err.xhr = {
    getResponseHeader: (name) =>
      (name === 'Retry-After' && retryAfter !== undefined ? String(retryAfter) : null)
  };
  return err;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(0); // jitter -> exactly 1.0x
  // Feature flag on for the behavioural tests; the gate has its own block.
  global.window = { App: { enableThrottleRetry: true } };
});

afterEach(() => {
  jest.useRealTimers();
  Math.random.mockRestore();
  delete global.window;
});

/**
 * Advance fake timers, draining microtasks *before* advancing as well as
 * after: the retry timer is only scheduled once the rejection handler has run,
 * so advancing first would step past a timer that does not exist yet.
 */
async function drain(ms) {
  for (let i = 0; i < 12; i++) { await Promise.resolve(); }
  jest.advanceTimersByTime(ms);
  for (let i = 0; i < 12; i++) { await Promise.resolve(); }
}

describe('retryRequest', () => {
  test('passes a successful response straight through without a banner', async () => {
    const { retryRequest, topics } = setup();
    const fn = jest.fn().mockResolvedValue('ok');

    await expect(retryRequest(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(topics()).toEqual([]);
  });

  test('honours Retry-After rather than substituting a shorter delay', async () => {
    const { retryRequest, published } = setup();
    const fn = jest.fn()
      .mockRejectedValueOnce(shedError(429, 10))
      .mockResolvedValue('ok');

    const p = retryRequest(fn);
    await Promise.resolve(); await Promise.resolve();

    const retrying = published.find((e) => e.topic === '/throttle/retrying');
    expect(retrying.data.waitMs).toBe(10000); // 10s, random() stubbed to 0

    // Must NOT have retried before the server's deadline.
    await drain(9000);
    expect(fn).toHaveBeenCalledTimes(1);

    await drain(1500);
    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('applies jitter of up to +30%', async () => {
    Math.random.mockReturnValue(1); // max jitter
    const { retryRequest, published } = setup();
    const fn = jest.fn()
      .mockRejectedValueOnce(shedError(429, 10))
      .mockResolvedValue('ok');

    retryRequest(fn);
    await Promise.resolve(); await Promise.resolve();

    const retrying = published.find((e) => e.topic === '/throttle/retrying');
    expect(retrying.data.waitMs).toBe(13000); // 10s * 1.3
  });

  test('falls back to exponential backoff from 2s when Retry-After is absent', async () => {
    const { retryRequest, published } = setup();
    const fn = jest.fn().mockRejectedValue(shedError(429, undefined));

    const p = retryRequest(fn);
    p.catch(() => {});

    const waits = [];
    for (let i = 0; i < 4; i++) {
      await Promise.resolve(); await Promise.resolve();
      const last = published.filter((e) => e.topic === '/throttle/retrying').pop();
      if (last && !waits.includes(last.data.waitMs)) { waits.push(last.data.waitMs); }
      await drain(60000);
    }
    expect(waits).toEqual([2000, 4000, 8000]); // 2 * 2^attempt, doubling
  });

  test('interactive mode gives up after 3 retries (4 attempts) with a busy message', async () => {
    const { retryRequest, topics } = setup();
    const fn = jest.fn().mockRejectedValue(shedError(429, 1));

    const p = retryRequest(fn);
    const assertion = expect(p).rejects.toThrow(/server is currently busy/i);

    for (let i = 0; i < 6; i++) { await drain(5000); }
    await assertion;

    expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries, not 5
    expect(topics()).toContain('/throttle/failed');
  });

  test('503 is handled identically to 429', async () => {
    const { retryRequest } = setup();
    const fn = jest.fn()
      .mockRejectedValueOnce(shedError(503, 2))
      .mockResolvedValue('ok');

    const p = retryRequest(fn);
    await drain(3000);
    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test.each([504, 400, 401, 500])('does not retry %i', async (status) => {
    const { retryRequest, topics } = setup();
    const fn = jest.fn().mockRejectedValue(shedError(status, 10));

    await expect(retryRequest(fn)).rejects.toThrow('shed');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(topics()).toEqual([]); // no banner for a real error
  });

  test('rejects non-retriable errors unchanged, preserving the original', async () => {
    const { retryRequest } = setup();
    const original = shedError(400, undefined);
    const fn = jest.fn().mockRejectedValue(original);

    await expect(retryRequest(fn)).rejects.toBe(original);
  });

  test('unattended mode escalates to the ceiling and keeps going past 3', async () => {
    const { retryRequest, published } = setup();
    const fn = jest.fn().mockRejectedValue(shedError(429, 1));

    const p = retryRequest(fn, { mode: 'unattended', ceilingSeconds: 300 });
    p.catch(() => {});

    const waits = [];
    for (let i = 0; i < 14; i++) {
      await Promise.resolve(); await Promise.resolve();
      const last = published.filter((e) => e.topic === '/throttle/retrying').pop();
      if (last) { waits.push(last.data.waitMs); }
      await drain(400000);
    }

    // Well past the interactive cap of 4 attempts.
    expect(fn.mock.calls.length).toBeGreaterThan(8);
    // Server said 1s, but our own history escalates past that figure...
    expect(waits).toContain(30000);
    expect(waits).toContain(60000);
    // ...and holds at the ceiling rather than growing without bound.
    expect(waits[waits.length - 1]).toBe(300000);
  });

  test('unattended mode stops at an operator-set wall-clock budget', async () => {
    const { retryRequest, topics } = setup();
    const fn = jest.fn().mockRejectedValue(shedError(429, 10));

    const p = retryRequest(fn, { mode: 'unattended', maxTotalWaitMs: 25000 });
    const assertion = expect(p).rejects.toThrow(/server is currently busy/i);

    for (let i = 0; i < 8; i++) { await drain(20000); }
    await assertion;
    expect(topics()).toContain('/throttle/failed');
  });

  test('publishes exactly one active and one balancing event on success', async () => {
    const { retryRequest, topics } = setup();
    const fn = jest.fn()
      .mockRejectedValueOnce(shedError(429, 1))
      .mockRejectedValueOnce(shedError(429, 1))
      .mockResolvedValue('ok');

    const p = retryRequest(fn);
    for (let i = 0; i < 4; i++) { await drain(3000); }
    await expect(p).resolves.toBe('ok');

    const t = topics();
    expect(t.filter((x) => x === '/throttle/active')).toHaveLength(1);
    expect(t.filter((x) => x === '/throttle/resolved')).toHaveLength(1);
    expect(t.filter((x) => x === '/throttle/failed')).toHaveLength(0);
  });

  test('counter stays balanced when retries are exhausted', async () => {
    const { retryRequest, topics } = setup();
    const fn = jest.fn().mockRejectedValue(shedError(429, 1));

    const p = retryRequest(fn);
    const assertion = expect(p).rejects.toThrow();
    for (let i = 0; i < 6; i++) { await drain(5000); }
    await assertion;

    const t = topics();
    expect(t.filter((x) => x === '/throttle/active')).toHaveLength(1);
    // exactly one closing event, and it is the failure one
    expect(t.filter((x) => x === '/throttle/failed')).toHaveLength(1);
    expect(t.filter((x) => x === '/throttle/resolved')).toHaveLength(0);
  });

  test('cancelling mid-backoff fires no further request and balances the counter', async () => {
    const { retryRequest, topics } = setup();
    const fn = jest.fn().mockRejectedValue(shedError(429, 10));

    const p = retryRequest(fn);
    p.catch(() => {});
    await Promise.resolve(); await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);

    p.cancel();
    await drain(60000);

    // The pending retry must not fire -- retrying a cancelled query is exactly
    // the concurrency escalation the spec prohibits.
    expect(fn).toHaveBeenCalledTimes(1);
    const t = topics();
    expect(t.filter((x) => x === '/throttle/active')).toHaveLength(1);
    expect(t.filter((x) => x === '/throttle/resolved')).toHaveLength(1);
  });

  test('cancelling aborts the in-flight request', async () => {
    const { retryRequest } = setup();
    const cancel = jest.fn();
    const fn = jest.fn(() => {
      const never = new Promise(() => {});
      never.cancel = cancel;
      return never;
    });

    const p = retryRequest(fn);
    p.catch(() => {});
    await Promise.resolve();
    p.cancel();

    expect(cancel).toHaveBeenCalled();
  });

  test('reads Retry-After from a fetch-style Headers object', async () => {
    const { retryRequest, published } = setup();
    const err = new Error('shed');
    err.status = 429;
    err.headers = { get: (n) => (n === 'Retry-After' ? '7' : null) };
    const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    retryRequest(fn);
    await Promise.resolve(); await Promise.resolve();

    const retrying = published.find((e) => e.topic === '/throttle/retrying');
    expect(retrying.data.waitMs).toBe(7000);
  });

  test('reads status from a dojo/request RequestError (.response.status)', async () => {
    const { retryRequest } = setup();
    const err = new Error('shed');
    err.response = { status: 429, xhr: { getResponseHeader: () => '1' } };
    const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');

    const p = retryRequest(fn);
    await drain(2000);
    await expect(p).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('treats an unparseable Retry-After as absent', async () => {
    const { retryRequest, published } = setup();
    const fn = jest.fn()
      .mockRejectedValueOnce(shedError(429, 'soon'))
      .mockResolvedValue('ok');

    retryRequest(fn);
    await Promise.resolve(); await Promise.resolve();

    const retrying = published.find((e) => e.topic === '/throttle/retrying');
    expect(retrying.data.waitMs).toBe(2000); // exponential fallback, not 0
  });

  test('never retries without a delay', async () => {
    const { retryRequest, published } = setup();
    const fn = jest.fn().mockRejectedValue(shedError(429, 0));

    const p = retryRequest(fn);
    p.catch(() => {});
    await Promise.resolve(); await Promise.resolve();

    // Retry-After: 0 is the tight-loop invitation the spec prohibits. The API
    // floors at 1s, but a client must not depend on that.
    const retrying = published.find((e) => e.topic === '/throttle/retrying');
    expect(retrying.data.waitMs).toBeGreaterThan(0);
  });

  test('a throwing requestFn rejects rather than hanging', async () => {
    const { retryRequest } = setup();
    const fn = jest.fn(() => { throw new Error('bad call'); });

    await expect(retryRequest(fn)).rejects.toThrow('bad call');
  });

  describe('enableThrottleRetry feature flag', () => {
    const OFF_STATES = [
      ['flag false', { App: { enableThrottleRetry: false } }],
      ['flag absent', { App: {} }],
      ['App absent', {}]
    ];

    test.each(OFF_STATES)('disabled (%s): does not retry a 429', async (_name, win) => {
      global.window = win;
      const { retryRequest, topics } = setup();
      const err = shedError(429, 1);
      const fn = jest.fn().mockRejectedValue(err);

      // Rejects with the original error, not the throttle message.
      await expect(retryRequest(fn)).rejects.toBe(err);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(topics()).toEqual([]);
    });

    test('disabled: returns the caller\'s own promise, not a rebuilt one', async () => {
      global.window = { App: { enableThrottleRetry: false } };
      const { retryRequest } = setup();

      // Off should mean *absent from the chain*, not merely inert: the caller
      // gets back the very object its requestFn produced, so nothing can
      // regress in the promise contract when the feature is off.
      const original = Promise.resolve('ok');
      original.someTransportProperty = 'preserved';
      const returned = retryRequest(() => original);

      expect(returned).toBe(original);
      expect(returned.someTransportProperty).toBe('preserved');
      await expect(returned).resolves.toBe('ok');
    });

    test('enabled: wraps, so the returned promise is a new one', async () => {
      global.window = { App: { enableThrottleRetry: true } };
      const { retryRequest } = setup();
      const original = Promise.resolve('ok');

      expect(retryRequest(() => original)).not.toBe(original);
    });
  });
});
