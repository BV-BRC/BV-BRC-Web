/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * authHeaders.js is an AMD module and this repo has no AMD loader under Jest,
 * so evaluate it with a minimal `define` shim that hands back the factory's
 * return value. The module declares no dependencies, so there is nothing to
 * resolve.
 */
function loadAuthHeaders() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'authHeaders.js'), 'utf8');
  let exported;
  const define = function (deps, factory) { exported = factory(); };
  // eslint-disable-next-line no-new-func
  new Function('define', src)(define);
  return exported;
}

const authHeader = loadAuthHeaders();

const TOKEN = 'un=jsmith@bvbrc|tokenid=abc|expiry=9999999999|SigningSubject=https://x/|sig=deadbeef';

describe('authHeaders', () => {
  afterEach(() => { delete global.window; });

  function setAmbient(token) {
    global.window = { App: token === undefined ? {} : { authorizationToken: token } };
  }

  describe('scheme selection', () => {
    test("default scheme sends a bare token -- no prefix", () => {
      setAmbient(TOKEN);
      expect(authHeader()).toBe(TOKEN);
      expect(authHeader('api')).toBe(TOKEN);
    });

    test("'shock' prefixes with 'OAuth ' and preserves the token verbatim", () => {
      setAmbient(TOKEN);
      expect(authHeader('shock')).toBe('OAuth ' + TOKEN);
    });

    test('an unknown scheme falls back to bare rather than inventing a prefix', () => {
      setAmbient(TOKEN);
      expect(authHeader('bearer')).toBe(TOKEN);
    });
  });

  describe('empty-token behavior', () => {
    // dojo/request skips headers whose value is falsy (dojo/request/xhr.js),
    // so '' reproduces what `(window.App.authorizationToken || '')` did:
    // the Authorization header is omitted entirely rather than sent empty.
    test('returns empty string, not undefined, when unauthenticated', () => {
      setAmbient(undefined);
      expect(authHeader()).toBe('');
      expect(authHeader('shock')).toBe('');
    });

    test('never emits a bare prefix with no token attached', () => {
      setAmbient(undefined);
      expect(authHeader('shock')).not.toBe('OAuth ');
      expect(authHeader('shock')).not.toContain('OAuth');
    });

    test('tolerates window.App being absent', () => {
      global.window = {};
      expect(authHeader()).toBe('');
    });

    test('tolerates a null token', () => {
      global.window = { App: { authorizationToken: null } };
      expect(authHeader()).toBe('');
    });
  });

  describe('explicit token argument', () => {
    test('an explicit token overrides the ambient one', () => {
      setAmbient('AMBIENT');
      expect(authHeader('api', 'EXPLICIT')).toBe('EXPLICIT');
      expect(authHeader('shock', 'EXPLICIT')).toBe('OAuth EXPLICIT');
    });

    test('an empty explicit token falls back to ambient', () => {
      setAmbient('AMBIENT');
      expect(authHeader('api', '')).toBe('AMBIENT');
      expect(authHeader('api', null)).toBe('AMBIENT');
      expect(authHeader('api', undefined)).toBe('AMBIENT');
    });

    test('reproduces the `this.token ? this.token : ambient` idiom it replaced', () => {
      setAmbient('AMBIENT');
      const withOwn = { token: 'OWN' };
      const withoutOwn = { token: null };
      expect(authHeader('api', withOwn.token)).toBe('OWN');
      expect(authHeader('api', withoutOwn.token)).toBe('AMBIENT');
    });
  });

  describe('forToken: no ambient fallback', () => {
    // Used where the caller owns the token and the old code sent exactly what
    // it was given -- jsonrpc, SEEDClient, the login handler. An ambient
    // fallback there would make a client constructed before login start
    // sending a token it does not send today.
    test('does not consult the ambient token', () => {
      setAmbient('AMBIENT');
      expect(authHeader.forToken('api', '')).toBe('');
      expect(authHeader.forToken('api', null)).toBe('');
      expect(authHeader.forToken('api', undefined)).toBe('');
    });

    test('applies the scheme to the supplied token', () => {
      setAmbient('AMBIENT');
      expect(authHeader.forToken('api', 'MINE')).toBe('MINE');
      expect(authHeader.forToken('shock', 'MINE')).toBe('OAuth MINE');
    });
  });

  describe('ambientToken', () => {
    test('reads window.App.authorizationToken', () => {
      setAmbient(TOKEN);
      expect(authHeader.ambientToken()).toBe(TOKEN);
    });

    test('returns empty string when unset, and does not read localStorage', () => {
      // The localStorage fallback is deliberately NOT global -- it lives at
      // WorkflowManager's call site. See the comment in authHeaders.js.
      global.window = { App: {} };
      global.localStorage = { getItem: jest.fn(() => 'FROM_STORAGE') };
      expect(authHeader.ambientToken()).toBe('');
      expect(global.localStorage.getItem).not.toHaveBeenCalled();
      delete global.localStorage;
    });
  });

  describe('token integrity', () => {
    // The p3_api/Workspace/app-service validators split on '|' and rebuild the
    // RSA-signed base string from the parts. Any mutation of the token, or a
    // scheme prefix on a bare-token destination, breaks verification.
    test('does not alter the token in the bare case', () => {
      setAmbient(TOKEN);
      expect(authHeader('api')).toBe(TOKEN);
      expect(authHeader('api').split('|')[0]).toBe('un=jsmith@bvbrc');
    });

    test("the shock form keeps the token parseable after stripping 'OAuth '", () => {
      setAmbient(TOKEN);
      expect(authHeader('shock').replace(/^OAuth /, '')).toBe(TOKEN);
    });
  });
});
