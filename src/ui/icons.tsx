import type { ComponentChildren } from "preact";

const Svg = ({ children, size = 48 }: { children: ComponentChildren; size?: number }) => (
  <svg class="icon" viewBox="0 0 48 48" width={size} height={size} fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {children}
  </svg>
);
type P = { size?: number };

const cone = <path d="M6 19h8l11-9v28l-11-9H6z" fill="currentColor" />;
export const Speaker = ({ size }: P) => <Svg size={size}>{cone}<path d="M32 17q6 7 0 14M37 11q12 13 0 26" /></Svg>;
/** Shown wherever a recording has not been made yet. */
export const Muted = ({ size }: P) => <Svg size={size}>{cone}<path d="M32 19l10 10M42 19l-10 10" /></Svg>;
export const HomeIcon = ({ size }: P) => <Svg size={size}><path d="M6 23 24 8l18 15M11 20v20h26V20" /><path d="M20 40V29h8v11" fill="currentColor" /></Svg>;
export const Gear = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="24" cy="24" r="7" />
    <path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M37.4 10.6l-4.2 4.2M14.8 33.2l-4.2 4.2" stroke-width="6" />
  </Svg>
);
export const Mic = ({ size }: P) => <Svg size={size}><rect x="17" y="5" width="14" height="24" rx="7" fill="currentColor" /><path d="M10 23q0 14 14 14t14-14M24 37v6" /></Svg>;
export const PlayIcon = ({ size }: P) => <Svg size={size}><path d="M14 8v32l26-16z" fill="currentColor" /></Svg>;
export const StopIcon = ({ size }: P) => <Svg size={size}><rect x="11" y="11" width="26" height="26" rx="4" fill="currentColor" /></Svg>;
export const Check = ({ size }: P) => <Svg size={size}><path d="M8 25l11 11 21-24" stroke-width="6" /></Svg>;
export const Back = ({ size }: P) => <Svg size={size}><path d="M28 8 12 24l16 16" stroke-width="6" /></Svg>;
export const Spin = ({ size }: P) => <Svg size={size}><path d="M40 24a16 16 0 1 1-5-11.6M37 4v10H27" stroke-width="5" /></Svg>;
export const Star = ({ size }: P) => <Svg size={size}><path d="M24 5l6 12.5 13.500 2-9.800 9.500 2.400 13.500L24 36l-12.100 6.500 2.400-13.500L4.500 19.500l13.500-2z" fill="currentColor" /></Svg>;
export const LockIcon = ({ size }: P) => <Svg size={size}><rect x="10" y="21" width="28" height="20" rx="4" fill="currentColor" /><path d="M16 21v-6a8 8 0 0 1 16 0v6" /></Svg>;

/** A child's face with sound coming out: "I said it!" */
export const Talking = ({ size = 96 }: P) => (
  <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
    <circle cx="42" cy="50" r="34" fill="#ffd9a8" stroke="#1b2238" stroke-width="4" />
    <path d="M12 40q6-26 32-24 24 1 30 22-14-10-28-9-18 1-34 11z" fill="#7a4a21" stroke="#1b2238" stroke-width="4" stroke-linejoin="round" />
    <circle cx="33" cy="50" r="4" fill="#1b2238" /><circle cx="54" cy="50" r="4" fill="#1b2238" />
    <ellipse cx="45" cy="67" rx="10" ry="8" fill="#b3372c" stroke="#1b2238" stroke-width="4" />
    <path d="M80 56q5 8 0 16M87 50q10 14 0 28" fill="none" stroke="#1b2238" stroke-width="5" stroke-linecap="round" />
  </svg>
);
