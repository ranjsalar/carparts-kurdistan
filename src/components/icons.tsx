/*
  Custom icon set — 24px grid, 1.8 stroke, round caps. Drawn for this
  product's flow (request → quote → pay → track → deliver) rather than
  pulled from a generic library.
*/

type IconProps = { size?: number; className?: string };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

/** Request — clipboard with part sketch */
export function IconRequest({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5 V3 a1 1 0 0 1 1-1 h4 a1 1 0 0 1 1 1 v1.5" />
      <path d="M9 11 h6 M9 15 h4" />
    </svg>
  );
}

/** Quote — price tag */
export function IconQuote({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 12.5 12 4 h6.5 a1 1 0 0 1 1 1 V11.5 L11 20 a1.4 1.4 0 0 1-2 0 l-5.5-5.5 a1.4 1.4 0 0 1 0-2 Z" />
      <circle cx="15.5" cy="8.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Pay — banknote with check */
export function IconPay({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <path d="M9.5 12 l1.8 1.8 L14.6 10.5" />
      <path d="M5.5 9 h.01 M18.5 15 h.01" />
    </svg>
  );
}

/** Track / shipped — delivery truck */
export function IconTruck({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.5 6.5 h11 v9 h-11 z" />
      <path d="M13.5 9.5 h3.6 l3.4 3.4 v2.6 h-7" />
      <circle cx="6.5" cy="17.8" r="1.9" />
      <circle cx="16.8" cy="17.8" r="1.9" />
    </svg>
  );
}

/** Sourcing — parts box */
export function IconBox({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3 20.5 7.5 V16.5 L12 21 3.5 16.5 V7.5 Z" />
      <path d="M3.5 7.5 12 12 l8.5-4.5 M12 12 V21" />
    </svg>
  );
}

/** Arrived — border checkpoint flag */
export function IconFlag({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5.5 21 V4" />
      <path d="M5.5 4.5 h12.5 l-2.6 3.75 2.6 3.75 H5.5" />
    </svg>
  );
}

/** Ready — package with check */
export function IconReady({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3 20.5 7.5 V16.5 L12 21 3.5 16.5 V7.5 Z" />
      <path d="M8.75 12.25 11 14.5 15.5 10" />
    </svg>
  );
}

/** Completed — checkered flag */
export function IconFinish({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5.5 21 V3.5" />
      <path d="M5.5 4 h13 v9 h-13 Z" />
      <g fill="currentColor" stroke="none">
        <rect x="8.75" y="4.6" width="3.25" height="2.8" />
        <rect x="15.25" y="4.6" width="2.8" height="2.8" />
        <rect x="6" y="7.4" width="2.75" height="2.8" />
        <rect x="12" y="7.4" width="3.25" height="2.8" />
        <rect x="8.75" y="10.2" width="3.25" height="2.3" />
        <rect x="15.25" y="10.2" width="2.8" height="2.3" />
      </g>
    </svg>
  );
}

/** Notification bell */
export function IconBell({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M18 8.5 A6 6 0 0 0 6 8.5 c0 6.5-2.5 8-2.5 8 h17 s-2.5-1.5-2.5-8" />
      <path d="M13.7 20.5 a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

/* ── Category / part family icons ── */

/** Engine block */
export function IconEngine({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 8 V5.5 M10.5 8 V5.5 M14 8 V5.5 M5 8 h11 v3 l2.5 2.5 V19 H8 l-3-3 H2.5 v-5 H5 Z" />
      <path d="M18.5 13.5 h3 M20 11.5 v4" />
    </svg>
  );
}

/** Bumper / exterior body */
export function IconBumper({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.5 10 c0-1.1.9-2 2-2 h15 c1.1 0 2 .9 2 2 v4 c0 1.1-.9 2-2 2 h-15 c-1.1 0-2-.9-2-2 Z" />
      <circle cx="7" cy="13" r="1.2" />
      <circle cx="17" cy="13" r="1.2" />
      <path d="M10.5 8 V6 M13.5 8 V6" />
    </svg>
  );
}

/** Seat / interior */
export function IconSeat({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7.5 3.5 c-1.5 0-2.3 1.2-2 2.7 l1.6 8.3 c.2 1 1 1.7 2 1.7 h6.4" />
      <path d="M8.5 16 l-1 3.5 h9 l1.5-3.5 c.4-1-.3-2-1.4-2 H9.5" />
      <path d="M5 20.5 h13" />
    </svg>
  );
}

/** Headlight */
export function IconLamp({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 6.5 a5.5 5.5 0 0 1 0 11 H6.5 a5.5 5.5 0 0 1 0-11 Z" />
      <path d="M14.5 8.5 h6 M14.5 12 h6 M14.5 15.5 h6" />
    </svg>
  );
}

/** Side mirror */
export function IconMirror({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.5 5.5 h9 a3.5 3.5 0 0 1 3.5 3.5 v3 a3.5 3.5 0 0 1-3.5 3.5 h-6 a3.5 3.5 0 0 1-3.5-3.5 Z" />
      <path d="M17 10 h2.5 a2 2 0 0 1 2 2 v6.5 M8.5 15.5 V20" />
    </svg>
  );
}

/** Door */
export function IconDoor({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 4.5 h9 a1.5 1.5 0 0 1 1.5 1.5 v12 a1.5 1.5 0 0 1-1.5 1.5 H6 a1.5 1.5 0 0 1-1.5-1.5 V9 Z" />
      <path d="M4.5 9.5 H19.5 M8 13 h3.5" />
    </svg>
  );
}

/** Dashboard gauge */
export function IconGauge({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 17.5 a9 9 0 1 1 16 0" />
      <path d="M12 14.5 l3.6-4.6" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** AC / cooling snowflake */
export function IconSnowflake({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3 V21 M4.2 7.5 l15.6 9 M4.2 16.5 l15.6-9" />
      <path d="M12 3 l-2 2.2 M12 3 l2 2.2 M12 21 l-2-2.2 M12 21 l2-2.2" />
    </svg>
  );
}

/** Filter funnel */
export function IconFilter({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 5 h16 l-6 7.5 V19 l-4 2 v-8.5 Z" />
    </svg>
  );
}

/** Pump / fluid drop */
export function IconDrop({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3.5 c3.5 4.5 6 7.6 6 10.8 A6 6 0 0 1 6 14.3 C6 11.1 8.5 8 12 3.5 Z" />
      <path d="M9.5 14.5 a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  );
}

/** Ignition spark */
export function IconSpark({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13.5 2.5 5 13.5 h5 L10.5 21.5 19 10.5 h-5 Z" />
    </svg>
  );
}

/** Generic part — hex nut (fallback) */
export function IconNut({ size = 24, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 2.75 20 7.4 V16.6 L12 21.25 4 16.6 V7.4 Z" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}
