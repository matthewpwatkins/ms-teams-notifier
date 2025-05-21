const phonePath = `<path d="m17.96 10.94-.16.83c-.15.78-.87 1.3-1.7 1.22l-1.63-.16c-.72-.07-1.25-.59-1.47-1.33-.3-1-.5-1.75-.5-1.75a6.63 6.63 0 0 0-5 0s-.2.75-.5 1.75c-.2.67-.5 1.26-1.2 1.33l-1.63.16c-.81.08-1.6-.43-1.82-1.2l-.25-.84c-.25-.82-.03-1.7.58-2.28C4.1 7.3 6.67 6.51 9.99 6.5c3.33 0 5.6.78 7.16 2.16.66.58.97 1.46.8 2.28Z" fill="currentColor"></path>`;

export const Constants = {
  TEAMS_NOTIFIER_PORT_NAME: 'teams-notifier',
  FETCH_AUTH_TOKEN_MESSAGE_TYPE: 'GET_AUTH_TOKEN',
  AUTH_TOKEN_UPDATED_MESSAGE_TYPE: 'AUTH_TOKEN_UPDATED',
  AUTH_TOKEN_COOKIE_NAME: 'authtoken',
  AUTH_TOKEN_COOKIE_DOMAIN: 'teams.microsoft.com',
  RINGTONE_URL: 'https://statics.teams.cdn.office.net/evergreen-assets/audio/ring.mp3',
  EVENT_POLLING_INTERVAL_MS: 30 * 1000, // 30 seconds
  NOTIFY_BEFORE_EVENT_START_MS: 180 * 2 * 60 * 1000, // 2 minutes
  NOTIFY_AFTER_EVENT_START_MS: 180 * 2 * 60 * 1000, // 2 minutes after event starts
  DISMISS_BUTTON_ID: 'teams-notifier-dismiss-button',
  JOIN_BUTTON_ID: 'teams-notifier-join-button',
  MORE_OPTIONS_HEADER_ID: 'more-options-header',
  PREJOIN_BUTTON: 'prejoin-join-button',
  HANGUP_BUTTON_ID: 'hangup-button',
  PHONE_ICON_SVG_PATH: `<path d="M6.98 2.06c-.65.2-1.22.62-1.58 1.2-.93.72-1.05 2.5-.5 4.5.62 2.69 2.28 5.6 4.5 7.9 2.2 2.28 4.87 3.8 7.24 4.12.32.04.79.04 1.05 0 .78-.12 1.36-.57 1.85-1.41.13-.22.14-.25.32-.63.07-.15.15-.3.17-.33l.06-.1a.97.97 0 0 0-.13-.83l-.48-.66c-.6-.83-.7-.95-.85-1.1-.33-.35-.66-.5-1.04-.5-.11 0-.3.04-.57.13l-.9.28-.34.1-.09.02c-.75.15-1.28.07-1.88-.25a8.95 8.95 0 0 1-2.15-1.67c-.62-.64-1.25-1.51-1.62-2.26-.33-.67-.4-1.17-.24-1.66.04-.13.1-.2.76-.82l.7-.67c.19-.19.21-.23.21-.36 0-.22-.5-1.15-.93-1.76-.15-.2-.54-.69-.62-.79-.32-.35-.65-.5-1.04-.5-.12 0-.15 0-.32.07l-.62.18Z" fill="currentColor"></path>`,
  PHONE_HANGUP_SVG_PATHS: `<path d="m17.96 10.94-.16.83c-.15.78-.87 1.3-1.7 1.22l-1.63-.16c-.72-.07-1.25-.59-1.47-1.33-.3-1-.5-1.75-.5-1.75a6.63 6.63 0 0 0-5 0s-.2.75-.5 1.75c-.2.67-.5 1.26-1.2 1.33l-1.63.16c-.81.08-1.6-.43-1.82-1.2l-.25-.84c-.25-.82-.03-1.7.58-2.28C4.1 7.3 6.67 6.51 9.99 6.5c3.33 0 5.6.78 7.16 2.16.66.58.97 1.46.8 2.28Z" fill="currentColor"></path>`,
  JOIN_BUTTON_SVG_PATHS: `<path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm.5 13h-1v-5h1zm0-6h-1V7h1z" fill="currentColor"></path>`,
  DISMISS_BUTTON_BG_COLOR: 'var(--colorBrandBackground)',
  DISMISS_BUTTON_BG_HOVER_COLOR: 'rgb(90, 94, 197)',
  JOIN_BUTTON_BG_COLOR: 'rgb(38, 132, 71)', // Green color for the join button
  JOIN_BUTTON_BG_HOVER_COLOR: 'rgb(33, 115, 62)',
  NOTIFICATION_BUTTONS_HTML: `
    <div class="fui-Primitive" style="margin-right: 8px; margin-top: 6px; display: inline-flex; align-items: center; gap: 8px;">
      <button id="teams-notifier-join-button" style="padding: 4px 8px; cursor: pointer; color: white; border: none; border-radius: 4px; font-weight: 600; font-family: BlinkMacSystemFont, 'Segoe UI', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Web', sans-serif; font-size: 14px; text-align: center; background-color: rgb(38, 132, 71); display: flex; align-items: center;">
        <div class="ui-box" style="width: 2rem; display: flex; align-items: center; justify-content: center;">
          <svg font-size="20" class="fui-Icon-regular" fill="currentColor" aria-hidden="true" width="1em" height="1em" transform="rotate(-135)" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: block;">
            ${phonePath}
          </svg>
        </div>
        <span style="display: inline; margin-left: 0.5rem;">Join Call</span>
      </button>
      <button id="teams-notifier-dismiss-button" style="padding: 4px 8px; cursor: pointer; color: var(--colorNeutralForegroundOnBrand); border: none; border-radius: 4px; font-weight: 600; font-family: BlinkMacSystemFont, 'Segoe UI', system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Web', sans-serif; font-size: 14px; text-align: center; background-color: var(--colorBrandBackground); display: flex; align-items: center;">
        <div class="ui-box" style="width: 2rem; display: flex; align-items: center; justify-content: center;">
          <svg font-size="20" class="fui-Icon-regular" fill="currentColor" aria-hidden="true" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: block;">
            ${phonePath}
          </svg>
        </div>
        <span style="display: inline; margin-left: 0.5rem;">Dismiss</span>
      </button>
    </div>
  `
};