import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

// Ensure navigator.userAgent exists before react-dom reads it
if (!globalThis.navigator) {
  Object.defineProperty(globalThis, 'navigator', {
    value: {},
    writable: true,
    configurable: true,
  });
}
if (!globalThis.navigator.userAgent) {
  Object.defineProperty(globalThis.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    writable: true,
    configurable: true,
  });
}

// Mock navigator.clipboard
Object.defineProperty(globalThis.navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
  writable: true,
  configurable: true,
});

// Mock getBoundingClientRect on HTMLDivElement
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  writable: true,
  configurable: true,
  value: vi.fn(() => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  })),
});

// Helper to fire a wheel event with preventDefault allowed
(globalThis as any).fireWheelEvent = (element: Element, init?: WheelEventInit) => {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
};
