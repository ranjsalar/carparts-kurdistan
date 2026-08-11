import { getTranslations } from "next-intl/server";
import { IconBox, IconFinish, IconFlag, IconTruck } from "./icons";

/*
  "How it works" as miniature product previews — scaled-down mockups of the
  real screens (request form, quote card, payment approval, tracking stepper)
  built from the same visual language as the actual components. Text inside
  the previews is skeleton bars, so nothing needs translating and they read
  as UI, not copy. Below them, the sourcing-route strip mirrors the tracking
  stepper's icons: China/Dubai → border & customs → Kurdistan.
*/

function Bar({ w, tone = "bg-steel-200" }: { w: string; tone?: string }) {
  return <span className={`block h-1.5 rounded-full ${tone} ${w}`} />;
}

function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none rounded-xl border border-steel-200 bg-white p-3.5 shadow-sm"
    >
      {children}
    </div>
  );
}

/** Step 1 — the request form, miniature */
function FormPreview() {
  return (
    <PreviewFrame>
      <div className="mb-3 flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent-600 text-[8px] font-bold text-white">
          1
        </span>
        <span className="h-0 flex-1 border-t border-dashed border-steel-300" />
        <span className="h-4 w-4 rounded-full border-2 border-steel-300 bg-white" />
        <span className="h-0 flex-1 border-t border-dashed border-steel-300" />
        <span className="h-4 w-4 rounded-full border-2 border-steel-300 bg-white" />
      </div>
      <div className="space-y-2.5">
        <div>
          <Bar w="w-10" />
          <div className="mt-1 flex items-center justify-between rounded-md border border-steel-300 px-2 py-1.5">
            <Bar w="w-16" tone="bg-steel-300" />
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-steel-400">
              <path d="M6 9 l6 6 6-6" />
            </svg>
          </div>
        </div>
        <div>
          <Bar w="w-8" />
          <div className="mt-1 flex items-center justify-between rounded-md border border-steel-300 px-2 py-1.5">
            <Bar w="w-12" tone="bg-steel-300" />
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-steel-400">
              <path d="M6 9 l6 6 6-6" />
            </svg>
          </div>
        </div>
        <div className="rounded-md bg-brand-700 px-2 py-1.5">
          <Bar w="w-10 mx-auto" tone="bg-brand-400" />
        </div>
      </div>
    </PreviewFrame>
  );
}

/** Step 2 — the quote card, miniature */
function QuotePreview() {
  return (
    <PreviewFrame>
      <div className="rounded-lg bg-brand-900 p-3">
        <Bar w="w-9" tone="bg-brand-700" />
        <p className="mt-1.5 font-heading text-xl font-bold text-white" dir="ltr">
          $220
        </p>
        <Bar w="w-16 mt-1.5" tone="bg-brand-800" />
        <div className="mt-2.5 flex gap-1.5">
          <span className="block h-5 flex-1 rounded-md bg-accent-500" />
          <span className="block h-5 flex-1 rounded-md border border-white/25" />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <Bar w="w-full" />
        <Bar w="w-2/3" />
      </div>
    </PreviewFrame>
  );
}

/** Step 3 — payment method selection, miniature */
function PaymentPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-md border border-steel-200 px-2 py-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-steel-300" />
          <Bar w="w-14" />
        </div>
        <div className="flex items-center gap-2 rounded-md border-2 border-brand-500 bg-brand-50 px-2 py-1.5">
          <span className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
          </span>
          <Bar w="w-16" tone="bg-brand-200" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-steel-200 px-2 py-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-steel-300" />
          <Bar w="w-12" />
        </div>
        <div className="rounded-md bg-brand-700 px-2 py-1.5">
          <Bar w="w-12 mx-auto" tone="bg-brand-400" />
        </div>
      </div>
    </PreviewFrame>
  );
}

/** Step 4 — the tracking stepper, miniature */
function TrackingPreview() {
  return (
    <PreviewFrame>
      <div className="space-y-0">
        {[
          { icon: IconBox, state: "done" },
          { icon: IconTruck, state: "current" },
          { icon: IconFinish, state: "upcoming" },
        ].map((stage, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  stage.state === "done"
                    ? "bg-brand-600 text-white"
                    : stage.state === "current"
                      ? "bg-accent-500 text-white ring-2 ring-accent-100"
                      : "border-2 border-steel-200 bg-white text-steel-300"
                }`}
              >
                <stage.icon size={14} />
              </span>
              {i < 2 && (
                <span
                  className={`my-0.5 h-3.5 border-s-2 ${
                    stage.state === "done" ? "border-brand-400" : "border-dashed border-steel-300"
                  }`}
                />
              )}
            </div>
            <div className="pt-1.5">
              <Bar w={i === 0 ? "w-16" : i === 1 ? "w-20" : "w-12"} tone={stage.state === "upcoming" ? "bg-steel-100" : "bg-steel-200"} />
            </div>
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}

export async function HowItWorks() {
  const t = await getTranslations("home");

  const steps = [
    { preview: <FormPreview />, title: t("how1Title"), body: t("how1Body") },
    { preview: <QuotePreview />, title: t("how2Title"), body: t("how2Body") },
    { preview: <PaymentPreview />, title: t("how3Title"), body: t("how3Body") },
    { preview: <TrackingPreview />, title: t("how4Title"), body: t("how4Body") },
  ];

  const route = [
    { icon: IconBox, label: t("routeOrigin") },
    { icon: IconFlag, label: t("routeCustoms") },
    { icon: IconFinish, label: t("routeDest") },
  ];

  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-14">
      <h2 className="text-title font-bold text-steel-900">{t("howTitle")}</h2>

      <ol className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="rounded-2xl bg-steel-100/70 p-5">
            {step.preview}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-heading text-heading font-bold text-accent-600">
                {i + 1}.
              </span>
              <h3 className="font-heading text-body font-bold text-steel-900">{step.title}</h3>
            </div>
            <p className="mt-1 text-caption leading-relaxed text-steel-600">{step.body}</p>
          </li>
        ))}
      </ol>

      {/* Sourcing route — the same stage icons as real order tracking */}
      <div className="mt-8 rounded-2xl bg-brand-900 px-6 py-7">
        <p className="mb-6 text-center font-heading text-overline font-semibold uppercase text-brand-300">
          {t("routeTitle")}
        </p>
        <div className="flex items-start">
          {route.map((node, i) => (
            <div key={node.label} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center gap-2.5 text-center">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    i === route.length - 1
                      ? "bg-accent-500 text-white"
                      : "bg-brand-800 text-brand-200 ring-1 ring-brand-700"
                  }`}
                >
                  <node.icon size={24} />
                </span>
                <p className="font-heading text-caption font-semibold text-brand-100">
                  {node.label}
                </p>
              </div>
              {i < route.length - 1 && (
                <div className="mt-6 flex flex-1 items-center gap-1.5" aria-hidden>
                  <span className="h-0 flex-1 border-t-2 border-dashed border-brand-700" />
                  <IconTruck size={16} className="shrink-0 text-brand-400 rtl:-scale-x-100" />
                  <span className="h-0 flex-1 border-t-2 border-dashed border-brand-700" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
