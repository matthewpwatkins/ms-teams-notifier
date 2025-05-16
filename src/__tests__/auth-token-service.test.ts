import { AuthTokenService, AuthTokenChangeListener } from '../services/auth-token-service';
import { Constants } from '../common/constants';

// Mock chrome APIs
const mockChromeApi = {
  cookies: {
    get: jest.fn(),
    onChanged: {
      addListener: jest.fn()
    }
  }
};

// Mock the logger
jest.mock('../common/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn()
  }
}));

// Setup global chrome object with our mocks
global.chrome = mockChromeApi as unknown as typeof chrome;

describe('AuthTokenService', () => {
  let authTokenService: AuthTokenService;
  let cookieChangeHandler: Function;
  let mockChangeListener: jest.Mock<void, [string | null]>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockChromeApi.cookies.get.mockReset();
    mockChromeApi.cookies.onChanged.addListener.mockReset();
    
    // Capture the cookie change handler when added
    mockChromeApi.cookies.onChanged.addListener.mockImplementation((handler) => {
      cookieChangeHandler = handler;
    });
    
    // Create a new service instance
    authTokenService = new AuthTokenService();
    
    // Create a mock change listener
    mockChangeListener = jest.fn();
  });

  test('constructor should add a listener to chrome.cookies.onChanged', () => {
    expect(mockChromeApi.cookies.onChanged.addListener).toHaveBeenCalledTimes(1);
    expect(cookieChangeHandler).toBeDefined();
  });

  test('getToken should fetch cookie if no token exists', async () => {
    // Arrange
    const mockCookie = {
      value: 'Bearer=mockToken',
      domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    };
    mockChromeApi.cookies.get.mockResolvedValue(mockCookie);

    // Act
    const token = await authTokenService.getToken();

    // Assert
    expect(mockChromeApi.cookies.get).toHaveBeenCalledWith({
      url: 'https://teams.microsoft.com',
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    });
    expect(token).toBe('mockToken');
  });

  test('getToken should return existing token without fetching cookie', async () => {
    // Arrange - first set up a token
    const mockCookie = {
      value: 'Bearer=initialToken',
      domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    };
    mockChromeApi.cookies.get.mockResolvedValue(mockCookie);
    await authTokenService.getToken();
    
    // Reset the mock to verify it's not called again
    mockChromeApi.cookies.get.mockReset();
    
    // Act - get the token again
    const token = await authTokenService.getToken();
    
    // Assert
    expect(mockChromeApi.cookies.get).not.toHaveBeenCalled();
    expect(token).toBe('initialToken');
  });

  test('addChangeListener should add a listener', () => {
    // Act
    authTokenService.addChangeListener(mockChangeListener);
    
    // Trigger a cookie change that will update the token
    const mockCookieChange = {
      cookie: {
        value: 'Bearer=newToken',
        domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
        name: Constants.AUTH_TOKEN_COOKIE_NAME
      },
      removed: false
    };
    cookieChangeHandler(mockCookieChange);
    
    // Assert
    expect(mockChangeListener).toHaveBeenCalledWith('newToken');
  });

  test('removeChangeListener should remove a listener', () => {
    // Arrange
    authTokenService.addChangeListener(mockChangeListener);
    
    // Act
    authTokenService.removeChangeListener(mockChangeListener);
    
    // Trigger a cookie change
    const mockCookieChange = {
      cookie: {
        value: 'Bearer=updatedToken',
        domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
        name: Constants.AUTH_TOKEN_COOKIE_NAME
      },
      removed: false
    };
    cookieChangeHandler(mockCookieChange);
    
    // Assert - the listener should not be called
    expect(mockChangeListener).not.toHaveBeenCalled();
  });

  test('handleCookieChange should ignore non-matching cookies', async () => {
    // Arrange
    authTokenService.addChangeListener(mockChangeListener);
    
    // Act - trigger cookie change with wrong domain
    const wrongDomainChange = {
      cookie: {
        value: 'Bearer=token',
        domain: 'wrong-domain.com',
        name: Constants.AUTH_TOKEN_COOKIE_NAME
      },
      removed: false
    };
    await cookieChangeHandler(wrongDomainChange);
    
    // Act - trigger cookie change with wrong name
    const wrongNameChange = {
      cookie: {
        value: 'Bearer=token',
        domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
        name: 'wrong-cookie-name'
      },
      removed: false
    };
    await cookieChangeHandler(wrongNameChange);
    
    // Assert
    expect(mockChangeListener).not.toHaveBeenCalled();
  });

  test('parseToken should handle different token formats', async () => {
    // Use a cookie value that will reach the internal parseToken method
    const mockCookie = {
      value: 'Bearer=testToken&param=value',
      domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    };
    mockChromeApi.cookies.get.mockResolvedValue(mockCookie);

    // Act
    const token = await authTokenService.getToken();

    // Assert - should strip off the Bearer= prefix and any query params
    expect(token).toBe('testToken');
  });

  test('parseToken should handle URL encoded tokens', async () => {
    // Setup a cookie with URL encoded Bearer prefix
    const mockCookie = {
      value: 'Bearer%3DencodedToken',
      domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    };
    mockChromeApi.cookies.get.mockResolvedValue(mockCookie);

    // Act 
    const token = await authTokenService.getToken();

    // Assert
    expect(token).toBe('encodedToken');
  });

  test('handleCookieChange should set token to null when cookie is removed', async () => {
    // Arrange - first set a token
    const mockCookie = {
      value: 'Bearer=initialToken',
      domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    };
    mockChromeApi.cookies.get.mockResolvedValue(mockCookie);
    await authTokenService.getToken();
    
    // Add a listener
    authTokenService.addChangeListener(mockChangeListener);
    
    // Act - simulate cookie removal
    const cookieRemovalChange = {
      cookie: {
        domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
        name: Constants.AUTH_TOKEN_COOKIE_NAME
      },
      removed: true
    };
    await cookieChangeHandler(cookieRemovalChange);
    
    // Assert
    expect(mockChangeListener).toHaveBeenCalledWith(null);
  });

  test('parseToken should return null for empty cookie value', async () => {
    // Setup an empty cookie value
    const mockCookie = {
      value: '',
      domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    };
    mockChromeApi.cookies.get.mockResolvedValue(mockCookie);

    // Act
    const token = await authTokenService.getToken();

    // Assert
    expect(token).toBeNull();
  });

  test('handleAuthTokenCookieUpdate should not notify if token has not changed', async () => {
    // Arrange - set initial token
    const mockCookie = {
      value: 'Bearer=sameToken',
      domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
      name: Constants.AUTH_TOKEN_COOKIE_NAME
    };
    mockChromeApi.cookies.get.mockResolvedValue(mockCookie);
    await authTokenService.getToken();
    
    // Add listener
    authTokenService.addChangeListener(mockChangeListener);
    
    // Act - update with the same token
    const sameTokenChange = {
      cookie: {
        value: 'Bearer=sameToken',
        domain: Constants.AUTH_TOKEN_COOKIE_DOMAIN,
        name: Constants.AUTH_TOKEN_COOKIE_NAME
      },
      removed: false
    };
    await cookieChangeHandler(sameTokenChange);
    
    // Assert - listener should not be called since token hasn't changed
    expect(mockChangeListener).not.toHaveBeenCalled();
  });

  test('getToken should handle null cookie response', async () => {
    // Arrange
    mockChromeApi.cookies.get.mockResolvedValue(null);

    // Act
    const token = await authTokenService.getToken();

    // Assert
    expect(token).toBeNull();
  });
});
