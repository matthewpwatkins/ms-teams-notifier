import { Constants } from './common/constants';
import { Logger, parseLogLevel } from './common/logger';
import { AuthTokenService } from './services/AuthTokenService';

Logger.setLogLevel(parseLogLevel(process.env.LOG_LEVEL)!);

const ports: { [tabId: number]: chrome.runtime.Port } = {};
const authTokenService = new AuthTokenService();

chrome.runtime.onConnect.addListener((port) => {
  setupPort(port);
});

authTokenService.addChangeListener((token) => {
  Object.values(ports).forEach(port => {
    sendAuthTokenChangeMessage(port, token);
  });
});

// #region Private helpers

function setupPort(port: chrome.runtime.Port) {
  if (port.name !== Constants.TEAMS_NOTIFIER_PORT_NAME) {
    return;
  }
  
  // Save port reference using tab ID as key
  const tabId = port.sender?.tab?.id;
  if (!tabId) {
    return;
  }
  
  Logger.debug(`Setting up port for tab ID: ${tabId}`);
  ports[tabId] = port;

  // Handle requests from the content script
  port.onMessage.addListener(async (message) => {
    if (message.type === Constants.FETCH_AUTH_TOKEN_MESSAGE_TYPE) {
      await handleGetAuthTokenRequest(port);
    }
  });

  // Clean up when port disconnects
  port.onDisconnect.addListener(() => {
    if (tabId && ports[tabId]) {
      delete ports[tabId];
    }
  });
}

async function handleGetAuthTokenRequest(port: chrome.runtime.Port) {
  Logger.trace(`Received request for auth token from tab: ${port.sender?.tab?.id}`);
  const token = await authTokenService.getToken();
  sendAuthTokenChangeMessage(port, token);
}

function sendAuthTokenChangeMessage(port: chrome.runtime.Port, token: string | null) {
  Logger.trace(`Sending auth token change message to content script for tab: ${port.sender?.tab?.id}`);
  try {
    port.postMessage({
      type: Constants.AUTH_TOKEN_UPDATED_MESSAGE_TYPE,
      token,
      timestamp: Date.now()
    });
  } catch (error) {
    Logger.error(`Error sending token change notification for tab ${port.sender?.tab?.id}:`, error);
  }
}

// #endregion