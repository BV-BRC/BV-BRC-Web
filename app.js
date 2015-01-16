var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require("./config");
var session = require("express-session");
var RedisStore = require('connect-redis')(session);


var passport = require('passport')
, OAuth2Strategy = require('passport-oauth').OAuth2Strategy;

var routes = require('./routes/index');
var users = require('./routes/users');
var workspace  = require('./routes/workspace');
var viewers  = require('./routes/viewers');
var apps= require('./routes/apps');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser(config.get('cookieSecret')));

var sessionStore = app.sessionStore = new RedisStore(config.get("redis"));
app.use(session({
    store: sessionStore,
    name: config.get("cookieKey"),
    cookie: { domain: config.get('cookieDomain'),  maxAge: 2628000000 },
    secret: config.get('cookieSecret'),
    resave:false,
    saveUninitialized:true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(function(req,res,next){
    console.log("Config.production: ", config.production);
    console.log("Session Data: ", req.session);
    req.production = config.get("production") || false;
    req.productionLayers=["p3/layer/core"]
    req.applicationOptions = {version: "3.0"}
    next();
})


passport.serializeUser(function(user, done) {
  console.log("serialize User: ", user);
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  console.log("deserializeUser ID: ", id);
  done(null, {id: id});
//  db.users.find(id, function (err, user) {
//       console.log("deserialized User: ", user);
//    done(err, user);
//  });
});

app.use("/js/", express.static(path.join(__dirname, 'public/js/')));
app.use('/', routes);
app.use("/workspace", workspace)
app.use("/view", viewers)
app.use("/app", apps)
app.use('/users', users);

app.get("/login", 
	function(req,res,next){
		res.redirect(302, config.get("authorizationURL") + "?application_id=" + config.get("application_id"));
	}
);

app.get("/logout", function(req,res,next){
	req.logOut();
	req.session.destroy(function(err){	
		res.redirect("/");
	});
});
app.get("/auth/callback", 
	function(req,res,next){
		console.log("Authorization Callback");
		console.log("req.session.userProfile: ", (req.session&&req.session.userProfile)?req.session.userProfile:"No User Profile")
                res.render('authcb', { title: 'User Service', request: req});
//		res.redirect("/");
	}
);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
