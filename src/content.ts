import { Logger, parseLogLevel } from './common/logger';
import { TeamsApiClient } from './services/teams-api-client';
import { DomWatcher } from './util/dom-watcher';
import { MeetingMonitor } from './util/meeting-monitor';
import { NotificationManager } from './util/notification-manager';
import { TeamsNotifierApp } from './util/teams-notifier-app';
import { Howl } from 'howler';

Logger.setLogLevel(parseLogLevel(process.env.LOG_LEVEL)!);
if (window.location.hostname === 'teams.microsoft.com') {
  const apiClient = new TeamsApiClient();
  const domWatcher = new DomWatcher((callback) => new MutationObserver(callback));
  const meetingMonitor = new MeetingMonitor(apiClient);
  const notificationManager = new NotificationManager(window, document, domWatcher, meetingMonitor, options => new Howl(options));
  const app = new TeamsNotifierApp(apiClient, meetingMonitor, notificationManager);
  app.start();
}
