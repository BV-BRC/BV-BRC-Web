var nconf = require('nconf');

var defaults =  {
	"http_port": 3000,

	"solr": {
		"url": "http://localhost:8983/solr"
	}
}

module.exports = nconf.argv().env().file("./p3-www.conf").defaults(defaults);
