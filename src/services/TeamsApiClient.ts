import { Logger } from '../common/logger';
import { CalendarEvent } from '../models/CalendarEvent';

/**
 * Options for fetching calendar events
 */
export type GetEventsOptions = {
  /** Start date for the event range */
  startDate: Date;
  /** End date for the event range */
  endDate: Date;
  /** Maximum number of events to return */
  limit?: number;
};

/**
 * Client for interacting with the Microsoft Teams API
 * Provides functionality to fetch calendar events
 */
export class TeamsApiClient {
  private static readonly CALENDAR_API_URL = 'https://teams.microsoft.com/api/mt/part/amer-02/v2.1/me/calendars/calendarView';
  private static readonly DEFAULT_LIMIT = 30;

  /** The authentication token used for API requests */
  public authToken: string | null = null;

  /**
   * Fetches calendar events from the Microsoft Teams API
   * @param options - Options to specify the date range and limit
   * @returns A promise resolving to an array of calendar events
   * @throws Error if the auth token is not set or the API request fails
   */
  public async getEvents(options: GetEventsOptions): Promise<CalendarEvent[]> {
    if (!this.authToken) {
      throw new Error('Auth token is not set');
    }

    const url = new URL(TeamsApiClient.CALENDAR_API_URL);
    url.searchParams.append('startDate', options.startDate.toISOString());
    url.searchParams.append('endDate', options.endDate.toISOString());
    url.searchParams.append('$top', options.limit?.toString() || TeamsApiClient.DEFAULT_LIMIT.toString());
    url.searchParams.append('$count', 'true');
    url.searchParams.append('$skip', '0');
    url.searchParams.append('$orderby', 'startTime asc');
    url.searchParams.append('$select', [
      'startTime',
      'endTime',
      'subject',
      'isAllDayEvent',
      'isCancelled',
      'isOnlineMeeting',
      'skypeTeamsMeetingUrl',
    ].join(','));

    const urlString = url.toString();

    Logger.trace('Fetching events from URL:', urlString);
    const response = await fetch(urlString, {
      headers: {
        Authorization: `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const responseText = await response.text();
    Logger.trace('Response text from ' + urlString, responseText);

    const responseObject = JSON.parse(responseText) as {
      value: CalendarEvent[];
    };

    return responseObject.value;
  };
}