import { Logger, parseLogLevel } from './common/logger';
import { TeamsApiClient } from './services/teams-api-client';
import { TeamsNotifierApp } from './util/teams-notifier-app';

Logger.setLogLevel(parseLogLevel(process.env.LOG_LEVEL)!);
if (window.location.hostname === 'teams.microsoft.com') {
  const apiClient = new TeamsApiClient();
  const app = new TeamsNotifierApp(apiClient);
  app.start();
}

