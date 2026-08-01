import type { ReactNode } from "react";

const wrap = (path: ReactNode, size = 18): ReactNode => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {path}
  </svg>
);

export const Icon = {
  grid: (s?: number) =>
    wrap(
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>,
      s,
    ),
  deals: (s?: number) =>
    wrap(
      <>
        <path d="M3 7h18M3 12h18M3 17h12" />
      </>,
      s,
    ),
  market: (s?: number) =>
    wrap(
      <>
        <path d="M3 9h18l-1.5-5H4.5L3 9Z" />
        <path d="M4 9v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
        <path d="M9 13h6" />
      </>,
      s,
    ),
  shield: (s?: number) =>
    wrap(
      <>
        <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>,
      s,
    ),
  payouts: (s?: number) =>
    wrap(
      <>
        <rect x="2" y="5" width="20" height="14" rx="2.5" />
        <path d="M2 10h20" />
        <path d="M6 15h4" />
      </>,
      s,
    ),
  settings: (s?: number) =>
    wrap(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </>,
      s,
    ),
  bell: (s?: number) =>
    wrap(
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>,
      s,
    ),
  user: (s?: number) =>
    wrap(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </>,
      s,
    ),
  users: (s?: number) =>
    wrap(
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2 21c0-3.5 3-5.5 7-5.5" />
        <path d="M16 11a3 3 0 1 0 0-6" />
        <path d="M14 15.5c4 0 7 1.8 7 5.5" />
      </>,
      s,
    ),
  plus: (s?: number) => wrap(<path d="M12 5v14M5 12h14" />, s),
  arrow: (s?: number) => wrap(<path d="M5 12h14M13 6l6 6-6 6" />, s),
  trend: (s?: number) =>
    wrap(
      <>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M21 7h-5M21 7v5" />
      </>,
      s,
    ),
  layers: (s?: number) =>
    wrap(
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="m3 13 9 5 9-5" />
      </>,
      s,
    ),
  bank: (s?: number) =>
    wrap(
      <>
        <path d="M3 9l9-5 9 5M4 9v9M20 9v9M3 21h18M8 9v9M12 9v9M16 9v9" />
      </>,
      s,
    ),
  doc: (s?: number) =>
    wrap(
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </>,
      s,
    ),
  logout: (s?: number) =>
    wrap(
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>,
      s,
    ),
  search: (s?: number) =>
    wrap(
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </>,
      s,
    ),
  globe: (s?: number) =>
    wrap(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
      </>,
      s,
    ),
  pulse: (s?: number) =>
    wrap(<path d="M3 12h4l3 8 4-16 3 8h4" />, s),
};
