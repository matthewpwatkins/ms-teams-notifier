import { Logger } from '../common/logger';

/**
 * Event types for the ChromePortManager
 */
export enum PortEventType {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  MESSAGE = 'message',
  RECONNECTING = 'reconnecting',
  RECONNECTION_FAILED = 'reconnection_failed',
}

/**
 * Message handler callback type
 */
export type MessageHandler = (message: any) => void;

/**
 * Event handler callback type
 */
export type PortEventHandler = (data?: any) => void;

/**
 * Options for ChromePortManager
 */
export interface ChromePortManagerOptions {
  /** Name of the port to connect to */
  portName: string;
  /** Whether to auto-reconnect on disconnection */
  autoReconnect?: boolean;
  /** Maximum number of reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay for reconnection in milliseconds (default: 1000) */
  reconnectBaseDelayMs?: number;
  /** Maximum delay for reconnection in milliseconds (default: 120000 - 2 minutes) */
  maxReconnectDelayMs?: number;
  /** Whether to log debug messages (default: false) */
  debug?: boolean;
}

/**
 * Generic Chrome port connection manager
 * 
 * Handles connecting to a Chrome runtime port and automatically reconnecting
 * in case of disconnection. Manages message passing and event handling.
 */
export class ChromePortManager {
  private portName: string;
  private port: chrome.runtime.Port | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempt: number = 0;
  private reconnectTimeout: number | null = null;
  private autoReconnect: boolean = true;
  private maxReconnectAttempts: number = 10;
  private reconnectBaseDelayMs: number = 1000;
  private maxReconnectDelayMs: number = 2 * 60 * 1000; // 2 minutes
  private messageListeners: Map<string, Set<MessageHandler>> = new Map();
  private eventHandlers: Map<PortEventType, Set<PortEventHandler>> = new Map();
  private debug: boolean = false;
  
  /**
   * Creates a new ChromePortManager
   * @param options - Configuration options
   */
  constructor(options: ChromePortManagerOptions) {
    this.portName = options.portName;
    
    if (options.autoReconnect !== undefined) {
      this.autoReconnect = options.autoReconnect;
    }
    
    if (options.maxReconnectAttempts !== undefined) {
      this.maxReconnectAttempts = options.maxReconnectAttempts;
    }
    
    if (options.reconnectBaseDelayMs !== undefined) {
      this.reconnectBaseDelayMs = options.reconnectBaseDelayMs;
    }
    
    if (options.maxReconnectDelayMs !== undefined) {
      this.maxReconnectDelayMs = options.maxReconnectDelayMs;
    }
    
    if (options.debug !== undefined) {
      this.debug = options.debug;
    }
    
    // Initialize event handler collections
    Object.values(PortEventType).forEach(event => {
      this.eventHandlers.set(event as PortEventType, new Set());
    });
  }
  
