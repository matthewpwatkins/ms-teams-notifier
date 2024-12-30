import { CalendarEvent } from "./models/calendar-event";

const CANCELED_REGEX = '(?<canceled>Canceled)';
const ALL_DAY_REGEX = '(?<all_day>All[- ]day event)';
const TITLE_REGEX = '(?<title>.+)';
const DATE_REGEX = '\\w+,\\s+\\w+\\s+\\d{1,2},\\s+\\d{4}';
const TIME_REGEX = '\\d{1,2}:\\d{2}\\s+[AP]M';
const STAR_DATE_REGEX = `(?<start_date>${DATE_REGEX})`;
const START_TIME_REGEX = `(?<start_time>${TIME_REGEX})`;
const END_DATE_REGEX = `(?<end_date>${DATE_REGEX})`;
const END_TIME_REGEX = `(?<end_time>${TIME_REGEX})`;

const TEAMS_EVENT_REGEX = new RegExp(`(${CANCELED_REGEX}:\\s+)?(${ALL_DAY_REGEX},\\s+)?${TITLE_REGEX}(,|\\s+from)\\s+${STAR_DATE_REGEX}(\\s+${START_TIME_REGEX})?\\s+to\\s+(${END_DATE_REGEX})?\\s*(${END_TIME_REGEX})?`, 'i');
const OUTLOOK_EVENT_REGEX = new RegExp(`(${CANCELED_REGEX}:\\s+)?${TITLE_REGEX},\\s+(${ALL_DAY_REGEX}|${START_TIME_REGEX}\\s+to\\s+${END_TIME_REGEX}),\\s+${STAR_DATE_REGEX}(\\s+to\\+${END_DATE_REGEX})?`, 'i');

function createCalendarEvent(title: string, startDateString: string, startTimeString: string, endDateString: string, endTimeString: string, timeZone?: string, isCanceled: boolean = false, isAllDay: boolean = false): Omit<CalendarEvent, 'id'> {
  const tzSuffix = timeZone ? ` ${timeZone}` : '';
  return {
    title: title,
    start: new Date(`${startDateString} ${startTimeString}${tzSuffix}`),
    end: new Date(`${endDateString} ${endTimeString}${tzSuffix}`),
    isCanceled: isCanceled,
    isAllDay: isAllDay
  };
}

function createCalendarEventFromTitle(regex: RegExp, fullEventTitle: string, timeZone?: string): Omit<CalendarEvent, 'id'> {
  const match = fullEventTitle.match(regex);
  if (match?.groups) {
    const isCanceled = match.groups.canceled?.trim()?.length > 0;
    const isAllDay = match.groups.all_day?.trim()?.length > 0;
    const title = match.groups.title;
    const startDate = match.groups.start_date;
    const startTime = match.groups.start_time || '00:00';
    const endDate = match.groups.end_date || startDate;
    const endTime = match.groups.end_time || '23:59';
    return createCalendarEvent(title, startDate, startTime, endDate, endTime, timeZone, isCanceled, isAllDay);
  }
  throw new Error('Invalid event title format: ' + fullEventTitle);
}

export function parseCalendarEventFromTeamsEventTitle(fullEventTitle: string, timeZone?: string): CalendarEvent {
  const partialCalendarEvent = createCalendarEventFromTitle(TEAMS_EVENT_REGEX, fullEventTitle, timeZone);
  return {
    id: `${partialCalendarEvent.start.toISOString().split('T')[0]}|${partialCalendarEvent.title}`,
    ...partialCalendarEvent    
  };
}

export function parseCalendarEventFromOutlookEventTitle(id:string, fullEventTitle: string, timeZone?: string): CalendarEvent {
  return {
    id,
    ...createCalendarEventFromTitle(OUTLOOK_EVENT_REGEX, fullEventTitle, timeZone)
  };
}