export const Constants = {
  TEAMS_NOTIFIER_PORT_NAME: 'teams-notifier',
  FETCH_AUTH_TOKEN_MESSAGE_TYPE: 'GET_AUTH_TOKEN',
  AUTH_TOKEN_UPDATED_MESSAGE_TYPE: 'AUTH_TOKEN_UPDATED',
  AUTH_TOKEN_COOKIE_NAME: 'authtoken',
  AUTH_TOKEN_COOKIE_DOMAIN: 'teams.microsoft.com',
  RINGTONE_URL: 'https://statics.teams.cdn.office.net/evergreen-assets/audio/ring.mp3',
  EVENT_NOTIFICATION_THRESHOLD_MS: 2 * 60 * 1000, // 2 minutes
  EVENT_POLLING_INTERVAL_MS: 30 * 1000, // 30 seconds
  NOTIFICATION_TIMEOUT_MS: 2 * 60 * 1000, // 2 minutes after event starts
  DISMISS_BUTTON_ID: 'teams-notifier-dismiss-button',
  MORE_OPTIONS_HEADER_ID: 'more-options-header',
  PHONE_ICON_SVG_PATH: `<path d="m6.99 2.07-.72.21a3.5 3.5 0 0 0-2.45 2.86c-.3 2.06.36 4.48 1.96 7.25 1.6 2.77 3.36 4.55 5.3 5.33a3.5 3.5 0 0 0 3.7-.7l.55-.52a2 2 0 0 0 .25-2.62L14.22 12a1.5 1.5 0 0 0-1.65-.56l-2.05.63-.06.01c-.22.04-.74-.45-1.4-1.58-.67-1.18-.82-1.87-.63-2.04l1.05-.98a2.5 2.5 0 0 0 .57-2.85l-.66-1.47a2 2 0 0 0-2.4-1.1Zm1.49 1.5.66 1.47a1.5 1.5 0 0 1-.35 1.71l-1.04.98c-.67.63-.45 1.71.45 3.27.85 1.47 1.62 2.19 2.45 2.06l.12-.02 2.09-.64a.5.5 0 0 1 .55.19l1.36 1.88a1 1 0 0 1-.13 1.3l-.54.52a2.5 2.5 0 0 1-2.65.5c-1.7-.68-3.3-2.3-4.8-4.9-1.5-2.59-2.1-4.8-1.84-6.61a2.5 2.5 0 0 1 1.75-2.04l.72-.22a1 1 0 0 1 1.2.55Z" fill="currentColor"></path>`,
};