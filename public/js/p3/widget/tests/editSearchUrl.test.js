/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * EDIT SEARCH has to survive a saved search being reloaded.
 *
 * The button returns to the Influenza Search form with the user's
 * original selections. It read a sessionStorage record written when the
 * form was submitted -- per-tab, gone with the session -- so replaying a
 * saved search produced the right 382 rows with no way to see or edit
 * the criteria behind them. That is what was reported.
 *
 * The fix persists the form's own URL on the saved search. That URL then
 * comes back from the workspace, i.e. from shareable data, so the
 * accept/reject rules below are a trust boundary and not just tidiness:
 * the value is handed to Topic.publish('/navigate').
 *
 * GridContainer.js is a 2400-line dijit module with no test harness, so
 * these pull the two pure helpers out of the source rather than
 * instantiating it.
 */
function extract(name) {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'GridContainer.js'), 'utf8');
  const start = src.indexOf('    ' + name + ': function');
  if (start < 0) throw new Error('method not found in GridContainer.js: ' + name);
  // Methods are indented four spaces and end at the matching "    },".
  const end = src.indexOf('\n    },', start);
  if (end < 0) throw new Error('could not bound method: ' + name);
  return src.slice(start, end + '\n    }'.length).replace(/^\s*\w+: /, '');
}

/** Build a host object carrying the two helpers under test. */
function makeHost(opts) {
  opts = opts || {};
  const host = {
    state: { hashParams: opts.hashParams || {} },
    _safeSearchFormUrl: null,
    _getInfluenzaSearchReturnUrl: null,
    _getEditSearchUrl: null
  };
  // Stand-ins for the module-scope deps the extracted code closes over.
  const SavedSearchManager = {
    get: (id) => (opts.searches || {})[id] || null
  };
  const scope = {
    window: {
      location: {
        origin: 'https://www.bv-brc.org',
        pathname: opts.pathname || '/view/GenomeList/'
      },
      sessionStorage: {
        getItem: (k) => (opts.session || {})[k] || null
      }
    },
    URL: global.URL,
    SavedSearchManager
  };

  ['_safeSearchFormUrl', '_getInfluenzaSearchReturnUrl', '_getEditSearchUrl']
    .forEach(function (name) {
      const body = 'return (' + extract(name) + ');';
      // eslint-disable-next-line no-new-func
      const factory = new Function('window', 'URL', 'SavedSearchManager', body);
      host[name] = factory(scope.window, scope.URL, scope.SavedSearchManager)
        .bind(host);
    });
  return host;
}

const FORM_URL = '/searches/InfluenzaSearch/#fluSearch=%7B%22version%22%3A1%7D';

describe('_safeSearchFormUrl', () => {
  const host = makeHost();

  test('accepts a relative Influenza Search URL and returns a path', () => {
    expect(host._safeSearchFormUrl(FORM_URL)).toBe(FORM_URL);
  });

  test('accepts an absolute same-origin URL but strips the origin', () => {
    expect(host._safeSearchFormUrl('https://www.bv-brc.org' + FORM_URL))
      .toBe(FORM_URL);
  });

  describe('THE TRUST BOUNDARY: a saved search is shareable data', () => {
    // These values reach Topic.publish('/navigate'), so a crafted saved
    // search must not be able to steer a user off-site.
    test('rejects another origin', () => {
      expect(host._safeSearchFormUrl('https://evil.example/searches/InfluenzaSearch/'))
        .toBeNull();
    });

    test('rejects a javascript: URL', () => {
      // eslint-disable-next-line no-script-url
      expect(host._safeSearchFormUrl('javascript:alert(1)')).toBeNull();
    });

    test('rejects a protocol-relative URL', () => {
      expect(host._safeSearchFormUrl('//evil.example/searches/InfluenzaSearch/'))
        .toBeNull();
    });

    test('rejects a same-origin path that is not the search form', () => {
      expect(host._safeSearchFormUrl('/admin')).toBeNull();
      expect(host._safeSearchFormUrl('/searches/InfluenzaSearchEvil')).toBeNull();
    });

    test('rejects junk without throwing', () => {
      [null, undefined, '', 42, {}].forEach(function (v) {
        expect(host._safeSearchFormUrl(v)).toBeNull();
      });
    });
  });
});

