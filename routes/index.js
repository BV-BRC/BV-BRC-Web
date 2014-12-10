var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  req.applicationModule = "p3/app/p3home";
  res.render('index', { title: 'PATRIC 3', request: req, response: res });
});

module.exports = router;
