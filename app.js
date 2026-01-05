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
var users = require('./routes/users');
var reportProblem = require('./routes/reportProblem');
var notifySubmitSequence = require('./routes/notifySubmitSequence');
var linkedin = require('./routes/linkedin');
var google = require('./routes/google');
var workspace = require('./routes/workspace');
var outbreaks = require('./routes/outbreaks');
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

// Security middleware imports
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sanitizeUrlPath } = require('./lib/securityUtils');

// Rate limiters for different route types
const problemReportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window per IP
  message: { error: 'Too many problem reports submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const feedLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { error: 'Too many feed requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(path.join(__dirname, '/public/favicon.ico'), { maxAge: '365d' }));
app.use(logger('dev'));
app.use(cookieParser(config.get('cookieSecret')));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",  // Required for inline scripts in EJS templates
        "'unsafe-eval'",    // Required for Dojo framework
        "https://www.bv-brc.org",
        "https://www.linkedin.com",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://www.bv-brc.org",
        "https://*.bv-brc.org",
        "https://api.linkedin.com",
        "https://www.linkedin.com"
      ],
      frameSrc: [
        "'self'",
        "https://www.linkedin.com"
      ],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,  // Allow embedded content
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Block access to demo directories with legacy/vulnerable jQuery versions
app.use(['/js/jDataView/demo', '/js/phyloview/testTree.html'], function(req, res) {
  res.status(404).send('Not Found');
});

const proxyConfig = config.get('proxyConfig');
if (proxyConfig) {
  const proxy = require("express-http-proxy");
  var prox;

  for (const prox of proxyConfig) {
    console.log(prox);
    app.use(prox.local, proxy(prox.site, {
      proxyReqPathResolver: req => req.originalUrl.replace(prox.local, ""),
      https: true
    }));
  }
}

app.use(function (req, res, next) {
  // console.log("Config.production: ", config.production);
  // console.log("Session Data: ", req.session);
  req.config = config;
  req.production = config.get('production') || false;
  req.productionLayers = [
    'p3/layer/core'
  ];
  req.package = packageJSON;

  // Sanitize originalUrl for safe use in templates (prevents XSS in canonical URLs)
  req.safeOriginalUrl = sanitizeUrlPath(req.originalUrl || '');

  // var authToken = "";
  // var userProf = "";
  req.applicationOptions = {
    version: '3.0',
    gaID: config.get('gaID') || false,
    uaID: config.get('uaID') || false,
    probModelSeedServiceURL: config.get('probModelSeedServiceURL'), // for dashboard
    shockServiceURL: config.get('shockServiceURL'), // for dashboard
    workspaceServiceURL: config.get('workspaceServiceURL'),
    workspaceDownloadServiceURL: config.get('workspaceDownloadServiceURL'),
    appBaseURL: config.get('appBaseURL'),
    appServiceURL: config.get('appServiceURL'),
    dataServiceURL: config.get('dataServiceURL'),
    homologyServiceURL: config.get('homologyServiceURL'),
    mailinglistURL: config.get("mailinglistURL"),
    genomedistanceServiceURL: config.get('genomedistanceServiceURL'),
    compareregionServiceURL: config.get('compareregionServiceURL'),
    docsServiceURL: config.get('docsServiceURL'),
    enableDevTools: config.get('enableDevTools'),
    accountURL: config.get('accountURL'),
    appLabel: config.get('appLabel'),
    jiraLabel: config.get('jiraLabel'),
    appVersion: packageJSON.version,
    userServiceURL: config.get('userServiceURL'),
    copilotApiURL: config.get('copilotApiURL') || false,
    copilotDbURL: config.get('copilotDbURL') || false,
    copilotEnablePublications: config.get('copilotEnablePublications') || false,
    copilotEnableEnhancePrompt: config.get('copilotEnableEnhancePrompt') || false,
    copilotEnableShowPromptDetails: config.get('copilotEnableShowPromptDetails') || false,
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

const staticHeaders = {
  maxage: '356d',
  setHeaders: function (res, path) {
    // Append 'immutable' to existing Cache-Control header set by Express
    var existingCacheControl = res.getHeader('Cache-Control');
    if (existingCacheControl) {
      res.setHeader('Cache-Control', existingCacheControl + ', immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=30758400, immutable');
    }
    var d = new Date();
    d.setYear(d.getFullYear() + 1);
    res.setHeader('Expires', d.toGMTString())
  }
}

app.use('/js/' + packageJSON.version + '/', [
  express.static(path.join(__dirname, 'public/js/release/'), staticHeaders),
  express.static(path.join(__dirname, 'public/js/'),staticHeaders)
]);

app.use('/js/', express.static(path.join(__dirname, 'public/js/'), {
  maxage: config.get('production') ? '365d' : '1h',
  setHeaders: function (res, path) {
    var d = new Date();
    if (config.get('production')) {
      d.setYear(d.getFullYear() + 1);
    } else {
      d.setHours(d.getHours() + 1);
    }
    res.setHeader('Expires', d.toGMTString());
  }
}));
app.use('/patric/images', express.static(path.join(__dirname, 'public/patric/images/'), {
  maxage: '365d',
  setHeaders: function (res, path) {
    var existingCacheControl = res.getHeader('Cache-Control');
    if (existingCacheControl) {
      res.setHeader('Cache-Control', existingCacheControl + ', immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
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
app.use('/patric/', express.static(path.join(__dirname, 'public/patric/'), {
  maxage: '365d',
  setHeaders: function (res, path) {
    var d = new Date();
    d.setYear(d.getFullYear() + 1);
    res.setHeader('Expires', d.toGMTString());
  }
}));
app.use('/public/', express.static(path.join(__dirname, 'public/'), {
  maxage: '365d',
  setHeaders: function (res, path) {
    var d = new Date();
    d.setYear(d.getFullYear() + 1);
    res.setHeader('Expires', d.toGMTString());
  }
}));
app.use('/', routes);
// app.use('/home-prev', prevHome);
app.post('/reportProblem', problemReportLimiter, reportProblem);
app.post('/notifySubmitSequence', problemReportLimiter, notifySubmitSequence);
app.use('/linkedin', feedLimiter, linkedin);
app.use('/google', feedLimiter, google);
app.use('/workspace', workspace);
app.use('/content', contentViewer);
app.use('/webpage', contentViewer);
app.use('/user', contentViewer);
app.use('/sulogin', contentViewer);
app.use('/login', contentViewer);
app.use('/register', contentViewer);
app.use('/verify_refresh', contentViewer);
app.use('/verify_failure', contentViewer);
app.use('/remote', remotePage);
app.use('/outbreaks', outbreaks);
app.use('/view', viewers);
app.use('/search', search);
app.use('/searches', search);
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
// will print stacktrace only in true development environment
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    // Log full error for debugging
    console.error('Development error:', err);
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      // Double-check NODE_ENV to prevent accidental exposure
      error: process.env.NODE_ENV === 'development' ? err : {}
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
