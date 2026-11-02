/** Marca do site: mesmo desenho do favicon (src/app/icon.svg). Galpão com palete. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />
      <path d="M14 27 32 16l18 11v21H14z" fill="#0B0B0B" />
      <path d="M21 48V33h22v15" fill="none" stroke="#FBBF24" strokeWidth="3" />
      <path d="M21 40.5h22" stroke="#FBBF24" strokeWidth="3" />
    </svg>
  );
}
