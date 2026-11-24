/* eslint-env jest */
const path = require('path');
const express = require('express');
const shell = require('../../lib/irdShell');

const ROOT = path.join(__dirname, '..', '..');
const DOCS = 'https://docs.example.org/docs/';

/** The /ird router in a minimal app, with the bits of app.js it relies on. */
async function start(flag) {
  const app = express();
  app.set('views', path.join(ROOT, 'views'));
  app.set('view engine', 'ejs');
  app.use(function (req, res, next) {
    const conf = { enableIrdShell: flag, docsServiceURL: DOCS };
    req.config = { get: (k) => conf[k] };
    req.package = { version: '9.9.9' };
    next();
  });
  app.use('/ird', require('../ird'));
  app.use(function (req, res) {
    res.status(404).send('fell through');
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  return {
    get: (p) => fetch(base + p, { redirect: 'manual' }),
    close: () => new Promise((resolve) => { server.close(resolve); })
  };
}

function items(id) {
  const out = [];
  shell.findSection(id).sections.forEach((s) => s.items.forEach((i) => out.push(i)));
  return out;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
    .replace(/'/g, '&#39;');
}

describe('flag off', () => {
  let site;
  beforeAll(async () => { site = await start(false); });
  afterAll(() => site.close());

  test.each(['/ird/', '/ird/search', '/ird/analyze', '/ird/quicksearch?q=H5N1'])(
    'THE POINT: %s falls through to the ordinary 404',
    async (p) => {
      const res = await site.get(p);
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('fell through');
    }
  );
});

describe('flag on', () => {
  let site;
  beforeAll(async () => { site = await start(true); });
  afterAll(() => site.close());

  test('a string "true", as from argv or the environment, also turns it on', async () => {
    const other = await start('true');
    try {
      expect((await other.get('/ird/')).status).toBe(200);
    } finally {
      await other.close();
    }
  });

  test('home page has the IRD banner, menus, and stylesheet', async () => {
    const res = await site.get('/ird/');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="ird-logo"');
    expect(html).toContain('/public/ird/ird.css?v=9.9.9');
    shell.navigation.forEach((g) => expect(html).toContain(escapeHtml(g.label)));
  });

  test('THE POINT: menus leave out IRD features BV-BRC does not have', async () => {
    const html = await (await site.get('/ird/')).text();
    const menu = html.slice(html.indexOf('id="ird-navigation"'), html.indexOf('class="ird-notice"'));
    const gone = items('search').concat(items('analyze')).filter((i) => i.unavailable);
    expect(gone.length).toBeGreaterThan(5);
    gone.forEach((i) => expect(menu).not.toContain('>' + escapeHtml(i.label) + '<'));
    // ...while the ones that exist are there.
    expect(menu).toContain('href="/searches/SurveillanceSearch"');
  });

  test.each(['search', 'analyze'])('THE POINT: the %s landing page lists every IRD item, marking the missing ones', async (id) => {
    const res = await site.get('/ird/' + id);
    expect(res.status).toBe(200);
    const html = await res.text();
    const main = html.slice(html.indexOf('id="ird-main"'));
    items(id).forEach((i) => {
      if (i.unavailable) {
        expect(main).toContain('<span class="ird-item-label">' + escapeHtml(i.label) + '</span>');
        expect(main).toContain(escapeHtml(i.unavailable));
      } else {
        expect(main).toContain('href="' + escapeHtml(i.href) + '">' + escapeHtml(i.label) + '</a>');
      }
    });
  });

  test('docs links are resolved against docsServiceURL, no raw docs: left', async () => {
    const pages = await Promise.all(['/ird/', '/ird/search', '/ird/analyze'].map((p) => site.get(p).then((r) => r.text())));
    pages.forEach((html) => {
      expect(html).not.toContain('docs:');
      expect(html).toContain('href="' + DOCS + 'quick_start/ird-vipr_bv-brc_mapping.html"');
    });
  });

  test('labels are HTML-escaped', async () => {
    const html = await (await site.get('/ird/search')).text();
    expect(html).toContain('Sequences &amp; Strains');
    expect(html).not.toContain('Sequences & Strains');
  });

  test('Quick Search hands off to the BV-BRC global search results', async () => {
    const res = await site.get('/ird/quicksearch?q=' + encodeURIComponent('hemagglutinin CY121680'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/search/?and(keyword(hemagglutinin),keyword(%22CY121680%22))');
  });

  test.each(['', '?q=', '?q=%20%20', '?q=!!!'])('Quick Search with nothing to search (%s) goes to the search page', async (qs) => {
    const res = await site.get('/ird/quicksearch' + qs);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/ird/search');
  });

  test('unknown /ird paths fall through to the 404', async () => {
    expect((await site.get('/ird/brc/home.spg')).status).toBe(404);
  });
});
