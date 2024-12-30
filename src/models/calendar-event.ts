export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isCanceled: boolean;
  isAllDay: boolean;
};
