/**
 * Represents a calendar event from Microsoft Teams
 */
export type CalendarEvent = {
  /** The unique ID of the event */
  objectId: string;

  /** The start time of the event */
  startTime: string;
  
  /** The end time of the event */
  endTime: string;
  
  /** The title or subject of the event */
  subject: string;
  
  /** Whether this is an all-day event */
  isAllDayEvent: boolean;
  
  /** Whether this event has been cancelled */
  isCancelled: boolean;
  
  /** Whether this is an online meeting */
  isOnlineMeeting: boolean;
  
  /** The Teams meeting URL for this event */
  skypeTeamsMeetingUrl: string;
};