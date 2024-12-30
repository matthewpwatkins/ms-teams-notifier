# Microsoft Teams Notifier

One of the biggest frustrations with Microsoft Teams is that it doesn't proactively call you when a meeting is about to start. If you don't see the little popup from Outlook, you have no idea you're about to miss your meeting.

This Tampermonkey/GreaseMonkey script solves that. Instructions:

1. Install Tampermonkey or Greasemonkey in your browser if you haven't already.
2. Click [here](https://github.com/matthewpwatkins/ms-teams-notifier/releases/latest/download/teams-meeting-notifier.user.js) to install the latest version of the script.
3. Open MS Teams in your browser (you can put the web client on your desktop or taskbar as an app)

If you have the MS Teams app open, you will now get auto-called 2 minutes before every meeting.

## Limitations

This script works by scraping the calendar events directly from the page DOM, which means it can only get the events when you are in the calendar view. So it will pull up the calendar view on app launch. Both the v1 (Teams) as well as v2 (unified Outlook) calendars are supported. And if you navigate away from the calendar page, the app will remember the events for the day. However, if events change while you're away from the calendar view, you will still be ringed for the last known events. My recommendation is to keep the app focused on the calendar view whenever possible.

Accessing the calendar events via API call would be preferable. However, that requires cross-origin requests and capturing auth tokens which I haven't gotten working on this script yet. If you feel like doing the work to get that working, feel free to submit a pull request.

## Upcoming features

1. Improvements to event change detection
2. Navigate automatically to the call join page for Teams meetings
3. Allow dismissal of call notifications
4. Vacation mode

## Developing locally

1. Clone the repository
2. `npm install`
3. `npm run build`
4. The `.user.js` script is output to the dist folder.

## Releases

Just push or pull request into master to create a new release.
