import { runOutlookMain } from "./main-outlook";
import { runTeamsMain } from "./main-teams";

if (window.location.hostname === 'outlook.office.com') {
  runOutlookMain();
} else if (window.location.hostname === 'teams.microsoft.com') {
  runTeamsMain();
}

// window.addEventListener('message', (event) => {
//     if (event.origin !== 'https://teams.microsoft.com') {
//       return;
//     }

//     if (event.data.type === 'GET_EVENTS') {
//       console.log('OUTLOOK: Received GET_EVENTS message from Teams');

//       const events: CalendarEvent[] = [];
//       for (const v2CalendarCard of document.querySelectorAll<HTMLElement>('.calendar-SelectionStyles-resizeBoxParent div[role="button"]')) {
//         const fullTitle = v2CalendarCard.getAttribute('aria-label')!;
//         console.log('Parsing V2 calendar event:', fullTitle);
//         events.push(parseCalendarEventFromOutlookCalendarEventCard(fullTitle));
//       }

//       event.source!.postMessage({ type: 'OUTLOOK_RESPONSE', events }, {
//         targetOrigin: event.origin
//       });
//     }
//   });


// window.addEventListener('message', (event) => {
//   if (event.origin !== 'https://outlook.office.com') {
//     return;
//   }

//   if (event.data.type === 'OUTLOOK_RESPONSE') {
//     console.log('TEAMS: Received response from Outlook:', event.data);
//     // Handle the response from Outlook here
//   }
// });


  // // V2 unified Outlook calendar view
  // const v2CalendarIframe = document.querySelector<HTMLIFrameElement>('iframe[src*="outlook.office.com"]');
  // if (v2CalendarIframe) {
  //   console.log('Sending message to Outlook iframe...');
  //   v2CalendarIframe.contentWindow?.postMessage({ type: 'GET_EVENTS' }, '*');
  // }