  /**
   * Connect to the Chrome runtime port
   * @returns A promise that resolves when connected or rejects on error
   */
  public connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.port) {
        this.logDebug('Already connected, ignoring connect request');
        resolve();
        return;
      }
      
      if (this.isConnecting) {
        this.logDebug('Connection attempt already in progress');
        reject(new Error('Connection attempt in progress'));
        return;
      }
      
      this.isConnecting = true;
      
      try {
        this.logDebug(`Connecting to port: ${this.portName}`);
        this.port = chrome.runtime.connect({ name: this.portName });
        
        // Set up message listener
        this.port.onMessage.addListener((message) => {
          this.handleIncomingMessage(message);
        });
        
        // Handle disconnection
        this.port.onDisconnect.addListener(() => {
          this.handleDisconnect();
        });
        
        this.isConnecting = false;
        this.reconnectAttempt = 0;
        this.logDebug('Connected successfully');
        this.emitEvent(PortEventType.CONNECTED);
        resolve();
      } catch (error) {
        this.isConnecting = false;
        this.logDebug('Connection failed: ' + error);
        
        if (this.autoReconnect) {
          this.scheduleReconnect();
        }
        
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the Chrome runtime port
   */
  public disconnect(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.port) {
      try {
        this.port.disconnect();
      } catch (error) {
        this.logDebug('Error disconnecting port: ' + error);
      }
      this.port = null;
    }
    
    this.isConnecting = false;
    this.reconnectAttempt = 0;
  }
  
  /**
   * Send a message through the port
   * @param message - The message to send
   * @returns A boolean indicating success
   */
  public sendMessage(message: any): boolean {
    if (!this.port) {
      this.logDebug('Cannot send message - not connected');
      return false;
    }
    
    try {
      this.logDebug('Sending message: ' + JSON.stringify(message));
      this.port.postMessage(message);
      return true;
    } catch (error) {
      this.logDebug('Error sending message: ' + error);
      return false;
    }
  }
  
  /**
   * Add a listener for a specific message type
   * @param messageType - The type of message to listen for
   * @param handler - The handler function to call when message is received
   */
  public addMessageListener(messageType: string, handler: MessageHandler): void {
    if (!this.messageListeners.has(messageType)) {
      this.messageListeners.set(messageType, new Set());
    }
    
    this.messageListeners.get(messageType)!.add(handler);
  }
  
  /**
   * Remove a specific message listener
   * @param messageType - The type of message
   * @param handler - The handler function to remove
   */
  public removeMessageListener(messageType: string, handler: MessageHandler): void {
    const listeners = this.messageListeners.get(messageType);
    if (listeners) {
      listeners.delete(handler);
    }
  }
  
  /**
   * Add an event handler for port events (connected, disconnected, etc.)
   * @param eventType - The type of event
   * @param handler - The handler function to call when event occurs
   */
  public on(eventType: PortEventType, handler: PortEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.add(handler);
    }
  }
  
  /**
   * Remove an event handler
   * @param eventType - The type of event
   * @param handler - The handler function to remove
   */
  public off(eventType: PortEventType, handler: PortEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  /**
   * Check if the port is currently connected
   * @returns True if connected, false otherwise
   */
  public isConnected(): boolean {
    return !!this.port;
  }
  
  /**
   * Dispose of this manager, disconnecting and cleaning up all resources
   */
  public dispose(): void {
    this.disconnect();
    this.messageListeners.clear();
    
    for (const handlers of this.eventHandlers.values()) {
      handlers.clear();
    }
  }
  
  /**
   * Handle incoming messages from the port
   * @private
   */
  private handleIncomingMessage(message: any): void {
    this.logDebug('Received message: ' + JSON.stringify(message));
    
    // Emit a general message event
    this.emitEvent(PortEventType.MESSAGE, message);
    
    // If the message has a type field, emit to specific listeners
    if (message && typeof message === 'object' && message.type) {
      const listeners = this.messageListeners.get(message.type);
      if (listeners) {
        listeners.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            this.logDebug('Error in message handler: ' + error);
          }
        });
      }
    }
  }
  
  /**
   * Handle port disconnection
   * @private
   */
  private handleDisconnect(): void {
    this.port = null;
    this.emitEvent(PortEventType.DISCONNECTED);
    this.logDebug('Port disconnected');
    
    // Auto-reconnect if enabled
    if (this.autoReconnect) {
      this.scheduleReconnect();
    }
  }
  
  /**
   * Schedule a reconnection attempt with exponential backoff
   * @private
   */
  private scheduleReconnect(): void {
    // Increment the reconnect attempt counter
    this.reconnectAttempt++;
    
    // Clear any existing timeout
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // If we've exceeded the maximum number of reconnect attempts, give up
    if (this.reconnectAttempt > this.maxReconnectAttempts) {
      this.logDebug(`Failed to reconnect after ${this.maxReconnectAttempts} attempts. Giving up.`);
      this.emitEvent(PortEventType.RECONNECTION_FAILED);
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectBaseDelayMs * Math.pow(2, this.reconnectAttempt - 1), 
      this.maxReconnectDelayMs
    );
    
    this.logDebug(`Scheduling reconnect attempt ${this.reconnectAttempt} in ${delay}ms`);
    this.emitEvent(PortEventType.RECONNECTING, { attempt: this.reconnectAttempt, delay });
    
    // Schedule reconnection attempt
    this.reconnectTimeout = window.setTimeout(() => {
      this.logDebug(`Attempting reconnect #${this.reconnectAttempt}`);
      
      this.connect().catch(() => {
        // If reconnection fails, the connect() method will schedule another reconnect
        this.logDebug('Reconnection attempt failed');
      });
    }, delay);
  }
  
  /**
   * Emit an event to registered handlers
   * @private
   */
  private emitEvent(eventType: PortEventType, data?: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logDebug(`Error in ${eventType} event handler: ` + error);
        }
      });
    }
  }
  
  /**
   * Log debug messages if debug is enabled
   * @private
   */
  private logDebug(message: string): void {
    if (this.debug) {
      Logger.debug(`[ChromePortManager:${this.portName}] ${message}`);
    }
  }
}
