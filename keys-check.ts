import en from "./messages/en.json";
import ku from "./messages/ku.json";
import ar from "./messages/ar.json";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

const enKeys = new Set(flatten(en));
let ok = true;
for (const [name, msgs] of [
  ["ku", ku],
  ["ar", ar],
] as const) {
  const keys = new Set(flatten(msgs));
  const missing = [...enKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !enKeys.has(k));
  if (missing.length || extra.length) {
    ok = false;
    console.log(`${name}: missing [${missing.join(", ")}] extra [${extra.join(", ")}]`);
  } else {
    console.log(`${name}: all ${enKeys.size} keys match en`);
  }
}
process.exit(ok ? 0 : 1);
