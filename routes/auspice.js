/**
 * Charon API for embedded Auspice/Nextstrain viewer.
 * Serves dataset list and dataset JSON from ./datasets so no separate Auspice server is needed.
 */
const express = require('express');
const compression = require('compression');
const router = express.Router();

// compress all responses from the auspice router, including dataset JSONs
router.use(compression());

const datasetsPath = process.env.NEXTSTRAIN_DATASET_DIR;

const getDatasetAuspice = require('auspice/cli/server/getDataset').setUpGetDatasetHandler({
  datasetsPath
});

// Normalize prefixes that accidentally include the viewer path.
// Example: prefix="nextstrain-viewer/zika" -> "zika" (getDatasetHelpers reads req.url, so we must rewrite it)
router.get('/getDataset', (req, res, next) => {
  const rawPrefix = req.query && typeof req.query.prefix === 'string' ? req.query.prefix : '';
  if (rawPrefix) {
    let p = rawPrefix.replace(/^\/+|\/+$/g, '');
    const viewerPrefix = 'nextstrain-viewer/';
    if (p.startsWith(viewerPrefix)) {
      p = p.slice(viewerPrefix.length);
    }
    // Rewrite req.url so interpretRequest() sees the correct prefix (it parses req.url, not req.query)
    const q = req.url.indexOf('?') >= 0 ? req.url.slice(req.url.indexOf('?') + 1) : '';
    // Match prefix=... at start of query or after & (query string has no leading ?)
    const newQuery = q.replace(/(^|&)prefix=[^&]*/i, '$1prefix=' + encodeURIComponent(p));
    if (newQuery !== q) {
      req.url = req.url.split('?')[0] + '?' + newQuery;
    }
  }
  return getDatasetAuspice(req, res, next);
});
// Return empty dataset list to hide other options for now
router.get('/getAvailable', (req, res) => {
  res.json({ datasets: [], narratives: [] });
});

router.get('*', (req, res) => {
  res.status(500).type('text/plain').send('Query unhandled -- ' + req.originalUrl);
});

module.exports = router;
