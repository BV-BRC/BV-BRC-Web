var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('index', { title: 'PATRIC', request: req, response: res });
});

/* GET about page. */
router.get('/about', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('pages/about', { title: 'PATRIC', request: req, response: res });
});

/* GET announcements page. */
router.get('/announcements', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('pages/announcements', { title: 'PATRIC', request: req, response: res });
});

/* GET citation page. */
router.get('/citation', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('pages/citation', { title: 'PATRIC', request: req, response: res });
});

/* GET contact page. */
router.get('/contact', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('pages/contact', { title: 'PATRIC', request: req, response: res });
});

/* GET publications page. */
router.get('/publications', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('pages/publications', { title: 'PATRIC', request: req, response: res });
});

/* GET related resources page. */
router.get('/related-resources', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('pages/related-resources', { title: 'PATRIC', request: req, response: res });
});

/* GET team page. */
router.get('/team', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('pages/team', { title: 'PATRIC', request: req, response: res });
});

/* SARS CoV-2 */
router.get('/sars-cov-2', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('pages/sars-cov-2', { title: 'PATRIC', request: req, response: res });
});

module.exports = router;
