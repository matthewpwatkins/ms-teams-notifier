import { MeetingMonitor, UpcomingMeetingListener } from '../util/meeting-monitor';
import { TeamsApiClient } from '../services/teams-api-client';
import { CalendarEvent } from '../models/calendar-event';

// Mock the TeamsApiClient
jest.mock('../services/teams-api-client');
jest.mock('../common/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    setLogLevel: jest.fn()
  }
}));

describe('MeetingMonitor', () => {
  let meetingMonitor: MeetingMonitor;
  let apiClient: jest.Mocked<TeamsApiClient>;
  let mockListener: jest.MockedObject<UpcomingMeetingListener>;

  // Sample calendar events for testing
  const now = new Date();
  const inOneMinute = new Date(now.getTime() + 60 * 1000);
  const inThreeMinutes = new Date(now.getTime() + 3 * 60 * 1000);
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

  const sampleEvents: CalendarEvent[] = [
    {
      startTime: inOneMinute.toUTCString(),
      endTime: new Date(inOneMinute.getTime() + 30 * 60 * 1000).toUTCString(),
      subject: 'Upcoming Meeting',
      isAllDayEvent: false,
      isCancelled: false,
      isOnlineMeeting: true,
      skypeTeamsMeetingUrl: 'https://teams.microsoft.com/meeting/123',
      objectId: 'object-123'
    },
    {
      startTime: inThreeMinutes.toUTCString(),
      endTime: new Date(inThreeMinutes.getTime() + 30 * 60 * 1000).toUTCString(),
      subject: 'Another Upcoming Meeting',
      isAllDayEvent: false,
      isCancelled: false,
      isOnlineMeeting: true,
      skypeTeamsMeetingUrl: 'https://teams.microsoft.com/meeting/456',
      objectId: 'object-456'
    },
    {
      startTime: inOneHour.toUTCString(),
      endTime: new Date(inOneHour.getTime() + 30 * 60 * 1000).toUTCString(),
      subject: 'Later Meeting',
      isAllDayEvent: false,
      isCancelled: false,
      isOnlineMeeting: true,
      skypeTeamsMeetingUrl: 'https://teams.microsoft.com/meeting/789',
      objectId: 'object-789'
    },
    {
      startTime: now.toUTCString(),
      endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toUTCString(),
      subject: 'All-day Meeting',
      isAllDayEvent: true,
      isCancelled: false,
      isOnlineMeeting: true,
      skypeTeamsMeetingUrl: 'https://teams.microsoft.com/meeting/allday',
      objectId: 'object-allday'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    apiClient = new TeamsApiClient() as jest.Mocked<TeamsApiClient>;
    apiClient.authToken = 'mock-token';
    apiClient.getEvents = jest.fn().mockResolvedValue(sampleEvents);
    
    meetingMonitor = new MeetingMonitor(apiClient);
    
    mockListener = {
      onUpcomingMeeting: jest.fn(),
      onNoUpcomingMeetings: jest.fn()
    };
    
    meetingMonitor.addListener(mockListener);
  });

  afterEach(() => {
    meetingMonitor.dispose();
    jest.useRealTimers();
  });

  test('should notify listeners about upcoming meetings', async () => {
    // Act
    await meetingMonitor['checkForUpcomingMeetings']();
    
    // Assert
    expect(mockListener.onUpcomingMeeting).toHaveBeenCalledTimes(1);
    expect(mockListener.onUpcomingMeeting).toHaveBeenCalledWith(sampleEvents[0]);
  });

  test('should not notify about all-day meetings', async () => {
    // Arrange - only return the all-day event
    apiClient.getEvents = jest.fn().mockResolvedValue([sampleEvents[3]]);
    
    // Set an active notification first so we can verify onNoUpcomingMeetings gets called
    meetingMonitor.setActiveNotification(sampleEvents[0]);
    
    // Act
    await meetingMonitor['checkForUpcomingMeetings']();
    
    // Assert
    expect(mockListener.onUpcomingMeeting).not.toHaveBeenCalled();
    expect(mockListener.onNoUpcomingMeetings).toHaveBeenCalled();
  });

  test('should not notify about the same meeting twice', async () => {
    // Arrange
    meetingMonitor.setActiveNotification(sampleEvents[0]);
    
    // Act
    await meetingMonitor['checkForUpcomingMeetings']();
    
    // Assert
    expect(mockListener.onUpcomingMeeting).not.toHaveBeenCalled();
  });

  test('should notify about no upcoming meetings when there are none', async () => {
    // Arrange
    meetingMonitor.setActiveNotification(sampleEvents[0]); // Set active notification
    apiClient.getEvents = jest.fn().mockResolvedValue([]); // Return no events
    
    // Act
    await meetingMonitor['checkForUpcomingMeetings']();
    
    // Assert
    expect(mockListener.onNoUpcomingMeetings).toHaveBeenCalled();
  });

  test('should sort events by start time and return the earliest one', async () => {
    // Arrange - reverse the order of events
    const reversedEvents = [...sampleEvents].reverse();
    apiClient.getEvents = jest.fn().mockResolvedValue(reversedEvents);
    
    // Act
    await meetingMonitor['checkForUpcomingMeetings']();
    
    // Assert
    expect(mockListener.onUpcomingMeeting).toHaveBeenCalledWith(sampleEvents[0]);
  });

  test('should not notify about meetings beyond the notification threshold', async () => {
    // Arrange - only return the meeting that's in one hour
    apiClient.getEvents = jest.fn().mockResolvedValue([sampleEvents[2]]);
    
    // Act
    await meetingMonitor['checkForUpcomingMeetings']();
    
    // Assert
    expect(mockListener.onUpcomingMeeting).not.toHaveBeenCalled();
  });
});
