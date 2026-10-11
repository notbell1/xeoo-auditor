import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALERT_MESSAGES,
  BACKEND_CODE_TO_CATEGORY,
  CATEGORY_META,
  FALLBACK_MESSAGE,
  categoryFromCode,
  categoryFromStatus,
  createAlertGate,
  createMessagePicker,
  type SecurityAlertCategory,
} from "../src/lib/securityAlertCatalog.ts";

const categories = Object.keys(CATEGORY_META) as SecurityAlertCategory[];

test("every category has a pool of at least 6 distinct messages", () => {
  for (const category of categories) {
    const pool = ALERT_MESSAGES[category];
    assert.ok(pool.length >= 6, `${category} has ${pool.length} messages`);
    assert.equal(new Set(pool).size, pool.length, `${category} has duplicates`);
  }
});

test("structured backend codes map to categories", () => {
  assert.equal(categoryFromCode("INVALID_INPUT"), "INVALID_INPUT");
  assert.equal(categoryFromCode("INVALID_TARGET"), "INVALID_INPUT");
  assert.equal(categoryFromCode("RATE_LIMITED"), "RATE_LIMITED");
  assert.equal(categoryFromCode("INVALID_CREDENTIALS"), "UNAUTHENTICATED");
  assert.equal(categoryFromCode("FORBIDDEN"), "FORBIDDEN");
  assert.equal(categoryFromCode("SECURITY_BLOCKED"), "SECURITY_BLOCKED");
  assert.equal(categoryFromCode("INTERNAL_ERROR"), "SERVER_ERROR");
});

test("unknown or non-string codes never resolve (no text sniffing, no prototype keys)", () => {
  assert.equal(categoryFromCode("SOMETHING_NEW"), null);
  assert.equal(categoryFromCode("__proto__"), null);
  assert.equal(categoryFromCode("constructor"), null);
  assert.equal(categoryFromCode(undefined), null);
  assert.equal(categoryFromCode(42), null);
  assert.equal(categoryFromCode({ toString: () => "RATE_LIMITED" }), null);
});

test("status fallback is coarse and conservative", () => {
  assert.equal(categoryFromStatus(401), "UNAUTHENTICATED");
  assert.equal(categoryFromStatus(403), "FORBIDDEN");
  assert.equal(categoryFromStatus(429), "RATE_LIMITED");
  assert.equal(categoryFromStatus(500), "SERVER_ERROR");
  assert.equal(categoryFromStatus(400), null);
  assert.equal(categoryFromStatus(undefined), null);
});

test("a plain validation error is never labelled an attack", () => {
  for (const code of ["INVALID_INPUT", "INVALID_TARGET", "UNSUPPORTED_MEDIA_TYPE", "REQUEST_TOO_LARGE", "CONFLICT"]) {
    const category = categoryFromCode(code);
    assert.equal(category, "INVALID_INPUT", code);
    assert.notEqual(category, "SUSPICIOUS_INPUT");
    assert.notEqual(category, "SECURITY_BLOCKED");
  }
  // No code currently emitted by the backend resolves to SUSPICIOUS_INPUT except an explicit one.
  const mapped = Object.entries(BACKEND_CODE_TO_CATEGORY).filter(([, c]) => c === "SUSPICIOUS_INPUT");
  assert.deepEqual(mapped.map(([code]) => code), ["SUSPICIOUS_INPUT"]);
});

test("unknown category falls back to a neutral message", () => {
  const pick = createMessagePicker(() => 0);
  const content = pick(null);
  assert.equal(content.message, FALLBACK_MESSAGE);
  assert.equal(content.category, null);
  // @ts-expect-error deliberately invalid category
  assert.equal(pick("NOT_A_CATEGORY").message, FALLBACK_MESSAGE);
});

test("the same message is never shown twice in a row", () => {
  const pick = createMessagePicker(() => 0); // worst case: always picks the first candidate
  let previous = "";
  for (let i = 0; i < 40; i++) {
    const { message } = pick("INVALID_INPUT");
    assert.notEqual(message, previous);
    previous = message;
  }
  const random = createMessagePicker();
  previous = "";
  for (let i = 0; i < 200; i++) {
    const { message } = random(categories[i % categories.length]);
    assert.notEqual(message, previous);
    previous = message;
  }
});

test("messages are static: no payload interpolation and no markup", () => {
  for (const category of categories) {
    for (const message of ALERT_MESSAGES[category]) {
      assert.ok(!/[<>]/.test(message), `markup in ${category}: ${message}`);
      assert.ok(!/\$\{|\{\{/.test(message), `template placeholder in ${category}`);
    }
  }
  const pick = createMessagePicker();
  const payload = "<script>alert(1)</script>' OR 1=1 --";
  const { message, title } = pick(categoryFromCode(payload));
  assert.ok(!message.includes("script") && !title.includes("script"));
});

test("critical categories are limited to real blocks", () => {
  const critical = categories.filter((c) => CATEGORY_META[c].severity === "critical").sort();
  assert.deepEqual(critical, ["FORBIDDEN", "SECURITY_BLOCKED"]);
  assert.equal(CATEGORY_META.INVALID_INPUT.severity, "info");
});

test("alert gate suppresses duplicates inside the cooldown and releases after", () => {
  let clock = 1000;
  const shouldShow = createAlertGate(() => clock, 4000);
  assert.equal(shouldShow("RATE_LIMITED"), true);
  clock += 1000;
  assert.equal(shouldShow("RATE_LIMITED"), false);
  assert.equal(shouldShow("INVALID_INPUT"), true); // different key is independent
  clock += 4000;
  assert.equal(shouldShow("RATE_LIMITED"), true);
});

