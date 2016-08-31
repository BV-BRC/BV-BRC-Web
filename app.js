var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require("./config");
var session = require("express-session-unsigned");
var RedisStore = require('connect-redis')(session);
var passport = require('passport');
var package = require("./package.json");

var routes = require('./routes/index');
var users = require('./routes/users');
var workspace = require('./routes/workspace');
var viewers = require('./routes/viewers');
var remotePage= require('./routes/remotePage');
var search = require('./routes/search');
var contentViewer = require("./routes/content");
var apps = require('./routes/apps');
var uploads = require('./routes/uploads');
var jobs = require('./routes/jobs');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//app.set('query parser', 'extended');

//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(cookieParser(config.get('cookieSecret')));

var sessionStore = app.sessionStore = new RedisStore(config.get("redis"));
app.use(session({
	store: sessionStore,
	key: config.get("cookieKey"),
	cookie: {domain: config.get('cookieDomain'), maxAge: config.get("sessionTTL")},
//    secret: config.get('cookieSecret'),
	resave: false,
	saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

if(config.get("enableDevAuth")){
	app.use(function(req, res, next){
		var user = config.get("devUser");
		console.log("Dev User: ", user, req.isAuthenticated, req.isAuthenticated());
		if(user && (!req.isAuthenticated || !req.isAuthenticated() )){
			console.log("Auto Login Dev User");
			req.login(user, function(err){
				console.log("login user: ", user);
				if(err){
					return next(err);
				}
				console.log("Dev User logged in.  Setup Session");
				if(user && req.session){
					delete user.password;
					req.session.userProfile = user;
					req.session.authorizationToken = config.get("devAuthorizationToken");
				}else{
					console.log("NO Session");
				}
				next();
			});
		}else{
			next();
		}
	});
}

app.use(function(req, res, next){
	console.log("Config.production: ", config.production);
	console.log("Session Data: ", req.session);
	req.config = config;
	req.production = config.get("production") || false;
	req.productionLayers = ["p3/layer/core"];
	req.package = package;
	req.applicationOptions = {
		version: "3.0",
		workspaceServiceURL: config.get("workspaceServiceURL"),
		appServiceURL: config.get("appServiceURL"),
		dataServiceURL: config.get("dataServiceURL"),
		enableDevTools: config.get("enableDevTools"),
		accountURL: config.get("accountURL"),
		appLabel: config.get("appLabel")
	};
	console.log("Application Options: ", req.applicationOptions);
	next();
});

// passport serialize/deserialize user
// thise must exist to satisfy passport, but we're not really 
// deserializing at the moment to avoid forcing p3-web to depend on the p3-user 
// database directly.  However, req.session.user is populated by p3-user 
// to contain the users' profile, so this isnt' so necessary

passport.serializeUser(function(user, done){
	done(null, user.id);
});

passport.deserializeUser(function(id, done){
	done(null, {id: id});
});
app.use("*jbrowse.conf", express.static(path.join(__dirname, "public/js/jbrowse.conf")));
app.use("/js/" + package.version + "/", [
	express.static(path.join(__dirname, 'public/js/release/'), {
		maxage:"356d",
		/*etag:false,*/
		setHeaders: function(res,path){
			var d = new Date(); 
			d.setYear(d.getFullYear() + 1);
			res.setHeader("Expires", d.toGMTString());
		}
	}),
]);
app.use("/js/msa/", express.static(path.join(__dirname, 'node_modules/msa/dist/')));
app.use("/js/msa/node_modules/", express.static(path.join(__dirname, 'node_modules/msa/node_modules/')));
app.use("/js/swfobject/", express.static(path.join(__dirname, 'node_modules/swfobject-amd/')));
app.use("/js/", express.static(path.join(__dirname, 'public/js/')));
app.use("/patric/", express.static(path.join(__dirname, 'public/patric/')));
app.use("/public/", express.static(path.join(__dirname, 'public/')));
app.use('/', routes);
app.use("/workspace", workspace);
app.use("/content", contentViewer);
app.use("/remote", remotePage);
app.use("/view", viewers);
app.use("/search", search);
app.use("/app", apps);
app.use("/job", jobs);
app.use("/uploads", uploads);
app.use('/users', users);
app.get("/login",
	function(req, res, next){
		if(!req.isAuthenticated || !req.isAuthenticated()){
			res.redirect(302, config.get("authorizationURL") + "?application_id=" + config.get("application_id"));
		}else{
			res.render('authcb', {title: 'User Service', request: req});
		}
	}
);

app.get("/logout", [
	function(req, res, next){
		console.log("req.params.location: ", req.param('location'));
		var redir = req.param('location');
		req.session.destroy();
		req.logout();
		res.redirect(redir || '/');
	}
]);

app.get("/auth/callback",
	function(req, res, next){
		console.log("Authorization Callback");
		console.log("req.session.userProfile: ", (req.session && req.session.userProfile) ? req.session.userProfile : "No User Profile");
		res.render('authcb', {title: 'User Service', request: req});
//		res.redirect("/");
	}
);

// catch 404 and forward to error handler
app.use(function(req, res, next){
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if(app.get('env') === 'development'){
	app.use(function(err, req, res, next){
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next){
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

module.exports = app;
