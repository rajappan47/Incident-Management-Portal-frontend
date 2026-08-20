// src/test/setup.js
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// 1. Mock ResizeObserver for Ant Design components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 2. Mock matchMedia for Ant Design responsiveness
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 🆕 NEW — Mock scrollIntoView, required by Ant Design's virtualized Select dropdown list.
// jsdom does not implement this method at all, so any Select interaction can silently fail
// or throw "scrollIntoView is not a function" without this.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// 🆕 NEW — Mock getComputedStyle to avoid noisy "pseudo-elements not implemented" warnings
// caused by Ant Design components checking computed styles that jsdom doesn't fully support.
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt) => originalGetComputedStyle(elt);

afterEach(() => {
  cleanup();
});