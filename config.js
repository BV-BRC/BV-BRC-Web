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
  userServiceURL: '',
  'copilotApiURL': 'https://www.bv-brc.org/services/copilot-api/copilot-api/chatbrc',
  'copilotDbURL': 'https://www.bv-brc.org/services/copilot-api/copilot-api/db',
  'workflow_url': 'https://dev-7.bv-brc.org/api/v1',
  'copilotEnablePublications': false,
  'copilotEnableEnhancePrompt': false,
  'copilotEnableShowPromptDetails': false,
  'copilotEnableModelSelector': false,
  'copilotEnableRagSelector': false,
  localStorageCheckInterval: 86400,
  cartoBasemapApiKey: '',
  enableDevTools: false,
  // Retry Data API 429/503 responses with backoff, per BV-BRC-API
  // Docs/CLIENT-429.md. Off by default: enabling it routes all dojo/request
  // traffic through p3/util/throttledRequest, so it wants a soak on a
  // deployment before being turned on everywhere.
  enableThrottleRetry: false,
  // Workspace folder holding the shipped FASTA header format presets (NCBI,
  // GISAID, ...) offered in the download wizard's FASTA options step. One
  // JSON file per preset, so a curator can add a format without a release.
  //
  // Empty by default: a deployment that has not created the folder simply
  // shows no presets, and users keep their own saved formats. The folder is
  // read with Workspace.ls, which needs no token for a public path, so
  // presets are available to signed-out users too.
  //
  // Note that ls on a nonexistent path returns an empty result rather than an
  // error, so a typo here degrades silently -- the client logs a warning when
  // a configured path yields nothing.
  fastaFormatPresetsPath: '',
  reportProblemEmailAddress: 'help@bv-brc.org',
  sequenceSubmissionNotificationEmailAddress: ['gbsubmit@bvbrc.org'],
  // Folder paths (relative to workspace root) to exclude from the output folder dropdown selector
  // These system folders should not be used as output destinations
  // Paths are matched from the start of the directory portion (e.g., '/Genome Groups' excludes /user/home/Genome Groups)
  workspaceSelectorExcludeFolders: ['/CopilotDownloads'],
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
