/* eslint-env jest */
const fs = require('fs');
const path = require('path');

/**
 * QueryToEnglish.toPlainText.
 *
 * The module exports a bare function that returns HTML -- the list
 * viewers drop its <span class="searchField"> markup straight into
 * innerHTML. Three call sites were written against a `toPlainText` that
 * did not exist, so SaveSearchDialog and SavedSearchBrowser threw
 * "QueryToEnglish.toPlainText is not a function" and the Save Search
 * button silently did nothing. (QueryDescriptor guarded with a
 * truthiness check and so merely skipped the description.)
 *
 * The parser is stubbed with the {name, args} tree shape the walker
 * expects, so these drive the real HTML builder and the real stripping
 * rather than reimplementing either.
 */

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'QueryToEnglish.js'), 'utf8'
);

/** eq(field,value) */
const eq = (field, value) => ({ name: 'eq', args: [field, value] });

function loadWith(tree) {
  const parser = { parse: function () { return tree; } };
  let exported;
  const define = function (deps, factory) { exported = factory(parser); };
  // eslint-disable-next-line no-new-func
  new Function('define', SRC)(define);
  return exported;
}

describe('QueryToEnglish.toPlainText', () => {
  test('exists — three call sites depend on it', () => {
    const Q = loadWith(eq('genome_id', '83332.12'));
    expect(typeof Q).toBe('function');
    expect(typeof Q.toPlainText).toBe('function');
  });

  test('the HTML form still carries markup', () => {
    // Guards the assumption that makes toPlainText necessary.
    const Q = loadWith(eq('genome_id', '83332.12'));
    expect(Q('x')).toMatch(/<span/);
  });

  test('the plain form has none', () => {
    const Q = loadWith(eq('genome_id', '83332.12'));
    const text = Q.toPlainText('x');

    expect(text).not.toMatch(/[<>]/);
    // Underscores are humanised by the builder: genome_id -> "genome id".
    expect(text).toContain('genome id');
    expect(text).toContain('83332.12');
  });

  test('reads as a sentence, not a tag soup', () => {
    const Q = loadWith({
      name: 'and',
      args: [eq('genome_id', '1545742.911'), eq('annotation', 'PATRIC')]
    });
    // Matches what the Save Search dialog displays:
    //   genome_id is 1545742.911 AND annotation is PATRIC
    const text = Q.toPlainText('x');

    expect(text).toMatch(/genome id\s+is\s+1545742\.911/);
    expect(text).toMatch(/\bAND\b/);
    expect(text).toMatch(/annotation\s+is\s+PATRIC/);
  });

  test('collapses the whitespace the stripped tags leave behind', () => {
    const Q = loadWith(eq('genome_id', '83332.12'));
    const text = Q.toPlainText('x');

    expect(text).not.toMatch(/\s{2,}/);
    expect(text).toBe(text.trim());
  });

  describe('entity decoding', () => {
    /**
     * The builder escapes values, so a value containing markup characters
     * arrives as &lt; / &gt; / &quot;. Plain text should read as the user
     * wrote it.
     */
    test.each([
      ['a > b', '>'],
      ['a < b', '<'],
      ['say "hi"', '"'],
      ["it's", "'"],
      ['a & b', '&']
    ])('a value containing %p round-trips the %p', (value, ch) => {
      const Q = loadWith(eq('product', value));
      const text = Q.toPlainText('x');

      expect(text).toContain(value);
      expect(text).toContain(ch);
      // No half-decoded entities left over.
      expect(text).not.toMatch(/&(amp|lt|gt|quot|#039);/);
    });

    test('&amp; is decoded last, so &amp;lt; does not become <', () => {
      // Ordering bug check: decoding & first would turn the escaped
      // "&lt;" in a literal value into a real angle bracket.
      const Q = loadWith(eq('product', '&lt;'));
      expect(Q.toPlainText('x')).toContain('&lt;');
    });
  });

  describe('unparseable or empty input', () => {
    test('an empty description yields an empty string', () => {
      // parse() returning undefined is how the module signals a parse
      // failure; toPlainText must not throw on it.
      const parser = { parse: function () { throw new Error('bad query'); } };
      let Q;
      const define = function (deps, factory) { Q = factory(parser); };
      // eslint-disable-next-line no-new-func
      new Function('define', SRC)(define);

      expect(Q.toPlainText('not a query')).toBe('');
    });

    test.each([[''], [null], [undefined]])('%p yields an empty string', (q) => {
      // A real parser throws on empty input, which the module catches and
      // returns undefined from -- so stub that rather than a valid tree.
      const parser = { parse: function (f) {
        if (!f) throw new Error('empty');
        return eq('a', 'b');
      } };
      let Q;
      const define = function (deps, factory) { Q = factory(parser); };
      // eslint-disable-next-line no-new-func
      new Function('define', SRC)(define);

      expect(Q.toPlainText(q)).toBe('');
    });
  });
});

describe('implementation stays in step', () => {
  test('toPlainText is attached to the exported function', () => {
    expect(SRC).toContain('queryToEnglish.toPlainText = function');
    expect(SRC).toContain('return queryToEnglish;');
  });
});
