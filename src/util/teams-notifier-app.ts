import { Constants } from '../common/constants';
import { Logger } from '../common/logger';
import { TeamsApiClient } from '../services/teams-api-client';
import { ChromePortManager, PortEventType } from './chrome-port-manager';
import { MeetingMonitor } from './meeting-monitor';
import { NotificationManager } from './notification-manager';

/**
 * Main application class for the Teams Notifier extension
 * Connects to the background script and manages monitoring of Teams meetings
 */
export class TeamsNotifierApp {
  private apiClient: TeamsApiClient;
  private meetingMonitor: MeetingMonitor;
  private notificationManager: NotificationManager;
  private authToken: string | null = null;
  private portManager: ChromePortManager;
  private wasMonitoring: boolean = false;
  
  /**
   * Creates a new TeamsNotifierApp
   * @param apiClient - The Teams API client to use
   */
  constructor(apiClient: TeamsApiClient) {
    this.apiClient = apiClient;
    this.meetingMonitor = new MeetingMonitor(apiClient);
    this.notificationManager = new NotificationManager(this.meetingMonitor);
    
    // Connect the notification manager to the meeting monitor
    this.meetingMonitor.addListener(this.notificationManager);
    
    // Create and set up port manager
    this.portManager = new ChromePortManager({
      portName: Constants.TEAMS_NOTIFIER_PORT_NAME,
      debug: true
    });
    
    // Set up event handlers for the port manager
    this.setupPortManagerHandlers();
    
    // Connect to background script
    this.portManager.connect().catch(error => {
      Logger.error('Initial connection to background script failed:', error);
    });
  }
  
  /**
   * Set up event handlers for the port manager
   * @private
   */
  private setupPortManagerHandlers(): void {
    // Listen for auth token updates
    this.portManager.addMessageListener(
      Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE, 
      (message) => this.handleAuthTokenUpdate(message)
    );
    
    // Listen for connection events
    this.portManager.on(PortEventType.CONNECTED, () => {
      Logger.debug('Connected to background script');
      this.requestAuthToken();
    });
    
    // Listen for disconnection events
    this.portManager.on(PortEventType.DISCONNECTED, () => {
      Logger.warn('Disconnected from background script');
      
      // If we were monitoring before disconnection, stop temporarily
      if (this.authToken) {
        this.wasMonitoring = true;
        this.meetingMonitor.stopMonitoring();
        Logger.debug('Temporarily stopped meeting monitoring due to disconnection');
      }
    });
    
    // Listen for reconnection events
    this.portManager.on(PortEventType.RECONNECTING, (data) => {
      Logger.debug(`Reconnect attempt ${data.attempt} scheduled in ${data.delay}ms`);
    });
    
    // Listen for reconnection failure
    this.portManager.on(PortEventType.RECONNECTION_FAILED, () => {
      Logger.error('Failed to reconnect to background script after multiple attempts');
    });
  }
  
  /**
   * Handle auth token update message from the background script
   * @param message - The message containing the updated auth token
   * @private
   */
  private handleAuthTokenUpdate(message: any): void {
    this.authToken = message.token;
    this.apiClient.authToken = this.authToken;
    Logger.trace(`Received auth token: ${this.authToken}`);
    
    // Start monitoring for meetings once we have an auth token
    if (this.authToken) {
      this.meetingMonitor.startMonitoring();
      this.wasMonitoring = true;
    } else if (this.wasMonitoring) {
      // If we had a token before but now it's null, stop monitoring
      this.meetingMonitor.stopMonitoring();
      this.wasMonitoring = false;
    }
  }
  
  /**
   * Request the auth token from the background script
   * @private
   */
  private requestAuthToken(): void {
    Logger.debug('Requesting auth token from background script');
    this.portManager.sendMessage({
      type: Constants.FETCH_AUTH_TOKEN_MESSAGE_TYPE
    });
  }
  
  /**
   * Start the application
   * This will request the auth token and start monitoring
   */
  public start(): void {
    Logger.debug('Starting TeamsNotifierApp');
    
    if (this.portManager.isConnected()) {
      this.requestAuthToken();
    } else {
      Logger.debug('Not connected yet, will request auth token after connection');
    }
  }
  
  /**
   * Dispose of the application
   * Clean up all resources
   */
  public dispose(): void {
    Logger.warn('Disposing TeamsNotifierApp');
    
    // Dispose the port manager
    if (this.portManager) {
      this.portManager.dispose();
    }
    
    // Stop monitoring and dispose resources
    if (this.meetingMonitor) {
      this.meetingMonitor.dispose();
    }
    
    if (this.notificationManager) {
      this.notificationManager.dispose();
    }
    
    this.wasMonitoring = false;
    this.authToken = null;
  }
}
