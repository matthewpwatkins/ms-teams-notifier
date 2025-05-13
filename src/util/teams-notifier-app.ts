import { Constants } from '../common/constants';
import { Logger } from '../common/logger';
import { TeamsApiClient } from '../services/teams-api-client';
import { MeetingMonitor } from './meeting-monitor';
import { NotificationManager } from './notification-manager';

export class TeamsNotifierApp {
  private apiClient: TeamsApiClient;
  private meetingMonitor: MeetingMonitor;
  private notificationManager: NotificationManager;
  private authToken: string | null = null;
  private port: chrome.runtime.Port | null = null;
  
  constructor(apiClient: TeamsApiClient) {
    this.apiClient = apiClient;
    this.meetingMonitor = new MeetingMonitor(apiClient);
    this.notificationManager = new NotificationManager(this.meetingMonitor);
    
    // Connect the notification manager to the meeting monitor
    this.meetingMonitor.addListener(this.notificationManager);
    
    // Connect to background script
    this.port = chrome.runtime.connect({ name: Constants.TEAMS_NOTIFIER_PORT_NAME });
    
    // Set up listener for messages from background script
    this.port.onMessage.addListener(async (message) => {
      if (message.type === Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE) {
        this.authToken = message.token;
        this.apiClient.authToken = this.authToken;
        Logger.trace(`Received auth token: ${this.authToken}`);
        
        // Start monitoring for meetings once we have an auth token
        if (this.authToken) {
          this.meetingMonitor.startMonitoring();
        }
      }
    });
    
    // Handle disconnection
    this.port.onDisconnect.addListener(() => {
      this.port = null;
      Logger.warn('Disconnected from background script');
      this.dispose();
    });
  }
  
  public start(): void {
    Logger.debug('Starting TeamsNotifierApp');
    // Request auth token from background script
    if (this.port) {
      this.port.postMessage({
        type: Constants.FETCH_AUTH_TOKEN_MESSAGE_TYPE
      });
    }
  }
  
  public dispose(): void {
    Logger.warn('Disposing TeamsNotifierApp');
    // Clean up resources
    if (this.port) {
      this.port.disconnect();
      this.port = null;
    }
    
    this.meetingMonitor.dispose();
    this.notificationManager.dispose();
  }
}