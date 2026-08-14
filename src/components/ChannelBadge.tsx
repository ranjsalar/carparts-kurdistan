import { getTranslations } from "next-intl/server";
import { channelKey, type RequestParty } from "@/lib/request-customer";

/*
  Where an order came from, as a pill matching the badge family (see the design
  review: small labelled values are pills, buttons are rounded-lg).

  Walk-in gets the amber treatment because it is the exception — the eye should
  find the counter orders in a queue that is mostly web. Web is deliberately the
  quiet neutral: badging the common case loudly would just add noise to every
  row.
*/
export async function ChannelBadge({ request }: { request: RequestParty }) {
  const t = await getTranslations("admin.channel");
  const key = channelKey(request);

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-0.5 font-heading text-overline font-semibold uppercase ${
        key === "walkIn"
          ? "bg-accent-50 text-accent-700 ring-1 ring-accent-200"
          : "bg-steel-100 text-steel-600 ring-1 ring-steel-200"
      }`}
    >
      {t(key)}
    </span>
  );
}
