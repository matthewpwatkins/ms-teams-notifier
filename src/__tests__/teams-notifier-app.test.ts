import { TeamsNotifierApp } from '../util/teams-notifier-app';
import { TeamsApiClient } from '../services/teams-api-client';
import { ChromePortManager, PortEventType } from '../util/chrome-port-manager';
import { MeetingMonitor } from '../util/meeting-monitor';
import { NotificationManager } from '../util/notification-manager';
import { Constants } from '../common/constants';

// Add fail function
const fail = (message: string) => { throw new Error(message); };

// Mock dependencies
jest.mock('../services/teams-api-client');
jest.mock('../util/chrome-port-manager');
jest.mock('../util/meeting-monitor');
jest.mock('../util/notification-manager');

// Mock logger
jest.mock('../common/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn()
  }
}));

describe('TeamsNotifierApp', () => {
  let app: TeamsNotifierApp;
  let mockApiClient: jest.Mocked<TeamsApiClient>;
  let mockPortManager: jest.Mocked<ChromePortManager>;
  let mockMeetingMonitor: jest.Mocked<MeetingMonitor>;
  let mockNotificationManager: jest.Mocked<NotificationManager>;
  
  // Capture constructors to access the instances created in TeamsNotifierApp
  let portManagerConstructorArgs: any;
  let addMessageListenerArgs: any[] = [];
  let onEventArgs: any[] = [];
  
  // Store port event handlers for test access
  let portEventHandlers: Map<PortEventType, Function> = new Map();
  let messageHandlers: Map<string, Function> = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    addMessageListenerArgs = [];
    onEventArgs = [];
    portEventHandlers.clear();
    messageHandlers.clear();
    
    // Setup TeamsApiClient mock
    mockApiClient = {
      authToken: null
    } as jest.Mocked<TeamsApiClient>;
    
    // Setup MeetingMonitor mock
    mockMeetingMonitor = {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      setActiveNotification: jest.fn(),
      dispose: jest.fn()
    } as unknown as jest.Mocked<MeetingMonitor>;
    
    // Setup NotificationManager mock
    mockNotificationManager = {
      onUpcomingMeeting: jest.fn(),
      onNoUpcomingMeetings: jest.fn(),
      dispose: jest.fn()
    } as unknown as jest.Mocked<NotificationManager>;
    
    // Setup ChromePortManager mock implementation
    (ChromePortManager as jest.Mock).mockImplementation(options => {
      portManagerConstructorArgs = options;
      
      mockPortManager = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        sendMessage: jest.fn().mockReturnValue(true),
        addMessageListener: jest.fn().mockImplementation((type, handler) => {
          addMessageListenerArgs.push({ type, handler });
          messageHandlers.set(type, handler);
        }),
        removeMessageListener: jest.fn(),
        on: jest.fn().mockImplementation((eventType, handler) => {
          onEventArgs.push({ eventType, handler });
          portEventHandlers.set(eventType, handler);
        }),
        off: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true),
        dispose: jest.fn()
      } as unknown as jest.Mocked<ChromePortManager>;
      
      return mockPortManager;
    });
    
    // Create the app with injected dependencies
    app = new TeamsNotifierApp(mockApiClient, mockMeetingMonitor, mockNotificationManager);
  });
  
  test('constructor should initialize components and connect to port', () => {
    // Assert the notification manager is connected to the meeting monitor
    expect(mockMeetingMonitor.addListener).toHaveBeenCalledWith(mockNotificationManager);
    
    // Assert ChromePortManager is created with correct options
    expect(ChromePortManager).toHaveBeenCalledWith({
      portName: Constants.TEAMS_NOTIFIER_PORT_NAME,
      debug: true
    });
    
    // Assert port connection is attempted
    expect(mockPortManager.connect).toHaveBeenCalled();
    
    // Assert message listeners are set up
    expect(addMessageListenerArgs.length).toBeGreaterThan(0);
    expect(addMessageListenerArgs[0].type).toBe(Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE);
    
    // Assert event handlers are set up
    expect(onEventArgs.length).toBeGreaterThan(0);
    const eventTypes = onEventArgs.map(arg => arg.eventType);
    expect(eventTypes).toContain(PortEventType.CONNECTED);
    expect(eventTypes).toContain(PortEventType.DISCONNECTED);
    expect(eventTypes).toContain(PortEventType.RECONNECTING);
    expect(eventTypes).toContain(PortEventType.RECONNECTION_FAILED);
  });
  
  test('setupPortManagerHandlers should set up all required handlers', () => {
    // Verify message listeners
    expect(messageHandlers.has(Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE)).toBe(true);
    
    // Verify event handlers
    expect(portEventHandlers.has(PortEventType.CONNECTED)).toBe(true);
    expect(portEventHandlers.has(PortEventType.DISCONNECTED)).toBe(true);
    expect(portEventHandlers.has(PortEventType.RECONNECTING)).toBe(true);
    expect(portEventHandlers.has(PortEventType.RECONNECTION_FAILED)).toBe(true);
  });
  
  test('handleAuthTokenUpdate should update token and start monitoring', () => {
    // Arrange
    const mockMessage = { 
      type: Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE,
      token: 'new-token',
      timestamp: Date.now()
    };
    
    // Act - call the handler directly
    const handler = messageHandlers.get(Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE);
    if (handler) {
      handler(mockMessage);
    } else {
      fail('Expected handler to be defined');
    }
    
    // Assert
    expect(mockApiClient.authToken).toBe('new-token');
    expect(mockMeetingMonitor.startMonitoring).toHaveBeenCalled();
    expect(app['authToken']).toBe('new-token');
    expect(app['wasMonitoring']).toBe(true);
  });
  
  test('handleAuthTokenUpdate should stop monitoring when token becomes null', () => {
    // Arrange - first set a token
    app['authToken'] = 'existing-token';
    app['wasMonitoring'] = true;
    
    const mockMessage = {
      type: Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE,
      token: null,
      timestamp: Date.now()
    };
    
    // Act
    const handler = messageHandlers.get(Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE);
    if (handler) {
      handler(mockMessage);
    } else {
      fail('Expected handler to be defined');
    }
    
    // Assert
    expect(mockApiClient.authToken).toBeNull();
    expect(mockMeetingMonitor.stopMonitoring).toHaveBeenCalled();
    expect(app['wasMonitoring']).toBe(false);
  });
  
  test('connected handler should request auth token', () => {
    // Act
    const handler = portEventHandlers.get(PortEventType.CONNECTED);
    if (handler) {
      handler();
    } else {
      fail('Expected handler to be defined');
    }
    
    // Assert
    expect(mockPortManager.sendMessage).toHaveBeenCalledWith({
      type: Constants.FETCH_AUTH_TOKEN_MESSAGE_TYPE
    });
  });
  
  test('disconnected handler should stop monitoring if token exists', () => {
    // Arrange
    app['authToken'] = 'some-token';
    
    // Act
    const handler = portEventHandlers.get(PortEventType.DISCONNECTED);
    if (handler) {
      handler();
    } else {
      fail('Expected handler to be defined');
    }
    
    // Assert
    expect(mockMeetingMonitor.stopMonitoring).toHaveBeenCalled();
    expect(app['wasMonitoring']).toBe(true);
  });
  
  test('reconnecting handler should log the reconnect attempt', () => {
    // Act
    const handler = portEventHandlers.get(PortEventType.RECONNECTING);
    if (handler) {
      handler({ attempt: 2, delay: 4000 });
    } else {
      fail('Expected handler to be defined');
    }
    
    // No assertions needed, just verifying it runs without error
  });
  
  test('reconnection_failed handler should log the failure', () => {
    // Act
    const handler = portEventHandlers.get(PortEventType.RECONNECTION_FAILED);
    if (handler) {
      handler();
    } else {
      fail('Expected handler to be defined');
    }
    
    // No assertions needed, just verifying it runs without error
  });
  
  test('start should request auth token if connected', () => {
    // Arrange
    mockPortManager.isConnected.mockReturnValue(true);
    mockPortManager.sendMessage.mockClear();
    
    // Act
    app.start();
    
    // Assert
    expect(mockPortManager.sendMessage).toHaveBeenCalledWith({
      type: Constants.FETCH_AUTH_TOKEN_MESSAGE_TYPE
    });
  });
  
  test('start should not request auth token if not connected', () => {
    // Arrange
    mockPortManager.isConnected.mockReturnValue(false);
    mockPortManager.sendMessage.mockClear();
    
    // Act
    app.start();
    
    // Assert
    expect(mockPortManager.sendMessage).not.toHaveBeenCalled();
  });
  
  test('dispose should clean up all resources', () => {
    // Act
    app.dispose();
    
    // Assert
    expect(mockPortManager.dispose).toHaveBeenCalled();
    expect(mockMeetingMonitor.dispose).toHaveBeenCalled();
    expect(mockNotificationManager.dispose).toHaveBeenCalled();
    expect(app['wasMonitoring']).toBe(false);
    expect(app['authToken']).toBeNull();
  });
});
