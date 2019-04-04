var express = require('express');
var router = express.Router();
var getQuery = function (query) {
  console.log(query);
};
/* GET index */
router.get('/', function (req, res) {
  req.applicationModule = 'p3/app/p3app';
  res.render('index', {
    title: 'PATRIC', request: req, response: res, news: getQuery('P3 GET Requests: ')
  });
});

module.exports = router;
