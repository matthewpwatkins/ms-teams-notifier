jest.mock('../common/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    setLogLevel: jest.fn(),
    trace: jest.fn()
  }
}));

import { NotificationManager } from '../util/notification-manager';
import { MeetingMonitor } from '../util/meeting-monitor';
import { CalendarEvent } from '../models/calendar-event';
import { Constants } from '../common/constants';

// Mock the Howl class
jest.mock('howler', () => {
  return {
    Howl: jest.fn().mockImplementation(() => {
      return {
        play: jest.fn(),
        stop: jest.fn(),
        playing: jest.fn().mockReturnValue(false),
        unload: jest.fn(),
        once: jest.fn()
      };
    })
  };
});

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;
  let mockMeetingMonitor: jest.MockedObject<MeetingMonitor>;
  let mockEvent: CalendarEvent;
  
  beforeEach(() => {
    // Reset document body
    document.body.innerHTML = `
      <div>
        <div id="more-options-header"></div>
      </div>
    `;
    
    // Setup mocks
    mockMeetingMonitor = {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      setActiveNotification: jest.fn(),
      dispose: jest.fn()
    } as unknown as jest.MockedObject<MeetingMonitor>;
    
    mockEvent = {
      startTime: new Date(Date.now() + 60 * 1000), // 1 minute from now
      endTime: new Date(Date.now() + 60 * 60 * 1000),
      subject: 'Test Meeting',
      isAllDayEvent: false,
      isCancelled: false,
      isOnlineMeeting: true,
      skypeTeamsMeetingUrl: 'https://teams.microsoft.com/meeting/test',
      objectId: 'test-object-id-1'
    };
    
    notificationManager = new NotificationManager(mockMeetingMonitor);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create dismiss button when receiving upcoming meeting notification', () => {
    // Act
    notificationManager.onUpcomingMeeting(mockEvent);
    
    // Assert
    // Check if we set the active notification
    expect(mockMeetingMonitor.setActiveNotification).toHaveBeenCalledWith(mockEvent);
    
    // Check if button was created
    const dismissButton = document.getElementById(Constants.DISMISS_BUTTON_ID);
    expect(dismissButton).not.toBeNull();
    expect(dismissButton?.textContent).toContain('Dismiss');
  });

  test('should not create new notification if ringtone is already playing', () => {
    // Arrange
    const ringtone = (notificationManager as any).ringtone;
    ringtone.playing.mockReturnValue(true);
    
    // Act
    notificationManager.onUpcomingMeeting(mockEvent);
    
    // Assert
    expect(mockMeetingMonitor.setActiveNotification).not.toHaveBeenCalled();
    expect(document.getElementById(Constants.DISMISS_BUTTON_ID)).toBeNull();
  });

  test('should remove button and stop ringtone when no upcoming meetings', () => {
    // Arrange
    // First create a button by triggering an upcoming meeting
    notificationManager.onUpcomingMeeting(mockEvent);
    
    // Get reference to the mocked ringtone
    const ringtone = (notificationManager as any).ringtone;
    ringtone.playing.mockReturnValue(true);
    
    // Act
    notificationManager.onNoUpcomingMeetings();
    
    // Assert
    expect(ringtone.stop).toHaveBeenCalled();
    expect(document.getElementById(Constants.DISMISS_BUTTON_ID)).toBeNull();
    expect(mockMeetingMonitor.setActiveNotification).toHaveBeenCalledWith(null);
  });
  
  test('should clean up resources on dispose', () => {
    // Arrange
    // First create a button and start ringtone
    notificationManager.onUpcomingMeeting(mockEvent);
    const ringtone = (notificationManager as any).ringtone;
    
    // Mock ringtone as playing
    ringtone.playing.mockReturnValue(true);
    
    // Act
    notificationManager.dispose();
    
    // Assert
    expect(ringtone.stop).toHaveBeenCalled();
    expect(ringtone.unload).toHaveBeenCalled();
    expect(document.getElementById(Constants.DISMISS_BUTTON_ID)).toBeNull();
  });
});
