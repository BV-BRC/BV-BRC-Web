var express = require('express');
var router = express.Router();

/* GET workspace page. */
router.get('*', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.set('cache-control', 'private, no-store, max-age=0, no-cache, must-revalidate, post-check=0, pre-check=0');
  res.set('pragma', 'no-cache');
  res.set('expires', 'Fri, 01 Jan 1990 00:00:00 GMT');
  res.render('p3app', { title: 'PATRIC Workspace', request: req, response: res });
});

module.exports = router;
