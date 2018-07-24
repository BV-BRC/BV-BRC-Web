const nconf = require('nconf');
const path = require('path');

const defaults = {
  'http_port': 3000,
  'application_id': 'patric3',
  'p3_clientId': 'patric3',
  'p3_clientSecret': 'patric3',
  'appLabel': 'dev',
  'newsFeedRSS': 'https://docs.patricbrc.org/news.rss',
  'sessionTTL': 2628000000,
  'workspaceServiceURL': 'https://p3.theseed.org/services/Workspace',
  'appServiceURL': 'https://p3.theseed.org/services/app_service',
  'homologyServiceURL': 'https://p3.theseed.org/services/homology_service',
  'genomedistanceServiceURL': 'https://p3.theseed.org/services/minhash_service',
  'compareregionServiceURL': 'https://p3.theseed.org/services/compare_regions',
  dataServiceURL: 'https://p3.theseed.org/services/data_api',
  accountURL: 'http://user.patric.local:3002/',
  docsServiceURL: 'https://docs.patricbrc.org/',
  userServiceURL: '',
  localStorageCheckInterval: 86400,
  enableDevTools: false,
  reportProblemEmailAddress: 'help@patricbrc.org',
  'email': {
    'localSendmail': false,
    'defaultFrom': 'PATRIC <do-not-reply@patricbrc.org>',
    'defaultSender': 'PATRIC <do-not-reply@patricbrc.org>',
    'host': '',
    'port': 587
  },
  proxy: {
    'brcdownloads': 'http://brcdownloads.patricbrc.org'
  }
};

const config_filename = 'p3-web.conf';
const config_file = path.join(__dirname, config_filename);

module.exports = nconf.argv().env().file(config_file).defaults(defaults);
