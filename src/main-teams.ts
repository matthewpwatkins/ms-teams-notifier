import { parseCalendarEventFromTeamsEventTitle } from "./event-parser";
import { CalendarEvent } from "./models/calendar-event";
import { PageState, RingState } from "./models/page-state";
import { isInRingWindow, RingWindow } from "./models/ring-window";
import { Howl } from 'howler';

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const RING_INTERVAL_MS = 15_000;

const RING = new Howl({
  src: ['https://statics.teams.cdn.office.net/evergreen-assets/audio/ring.mp3'],
  loop: true
});

const RING_WINDOW: RingWindow = {
  msBeforeStart: 120_000,
  msAfterStart: 120_000
};

const state: PageState = {
  calendarButton: undefined,
  isOnCalendar: false,
  firstCalendarButtonClicked: false,
  outlookEvents: [],
  events: new Map(),
  ringableEvent: undefined,
  ringState: RingState.NOT_RINGING,
  dismissButton: undefined // Track the dismiss button
};

function onPageChange(mutations?: MutationRecord[]) {
  // Ignore mutations caused by our dismiss button
  if (mutations && mutations.some(mutation => {
    return Array.from(mutation.addedNodes).some(node => 
      node instanceof HTMLElement && node.id === 'ms-teams-notifier-dismiss-button') ||
    Array.from(mutation.removedNodes).some(node => 
      node instanceof HTMLElement && node.id === 'ms-teams-notifier-dismiss-button');
  })) {
    return;
  }

  state.calendarButton = document.querySelector<HTMLElement>('button[aria-label="Calendar"]') || undefined;
  const isOnCalendar = state.calendarButton?.getAttribute('aria-pressed') === 'true';

  if (isOnCalendar) {
    const events = getCalendarEvents();
    if (events.length > 0) {
      for (const event of events) {
        state.events.set(event.id, event);
      }

      // Remove events that aren't +/- 1 day from today
      const today = new Date();
      const idsToRemove = new Set<string>();
      for (const [id, event] of state.events) {
        if (Math.abs(event.start.getTime() - today.getTime()) > MS_IN_DAY) {
          idsToRemove.add(id);
        }
      }
      for (const id of idsToRemove) {
        state.events.delete(id);
      }

      console.log(state);
    }
    ringOnActiveEvent();
  } else {
    if (state.isOnCalendar && state.ringState === RingState.RINGING) {
      state.ringState = RingState.DISMISSED;
      RING.stop();
      removeDismissButton();
    }
  }

  state.isOnCalendar = isOnCalendar;
}

function firstNavigateToCalendar() {
  if (state.firstCalendarButtonClicked) {
    return;
  }

  console.log('Navigating to calendar...');
  const interval = setInterval(() => {
    if (!state.calendarButton) {
      return;
    }

    console.log('Clicking calendar button...');
    state.calendarButton!.click();
    state.firstCalendarButtonClicked = true;
    clearInterval(interval);
  }, 100);
}

function createDismissButton() {
  if (state.dismissButton) {
    return; // Button already exists
  }

  // Find the reference button to place our dismiss button next to
  const referenceButton = document.querySelector<HTMLElement>('button[data-tid="calendar_header_meet_now_join_with_id_button"]');
  if (!referenceButton) {
    return; // Reference button not found
  }

  // Create our dismiss button with similar styling
  const dismissButton = document.createElement('button');
  dismissButton.id = 'ms-teams-notifier-dismiss-button';
  dismissButton.textContent = 'Dismiss Ring';
  dismissButton.className = referenceButton.className; // Clone the styles
  dismissButton.style.marginRight = '8px'; // Add some spacing
  
  // Add click handler
  dismissButton.addEventListener('click', () => {
    state.ringState = RingState.DISMISSED;
    RING.stop();
    removeDismissButton();
  });

  // Insert before the reference button
  referenceButton.parentNode?.insertBefore(dismissButton, referenceButton);
  state.dismissButton = dismissButton;
}

function removeDismissButton() {
  if (state.dismissButton && state.dismissButton.parentNode) {
    state.dismissButton.parentNode.removeChild(state.dismissButton);
    state.dismissButton = undefined;
  }
}

function getCalendarEvents() {
  const events: CalendarEvent[] = [];

  // V1 agenda view
  for (const v1AgendaCard of document.querySelectorAll<HTMLElement>('ul[aria-label^="Agenda view"] li')) {
    const fullTitle = v1AgendaCard.getAttribute('aria-label')!;
    events.push(parseCalendarEventFromTeamsEventTitle(fullTitle));
  }

  // V1 calendar view
  for (const v1CalendarCard of document.querySelectorAll<HTMLElement>('.ui-card[data-testid="calendar-in-day-event-card"]')) {
    const fullTitle = v1CalendarCard.getAttribute('title')!;
    events.push(parseCalendarEventFromTeamsEventTitle(fullTitle));
  }

  // V2 (Outlook) calendar view
  events.push(...state.outlookEvents);

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function ringOnActiveEvent() {
  const now = new Date();

  const ringableEvent = [...state.events.values()].find(event => !event.isCanceled && !event.isAllDay && isInRingWindow(event.start, now, RING_WINDOW));
  if (ringableEvent) {
    if (!state.ringableEvent || state.ringableEvent.title !== ringableEvent.title) {
      console.log('New ringable event:', ringableEvent);
      state.ringableEvent = ringableEvent;
      state.ringState = RingState.RINGING;
    }
  } else {
    state.ringableEvent = undefined;
    state.ringState = RingState.NOT_RINGING;
    removeDismissButton(); // Remove dismiss button when no ringable event
  }

  if (state.ringState === RingState.RINGING) {
    if (RING.playing()) {
      console.log('Already ringing for event:', ringableEvent);
      createDismissButton(); // Ensure dismiss button exists
    } else {
      console.log('Ringing for event:', ringableEvent, state.calendarButton);
      if (state.calendarButton) {
        state.calendarButton.click();
      }
      RING.play();
      createDismissButton(); // Add dismiss button when ringing
    }
  } else if (RING.playing()) {
    RING.stop();
    removeDismissButton(); // Remove dismiss button when not ringing
  }
}

function startPeriodicRinger() {
  const msTilNext15Seconds = RING_INTERVAL_MS - Date.now() % RING_INTERVAL_MS;
  setTimeout(() => {
    setInterval(ringOnActiveEvent, RING_INTERVAL_MS);
    ringOnActiveEvent();
  }, msTilNext15Seconds);
  if (msTilNext15Seconds > 1000) {
    ringOnActiveEvent();
  }
}

function starListeningToOutlookMessages() {
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://outlook.office.com') {
      return;
    }
  
    if (event.data.type === 'OUTLOOK_EVENTS') {
      state.outlookEvents = event.data.events;
      onPageChange();
    }
  });
}

export function runTeamsMain() {
  new MutationObserver((mutations) => onPageChange(mutations)).observe(document.body, { childList: true, subtree: true });
  onPageChange();
  firstNavigateToCalendar();
  startPeriodicRinger();
  starListeningToOutlookMessages();
}
