var config = require('./config');
if (config.get('newrelic_license_key')) {
  require('newrelic');
}
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var packageJSON = require('./package.json');
var routes = require('./routes/index');
// var prevHome = require('./routes/prevHome');
var users = require('./routes/users');
var reportProblem = require('./routes/reportProblem');
var workspace = require('./routes/workspace');
var viewers = require('./routes/viewers');
var remotePage = require('./routes/remotePage');
var search = require('./routes/search');
var contentViewer = require('./routes/content');
var apps = require('./routes/apps');
var uploads = require('./routes/uploads');
var jobs = require('./routes/jobs');
var systemStatus = require('./routes/systemStatus');
var help = require('./routes/help');
var app = express();
var httpProxy = require('http-proxy');
var apiProxy = httpProxy.createProxyServer();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, '/public/favicon.ico')));
app.use(logger('dev'));
app.use(cookieParser(config.get('cookieSecret')));

app.use(function (req, res, next) {
  // console.log("Config.production: ", config.production);
  // console.log("Session Data: ", req.session);
  req.config = config;
  req.production = config.get('production') || false;
  req.productionLayers = ['p3/layer/core'];
  req.package = packageJSON;
  // var authToken = "";
  // var userProf = "";
  req.applicationOptions = {
    version: '3.0',
    gaID: config.get('gaID') || false,
    probModelSeedServiceURL: config.get('probModelSeedServiceURL'), // for dashboard
    shockServiceURL: config.get('shockServiceURL'), // for dashboard
    workspaceServiceURL: config.get('workspaceServiceURL'),
    appServiceURL: config.get('appServiceURL'),
    dataServiceURL: config.get('dataServiceURL'),
    homologyServiceURL: config.get('homologyServiceURL'),
    genomedistanceServiceURL: config.get('genomedistanceServiceURL'),
    compareregionServiceURL: config.get('compareregionServiceURL'),
    docsServiceURL: config.get('docsServiceURL'),
    enableDevTools: config.get('enableDevTools'),
    accountURL: config.get('accountURL'),
    appLabel: config.get('appLabel'),
    appVersion: packageJSON.version,
    userServiceURL: config.get('userServiceURL'),
    localStorageCheckInterval: config.get('localStorageCheckInterval')
  };
  // console.log("Application Options: ", req.applicationOptions);
  next();
});

var proxies = config.get('proxy');

app.use('/p/:proxy/', function (req, res, next) {
  if (proxies[req.params.proxy]) {
    apiProxy.web(req, res, { target: proxies[req.params.proxy] });
  } else {
    next();
  }
});

app.use('/portal/portal/patric/Home', [
  function (req, res, next) {
    console.log('Got Portal Request');
    next();
  },
  express.static(path.join(__dirname, 'public/cached.html'))
]);

app.use('*jbrowse.conf', express.static(path.join(__dirname, 'public/js/jbrowse.conf')));
app.use('/js/' + packageJSON.version + '/', [
  express.static(path.join(__dirname, 'public/js/release/'), {
    maxage: '356d',
    setHeaders: function (res, path) {
      var d = new Date();
      d.setYear(d.getFullYear() + 1);
      res.setHeader('Expires', d.toGMTString());
    }
  })
]);
app.use('/js/swfobject/', express.static(path.join(__dirname, 'node_modules/swfobject-amd/')));
app.use('/js/', express.static(path.join(__dirname, 'public/js/')));
app.use('/patric/images', express.static(path.join(__dirname, 'public/patric/images/'), {
  maxage: '365d',
  setHeaders: function (res, path) {
    var d = new Date();
    d.setYear(d.getFullYear() + 1);
    res.setHeader('Expires', d.toGMTString());
  }
}));
app.use('/public/pdfs/', [
  function (req, res, next) {
    res.redirect('https://docs.patricbrc.org/tutorial/');
  }
]);
app.use('/patric/', express.static(path.join(__dirname, 'public/patric/')));
app.use('/public/', express.static(path.join(__dirname, 'public/')));
app.use('/', routes);
// app.use('/home-prev', prevHome);
app.post('/reportProblem', reportProblem);
app.use('/workspace', workspace);
app.use('/content', contentViewer);
app.use('/webpage', contentViewer);
app.use('/user', contentViewer);
app.use('/sulogin', contentViewer);
app.use('/remote', remotePage);
app.use('/view', viewers);
app.use('/search', search);
app.use('/app', apps);
app.use('/job', jobs);
app.use('/status', systemStatus);  // system status page
app.use('/help', help);
app.use('/uploads', uploads);
app.use('/users', users);

// MTB Taxon Overview Route
app.use('/pathogens/mtb', [
  function (req, res, next) {
    res.redirect('/view/Taxonomy/1773#view_tab=overview');
  }
]);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
