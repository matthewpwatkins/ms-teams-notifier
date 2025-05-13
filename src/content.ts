import { Logger, parseLogLevel } from './logger';
import { TeamsApiClient } from './TeamsApiClient';
import { TeamsNotifierApp } from './TeamsNotifierApp';

Logger.setLogLevel(parseLogLevel(process.env.LOG_LEVEL)!);
if (window.location.hostname === 'teams.microsoft.com') {
  const apiClient = new TeamsApiClient();
  const app = new TeamsNotifierApp(apiClient);
  app.start();
}

