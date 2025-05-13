import { Logger, parseLogLevel } from './common/logger';
import { TeamsApiClient } from './services/TeamsApiClient';
import { TeamsNotifierApp } from './util/TeamsNotifierApp';

Logger.setLogLevel(parseLogLevel(process.env.LOG_LEVEL)!);
if (window.location.hostname === 'teams.microsoft.com') {
  const apiClient = new TeamsApiClient();
  const app = new TeamsNotifierApp(apiClient);
  app.start();
}

