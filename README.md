# MS Teams Notifier

A Chrome extension that provides notifications for upcoming MS Teams meetings.

## Features

- Automatically checks for upcoming meetings in your MS Teams calendar
- Plays a ringtone when a meeting is about to start (within 2 minutes)
- Shows meeting details including subject, time, and organizer
- Provides a dismiss button to silence the notification
- Automatically stops notifications when you join the meeting
- Automatically stops notifications 2 minutes after the meeting has begun
- Smart detection of meeting joins to silence notifications
- Ignores all-day events

## Architecture

The extension is built with a modular architecture:

- **Models**: Contains data structures for MS Teams calendar events
- **Core Components**:
  - `TeamsApiClient`: Handles API calls to MS Teams calendar API
  - `MeetingMonitor`: Manages state, polls for events, and notifies listeners
  - `NotificationManager`: Handles UI interactions and ringtone playback using Howler.js
  - `TeamsNotifierApp`: Main application class that coordinates all components

## Development

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Create a zip file for distribution
npm run zip

# Run tests
npm test
```

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked" and select the `dist` directory
4. Navigate to MS Teams in your browser to test the notification system

## License

ISC License
