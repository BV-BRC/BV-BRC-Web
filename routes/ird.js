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

function flag(req, name) {
  var v = req.config && req.config.get(name);
  return v === true || v === 'true';
}

function enabled(req) {
  return flag(req, 'enableIrdShell');
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
    irdSearchEnabled: flag(req, 'enableIrdSearch'),
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

// IRD search forms (Option C), inside the BV-BRC app with the IRD banner.
// A second flag, so the shell can be on without them (decision D6).
router.get('/search/sequences', function (req, res, next) {
  if (!flag(req, 'enableIrdSearch')) return next('router');
  req.applicationModule = 'p3/app/p3app';
  render(req, res, 'p3app', {
    title: 'Search Sequences', response: res, irdSkin: true, active: 'search'
  });
});

// IRD results pages: the BV-BRC grid for the grain with IRD's columns and
// display switch (widget/viewer/IrdResults). Same flags as the form.
router.get(/^\/results\/(segment|protein|strain)\/?$/, function (req, res, next) {
  if (!flag(req, 'enableIrdSearch')) return next('router');
  req.applicationModule = 'p3/app/p3app';
  render(req, res, 'p3app', {
    title: 'Search Results', response: res, irdSkin: true, active: 'search'
  });
});

// The banner's Quick Search box. Hands off to BV-BRC's global search results.
router.get('/quicksearch', function (req, res) {
  var q = shell.buildQuickSearchQuery(req.query.q, searchToQuery);
  res.redirect(302, q ? '/search/?' + q : '/ird/search');
});

module.exports = router;
