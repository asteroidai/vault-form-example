import type { FieldSpec, FieldType, FieldValue, TemplateStep } from "./types.ts";

// Write-only types never come back out of the API. Render them masked.
const SECRET_TYPES: ReadonlySet<FieldType> = new Set([
  "password",
  "hidden",
  "totp_seed",
  "api_key",
  "card_number",
  "card_cvv",
]);

export function isSecret(type: FieldType): boolean {
  return SECRET_TYPES.has(type);
}

export function inputProps(type: FieldType): {
  type: string;
  inputMode?: "numeric" | "email" | "tel" | "url";
  autoComplete: string;
} {
  switch (type) {
    case "email":
      return { type: "email", inputMode: "email", autoComplete: "off" };
    case "url":
      return { type: "text", inputMode: "url", autoComplete: "off" };
    case "phone":
      return { type: "tel", inputMode: "tel", autoComplete: "off" };
    case "card_number":
    case "card_cvv":
      return { type: "password", inputMode: "numeric", autoComplete: "off" };
    default:
      // "new-password" stops the browser offering to save or fill the
      // user's own login for your site into a portal's password field.
      return isSecret(type)
        ? { type: "password", autoComplete: "new-password" }
        : { type: "text", autoComplete: "off" };
  }
}

const BASE32 = /^[A-Z2-7]+$/;

/**
 * Returns the Base32 secret from a pasted setup key or otpauth:// link, or
 * null when it is not a usable TOTP seed. Asteroid stores the bare seed and
 * generates 6-digit SHA1 codes on a 30-second period, so a link with other
 * parameters is rejected.
 */
export function extractTotpSeed(input: string): string | null {
  let raw = input.trim();
  if (raw.toLowerCase().startsWith("otpauth://")) {
    if (!raw.toLowerCase().startsWith("otpauth://totp/")) return null;
    let params: URLSearchParams;
    try {
      params = new URL(raw).searchParams;
    } catch {
      return null;
    }
    const algorithm = params.get("algorithm")?.toUpperCase() ?? "SHA1";
    const digits = params.get("digits") ?? "6";
    const period = params.get("period") ?? "30";
    if (algorithm !== "SHA1" || digits !== "6" || period !== "30") return null;
    raw = params.get("secret") ?? "";
  }
  const seed = raw.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (seed.length < 16) return null;
  // Base32 blocks only end at these remainders. Others drop trailing bits.
  if ([1, 3, 6].includes(seed.length % 8)) return null;
  return BASE32.test(seed) ? seed : null;
}

/** Cleans a value the way the hosted Asteroid page does before submit. */
export function normaliseValue(type: FieldType, raw: string): string {
  if (!raw.trim()) return "";
  switch (type) {
    case "totp_seed":
      return extractTotpSeed(raw) ?? raw.trim();
    case "url":
      return `https://${raw.trim().replace(/^https?:\/\//i, "")}`;
    case "card_number":
    case "card_cvv":
      return raw.replace(/[\s-]+/g, "");
    default:
      // Secrets keep their exact bytes. Readable values lose stray padding.
      return isSecret(type) ? raw : raw.trim();
  }
}

/** Returns an error message for one field, or null when the value is fine. */
export function validateValue(field: FieldSpec, raw: string): string | null {
  if (!raw.trim()) return field.required ? `${field.label} is required.` : null;
  if (field.type === "totp_seed" && !extractTotpSeed(raw)) {
    return "Paste the Base32 setup key or an otpauth://totp/ link.";
  }
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())) {
    return "Enter a valid email address.";
  }
  return null;
}

/** One entry per filled field. Empty optional fields are left out. */
export function buildSubmitValues(fields: FieldSpec[], values: Record<string, string>): FieldValue[] {
  return fields.flatMap((field) => {
    const value = normaliseValue(field.type, values[field.key] ?? "");
    return value ? [{ key: field.key, value }] : [];
  });
}

/**
 * Pages to render. A template with no steps is one page. Fields that no step
 * names go on a final page, so the form never drops one.
 */
export function pagesOf(fields: FieldSpec[], steps: TemplateStep[]): TemplateStep[] {
  const known = new Set(fields.map((f) => f.key));
  const pages = steps
    .map((s) => ({ ...s, fieldKeys: s.fieldKeys.filter((k) => known.has(k)) }))
    .filter((s) => s.fieldKeys.length > 0 || s.instructions?.trim());
  if (pages.length === 0) {
    return [{ key: "details", title: "", fieldKeys: fields.map((f) => f.key) }];
  }
  const placed = new Set(pages.flatMap((s) => s.fieldKeys));
  const rest = fields.filter((f) => !placed.has(f.key)).map((f) => f.key);
  return rest.length ? [...pages, { key: "other", title: "Other details", fieldKeys: rest }] : pages;
}
