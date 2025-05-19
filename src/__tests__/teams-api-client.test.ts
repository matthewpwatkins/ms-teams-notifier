import { TeamsApiClient, GetEventsOptions } from '../services/teams-api-client';
import { CalendarEvent } from '../models/calendar-event';

// Mock fetch API
global.fetch = jest.fn();

// Mock the logger
jest.mock('../common/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn()
  }
}));

describe('TeamsApiClient', () => {
  let apiClient: TeamsApiClient;
  let mockOptions: GetEventsOptions;
  let mockResponse: Response;
  let mockCalendarData: { value: CalendarEvent[] };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
    
    apiClient = new TeamsApiClient();
    
    // Setup mock options
    const now = new Date();
    mockOptions = {
      startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0), // today at 00:00
      endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59), // today at 23:59:59
      limit: 10
    };
    
    // Setup mock calendar data
    const startTime1 = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime1 = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const startTime2 = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
    const endTime2 = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
    
    mockCalendarData = {
      value: [
        {
          objectId: 'event-1',
          startTime: startTime1.toUTCString(),
          endTime: endTime1.toUTCString(),
          subject: 'Test Meeting 1',
          isAllDayEvent: false,
          isCancelled: false,
          isOnlineMeeting: true,
          skypeTeamsMeetingUrl: 'https://teams.microsoft.com/meeting/123'
        },
        {
          objectId: 'event-2',
          startTime: startTime2.toUTCString(),
          endTime: endTime2.toUTCString(),
          subject: 'Test Meeting 2',
          isAllDayEvent: false,
          isCancelled: false,
          isOnlineMeeting: true,
          skypeTeamsMeetingUrl: 'https://teams.microsoft.com/meeting/456'
        }
      ]
    };
    
    // Setup mock response
    // First serialize the calendar data to simulate a JSON response from the API
    const serializedData = JSON.stringify(mockCalendarData);
    
    // Setup the mock response with the serialized data
    mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue(serializedData)
    } as unknown as Response;
    
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
  });
  
  test('getEvents should throw error when auth token is not set', async () => {
    // Arrange
    apiClient.authToken = null;
    
    // Act & Assert
    await expect(apiClient.getEvents(mockOptions)).rejects.toThrow('Auth token is not set');
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  test('getEvents should construct correct URL and fetch events', async () => {
    // Arrange
    apiClient.authToken = 'mock-token';
    
    // Act
    const result = await apiClient.getEvents(mockOptions);
    
    // Assert
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    
    // Check URL structure
    expect(url).toContain('https://teams.microsoft.com/api/mt/part/amer-02/v2.1/me/calendars/calendarView');
    expect(url).toContain('startDate=' + encodeURIComponent(mockOptions.startDate.toISOString()));
    expect(url).toContain('endDate=' + encodeURIComponent(mockOptions.endDate.toISOString()));
    expect(url).toContain('%24top=10');
    expect(url).toContain('%24count=true');
    expect(url).toContain('%24skip=0');
    expect(url).toContain('%24orderby=startTime+asc');
    
    // Check the select parameters are included
    expect(url).toContain('%24select=');
    expect(url).toContain('startTime');
    expect(url).toContain('endTime');
    expect(url).toContain('subject');
    expect(url).toContain('isAllDayEvent');
    expect(url).toContain('isCancelled');
    expect(url).toContain('isOnlineMeeting');
    expect(url).toContain('skypeTeamsMeetingUrl');
    
    // Check authorization header
    expect(options.headers).toEqual({
      Authorization: 'Bearer mock-token'
    });
    
    // Check result contains the expected events
    expect(result.length).toBe(mockCalendarData.value.length);
    expect(result[0].objectId).toBe(mockCalendarData.value[0].objectId);
    expect(result[1].objectId).toBe(mockCalendarData.value[1].objectId);
    expect(result[0].subject).toBe(mockCalendarData.value[0].subject);
    expect(result[1].subject).toBe(mockCalendarData.value[1].subject);
  });
  
  test('getEvents should use default limit when limit is not provided', async () => {
    // Arrange
    apiClient.authToken = 'mock-token';
    
    // Remove limit from options
    const { limit, ...optionsWithoutLimit } = mockOptions;
    
    // Act
    await apiClient.getEvents(optionsWithoutLimit);
    
    // Assert
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('%24top=30'); // Default limit is 30
  });
  
  test('getEvents should throw error when response is not OK', async () => {
    // Arrange
    apiClient.authToken = 'mock-token';
    
    // Mock a failed response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });
    
    // Act & Assert
    await expect(apiClient.getEvents(mockOptions)).rejects.toThrow('Failed to fetch events');
  });
  
  test('getEvents should properly parse the response', async () => {
    // Arrange
    apiClient.authToken = 'mock-token';
    
    const specialEvent = {
      objectId: 'special-event',
      startTime: 'special-start-time',
      endTime: 'special-end-time',
      subject: 'Special Meeting',
      isAllDayEvent: false,
      isCancelled: false,
      isOnlineMeeting: true,
      skypeTeamsMeetingUrl: 'https://teams.microsoft.com/meeting/special'
    };
    
    const responsePayload = {
      value: [specialEvent]
    };
    
    mockResponse.text = jest.fn().mockResolvedValue(JSON.stringify(responsePayload));
    
    // Act
    const result = await apiClient.getEvents(mockOptions);
    
    // Assert
    expect(result).toEqual(responsePayload.value);
    expect(result[0].objectId).toBe('special-event');
    expect(result[0].subject).toBe('Special Meeting');
  });
});
