/* eslint-env jest */
const fs = require('fs');
const path = require('path');
const shell = require('../irdShell');

const ROOT = path.join(__dirname, '..', '..');

function loadAmd(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (deps, factory) { exported = factory(); });
  return exported;
}

const searchToQuery = loadAmd('public/js/p3/util/searchToQuery.js');

/**
 * processQuery() from GlobalSearch.js, cut out of the widget source. It sits
 * inside the AMD factory and its only free names are the four query parsers,
 * which are passed in.
 */
function globalSearchProcessQuery() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/p3/widget/GlobalSearch.js'), 'utf8');
  const start = src.indexOf('function processQuery(');
  const end = src.indexOf('return q;\n  }', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const body = src.slice(start, end + 'return q;\n  }'.length);
  const parsers = ['searchToQuery', 'searchToQueryWithOr', 'searchToQueryWithQuoteOr', 'searchToQueryWithQuoteAnd'];
  // eslint-disable-next-line no-new-func
  return new Function(...parsers, body + '\nreturn processQuery;')(
    ...parsers.map((p) => loadAmd('public/js/p3/util/' + p + '.js'))
  );
}

function allItems() {
  const out = [];
  shell.navigation.forEach((g) => g.sections.forEach((s) => s.items.forEach((i) => out.push(i))));
  return out;
}

describe('buildQuickSearchQuery', () => {
  const processQuery = globalSearchProcessQuery();
  const inputs = [
    'H5N1',
    'hemagglutinin H5',
    'A/Texas/37/2024',
    'CY121680',
    'fig|83332.12.peg.1',
    '83332.12',
    '"EC 3.2.1.1"',
    'amylase (EC 3.2.1.1)',
    '"amylase (EC 3.2.1.1)"',
    'neuraminidase NOT H1N1',
    'swine OR avian',
    'host:chicken',
    "o'brien",
    'H3N2, H1N1 + pdm09',
    'A/swine/Iowa/A02524-2020',
    'pdm09-like H1 <> H3=x \\ (+) (-)',
    '  spaced   out  '
  ];

  test.each(inputs)('THE POINT: matches the BV-BRC global search for %j', (text) => {
    // The banner search box must find exactly what the search box on every
    // other BV-BRC page finds. Fails if GlobalSearch.js processQuery changes.
    const expected = processQuery(text.replace(/^\s+|\s+$/g, ''), 'option_and');
    expect(shell.buildQuickSearchQuery(text, searchToQuery)).toBe(expected);
  });

  test('IDs are searched exactly, words as keywords', () => {
    // Anything ending in a digit counts as an ID, which includes subtypes like H5N1.
    expect(shell.buildQuickSearchQuery('hemagglutinin CY121680', searchToQuery))
      .toBe('and(keyword(hemagglutinin),keyword(%22CY121680%22))');
  });

  test.each(['', '   ', '!!!', null, undefined])('nothing searchable in %j gives null', (text) => {
    expect(shell.buildQuickSearchQuery(text, searchToQuery)).toBeNull();
  });

  test('a parser failure still searches the words, unquoted', () => {
    const throws = () => { throw new Error("Unexpected ')'"); };
    expect(shell.buildQuickSearchQuery('flu (avian', throws)).toBe('keyword(flu%20%20avian)');
  });
});

describe('resolveHref', () => {
  test('docs: paths join onto docsServiceURL with exactly one slash', () => {
    expect(shell.resolveHref('docs:tutorial/index.html', 'https://www.bv-brc.org/docs/'))
      .toBe('https://www.bv-brc.org/docs/tutorial/index.html');
    expect(shell.resolveHref('docs:tutorial/index.html', 'https://www.bv-brc.org/docs'))
      .toBe('https://www.bv-brc.org/docs/tutorial/index.html');
  });

  test('site paths are left alone', () => {
    expect(shell.resolveHref('/app/MSA', 'https://x/docs/')).toBe('/app/MSA');
    expect(shell.resolveHref(shell.INFLUENZA_A + '#view_tab=genomes', 'https://x/docs/'))
      .toBe('/view/Taxonomy/2955291#view_tab=genomes');
  });
});

describe('navigation data', () => {
  test('every item has a label and exactly one of href / unavailable', () => {
    allItems().forEach((item) => {
      expect(typeof item.label).toBe('string');
      expect(!!item.href !== !!item.unavailable).toBe(true);
    });
  });

  test('landing ids resolve, and only search and analyze have landing pages', () => {
    expect(shell.findSection('search').landing).toBe('/ird/search');
    expect(shell.findSection('analyze').landing).toBe('/ird/analyze');
    expect(shell.navigation.filter((g) => g.landing).map((g) => g.id)).toEqual(['search', 'analyze']);
    expect(shell.findSection('nope')).toBeNull();
  });

  test('THE POINT: every site link goes to a page BV-BRC itself advertises', () => {
    // A route that resolves is not enough: Strain Search still resolves but
    // is retired on purpose and redirects to /searches. So destinations are
    // limited to what the BV-BRC menus link to, plus the few pages linked from
    // the taxon overviews, and Influenza A taxon tabs that are shown.
    const header = fs.readFileSync(path.join(ROOT, 'views/bv-brc-header.ejs'), 'utf8');
    const advertised = new Set((header.match(/href="(\/[^"]*)"/g) || []).map((m) => m.slice(6, -1)));
    const alsoLinkedElsewhere = {
      '/view/VaccineStrain': 'public/js/p3/widget/TaxonomyOverview.js',
      '/workspace/': 'public/js/p3/app/p3app.js'
    };
    Object.keys(alsoLinkedElsewhere).forEach((h) => {
      const src = fs.readFileSync(path.join(ROOT, alsoLinkedElsewhere[h]), 'utf8');
      expect(src).toContain("'" + h);
    });
    // Strains is built but hidden on taxon pages (Taxonomy.js), so not here.
    const shownTabs = ['overview', 'genomes', 'sequences', 'features', 'proteins', 'structures',
      'proteinFeatures', 'epitope', 'surveillance', 'serology', 'sfvt'];

    const links = allItems().concat(shell.utilityNav, shell.influenzaLinks)
      .map((i) => i.href)
      .filter((h) => h && h.charAt(0) === '/');
    expect(links.length).toBeGreaterThan(20);
    links.forEach((h) => {
      const tab = h.match(/^\/view\/Taxonomy\/2955291#view_tab=(\w+)$/);
      const ok = advertised.has(h) || h in alsoLinkedElsewhere || (tab && shownTabs.includes(tab[1]));
      if (!ok) {
        throw new Error('not an advertised BV-BRC page: ' + h);
      }
    });
  });

  test('the retired strain pages are not linked', () => {
    const hrefs = allItems().map((i) => i.href || '');
    expect(hrefs.filter((h) => /StrainSearch|StrainList|view_tab=strains/.test(h))).toEqual([]);
  });

  test('Influenza A is the taxon the BV-BRC menus use', () => {
    const header = fs.readFileSync(path.join(ROOT, 'views/bv-brc-header.ejs'), 'utf8');
    expect(header).toContain('name: "Influenza A virus", href: "' + shell.INFLUENZA_A + '#view_tab=overview"');
  });
});
