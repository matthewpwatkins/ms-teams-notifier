/**
 * Callback type for DOM change notifications
 */
export type DomChangeCallback = () => void;

/**
 * Factory type for creating MutationObserver instances
 */
export type MutationObserverFactory = (callback: MutationCallback) => MutationObserver;

/**
 * Watches for DOM changes and notifies subscribers sequentially
 */
export class DomWatcher {
  private readonly subscribers: Set<DomChangeCallback> = new Set();
  private mutationObserver: MutationObserver | null = null;
  private isProcessingNotifications: boolean = false;
  private hasPendingNotification: boolean = false;
  private readonly observerFactory: MutationObserverFactory;
  private readonly observerOptions: MutationObserverInit = {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  };
  private readonly targetNode: Node;

  /**
   * Creates a new DomWatcher instance
   * @param observerFactory Factory function to create MutationObserver instances
   * @param targetNode The DOM element to watch for changes, defaults to document.body
   * @param observerOptions MutationObserver options, defaults to watching for all changes
   */
  constructor(
    observerFactory: MutationObserverFactory = (callback) => new MutationObserver(callback),
    targetNode: Node = document.body,
    observerOptions?: MutationObserverInit
  ) {
    this.observerFactory = observerFactory;
    this.targetNode = targetNode;
    if (observerOptions) {
      this.observerOptions = observerOptions;
    }
  }

  /**
   * Subscribes to DOM change notifications
   * @param callback Function to call when DOM changes are detected
   * @returns Function to unsubscribe
   */
  public subscribe(callback: DomChangeCallback): () => void {
    const wasEmpty = this.subscribers.size === 0;
    this.subscribers.add(callback);
    
    if (wasEmpty) {
      this.startWatching();
    }
    
    return () => this.unsubscribe(callback);
  }

  /**
   * Unsubscribes from DOM change notifications
   * @param callback The callback function to remove
   */
  public unsubscribe(callback: DomChangeCallback): void {
    this.subscribers.delete(callback);
    
    if (this.subscribers.size === 0) {
      this.stopWatching();
    }
  }

  // region Private helpers
  /**
   * Starts watching for DOM changes
   */
  private startWatching(): void {
    if (!this.mutationObserver) {
      this.mutationObserver = this.observerFactory(this.handleMutations.bind(this));
    }
    
    this.mutationObserver.observe(this.targetNode, this.observerOptions);
  }

  /**
   * Stops watching for DOM changes
   */
  private stopWatching(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }

  /**
   * Handles mutation events from the observer
   */
  private handleMutations(): void {
    this.queueNotification();
  }

  /**
   * Queues a notification to subscribers, ensuring sequential processing
   */
  private queueNotification(): void {
    if (this.isProcessingNotifications) {
      this.hasPendingNotification = true;
      return;
    }

    this.notifySubscribers();
  }

  /**
   * Notifies all subscribers about DOM changes
   */
  private notifySubscribers(): void {
    this.isProcessingNotifications = true;
    this.hasPendingNotification = false;

    try {
      // Create a copy of subscribers to avoid issues if a subscriber unsubscribes during notification
      const currentSubscribers = [...this.subscribers];
      
      for (const subscriber of currentSubscribers) {
        if (this.subscribers.has(subscriber)) {
          subscriber();
        }
      }
    } finally {
      this.isProcessingNotifications = false;
      
      // If a notification came in while we were processing, handle it now
      if (this.hasPendingNotification) {
        this.notifySubscribers();
      }
    }
  }
  // endregion
}