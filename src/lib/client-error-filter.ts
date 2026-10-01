// Client-side suppressor for benign WebAssembly / TensorFlow Lite / MediaPipe runtime info messages
// Emscripten routes its standard error (e.g. INFO: Created TensorFlow Lite XNNPACK delegate)
// to console.error, which triggers false-positive error alerts in AI Studio and Lovable.

if (typeof window !== "undefined") {
  const isBenignInfo = (val: unknown): boolean => {
    if (!val) return false;
    const str = typeof val === "string" ? val : val instanceof Error ? val.message : String(val);
    return (
      str.includes("XNNPACK delegate") ||
      str.includes("TensorFlow Lite") ||
      str.includes("INFO: Created TensorFlow Lite") ||
      str.startsWith("INFO:")
    );
  };

  // Intercept console.error and redirect benign info to console.info
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const hasBenign = args.some(isBenignInfo);
    if (hasBenign) {
      console.info(...args);
      return;
    }
    originalConsoleError(...args);
  };

  // Intercept console.warn as well
  const originalConsoleWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const hasBenign = args.some(isBenignInfo);
    if (hasBenign) {
      console.info(...args);
      return;
    }
    originalConsoleWarn(...args);
  };

  // Capture window.onerror before Lovable or external handlers see it
  window.addEventListener(
    "error",
    (event: ErrorEvent) => {
      if (isBenignInfo(event.message) || isBenignInfo(event.error)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true, // capture phase
  );

  // Capture unhandledrejection
  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      if (isBenignInfo(event.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
}

export {};
