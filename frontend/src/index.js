import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Comprehensive ResizeObserver error suppression
// This prevents the "ResizeObserver loop completed with undelivered notifications" errors
// that are common with Radix UI components used by shadcn/ui

// 1. Replace ResizeObserver with error-safe version
if (window.ResizeObserver) {
  const OriginalResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        // Wrap callback in requestAnimationFrame to prevent loops
        window.requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (err) {
            if (err.message?.includes('ResizeObserver loop completed with undelivered notifications') ||
                err.message?.includes('ResizeObserver loop limit exceeded')) {
              // Suppress these specific errors
              return;
            }
            // Re-throw other errors
            throw err;
          }
        });
      });
    }
  };
}

// 2. Console error suppression
const originalConsoleError = window.console.error;
window.console.error = (...args) => {
  const message = args[0]?.toString?.() || '';
  if (message.includes('ResizeObserver loop completed with undelivered notifications') ||
      message.includes('ResizeObserver loop limit exceeded') ||
      message.includes('ResizeObserver')) {
    return; // Suppress ResizeObserver errors
  }
  originalConsoleError.apply(console, args);
};

// 3. Global error handlers
const THIRD_PARTY_ORIGINS = ["chrome-extension://"];

window.addEventListener('error', (e) => {
  const src = e.filename || "";
  if (THIRD_PARTY_ORIGINS.some((o) => src.includes(o))) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return true;
  }
  if (e.message?.includes('ResizeObserver loop completed with undelivered notifications') ||
      e.message?.includes('ResizeObserver loop limit exceeded')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  const stack = e.reason?.stack || e.reason?.message || "";
  if (THIRD_PARTY_ORIGINS.some((o) => stack.includes(o))) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }
  if (e.reason?.message?.includes('ResizeObserver loop completed with undelivered notifications') ||
      e.reason?.message?.includes('ResizeObserver loop limit exceeded')) {
    e.preventDefault();
    return false;
  }
}, true);

// 4. Override window.onerror for additional safety
const originalOnError = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  const src = source || "";
  if (THIRD_PARTY_ORIGINS.some((o) => src.includes(o))) {
    return true;
  }
  if (typeof message === 'string' &&
      (message.includes('ResizeObserver loop completed with undelivered notifications') ||
       message.includes('ResizeObserver loop limit exceeded'))) {
    return true; // Prevent default error handling
  }
  if (originalOnError) {
    return originalOnError.call(window, message, source, lineno, colno, error);
  }
  return false;
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