describe('_getEditSearchUrl', () => {
  test('prefers the live sessionStorage record', () => {
    const host = makeHost({
      hashParams: { influenzaSearch: 'abc123' },
      session: {
        'bvbrc:influenza-search:abc123': JSON.stringify({
          url: FORM_URL, form: { version: 1 }
        })
      }
    });
    expect(host._getEditSearchUrl()).toBe(FORM_URL);
  });

  test('THE FIX: falls back to the saved search when the session is gone', () => {
    // A reload, a new tab, or another machine. Previously: no button.
    const host = makeHost({
      hashParams: { savedSearch: 'search_123' },
      searches: { search_123: { searchFormUrl: FORM_URL } }
    });
    expect(host._getEditSearchUrl()).toBe(FORM_URL);
  });

  test('the saved search id is URL-decoded before lookup', () => {
    const host = makeHost({
      hashParams: { savedSearch: 'search%20123' },
      searches: { 'search 123': { searchFormUrl: FORM_URL } }
    });
    expect(host._getEditSearchUrl()).toBe(FORM_URL);
  });

  test('a hostile searchFormUrl on a saved search is refused', () => {
    const host = makeHost({
      hashParams: { savedSearch: 's1' },
      searches: { s1: { searchFormUrl: 'https://evil.example/searches/InfluenzaSearch/' } }
    });
    expect(host._getEditSearchUrl()).toBeNull();
  });

  describe('stays hidden when there is nothing to return to', () => {
    test('a saved search with no form URL', () => {
      const host = makeHost({
        hashParams: { savedSearch: 's1' }, searches: { s1: { name: 'plain' } }
      });
      expect(host._getEditSearchUrl()).toBeNull();
    });

    test('an unknown saved search id', () => {
      const host = makeHost({ hashParams: { savedSearch: 'nope' } });
      expect(host._getEditSearchUrl()).toBeNull();
    });

    test('no hash params at all', () => {
      expect(makeHost()._getEditSearchUrl()).toBeNull();
    });

    test('a view the button does not belong on', () => {
      const host = makeHost({
        pathname: '/view/Taxonomy/2955291',
        hashParams: { influenzaSearch: 'abc123' },
        session: {
          'bvbrc:influenza-search:abc123': JSON.stringify({
            url: FORM_URL, form: { version: 1 }
          })
        }
      });
      expect(host._getEditSearchUrl()).toBeNull();
    });
  });

  test('a corrupt sessionStorage record does not throw', () => {
    const host = makeHost({
      hashParams: { influenzaSearch: 'abc123' },
      session: { 'bvbrc:influenza-search:abc123': 'not json' }
    });
    expect(host._getEditSearchUrl()).toBeNull();
  });

  test('a session record of the wrong form version is ignored', () => {
    const host = makeHost({
      hashParams: { influenzaSearch: 'abc123' },
      session: {
        'bvbrc:influenza-search:abc123': JSON.stringify({
          url: FORM_URL, form: { version: 99 }
        })
      }
    });
    expect(host._getEditSearchUrl()).toBeNull();
  });
});

describe('what gets persisted', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'GridContainer.js'), 'utf8');

  test('buildQueryDescriptor records the form URL', () => {
    expect(src).toMatch(/descriptor\.searchFormUrl = editUrl/);
  });

  test('QueryDescriptor.create keeps the field', () => {
    // create() builds a fixed object, so an unlisted field is dropped.
    const qd = fs.readFileSync(
      path.join(__dirname, '..', '..', 'util', 'QueryDescriptor.js'), 'utf8');
    expect(qd).toMatch(/searchFormUrl: options\.searchFormUrl \|\| null/);
  });

  test('only a hash-backed form URL is saved', () => {
    // The oversized-form path keeps state in history/sessionStorage only;
    // that URL cannot restore the selections, so no button beats a broken
    // one.
    expect(src).toMatch(/fluSearch=/);
  });
});
