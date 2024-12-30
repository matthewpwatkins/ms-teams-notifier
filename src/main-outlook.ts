import { parseCalendarEventFromOutlookEventTitle } from "./event-parser";
import { CalendarEvent } from "./models/calendar-event";

function onPageChange() {
  const events: CalendarEvent[] = [];

  for (const v2CalendarCard of document.querySelectorAll<HTMLElement>('div[data-calitemid] div[role="button"]')) {
    const fullTitle = v2CalendarCard.getAttribute('aria-label')!;
    events.push(parseCalendarEventFromOutlookEventTitle(v2CalendarCard.getAttribute('data-calitemid')!, fullTitle));
  }

  window.parent.postMessage({ type: 'OUTLOOK_EVENTS', events }, {
    targetOrigin: 'https://teams.microsoft.com'
  });
}

export function runOutlookMain() {
  if (window.self === window.top) {
    // Not in any iFrame, let alone Teams
    return;
  }

  new MutationObserver(onPageChange).observe(document.body, { childList: true, subtree: true });
  onPageChange();
}
