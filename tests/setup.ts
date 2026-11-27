// Global Vitest setup. DOM-only matchers are registered lazily so the default
// Node environment stays free of jsdom side effects (plan 03 §1).
export {};

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    await import('@testing-library/jest-dom/vitest');
}
