
import { Constants } from './constants';
import { Logger } from './logger';

/**
 * Listener for auth token changes
 */
export type AuthTokenChangeListener = (token: string | null) => void;

/**
 * Service to manage MS Teams authentication token cookie
 */
export class AuthTokenService {
  private currentAuthToken: string | null = null;
  private changeListeners: AuthTokenChangeListener[] = [];

  /**
   * Private constructor for singleton pattern
   */
  constructor() {
    chrome.cookies.onChanged.addListener(this.handleCookieChange.bind(this));
  }

  /**
   * Get the current auth token
   */
  public async getToken(): Promise<string | null> {
    if (!this.currentAuthToken) {
      const cookie = await this.getAuthTokenCookie();
      await this.handleAuthTokenCookieUpdate(cookie);
    }
    return this.currentAuthToken;
  }

  /**
   * Add a listener for token changes
   * @param listener The function to call when the token changes
   */
  public addChangeListener(listener: AuthTokenChangeListener): void {
    if (!this.changeListeners.includes(listener)) {
      this.changeListeners.push(listener);
    }
  }

  /**
   * Remove a change listener
   * @param listener The listener to remove
   */
  public removeChangeListener(listener: AuthTokenChangeListener): void {
    this.changeListeners = this.changeListeners.filter(l => l !== listener);
  }

  /**
   * Handle changes to the cookie
   */
  private async handleCookieChange(changeInfo: chrome.cookies.CookieChangeInfo): Promise<void> {
    const { cookie, removed } = changeInfo;
    if (cookie.domain.includes(Constants.AUTH_TOKEN_COOKIE_DOMAIN) && cookie.name === Constants.AUTH_TOKEN_COOKIE_NAME) {
      Logger.debug(`Auth token cookie ${removed ? 'removed' : 'changed'}`);
      await this.handleAuthTokenCookieUpdate(removed ? null : cookie);
    }
  }

  private async getAuthTokenCookie(): Promise<chrome.cookies.Cookie | null> {
    return await chrome.cookies.get({
      url: 'https://teams.microsoft.com',
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    }) || null;
  }

  /**
   * Refresh the current token from cookies
   */
  private async handleAuthTokenCookieUpdate(cookie: chrome.cookies.Cookie | null): Promise<void> {
    const authToken = cookie ? this.parseToken(cookie.value) : null;
    if (authToken !== this.currentAuthToken) {
      this.currentAuthToken = authToken;
      this.changeListeners.forEach(listener => {
        Logger.trace('Notifying auth token change listener of new token:', authToken);
        try {
          listener(authToken);
        } catch (error) {
          Logger.error('Error in auth token change listener:', error);
        }
      });
    }
  }

  /**
   * Parse the token from the cookie value
   */
  private parseToken(cookieValue: string): string | null {
    if (!cookieValue) {
      return null;
    }

    // Extract the token value, trimming off 'Bearer=' prefix and any query parameters
    let token = cookieValue.trim();
    if (token.startsWith('Bearer%')) {
      return this.parseToken(decodeURIComponent(token));
    }
    
    if (token.startsWith('Bearer=')) {
      token = token.substring('Bearer='.length);
    }

    // Remove any query string parameters
    return token.split('&')[0];
  }
}
