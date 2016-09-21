var express = require('express');
var router = express.Router();
var getNews = require("../news");
/* GET home page. */
router.get('/', function(req, res){
	req.applicationModule = "p3/app/p3app";
	res.render('index', {title: 'PATRIC', request: req, response: res, news: getNews("&limit(3)&sort(-pubDate)")});
});

module.exports = router;
