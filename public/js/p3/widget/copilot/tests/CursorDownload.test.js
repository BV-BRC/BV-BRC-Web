/* eslint-env jest */
const path = require('path');

const CD = require(path.join(__dirname, '..', 'CursorDownload.js'));

// What shared/tools/url_utils.py builds (build_tsv_download_url / build_fasta_download_url).
const TSV = 'https://www.bv-brc.org/api-bulk/genome/?eq(genus,Salmonella)&sort%28+genome_id%29&limit%2825000%29&http_accept=text/tsv&http_download=true';
const FASTA = 'https://www.bv-brc.org/api-bulk/genome_feature/?eq(genome_id,83332.12)&sort%28+feature_id%29&limit%28100000%29&http_accept=application/protein+fasta&http_download=true';

function response(text, { total, next, status = 200 } = {}) {
  const headers = { 'Content-Range': total == null ? null : `items 0-1/${total}`, 'X-Cursor-Mark': next || null };
  return Promise.resolve({
    ok: status < 400,
    status,
    headers: { get: (name) => headers[name] },
    text: () => Promise.resolve(text)
  });
}

// A fake API that serves `pages` (arrays of row strings) by cursor mark.
function fakeApi(pages, { header = 'Genome ID\tGenome Name', total } = {}) {
  const calls = [];
  const fetch = (url, init) => {
    calls.push({ url, init });
    const mark = decodeURIComponent(/cursor\(([^)]*)\)/.exec(url)[1]);
    const limit = Number(/limit\((\d+)\)/.exec(url)[1]);
    const n = total != null ? total : pages.flat().length;
    if (limit === 1) return response(`${header}\n${pages[0][0] || ''}\n`, { total: n, next: 'm1' });
    const i = mark === '*' ? 0 : Number(mark.slice(1));
    const rows = pages[i] || [];
    const body = header ? [header, ...rows].join('\n') + '\n' : rows.join('\n') + '\n';
    return response(body, { total: n, next: i + 1 < pages.length ? `m${i + 1}` : mark });
  };
  return { fetch, calls };
}

describe('parseDownloadUrl', () => {
  test('recognises the TSV and FASTA links url_utils builds', () => {
    const tsv = CD.parseDownloadUrl(TSV);
    expect(tsv).toMatchObject({ collection: 'genome', accept: 'text/tsv', hasSort: true });
    expect(tsv.parts).toEqual(['eq(genus,Salmonella)', 'sort%28+genome_id%29']);
    const fasta = CD.parseDownloadUrl(FASTA);
    expect(fasta).toMatchObject({ collection: 'genome_feature', accept: 'application/protein+fasta' });
  });

  test('ignores viewer pages, other hosts and links without http_download', () => {
    expect(CD.parseDownloadUrl('https://www.bv-brc.org/view/GenomeList/?eq(genus,Salmonella)')).toBeNull();
    expect(CD.parseDownloadUrl(TSV.replace('www.bv-brc.org', 'evil.example.com'))).toBeNull();
    expect(CD.parseDownloadUrl(TSV.replace('&http_download=true', ''))).toBeNull();
    expect(CD.parseDownloadUrl(TSV.replace('text/tsv', 'application/json'))).toBeNull();
    expect(CD.parseDownloadUrl('not a url')).toBeNull();
  });

  test('a link without a sort is pageable only for a known collection', () => {
    const noSort = 'https://www.bv-brc.org/api/sp_gene/?eq(genome_id,1.1)&http_accept=text/tsv&http_download=true';
    const parsed = CD.parseDownloadUrl(noSort);
    expect(CD.canPage(parsed)).toBe(true);
    expect(CD.pageUrl(parsed, '*', 10)).toBe(
      'https://www.bv-brc.org/api/sp_gene/?eq(genome_id,1.1)&sort(+id)&cursor(*)&limit(10)&http_accept=text/tsv'
    );
    expect(CD.canPage(CD.parseDownloadUrl(noSort.replace('sp_gene', 'serology')))).toBe(false);
  });
});

describe('pageUrl and page joining', () => {
  test('replaces limit and http_download with cursor and page size, keeps query and sort', () => {
    const url = CD.pageUrl(CD.parseDownloadUrl(TSV), 'AoE+x/y=', 25000);
    expect(url).toBe(
      'https://www.bv-brc.org/api-bulk/genome/?eq(genus,Salmonella)&sort%28+genome_id%29'
      + '&cursor(AoE%2Bx%2Fy%3D)&limit(25000)&http_accept=text/tsv'
    );
  });

  test('TSV pages after the first lose their header; FASTA is kept as is', () => {
    const tsv = CD.parseDownloadUrl(TSV).format;
    expect(CD.pageBody('H\na\nb', tsv, true)).toBe('H\na\nb\n');
    expect(CD.pageBody('H\nc\n', tsv, false)).toBe('c\n');
    expect(CD.countRecords('H\na\nb\n', tsv)).toBe(2);
    expect(CD.countRecords('H\nc\n', tsv)).toBe(1); // the API repeats the header on every page
    const fasta = CD.parseDownloadUrl(FASTA).format;
    expect(CD.pageBody('>a\nMK\n>b\nML', fasta, false)).toBe('>a\nMK\n>b\nML\n');
    expect(CD.countRecords('>a\nMK\n>b\nML\n', fasta)).toBe(2);
  });

  test('totalFromRange', () => {
    expect(CD.totalFromRange('items 0-25000/57445')).toBe(57445);
    expect(CD.totalFromRange(null)).toBeNull();
  });
});

