/* eslint-env jest */
// WorkspacePathUtils: which text becomes a workspace path chip, and its link.
const path = require('path');

const WP = require(path.join(__dirname, '..', 'WorkspacePathUtils.js'));

const WORKSHOP = '/ARWattam@patricbrc.org/BV-BRC Workshop/AMR_Workshop/Streptococcus/2_Taxonomic Classification';

const paths = (text) => WP.findPathMatches(text).map((m) => m.path);

describe('delimited paths keep their spaces', () => {
  test.each([
    ['double quotes', `tell me about "${WORKSHOP}" please`],
    ['backticks', `tell me about \`${WORKSHOP}\` please`],
    ['angle brackets', `tell me about <${WORKSHOP}> please`],
  ])('%s', (_label, text) => {
    const [m] = WP.findPathMatches(text);
    expect(m.path).toBe(WORKSHOP);
    expect(text.slice(m.start, m.end)).toBe(WORKSHOP);
    expect(text.slice(m.outerStart, m.outerEnd)).toBe(text.slice(14, 14 + WORKSHOP.length + 2));
    expect(WP.findPathMatches(text)).toHaveLength(1);
  });

  test('characters the plain pattern lacks are allowed inside quotes', () => {
    expect(paths('"/user@bvbrc/home/Run #3 (final)/out.txt"')).toEqual(['/user@bvbrc/home/Run #3 (final)/out.txt']);
  });

  test('a trailing slash is dropped', () => {
    expect(paths('"/user@bvbrc/home/My Data/"')).toEqual(['/user@bvbrc/home/My Data']);
  });

  test('quoted text that is not just a path falls back to the plain rule', () => {
    const text = 'see "files in /user@bvbrc/home/Results" now';
    const [m] = WP.findPathMatches(text);
    expect(m.path).toBe('/user@bvbrc/home/Results');
    expect(m.outerStart).toBe(m.start);
  });

  test('a quoted path cannot cross a line break', () => {
    expect(paths('"/user@bvbrc/home/a\nb"')).toEqual(['/user@bvbrc/home/a']);
  });

  test('a non-path quote before a quoted path does not hide it', () => {
    expect(paths(`he said "hi" and "${WORKSHOP}"`)).toEqual([WORKSHOP]);
  });
});

describe('unquoted paths', () => {
  test('spaces between folders continue the path, a space in the last segment ends it', () => {
    expect(paths(`tell me about this workshop example: ${WORKSHOP}`))
      .toEqual(['/ARWattam@patricbrc.org/BV-BRC Workshop/AMR_Workshop/Streptococcus/2_Taxonomic']);
  });

  test('a path followed by words is not extended', () => {
    expect(paths('look in /user@bvbrc/home/Results and tell me')).toEqual(['/user@bvbrc/home/Results']);
  });

  test('two paths separated by a word stay two paths', () => {
    expect(paths('compare /user@bvbrc/home/a vs /user@bvbrc/home/b')).toEqual(['/user@bvbrc/home/a', '/user@bvbrc/home/b']);
  });

  test('trailing punctuation is trimmed', () => {
    expect(paths('Results are in /user@bvbrc/home/Results.')).toEqual(['/user@bvbrc/home/Results']);
    expect(paths('(see /home/x/y), then')).toEqual(['/home/x/y']);
  });

  test('shared roots', () => {
    expect(paths('/workspace/a/b and /scratch/c')).toEqual(['/workspace/a/b', '/scratch/c']);
  });

  test('apostrophes in prose are not delimiters', () => {
    expect(paths("it's in /user@bvbrc/home/Results, isn't it")).toEqual(['/user@bvbrc/home/Results']);
    expect(paths("'/user@bvbrc/home/My Data'")).toEqual(['/user@bvbrc/home/My']);
  });

  test('quoted and unquoted in one line, in order', () => {
    const text = `/user@bvbrc/home/a then "${WORKSHOP}"`;
    expect(paths(text)).toEqual(['/user@bvbrc/home/a', WORKSHOP]);
  });

  test('no paths', () => {
    expect(WP.findPathMatches('')).toEqual([]);
    expect(WP.findPathMatches(null)).toEqual([]);
    expect(paths('and/or 3/4 /tmp/x')).toEqual([]);
  });
});

describe('wholePath (inline code)', () => {
  test('only a lone path counts', () => {
    expect(WP.wholePath(WORKSHOP)).toBe(WORKSHOP);
    expect(WP.wholePath('cd /user@bvbrc/home/a')).toBeNull();
    expect(WP.wholePath('p3-cp /user@bvbrc/a ws:/b')).toBeNull();
    expect(WP.wholePath(' /user@bvbrc/home/a')).toBeNull();
    expect(WP.wholePath('/user@bvbrc')).toBeNull();
    expect(WP.wholePath('/tmp/x')).toBeNull();
  });
});

describe('links', () => {
  test('each segment is encoded, the user segment is not', () => {
    expect(WP.toWorkspaceBrowserUrl('/user@bvbrc/home/Run #3/50% done?'))
      .toBe('/workspace/user@bvbrc/home/Run%20%233/50%25%20done%3F');
    expect(WP.toWorkspaceBrowserUrl(WORKSHOP))
      .toBe('/workspace/ARWattam@patricbrc.org/BV-BRC%20Workshop/AMR_Workshop/Streptococcus/2_Taxonomic%20Classification');
  });

  test('/public keeps the owner segment', () => {
    expect(WP.encodeWorkspacePath('/public/ARWattam@patricbrc.org/BV-BRC Workshop'))
      .toBe('/public/ARWattam@patricbrc.org/BV-BRC%20Workshop');
  });

  test('round-trips through decodeURIComponent per segment', () => {
    const p = '/user@bvbrc/home/Run #3/a&b (c)';
    const decoded = WP.encodeWorkspacePath(p).split('/').map(decodeURIComponent).join('/');
    expect(decoded).toBe(p);
  });

  test('bad input', () => {
    expect(WP.toWorkspaceBrowserUrl('')).toBeNull();
    expect(WP.toWorkspaceBrowserUrl(null)).toBeNull();
    expect(WP.toWorkspaceBrowserUrl('user@bvbrc/home')).toBe('/workspace/user@bvbrc/home');
  });
});
