/*
  Shared component classes — the single source of truth for interactive
  elements so every page composes the same system instead of ad-hoc classes.
*/

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg font-heading text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-40";

export const btnPrimary = `${btnBase} bg-brand-700 px-5 py-3 text-white outline-brand-700 hover:bg-brand-800 active:bg-brand-900`;

export const btnAccent = `${btnBase} bg-accent-600 px-5 py-3 text-white outline-accent-600 hover:bg-accent-700 active:bg-accent-800`;

export const btnSecondary = `${btnBase} border border-steel-300 bg-white px-5 py-3 text-steel-700 outline-brand-700 hover:border-brand-500 hover:text-brand-700`;

export const btnGhost = `${btnBase} px-3 py-3 text-steel-600 outline-brand-700 hover:bg-steel-100 hover:text-steel-900`;

export const btnDanger = `${btnBase} border border-steel-300 bg-white px-5 py-3 text-danger-600 outline-danger-600 hover:border-danger-600 hover:bg-danger-50`;

export const inputBase =
  "w-full rounded-lg border border-steel-300 bg-white px-3.5 py-3 text-body text-steel-900 placeholder:text-steel-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15 disabled:bg-steel-100 disabled:text-steel-400";

export const labelBase = "mb-1.5 block text-caption font-medium text-steel-700";

export const overline =
  "font-heading text-overline font-semibold uppercase text-steel-500";

/* Surfaces — deliberately varied, not one card style for everything:
   card   — bordered white surface (primary content)
   panel  — tinted, borderless (secondary/grouping)
   inset  — brand-tinted with accent edge (callouts: quotes, helpers) */
export const card = "rounded-2xl border border-steel-200 bg-white";
export const panel = "rounded-2xl bg-steel-100/70";
export const inset =
  "rounded-xl border-s-4 border-brand-500 bg-brand-50 px-4 py-3";
