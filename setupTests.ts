import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// 简单的 Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
global.fetch = vi.fn();

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen = null;
  onmessage = null;
  onerror = null;
  onclose = null;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  send = vi.fn();
  close = vi.fn();
}
(global as any).WebSocket = MockWebSocket;
