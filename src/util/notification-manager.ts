import { Howl, HowlOptions } from 'howler';
import { Constants } from '../common/constants';
import { Logger } from '../common/logger';
import { CalendarEvent } from '../models/calendar-event';
import { MeetingMonitor, UpcomingMeetingListener } from './meeting-monitor';
import { DomWatcher } from './dom-watcher';

/**
 * Manages notification UI and sound for upcoming Team meetings
 * Implements the UpcomingMeetingListener interface to receive meeting notifications
 */
export class NotificationManager implements UpcomingMeetingListener {
  private readonly meetingMonitor: MeetingMonitor;
  private readonly document: Document;
  private readonly window: Window;
  private readonly domWatcher: DomWatcher;
  
  private ringtone: Howl | null = null;
  private isRinging: boolean = false;
  private dismissButton: HTMLButtonElement | null = null;
  private dismissButtonWrapper: HTMLDivElement | null = null;
  private notificationTimeout: number | null = null;
  private currentEvent: CalendarEvent | null = null;
  private dismissedEvents: Set<string> = new Set();
  private userIsJoiningOrInCall: boolean = false;

  /**
   * Creates a new NotificationManager
   * @param window - The DOM window object to use for DOM manipulation
   * @param document - The DOM document object to use for DOM manipulation
   * @param meetingMonitor - MeetingMonitor instance to communicate with
   * @param howlFactory - factory function to create Howl instances
   */
  constructor(
    window: Window,
    document: Document,
    domWatcher: DomWatcher,
    meetingMonitor: MeetingMonitor,
    howlFactory: (options: HowlOptions) => Howl
  ) {
    this.window = window;
    this.document = document;    
    this.domWatcher = domWatcher;
    this.meetingMonitor = meetingMonitor;

    this.ringtone = howlFactory({
      src: [Constants.RINGTONE_URL],
      loop: true,
      preload: true,
      volume: 0.7,
      onloaderror: (soundId: number, error: any) => {
        Logger.error('Error loading ringtone:', error);
      },
      onplayerror: (soundId: number, error: any) => {
        Logger.error('Error playing ringtone:', error);
        // Try to recover by reloading the sound
        if (this.ringtone) {
          this.ringtone.once('unlock', () => {
            this.ringtone?.play();
          });
        }
      }
    });

    this.domWatcher.subscribe(this.onDomChange.bind(this));
  }

  /**
   * Handles notification when an upcoming meeting is detected
   * Called by the MeetingMonitor when a meeting is coming up soon
   * @param event - The upcoming calendar event
   */
  public onUpcomingMeeting(event: CalendarEvent): void {
    // Suppress notification if this event was dismissed
    if (this.dismissedEvents.has(event.objectId)) {
      return;
    }

    // If we're already notifying for an event, don't start another notification
    if (this.isRinging) {
      Logger.debug('Already notifying for an event, ignoring new event notification');
      return;
    }

    Logger.debug(`Showing notification for upcoming event: ${event.subject}`);
    this.currentEvent = event;
    
    // Update the active notification in the meeting monitor
    if (this.meetingMonitor) {
      this.meetingMonitor.setActiveNotification(event);
    }

    // Create the dismiss button
    this.createDismissButton();

    // Start playing the ringtone
    this.startRingtone();

    // Check if the hangup button already exists when the notification starts
    this.userIsJoiningOrInCall = !!this.document.getElementById(Constants.HANGUP_BUTTON_ID);
    Logger.debug(`Hangup button exists at notification start: ${this.userIsJoiningOrInCall}`);

    // Set a timeout to automatically stop the notification after the event starts
    // plus the notification timeout period
    const eventStartTime = new Date(event.startTime).getTime();
    const now = Date.now();
    const timeUntilEventStarts = eventStartTime - now;
    
    // Calculate when to stop the notification
    const notificationDuration = timeUntilEventStarts + Constants.NOTIFY_AFTER_EVENT_START_MS;
    
    this.notificationTimeout = this.window.setTimeout(() => {
      this.stopNotification();
    }, notificationDuration);
  }

  /**
   * Handles the case when there are no upcoming meetings
   * Called by the MeetingMonitor when no meetings are detected in the next threshold period
   */
  public onNoUpcomingMeetings(): void {
    this.dismissedEvents.clear();
    this.stopNotification();
  }

  /**
   * Cleans up resources used by the NotificationManager
   */
  public dispose(): void {
    this.stopNotification();
    
    if (this.ringtone) {
      this.ringtone.unload();
      this.ringtone = null;
    }

    this.domWatcher.unsubscribe(this.onDomChange.bind(this));
  }

  // #region Private helpers

