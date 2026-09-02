import type { ReactNode } from "react";

type IconProps = {
  className?: string;
};

function IconShell({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function BrandMark({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="32" height="32" rx="12" fill="currentColor" opacity="0.12" />
      <path
        d="M12.5 23.5c0-5.2 4.2-9.5 9.5-9.5 1.8 0 3.5.4 5 1.3-1.3 5.6-5.5 9.9-10.9 11.4-2.6-.8-3.6-2.4-3.6-3.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M20.5 13.8c0 4.3 1.2 7.5 3.9 10.2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="20" cy="20" r="15" stroke="currentColor" strokeOpacity="0.16" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M4.5 11.8 12 5l7.5 6.8" />
      <path d="M6.5 10.8V20h11V10.8" />
      <path d="M9.5 20v-5h5v5" />
    </IconShell>
  );
}

export function RecipesIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M5.5 6.5h9.2a3 3 0 0 1 3 3V20H8.5a3 3 0 0 1-3-3z" />
      <path d="M8.2 8.8h5.8" />
      <path d="M8.2 12h6.6" />
      <path d="M8.2 15.2h4.6" />
      <path d="M15.8 6.8v10.7" />
    </IconShell>
  );
}

export function OrdersIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M6 7.5h12" />
      <path d="M6 12h12" />
      <path d="M6 16.5h8" />
      <path d="M5 5.8h14v12.4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
    </IconShell>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M5 8.5h14" />
      <path d="M5 12h14" />
      <path d="M5 15.5h14" />
      <path d="M7.5 6.4a4.5 4.5 0 0 1 9 0" />
      <path d="M7.5 17.6a4.5 4.5 0 0 0 9 0" />
    </IconShell>
  );
}

export function MoreIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="12" r="1" fill="currentColor" />
    </IconShell>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </IconShell>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <rect x="4.5" y="6.5" width="15" height="13" rx="2" />
      <path d="M8 4.5v4M16 4.5v4M4.5 10h15" />
      <path d="M8.5 14h.1M12 14h.1M15.5 14h.1M8.5 17h.1M12 17h.1" />
    </IconShell>
  );
}

export function MinusIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M5.5 12h13" />
    </IconShell>
  );
}

export function TimerIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9v4l2.5 1.5M9.5 3.5h5M12 3.5v2.2" />
    </IconShell>
  );
}

export function RotateCcwIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M5 8.5V4.8h3.7" />
      <path d="M5.4 5.3A7 7 0 1 1 5 14" />
    </IconShell>
  );
}

export function PauseIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M8 5.5v13M16 5.5v13" />
    </IconShell>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="m8 5.5 9 6.5-9 6.5z" />
    </IconShell>
  );
}

export function SquareIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </IconShell>
  );
}

export function NotificationsIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M9 18.5a3 3 0 0 0 6 0" />
      <path d="M6.5 16.5h11l-1.2-1.4c-.9-1-.8-2.4-.8-3.7V10a3.5 3.5 0 1 0-7 0v1.4c0 1.3.1 2.7-.8 3.7z" />
    </IconShell>
  );
}

export function StatisticsIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M5.5 19V12.5h3V19zM10.5 19V7h3v12zM15.5 19V4.5h3V19z" />
      <path d="M4.5 19.5h15" />
    </IconShell>
  );
}

export function ShoppingListIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M6 5.5h12v13H6z" />
      <path d="M9 9h6M9 12h6M9 15h3" />
      <path d="m15.5 15 .9.9 1.6-1.8" />
    </IconShell>
  );
}

export function FamilyIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <circle cx="9" cy="9" r="2.4" />
      <circle cx="15.8" cy="10.2" r="1.9" />
      <path d="M5.5 19c.5-2.8 2.7-4.5 5.4-4.5s4.9 1.7 5.4 4.5" />
      <path d="M12.8 19c.3-1.8 1.5-3 3.1-3.3 1.8-.3 3.2.5 4 2.4" />
    </IconShell>
  );
}

export function BookmarkIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M7 5.5h10a1 1 0 0 1 1 1v12l-6-3.6-6 3.6v-12a1 1 0 0 1 1-1Z" />
    </IconShell>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" />
      <path d="M5.5 6.2v4h4" />
      <path d="M12 8.5V12l2.5 1.6" />
    </IconShell>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="m12 4.8 1 .2.8 1.8 1.7.7 1.9-.5.7.8-.7 1.8.7 1.7 1.7 1 .1 1.1-1.7 1-.7 1.7.5 1.9-.8.7-1.8-.7-1.7.7-1 1.7-1.1.1-1-1.7-1.7-.7-1.8.5-.8-.7.5-1.9-.7-1.7-1.7-1 .1-1.1 1.7-1 .7-1.7-.7-1.8.8-.8 1.8.5 1.7-.7.9-1.8Z" />
      <circle cx="12" cy="12" r="2.5" />
    </IconShell>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M5 12h13" />
      <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
    </IconShell>
  );
}

export function CopyIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <rect x="8" y="8" width="10" height="10" rx="2" />
      <path d="M6 16V6a1 1 0 0 1 1-1h8" />
    </IconShell>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <circle cx="18" cy="5.5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="18.5" r="2" />
      <path d="m7.8 11 8.4-4.4" />
      <path d="m7.8 13 8.4 4.4" />
    </IconShell>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
    </IconShell>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <circle cx="11" cy="11" r="5.2" />
      <path d="m15 15 3.5 3.5" />
    </IconShell>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M10 5.5 4.5 12 10 18.5" />
      <path d="M5 12h14" />
    </IconShell>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M5.8 7h12.4" />
      <path d="M9 7V5.7a1.2 1.2 0 0 1 1.2-1.2h3.6A1.2 1.2 0 0 1 15 5.7V7" />
      <path d="M8.5 7.5 9 18h6l.5-10.5" />
      <path d="M10.2 10.3v4.6M13.8 10.3v4.6" />
    </IconShell>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <IconShell className={className}>
      <path d="M12 4.5v10" />
      <path d="m8.5 11 3.5 3.5 3.5-3.5" />
      <path d="M5.5 18.5h13" />
    </IconShell>
  );
}
