export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16"
    >
      <svg viewBox="0 0 84 88" className="h-14 w-14 animate-pulse" aria-hidden="true">
        <path
          d="M4.0,88.0 A4.0,4.0 0 0 1 0,84.0 L0,42.0 A42.0,42.0 0 0 1 84.0,42.0 L84.0,84.0 A4.0,4.0 0 0 1 80.0,88.0 Z"
          fill="#1D3E26"
        />
        <path
          d="M42.000,20.000 L47.613,37.274 L65.776,37.275 L51.083,47.951 L56.695,65.225 L42.000,54.550 L27.305,65.225 L32.917,47.951 L18.224,37.275 L36.387,37.274 Z"
          fill="#E9C260"
        />
      </svg>
      <p className="text-sm font-medium text-stone-400">Loading…</p>
      <span className="sr-only">Loading page content</span>
    </div>
  );
}
