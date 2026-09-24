import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSubmitValues, extractTotpSeed, normaliseValue, pagesOf, validateValue } from "./fields.ts";
import type { FieldSpec } from "./types.ts";

const SEED = "JBSWY3DPEHPK3PXP";

test("extractTotpSeed accepts a spaced lower-case key", () => {
  assert.equal(extractTotpSeed("jbsw y3dp-ehpk 3pxp"), SEED);
});

test("extractTotpSeed reads the secret from an otpauth link", () => {
  assert.equal(extractTotpSeed(`otpauth://totp/Portal:dr.lee?secret=${SEED}&issuer=Portal`), SEED);
});

test("extractTotpSeed rejects HOTP and non-default parameters", () => {
  assert.equal(extractTotpSeed(`otpauth://hotp/Portal?secret=${SEED}`), null);
  assert.equal(extractTotpSeed(`otpauth://totp/Portal?secret=${SEED}&digits=8`), null);
});

test("extractTotpSeed rejects short and non-Base32 keys", () => {
  assert.equal(extractTotpSeed("ABC"), null);
  assert.equal(extractTotpSeed("JBSWY3DPEHPK3PX1"), null);
});

test("normaliseValue keeps secrets exact and trims readable values", () => {
  assert.equal(normaliseValue("password", " p@ss "), " p@ss ");
  assert.equal(normaliseValue("username", " dr.lee "), "dr.lee");
  assert.equal(normaliseValue("card_number", "4242 4242-4242 4242"), "4242424242424242");
  assert.equal(normaliseValue("url", "http://portal.example.com"), "https://portal.example.com");
});

test("validateValue flags a missing required value and a bad seed", () => {
  const field: FieldSpec = { key: "TOTP_SEED", label: "Key", type: "totp_seed", required: true };
  assert.match(validateValue(field, "") ?? "", /required/);
  assert.match(validateValue(field, "nope") ?? "", /Base32/);
  assert.equal(validateValue(field, SEED), null);
});

test("buildSubmitValues drops empty optional fields", () => {
  const fields: FieldSpec[] = [
    { key: "USERNAME", label: "Username", type: "username", required: true },
    { key: "NOTES", label: "Notes", type: "text", required: false },
  ];
  assert.deepEqual(buildSubmitValues(fields, { USERNAME: " dr.lee ", NOTES: "  " }), [
    { key: "USERNAME", value: "dr.lee" },
  ]);
});

test("pagesOf puts fields no step names on a final page", () => {
  const fields: FieldSpec[] = [
    { key: "A", label: "A", type: "text", required: false },
    { key: "B", label: "B", type: "text", required: false },
  ];
  const pages = pagesOf(fields, [
    { key: "one", title: "One", fieldKeys: ["A"] },
    { key: "empty", title: "Empty", fieldKeys: [] },
  ]);
  assert.deepEqual(
    pages.map((p) => [p.key, p.fieldKeys]),
    [
      ["one", ["A"]],
      ["other", ["B"]],
    ],
  );
});

test("pagesOf makes one page when there are no steps", () => {
  const fields: FieldSpec[] = [{ key: "A", label: "A", type: "text", required: false }];
  assert.deepEqual(pagesOf(fields, [])[0]?.fieldKeys, ["A"]);
});
