import { Constants } from '../common/constants';
import { Logger } from '../common/logger';
import { TeamsApiClient } from '../services/teams-api-client';
import { CalendarEvent } from '../models/calendar-event';

/**
 * Interface for objects that want to listen for upcoming meeting events
 */
export interface UpcomingMeetingListener {
  /**
   * Called when an upcoming meeting is detected within the notification threshold
   * @param event - The upcoming calendar event
   */
  onUpcomingMeeting(event: CalendarEvent): void;

  /**
   * Called when no upcoming meetings are detected within the notification threshold
   */
  onNoUpcomingMeetings(): void;
}

/**
 * Monitors Teams calendar for upcoming meetings and notifies listeners
 * Periodically checks for meetings within a configured time threshold
 */
export class MeetingMonitor {
  private apiClient: TeamsApiClient;
  private pollingIntervalId: number | null = null;
  private listeners: UpcomingMeetingListener[] = [];
  private activeNotificationEvent: CalendarEvent | null = null;
  private isActivelyRunning: boolean = false;

  /**
   * Creates a new MeetingMonitor
   * @param apiClient - The Teams API client to use for fetching calendar events
   */
  constructor(apiClient: TeamsApiClient) {
    this.apiClient = apiClient;
  }

  get isActive(): boolean {
    return this.isActivelyRunning;
  }

  /**
   * Registers a listener to receive upcoming meeting notifications
   * @param listener - The listener to add
   */
  public addListener(listener: UpcomingMeetingListener): void {
    this.listeners.push(listener);
  }

  /**
   * Removes a previously registered listener
   * @param listener - The listener to remove
   */
  public removeListener(listener: UpcomingMeetingListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Starts monitoring for upcoming meetings
   * Checks immediately and then at 00 and 30 second marks of each minute
   */
  public startMonitoring(): void {
    if (this.isActivelyRunning) {
      Logger.debug('Meeting monitoring is already active');
      return;
    }

    Logger.debug('Starting meeting monitoring');
    this.isActivelyRunning = true;

    // Check immediately
    this.checkForUpcomingMeetings();

    // Start the polling cycle
    this.scheduleNextPoll();
  }

  /**
   * Stops monitoring for upcoming meetings
   * Clears the polling timeout
   */
  public stopMonitoring(): void {
    Logger.debug('Stopping meeting monitoring');
    if (this.pollingIntervalId !== null) {
      clearTimeout(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  /**
   * Updates the active notification event
   * @param event - The calendar event to set as active, or null to clear
   */
  public setActiveNotification(event: CalendarEvent | null): void {
    this.activeNotificationEvent = event;
    Logger.debug(`Active notification ${event ? `set to ${event.subject}` : 'cleared'}`);
  }

  /**
   * Cleans up resources used by the MeetingMonitor
   */
  public dispose(): void {
    this.stopMonitoring();
    this.listeners = [];
  }

  // #region Private helpers

  private scheduleNextPoll(): void {
    const now = new Date();
    const seconds = now.getSeconds();

    // Calculate seconds until next polling time (at :00 or :30)
    let timeToNextPoll: number;

    if (seconds < 30) {
      // Next poll at :30
      timeToNextPoll = 30 - seconds;
    } else {
      // Next poll at :00 (of the next minute)
      timeToNextPoll = 60 - seconds;
    }

    // Convert to milliseconds
    let delay = timeToNextPoll * 1000;

    // If the next poll is less than 10 seconds away, skip to the following one
    if (delay < 10000) {
      delay += 30000; // Skip to next 30-second interval
    }

    Logger.debug(`Scheduling next meeting check in ${Math.round(delay / 1000)} seconds`);

    // Clear any existing interval
    if (this.pollingIntervalId !== null) {
      clearTimeout(this.pollingIntervalId);
    }

    // Schedule the next poll
    this.pollingIntervalId = window.setTimeout(() => {
      this.checkForUpcomingMeetings();
      this.scheduleNextPoll(); // Schedule the next poll after execution
    }, delay);
  }

  /**
   * Checks the calendar for upcoming meetings and notifies listeners if found
   * @private
   */
  private async checkForUpcomingMeetings(): Promise<void> {
    if (!this.apiClient.authToken) {
      Logger.debug('Auth token not set, skipping meeting check');
      return;
    }

    try {
      // Get events for today
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const events = await this.apiClient.getEvents({
        startDate: startOfDay,
        endDate: endOfDay
      });

      const upcomingEvent = this.findNextUpcomingEvent(events);

      if (upcomingEvent) {
        // Only notify if we don't already have an active notification
        if (!this.activeNotificationEvent) {
          Logger.debug(`Found upcoming event: ${upcomingEvent.subject}`);
          for (const listener of this.listeners) {
            listener.onUpcomingMeeting(upcomingEvent);
          }
        }
      } else {
        // No upcoming events found, so notify listeners if we had an active notification
        if (this.activeNotificationEvent) {
          Logger.debug('No more upcoming events, clearing notifications');
          for (const listener of this.listeners) {
            listener.onNoUpcomingMeetings();
          }
          this.activeNotificationEvent = null;
        } else {
          Logger.debug('No upcoming events, no active notifications');
        }
      }
    } catch (error) {
      Logger.error('Error checking for upcoming meetings:', error);
    }
  }

  /**
   * Finds the next upcoming meeting within the notification threshold
   * @param events - List of calendar events to check
   * @returns The next upcoming event, or null if none found
   * @private
   */
  private findNextUpcomingEvent(events: CalendarEvent[]): CalendarEvent | null {
    const now = Date.now();

    // Filter out irrelevant events:
    // - All-day events (as specified in requirements)
    // - Cancelled events
    // - Events that have already started
    // - Events without online meeting URLs (likely not Teams meetings)
    const relevantEvents = events.filter(event =>
      !event.isAllDayEvent &&
      !event.isCancelled &&
      new Date(event.startTime).getTime() > now
      // TOOD: Maybe make this configurable
      // && event.isOnlineMeeting
      // && event.skypeTeamsMeetingUrl
    );

    Logger.debug(`Found ${relevantEvents.length} relevant events after filtering`);

    // Find events starting within the notification threshold
    const upcomingEvents = relevantEvents.filter(event => {
      const startTime = new Date(event.startTime).getTime();
      const timeUntilStart = startTime - now;
      const isUpcoming = timeUntilStart <= Constants.EVENT_NOTIFICATION_THRESHOLD_MS;

      if (isUpcoming) {
        Logger.debug(`Event "${event.subject}" starting in ${Math.floor(timeUntilStart / 1000)} seconds`);
      }

      return isUpcoming;
    });

    // If we have any events starting soon, return the earliest one
    if (upcomingEvents.length > 0) {
      upcomingEvents.sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const nextEvent = upcomingEvents[0];
      const startTime = new Date(nextEvent.startTime);
      Logger.debug(`Next upcoming event: "${nextEvent.subject}" at ${startTime.toLocaleTimeString()}`);

      return nextEvent;
    }

    return null;
  }

  // #endregion
}
