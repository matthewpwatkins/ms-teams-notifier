import { DomWatcher, DomChangeCallback, MutationObserverFactory } from '../util/dom-watcher';

describe('DomWatcher', () => {
  // Mock dependencies
  let mockMutationObserver: jest.Mocked<MutationObserver>;
  let mockMutationCallback: MutationCallback;
  let mockObserverFactory: jest.MockedFunction<MutationObserverFactory>;
  let mockTargetNode: Node;
  
  // Helpers for tests
  let capturedMutationCallback: MutationCallback;
  
  beforeEach(() => {
    // Create mock MutationObserver
    mockMutationObserver = {
      observe: jest.fn(),
      disconnect: jest.fn(),
      takeRecords: jest.fn()
    } as unknown as jest.Mocked<MutationObserver>;
    
    // Create observer factory that captures the callback and returns our mock
    mockObserverFactory = jest.fn((callback: MutationCallback) => {
      capturedMutationCallback = callback;
      return mockMutationObserver;
    });
    
    // Create a mock target node
    mockTargetNode = {} as Node;
  });
  
  describe('subscribe', () => {
    it('should create the mutation observer and start watching on first subscriber', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      const callback = jest.fn();
      
      // Act
      domWatcher.subscribe(callback);
      
      // Assert
      expect(mockObserverFactory).toHaveBeenCalledTimes(1);
      expect(mockMutationObserver.observe).toHaveBeenCalledTimes(1);
      expect(mockMutationObserver.observe).toHaveBeenCalledWith(mockTargetNode, expect.objectContaining({
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      }));
    });
    
    it('should not create another observer when adding second subscriber', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      // Act
      domWatcher.subscribe(callback1);
      domWatcher.subscribe(callback2);
      
      // Assert
      expect(mockObserverFactory).toHaveBeenCalledTimes(1);
      expect(mockMutationObserver.observe).toHaveBeenCalledTimes(1);
    });
    
    it('should return an unsubscribe function', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      const callback = jest.fn();
      
      // Act
      const unsubscribe = domWatcher.subscribe(callback);
      unsubscribe();
      
      // Assert - should have disconnected since this was the only subscriber
      expect(mockMutationObserver.disconnect).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('unsubscribe', () => {
    it('should stop watching when last subscriber is removed', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      const callback = jest.fn();
      domWatcher.subscribe(callback);
      
      // Act
      domWatcher.unsubscribe(callback);
      
      // Assert
      expect(mockMutationObserver.disconnect).toHaveBeenCalledTimes(1);
    });
    
    it('should not stop watching if subscribers remain', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      domWatcher.subscribe(callback1);
      domWatcher.subscribe(callback2);
      
      // Act
      domWatcher.unsubscribe(callback1);
      
      // Assert
      expect(mockMutationObserver.disconnect).not.toHaveBeenCalled();
    });
    
    it('should do nothing when unsubscribing a non-existent callback', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      domWatcher.subscribe(callback1);
      
      // Act - unsubscribe a callback that was never subscribed
      domWatcher.unsubscribe(callback2);
      
      // Assert - should still have one subscriber, no disconnect
      expect(mockMutationObserver.disconnect).not.toHaveBeenCalled();
    });
  });
  
  describe('notification handling', () => {
    it('should notify all subscribers when a mutation occurs', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      domWatcher.subscribe(callback1);
      domWatcher.subscribe(callback2);
      
      // Act - simulate a mutation
      capturedMutationCallback([], mockMutationObserver);
      
      // Assert
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
    
    it('should not call subscribers that unsubscribed', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      domWatcher.subscribe(callback1);
      const unsubscribe2 = domWatcher.subscribe(callback2);
      
      // Act - unsubscribe one callback, then simulate a mutation
      unsubscribe2();
      capturedMutationCallback([], mockMutationObserver);
      
      // Assert
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
    });
    
    it('should handle a mutation that occurs during notification', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      
      // Track how many times capturedMutationCallback is called to prevent infinite recursion
      let callCount = 0;
      
      const callback1 = jest.fn(() => {
        // Simulate another mutation happening during the callback, but only once
        if (callCount === 0) {
          callCount++;
          capturedMutationCallback([], mockMutationObserver);
        }
      });
      
      const callback2 = jest.fn();
      domWatcher.subscribe(callback1);
      domWatcher.subscribe(callback2);
      
      // Act - simulate a mutation
      callCount = 0; // Reset before starting the test
      capturedMutationCallback([], mockMutationObserver);
      
      // Assert
      expect(callback1).toHaveBeenCalledTimes(2); // Once for original call, once for nested call
      expect(callback2).toHaveBeenCalledTimes(2); // Same
    });
    
    it('should not call subscribers that unsubscribe during notification', () => {
      // Arrange
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode);
      let unsubscribe2: () => void;
      
      const callback1 = jest.fn(() => {
        // First callback unsubscribes the second
        unsubscribe2();
      });
      
      const callback2 = jest.fn();
      
      // Subscribe both callbacks
      domWatcher.subscribe(callback1);
      unsubscribe2 = domWatcher.subscribe(callback2);
      
      // Act - simulate a mutation
      capturedMutationCallback([], mockMutationObserver);
      
      // Assert
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled(); // Should not be called since it was unsubscribed
    });
  });
  
  describe('constructor defaults', () => {
    it('should use provided options', () => {
      // Arrange
      const customOptions = {
        childList: false,
        subtree: false
      };
      
      // Act
      const domWatcher = new DomWatcher(mockObserverFactory, mockTargetNode, customOptions);
      domWatcher.subscribe(jest.fn());
      
      // Assert
      expect(mockMutationObserver.observe).toHaveBeenCalledWith(mockTargetNode, customOptions);
    });
    
    it('should create a real MutationObserver when factory not provided', () => {
      // Mock the global MutationObserver
      const originalMutationObserver = global.MutationObserver;
      global.MutationObserver = jest.fn(() => mockMutationObserver) as unknown as typeof MutationObserver;
      
      try {
        // Act
        const domWatcher = new DomWatcher(undefined, mockTargetNode);
        domWatcher.subscribe(jest.fn());
        
        // Assert
        expect(global.MutationObserver).toHaveBeenCalled();
        expect(mockMutationObserver.observe).toHaveBeenCalled();
      } finally {
        // Restore the original
        global.MutationObserver = originalMutationObserver;
      }
    });
  });
});
