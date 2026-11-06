// One authored icon set: 24 px grid, 1.75 stroke, round joins.
import type { JSX } from "preact";

type P = { size?: "sm"; label?: string };
const I = (paths: JSX.Element, { size, label }: P = {}) => (
  <svg class={`i${size ? " " + size : ""}`} viewBox="0 0 24 24" aria-hidden={label ? undefined : "true"} role={label ? "img" : undefined} aria-label={label}>
    {paths}
  </svg>
);

export const IconBack = (p?: P) => I(<path d="M15 5l-7 7 7 7" />, p);
export const IconPrev = (p?: P) => I(<path d="M14.5 6.5 9 12l5.5 5.5" />, p);
export const IconNext = (p?: P) => I(<path d="M9.5 6.5 15 12l-5.5 5.5" />, p);
export const IconPlus = (p?: P) => I(<path d="M12 5v14M5 12h14" />, p);
export const IconMinus = (p?: P) => I(<path d="M5 12h14" />, p);
export const IconSearch = (p?: P) => I(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>, p);
export const IconBarcode = (p?: P) =>
  I(<><path d="M4 7V5h3M17 5h3v2M20 17v2h-3M7 19H4v-2" /><path d="M8 8.5v7M10.5 8.5v7M13 8.5v7M16 8.5v7" /></>, p);
export const IconBolt = (p?: P) => I(<path d="M13 3 6 13.5h5L10 21l7-10.5h-5z" />, p);
export const IconPencil = (p?: P) => I(<><path d="M4 20l1-4L16 5l3 3L8 19z" /><path d="m14 7 3 3" /></>, p);
export const IconTrash = (p?: P) => I(<><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></>, p);
export const IconPlate = (p?: P) => I(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /></>, p);
export const IconChart = (p?: P) => I(<path d="M4 18.5l5-6 4 3 7-8.5" />, p);
export const IconBowl = (p?: P) => I(<><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M9 7c0-1.5 1-2 1-3.5M13 7c0-1.5 1-2 1-3.5" /></>, p);
export const IconMore = (p?: P) => I(<path d="M4 7h16M4 12h16M4 17h16" />, p);
export const IconDrop = (p?: P) => I(<path d="M12 3.5s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />, p);
export const IconRun = (p?: P) =>
  I(<><circle cx="14.5" cy="4.5" r="1.8" /><path d="M8 21l3-6 3 2v4M6 12l3-4h4l2 3 3 1M11 15l-1-4" /></>, p);
export const IconTarget = (p?: P) => I(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" /></>, p);
export const IconDownload = (p?: P) => I(<path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14" />, p);
export const IconUpload = (p?: P) => I(<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14" />, p);
export const IconShield = (p?: P) => I(<><path d="M12 3.5 5 6v5.5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" /><path d="m9 12 2 2 4-4" /></>, p);
export const IconLeaf = (p?: P) => I(<><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path d="M5 19 13 11" /></>, p);
export const IconHourglass = (p?: P) => I(<path d="M7 4h10M7 20h10M8 4c0 5 8 5 8 8s-8 3-8 8M16 4c0 5-8 5-8 8s8 3 8 8" />, p);
export const IconChevron = (p?: P) => I(<path d="M9.5 6 15.5 12l-6 6" />, p);
