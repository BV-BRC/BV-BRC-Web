var nconf = require('nconf');

var defaults = {
	"http_port": 3000,
	"authorizationURL": "http://user.patric.local:3002/login",
	"application_id": "patric3",
	"p3_clientId": "patric3",
	"p3_clientSecret": "patric3",
	"redis": {
		"host": "127.0.0.1",
		"port": 6379,
		"prefix": "",
		"db": 1,
		"pass": ""
	},

	"appLabel": "dev",
	"cookieKey": "JSESSIONID",
	"cookieDomain": ".patric.local",
	"newsFeedRSS": "http://enews.patricbrc.org/feed",
	"sessionTTL": 2628000000,

	workspaceServiceURL: "",
	appServiceURL: "",
	dataURL: "",
	accountURL: "http://user.patric.local:3002/",

	enableDevAuth: false,
	devAuthorizationToken: "",
	devUser: false,
	enableDevTools: false,

	reportProblemEmailAddress: "help@patricbrc.org",

        "email": {
                "localSendmail": false,
                "defaultFrom": "PATRIC <do-not-reply@patricbrc.org>",
                "defaultSender": "PATRIC <do-not-reply@patricbrc.org>",
                "host": "",
                "port":587
        }
};

module.exports = nconf.argv().env().file("./p3-web.conf").defaults(defaults);


