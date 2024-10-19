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
  appBaseURL: 'https://www.patricbrc.org',
  'homologyServiceURL': 'https://p3.theseed.org/services/homology_service',
  'genomedistanceServiceURL': 'https://p3.theseed.org/services/minhash_service',
  'compareregionServiceURL': 'https://p3.theseed.org/services/compare_regions',
  'probModelSeedServiceURL': 'https://p3.theseed.org/services/ProbModelSEED', // only for status dashboard
  'shockServiceURL': 'https://p3.theseed.org/services/shock_api', // only for status dashboard
  dataServiceURL: 'https://p3.theseed.org/services/data_api',
  accountURL: 'http://user.patric.local:3002/',
  docsServiceURL: 'https://www.bv-brc.org/docs/',
  userServiceURL: 'https://user.patricbrc.org',
  localStorageCheckInterval: 86400,
  enableDevTools: false,
  reportProblemEmailAddress: 'help@bv-brc.org',
  sequenceSubmissionNotificationEmailAddress: ['gbsubmit@bvbrc.org'],
  'email': {
    'localSendmail': false,
    'defaultFrom': 'BV-BRC <do-not-reply@bv-brc.org>',
    'defaultSender': 'BV-BRC <do-not-reply@bv-brc.org>',
    'host': '',
    'port': 25
  },
  proxy: {
    'brcdownloads': 'http://brcdownloads.patricbrc.org'
  },
  linkedinConfigFile: path.join(__dirname, 'linkedin.txt')
};

const config_filename = 'p3-web.conf';
const config_file = path.join(__dirname, config_filename);

module.exports = nconf.argv().env().file(config_file).defaults(defaults);
