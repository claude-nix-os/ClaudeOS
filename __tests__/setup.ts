/**
 * Test setup file for vitest
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Mock globalThis.claudeOS for tests that need it
beforeEach(() => {
  // Reset any global mocks
});

afterEach(() => {
  vi.restoreAllMocks();
});
