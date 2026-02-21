import { cleanup } from '@testing-library/react';
import { afterEach } from 'bun:test';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
