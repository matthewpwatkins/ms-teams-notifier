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
      const now = new Date();
      const meetingStartTimeWindowStart = new Date(now.getTime() - (2 * (Constants.NOTIFY_AFTER_EVENT_START_MS)));
      const meetingStartTimeWindowEnd = new Date(now.getTime() + (2 * Constants.NOTIFY_BEFORE_EVENT_START_MS));

      Logger.debug(`Checking for upcoming meetings between ${meetingStartTimeWindowStart.toUTCString()} and ${meetingStartTimeWindowEnd.toUTCString()}`);
      const proximalEvents = await this.apiClient.getEvents({
        startDate: meetingStartTimeWindowStart,
        endDate: meetingStartTimeWindowEnd
      });

      const nextRingableEvent = this.getEarliestRingableEvent(proximalEvents, now);
      Logger.debug(`Next ringable event`, nextRingableEvent);

      if (nextRingableEvent) {
        // Only notify if we don't already have an active notification
        if (this.activeNotificationEvent) {
          Logger.debug('Already have an active notification, skipping');
          return;
        }

        Logger.debug('Notifying listeners of upcoming meeting', nextRingableEvent, this.listeners);
        for (const listener of this.listeners) {
          listener.onUpcomingMeeting(nextRingableEvent);
        }
      } else {
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
   * @param proximalEvents - List of calendar events to check
   * @returns The next upcoming event, or null if none found
   * @private
   */
  private getEarliestRingableEvent(proximalEvents: CalendarEvent[], now: Date): CalendarEvent | null {
    const sortedProximalEvents = proximalEvents.sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    for (const event of sortedProximalEvents) {
      // TOOD: Maybe only ring for online meetings (event.isOnlineMeeting or event.skypeTeamsMeetingUrl)
      if (event.isAllDayEvent || event.isCancelled) {
        // Skip all-day events and cancelled events
        continue;
      }

      const startTime = new Date(event.startTime).getTime();
      const timeUntilStart = startTime - now.getTime();
      if (timeUntilStart > Constants.NOTIFY_BEFORE_EVENT_START_MS) {
        // It starts too far in the future
        continue;
      }
      if (timeUntilStart < -Constants.NOTIFY_AFTER_EVENT_START_MS) {
        // It started too long ago
        continue;
      }

      // This event is in the window
      return event;
    }

    // No events found in the window
    return null;
  }

  // #endregion
}
