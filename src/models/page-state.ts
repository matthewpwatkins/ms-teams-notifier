import { CalendarEvent } from "./calendar-event";

export enum RingState {
  NOT_RINGING,
  RINGING,
  DISMISSED  
};

export type PageState = {
  calendarButton?: HTMLElement;
  isOnCalendar: boolean;
  firstCalendarButtonClicked: boolean;
  outlookEvents: CalendarEvent[];
  events: Map<string, CalendarEvent>;
  ringableEvent?: CalendarEvent;
  ringState: RingState;
  dismissButton?: HTMLElement;
};
