var express = require('express');
var fs = require('fs');
var path = require('path');
var shell = require('../lib/irdShell');

var router = express.Router();

// util/searchToQuery is an AMD module shared with the browser. Load it once
// with a minimal define() so Quick Search uses the same parser.
var searchToQuery = (function () {
  var src = fs.readFileSync(path.join(__dirname, '../public/js/p3/util/searchToQuery.js'), 'utf8');
  var exported;
  // eslint-disable-next-line no-new-func
  new Function('define', src)(function (deps, factory) { exported = factory(); });
  return exported;
}());

function enabled(req) {
  var v = req.config && req.config.get('enableIrdShell');
  return v === true || v === 'true';
}

// Off: behave as if /ird did not exist, so the request falls through to the
// site's ordinary 404.
router.use(function (req, res, next) {
  next(enabled(req) ? undefined : 'router');
});

function render(req, res, view, locals) {
  var docs = req.config.get('docsServiceURL');
  res.render(view, Object.assign({
    request: req,
    shell: shell,
    href: function (h) { return shell.resolveHref(h, docs); }
  }, locals));
}

router.get('/', function (req, res) {
  render(req, res, 'ird/home', { pageTitle: 'Home', active: 'home' });
});

['search', 'analyze'].forEach(function (id) {
  router.get('/' + id, function (req, res) {
    var section = shell.findSection(id);
    render(req, res, 'ird/landing', { pageTitle: section.label, active: id, section: section });
  });
});

// The banner's Quick Search box. Hands off to BV-BRC's global search results.
router.get('/quicksearch', function (req, res) {
  var q = shell.buildQuickSearchQuery(req.query.q, searchToQuery);
  res.redirect(302, q ? '/search/?' + q : '/ird/search');
});

module.exports = router;