describe('run', () => {
  test('fetches every page with the token and joins them under one header', async () => {
    const api = fakeApi([['r1', 'r2'], ['r3', 'r4'], ['r5']]);
    const progress = [];
    const result = await CD.run(TSV, {
      fetch: api.fetch, token: 'un=u|sig=x', pageSize: 2, onProgress: (rows, total) => progress.push([rows, total])
    });
    expect(result.parts.join('')).toBe('Genome ID\tGenome Name\nr1\nr2\nr3\nr4\nr5\n');
    expect(result).toMatchObject({ rows: 5, total: 5, fileName: 'genome_5.tsv' });
    expect(progress).toEqual([[2, 5], [4, 5], [5, 5]]);
    expect(api.calls.every((c) => c.init.headers.Authorization === 'un=u|sig=x')).toBe(true);
    expect(api.calls).toHaveLength(4); // probe + 3 pages
  });

  test('stops when the cursor stops moving even without a total', async () => {
    const api = fakeApi([['>a', '>b']], { header: '' });
    const result = await CD.run(FASTA, { fetch: api.fetch, pageSize: 5 });
    expect(result.rows).toBe(2);
    expect(result.fileName).toBe('genome_feature_protein_2.fasta');
  });

  test('asks before a very large download and stops on no', async () => {
    const api = fakeApi([['r1']], { total: CD.CONFIRM_ABOVE_ROWS + 1 });
    const asked = [];
    const result = await CD.run(TSV, {
      fetch: api.fetch, confirmLarge: (n) => { asked.push(n); return Promise.resolve(false); }
    });
    expect(asked).toEqual([CD.CONFIRM_ABOVE_ROWS + 1]);
    expect(result).toEqual({ cancelled: true });
    expect(api.calls).toHaveLength(1); // the probe only
  });

  test('cancel stops between pages', async () => {
    const api = fakeApi([['r1', 'r2'], ['r3', 'r4'], ['r5']]);
    let pages = 0;
    const result = await CD.run(TSV, {
      fetch: api.fetch, pageSize: 2, onProgress: () => { pages += 1; }, isCancelled: () => pages >= 1
    });
    expect(result).toEqual({ cancelled: true });
    expect(api.calls).toHaveLength(2);
  });

  test('an HTTP error rejects', async () => {
    const fetch = () => response('nope', { status: 500 });
    await expect(CD.run(TSV, { fetch })).rejects.toThrow('HTTP 500');
  });
});

describe('run with a file to write to (File System Access API)', () => {
  test('writes each page as it arrives, one header, nothing kept', async () => {
    const api = fakeApi([['r1', 'r2'], ['r3', 'r4'], ['r5']]);
    const written = [];
    const sink = { write: (text) => { written.push(text); return Promise.resolve(); } };
    const result = await CD.run(TSV, { fetch: api.fetch, pageSize: 2, sink });
    expect(written).toEqual(['Genome ID\tGenome Name\nr1\nr2\n', 'r3\nr4\n', 'r5\n']);
    expect(result).toEqual({ rows: 5, total: 5, streamed: true });
  });

  test('does not ask about size: the file is on disk, not in memory', async () => {
    const api = fakeApi([['r1']], { total: CD.CONFIRM_ABOVE_ROWS + 1 });
    const confirmLarge = jest.fn(() => Promise.resolve(false));
    const sink = { write: () => Promise.resolve() };
    const result = await CD.run(TSV, { fetch: api.fetch, sink, confirmLarge });
    expect(confirmLarge).not.toHaveBeenCalled();
    expect(result.streamed).toBe(true);
  });

  test('a failed write stops the download', async () => {
    const api = fakeApi([['r1', 'r2'], ['r3']]);
    const sink = { write: () => Promise.reject(new Error('disk full')) };
    await expect(CD.run(TSV, { fetch: api.fetch, pageSize: 2, sink })).rejects.toThrow('disk full');
    expect(api.calls).toHaveLength(2); // probe + first page, nothing after the failed write
  });

  test('saveOptions names the file without a row count and gives its type', () => {
    expect(CD.saveOptions(TSV)).toEqual({
      suggestedName: 'genome.tsv',
      types: [{ description: 'TSV file', accept: { 'text/tab-separated-values': ['.tsv'] } }]
    });
    expect(CD.saveOptions(FASTA).suggestedName).toBe('genome_feature_protein.fasta');
    expect(CD.saveOptions('https://www.bv-brc.org/view/GenomeList/')).toBeNull();
  });
});
