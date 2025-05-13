import { Howl } from 'howler';
import { Constants } from './constants';
import { Logger } from './logger';
import { CalendarEvent } from './models/CalendarEvent';
import { MeetingMonitor, UpcomingMeetingListener } from './MeetingMonitor';

/**
 * Manages notification UI and sound for upcoming Team meetings
 * Implements the UpcomingMeetingListener interface to receive meeting notifications
 */
export class NotificationManager implements UpcomingMeetingListener {
  private ringtone: Howl | null = null;
  private dismissButton: HTMLButtonElement | null = null;
  private dismissButtonWrapper: HTMLDivElement | null = null;
  private notificationTimeout: number | null = null;
  private currentEvent: CalendarEvent | null = null;
  private meetingMonitor: MeetingMonitor | null = null;
  private dismissedEvents: Set<string> = new Set();

  /**
   * Creates a new NotificationManager
   * @param meetingMonitor - Optional MeetingMonitor instance to communicate with
   */
  constructor(meetingMonitor?: MeetingMonitor) {
    this.meetingMonitor = meetingMonitor || null;
    
    // Pre-load the ringtone with error handling
    this.ringtone = new Howl({
      src: [Constants.RINGTONE_URL],
      loop: true,
      preload: true,
      volume: 0.7,
      onloaderror: (soundId, error) => {
        Logger.error('Error loading ringtone:', error);
      },
      onplayerror: (soundId, error) => {
        Logger.error('Error playing ringtone:', error);
        // Try to recover by reloading the sound
        if (this.ringtone) {
          this.ringtone.once('unlock', () => {
            this.ringtone?.play();
          });
        }
      }
    });

    // Setup mutation observer to detect when user joins the meeting
    this.setupMeetingJoinObserver();
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
    if (this.ringtone?.playing()) {
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

    // Set a timeout to automatically stop the notification after the event starts
    // plus the notification timeout period
    const eventStartTime = new Date(event.startTime).getTime();
    const now = Date.now();
    const timeUntilEventStarts = eventStartTime - now;
    
    // Calculate when to stop the notification
    const notificationDuration = timeUntilEventStarts + Constants.NOTIFICATION_TIMEOUT_MS;
    
    this.notificationTimeout = window.setTimeout(() => {
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
   * Starts playing the notification ringtone
   * @private
   */
  private startRingtone(): void {
    Logger.debug('Starting ringtone playback');
    if (this.ringtone && !this.ringtone.playing()) {
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

    // Button wrapper
    this.dismissButtonWrapper = document.createElement('div');
    this.dismissButtonWrapper.className = 'fui-Primitive';
    this.dismissButtonWrapper.style.marginRight = '8px';
    this.dismissButtonWrapper.style.display = 'inline-flex';
    this.dismissButtonWrapper.style.alignItems = 'center';

    // Button
    this.dismissButton = document.createElement('button');
    this.dismissButton.id = Constants.DISMISS_BUTTON_ID;
    this.dismissButton.style.padding = '4px 8px';
    this.dismissButton.style.cursor = 'pointer';
    this.dismissButton.style.color = '#ffffff';
    this.dismissButton.style.border = 'none';
    this.dismissButton.style.borderRadius = '4px';
    this.dismissButton.style.fontWeight = '600';
    this.dismissButton.style.fontFamily = "BlinkMacSystemFont, 'Segoe UI', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Web', sans-serif";
    this.dismissButton.style.fontSize = '14px';
    this.dismissButton.style.textAlign = 'center';
    this.dismissButton.style.backgroundColor = '#2977ff';
    this.dismissButton.style.display = 'flex'; // Ensure flex layout
    this.dismissButton.style.alignItems = 'center'; // Vertically center icon and text
    this.dismissButton.onclick = () => this.stopNotification();

    // Icon div
    const iconDiv = document.createElement('div');
    iconDiv.classList.add('ui-box');
    iconDiv.style.width = '2rem';
    iconDiv.style.display = 'flex';
    iconDiv.style.alignItems = 'center';
    iconDiv.style.justifyContent = 'center';

    iconDiv.innerHTML = `<svg font-size="20" class="fui-Icon-regular" fill="currentColor" aria-hidden="true" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: block;">
      ${Constants.PHONE_ICON_SVG_PATH}
    </svg>`;

    // Dismiss text
    const dismissSpan = document.createElement('span');
    dismissSpan.style.display = 'inline';
    dismissSpan.style.marginLeft = '0.25rem';
    dismissSpan.textContent = 'Dismiss';

    this.dismissButton.appendChild(iconDiv);
    this.dismissButton.appendChild(dismissSpan);

    // Add hover effect
    this.dismissButton.onmouseover = () => {
      this.dismissButton!.style.backgroundColor = '#0d65ff';
    };
    this.dismissButton.onmouseout = () => {
      this.dismissButton!.style.backgroundColor = '#2977ff';
    };

    // Append the icon and button to the wrapper
    this.dismissButtonWrapper.appendChild(this.dismissButton);

    // Insert the button before the more-options-header element
    this.insertDismissButton();

    // If we couldn't find the target element immediately, retry a few times
    // as the Teams UI might still be loading
    let retryCount = 0;
    const maxRetries = 5;
    const retryInterval = 1000; // 1 second

    const retryInsert = () => {
      if (retryCount < maxRetries) {
        window.setTimeout(() => {
          if (!document.getElementById(Constants.DISMISS_BUTTON_ID)) {
            retryCount++;
            this.insertDismissButton();
            Logger.debug(`Retry ${retryCount}/${maxRetries} to insert dismiss button`);
            
            if (!document.getElementById(Constants.DISMISS_BUTTON_ID)) {
              retryInsert();
            }
          }
        }, retryInterval);
      } else {
        Logger.debug('Failed to insert dismiss button after maximum retries');
      }
    };

    if (!document.getElementById(Constants.DISMISS_BUTTON_ID)) {
      retryInsert();
    }
  }

  /**
   * Inserts the dismiss button into the Teams UI
   * @private
   */
  private insertDismissButton(): void {
    if (!this.dismissButtonWrapper) return;

    const moreOptionsHeader = document.getElementById(Constants.MORE_OPTIONS_HEADER_ID);
    if (moreOptionsHeader && moreOptionsHeader.parentElement) {
      moreOptionsHeader.parentElement.insertBefore(this.dismissButtonWrapper, moreOptionsHeader);
      Logger.debug('Dismiss button inserted successfully');
    } else {
      Logger.debug('Could not find more-options-header element to insert dismiss button');
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
      clearTimeout(this.notificationTimeout);
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

  /**
   * Sets up a mutation observer to detect when the user joins a meeting
   * @private
   */
  private setupMeetingJoinObserver(): void {
    // Observer to detect when the user joins a meeting
    const observer = new MutationObserver((mutations) => {
      try {
        // There are multiple ways to detect if user joined a meeting in Teams
        // Look for multiple indicators to be more robust
        const joinIndicators = [
          document.body && document.querySelectorAll('.calling-div').length > 0,
          document.body && document.querySelectorAll('[data-tid="calling-header"]').length > 0,
          document.body && document.querySelectorAll('[data-tid="call-control-bar"]').length > 0,
          // The URL typically changes to include "calling" when in a call
          window.location.href.includes('/calling/'),
        ];
        
        // If any indicators are found and we have a ringtone playing
        if (joinIndicators.some(indicator => indicator) && this.ringtone?.playing()) {
          Logger.debug('User joined a meeting, stopping notification');
          this.stopNotification();
        }
      } catch (error) {
        // Handle errors gracefully in the observer
        Logger.error('Error in mutation observer:', error);
      }
    });
    
    // Only observe if we have a valid document body
    if (document.body) {
      // Start observing the document body for mutations and URL changes
      observer.observe(document.body, { 
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-tid']
      });
    }
    
    // Also check when URL changes (Teams is a SPA)
    window.addEventListener('popstate', () => {
      if (window.location.href.includes('/calling/') && this.ringtone?.playing()) {
        Logger.debug('URL changed to call, stopping notification');
        this.stopNotification();
      }
    });
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
  }
}