  private onDomChange(): void {
    const userIsNowJoiningOrInCall = !!(this.document.getElementById(Constants.PREJOIN_BUTTON)
      || this.document.getElementById(Constants.HANGUP_BUTTON_ID));

    // Stop ringing if the user is newly in a call
    if (this.isRinging && !this.userIsJoiningOrInCall && userIsNowJoiningOrInCall) {

      Logger.debug('User is now joining or in a call - stopping any ringing notification');
      this.stopNotification();
    }

    this.userIsJoiningOrInCall = userIsNowJoiningOrInCall;
  }

  /**
   * Starts playing the notification ringtone
   * @private
   */
  private startRingtone(): void {
    Logger.debug('Starting ringtone playback');
    if (this.ringtone && !this.ringtone.playing()) {
      this.isRinging = true;
      this.ringtone.play();
    }
  }

  /**
   * Stops the notification ringtone if it's playing
   * @private
   */
  private stopRingtone(): void {
    Logger.debug('Stopping ringtone playback');
    if (this.ringtone && this.ringtone.playing()) {
      this.isRinging = false;
      this.ringtone.stop();
    }
  }

  /**
   * Creates and styles the dismiss button for an event notification
   * @param event - The calendar event for which to create the dismiss button
   * @private
   */
  private createDismissButton(): void {
    if (this.dismissButton) {
      // Button already exists, remove it first
      this.removeDismissButton();
    }

   // Get the wrapper and button elements
    this.dismissButtonWrapper = this.createElementFromHTML(Constants.DISMISS_BUTTON_HTML) as HTMLDivElement;
    this.dismissButton = this.dismissButtonWrapper.querySelector(`#${Constants.DISMISS_BUTTON_ID}`) as HTMLButtonElement;
    
    // Add event handlers (these can't be in the HTML template)
    this.dismissButton.onclick = () => this.stopNotification();
    
    // Add hover effect
    this.dismissButton.onmouseover = () => {
      this.dismissButton!.style.backgroundColor = Constants.DISMISS_BUTTON_BG_HOVER_COLOR;
    };
    this.dismissButton.onmouseout = () => {
      this.dismissButton!.style.backgroundColor = Constants.DISMISS_BUTTON_BG_COLOR;
    };

    // Insert the button before the more-options-header element
    this.insertDismissButton();

    // If we couldn't find the target element immediately, retry a few times
    // as the Teams UI might still be loading
    let retryCount = 0;
    const maxRetries = 5;
    const retryInterval = 1000; // 1 second

    const retryInsert = () => {
      if (retryCount < maxRetries) {
        this.window.setTimeout(() => {
          if (!this.document.getElementById(Constants.DISMISS_BUTTON_ID)) {
            retryCount++;
            this.insertDismissButton();
            Logger.trace(`Retry ${retryCount}/${maxRetries} to insert dismiss button`);
            
            if (!this.document.getElementById(Constants.DISMISS_BUTTON_ID)) {
              retryInsert();
            }
          }
        }, retryInterval);
      } else {
        Logger.warn('Failed to insert dismiss button after maximum retries');
      }
    };

    if (!this.document.getElementById(Constants.DISMISS_BUTTON_ID)) {
      retryInsert();
    }
  }

  private createElementFromHTML(html: string): HTMLElement {
    const tempContainer = this.document.createElement('div');
    tempContainer.innerHTML = html;
    return tempContainer.firstElementChild as HTMLElement;
  }

  /**
   * Inserts the dismiss button into the Teams UI
   * @private
   */
  private insertDismissButton(): void {
    if (!this.dismissButtonWrapper) {
      return;
    }

    const moreOptionsHeader = this.document.getElementById(Constants.MORE_OPTIONS_HEADER_ID);
    if (moreOptionsHeader && moreOptionsHeader.parentElement) {
      moreOptionsHeader.parentElement.insertBefore(this.dismissButtonWrapper, moreOptionsHeader);
      Logger.trace('Dismiss button inserted successfully');
    } else {
      Logger.warn('Could not find more-options-header element to insert dismiss button');
    }
  }

  /**
   * Removes the dismiss button from the DOM
   * @private
   */
  private removeDismissButton(): void {
    if (this.dismissButtonWrapper && this.dismissButtonWrapper.parentElement) {
      this.dismissButtonWrapper.parentElement.removeChild(this.dismissButtonWrapper);
      this.dismissButtonWrapper = null;
      this.dismissButton = null;
      Logger.debug('Dismiss button removed');
    }
  }

  /**
   * Stops all active notifications, clears timeouts, and removes UI elements
   * @private
   */
  private stopNotification(): void {
    Logger.debug('Stopping notification');
    this.stopRingtone();
    this.removeDismissButton();
    
    if (this.notificationTimeout !== null) {
      this.window.clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
    
    // Mark current event as dismissed
    if (this.currentEvent) {
      this.dismissedEvents.add(this.currentEvent.objectId);
    }
    
    // Clear the active notification in the meeting monitor
    if (this.meetingMonitor) {
      this.meetingMonitor.setActiveNotification(null);
    }
    
    this.currentEvent = null;
  }

  // #endregion
}
