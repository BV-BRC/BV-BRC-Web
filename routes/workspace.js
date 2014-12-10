var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('*', function(req, res) {
  req.applicationModule = "p3/app/p3app";
	console.log("req.production: ", req.production, req.applicationModule);
  res.render('workspace', { title: 'PATRIC 3', request: req, response: res });
});

module.exports = router;
