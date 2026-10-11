type IconProps = {
  class?: string
}

const base = 'h-5 w-5'

export function PulseIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12h3.5l2-6 3.5 12 2.5-8 1.5 2H22" />
    </svg>
  )
}

export function HeartPulseIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 12 5.6 5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />
      <path d="M7 12h2l1.5-2.5L13 14l1.5-2.5H17" />
    </svg>
  )
}

export function DropletIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5c3.5 4.5 7 8.1 7 12a7 7 0 1 1-14 0c0-3.9 3.5-7.5 7-12Z" />
    </svg>
  )
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
      <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </svg>
  )
}

export function ChartIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v16.5A1.5 1.5 0 0 0 4.5 21H21" />
      <path d="M7 15.5v-4M12 15.5V8M17 15.5v-6" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function MailIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15.7 15.7 0 0 1-3.3 4.1M6.3 7.3A15.6 15.6 0 0 0 2.5 12S6 18 12 18a9.6 9.6 0 0 0 4.2-.95" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
    </svg>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5 4.5 5.5v5.7c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.5Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function SparklesIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z" />
      <path d="M18.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7ZM5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6Z" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
      <path d="M14.5 6.5 17.5 9.5" />
    </svg>
  )
}

export function ClockIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.75h.01" />
    </svg>
  )
}

export function XIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  )
}

export function FileSpreadsheetIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5Z" />
      <path d="M14 2.5V7.5H19M8 11.5h8M8 15h8M11.5 11.5V18M8 18h8" />
    </svg>
  )
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg
      class={props.class ?? base}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.5M12 17.25h.01" />
    </svg>
  )
}
